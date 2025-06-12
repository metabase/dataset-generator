# Dataset Generator

**Type a topic, get a dataset, and start exploring in Metabase—no coding required.**

This tool lets you type a topic (like “open source”, “Elon Musk”, “startups”), scrapes public data from Twitter using `snscrape`, and gives you a downloadable CSV or the option to push it to a PostgreSQL database.

Perfect for:

- Quickly building a dataset for analysis
- Exploring public sentiment and discussion
- Creating demo dashboards in Metabase

## Stack

- **Next.js** – Fullstack React framework
- **Tailwind CSS + ShadCN** – Clean UI components
- **snscrape** – Twitter scraping (no auth needed)
- **OpenAI (optional)** – For sentiment/enrichment
- **PostgreSQL** – Data storage
- **Metabase** – Explore and visualize your dataset

## Setup

1. Clone the repo and run:

```bash
npm install
```

2. Start the database and Metabase with:

```bash
docker-compose up
```

3. Add a `.env.local` with:

```env
OPENAI_API_KEY=your-key
DATABASE_URL=postgres://postgres:password@localhost:5432/dataset_generator
```

4. Run the app:

```bash
npm run dev
```

## Database & Schema

- All SQL scripts (schema, init, etc.) are in the `db/` directory.
- The main app database is `dataset_generator`.
- Metabase uses its own internal database: `metabase_internal` (created automatically by the init script).
- Docker Compose exposes Postgres on port 5432 and Metabase on port 3001.

The main table `generated_data` stores results:

```sql
create table generated_data (
  id serial primary key,
  topic text,
  platform text,
  source_id text,
  author text,
  content text,
  timestamp timestamptz,
  metadata jsonb
);
```
