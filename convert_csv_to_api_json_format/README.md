# CSV to API JSON Format Converter

Script that converts funding stats from CSV files into a structured JSON format for funding analysis.

## Overview

This script processes a set of CSV files containing funding information and transforms them into a structured JSON format. It generates three separate JSON files:

1. **Funder data** - Information about the funding organization
2. **Publisher data** - Details about publishers associated with the funded research
3. **Award data** - Information about individual funding awards and their associated publications

## Usage

```bash
python convert_csv_to_api_json_format.py -i <input_dir> -o <output_dir> -n <funder_name> -d <funder_doi> -r <ror_id> [-f <funder_file>] [-p <publisher_file>] [-a <award_file>]
```

### Required Arguments

- `-i, --input-dir`: Directory containing input CSV files
- `-o, --output-dir`: Output directory for JSON files
- `-n, --funder-name`: Name of the funder
- `-c, --funder-config`: Funder config file containing the Funder ID/DOI to track
- `-r, --ror-id`: ROR ID of the funder

### Optional Arguments

- `-f, --funder-file`: Filename for funder output (default: funder.json)
- `-p, --publisher-file`: Filename for publisher output (default: publisher.json)
- `-a, --award-file`: Filename for award output (default: award.json)

## Input CSV Files

The script expects the following CSV files in the input directory:

- `aggregate_stats.csv`: Aggregate statistics about the funding data
- `yearly_stats.csv`: Year-by-year statistics about the funding data
- `publisher_stats.csv`: Statistics about publishers of funded research
- `publisher_yearly_stats.csv`: Year-by-year statistics about publishers
- `funding_analysis.csv`: Detailed information about individual publications and their funding

## Output

The script generates three JSON files:

1. **Funder JSON**: Contains information about the funding organization, including relationships with publishers and awards
2. **Publisher JSON**: Contains details about publishers, including statistics related to the funder
3. **Award JSON**: Contains details about individual awards, including related publications

## Example

```bash
python convert_csv_to_api_json_format.py -i ./data/csv -o ./data/json -n "National Science Foundation" -d "10.13039/100000001" -r "https://ror.org/01bj3aw27"
```
