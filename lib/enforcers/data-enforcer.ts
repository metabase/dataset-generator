import { faker } from "@/lib/utils/faker-utils";
import {
  NUMERIC_FIELD_RANGES,
  DEFAULT_VALUES,
  COUNTRIES,
  PLACEHOLDER_PATTERNS,
} from "@/lib/constants/business-constants";
import { DataRecord } from "@/lib/types/data-types";

export class DataEnforcer {
  public sanitizePlaceholderValues(record: DataRecord): void {
    // Replace placeholder values with realistic alternatives
    PLACEHOLDER_PATTERNS.forEach(({ pattern, field, fallbacks }) => {
      if (
        record[field] &&
        typeof record[field] === "string" &&
        pattern.test(record[field])
      ) {
        record[field] = faker.helpers.arrayElement(fallbacks);
      }
    });

    // Remove any remaining "Option" patterns
    Object.keys(record).forEach((key) => {
      if (
        typeof record[key] === "string" &&
        /option\s*[a-z]/i.test(record[key])
      ) {
        record[key] = "Default Value";
      }
    });

    // Fix random alphanumeric strings for known fields
    const fieldMappings: { [key: string]: string[] } = {
      user_role: ["admin", "manager", "user", "viewer"],
      subscription_plan: ["Free", "Basic", "Pro", "Enterprise"],
      billing_cycle: ["monthly", "annual"],
      event_type: [
        "login",
        "signup",
        "trial_started",
        "subscription_created",
        "feature_usage",
        "api_call",
        "upgrade",
        "downgrade",
        "cancellation",
        "content_created",
        "social_share",
        "support_ticket",
        "contract_signed",
        "user_invited",
        "admin_action",
        "contract_renewal",
        "churn",
      ],
      device_type: ["mobile", "desktop", "tablet"],
      order_status: [
        "pending",
        "confirmed",
        "shipped",
        "delivered",
        "returned",
        "cancelled",
      ],
      payment_method: ["credit_card", "paypal", "bank_transfer", "cash"],
      appointment_status: [
        "scheduled",
        "confirmed",
        "completed",
        "cancelled",
        "no_show",
      ],
      transaction_type: ["deposit", "withdrawal", "transfer", "payment"],
      account_type: ["checking", "savings", "credit", "investment"],
      course_status: ["enrolled", "completed", "dropped", "waitlisted"],
      production_status: ["planned", "in_progress", "completed", "cancelled"],
      shipment_status: ["pending", "in_transit", "delivered", "returned"],
    };

    Object.keys(record).forEach((key) => {
      if (
        typeof record[key] === "string" &&
        fieldMappings[key] &&
        /^[A-Za-z0-9]{4,}$/.test(record[key]) && // Random alphanumeric string
        !fieldMappings[key].includes(record[key]) // Not already a valid value
      ) {
        record[key] = faker.helpers.arrayElement(fieldMappings[key]);
      }

      // Fix timestamp fields that are random strings
      if (
        typeof record[key] === "string" &&
        (key.includes("timestamp") || key.includes("date")) &&
        /^[A-Za-z0-9]{4,}$/.test(record[key]) // Random alphanumeric string
      ) {
        const now = new Date();
        const past = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000); // 1 year ago
        record[key] = faker.date.between({ from: past, to: now }).toISOString();
      }
    });
  }

  public enforceNumericFields(record: DataRecord): void {
    // Define numeric fields and their realistic ranges
    NUMERIC_FIELD_RANGES.forEach(({ field, min, max }) => {
      if (record[field] !== undefined && record[field] !== null) {
        // Convert to number if it's a string
        if (typeof record[field] === "string") {
          const parsed = parseFloat(record[field]);
          if (!isNaN(parsed)) {
            record[field] = parsed;
          } else {
            record[field] = faker.number.int({ min, max });
          }
        }

        // Ensure value is within realistic range
        if (typeof record[field] === "number") {
          if (record[field] < min || record[field] > max) {
            record[field] = faker.number.int({ min, max });
          }
        }
      }
    });
  }

  public enforceRealisticDefaults(record: DataRecord): void {
    // Apply defaults for missing fields
    Object.entries(DEFAULT_VALUES).forEach(([field, options]) => {
      if (
        record[field] === undefined ||
        record[field] === null ||
        record[field] === ""
      ) {
        // Handle both string and number arrays
        if (typeof options[0] === "number") {
          record[field] = faker.helpers.arrayElement(options as number[]);
        } else {
          record[field] = faker.helpers.arrayElement(options as string[]);
        }
      }
    });

    // Set realistic date defaults
    const now = new Date();
    const past = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000); // 1 year ago

    const dateFields = [
      "signup_date",
      "order_date",
      "appointment_date",
      "transaction_date",
      "created_at",
      "updated_at",
      "last_login",
      "trip_date",
      "billing_date",
    ];

    dateFields.forEach((field) => {
      if (
        record[field] === undefined ||
        record[field] === null ||
        record[field] === ""
      ) {
        record[field] = faker.date
          .between({ from: past, to: now })
          .toISOString();
      }
    });

    // Set realistic country defaults
    if (
      record["country"] === undefined ||
      record["country"] === null ||
      record["country"] === ""
    ) {
      record["country"] = faker.helpers.arrayElement(COUNTRIES);
    }

    // Set realistic currency defaults
    if (
      record["currency"] === undefined ||
      record["currency"] === null ||
      record["currency"] === ""
    ) {
      record["currency"] = "USD";
    }
  }

  public enforceHealthcareRules(record: DataRecord): void {
    // 1. insurance_payout is 0 if claim_status is 'Denied'
    if (
      Object.prototype.hasOwnProperty.call(record, "insurance_payout") &&
      record["claim_status"] === "Denied"
    ) {
      record["insurance_payout"] = 0;
    }
    // 2. claim_amount is always >= procedure_cost
    if (
      Object.prototype.hasOwnProperty.call(record, "claim_amount") &&
      Object.prototype.hasOwnProperty.call(record, "procedure_cost")
    ) {
      if (record["claim_amount"] < record["procedure_cost"]) {
        record["claim_amount"] =
          record["procedure_cost"] * (1.1 + Math.random() * 0.5); // 10-60% above cost
        record["claim_amount"] = Math.round(record["claim_amount"] * 100) / 100;
      }
    }
    // 3. discharge_date is always after admission_date
    if (
      Object.prototype.hasOwnProperty.call(record, "admission_date") &&
      Object.prototype.hasOwnProperty.call(record, "discharge_date")
    ) {
      const admit = new Date(record["admission_date"]);
      let discharge = new Date(record["discharge_date"]);
      if (discharge <= admit) {
        discharge = new Date(
          admit.getTime() +
            1000 * 60 * 60 * 24 * (1 + Math.floor(Math.random() * 5))
        );
        record["discharge_date"] = discharge.toISOString();
      }
    }
  }

  public removePreAggregatedValues(record: DataRecord): void {
    // Remove pre-aggregated values for analyst learning
    if (Object.prototype.hasOwnProperty.call(record, "acv")) {
      delete record["acv"];
    }
    if (Object.prototype.hasOwnProperty.call(record, "mrr")) {
      delete record["mrr"];
    }
  }
}
