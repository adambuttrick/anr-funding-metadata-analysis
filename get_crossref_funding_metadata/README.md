# Get Crossref Record Data

Script to process publications, query the Crossref API, and analyze the completeness of funding metadata.

## Usage
```bash
python get_crossref_record_data.py -i input.csv -c funder_config.json -o crossref_data
```

## Arguments
```
  -i, --input             Input CSV file path (required)
  -o, --output-dir        Output directory for JSON files (default: crossref_data)
  -r, --results           Output CSV file for results (default: funding_analysis.csv)
  -d, --delay             Delay between API requests in seconds (default: 1.0)
  -m, --retries           Maximum number of retries for API requests (default: 3)
  -y, --retry-delay       Delay between retries in seconds (default: 30)
  -t, --token             Crossref Metadata Plus API token
  -u, --user-agent        User Agent for the request (default: CrossrefParserScript/1.0)
  -n, --null-value        Placeholder value for null/empty fields (default: NULL)
  -l, --log-file          File to log errors (default: crossref_errors.log)
  -w, --workers           Number of worker threads (default: 3)
  -j, --json-dir          Directory containing local JSON files instead of querying API
  -f, --failed-output     Output CSV file for failed entries (default: failed_entries.csv)
  -p, --members-file      Path to members.json file for publisher names
  -c, --funder-config     Path to funder configuration JSON file (required)
  --limit                 Limit the number of publications to process (for testing)
  --force-overwrite       Force overwrite existing output files without prompting
```

## Input Formats
The input CSV must contain at least the following columns:
- `doi`: Digital Object Identifier of the publication
- `funder_code`: Funding award/project code to check against award IDs in the funding metadata

The funder configuration JSON must contain:
- `funder_doi`: DOI identifier for the funder in the Crossref Funder Registry
- `name_variations`: Array of different names/abbreviations used to refer to the funder

Example funder configuration:
```json
{
  "funder_doi": "10.13039/501100001665",
  "name_variations": [
    "Agence Nationale de la Recherche",
    "French National Agency for Research",
    "ANR",
    "French National Research Agency"
  ]
}
```

## Output
1. CSV file with publication data and funding analysis
2. JSON files with raw Crossref API responses
3. Error log file and failed entries CSV

The analysis results include:
- Publisher information
- Funder names found in the publication
- Award IDs
- Funder DOIs
- Whether the funding organization's DOI is present
- Whether the funding code is found in award IDs
- Whether any of the funder name variations are found

## File Safety
The script will check if output files already exist and prompt for confirmation before overwriting. Use the `--force-overwrite` flag to bypass this check and automatically overwrite existing files.

## Testing Mode
For testing purposes, you can use the `--limit` argument to process only the first N publications from the input file. This is useful for verifying configuration and output format before running a full analysis.

Example:
```bash
python get_crossref_record_data.py -i input.csv -c funder_config.json --limit 10
```
This will process only the first 10 publications in the input file.