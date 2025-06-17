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
      users: [
        "user_id",
        "signup_date",
        "plan",
        "country",
        "device_type",
        "referral_source",
      ],
      events: [
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
      customers: [
        "customer_id",
        "signup_date",
        "customer_segment",
        "last_purchase_date",
      ],
      products: [
        "product_id",
        "category",
        "price",
        "inventory_level",
        "supplier",
      ],
      events: [
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
      patients: [
        "patient_id",
        "date_of_birth",
        "gender",
        "insurance_provider",
        "primary_care_physician",
        "last_visit_date",
      ],
      events: [
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
      customers: [
        "customer_id",
        "signup_date",
        "account_type",
        "risk_level",
        "kyc_status",
        "last_activity_date",
      ],
      merchants: [
        "merchant_id",
        "merchant_name",
        "merchant_category",
        "location",
        "risk_level",
      ],
      events: [
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
      events: [
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
      events: [
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
      products: [
        "product_id",
        "product_name",
        "category",
        "specifications",
        "target_quality_score",
      ],
      machines: [
        "machine_id",
        "machine_name",
        "type",
        "installation_date",
        "maintenance_status",
      ],
      events: [
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
      events: [
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
          content: `You are a data generation expert. Generate realistic ${businessType} data in JSON format with the following characteristics:
- Schema: ${schemaType === "OBT" ? "Single table" : "Multiple related tables"}
- Time range: ${timeRange}
- Growth pattern: ${growthPattern}
- Variation level: ${variationLevel}
- Granularity: ${granularity}
- Number of rows: ${rowCount}
\nGenerate raw, unaggregated event-level data at the selected granularity. Do not include pre-calculated metrics or aggregations (e.g., MRR, totals, averages). Each row should represent a single event or transaction.\n
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
}`,
        },
        {
          role: "user",
          content: `Generate a ${businessType} dataset with ${rowCount} rows using this schema: ${
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
