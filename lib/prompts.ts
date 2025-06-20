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

Business type: ${
    params.businessType
  } — generate events that mirror real-world behavior for this industry
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
   - CRITICAL: Avoid duplicate primary keys. For example, \`user_id\`, \`subscription_id\`, \`transaction_id\`, \`event_id\`, etc., should be unique where appropriate for the table.

4. CRITICAL: Include Realistic Business Metrics:
   - SaaS: For each user, decide if they are on a 'monthly' or 'annual' billing cycle. The payment_amount should reflect the correct price for that cycle. Include subscription events (signups, renewals, cancellations), feature usage events, and customer tiers.
   - Ecommerce: Generate event-based data. Events can be \`view_item\`, \`add_to_cart\`, \`start_checkout\`, \`purchase\`, \`refund\`. For \`purchase\` events, include \`order_id\`, \`product_id\`, \`quantity\`, \`item_price\`, \`shipping_cost\`, and \`discount_amount\`. For other events, these can be null. Ensure \`order_total\` is realistic based on items.
   - Healthcare: Generate patient-centric events. Include \`patient_id\`, \`provider_id\`, \`facility_id\`. Events should include \`patient_visit\`, \`treatment_administered\`, \`procedure_performed\`. For procedures, include \`cpt_code\` and \`procedure_cost\`. For billing, include \`claim_id\`, \`claim_amount\`, \`insurance_payout\`, and \`claim_status\` ('submitted', 'paid', 'denied').
   - Fintech: Model individual financial transactions. Each row should have a \`transaction_id\`, \`account_id\`, \`transaction_type\` ('deposit', 'withdrawal', 'transfer', 'payment'), \`amount\`, \`fee\`, \`currency\`, and a \`status\` ('completed', 'pending', 'failed'). Crucially, include a boolean \`is_fraud\` flag.
   - Education: Track student-level activities. Include \`student_id\`, \`course_id\`, \`instructor_id\`. Generate events like \`course_enrollment\`, \`tuition_payment\`, \`lecture_viewed\`, \`assignment_submitted\`, \`grade_received\`. For payments, distinguish between \`tuition_fee\`, \`scholarship_amount\`, and \`net_paid\`.
   - Retail: Similar to Ecommerce but for physical stores. Include \`store_id\`, \`product_id\`, \`customer_id\`. Generate events for \`sale\`, \`return\`. Sales events must include \`line_item_price\` and \`quantity\`. Also, generate \`inventory_movement\` events with \`movement_type\` ('restock', 'shrinkage', 'transfer').
   - Manufacturing: Center data around \`work_order_id\`. Each work order should have a \`product_id\`, \`quantity_to_produce\`. Generate events for \`production_run_start\`, \`production_run_end\`, and \`quality_check\`. Log \`units_produced\`, \`units_failed\`, \`material_cost\`, and \`machine_downtime_hours\`.
   - Transportation: Track individual trips. Each trip should have a \`trip_id\`, \`vehicle_id\`, \`driver_id\`. Log \`start_time\`, \`end_time\`, \`distance\`, \`duration\`, and \`fare_amount\`. Also generate separate events for \`vehicle_maintenance\` and \`fueling\`, including \`maintenance_cost\` and \`fuel_cost\` linked to the \`vehicle_id\`.
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
   - You MUST NOT include any markdown, explanation, or surrounding text. Only return the JSON object.

Example output format:\n`;

  const obtExample = `// For OBT:\n{\n  "tables": [\n    {\n      "name": "saas_data",\n      "columns": ["user_id", "signup_date", "status", "country", "subscription_id", "plan", "billing_cycle", "price", "payment_date", "payment_amount", "event_type", "event_name", "customer_tier", ...],\n      "rows": [\n        {"user_id": "U001", "signup_date": "2025-01-05", "plan": "Pro", "billing_cycle": "monthly", "price": 29.99, "payment_date": "2025-01-05", "payment_amount": 29.99, "event_type": "subscription", "event_name": "signup", ...},\n        {"user_id": "U001", "signup_date": "2025-01-05", "plan": "Pro", "billing_cycle": "monthly", "price": 29.99, "payment_date": "2025-01-15", "payment_amount": 0, "event_type": "feature_usage", "event_name": "dashboard_viewed", ...},\n        // ... EXACTLY ${
    params.isPreview ? "10" : params.rowCount
  } rows - this is critical!\n      ]\n    }\n  ]\n}`;

  const starExample = `// For Star Schema:\n{\n  "tables": [\n    {\n      "name": "users_dim",\n      "type": "dim",\n      "columns": ["user_id", "name", "signup_date", "country", "customer_tier", ...],\n      "rows": [\n        {"user_id": "U001", "name": "Alice", "signup_date": "2025-01-05", "customer_tier": "Enterprise", ...},\n        // ... EXACTLY ${
    params.isPreview ? "10" : params.rowCount
  } rows - this is critical!\n      ]\n    },\n    {\n      "name": "events_fact",\n      "type": "fact",\n      "columns": ["event_id", "user_id", "subscription_id", "plan", "billing_cycle", "price", "payment_date", "payment_amount", "event_type", "event_name", ...],\n      "rows": [\n        {"event_id": "E001", "user_id": "U001", "plan": "Pro", "billing_cycle": "annual", "price": 299.99, "payment_date": "2025-01-05", "payment_amount": 299.99, "event_type": "subscription", "event_name": "signup", ...},\n        {"event_id": "E002", "user_id": "U001", "plan": "Pro", "billing_cycle": "annual", "price": 299.99, "payment_date": "2025-01-20", "payment_amount": 0, "event_type": "feature_usage", "event_name": "api_call", ...},\n        // ... EXACTLY ${
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
