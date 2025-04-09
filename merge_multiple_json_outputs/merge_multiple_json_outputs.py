import argparse
import json
import os


def parse_arguments():
    parser = argparse.ArgumentParser(
        description='Calculate statistics for funding data fields.')
    parser.add_argument('-i1', '--input-dir-1', required=True,
                        help='Path to a first directory containing JSON data files')
    parser.add_argument('-i2', '--input-dir-2',
                        help='Path to a second directory containing JSON data files')
    parser.add_argument('-o', '--output-dir',
                        help='Path to the directory that will contain the output')
    return parser.parse_args()


def main():
    args = parse_arguments()
    os.makedirs(args.output_dir, exist_ok=True)
    for item in [{ "file_name": "award.json", "key": "awards" }, { "file_name": "funder.json", "key": "funders" }, { "file_name": "publisher.json", "key": "publishers" }]:
        with open(f"{args.input_dir_1}/{item.get('file_name')}", "r", encoding="utf-8") as f:
            data1 = json.load(f).get(item.get("key"))
        with open(f"{args.input_dir_2}/{item.get('file_name')}", "r", encoding="utf-8") as f:
            data2 = json.load(f).get(item.get("key"))
        other_data, data = (data2, data1) if len(data1) > len(data2) else (data1, data2)
        data_ids = [d.get("id") for d in data]
        for d in other_data:
            if d.get("id") not in data_ids:
                data.append(d)
            else:
                # TODO
                print("a merge should be done and appent to data")
        with open(f"{args.output_dir}/{item.get('file_name')}", "w", encoding="utf-8") as f:
            json.dump({ item.get("key") : data }, f, indent=2)


if __name__ == "__main__":
    """
    This functions aims at merging 2 directories, each containing 3 JSON data files :
    - award.json
    - funder.json
    - publisher.json
    The output will be a new directory containing 3 new files and each file will be the merge of the 2 inputs.
    This output directory is typically the one expected in the API data directory `funding-metadata-api/data`
    """
    main()