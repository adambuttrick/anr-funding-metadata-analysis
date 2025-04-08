# ANR Funding Metadata Analysis

## Overview

1. As input, we use an [Agence Nationale de la Recherche (ANR)](https://anr.fr) [dataset](https://dataanr.opendatasoft.com/explore/dataset/20-ans-de-l-anr-liste-projets-plan-d-action_2005-a-2024/table/) containing information about projects funded by ANR.
2. The ANR award codes are used to query the [HAL API](https://api.archives-ouvertes.fr/docs). Here, we aim to find publications listed in HAL that are associated with these specific ANR grants and retrieve their DOIs.
3. The list of DOIs obtained from HAL is then used to query the [Crossref API](https://www.crossref.org/documentation/retrieve-metadata/rest-api/), where we retrieve detailed metadata for each publication, focusing specifically on the funding information recorded there (which ideally includes the ANR grant details).
4. Finally, the metadata collected from Crossref is processed to create summary statistics about the presence, completeness, and characteristics of ANR funding metadata within the Crossref records for the identified publications, in aggregate, by year, by publisher, and by publisher and year.

**TLDR**: ANR funding data -> Use award codes to find DOIs in HAL -> Use DOIs to get funding metadata from Crossref -> Use to create completeness stats.

## Data:

Summary data is available in the spreadsheet [here](https://docs.google.com/spreadsheets/d/1-wnkbKpirMUf6O4okM5BQKZL6elqTtmG/edit?usp=sharing&ouid=112957560476919577575&rtpof=true&sd=true).


## For inspiration

Here is the [ANR variation](https://anr.fr/fr/lanr/engagements/la-science-ouverte/le-barometre-science-ouverte-anr/) of the French Open Science Monitor, just for inspiration if needed.