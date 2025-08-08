#!/usr/bin/env tsx

import "dotenv/config";
import { OpenAI } from "openai";
import {
  generateSpecPrompt,
  GenerateSpecPromptParams,
} from "../lib/spec-prompts";
import { DataFactory } from "../lib/data-factory";
import { getCachedSpec, cacheSpec } from "../lib/cache";

// Business types to test
const BUSINESS_TYPES = [
  "B2B SaaS",
  "B2C SaaS",
  "Ecommerce",
  "Healthcare",
  "Fintech",
  "Education",
  "Retail",
  "Manufacturing",
  "Transportation",
  "Custom",
];

// Schema types to test
const SCHEMA_TYPES = ["One Big Table", "Star Schema"];

// Test configurations
const TEST_CONFIGS = [
  { rowCount: 100, timeRange: ["2024"], name: "Small Dataset" },
  { rowCount: 1000, timeRange: ["2023", "2024"], name: "Medium Dataset" },
  {
    rowCount: 5000,
    timeRange: ["2022", "2023", "2024"],
    name: "Large Dataset",
  },
];

interface ValidationResult {
  businessType: string;
  schemaType: string;
  config: string;
  success: boolean;
  errors: string[];
  warnings: string[];
  dataQuality: {
    rowCount: number;
    uniqueEntities: number;
    dateRange: { min: string; max: string };
    nullCount: number;
    duplicateCount: number;
  };
  performance: {
    generationTimeMs: number;
    cacheHit: boolean;
  };
}

class SchemaValidator {
  private openai: OpenAI;
  private results: ValidationResult[] = [];

  constructor() {
    this.openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });
  }

  async validateAll(): Promise<void> {
    console.log("🚀 Starting comprehensive schema validation...\n");

    for (const businessType of BUSINESS_TYPES) {
      for (const schemaType of SCHEMA_TYPES) {
        for (const config of TEST_CONFIGS) {
          console.log(
            `Testing: ${businessType} - ${schemaType} - ${config.name}`
          );

          try {
            const result = await this.validateSchema(
              businessType,
              schemaType,
              config
            );
            this.results.push(result);

            if (result.success) {
              console.log(
                `✅ PASSED: ${businessType} - ${schemaType} - ${config.name}`
              );
            } else {
              console.log(
                `❌ FAILED: ${businessType} - ${schemaType} - ${config.name}`
              );
              console.log(`   Errors: ${result.errors.join(", ")}`);
            }
          } catch (error) {
            console.log(
              `💥 ERROR: ${businessType} - ${schemaType} - ${config.name}`
            );
            console.log(`   ${error}`);

            this.results.push({
              businessType,
              schemaType,
              config: config.name,
              success: false,
              errors: [error instanceof Error ? error.message : String(error)],
              warnings: [],
              dataQuality: {
                rowCount: 0,
                uniqueEntities: 0,
                dateRange: { min: "", max: "" },
                nullCount: 0,
                duplicateCount: 0,
              },
              performance: { generationTimeMs: 0, cacheHit: false },
            });
          }
        }
      }
    }

    this.generateReport();
  }

  private async validateSchema(
    businessType: string,
    schemaType: string,
    config: { rowCount: number; timeRange: string[]; name: string }
  ): Promise<ValidationResult> {
    const startTime = Date.now();
    const errors: string[] = [];
    const warnings: string[] = [];

    // 1. Generate spec
    const params: GenerateSpecPromptParams = {
      businessType,
      schemaType,
      timeRange: config.timeRange,
      growthPattern: "steady",
      variationLevel: "medium",
      granularity: "daily",
    };

    // Check cache first
    let spec = await getCachedSpec(params);
    const cacheHit = !!spec;

    if (!spec) {
      // Generate new spec
      const prompt = generateSpecPrompt(params);

      const completion = await this.openai.chat.completions.create({
        model: process.env.LLM_MODEL || "gpt-4o",
        messages: [{ role: "user", content: prompt }],
        response_format: { type: "json_object" },
      });

      const content = completion.choices[0].message.content;
      if (!content) {
        throw new Error("No spec generated from LLM");
      }

      spec = JSON.parse(content);
      await cacheSpec(params, spec);
    }

    // 2. Validate spec structure
    this.validateSpecStructure(spec, errors, warnings);

    // 3. Generate data
    const factory = new DataFactory(spec);
    const generatedData = factory.generate(
      config.rowCount,
      config.timeRange,
      schemaType
    );

    // 4. Validate generated data
    const dataQuality = this.validateGeneratedData(
      generatedData,
      businessType,
      schemaType,
      errors,
      warnings
    );

    const generationTimeMs = Date.now() - startTime;

    return {
      businessType,
      schemaType,
      config: config.name,
      success: errors.length === 0,
      errors,
      warnings,
      dataQuality,
      performance: { generationTimeMs, cacheHit },
    };
  }

  private validateSpecStructure(
    spec: any,
    errors: string[],
    warnings: string[]
  ): void {
    // Check required top-level keys
    if (!spec.entities) errors.push("Missing 'entities' in spec");
    if (!spec.event_stream_table)
      errors.push("Missing 'event_stream_table' in spec");
    if (!spec.simulation) errors.push("Missing 'simulation' in spec");

    if (errors.length > 0) return; // Stop if basic structure is broken

    // Validate entities
    if (!Array.isArray(spec.entities) || spec.entities.length === 0) {
      errors.push("'entities' must be a non-empty array");
    } else {
      spec.entities.forEach((entity: any, index: number) => {
        if (!entity.name) errors.push(`Entity ${index} missing 'name'`);
        if (!entity.attributes)
          errors.push(`Entity ${index} missing 'attributes'`);
      });
    }

    // Validate event stream table
    if (!spec.event_stream_table.name)
      errors.push("Event stream table missing 'name'");
    if (!Array.isArray(spec.event_stream_table.columns)) {
      errors.push("Event stream table missing 'columns' array");
    }

    // Validate simulation
    if (!spec.simulation.initial_event)
      errors.push("Simulation missing 'initial_event'");
    if (!spec.simulation.events) errors.push("Simulation missing 'events'");
  }

  private validateGeneratedData(
    data: any,
    businessType: string,
    schemaType: string,
    errors: string[],
    warnings: string[]
  ): any {
    const mainTable =
      schemaType === "Star Schema" ? data.fact_table : data.table;

    if (!mainTable || !Array.isArray(mainTable)) {
      errors.push("No main table data generated");
      return {
        rowCount: 0,
        uniqueEntities: 0,
        dateRange: { min: "", max: "" },
        nullCount: 0,
        duplicateCount: 0,
      };
    }

    const rowCount = mainTable.length;
    if (rowCount === 0) {
      errors.push("Generated table is empty");
      return {
        rowCount: 0,
        uniqueEntities: 0,
        dateRange: { min: "", max: "" },
        nullCount: 0,
        duplicateCount: 0,
      };
    }

    // Check for required fields based on business type
    this.validateBusinessTypeFields(
      mainTable[0],
      businessType,
      errors,
      warnings
    );

    // Check for null values
    const nullCount = this.countNullValues(mainTable);

    // Check for duplicates
    const duplicateCount = this.countDuplicates(mainTable);

    // Check date range
    const dateRange = this.getDateRange(mainTable);

    // Check unique entities
    const uniqueEntities = this.countUniqueEntities(mainTable, businessType);

    // Validate data relationships
    this.validateDataRelationships(mainTable, businessType, errors, warnings);

    // Validate pricing consistency
    this.validatePricingConsistency(mainTable, businessType, errors, warnings);

    return {
      rowCount,
      uniqueEntities,
      dateRange,
      nullCount,
      duplicateCount,
    };
  }

  private validateBusinessTypeFields(
    record: any,
    businessType: string,
    errors: string[],
    warnings: string[]
  ): void {
    const requiredFields = this.getRequiredFields(businessType);
    const forbiddenFields = this.getForbiddenFields(businessType);

    // Check required fields
    for (const field of requiredFields) {
      if (!(field in record)) {
        errors.push(`Missing required field for ${businessType}: ${field}`);
      }
    }

    // Check forbidden fields
    for (const field of forbiddenFields) {
      if (field in record) {
        warnings.push(`Forbidden field present for ${businessType}: ${field}`);
      }
    }
  }

  private getRequiredFields(businessType: string): string[] {
    const fieldMap: Record<string, string[]> = {
      "B2B SaaS": [
        "user_id",
        "company_id",
        "user_role",
        "subscription_plan",
        "billing_cycle",
        "plan_price",
      ],
      "B2C SaaS": [
        "user_id",
        "subscription_plan",
        "billing_cycle",
        "plan_price",
      ],
      Ecommerce: [
        "customer_id",
        "product_id",
        "product_name",
        "product_category",
        "product_price",
      ],
      Healthcare: ["patient_id", "provider_id", "procedure_code"],
      Fintech: [
        "account_id",
        "transaction_id",
        "transaction_amount",
        "currency",
      ],
      Education: ["student_id", "course_id", "instructor_id"],
      Retail: [
        "customer_id",
        "product_id",
        "store_id",
        "quantity",
        "unit_price",
      ],
      Manufacturing: ["product_id", "machine_id", "work_order_id"],
      Transportation: ["vehicle_id", "driver_id", "trip_id"],
    };
    return fieldMap[businessType] || [];
  }

  private getForbiddenFields(businessType: string): string[] {
    const fieldMap: Record<string, string[]> = {
      "B2B SaaS": ["product_id", "product_name", "product_category"],
      "B2C SaaS": [
        "product_id",
        "product_name",
        "product_category",
        "company_id",
      ],
      Ecommerce: ["subscription_plan", "billing_cycle"],
      Healthcare: ["product_id", "product_category"],
      Fintech: ["product_id", "product_category"],
      Education: ["product_id", "product_category"],
      Retail: ["subscription_plan"],
      Manufacturing: ["customer_id", "subscription_plan"],
      Transportation: ["product_id", "subscription_plan"],
    };
    return fieldMap[businessType] || [];
  }

  private countNullValues(table: any[]): number {
    let nullCount = 0;
    for (const row of table) {
      for (const value of Object.values(row)) {
        if (value === null || value === undefined) nullCount++;
      }
    }
    return nullCount;
  }

  private countDuplicates(table: any[]): number {
    const seen = new Set();
    let duplicates = 0;

    for (const row of table) {
      const key = JSON.stringify(row);
      if (seen.has(key)) duplicates++;
      seen.add(key);
    }

    return duplicates;
  }

  private getDateRange(table: any[]): { min: string; max: string } {
    const dateFields = Object.keys(table[0]).filter(
      (key) =>
        key.includes("date") ||
        key.includes("timestamp") ||
        key.includes("time")
    );

    if (dateFields.length === 0) {
      return { min: "", max: "" };
    }

    let minDate = new Date();
    let maxDate = new Date(0);

    for (const row of table) {
      for (const field of dateFields) {
        if (row[field]) {
          const date = new Date(row[field]);
          if (!isNaN(date.getTime())) {
            if (date < minDate) minDate = date;
            if (date > maxDate) maxDate = date;
          }
        }
      }
    }

    return {
      min: minDate.toISOString().split("T")[0],
      max: maxDate.toISOString().split("T")[0],
    };
  }

  private countUniqueEntities(table: any[], businessType: string): number {
    const entityFields = this.getEntityFields(businessType);
    const uniqueIds = new Set();

    for (const row of table) {
      for (const field of entityFields) {
        if (row[field]) {
          uniqueIds.add(row[field]);
        }
      }
    }

    return uniqueIds.size;
  }

  private getEntityFields(businessType: string): string[] {
    const fieldMap: Record<string, string[]> = {
      "B2B SaaS": ["user_id", "company_id"],
      "B2C SaaS": ["user_id"],
      Ecommerce: ["customer_id", "product_id"],
      Healthcare: ["patient_id", "provider_id"],
      Fintech: ["account_id", "customer_id"],
      Education: ["student_id", "course_id", "instructor_id"],
      Retail: ["customer_id", "product_id", "store_id"],
      Manufacturing: ["product_id", "machine_id"],
      Transportation: ["vehicle_id", "driver_id"],
    };
    return fieldMap[businessType] || [];
  }

  private validateDataRelationships(
    table: any[],
    businessType: string,
    errors: string[],
    warnings: string[]
  ): void {
    // Check for realistic data relationships
    if (businessType === "B2B SaaS") {
      this.validateB2BSaaSRelationships(table, errors, warnings);
    } else if (businessType === "Ecommerce") {
      this.validateEcommerceRelationships(table, errors, warnings);
    }
    // Add more business type validations as needed
  }

  private validateB2BSaaSRelationships(
    table: any[],
    errors: string[],
    warnings: string[]
  ): void {
    for (const row of table) {
      // Check plan pricing consistency
      if (row.subscription_plan && row.plan_price) {
        const plan = row.subscription_plan.toLowerCase();
        const price = parseFloat(row.plan_price);

        if (plan.includes("starter") && (price < 50 || price > 199)) {
          warnings.push(
            `Starter plan price ${price} outside expected range (50-199)`
          );
        } else if (
          plan.includes("professional") &&
          (price < 200 || price > 999)
        ) {
          warnings.push(
            `Professional plan price ${price} outside expected range (200-999)`
          );
        } else if (plan.includes("enterprise") && price < 1000) {
          warnings.push(
            `Enterprise plan price ${price} below expected minimum (1000)`
          );
        }
      }
    }
  }

  private validateEcommerceRelationships(
    table: any[],
    errors: string[],
    warnings: string[]
  ): void {
    for (const row of table) {
      // Check product pricing consistency
      if (row.product_category && row.product_price) {
        const category = row.product_category.toLowerCase();
        const price = parseFloat(row.product_price);

        if (category.includes("electronics") && (price < 50 || price > 2000)) {
          warnings.push(
            `Electronics price ${price} outside expected range (50-2000)`
          );
        } else if (
          category.includes("clothing") &&
          (price < 10 || price > 200)
        ) {
          warnings.push(
            `Clothing price ${price} outside expected range (10-200)`
          );
        }
      }
    }
  }

  private validatePricingConsistency(
    table: any[],
    businessType: string,
    errors: string[],
    warnings: string[]
  ): void {
    // Check for zero prices where they shouldn't be
    for (const row of table) {
      const priceFields = Object.keys(row).filter(
        (key) =>
          key.includes("price") ||
          key.includes("amount") ||
          key.includes("cost")
      );

      for (const field of priceFields) {
        const value = parseFloat(row[field]);
        if (value === 0 && !this.isAllowedZeroPrice(field, businessType)) {
          warnings.push(`Zero price found in ${field} for ${businessType}`);
        }
      }
    }
  }

  private isAllowedZeroPrice(field: string, businessType: string): boolean {
    if (businessType === "B2C SaaS" && field.includes("plan_price"))
      return true;
    if (businessType === "Education" && field.includes("course_price"))
      return true;
    return false;
  }

  private generateReport(): void {
    console.log("\n" + "=".repeat(80));
    console.log("📊 VALIDATION REPORT");
    console.log("=".repeat(80));

    const totalTests = this.results.length;
    const passedTests = this.results.filter((r) => r.success).length;
    const failedTests = totalTests - passedTests;

    console.log(`\nOverall Results:`);
    console.log(
      `✅ Passed: ${passedTests}/${totalTests} (${(
        (passedTests / totalTests) *
        100
      ).toFixed(1)}%)`
    );
    console.log(
      `❌ Failed: ${failedTests}/${totalTests} (${(
        (failedTests / totalTests) *
        100
      ).toFixed(1)}%)`
    );

    // Group by business type
    const businessTypeResults = new Map<string, ValidationResult[]>();
    for (const result of this.results) {
      if (!businessTypeResults.has(result.businessType)) {
        businessTypeResults.set(result.businessType, []);
      }
      businessTypeResults.get(result.businessType)!.push(result);
    }

    console.log(`\nResults by Business Type:`);
    for (const [businessType, results] of businessTypeResults) {
      const passed = results.filter((r) => r.success).length;
      const total = results.length;
      console.log(
        `  ${businessType}: ${passed}/${total} (${(
          (passed / total) *
          100
        ).toFixed(1)}%)`
      );
    }

    // Show failed tests
    if (failedTests > 0) {
      console.log(`\n❌ Failed Tests:`);
      for (const result of this.results.filter((r) => !r.success)) {
        console.log(
          `  ${result.businessType} - ${result.schemaType} - ${result.config}`
        );
        for (const error of result.errors) {
          console.log(`    Error: ${error}`);
        }
      }
    }

    // Performance summary
    const avgGenerationTime =
      this.results.reduce((sum, r) => sum + r.performance.generationTimeMs, 0) /
      this.results.length;
    const cacheHitRate =
      this.results.filter((r) => r.performance.cacheHit).length /
      this.results.length;

    console.log(`\n📈 Performance Summary:`);
    console.log(`  Average generation time: ${avgGenerationTime.toFixed(0)}ms`);
    console.log(`  Cache hit rate: ${(cacheHitRate * 100).toFixed(1)}%`);

    // Data quality summary
    const avgRowCount =
      this.results.reduce((sum, r) => sum + r.dataQuality.rowCount, 0) /
      this.results.length;
    const avgNullRate =
      this.results.reduce(
        (sum, r) =>
          sum + r.dataQuality.nullCount / (r.dataQuality.rowCount || 1),
        0
      ) / this.results.length;

    console.log(`\n📊 Data Quality Summary:`);
    console.log(`  Average row count: ${avgRowCount.toFixed(0)}`);
    console.log(`  Average null rate: ${(avgNullRate * 100).toFixed(2)}%`);

    console.log("\n" + "=".repeat(80));
  }
}

// Run validation if this script is executed directly
if (require.main === module) {
  const validator = new SchemaValidator();
  validator.validateAll().catch(console.error);
}

export { SchemaValidator };
