# Check DOI Registration Agency

Script to check and categorize DOIs by their registration agency (RA).

## Installation

```bash
pip install requests
```

## Usage

```bash
python check_ra.py -i INPUT_FILE -o OUTPUT_FILE [OPTIONS]
```

### Arguments

Required arguments:
- `-i, --input`: Input CSV file path
- `-o, --output`: Output CSV file path

Optional arguments:
- `-c, --column`: Column name containing DOIs (default: `doi`)
- `-m, --retries`: Maximum retry attempts for failed requests (default: `3`)
- `-y, --retry-delay`: Delay between retries in seconds (default: `10`)
- `-t, --token`: API token (if required by endpoint)
- `-u, --user-agent`: User-Agent for API requests (default: `DOI RA Lookup Script/1.0`)
- `-l, --log-file`: File to log errors (default: `doi_ra_errors.log`)
- `-w, --workers`: Number of worker threads for parallel processing (default: `5`)
- `-f, --failed-output`: CSV file for failed entries (default: `failed_dois.csv`)
- `--limit`: Limit the number of rows to process (for testing)
- `--force-overwrite`: Overwrite existing output files without prompting

## Output

The script generates two CSV files:
1. The main output file containing processed DOIs with their registration agencies
2. A separate file for failed DOI lookups with error details

Both output files contain all the columns from the original input file plus:
- `registration_agency`: The registration agency for the DOI (or 'ERROR' if not found)
- `error`: Error details (if any)

## Examples

Basic usage:
```bash
python check_ra.py -i data/my_dois.csv -o results/ra_results.csv
```

Advanced usage with more options:
```bash
python check_ra.py -i data/my_dois.csv -o results/ra_results.csv -c doi_column -w 10 -m 5 -y 5 -f results/failed_dois.csv --force-overwrite
```

Process a subset of rows for testing:
```bash
python check_ra.py -i data/my_dois.csv -o results/ra_results.csv --limit 100
```