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

export async function insertTablesToAnalyticsSchema(generatedData: any) {
  // Ensure analytics schema exists
  await query(`CREATE SCHEMA IF NOT EXISTS analytics;`);

  for (const table of generatedData.tables) {
    const tableName = table.name;
    const columns: string[] = table.columns;
    const rows: any[] = table.rows;
    if (!columns || !rows || !tableName) continue;

    // Build CREATE TABLE statement
    // Guess types from first row
    const typeMap: Record<string, string> = {};
    for (const col of columns) {
      const val = rows[0]?.[col];
      if (typeof val === "number")
        typeMap[col] = Number.isInteger(val) ? "INTEGER" : "REAL";
      else if (typeof val === "string" && /^\d{4}-\d{2}-\d{2}/.test(val))
        typeMap[col] = "DATE";
      else typeMap[col] = "TEXT";
    }
    const createTableSQL = `CREATE TABLE IF NOT EXISTS analytics."${tableName}" (
      ${columns.map((col: string) => `"${col}" ${typeMap[col]}`).join(",\n  ")}
    );`;
    await query(createTableSQL);

    // Delete existing data for idempotency
    await query(`DELETE FROM analytics."${tableName}";`);

    // Insert rows in batches
    const batchSize = 500;
    for (let i = 0; i < rows.length; i += batchSize) {
      const batch: any[] = rows.slice(i, i + batchSize);
      const valuePlaceholders = batch
        .map(
          (_: any, rowIdx: number) =>
            `(${columns
              .map(
                (_: string, colIdx: number) =>
                  `$${rowIdx * columns.length + colIdx + 1}`
              )
              .join(", ")})`
        )
        .join(", ");
      const values = batch.flatMap((row: any) =>
        columns.map((col: string) => row[col])
      );
      const insertSQL = `INSERT INTO analytics."${tableName}" (${columns
        .map((col: string) => `"${col}"`)
        .join(", ")}) VALUES ${valuePlaceholders};`;
      await query(insertSQL, values);
    }
  }
}
