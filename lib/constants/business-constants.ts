// =================================================================
// BUSINESS-SPECIFIC CONSTANTS AND DEFAULT VALUES
// =================================================================

export const NUMERIC_FIELD_RANGES = [
  { field: "api_calls_count", min: 1, max: 1000 },
  { field: "storage_used_mb", min: 10, max: 10000 },
  { field: "feature_usage_count", min: 1, max: 100 },
  { field: "admin_actions_count", min: 0, max: 50 },
  { field: "session_duration_minutes", min: 1, max: 120 },
  { field: "payment_amount", min: 0, max: 10000 },
  { field: "plan_price", min: 0, max: 5000 },
  { field: "contract_value", min: 0, max: 100000 },
  { field: "quantity", min: 1, max: 10 },
  { field: "unit_price", min: 1, max: 2000 },
  { field: "product_price", min: 1, max: 2000 },
  { field: "total_amount", min: 0, max: 10000 },
  { field: "shipping_cost", min: 0, max: 100 },
  { field: "tax_amount", min: 0, max: 1000 },
  { field: "discount_amount", min: 0, max: 1000 },
  { field: "procedure_cost", min: 50, max: 50000 },
  { field: "claim_amount", min: 50, max: 50000 },
  { field: "insurance_payout", min: 0, max: 50000 },
  { field: "patient_responsibility", min: 0, max: 50000 },
  { field: "transaction_amount", min: 1, max: 10000 },
  { field: "balance_before", min: 0, max: 100000 },
  { field: "balance_after", min: 0, max: 100000 },
  { field: "transaction_fee", min: 0, max: 100 },
  { field: "fraud_score", min: 0, max: 100 },
  { field: "course_price", min: 0, max: 50000 },
  { field: "assignment_score", min: 0, max: 100 },
  { field: "exam_score", min: 0, max: 100 },
  { field: "gpa", min: 0, max: 4 },
  { field: "loyalty_points", min: 0, max: 1000 },
  { field: "loyalty_points_earned", min: 0, max: 100 },
  { field: "raw_materials_cost", min: 10, max: 1000 },
  { field: "labor_cost", min: 20, max: 1000 },
  { field: "equipment_cost", min: 1000, max: 100000 },
  { field: "total_cost", min: 1000, max: 100000 },
  { field: "quality_score", min: 0, max: 100 },
  { field: "defect_count", min: 0, max: 10 },
  { field: "production_time_hours", min: 1, max: 100 },
  { field: "distance_miles", min: 1, max: 1000 },
  { field: "fuel_consumed_gallons", min: 1, max: 100 },
  { field: "trip_duration_hours", min: 0.5, max: 24 },
  { field: "fuel_cost", min: 5, max: 500 },
  { field: "maintenance_cost", min: 50, max: 5000 },
  { field: "safety_score", min: 0, max: 100 },
  { field: "driver_rating", min: 1, max: 5 },
  { field: "review_score", min: 1, max: 5 },
  { field: "room_rate", min: 100, max: 2000 },
  { field: "total_charge", min: 100, max: 5000 },
  { field: "ancillary_charges", min: 20, max: 200 },
  { field: "number_of_guests", min: 1, max: 8 },
  { field: "number_of_nights", min: 1, max: 30 },
  { field: "listing_price", min: 100000, max: 10000000 },
  { field: "sale_price", min: 100000, max: 10000000 },
  { field: "offer_amount", min: 100000, max: 10000000 },
  { field: "monthly_rent", min: 1000, max: 10000 },
  { field: "security_deposit", min: 1000, max: 20000 },
  { field: "square_footage", min: 500, max: 10000 },
  { field: "user_age", min: 18, max: 65 },
  { field: "viral_coefficient", min: 0, max: 5 },
  { field: "content_created_count", min: 0, max: 50 },
  { field: "social_shares_count", min: 0, max: 20 },
  { field: "seats_purchased", min: 1, max: 1000 },
];

export const DEFAULT_VALUES = {
  // SaaS defaults
  subscription_plan: ["Free", "Basic", "Pro", "Enterprise"],
  billing_cycle: ["monthly", "annual"],
  plan_price: [0, 99, 299, 999],
  subscription_status: ["active", "cancelled", "expired", "trial"],
  user_role: ["admin", "manager", "user", "viewer"],
  device_type: ["mobile", "desktop", "tablet"],

  // Ecommerce defaults
  order_status: [
    "pending",
    "confirmed",
    "shipped",
    "delivered",
    "returned",
    "cancelled",
  ],
  payment_method: ["credit_card", "paypal", "bank_transfer", "cash"],
  return_reason: ["defective", "wrong_size", "changed_mind", "duplicate"],

  // Healthcare defaults
  appointment_status: [
    "scheduled",
    "confirmed",
    "completed",
    "cancelled",
    "no_show",
  ],
  procedure_type: ["consultation", "surgery", "examination", "therapy"],
  insurance_status: ["covered", "partial", "not_covered", "pending"],

  // Finance defaults
  transaction_type: ["deposit", "withdrawal", "transfer", "payment"],
  account_type: ["checking", "savings", "credit", "investment"],
  fraud_status: ["clean", "suspicious", "flagged", "confirmed"],

  // Education defaults
  course_status: ["enrolled", "completed", "dropped", "waitlisted"],
  grade_level: ["freshman", "sophomore", "junior", "senior"],
  enrollment_status: ["active", "graduated", "suspended", "withdrawn"],

  // Manufacturing defaults
  production_status: ["planned", "in_progress", "completed", "cancelled"],
  quality_status: ["passed", "failed", "pending", "rework"],
  equipment_status: ["operational", "maintenance", "broken", "retired"],

  // Logistics defaults
  shipment_status: ["pending", "in_transit", "delivered", "returned"],
  vehicle_status: ["available", "in_use", "maintenance", "out_of_service"],
  route_status: ["planned", "active", "completed", "cancelled"],

  // Hospitality defaults
  booking_status: [
    "confirmed",
    "checked_in",
    "checked_out",
    "cancelled",
    "no_show",
  ],
  room_type: ["standard", "deluxe", "suite", "presidential"],

  // Real Estate defaults
  property_type: ["residential", "commercial", "industrial", "land"],
  transaction_status: ["pending", "under_contract", "closed", "cancelled"],
};

export const COUNTRIES = [
  "United States",
  "Canada",
  "United Kingdom",
  "Germany",
  "Australia",
  "India",
  "Brazil",
  "France",
  "Japan",
  "South Africa",
];

export const SESSION_DURATION_RANGES = {
  login: { min: 5, max: 30 },
  logout: { min: 1, max: 5 },
  api_call: { min: 1, max: 10 },
  feature_usage: { min: 15, max: 120 },
  admin_action: { min: 30, max: 180 },
  support_ticket: { min: 20, max: 90 },
  user_invited: { min: 5, max: 15 },
  demo_requested: { min: 10, max: 30 },
  contract_signed: { min: 60, max: 240 },
  trial_started: { min: 15, max: 45 },
  subscription_created: { min: 30, max: 90 },
  upgrade: { min: 20, max: 60 },
  downgrade: { min: 10, max: 30 },
  cancellation: { min: 15, max: 45 },
  contract_renewal: { min: 30, max: 90 },
  churn: { min: 5, max: 15 },
};

export const PLACEHOLDER_PATTERNS = [
  {
    pattern: /option\s*[a-z]/i,
    field: "subscription_plan",
    fallbacks: ["Free", "Basic", "Pro", "Enterprise"],
  },
  {
    pattern: /option\s*[a-z]/i,
    field: "plan_name",
    fallbacks: ["Free", "Basic", "Pro", "Enterprise"],
  },
  {
    pattern: /option\s*[a-z]/i,
    field: "product_name",
    fallbacks: ["Product A", "Product B", "Product C"],
  },
  {
    pattern: /option\s*[a-z]/i,
    field: "category",
    fallbacks: ["Electronics", "Clothing", "Home", "Books"],
  },
  {
    pattern: /option\s*[a-z]/i,
    field: "status",
    fallbacks: ["active", "pending", "completed", "cancelled"],
  },
  {
    pattern: /option\s*[a-z]/i,
    field: "event_type",
    fallbacks: ["login", "purchase", "view", "click"],
  },
  {
    pattern: /option\s*[a-z]/i,
    field: "country",
    fallbacks: ["United States", "Canada", "United Kingdom", "Germany"],
  },
  {
    pattern: /option\s*[a-z]/i,
    field: "payment_method",
    fallbacks: ["credit_card", "paypal", "bank_transfer", "cash"],
  },
  {
    pattern: /option\s*[a-z]/i,
    field: "billing_cycle",
    fallbacks: ["monthly", "annual"],
  },
  {
    pattern: /option\s*[a-z]/i,
    field: "user_role",
    fallbacks: ["admin", "user", "viewer"],
  },
  {
    pattern: /option\s*[a-z]/i,
    field: "device_type",
    fallbacks: ["mobile", "desktop", "tablet"],
  },
];

export const REQUIRED_FIELDS_BY_BUSINESS_TYPE = {
  "B2B SaaS": [
    "user_id",
    "company_id",
    "subscription_plan",
    "plan_price",
    "event_type",
  ],
  "B2C SaaS": ["user_id", "subscription_plan", "plan_price", "event_type"],
  Ecommerce: [
    "customer_id",
    "product_id",
    "order_id",
    "total_amount",
    "event_type",
  ],
  Healthcare: ["patient_id", "provider_id", "procedure_code", "event_type"],
  Fintech: ["account_id", "transaction_id", "amount", "event_type"],
  Education: ["student_id", "course_id", "event_type"],
  Retail: [
    "customer_id",
    "product_id",
    "transaction_id",
    "total_amount",
    "event_type",
  ],
  Manufacturing: ["product_id", "machine_id", "work_order_id", "event_type"],
  Transportation: ["vehicle_id", "driver_id", "trip_id", "event_type"],
  Hospitality: ["guest_id", "booking_id", "hotel_id", "room_id", "event_type"],
  "Real Estate": ["property_id", "agent_id", "client_id", "event_type"],
};
