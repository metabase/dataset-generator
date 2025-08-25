import { NextResponse } from "next/server";
import { OpenAI } from "openai";
import {
  generateSpecPrompt,
  GenerateSpecPromptParams,
} from "@/lib/spec-prompts";
import { DataFactory } from "@/lib/data-factory";
import { getCachedSpec, cacheSpec } from "@/lib/cache";
import { rateLimitMiddleware, addRateLimitHeaders } from "@/lib/rate-limit";
import axios from "axios";

// Default OpenAI client for direct API calls
const directOpenAI = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// LiteLLM client for multi-provider support (when service is running)
const litellmOpenAI = new OpenAI({
  apiKey: process.env.LITELLM_MASTER_KEY || "sk-1234",
  baseURL: process.env.LLM_ENDPOINT || "http://localhost:4000",
});

export async function POST(req: Request) {
  const startTime = Date.now();

  // Apply rate limiting
  const rateLimitResponse = await rateLimitMiddleware(req);
  if (rateLimitResponse) {
    return rateLimitResponse;
  }

  try {
    const body = await req.json();
    const {
      businessType,
      numRecords,
      context,
      timeRange,
      growthPattern,
      variationLevel,
      granularity,
      schemaType,
    } = body;

    // Handle both numRecords and rowCount for backward compatibility
    const rowCount = numRecords || body.rowCount;

    // Validate required fields
    if (!businessType) {
      return NextResponse.json(
        { error: "Missing required field: businessType" },
        { status: 400 }
      );
    }

    // Determine which LLM client to use
    let selectedClient = directOpenAI;

    // Check if LiteLLM service is available
    try {
      await axios.get(process.env.LLM_ENDPOINT || "http://localhost:4000");
      selectedClient = litellmOpenAI;
      console.log("Using LiteLLM service");
    } catch {
      // Fall back to direct OpenAI
      if (!process.env.OPENAI_API_KEY) {
        return NextResponse.json(
          {
            error:
              "No OPENAI_API_KEY found. Either set OPENAI_API_KEY or start LiteLLM service.",
          },
          { status: 400 }
        );
      }
      console.log("Using direct OpenAI API");
    }

    // Check cache first
    const cacheParams: GenerateSpecPromptParams = {
      businessType,
      schemaType,
      context,
      timeRange,
      growthPattern,
      variationLevel,
      granularity,
    };

    const cachedSpec = await getCachedSpec(cacheParams);
    let spec: any; // Keep as any for LLM-generated spec
    let completion: any = null; // Keep as any for OpenAI response

    if (cachedSpec) {
      // Use cached spec - no LLM call needed
      spec = cachedSpec;
      const duration = Date.now() - startTime;
      console.log(`Tokens Used: Free (cached result) - ${duration}ms`);
    } else {
      // Cache miss - generate new spec with LLM
      const prompt = generateSpecPrompt(cacheParams);

      // LiteLLM timeout (90s)
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 90000);

      try {
        completion = await selectedClient.chat.completions.create({
          model: process.env.LLM_MODEL || "gpt-4o",
          messages: [
            {
              role: "user",
              content: prompt,
            },
          ],
          response_format: { type: "json_object" },
        });
      } finally {
        clearTimeout(timeout);
      }

      const content = completion.choices[0].message.content;
      if (!content) {
        throw new Error("No spec generated from LLM");
      }
      spec = JSON.parse(content);

      // Cache the new spec
      await cacheSpec(cacheParams, spec);

      // Log token usage for transparency (optional)
      if (completion.usage) {
        const duration = Date.now() - startTime;
        console.log(
          `Tokens Used: ${completion.usage.total_tokens} - ${duration}ms`
        );
      }
    }

    // Fix spec if needed (same logic for both cached and new specs)
    if (
      spec.simulation &&
      spec.simulation.initial_event &&
      !spec.simulation.events[spec.simulation.initial_event]
    ) {
      // Pick the first event as a fallback
      const firstEvent = Object.keys(spec.simulation.events)[0];
      spec.simulation.initial_event = firstEvent;
    }

    // 2. Generate data using the spec (same for both cached and new specs)
    console.log("🔍 API Debug: rowCount:", rowCount);
    console.log("🔍 API Debug: timeRange:", timeRange);
    console.log("🔍 API Debug: schemaType:", schemaType);

    const factory = new DataFactory(spec);
    const generatedData = factory.generate(
      rowCount,
      timeRange || [new Date().getFullYear().toString()],
      schemaType
    );

    // Format the response (same format as before)
    const response = {
      ...generatedData,
      spec,
      // Include token usage only if we made an LLM call
      tokens: completion
        ? {
            input: completion.usage?.prompt_tokens,
            output: completion.usage?.completion_tokens,
            total: completion.usage?.total_tokens,
          }
        : undefined,
    };

    const nextResponse = NextResponse.json({ data: response });
    return addRateLimitHeaders(nextResponse, req);
  } catch (error) {
    console.error("Error generating dataset:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    const nextResponse = NextResponse.json({ error: message }, { status: 500 });
    return addRateLimitHeaders(nextResponse, req);
  }
}
