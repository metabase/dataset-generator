import { NextRequest, NextResponse } from "next/server";
import { OpenAI } from "openai";
import {
  generateSpecPrompt,
  GenerateSpecPromptParams,
} from "@/lib/spec-prompts";
import { DataFactory } from "@/lib/data-factory";
import { getCachedSpec, cacheSpec } from "@/lib/cache";
import axios from "axios";

const openai = new OpenAI({
  apiKey: process.env.LITELLM_MASTER_KEY || "sk-1234",
  baseURL: process.env.LLM_ENDPOINT || "http://localhost:4000",
});

export async function POST(req: Request) {
  const startTime = Date.now();

  try {
    const {
      businessType,
      rowCount,
      context,
      isPreview,
      timeRange,
      growthPattern,
      variationLevel,
      granularity,
      schemaType,
    }: GenerateSpecPromptParams & {
      rowCount: number;
      isPreview?: boolean;
      schemaType?: string;
    } = await req.json();

    // Validate required fields
    if (!businessType) {
      return NextResponse.json(
        { error: "Missing required field: businessType" },
        { status: 400 }
      );
    }

    // Check if LiteLLM is reachable before making a request
    try {
      await axios.get(process.env.LLM_ENDPOINT || "http://localhost:4000");
    } catch (e) {
      return NextResponse.json(
        {
          error:
            "LiteLLM is not running. Please start it with `docker-compose up litellm db`.",
        },
        { status: 503 }
      );
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
    let spec: any;
    let completion: any = null;

    if (cachedSpec) {
      // Use cached spec - no LLM call needed
      spec = cachedSpec;
      const duration = Date.now() - startTime;
      console.log(`Tokens Used: Free (cached result) - ${duration}ms`);
    } else {
      // Cache miss - generate new spec with LLM
      console.log(`Generating new spec...`);

      // 1. Generate the spec from the LLM
      const prompt = generateSpecPrompt(cacheParams);

      // LiteLLM timeout (60s)
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 60000);

      try {
        completion = await openai.chat.completions.create({
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
    const factory = new DataFactory(spec);
    const generatedData = factory.generate(
      rowCount || 1000,
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

    return NextResponse.json({ data: response });
  } catch (error) {
    console.error("Error generating dataset:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
