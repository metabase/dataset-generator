import { faker } from "@faker-js/faker";

// Suppress faker deprecation warnings from LLM-generated specs
const originalWarn = console.warn;
console.warn = (...args) => {
  if (
    args[0] &&
    typeof args[0] === "string" &&
    args[0].includes("faker.") &&
    args[0].includes("is deprecated")
  ) {
    // Log once that we're using deprecated methods from LLM specs
    if (!(console as any)._deprecationLogged) {
      console.log(
        "[DataFactory] Note: Using some deprecated faker methods from LLM-generated specs. This is expected and safe."
      );
      (console as any)._deprecationLogged = true;
    }
    return; // Suppress the actual deprecation warning
  }
  originalWarn.apply(console, args);
};

// Set a consistent seed for reproducibility
faker.seed(42);

export { faker };

export function generateFallbackValue(
  method: string,
  namespace: string
): string | number | boolean {
  // Map of common faker methods to fallback values
  const fallbackMap: Record<string, string | number | boolean> = {
    // Person methods
    fullName: "John Doe",
    firstName: "John",
    lastName: "Doe",
    phoneNumber: "+1-555-0123",

    // Internet methods
    email: "user@example.com",
    userName: "user123",
    url: "https://example.com",

    // Commerce methods
    productName: "Generic Product",
    department: "General",
    price: 99.99,

    // Address methods
    city: "Anytown",
    state: "CA",
    country: "United States",
    streetAddress: "123 Main St",
    zipCode: "12345",

    // Company methods
    companyName: "Generic Corp",
    catchPhrase: "Quality and Innovation",

    // Date methods
    past: new Date().toISOString(),
    future: new Date(Date.now() + 86400000).toISOString(),

    // Number methods
    int: 42,
    float: 42.5,

    // String methods
    uuid: "00000000-0000-0000-0000-000000000000",
    alpha: "abcdef",
    numeric: "123456",
  };

  // Try to find a fallback based on method name
  if (fallbackMap[method]) {
    return fallbackMap[method];
  }

  // Generic fallbacks based on namespace
  switch (namespace) {
    case "person":
      return "Unknown Person";
    case "internet":
      return "unknown@example.com";
    case "commerce":
      return "Generic Item";
    case "address":
      return "Unknown Location";
    case "company":
      return "Unknown Company";
    case "date":
      return new Date().toISOString();
    case "number":
      return 0;
    case "string":
      return "unknown";
    default:
      return "unknown";
  }
}

export function generateFallbackForColumn(
  columnName: string
): string | number | boolean {
  // Generate realistic fallback data based on column name
  const lowerName = columnName.toLowerCase();

  // Only keep essential numeric fallbacks for metrics
  if (
    lowerName.includes("cost") ||
    lowerName.includes("amount") ||
    lowerName.includes("payout") ||
    lowerName.includes("price") ||
    lowerName.includes("total") ||
    lowerName.includes("payment") ||
    lowerName.includes("balance")
  ) {
    // Generic numeric fallback for any financial/metric field
    return parseFloat(faker.finance.amount({ min: 10, max: 1000 }));
  } else if (lowerName.includes("quantity")) {
    return faker.number.int({ min: 1, max: 5 });
  } else if (
    lowerName.includes("duration") ||
    lowerName.includes("hours") ||
    lowerName.includes("minutes")
  ) {
    return faker.number.int({ min: 15, max: 480 });
  }

  // Basic fallbacks for common field types (not business-specific)
  else if (lowerName.includes("name")) {
    return faker.person.fullName();
  } else if (lowerName.includes("email")) {
    return faker.internet.email();
  } else if (lowerName.includes("phone")) {
    return faker.phone.number();
  } else if (lowerName.includes("country")) {
    return faker.location.country();
  } else if (lowerName.includes("city")) {
    return faker.location.city();
  } else if (lowerName.includes("id")) {
    return faker.string.uuid();
  } else if (lowerName.includes("date")) {
    return faker.date.recent().toISOString();
  } else if (lowerName.includes("comment") || lowerName.includes("review")) {
    return faker.lorem.sentence();
  } else if (
    lowerName.includes("guests") ||
    lowerName.includes("guest_count")
  ) {
    return faker.number.int({ min: 1, max: 8 });
  } else if (
    lowerName.includes("nights") ||
    lowerName.includes("night_count")
  ) {
    return faker.number.int({ min: 1, max: 30 });
  } else if (lowerName.includes("room_id")) {
    return `ROOM-${faker.number.int({ min: 100, max: 999 })}`;
  } else if (
    lowerName.includes("check_out") ||
    lowerName.includes("checkout")
  ) {
    return faker.date.future({ years: 1 }).toISOString();
  } else if (
    lowerName.includes("room_rate") ||
    lowerName.includes("room_price")
  ) {
    return faker.number.int({ min: 100, max: 2000 });
  }

  // Education-specific realistic fields
  if (lowerName.includes("attendance_percentage")) {
    return Math.round((50 + Math.random() * 50) * 10) / 10; // 50–100%
  }
  if (
    lowerName.includes("assignment_score") ||
    lowerName.includes("exam_score")
  ) {
    return Math.round((50 + Math.random() * 50) * 10) / 10; // 50–100
  }
  if (lowerName === "grade") {
    const grades = ["A", "B", "C", "D", "F", "A-", "B+", "B-", "C+", "C-"];
    return faker.helpers.arrayElement(grades);
  }

  // For any other field, let the LLM handle it - this should rarely happen
  else {
    return faker.string.alphanumeric(8);
  }
}
