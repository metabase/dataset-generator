import { DataSpec } from "@/lib/types/data-spec";
import { REQUIRED_FIELDS_BY_BUSINESS_TYPE } from "@/lib/constants/business-constants";
import {
  ValidationResult,
  EventStream,
  DataRecord,
} from "@/lib/types/data-types";

export class DataValidator {
  private spec: DataSpec;

  constructor(spec: DataSpec) {
    this.spec = spec;
  }

  public validateSpec(spec: DataSpec): void {
    // Validate required top-level properties
    if (
      !spec.entities ||
      !Array.isArray(spec.entities) ||
      spec.entities.length === 0
    ) {
      throw new Error("[DataFactory] Spec must have at least one entity");
    }
    if (!spec.event_stream_table || !spec.event_stream_table.columns) {
      throw new Error(
        "[DataFactory] Spec must have event_stream_table with columns"
      );
    }
    if (
      !spec.simulation ||
      !spec.simulation.initial_event ||
      !spec.simulation.events
    ) {
      throw new Error(
        "[DataFactory] Spec must have simulation with initial_event and events"
      );
    }

    // Validate entities
    spec.entities.forEach((entity, index) => {
      if (!entity.name || !entity.attributes) {
        throw new Error(
          `[DataFactory] Entity ${index} must have name and attributes`
        );
      }
      Object.entries(entity.attributes).forEach(([attrName, attrSpec]) => {
        if (!attrSpec.type) {
          throw new Error(
            `[DataFactory] Attribute ${attrName} in entity ${entity.name} must have type`
          );
        }
        if (
          attrSpec.type === "choice" &&
          (!attrSpec.values || !attrSpec.weights)
        ) {
          if (process.env.DEBUG) {
            console.warn(
              `[DataFactory] Choice attribute ${attrName} missing values/weights, using fallback`
            );
          }
          // Provide fallback values
          attrSpec.values = ["Option A", "Option B", "Option C"];
          attrSpec.weights = [0.4, 0.35, 0.25];
        }
        if (
          attrSpec.type === "conditional" &&
          (!attrSpec.on || !attrSpec.cases)
        ) {
          if (process.env.DEBUG) {
            console.warn(
              `[DataFactory] Conditional attribute ${attrName} missing 'on' or 'cases', using fallback`
            );
          }
          // Provide fallback for conditional attributes
          attrSpec.on = ["default"];
          attrSpec.cases = { default: 0 };
        }
      });
    });

    // Validate simulation events
    Object.entries(spec.simulation.events).forEach(([, eventSpec]) => {
      if (!eventSpec.type) {
        eventSpec.type = "random";
      }
      if (eventSpec.type === "recurring" && !eventSpec.frequency?.on) {
        eventSpec.frequency = { on: "billing_cycle" };
      }
      if (
        eventSpec.type === "random" &&
        !eventSpec.avg_per_entity_per_month &&
        !eventSpec.avg_per_entity
      ) {
        eventSpec.avg_per_entity_per_month = 5;
      }
      if (eventSpec.type === "churn" && !eventSpec.monthly_rate) {
        eventSpec.monthly_rate = 0.05;
      }
    });

    if (process.env.DEBUG) {
      // console.log("[DataFactory] Spec validation passed");
    }
  }

  public validateDataQuality(eventStream: EventStream): ValidationResult {
    const issues: string[] = [];
    const warnings: string[] = [];
    const stats: ValidationResult["stats"] = {
      totalRows: 0,
      businessType: "",
      uniqueEvents: 0,
    };

    if (eventStream.length === 0) {
      issues.push("No data generated - empty event stream");
      return { issues, warnings, stats, isValid: false, qualityScore: 0 };
    }

    // Check for placeholder values
    const placeholderPattern = /option\s*[a-z]/i;
    const placeholderCount = eventStream.filter((row) =>
      Object.values(row).some(
        (value) => typeof value === "string" && placeholderPattern.test(value)
      )
    ).length;

    if (placeholderCount > 0) {
      issues.push(
        `${placeholderCount} rows contain placeholder values (e.g., "Option A")`
      );
    }

    // Check for unrealistic numeric values
    const numericIssues: string[] = [];
    const numericFields = [
      "plan_price",
      "payment_amount",
      "api_calls_count",
      "storage_used_mb",
    ];

    numericFields.forEach((field) => {
      const invalidValues = eventStream.filter((row) => {
        const value = row[field];
        return (
          value !== undefined &&
          value !== null &&
          (typeof value === "string" ||
            (typeof value === "number" && (value < 0 || value > 10000)))
        );
      });

      if (invalidValues.length > 0) {
        numericIssues.push(
          `${invalidValues.length} rows have invalid ${field} values`
        );
      }
    });

    if (numericIssues.length > 0) {
      issues.push(...numericIssues);
    }

    // Check for unrealistic dates
    const now = new Date();
    const futureDate = new Date(
      now.getFullYear() + 1,
      now.getMonth(),
      now.getDate()
    );
    const pastDate = new Date(
      now.getFullYear() - 5,
      now.getMonth(),
      now.getDate()
    );

    const dateFields = [
      "signup_date",
      "order_date",
      "appointment_date",
      "transaction_date",
    ];
    const invalidDates = eventStream.filter((row) =>
      dateFields.some((field) => {
        const dateValue = row[field];
        if (!dateValue) return false;
        const date = new Date(dateValue);
        return date > futureDate || date < pastDate;
      })
    ).length;

    if (invalidDates > 0) {
      issues.push(`${invalidDates} rows have unrealistic dates`);
    }

    // Check for missing required fields based on business type
    const businessType = this.detectBusinessType(eventStream[0]);
    const requiredFields = this.getRequiredFields(businessType);

    const missingFields = requiredFields.filter(
      (field) =>
        !eventStream.some(
          (row) =>
            row[field] !== undefined && row[field] !== null && row[field] !== ""
        )
    );

    if (missingFields.length > 0) {
      warnings.push(
        `Missing recommended fields for ${businessType}: ${missingFields.join(
          ", "
        )}`
      );
    }

    // Generate statistics
    stats.totalRows = eventStream.length;
    stats.businessType = businessType;
    stats.uniqueEvents = [
      ...new Set(eventStream.map((row) => row.event_type)),
    ].length;

    // Calculate date range properly
    const timestamps = eventStream
      .map((row) => {
        const timestamp = row.event_timestamp || row.timestamp;
        return timestamp ? new Date(timestamp).getTime() : Date.now();
      })
      .filter((ts) => !isNaN(ts));

    if (timestamps.length > 0) {
      stats.dateRange = {
        earliest: new Date(Math.min(...timestamps)),
        latest: new Date(Math.max(...timestamps)),
      };
    }

    // Check for data diversity
    const categoricalFields = [
      "subscription_plan",
      "country",
      "status",
      "event_type",
    ];
    categoricalFields.forEach((field) => {
      const values = eventStream
        .map((row) => row[field])
        .filter((v) => v !== undefined && v !== null);
      const uniqueValues = [...new Set(values)];
      if (uniqueValues.length < 2 && eventStream.length > 10) {
        warnings.push(
          `Low diversity in ${field}: only ${uniqueValues.length} unique values`
        );
      }
    });

    // Check for realistic pricing
    if (businessType.includes("SaaS")) {
      const planPrices = eventStream
        .map((row) => row.plan_price)
        .filter((price) => price !== undefined && price !== null && price > 0);

      if (planPrices.length > 0) {
        const avgPrice =
          planPrices.reduce((sum, price) => sum + price, 0) / planPrices.length;
        if (avgPrice < 5 || avgPrice > 2000) {
          warnings.push(
            `Average plan price ($${avgPrice.toFixed(
              2
            )}) seems unrealistic for ${businessType}`
          );
        }
      }
    }

    return {
      issues,
      warnings,
      stats,
      isValid: issues.length === 0,
      qualityScore: Math.max(0, 100 - issues.length * 20 - warnings.length * 5),
    };
  }

  private detectBusinessType(record: DataRecord): string {
    // Detect B2B vs B2C based on field presence
    if (
      record["company_id"] ||
      record["user_role"] ||
      record["contract_value"]
    ) {
      return "B2B";
    }
    if (
      record["device_type"] ||
      record["user_age"] ||
      record["viral_coefficient"]
    ) {
      return "B2C";
    }

    // Fallback based on subscription plan names
    const plan = record["subscription_plan"] || record["plan"];
    if (
      plan &&
      ["Starter", "Professional", "Enterprise", "Custom"].includes(plan)
    ) {
      return "B2B";
    }
    if (plan && ["Free", "Basic", "Premium", "Family"].includes(plan)) {
      return "B2C";
    }

    // Default to B2B if uncertain
    return "B2B";
  }

  private getRequiredFields(businessType: string): string[] {
    return REQUIRED_FIELDS_BY_BUSINESS_TYPE[businessType] || ["event_type"];
  }
}
