# Create Stats Files

Script for creating stats files summarizing the funding metadata completeness in Crossref records for a funder publications.


## Usage

```bash
python create_stats_files.py -i input_file.csv [options]
```

## Arguments

- `-i, --input-file`: Path to the input CSV file
- `-o, --output-dir`: Directory to save the output CSV files (default: stats_output)
- `-c, --funder-config`: Funder config file containing the Funder ID/DOI to track
- `--aggregate-output`: Path to output file for aggregate stats (default: aggregate_stats.csv)
- `--publisher-output`: Path to output file for publisher stats (default: publisher_stats.csv)
- `--yearly-output`: Path to output file for yearly stats (default: yearly_stats.csv)
- `--publisher-yearly-output`: Path to output file for publisher yearly stats (default: publisher_yearly_stats.csv)
- `--aggregate-only`: Only calculate aggregate statistics (skip publisher breakdown)
- `--include-missing`: Include missing values in the statistics
- `--funder-doi`: Funder DOI to track

## Output Reports

The script generates four CSV reports with comprehensive metrics on:
- DOI assertion sources (Crossref, publisher, etc.)
- Funder DOI presence
- Funder code in award IDs
- Funder name in funders list
- Potential funding indicators