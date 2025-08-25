import { faker } from "@/lib/utils/faker-utils";
import { DataRecord } from "@/lib/types/data-types";

export class SaaSEnforcer {
  public enforceSaaSRules(record: DataRecord): void {
    // Ensure all SaaS events have required fields
    if (record["event_type"]) {
      // Ensure user_id is always present for SaaS events
      if (!record["user_id"]) {
        record["user_id"] = `usr_${faker.string.uuid()}`;
      }

      // Ensure company_id is present for B2B events
      if (!record["company_id"] && record["event_type"] !== "signup") {
        record["company_id"] = `comp_${faker.string.uuid()}`;
      }

      // Ensure user_role is present
      if (!record["user_role"]) {
        const roles = ["admin", "manager", "user", "viewer"];
        record["user_role"] = faker.helpers.arrayElement(roles);
      }

      // Ensure subscription_plan is present for subscription-related events
      const subscriptionEvents = [
        "signup",
        "trial_started",
        "subscription_created",
        "upgrade",
        "downgrade",
        "contract_signed",
        "contract_renewal",
      ];
      if (
        subscriptionEvents.includes(record["event_type"]) &&
        !record["subscription_plan"]
      ) {
        const plans = ["Free", "Basic", "Pro", "Enterprise"];
        record["subscription_plan"] = faker.helpers.arrayElement(plans);
      }

      // Ensure billing_cycle is present for subscription events
      if (
        subscriptionEvents.includes(record["event_type"]) &&
        !record["billing_cycle"]
      ) {
        const cycles = ["monthly", "annual"];
        record["billing_cycle"] = faker.helpers.arrayElement(cycles);
      }

      // Ensure plan_price is present for subscription events
      if (
        subscriptionEvents.includes(record["event_type"]) &&
        !record["plan_price"]
      ) {
        const prices = [0, 99, 299, 999];
        record["plan_price"] = faker.helpers.arrayElement(prices);
      }

      // Continue with existing logic for specific event types
      if (
        [
          "signup",
          "trial_started",
          "subscription_created",
          "login",
          "feature_usage",
          "api_call",
          "upgrade",
          "downgrade",
          "cancellation",
          "demo_requested",
          "contract_signed",
          "user_invited",
          "admin_action",
          "support_ticket",
          "contract_renewal",
          "content_created",
          "social_share",
          "referral_sent",
        ].includes(record["event_type"])
      ) {
        // Realistic signup_date
        if (Object.prototype.hasOwnProperty.call(record, "signup_date")) {
          const now = new Date();
          const past = new Date(
            now.getFullYear() - 2,
            now.getMonth(),
            now.getDate()
          );
          record["signup_date"] = faker.date
            .between({ from: past, to: now })
            .toISOString();
        }

        // Country diversity
        if (Object.prototype.hasOwnProperty.call(record, "country")) {
          const countries = [
            "United States",
            "Canada",
            "United Kingdom",
            "Germany",
            "Australia",
            "India",
            "Brazil",
            "France",
            "Japan",
            "South Africa",
          ];
          record["country"] = faker.helpers.arrayElement(countries);
        }

        // B2B-specific fields
        if (Object.prototype.hasOwnProperty.call(record, "contract_value")) {
          const plan = record["subscription_plan"] || record["plan"];
          if (plan === "Starter") {
            record["contract_value"] = 1188; // 99 * 12
          } else if (plan === "Professional") {
            record["contract_value"] = 3588; // 299 * 12
          } else if (plan === "Enterprise") {
            record["contract_value"] = 11988; // 999 * 12
          } else if (plan === "Custom") {
            record["contract_value"] = 60000; // 5000 * 12
          }
        }

        // B2C-specific fields
        if (Object.prototype.hasOwnProperty.call(record, "device_type")) {
          const devices = ["mobile", "desktop", "tablet"];
          record["device_type"] = faker.helpers.arrayElement(devices);
        }
        if (Object.prototype.hasOwnProperty.call(record, "user_age")) {
          record["user_age"] = faker.number.int({ min: 18, max: 65 });
        }
      }
    }

    // Set realistic session durations based on event type
    if (record.session_duration_minutes !== undefined && record.event_type) {
      const eventSessionRanges = {
        login: { min: 5, max: 30 },
        logout: { min: 1, max: 5 },
        api_call: { min: 1, max: 10 },
        feature_usage: { min: 15, max: 120 },
        admin_action: { min: 30, max: 180 },
        support_ticket: { min: 20, max: 90 },
        user_invited: { min: 5, max: 15 },
        demo_requested: { min: 10, max: 30 },
        contract_signed: { min: 60, max: 240 },
        trial_started: { min: 15, max: 45 },
        subscription_created: { min: 30, max: 90 },
        upgrade: { min: 20, max: 60 },
        downgrade: { min: 10, max: 30 },
        cancellation: { min: 15, max: 45 },
        contract_renewal: { min: 30, max: 90 },
        churn: { min: 5, max: 15 },
      };

      const range =
        eventSessionRanges[
          record.event_type as keyof typeof eventSessionRanges
        ];
      if (range) {
        record.session_duration_minutes =
          Math.floor(Math.random() * (range.max - range.min + 1)) + range.min;
      } else {
        // Default range for unknown events
        record.session_duration_minutes = Math.floor(Math.random() * 25) + 5; // 5-30 minutes
      }
    }
  }

  public fixSaaSPricing(record: DataRecord): void {
    // Only set payment_amount for actual billing events
    const billingEvents = [
      "subscription_created",
      "contract_renewal",
      "churn",
      "upgrade",
      "downgrade",
      "payment_processed",
      "billing_cycle",
    ];

    if (record.event_type && billingEvents.includes(record.event_type)) {
      // For billing events, use plan_price if available, otherwise calculate realistic amount
      if (record.plan_price && record.plan_price > 0) {
        record.payment_amount = record.plan_price;
      } else {
        record.payment_amount = Math.floor(Math.random() * 900) + 100; // $100-$999 fallback
      }
    } else {
      // For non-billing events, set to 0
      record.payment_amount = 0;
    }

    // Ensure payment_amount is numeric
    if (record.payment_amount !== undefined && record.payment_amount !== null) {
      if (typeof record.payment_amount === "string") {
        const parsed = parseFloat(record.payment_amount);
        record.payment_amount = isNaN(parsed) ? 0 : parsed;
      }
    }
  }
}
