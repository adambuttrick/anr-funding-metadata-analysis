import argparse
import numpy as np
import pandas as pd


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
    return parser.parse_args()


def clean_file (publications, funder_code_column, title_column, publication_year_column, doi_column):
    # Rename columns
    publications = publications.rename(columns= {funder_code_column: "funder_code", title_column: "title", publication_year_column: "publishedYear", doi_column: "doi"})[["funder_code", "doi", "title", "publishedYear"]]
    # Create new empty column "hal_id"
    publications["hal_id"] = np.nan
    # Clean DOI
    publications["doi"] = publications["doi"].replace("^https://doi.org/", "", regex=True)
    # Create new column "is_valid_doi"
    publications['is_valid_doi'] = np.where(publications.doi.notna() & publications.doi.str.startswith("10."), 1, 0)
    return publications


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
    df = clean_file(df, args.funder_code_column, args.title_column, args.publication_year_column, args.doi_column)
    df.to_csv(args.output, encoding="utf-8")


if __name__ == "__main__":
    main()