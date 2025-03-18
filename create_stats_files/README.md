# Create Stats Files

Script for creating stats files summarizing the funding metadata completeness in Crossref records for ANR-funded publications.


## Usage

```bash
python create_stats_files.py -i input_file.csv [options]
```

## Arguments

- `-i, --input_file`: Path to input CSV file with ANR publication data
- `--aggregate-output`: Output path for aggregate statistics (default: aggregate_stats.csv)
- `--publisher-output`: Output path for publisher statistics (default: publisher_stats.csv)
- `--yearly-output`: Output path for yearly statistics (default: yearly_stats.csv)
- `--publisher-yearly-output`: Output path for publisher-yearly statistics (default: publisher_yearly_stats.csv)
- `--aggregate-only`: Only calculate aggregate statistics (skip publisher breakdown)
- `--include-missing`: Include missing values in statistics
- `--anr-funder-doi`: ANR funder DOI to track (default: 10.13039/501100001665)

## Output Reports

The script generates four CSV reports with comprehensive metrics on:
- DOI assertion sources (Crossref, publisher, etc.)
- ANR funder DOI presence
- ANR code in award IDs
- ANR name in funders list
- Potential ANR funding indicators