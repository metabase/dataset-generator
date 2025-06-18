import { Pool } from "pg";

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

export async function query(text: string, params?: any[]) {
  const start = Date.now();
  try {
    const res = await pool.query(text, params);
    const duration = Date.now() - start;
    return res;
  } catch (error) {
    throw error;
  }
}

export async function insertGeneratedData(data: {
  topic: string;
  platform: string;
  source_id: string;
  author: string;
  content: string;
  timestamp: Date;
  metadata: any;
}) {
  const text = `
    INSERT INTO generated_data (topic, platform, source_id, author, content, timestamp, metadata)
    VALUES ($1, $2, $3, $4, $5, $6, $7)
    RETURNING *
  `;
  const values = [
    data.topic,
    data.platform,
    data.source_id,
    data.author,
    data.content,
    data.timestamp,
    data.metadata,
  ];
  return query(text, values);
}
