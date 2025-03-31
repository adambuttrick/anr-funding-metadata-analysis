# Crossref Funding Metadata Processor for ANR Publications

Script to query the Crossref API (or read from directory of records) for publications associated with ANR project codes, analyze funding metadata, and generate reports on the completeness of assertions.

## Installation

```bash
pip install requests
```

## Usage

```bash
python get_crossref_funding_metadata.py -i input_file.csv [-o output_dir] [-r results_file.csv] [options]
```
## Arguments

- `-i, --input`: Input CSV file with DOIs and ANR codes
- `-o, --output-dir`: Directory for storing JSON responses (default: crossref_data)
- `-r, --results`: Output CSV file for analysis results (default: anr_funding_analysis.csv)
- `-d, --delay`: Delay between API requests in seconds (default: 1.0)
- `-m, --retries`: Maximum number of retry attempts (default: 3)
- `-t, --token`: Crossref Metadata Plus API token
- `-u, --user-agent`: Custom User-Agent string (default: CrossrefParserScript/1.0)
- `-w, --workers`: Number of worker threads (default: 3)
- `-j, --json-dir`: Directory with local JSON files instead of querying API
- `-f, --failed-output`: CSV file for failed entries (default: failed_entries.csv)
- `-p, --members-file`: Path to members.json file for publisher names

## Example

```bash
python get_crossref_funding_metadata.py -i anr_dois.csv -r funding_results.csv -t your_api_token -w 5 -p members.json
```

## Member File

An optional members.json file can provide a mapping from Crossref member IDs to publisher names. The file should contain an array of objects with `id` and `name` properties:

```json
[
  {"id": "78", "name": "Elsevier"},
  {"id": "297", "name": "Springer Nature"},
  {"id": "301", "name": "Wiley"}
]
```