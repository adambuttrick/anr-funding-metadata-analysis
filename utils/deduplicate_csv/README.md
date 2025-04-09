# CSV Deduplication Tool

Script to identify and remove duplicate entries from CSV files based on specified key columns.


## Usage

```bash
python deduplicate_csv.py -i input_file.csv -k "doi,funder_code" [-o output_file.csv] [-d duplicates_file.csv] [-s ","] [-v]
```

## Arguments

- `-i, --input_file`: Input CSV file path
- `-k, --keys`: Comma-separated column names to use as deduplication keys
- `-o, --output`: Output file for unique entries (default: unique_[input_file])
- `-d, --duplicates`: Output file for duplicate entries (default: duplicates_[input_file])
- `-s, --separator`: CSV delimiter (default: comma)
- `-v, --verbose`: Enable verbose output

## Examples

Basic usage:
```bash
python deduplicate_csv.py -i customers.csv -k "funder_code"
```

Multiple deduplication keys:
```bash
python deduplicate_csv.py -i records.csv -k "doi,funder_code" -v
```

Custom delimiter:
```bash
python deduplicate_csv.py -i data.csv -k "doi" -s ";" -o clean_data.csv
```