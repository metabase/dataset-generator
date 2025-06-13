import { NextRequest, NextResponse } from "next/server";
import { insertGeneratedData } from "@/app/lib/db";
// import OpenAI from "openai";

// const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export async function POST(req: NextRequest) {
  const body = await req.json();
  const {
    businessType,
    schemaType,
    timeRange,
    rowCount,
    growthPattern,
    variationLevel,
    granularity,
  } = body;

  // Build the prompt
  const prompt = `You are a data engineer. Generate a realistic synthetic dataset for a ${businessType} business using a ${schemaType} schema.\n\nTime range: ${timeRange}\nApproximate volume: ${rowCount} rows total\nGrowth pattern: ${growthPattern}\nData variation: ${variationLevel}\nMetric granularity: ${granularity}\n\nIf using a star schema:\n- Include a fact table and dimension tables (e.g., customers, products, time)\n\nInclude realistic metrics and timestamps. The data should reflect the given growth and variation trends.\n\nReturn as a structured JSON object with:\n- Table names\n- Field names\n- Field types\n- Example values`;

  // --- Replace this stub with a real OpenAI call ---
  // const completion = await openai.chat.completions.create({
  //   model: "gpt-4o",
  //   messages: [
  //     { role: "system", content: "You are a helpful data engineer." },
  //     { role: "user", content: prompt },
  //   ],
  //   temperature: 0.2,
  // });
  // const data = completion.choices[0].message.content;

  // For now, return a stub dataset
  const data = {
    tables: [
      {
        name: "sales",
        fields: [
          { name: "date", type: "date", example: "2023-01-01" },
          { name: "revenue", type: "float", example: 12345.67 },
          { name: "customer_id", type: "int", example: 42 },
        ],
        rows: [
          { date: "2023-01-01", revenue: 12345.67, customer_id: 42 },
          { date: "2023-01-02", revenue: 23456.78, customer_id: 43 },
          { date: "2023-01-03", revenue: 34567.89, customer_id: 44 },
          { date: "2023-01-04", revenue: 45678.9, customer_id: 45 },
          { date: "2023-01-05", revenue: 56789.01, customer_id: 46 },
          { date: "2023-01-06", revenue: 67890.12, customer_id: 47 },
          { date: "2023-01-07", revenue: 78901.23, customer_id: 48 },
          { date: "2023-01-08", revenue: 89012.34, customer_id: 49 },
          { date: "2023-01-09", revenue: 90123.45, customer_id: 50 },
          { date: "2023-01-10", revenue: 1234.56, customer_id: 51 },
        ],
      },
    ],
  };

  return NextResponse.json({ data });
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
