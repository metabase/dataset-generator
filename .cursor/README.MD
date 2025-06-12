# Dataset Generator

This project turns user input (a topic or keyword) into a structured dataset using scraped tweets from Twitter. The user can preview the data, export it as a CSV, or push it to a PostgreSQL database for visualization in Metabase.

## Tech Stack

- **Next.js** (App Router + TypeScript)
- **Tailwind CSS** + **ShadCN UI**
- **snscrape** for scraping Twitter without authentication
- **OpenAI API** (optional) for sentiment analysis or enrichment
- **PostgreSQL** (via Supabase or Docker)
- **Metabase** for data visualization

## Project Structure

- `/app/page.tsx` – UI for entering a topic and viewing the data preview
- `/app/api/generate/route.ts` – API handler that scrapes tweets and formats the result
- `/schema.sql` – Defines the `generated_data` table
- `/docker-compose.yml` – Spins up Postgres and Metabase for local use
- `.env.local` – Stores secrets like `OPENAI_API_KEY` and `DATABASE_URL`

## Flow

1. User enters a topic (e.g., “elon musk”)
2. `/api/generate` uses `snscrape` to collect recent tweets
3. Tweets are parsed into structured objects and optionally enriched
4. Result is returned to the frontend as a preview
5. User can:
   - Export the data as CSV
   - Push it to Postgres
   - Explore it in Metabase

## TODOs

- [ ] Add CSV export functionality
- [ ] Wire up PostgreSQL insert
- [ ] Enable user-driven dataset naming/tagging
- [ ] Add Reddit and YouTube sources