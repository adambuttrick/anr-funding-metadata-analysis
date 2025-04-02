import sys
import argparse
from pathlib import Path
import pandas as pd

def parse_args():
    parser = argparse.ArgumentParser(description='Compare two DOI CSV files.')
    parser.add_argument('-f1', '--file1', required=True,
                        help='Path to the first input CSV file.')
    parser.add_argument('-f2', '--file2', required=True,
                        help='Path to the second input CSV file.')
    parser.add_argument('-o', '--output', default='file_comparison_results',
                        help='Directory to save output files (default: file_comparison_results).')
    return parser.parse_args()


def compare_doi_csvs(file1_path, file2_path, output_dir):
    file1 = Path(file1_path)
    file2 = Path(file2_path)
    output_path = Path(output_dir)

    if not file1.is_file():
        print(f"Error: Input file not found: {file1}")
        sys.exit(1)
    if not file2.is_file():
        print(f"Error: Input file not found: {file2}")
        sys.exit(1)

    try:
        output_path.mkdir(parents=True, exist_ok=True)
        print(f"Output directory: {output_path.resolve()}")
    except OSError as e:
        print(f"Error creating output directory '{output_path}': {e}")
        sys.exit(1)

    overlap_file = output_path / f"overlap_{file1.stem}_vs_{file2.stem}.csv"
    non_overlap_file = output_path / f"non_overlap_{file1.stem}_vs_{file2.stem}.csv"
    in_f1_not_in_f2_file = output_path / f"in_{file1.stem}_not_in_{file2.stem}.csv"
    in_f2_not_in_f1_file = output_path / f"in_{file2.stem}_not_in_{file1.stem}.csv"

    try:
        print(f"\nReading {file1}...")
        df1 = pd.read_csv(file1, dtype={'doi': str})
        print(f"Reading {file2}...")
        df2 = pd.read_csv(file2, dtype={'doi': str})

        if 'doi' not in df1.columns:
            print(f"Error: 'doi' column not found in {file1}")
            sys.exit(1)
        if 'doi' not in df2.columns:
            print(f"Error: 'doi' column not found in {file2}")
            sys.exit(1)

        dois1 = set(df1['doi'].str.strip().str.lower().dropna().unique())
        dois2 = set(df2['doi'].str.strip().str.lower().dropna().unique())

        print(f"Found {len(dois1)} unique, non-empty DOIs in {file1.name}")
        print(f"Found {len(dois2)} unique, non-empty DOIs in {file2.name}")

        if not dois1:
            print(f"Warning: No valid DOIs found in {file1.name}.")
        if not dois2:
            print(f"Warning: No valid DOIs found in {file2.name}.")

        print("\nCalculating overlap and differences...")
        overlap_dois = dois1.intersection(dois2)
        in_f1_not_in_f2_dois = dois1.difference(dois2)
        in_f2_not_in_f1_dois = dois2.difference(dois1)
        non_overlap_dois = dois1.symmetric_difference(dois2)

        overlap_df = pd.DataFrame(sorted(list(overlap_dois)), columns=['doi'])
        non_overlap_df = pd.DataFrame(
            sorted(list(non_overlap_dois)), columns=['doi'])
        in_f1_not_in_f2_df = pd.DataFrame(
            sorted(list(in_f1_not_in_f2_dois)), columns=['doi'])
        in_f2_not_in_f1_df = pd.DataFrame(
            sorted(list(in_f2_not_in_f1_dois)), columns=['doi'])

        print(f"\nWriting {len(overlap_df)} overlapping DOIs to: {overlap_file}")
        overlap_df.to_csv(overlap_file, index=False)

        print(f"Writing {len(non_overlap_df)} non-overlapping DOIs to: {non_overlap_file}")
        non_overlap_df.to_csv(non_overlap_file, index=False)

        print(f"Writing {len(in_f1_not_in_f2_df)} DOIs in {file1.name} only to: {in_f1_not_in_f2_file}")
        in_f1_not_in_f2_df.to_csv(in_f1_not_in_f2_file, index=False)

        print(f"Writing {len(in_f2_not_in_f1_df)} DOIs in {file2.name} only to: {in_f2_not_in_f1_file}")
        in_f2_not_in_f1_df.to_csv(in_f2_not_in_f1_file, index=False)

        print("\nProcessing complete.")
        print(f"Output files generated in: {output_path.resolve()}")

    except pd.errors.EmptyDataError:
        print(f"Error: One of the input files is empty or invalid.")
        sys.exit(1)
    except Exception as e:
        print(f"An unexpected error occurred: {e}")
        sys.exit(1)


def main():
    args = parse_args()
    compare_doi_csvs(args.file1, args.file2, args.output)


if __name__ == "__main__":
    main()
