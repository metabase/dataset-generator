import { NextRequest, NextResponse } from "next/server";
import { insertGeneratedData } from "@/app/lib/db";
import { OpenAI } from "openai";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Schema templates for different business types
const SCHEMA_TEMPLATES = {
  SaaS: {
    flat: [
      "user_id",
      "signup_date",
      "plan",
      "mrr",
      "churned",
      "churn_date",
      "last_login",
      "feature_usage_count",
      "support_tickets",
      "country",
      "device_type",
      "referral_source",
    ],
    star: {
      users: [
        "user_id",
        "signup_date",
        "plan",
        "country",
        "device_type",
        "referral_source",
      ],
      subscriptions: [
        "subscription_id",
        "user_id",
        "plan",
        "start_date",
        "end_date",
        "mrr",
        "status",
      ],
      usage: [
        "usage_id",
        "user_id",
        "date",
        "feature_usage_count",
        "session_duration",
      ],
      support: [
        "ticket_id",
        "user_id",
        "created_at",
        "resolved_at",
        "priority",
        "category",
      ],
    },
  },
  Ecommerce: {
    flat: [
      "order_id",
      "customer_id",
      "order_date",
      "product_id",
      "quantity",
      "unit_price",
      "total_amount",
      "payment_method",
      "shipping_address",
      "order_status",
      "customer_segment",
      "promo_code",
    ],
    star: {
      orders: [
        "order_id",
        "customer_id",
        "order_date",
        "total_amount",
        "payment_method",
        "shipping_address",
        "order_status",
      ],
      customers: [
        "customer_id",
        "signup_date",
        "customer_segment",
        "lifetime_value",
        "last_purchase_date",
      ],
      products: [
        "product_id",
        "category",
        "price",
        "inventory_level",
        "supplier",
      ],
      order_items: [
        "order_item_id",
        "order_id",
        "product_id",
        "quantity",
        "unit_price",
        "promo_code",
      ],
    },
  },
  Healthcare: {
    flat: [
      "patient_id",
      "visit_date",
      "doctor_id",
      "diagnosis_code",
      "procedure_code",
      "medication_prescribed",
      "visit_type",
      "insurance_provider",
      "co_pay_amount",
      "total_charge",
      "facility_id",
      "discharge_status",
    ],
    star: {
      patients: [
        "patient_id",
        "date_of_birth",
        "gender",
        "insurance_provider",
        "primary_care_physician",
        "last_visit_date",
      ],
      visits: [
        "visit_id",
        "patient_id",
        "visit_date",
        "doctor_id",
        "facility_id",
        "visit_type",
        "discharge_status",
      ],
      diagnoses: [
        "diagnosis_id",
        "visit_id",
        "diagnosis_code",
        "diagnosis_description",
        "severity",
      ],
      procedures: [
        "procedure_id",
        "visit_id",
        "procedure_code",
        "procedure_description",
        "cost",
      ],
      medications: [
        "medication_id",
        "visit_id",
        "medication_name",
        "dosage",
        "frequency",
        "duration",
      ],
    },
  },
  Fintech: {
    flat: [
      "transaction_id",
      "customer_id",
      "transaction_date",
      "transaction_type",
      "amount",
      "currency",
      "merchant_id",
      "merchant_category",
      "payment_method",
      "status",
      "fraud_score",
      "location",
    ],
    star: {
      customers: [
        "customer_id",
        "signup_date",
        "account_type",
        "risk_level",
        "kyc_status",
        "last_activity_date",
      ],
      transactions: [
        "transaction_id",
        "customer_id",
        "transaction_date",
        "amount",
        "currency",
        "status",
        "fraud_score",
      ],
      merchants: [
        "merchant_id",
        "merchant_name",
        "merchant_category",
        "location",
        "risk_level",
      ],
      accounts: [
        "account_id",
        "customer_id",
        "account_type",
        "opening_date",
        "balance",
        "status",
      ],
      fraud_alerts: [
        "alert_id",
        "transaction_id",
        "alert_date",
        "alert_type",
        "severity",
        "status",
      ],
    },
  },
  Education: {
    flat: [
      "student_id",
      "course_id",
      "enrollment_date",
      "grade",
      "attendance_percentage",
      "assignment_completion",
      "course_section",
      "instructor_id",
      "semester",
      "credits",
      "status",
      "last_activity_date",
    ],
    star: {
      students: [
        "student_id",
        "enrollment_date",
        "major",
        "year_level",
        "gpa",
        "status",
      ],
      courses: [
        "course_id",
        "course_name",
        "department",
        "credits",
        "instructor_id",
        "semester",
      ],
      enrollments: [
        "enrollment_id",
        "student_id",
        "course_id",
        "enrollment_date",
        "status",
        "grade",
      ],
      assignments: [
        "assignment_id",
        "course_id",
        "due_date",
        "max_points",
        "submission_count",
      ],
      submissions: [
        "submission_id",
        "assignment_id",
        "student_id",
        "submission_date",
        "points_earned",
        "status",
      ],
    },
  },
  Retail: {
    flat: [
      "transaction_id",
      "store_id",
      "transaction_date",
      "product_id",
      "quantity",
      "unit_price",
      "total_amount",
      "payment_method",
      "customer_id",
      "employee_id",
      "promotion_id",
      "return_status",
    ],
    star: {
      stores: [
        "store_id",
        "store_name",
        "location",
        "opening_date",
        "store_type",
        "manager_id",
      ],
      products: [
        "product_id",
        "product_name",
        "category",
        "supplier_id",
        "cost_price",
        "retail_price",
      ],
      transactions: [
        "transaction_id",
        "store_id",
        "transaction_date",
        "customer_id",
        "employee_id",
        "total_amount",
        "payment_method",
      ],
      transaction_items: [
        "item_id",
        "transaction_id",
        "product_id",
        "quantity",
        "unit_price",
        "promotion_id",
      ],
      inventory: [
        "inventory_id",
        "store_id",
        "product_id",
        "quantity",
        "last_restock_date",
        "reorder_level",
      ],
    },
  },
  Manufacturing: {
    flat: [
      "production_id",
      "product_id",
      "production_date",
      "quantity_produced",
      "defect_count",
      "machine_id",
      "operator_id",
      "material_cost",
      "labor_cost",
      "quality_score",
      "production_line",
      "status",
    ],
    star: {
      products: [
        "product_id",
        "product_name",
        "category",
        "specifications",
        "target_quality_score",
      ],
      production_runs: [
        "run_id",
        "product_id",
        "start_date",
        "end_date",
        "target_quantity",
        "status",
      ],
      production_metrics: [
        "metric_id",
        "run_id",
        "timestamp",
        "quantity_produced",
        "defect_count",
        "quality_score",
      ],
      machines: [
        "machine_id",
        "machine_name",
        "type",
        "installation_date",
        "maintenance_status",
      ],
      materials: [
        "material_id",
        "material_name",
        "supplier_id",
        "unit_cost",
        "current_stock",
      ],
    },
  },
  Transportation: {
    flat: [
      "trip_id",
      "vehicle_id",
      "driver_id",
      "start_time",
      "end_time",
      "start_location",
      "end_location",
      "distance",
      "fuel_consumed",
      "passenger_count",
      "fare_amount",
      "status",
    ],
    star: {
      vehicles: [
        "vehicle_id",
        "vehicle_type",
        "registration_date",
        "capacity",
        "status",
        "last_maintenance_date",
      ],
      drivers: [
        "driver_id",
        "hire_date",
        "license_type",
        "rating",
        "status",
        "last_trip_date",
      ],
      trips: [
        "trip_id",
        "vehicle_id",
        "driver_id",
        "start_time",
        "end_time",
        "status",
      ],
      locations: [
        "location_id",
        "trip_id",
        "timestamp",
        "latitude",
        "longitude",
        "speed",
      ],
      maintenance: [
        "maintenance_id",
        "vehicle_id",
        "maintenance_date",
        "type",
        "cost",
        "status",
      ],
    },
  },
};

export async function POST(req: Request) {
  try {
    const prompt = await req.json();
    const {
      businessType,
      schemaType,
      rowCount,
      timeRange,
      growthPattern,
      variationLevel,
      granularity,
    } = prompt;

    // Get schema template for the business type
    const schemaTemplate =
      SCHEMA_TEMPLATES[businessType as keyof typeof SCHEMA_TEMPLATES]?.[
        schemaType as keyof typeof SCHEMA_TEMPLATES.SaaS
      ];
    if (!schemaTemplate) {
      return NextResponse.json(
        { error: "Invalid business type or schema type" },
        { status: 400 }
      );
    }

    // Generate schema and data using OpenAI
    const completion = await openai.chat.completions.create({
      model: "gpt-4-turbo-preview",
      messages: [
        {
          role: "system",
          content: `You are a data generation expert. Generate realistic ${businessType} data in JSON format with the following characteristics:
- Schema: ${schemaType === "flat" ? "Single table" : "Multiple related tables"}
- Time range: ${timeRange}
- Growth pattern: ${growthPattern}
- Variation level: ${variationLevel}
- Granularity: ${granularity}
- Number of rows: ${rowCount}

The data should be realistic and include:
- Raw, unaggregated data (no pre-calculated metrics or summaries)
- Appropriate data types for each column
- Realistic value ranges and distributions
- Temporal patterns matching the growth pattern
- Natural variations in the data
- Realistic relationships between tables (if star schema)
- No synthetic-looking patterns or obvious fake data
- No pre-calculated aggregations or derived metrics
- Each row should represent a single event/transaction/record

For example:
- For SaaS: Raw usage events, individual subscription changes, actual support tickets
- For E-commerce: Individual order items, raw customer interactions, actual inventory changes

Return the data as a JSON object with the following structure:
${
  schemaType === "flat"
    ? `{
  "rows": [
    { "column1": "value1", "column2": "value2", ... },
    ...
  ]
}`
    : `{
  "table1": [
    { "column1": "value1", "column2": "value2", ... },
    ...
  ],
  "table2": [
    { "column1": "value1", "column2": "value2", ... },
    ...
  ]
}`
}`,
        },
        {
          role: "user",
          content: `Generate a ${businessType} dataset with ${rowCount} rows using this schema: ${
            schemaType === "flat"
              ? JSON.stringify(schemaTemplate)
              : JSON.stringify(schemaTemplate, null, 2)
          }

Return the data as a JSON object matching the structure described above.`,
        },
      ],
      response_format: { type: "json_object" },
    });

    const content = completion.choices[0].message.content;
    if (!content) {
      throw new Error("No content generated from OpenAI");
    }
    const generatedData = JSON.parse(content);

    // Format the response based on schema type
    const response = {
      tables:
        schemaType === "flat"
          ? [
              {
                name: `${businessType.toLowerCase()}_data`,
                rows: generatedData.rows || [],
              },
            ]
          : Object.entries(generatedData).map(([tableName, rows]) => ({
              name: tableName,
              rows: rows as any[],
            })),
    };

    return NextResponse.json({ data: response });
  } catch (error) {
    console.error("Error generating dataset:", error);
    return NextResponse.json(
      { error: "Failed to generate dataset" },
      { status: 500 }
    );
  }
}

export async function PUT(request: Request) {
  try {
    const { topic, tweets } = await request.json();

    // Format and insert into database
    const results = await Promise.all(
      tweets.map((tweet: any) =>
        insertGeneratedData({
          topic,
          platform: "twitter",
          source_id: tweet.id,
          author: tweet.author,
          content: tweet.content,
          timestamp: new Date(tweet.timestamp),
          metadata: tweet.metadata,
        })
      )
    );

    return NextResponse.json({
      success: true,
      data: results.map((r) => r.rows[0]),
    });
  } catch (error) {
    console.error("Error saving dataset:", error);
    return NextResponse.json(
      { error: "Failed to save dataset" },
      { status: 500 }
    );
  }
}
