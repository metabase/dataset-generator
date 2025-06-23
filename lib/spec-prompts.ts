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
    - **Entities**: Include 'user', 'plan', and 'marketing_channel' as separate entities. Users have attributes like 'user_id', 'name', 'email', 'plan' (linked to the plan entity), 'billing_cycle', 'country', and 'signup_date'. Plans have 'plan_id', 'name', 'billing_cycle', and 'price'. Marketing channels have 'channel_id' and 'name'.
    - **Events**: Simulate a user lifecycle. Start with a 'signup' event (the initial event). Schedule recurring 'renewal' events based on their billing cycle. Generate random 'api_call' or 'feature_usage' events to represent product engagement. Model 'cancellation' events using a monthly churn rate. Add a 'failed_renewal' event with a small probability (e.g., 2% of renewals). Some users should have only a signup event (silent churn).
    - **Outputs**: For 'signup' and 'renewal' events: if the user's plan is 'Free' or 'Trial', set 'payment_amount' to 0 and use only the plan in the conditional key (e.g., "plan=Free": 0). For paid plans, set 'payment_amount' to the user's plan price and use both plan and billing_cycle in the conditional key (e.g., "plan=Basic & billing_cycle=monthly": 10). For other events, it should be 0. For 'failed_renewal', set 'payment_amount' to 0.
    - **CRITICAL - All fields must be realistic SaaS values, NOT random strings:**
      - 'plan': realistic plans like "Free", "Basic", "Pro", "Enterprise", "Trial"
      - 'billing_cycle': realistic cycles like "monthly", "annual", "quarterly"
      - 'marketing_channel': realistic channels like "Organic Search", "Paid Search", "Social Media", "Email", "Direct", "Referral"
      - 'country': realistic countries like "United States", "Canada", "United Kingdom", "Germany"
      - 'event_type': realistic events like "signup", "renewal", "cancellation", "api_call", "feature_usage"
    - **Schema Requirements**: For each entity, include all attributes needed for analytics and joins. Do not omit any key business fields. Every event in the event stream must reference all relevant entities (e.g., every event must have a valid user_id, plan_id, etc.). For each attribute, specify a realistic faker method and value range.
    - **CRITICAL**: NEVER generate random strings or alphanumeric codes for business fields. Use realistic SaaS terminology and values that an analyst would expect to see in real SaaS data.
    - **EXAMPLE JSON SPEC FORMAT** (use this exact format for realistic values):
      {
        "entities": [
          {
            "name": "user",
            "attributes": {
              "user_id": {"type": "id", "prefix": "usr_"},
              "plan": {"type": "choice", "values": ["Free", "Basic", "Pro", "Enterprise", "Trial"], "weights": [0.3, 0.25, 0.25, 0.15, 0.05]},
              "billing_cycle": {"type": "choice", "values": ["monthly", "annual", "quarterly"], "weights": [0.6, 0.3, 0.1]},
              "marketing_channel": {"type": "choice", "values": ["Organic Search", "Paid Search", "Social Media", "Email", "Direct", "Referral"], "weights": [0.3, 0.2, 0.2, 0.15, 0.1, 0.05]},
              "country": {"type": "choice", "values": ["United States", "Canada", "United Kingdom", "Germany", "Australia"], "weights": [0.6, 0.1, 0.1, 0.1, 0.1]}
            }
          }
        ],
        "event_stream_table": {
          "name": "saas_events",
          "columns": [
            {"name": "event_type", "source": {"type": "choice", "values": ["signup", "renewal", "cancellation", "api_call", "feature_usage"], "weights": [0.2, 0.3, 0.1, 0.25, 0.15]}},
            {"name": "plan", "source": {"type": "choice", "values": ["Free", "Basic", "Pro", "Enterprise", "Trial"], "weights": [0.3, 0.25, 0.25, 0.15, 0.05]}},
            {"name": "billing_cycle", "source": {"type": "choice", "values": ["monthly", "annual", "quarterly"], "weights": [0.6, 0.3, 0.1]}},
            {"name": "marketing_channel", "source": {"type": "choice", "values": ["Organic Search", "Paid Search", "Social Media", "Email", "Direct", "Referral"], "weights": [0.3, 0.2, 0.2, 0.15, 0.1, 0.05]}}
          ]
        }
      }
    - **Note**: Multiple entities and dimension tables are included so users can practice SQL joins.
  `,
  Ecommerce: `
    - **Entities**: Include 'customer', 'product', and 'order' as separate entities. Customers have 'customer_id', 'name', 'email', 'country'. Products have 'product_id', 'product_name', 'category', and 'price'. Orders have 'order_id', 'order_date', 'shipping_cost', and 'discount_amount'.
    - **Events**: The main event sequence is 'view_item', 'add_to_cart', 'start_checkout', and 'purchase'. Also include 'refund' events. Not every sequence will end in a purchase.
    - **Outputs**: For 'purchase' events, always reference the product and order entities for price, shipping_cost, and discount_amount. Do not use a literal 0 for these fields in purchase events. For non-purchase events, it is acceptable to use 0 for price, shipping_cost, and discount_amount.
    - **CRITICAL - All fields must be realistic ecommerce values, NOT random strings:**
      - 'product_name': realistic names like "Wireless Bluetooth Headphones", "Organic Cotton T-Shirt", "Stainless Steel Water Bottle"
      - 'category': realistic categories like "Electronics", "Clothing", "Home & Garden", "Sports & Outdoors", "Books"
      - 'payment_method': realistic methods like "Credit Card", "Debit Card", "PayPal", "Apple Pay", "Google Pay"
      - 'order_status': realistic statuses like "Pending", "Processing", "Shipped", "Delivered", "Cancelled"
      - 'shipping_method': realistic methods like "Standard", "Express", "Overnight", "Free Shipping"
      - 'event_type': realistic events like "view_item", "add_to_cart", "start_checkout", "purchase", "refund"
    - **Schema Requirements**: For each entity, include all attributes needed for analytics and joins. Do not omit any key business fields. Every event in the event stream must reference all relevant entities (e.g., every purchase event must have a valid product_id, order_id, customer_id, etc.). For each attribute, specify a realistic faker method and value range.
    - **Critical**: Every event must have a valid product_id, product_name, category, and price. Use faker.commerce.productName(), faker.commerce.department(), and faker.commerce.price().
    - **CRITICAL**: NEVER generate random strings or alphanumeric codes for business fields. Use realistic ecommerce terminology and values that an analyst would expect to see in real ecommerce data.
    - **EXAMPLE JSON SPEC FORMAT** (use this exact format for realistic values):
      {
        "entities": [
          {
            "name": "product",
            "attributes": {
              "product_id": {"type": "id", "prefix": "prod_"},
              "product_name": {"type": "choice", "values": ["Wireless Bluetooth Headphones", "Organic Cotton T-Shirt", "Stainless Steel Water Bottle", "Smartphone Case", "Running Shoes"], "weights": [0.2, 0.2, 0.2, 0.2, 0.2]},
              "category": {"type": "choice", "values": ["Electronics", "Clothing", "Home & Garden", "Sports & Outdoors", "Books"], "weights": [0.3, 0.25, 0.2, 0.15, 0.1]},
              "payment_method": {"type": "choice", "values": ["Credit Card", "Debit Card", "PayPal", "Apple Pay", "Google Pay"], "weights": [0.4, 0.25, 0.2, 0.1, 0.05]},
              "order_status": {"type": "choice", "values": ["Pending", "Processing", "Shipped", "Delivered", "Cancelled"], "weights": [0.1, 0.2, 0.3, 0.35, 0.05]},
              "shipping_method": {"type": "choice", "values": ["Standard", "Express", "Overnight", "Free Shipping"], "weights": [0.5, 0.2, 0.1, 0.2]}
            }
          }
        ],
        "event_stream_table": {
          "name": "ecommerce_events",
          "columns": [
            {"name": "event_type", "source": {"type": "choice", "values": ["view_item", "add_to_cart", "start_checkout", "purchase", "refund"], "weights": [0.4, 0.2, 0.15, 0.2, 0.05]}},
            {"name": "product_name", "source": {"type": "choice", "values": ["Wireless Bluetooth Headphones", "Organic Cotton T-Shirt", "Stainless Steel Water Bottle", "Smartphone Case", "Running Shoes"], "weights": [0.2, 0.2, 0.2, 0.2, 0.2]}},
            {"name": "category", "source": {"type": "choice", "values": ["Electronics", "Clothing", "Home & Garden", "Sports & Outdoors", "Books"], "weights": [0.3, 0.25, 0.2, 0.15, 0.1]}},
            {"name": "payment_method", "source": {"type": "choice", "values": ["Credit Card", "Debit Card", "PayPal", "Apple Pay", "Google Pay"], "weights": [0.4, 0.25, 0.2, 0.1, 0.05]}},
            {"name": "order_status", "source": {"type": "choice", "values": ["Pending", "Processing", "Shipped", "Delivered", "Cancelled"], "weights": [0.1, 0.2, 0.3, 0.35, 0.05]}}
          ]
        }
      }
    - **Note**: Multiple entities and dimension tables are included so users can practice SQL joins.
  `,
  Healthcare: `
    - **Entities**: Include 'patient', 'provider', and 'facility' as separate entities. Patients have 'patient_id', 'name', 'dob', 'gender', 'insurance_type'. Providers have 'provider_id', 'name', 'specialty'. Facilities have 'facility_id', 'name', 'location', 'facility_type'.
    - **Events**: Generate patient-centric events like 'patient_visit', 'treatment_administered', 'procedure_performed', 'admission', 'discharge', and billing events like 'claim_submitted', 'claim_paid', 'claim_denied'.
    - **Outputs**: For each event, include all relevant business metrics and fields for analytics:
      - **CRITICAL - Numeric/currency fields must be numbers (float/int), NOT strings or IDs:**
        - 'procedure_cost': number (float, USD, range 100-2000), e.g., 1200.50
        - 'claim_amount': number (float, USD, range 100-5000), e.g., 1500.00  
        - 'insurance_payout': number (float, USD, 60-95% of claim_amount), e.g., 1200.00
        - 'visit_duration': number (integer, minutes, range 15-480), e.g., 45
      - **CRITICAL - All other fields must be realistic healthcare values, NOT random strings:**
        - 'procedure_code': realistic CPT codes like "99213", "99214", "93010", "71045"
        - 'diagnosis_code': realistic ICD-10 codes like "E11.9", "I10", "Z51.11", "Z00.00"
        - 'procedure_type': realistic types like "Office Visit", "Laboratory Test", "X-Ray", "MRI"
        - 'claim_status': realistic statuses like "Approved", "Pending", "Denied", "Under Review"
        - 'denied_reason': realistic reasons like "Missing Documentation", "Pre-authorization Required", "Out of Network"
        - 'insurance_type': realistic types like "PPO", "HMO", "Medicare", "Medicaid"
        - 'specialty': realistic specialties like "Cardiology", "Dermatology", "Internal Medicine"
        - 'facility_type': realistic types like "Hospital", "Outpatient Clinic", "Urgent Care"
      - **Business logic relationships:**
        - 'insurance_payout' should be 60-95% of 'claim_amount'
        - 'claim_amount' should be related to 'procedure_cost' (usually 1.2-2x procedure_cost)
        - For 'claim_denied' events, 'insurance_payout' should be 0
      - **Additional fields**: 'admission_date', 'discharge_date', etc.
    - **Schema Requirements**: For each entity, include all attributes needed for analytics and joins. Do not omit any key business fields. Every event in the event stream must reference all relevant entities (e.g., every procedure event must have a valid patient_id, provider_id, facility_id, etc.). For each attribute, specify a realistic faker method and value range.
    - **CRITICAL**: NEVER generate random strings or alphanumeric codes for business fields. Use realistic healthcare terminology, codes, and values that an analyst would expect to see in real healthcare data.
    - **EXAMPLE JSON SPEC FORMAT** (use this exact format for realistic values):
      {
        "entities": [
          {
            "name": "patient",
            "attributes": {
              "patient_id": {"type": "id", "prefix": "pat_"},
              "name": {"type": "faker", "method": "person.fullName"},
              "insurance_type": {"type": "choice", "values": ["PPO", "HMO", "Medicare", "Medicaid", "Tricare"], "weights": [0.4, 0.3, 0.15, 0.1, 0.05]}
            }
          }
        ],
        "event_stream_table": {
          "name": "healthcare_events",
          "columns": [
            {"name": "procedure_code", "source": {"type": "choice", "values": ["99213", "99214", "99215", "93010", "71045", "70450"], "weights": [0.3, 0.25, 0.2, 0.1, 0.1, 0.05]}},
            {"name": "diagnosis_code", "source": {"type": "choice", "values": ["E11.9", "I10", "Z51.11", "Z00.00", "Z23", "Z79.4"], "weights": [0.2, 0.15, 0.15, 0.15, 0.15, 0.2]}},
            {"name": "procedure_type", "source": {"type": "choice", "values": ["Office Visit", "Laboratory Test", "X-Ray", "MRI", "CT Scan", "Ultrasound"], "weights": [0.4, 0.2, 0.15, 0.1, 0.1, 0.05]}},
            {"name": "claim_status", "source": {"type": "choice", "values": ["Approved", "Pending", "Denied", "Under Review"], "weights": [0.6, 0.25, 0.1, 0.05]}},
            {"name": "denied_reason", "source": {"type": "choice", "values": ["Missing Documentation", "Pre-authorization Required", "Out of Network", "Experimental Treatment"], "weights": [0.4, 0.3, 0.2, 0.1]}}
          ]
        }
      }
    - **Note**: Multiple entities and dimension tables are included so users can practice SQL joins.
  `,
  Fintech: `
    - **Entities**: Include 'account', 'currency', and 'transaction' as separate entities. Accounts have 'account_id', 'open_date', 'type', 'country'. Currencies have 'currency_code', 'country', 'exchange_rate'. Transactions have 'transaction_id', 'account_id', 'amount', 'fee', 'currency', 'status', 'is_fraud'.
    - **Events**: Model financial transactions. Generate events like 'deposit', 'withdrawal', 'transfer', and 'payment'. Each should have a status ('completed', 'pending', 'failed').
    - **Outputs**: Each event row must have a 'transaction_id'. Key columns are 'amount', 'fee', and 'currency'. Critically, include a boolean 'is_fraud' flag with a realistic (low) probability of being true.
    - **CRITICAL - All fields must be realistic fintech values, NOT random strings:**
      - 'account_type': realistic types like "Checking", "Savings", "Credit", "Investment", "Business"
      - 'transaction_type': realistic types like "Deposit", "Withdrawal", "Transfer", "Payment", "Fee"
      - 'status': realistic statuses like "Completed", "Pending", "Failed", "Cancelled"
      - 'currency_code': realistic codes like "USD", "EUR", "GBP", "JPY", "CAD"
      - 'payment_method': realistic methods like "ACH", "Wire Transfer", "Card", "Check", "Mobile"
    - **Schema Requirements**: For each entity, include all attributes needed for analytics and joins. Do not omit any key business fields. Every event in the event stream must reference all relevant entities (e.g., every transaction must have a valid account_id, etc.). For each attribute, specify a realistic faker method and value range.
    - **CRITICAL**: NEVER generate random strings or alphanumeric codes for business fields. Use realistic fintech terminology and values that an analyst would expect to see in real fintech data.
    - **EXAMPLE JSON SPEC FORMAT** (use this exact format for realistic values):
      {
        "entities": [
          {
            "name": "account",
            "attributes": {
              "account_id": {"type": "id", "prefix": "acc_"},
              "account_type": {"type": "choice", "values": ["Checking", "Savings", "Credit", "Investment", "Business"], "weights": [0.4, 0.25, 0.2, 0.1, 0.05]},
              "currency_code": {"type": "choice", "values": ["USD", "EUR", "GBP", "JPY", "CAD"], "weights": [0.7, 0.1, 0.1, 0.05, 0.05]}
            }
          }
        ],
        "event_stream_table": {
          "name": "fintech_transactions",
          "columns": [
            {"name": "transaction_type", "source": {"type": "choice", "values": ["Deposit", "Withdrawal", "Transfer", "Payment", "Fee"], "weights": [0.3, 0.25, 0.2, 0.2, 0.05]}},
            {"name": "status", "source": {"type": "choice", "values": ["Completed", "Pending", "Failed", "Cancelled"], "weights": [0.8, 0.15, 0.04, 0.01]}},
            {"name": "payment_method", "source": {"type": "choice", "values": ["ACH", "Wire Transfer", "Card", "Check", "Mobile"], "weights": [0.4, 0.1, 0.3, 0.1, 0.1]}}
          ]
        }
      }
    - **Note**: Multiple entities and dimension tables are included so users can practice SQL joins.
  `,
  Education: `
    - **Entities**: Include 'student', 'course', and 'department' as separate entities. Students have 'student_id', 'name', 'major', 'enrollment_date', 'gpa'. Courses have 'course_id', 'course_name', 'department', 'credits', 'instructor'. Departments have 'department_id', 'name', 'college'.
    - **Events**: Model student academic activities. Generate events like 'enrollment', 'grade_assigned', 'attendance', 'assignment_submitted', 'exam_taken'.
    - **Outputs**: Each event should include relevant academic metrics like 'grade', 'attendance_percentage', 'assignment_score', 'exam_score'.
    - **CRITICAL - All fields must be realistic education values, NOT random strings:**
      - 'major': realistic majors like "Computer Science", "Business Administration", "Psychology", "Engineering", "Biology"
      - 'course_name': realistic names like "Introduction to Programming", "Business Statistics", "Psychology 101", "Calculus I", "Organic Chemistry"
      - 'department': realistic departments like "Computer Science", "Business", "Psychology", "Mathematics", "Biology"
      - 'grade': realistic grades like "A", "B", "C", "D", "F", "A-", "B+"
      - 'enrollment_status': realistic statuses like "Enrolled", "Dropped", "Graduated", "On Leave"
    - **Schema Requirements**: For each entity, include all attributes needed for analytics and joins. Do not omit any key business fields. Every event in the event stream must reference all relevant entities (e.g., every grade event must have a valid student_id, course_id, etc.). For each attribute, specify a realistic faker method and value range.
    - **CRITICAL**: NEVER generate random strings or alphanumeric codes for business fields. Use realistic education terminology and values that an analyst would expect to see in real education data.
    - **EXAMPLE JSON SPEC FORMAT** (use this exact format for realistic values):
      {
        "entities": [
          {
            "name": "student",
            "attributes": {
              "student_id": {"type": "id", "prefix": "stu_"},
              "major": {"type": "choice", "values": ["Computer Science", "Business Administration", "Psychology", "Engineering", "Biology"], "weights": [0.25, 0.25, 0.2, 0.2, 0.1]},
              "department": {"type": "choice", "values": ["Computer Science", "Business", "Psychology", "Mathematics", "Biology"], "weights": [0.25, 0.25, 0.2, 0.2, 0.1]},
              "enrollment_status": {"type": "choice", "values": ["Enrolled", "Dropped", "Graduated", "On Leave"], "weights": [0.8, 0.1, 0.08, 0.02]}
            }
          }
        ],
        "event_stream_table": {
          "name": "education_events",
          "columns": [
            {"name": "course_name", "source": {"type": "choice", "values": ["Introduction to Programming", "Business Statistics", "Psychology 101", "Calculus I", "Organic Chemistry"], "weights": [0.2, 0.2, 0.2, 0.2, 0.2]}},
            {"name": "grade", "source": {"type": "choice", "values": ["A", "B", "C", "D", "F", "A-", "B+"], "weights": [0.2, 0.3, 0.25, 0.15, 0.05, 0.03, 0.02]}},
            {"name": "event_type", "source": {"type": "choice", "values": ["enrollment", "grade_assigned", "attendance", "assignment_submitted", "exam_taken"], "weights": [0.2, 0.2, 0.3, 0.2, 0.1]}}
          ]
        }
      }
    - **Note**: Multiple entities and dimension tables are included so users can practice SQL joins.
  `,
  Retail: `
    - **Entities**: Include 'customer', 'product', and 'store' as separate entities. Customers have 'customer_id', 'name', 'loyalty_tier', 'region'. Products have 'product_id', 'product_name', 'category', 'brand', 'price'. Stores have 'store_id', 'name', 'location', 'region'.
    - **Events**: Model retail customer journey. Generate events like 'browse', 'add_to_cart', 'purchase', 'return', 'review'.
    - **Outputs**: Each event should include relevant retail metrics like 'quantity', 'total_amount', 'discount_amount', 'loyalty_points_earned'.
    - **CRITICAL - All fields must be realistic retail values, NOT random strings:**
      - 'product_name': realistic names like "Nike Air Max Running Shoes", "Samsung 4K Smart TV", "Starbucks Coffee Beans", "Levi's 501 Jeans"
      - 'category': realistic categories like "Footwear", "Electronics", "Food & Beverage", "Apparel", "Home & Garden"
      - 'brand': realistic brands like "Nike", "Samsung", "Starbucks", "Levi's", "Apple", "Coca-Cola"
      - 'loyalty_tier': realistic tiers like "Bronze", "Silver", "Gold", "Platinum", "Diamond"
      - 'region': realistic regions like "North America", "Europe", "Asia Pacific", "Latin America"
    - **Schema Requirements**: For each entity, include all attributes needed for analytics and joins. Do not omit any key business fields. Every event in the event stream must reference all relevant entities (e.g., every purchase must have a valid customer_id, product_id, store_id, etc.). For each attribute, specify a realistic faker method and value range.
    - **CRITICAL**: NEVER generate random strings or alphanumeric codes for business fields. Use realistic retail terminology and values that an analyst would expect to see in real retail data.
    - **EXAMPLE JSON SPEC FORMAT** (use this exact format for realistic values):
      {
        "entities": [
          {
            "name": "product",
            "attributes": {
              "product_id": {"type": "id", "prefix": "prod_"},
              "product_name": {"type": "choice", "values": ["Nike Air Max Running Shoes", "Samsung 4K Smart TV", "Starbucks Coffee Beans", "Levi's 501 Jeans", "Apple iPhone 15"], "weights": [0.2, 0.2, 0.2, 0.2, 0.2]},
              "category": {"type": "choice", "values": ["Footwear", "Electronics", "Food & Beverage", "Apparel", "Home & Garden"], "weights": [0.2, 0.25, 0.2, 0.2, 0.15]},
              "brand": {"type": "choice", "values": ["Nike", "Samsung", "Starbucks", "Levi's", "Apple", "Coca-Cola"], "weights": [0.15, 0.15, 0.15, 0.15, 0.2, 0.2]},
              "loyalty_tier": {"type": "choice", "values": ["Bronze", "Silver", "Gold", "Platinum", "Diamond"], "weights": [0.4, 0.3, 0.2, 0.08, 0.02]}
            }
          }
        ],
        "event_stream_table": {
          "name": "retail_events",
          "columns": [
            {"name": "event_type", "source": {"type": "choice", "values": ["browse", "add_to_cart", "purchase", "return", "review"], "weights": [0.4, 0.2, 0.25, 0.1, 0.05]}},
            {"name": "product_name", "source": {"type": "choice", "values": ["Nike Air Max Running Shoes", "Samsung 4K Smart TV", "Starbucks Coffee Beans", "Levi's 501 Jeans", "Apple iPhone 15"], "weights": [0.2, 0.2, 0.2, 0.2, 0.2]}},
            {"name": "category", "source": {"type": "choice", "values": ["Footwear", "Electronics", "Food & Beverage", "Apparel", "Home & Garden"], "weights": [0.2, 0.25, 0.2, 0.2, 0.15]}},
            {"name": "brand", "source": {"type": "choice", "values": ["Nike", "Samsung", "Starbucks", "Levi's", "Apple", "Coca-Cola"], "weights": [0.15, 0.15, 0.15, 0.15, 0.2, 0.2]}}
          ]
        }
      }
    - **Note**: Multiple entities and dimension tables are included so users can practice SQL joins.
  `,
  Manufacturing: `
    - **Entities**: Include 'product', 'machine', and 'worker' as separate entities. Products have 'product_id', 'product_name', 'category', 'priority'. Machines have 'machine_id', 'machine_type', 'model', 'location'. Workers have 'worker_id', 'name', 'shift', 'department'.
    - **Events**: Model manufacturing operations. Generate events like 'production_start', 'quality_check', 'maintenance', 'inventory_update', 'defect_found'.
    - **Outputs**: Each event should include relevant manufacturing metrics like 'quantity_produced', 'defect_rate', 'downtime_hours', 'efficiency_score'.
    - **CRITICAL - All fields must be realistic manufacturing values, NOT random strings:**
      - 'product_name': realistic names like "Automotive Engine Block", "Electronic Circuit Board", "Steel Beam", "Plastic Injection Mold"
      - 'machine_type': realistic types like "CNC Machine", "Assembly Line", "Welding Station", "Quality Control Station"
      - 'machine_model': realistic models like "HAAS VF-2", "Fanuc R-2000iC", "ABB IRB 2600", "KUKA KR 1000"
      - 'priority': realistic priorities like "High", "Medium", "Low", "Critical", "Standard"
      - 'shift': realistic shifts like "Morning", "Afternoon", "Night", "Overtime"
    - **Schema Requirements**: For each entity, include all attributes needed for analytics and joins. Do not omit any key business fields. Every event in the event stream must reference all relevant entities (e.g., every production event must have a valid product_id, machine_id, worker_id, etc.). For each attribute, specify a realistic faker method and value range.
    - **CRITICAL**: NEVER generate random strings or alphanumeric codes for business fields. Use realistic manufacturing terminology and values that an analyst would expect to see in real manufacturing data.
    - **EXAMPLE JSON SPEC FORMAT** (use this exact format for realistic values):
      {
        "entities": [
          {
            "name": "product",
            "attributes": {
              "product_id": {"type": "id", "prefix": "prod_"},
              "product_name": {"type": "choice", "values": ["Automotive Engine Block", "Electronic Circuit Board", "Steel Beam", "Plastic Injection Mold", "Aluminum Alloy Sheet"], "weights": [0.2, 0.2, 0.2, 0.2, 0.2]},
              "machine_type": {"type": "choice", "values": ["CNC Machine", "Assembly Line", "Welding Station", "Quality Control Station", "Packaging Line"], "weights": [0.3, 0.25, 0.2, 0.15, 0.1]},
              "machine_model": {"type": "choice", "values": ["HAAS VF-2", "Fanuc R-2000iC", "ABB IRB 2600", "KUKA KR 1000", "Yaskawa Motoman"], "weights": [0.2, 0.2, 0.2, 0.2, 0.2]},
              "priority": {"type": "choice", "values": ["High", "Medium", "Low", "Critical", "Standard"], "weights": [0.2, 0.3, 0.2, 0.1, 0.2]},
              "shift": {"type": "choice", "values": ["Morning", "Afternoon", "Night", "Overtime"], "weights": [0.4, 0.4, 0.15, 0.05]}
            }
          }
        ],
        "event_stream_table": {
          "name": "manufacturing_events",
          "columns": [
            {"name": "event_type", "source": {"type": "choice", "values": ["production_start", "quality_check", "maintenance", "inventory_update", "defect_found"], "weights": [0.3, 0.25, 0.2, 0.15, 0.1]}},
            {"name": "product_name", "source": {"type": "choice", "values": ["Automotive Engine Block", "Electronic Circuit Board", "Steel Beam", "Plastic Injection Mold", "Aluminum Alloy Sheet"], "weights": [0.2, 0.2, 0.2, 0.2, 0.2]}},
            {"name": "machine_type", "source": {"type": "choice", "values": ["CNC Machine", "Assembly Line", "Welding Station", "Quality Control Station", "Packaging Line"], "weights": [0.3, 0.25, 0.2, 0.15, 0.1]}},
            {"name": "priority", "source": {"type": "choice", "values": ["High", "Medium", "Low", "Critical", "Standard"], "weights": [0.2, 0.3, 0.2, 0.1, 0.2]}}
          ]
        }
      }
    - **Note**: Multiple entities and dimension tables are included so users can practice SQL joins.
  `,
  Transportation: `
    - **Entities**: Include 'vehicle', 'driver', and 'route' as separate entities. Vehicles have 'vehicle_id', 'vehicle_type', 'model', 'fuel_type'. Drivers have 'driver_id', 'name', 'license_class', 'experience_years'. Routes have 'route_id', 'origin', 'destination', 'distance'.
    - **Events**: Model transportation operations. Generate events like 'trip_start', 'fuel_stop', 'maintenance', 'delivery_complete', 'break'.
    - **Outputs**: Each event should include relevant transportation metrics like 'distance_traveled', 'fuel_consumed', 'delivery_time', 'idle_time'.
    - **CRITICAL - All fields must be realistic transportation values, NOT random strings:**
      - 'vehicle_type': realistic types like "Semi-Truck", "Delivery Van", "Passenger Bus", "Motorcycle", "Bicycle"
      - 'vehicle_model': realistic models like "Freightliner Cascadia", "Ford Transit", "Mercedes Sprinter", "Honda Gold Wing"
      - 'fuel_type': realistic types like "Diesel", "Gasoline", "Electric", "Hybrid", "CNG"
      - 'license_class': realistic classes like "Class A", "Class B", "Class C", "Class D", "Motorcycle"
      - 'route_type': realistic types like "Local Delivery", "Long Haul", "Express", "Scheduled", "On-Demand"
    - **Schema Requirements**: For each entity, include all attributes needed for analytics and joins. Do not omit any key business fields. Every event in the event stream must reference all relevant entities (e.g., every trip must have a valid vehicle_id, driver_id, route_id, etc.). For each attribute, specify a realistic faker method and value range.
    - **CRITICAL**: NEVER generate random strings or alphanumeric codes for business fields. Use realistic transportation terminology and values that an analyst would expect to see in real transportation data.
    - **EXAMPLE JSON SPEC FORMAT** (use this exact format for realistic values):
      {
        "entities": [
          {
            "name": "vehicle",
            "attributes": {
              "vehicle_id": {"type": "id", "prefix": "veh_"},
              "vehicle_type": {"type": "choice", "values": ["Semi-Truck", "Delivery Van", "Passenger Bus", "Motorcycle", "Bicycle"], "weights": [0.3, 0.3, 0.2, 0.15, 0.05]},
              "vehicle_model": {"type": "choice", "values": ["Freightliner Cascadia", "Ford Transit", "Mercedes Sprinter", "Honda Gold Wing", "Trek Domane"], "weights": [0.25, 0.25, 0.2, 0.2, 0.1]},
              "fuel_type": {"type": "choice", "values": ["Diesel", "Gasoline", "Electric", "Hybrid", "CNG"], "weights": [0.4, 0.3, 0.15, 0.1, 0.05]},
              "license_class": {"type": "choice", "values": ["Class A", "Class B", "Class C", "Class D", "Motorcycle"], "weights": [0.3, 0.25, 0.2, 0.2, 0.05]},
              "route_type": {"type": "choice", "values": ["Local Delivery", "Long Haul", "Express", "Scheduled", "On-Demand"], "weights": [0.4, 0.2, 0.2, 0.15, 0.05]}
            }
          }
        ],
        "event_stream_table": {
          "name": "transportation_events",
          "columns": [
            {"name": "event_type", "source": {"type": "choice", "values": ["trip_start", "fuel_stop", "maintenance", "delivery_complete", "break"], "weights": [0.25, 0.2, 0.15, 0.25, 0.15]}},
            {"name": "vehicle_type", "source": {"type": "choice", "values": ["Semi-Truck", "Delivery Van", "Passenger Bus", "Motorcycle", "Bicycle"], "weights": [0.3, 0.3, 0.2, 0.15, 0.05]}},
            {"name": "fuel_type", "source": {"type": "choice", "values": ["Diesel", "Gasoline", "Electric", "Hybrid", "CNG"], "weights": [0.4, 0.3, 0.15, 0.1, 0.05]}},
            {"name": "route_type", "source": {"type": "choice", "values": ["Local Delivery", "Long Haul", "Express", "Scheduled", "On-Demand"], "weights": [0.4, 0.2, 0.2, 0.15, 0.05]}}
          ]
        }
      }
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

**CRITICAL: Use correct faker method names:**
- For names: use "person.fullName" (not "person.name")
- For emails: use "internet.email" (not "email") 
- For product names: use "commerce.productName" (not "commerce.product_name")
- For prices: use "commerce.price" (not "commerce.price")
- For categories: use "commerce.department" (not "commerce.category")
- For numbers: use "number.int" (not "random.number")

${selectedInstructions}

**Schema Requirements:**
- For OBT: Generate a single table with all columns flattened
- For Star Schema: Include a "Star" property in your JSON with fact table name and dimension table names
${schemaSection}${rulesSection}

**Output Format:**
Your response must be valid JSON with this structure:
{
  "entities": [
    {
      "name": "entity_name",
      "attributes": {
        "attribute_name": {
          "type": "faker|choice|conditional|id",
          "method": "namespace.method" // for faker type
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
          "type": "id|timestamp|reference|event_name|lookup|literal",
          "entity": "entity_name", // for reference type
          "attribute": "attribute_name" // for reference type
        }
      }
    ]
  },
  "simulation": {
    "initial_event": "event_name",
    "events": {
      "event_name": {
        "type": "recurring|random|churn",
        "frequency": { "on": "entity.attribute" }, // for recurring
        "avg_per_entity_per_month": 5, // for random
        "monthly_rate": 0.05, // for churn
        "outputs": {
          "column_name": {
            "type": "reference|literal",
            "attribute": "entity_attribute", // for reference
            "value": "static_value" // for literal
          }
        }
      }
    }
  }
}`;
}
