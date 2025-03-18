# HAL ANR DOI Retriever

Script to retrieve DOIs for ANR funded projects from the HAL (Hyper Articles en Ligne) API.


## Installation

```bash
pip install requests
```

## Usage

```bash
python retrieve_anr_funded_dois_from_hal_api.py -i input_file.csv [-o output_file.csv] [options]
```

## Arguments

- `-i, --input`: Input CSV file containing ANR project codes
- `-o, --output`: Output CSV file (default: anr_dois.csv)
- `-c, --code-column`: Column name with ANR project codes (default: "Code Projet ANR")
- `--delay`: Delay between API requests in seconds (default: 0.5)
- `--max-results`: Maximum results per project (default: 1000)
- `--max-retries`: Maximum retries for failed requests (default: 2)
- `-v, --verbose`: Enable verbose output

## Output Format

The script generates a CSV file with the following columns:
- anr_code
- doi
- title
- hal_id
- submitted_date

## Example

```bash
python retrieve_anr_funded_dois_from_hal_api.py -i anr_projects.csv -o results.csv --delay 1 -v
```