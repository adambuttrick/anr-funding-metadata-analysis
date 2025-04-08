1. `python utils/deduplicate_csv/deduplicate_csv.py -i format_horizon_europe_projects/projects_reporting_publications.csv -k "doi,anr_code"`
2. Export the first 21 lines of file "unique_projects_reporting_publications.csv" into a new file "unique_projects_reporting_publications_20.csv"
3. `python get_crossref_record_data/get_crossref_record_data.py -i unique_projects_reporting_publications_20.csv -r anr_record_analysis.csv`
4. `python get_crossref_funding_metadata/get_crossref_funding_metadata.py -i unique_projects_reporting_publications_20.csv`
5. `python create_stats_files/create_stats_files.py -i anr_funding_analysis.csv`
6. Create a folder "horizon_europe" and move files "aggregate_stats.csv", "yearly_stats.csv", "publisher_stats.csv", "publisher_yearly_stats.csv", "anr_funding_analysis.csv" into it :
`mkdir horizon_europe && cp aggregate_stats.csv horizon_europe && cp yearly_stats.csv horizon_europe && cp publisher_stats.csv horizon_europe && cp publisher_yearly_stats.csv horizon_europe && cp anr_funding_analysis.csv horizon_europe`
7. `python convert_csv_to_api_json_format/convert_csv_to_api_json_format.py -i horizon_europe -o horizon_europe_json -n "horizon europe" -d 501100000780`

Horizon europe Crossref member ids : https://api.crossref.org/funders/501100000780

No ROR id for Horizon Europe
