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
  | "literal";

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
    console.log("DataFactory initialized with spec:", spec);
  }

  public generate(rowCount: number, timeRange: string[], schemaType?: string) {
    const entities = this.generateEntities(rowCount);
    if (
      schemaType === "Star Schema" &&
      this.spec.event_stream_table &&
      (this.spec as any).Star
    ) {
      // Generate fact and dimension tables
      const factTable = this.formatAsTable(
        this.simulateEvents(entities, rowCount, timeRange)
      );
      const dimensionTables = this.generateDimensionTables(entities);
      return { tables: [factTable, ...dimensionTables], spec: this.spec };
    } else {
      // Default: OBT
      const eventStream = this.simulateEvents(entities, rowCount, timeRange);
      const finalTable = this.formatAsTable(eventStream);
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
        // Access nested faker methods like "internet.email"
        const [namespace, method] = spec.method!.split(".");
        return (faker as any)[namespace][method]();
      case "choice": {
        if (
          !spec.values ||
          !spec.weights ||
          spec.values.length !== spec.weights.length
        ) {
          return null; // Or handle error more gracefully
        }
        const weightedOptions = spec.values.map((value, index) => ({
          value,
          weight: spec.weights![index],
        }));
        return faker.helpers.weightedArrayElement(weightedOptions);
      }
      case "conditional":
        // Use 'key=value & key=value' format for conditional keys
        const key = spec
          .on!.map((attr) => `${attr}=${context[attr]}`)
          .join(" & ");
        if (spec.cases!.hasOwnProperty(key)) {
          return spec.cases![key];
        } else {
          // Remove or comment out noisy logs in DataFactory (conditional key not found, entity creation, etc). Only keep critical errors or cost logs.
          // Comment out: console.warn(`[DataFactory] Conditional key not found: '${key}' in`, spec.cases, "context:", context);
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
      // Remove or comment out noisy logs in generateEntities
      // Comment out: console.log(`[DATA_FACTORY] Created entity ${entity.user_id} with creation date: ${entity._createdAt.toISOString()}`);
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
            currentDate
          );
          if (eventRecord) {
            // Remove or comment out noisy logs in simulateEvents
            // Comment out: console.log(`[DATA_FACTORY] Creating '${initialEventName}' for ${entity.user_id} on ${currentDate.toISOString()}`);
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
              const cycle = entity[eventSpec.frequency.on.split(".")[1]]; // e.g., 'monthly' or 'annual'
              const dayOfCreation = new Date(entity._createdAt).getUTCDate();

              if (
                cycle === "monthly" &&
                currentDate.getUTCDate() === dayOfCreation
              ) {
                const eventRecord = this.createEventRecord(
                  eventName,
                  entity,
                  currentDate
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
                  currentDate
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
                  currentDate
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
                  currentDate
                );
                eventStream.push(eventRecord);
                entity._isActive = false; // Mark as inactive
              }
              break;
          }
        }
      }
    }

    // Remove or comment out noisy logs in simulateEvents
    // Comment out: console.log(`[SIMULATION] Finished. Generated ${eventStream.length} events.`);
    return eventStream.slice(0, rowCount);
  }

  private createEventRecord(
    eventName: string,
    entity: any,
    timestamp: Date
  ): any {
    const eventSpec = this.spec.simulation.events[eventName];
    if (!eventSpec) return null;

    const record: Record<string, any> = {};

    this.spec.event_stream_table.columns.forEach((colSpec) => {
      const source = colSpec.source;
      switch (source.type) {
        case "id":
          record[colSpec.name] = `${source.prefix || ""}${faker.string.uuid()}`;
          break;
        case "timestamp":
          // Randomize time within the day for realism
          const baseDate = new Date(timestamp);
          baseDate.setUTCHours(0, 0, 0, 0);
          const randomMs = Math.floor(Math.random() * 24 * 60 * 60 * 1000);
          const eventDate = new Date(baseDate.getTime() + randomMs);
          record[colSpec.name] = eventDate.toISOString();
          break;
        case "reference":
          if (source.entity === this.spec.entities[0].name) {
            record[colSpec.name] = entity[source.attribute!];
          }
          break;
        case "event_name":
          record[colSpec.name] = eventName;
          break;
        case "lookup":
          // This is where we resolve the event-specific outputs
          const outputSpec = eventSpec.outputs[colSpec.name];
          if (outputSpec) {
            if (outputSpec.type === "reference") {
              record[colSpec.name] = entity[outputSpec.attribute];
            } else if (outputSpec.type === "literal") {
              record[colSpec.name] = outputSpec.value;
            } else {
              record[colSpec.name] = null; // Default for unknown output types
            }
          } else {
            record[colSpec.name] = null;
          }
          break;
        case "literal":
          record[colSpec.name] = source.value;
          break;
        default:
          record[colSpec.name] = null;
      }
    });

    return record;
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
}
