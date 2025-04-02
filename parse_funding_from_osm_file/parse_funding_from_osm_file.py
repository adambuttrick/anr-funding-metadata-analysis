import csv
import sys
import json
import gzip
import argparse
from collections import OrderedDict

def parse_arguments():
    parser = argparse.ArgumentParser(
        description="Parse DOI and ALL grant information from gzipped OSM JSONL file"
    )
    parser.add_argument(
        "-i", "--input-file",
        required=True,
        help="Path to the input gzipped JSONL file (.gz)"
    )
    parser.add_argument(
        "-o", "--output-file",
        required=True,
        help="Path to the output CSV file"
    )
    return parser.parse_args()

def determine_headers(input_file):
    print("Starting Pass 1: Determining all grant fields...")
    grant_keys = set()
    line_count = 0
    try:
        with gzip.open(input_file, 'rt', encoding='utf-8') as infile:
            for line in infile:
                line_count += 1
                try:
                    record = json.loads(line)
                    grants = record.get('grants')
                    if isinstance(grants, list):
                        for grant_dict in grants:
                            if isinstance(grant_dict, dict):
                                grant_keys.update(grant_dict.keys())
                except json.JSONDecodeError:
                    continue

                if line_count % 10000 == 0:
                     print(f"Pass 1: Scanned {line_count} lines...")

    except FileNotFoundError:
        print(f"Error (Pass 1): Input file not found at {input_file}", file=sys.stderr)
        return None
    except gzip.BadGzipFile:
         print(f"Error (Pass 1): Input file {input_file} is not a valid gzip file.", file=sys.stderr)
         return None
    except Exception as e:
        print(f"An unexpected error occurred during Pass 1 at line {line_count}: {e}", file=sys.stderr)
        return None

    sorted_grant_keys = sorted(list(grant_keys))
    final_headers = ['doi'] + sorted_grant_keys
    print(f"Pass 1 Complete: Found {len(grant_keys)} unique grant fields.")
    return final_headers

def process_and_write_data(input_file, output_file, headers):
    print("Starting Pass 2: Processing data and writing CSV...")
    line_count = 0
    rows_written = 0

    try:
        with gzip.open(input_file, 'rt', encoding='utf-8') as infile, \
             open(output_file, 'w', encoding='utf-8') as csvfile:

            writer = csv.DictWriter(csvfile, fieldnames=headers, extrasaction='ignore')
            writer.writeheader()

            for line in infile:
                line_count += 1
                try:
                    record = json.loads(line)
                except json.JSONDecodeError as e:
                    print(f"Warning (Pass 2): Skipping line {line_count} due to JSON decode error: {e}", file=sys.stderr)
                    continue

                doi = record.get('doi')
                grants = record.get('grants')

                if not doi:
                    continue

                if not isinstance(grants, list):
                    continue

                for grant_dict in grants:
                    if isinstance(grant_dict, dict):
                        grant_id_value = grant_dict.get('grantid')
                        if isinstance(grant_id_value, str) and ';' in grant_id_value:
                            split_ids = grant_id_value.split(';')
                            for individual_id in split_ids:
                                cleaned_id = individual_id.strip()
                                if cleaned_id:
                                    split_grant_data = grant_dict.copy()
                                    split_grant_data['grantid'] = cleaned_id
                                    row_data = {'doi': doi}
                                    row_data.update(split_grant_data)
                                    writer.writerow(row_data)
                                    rows_written += 1
                        else:
                            row_data = {'doi': doi}
                            row_data.update(grant_dict)
                            writer.writerow(row_data)
                            rows_written += 1

                if line_count % 1000 == 0:
                     print(f"Pass 2: Processed {line_count} lines, written {rows_written} grant records...")

    except FileNotFoundError:
        print(f"Error (Pass 2): Input file not found at {input_file}", file=sys.stderr)
        return
    except gzip.BadGzipFile:
         print(f"Error (Pass 2): Input file {input_file} is not a valid gzip file.", file=sys.stderr)
         return
    except IOError as e:
        print(f"Error writing to CSV file {output_file}: {e}", file=sys.stderr)
    except Exception as e:
        print(f"An unexpected error occurred during Pass 2 at line {line_count}: {e}", file=sys.stderr)

    print(f"Pass 2 Complete: Processed {line_count} lines. Total grant records written: {rows_written}.")


def main():
    args = parse_arguments()
    input_file = args.input_file
    output_file = args.output_file

    headers = determine_headers(input_file)

    if headers is None:
        print("Could not determine headers. Exiting.")
        return

    if len(headers) <= 1:
        print("Warning: No grant fields found in the input file.")
        try:
            with open(output_file, 'w', newline='', encoding='utf-8') as csvfile:
                writer = csv.DictWriter(csvfile, fieldnames=['doi'])
                writer.writeheader()
            print(f"Created empty CSV {output_file} with only 'doi' header as no grant fields were found.")
        except IOError as e:
            print(f"Error writing empty CSV file {output_file}: {e}", file=sys.stderr)
        return

    process_and_write_data(input_file, output_file, headers)


if __name__ == "__main__":
    main()