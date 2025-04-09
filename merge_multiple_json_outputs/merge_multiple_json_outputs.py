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


def merge_publishers(pub1, pub2):
    result = {
        "id": pub1.get("id"),
        "type": pub1.get("type"),
        "attributes": pub1.get("attributes")
    }
    relationships = pub1.get("relationships", {}).get("publications", {}).get("total", 0) + pub2.get("relationships", {}).get("publications", {}).get("total", 0)
    result["relationships"] = { "publications": { "total": relationships } }
    by_funder = pub1.get("stats", {}).get("by_funder", {})
    by_funder.update(pub2.get("stats", {}).get("by_funder", {}))
    result["stats"] = { "by_funder": by_funder }
    return result


def main():
    args = parse_arguments()
    os.makedirs(args.output_dir, exist_ok=True)
    for item in [{ "file_name": "award.json", "key": "awards" }, { "file_name": "funder.json", "key": "funders" }, { "file_name": "publisher.json", "key": "publishers" }]:
        with open(f"{args.input_dir_1}/{item.get('file_name')}", "r", encoding="utf-8") as f:
            data1 = json.load(f).get(item.get("key"))
        with open(f"{args.input_dir_2}/{item.get('file_name')}", "r", encoding="utf-8") as f:
            data2 = json.load(f).get(item.get("key"))
        other_data, data = (data2, data1) if len(data1) > len(data2) else (data1, data2)
        tmp = {}
        for d in data:
            tmp[d.get("id")] = d
        for d in other_data:
            if d.get("id") in tmp:
                if item.get("key") == "publishers":
                    tmp[d.get("id")] = merge_publishers(d, tmp[d.get("id")])
                else:
                    # TODO
                    print(f"a merge should be done for {item.get('key')} and append to data")
            else:
                tmp[d.get("id")] = d
        with open(f"{args.output_dir}/{item.get('file_name')}", "w", encoding="utf-8") as f:
            json.dump({ item.get("key") : list(tmp.values()) }, f, indent=2)


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