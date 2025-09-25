import { DataSpec } from "@/lib/types/data-spec";
import { EntityGenerator } from "@/lib/generators/entity-generator";
import { EventSimulator } from "@/lib/generators/event-simulator";
import { TableFormatter } from "@/lib/formatters/table-formatter";
import { DataValidator } from "@/lib/validators/data-validator";
import { DataEnforcer } from "@/lib/enforcers/data-enforcer";
import { SaaSEnforcer } from "@/lib/enforcers/saas-enforcer";

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
      // Generate dimension tables using all generated entities, not just referenced ones
      const dimensionTables =
        this.generateDimensionTablesWithIds(generatedEntities);

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

  private generateDimensionTablesWithIds(generatedEntities: any): any[] {
    const dimensionTables = [];

    // For each entity type, create a dimension table
    Object.entries(generatedEntities).forEach(([entityName, entityList]) => {
      if (!entityList || !Array.isArray(entityList) || entityList.length === 0)
        return;

      // Get the entity spec to know the ID column name
      const entitySpec = this.spec.entities.find((e) => e.name === entityName);
      if (!entitySpec) return;

      // Find the ID column name from the entity spec
      const idColumnName = Object.keys(entitySpec.attributes).find(
        (attr) => entitySpec.attributes[attr].type === "id"
      );
      if (!idColumnName) return;

      // Create dimension table with ALL entities
      const columns = Object.keys(entityList[0] || {}).filter(
        (key) => !key.startsWith("_")
      );

      const dimensionTable = {
        name: `${entityName}_dim`,
        type: "dim",
        columns: columns,
        rows: entityList.map((entity) => {
          const record: any = {};
          for (const col of columns) {
            record[col] = entity[col];
          }
          return record;
        }),
      };

      dimensionTables.push(dimensionTable);
    });

    return dimensionTables;
  }

  private findForeignKeyName(entityName: string): string {
    // Map entity names to their foreign key column names
    const entityToForeignKey: { [key: string]: string } = {
      company: "company_id",
      user: "user_id",
      subscription: "subscription_id",
      events: "event_id",
      customers: "customer_id",
      products: "product_id",
      orders: "order_id",
      patients: "patient_id",
      providers: "provider_id",
      facilities: "facility_id",
      procedures: "procedure_id",
      account: "account_id",
      transaction: "transaction_id",
      devices: "device_id",
      students: "student_id",
      courses: "course_id",
      instructors: "instructor_id",
      institutions: "institution_id",
      assignments: "assignment_id",
      stores: "store_id",
      sales_associates: "sales_associate_id",
      work_order: "work_order_id",
      machine: "machine_id",
      operator: "operator_id",
      vehicles: "vehicle_id",
      drivers: "driver_id",
      trips: "trip_id",
    };

    return entityToForeignKey[entityName] || `${entityName}_id`;
  }
}
