# Check DOI Registration Agency

Script to select columns, rename them, clean DOI and check if a DOI is valid or not.

## Usage

```bash
python clean_file.py -i INPUT_FILE -o OUTPUT_FILE [OPTIONS]
```

### Arguments

Required arguments:
- `-i, --input`: Input CSV or JSON file path
- `-o, --output`: Output CSV file path

Optional arguments:
- `-f, --funder-code-column`: Column name containing funder grant code (default: `funder_code`)
- `-t, --title-column`: Column name containing publication title (default: `title`)
- `-p, --publication-year-column`: Column name containing publication year (default: `publishedYear`)
- `-d, --doi-column`: Column name containing DOI (default: `doi`)

## Output

The script generates a CSV file formatted as intended for the next steps, plus an extra column "is_valid_doi" that is set to 0 if the DOI is not valid, 1 elsewhere.

## Examples

Basic usage:
```bash
python clean_file.py -i data/my_dois.csv -o results/clean_results.csv
```

Advanced usage with more options:
```bash
python clean_file.py -i data/my_dois.csv -o results/clean_results.csv -f "GRANTED" -t "TITLE_COLUMN_NAME" -p "RANDOM_YEAR_COLUMN" -d "DOI"
```