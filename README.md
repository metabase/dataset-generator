# AI Dataset Generator

**Generate realistic datasets for demos, learning, and dashboards. Instantly preview data, export as CSV or SQL, and explore with Metabase.**

Features:

- Conversational prompt builder: choose business type, schema, row count, and more
- Real-time data preview in the browser
- Export as CSV (single file or multi-table ZIP) or as SQL inserts
- One-click Metabase launch for data exploration ([see Using Metabase](#using-metabase) for details)

## Usage Flow

1. Select your business type, schema, and other parameters.
2. Click "Preview Data" to generate a 10-row sample (incurs a small LLM cost, depending on provider).
3. Download CSV/SQL for as many rows as you want—no extra cost, always uses the same schema/columns as the preview.

## Prerequisites

- [Docker](https://www.docker.com/get-started) (includes Docker Compose)
- At least one API key for a supported LLM provider (OpenAI, Anthropic, or Google GenAI)

## Getting Started

1. **Clone the repo:**

   ```bash
   git clone <your-repo-url>
   cd dataset-generator
   ```

2. **Create your .env file:**

   Copy the example file and fill in your LLM provider API keys (OpenAI, Anthropic, Google, etc.):

   ```bash
   cp .env.example .env
   ```

   Then edit `.env` and add your API keys as needed:

   ```env
   # For local development, you can use any value for these keys:
   LITELLM_MASTER_KEY=sk-1234
   LITELLM_SALT_KEY=sk-1234

   # Add at least one provider key below:
   OPENAI_API_KEY=sk-...
   ANTHROPIC_API_KEY=...
   GOOGLE_GENAI_API_KEY=...

   # Set LLM_MODEL to match your provider:
   LLM_MODEL=gpt-4o

   # Examples values:
   # For OpenAI:      LLM_MODEL=gpt-4o
   # For Anthropic:   LLM_MODEL=claude-4-sonnet
   # For Google:      LLM_MODEL=gemini-2.5-flash
   ```

3. **Start the Next.js app:**

   ```bash
   npm install
   npm run dev
   ```

   - The app runs at [http://localhost:3000](http://localhost:3000)

4. **Start LiteLLM (Required for LLM Features):**

   This app uses [LiteLLM](https://github.com/BerriAI/litellm) as a gateway for all LLM requests (OpenAI, Anthropic, Google, etc.).

   **You must start LiteLLM for dataset generation and preview features to work.**

   From your project root, run:

   ```sh
   docker compose up litellm db_litellm
   ```

   - This starts the LiteLLM gateway and its dedicated Postgres database.
   - LiteLLM will listen on `http://localhost:4000` by default.

5. **Generate a dataset:**

   - Use the prompt builder to define your dataset.
   - Click "Preview Data" to see a sample.

6. **Export or Explore:**
   - Download your dataset as CSV or SQL Inserts.
   - Click "Start Metabase" to spin up Metabase in Docker.
   - Once Metabase is ready, click "Open Metabase" to explore your data.
   - When done, click "Stop Metabase" to shut down and clean up Docker containers.

## How It Works

- When you preview a dataset, the app uses LiteLLM (which can route to OpenAI, Anthropic, Google, etc.) to generate a detailed data spec (schema, business rules, event logic) for your chosen business type and parameters.
- All actual data rows are generated locally using Faker, based on the LLM-generated spec.
- Downloading or exporting data never calls an LLM again—it's instant and free.

### Cost & Data Generation Summary

| Action       | Calls LLM? | Cost?  | Uses LLM? | Uses Faker? | Row Count |
| ------------ | :--------: | :----: | :-------: | :---------: | :-------: |
| Preview      |    Yes     | ~$0.05 |    Yes    |     Yes     |    10     |
| Download CSV |     No     |   $0   |    No     |     Yes     |   100+    |
| Download SQL |     No     |   $0   |    No     |     Yes     |   100+    |

_The above costs and behavior are based on testing with the OpenAI GPT-4o model. Costs and token usage may vary with other providers/models._

- **You only pay for the preview/spec generation** (e.g., ~$0.05 per preview with OpenAI GPT-4o)
- **All downloads use the same columns/spec, just with more rows, and are free**

## Using Metabase

When you click "Start Metabase", it will launch Metabase in a Docker container. Once ready:

1. Click "Open Metabase" to access the Metabase interface
2. Follow Metabase's setup process
3. To analyze your generated data:
   - Use the CSV export feature to download your dataset
   - In Metabase, use the ["Upload Data" feature](https://www.metabase.com/docs/latest/exploration-and-organization/uploads) to analyze your CSV files
   - Or [connect to your own database](https://www.metabase.com/docs/latest/databases/connecting) where you've loaded the data

## Project Structure

- `/app/page.tsx` – Main UI and prompt builder
- `/app/api/generate/route.ts` – Synthetic data generator (via LiteLLM: OpenAI, Anthropic, Google, etc.)
- `/app/api/metabase/start|stop|status/route.ts` – Docker orchestration for Metabase
- `/lib/export/` – CSV/SQL export logic
- `/docker-compose.yml` – Used for Metabase and LiteLLM services

## Stack

- **Next.js** (App Router, TypeScript)
- **Tailwind CSS + ShadCN UI** (modern, dark-themed UI)
- **LiteLLM** (multi-provider LLM gateway: OpenAI, Anthropic, Google, etc.)
- **Metabase** (Dockerized, launched on demand)

## Extending/Contributing

- To add new business types, edit `lib/spec-prompts.ts` and add entries to the `businessTypeInstructions` object
