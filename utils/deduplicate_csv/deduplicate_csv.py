import os
import csv
import argparse


def parse_arguments():
    parser = argparse.ArgumentParser(description='Deduplicate CSV entries.')
    parser.add_argument('-i', '--input_file', help='Input CSV file path')
    parser.add_argument('-o', '--output', 
                      help='Output CSV file path for unique entries (default: unique_[input_file])')
    parser.add_argument('-d', '--duplicates', 
                      help='Output CSV file path for duplicate entries (default: duplicates_[input_file])')
    parser.add_argument('-k', '--keys', required=True,
                      help='Comma-separated column names to use as deduplication keys')
    parser.add_argument('-s', '--separator', default=',', 
                      help='CSV delimiter (default: comma)')
    parser.add_argument('-v', '--verbose', action='store_true', 
                      help='Enable verbose output')
    return parser.parse_args()


def read_csv_file(file_path, delimiter=',', verbose=False):
    if verbose:
        print(f"Reading file: {file_path}")
    
    if not os.path.exists(file_path):
        raise FileNotFoundError(f"Input file not found: {file_path}")
    
    with open(file_path, 'r', newline='', encoding='utf-8') as csvfile:
        reader = csv.reader(csvfile, delimiter=delimiter)
        headers = next(reader)
        rows = list(reader)
    
    if verbose:
        print(f"Read {len(rows)} rows with {len(headers)} columns")
    
    return headers, rows

def get_key_indices(headers, key_columns):
    key_indices = []
    for key in key_columns:
        try:
            key_indices.append(headers.index(key))
        except ValueError:
            raise ValueError(f"Key column '{key}' not found in headers")
    return key_indices

def create_composite_key(row, key_indices):
    return '|'.join(row[idx] for idx in key_indices)

def deduplicate_rows(headers, rows, key_columns, verbose=False):
    if isinstance(key_columns, str):
        key_columns = [k.strip() for k in key_columns.split(',')]
    
    key_indices = get_key_indices(headers, key_columns)
    
    unique_entries = {}
    duplicate_entries = []
    
    for row in rows:
        if len(row) < len(headers):
            if verbose:
                print(f"Warning: Skipping row with insufficient columns: {row}")
            continue
            
        composite_key = create_composite_key(row, key_indices)
        
        if not composite_key or composite_key.count('|') + 1 != len(key_indices):
            if verbose:
                print(f"Warning: Skipping row with empty key components: {row}")
            continue
            
        if composite_key in unique_entries:
            duplicate_entries.append(row)
            if verbose:
                print(f"Found duplicate for composite key '{composite_key}'")
        else:
            unique_entries[composite_key] = row
    
    if verbose:
        print(f"Found {len(unique_entries)} unique entries")
        print(f"Found {len(duplicate_entries)} duplicate entries")
    
    return list(unique_entries.values()), duplicate_entries

def write_csv_file(file_path, headers, rows, delimiter=',', verbose=False):
    with open(file_path, 'w', encoding='utf-8') as csvfile:
        writer = csv.writer(csvfile, delimiter=delimiter)
        writer.writerow(headers)
        writer.writerows(rows)
    
    if verbose:
        print(f"Wrote {len(rows)} rows to {file_path}")

def main():
    args = parse_arguments()
    try:
        output_file = args.output if args.output else f"unique_{os.path.basename(args.input_file)}"
        duplicates_file = args.duplicates if args.duplicates else f"duplicates_{os.path.basename(args.input_file)}"
        
        headers, rows = read_csv_file(args.input_file, args.separator, args.verbose)
        
        unique_rows, duplicate_rows = deduplicate_rows(headers, rows, args.keys, args.verbose)
        
        write_csv_file(output_file, headers, unique_rows, args.separator, args.verbose)
        
        if duplicate_rows and args.duplicates is not None:
            write_csv_file(duplicates_file, headers, duplicate_rows, args.separator, args.verbose)
            if args.verbose:
                print(f"Wrote {len(duplicate_rows)} duplicate rows to {duplicates_file}")
        
        if args.verbose:
            print(f"Deduplication complete. Original: {len(rows)} rows, Unique: {len(unique_rows)} rows, Duplicates: {len(duplicate_rows)} rows")
        
        return 0
    except Exception as e:
        print(f"Error: {e}")
        return 1

if __name__ == "__main__":
    exit(main())