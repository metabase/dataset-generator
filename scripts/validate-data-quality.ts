#!/usr/bin/env tsx

import "dotenv/config";
import axios from "axios";

interface DataQualityResult {
  businessType: string;
  schemaType: string;
  success: boolean;
  columns: string[];
  sampleData: any[];
  issues: string[];
  analystNotes: string[];
}

class DataQualityValidator {
  private baseUrl: string;

  constructor() {
    this.baseUrl = "http://localhost:3000";
  }

  async validateAllBusinessTypes(): Promise<void> {
    console.log("🔍 Validating data quality for analysts...\n");

    const businessTypes = [
      "B2B SaaS",
      "B2C SaaS",
      "Ecommerce",
      "Healthcare",
      "Fintech",
      "Education",
      "Retail",
      "Manufacturing",
      "Transportation",
    ];

    const schemaTypes = ["One Big Table", "Star Schema"];
    const results: DataQualityResult[] = [];

    for (const businessType of businessTypes) {
      for (const schemaType of schemaTypes) {
        console.log(`Testing: ${businessType} - ${schemaType}`);

        try {
          const result = await this.validateBusinessType(
            businessType,
            schemaType
          );
          results.push(result);

          if (result.success) {
            console.log(
              `✅ ${businessType} - ${schemaType}: ${result.columns.length} columns`
            );
          } else {
            console.log(
              `❌ ${businessType} - ${schemaType}: ${result.issues.join(", ")}`
            );
          }
        } catch (error) {
          console.log(`💥 ${businessType} - ${schemaType}: ${error}`);
          results.push({
            businessType,
            schemaType,
            success: false,
            columns: [],
            sampleData: [],
            issues: [error instanceof Error ? error.message : String(error)],
            analystNotes: [],
          });
        }
      }
    }

    this.generateReport(results);
  }

  private async validateBusinessType(
    businessType: string,
    schemaType: string
  ): Promise<DataQualityResult> {
    const payload = {
      businessType,
      schemaType,
      rowCount: 10, // Small sample for validation
      timeRange: ["2024"],
      growthPattern: "steady",
      variationLevel: "medium",
      granularity: "daily",
    };

    const response = await axios.post(`${this.baseUrl}/api/generate`, payload, {
      headers: { "Content-Type": "application/json" },
      timeout: 60000,
    });

    const data = response.data.data;
    const issues: string[] = [];
    const analystNotes: string[] = [];

    // Get the main table
    let mainTable;
    let dimensionTables = [];

    if (schemaType === "Star Schema") {
      // For star schema, look for fact table and dimension tables
      if (data.tables && Array.isArray(data.tables)) {
        const factTable = data.tables.find((t) => t.type === "fact");
        const dimTables = data.tables.filter((t) => t.type === "dim");

        mainTable = factTable?.rows;
        dimensionTables = dimTables;
      } else {
        // Fallback to old structure
        mainTable = data.fact_table;
        dimensionTables = data.dimension_tables || [];
      }
    } else {
      // For one big table, get the first table's rows
      mainTable = data.table || (data.tables && data.tables[0]?.rows);
    }

    if (!mainTable || !Array.isArray(mainTable) || mainTable.length === 0) {
      issues.push("No data generated");
      return {
        businessType,
        schemaType,
        success: false,
        columns: [],
        sampleData: [],
        issues,
        analystNotes,
      };
    }

    const columns = Object.keys(mainTable[0]);
    const sampleData = mainTable.slice(0, 3); // First 3 rows for analysis

    // Business-specific validation
    this.validateBusinessSpecificFields(
      businessType,
      schemaType,
      columns,
      sampleData,
      issues,
      analystNotes
    );

    // General data quality checks
    this.validateDataQuality(columns, sampleData, issues, analystNotes);

    // Schema-specific validation
    if (schemaType === "Star Schema") {
      this.validateStarSchema(
        data,
        mainTable,
        dimensionTables,
        issues,
        analystNotes
      );
    }

    return {
      businessType,
      schemaType,
      success: issues.length === 0,
      columns,
      sampleData,
      issues,
      analystNotes,
    };
  }

  private validateBusinessSpecificFields(
    businessType: string,
    schemaType: string,
    columns: string[],
    sampleData: any[],
    issues: string[],
    analystNotes: string[]
  ): void {
    const requiredFields = this.getRequiredFields(businessType, schemaType);
    const forbiddenFields = this.getForbiddenFields(businessType);

    // Check required fields
    for (const field of requiredFields) {
      if (!columns.includes(field)) {
        issues.push(`Missing required field: ${field}`);
      }
    }

    // Check forbidden fields
    for (const field of forbiddenFields) {
      if (columns.includes(field)) {
        issues.push(`Forbidden field present: ${field}`);
      }
    }

    // Business-specific analysis
    switch (businessType) {
      case "B2B SaaS":
        this.analyzeB2BSaaS(columns, sampleData, analystNotes);
        break;
      case "Ecommerce":
        this.analyzeEcommerce(columns, sampleData, analystNotes);
        break;
      case "Healthcare":
        this.analyzeHealthcare(columns, sampleData, analystNotes);
        break;
      case "Fintech":
        this.analyzeFintech(columns, sampleData, analystNotes);
        break;
      // Add more business types as needed
    }
  }

  private validateDataQuality(
    columns: string[],
    sampleData: any[],
    issues: string[],
    analystNotes: string[]
  ): void {
    // Check for essential analyst fields
    const essentialFields = [
      "id",
      "date",
      "timestamp",
      "amount",
      "price",
      "cost",
    ];
    const hasEssentialFields = essentialFields.some((field) =>
      columns.some((col) => col.toLowerCase().includes(field))
    );

    if (!hasEssentialFields) {
      analystNotes.push(
        "⚠️ Missing essential fields for analysis (id, date, amount, etc.)"
      );
    }

    // Check for date/time fields
    const dateFields = columns.filter(
      (col) =>
        col.toLowerCase().includes("date") || col.toLowerCase().includes("time")
    );

    if (dateFields.length === 0) {
      issues.push("No date/time fields found");
    } else {
      analystNotes.push(`📅 Date fields: ${dateFields.join(", ")}`);
    }

    // Check for numeric fields
    const numericFields = columns.filter(
      (col) =>
        col.toLowerCase().includes("amount") ||
        col.toLowerCase().includes("price") ||
        col.toLowerCase().includes("cost") ||
        col.toLowerCase().includes("count") ||
        col.toLowerCase().includes("quantity")
    );

    if (numericFields.length === 0) {
      analystNotes.push("⚠️ No obvious numeric fields for aggregation");
    } else {
      analystNotes.push(`📊 Numeric fields: ${numericFields.join(", ")}`);
    }

    // Check for categorical fields
    const categoricalFields = columns.filter(
      (col) =>
        col.toLowerCase().includes("type") ||
        col.toLowerCase().includes("category") ||
        col.toLowerCase().includes("status") ||
        col.toLowerCase().includes("plan") ||
        col.toLowerCase().includes("role")
    );

    if (categoricalFields.length > 0) {
      analystNotes.push(
        `🏷️ Categorical fields: ${categoricalFields.join(", ")}`
      );
    }
  }

  private validateStarSchema(
    data: any,
    mainTable: any[],
    dimensionTables: any[],
    issues: string[],
    analystNotes: string[]
  ): void {
    if (!dimensionTables || dimensionTables.length === 0) {
      issues.push("Star schema missing dimension tables");
      return;
    }

    analystNotes.push(
      `📊 Star Schema: ${dimensionTables.length} dimension tables`
    );

    // Check for foreign keys in fact table
    if (mainTable && mainTable.length > 0) {
      const factColumns = Object.keys(mainTable[0] || {});
      const foreignKeys = factColumns.filter((col) => col.endsWith("_id"));

      if (foreignKeys.length === 0) {
        issues.push("Star schema missing foreign keys");
      } else {
        analystNotes.push(`🔗 Foreign keys: ${foreignKeys.join(", ")}`);
      }
    }

    // Analyze dimension tables
    const dimTableNames = dimensionTables.map((t) => t.name).join(", ");
    analystNotes.push(`📋 Dimension tables: ${dimTableNames}`);
  }

  private analyzeB2BSaaS(
    columns: string[],
    sampleData: any[],
    analystNotes: string[]
  ): void {
    // Check for SaaS-specific fields
    const saasFields = columns.filter(
      (col) =>
        col.includes("subscription") ||
        col.includes("plan") ||
        col.includes("billing")
    );

    if (saasFields.length > 0) {
      analystNotes.push(`💳 SaaS fields: ${saasFields.join(", ")}`);
    }

    // Check for user/company relationships
    const hasUserCompany =
      columns.includes("user_id") && columns.includes("company_id");
    if (hasUserCompany) {
      analystNotes.push("✅ Good: User-company relationship present");
    }
  }

  private analyzeEcommerce(
    columns: string[],
    sampleData: any[],
    analystNotes: string[]
  ): void {
    // Check for ecommerce-specific fields
    const ecommerceFields = columns.filter(
      (col) =>
        col.includes("product") ||
        col.includes("order") ||
        col.includes("customer")
    );

    if (ecommerceFields.length > 0) {
      analystNotes.push(`🛒 Ecommerce fields: ${ecommerceFields.join(", ")}`);
    }

    // Check for pricing
    const hasPricing = columns.some(
      (col) => col.includes("price") || col.includes("amount")
    );
    if (hasPricing) {
      analystNotes.push("✅ Good: Pricing information present");
    }
  }

  private analyzeHealthcare(
    columns: string[],
    sampleData: any[],
    analystNotes: string[]
  ): void {
    // Check for healthcare-specific fields
    const healthcareFields = columns.filter(
      (col) =>
        col.includes("patient") ||
        col.includes("provider") ||
        col.includes("procedure")
    );

    if (healthcareFields.length > 0) {
      analystNotes.push(`🏥 Healthcare fields: ${healthcareFields.join(", ")}`);
    }
  }

  private analyzeFintech(
    columns: string[],
    sampleData: any[],
    analystNotes: string[]
  ): void {
    // Check for fintech-specific fields
    const fintechFields = columns.filter(
      (col) =>
        col.includes("transaction") ||
        col.includes("account") ||
        col.includes("amount")
    );

    if (fintechFields.length > 0) {
      analystNotes.push(`💰 Fintech fields: ${fintechFields.join(", ")}`);
    }
  }

  private getRequiredFields(
    businessType: string,
    schemaType: string
  ): string[] {
    const fieldMap: Record<string, string[]> = {
      "B2B SaaS": ["user_id", "company_id", "subscription_plan"],
      "B2C SaaS": ["user_id", "subscription_plan"],
      Ecommerce: ["customer_id", "product_id", "product_name"],
      Healthcare: ["patient_id", "provider_id"],
      Fintech: ["account_id", "transaction_id"],
      Education: ["student_id", "course_id"],
      Retail: ["customer_id", "product_id"],
      Manufacturing: ["product_id", "work_order_id"],
      Transportation: ["vehicle_id", "trip_id"],
    };

    const baseFields = fieldMap[businessType] || [];

    // For star schemas, some fields might be in dimension tables, not fact table
    if (schemaType === "Star Schema") {
      // Remove fields that are typically in dimension tables
      const dimensionTableFields = [
        "subscription_plan",
        "product_name",
        "customer_name",
        "patient_name",
        "provider_name",
      ];
      return baseFields.filter(
        (field) => !dimensionTableFields.includes(field)
      );
    }

    return baseFields;
  }

  private getForbiddenFields(businessType: string): string[] {
    const fieldMap: Record<string, string[]> = {
      "B2B SaaS": ["product_id", "product_name"],
      "B2C SaaS": ["product_id", "company_id"],
      Ecommerce: ["subscription_plan"],
      Healthcare: ["product_id"],
      Fintech: ["product_id"],
      Education: ["product_id"],
      Retail: ["subscription_plan"],
      Manufacturing: ["customer_id"],
      Transportation: ["product_id"],
    };
    return fieldMap[businessType] || [];
  }

  private generateReport(results: DataQualityResult[]): void {
    console.log("\n" + "=".repeat(80));
    console.log("📊 DATA QUALITY REPORT FOR ANALYSTS");
    console.log("=".repeat(80));

    const successful = results.filter((r) => r.success).length;
    const total = results.length;

    console.log(
      `\nOverall Results: ${successful}/${total} successful (${(
        (successful / total) *
        100
      ).toFixed(1)}%)`
    );

    // Group by business type
    const businessTypeResults = new Map<string, DataQualityResult[]>();
    for (const result of results) {
      if (!businessTypeResults.has(result.businessType)) {
        businessTypeResults.set(result.businessType, []);
      }
      businessTypeResults.get(result.businessType)!.push(result);
    }

    console.log("\n📋 Detailed Results:");
    for (const [businessType, businessResults] of businessTypeResults) {
      console.log(`\n${businessType}:`);

      for (const result of businessResults) {
        const status = result.success ? "✅" : "❌";
        console.log(
          `  ${status} ${result.schemaType}: ${result.columns.length} columns`
        );

        if (result.issues.length > 0) {
          console.log(`    Issues: ${result.issues.join(", ")}`);
        }

        if (result.analystNotes.length > 0) {
          console.log(`    Notes: ${result.analystNotes.join(" | ")}`);
        }
      }
    }

    // Show sample data for successful cases
    console.log("\n🔍 Sample Data Analysis:");
    for (const result of results.filter((r) => r.success).slice(0, 3)) {
      console.log(`\n${result.businessType} - ${result.schemaType}:`);
      console.log(`Columns: ${result.columns.join(", ")}`);

      if (result.sampleData.length > 0) {
        console.log("Sample row:");
        console.log(JSON.stringify(result.sampleData[0], null, 2));
      }
    }

    console.log("\n" + "=".repeat(80));
  }
}

// Run validation if this script is executed directly
if (require.main === module) {
  const validator = new DataQualityValidator();
  validator.validateAllBusinessTypes().catch(console.error);
}

export { DataQualityValidator };
