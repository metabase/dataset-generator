# Dataset Generator

**Generate high-quality, realistic datasets for analytics, dashboards, demos, and learning. Instantly preview, export as CSV or SQL, or analyze your data in Metabase.**

Features:

- Conversational prompt builder for business/industry, schema, row count, and more
- Instant data preview in the browser
- Export as CSV (single or multi-table zip) or SQL inserts
- One-click "Explore in Metabase" for instant analytics

## Prerequisites

- [Docker](https://www.docker.com/get-started) (includes Docker Compose)
- OpenAI API key (get one at https://platform.openai.com/)

## Stack

- **Next.js** (App Router, TypeScript)
- **Tailwind CSS + ShadCN UI** (modern, dark UI)
- **OpenAI API** (for synthetic data)
- **PostgreSQL** (Docker, only runs when needed)
- **Metabase** (Docker, only runs when needed)

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
   - Download as CSV or SQL.
   - Click "Explore in Metabase" to spin up Metabase and Postgres in Docker. The app will open Metabase in a new tab when ready.
   - When done, click "Stop Metabase" to shut down and clean up Docker containers.

## Project Structure

- `/app/page.tsx` – Main UI and prompt builder
- `/app/api/generate/route.ts` – Synthetic data generator (OpenAI)
- `/app/api/metabase/start|stop|status/route.ts` – Docker orchestration for Metabase/Postgres
- `/lib/export/` – CSV/SQL export logic
- `/docker-compose.yml` – Used only for Metabase/Postgres, not for the app itself

## Contributing

Pull requests are welcome! If you have ideas, bugfixes, or want to add features, feel free to open an issue or PR. All contributions, feedback, and suggestions are appreciated.

**Best practices:**

- Keep UI clean and maintainable.
- Add comments for any non-obvious logic.
- Test your changes locally before submitting a PR.

## Connecting to the Postgres Database in Metabase

When you use "Explore in Metabase," your generated dataset is saved to the `analytics` schema in the local Postgres database. You can connect to this database using the following settings:

- **Host:** `db`
- **Port:** `5432`
- **User:** `postgres`
- **Password:** `postgres`
- **Database:** `dataset_generator`
- **Schema:** `analytics`

MIT License
