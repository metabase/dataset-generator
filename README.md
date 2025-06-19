# Dataset Generator

**Generate high-quality, realistic datasets for demos, learning, and analysis. Instantly preview data, export as CSV or SQL, and explore with Metabase.**

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
- **OpenAI API** (GPT-4 for data generation)
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
   - In Metabase, use the "Upload Data" feature to analyze your CSV files
   - Or connect to your own database where you've loaded the data

## Contributing

Pull requests are welcome! If you have ideas, bug fixes, or feature suggestions, feel free to open an issue or submit a PR. All contributions and feedback are appreciated.

MIT License
