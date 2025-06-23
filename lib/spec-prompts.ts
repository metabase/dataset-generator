// Add an index signature to allow string indexing
type EnhancedSchema = {
  OBT: string[];
  Star: {
    fact: string;
    dimensions: string[];
  };
  metrics: string[];
};

const businessTypeInstructions: Record<string, string> = {
  SaaS: `
    - **Entities**: Include 'user', 'plan', and 'marketing_channel' as separate entities. Users have attributes like 'plan' (linked to the plan entity), 'billing_cycle', and 'country'. Plans have 'plan_id', 'name', 'billing_cycle', and 'price'. Marketing channels have 'channel_id' and 'name'.
    - **Events**: Simulate a user lifecycle. Start with a 'signup' event (the initial event). Schedule recurring 'renewal' events based on their billing cycle. Generate random 'api_call' or 'feature_usage' events to represent product engagement. Model 'cancellation' events using a monthly churn rate. Add a 'failed_renewal' event with a small probability (e.g., 2% of renewals). Some users should have only a signup event (silent churn).
    - **Outputs**: For 'signup' and 'renewal' events: if the user's plan is 'Free' or 'Trial', set 'payment_amount' to 0 and use only the plan in the conditional key (e.g., "plan=Free": 0). For paid plans, set 'payment_amount' to the user's plan price and use both plan and billing_cycle in the conditional key (e.g., "plan=Basic & billing_cycle=monthly": 10). For other events, it should be 0. For 'failed_renewal', set 'payment_amount' to 0.
    - **Note**: Multiple entities and dimension tables are included so users can practice SQL joins.
  `,
  Ecommerce: `
    - **Entities**: Include 'customer', 'product', and 'order' as separate entities. Products have 'product_id', 'name', 'category', and 'price'. Orders have 'order_id', 'order_date', 'shipping_cost', and 'discount_amount'.
    - **Events**: The main event sequence is 'view_item', 'add_to_cart', 'start_checkout', and 'purchase'. Also include 'refund' events. Not every sequence will end in a purchase.
    - **Outputs**: For 'purchase' events, generate an 'order_id'. The final table should include columns like 'quantity', 'item_price', 'shipping_cost', and 'discount_amount'. For other events, these can be null or 0.
    - **Note**: Multiple entities and dimension tables are included so users can practice SQL joins.
  `,
  Healthcare: `
    - **Entities**: Include 'patient', 'provider', and 'facility' as separate entities. The main entity is the 'patient'. Other entities could be 'provider' and 'facility'.
    - **Events**: Generate patient-centric events like 'patient_visit', 'treatment_administered', and 'procedure_performed'. Also include billing events like 'claim_submitted', 'claim_paid', and 'claim_denied'.
    - **Outputs**: For procedures, include 'cpt_code' and 'procedure_cost'. For billing, include 'claim_id', 'claim_amount', and 'insurance_payout'.
    - **Note**: Multiple entities and dimension tables are included so users can practice SQL joins.
  `,
  Fintech: `
    - **Entities**: Include 'account', 'currency', and 'transaction' as separate entities. The core entity is 'account'.
    - **Events**: Model financial transactions. Generate events like 'deposit', 'withdrawal', 'transfer', and 'payment'. Each should have a status ('completed', 'pending', 'failed').
    - **Outputs**: Each event row must have a 'transaction_id'. Key columns are 'amount', 'fee', and 'currency'. Critically, include a boolean 'is_fraud' flag with a realistic (low) probability of being true.
    - **Note**: Multiple entities and dimension tables are included so users can practice SQL joins.
  `,
  Education: `
    - **Entities**: Include 'student', 'course', and 'instructor' as separate entities. Key entities are 'student', 'course', and 'instructor'.
    - **Events**: Track student activities: 'course_enrollment', 'tuition_payment', 'lecture_viewed', 'assignment_submitted', 'grade_received'.
    - **Outputs**: For payments, distinguish between 'tuition_fee', 'scholarship_amount', and 'net_paid'. Other events can have these as 0.
    - **Note**: Multiple entities and dimension tables are included so users can practice SQL joins.
  `,
  Retail: `
    - **Entities**: Include 'customer', 'product', and 'store' as separate entities. 'customer', 'product', 'store'.
    - **Events**: 'sale', 'return', 'inventory_movement' (e.g., 'restock', 'shrinkage').
    - **Outputs**: Sales events need 'line_item_price' and 'quantity'.
    - **Note**: Multiple entities and dimension tables are included so users can practice SQL joins.
  `,
  Manufacturing: `
    - **Entities**: Include 'work_order', 'product', and 'machine' as separate entities. 'work_order', 'product'.
    - **Events**: 'production_run_start', 'production_run_end', 'quality_check'.
    - **Outputs**: Log 'units_produced', 'units_failed', 'material_cost', and 'machine_downtime_hours'.
    - **Note**: Multiple entities and dimension tables are included so users can practice SQL joins.
  `,
  Transportation: `
    - **Entities**: Include 'trip', 'vehicle', and 'driver' as separate entities. 'trip', 'vehicle', 'driver'.
    - **Events**: 'trip_start', 'trip_end', 'vehicle_maintenance', 'fueling'.
    - **Outputs**: For trips, log 'distance', 'duration', and 'fare_amount'. For maintenance/fueling, log 'maintenance_cost' or 'fuel_cost'.
    - **Note**: Multiple entities and dimension tables are included so users can practice SQL joins.
  `,
};

// --- BEGIN ENHANCED SCHEMAS ---
const enhancedSchemas: Record<string, EnhancedSchema & { rules?: any }> = {
  SaaS: {
    OBT: [
      "user_id",
      "signup_date",
      "event_type",
      "plan",
      "billing_cycle",
      "price",
      "country",
      "marketing_channel",
      "payment_amount",
    ],
    Star: {
      fact: "subscriptions_fact",
      dimensions: [
        "users_dim (user_id, signup_date, country, marketing_channel)",
        "plans_dim (plan_id, name, billing_cycle, price)",
        "events_dim (event_id, event_type, event_date, payment_amount)",
      ],
    },
    metrics: [
      "Active Subscribers",
      "MRR/ARR",
      "Churn Rate",
      "CAC by channel",
      "Retention by cohort",
    ],
    rules: {
      plan_prices: {
        Basic: { monthly: 10, annual: 100 },
        Pro: { monthly: 29, annual: 299 },
        Enterprise: { monthly: 99, annual: 999 },
      },
      churn_rate: { monthly: 0.08, annual: 0.03 },
      country_weights: { US: { Enterprise: 0.5 }, Other: { Enterprise: 0.1 } },
    },
  },
  Ecommerce: {
    OBT: [
      "customer_id",
      "event_type",
      "event_date",
      "product_id",
      "product_name",
      "category",
      "price",
      "quantity",
      "shipping_cost",
      "discount_amount",
      "order_id",
    ],
    Star: {
      fact: "orders_fact",
      dimensions: [
        "customers_dim (customer_id, signup_date, country, email_domain)",
        "products_dim (product_id, name, category, brand, price)",
        "orders_dim (order_id, order_date, shipping_cost, discount_amount, payment_method)",
        "categories_dim (category_id, category_name, parent_category)",
      ],
    },
    metrics: [
      "Total Orders",
      "Average Order Value",
      "Conversion Funnel",
      "Repeat Purchase Rate",
      "Revenue by Category",
    ],
    rules: {
      product_price_range: [5, 500],
      quantity_range: [1, 5],
      shipping_cost_range: [0, 20],
      discount_range: [0, 50],
    },
  },
  Healthcare: {
    OBT: [
      "patient_id",
      "event_type",
      "event_date",
      "provider_id",
      "facility_id",
      "procedure_code",
      "procedure_cost",
      "claim_id",
      "claim_amount",
      "insurance_payout",
    ],
    Star: {
      fact: "procedures_fact",
      dimensions: [
        "patients_dim (patient_id, dob, gender, insurance_type, primary_care_physician)",
        "providers_dim (provider_id, specialty, license_number, years_experience)",
        "facilities_dim (facility_id, name, location, facility_type, bed_count)",
        "claims_dim (claim_id, status, submission_date, payout_date, denial_reason)",
        "procedures_dim (procedure_code, procedure_name, cpt_code, typical_duration)",
      ],
    },
    metrics: [
      "Claim Approval Rate",
      "Avg Cost per Procedure",
      "Utilization by Specialty",
      "Payout Lag Days",
      "Patient Visits per Month",
    ],
    rules: {
      procedure_cost_range: [100, 2000],
      claim_amount_range: [100, 5000],
      insurance_payout_ratio: [0.6, 0.95],
    },
  },
  Fintech: {
    OBT: [
      "account_id",
      "transaction_id",
      "event_type",
      "event_date",
      "amount",
      "fee",
      "currency",
      "status",
      "is_fraud",
    ],
    Star: {
      fact: "transactions_fact",
      dimensions: [
        "accounts_dim (account_id, open_date, type, country, credit_score)",
        "currencies_dim (currency_code, country, exchange_rate, last_updated)",
        "merchants_dim (merchant_id, merchant_name, category, risk_level)",
        "fraud_alerts_dim (alert_id, transaction_id, alert_type, resolution_status)",
      ],
    },
    metrics: [
      "Daily Transaction Volume",
      "Revenue from Fees",
      "Fraud Rate",
      "Avg Transaction Value",
      "Currency Usage Breakdown",
    ],
    rules: {
      transaction_amount_range: [1, 10000],
      fee_percentage: [0.5, 3.0],
      fraud_probability: 0.01,
    },
  },
  Education: {
    OBT: [
      "student_id",
      "event_type",
      "event_date",
      "course_id",
      "instructor_id",
      "tuition_fee",
      "scholarship_amount",
      "net_paid",
      "assignment_score",
      "grade",
    ],
    Star: {
      fact: "enrollments_fact",
      dimensions: [
        "students_dim (student_id, enrollment_date, major, gpa, academic_status)",
        "courses_dim (course_id, title, credits, department, prerequisites)",
        "instructors_dim (instructor_id, name, department, tenure_status, research_area)",
        "departments_dim (department_id, department_name, budget, faculty_count)",
        "scholarships_dim (scholarship_id, name, amount, eligibility_criteria)",
      ],
    },
    metrics: [
      "Avg GPA by Course",
      "Enrollment Trends",
      "Tuition Collected",
      "Scholarship Coverage",
      "Student Retention",
    ],
    rules: {
      tuition_fee_range: [1000, 20000],
      scholarship_amount_range: [0, 10000],
      assignment_score_range: [0, 100],
      grade_scale: ["A", "B", "C", "D", "F"],
    },
  },
  Retail: {
    OBT: [
      "store_id",
      "product_id",
      "sale_date",
      "event_type",
      "quantity",
      "unit_price",
      "inventory_status",
      "return_reason",
    ],
    Star: {
      fact: "sales_fact",
      dimensions: [
        "stores_dim (store_id, name, region, manager, square_footage, opening_date)",
        "products_dim (product_id, name, category, brand, supplier, cost_price)",
        "customers_dim (customer_id, loyalty_tier, signup_date, preferred_store)",
        "inventory_dim (product_id, store_id, stock_level, reorder_point, last_restock_date)",
        "suppliers_dim (supplier_id, name, category, reliability_rating)",
      ],
    },
    metrics: [
      "Sales by Region",
      "Inventory Turnover",
      "Return Rate",
      "Revenue per Square Foot",
      "Top Selling Products",
    ],
    rules: {
      unit_price_range: [1, 300],
      quantity_range: [1, 10],
      stock_level_range: [0, 500],
      return_probability: 0.1,
    },
  },
  Manufacturing: {
    OBT: [
      "work_order_id",
      "product_id",
      "start_time",
      "end_time",
      "units_produced",
      "units_failed",
      "material_cost",
      "downtime_hours",
    ],
    Star: {
      fact: "production_fact",
      dimensions: [
        "work_orders_dim (work_order_id, customer_id, start_date, scheduled_completion, priority)",
        "products_dim (product_id, name, category, standard_cost, material_requirements)",
        "machines_dim (machine_id, model, capacity, maintenance_schedule, operator_id)",
        "suppliers_dim (supplier_id, name, material_type, delivery_lead_time, quality_rating)",
        "employees_dim (employee_id, role, department, hire_date, training_level)",
      ],
    },
    metrics: [
      "Yield Rate",
      "Avg Cost per Unit",
      "Downtime by Line",
      "Order Completion Time",
      "Material Waste",
    ],
    rules: {
      units_produced_range: [10, 1000],
      units_failed_rate: [0.01, 0.1],
      material_cost_range: [100, 10000],
      downtime_hours_range: [0, 24],
    },
  },
  Transportation: {
    OBT: [
      "trip_id",
      "vehicle_id",
      "driver_id",
      "trip_start",
      "trip_end",
      "distance_km",
      "duration_min",
      "fare_amount",
      "fuel_cost",
      "maintenance_cost",
    ],
    Star: {
      fact: "trips_fact",
      dimensions: [
        "vehicles_dim (vehicle_id, model, year, fuel_type, capacity, registration_status)",
        "drivers_dim (driver_id, name, hire_date, license_class, safety_rating, vehicle_preference)",
        "customers_dim (customer_id, name, loyalty_tier, preferred_payment_method)",
        "locations_dim (location_id, city, state, airport_code, population)",
        "routes_dim (route_id, origin_id, destination_id, typical_distance, typical_duration)",
      ],
    },
    metrics: [
      "Total Trips",
      "Avg Fare per KM",
      "Fuel Cost Ratio",
      "Maintenance Spend",
      "Driver Utilization",
    ],
    rules: {
      distance_km_range: [1, 500],
      duration_min_range: [5, 600],
      fare_amount_range: [5, 200],
      fuel_cost_range: [10, 150],
      maintenance_cost_range: [50, 1000],
    },
  },
};
// --- END ENHANCED SCHEMAS ---

export interface GenerateSpecPromptParams {
  businessType: string;
  schemaType?: string;
  context?: string;
  timeRange?: string[];
  growthPattern?: string;
  variationLevel?: string;
  granularity?: string;
}

export function generateSpecPrompt(params: GenerateSpecPromptParams) {
  const {
    businessType,
    context,
    timeRange,
    growthPattern,
    variationLevel,
    granularity,
    schemaType,
  } = params;

  const selectedInstructions =
    businessTypeInstructions[businessType] || businessTypeInstructions["SaaS"];

  // Inject schema and metrics
  const schemaInfo = enhancedSchemas[businessType] || enhancedSchemas["SaaS"];
  const schemaTypeKey = schemaType === "Star Schema" ? "Star" : "OBT";
  const schemaExample = schemaInfo[schemaTypeKey];
  const metricsExample = schemaInfo.metrics;
  const rulesExample = schemaInfo.rules;

  let schemaSection = "";
  if (schemaTypeKey === "OBT" && Array.isArray(schemaExample)) {
    schemaSection = `\n- Example OBT Columns: ${schemaExample.join(", ")}`;
  } else if (
    schemaTypeKey === "Star" &&
    typeof schemaExample === "object" &&
    schemaExample !== null &&
    "fact" in schemaExample &&
    "dimensions" in schemaExample
  ) {
    schemaSection = `\n- Example Star Schema:\n  Fact Table: ${
      schemaExample.fact
    }\n  Dimensions: ${schemaExample.dimensions.join("; ")}`;
  }
  schemaSection += `\n- Example Analyst Metrics: ${metricsExample.join(", ")}`;

  let rulesSection = "";
  if (rulesExample) {
    rulesSection = `\n- Realism Rules: Apply the following constraints to generate believable data:\n${JSON.stringify(
      rulesExample,
      null,
      2
    )}`;
  }

  return `You are a data architect designing a hyper-realistic dataset specification for a '${businessType}' business.
Your output MUST be a JSON object that defines a blueprint for a data generation script.
The script will use your specification to generate a large number of events that simulate real-world user behavior over time.

- Business Type Context: ${businessType}
${selectedInstructions}
${schemaSection}${rulesSection}

- Time Range: ${timeRange}
- Growth Pattern: ${growthPattern} (e.g., more signups at the start for 'spike')
- Data Variation: ${variationLevel}
- Granularity: ${granularity}
${
  schemaType === "Star Schema"
    ? `- Schema Hint: The user prefers a Star Schema. Design the entities to be clean and distinct, representing potential dimension tables. The final output will still be one big table, but the design should reflect this preference.

CRITICAL REQUIREMENT: When schemaType is 'Star Schema', your output JSON MUST include a 'Star' property at the root level, with a 'fact' table and one or more 'dimensions' arrays, e.g.:

"Star": {
  "fact": "fact_table_name",
  "dimensions": ["dim1 (col1, col2, ...)", "dim2 (col1, col2, ...)"]
}
`
    : ""
}
${context ? `\n- Additional User Context: ${context}` : ""}

Based on these parameters, design the 'simulation' part of the spec. For example, a 'spike' growth pattern should lead to a higher concentration of 'signup' events at the beginning of the time range. A 'steady' pattern should have them spread out evenly.

CRITICAL REQUIREMENT: Your output must be ONLY the JSON object. Do not include any markdown, explanations, or other text.

The JSON object must have exactly three root keys: "entities", "event_stream_table", and "simulation". If schemaType is 'Star Schema', it must also include a fourth root key: "Star".

REQUIRED STRUCTURE:
1. **entities**: An array of objects, where each object represents a core actor in the simulation (e.g., 'user', 'product').
    - REQUIRED: 'name': The singular name of the entity (e.g., "user").
    - REQUIRED: 'attributes': An object defining the entity's properties.
        - Each attribute must have a 'type' (e.g., 'id', 'faker', 'choice', 'date', 'number').
        - Provide necessary parameters for each type (e.g., 'prefix' for 'id', 'method' for 'faker', 'values' and 'weights' for 'choice').
        - For conditional values, use 'key=value' pairs joined with '&' (e.g., "plan=Pro & billing_cycle=monthly": 29.99).

2. **event_stream_table**: An object defining the final output table where simulated events will be stored. Your goal is to create a denormalized "One Big Table" (OBT) suitable for analytics.
    - REQUIRED: 'name': The name of the output table (e.g., "saas_events").
    - REQUIRED: 'columns': An array of objects defining the table's columns.
        - Each column must have 'name' and 'source' properties.
        - 'source' must define how to populate this column's value.

3. **simulation**: An object defining the logic for how events are generated over a time period.
    - REQUIRED: 'initial_event': The name of the first event for an entity (e.g., "signup").
    - REQUIRED: 'events': An object where keys are event names.
        - Each event MUST define its 'type' ('initial', 'recurring', 'random', 'churn').
        - Each event MUST include 'outputs' mapping for the event stream table columns.
        - For 'recurring' events: include 'frequency'.
        - For 'random' events: include 'avg_per_entity_per_month'.
        - For 'churn' events: include 'monthly_rate'.

4. **Star** (if schemaType is 'Star Schema'): An object with 'fact' and 'dimensions' keys, e.g.:
    - 'fact': The name of the fact table.
    - 'dimensions': An array of dimension table definitions.

Example structure for a SaaS business:

{
  "entities": [
    {
      "name": "user",
      "attributes": {
        "user_id": { "type": "id", "prefix": "usr_" },
        "country": {
          "type": "choice",
          "values": ["US", "UK", "India", "Other"],
          "weights": [0.5, 0.2, 0.15, 0.15]
        },
        "marketing_channel": { "type": "choice", "values": ["organic", "paid_search", "social", "referral"], "weights": [0.4, 0.3, 0.2, 0.1] },
        "plan": {
          "type": "choice",
          "values": ["Free", "Trial", "Basic", "Pro", "Enterprise"],
          "weights": [0.2, 0.1, 0.4, 0.2, 0.1]
        },
        "billing_cycle": { "type": "choice", "values": ["monthly", "annual"], "weights": [0.7, 0.3] },
        "price": {
          "type": "conditional",
          "on": ["plan", "billing_cycle"],
          "cases": {
            "plan=Free": 0,
            "plan=Trial": 0,
            "plan=Basic & billing_cycle=monthly": 9.99,
            "plan=Basic & billing_cycle=annual": 99.99,
            "plan=Pro & billing_cycle=monthly": 29.99,
            "plan=Pro & billing_cycle=annual": 299.99,
            "plan=Enterprise & billing_cycle=monthly": 99.99,
            "plan=Enterprise & billing_cycle=annual": 999.99
          }
        }
      }
    }
  ],
  "event_stream_table": {
    "name": "saas_events",
    "columns": [
      { "name": "event_id", "source": { "type": "id", "prefix": "evt_" } },
      { "name": "timestamp", "source": { "type": "timestamp" } },
      { "name": "user_id", "source": { "type": "reference", "entity": "user", "attribute": "user_id" } },
      { "name": "event_name", "source": { "type": "event_name" } },
      { "name": "plan", "source": { "type": "reference", "entity": "user", "attribute": "plan" } },
      { "name": "billing_cycle", "source": { "type": "reference", "entity": "user", "attribute": "billing_cycle" } },
      { "name": "country", "source": { "type": "reference", "entity": "user", "attribute": "country" } },
      { "name": "marketing_channel", "source": { "type": "reference", "entity": "user", "attribute": "marketing_channel" } },
      { "name": "payment_amount", "source": { "type": "lookup", "from": "event_specific_outputs" } }
    ]
  },
  "simulation": {
    "initial_event": "signup",
    "events": {
      "signup": {
        "type": "initial",
        "outputs": {
          "payment_amount": { "type": "reference", "entity": "user", "attribute": "price" }
        }
      },
      "renewal": {
        "type": "recurring",
        "frequency": { "type": "lookup", "on": "user.billing_cycle" },
        "outputs": {
          "payment_amount": { "type": "reference", "entity": "user", "attribute": "price" }
        }
      },
      "api_call": {
        "type": "random",
        "avg_per_entity_per_month": 20,
        "outputs": {
          "payment_amount": { "type": "literal", "value": 0 }
        }
      },
      "cancellation": {
        "type": "churn",
        "monthly_rate": 0.08,
        "outputs": {
          "payment_amount": { "type": "literal", "value": 0 }
        }
      },
      "failed_renewal": {
        "type": "random",
        "avg_per_entity_per_month": 0.02,
        "outputs": {
          "payment_amount": { "type": "literal", "value": 0 }
        }
      }
    }
  },
  "Star": {
    "fact": "subscriptions_fact",
    "dimensions": [
      "users_dim (user_id, signup_date, country, marketing_channel)",
      "plans_dim (plan_id, name, billing_cycle, price)",
      "events_dim (event_id, event_type, event_date, payment_amount)"
    ]
  }
}
`;
}
