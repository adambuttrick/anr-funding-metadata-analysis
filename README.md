# Funding Metadata Analysis

## Pipeline Overview and Design

This repo outlines a generic pipeline for analyzing the completeness and accuracy of funding metadata in scholarly publications, with specific implementation examples referencing the ANR (Agence Nationale de la Recherche) analysis scripts.

### Stage 1: Funder Data Acquisition

The process begins with data about funded projects from a funding organization. This typically includes project identifiers, award/grant codes, and other project metadata. This information serves as the authoritative source against which publication metadata will be compared.

**Implementation Example:** As input, we use an [Agence Nationale de la Recherche (ANR)](https://anr.fr) [dataset](https://dataanr.opendatasoft.com/explore/dataset/20-ans-de-l-anr-liste-projets-plan-d-action_2005-a-2024/table/) containing ANR project codes and details for projects funded between 2005-2024.

### Stage 2: Publication Identification

Using the funder's project identifiers, the next stage identifies scholarly publications resulting from the funded projects. This often requires querying institutional repositories, national databases, or other systems that track research outputs.

**Implementation Example:** The script `retrieve_anr_funded_dois_from_hal_api.py` queries the HAL (Hyper Articles en Ligne) API with ANR project codes to find associated publications and their DOIs, outputting a CSV file mapping ANR codes to publication identifiers. The `deduplicate_csv.py` utility then identifies the unique set of entries in this output, based on the DOI and ANR project code fields.

### Stage 3: Metadata Retrieval and Analysis

With publication identifiers established, the pipeline then retrieves detailed metadata from authoritative bibliographic sources. This stage involves querying APIs, analyzing the structure and content of the metadata, and evaluating how completely the funding information is captured.

**Implementation Example:** The `get_crossref_funding_metadata.py` script queries the Crossref API for each publication DOI, extracts funding metadata, and performs analysis on several dimensions:
- Presence of the correct funder identifier (DOI)
- Inclusion of the proper award/grant codes
- Accurate naming of the funding organization
- Attribution of the funding assertion (publisher vs. Crossref)

The output is a comprehensive CSV file containing analysis results for each publication.


### Stage 4: Statistical Analysis and Data Transformation

Once the data is prepared, this stage generates comprehensive statistics on funding metadata completeness across different dimensions and transforms the data into structured formats suitable for programmatic access.

**Implementation Example:** The `create_stats_files.py` script processes the analyzed publication data to create multiple statistical views in CSV format:
- Aggregate statistics across all publications
- Breakdowns by publisher
- Time-series analysis by year
- Cross-tabulations by publisher and year

These CSV statistics are then converted to structured JSON data using `convert_csv_to_api_json_format.py` that transforms the statistical data into hierarchical JSON structures representing funders, publishers, and awards with their associated metadata and relationships for use in the API layer.

### Stage 5: Merge multiple results together

`python merge_multiple_json_outputs/merge_multiple_json_outputs.py -i1 input-dir-1 -i2 input-dir-2 -o output-dir`

### Stage 6: Data Access Layer

To make the analysis accessible to users, a data access layer transforms the structured data outputs into queryable endpoints.

**Implementation Example:** The `funding-metadata-api` directory contains an Express.js REST API that serves the processed statistics through endpoints for funders, publishers, and awards with search functionality and filtering capabilities. It reads the JSON files produced in the previous stage, caches them in memory, and provides various API endpoints for accessing the data.

### Stage 7: Visualization and Interaction

The final stage presents the analysis through an interactive interface that allows stakeholders to explore the data visually.

**Implementation Example:** The `funding-metadata-dashboard-ui` directory contains a Next.js application that visualizes the funding metadata completeness through interactive charts, tables, and filters for different dimensions of analysis. 

A related representation of ANR's funded publication activity is also available at (https://anr.fr/fr/lanr/engagements/la-science-ouverte/le-barometre-science-ouverte-anr/) as part of the the French Open Science Monitor.


## Data:

Summary data is available in the spreadsheet [here](https://docs.google.com/spreadsheets/d/1-wnkbKpirMUf6O4okM5BQKZL6elqTtmG/edit?usp=sharing&ouid=112957560476919577575&rtpof=true&sd=true).
