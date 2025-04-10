import argparse
import os
import pandas as pd
import shutil
from types import SimpleNamespace

from check_ra import check_ra
from clean_file import clean_file
from deduplicate_csv import deduplicate_csv


def parse_arguments():
    parser = argparse.ArgumentParser(
        description='Clean file by selecting and renaming accurated columns, and clean DOIs')
    parser.add_argument('-i', '--input', required=True,
                        help='Input CSV or JSON file path')
    parser.add_argument('-o', '--output', required=True,
                        help='Output CSV file path')
    parser.add_argument('-f', '--funder-code-column', default='funder_code',
                        help='Column name containing funder grant code (default: funder_code)')
    parser.add_argument('-t', '--title-column', default='title',
                        help='Column name containing publication title (default: title)')
    parser.add_argument('-p', '--publication-year-column', default='publishedYear',
                        help='Column name containing publication year (default: publishedYear)')
    parser.add_argument('-d', '--doi-column', default='doi',
                        help='Column name containing DOI (default: doi)')
    parser.add_argument('-k', '--keys', required=True,
                      help='Comma-separated column names to use as deduplication keys')
    return parser.parse_args()


def main():
    args = parse_arguments()
    input_file_extension = args.input.split('.')[-1]
    if input_file_extension == "csv":
        df = pd.read_csv(args.input)
    elif input_file_extension == "json":
        df = pd.read_json(args.input)
    else:
        print("ERROR on input file, only CSV or JSON files are supported")
        return
    os.makedirs("tmp", exist_ok=True)
    # Clean file
    file_clean_output = "tmp/clean.csv"
    df = clean_file.clean_file(df, args.funder_code_column, args.title_column, args.publication_year_column, args.doi_column)
    df = df[df.is_valid_doi == 1]
    df.to_csv(file_clean_output, encoding="utf-8", index=False)
    # Deduplicate
    file_deduplicate_output = "tmp/deduplicate.csv"
    headers, rows = deduplicate_csv.read_csv_file(file_clean_output)
    unique_rows, _ = deduplicate_csv.deduplicate_rows(headers, rows, args.keys)
    deduplicate_csv.write_csv_file(file_deduplicate_output, headers, unique_rows)
    # Check Registration Agency
    args = SimpleNamespace(**{
        "column": "doi",
        "failed_output": "failed_dois.csv",
        "force_overwrite": True,
        "input": file_deduplicate_output,
        "limit": 0,
        "log_file": "doi_ra_errors.log",
        "output": args.output,
        "retry_delay": 10,
        "retries": 3,
        "token": False,
        "user_agent": "DOI RA Lookup Script/1.0",
        "workers": 5,
    })
    check_ra.check_ra(args)
    shutil.rmtree("tmp")


if __name__ == "__main__":
    main()