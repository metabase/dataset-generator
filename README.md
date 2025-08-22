# AI Dataset Generator

**Generate realistic datasets for demos, learning, and dashboards. Instantly preview data, export as CSV or SQL, and explore with Metabase.**

Features:

- Conversational prompt builder: choose business type, schema, row count, and more
- Real-time data preview in the browser
- Export as CSV (single file or multi-table ZIP) or as SQL inserts
- One-click Metabase launch for data exploration (see [Using Metabase](#using-metabase) for details)

**Local vs Web:** When running locally, you can spin up Metabase in Docker and use LiteLLM for multi-provider LLM support. On the web, the app defaults to OpenAI and redirects to Metabase Cloud for data exploration.

## Usage Flow

1. Select your business type, schema, and other parameters.
2. Click "Preview Data" to generate a 10-row sample (incurs a small LLM cost, depending on provider).
3. Download CSV/SQL for as many rows as you want—no extra cost, always uses the same schema/columns as the preview.

## Prerequisites

- [Node.js](https://nodejs.org/) (18 or later)
- OpenAI API key
- [Docker](https://www.docker.com/get-started) (optional, for Metabase and multi-provider LLM support)

## Getting Started

1. **Clone the repo:**

   ```bash
   git clone <your-repo-url>
   cd dataset-generator
   ```

2. **Create your .env file:**

   Create a `.env` file in the project root with your OpenAI API key:

   ```env
   OPENAI_API_KEY=sk-your-openai-key-here
   ```

   Optionally, you can also set:

   ```env
   # Change the OpenAI model (defaults to gpt-4o)
   LLM_MODEL=gpt-4o
   ```

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
     - In Metabase, use the ["Upload Data" feature](https://www.metabase.com/docs/latest/exploration-and-organization/uploads) to analyze your CSV files
     - Or [connect to your own database](https://www.metabase.com/docs/latest/databases/connecting) where you've loaded the data
   - When done, click "Stop Metabase" to shut down and clean up Docker containers.

## Advanced: Multi-Provider LLM Support

By default, the app uses OpenAI directly. If you want to use other LLM providers (Anthropic, Google, etc.), you can optionally run the LiteLLM service:

1. **Add provider keys to your .env file:**

   ```env
   # Keep your OpenAI key as fallback
   OPENAI_API_KEY=sk-your-openai-key-here

   # Add other provider keys
   ANTHROPIC_API_KEY=your-anthropic-key-here
   GOOGLE_GENAI_API_KEY=your-google-key-here

   # LiteLLM configuration
   LITELLM_MASTER_KEY=sk-1234
   LITELLM_SALT_KEY=sk-1234

   # Set model for your preferred provider
   LLM_MODEL=claude-3-sonnet-20240229
   ```

2. **Start LiteLLM service:**

   ```bash
   docker compose up litellm db_litellm
   ```

When LiteLLM is running, the app automatically detects it and routes requests through the multi-provider gateway instead of directly to OpenAI.

## How It Works

The dataset generator uses a two-stage process to create realistic business data. First, it leverages large language models to
generate detailed data specifications based on your business type and parameters. Then, it uses these specifications to create
unlimited amounts of realistic data locally.

- When you preview a dataset, the app uses OpenAI (or LiteLLM if running) to generate a detailed data spec (schema, business rules, event logic) for your chosen business type and parameters.
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

**Caching:** After your first preview, the app remembers your data structure. If you preview the same business type and settings again, it reuses that structure (free) instead of generating a new one. This saves money and time. You'll see "Using cached spec" in the terminal when this happens. Check cache stats: `curl http://localhost:3000/api/cache/stats` or clear: `curl -X DELETE http://localhost:3000/api/cache/clear`.

## Project Structure

- `/app/page.tsx` – Main UI and prompt builder
- `/app/api/generate/route.ts` – Synthetic data generator (OpenAI direct or via LiteLLM)
- `/app/api/metabase/start|stop|status/route.ts` – Docker orchestration for Metabase
- `/lib/export/` – CSV/SQL export logic
- `/docker-compose.yml` – Used for Metabase and LiteLLM services

## Stack

- **Next.js** (App Router, TypeScript)
- **Tailwind CSS + ShadCN UI** (modern, dark-themed UI)
- **LiteLLM** (multi-provider LLM gateway: OpenAI, Anthropic, Google, etc.)
- **Faker.js** (realistic data generation)
- **Metabase** (Dockerized, launched on demand)

## Extending/Contributing

- To add new business types, edit `lib/spec-prompts.ts` and add entries to the `businessTypeInstructions` object
