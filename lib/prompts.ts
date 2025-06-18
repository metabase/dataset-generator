export interface GenerateDatasetPromptParams {
  businessType: string;
  schemaType: string;
  rowCount: number;
  timeRange: string[];
  growthPattern: string;
  variationLevel: string;
  granularity: string;
  context?: string;
  isPreview?: boolean;
}

export function generateDatasetPrompt(params: GenerateDatasetPromptParams) {
  const base = `You are a data engineer generating a synthetic dataset for analytics and dashboarding.\n\nBusiness type: ${
    params.businessType
  }\nSchema type: ${
    params.schemaType
  } (either 'One Big Table (OBT)' or 'Star Schema')\nRow count: ${
    params.rowCount
  }\nTime range: ${params.timeRange}\nGrowth pattern: ${
    params.growthPattern
  }\nVariation: ${params.variationLevel}\nGranularity: ${params.granularity}\n${
    params.context ? `Additional context: ${params.context}` : ""
  }\n\nInstructions:\n- For the selected business type and schema type:\n  - If schema type is 'One Big Table (OBT)', generate a single, wide table with all relevant columns for analytics. Do not split into fact/dim tables. Do not use suffixes like _dim or _fact. Use descriptive, business-relevant column names (not numbers).\n  - If schema type is 'Star Schema', generate multiple tables with correct fact/dim logic, best-practice naming (e.g., users_dim, payments_fact), and at least one fact table with numeric measures.\n- Ensure all data is raw, event-level (no aggregations).\n- Data must be realistic, coherent, and joined (e.g., payments reference real users, dates are plausible, etc.).\n- Generate the number of rows specified by the 'rowCount' parameter for each table, unless this is a preview (which is always 10).\n${
    params.isPreview
      ? "- For preview, generate exactly 10 rows for each table (not just the first table)."
      : ""
  }\n- Output the data as a JSON object with a 'tables' array. For OBT, only one table should be present. Each table must have a 'name', 'columns' (an array of descriptive column names), and 'rows' (an array of objects with column-value pairs).\n- Do not hardcode any table or field names; adapt everything to the selected business type and schema type.\n- Make the data as useful as possible for analytics and dashboarding.\n\nExample output format:\n`;

  const obtExample = `// For OBT:\n{\n  "tables": [\n    {\n      "name": "saas_data",\n      "columns": ["user_id", "signup_date", "status", "country", "subscription_id", "plan", ...],\n      "rows": [\n        {"user_id": "U001", "signup_date": "2025-01-05", ...},\n        // ... as many rows as requested by rowCount\n      ]\n    }\n  ]\n}`;

  const starExample = `// For Star Schema:\n{\n  "tables": [\n    {\n      "name": "users_dim",\n      "type": "dim",\n      "columns": ["user_id", "name", "signup_date", ...],\n      "rows": [\n        {"user_id": "U001", "name": "Alice", ...},\n        // ... as many rows as requested by rowCount\n      ]\n    },\n    {\n      "name": "payments_fact",\n      "type": "fact",\n      "columns": ["payment_id", "user_id", "amount", ...],\n      "rows": [\n        {"payment_id": "P001", "user_id": "U001", "amount": 100, ...},\n        // ... as many rows as requested by rowCount\n      ]\n    }\n    // ... more tables as needed\n  ]\n}`;

  const example = params.schemaType === "OBT" ? obtExample : starExample;

  return `${base}${example}\n\nDo not include any explanations or extra text. Only return the JSON object.`;
}

export function generateDatasetUserMessage(
  params: GenerateDatasetPromptParams
) {
  return `Generate a ${params.businessType} dataset with ${
    params.rowCount
  } rows per table using a ${
    params.schemaType === "OBT"
      ? "single wide table (OBT)"
      : "star schema (multiple tables)"
  } for analytics.`;
}
