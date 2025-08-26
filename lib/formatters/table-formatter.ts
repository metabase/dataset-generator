import { DataSpec } from "@/lib/types/data-spec";
import { TableData, DataRecord } from "@/lib/types/data-types";

export class TableFormatter {
  private spec: DataSpec;

  constructor(spec: DataSpec) {
    this.spec = spec;
  }

  public formatAsTable(eventStream: DataRecord[]): TableData {
    const tableSpec = this.spec.event_stream_table;
    // Remove acv and mrr columns from the table spec
    const filteredColumns = tableSpec.columns
      .map((c) => c.name)
      .filter((name) => name !== "acv" && name !== "mrr");
    const rows = eventStream.map((event) => {
      const row: DataRecord = {};
      for (const colName of filteredColumns) {
        row[colName] = event.hasOwnProperty(colName) ? event[colName] : null;
      }
      return row;
    });

    // Fix table name: avoid double _fact or _dim
    let name = tableSpec.name;
    if (name.endsWith("_fact_fact")) name = name.replace("_fact_fact", "_fact");
    if (name.endsWith("_dim_dim")) name = name.replace("_dim_dim", "_dim");
if (!name.endsWith("_fact") && !name.endsWith("_dim")) {
  name += "_fact";
}
    return {
      name,
      type: name.endsWith("_dim") ? "dim" : "fact",
      columns: filteredColumns,
      rows: rows,
    };
  }

  public generateDimensionTables(
    entities: Record<string, DataRecord[]>
  ): TableData[] {
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
}
