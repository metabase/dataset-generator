# Dataset Generator

**Generate realistic synthetic datasets with a structured prompt and explore them instantly in Metabase.**

## What's New

- **Metabase now spins up on demand:** Click "Explore in Metabase" and the required Docker containers start automatically. Stop them with a single click.
- **No more always-on Docker Compose:** Only Postgres and Metabase are started as needed.
- **No more Twitter scraping or Python scraper.** The app is now focused on synthetic data generation via OpenAI and instant analytics.

---

## Prerequisites

- [Docker](https://www.docker.com/get-started) (includes Docker Compose)
- No local Node.js or PostgreSQL required

---

## Features

- Conversational, structured prompt builder for dataset generation
- Preview data instantly in the browser
- Export as CSV or SQL (Snowflake-compatible batching)
- One-click "Explore in Metabase" (runs Metabase + Postgres in Docker only when needed)
- One-click "Stop Metabase" to clean up containers
- All UI built with Next.js App Router, Tailwind CSS, and ShadCN UI

---

## Stack

- **Next.js** (App Router, TypeScript)
- **Tailwind CSS + ShadCN UI** (modern, dark UI)
- **OpenAI API** (for synthetic data)
- **PostgreSQL** (Docker, only runs when needed)
- **Metabase** (Docker, only runs when needed)

---

## Getting Started

1. **Clone the repo:**

   ```bash
   git clone <your-repo-url>
   cd dataset-generator
   ```

2. **Start the Next.js app:**

   ```bash
   npm install
   npm run dev
   ```

   - The app runs at [http://localhost:3000](http://localhost:3000)

3. **Generate a dataset:**

   - Use the prompt builder to define your dataset.
   - Click "Preview Data" to see a sample.

4. **Export or Explore:**
   - Download as CSV or SQL.
   - Click "Explore in Metabase" to spin up Metabase and Postgres in Docker. The app will open Metabase in a new tab when ready.
   - When done, click "Stop Metabase" to shut down and clean up Docker containers.

---

## Metabase On-Demand

- The app manages Docker for you. No need to run `docker-compose up` manually.
- Metabase and Postgres containers are started only when you click "Explore in Metabase."
- You can stop them with the "Stop Metabase" button.

---

## Development

- Edit your code and restart the Next.js dev server to see changes.
- No need to run or manage Docker containers unless you want to use Metabase.

---

## Project Structure

- `/app/page.tsx` – Main UI and prompt builder
- `/app/api/generate/route.ts` – Synthetic data generator (OpenAI)
- `/app/api/metabase/start|stop|status/route.ts` – Docker orchestration for Metabase/Postgres
- `/lib/export/` – CSV/SQL export logic
- `/docker-compose.yml` – Used only for Metabase/Postgres, not for the app itself

---

## Example Use Cases

- "SaaS dashboard data with 3 years of MRR and churn"
- "Ecommerce dataset with product orders and customer regions"
- "Flat table of startup marketing campaigns and results"

---

## Environment

- `.env.local` – Add your `OPENAI_API_KEY` and `DATABASE_URL` if needed

---

## Contributing

Pull requests are welcome! If you have ideas, bugfixes, or want to add features, feel free to open an issue or PR. All contributions, feedback, and suggestions are appreciated.

---

MIT License
