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

  public enforceHospitalityRules(record: DataRecord): void {
    // Fix check_out_date if it's a literal string instead of a date
    if (record.check_out_date && typeof record.check_out_date === "string") {
      if (
        record.check_out_date.includes("booking.booking_date.plusDays") ||
        record.check_out_date.includes("plusDays") ||
        !record.check_out_date.includes("T")
      ) {
        // Generate a realistic check-out date
        if (record.check_in_date) {
          const checkIn = new Date(record.check_in_date);
          const nights = faker.number.int({ min: 1, max: 7 });
          const checkOut = new Date(checkIn);
          checkOut.setDate(checkOut.getDate() + nights);
          record.check_out_date = checkOut.toISOString();
        } else {
          record.check_out_date = faker.date.future({ years: 1 }).toISOString();
        }
      }
    }

    // Business logic: Handle cancelled bookings and no-shows
    const eventType = record.event_type;

    // Fix inconsistent booking status based on event type
    if (eventType === "cancellation") {
      record.booking_status = "cancelled";
    } else if (eventType === "check_in") {
      record.booking_status = "checked_in";
    } else if (eventType === "check_out") {
      record.booking_status = "checked_out";
    } else if (eventType === "booking_created") {
      record.booking_status = "confirmed";
    }

    // Update the booking status variable after potential correction
    const correctedBookingStatus = record.booking_status;

    if (
      correctedBookingStatus === "cancelled" ||
      correctedBookingStatus === "no_show" ||
      eventType === "cancellation"
    ) {
      // Cancelled bookings should not have charges, reviews, or tax
      record.total_charge = 0;
      record.tax_amount = 0;
      record.ancillary_charges = 0;
      record.review_score = null;
      record.review_comment = null;
      record.check_out_date = null;
    } else if (
      correctedBookingStatus === "confirmed" &&
      eventType === "booking_created"
    ) {
      // Booking created but not yet checked in - no charges yet
      record.total_charge = 0;
      record.tax_amount = 0;
      record.ancillary_charges = 0;
      record.review_score = null;
      record.review_comment = null;
      record.check_out_date = null;
    } else {
      // Only charge for completed stays
      if (record.tax_amount !== undefined && record.room_rate !== undefined) {
        const roomRate =
          typeof record.room_rate === "number"
            ? record.room_rate
            : parseFloat(record.room_rate) || 0;
        const taxRate = faker.number.float({
          min: 0.08,
          max: 0.15,
          fractionDigits: 3,
        });
        record.tax_amount = Math.round(roomRate * taxRate * 100) / 100;
      }

      // Ensure check_out_date is after check_in_date for completed stays
      if (record.check_in_date && record.check_out_date) {
        const checkIn = new Date(record.check_in_date);
        const checkOut = new Date(record.check_out_date);

        if (checkOut <= checkIn) {
          // Add 1-7 days to check-in date
          const nights = faker.number.int({ min: 1, max: 7 });
          const newCheckOut = new Date(checkIn);
          newCheckOut.setDate(newCheckOut.getDate() + nights);
          record.check_out_date = newCheckOut.toISOString();
        }
      }

      // Ensure total_charge includes tax for completed stays
      if (record.room_rate && record.ancillary_charges && record.tax_amount) {
        const roomRate =
          typeof record.room_rate === "number"
            ? record.room_rate
            : parseFloat(record.room_rate) || 0;
        const ancillary =
          typeof record.ancillary_charges === "number"
            ? record.ancillary_charges
            : parseFloat(record.ancillary_charges) || 0;
        const tax =
          typeof record.tax_amount === "number"
            ? record.tax_amount
            : parseFloat(record.tax_amount) || 0;

        record.total_charge =
          Math.round((roomRate + ancillary + tax) * 100) / 100;
      }

      // Fix review comments to match review scores and be in English (only for completed stays)
      if (
        record.review_score !== undefined &&
        record.review_comment !== undefined &&
        record.review_score !== null
      ) {
        const score =
          typeof record.review_score === "number"
            ? record.review_score
            : parseInt(record.review_score) || 1;

        const positiveComments = [
          "Excellent service and beautiful room!",
          "Amazing stay, highly recommend!",
          "Perfect location and great amenities.",
          "Outstanding hospitality and clean facilities.",
          "Wonderful experience, will definitely return!",
          "Fantastic hotel with friendly staff.",
          "Loved every minute of our stay!",
          "Exceptional service and comfortable rooms.",
          "Best hotel experience ever!",
          "Absolutely perfect in every way!",
        ];

        const negativeComments = [
          "Poor service and dirty room.",
          "Terrible experience, would not recommend.",
          "Unfriendly staff and outdated facilities.",
          "Very disappointed with our stay.",
          "Awful service and uncomfortable beds.",
          "Worst hotel experience ever.",
          "Dirty room and rude staff.",
          "Complete waste of money.",
          "Horrible service and broken amenities.",
          "Never staying here again.",
        ];

        const neutralComments = [
          "Average stay, nothing special.",
          "Decent hotel but could be better.",
          "Okay experience, room was fine.",
          "Standard hotel with basic amenities.",
          "Acceptable but not exceptional.",
          "Fair service and average facilities.",
          "Mediocre stay, met expectations.",
          "Basic hotel with standard service.",
          "Nothing remarkable but not bad.",
          "Average experience overall.",
        ];

        if (score >= 4) {
          record.review_comment = faker.helpers.arrayElement(positiveComments);
        } else if (score <= 2) {
          record.review_comment = faker.helpers.arrayElement(negativeComments);
        } else {
          record.review_comment = faker.helpers.arrayElement(neutralComments);
        }
      }
    }

    // Ensure room_rate varies realistically
    if (record.room_rate !== undefined) {
      const currentRate =
        typeof record.room_rate === "number"
          ? record.room_rate
          : parseFloat(record.room_rate) || 0;
      if (currentRate === 150 || currentRate === 0) {
        // Generate realistic room rates based on room type
        const roomType = record.room_type || "standard";
        let minRate, maxRate;

        if (roomType === "standard" || roomType === "deluxe") {
          minRate = 100;
          maxRate = 300;
        } else if (roomType === "suite" || roomType === "presidential") {
          minRate = 500;
          maxRate = 2000;
        } else {
          minRate = 100;
          maxRate = 2000;
        }

        record.room_rate = faker.number.int({ min: minRate, max: maxRate });
      }
    }
  }

  public enforceRealEstateRules(record: DataRecord): void {
    const eventType = record.event_type;

    // Fix transaction_type and transaction_status based on event_type for consistency
    if (eventType === "property_sold" || eventType === "contract_signed") {
      record.transaction_type = "sale";
      record.transaction_status = "sold";
    } else if (eventType === "lease_agreement") {
      record.transaction_type = "rental";
      record.transaction_status = "rented";
    } else if (eventType === "property_listed") {
      // For listings, determine type based on existing fields or random
      if (record.monthly_rent && !record.listing_price) {
        record.transaction_type = "rental";
        record.transaction_status = "listed";
      } else if (record.listing_price && !record.monthly_rent) {
        record.transaction_type = "sale";
        record.transaction_status = "listed";
      } else {
        // Random assignment for ambiguous cases
        const isRental = faker.datatype.boolean();
        record.transaction_type = isRental ? "rental" : "sale";
        record.transaction_status = "listed";
      }
    } else if (eventType === "offer_made") {
      // Offers can be for either sales or rentals
      if (record.monthly_rent && !record.listing_price) {
        record.transaction_type = "rental";
        record.transaction_status = "under_contract";
      } else if (record.listing_price && !record.monthly_rent) {
        record.transaction_type = "sale";
        record.transaction_status = "under_contract";
      } else {
        const isRental = faker.datatype.boolean();
        record.transaction_type = isRental ? "rental" : "sale";
        record.transaction_status = "under_contract";
      }
    } else {
      // Default fallback - ensure consistency
      if (record.transaction_type === "sale") {
        record.transaction_status = faker.helpers.arrayElement([
          "listed",
          "under_contract",
          "sold",
        ]);
      } else if (record.transaction_type === "rental") {
        record.transaction_status = faker.helpers.arrayElement([
          "listed",
          "under_contract",
          "rented",
        ]);
      } else {
        // Random assignment if both are undefined
        const isRental = faker.datatype.boolean();
        record.transaction_type = isRental ? "rental" : "sale";
        record.transaction_status = isRental
          ? faker.helpers.arrayElement(["listed", "under_contract", "rented"])
          : faker.helpers.arrayElement(["listed", "under_contract", "sold"]);
      }
    }

    // Clean up fields based on transaction type for consistency
    if (record.transaction_type === "sale") {
      // Remove rental-specific fields for sales
      delete record.monthly_rent;
      delete record.security_deposit;
      delete record.lease_start_date;
      delete record.lease_end_date;

      // Ensure sale_price is set for sold properties
      if (record.transaction_status === "sold") {
        if (record.offer_amount && !record.sale_price) {
          // Sale price should be close to offer amount (realistic negotiation)
          const offerAmount =
            typeof record.offer_amount === "number"
              ? record.offer_amount
              : parseFloat(record.offer_amount) || 0;
          const variance = faker.number.float({
            min: 0.95, // 5% below offer
            max: 1.02, // 2% above offer
            fractionDigits: 3,
          });
          record.sale_price = Math.round(offerAmount * variance);
        } else if (record.listing_price && !record.sale_price) {
          // Fallback to listing price if no offer amount
          const listingPrice =
            typeof record.listing_price === "number"
              ? record.listing_price
              : parseFloat(record.listing_price) || 0;
          const variance = faker.number.float({
            min: 0.9,
            max: 1.1,
            fractionDigits: 3,
          });
          record.sale_price = Math.round(listingPrice * variance);
        }
      }

      // Ensure offer_amount and sale_price are realistic relative to each other
      if (record.offer_amount && record.sale_price) {
        const offerAmount =
          typeof record.offer_amount === "number"
            ? record.offer_amount
            : parseFloat(record.offer_amount) || 0;
        const salePrice =
          typeof record.sale_price === "number"
            ? record.sale_price
            : parseFloat(record.sale_price) || 0;

        // Check if the difference is unrealistic (more than 10% difference)
        const difference = Math.abs(offerAmount - salePrice);
        const averagePrice = (offerAmount + salePrice) / 2;
        const percentDifference = difference / averagePrice;

        if (percentDifference > 0.1) {
          // If difference is too large, adjust sale_price to be close to offer_amount
          const variance = faker.number.float({
            min: 0.95, // 5% below offer
            max: 1.02, // 2% above offer
            fractionDigits: 3,
          });
          record.sale_price = Math.round(offerAmount * variance);
        }
      }
    } else if (record.transaction_type === "rental") {
      // Remove sale-specific fields for rentals
      delete record.sale_price;
      delete record.offer_amount;
      delete record.closing_date;

      // Ensure rental fields are set for rental transactions
      if (!record.monthly_rent) {
        record.monthly_rent = faker.number.int({ min: 1000, max: 10000 });
      }

      // Set security_deposit (typically 1-2 months rent)
      if (!record.security_deposit) {
        const rent =
          typeof record.monthly_rent === "number"
            ? record.monthly_rent
            : parseFloat(record.monthly_rent) || 1000;
        const depositMonths = faker.number.float({
          min: 1,
          max: 2,
          fractionDigits: 1,
        });
        record.security_deposit = Math.round(rent * depositMonths);
      }
    }

    // Ensure closing_date is after contract_date (only for sales)
    if (
      record.transaction_type === "sale" &&
      record.contract_date &&
      record.closing_date
    ) {
      const contractDate = new Date(record.contract_date);
      const closingDate = new Date(record.closing_date);

      if (closingDate <= contractDate) {
        // Add 30-90 days to contract date
        const days = faker.number.int({ min: 30, max: 90 });
        const newClosingDate = new Date(contractDate);
        newClosingDate.setDate(newClosingDate.getDate() + days);
        record.closing_date = newClosingDate.toISOString();
      }
    }

    // Ensure lease_end_date is after lease_start_date (only for rentals)
    if (
      record.transaction_type === "rental" &&
      record.lease_start_date &&
      record.lease_end_date
    ) {
      const startDate = new Date(record.lease_start_date);
      const endDate = new Date(record.lease_end_date);

      if (endDate <= startDate) {
        // Add 6-24 months to start date
        const months = faker.number.int({ min: 6, max: 24 });
        const newEndDate = new Date(startDate);
        newEndDate.setMonth(newEndDate.getMonth() + months);
        record.lease_end_date = newEndDate.toISOString();
      }
    }
  }
}
