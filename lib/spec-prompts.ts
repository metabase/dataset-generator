// Add an index signature to allow string indexing

const businessTypeInstructions: Record<string, string> = {
  "B2B SaaS": `
    **CRITICAL: B2B SaaS Business Model Requirements**
    - **Pricing Structure**: 
      - Starter: $50-199/month (small teams, 1-10 users)
      - Professional: $200-999/month (growing companies, 10-100 users)
      - Enterprise: $1000-5000+/month (large organizations, 100+ users)
      - Custom: $5000-50000/month (enterprise contracts, unlimited users)
      - Annual billing: 20-30% discount (e.g., $2400/year instead of $200/month)
    - **User Lifecycle Events**:
      - demo_requested: Sales inquiry (avg_per_entity_per_month: 0.01-0.05)
      - trial_started: Free trial begins (avg_per_entity_per_month: 0.02-0.1)
      - contract_signed: Enterprise deal closed (avg_per_entity_per_month: 0.005-0.02)
      - user_invited: Team member added (avg_per_entity_per_month: 0.1-0.5)
      - login: User authentication (avg_per_entity_per_month: 5-15)
      - feature_usage: Business feature interaction (avg_per_entity_per_month: 10-50)
      - api_call: Integration usage (avg_per_entity_per_month: 100-1000)
      - admin_action: Administrative task (avg_per_entity_per_month: 1-5)
      - support_ticket: Customer support request (avg_per_entity_per_month: 0.1-0.5)
      - contract_renewal: Annual renewal (monthly_rate: 0.08 - 8% monthly renewal rate)
      - churn: Contract cancellation (monthly_rate: 0.01-0.03 - 1-3% monthly churn)
    - **Required Fields**:
      - user_id, user_name, user_email, user_role, company_id, company_name
      - company_size, company_industry, subscription_plan, billing_cycle, plan_price
      - contract_value, contract_start_date, contract_end_date, seats_purchased
      - event_type, event_timestamp, session_duration_minutes
      - api_calls_count, feature_usage_count, admin_actions_count
      - payment_amount, billing_date, acv (annual contract value), mrr
    - **Business Logic**:
      - plan_price must match subscription_plan (Starter=50-199, Pro=200-999, Enterprise=1000+)
      - contract_value = plan_price * 12 (annual contracts)
      - acv = contract_value for annual, plan_price * 12 for monthly
      - mrr = acv / 12
      - seats_purchased >= 1 (B2B always has multiple users)
      - user_role: admin, manager, user, viewer
    - **Analyst-Friendly Context**: Include company demographics, user roles, contract details, and enterprise metrics in every row
  `,
  "B2C SaaS": `
    **CRITICAL: B2C SaaS Business Model Requirements**
    - **Pricing Structure**: 
      - Free tier: $0 (freemium model, limited features)
      - Basic tier: $5-19/month (individual users, core features)
      - Premium tier: $20-49/month (power users, advanced features)
      - Family tier: $50-99/month (multiple users, shared features)
      - Annual billing: 30-50% discount (e.g., $120/year instead of $15/month)
    - **User Lifecycle Events**:
      - signup: Initial registration (avg_per_entity_per_month: 0.1-0.5)
      - trial_started: Free trial begins (avg_per_entity_per_month: 0.05-0.2)
      - subscription_created: Paid plan starts (avg_per_entity_per_month: 0.02-0.1)
      - login: User authentication (avg_per_entity_per_month: 20-100)
      - feature_usage: Feature interaction (avg_per_entity_per_month: 50-200)
      - content_created: User-generated content (avg_per_entity_per_month: 10-50)
      - social_share: Social media sharing (avg_per_entity_per_month: 2-10)
      - referral_sent: Invite friend (avg_per_entity_per_month: 0.5-2)
      - upgrade: Plan upgrade (avg_per_entity_per_month: 0.02-0.1)
      - downgrade: Plan downgrade (avg_per_entity_per_month: 0.01-0.05)
      - cancellation: Subscription ends (monthly_rate: 0.03-0.08 - 3-8% monthly churn)
    - **Required Fields**:
      - user_id, user_name, user_email, user_age, user_country, signup_date
      - subscription_plan, billing_cycle, plan_price, subscription_status
      - device_type, app_version, marketing_source, referral_code
      - event_type, event_timestamp, session_duration_minutes
      - feature_usage_count, content_created_count, social_shares_count
      - payment_amount, billing_date, mrr, viral_coefficient
    - **Business Logic**:
      - plan_price must match subscription_plan (Free=0, Basic=5-19, Premium=20-49, Family=50-99)
      - subscription_status: active, cancelled, expired, trial
      - device_type: mobile, desktop, tablet
      - viral_coefficient = referrals_sent / active_users
      - session_duration_minutes: 5-60 (personal usage patterns)
    - **Analyst-Friendly Context**: Include user demographics, device info, usage patterns, and engagement metrics in every row
  `,
  Ecommerce: `
    **CRITICAL: Ecommerce Business Model Requirements**
    - **Product Pricing**:
      - Electronics: $50-2000 (phones, laptops, accessories)
      - Clothing: $10-200 (shirts, pants, shoes)
      - Home & Garden: $20-500 (furniture, tools, decor)
      - Books: $5-50 (fiction, non-fiction, textbooks)
      - Food & Beverage: $5-100 (groceries, snacks, drinks)
    - **Customer Journey Events**:
      - product_view: Browse product (avg_per_entity_per_month: 20-50)
      - add_to_cart: Add item to cart (avg_per_entity_per_month: 5-15)
      - purchase: Complete order (avg_per_entity_per_month: 2-8)
      - review: Product review (avg_per_entity_per_month: 0.5-2)
      - return: Return item (monthly_rate: 0.05-0.15)
    - **Required Fields**:
      - customer_id, customer_name, customer_email, customer_country
      - product_id, product_name, product_category, product_price
      - order_id, order_date, order_status, quantity, unit_price
      - total_amount, shipping_cost, tax_amount, discount_amount
      - payment_method, shipping_address, delivery_date
    - **Business Logic**:
      - total_amount = (quantity * unit_price) + shipping_cost + tax_amount - discount_amount
      - order_status: pending, confirmed, shipped, delivered, returned, cancelled
      - product_price must be realistic for category
      - shipping_cost: $5-15 for domestic, $20-50 for international
    - **Analyst-Friendly Context**: Include customer info, product details, order context, and financial calculations in every row
  `,
  Healthcare: `
    **CRITICAL: Healthcare Business Model Requirements**
    - **Medical Procedure Costs**:
      - Primary Care: $50-200 (checkups, consultations)
      - Specialist Care: $150-500 (cardiology, neurology, orthopedics)
      - Surgery: $5000-50000 (minor to major procedures)
      - Diagnostic Tests: $100-2000 (blood work, imaging, biopsies)
      - Emergency Care: $500-5000 (urgent care, ER visits)
    - **Patient Care Events**:
      - appointment_scheduled: Book appointment (avg_per_entity_per_month: 0.5-2)
      - appointment_attended: Complete visit (avg_per_entity_per_month: 0.3-1.5)
      - procedure_performed: Medical procedure (avg_per_entity_per_month: 0.1-0.5)
      - prescription_filled: Medication dispensed (avg_per_entity_per_month: 0.2-1)
      - follow_up: Follow-up visit (avg_per_entity_per_month: 0.1-0.3)
    - **Required Fields**:
      - patient_id, patient_name, patient_dob, patient_gender, insurance_provider
      - provider_id, provider_name, provider_specialty, facility_id, facility_name
      - procedure_code, procedure_name, procedure_cost, claim_amount
      - appointment_date, admission_date, discharge_date, appointment_status
      - insurance_payout, patient_responsibility, claim_status
    - **Business Logic**:
      - claim_amount >= procedure_cost (typically 10-60% higher)
      - insurance_payout = 0 if claim_status = 'Denied'
      - patient_responsibility = claim_amount - insurance_payout
      - discharge_date > admission_date
      - appointment_status: scheduled, confirmed, completed, cancelled, no_show
    - **Analyst-Friendly Context**: Include patient demographics, provider details, clinical context, and financial data in every row
  `,
  Fintech: `
    **CRITICAL: Fintech Business Model Requirements**
    - **Transaction Amounts**:
      - Small transactions: $1-100 (coffee, groceries, gas)
      - Medium transactions: $100-1000 (electronics, travel, services)
      - Large transactions: $1000-10000 (furniture, appliances, deposits)
      - Investment transactions: $1000-100000 (stocks, bonds, crypto)
    - **Financial Events**:
      - account_opened: New account creation (avg_per_entity_per_month: 0.05-0.2)
      - transaction_processed: Financial transaction (avg_per_entity_per_month: 20-100)
      - payment_sent: Outgoing payment (avg_per_entity_per_month: 5-30)
      - payment_received: Incoming payment (avg_per_entity_per_month: 3-20)
      - fraud_alert: Suspicious activity (monthly_rate: 0.001-0.01)
      - account_closed: Account termination (monthly_rate: 0.01-0.05)
    - **Required Fields**:
      - account_id, customer_id, customer_name, account_type, account_status
      - transaction_id, transaction_type, transaction_amount, currency
      - transaction_date, transaction_status, merchant_name, merchant_category
      - balance_before, balance_after, transaction_fee, fraud_score
      - payment_method, card_type, card_last_four, transaction_location
    - **Business Logic**:
      - balance_after = balance_before + transaction_amount - transaction_fee
      - transaction_status: pending, completed, failed, reversed, flagged
      - fraud_score: 0-100 (higher = more suspicious)
      - transaction_fee: 0-5% of transaction_amount
      - account_status: active, suspended, closed, frozen
    - **Analyst-Friendly Context**: Include account details, customer info, transaction context, and risk metrics in every row
  `,
  Education: `
    **CRITICAL: Education Business Model Requirements**
    - **Course Pricing**:
      - Free courses: $0 (basic content, certifications)
      - Basic courses: $50-200 (skill development, workshops)
      - Advanced courses: $200-1000 (professional training, bootcamps)
      - Degree programs: $5000-50000 (bachelor's, master's, certificates)
    - **Academic Events**:
      - enrollment: Student enrolls (avg_per_entity_per_month: 0.1-0.5)
      - course_started: Begin course (avg_per_entity_per_month: 0.05-0.3)
      - assignment_submitted: Submit work (avg_per_entity_per_month: 2-10)
      - exam_taken: Take assessment (avg_per_entity_per_month: 0.5-2)
      - course_completed: Finish course (avg_per_entity_per_month: 0.02-0.2)
      - graduation: Complete program (avg_per_entity_per_month: 0.01-0.1)
    - **Required Fields**:
      - student_id, student_name, student_email, student_dob, enrollment_date
      - course_id, course_name, course_category, course_price, instructor_id
      - instructor_name, instructor_specialty, institution_id, institution_name
      - assignment_id, assignment_name, assignment_score, exam_score
      - completion_date, graduation_date, gpa, academic_status
    - **Business Logic**:
      - assignment_score: 0-100 (realistic distribution)
      - exam_score: 0-100 (weighted average of assignments)
      - gpa: 0.0-4.0 (cumulative grade point average)
      - academic_status: enrolled, active, completed, graduated, dropped
      - completion_date > enrollment_date
    - **Analyst-Friendly Context**: Include student demographics, course details, academic performance, and institutional data in every row
  `,
  Retail: `
    **CRITICAL: Retail Business Model Requirements**
    - **Product Pricing**:
      - Electronics: $50-2000 (phones, laptops, accessories)
      - Clothing: $10-200 (shirts, pants, shoes, accessories)
      - Home & Garden: $20-500 (furniture, tools, decor)
      - Beauty & Personal Care: $5-100 (cosmetics, skincare, hygiene)
      - Sports & Outdoors: $20-300 (equipment, apparel, gear)
    - **Shopping Events**:
      - store_visit: Physical store visit (avg_per_entity_per_month: 2-8)
      - product_browsed: Browse product (avg_per_entity_per_month: 10-30)
      - purchase_made: Buy product (avg_per_entity_per_month: 1-5)
      - return_processed: Return item (monthly_rate: 0.05-0.15)
      - loyalty_points_earned: Earn rewards (avg_per_entity_per_month: 0.5-2)
    - **Required Fields**:
      - customer_id, customer_name, customer_email, customer_segment
      - store_id, store_name, store_location, store_type
      - product_id, product_name, product_category, product_price
      - transaction_id, transaction_date, quantity, unit_price
      - total_amount, tax_amount, discount_amount, payment_method
      - sales_associate_id, loyalty_points, return_reason
    - **Business Logic**:
      - total_amount = (quantity * unit_price) + tax_amount - discount_amount
      - loyalty_points = total_amount * 0.01 (1% back)
      - product_price must be realistic for category and store type
      - tax_amount = total_amount * 0.08-0.12 (8-12% sales tax)
      - return_reason: defective, wrong_size, changed_mind, duplicate
    - **Analyst-Friendly Context**: Include customer info, store details, product context, and transaction data in every row
  `,
  Manufacturing: `
    **CRITICAL: Manufacturing Business Model Requirements**
    - **Production Costs**:
      - Raw materials: $10-1000 per unit (depending on product complexity)
      - Labor costs: $20-100 per hour (skilled vs unskilled)
      - Equipment costs: $1000-100000 per machine (maintenance, depreciation)
      - Quality control: $5-50 per unit (testing, inspection)
    - **Production Events**:
      - work_order_created: Start production (avg_per_entity_per_month: 1-5)
      - production_started: Begin manufacturing (avg_per_entity_per_month: 0.5-3)
      - quality_check: Quality inspection (avg_per_entity_per_month: 2-10)
      - maintenance_performed: Equipment maintenance (avg_per_entity_per_month: 0.1-0.5)
      - product_completed: Finish production (avg_per_entity_per_month: 0.3-2)
      - defect_found: Quality issue (monthly_rate: 0.01-0.05)
    - **Required Fields**:
      - product_id, product_name, product_category, product_specifications
      - work_order_id, work_order_date, production_line_id, machine_id
      - machine_name, machine_type, operator_id, operator_name
      - raw_materials_cost, labor_cost, equipment_cost, total_cost
      - quality_score, defect_count, production_time_hours, completion_date
    - **Business Logic**:
      - total_cost = raw_materials_cost + labor_cost + equipment_cost
      - quality_score: 0-100 (higher = better quality)
      - defect_count: 0-10 (lower = better production)
      - production_time_hours: realistic for product complexity
      - completion_date > work_order_date
    - **Analyst-Friendly Context**: Include product details, production metrics, quality data, and cost breakdowns in every row
  `,
  Transportation: `
    **CRITICAL: Transportation Business Model Requirements**
    - **Trip Costs**:
      - Local delivery: $10-50 (same city, small packages)
      - Regional delivery: $50-200 (same state/province, medium packages)
      - Long-distance: $200-1000 (cross-country, large shipments)
      - International: $500-5000 (overseas, express shipping)
    - **Transportation Events**:
      - trip_scheduled: Plan delivery (avg_per_entity_per_month: 2-10)
      - trip_started: Begin journey (avg_per_entity_per_month: 1-8)
      - delivery_made: Complete delivery (avg_per_entity_per_month: 0.8-6)
      - maintenance_performed: Vehicle maintenance (avg_per_entity_per_month: 0.1-0.3)
      - fuel_purchased: Refuel vehicle (avg_per_entity_per_month: 4-12)
      - accident_reported: Safety incident (monthly_rate: 0.001-0.01)
    - **Required Fields**:
      - vehicle_id, vehicle_type, vehicle_model, vehicle_year
      - driver_id, driver_name, driver_license, driver_rating
      - trip_id, trip_date, origin_location, destination_location
      - distance_miles, fuel_consumed_gallons, trip_duration_hours
      - delivery_status, fuel_cost, maintenance_cost, total_cost
      - weather_conditions, traffic_conditions, safety_score
    - **Business Logic**:
      - total_cost = fuel_cost + maintenance_cost + driver_wages
      - fuel_cost = fuel_consumed_gallons * $3.50 (average fuel price)
      - delivery_status: scheduled, in_transit, delivered, delayed, cancelled
      - safety_score: 0-100 (higher = safer driving)
      - trip_duration_hours = distance_miles / 50 (average speed)
    - **Analyst-Friendly Context**: Include vehicle details, driver info, trip metrics, and operational costs in every row
  `,
  Custom: `
    **CRITICAL: Custom Business Model Requirements**
    - **Domain-Specific Pricing**: Adapt pricing to the specific industry described
    - **Realistic Event Patterns**: Define events that reflect actual business operations
    - **Industry-Specific Metrics**: Include KPIs relevant to the business domain
    - **Logical Relationships**: Ensure all data relationships make business sense
    - **Analyst-Friendly Context**: Provide rich context for slicing and dicing data
  `,
};

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

  // Build schema guidance based on schema type
  let schemaSection = "";
  if (schemaType === "Star Schema") {
    schemaSection = `
- **Star Schema Structure**: Design a normalized schema with:
  - **Fact Table**: Main events/transactions (e.g., \`transactions_fact\`, \`orders_fact\`)
  - **Dimension Tables**: Context entities (e.g., \`customers_dim\`, \`products_dim\`, \`stores_dim\`)
  - **Relationships**: Foreign keys linking fact to dimensions
- **Analyst Benefits**: Enables complex joins, dimensional analysis, and data warehouse patterns`;
  } else {
    schemaSection = `
- **One Big Table (OBT) Structure**: Design a denormalized single table with:
  - **All Context Fields**: Include entity attributes directly in each row
  - **Event + Context**: Every row contains both event data and relevant entity context
  - **Analyst Benefits**: Immediate analysis without joins, perfect for quick insights`;
  }

  // Build metadata section if provided
  let metadataSection = "";
  if (timeRange || growthPattern || variationLevel || granularity) {
    metadataSection = `\n- **Metadata** (optional):\n`;
    if (timeRange)
      metadataSection += `  - "time_range": ${JSON.stringify(timeRange)}\n`;
    if (granularity) metadataSection += `  - "granularity": "${granularity}"\n`;
    if (growthPattern)
      metadataSection += `  - "growth_pattern": "${growthPattern}"\n`;
    if (variationLevel)
      metadataSection += `  - "variation_level": "${variationLevel}"\n`;
  }

  return `You are a data architect designing a hyper-realistic dataset specification for a '${businessType}' business.

**Your Goal**: Define a realistic schema and simulation logic for generating synthetic analytics-ready data that data analysts can immediately use for business intelligence, reporting, and advanced analytics.

**CRITICAL: Raw Data for Analyst Practice**
- Generate **raw, unaggregated event-level data** - NOT pre-calculated metrics or summaries
- Analysts need to practice: GROUP BY, SUM(), COUNT(), AVG(), JOINs, window functions, etc.
- Data should be perfect for creating charts, dashboards, and visualizations
- Include all necessary context fields so analysts can slice and dice the data
- Focus on individual transactions, events, or records that can be aggregated later
- **Do not include columns for pre-aggregated values (e.g., acv, mrr, totals, averages, etc). Only include the raw columns needed to calculate them.**

**CRITICAL: Realistic Values and Business Logic**
- **NEVER use 0 for realistic prices** - use the pricing guidelines provided
- **Ensure mathematical consistency** - totals should equal sums of components
- **Use realistic frequencies** - events should occur at believable rates
- **Include proper business relationships** - foreign keys, status flows, etc.
- **Provide rich context** - analysts need dimensions to filter and group by

**CRITICAL: Adapt to User Context**
- If the user specifies a particular business context (e.g., "B2B SaaS for construction management"), adapt your schema to that specific domain
- Use the business type guidance as a starting point, but customize entities, events, and relationships for the specific use case
- Ensure all generated data reflects the actual business operations described by the user

**CRITICAL: Use correct faker method names:**
- For names: use "person.fullName" (not "person.name")
- For emails: use "internet.email" (not "email") 
- For product names: use "commerce.productName" (not "commerce.product_name")
- For prices: use "commerce.price" (not "commerce.price")
- For categories: use "commerce.department" (not "commerce.category")
- For numbers: use "number.int" (not "random.number")

${selectedInstructions}

**Schema Requirements:**${schemaSection}

**Analyst-Friendly Data Structure:**
- **Event-Level Records**: Each row represents a single event, transaction, or interaction
- **Rich Context**: Include entity attributes (customer info, product details, etc.) for easy filtering and grouping
- **No Pre-Aggregations**: Avoid calculated totals, averages, or summaries - let analysts compute these
- **Visualization-Ready**: Include date/time fields, categorical dimensions, and numeric measures
- **Join-Friendly**: Ensure proper foreign keys and relationships for complex analysis

**Simulation Logic Guidelines:**
- **Initial Events**: Define the starting point for each entity (e.g., signup, first purchase)
  - Use realistic frequencies: 0.05-0.2 avg_per_entity_per_month for new entities
- **Recurring Events**: Use \`frequency: { "on": "entity.attribute" }\` to control periodicity
  - Examples: billing_cycle for subscriptions, maintenance_schedule for equipment
- **Random Events**: Use \`avg_per_entity_per_month\` for engagement events
  - High frequency: 20-100 (logins, views, small transactions)
  - Medium frequency: 5-20 (purchases, feature usage, assignments)
  - Low frequency: 0.5-5 (reviews, upgrades, major events)
- **Churn Events**: Use \`monthly_rate\` for cancellations or departures
  - Typical rates: 0.01-0.05 (1-5% monthly churn)
  - High churn: 0.05-0.15 (5-15% monthly churn)

**Output Format:**
Your response must be valid JSON with this structure:
{
  "entities": [
    {
      "name": "entity_name",
      "attributes": {
        "attribute_name": {
          "type": "faker|choice|conditional|id",
          "method": "namespace.method", // Use 'faker.method' only when type is 'faker'
          "values": ["option1", "option2"], // for choice type
          "weights": [0.6, 0.4], // for choice type
          "on": ["condition_field"], // for conditional type
          "cases": { // for conditional type
            "condition_value": result_value,
            "default": fallback_value
          }
        }
      }
    }
  ],
  "event_stream_table": {
    "name": "table_name",
    "columns": [
      {
        "name": "column_name",
        "source": {
          "type": "reference|literal|timestamp|id|choice",
          "entity": "entity_name", // for reference type
          "attribute": "entity.attribute", // for reference type
          "value": "static_value", // for literal type
          "values": ["option1", "option2"], // for choice type
          "weights": [0.6, 0.4] // for choice type
        }
      }
    ]
  },
  "simulation": {
    "initial_event": "event_name",
    "events": {
      "event_name": {
        "type": "recurring|random|churn",
        "frequency": { "on": "entity.attribute" }, // for recurring events
        "avg_per_entity_per_month": 5, // for random events
        "monthly_rate": 0.05, // for churn events
        "outputs": {
          "column_name": {
            "type": "reference|literal",
            "entity": "entity_name", // for reference
            "attribute": "entity.attribute", // for reference
            "value": "static_value" // for literal
          }
        }
      }
    }
  }${metadataSection}
}

**CRITICAL Consistency Rules:**
- **Use realistic pricing**: Follow the pricing guidelines for each business type
- **Ensure mathematical consistency**: totals = sums of components
- **Use consistent value formatting**: numbers without quotes (e.g., 49, not "49")
- **Standardize field names**: Use consistent casing (e.g., snake_case for all)
- **Reference format**: Always use \`entity.attribute\` format for clarity
- **Realistic values**: Never use random strings or generic codes for business fields
- **Raw data focus**: Generate individual records, not summaries or aggregations

**CRITICAL: Business Type Validation**
- **B2B SaaS**: Must include user_id, company_id, user_role, subscription_plan, billing_cycle, plan_price, contract_value. NEVER include product_id, product_name, category
- **B2C SaaS**: Must include user_id, user_age, device_type, subscription_plan, billing_cycle, plan_price. NEVER include product_id, product_name, category, company_id
- **Ecommerce**: Must include customer_id, product_id, product_name, category, price. NEVER include subscription_plan, billing_cycle
- **Healthcare**: Must include patient_id, provider_id, procedure_code. NEVER include product_id, category
- **Fintech**: Must include account_id, transaction_id, amount, currency. NEVER include product_id, category
- **Education**: Must include student_id, course_id, instructor_id. NEVER include product_id, category
- **Retail**: Must include customer_id, product_id, store_id, quantity, unit_price. NEVER include subscription_plan
- **Manufacturing**: Must include product_id, machine_id, work_order_id. NEVER include customer_id, subscription_plan
- **Transportation**: Must include vehicle_id, driver_id, trip_id. NEVER include product_id, subscription_plan

**CRITICAL: Example Realistic Values**
- **B2B SaaS plan_price**: Starter=99, Professional=299, Enterprise=999, Custom=5000
- **B2C SaaS plan_price**: Free=0, Basic=9, Premium=29, Family=79
- **Ecommerce product_price**: Electronics=50-2000, Clothing=10-200, Home=20-500
- **Healthcare procedure_cost**: Primary=50-200, Specialist=150-500, Surgery=5000-50000
- **Fintech transaction_amount**: Small=1-100, Medium=100-1000, Large=1000-10000
- **Education course_price**: Free=0, Basic=50-200, Advanced=200-1000, Degree=5000-50000`;
}
