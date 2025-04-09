1. `python utils/deduplicate_csv/deduplicate_csv.py -i format_horizon_europe_projects/projects_reporting_publications.csv -k "doi,funder_code"`
2. `python get_crossref_funding_metadata/get_crossref_funding_metadata.py -i unique_projects_reporting_publications.csv -c horizon_europe.json --limit 20`
3. `python create_stats_files/create_stats_files.py -i funding_analysis.csv --funder-doi 10.13039/501100000780`
4. Create a folder "horizon_europe" and move files "aggregate_stats.csv", "yearly_stats.csv", "publisher_stats.csv", "publisher_yearly_stats.csv", "funding_analysis.csv" into it :
`mkdir horizon_europe && mv aggregate_stats.csv horizon_europe && mv yearly_stats.csv horizon_europe && mv publisher_stats.csv horizon_europe && mv publisher_yearly_stats.csv horizon_europe && mv funding_analysis.csv horizon_europe`
5. `python convert_csv_to_api_json_format/convert_csv_to_api_json_format.py -i horizon_europe -o horizon_europe_json -n "horizon europe" -d 10.13039/501100000780`

Horizon europe Crossref member ids : https://api.crossref.org/funders/501100000780

No ROR id for Horizon Europe
