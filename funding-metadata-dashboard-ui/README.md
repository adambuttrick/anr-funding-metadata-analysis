# Metadata Health Reports UI

Demo/example UI for Metadata Health Reports. Live at [https://metadata-health-ui.vercel.app](https://metadata-health-ui.vercel.app)

## Setup
1. If using a local version of the API, setup and start using the instructions in the [Metadata Health Report API](https://github.com/adambuttrick/metadata-health-api).

2. Create a `.env.local` file in the root directory (mandatory) with either the URL for the local or deployed instance of the API:
```
# Required - URL of your Metadata Health API instance, e.g.:
NEXT_PUBLIC_API_BASE_URL=http://127.0.0.1:8000
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
npm run test
```

Open your browser and navigate to the URL shown in the terminal (typically http://localhost:3000) to see the dashboard.