import os
import csv
import sys
import json
import argparse
from collections import defaultdict, Counter
import os


def parse_arguments():
    parser = argparse.ArgumentParser(
        description='Calculate statistics for funding data fields.')
    parser.add_argument('-i', '--input-file', required=True,
                        help='Path to the input CSV file')
    parser.add_argument('-c', '--funder-config', required=True,
                        help='Path to the input JSON configuration file (containing funder_doi)')
    parser.add_argument('-o', '--output-dir', default='./stats_output',
                        help='Directory to save the output CSV files (default: current directory)')
    parser.add_argument('--aggregate-only', action='store_true',
                        help='Only calculate aggregate statistics (skip publisher breakdown)')
    parser.add_argument('--include-missing', action='store_true',
                        help='Include missing values in the statistics')
    return parser.parse_args()


def read_json_config(file_path):
    try:
        with open(file_path, 'r', encoding='utf-8') as f:
            config = json.load(f)
            if 'funder_doi' not in config:
                print(f"Error: 'funder_doi' key missing in config file: {file_path}")
                exit(1)
            return config
    except FileNotFoundError:
        print(f"Error: Config file not found: {file_path}")
        exit(1)
    except json.JSONDecodeError:
        print(f"Error: Invalid JSON format in config file: {file_path}")
        exit(1)
    except Exception as e:
        print(f"Error reading config file {file_path}: {e}")
        exit(1)


def read_csv_data(file_path):
    data = []
    try:
        with open(file_path, 'r', encoding='utf-8') as csvfile:
            reader = csv.DictReader(csvfile)
            for row in reader:
                data.append(row)
        return data
    except Exception as e:
        print(f"Error reading CSV file: {e}")
        exit(1)


def parse_boolean_value(value):
    if not value or value.strip() == '' or value.strip().upper() == 'NULL':
        return 'missing'
    elif value.lower() in ('true', 't', 'yes', 'y', '1'):
        return True
    elif value.lower() in ('false', 'f', 'no', 'n', '0'):
        return False
    else:
        return 'invalid'


def calculate_doi_asserted_by_stats(data, funder_doi):
    doi_counter = defaultdict(Counter)
    unique_dois = set()

    for row in data:
        doi = row.get('doi', '').lower().strip()
        unique_dois.add(doi)

        funder_dois = row.get('funder_dois', '')
        doi_asserted_by = row.get('doi_asserted_by', '')

        if not funder_dois or funder_dois.strip() == '' or funder_dois.upper() == 'NULL':
            doi_counter[doi]['not_asserted'] += 1
        else:
            funder_doi_list = [d.strip() for d in funder_dois.split(';')]
            asserter_list = []

            if doi_asserted_by and doi_asserted_by.strip() != '' and doi_asserted_by.upper() != 'NULL':
                asserter_list = [a.strip().lower() if a.strip().upper() != 'NULL' else 'missing'
                                 for a in doi_asserted_by.split(';')]

            if len(asserter_list) < len(funder_doi_list):
                asserter_list.extend(['missing'] * (len(funder_doi_list) - len(asserter_list)))

            funder_found = False
            for i, funder_doi_item in enumerate(funder_doi_list):
                if funder_doi_item == funder_doi:
                    funder_found = True
                    if i < len(asserter_list):
                        asserter = asserter_list[i]
                        if asserter == 'crossref':
                            doi_counter[doi]['crossref'] += 1
                        elif asserter == 'publisher':
                            doi_counter[doi]['publisher'] += 1
                        elif asserter == 'missing':
                            doi_counter[doi]['missing'] += 1
                        else:
                            doi_counter[doi]['other'] += 1
                    else:
                        doi_counter[doi]['missing'] += 1
                    break

            if not funder_found:
                doi_counter[doi]['not_asserted'] += 1

    counter = Counter()
    for doi, values in doi_counter.items():
        for value, count in values.items():
            counter[value] += 1

    total = len(unique_dois)
    if total == 0:
        return {
            'crossref_count': 0,
            'publisher_count': 0,
            'other_count': 0,
            'missing_count': 0,
            'not_asserted_count': 0,
            'crossref_percentage': 0,
            'publisher_percentage': 0,
            'other_percentage': 0,
            'missing_percentage': 0,
            'not_asserted_percentage': 0,
            'total': 0
        }

    crossref_count = counter.get('crossref', 0)
    publisher_count = counter.get('publisher', 0)
    other_count = counter.get('other', 0)
    missing_count = counter.get('missing', 0)
    not_asserted_count = counter.get('not_asserted', 0)

    return {
        'crossref_count': crossref_count,
        'publisher_count': publisher_count,
        'other_count': other_count,
        'missing_count': missing_count,
        'not_asserted_count': not_asserted_count,
        'crossref_percentage': (crossref_count / total) * 100 if total > 0 else 0,
        'publisher_percentage': (publisher_count / total) * 100 if total > 0 else 0,
        'other_percentage': (other_count / total) * 100 if total > 0 else 0,
        'missing_percentage': (missing_count / total) * 100 if total > 0 else 0,
        'not_asserted_percentage': (not_asserted_count / total) * 100 if total > 0 else 0,
        'total': total
    }


def calculate_boolean_field_stats(data, field_name, include_missing=False):
    if field_name == 'has_funder_doi':
        return calculate_funder_doi_stats(data, include_missing)
    elif field_name == 'code_in_awards':
        return calculate_award_code_stats(data, include_missing)
    elif field_name == 'name_in_funders':
        return calculate_funder_name_stats(data, include_missing)
    else:
        return calculate_generic_boolean_stats(data, field_name, include_missing)


def calculate_funder_doi_stats(data, include_missing=False):
    doi_values = {}
    for row in data:
        doi = row.get('doi', '').lower().strip()
        value = parse_boolean_value(row.get('has_funder_doi', ''))
        if value == True or value == False or (include_missing and (value == 'missing' or value == 'invalid')):
            doi_values[doi] = value

    counter = Counter(doi_values.values())
    true_count = counter.get(True, 0)
    false_count = counter.get(False, 0)
    missing_count = counter.get('missing', 0)
    invalid_count = counter.get('invalid', 0)

    total = len(doi_values)

    return {
        'true_count': true_count,
        'false_count': false_count,
        'missing_count': missing_count,
        'invalid_count': invalid_count,
        'true_percentage': (true_count / total) * 100 if total > 0 else 0,
        'false_percentage': (false_count / total) * 100 if total > 0 else 0,
        'missing_percentage': (missing_count / total) * 100 if total > 0 else 0,
        'invalid_percentage': (invalid_count / total) * 100 if total > 0 else 0,
        'total': total
    }


def calculate_award_code_stats(data, include_missing=False):
    counter = Counter()
    for row in data:
        value = parse_boolean_value(row.get('code_in_awards', ''))
        if value == True or value == False or (include_missing and (value == 'missing' or value == 'invalid')):
            counter[value] += 1

    total = sum(counter.values())
    if total == 0:
        return {
            'true_count': 0,
            'false_count': 0,
            'missing_count': 0,
            'invalid_count': 0,
            'true_percentage': 0,
            'false_percentage': 0,
            'missing_percentage': 0,
            'invalid_percentage': 0,
            'total': total
        }

    return {
        'true_count': counter.get(True, 0),
        'false_count': counter.get(False, 0),
        'missing_count': counter.get('missing', 0),
        'invalid_count': counter.get('invalid', 0),
        'true_percentage': (counter.get(True, 0) / total) * 100 if total > 0 else 0,
        'false_percentage': (counter.get(False, 0) / total) * 100 if total > 0 else 0,
        'missing_percentage': (counter.get('missing', 0) / total) * 100 if total > 0 else 0,
        'invalid_percentage': (counter.get('invalid', 0) / total) * 100 if total > 0 else 0,
        'total': total
    }


def calculate_funder_name_stats(data, include_missing=False):
    doi_values = {}
    for row in data:
        doi = row.get('doi', '').lower().strip()
        value = parse_boolean_value(row.get('name_in_funders', ''))
        if value == True or value == False or (include_missing and (value == 'missing' or value == 'invalid')):
            if doi in doi_values:
                if doi_values[doi] == True:
                    continue
                elif value == True:
                    doi_values[doi] = True
                else:
                    doi_values[doi] = doi_values[doi] or value
            else:
                doi_values[doi] = value

    counter = Counter(doi_values.values())
    true_count = counter.get(True, 0)
    false_count = counter.get(False, 0)
    missing_count = counter.get('missing', 0)
    invalid_count = counter.get('invalid', 0)

    total = len(doi_values)

    return {
        'true_count': true_count,
        'false_count': false_count,
        'missing_count': missing_count,
        'invalid_count': invalid_count,
        'true_percentage': (true_count / total) * 100 if total > 0 else 0,
        'false_percentage': (false_count / total) * 100 if total > 0 else 0,
        'missing_percentage': (missing_count / total) * 100 if total > 0 else 0,
        'invalid_percentage': (invalid_count / total) * 100 if total > 0 else 0,
        'total': total
    }


def calculate_generic_boolean_stats(data, field_name, include_missing=False):
    counter = Counter()
    for row in data:
        value = parse_boolean_value(row.get(field_name, ''))
        if value == True or value == False or (include_missing and (value == 'missing' or value == 'invalid')):
            counter[value] += 1

    total = sum(counter.values())
    if total == 0:
        return {
            'true_count': 0,
            'false_count': 0,
            'missing_count': 0,
            'invalid_count': 0,
            'true_percentage': 0,
            'false_percentage': 0,
            'missing_percentage': 0,
            'invalid_percentage': 0,
            'total': total
        }

    return {
        'true_count': counter.get(True, 0),
        'false_count': counter.get(False, 0),
        'missing_count': counter.get('missing', 0),
        'invalid_count': counter.get('invalid', 0),
        'true_percentage': (counter.get(True, 0) / total) * 100 if total > 0 else 0,
        'false_percentage': (counter.get(False, 0) / total) * 100 if total > 0 else 0,
        'missing_percentage': (counter.get('missing', 0) / total) * 100 if total > 0 else 0,
        'invalid_percentage': (counter.get('invalid', 0) / total) * 100 if total > 0 else 0,
        'total': total
    }


def calculate_potential_stats(data):
    doi_metrics = defaultdict(
        lambda: {'has_funder_doi': False, 'has_award_id': False, 'has_funder_name': False})
    for row in data:
        doi = row.get('doi', '').lower().strip()
        has_funder_doi = parse_boolean_value(row.get('has_funder_doi', ''))
        has_award_id = parse_boolean_value(row.get('code_in_awards', ''))
        has_funder_name = parse_boolean_value(
            row.get('name_in_funders', ''))

        if has_funder_doi == True:
            doi_metrics[doi]['has_funder_doi'] = True
        if has_award_id == True:
            doi_metrics[doi]['has_award_id'] = True
        if has_funder_name == True:
            doi_metrics[doi]['has_funder_name'] = True

    potential_count = sum(1 for metrics in doi_metrics.values()
                          if not metrics['has_funder_doi'] and
                          (metrics['has_award_id'] or metrics['has_funder_name']))

    total_records = len(doi_metrics)

    return {
        'potential_count': potential_count,
        'potential_percentage': (potential_count / total_records) * 100 if total_records > 0 else 0,
        'total_records': total_records
    }


def calculate_aggregate_stats(data, boolean_fields, include_missing=False, funder_doi=None):
    stats = {}
    stats['doi_asserted_by'] = calculate_doi_asserted_by_stats(
        data, funder_doi)
    for field in boolean_fields:
        stats[field] = calculate_boolean_field_stats(
            data, field, include_missing)
    stats['potential'] = calculate_potential_stats(data)
    return stats


def calculate_yearly_stats(data, boolean_fields, include_missing=False, funder_doi=None):
    yearly_data = defaultdict(list)
    for row in data:
        year = row.get('created_year', '')
        if year:
            yearly_data[year].append(row)

    stats = {}
    for year, year_data in yearly_data.items():
        year_stats = calculate_aggregate_stats(year_data, boolean_fields, include_missing, funder_doi)
        stats[year] = year_stats

    return stats


def calculate_publisher_stats(data, boolean_fields, include_missing=False, funder_doi=None):
    publisher_data = defaultdict(list)
    for row in data:
        key = (row.get('publisher', ''), row.get('member', ''))
        publisher_data[key].append(row)

    stats = []
    for (publisher, member), pub_data in publisher_data.items():
        aggregate_stats = calculate_aggregate_stats(pub_data, boolean_fields, include_missing, funder_doi)

        doi_stats = aggregate_stats['doi_asserted_by']
        stats.append({
            'publisher': publisher,
            'member_id': member,
            'field': 'doi_asserted_by',
            'value_type': 'crossref',
            'count': doi_stats['crossref_count'],
            'percentage': doi_stats['crossref_percentage'],
            'total_records': doi_stats['total']
        })
        stats.append({
            'publisher': publisher,
            'member_id': member,
            'field': 'doi_asserted_by',
            'value_type': 'publisher',
            'count': doi_stats['publisher_count'],
            'percentage': doi_stats['publisher_percentage'],
            'total_records': doi_stats['total']
        })
        if doi_stats['other_count'] > 0:
            stats.append({
                'publisher': publisher,
                'member_id': member,
                'field': 'doi_asserted_by',
                'value_type': 'other',
                'count': doi_stats['other_count'],
                'percentage': doi_stats['other_percentage'],
                'total_records': doi_stats['total']
            })
        if include_missing and doi_stats['missing_count'] > 0:
            stats.append({
                'publisher': publisher,
                'member_id': member,
                'field': 'doi_asserted_by',
                'value_type': 'missing',
                'count': doi_stats['missing_count'],
                'percentage': doi_stats['missing_percentage'],
                'total_records': doi_stats['total']
            })
        stats.append({
            'publisher': publisher,
            'member_id': member,
            'field': 'doi_asserted_by',
            'value_type': 'not_asserted',
            'count': doi_stats['not_asserted_count'],
            'percentage': doi_stats['not_asserted_percentage'],
            'total_records': doi_stats['total']
        })

        for field, values in aggregate_stats.items():
            if field != 'doi_asserted_by' and field != 'potential':
                stats.append({
                    'publisher': publisher,
                    'member_id': member,
                    'field': field,
                    'value_type': 'true',
                    'count': values['true_count'],
                    'percentage': values['true_percentage'],
                    'total_records': values['total']
                })
                stats.append({
                    'publisher': publisher,
                    'member_id': member,
                    'field': field,
                    'value_type': 'false',
                    'count': values['false_count'],
                    'percentage': values['false_percentage'],
                    'total_records': values['total']
                })
                if include_missing:
                    if values['missing_count'] > 0:
                        stats.append({
                            'publisher': publisher,
                            'member_id': member,
                            'field': field,
                            'value_type': 'missing',
                            'count': values['missing_count'],
                            'percentage': values['missing_percentage'],
                            'total_records': values['total']
                        })
                    if values['invalid_count'] > 0:
                        stats.append({
                            'publisher': publisher,
                            'member_id': member,
                            'field': field,
                            'value_type': 'invalid',
                            'count': values['invalid_count'],
                            'percentage': values['invalid_percentage'],
                            'total_records': values['total']
                        })

        potential = aggregate_stats['potential']
        stats.append({
            'publisher': publisher,
            'member_id': member,
            'field': 'potential_state',
            'value_type': 'has_award_id_or_funder_name_without_funder_doi',
            'count': potential['potential_count'],
            'percentage': potential['potential_percentage'],
            'total_records': potential['total_records']
        })

    return stats


def calculate_publisher_yearly_stats(data, boolean_fields, include_missing=False, funder_doi=None):
    yearly_publisher_data = defaultdict(lambda: defaultdict(list))
    for row in data:
        year = row.get('created_year', '')
        if year:
            key = (row.get('publisher', ''), row.get('member', ''))
            yearly_publisher_data[year][key].append(row)

    stats = []
    for year in sorted(yearly_publisher_data.keys()):
        for (publisher, member), pub_data in yearly_publisher_data[year].items():
            aggregate_stats = calculate_aggregate_stats(pub_data, boolean_fields, include_missing, funder_doi)

            doi_stats = aggregate_stats['doi_asserted_by']
            stats.append({
                'year': year,
                'publisher': publisher,
                'member_id': member,
                'field': 'doi_asserted_by',
                'value_type': 'crossref',
                'count': doi_stats['crossref_count'],
                'percentage': doi_stats['crossref_percentage'],
                'total_records': doi_stats['total']
            })
            stats.append({
                'year': year,
                'publisher': publisher,
                'member_id': member,
                'field': 'doi_asserted_by',
                'value_type': 'publisher',
                'count': doi_stats['publisher_count'],
                'percentage': doi_stats['publisher_percentage'],
                'total_records': doi_stats['total']
            })
            if doi_stats['other_count'] > 0:
                stats.append({
                    'year': year,
                    'publisher': publisher,
                    'member_id': member,
                    'field': 'doi_asserted_by',
                    'value_type': 'other',
                    'count': doi_stats['other_count'],
                    'percentage': doi_stats['other_percentage'],
                    'total_records': doi_stats['total']
                })
            if include_missing and doi_stats['missing_count'] > 0:
                stats.append({
                    'year': year,
                    'publisher': publisher,
                    'member_id': member,
                    'field': 'doi_asserted_by',
                    'value_type': 'missing',
                    'count': doi_stats['missing_count'],
                    'percentage': doi_stats['missing_percentage'],
                    'total_records': doi_stats['total']
                })
            stats.append({
                'year': year,
                'publisher': publisher,
                'member_id': member,
                'field': 'doi_asserted_by',
                'value_type': 'not_asserted',
                'count': doi_stats['not_asserted_count'],
                'percentage': doi_stats['not_asserted_percentage'],
                'total_records': doi_stats['total']
            })

            for field, values in aggregate_stats.items():
                if field != 'doi_asserted_by' and field != 'potential':
                    stats.append({
                        'year': year,
                        'publisher': publisher,
                        'member_id': member,
                        'field': field,
                        'value_type': 'true',
                        'count': values['true_count'],
                        'percentage': values['true_percentage'],
                        'total_records': values['total']
                    })
                    stats.append({
                        'year': year,
                        'publisher': publisher,
                        'member_id': member,
                        'field': field,
                        'value_type': 'false',
                        'count': values['false_count'],
                        'percentage': values['false_percentage'],
                        'total_records': values['total']
                    })
                    if include_missing:
                        if values['missing_count'] > 0:
                            stats.append({
                                'year': year,
                                'publisher': publisher,
                                'member_id': member,
                                'field': field,
                                'value_type': 'missing',
                                'count': values['missing_count'],
                                'percentage': values['missing_percentage'],
                                'total_records': values['total']
                            })
                        if values['invalid_count'] > 0:
                            stats.append({
                                'year': year,
                                'publisher': publisher,
                                'member_id': member,
                                'field': field,
                                'value_type': 'invalid',
                                'count': values['invalid_count'],
                                'percentage': values['invalid_percentage'],
                                'total_records': values['total']
                            })

            potential = aggregate_stats['potential']
            stats.append({
                'year': year,
                'publisher': publisher,
                'member_id': member,
                'field': 'potential_state',
                'value_type': 'has_award_id_or_funder_name_without_funder_doi',
                'count': potential['potential_count'],
                'percentage': potential['potential_percentage'],
                'total_records': potential['total_records']
            })

    return stats


def write_aggregate_csv(aggregate_stats, output_path, include_missing=False):
    rows = []
    doi_stats = aggregate_stats['doi_asserted_by']
    rows.append({
        'field': 'doi_asserted_by',
        'value_type': 'crossref',
        'count': doi_stats['crossref_count'],
        'percentage': doi_stats['crossref_percentage'],
        'total_records': doi_stats['total']
    })
    rows.append({
        'field': 'doi_asserted_by',
        'value_type': 'publisher',
        'count': doi_stats['publisher_count'],
        'percentage': doi_stats['publisher_percentage'],
        'total_records': doi_stats['total']
    })
    if doi_stats['other_count'] > 0:
        rows.append({
            'field': 'doi_asserted_by',
            'value_type': 'other',
            'count': doi_stats['other_count'],
            'percentage': doi_stats['other_percentage'],
            'total_records': doi_stats['total']
        })
    if include_missing and doi_stats['missing_count'] > 0:
        rows.append({
            'field': 'doi_asserted_by',
            'value_type': 'missing',
            'count': doi_stats['missing_count'],
            'percentage': doi_stats['missing_percentage'],
            'total_records': doi_stats['total']
        })
    rows.append({
        'field': 'doi_asserted_by',
        'value_type': 'not_asserted',
        'count': doi_stats['not_asserted_count'],
        'percentage': doi_stats['not_asserted_percentage'],
        'total_records': doi_stats['total']
    })

    for field, values in aggregate_stats.items():
        if field != 'doi_asserted_by' and field != 'potential':
            rows.append({
                'field': field,
                'value_type': 'true',
                'count': values['true_count'],
                'percentage': values['true_percentage'],
                'total_records': values['total']
            })
            rows.append({
                'field': field,
                'value_type': 'false',
                'count': values['false_count'],
                'percentage': values['false_percentage'],
                'total_records': values['total']
            })
            if include_missing:
                if values['missing_count'] > 0:
                    rows.append({
                        'field': field,
                        'value_type': 'missing',
                        'count': values['missing_count'],
                        'percentage': values['missing_percentage'],
                        'total_records': values['total']
                    })
                if values['invalid_count'] > 0:
                    rows.append({
                        'field': field,
                        'value_type': 'invalid',
                        'count': values['invalid_count'],
                        'percentage': values['invalid_percentage'],
                        'total_records': values['total']
                    })

    potential = aggregate_stats['potential']
    rows.append({
        'field': 'potential_state',
        'value_type': 'has_award_id_or_funder_name_without_funder_doi',
        'count': potential['potential_count'],
        'percentage': potential['potential_percentage'],
        'total_records': potential['total_records']
    })

    headers = ['field', 'value_type', 'count', 'percentage', 'total_records']

    try:
        with open(output_path, 'w', encoding='utf-8', newline='') as csvfile:
            writer = csv.DictWriter(csvfile, fieldnames=headers)
            writer.writeheader()
            writer.writerows(rows)
        print(f"Aggregate statistics written to {output_path}")
    except Exception as e:
        print(f"Error writing to aggregate output file: {e}")


def write_yearly_csv(yearly_stats, output_path, include_missing=False):
    rows = []

    for year in sorted(yearly_stats.keys()):
        aggregate_stats = yearly_stats[year]
        doi_stats = aggregate_stats['doi_asserted_by']
        rows.append({
            'year': year,
            'field': 'doi_asserted_by',
            'value_type': 'crossref',
            'count': doi_stats['crossref_count'],
            'percentage': doi_stats['crossref_percentage'],
            'total_records': doi_stats['total']
        })
        rows.append({
            'year': year,
            'field': 'doi_asserted_by',
            'value_type': 'publisher',
            'count': doi_stats['publisher_count'],
            'percentage': doi_stats['publisher_percentage'],
            'total_records': doi_stats['total']
        })
        if doi_stats['other_count'] > 0:
            rows.append({
                'year': year,
                'field': 'doi_asserted_by',
                'value_type': 'other',
                'count': doi_stats['other_count'],
                'percentage': doi_stats['other_percentage'],
                'total_records': doi_stats['total']
            })
        if include_missing and doi_stats['missing_count'] > 0:
            rows.append({
                'year': year,
                'field': 'doi_asserted_by',
                'value_type': 'missing',
                'count': doi_stats['missing_count'],
                'percentage': doi_stats['missing_percentage'],
                'total_records': doi_stats['total']
            })
        rows.append({
            'year': year,
            'field': 'doi_asserted_by',
            'value_type': 'not_asserted',
            'count': doi_stats['not_asserted_count'],
            'percentage': doi_stats['not_asserted_percentage'],
            'total_records': doi_stats['total']
        })

        for field, values in aggregate_stats.items():
            if field != 'doi_asserted_by' and field != 'potential':
                rows.append({
                    'year': year,
                    'field': field,
                    'value_type': 'true',
                    'count': values['true_count'],
                    'percentage': values['true_percentage'],
                    'total_records': values['total']
                })
                rows.append({'year': year,
                    'field': field,
                    'value_type': 'false',
                    'count': values['false_count'],
                    'percentage': values['false_percentage'],
                    'total_records': values['total']
                })
                if include_missing:
                    if values['missing_count'] > 0:
                        rows.append({
                            'year': year,
                            'field': field,
                            'value_type': 'missing',
                            'count': values['missing_count'],
                            'percentage': values['missing_percentage'],
                            'total_records': values['total']
                        })
                    if values['invalid_count'] > 0:
                        rows.append({
                            'year': year,
                            'field': field,
                            'value_type': 'invalid',
                            'count': values['invalid_count'],
                            'percentage': values['invalid_percentage'],
                            'total_records': values['total']
                        })

        potential = aggregate_stats['potential']
        rows.append({
            'year': year,
            'field': 'potential_state',
            'value_type': 'has_award_id_or_funder_name_without_funder_doi',
            'count': potential['potential_count'],
            'percentage': potential['potential_percentage'],
            'total_records': potential['total_records']
        })

    headers = ['year', 'field', 'value_type', 'count', 'percentage', 'total_records']

    try:
        with open(output_path, 'w', encoding='utf-8', newline='') as csvfile:
            writer = csv.DictWriter(csvfile, fieldnames=headers)
            writer.writeheader()
            writer.writerows(rows)
        print(f"Yearly statistics written to {output_path}")
    except Exception as e:
        print(f"Error writing to yearly output file: {e}")


def write_publisher_csv(publisher_stats, output_path):
    headers = ['publisher', 'member_id', 'field', 'value_type', 'count', 'percentage', 'total_records']

    try:
        with open(output_path, 'w', encoding='utf-8', newline='') as csvfile:
            writer = csv.DictWriter(csvfile, fieldnames=headers)
            writer.writeheader()
            writer.writerows(publisher_stats)
        print(f"Publisher statistics written to {output_path}")
    except Exception as e:
        print(f"Error writing to publisher output file: {e}")


def write_publisher_yearly_csv(publisher_yearly_stats, output_path):
    headers = ['year', 'publisher', 'member_id', 'field', 'value_type', 'count', 'percentage', 'total_records']

    try:
        with open(output_path, 'w', encoding='utf-8', newline='') as csvfile:
            writer = csv.DictWriter(csvfile, fieldnames=headers)
            writer.writeheader()
            writer.writerows(publisher_yearly_stats)
        print(f"Publisher yearly statistics written to {output_path}")
    except Exception as e:
        print(f"Error writing to publisher yearly output file: {e}")


def main():
    args = parse_arguments()
    config = read_json_config(args.funder_config)
    funder_doi = config.get('funder_doi')

    boolean_fields = ['has_funder_doi', 'code_in_awards', 'name_in_funders']
    data = read_csv_data(args.input_file)

    os.makedirs(args.output_dir, exist_ok=True)

    aggregate_output_path = os.path.join(args.output_dir, 'aggregate_stats.csv')
    yearly_output_path = os.path.join(args.output_dir, 'yearly_stats.csv')
    publisher_output_path = os.path.join(args.output_dir, 'publisher_stats.csv')
    publisher_yearly_output_path = os.path.join(args.output_dir, 'publisher_yearly_stats.csv')

    aggregate_stats = calculate_aggregate_stats(
        data, boolean_fields, args.include_missing, funder_doi)
    write_aggregate_csv(
        aggregate_stats, aggregate_output_path, args.include_missing)

    yearly_stats = calculate_yearly_stats(
        data, boolean_fields, args.include_missing, funder_doi)
    write_yearly_csv(
        yearly_stats, yearly_output_path, args.include_missing)

    if not args.aggregate_only:
        publisher_stats = calculate_publisher_stats(
            data, boolean_fields, args.include_missing, funder_doi)
        write_publisher_csv(publisher_stats, publisher_output_path)

        publisher_yearly_stats = calculate_publisher_yearly_stats(
            data, boolean_fields, args.include_missing, funder_doi)
        write_publisher_yearly_csv(publisher_yearly_stats, publisher_yearly_output_path)


if __name__ == "__main__":
    main()