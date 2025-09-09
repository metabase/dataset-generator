import { faker } from "@/lib/utils/faker-utils";
import { generateFallbackForColumn } from "@/lib/utils/faker-utils";
import { DataSpec, EventSpec } from "@/lib/types/data-spec";
import {
  EventStream,
  DataRecord,
  EntityCollection,
} from "@/lib/types/data-types";

export class EventSimulator {
  private spec: DataSpec;

  constructor(spec: DataSpec) {
    this.spec = spec;
  }

  public simulateEvents(
    entities: EntityCollection,
    rowCount: number,
    timeRange: string[]
  ): EventStream {
    const eventStream: EventStream = [];
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
    entity: DataRecord,
    currentDate: Date,
    entities: EntityCollection
  ): DataRecord | null {
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
    entity: DataRecord,
    currentDate: Date,
    entities: EntityCollection
  ): DataRecord | null {
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
    entity: DataRecord,
    currentDate: Date,
    entities: EntityCollection
  ): DataRecord | null {
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
    entity: DataRecord,
    currentDate: Date,
    entities: EntityCollection
  ): DataRecord | null {
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
    entity: DataRecord,
    timestamp: Date,
    entities: EntityCollection
  ): DataRecord {
    const eventSpec = this.spec.simulation.events[eventName];
    if (!eventSpec) return null;

    const record: DataRecord = {};

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
            record[colSpec.name] = generateFallbackForColumn(colSpec.name);
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
            record[colSpec.name] = generateFallbackForColumn(colSpec.name);
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
                record[colSpec.name] = generateFallbackForColumn(colSpec.name);
              } else {
                record[colSpec.name] = refValue;
              }
            } else if (outputSpec.type === "literal") {
              record[colSpec.name] = outputSpec.value;
            } else {
              record[colSpec.name] = generateFallbackForColumn(colSpec.name);
            }
          } else {
            record[colSpec.name] = generateFallbackForColumn(colSpec.name);
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
          record[colSpec.name] = generateFallbackForColumn(colSpec.name);
      }
    });

    return record;
  }
}
