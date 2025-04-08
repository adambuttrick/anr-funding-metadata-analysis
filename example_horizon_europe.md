* `cd utils/deduplicate_csv`
* `python utils/deduplicate_csv/deduplicate_csv.py -i format_horizon_europe_projects/projects_reporting_publications.csv -k "doi,anr_code"`
* `python get_crossref_funding_metadata/get_crossref_funding_metadata.py -i unique_projects_reporting_publications_20.csv`
* `python create_stats_files/create_stats_files.py -i anr_funding_analysis.csv`