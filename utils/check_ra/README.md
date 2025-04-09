# Check DOI Registration Agency

Script to check and categorize DOIs by their registration agency (RA).

## Installation

```bash
pip install requests
```


## Usage

```bash
python check_ra.py -i INPUT_FILE [-o OUTPUT_DIR] [-c COLUMN_NAME] [-d DELAY]
```

### Arguments

- `-i, --input_file`: Path to input CSV file containing DOIs (required)
- `-o, --output_dir`: Directory for output files (default: `output`)
- `-c, --column`: Column name in CSV containing DOIs (default: `doi`)
- `-d, --delay`: Delay between API requests in seconds (default: 1.0)

## Output

The script creates separate CSV files in the output directory, named after each RA found (e.g., `crossref.csv`, `datacite.csv`). Each file contains:

- `doi`: The extracted DOI
- `status`: Validity status of the DOI
- `original_string`: The original string from which the DOI was extracted

## Example

```bash
python check_ra.py -i dois.csv -o results -c doi_column -d 0.5
```
