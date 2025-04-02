# ANR OSM DOI Overlap Analysis

Script to compare two CSV files containing DOIs fo and identify the overlaps and differences between them.

## Installation

```bash
pip install pandas
```

## Usage

```bash
python find_anr_osm_overlap.py -f1 FILE1.csv -f2 FILE2.csv [-o OUTPUT_DIR]
```

### Arguments

- `-f1, --file1`: Path to the first CSV file (required)
- `-f2, --file2`: Path to the second CSV file (required)
- `-o, --output`: Directory to save output files (default: "file_comparison_results")

## Output Files

The script generates four CSV files in the specified output directory:

1. `overlap_[file1]_vs_[file2].csv`: DOIs present in both files
2. `non_overlap_[file1]_vs_[file2].csv`: DOIs present in only one of the files
3. `in_[file1]_not_in_[file2].csv`: DOIs present only in the first file
4. `in_[file2]_not_in_[file1].csv`: DOIs present only in the second file
