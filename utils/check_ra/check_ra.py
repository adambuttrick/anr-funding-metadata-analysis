import os
import re
import csv
import json
import time
import signal
import argparse
import requests
import traceback
import concurrent.futures
from datetime import datetime
from urllib.parse import quote
from queue import Queue, Empty
from threading import Lock, Semaphore, Thread, Event

termination_event = Event()


def signal_handler(sig, frame):
    print(f"\nReceived termination signal ({sig}). Gracefully shutting down...")
    termination_event.set()


def setup_signal_handlers():
    signal.signal(signal.SIGINT, signal_handler)
    signal.signal(signal.SIGTERM, signal_handler)


def parse_arguments():
    parser = argparse.ArgumentParser(
        description='Query DOI Registration Agency and add to CSV')
    parser.add_argument('-i', '--input', required=True,
                        help='Input CSV file path')
    parser.add_argument('-o', '--output', required=True,
                        help='Output CSV file path')
    parser.add_argument('-c', '--column', default='doi',
                        help='Column name containing DOIs (default: doi)')
    parser.add_argument('-m', '--retries', type=int, default=3,
                        help='Maximum number of retries for API requests (default: 3)')
    parser.add_argument('-y', '--retry-delay', type=int,
                        default=10, help='Delay between retries in seconds (default: 10)')
    parser.add_argument('-t', '--token', type=str,
                        help='API token (if required by endpoint, e.g., Crossref Plus)')
    parser.add_argument('-u', '--user-agent', type=str, default='DOI RA Lookup Script/1.0',
                        help='User Agent for the request (default: DOI RA Lookup Script/1.0)')
    parser.add_argument('-l', '--log-file', type=str, default='doi_ra_errors.log',
                        help='File to log errors (default: doi_ra_errors.log)')
    parser.add_argument('-w', '--workers', type=int, default=5,
                        help='Number of worker threads for parallel processing (default: 5)')
    parser.add_argument('-f', '--failed-output', type=str, default='failed_dois.csv',
                        help='Output CSV file for failed entries (default: failed_dois.csv)')
    parser.add_argument('--limit', type=int,
                        help='Limit the number of rows to process (for testing)')
    parser.add_argument('--force-overwrite', action='store_true',
                        help='Force overwrite existing output files without prompting')
    return parser.parse_args()


log_lock = Lock()


def log_error(log_file, identifier, error_message):
    timestamp = datetime.now().strftime('%Y-%m-%d %H:%M:%S')
    with log_lock:
        with open(log_file, 'a', encoding='utf-8') as f:
            f.write(f"[{timestamp}] Identifier: {identifier} - {error_message}\n")


def check_output_files(args):
    if args.force_overwrite:
        return True

    output_exists = os.path.exists(args.output)
    failed_exists = os.path.exists(args.failed_output)

    if output_exists or failed_exists:
        existing_files = []
        if output_exists:
            existing_files.append(args.output)
        if failed_exists:
            existing_files.append(args.failed_output)

        print(f"Warning: The following output file(s) already exist: {', '.join(existing_files)}")
        response = input("Do you want to overwrite? (y/n): ").strip().lower()

        if response != 'y':
            print("Operation aborted. Please specify different output file names.")
            return False

    return True


def extract_doi(doi_string):
    if not isinstance(doi_string, str):
        return None
    pattern = r'(10\.\d{4,}(?:\.\d+)*\/(?:(?!["&\'<>])\S)+)'
    match = re.search(pattern, doi_string)
    if match:
        return match.group(0).strip()
    return None


def fetch_registration_agency(doi, headers, args):
    encoded_doi = quote(doi, safe='')
    url = f"https://doi.org/ra/{encoded_doi}"
    try:
        response = requests.get(url, headers=headers, timeout=30)
        if response.status_code == 200:
            try:
                data = response.json()
                if data and isinstance(data, list) and len(data) > 0 and 'RA' in data[0]:
                    return data[0]['RA'], None
                else:
                    return 'NOT_FOUND', f"RA not found in response: {response.text}"
            except json.JSONDecodeError:
                return 'ERROR', f"Invalid JSON response: {response.text}"
        elif response.status_code == 404:
             return 'NOT_FOUND', f"DOI not found (404)"
        else:
            return 'ERROR', f"Request failed with status {response.status_code}: {response.text}"
    except requests.exceptions.Timeout:
        return None, "Request timed out"
    except requests.exceptions.RequestException as e:
        return None, f"Request failed: {str(e)}"


def process_row_data(row, registration_agency, error_message):
    result = row.copy()
    result['registration_agency'] = registration_agency if registration_agency else 'ERROR'
    result['error'] = error_message if error_message else ''
    return result, error_message is None


def create_error_result(row, error_message, doi_column):
    result = row.copy()
    result['registration_agency'] = 'ERROR'
    result['error'] = f"Processing error: {error_message}"
    if doi_column not in result: 
        result[doi_column] = 'MISSING_COLUMN_VALUE'
    return result


csv_lock = Lock()
failed_lock = Lock()


def write_result(writer, result):
    with csv_lock:
        try:
            writer.writerow(result)
        except Exception as e:
            print(f"Error writing row: {result}. Error: {e}")
            traceback.print_exc()


def write_failed_entry(writer, result):
    with failed_lock:
        try:
            writer.writerow(result)
        except Exception as e:
            print(f"Error writing failed row: {result}. Error: {e}")
            traceback.print_exc()


class RateLimiter:
    def __init__(self, calls_per_interval=5, interval=1.0):
        self.calls_per_interval = calls_per_interval
        self.interval = interval
        self.call_times = []
        self.lock = Lock()

    def wait(self):
        with self.lock:
            now = time.monotonic()
            
            self.call_times = [t for t in self.call_times if now - t < self.interval]

            if len(self.call_times) >= self.calls_per_interval:
                time_since_oldest_allowed = now - self.call_times[-(self.calls_per_interval -1)]
                
                wait_needed = self.interval - time_since_oldest_allowed
                
                if wait_needed > 0:
                     time.sleep(wait_needed)
                
                now = time.monotonic()
                self.call_times = [t for t in self.call_times if now - t < self.interval]

            self.call_times.append(now)


class RequestManager:
    def __init__(self, args, writer, failed_writer):
        self.args = args
        self.writer = writer
        self.failed_writer = failed_writer
        self.log_file = args.log_file
        self.retry_delay = args.retry_delay
        self.max_retries = args.retries
        self.request_semaphore = Semaphore(args.workers)
        self.rate_limiter = RateLimiter(calls_per_interval=args.workers, interval=1.0)
        self.processed_count = 0
        self.success_count = 0
        self.error_count = 0
        self.cache_hits = 0
        self.skipped_count = 0
        self.counter_lock = Lock()
        self.processed_identifiers = set()
        self.processed_identifiers_lock = Lock()
        self.doi_cache = {}
        self.cache_lock = Lock()

    def build_headers(self):
        headers = {'User-Agent': self.args.user_agent, 'Accept': 'application/json'}
        if self.args.token:
            headers['Authorization'] = f'Bearer {self.args.token}'
        return headers

    def process_row_request(self, row, row_index):
        # Check for termination signal
        if termination_event.is_set():
            with self.counter_lock:
                self.skipped_count += 1
            return False
            
        identifier = f"Row {row_index}"
        doi_value = None
        try:
            doi_value = row.get(self.args.column)
            doi = extract_doi(doi_value)
            if not doi:
                error_msg = f"Could not extract valid DOI from '{doi_value}' in column '{self.args.column}'"
                log_error(self.log_file, identifier, error_msg)
                error_result = create_error_result(row, error_msg, self.args.column)
                write_failed_entry(self.failed_writer, error_result)
                with self.counter_lock:
                    self.processed_count += 1
                    self.error_count += 1
                return False
            
            identifier = doi

            with self.cache_lock:
                cached_result = self.doi_cache.get(doi)
                if cached_result:
                    print(f"Cache hit for DOI: {doi}")
                    result, success = process_row_data(row, cached_result['agency'], cached_result['error'])
                    
                    if success:
                        write_result(self.writer, result)
                    else:
                        write_failed_entry(self.failed_writer, result)
                        
                    with self.counter_lock:
                        self.processed_count += 1
                        self.cache_hits += 1
                        if success:
                            self.success_count += 1
                        else:
                            self.error_count += 1
                    return True

            with self.processed_identifiers_lock:
                if identifier in self.processed_identifiers:
                     print(f"Skipping already processed identifier: {identifier}")
                     return True

            return self._attempt_request(row, doi, identifier, 1)

        except KeyError:
            error_msg = f"DOI column '{self.args.column}' not found in row {row_index}"
            log_error(self.log_file, identifier, error_msg)
            error_result = create_error_result(row, error_msg, self.args.column)
            write_failed_entry(self.failed_writer, error_result)
            with self.counter_lock:
                self.processed_count += 1
                self.error_count += 1
            return False
        except Exception as e:
            error_msg = f"Unexpected error processing row {row_index}: {str(e)}"
            log_error(self.log_file, identifier, error_msg)
            print(f"Unexpected error processing row {row_index} ({doi_value}): {str(e)}")
            traceback.print_exc()
            error_result = create_error_result(row, error_msg, self.args.column)
            write_failed_entry(self.failed_writer, error_result)
            with self.counter_lock:
                self.processed_count += 1
                self.error_count += 1
            return False

    def _attempt_request(self, row, doi, identifier, attempt):
        if termination_event.is_set():
            return False
            
        if attempt > self.max_retries + 1:
             error_msg = f"Failed after {self.max_retries} retries"
             log_error(self.log_file, identifier, error_msg)
             error_result = create_error_result(row, error_msg, self.args.column)
             write_failed_entry(self.failed_writer, error_result)
             with self.counter_lock:
                 self.processed_count += 1
                 self.error_count += 1
             with self.processed_identifiers_lock:
                 self.processed_identifiers.add(identifier)
             return False
        
        semaphore_acquired = False
        try:
            semaphore_acquired = self.request_semaphore.acquire(timeout=1.0)
            if not semaphore_acquired:
                if termination_event.is_set():
                    return False
                return self._attempt_request(row, doi, identifier, attempt)
        except Exception:
            if termination_event.is_set():
                return False
            time.sleep(0.1)
            return self._attempt_request(row, doi, identifier, attempt)
        
        try:
            if termination_event.is_set():
                return False
                
            self.rate_limiter.wait()
            headers = self.build_headers()
            
            if attempt > 1:
                print(f"Retrying {identifier} (Attempt {attempt}/{self.max_retries + 1})")
            else:
                 print(f"Processing {identifier}")

            agency, error_msg = fetch_registration_agency(doi, headers, self.args)

            if termination_event.is_set():
                return False

            if agency:
                with self.cache_lock:
                    self.doi_cache[doi] = {
                        'agency': agency,
                        'error': error_msg
                    }
                    
                result, success = process_row_data(row, agency, error_msg)
                
                if success:
                    write_result(self.writer, result)
                else:
                    write_failed_entry(self.failed_writer, result)

                with self.counter_lock:
                    self.processed_count += 1
                    if success:
                        self.success_count += 1
                    else:
                        self.error_count += 1
                with self.processed_identifiers_lock:
                    self.processed_identifiers.add(identifier)
                return True
            
            else:
                if termination_event.is_set():
                    return False
                    
                print(f"Request failed for {identifier}: {error_msg}. Scheduling retry {attempt}...")
                self.request_semaphore.release()
                semaphore_acquired = False
                time.sleep(self.retry_delay)
                return self._attempt_request(row, doi, identifier, attempt + 1)

        except Exception as e:
            error_msg = f"Unexpected error during request/processing for {identifier}: {str(e)}"
            log_error(self.log_file, identifier, error_msg)
            print(error_msg)
            traceback.print_exc()
            error_result = create_error_result(row, error_msg, self.args.column)
            write_failed_entry(self.failed_writer, error_result)
            with self.counter_lock:
                self.processed_count += 1
                self.error_count += 1
            with self.processed_identifiers_lock:
                 self.processed_identifiers.add(identifier)
            return False
        finally:
            if semaphore_acquired:
                try:
                    self.request_semaphore.release()
                except ValueError:
                    pass
                except Exception as e:
                    print(f"Error releasing semaphore: {str(e)}")
                    pass


def check_ra(a=False):
    setup_signal_handlers()
    
    args = a if a else parse_arguments()

    if not check_output_files(args):
        return

    try:
        with open(args.input, 'r', encoding='utf-8') as f_in:
            reader = csv.DictReader(f_in)
            input_fieldnames = list(reader.fieldnames)
            if args.column not in input_fieldnames:
                 raise ValueError(f"Column '{args.column}' not found in input file {args.input}")
            
            output_fieldnames = input_fieldnames + ['registration_agency', 'error']
            rows_to_process = list(reader)

    except FileNotFoundError:
        print(f"Error: Input file not found at {args.input}")
        return
    except ValueError as e:
        print(f"Error: {e}")
        return
    except Exception as e:
        print(f"Error reading input file: {str(e)}")
        traceback.print_exc()
        return
        
    if args.limit and args.limit > 0:
        total_rows = len(rows_to_process)
        rows_to_process = rows_to_process[:args.limit]
        print(f"Limiting processing to the first {args.limit} rows (out of {total_rows} total)")
    
    total_to_process = len(rows_to_process)

    with open(args.output, 'w', encoding='utf-8', newline='') as f_out, \
            open(args.failed_output, 'w', encoding='utf-8', newline='') as f_failed:
        
        writer = csv.DictWriter(f_out, fieldnames=output_fieldnames, extrasaction='ignore')
        failed_writer = csv.DictWriter(f_failed, fieldnames=output_fieldnames, extrasaction='ignore')
        writer.writeheader()
        failed_writer.writeheader()

        manager = RequestManager(args, writer, failed_writer)
        
        print(f"Processing {total_to_process} rows with {args.workers} workers...")
        print(f"Retries: {args.retries}, Retry Delay: {args.retry_delay}s")
        print("Press Ctrl+C to gracefully terminate processing")

        start_time = time.time()
        
        futures = []
        with concurrent.futures.ThreadPoolExecutor(max_workers=args.workers) as executor:
            for i, row in enumerate(rows_to_process):
                futures.append(executor.submit(manager.process_row_request, row, i))
            
            for i, future in enumerate(concurrent.futures.as_completed(futures)):
                if termination_event.is_set() and i % 10 == 0:
                    print("Waiting for in-progress tasks to complete...")
                
                try:
                    future.result()
                except Exception as e:
                    print(f"Error from worker thread: {e}")
                    traceback.print_exc()
                    log_error(args.log_file, f"Worker Error (Row index approx {i})", str(e))

                processed = manager.processed_count
                success = manager.success_count
                errors = manager.error_count
                
                if (i + 1) % 10 == 0 or (i + 1) == total_to_process or termination_event.is_set():
                    elapsed_time = time.time() - start_time
                    rate = processed / elapsed_time if elapsed_time > 0 else 0
                    print(f"Progress: {processed}/{total_to_process} "
                          f"({processed/total_to_process*100:.1f}%) - "
                          f"Success: {success}, Errors: {errors} "
                          f"({rate:.1f} rows/sec)")

        end_time = time.time()
        processed = manager.processed_count
        success = manager.success_count
        errors = manager.error_count
        cache_hits = manager.cache_hits
        skipped = manager.skipped_count
        
        termination_message = "Processing was terminated early" if termination_event.is_set() else "Processing complete"
        
        print(f"\n{termination_message}:")
        print(f"  Total rows processed: {processed}")
        print(f"  Successful RA lookups: {success}")
        print(f"  Failed lookups/Errors: {errors}")
        print(f"  Cache hits: {cache_hits}")
        print(f"  API requests made: {processed - cache_hits}")
        if skipped > 0:
            print(f"  Rows skipped due to termination: {skipped}")
        print(f"  Results saved to: {args.output}")
        print(f"  Failed entries saved to: {args.failed_output}")
        print(f"  Error log saved to: {args.log_file}")
        print(f"  Total time: {end_time - start_time:.2f} seconds")


if __name__ == "__main__":
    check_ra()