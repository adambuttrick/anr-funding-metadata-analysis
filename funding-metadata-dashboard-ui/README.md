# Funding Metadata Dashboard UI

Demo/example UI for Funding Metadata Dashboard. Live at [https://funding-metadata-dashboard-ui.vercel.app/](https://funding-metadata-dashboard-ui.vercel.app/)

## Setup
1. If using a local version of the API, setup and start using the instructions in the [Funding Metadata Dashboard API](https://github.com/adambuttrick/anr-funding-metadata-analysis/tree/main/funding-metadata-api).

2. Create a `.env` file in the root directory (mandatory) with either the URL for the local or deployed instance of the API:
```
# Required - URL of your Funding Metadata Dashboard API instance, e.g.:
NEXT_PUBLIC_API_BASE_URL=http://localhost:3000/api/v1
```
3. Install the packages:
```bash
npm install
```
4. Run the development server:
```bash
npm run dev
# or
yarn dev
```
5. Before deployment, ensure TypeScript checks pass and all tests are successful:
```bash
npm run lint
```

Open your browser and navigate to the URL shown in the terminal (typically http://localhost:3001) to see the dashboard.
