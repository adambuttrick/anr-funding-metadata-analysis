# OSM Funding Parser

Script for extracting DOI and grant information from gzipped French Open Science Monitor JSONL files.


## Usage

```bash
python parse_funding_from_osm_file.py -i INPUT_FILE.jsonl.gz -o OUTPUT_FILE.csv
```

### Arguments

- `-i, --input-file`: Path to the input gzipped JSONL file (required)
- `-o, --output-file`: Path to the output CSV file (required)

## Processing

The script performs a two-pass process:
1. First pass: Scans the entire file to identify all unique grant field names
2. Second pass: Processes each record and writes the extracted grant information to CSV
