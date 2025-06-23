import { faker } from "@faker-js/faker";

// Set a consistent seed for reproducibility
faker.seed(42);

// =================================================================
// TYPE DEFINITIONS FOR THE DATA GENERATION SPEC
// =================================================================

type AttributeType =
  | "id"
  | "faker"
  | "choice"
  | "date"
  | "number"
  | "conditional";
type EventType = "initial" | "recurring" | "random" | "churn";
type SourceType =
  | "id"
  | "timestamp"
  | "reference"
  | "event_name"
  | "lookup"
  | "literal"
  | "choice";

interface AttributeSpec {
  type: AttributeType;
  prefix?: string; // for id
  method?: string; // for faker, e.g., "internet.email"
  values?: (string | number)[]; // for choice
  weights?: number[]; // for choice
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
  frequency?: any; // for recurring
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
    if (process.env.DEBUG) {
      console.log(
        "[DataFactory] Initialized with spec:",
        JSON.stringify(spec, null, 2)
      );
    }
  }

  public generate(rowCount: number, timeRange: string[], schemaType?: string) {
    const entities = this.generateEntities(rowCount);
    let sampleRow = null;
    if (
      schemaType === "Star Schema" &&
      this.spec.event_stream_table &&
      (this.spec as any).Star
    ) {
      // Generate fact and dimension tables
      const factTable = this.formatAsTable(
        this.simulateEvents(entities, rowCount, timeRange)
      );
      sampleRow = factTable.rows[0];
      const dimensionTables = this.generateDimensionTables(entities);
      console.log("[DataFactory] Sample generated row:", sampleRow);
      return { tables: [factTable, ...dimensionTables], spec: this.spec };
    } else {
      // Default: OBT
      const eventStream = this.simulateEvents(entities, rowCount, timeRange);
      const finalTable = this.formatAsTable(eventStream);
      sampleRow = finalTable.rows[0];
      console.log("[DataFactory] Sample generated row:", sampleRow);
      return { tables: [finalTable], spec: this.spec };
    }
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

    // Remove or comment out noisy logs in generateEntities
    // Comment out: console.log("Generated entities:", generatedEntities);
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
        if (
          !spec.values ||
          !spec.weights ||
          spec.values.length !== spec.weights.length
        ) {
          return null;
        }
        const weightedOptions = spec.values.map((value, index) => ({
          value,
          weight: spec.weights![index],
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
          return 0;
        }
        const key = spec.on
          .map((attr) => `${attr}=${context[attr]}`)
          .join(" & ");
        if (spec.cases.hasOwnProperty(key)) {
          return spec.cases[key];
        } else {
          return 0;
        }
      // Other types like 'date', 'number' will be implemented later
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
          switch (eventSpec.type) {
            case "recurring":
              if (!eventSpec.frequency || !eventSpec.frequency.on) {
                console.warn(
                  `[DataFactory] Missing frequency field for event ${eventName}`
                );
                break;
              }
              const cycle = entity[eventSpec.frequency.on.split(".")[1]]; // e.g., 'monthly' or 'annual'
              const dayOfCreation = new Date(entity._createdAt).getUTCDate();

              if (
                cycle === "monthly" &&
                currentDate.getUTCDate() === dayOfCreation
              ) {
                const eventRecord = this.createEventRecord(
                  eventName,
                  entity,
                  currentDate,
                  entities
                );
                eventStream.push(eventRecord);
              } else if (
                cycle === "annual" &&
                currentDate.getUTCMonth() ===
                  new Date(entity._createdAt).getUTCMonth() &&
                currentDate.getUTCDate() === dayOfCreation
              ) {
                const eventRecord = this.createEventRecord(
                  eventName,
                  entity,
                  currentDate,
                  entities
                );
                eventStream.push(eventRecord);
              }
              break;

            case "random":
              const monthlyAvg =
                eventSpec.avg_per_entity_per_month || eventSpec.avg_per_entity;
              if (!monthlyAvg) break;
              const dailyProb = monthlyAvg / 30;
              if (Math.random() < dailyProb) {
                const eventRecord = this.createEventRecord(
                  eventName,
                  entity,
                  currentDate,
                  entities
                );
                eventStream.push(eventRecord);
              }
              break;

            case "churn":
              const dailyChurnProb = eventSpec.monthly_rate! / 30;
              if (Math.random() < dailyChurnProb) {
                const eventRecord = this.createEventRecord(
                  eventName,
                  entity,
                  currentDate,
                  entities
                );
                eventStream.push(eventRecord);
                entity._isActive = false; // Mark as inactive
              }
              break;
          }
        }
      }
    }

    return eventStream.slice(0, rowCount);
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
          const eventDate = new Date(baseDate.getTime() + randomMs);
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
            record[colSpec.name] = this.generateFallbackForColumn(
              colSpec.name,
              record
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
            record[colSpec.name] = this.generateFallbackForColumn(
              colSpec.name,
              record
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
                  colSpec.name,
                  record
                );
              } else {
                record[colSpec.name] = refValue;
              }
            } else if (outputSpec.type === "literal") {
              record[colSpec.name] = outputSpec.value;
            } else {
              record[colSpec.name] = this.generateFallbackForColumn(
                colSpec.name,
                record
              );
            }
          } else {
            record[colSpec.name] = this.generateFallbackForColumn(
              colSpec.name,
              record
            );
          }
          break;
        case "literal":
          record[colSpec.name] = source.value;
          break;
        default:
          record[colSpec.name] = this.generateFallbackForColumn(
            colSpec.name,
            record
          );
      }
    });

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

    // --- SaaS advanced realism enforcement ---
    if (
      record["event_type"] &&
      [
        "signup",
        "renewal",
        "cancellation",
        "api_call",
        "feature_usage",
        "failed_renewal",
      ].includes(record["event_type"])
    ) {
      // 1. payment_amount logic
      if (Object.prototype.hasOwnProperty.call(record, "payment_amount")) {
        if (record["plan"] === "Trial" || record["plan"] === "Free") {
          record["payment_amount"] = 0;
        } else if (record["plan"] === "Pro") {
          record["payment_amount"] = 49;
        } else if (record["plan"] === "Basic") {
          record["payment_amount"] = 19;
        } else if (record["plan"] === "Enterprise") {
          record["payment_amount"] = 199;
        }
        if (
          record["event_type"] !== "signup" &&
          record["event_type"] !== "renewal"
        ) {
          record["payment_amount"] = 0;
        }
      }
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
      // 2. total_amount logic
      if (Object.prototype.hasOwnProperty.call(record, "total_amount")) {
        if (record["event_type"] === "purchase") {
          record["total_amount"] =
            Math.round((20 + Math.random() * 1980) * 100) / 100; // $20–$2,000
        } else {
          record["total_amount"] = 0;
        }
      }
      // 3. loyalty_points_earned logic
      if (
        Object.prototype.hasOwnProperty.call(record, "loyalty_points_earned")
      ) {
        if (record["event_type"] === "purchase" && Math.random() < 0.5) {
          record["loyalty_points_earned"] = Math.floor(1 + Math.random() * 100);
        } else {
          record["loyalty_points_earned"] = 0;
        }
      }
      // 4. Unique sale_id
      if (Object.prototype.hasOwnProperty.call(record, "sale_id")) {
        record["sale_id"] = `sale_${faker.string.uuid()}`;
      }
      // 5. Realistic sale_date
      if (Object.prototype.hasOwnProperty.call(record, "sale_date")) {
        const now = new Date();
        const past = new Date(
          now.getFullYear() - 2,
          now.getMonth(),
          now.getDate()
        );
        record["sale_date"] = faker.date
          .between({ from: past, to: now })
          .toISOString();
      }
    }

    // --- Manufacturing advanced realism enforcement ---
    if (
      record["event_type"] &&
      [
        "production_start",
        "quality_check",
        "maintenance",
        "inventory_update",
        "defect_found",
      ].includes(record["event_type"])
    ) {
      // 1. quantity_produced logic
      if (Object.prototype.hasOwnProperty.call(record, "quantity_produced")) {
        if (
          ["production_start", "production_run"].includes(record["event_type"])
        ) {
          record["quantity_produced"] = Math.floor(10 + Math.random() * 990); // 10–1000
        } else {
          record["quantity_produced"] = 0;
        }
      }
      // 2. defect_rate logic
      if (Object.prototype.hasOwnProperty.call(record, "defect_rate")) {
        if (["quality_check", "defect_found"].includes(record["event_type"])) {
          record["defect_rate"] =
            Math.round((0.01 + Math.random() * 0.09) * 1000) / 1000; // 0.01–0.1
        } else {
          record["defect_rate"] = 0;
        }
      }
      // 3. downtime_hours logic
      if (Object.prototype.hasOwnProperty.call(record, "downtime_hours")) {
        if (record["event_type"] === "maintenance") {
          record["downtime_hours"] =
            Math.round((1 + Math.random() * 23) * 10) / 10; // 1–24
        } else {
          record["downtime_hours"] = 0;
        }
      }
      // 4. Unique work_order_id
      if (Object.prototype.hasOwnProperty.call(record, "work_order_id")) {
        record["work_order_id"] = `wo_${faker.string.uuid()}`;
      }
      // 5. Realistic production_date
      if (Object.prototype.hasOwnProperty.call(record, "production_date")) {
        const now = new Date();
        const past = new Date(
          now.getFullYear() - 2,
          now.getMonth(),
          now.getDate()
        );
        record["production_date"] = faker.date
          .between({ from: past, to: now })
          .toISOString();
      }
    }

    // --- Transportation advanced realism enforcement ---
    if (
      record["event_type"] &&
      [
        "trip_start",
        "fuel_stop",
        "maintenance",
        "delivery_complete",
        "break",
      ].includes(record["event_type"])
    ) {
      // 1. distance_traveled logic
      if (Object.prototype.hasOwnProperty.call(record, "distance_traveled")) {
        if (
          ["trip_start", "delivery_complete"].includes(record["event_type"])
        ) {
          record["distance_traveled"] =
            Math.round((5 + Math.random() * 495) * 10) / 10; // 5–500 km
        } else {
          record["distance_traveled"] = 0;
        }
      }
      // 2. fuel_consumed logic
      if (Object.prototype.hasOwnProperty.call(record, "fuel_consumed")) {
        if (record["event_type"] === "fuel_stop") {
          record["fuel_consumed"] =
            Math.round((10 + Math.random() * 90) * 10) / 10; // 10–100 L
        } else {
          record["fuel_consumed"] = 0;
        }
      }
      // 3. delivery_time logic
      if (Object.prototype.hasOwnProperty.call(record, "delivery_time")) {
        if (record["event_type"] === "delivery_complete") {
          record["delivery_time"] =
            Math.round((30 + Math.random() * 570) * 10) / 10; // 30–600 min
        } else {
          record["delivery_time"] = 0;
        }
      }
      // 4. idle_time logic
      if (Object.prototype.hasOwnProperty.call(record, "idle_time")) {
        if (record["event_type"] === "break") {
          record["idle_time"] = Math.round((5 + Math.random() * 55) * 10) / 10; // 5–60 min
        } else {
          record["idle_time"] = 0;
        }
      }
      // 5. Unique trip_id
      if (Object.prototype.hasOwnProperty.call(record, "trip_id")) {
        record["trip_id"] = `trip_${faker.string.uuid()}`;
      }
      // 6. Realistic trip_date
      if (Object.prototype.hasOwnProperty.call(record, "trip_date")) {
        const now = new Date();
        const past = new Date(
          now.getFullYear() - 2,
          now.getMonth(),
          now.getDate()
        );
        record["trip_date"] = faker.date
          .between({ from: past, to: now })
          .toISOString();
      }
    }

    // --- Fintech advanced realism enforcement ---
    if (record["transaction_type"]) {
      // 1. Realistic amount/fee ranges per transaction type
      const t = record["transaction_type"];
      if (t === "Deposit" || t === "Withdrawal") {
        record["amount"] = Math.round((100 + Math.random() * 9900) * 100) / 100; // $100–$10,000
        record["fee"] =
          record["account_type"] === "Credit"
            ? Math.round((1 + Math.random() * 9) * 100) / 100
            : 0; // $1–$10 for credit, $0 otherwise
      } else if (t === "Payment") {
        record["amount"] = Math.round((10 + Math.random() * 990) * 100) / 100; // $10–$1,000
        record["fee"] = Math.round((0.5 + Math.random() * 4.5) * 100) / 100; // $0.50–$5
      } else if (t === "Transfer") {
        record["amount"] = Math.round((50 + Math.random() * 4950) * 100) / 100; // $50–$5,000
        record["fee"] = Math.round((0.5 + Math.random() * 9.5) * 100) / 100; // $0.50–$10
      } else if (t === "Fee") {
        record["amount"] = Math.round((0.5 + Math.random() * 49.5) * 100) / 100; // $0.50–$50
        record["fee"] = record["amount"];
      }
    }
    // 2. Ensure unique transaction_id per row
    record["transaction_id"] = `txn_${faker.string.uuid()}`;
    // 3. Add account_type logic (fallback)
    if (!record["account_type"]) {
      const types = ["Checking", "Savings", "Credit"];
      record["account_type"] = faker.helpers.arrayElement(types);
    }
    // 4. Ensure some is_fraud true (~1%)
    if (Object.prototype.hasOwnProperty.call(record, "is_fraud")) {
      record["is_fraud"] = Math.random() < 0.01;
    }
    // 5. Add more payment methods
    if (Object.prototype.hasOwnProperty.call(record, "payment_method")) {
      const methods = [
        "ACH",
        "Wire Transfer",
        "Card",
        "Check",
        "Mobile",
        "CashApp",
        "Venmo",
        "Zelle",
        "PayPal",
      ];
      record["payment_method"] = faker.helpers.arrayElement(methods);
    }
    // 6. Add more status diversity
    if (Object.prototype.hasOwnProperty.call(record, "status")) {
      const statuses = ["Completed", "Pending", "Failed", "Cancelled"];
      record["status"] = faker.helpers.weightedArrayElement([
        { value: "Completed", weight: 0.7 },
        { value: "Pending", weight: 0.15 },
        { value: "Failed", weight: 0.1 },
        { value: "Cancelled", weight: 0.05 },
      ]);
    }
    // 7. Spread event_date over a realistic date range (last 2 years)
    if (Object.prototype.hasOwnProperty.call(record, "event_date")) {
      const now = new Date();
      const past = new Date(
        now.getFullYear() - 2,
        now.getMonth(),
        now.getDate()
      );
      record["event_date"] = faker.date
        .between({ from: past, to: now })
        .toISOString();
    }

    return record;
  }

  private generateFallbackForColumn(
    columnName: string,
    row?: Record<string, any>
  ): any {
    // Only log fallback in DEBUG mode
    if (process.env.DEBUG) {
      console.warn(
        `[DataFactory] No fallback for field: ${columnName} - LLM should have provided this value`
      );
    }
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

    // For any other field, let the LLM handle it - this should rarely happen
    else {
      return faker.string.alphanumeric(8);
    }
  }

  private formatAsTable(eventStream: any[]): any {
    const tableSpec = this.spec.event_stream_table;
    const columns = tableSpec.columns.map((c) => c.name);

    // We need to ensure every row has all columns, even if the value is null.
    const rows = eventStream.map((event) => {
      const row: Record<string, any> = {};
      for (const colName of columns) {
        row[colName] = event.hasOwnProperty(colName) ? event[colName] : null;
      }
      return row;
    });

    return {
      name: tableSpec.name.endsWith("_fact")
        ? tableSpec.name
        : tableSpec.name + "_fact",
      type: "fact",
      columns,
      rows: rows,
    };
  }

  private generateDimensionTables(entities: Record<string, any[]>): any[] {
    // For each entity, create a dimension table with all attributes except internal ones
    return Object.entries(entities).map(([entityName, entityList]) => {
      return {
        name: `${entityName}_dim`,
        type: "dim",
        rows: entityList.map(({ _createdAt, _isActive, ...attrs }) => attrs),
      };
    });
  }

  private generateFallbackValue(method: string, namespace: string): any {
    // Generate realistic fallback data based on the method name and namespace
    switch (method) {
      case "name":
      case "fullName":
        return faker.person.fullName();
      case "email":
        return faker.internet.email();
      case "product_name":
      case "productName":
        return faker.commerce.productName();
      case "price":
        return parseFloat(faker.commerce.price({ min: 10, max: 500 }));
      case "category":
      case "department":
        return faker.commerce.department();
      case "id":
        return faker.string.uuid();
      case "city":
        return faker.location.city();
      case "country":
        return faker.location.country();
      case "phone":
        return faker.phone.number();
      case "address":
        return faker.location.streetAddress();
      case "zip":
      case "zipCode":
        return faker.location.zipCode();
      case "state":
        return faker.location.state();
      case "number":
        return faker.number.int({ min: 1, max: 100 });
      default:
        // For unknown methods, try to generate something reasonable
        if (namespace === "commerce") {
          return faker.commerce.productName();
        } else if (namespace === "person") {
          return faker.person.fullName();
        } else if (namespace === "internet") {
          return faker.internet.email();
        } else if (namespace === "location") {
          return faker.location.city();
        } else if (namespace === "random") {
          return faker.number.int({ min: 1, max: 100 });
        } else {
          return faker.string.alphanumeric(8);
        }
    }
  }
}
