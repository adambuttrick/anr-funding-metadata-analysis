import os
import csv
import sys
import time
import signal
import logging
import argparse
import requests
from requests.exceptions import RequestException, HTTPError, ConnectionError, Timeout

logging.basicConfig(
    format='%(asctime)s - %(levelname)s - %(message)s',
    level=logging.INFO
)
logger = logging.getLogger(__name__)
shutdown_requested = False


def signal_handler(sig, frame):
    global shutdown_requested
    logger.warning(
        "Shutdown signal received. Finishing current task and exiting...")
    shutdown_requested = True


def setup_argument_parser():
    parser = argparse.ArgumentParser(
        description='Retrieve DOIs for ANR projects from HAL API')
    parser.add_argument('-i', '--input', required=True,
                        help='Input CSV file with ANR project codes')
    parser.add_argument('-o', '--output', default='anr_dois.csv',
                        help='Output CSV file (default: anr_dois.csv)')
    parser.add_argument('-c', '--code-column', default='Code Projet ANR',
                        help='Column name that contains ANR project codes (default: "Code Projet ANR")')
    parser.add_argument('--delay', type=float, default=0.5,
                        help='Delay between API requests in seconds (default: 0.5)')
    parser.add_argument('--max-results', type=int, default=1000,
                        help='Maximum number of results to retrieve per project (default: 1000)')
    parser.add_argument('--max-retries', type=int, default=2,
                        help='Maximum number of retries for failed API requests (default: 2)')
    parser.add_argument('-v', '--verbose', action='store_true',
                        help='Enable verbose output')
    return parser


def read_anr_codes_from_csv(filepath, code_column):
    try:
        with open(filepath, 'r', encoding='utf-8-sig') as file:
            reader = csv.DictReader(file)
            if code_column not in next(reader, {}):
                available_columns = list(
                    reader.fieldnames) if reader.fieldnames else []
                logger.error(f"Column '{code_column}' not found in CSV. Available columns: {', '.join(available_columns)}")
                return []
            file.seek(0)
            next(reader)
            anr_codes = [row[code_column]
                         for row in reader if row[code_column]]
            logger.info(f"Found {len(anr_codes)} ANR codes in the input file")
            return anr_codes
    except FileNotFoundError:
        logger.error(f"Input file not found: {filepath}")
        return []
    except Exception as e:
        logger.error(f"Error reading input file: {e}")
        return []


def query_hal_api(anr_code, max_results=1000, max_retries=2):
    query = f'anrProjectReference_s:"{anr_code}"'
    base_url = "http://api.archives-ouvertes.fr/search/"
    params = {
        'q': query,
        'fl': 'doiId_s,title_s,halId_s,submittedDate_s',
        'rows': max_results,
        'wt': 'json'
    }

    retry_count = 0
    base_delay = 1.0

    while retry_count <= max_retries:
        if shutdown_requested:
            logger.warning(f"Query cancelled for ANR code {anr_code} due to shutdown request")
            return []

        try:
            logger.debug(f"Querying HAL API for ANR code {anr_code} (attempt {retry_count + 1})")
            response = requests.get(base_url, params=params, timeout=30)
            response.raise_for_status()

            data = response.json()
            num_found = data.get('response', {}).get('numFound', 0)
            documents = data.get('response', {}).get('docs', [])
            logger.debug(f"Found {num_found} documents for ANR code {anr_code}")
            return documents

        except HTTPError as e:
            status_code = e.response.status_code
            if status_code in (429, 503, 504):
                retry_count += 1
                if retry_count <= max_retries:
                    delay = base_delay * (2 ** (retry_count - 1))
                    logger.warning(f"Rate limit or server error for ANR code {anr_code}: {status_code}. Retrying in {delay}s...")
                    time.sleep(delay)
                else:
                    logger.error(f"Maximum retries reached for ANR code {anr_code}: {status_code}")
                    return []
            else:
                logger.error(f"HTTP Error for ANR code {anr_code}: {status_code}")
                return []

        except (ConnectionError, Timeout) as e:
            retry_count += 1
            if retry_count <= max_retries:
                delay = base_delay * (2 ** (retry_count - 1))
                logger.warning(f"Connection Error for ANR code {anr_code}: {e}. Retrying in {delay}s...")
                time.sleep(delay)
            else:
                logger.error(f"Maximum retries reached for ANR code {anr_code}: {e}")
                return []

        except RequestException as e:
            logger.error(f"Request Error for ANR code {anr_code}: {e}")
            return []

        except Exception as e:
            logger.error(f"Error querying HAL API for ANR code {anr_code}: {e}")
            return []

    return []


def initialize_output_file(output_filepath):
    fieldnames = ['anr_code', 'doi', 'title', 'hal_id', 'submitted_date']
    try:
        with open(output_filepath, 'w', encoding='utf-8') as file:
            writer = csv.DictWriter(file, fieldnames=fieldnames)
            writer.writeheader()
        logger.debug(f"Initialized output file: {output_filepath}")
        return True
    except Exception as e:
        logger.error(f"Error initializing output file: {e}")
        return False


def append_results_to_csv(results, output_filepath):
    if not results:
        return

    fieldnames = ['anr_code', 'doi', 'title', 'hal_id', 'submitted_date']
    try:
        file_exists = os.path.isfile(output_filepath)

        with open(output_filepath, 'a', encoding='utf-8') as file:
            writer = csv.DictWriter(file, fieldnames=fieldnames)
            if not file_exists:
                writer.writeheader()
            writer.writerows(results)

        logger.debug(f"Appended {len(results)} results to {output_filepath}")
    except Exception as e:
        logger.error(f"Error appending results to CSV: {e}")


def process_anr_projects(anr_codes, output_filepath, max_results=1000, delay=0.5, max_retries=2):
    total_dois = 0
    processed_codes = 0

    if not initialize_output_file(output_filepath):
        return False

    for i, anr_code in enumerate(anr_codes):
        if shutdown_requested:
            logger.warning(f"Processing stopped after {processed_codes}/{len(anr_codes)} ANR codes due to shutdown request")
            break

        logger.info(f"Processing ANR code {i+1}/{len(anr_codes)}: {anr_code}")

        documents = query_hal_api(anr_code, max_results, max_retries)

        batch_results = []
        for doc in documents:
            doi = doc.get('doiId_s', '')
            if doi:
                result = {
                    'anr_code': anr_code,
                    'doi': doi,
                    'title': doc.get('title_s', [''])[0] if isinstance(doc.get('title_s'), list) else doc.get('title_s', ''),
                    'hal_id': doc.get('halId_s', ''),
                    'submitted_date': doc.get('submittedDate_s', '')
                }
                batch_results.append(result)

        if batch_results:
            append_results_to_csv(batch_results, output_filepath)
            total_dois += len(batch_results)
            logger.info(f"Found {len(batch_results)} DOIs for ANR code {anr_code}")

        processed_codes += 1

        if i < len(anr_codes) - 1 and not shutdown_requested:
            time.sleep(delay)

    logger.info(f"Found a total of {total_dois} DOIs across {processed_codes} ANR codes")
    return total_dois > 0


def main():
    signal.signal(signal.SIGINT, signal_handler)
    signal.signal(signal.SIGTERM, signal_handler)

    parser = setup_argument_parser()
    args = parser.parse_args()

    if args.verbose:
        logger.setLevel(logging.DEBUG)

    logger.info("Starting HAL ANR DOI Retriever")

    anr_codes = read_anr_codes_from_csv(args.input, args.code_column)

    if not anr_codes:
        logger.error("No ANR codes found. Exiting.")
        sys.exit(1)

    success = process_anr_projects(
        anr_codes,
        args.output,
        max_results=args.max_results,
        delay=args.delay,
        max_retries=args.max_retries
    )

    if shutdown_requested:
        logger.info("Process terminated due to shutdown request")
        sys.exit(0)
    elif success:
        logger.info("Process completed successfully")
        sys.exit(0)
    else:
        logger.error("Process completed with errors")
        sys.exit(1)


if __name__ == "__main__":
    main()
