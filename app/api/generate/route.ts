import { NextRequest, NextResponse } from "next/server";
import {
  insertGeneratedData,
  insertTablesToAnalyticsSchema,
} from "@/app/lib/db";
import { OpenAI } from "openai";
import {
  generateDatasetPrompt,
  GenerateDatasetPromptParams,
  generateDatasetUserMessage,
} from "@/lib/prompts";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

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
      context,
      isPreview,
    } = prompt;

    // Validate required fields
    if (
      !businessType ||
      !schemaType ||
      !rowCount ||
      !timeRange ||
      !growthPattern ||
      !variationLevel ||
      !granularity
    ) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    // Log the incoming prompt
    if (process.env.NODE_ENV !== "production") {
      console.log("[API] Incoming prompt:", prompt);
    }

    // Build system prompt and user message using template
    const systemPrompt = generateDatasetPrompt({
      businessType,
      schemaType,
      rowCount,
      timeRange,
      growthPattern,
      variationLevel,
      granularity,
      context,
      isPreview,
    });
    const userMessage = generateDatasetUserMessage({
      businessType,
      schemaType,
      rowCount,
      timeRange,
      growthPattern,
      variationLevel,
      granularity,
      context,
      isPreview,
    });

    // Log the generated prompts
    if (process.env.NODE_ENV !== "production") {
      console.log("[API] System prompt:\n", systemPrompt);
      console.log("[API] User message:\n", userMessage);
    }

    // OpenAI API timeout (60s)
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 60000);

    let completion;
    try {
      completion = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [
          {
            role: "system",
            content: systemPrompt,
          },
          {
            role: "user",
            content: userMessage,
          },
        ],
        response_format: { type: "json_object" },
      });
    } finally {
      clearTimeout(timeout);
    }

    const content = completion.choices[0].message.content;
    console.log("Raw LLM output:", content);
    if (!content) {
      throw new Error("No content generated from OpenAI");
    }
    const generatedData = JSON.parse(content);

    // Log the parsed generated data
    if (process.env.NODE_ENV !== "production") {
      console.log("[API] Parsed generatedData:", generatedData);
    }

    // Insert into analytics schema if not a preview
    if (!isPreview) {
      try {
        await insertTablesToAnalyticsSchema(generatedData);
      } catch (err) {
        console.error("[API] Failed to insert into analytics schema:", err);
      }
    }

    // Format the response based on schema type
    const response = generatedData;

    return NextResponse.json({ data: response });
  } catch (error) {
    // Log prompt for debugging in dev
    if (process.env.NODE_ENV !== "production") {
      console.error("Prompt params:", await req.json?.());
    }
    console.error("Error generating dataset:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
