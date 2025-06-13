# Dataset Generator

This project generates realistic synthetic datasets using OpenAI based on structured user prompts. It's designed for developers, analysts, and students who need high-quality, customizable data for learning, dashboards, prototyping, or demos.

## Cursor Prompt Context

> You are an analytics engineer. Given a user-configured prompt, generate a realistic synthetic dataset using a flat table or star schema. Include logical relationships, metric variation, time-based patterns, and structured output (JSON) that can be converted into CSV or SQL. The data should look realistic enough for dashboards and analysis.

## Key Features

- Structured prompt builder (no messy free-form)
- Control business type, schema, row count, and growth trends
- Outputs clean, structured JSON datasets
- Option to export as CSV or SQL
- Optional push to PostgreSQL for Metabase visualization

## Tech Stack

- **Next.js** with App Router and TypeScript
- **Tailwind CSS** and **ShadCN UI** for clean UI
- **OpenAI API** to generate structured data
- **PostgreSQL** + **Metabase** (optional) for analysis

## Prompt Template

```
You are an data engineer. Generate a realistic synthetic dataset for a [BUSINESS TYPE] using a [SCHEMA TYPE].

Time range: [TIME RANGE]

Approximate volume: [ROW COUNT] rows total

Growth pattern: [GROWTH PATTERN]

Data variation: [VARIATION LEVEL]

Metric granularity: [GRANULARITY]

If using a star schema:
- Include a fact table and dimension tables (e.g., customers, products, time)

Include realistic metrics and timestamps. The data should reflect the given growth and variation trends.

Return as a structured JSON object with:
- Table names
- Field names
- Field types
- Example values
```

## Project Structure

- `/app/page.tsx` – Prompt builder UI + dataset preview
- `/app/api/generate/route.ts` – OpenAI-powered data generator
- `/lib/export/` – Converts JSON to CSV or SQL
- `/docker-compose.yml` – Spins up Postgres + Metabase
- `.env.local` – Includes `OPENAI_API_KEY` and `DATABASE_URL`

## Example Use Cases

- “SaaS dashboard data with 3 years of MRR and churn”
- “Ecommerce dataset with product orders and customer regions”
- “Flat table of startup marketing campaigns and results”
