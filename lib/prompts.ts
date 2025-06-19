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
  const rowCountMessage = params.isPreview
    ? "CRITICAL REQUIREMENT: This is a PREVIEW. You MUST generate EXACTLY 10 rows for each table. No more, no less."
    : `CRITICAL REQUIREMENT: This is a DOWNLOAD. You MUST generate EXACTLY ${params.rowCount} rows for each table. No more, no less.`;

  const base = `You are a data engineer generating a hyper-realistic dataset for analytics and dashboarding.

${rowCountMessage}

Business type: ${params.businessType}
Schema type: ${
    params.schemaType
  } (either 'One Big Table (OBT)' or 'Star Schema')
Row count: ${
    params.isPreview
      ? "10 (PREVIEW MODE)"
      : `${params.rowCount} (DOWNLOAD MODE)`
  }
Time range: ${params.timeRange}
Growth pattern: ${params.growthPattern}
Variation: ${params.variationLevel}
Granularity: ${params.granularity}
${params.context ? `Additional context: ${params.context}` : ""}

Instructions:
1. ROW COUNT IS CRITICAL:
   ${rowCountMessage}
   This is the most important requirement.

2. Schema Requirements:
   - If schema type is 'One Big Table (OBT)':
     Generate a single, wide table with all relevant columns for analytics.
     Do not split into fact/dim tables.
     Do not use suffixes like _dim or _fact.
     Use descriptive, business-relevant column names (not numbers).
   - If schema type is 'Star Schema':
     Generate multiple tables with correct fact/dim logic.
     Use best-practice naming (e.g., users_dim, payments_fact).
     Include at least one fact table with numeric measures.

3. Data Quality Requirements:
   - Ensure all data is raw, event-level (no aggregations)
   - Data must be realistic, coherent, and joined
   - All relationships must be valid (e.g., payments reference real users)
   - Dates must be plausible and within specified time range

4. CRITICAL: Include Realistic Business Metrics:
   - SaaS: Include pricing (monthly/annual plans, amounts), subscription events, feature usage events, customer tiers
   - Ecommerce: Include product prices, order line items, shipping costs, discounts, individual transactions
   - Healthcare: Include procedure costs, insurance claims, individual treatments, patient visits
   - Fintech: Include transaction amounts, fees, individual transfers, account activities
   - Education: Include tuition costs, enrollment events, individual course registrations, student activities
   - Retail: Include product costs, individual sales, inventory movements, customer purchases
   - Manufacturing: Include production costs, material usage, individual production runs, quality checks
   - Transportation: Include fare amounts, fuel costs, individual trips, maintenance events
   - ALL datasets must include realistic monetary values (prices, costs, revenues, fees)
   - Include key performance indicators (KPIs) relevant to each business type
   - Ensure values are realistic for the industry and time period
   - CRITICAL: NO AGGREGATED METRICS (like MRR, ARR, total revenue, total sales, average order value, etc.) - only raw transactional/event data for ALL business types

5. Output Format:
   - Return a JSON object with a 'tables' array
   - For OBT: only one table should be present
   - Each table must have:
     * 'name': descriptive table name
     * 'columns': array of descriptive column names
     * 'rows': array of objects with column-value pairs
     * EXACTLY ${params.isPreview ? "10" : params.rowCount} rows

Example output format:\n`;

  const obtExample = `// For OBT:\n{\n  "tables": [\n    {\n      "name": "saas_data",\n      "columns": ["user_id", "signup_date", "status", "country", "subscription_id", "plan", "monthly_price", "annual_price", "payment_date", "payment_amount", "feature_usage_event", "customer_tier", ...],\n      "rows": [\n        {"user_id": "U001", "signup_date": "2025-01-05", "plan": "Pro", "monthly_price": 29.99, "payment_date": "2025-01-05", "payment_amount": 29.99, "feature_usage_event": "dashboard_viewed", ...},\n        // ... EXACTLY ${
    params.isPreview ? "10" : params.rowCount
  } rows - this is critical!\n      ]\n    }\n  ]\n}`;

  const starExample = `// For Star Schema:\n{\n  "tables": [\n    {\n      "name": "users_dim",\n      "type": "dim",\n      "columns": ["user_id", "name", "signup_date", "country", "customer_tier", ...],\n      "rows": [\n        {"user_id": "U001", "name": "Alice", "signup_date": "2025-01-05", "customer_tier": "Enterprise", ...},\n        // ... EXACTLY ${
    params.isPreview ? "10" : params.rowCount
  } rows - this is critical!\n      ]\n    },\n    {\n      "name": "subscriptions_fact",\n      "type": "fact",\n      "columns": ["subscription_id", "user_id", "plan", "monthly_price", "annual_price", "payment_date", "payment_amount", "feature_usage_event", ...],\n      "rows": [\n        {"subscription_id": "S001", "user_id": "U001", "plan": "Pro", "monthly_price": 29.99, "payment_date": "2025-01-05", "payment_amount": 29.99, "feature_usage_event": "dashboard_viewed", ...},\n        // ... EXACTLY ${
    params.isPreview ? "10" : params.rowCount
  } rows - this is critical!\n      ]\n    }\n    // ... more tables as needed, each with EXACTLY the specified number of rows\n  ]\n}`;

  const example = params.schemaType === "OBT" ? obtExample : starExample;

  return `${base}${example}\n\nFINAL REMINDER: This is a ${
    params.isPreview
      ? "PREVIEW (10 rows)"
      : `DOWNLOAD (${params.rowCount} rows)`
  }. You MUST generate EXACTLY the specified number of rows for each table.\n\nDo not include any explanations or extra text. Only return the JSON object.`;
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
