import { NextRequest, NextResponse } from "next/server";
import { insertGeneratedData } from "@/app/lib/db";
import { OpenAI } from "openai";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Schema templates for different business types
const SCHEMA_TEMPLATES = {
  SaaS: {
    OBT: [
      "user_id",
      "event_type",
      "event_timestamp",
      "plan",
      "country",
      "device_type",
      "referral_source",
      "feature_name",
      "ticket_id",
      "ticket_priority",
      "ticket_category",
      "previous_plan",
      "new_plan",
    ],
    star: {
      users: {
        type: "dim",
        fields: [
          "user_id",
          "signup_date",
          "plan",
          "country",
          "device_type",
          "referral_source",
        ],
      },
      events: {
        type: "fact",
        fields: [
          "event_id",
          "user_id",
          "event_type",
          "event_timestamp",
          "feature_name",
          "ticket_id",
          "ticket_priority",
          "ticket_category",
          "previous_plan",
          "new_plan",
        ],
      },
    },
  },
  Ecommerce: {
    OBT: [
      "order_id",
      "customer_id",
      "event_type",
      "event_timestamp",
      "product_id",
      "quantity",
      "unit_price",
      "payment_method",
      "shipping_address",
      "promo_code",
    ],
    star: {
      customers: {
        type: "dim",
        fields: [
          "customer_id",
          "signup_date",
          "customer_segment",
          "last_purchase_date",
        ],
      },
      products: {
        type: "dim",
        fields: [
          "product_id",
          "category",
          "price",
          "inventory_level",
          "supplier",
        ],
      },
      events: {
        type: "fact",
        fields: [
          "event_id",
          "customer_id",
          "event_type",
          "event_timestamp",
          "order_id",
          "product_id",
          "quantity",
          "unit_price",
          "payment_method",
          "shipping_address",
          "promo_code",
        ],
      },
    },
  },
  Healthcare: {
    OBT: [
      "patient_id",
      "visit_id",
      "event_type",
      "event_timestamp",
      "doctor_id",
      "diagnosis_code",
      "procedure_code",
      "medication_name",
      "dosage",
      "visit_type",
      "insurance_provider",
      "facility_id",
    ],
    star: {
      patients: {
        type: "dim",
        fields: [
          "patient_id",
          "date_of_birth",
          "gender",
          "insurance_provider",
          "primary_care_physician",
          "last_visit_date",
        ],
      },
      events: {
        type: "fact",
        fields: [
          "event_id",
          "patient_id",
          "event_type",
          "event_timestamp",
          "visit_id",
          "doctor_id",
          "diagnosis_code",
          "procedure_code",
          "medication_name",
          "dosage",
          "visit_type",
          "facility_id",
        ],
      },
    },
  },
  Fintech: {
    OBT: [
      "transaction_id",
      "customer_id",
      "event_type",
      "event_timestamp",
      "transaction_type",
      "amount",
      "currency",
      "merchant_id",
      "merchant_category",
      "payment_method",
      "location",
      "alert_id",
      "alert_type",
    ],
    star: {
      customers: {
        type: "dim",
        fields: [
          "customer_id",
          "signup_date",
          "account_type",
          "risk_level",
          "kyc_status",
          "last_activity_date",
        ],
      },
      merchants: {
        type: "dim",
        fields: [
          "merchant_id",
          "merchant_name",
          "merchant_category",
          "location",
          "risk_level",
        ],
      },
      events: {
        type: "fact",
        fields: [
          "event_id",
          "customer_id",
          "event_type",
          "event_timestamp",
          "transaction_id",
          "transaction_type",
          "amount",
          "currency",
          "merchant_id",
          "payment_method",
          "location",
          "alert_id",
          "alert_type",
        ],
      },
    },
  },
  Education: {
    OBT: [
      "student_id",
      "event_type",
      "event_timestamp",
      "course_id",
      "assignment_id",
      "grade",
      "attendance_status",
      "instructor_id",
      "semester",
    ],
    star: {
      students: {
        type: "dim",
        fields: [
          "student_id",
          "enrollment_date",
          "major",
          "year_level",
          "gpa",
          "status",
        ],
      },
      courses: {
        type: "dim",
        fields: [
          "course_id",
          "course_name",
          "department",
          "credits",
          "instructor_id",
          "semester",
        ],
      },
      events: {
        type: "fact",
        fields: [
          "event_id",
          "student_id",
          "event_type",
          "event_timestamp",
          "course_id",
          "assignment_id",
          "grade",
          "attendance_status",
          "instructor_id",
          "semester",
        ],
      },
    },
  },
  Retail: {
    OBT: [
      "transaction_id",
      "store_id",
      "event_type",
      "event_timestamp",
      "product_id",
      "quantity",
      "unit_price",
      "customer_id",
      "employee_id",
      "promotion_id",
      "return_status",
    ],
    star: {
      stores: {
        type: "dim",
        fields: [
          "store_id",
          "store_name",
          "location",
          "opening_date",
          "store_type",
          "manager_id",
        ],
      },
      products: {
        type: "dim",
        fields: [
          "product_id",
          "product_name",
          "category",
          "supplier_id",
          "cost_price",
          "retail_price",
        ],
      },
      events: {
        type: "fact",
        fields: [
          "event_id",
          "store_id",
          "event_type",
          "event_timestamp",
          "transaction_id",
          "product_id",
          "quantity",
          "unit_price",
          "customer_id",
          "employee_id",
          "promotion_id",
          "return_status",
        ],
      },
    },
  },
  Manufacturing: {
    OBT: [
      "production_id",
      "event_type",
      "event_timestamp",
      "product_id",
      "quantity_produced",
      "defect_count",
      "machine_id",
      "operator_id",
      "material_id",
      "material_used",
      "quality_score",
      "status",
    ],
    star: {
      products: {
        type: "dim",
        fields: [
          "product_id",
          "product_name",
          "category",
          "specifications",
          "target_quality_score",
        ],
      },
      machines: {
        type: "dim",
        fields: [
          "machine_id",
          "machine_name",
          "type",
          "installation_date",
          "maintenance_status",
        ],
      },
      events: {
        type: "fact",
        fields: [
          "event_id",
          "product_id",
          "event_type",
          "event_timestamp",
          "run_id",
          "quantity_produced",
          "defect_count",
          "machine_id",
          "operator_id",
          "material_id",
          "material_used",
          "quality_score",
          "status",
        ],
      },
    },
  },
  Transportation: {
    OBT: [
      "trip_id",
      "vehicle_id",
      "driver_id",
      "event_type",
      "event_timestamp",
      "start_location",
      "end_location",
      "distance",
      "fuel_consumed",
      "passenger_count",
      "fare_amount",
      "maintenance_id",
      "maintenance_type",
      "status",
    ],
    star: {
      vehicles: {
        type: "dim",
        fields: [
          "vehicle_id",
          "vehicle_type",
          "registration_date",
          "capacity",
          "status",
          "last_maintenance_date",
        ],
      },
      drivers: {
        type: "dim",
        fields: [
          "driver_id",
          "hire_date",
          "license_type",
          "rating",
          "status",
          "last_trip_date",
        ],
      },
      events: {
        type: "fact",
        fields: [
          "event_id",
          "trip_id",
          "vehicle_id",
          "driver_id",
          "event_type",
          "event_timestamp",
          "start_location",
          "end_location",
          "distance",
          "fuel_consumed",
          "passenger_count",
          "fare_amount",
          "maintenance_id",
          "maintenance_type",
          "status",
        ],
      },
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
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: `You are a data generation expert. Generate production-quality, realistic, plausible, and industry-specific ${businessType} data in JSON format with the following characteristics:
- Schema: ${
            schemaType === "OBT"
              ? "Single table"
              : "Multiple related tables (star schema with fact/dim tables)"
          }
- Time range: ${timeRange}
- Growth pattern: ${growthPattern}
- Variation level: ${variationLevel}
- Granularity: ${granularity}
- Number of rows: ${rowCount}

Requirements:
- Generate raw, unaggregated, event-level data at the selected granularity. Do NOT include pre-calculated metrics or aggregations (e.g., MRR, totals, averages). Each row should represent a single event, transaction, or record.
- Use appropriate data types for each column (e.g., timestamps, numbers, enums, strings).
- Use realistic value ranges, distributions, and relationships between columns and tables.
- Respect the fact/dim metadata in the schema (for star schemas, tables with type 'fact' should be suffixed _fact, and 'dim' as _dim).
- Avoid synthetic-looking patterns, obvious fake data, or uniform/random values. Use plausible, analytics-ready data.
- No pre-calculated aggregations or derived metrics. No summaries.
- Each row should be plausible for a real analytics or dashboarding use case.
- For star schemas, ensure realistic foreign key relationships between fact and dimension tables.

Examples by industry:
- SaaS: Usage events (logins, feature use), subscription changes, support tickets, all as raw events. No MRR, no churn rates, no aggregates.
- Ecommerce: Order items, customer actions, inventory changes, all as raw events. No total sales, no summaries.
- Healthcare: Patient visits, procedures, medication events, all as raw records. No patient counts, no averages.
- Fintech: Transactions, alerts, merchant/customer events, all as raw records. No balances, no summaries.
- Education: Student assignments, attendance, grades, all as raw events. No GPA averages, no summaries.
- Retail: Transactions, returns, inventory changes, all as raw events. No total sales, no summaries.
- Manufacturing: Production runs, defects, machine events, all as raw records. No totals, no summaries.
- Transportation: Trips, maintenance, driver/vehicle events, all as raw records. No total miles, no summaries.

Return the data as a JSON object with the following structure:
$${
            schemaType === "OBT"
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
          }

Do not include any explanations or extra text. Only return the JSON object.`,
        },
        {
          role: "user",
          content: `Generate a ${businessType} dataset with ${rowCount} rows using this schema: $${
            schemaType === "OBT"
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
        schemaType === "OBT"
          ? [
              {
                name: `${businessType.toLowerCase()}_data`,
                rows: generatedData.rows || [],
              },
            ]
          : Object.entries(generatedData).map(([tableName, rows]) => ({
              name: tableName,
              type:
                typeof schemaTemplate === "object" &&
                !Array.isArray(schemaTemplate)
                  ? (schemaTemplate as Record<string, any>)[tableName]?.type
                  : undefined,
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
