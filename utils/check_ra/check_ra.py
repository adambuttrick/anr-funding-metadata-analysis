import os
import re
import csv
import argparse
import requests
from time import sleep
from urllib.parse import quote


def parse_arguments():
    parser = argparse.ArgumentParser(description='Process DOIs and check their registration agencies')
    parser.add_argument('-i', '--input_file', help='Path to the input CSV file containing DOIs')
    parser.add_argument('-o', '--output_dir', default='output', help='Directory for output files (default: output)')
    parser.add_argument('-c', '--column', default='doi', help='Column name containing DOIs (default: doi)')
    parser.add_argument('-d', '--delay', type=float, default=1.0, 
                        help='Delay between API requests in seconds (default: 1.0)')
    return parser.parse_args()


def extract_doi(doi_string):
    pattern = r'(10\.\d{4,}(?:\.\d+)*\/(?:(?!["&\'<>])\S)+)'
    match = re.search(pattern, doi_string)
    if match:
        return match.group(0)
    return None


def check_registration_agency(doi):

    encoded_doi = quote(doi)
    url = f"https://doi.org/ra/{encoded_doi}"
    
    try:
        response = requests.get(url, headers={'Accept': 'application/json'})
        
        if response.status_code == 200:
            data = response.json()
            if data and len(data) > 0:
                return data[0].get('RA', 'unknown'), 'valid'
        
        return 'invalid', 'invalid'
    
    except Exception as e:
        print(f"Error checking DOI {doi}: {str(e)}")
        return 'error', 'invalid'


def process_csv(input_file, output_dir, column_name, delay):
    if not os.path.exists(output_dir):
        os.makedirs(output_dir)
    agency_files = {}
    processed_count = 0
    try:
        with open(input_file, 'r', newline='', encoding='utf-8') as csvfile:
            reader = csv.DictReader(csvfile)
            if column_name not in reader.fieldnames:
                raise ValueError(f"Column '{column_name}' not found in CSV file")
            for row in reader:
                doi_string = row[column_name]
                doi = extract_doi(doi_string)
                if doi:
                    agency, status = check_registration_agency(doi)
                    if agency not in agency_files:
                        file_path = os.path.join(output_dir, f"{agency}.csv")
                        file_handle = open(file_path, 'w', encoding='utf-8')
                        agency_files[agency] = {
                            'file': file_handle,
                            'writer': csv.writer(file_handle)
                        }
                        agency_files[agency]['writer'].writerow(['doi', 'status', 'original_string'])
                    agency_files[agency]['writer'].writerow([doi, status, doi_string])
                    
                    processed_count += 1
                    if processed_count % 10 == 0:
                        print(f"Processed {processed_count} DOIs...")
                    sleep(delay)
                else:
                    print(f"Warning: Could not extract DOI from '{doi_string}'")
        
        print(f"Completed processing {processed_count} DOIs")
        
    except Exception as e:
        print(f"Error processing CSV: {str(e)}")
    
    finally:
        for agency_info in agency_files.values():
            agency_info['file'].close()


def main():
    args = parse_arguments()
    print(f"Processing DOIs from {args.input_file}...")
    process_csv(args.input_file, args.output_dir, args.column, args.delay)
    print("Done!")


if __name__ == "__main__":
    main()