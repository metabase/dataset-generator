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

import { faker } from "@faker-js/faker";

// Set a consistent seed for reproducibility
faker.seed(42);

// =================================================================
// TYPE DEFINITIONS FOR THE DATA GENERATION SPEC
// =================================================================

type AttributeType = "id" | "faker" | "choice" | "conditional";
type EventType = "initial" | "recurring" | "random" | "churn";
type SourceType =
  | "id"
  | "timestamp"
  | "reference"
  | "event_name"
  | "lookup"
  | "literal"
  | "choice"
  | "conditional";

interface FrequencySpec {
  on: string; // e.g., "billing_cycle" or "user.subscription_type"
}

interface AttributeSpec {
  type: AttributeType;
  prefix?: string; // for id
  method?: string; // for faker, e.g., "internet.email"
  values?: (string | number)[]; // for choice
  weights?: number[]; // for choice
  options?: (string | number)[]; // for choice (LLM sometimes uses this instead of values)
  choices?: (string | number)[]; // for choice (LLM sometimes uses this instead of values)
  on?: string[]; // for conditional
  cases?: Record<string, any>; // for conditional
}

interface EntitySpec {
  name: string;
  attributes: Record<string, AttributeSpec>;
}

interface ColumnSourceSpec {
  type: SourceType;
  prefix?: string; // for id
  entity?: string; // for reference
  attribute?: string; // for reference
  from?: string; // for lookup
  value?: any; // for literal
  values?: (string | number)[]; // for choice
  weights?: number[]; // for choice
  jitter_days?: number; // for timestamp jitter
}

interface EventStreamColumnSpec {
  name: string;
  source: ColumnSourceSpec;
}

interface EventStreamTableSpec {
  name: string;
  columns: EventStreamColumnSpec[];
}

interface EventSpec {
  type: EventType;
  frequency?: FrequencySpec; // for recurring
  avg_per_entity_per_month?: number; // for random
  avg_per_entity?: number; // for random (sometimes used by LLM)
  monthly_rate?: number; // for churn
  outputs: Record<string, any>;
}

interface SimulationSpec {
  initial_event: string;
  events: Record<string, EventSpec>;
}

interface DataSpec {
  entities: EntitySpec[];
  event_stream_table: EventStreamTableSpec;
  simulation: SimulationSpec;
}

// =================================================================
// DATA FACTORY IMPLEMENTATION
// =================================================================

export class DataFactory {
  private spec: DataSpec;

  constructor(spec: DataSpec) {
    this.spec = spec;
    this.validateSpec(spec);
  }

  private validateSpec(spec: DataSpec): void {
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

  public generate(rowCount: number, timeRange: string[], schemaType?: string) {
    if (process.env.DEBUG) {
      // console.log(
      //   `[DataFactory] Generating ${rowCount} rows for time range: ${timeRange}`
      // );
    }

    // Generate entities
    const generatedEntities = this.generateEntities(rowCount);

    // Simulate events
    const eventStream = this.simulateEvents(
      generatedEntities,
      rowCount,
      timeRange
    );

    // Format as table
    const table = this.formatAsTable(eventStream);

    // Generate dimension tables for star schema
    if (schemaType === "Star Schema") {
      const dimensionTables = this.generateDimensionTables(generatedEntities);
      return {
        tables: [table, ...dimensionTables],
        spec: this.spec,
      };
    }

    return {
      tables: [table],
      spec: this.spec,
    };
  }

  private generateEntities(rowCount: number): Record<string, any[]> {
    const generatedEntities: Record<string, any[]> = {};

    this.spec.entities.forEach((entitySpec) => {
      // Dynamically adjust entity count based on row count for efficiency.
      // Simple heuristic: 1 entity per 10 rows, with a minimum of 5 and max of 200.
      const entityCount = Math.min(100, Math.max(10, Math.ceil(rowCount / 10)));
      const entities = [];

      for (let i = 0; i < entityCount; i++) {
        const entityInstance: Record<string, any> = {};
        for (const attrName in entitySpec.attributes) {
          const attrSpec = entitySpec.attributes[attrName];
          entityInstance[attrName] = this.resolveAttribute(
            attrSpec,
            entityInstance
          );
        }
        entities.push(entityInstance);
      }
      generatedEntities[entitySpec.name] = entities;
    });

    return generatedEntities;
  }

  private resolveAttribute(
    spec: AttributeSpec,
    context: Record<string, any>
  ): any {
    switch (spec.type) {
      case "id":
        return `${spec.prefix || ""}${faker.string.uuid()}`;
      case "faker":
        // Handle case where LLM puts real values in method instead of faker method
        if (spec.method && Array.isArray(spec.method)) {
          // This is actually a choice field, not a faker field
          const choiceValues = spec.method;
          const choiceWeights =
            spec.weights || choiceValues.map(() => 1 / choiceValues.length);
          const weightedOptions = choiceValues.map((value, index) => ({
            value,
            weight: choiceWeights[index],
          }));
          return faker.helpers.weightedArrayElement(weightedOptions);
        }

        const [namespace, method] = spec.method!.split(".");
        try {
          if (
            !(faker as any)[namespace] ||
            !(faker as any)[namespace][method]
          ) {
            if (process.env.DEBUG) {
              console.warn(
                `[DataFactory] Invalid faker method: ${spec.method}. Available namespaces:`,
                Object.keys(faker)
              );
            }
            return this.generateFallbackValue(method, namespace);
          }
          return (faker as any)[namespace][method]();
        } catch (error) {
          if (process.env.DEBUG) {
            console.warn(
              `[DataFactory] Error calling faker method ${spec.method}:`,
              error
            );
          }
          return this.generateFallbackValue(method, namespace);
        }
      case "choice": {
        // Handle case where LLM puts real values in method instead of values
        let choiceValues: (string | number)[] = spec.values || [];
        let choiceWeights: number[] = spec.weights || [];

        // Check if method contains the real values (LLM format)
        if (spec.method && Array.isArray(spec.method)) {
          choiceValues = spec.method;
          choiceWeights =
            spec.weights || choiceValues.map(() => 1 / choiceValues.length);
        } else if (spec.options && Array.isArray(spec.options)) {
          // Check if options contains the real values
          choiceValues = spec.options;
          choiceWeights =
            spec.weights || choiceValues.map(() => 1 / choiceValues.length);
        } else if (spec.choices && Array.isArray(spec.choices)) {
          // Check if choices contains the real values
          choiceValues = spec.choices;
          choiceWeights =
            spec.weights || choiceValues.map(() => 1 / choiceValues.length);
        } else if (
          !choiceValues.length ||
          !choiceWeights.length ||
          choiceValues.length !== choiceWeights.length
        ) {
          if (process.env.DEBUG) {
            console.warn(
              `[DataFactory] Choice attribute missing values/weights, using fallback`
            );
          }
          // Provide fallback values
          choiceValues = ["Option A", "Option B", "Option C"];
          choiceWeights = [0.4, 0.35, 0.25];
        }

        // Ensure we have valid values and weights
        if (
          !choiceValues.length ||
          !choiceWeights.length ||
          choiceValues.length !== choiceWeights.length
        ) {
          choiceValues = ["Option A", "Option B", "Option C"];
          choiceWeights = [0.4, 0.35, 0.25];
        }

        const weightedOptions = choiceValues.map((value, index) => ({
          value,
          weight: choiceWeights[index],
        }));
        return faker.helpers.weightedArrayElement(weightedOptions);
      }
      case "conditional":
        if (!spec.on || !spec.cases) {
          if (process.env.DEBUG) {
            console.warn(
              `[DataFactory] Missing 'on' or 'cases' for conditional attribute`
            );
          }
          return spec.cases?.["default"] ?? 0;
        }
        // Try to resolve the value for the current context
        const key = spec.on
          .map((attr) => `${attr}=${context[attr]}`)
          .sort()
          .join(" & ");
        const val =
          spec.cases[key] ??
          spec.cases[context[spec.on[0]]] ??
          spec.cases["default"];
        if (typeof val === "string") {
          // Handle faker method strings
          if (val.startsWith("faker.")) {
            return this.generateFallbackValue(val, "faker");
          } else {
            return val;
          }
        } else if (typeof val === "object" && val !== null) {
          // If it's a nested faker spec, fallback to a random int
          return faker.number.int({ min: 10, max: 1000 });
        } else {
          return val ?? 0;
        }
      // Other types will be implemented as needed
      default:
        return null;
    }
  }

  private simulateEvents(
    entities: Record<string, any[]>,
    rowCount: number,
    timeRange: string[]
  ): any[] {
    const eventStream: any[] = [];
    const mainEntityName = this.spec.entities[0].name;
    const mainEntityList = entities[mainEntityName];

    // Simulation parameters from user input
    const startYear =
      timeRange.length > 0
        ? parseInt(timeRange[0], 10)
        : new Date().getFullYear();
    const simStartDate = new Date(Date.UTC(startYear, 0, 1));
    const simDurationDays =
      timeRange.length > 1
        ? (parseInt(timeRange[1], 10) - startYear + 1) * 365
        : 365;

    // Create a "birth date" for each entity to spread them out over time
    const simEndDate = new Date(
      simStartDate.getTime() + simDurationDays * 24 * 60 * 60 * 1000
    );
    mainEntityList.forEach((entity) => {
      entity._createdAt = faker.date.between({
        from: simStartDate,
        to: simEndDate,
      });
    });

    for (let day = 0; day < simDurationDays; day++) {
      if (eventStream.length >= rowCount) break;

      const currentDate = new Date(
        simStartDate.getTime() + day * 24 * 60 * 60 * 1000
      );

      for (const entity of mainEntityList) {
        if (eventStream.length >= rowCount) break;

        const entityCreationDay = new Date(entity._createdAt);
        entityCreationDay.setUTCHours(0, 0, 0, 0);

        // Skip entities that haven't been "born" yet.
        if (currentDate < entityCreationDay) {
          continue;
        }

        // On the day the entity is created, trigger the initial event
        if (currentDate.getTime() === entityCreationDay.getTime()) {
          const initialEventName = this.spec.simulation.initial_event;
          const eventRecord = this.createEventRecord(
            initialEventName,
            entity,
            currentDate,
            entities
          );
          if (eventRecord) {
            eventStream.push(eventRecord);
            entity._isActive = true; // Mark as active
          }
        }

        // Skip inactive entities for other events
        if (!entity._isActive) continue;

        // --- Event Simulation Logic ---
        for (const eventName in this.spec.simulation.events) {
          if (eventStream.length >= rowCount) break;

          const eventSpec = this.spec.simulation.events[eventName];
          const eventRecord = this.simulateEventByType(
            eventName,
            eventSpec,
            entity,
            currentDate,
            entities
          );
          if (eventRecord) {
            eventStream.push(eventRecord);
          }
        }
      }
    }

    return eventStream.slice(0, rowCount);
  }

  private simulateEventByType(
    eventName: string,
    eventSpec: EventSpec,
    entity: any,
    currentDate: Date,
    entities: Record<string, any[]>
  ): any | null {
    switch (eventSpec.type) {
      case "recurring":
        return this.simulateRecurringEvent(
          eventName,
          eventSpec,
          entity,
          currentDate,
          entities
        );
      case "random":
        return this.simulateRandomEvent(
          eventName,
          eventSpec,
          entity,
          currentDate,
          entities
        );
      case "churn":
        return this.simulateChurnEvent(
          eventName,
          eventSpec,
          entity,
          currentDate,
          entities
        );
      default:
        if (process.env.DEBUG) {
          console.warn(
            `[DataFactory] Unknown event type: ${eventSpec.type} for event ${eventName}`
          );
        }
        return null;
    }
  }

  private simulateRecurringEvent(
    eventName: string,
    eventSpec: EventSpec,
    entity: any,
    currentDate: Date,
    entities: Record<string, any[]>
  ): any | null {
    if (!eventSpec.frequency?.on) {
      if (process.env.DEBUG) {
        console.warn(
          `[DataFactory] Missing frequency field for recurring event ${eventName}`
        );
      }
      return null;
    }

    const cycle = entity[eventSpec.frequency.on.split(".")[1]]; // e.g., 'monthly' or 'annual'
    const dayOfCreation = new Date(entity._createdAt).getUTCDate();

    if (cycle === "monthly" && currentDate.getUTCDate() === dayOfCreation) {
      return this.createEventRecord(eventName, entity, currentDate, entities);
    } else if (
      cycle === "annual" &&
      currentDate.getUTCMonth() === new Date(entity._createdAt).getUTCMonth() &&
      currentDate.getUTCDate() === dayOfCreation
    ) {
      return this.createEventRecord(eventName, entity, currentDate, entities);
    }

    return null;
  }

  private simulateRandomEvent(
    eventName: string,
    eventSpec: EventSpec,
    entity: any,
    currentDate: Date,
    entities: Record<string, any[]>
  ): any | null {
    const monthlyAvg =
      eventSpec.avg_per_entity_per_month || eventSpec.avg_per_entity;
    if (!monthlyAvg) {
      if (process.env.DEBUG) {
        console.warn(
          `[DataFactory] Missing avg_per_entity_per_month for random event ${eventName}`
        );
      }
      return null;
    }

    const dailyProb = monthlyAvg / 30;
    if (Math.random() < dailyProb) {
      return this.createEventRecord(eventName, entity, currentDate, entities);
    }

    return null;
  }

  private simulateChurnEvent(
    eventName: string,
    eventSpec: EventSpec,
    entity: any,
    currentDate: Date,
    entities: Record<string, any[]>
  ): any | null {
    if (!eventSpec.monthly_rate) {
      if (process.env.DEBUG) {
        console.warn(
          `[DataFactory] Missing monthly_rate for churn event ${eventName}`
        );
      }
      return null;
    }

    const dailyChurnProb = eventSpec.monthly_rate / 30;
    if (Math.random() < dailyChurnProb) {
      const eventRecord = this.createEventRecord(
        eventName,
        entity,
        currentDate,
        entities
      );
      entity._isActive = false; // Mark as inactive
      return eventRecord;
    }

    return null;
  }

  private createEventRecord(
    eventName: string,
    entity: any,
    timestamp: Date,
    entities: Record<string, any[]>
  ): any {
    const eventSpec = this.spec.simulation.events[eventName];
    if (!eventSpec) return null;

    const record: Record<string, any> = {};

    this.spec.event_stream_table.columns.forEach((colSpec) => {
      // Special case: only fill denied_reason if claim_status is 'Denied'
      if (
        colSpec.name === "denied_reason" &&
        record["claim_status"] !== "Denied"
      ) {
        record[colSpec.name] = "";
        return;
      }
      const source = colSpec.source;
      switch (source.type) {
        case "id":
          record[colSpec.name] = `${source.prefix || ""}${faker.string.uuid()}`;
          break;
        case "timestamp":
          const baseDate = new Date(timestamp);
          baseDate.setUTCHours(0, 0, 0, 0);
          const randomMs = Math.floor(Math.random() * 24 * 60 * 60 * 1000);
          let eventDate = new Date(baseDate.getTime() + randomMs);

          // Add jitter if specified
          if (source.jitter_days) {
            const jitterMs =
              (Math.random() - 0.5) *
              2 *
              source.jitter_days *
              24 *
              60 *
              60 *
              1000;
            eventDate = new Date(eventDate.getTime() + jitterMs);
          }

          record[colSpec.name] = eventDate.toISOString();
          break;
        case "choice":
          if (
            source.values &&
            source.weights &&
            source.values.length === source.weights.length
          ) {
            const weightedOptions = source.values.map((value, idx) => ({
              value,
              weight: source.weights![idx],
            }));
            record[colSpec.name] =
              faker.helpers.weightedArrayElement(weightedOptions);
          } else {
            if (process.env.DEBUG) {
              console.warn(
                `[DataFactory] Missing values/weights for choice column ${colSpec.name}, using fallback`
              );
            }
            record[colSpec.name] = this.generateFallbackForColumn(
              colSpec.name
            );
          }
          break;
        case "reference":
          // Look up the correct entity for the reference
          const refEntityName = source.entity;
          const refAttribute = source.attribute!;
          let refValue = null;
          if (
            refEntityName &&
            entities[refEntityName] &&
            entities[refEntityName].length > 0
          ) {
            // Pick a random entity instance for the reference
            const refInstance = faker.helpers.arrayElement(
              entities[refEntityName]
            );
            refValue = refInstance[refAttribute];
          }
          if (refValue === null || refValue === undefined || refValue === "") {
            if (process.env.DEBUG) {
              console.warn(
                `[DataFactory] Missing reference for ${colSpec.name}: ${refEntityName}.${refAttribute}`
              );
            }
            record[colSpec.name] = this.generateFallbackForColumn(
              colSpec.name,
            );
          } else {
            record[colSpec.name] = refValue;
          }
          break;
        case "event_name":
          record[colSpec.name] = eventName;
          break;
        case "lookup":
          const outputSpec = eventSpec.outputs[colSpec.name];
          if (outputSpec) {
            if (outputSpec.type === "reference") {
              const refEntityName = outputSpec.entity;
              const refAttribute = outputSpec.attribute;
              let refValue = null;
              if (
                refEntityName &&
                entities[refEntityName] &&
                entities[refEntityName].length > 0
              ) {
                const refInstance = faker.helpers.arrayElement(
                  entities[refEntityName]
                );
                refValue = refInstance[refAttribute];
              }
              if (
                refValue === null ||
                refValue === undefined ||
                refValue === ""
              ) {
                record[colSpec.name] = this.generateFallbackForColumn(
                  colSpec.name
                );
              } else {
                record[colSpec.name] = refValue;
              }
            } else if (outputSpec.type === "literal") {
              record[colSpec.name] = outputSpec.value;
            } else {
              record[colSpec.name] = this.generateFallbackForColumn(
                colSpec.name
              );
            }
          } else {
            record[colSpec.name] = this.generateFallbackForColumn(
              colSpec.name
            );
          }
          break;
        case "literal":
          if (typeof source.value === "string") {
            const priceMatch = source.value.match?.(/price\((\d+),\s*(\d+)\)/);
            const intMatch = source.value.match?.(/int\((\d+),\s*(\d+)\)/);
            if (priceMatch) {
              record[colSpec.name] = faker.number.int({
                min: Number(priceMatch[1]),
                max: Number(priceMatch[2]),
              });
            } else if (intMatch) {
              record[colSpec.name] = faker.number.int({
                min: Number(intMatch[1]),
                max: Number(intMatch[2]),
              });
            } else if (!isNaN(Number(source.value))) {
              record[colSpec.name] = Number(source.value);
            } else {
              record[colSpec.name] = source.value;
            }
          } else if (
            typeof source.value === "object" &&
            source.value !== null
          ) {
            record[colSpec.name] = faker.number.int({ min: 10, max: 1000 });
          } else {
            record[colSpec.name] = source.value ?? 0;
          }
          break;
        case "conditional":
          if (typeof source.value === "string") {
            const priceMatch = source.value.match?.(/price\((\d+),\s*(\d+)\)/);
            const intMatch = source.value.match?.(/int\((\d+),\s*(\d+)\)/);
            if (priceMatch) {
              record[colSpec.name] = faker.number.int({
                min: Number(priceMatch[1]),
                max: Number(priceMatch[2]),
              });
            } else if (intMatch) {
              record[colSpec.name] = faker.number.int({
                min: Number(intMatch[1]),
                max: Number(intMatch[2]),
              });
            } else if (!isNaN(Number(source.value))) {
              record[colSpec.name] = Number(source.value);
            } else {
              record[colSpec.name] = source.value;
            }
          } else if (
            typeof source.value === "object" &&
            source.value !== null
          ) {
            record[colSpec.name] = faker.number.int({ min: 10, max: 1000 });
          } else {
            record[colSpec.name] = source.value ?? 0;
          }
          break;
        default:
          record[colSpec.name] = this.generateFallbackForColumn(
            colSpec.name
          );
      }
    });

    // Sanitize placeholder values and enforce data quality
    this.sanitizePlaceholderValues(record);
    this.enforceNumericFields(record);
    this.enforceRealisticDefaults(record);
    this.fixPlanPricing(record);

    // --- Healthcare-specific realism enforcement ---
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
    // --- End healthcare realism enforcement ---

    // --- SaaS advanced realism enforcement (B2B & B2C) ---
    if (
      record["event_type"] &&
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
      // 2. Unique user_id
      if (Object.prototype.hasOwnProperty.call(record, "user_id")) {
        record["user_id"] = `usr_${faker.string.uuid()}`;
      }

      // 3. Realistic signup_date
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

      // 4. Country diversity
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

      // 5. B2B-specific fields
      if (Object.prototype.hasOwnProperty.call(record, "company_id")) {
        record["company_id"] = `comp_${faker.string.uuid()}`;
      }
      if (Object.prototype.hasOwnProperty.call(record, "user_role")) {
        const roles = ["admin", "manager", "user", "viewer"];
        record["user_role"] = faker.helpers.arrayElement(roles);
      }
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

      // 6. B2C-specific fields
      if (Object.prototype.hasOwnProperty.call(record, "device_type")) {
        const devices = ["mobile", "desktop", "tablet"];
        record["device_type"] = faker.helpers.arrayElement(devices);
      }
      if (Object.prototype.hasOwnProperty.call(record, "user_age")) {
        record["user_age"] = faker.number.int({ min: 18, max: 65 });
      }
    }

    // --- Ecommerce advanced realism enforcement ---
    if (
      record["event_type"] &&
      [
        "view_item",
        "add_to_cart",
        "start_checkout",
        "purchase",
        "refund",
      ].includes(record["event_type"])
    ) {
      // 1. price logic
      if (Object.prototype.hasOwnProperty.call(record, "price")) {
        if (record["event_type"] === "purchase") {
          record["price"] = Math.round((10 + Math.random() * 990) * 100) / 100; // $10–$1,000
        } else {
          record["price"] = 0;
        }
      }
      // 2. shipping_cost logic
      if (Object.prototype.hasOwnProperty.call(record, "shipping_cost")) {
        if (record["event_type"] === "purchase") {
          record["shipping_cost"] =
            Math.round((2 + Math.random() * 48) * 100) / 100; // $2–$50
        } else {
          record["shipping_cost"] = 0;
        }
      }
      // 3. discount_amount logic
      if (Object.prototype.hasOwnProperty.call(record, "discount_amount")) {
        if (record["event_type"] === "purchase" && Math.random() < 0.3) {
          record["discount_amount"] =
            Math.round((1 + Math.random() * 49) * 100) / 100; // $1–$50
        } else {
          record["discount_amount"] = 0;
        }
      }
      // 4. Unique order_id
      if (Object.prototype.hasOwnProperty.call(record, "order_id")) {
        record["order_id"] = `ord_${faker.string.uuid()}`;
      }
      // 5. Realistic order_date
      if (Object.prototype.hasOwnProperty.call(record, "order_date")) {
        const now = new Date();
        const past = new Date(
          now.getFullYear() - 2,
          now.getMonth(),
          now.getDate()
        );
        record["order_date"] = faker.date
          .between({ from: past, to: now })
          .toISOString();
      }
    }

    // --- Education advanced realism enforcement ---
    if (
      record["event_type"] &&
      [
        "enrollment",
        "grade_assigned",
        "attendance",
        "assignment_submitted",
        "exam_taken",
      ].includes(record["event_type"])
    ) {
      // 1. grade logic
      if (
        Object.prototype.hasOwnProperty.call(record, "grade") &&
        record["event_type"] !== "grade_assigned"
      ) {
        record["grade"] = "";
      }
      // 2. assignment_score logic
      if (
        Object.prototype.hasOwnProperty.call(record, "assignment_score") &&
        record["event_type"] !== "assignment_submitted"
      ) {
        record["assignment_score"] = null;
      }
      // 3. exam_score logic
      if (
        Object.prototype.hasOwnProperty.call(record, "exam_score") &&
        record["event_type"] !== "exam_taken"
      ) {
        record["exam_score"] = null;
      }
      // 4. attendance_percentage logic
      if (
        Object.prototype.hasOwnProperty.call(record, "attendance_percentage") &&
        record["event_type"] !== "attendance"
      ) {
        record["attendance_percentage"] = null;
      }
      // 5. Unique student_id
      if (Object.prototype.hasOwnProperty.call(record, "student_id")) {
        record["student_id"] = `stu_${faker.string.uuid()}`;
      }
      // 6. Realistic enrollment_date
      if (Object.prototype.hasOwnProperty.call(record, "enrollment_date")) {
        const now = new Date();
        const past = new Date(
          now.getFullYear() - 4,
          now.getMonth(),
          now.getDate()
        );
        record["enrollment_date"] = faker.date
          .between({ from: past, to: now })
          .toISOString();
      }
    }

    // --- Retail advanced realism enforcement ---
    if (
      record["event_type"] &&
      ["browse", "add_to_cart", "purchase", "return", "review"].includes(
        record["event_type"]
      )
    ) {
      // 1. quantity logic
      if (Object.prototype.hasOwnProperty.call(record, "quantity")) {
        if (record["event_type"] === "purchase") {
          record["quantity"] = Math.floor(1 + Math.random() * 5); // 1–5
        } else {
          record["quantity"] = 0;
        }
      }
      // 2. discount_amount logic (calculate before total_amount)
      if (Object.prototype.hasOwnProperty.call(record, "discount_amount")) {
        if (record["event_type"] === "purchase" && Math.random() < 0.3) {
          // 30% chance of discount, max 20% of base total
          const baseTotal = record["unit_price"] * record["quantity"];
          record["discount_amount"] =
            Math.round(baseTotal * (0.05 + Math.random() * 0.15) * 100) / 100; // 5–20%
        } else {
          record["discount_amount"] = 0;
        }
      }
      // 3. total_amount logic
      if (Object.prototype.hasOwnProperty.call(record, "total_amount")) {
        if (record["event_type"] === "purchase") {
          const baseTotal = record["unit_price"] * record["quantity"];
          const tax = baseTotal * 0.08; // 8% tax
          const discount = record["discount_amount"] || 0;
          record["total_amount"] =
            Math.round((baseTotal + tax - discount) * 100) / 100;
        } else {
          record["total_amount"] = 0;
        }
      }
      // 4. Unique transaction_id
      if (Object.prototype.hasOwnProperty.call(record, "transaction_id")) {
        record["transaction_id"] = `txn_${faker.string.uuid()}`;
      }
      // 5. Realistic transaction_date
      if (Object.prototype.hasOwnProperty.call(record, "transaction_date")) {
        const now = new Date();
        const past = new Date(
          now.getFullYear() - 2,
          now.getMonth(),
          now.getDate()
        );
        record["transaction_date"] = faker.date
          .between({ from: past, to: now })
          .toISOString();
      }
    }

    // --- End healthcare realism enforcement ---

    // --- SaaS advanced realism enforcement (B2B & B2C) ---
    // ... existing code ...

    // --- Ecommerce advanced realism enforcement ---
    // ... existing code ...

    // --- Remove pre-aggregated values for analyst learning ---
    if (Object.prototype.hasOwnProperty.call(record, "acv")) {
      delete record["acv"];
    }
    if (Object.prototype.hasOwnProperty.call(record, "mrr")) {
      delete record["mrr"];
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

    return record;
  }

  private generateFallbackForColumn(
    columnName: string,
  ): any {
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

  private formatAsTable(eventStream: any[]): any {
    const tableSpec = this.spec.event_stream_table;
    // Remove acv and mrr columns from the table spec
    const filteredColumns = tableSpec.columns
      .map((c) => c.name)
      .filter((name) => name !== "acv" && name !== "mrr");
    const rows = eventStream.map((event) => {
      const row: Record<string, any> = {};
      for (const colName of filteredColumns) {
        row[colName] = event.hasOwnProperty(colName) ? event[colName] : null;
      }
      return row;
    });

    // Fix table name: avoid double _fact or _dim
    let name = tableSpec.name;
    if (name.endsWith("_fact_fact")) name = name.replace("_fact_fact", "_fact");
    if (name.endsWith("_dim_dim")) name = name.replace("_dim_dim", "_dim");
    if (name.endsWith("_fact") || name.endsWith("_dim")) {
      // do nothing
    } else {
      name += "_fact";
    }
    return {
      name,
      type: name.endsWith("_dim") ? "dim" : "fact",
      columns: filteredColumns,
      rows: rows,
    };
  }

  private generateFallbackValue(method: string, namespace: string): any {
    // Map of common faker methods to fallback values
    const fallbackMap: Record<string, any> = {
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

  private generateDimensionTables(entities: Record<string, any[]>): any[] {
    // For each entity, create a dimension table with all attributes except internal ones
    return Object.entries(entities).map(([entityName, entityList]) => {
      let name = entityName;
      if (name.endsWith("_dim_dim")) name = name.replace("_dim_dim", "_dim");
      if (!name.endsWith("_dim")) name += "_dim";
      return {
        name,
        type: "dim",
        columns: Object.keys(entityList[0] || {}).filter(
          (key) => !key.startsWith("_")
        ),
        rows: entityList.map(({ ...attrs }) => attrs),
      };
    });
  }

  private detectBusinessType(record: Record<string, any>): string {
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

  private sanitizePlaceholderValues(record: Record<string, any>): void {
    // Replace placeholder values with realistic alternatives
    const placeholderPatterns = [
      {
        pattern: /option\s*[a-z]/i,
        field: "subscription_plan",
        fallbacks: ["Free", "Basic", "Pro", "Enterprise"],
      },
      {
        pattern: /option\s*[a-z]/i,
        field: "plan_name",
        fallbacks: ["Free", "Basic", "Pro", "Enterprise"],
      },
      {
        pattern: /option\s*[a-z]/i,
        field: "product_name",
        fallbacks: ["Product A", "Product B", "Product C"],
      },
      {
        pattern: /option\s*[a-z]/i,
        field: "category",
        fallbacks: ["Electronics", "Clothing", "Home", "Books"],
      },
      {
        pattern: /option\s*[a-z]/i,
        field: "status",
        fallbacks: ["active", "pending", "completed", "cancelled"],
      },
      {
        pattern: /option\s*[a-z]/i,
        field: "event_type",
        fallbacks: ["login", "purchase", "view", "click"],
      },
      {
        pattern: /option\s*[a-z]/i,
        field: "country",
        fallbacks: ["United States", "Canada", "United Kingdom", "Germany"],
      },
      {
        pattern: /option\s*[a-z]/i,
        field: "payment_method",
        fallbacks: ["credit_card", "paypal", "bank_transfer", "cash"],
      },
      {
        pattern: /option\s*[a-z]/i,
        field: "billing_cycle",
        fallbacks: ["monthly", "annual"],
      },
      {
        pattern: /option\s*[a-z]/i,
        field: "user_role",
        fallbacks: ["admin", "user", "viewer"],
      },
      {
        pattern: /option\s*[a-z]/i,
        field: "device_type",
        fallbacks: ["mobile", "desktop", "tablet"],
      },
    ];

    placeholderPatterns.forEach(({ pattern, field, fallbacks }) => {
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
  }

  private enforceNumericFields(record: Record<string, any>): void {
    // Define numeric fields and their realistic ranges
    const numericFields = [
      { field: "api_calls_count", min: 1, max: 1000 },
      { field: "storage_used_mb", min: 10, max: 10000 },
      { field: "feature_usage_count", min: 1, max: 100 },
      { field: "admin_actions_count", min: 0, max: 50 },
      { field: "session_duration_minutes", min: 1, max: 120 },
      { field: "payment_amount", min: 0, max: 10000 },
      { field: "plan_price", min: 0, max: 5000 },
      { field: "contract_value", min: 0, max: 100000 },
      { field: "quantity", min: 1, max: 10 },
      { field: "unit_price", min: 1, max: 2000 },
      { field: "product_price", min: 1, max: 2000 },
      { field: "total_amount", min: 0, max: 10000 },
      { field: "shipping_cost", min: 0, max: 100 },
      { field: "tax_amount", min: 0, max: 1000 },
      { field: "discount_amount", min: 0, max: 1000 },
      { field: "procedure_cost", min: 50, max: 50000 },
      { field: "claim_amount", min: 50, max: 50000 },
      { field: "insurance_payout", min: 0, max: 50000 },
      { field: "patient_responsibility", min: 0, max: 50000 },
      { field: "transaction_amount", min: 1, max: 10000 },
      { field: "balance_before", min: 0, max: 100000 },
      { field: "balance_after", min: 0, max: 100000 },
      { field: "transaction_fee", min: 0, max: 100 },
      { field: "fraud_score", min: 0, max: 100 },
      { field: "course_price", min: 0, max: 50000 },
      { field: "assignment_score", min: 0, max: 100 },
      { field: "exam_score", min: 0, max: 100 },
      { field: "gpa", min: 0, max: 4 },
      { field: "loyalty_points", min: 0, max: 1000 },
      { field: "loyalty_points_earned", min: 0, max: 100 },
      { field: "raw_materials_cost", min: 10, max: 1000 },
      { field: "labor_cost", min: 20, max: 1000 },
      { field: "equipment_cost", min: 1000, max: 100000 },
      { field: "total_cost", min: 1000, max: 100000 },
      { field: "quality_score", min: 0, max: 100 },
      { field: "defect_count", min: 0, max: 10 },
      { field: "production_time_hours", min: 1, max: 100 },
      { field: "distance_miles", min: 1, max: 1000 },
      { field: "fuel_consumed_gallons", min: 1, max: 100 },
      { field: "trip_duration_hours", min: 0.5, max: 24 },
      { field: "fuel_cost", min: 5, max: 500 },
      { field: "maintenance_cost", min: 50, max: 5000 },
      { field: "safety_score", min: 0, max: 100 },
      { field: "driver_rating", min: 1, max: 5 },
      { field: "user_age", min: 18, max: 65 },
      { field: "viral_coefficient", min: 0, max: 5 },
      { field: "content_created_count", min: 0, max: 50 },
      { field: "social_shares_count", min: 0, max: 20 },
      { field: "seats_purchased", min: 1, max: 1000 },
    ];

    numericFields.forEach(({ field, min, max }) => {
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

  private enforceRealisticDefaults(record: Record<string, any>): void {
    // Set realistic defaults for common fields
    const defaults = {
      // SaaS defaults
      subscription_plan: ["Free", "Basic", "Pro", "Enterprise"],
      billing_cycle: ["monthly", "annual"],
      subscription_status: ["active", "cancelled", "expired", "trial"],
      user_role: ["admin", "manager", "user", "viewer"],
      device_type: ["mobile", "desktop", "tablet"],

      // Ecommerce defaults
      order_status: [
        "pending",
        "confirmed",
        "shipped",
        "delivered",
        "returned",
        "cancelled",
      ],
      payment_method: ["credit_card", "paypal", "bank_transfer", "cash"],
      return_reason: ["defective", "wrong_size", "changed_mind", "duplicate"],

      // Healthcare defaults
      appointment_status: [
        "scheduled",
        "confirmed",
        "completed",
        "cancelled",
        "no_show",
      ],
      procedure_type: ["consultation", "surgery", "examination", "therapy"],
      insurance_status: ["covered", "partial", "not_covered", "pending"],

      // Finance defaults
      transaction_type: ["deposit", "withdrawal", "transfer", "payment"],
      account_type: ["checking", "savings", "credit", "investment"],
      fraud_status: ["clean", "suspicious", "flagged", "confirmed"],

      // Education defaults
      course_status: ["enrolled", "completed", "dropped", "waitlisted"],
      grade_level: ["freshman", "sophomore", "junior", "senior"],
      enrollment_status: ["active", "graduated", "suspended", "withdrawn"],

      // Manufacturing defaults
      production_status: ["planned", "in_progress", "completed", "cancelled"],
      quality_status: ["passed", "failed", "pending", "rework"],
      equipment_status: ["operational", "maintenance", "broken", "retired"],

      // Logistics defaults
      shipment_status: ["pending", "in_transit", "delivered", "returned"],
      vehicle_status: ["available", "in_use", "maintenance", "out_of_service"],
      route_status: ["planned", "active", "completed", "cancelled"],
    };

    // Apply defaults for missing fields
    Object.entries(defaults).forEach(([field, options]) => {
      if (
        record[field] === undefined ||
        record[field] === null ||
        record[field] === ""
      ) {
        record[field] = faker.helpers.arrayElement(options);
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

    if (
      record["country"] === undefined ||
      record["country"] === null ||
      record["country"] === ""
    ) {
      record["country"] = faker.helpers.arrayElement(countries);
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

  private fixPlanPricing(record: Record<string, any>): void {
    const businessType = this.detectBusinessType(record);

    // SaaS Business Types
    if (businessType.includes("SaaS")) {
      this.fixSaaSPricing(record);
    }
    // Ecommerce Business Types
    else if (
      businessType.includes("Ecommerce") ||
      businessType.includes("Retail")
    ) {
      this.fixEcommercePricing(record);
    }
    // Healthcare Business Types
    else if (
      businessType.includes("Healthcare") ||
      businessType.includes("Medical")
    ) {
      this.fixHealthcarePricing(record);
    }
    // Finance Business Types
    else if (
      businessType.includes("Finance") ||
      businessType.includes("Banking") ||
      businessType.includes("Insurance")
    ) {
      this.fixFinancePricing(record);
    }
    // Education Business Types
    else if (
      businessType.includes("Education") ||
      businessType.includes("Learning")
    ) {
      this.fixEducationPricing(record);
    }
    // Manufacturing Business Types
    else if (
      businessType.includes("Manufacturing") ||
      businessType.includes("Industrial")
    ) {
      this.fixManufacturingPricing(record);
    }
    // Logistics Business Types
    else if (
      businessType.includes("Logistics") ||
      businessType.includes("Transportation")
    ) {
      this.fixLogisticsPricing(record);
    }
  }

  private fixSaaSPricing(record: Record<string, any>): void {
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

  private fixEcommercePricing(record: Record<string, any>): void {
    // Fix product pricing
    if (record.unit_price !== undefined && record.unit_price !== null) {
      if (typeof record.unit_price === "string") {
        const parsed = parseFloat(record.unit_price);
        if (!isNaN(parsed)) {
          record.unit_price = parsed;
        } else {
          record.unit_price = faker.number.int({ min: 10, max: 500 });
        }
      }
    }

    // Fix quantity
    if (record.quantity !== undefined && record.quantity !== null) {
      if (typeof record.quantity === "string") {
        const parsed = parseInt(record.quantity);
        if (!isNaN(parsed)) {
          record.quantity = parsed;
        } else {
          record.quantity = faker.number.int({ min: 1, max: 10 });
        }
      }
    }

    // Calculate total_amount based on unit_price and quantity
    if (record.unit_price !== undefined && record.quantity !== undefined) {
      const subtotal = record.unit_price * record.quantity;

      // Add shipping cost
      const shippingCost = faker.number.int({ min: 0, max: 50 });

      // Add tax (8-12%)
      const taxRate = faker.number.float({
        min: 0.08,
        max: 0.12,
        fractionDigits: 2,
      });
      const taxAmount = Math.round(subtotal * taxRate * 100) / 100;

      record.total_amount =
        Math.round((subtotal + shippingCost + taxAmount) * 100) / 100;
      record.shipping_cost = shippingCost;
      record.tax_amount = taxAmount;
    }

    // Fix payment_amount for payment events
    if (record.payment_amount !== undefined && record.payment_amount !== null) {
      if (typeof record.payment_amount === "string") {
        const parsed = parseFloat(record.payment_amount);
        if (!isNaN(parsed)) {
          record.payment_amount = parsed;
        } else {
          record.payment_amount = 0;
        }
      }

      // For ecommerce payment events, use total_amount or calculate realistic payment
      const ecommercePaymentEvents = [
        "purchase",
        "order_placed",
        "payment_processed",
        "checkout_completed",
        "order_confirmed",
        "payment_successful",
        "transaction_completed",
      ];

      if (
        record.event_type &&
        ecommercePaymentEvents.includes(record.event_type)
      ) {
        if (record.total_amount) {
          record.payment_amount = record.total_amount;
        } else if (record.unit_price && record.quantity) {
          // Calculate payment based on unit price and quantity
          const subtotal = record.unit_price * record.quantity;
          const shippingCost =
            record.shipping_cost || faker.number.int({ min: 0, max: 50 });
          const taxAmount =
            record.tax_amount || Math.round(subtotal * 0.1 * 100) / 100; // 10% tax
          record.payment_amount =
            Math.round((subtotal + shippingCost + taxAmount) * 100) / 100;
        } else {
          // Fallback for payment events without pricing data
          record.payment_amount = faker.number.int({ min: 10, max: 1000 });
        }
      }
    }
  }

  private fixHealthcarePricing(record: Record<string, any>): void {
    // Fix procedure costs
    if (record.procedure_cost !== undefined && record.procedure_cost !== null) {
      if (typeof record.procedure_cost === "string") {
        const parsed = parseFloat(record.procedure_cost);
        if (!isNaN(parsed)) {
          record.procedure_cost = parsed;
        } else {
          record.procedure_cost = faker.number.int({ min: 100, max: 10000 });
        }
      }
    }

    // Fix claim amounts (should be >= procedure cost)
    if (record.claim_amount !== undefined && record.claim_amount !== null) {
      if (typeof record.claim_amount === "string") {
        const parsed = parseFloat(record.claim_amount);
        if (!isNaN(parsed)) {
          record.claim_amount = parsed;
        } else {
          record.claim_amount = faker.number.int({ min: 100, max: 15000 });
        }
      }

      // Ensure claim_amount >= procedure_cost
      if (
        record.procedure_cost &&
        record.claim_amount < record.procedure_cost
      ) {
        record.claim_amount =
          record.procedure_cost *
          faker.number.float({ min: 1.1, max: 1.5, fractionDigits: 2 });
        record.claim_amount = Math.round(record.claim_amount * 100) / 100;
      }
    }

    // Fix insurance payouts based on claim status
    if (
      record.insurance_payout !== undefined &&
      record.insurance_payout !== null
    ) {
      if (typeof record.insurance_payout === "string") {
        const parsed = parseFloat(record.insurance_payout);
        if (!isNaN(parsed)) {
          record.insurance_payout = parsed;
        } else {
          record.insurance_payout = 0;
        }
      }

      // Set payout based on claim status
      if (record.claim_status === "Denied") {
        record.insurance_payout = 0;
      } else if (record.claim_status === "Approved" && record.claim_amount) {
        // Insurance typically covers 70-90% of approved claims
        const coverageRate = faker.number.float({
          min: 0.7,
          max: 0.9,
          fractionDigits: 2,
        });
        record.insurance_payout =
          Math.round(record.claim_amount * coverageRate * 100) / 100;
      }
    }
  }

  private fixFinancePricing(record: Record<string, any>): void {
    // Fix transaction amounts
    if (
      record.transaction_amount !== undefined &&
      record.transaction_amount !== null
    ) {
      if (typeof record.transaction_amount === "string") {
        const parsed = parseFloat(record.transaction_amount);
        if (!isNaN(parsed)) {
          record.transaction_amount = parsed;
        } else {
          record.transaction_amount = faker.number.int({ min: 1, max: 10000 });
        }
      }
    }

    // Fix account balances
    if (record.balance_before !== undefined && record.balance_before !== null) {
      if (typeof record.balance_before === "string") {
        const parsed = parseFloat(record.balance_before);
        if (!isNaN(parsed)) {
          record.balance_before = parsed;
        } else {
          record.balance_before = faker.number.int({ min: 0, max: 50000 });
        }
      }
    }

    // Calculate balance_after based on balance_before and transaction_amount
    if (
      record.balance_before !== undefined &&
      record.transaction_amount !== undefined
    ) {
      const transactionType = record.transaction_type;
      if (transactionType === "deposit" || transactionType === "credit") {
        record.balance_after =
          record.balance_before + record.transaction_amount;
      } else if (
        transactionType === "withdrawal" ||
        transactionType === "debit"
      ) {
        record.balance_after =
          record.balance_before - record.transaction_amount;
      } else {
        record.balance_after = record.balance_before;
      }

      // Ensure balance doesn't go negative (add overdraft protection)
      if (record.balance_after < 0) {
        record.balance_after = 0;
      }
    }

    // Fix transaction fees
    if (
      record.transaction_fee !== undefined &&
      record.transaction_fee !== null
    ) {
      if (typeof record.transaction_fee === "string") {
        const parsed = parseFloat(record.transaction_fee);
        if (!isNaN(parsed)) {
          record.transaction_fee = parsed;
        } else {
          record.transaction_fee = faker.number.float({
            min: 0,
            max: 5,
            fractionDigits: 2,
          });
        }
      }
    }

    // Fix fraud scores (0-100 scale)
    if (record.fraud_score !== undefined && record.fraud_score !== null) {
      if (typeof record.fraud_score === "string") {
        const parsed = parseFloat(record.fraud_score);
        if (!isNaN(parsed)) {
          record.fraud_score = parsed;
        } else {
          record.fraud_score = faker.number.int({ min: 0, max: 100 });
        }
      }
    }
  }

  private fixEducationPricing(record: Record<string, any>): void {
    // Fix course pricing
    if (record.course_price !== undefined && record.course_price !== null) {
      if (typeof record.course_price === "string") {
        const parsed = parseFloat(record.course_price);
        if (!isNaN(parsed)) {
          record.course_price = parsed;
        } else {
          record.course_price = faker.number.int({ min: 50, max: 2000 });
        }
      }
    }

    // Fix assignment scores (0-100 scale)
    if (
      record.assignment_score !== undefined &&
      record.assignment_score !== null
    ) {
      if (typeof record.assignment_score === "string") {
        const parsed = parseFloat(record.assignment_score);
        if (!isNaN(parsed)) {
          record.assignment_score = parsed;
        } else {
          record.assignment_score = faker.number.int({ min: 0, max: 100 });
        }
      }
    }

    // Fix exam scores (0-100 scale)
    if (record.exam_score !== undefined && record.exam_score !== null) {
      if (typeof record.exam_score === "string") {
        const parsed = parseFloat(record.exam_score);
        if (!isNaN(parsed)) {
          record.exam_score = parsed;
        } else {
          record.exam_score = faker.number.int({ min: 0, max: 100 });
        }
      }
    }

    // Fix GPA (0-4 scale)
    if (record.gpa !== undefined && record.gpa !== null) {
      if (typeof record.gpa === "string") {
        const parsed = parseFloat(record.gpa);
        if (!isNaN(parsed)) {
          record.gpa = parsed;
        } else {
          record.gpa = faker.number.float({
            min: 0,
            max: 4,
            fractionDigits: 2,
          });
        }
      }
    }
  }

  private fixManufacturingPricing(record: Record<string, any>): void {
    // Fix raw materials cost
    if (
      record.raw_materials_cost !== undefined &&
      record.raw_materials_cost !== null
    ) {
      if (typeof record.raw_materials_cost === "string") {
        const parsed = parseFloat(record.raw_materials_cost);
        if (!isNaN(parsed)) {
          record.raw_materials_cost = parsed;
        } else {
          record.raw_materials_cost = faker.number.int({ min: 10, max: 1000 });
        }
      }
    }

    // Fix labor cost
    if (record.labor_cost !== undefined && record.labor_cost !== null) {
      if (typeof record.labor_cost === "string") {
        const parsed = parseFloat(record.labor_cost);
        if (!isNaN(parsed)) {
          record.labor_cost = parsed;
        } else {
          record.labor_cost = faker.number.int({ min: 20, max: 1000 });
        }
      }
    }

    // Fix equipment cost
    if (record.equipment_cost !== undefined && record.equipment_cost !== null) {
      if (typeof record.equipment_cost === "string") {
        const parsed = parseFloat(record.equipment_cost);
        if (!isNaN(parsed)) {
          record.equipment_cost = parsed;
        } else {
          record.equipment_cost = faker.number.int({ min: 1000, max: 100000 });
        }
      }
    }

    // Calculate total cost
    if (
      record.raw_materials_cost !== undefined &&
      record.labor_cost !== undefined
    ) {
      const baseCost = record.raw_materials_cost + record.labor_cost;
      const equipmentCost = record.equipment_cost || 0;
      record.total_cost = baseCost + equipmentCost;
    }

    // Fix quality scores (0-100 scale)
    if (record.quality_score !== undefined && record.quality_score !== null) {
      if (typeof record.quality_score === "string") {
        const parsed = parseFloat(record.quality_score);
        if (!isNaN(parsed)) {
          record.quality_score = parsed;
        } else {
          record.quality_score = faker.number.int({ min: 0, max: 100 });
        }
      }
    }

    // Fix defect counts
    if (record.defect_count !== undefined && record.defect_count !== null) {
      if (typeof record.defect_count === "string") {
        const parsed = parseInt(record.defect_count);
        if (!isNaN(parsed)) {
          record.defect_count = parsed;
        } else {
          record.defect_count = faker.number.int({ min: 0, max: 10 });
        }
      }
    }
  }

  private fixLogisticsPricing(record: Record<string, any>): void {
    // Fix distance in miles
    if (record.distance_miles !== undefined && record.distance_miles !== null) {
      if (typeof record.distance_miles === "string") {
        const parsed = parseFloat(record.distance_miles);
        if (!isNaN(parsed)) {
          record.distance_miles = parsed;
        } else {
          record.distance_miles = faker.number.int({ min: 1, max: 1000 });
        }
      }
    }

    // Fix fuel consumption
    if (
      record.fuel_consumed_gallons !== undefined &&
      record.fuel_consumed_gallons !== null
    ) {
      if (typeof record.fuel_consumed_gallons === "string") {
        const parsed = parseFloat(record.fuel_consumed_gallons);
        if (!isNaN(parsed)) {
          record.fuel_consumed_gallons = parsed;
        } else {
          record.fuel_consumed_gallons = faker.number.int({ min: 1, max: 100 });
        }
      }
    }

    // Fix trip duration
    if (
      record.trip_duration_hours !== undefined &&
      record.trip_duration_hours !== null
    ) {
      if (typeof record.trip_duration_hours === "string") {
        const parsed = parseFloat(record.trip_duration_hours);
        if (!isNaN(parsed)) {
          record.trip_duration_hours = parsed;
        } else {
          record.trip_duration_hours = faker.number.float({
            min: 0.5,
            max: 24,
            fractionDigits: 1,
          });
        }
      }
    }

    // Calculate fuel cost based on consumption
    if (record.fuel_consumed_gallons !== undefined) {
      const fuelPricePerGallon = faker.number.float({
        min: 3,
        max: 5,
        fractionDigits: 2,
      });
      record.fuel_cost =
        Math.round(record.fuel_consumed_gallons * fuelPricePerGallon * 100) /
        100;
    }

    // Fix maintenance cost
    if (
      record.maintenance_cost !== undefined &&
      record.maintenance_cost !== null
    ) {
      if (typeof record.maintenance_cost === "string") {
        const parsed = parseFloat(record.maintenance_cost);
        if (!isNaN(parsed)) {
          record.maintenance_cost = parsed;
        } else {
          record.maintenance_cost = faker.number.int({ min: 50, max: 5000 });
        }
      }
    }

    // Calculate total cost
    if (record.fuel_cost !== undefined) {
      const fuelCost = record.fuel_cost;
      const maintenanceCost = record.maintenance_cost || 0;
      record.total_cost = Math.round((fuelCost + maintenanceCost) * 100) / 100;
    }

    // Fix safety scores (0-100 scale)
    if (record.safety_score !== undefined && record.safety_score !== null) {
      if (typeof record.safety_score === "string") {
        const parsed = parseFloat(record.safety_score);
        if (!isNaN(parsed)) {
          record.safety_score = parsed;
        } else {
          record.safety_score = faker.number.int({ min: 0, max: 100 });
        }
      }
    }
  }

  private validateDataQuality(eventStream: any[]): any {
    const issues: string[] = [];
    const warnings: string[] = [];
    const stats: Record<string, any> = {};

    if (eventStream.length === 0) {
      issues.push("No data generated - empty event stream");
      return { issues, warnings, stats, isValid: false };
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

  private getRequiredFields(businessType: string): string[] {
    const fieldMap: Record<string, string[]> = {
      "B2B SaaS": [
        "user_id",
        "company_id",
        "subscription_plan",
        "plan_price",
        "event_type",
      ],
      "B2C SaaS": ["user_id", "subscription_plan", "plan_price", "event_type"],
      Ecommerce: [
        "customer_id",
        "product_id",
        "order_id",
        "total_amount",
        "event_type",
      ],
      Healthcare: ["patient_id", "provider_id", "procedure_code", "event_type"],
      Fintech: ["account_id", "transaction_id", "amount", "event_type"],
      Education: ["student_id", "course_id", "event_type"],
      Retail: [
        "customer_id",
        "product_id",
        "transaction_id",
        "total_amount",
        "event_type",
      ],
      Manufacturing: [
        "product_id",
        "machine_id",
        "work_order_id",
        "event_type",
      ],
      Transportation: ["vehicle_id", "driver_id", "trip_id", "event_type"],
    };

    return fieldMap[businessType] || ["event_type"];
  }

  private generateUser(): Record<string, any> {
    const firstName = faker.person.firstName();
    const lastName = faker.person.lastName();
    const email = faker.internet.email({ firstName, lastName });

    return {
      user_id: `usr_${faker.string.uuid()}`,
      user_name: `${firstName} ${lastName}`,
      user_email: email,
      user_role: faker.helpers.arrayElement([
        "admin",
        "manager",
        "user",
        "viewer",
      ]),
    };
  }
}
