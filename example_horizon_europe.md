1. `python utils/deduplicate_csv/deduplicate_csv.py -i format_horizon_europe_projects/projects_reporting_publications.csv -k "doi,funder_code"`
2. `python utils/check_ra/check_ra.py -i unique_projects_reporting_publications.csv`
3. `python get_crossref_funding_metadata/get_crossref_funding_metadata.py -i output/Crossref.csv -c horizon_europe.json --limit 20`
4. `python create_stats_files/create_stats_files.py -i funding_analysis.csv -c horizon_europe.json`
5. Move file `funding_analysis.csv` created at step 2 into the stats directory created at step 3 :
`mv funding_analysis.csv stats_output`
6. `python convert_csv_to_api_json_format/convert_csv_to_api_json_format.py -i stats_output -o horizon_europe_json -n "horizon europe" -c horizon_europe.json`
7. `python merge_multiple_json_outputs/merge_multiple_json_outputs.py -i1 funding-metadata-api/data -i2 horizon_europe_json -o funding-metadata-api/data_output`

Horizon europe Crossref member ids : https://api.crossref.org/funders/100019180

No ROR id for Horizon Europe
