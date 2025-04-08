import sys
import argparse
from pathlib import Path
import pandas as pd

def parse_args():
    parser = argparse.ArgumentParser(
        description='Compare two CSV files based on DOI and include grant IDs.'
        )
    parser.add_argument('-f1', '--file1', required=True,
                        help='Path to the first input CSV file (expects columns "doi", "anr_code").')
    parser.add_argument('-f2', '--file2', required=True,
                        help='Path to the second input CSV file (expects columns "doi", "grantid").')
    parser.add_argument('-o', '--output', default='file_comparison_results',
                        help='Directory to save output files (default: file_comparison_results).')
    return parser.parse_args()


def compare_doi_csvs_with_grants(file1_path, file2_path, output_dir):
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
    in_f1_not_in_f2_file = output_path / f"in_{file1.stem}_not_in_{file2.stem}.csv"
    in_f2_not_in_f1_file = output_path / f"in_{file2.stem}_not_in_{file1.stem}.csv"

    try:
        print(f"\nReading {file1}...")
        df1 = pd.read_csv(file1, dtype=str)
        print(f"Reading {file2}...")
        df2 = pd.read_csv(file2, dtype=str)

        required_cols_f1 = ['doi', 'anr_code']
        required_cols_f2 = ['doi', 'grantid']
        if not all(col in df1.columns for col in required_cols_f1):
            missing = [col for col in required_cols_f1 if col not in df1.columns]
            print(f"Error: Missing required columns in {file1}: {', '.join(missing)}")
            sys.exit(1)
        if not all(col in df2.columns for col in required_cols_f2):
            missing = [col for col in required_cols_f2 if col not in df2.columns]
            print(f"Error: Missing required columns in {file2}: {', '.join(missing)}")
            sys.exit(1)

        df1_proc = df1[required_cols_f1].rename(columns={'anr_code': 'grant_id_f1'})
        df2_proc = df2[required_cols_f2].rename(columns={'grantid': 'grant_id_f2'})

        df1_proc['doi'] = df1_proc['doi'].str.lower().str.strip()
        df2_proc['doi'] = df2_proc['doi'].str.lower().str.strip()

        df1_proc = df1_proc.dropna(subset=['doi'])
        df1_proc = df1_proc[df1_proc['doi'] != '']
        df2_proc = df2_proc.dropna(subset=['doi'])
        df2_proc = df2_proc[df2_proc['doi'] != '']

        unique_dois1 = df1_proc['doi'].nunique()
        unique_dois2 = df2_proc['doi'].nunique()
        print(f"Found {unique_dois1} unique, non-empty DOIs in {file1.name} (using {len(df1_proc)} rows for comparison).")
        print(f"Found {unique_dois2} unique, non-empty DOIs in {file2.name} (using {len(df2_proc)} rows for comparison).")

        if df1_proc.empty:
             print(f"Warning: No valid DOIs found or processed in {file1.name}.")
        if df2_proc.empty:
             print(f"Warning: No valid DOIs found or processed in {file2.name}.")

        print("\nCalculating overlap and differences using merge...")

        merged_outer = pd.merge(df1_proc, df2_proc, on='doi', how='outer', indicator=True)

        overlap_df = merged_outer[merged_outer['_merge'] == 'both'][['doi', 'grant_id_f1', 'grant_id_f2']]
        overlap_df = overlap_df.sort_values(by='doi').reset_index(drop=True)

        in_f1_not_in_f2_df = merged_outer[merged_outer['_merge'] == 'left_only'][['doi', 'grant_id_f1']]
        in_f1_not_in_f2_df = in_f1_not_in_f2_df.sort_values(by='doi').reset_index(drop=True)

        in_f2_not_in_f1_df = merged_outer[merged_outer['_merge'] == 'right_only'][['doi', 'grant_id_f2']]
        in_f2_not_in_f1_df = in_f2_not_in_f1_df.sort_values(by='doi').reset_index(drop=True)

        print(f"\nWriting {len(overlap_df)} overlapping DOI rows (with grants from both files) to: {overlap_file}")
        overlap_df.to_csv(overlap_file, index=False)

        print(f"Writing {len(in_f1_not_in_f2_df)} DOI rows found only in {file1.name} (with its grant ID) to: {in_f1_not_in_f2_file}")
        in_f1_not_in_f2_df.to_csv(in_f1_not_in_f2_file, index=False)

        print(f"Writing {len(in_f2_not_in_f1_df)} DOI rows found only in {file2.name} (with its grant ID) to: {in_f2_not_in_f1_file}")
        in_f2_not_in_f1_df.to_csv(in_f2_not_in_f1_file, index=False)

        print("\nProcessing complete.")
        print(f"Output files generated in: {output_path.resolve()}")

    except pd.errors.EmptyDataError as e:
        print(f"Error: Input file could not be read or is empty: {e}")
        sys.exit(1)
    except KeyError as e:
        print(f"Error: A required column is missing from an input file: {e}")
        sys.exit(1)
    except Exception as e:
        print(f"An unexpected error occurred: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)


def main():
    args = parse_args()
    compare_doi_csvs_with_grants(args.file1, args.file2, args.output)


if __name__ == "__main__":
    main()