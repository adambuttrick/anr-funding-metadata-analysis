import os
import re
import csv
import json
import time
import argparse
import requests
import traceback
import concurrent.futures
from functools import wraps
from urllib.parse import quote
from datetime import datetime
from threading import Lock, Semaphore, Thread
from queue import Queue, Empty


def parse_arguments():
    parser = argparse.ArgumentParser(
        description='Process publications and query Crossref API')
    parser.add_argument('-i', '--input', required=True,
                        help='Input CSV file path')
    parser.add_argument('-o', '--output-dir', default='crossref_data',
                        help='Output directory for JSON files (default: crossref_data)')
    parser.add_argument('-r', '--results', default='funding_analysis.csv',
                        help='Output CSV file for results (default: funding_analysis.csv)')
    parser.add_argument('-d', '--delay', type=float, default=1.0,
                        help='Delay between API requests in seconds (default: 1.0)')
    parser.add_argument('-m', '--retries', type=int, default=3,
                        help='Maximum number of retries for API requests (default: 3)')
    parser.add_argument('-y', '--retry-delay', type=int,
                        default=30, help='Delay between retries in seconds (default: 30)')
    parser.add_argument('-t', '--token', type=str,
                        help='Crossref Metadata Plus API token')
    parser.add_argument('-u', '--user-agent', type=str, default='CrossrefParserScript/1.0',
                        help='User Agent for the request (default: CrossrefParserScript/1.0)')
    parser.add_argument('-n', '--null-value', type=str, default='NULL',
                        help='Placeholder value for null/empty fields (default: NULL)')
    parser.add_argument('-l', '--log-file', type=str, default='crossref_errors.log',
                        help='File to log errors (default: crossref_errors.log)')
    parser.add_argument('-w', '--workers', type=int, default=3,
                        help='Number of worker threads for parallel processing (default: 3)')
    parser.add_argument('-j', '--json-dir', type=str,
                        help='Directory containing local JSON files instead of querying API')
    parser.add_argument('-f', '--failed-output', type=str, default='failed_entries.csv',
                        help='Output CSV file for failed entries (default: failed_entries.csv)')
    parser.add_argument('-p', '--members-file', type=str,
                        help='Path to members.json file for publisher names')
    parser.add_argument('-c', '--funder-config', type=str, required=True,
                        help='Path to funder configuration JSON file')
    parser.add_argument('--limit', type=int,
                        help='Limit the number of publications to process (for testing)')
    parser.add_argument('--force-overwrite', action='store_true',
                        help='Force overwrite existing output files without prompting')
    return parser.parse_args()


log_lock = Lock()


def log_error(log_file, doi, error_message):
    timestamp = datetime.now().strftime('%Y-%m-%d %H:%M:%S')
    with log_lock:
        with open(log_file, 'a', encoding='utf-8') as f:
            f.write(f"[{timestamp}] DOI: {doi} - {error_message}\n")


def check_output_files(args):
    if args.force_overwrite:
        return True
        
    results_exists = os.path.exists(args.results)
    failed_exists = os.path.exists(args.failed_output)
    
    if results_exists or failed_exists:
        existing_files = []
        if results_exists:
            existing_files.append(args.results)
        if failed_exists:
            existing_files.append(args.failed_output)
            
        print(f"Warning: The following output file(s) already exist: {', '.join(existing_files)}")
        response = input("Do you want to overwrite? (y/n): ").strip().lower()
        
        if response != 'y':
            print("Operation aborted. Please specify different output file names.")
            return False
            
    return True


def normalize_text(text):
    if not text:
        return ""
    return re.sub(r'[^\w]', '', text).lower()


def tokenize_text(text):
    if not text:
        return []
    return re.split(r'[\s\-_.,;:()\[\]{}]+', text.lower())


def fetch_from_crossref(doi, headers, json_dir=None):
    if json_dir:
        safe_filename = doi.replace('/', '_') + '.json'
        file_path = os.path.join(json_dir, safe_filename)
        try:
            if os.path.exists(file_path):
                with open(file_path, 'r', encoding='utf-8') as f:
                    return json.load(f), None
            else:
                return None, f"JSON file not found: {file_path}"
        except Exception as e:
            return None, f"Error reading JSON file: {str(e)}"
    else:
        url = f"https://api.crossref.org/works/{quote(doi)}"
        try:
            response = requests.get(url, headers=headers)
            response.raise_for_status()
            return response.json(), None
        except requests.exceptions.RequestException as e:
            return None, f"Request failed: {str(e)}"


def extract_created_year(crossref_data):
    if not crossref_data or 'message' not in crossref_data:
        return None
    message = crossref_data['message']
    if 'created' in message and 'date-parts' in message['created']:
        date_parts = message['created']['date-parts']
        if date_parts and len(date_parts) > 0 and len(date_parts[0]) > 0:
            return date_parts[0][0]
    return None


def extract_publisher_info(crossref_data, member_map=None):
    if not crossref_data or 'message' not in crossref_data:
        return None, None
    message = crossref_data['message']
    publisher = message.get('publisher', '')
    member = message.get('member', '')
    if member_map and member in member_map:
        publisher = member_map[member]
    return publisher, member


def extract_funder_info(crossref_data):
    if not crossref_data or 'message' not in crossref_data:
        return [], [], [], []
    message = crossref_data['message']
    funder_info = message.get('funder', [])
    names = []
    award_ids = []
    funder_dois = []
    doi_asserted_by = []
    for funder in funder_info:
        names.append(funder.get('name', ''))
        award_ids.extend(funder.get('award', []))
        funder_dois.append(funder.get('DOI', ''))
        doi_asserted_by.append(funder.get('doi-asserted-by', ''))
    return names, award_ids, funder_dois, doi_asserted_by


def check_funder_doi(funder_dois, target_funder_doi):
    return target_funder_doi in funder_dois


def is_discrete_match(needle, haystack):
    if not needle or not haystack:
        return False
    normalized_needle = normalize_text(needle)
    normalized_haystack = normalize_text(haystack)
    if normalized_needle == normalized_haystack:
        return True
    if re.search(rf'\b{re.escape(needle.lower())}\b', haystack.lower()):
        return True
    needle_tokens = set(tokenize_text(needle))
    haystack_tokens = set(tokenize_text(haystack))
    if not needle_tokens:
        return False
    matching_tokens = needle_tokens.intersection(haystack_tokens)
    match_percentage = len(matching_tokens) / len(needle_tokens)
    return match_percentage >= 0.75


def check_code_in_awards(funder_code, award_ids):
    if not award_ids or not funder_code:
        return False
    for award in award_ids:
        if is_discrete_match(funder_code, award):
            return True
    return False


def check_name_in_funders(funder_names, name_variations):
    for name in funder_names:
        for variation in name_variations:
            if variation.lower() == name.lower() or is_discrete_match(variation, name):
                return True
    return False


def join_with_null_placeholder(items, separator=';', null_value='NULL'):
    if not items:
        return null_value
    return separator.join(item if item else null_value for item in items)


def load_funder_config(config_file):
    try:
        with open(config_file, 'r', encoding='utf-8') as f:
            config = json.load(f)
        
        required_fields = ['funder_doi', 'name_variations']
        for field in required_fields:
            if field not in config:
                raise ValueError(f"Missing required field '{field}' in funder config file")
        
        return config
    except Exception as e:
        print(f"Error loading funder configuration file: {str(e)}")
        traceback.print_exc()
        raise


def process_publication_data(publication, crossref_data, output_dir, args, funder_config, member_map=None):
    doi = publication['doi']
    funder_code = publication['funder_code']
    safe_filename = doi.replace('/', '_') + '.json'
    output_path = os.path.join(output_dir, safe_filename)
    try:
        if not args.json_dir:
            with open(output_path, 'w', encoding='utf-8') as f:
                json.dump(crossref_data, f, indent=2)
        publisher, member = extract_publisher_info(crossref_data, member_map)
        funder_names, award_ids, funder_dois, doi_asserted_by = extract_funder_info(
            crossref_data)
        created_year = extract_created_year(crossref_data)
        has_funder_doi = check_funder_doi(funder_dois, funder_config['funder_doi'])
        code_in_awards = check_code_in_awards(funder_code, award_ids)
        name_in_funders = check_name_in_funders(funder_names, funder_config['name_variations'])
        publisher = publisher or args.null_value
        member = member or args.null_value
        created_year = created_year or args.null_value
        result = publication.copy()
        result.update({
            'publisher': publisher,
            'member': member,
            'funder_names': join_with_null_placeholder(funder_names, null_value=args.null_value),
            'award_ids': join_with_null_placeholder(award_ids, null_value=args.null_value),
            'funder_dois': join_with_null_placeholder(funder_dois, null_value=args.null_value),
            'doi_asserted_by': join_with_null_placeholder(doi_asserted_by, null_value=args.null_value),
            'has_funder_doi': has_funder_doi,
            'code_in_awards': code_in_awards,
            'name_in_funders': name_in_funders,
            'created_year': created_year,
            'error': args.null_value
        })
        return result, True
    except Exception as e:
        error_msg = f"Data processing error: {str(e)}"
        log_error(args.log_file, doi, error_msg)
        print(f"Error processing data for DOI {doi}: {str(e)}")
        traceback.print_exc()
        return create_error_result(publication, args, error_msg), False


def create_error_result(publication, args, error_message):
    result = publication.copy()
    result.update({
        'publisher': 'ERROR',
        'member': 'ERROR',
        'funder_names': args.null_value,
        'award_ids': args.null_value,
        'funder_dois': args.null_value,
        'doi_asserted_by': args.null_value,
        'has_funder_doi': False,
        'code_in_awards': False,
        'name_in_funders': False,
        'created_year': args.null_value,
        'error': error_message
    })
    return result


csv_lock = Lock()
failed_lock = Lock()


def write_result(writer, result):
    with csv_lock:
        writer.writerow(result)


def write_failed_entry(writer, result):
    with failed_lock:
        writer.writerow(result)


def process_from_local_json(publication, args, writer, failed_writer, funder_config, member_map=None):
    doi = publication['doi']
    safe_filename = doi.replace('/', '_') + '.json'
    file_path = os.path.join(args.json_dir, safe_filename)
    try:
        if os.path.exists(file_path):
            with open(file_path, 'r', encoding='utf-8') as f:
                crossref_data = json.load(f)
                result, success = process_publication_data(
                    publication, crossref_data, args.output_dir, args, funder_config, member_map)
                if success:
                    write_result(writer, result)
                    return True
                else:
                    write_failed_entry(failed_writer, result)
                    return False
        else:
            error_msg = f"JSON file not found: {file_path}"
            log_error(args.log_file, doi, error_msg)
            error_result = create_error_result(publication, args, error_msg)
            write_failed_entry(failed_writer, error_result)
            return False
    except Exception as e:
        error_msg = f"Error processing JSON file: {str(e)}"
        log_error(args.log_file, doi, error_msg)
        error_result = create_error_result(publication, args, error_msg)
        write_failed_entry(failed_writer, error_result)
        return False


class RateLimiter:
    def __init__(self, calls_per_second=1):
        self.calls_per_second = calls_per_second
        self.last_call_times = []
        self.lock = Lock()

    def wait(self):
        with self.lock:
            now = time.time()
            self.last_call_times = [
                t for t in self.last_call_times if now - t < 1.0]
            if len(self.last_call_times) >= self.calls_per_second:
                sleep_time = 1.0 - (now - min(self.last_call_times))
                if sleep_time > 0:
                    time.sleep(sleep_time)
            self.last_call_times.append(now)


class RequestManager:
    def __init__(self, args, writer, failed_writer, funder_config, member_map=None):
        self.args = args
        self.writer = writer
        self.failed_writer = failed_writer
        self.output_dir = args.output_dir
        self.log_file = args.log_file
        self.retry_delay = 5 if args.token else args.retry_delay
        self.max_retries = args.retries
        self.max_concurrent = 3 if args.token else 1
        self.rate_limiter = RateLimiter(calls_per_second=self.max_concurrent)
        self.request_semaphore = Semaphore(self.max_concurrent)
        self.processed_count = 0
        self.success_count = 0
        self.error_count = 0
        self.counter_lock = Lock()
        self.active_retries = set()
        self.active_lock = Lock()
        self.retry_workers = []
        self.should_stop = False
        self.processed_dois = set()
        self.processed_dois_lock = Lock()
        self.member_map = member_map
        self.funder_config = funder_config

    def start_retry_workers(self, num_workers):
        for i in range(num_workers):
            retry_queue = Queue()
            retry_thread = Thread(
                target=self.retry_worker_loop,
                args=(retry_queue, i),
                daemon=True
            )
            self.retry_workers.append({
                'thread': retry_thread,
                'queue': retry_queue
            })
            retry_thread.start()

    def retry_worker_loop(self, retry_queue, worker_id):
        while not self.should_stop:
            try:
                try:
                    task = retry_queue.get(timeout=1.0)
                except Empty:
                    continue
                self.process_retry(task)
                retry_queue.task_done()
            except Exception as e:
                print(f"Error in retry worker {worker_id}: {str(e)}")
                traceback.print_exc()

    def shutdown(self):
        self.should_stop = True
        for worker in self.retry_workers:
            worker['thread'].join(timeout=5.0)

    def process_initial_request(self, publication):
        doi = publication['doi']
        with self.processed_dois_lock:
            if doi in self.processed_dois:
                return True
        headers = {'User-Agent': self.args.user_agent}
        if self.args.token:
            headers['Crossref-Plus-API-Token'] = self.args.token
        self.request_semaphore.acquire()
        try:
            self.rate_limiter.wait()
            print(f"Processing DOI: {doi}")
            crossref_data, error_msg = fetch_from_crossref(
                doi, headers, json_dir=self.args.json_dir)
            if crossref_data:
                result, success = process_publication_data(
                    publication, crossref_data, self.output_dir, self.args, 
                    self.funder_config, self.member_map)
                with self.processed_dois_lock:
                    self.processed_dois.add(doi)
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
                return True
            else:
                if not self.args.json_dir:
                    self.schedule_retry(publication, 1)
                else:
                    with self.processed_dois_lock:
                        self.processed_dois.add(doi)
                    error_result = create_error_result(
                        publication, self.args, error_msg)
                    write_failed_entry(self.failed_writer, error_result)
                    with self.counter_lock:
                        self.processed_count += 1
                        self.error_count += 1
                return False
        except Exception as e:
            with self.processed_dois_lock:
                self.processed_dois.add(doi)
            error_msg = f"Unexpected error: {str(e)}"
            log_error(self.log_file, doi, error_msg)
            print(f"Unexpected error while processing {doi}: {str(e)}")
            traceback.print_exc()
            error_result = create_error_result(
                publication, self.args, error_msg)
            write_failed_entry(self.failed_writer, error_result)
            with self.counter_lock:
                self.processed_count += 1
                self.error_count += 1
            return False
        finally:
            self.request_semaphore.release()

    def schedule_retry(self, publication, retry_count):
        doi = publication['doi']
        if retry_count > self.max_retries:
            with self.processed_dois_lock:
                if doi in self.processed_dois:
                    return
                self.processed_dois.add(doi)
            error_msg = f"Failed after {self.max_retries} retry attempts"
            log_error(self.log_file, doi, error_msg)
            print(f"All {self.max_retries} retry attempts failed for DOI {doi}")
            error_result = create_error_result(
                publication, self.args, error_msg)
            write_failed_entry(self.failed_writer, error_result)
            with self.counter_lock:
                self.processed_count += 1
                self.error_count += 1
            return
        retry_task = {
            'publication': publication,
            'retry_count': retry_count,
            'scheduled_time': time.time() + self.retry_delay
        }
        with self.active_lock:
            self.active_retries.add(doi)
        min_queue = min(self.retry_workers, key=lambda w: w['queue'].qsize())
        min_queue['queue'].put(retry_task)
        print(f"Scheduled retry #{retry_count} for DOI {doi} in {self.retry_delay} seconds")

    def process_retry(self, retry_task):
        publication = retry_task['publication']
        retry_count = retry_task['retry_count']
        scheduled_time = retry_task['scheduled_time']
        doi = publication['doi']
        with self.processed_dois_lock:
            if doi in self.processed_dois:
                with self.active_lock:
                    self.active_retries.discard(doi)
                return True
        wait_time = scheduled_time - time.time()
        if wait_time > 0:
            time.sleep(wait_time)
        self.request_semaphore.acquire()
        try:
            self.rate_limiter.wait()
            print(f"Retrying DOI: {doi} (Attempt {retry_count}/{self.max_retries})")
            headers = {'User-Agent': self.args.user_agent}
            if self.args.token:
                headers['Crossref-Plus-API-Token'] = self.args.token
            crossref_data, error_msg = fetch_from_crossref(
                doi, headers, json_dir=self.args.json_dir)
            if crossref_data:
                with self.processed_dois_lock:
                    self.processed_dois.add(doi)
                result, success = process_publication_data(
                    publication, crossref_data, self.output_dir, self.args, 
                    self.funder_config, self.member_map)
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
                with self.active_lock:
                    self.active_retries.discard(doi)
                return True
            else:
                self.schedule_retry(publication, retry_count + 1)
                return False
        except Exception as e:
            with self.processed_dois_lock:
                self.processed_dois.add(doi)
            error_msg = f"Unexpected error during retry: {str(e)}"
            log_error(self.log_file, doi, error_msg)
            print(f"Unexpected error during retry for {doi}: {str(e)}")
            traceback.print_exc()
            error_result = create_error_result(
                publication, self.args, error_msg)
            write_failed_entry(self.failed_writer, error_result)
            with self.counter_lock:
                self.processed_count += 1
                self.error_count += 1
            with self.active_lock:
                self.active_retries.discard(doi)
            return False
        finally:
            self.request_semaphore.release()

    def get_active_retries_count(self):
        with self.active_lock:
            return len(self.active_retries)


def load_member_map(members_file):
    if not members_file or not os.path.exists(members_file):
        return None
    try:
        with open(members_file, 'r', encoding='utf-8') as f:
            members_data = json.load(f)
        member_map = {}
        for member in members_data:
            if 'id' in member and 'name' in member:
                member_map[str(member['id'])] = member['name']
        return member_map
    except Exception as e:
        print(f"Error loading members file: {str(e)}")
        traceback.print_exc()
        return None


def main():
    args = parse_arguments()
    
    if not check_output_files(args):
        return
        
    if not os.path.exists(args.output_dir):
        os.makedirs(args.output_dir)
    
    try:
        funder_config = load_funder_config(args.funder_config)
    except Exception as e:
        print(f"Failed to load funder configuration. Exiting.")
        return
    
    member_map = load_member_map(args.members_file)
    if args.members_file and not member_map:
        print(f"Warning: Failed to load members file {args.members_file}")
    
    file_exists = os.path.exists(args.results)
    failed_exists = os.path.exists(args.failed_output)
    with open(args.input, 'r', encoding='utf-8') as f_in:
        reader = csv.DictReader(f_in)
        fieldnames = list(reader.fieldnames) + [
            'publisher', 'member', 'funder_names', 'award_ids',
            'funder_dois', 'doi_asserted_by', 'has_funder_doi',
            'code_in_awards', 'name_in_funders', 'created_year', 'error'
        ]
        publications = list(reader)
        
        if args.limit and args.limit > 0:
            publications = publications[:args.limit]
            print(f"Limiting processing to the first {args.limit} publications (out of {len(publications)} total)")
        
        with open(args.results, 'w', encoding='utf-8') as f_out, \
                open(args.failed_output, 'w', encoding='utf-8') as f_failed:
            writer = csv.DictWriter(f_out, fieldnames=fieldnames)
            failed_writer = csv.DictWriter(f_failed, fieldnames=fieldnames)
            writer.writeheader()
            failed_writer.writeheader()
            
            if args.json_dir:
                print(f"Processing {len(publications)} publications from local JSON files in {args.json_dir}")
                success_count = 0
                error_count = 0
                with concurrent.futures.ThreadPoolExecutor(max_workers=args.workers) as executor:
                    futures = []
                    for publication in publications:
                        future = executor.submit(
                            process_from_local_json, publication, args, writer, 
                            failed_writer, funder_config, member_map
                        )
                        futures.append(future)
                    for i, future in enumerate(concurrent.futures.as_completed(futures)):
                        try:
                            if future.result():
                                success_count += 1
                            else:
                                error_count += 1
                            if (i+1) % 10 == 0 or (i+1) == len(publications):
                                processed = i + 1
                                print(f"Progress: {processed}/{len(publications)} "
                                      f"({processed/len(publications)*100:.1f}%) - "
                                      f"Success: {success_count}, Errors: {error_count}")
                        except Exception as e:
                            error_count += 1
                            print(f"Worker failed with error: {str(e)}")
                            traceback.print_exc()
                print(f"\nProcessing complete:")
                print(f"  Total processed: {len(publications)}")
                print(f"  Successful: {success_count}")
                print(f"  Failed: {error_count}")
                print(f"Results saved to: {args.results}")
                print(f"Failed entries saved to: {args.failed_output}")
                print(f"Error log saved to: {args.log_file}")
            else:
                manager = RequestManager(
                    args, writer, failed_writer, funder_config, member_map)
                manager.start_retry_workers(max(1, args.workers // 2))
                workers = args.workers if args.token else 1
                max_concurrent = 3 if args.token else 1
                retry_delay = manager.retry_delay
                print(f"Processing {len(publications)} publications with {workers} workers")
                print(f"Maximum {max_concurrent} concurrent requests")
                print(f"Retry delay: {retry_delay} seconds")
                with concurrent.futures.ThreadPoolExecutor(max_workers=workers) as executor:
                    futures = []
                    for publication in publications:
                        future = executor.submit(
                            manager.process_initial_request, publication
                        )
                        futures.append(future)
                    for i, future in enumerate(concurrent.futures.as_completed(futures)):
                        try:
                            future.result()
                            if (i+1) % 10 == 0 or (i+1) == len(publications):
                                with manager.counter_lock:
                                    processed = manager.processed_count
                                    success = manager.success_count
                                    errors = manager.error_count
                                retries_in_progress = manager.get_active_retries_count()
                                total_expected = len(publications)
                                print(f"Progress: {processed}/{total_expected} "
                                      f"({processed/total_expected*100:.1f}%) - "
                                      f"Success: {success}, Errors: {errors}, "
                                      f"Retries in progress: {retries_in_progress}")
                        except Exception as e:
                            print(f"Worker failed with error: {str(e)}")
                            traceback.print_exc()
                print("Waiting for all retries to complete...")
                retries_left = manager.get_active_retries_count()
                while retries_left > 0:
                    with manager.counter_lock:
                        processed = manager.processed_count
                        success = manager.success_count
                        errors = manager.error_count
                    retries_left = manager.get_active_retries_count()
                    total_expected = len(publications)
                    print(f"Completing retries: {processed}/{total_expected} "
                          f"({processed/total_expected*100:.1f}%) - "
                          f"Success: {success}, Errors: {errors}, "
                          f"Retries remaining: {retries_left}")
                    time.sleep(2.0)
                    if processed == total_expected:
                        break
                manager.shutdown()
                with manager.counter_lock:
                    processed = manager.processed_count
                    success = manager.success_count
                    errors = manager.error_count
                print(f"\nProcessing complete:")
                print(f"  Total processed: {processed}")
                print(f"  Successful: {success}")
                print(f"  Failed: {errors}")
                print(f"Results saved to: {args.results}")
                print(f"Failed entries saved to: {args.failed_output}")
                print(f"Error log saved to: {args.log_file}")


if __name__ == "__main__":
    main()