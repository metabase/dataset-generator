export function toCSV(rows: any[], tableName?: string) {
  if (!rows || !rows.length) return "";
  const columns = Object.keys(rows[0]);
  const header = columns.join(",");
  const body = rows
    .map((row) =>
      columns.map((col) => JSON.stringify(row[col] ?? "")).join(",")
    )
    .join("\n");
  return header + "\n" + body;
}

export function toSQL(rows: any[], tableName = "dataset") {
  if (!rows || !rows.length) return "";
  const columns = Object.keys(rows[0]);
  // Guess types (very basic)
  const typeMap: Record<string, string> = {};
  for (const col of columns) {
    const val = rows[0][col];
    if (typeof val === "number")
      typeMap[col] = Number.isInteger(val) ? "INTEGER" : "REAL";
    else if (typeof val === "string" && /^\d{4}-\d{2}-\d{2}/.test(val))
      typeMap[col] = "DATE";
    else typeMap[col] = "TEXT";
  }
  const create = `CREATE TABLE ${tableName} (\n  ${columns
    .map((col) => `${col} ${typeMap[col]}`)
    .join(",\n  ")}\n);`;
  // Batch rows
  const batchSize = 500;
  const insertBatches = [];
  for (let i = 0; i < rows.length; i += batchSize) {
    const batch = rows.slice(i, i + batchSize);
    const values = batch
      .map(
        (row) =>
          `(${columns
            .map((col) =>
              typeof row[col] === "number"
                ? row[col]
                : `'${String(row[col]).replace(/'/g, "''")}'`
            )
            .join(", ")})`
      )
      .join(",\n  ");
    insertBatches.push(
      `INSERT INTO ${tableName} (${columns.join(", ")}) VALUES\n  ${values};`
    );
  }
  return create + "\n" + insertBatches.join("\n\n");
}

export function downloadFile(filename: string, content: string) {
  const blob = new Blob([content], { type: "text/plain" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  setTimeout(() => {
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, 100);
}
