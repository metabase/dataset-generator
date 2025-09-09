import { DataSpec } from "@/lib/types/data-spec";
import { EntityGenerator } from "@/lib/generators/entity-generator";
import { EventSimulator } from "@/lib/generators/event-simulator";
import { TableFormatter } from "@/lib/formatters/table-formatter";
import { DataValidator } from "@/lib/validators/data-validator";
import { DataEnforcer } from "@/lib/enforcers/data-enforcer";
import { SaaSEnforcer } from "@/lib/enforcers/saas-enforcer";
import { faker } from "@/lib/utils/faker-utils";

// =================================================================
// DATA FACTORY IMPLEMENTATION
// =================================================================

export class DataFactory {
  private spec: DataSpec;
  private entityGenerator: EntityGenerator;
  private eventSimulator: EventSimulator;
  private tableFormatter: TableFormatter;
  private dataValidator: DataValidator;
  private dataEnforcer: DataEnforcer;
  private saasEnforcer: SaaSEnforcer;

  constructor(spec: DataSpec) {
    this.spec = spec;
    this.entityGenerator = new EntityGenerator(spec);
    this.eventSimulator = new EventSimulator(spec);
    this.tableFormatter = new TableFormatter(spec);
    this.dataValidator = new DataValidator(spec);
    this.dataEnforcer = new DataEnforcer();
    this.saasEnforcer = new SaaSEnforcer();

    this.dataValidator.validateSpec(spec);
  }

  public generate(rowCount: number, timeRange: string[], schemaType?: string) {
    // Generate entities
    const generatedEntities = this.entityGenerator.generateEntities(rowCount);

    // Simulate events
    const eventStream = this.eventSimulator.simulateEvents(
      generatedEntities,
      rowCount,
      timeRange
    );

    // Apply business logic enforcement
    eventStream.forEach((record) => {
      this.dataEnforcer.sanitizePlaceholderValues(record);
      this.dataEnforcer.enforceNumericFields(record);
      this.dataEnforcer.enforceRealisticDefaults(record);
      this.dataEnforcer.enforceHealthcareRules(record);
      this.dataEnforcer.removePreAggregatedValues(record);

      // Apply SaaS-specific rules
      this.saasEnforcer.enforceSaaSRules(record);
      this.saasEnforcer.fixSaaSPricing(record);
    });

    // Format as table
    const table = this.tableFormatter.formatAsTable(eventStream);

    // Generate dimension tables for star schema
    if (schemaType === "Star Schema") {
      // Extract foreign key IDs from fact table
      const foreignKeyIds = this.extractForeignKeyIds(table);

      // Generate dimension tables using the same IDs
      const dimensionTables = this.generateDimensionTablesWithIds(
        generatedEntities,
        foreignKeyIds
      );

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

  private extractForeignKeyIds(factTable: any): Map<string, Set<string>> {
    const foreignKeyIds = new Map();

    factTable.rows.forEach((row: any) => {
      Object.keys(row).forEach((key) => {
        if (key.endsWith("_id") && row[key]) {
          if (!foreignKeyIds.has(key)) {
            foreignKeyIds.set(key, new Set());
          }
          foreignKeyIds.get(key).add(row[key]);
        }
      });
    });

    return foreignKeyIds;
  }

  private generateDimensionTablesWithIds(
    generatedEntities: any,
    foreignKeyIds: Map<string, Set<string>>
  ): any[] {
    const dimensionTables = [];

    // For each foreign key type, create a dimension table with the required IDs
    foreignKeyIds.forEach((ids, foreignKeyName) => {
      // Map foreign key to entity name
      let entityName;
      if (foreignKeyName === "company_id") entityName = "company";
      else if (foreignKeyName === "user_id") entityName = "user";
      else if (foreignKeyName === "subscription_id")
        entityName = "subscription";
      else if (foreignKeyName === "event_id") entityName = "events";
      else if (foreignKeyName === "customer_id") entityName = "customers";
      else if (foreignKeyName === "product_id") entityName = "products";
      else if (foreignKeyName === "order_id") entityName = "orders";
      else if (foreignKeyName === "patient_id") entityName = "patients";
      else if (foreignKeyName === "provider_id") entityName = "providers";
      else if (foreignKeyName === "facility_id") entityName = "facilities";
      else if (foreignKeyName === "procedure_id") entityName = "procedures";
      else if (foreignKeyName === "account_id") entityName = "account";
      else if (foreignKeyName === "transaction_id") entityName = "transaction";
      else if (foreignKeyName === "device_id") entityName = "devices";
      else if (foreignKeyName === "student_id") entityName = "students";
      else if (foreignKeyName === "course_id") entityName = "courses";
      else if (foreignKeyName === "instructor_id") entityName = "instructors";
      else if (foreignKeyName === "institution_id") entityName = "institutions";
      else if (foreignKeyName === "assignment_id") entityName = "assignments";
      else if (foreignKeyName === "store_id") entityName = "stores";
      else if (foreignKeyName === "sales_associate_id")
        entityName = "sales_associates";
      else if (foreignKeyName === "work_order_id") entityName = "work_order";
      else if (foreignKeyName === "machine_id") entityName = "machine";
      else if (foreignKeyName === "operator_id") entityName = "operator";
      else if (foreignKeyName === "vehicle_id") entityName = "vehicles";
      else if (foreignKeyName === "driver_id") entityName = "drivers";
      else if (foreignKeyName === "trip_id") entityName = "trips";
      else {
        // Fallback: try to guess the entity name
        entityName = foreignKeyName.replace("_id", "");
      }

      // Get the entity spec
      let entitySpec = this.spec.entities.find((e) => e.name === entityName);
      if (!entitySpec) {
        // Try with _dim suffix
        entitySpec = this.spec.entities.find(
          (e) => e.name === `${entityName}_dim`
        );
      }
      if (!entitySpec) {
        return;
      }

      // Create dimension table with the required IDs
      const dimensionTable = {
        name: `${entityName}_dim`,
        type: "dim",
        columns: Object.keys(entitySpec.attributes).filter(
          (key) => !key.startsWith("_")
        ),
        rows: [],
      };

      // Generate dimension records for each required ID
      for (const id of ids) {
        const record: any = {};
        for (const col of dimensionTable.columns) {
          if (col === foreignKeyName) {
            record[col] = id; // Use the exact ID from the fact table
          } else {
            // Generate appropriate values for other columns
            const attrSpec = entitySpec.attributes[col];
            record[col] = this.generateAttributeValue(attrSpec);
          }
        }
        dimensionTable.rows.push(record);
      }

      dimensionTables.push(dimensionTable);
    });

    return dimensionTables;
  }

  private generateAttributeValue(attrSpec: any): any {
    // Generate appropriate values for dimension table attributes
    if (attrSpec.type === "faker") {
      const [namespace, method] = attrSpec.method!.split(".");
      try {
        return (faker as any)[namespace][method]();
      } catch {
        return this.generateDefaultValue(method);
      }
    } else if (attrSpec.type === "choice") {
      const values = attrSpec.values || attrSpec.method || [];
      return values[Math.floor(Math.random() * values.length)];
    } else {
      return this.generateDefaultValue("default");
    }
  }

  private ensureStarSchemaRelationships(
    factTable: any,
    dimensionTables: any[]
  ): any[] {
    // For each foreign key in the fact table, ensure it references an existing ID in the corresponding dimension table
    factTable.rows.forEach((row) => {
      Object.keys(row).forEach((key) => {
        if (key.endsWith("_id") && row[key]) {
          // Find the corresponding dimension table
          // Map foreign key names to dimension table names
          let dimensionTableName;
          if (key === "company_id") dimensionTableName = "companies_dim";
          else if (key === "user_id") dimensionTableName = "users_dim";
          else if (key === "subscription_id")
            dimensionTableName = "subscriptions_dim";
          else {
            // Fallback: try to guess the dimension table name
            const entityName = key.replace("_id", "");
            dimensionTableName = `${entityName}s_dim`;
          }

          const dimensionTable = dimensionTables.find(
            (table) => table.name === dimensionTableName
          );

          if (dimensionTable && dimensionTable.rows.length > 0) {
            // Pick a random ID from the dimension table
            const randomIndex = Math.floor(
              Math.random() * dimensionTable.rows.length
            );
            row[key] = dimensionTable.rows[randomIndex][key];
          }
        }
      });
    });

    return [factTable, ...dimensionTables];
  }

  private generateDefaultValue(columnName: string): any {
    // Generate appropriate default values for dimension table columns
    if (columnName.includes("name")) {
      return `Default ${columnName.replace("_name", "")}`;
    }
    if (columnName.includes("email")) {
      return "default@example.com";
    }
    if (columnName.includes("type") || columnName.includes("status")) {
      return "default";
    }
    if (columnName.includes("size")) {
      return "medium";
    }
    if (columnName.includes("industry")) {
      return "Technology";
    }
    if (columnName.includes("role")) {
      return "user";
    }
    return null;
  }
}
