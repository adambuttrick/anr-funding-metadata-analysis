import os
import csv
import json
import hashlib
import argparse
from collections import defaultdict


def parse_args():
    parser = argparse.ArgumentParser(
        description='Convert CSV data to JSON format for funding analysis.')
    parser.add_argument('-i', '--input-dir', required=True,
                        help='Directory containing input CSV files')
    parser.add_argument('-o', '--output-dir', required=True,
                        help='Output directory for JSON files')
    parser.add_argument('-n', '--funder-name',
                        required=True, help='Name of the funder')
    parser.add_argument('-c', '--funder-config', required=True,
                        help='Path to the funder configuration JSON file')
    parser.add_argument('-r', '--ror-id', help='ROR ID of the funder')
    parser.add_argument('-f', '--funder-file', default='funder.json',
                        help='Filename for funder output (default: funder.json)')
    parser.add_argument('-p', '--publisher-file', default='publisher.json',
                        help='Filename for publisher output (default: publisher.json)')
    parser.add_argument('-a', '--award-file', default='award.json',
                        help='Filename for award output (default: award.json)')
    return parser.parse_args()


def read_csv(file_path):
    with open(file_path, 'r', encoding='utf-8') as f:
        reader = csv.DictReader(f)
        return list(reader)

def load_funder_config(file_path):
    with open(file_path, 'r', encoding='utf-8') as f:
        return json.load(f)

def process_aggregate_stats(data):
    result = {
        "funder_doi_asserted_by": {},
        "has_funder_doi": {},
        "award_code_in_awards": {},
        "funder_name_in_funders": {},
        "records_in_funder_data": 0
    }
    for row in data:
        field = row['field']
        value_type = row['value_type']
        count = int(row['count'])
        percentage = float(row['percentage'])
        total_records = int(row['total_records'])
        if field == 'doi_asserted_by':
            result["funder_doi_asserted_by"][value_type] = {
                "count": count,
                "percentage": percentage
            }
            result["records_in_funder_data"] = total_records
        elif field == 'has_funder_doi':
            result["has_funder_doi"][value_type] = {
                "count": count,
                "percentage": percentage
            }
        elif field == 'code_in_awards':
            result["award_code_in_awards"][value_type] = {
                "count": count,
                "percentage": percentage
            }
        elif field == 'name_in_funders':
            result["funder_name_in_funders"][value_type] = {
                "count": count,
                "percentage": percentage
            }
    return result


def process_yearly_stats(data):
    result = {}
    for row in data:
        year = row['year']
        field = row['field']
        value_type = row['value_type']
        count = int(row['count'])
        percentage = float(row['percentage'])
        total_records = int(row['total_records'])
        if year not in result:
            result[year] = {
                "funder_doi_asserted_by": {},
                "has_funder_doi": {},
                "award_code_in_awards": {},
                "funder_name_in_funders": {},
                "records_in_funder_data": 0
            }
        if field == 'doi_asserted_by':
            result[year]["funder_doi_asserted_by"][value_type] = {
                "count": count,
                "percentage": percentage
            }
            result[year]["records_in_funder_data"] = total_records
        elif field == 'has_funder_doi':
            result[year]["has_funder_doi"][value_type] = {
                "count": count,
                "percentage": percentage
            }
        elif field == 'code_in_awards':
            result[year]["award_code_in_awards"][value_type] = {
                "count": count,
                "percentage": percentage
            }
        elif field == 'name_in_funders':
            result[year]["funder_name_in_funders"][value_type] = {
                "count": count,
                "percentage": percentage
            }
    return result


def extract_publisher_info(publisher_stats_data, funding_analysis_data):
    publishers = {}
    publication_counts = defaultdict(int)
    for row in funding_analysis_data:
        publisher = row['publisher']
        if publisher:
            publication_counts[publisher] += 1
    for row in publisher_stats_data:
        publisher_name = row['publisher']
        member_id = row['member_id']
        if publisher_name not in publishers and row['field'] == 'doi_asserted_by':
            total_records = int(row['total_records'])
            publishers[publisher_name] = {
                "id": member_id,
                "name": publisher_name,
                "publication_count": total_records,
                "source": "extract_publisher_info"
            }
    return list(publishers.values())


def process_publisher_data(publisher_stats_data, publisher_yearly_stats_data, funder_simple_id, funder_name):
    publishers = defaultdict(lambda: {
        "id": "",
        "type": "publisher",
        "attributes": {
            "name": "",
            "member_id": ""
        },
        "relationships": {
            "publications": {
                "total": 0
            }
        },
        "stats": {
            "by_funder": {
                funder_simple_id: {
                    "funder_name": funder_name,
                    "aggregate": {
                        "funder_doi_asserted_by": {},
                        "has_funder_doi": {},
                        "award_code_in_awards": {},
                        "funder_name_in_funders": {},
                        "total_records": 0
                    },
                    "yearly": {}
                }
            }
        }
    })

    publisher_records = {}
    publisher_names = {}

    for row in publisher_stats_data:
        publisher_name = row['publisher']
        member_id = row['member_id']
        field = row['field']
        value_type = row['value_type']
        count = int(row['count'])
        percentage = float(row['percentage'])
        total_records = int(row['total_records'])

        if not member_id:
            continue

        if member_id not in publisher_names:
            publisher_names[member_id] = publisher_name

        if publishers[member_id]["id"] == "":
            publishers[member_id]["id"] = member_id
            publishers[member_id]["attributes"]["name"] = publisher_name
            publishers[member_id]["attributes"]["member_id"] = member_id

        if member_id not in publisher_records:
            publisher_records[member_id] = total_records
            publishers[member_id]["stats"]["by_funder"][funder_simple_id]["aggregate"]["total_records"] = total_records
            if field == 'doi_asserted_by':
                publishers[member_id]["relationships"]["publications"]["total"] = total_records

        if field == 'doi_asserted_by':
            publishers[member_id]["stats"]["by_funder"][funder_simple_id]["aggregate"]["funder_doi_asserted_by"][value_type] = {
                "count": count,
                "percentage": percentage
            }
        elif field == 'has_funder_doi':
            publishers[member_id]["stats"]["by_funder"][funder_simple_id]["aggregate"]["has_funder_doi"][value_type] = {
                "count": count,
                "percentage": percentage
            }
        elif field == 'code_in_awards':
            publishers[member_id]["stats"]["by_funder"][funder_simple_id]["aggregate"]["award_code_in_awards"][value_type] = {
                "count": count,
                "percentage": percentage
            }
        elif field == 'name_in_funders':
            publishers[member_id]["stats"]["by_funder"][funder_simple_id]["aggregate"]["funder_name_in_funders"][value_type] = {
                "count": count,
                "percentage": percentage
            }

    for row in publisher_yearly_stats_data:
        publisher_name = row['publisher']
        member_id = row['member_id']

        if not member_id or member_id not in publishers:
            continue

        year = row['year']
        field = row['field']
        value_type = row['value_type']
        count = int(row['count'])
        percentage = float(row['percentage'])
        total_records = int(row['total_records'])

        if year not in publishers[member_id]["stats"]["by_funder"][funder_simple_id]["yearly"]:
            publishers[member_id]["stats"]["by_funder"][funder_simple_id]["yearly"][year] = {
                "funder_doi_asserted_by": {},
                "has_funder_doi": {},
                "award_code_in_awards": {},
                "funder_name_in_funders": {},
                "total_records": total_records
            }

        if field == 'doi_asserted_by':
            publishers[member_id]["stats"]["by_funder"][funder_simple_id]["yearly"][year]["funder_doi_asserted_by"][value_type] = {
                "count": count,
                "percentage": percentage
            }
        elif field == 'has_funder_doi':
            publishers[member_id]["stats"]["by_funder"][funder_simple_id]["yearly"][year]["has_funder_doi"][value_type] = {
                "count": count,
                "percentage": percentage
            }
        elif field == 'code_in_awards':
            publishers[member_id]["stats"]["by_funder"][funder_simple_id]["yearly"][year]["award_code_in_awards"][value_type] = {
                "count": count,
                "percentage": percentage
            }
        elif field == 'name_in_funders':
            publishers[member_id]["stats"]["by_funder"][funder_simple_id]["yearly"][year]["funder_name_in_funders"][value_type] = {
                "count": count,
                "percentage": percentage
            }

    return list(publishers.values())


def process_award_data(funding_analysis_data, funder_simple_id, funder_name):
    awards = defaultdict(lambda: {
        "id": "",
        "type": "award",
        "attributes": {
            "code": "",
            "grant_doi": None
        },
        "relationships": {
            "funders": [
                {
                    "id": funder_simple_id,
                    "name": funder_name
                }
            ],
            "publications": []
        },
        "stats": {
            "publication_count": 0,
            "publisher_breakdown": [],
            "yearly": {}
        }
    })
    year_counts = defaultdict(lambda: defaultdict(int))
    publisher_counts = defaultdict(lambda: defaultdict(int))
    member_ids = {}
    for row in funding_analysis_data:
        funder_code = row['funder_code']
        doi = row['doi']
        title = row.get('title', None)
        created_year = row['created_year']
        publisher = row['publisher']
        member_id = row['member']
        if not funder_code or not doi:
            continue
        award_hash = hashlib.md5(funder_code.encode()).hexdigest()[:8]
        award_id = f"{funder_simple_id}:{award_hash}"
        awards[funder_code]["id"] = award_id
        awards[funder_code]["attributes"]["code"] = funder_code
        if not any(p["id"] == doi for p in awards[funder_code]["relationships"]["publications"]):
            publication = {
                "id": doi,
                "title": title,
                "created_year": created_year
            }
            awards[funder_code]["relationships"]["publications"].append(
                publication)
            awards[funder_code]["stats"]["publication_count"] += 1
            if created_year:
                year_counts[funder_code][created_year] += 1
            if publisher:
                publisher_counts[funder_code][publisher] += 1
                if member_id:
                    member_ids[publisher] = member_id
    for funder_code, award in awards.items():
        for year, count in year_counts[funder_code].items():
            award["stats"]["yearly"][year] = {
                "publication_count": count
            }
        for publisher, count in publisher_counts[funder_code].items():
            breakdown = {
                "id": member_ids.get(publisher, ""),
                "name": publisher,
                "count": count
            }
            award["stats"]["publisher_breakdown"].append(breakdown)
    return list(awards.values())


def get_total_publications_count(aggregate_stats_data):
    for row in aggregate_stats_data:
        if row['field'] == 'doi_asserted_by':
            return int(row['total_records'])
    return 0


def build_funder_output(funder_simple_id, ror_id, funder_name, funder_doi, aggregate_stats, yearly_stats, publisher_relations, awards_data, total_publications):
    funder_data = {
        "funders": [
            {
                "id": funder_simple_id,
                "type": "funder",
                "attributes": {
                    "name": funder_name,
                    "funder_doi": funder_doi,
                    "ror_id": ror_id
                },
                "relationships": {
                    "publishers": publisher_relations,
                    "publications": {
                        "total": total_publications
                    },
                    "awards": {
                        "total": sum(award["stats"]["publication_count"] for award in awards_data),
                        "unique_codes": len(awards_data)
                    }
                },
                "stats": {
                    "aggregate": aggregate_stats,
                    "yearly": yearly_stats
                }
            }
        ]
    }
    return funder_data


def build_publisher_output(publishers_data):
    return {
        "publishers": publishers_data
    }


def build_award_output(awards_data):
    return {
        "awards": awards_data
    }


def main():
    args = parse_args()
    input_dir = args.input_dir
    aggregate_stats_file = os.path.join(input_dir, 'aggregate_stats.csv')
    yearly_stats_file = os.path.join(input_dir, 'yearly_stats.csv')
    publisher_stats_file = os.path.join(input_dir, 'publisher_stats.csv')
    publisher_yearly_stats_file = os.path.join(
        input_dir, 'publisher_yearly_stats.csv')
    funding_analysis_file = os.path.join(input_dir, 'funding_analysis.csv')

    funder_config_data = load_funder_config(args.funder_config)
    funder_doi = funder_config_data.get('funder_doi')
    if not funder_doi:
        print(f"Error: 'funder_doi' not found in {args.funder_config}")
        exit(1)

    aggregate_stats_data = read_csv(aggregate_stats_file)
    yearly_stats_data = read_csv(yearly_stats_file)
    publisher_stats_data = read_csv(publisher_stats_file)
    publisher_yearly_stats_data = read_csv(publisher_yearly_stats_file)
    funding_analysis_data = read_csv(funding_analysis_file)

    ror_id = args.ror_id
    funder_name = args.funder_name
    funder_simple_id = (ror_id if ror_id else funder_doi).split('/')[-1]

    total_publications = get_total_publications_count(aggregate_stats_data)
    aggregate_stats = process_aggregate_stats(aggregate_stats_data)
    yearly_stats = process_yearly_stats(yearly_stats_data)

    publishers_data = process_publisher_data(
        publisher_stats_data, publisher_yearly_stats_data, funder_simple_id, funder_name)

    publisher_relations = []
    for publisher in publishers_data:
        publisher_relation = {
            "id": publisher["id"],
            "name": publisher["attributes"]["name"],
            "publication_count": publisher["relationships"]["publications"]["total"]
        }
        publisher_relations.append(publisher_relation)

    awards_data = process_award_data(
        funding_analysis_data, funder_simple_id, funder_name)

    funder_output = build_funder_output(funder_simple_id, ror_id, funder_name, funder_doi,
                                        aggregate_stats, yearly_stats, publisher_relations, awards_data, total_publications)
    publisher_output = build_publisher_output(publishers_data)
    award_output = build_award_output(awards_data)

    os.makedirs(args.output_dir, exist_ok=True)
    funder_file = os.path.join(args.output_dir, args.funder_file)
    publisher_file = os.path.join(args.output_dir, args.publisher_file)
    award_file = os.path.join(args.output_dir, args.award_file)

    with open(funder_file, 'w', encoding='utf-8') as f:
        json.dump(funder_output, f, indent=2)
    with open(publisher_file, 'w', encoding='utf-8') as f:
        json.dump(publisher_output, f, indent=2)
    with open(award_file, 'w', encoding='utf-8') as f:
        json.dump(award_output, f, indent=2)

    print(f"Successfully wrote JSON outputs to:")
    print(f"- Funder: {funder_file}")
    print(f"- Publisher: {publisher_file}")
    print(f"- Award: {award_file}")


if __name__ == "__main__":
    main()