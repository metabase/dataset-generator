# AI Dataset Generator

**Generate realistic datasets for demos, learning, and dashboards. Instantly preview data, export as CSV or SQL, and explore with Metabase.**

Features:

- Conversational prompt builder: choose business type, schema, row count, and more
- Real-time data preview in the browser
- Export as CSV (single file or multi-table ZIP) or as SQL inserts
- One-click Metabase launch for data exploration

## Prerequisites

- [Docker](https://www.docker.com/get-started) (includes Docker Compose)
- OpenAI API key (get one at https://platform.openai.com/)

## Stack

- **Next.js** (App Router, TypeScript)
- **Tailwind CSS + ShadCN UI** (modern, dark-themed UI)
- **OpenAI API** (GPT-4o for data generation)
- **Metabase** (Dockerized, launched on demand)

## Getting Started

1. **Clone the repo:**

   ```bash
   git clone <your-repo-url>
   cd dataset-generator
   ```

2. **Create your .env file:**

   Copy the example file and fill in your OpenAI API key:

   ```bash
   cp .env.example .env.local
   ```

   Then edit `.env.local` and add your OpenAI API key after the = sign.

3. **Start the Next.js app:**

   ```bash
   npm install
   npm run dev
   ```

   - The app runs at [http://localhost:3000](http://localhost:3000)

4. **Generate a dataset:**

   - Use the prompt builder to define your dataset.
   - Click "Preview Data" to see a sample.

5. **Export or Explore:**
   - Download your dataset as CSV or SQL Inserts.
   - Click "Start Metabase" to spin up Metabase in Docker.
   - Once Metabase is ready, click "Open Metabase" to explore your data.
   - When done, click "Stop Metabase" to shut down and clean up Docker containers.

## Project Structure

- `/app/page.tsx` – Main UI and prompt builder
- `/app/api/generate/route.ts` – Synthetic data generator (OpenAI)
- `/app/api/metabase/start|stop|status/route.ts` – Docker orchestration for Metabase
- `/lib/export/` – CSV/SQL export logic
- `/docker-compose.yml` – Used only for Metabase, not for the app itself

## Using Metabase

When you click "Start Metabase", it will launch Metabase in a Docker container. Once ready:

1. Click "Open Metabase" to access the Metabase interface
2. Follow Metabase's setup process
3. To analyze your generated data:
   - Use the CSV export feature to download your dataset
   - In Metabase, use the ["Upload Data" feature](https://www.metabase.com/docs/latest/exploration-and-organization/uploads) to analyze your CSV files
   - Or [connect to your own database](https://www.metabase.com/docs/latest/databases/connecting) where you've loaded the data

## Cost & Data Generation Summary

| Action       | Calls OpenAI? | Cost?  | Uses LLM? | Uses Faker? | Row Count |
| ------------ | :-----------: | :----: | :-------: | :---------: | :-------: |
| Preview      |      Yes      | ~$0.05 |    Yes    |     Yes     |    10     |
| Download CSV |      No       |   $0   |    No     |     Yes     |   100+    |
| Download SQL |      No       |   $0   |    No     |     Yes     |   100+    |

**Key Points:**

- **You only pay for the preview/spec generation** (~$0.05 per preview)
- **All downloads use the same columns/spec, just with more rows, and are free**

## How It Works

- When you preview a dataset, the app uses OpenAI to generate a detailed data spec (schema, business rules, event logic) for your chosen business type and parameters.
- All actual data rows are generated locally using Faker, based on the LLM-generated spec.
- Downloading or exporting data never calls OpenAI again—it's instant and free.

## Usage Flow

1. Select your business type, schema, and other parameters.
2. Click "Preview Data" to generate a 10-row sample (incurs a small OpenAI cost).
3. Download CSV/SQL for as many rows as you want—no extra cost, always uses the same schema/columns as the preview.

## Schema Options

- **One Big Table (OBT):** A single, denormalized table with all relevant columns.
- **Star Schema:** Multiple tables (fact + dimension) for more advanced analytics. The LLM spec guides the structure, and the generator outputs all tables locally.

## Extending/Contributing

- To add new business types, rules, or schema logic, edit `lib/spec-prompts.ts`
