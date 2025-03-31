# Crossref Members Retriever

A script to retrieve all Crossref member organizations and their IDs from the Crossref API, saving the data in a JSON format for use with other tools.

## Installation

```bash
pip install requests
```

## Usage

```bash
python get_all_crossref_members.py [options]
```

## Arguments

- `-o, --output`: Output JSON file path (default: members.json)
- `-r, --rows`: Number of rows per request (default: 1000, max: 1000)
- `-e, --email`: Your email address to include in requests (for access to the polite pool in the Crossref API)
- `--retry`: Maximum number of retries for failed requests (default: 3)
- `--delay`: Delay between requests in seconds (default: 1)

## Example

```bash
python get_all_crossref_members.py -o publishers.json -e researcher@university.edu --delay 2
```

## Output Format

The script generates a JSON file containing an array of objects with member IDs and names:

```json
[
  {"id": "78", "name": "Elsevier"},
  {"id": "297", "name": "Springer Nature"},
  {"id": "301", "name": "Wiley"}
]
```