import React from "react";
import { toast } from "sonner";

const FACT_TABLES = [
  "events",
  "order_items",
  "transactions",
  "visits",
  "production_runs",
  "trips",
];

export default function ExportButtons({
  data,
  prompt,
  toCSV,
  toSQL,
  isMetabaseRunning,
  isInstallingMetabase,
  startMetabase,
  stopMetabase,
}: any) {
  const handleExport = async (type: "csv" | "sql") => {
    const toastId = toast.loading(
      <div className="flex items-center gap-2 min-w-[220px]">
        <span>🛠️</span>
        <span>
          <span className="block">
            Generating full dataset ({type.toUpperCase()})...
          </span>
          <span className="block text-xs text-gray-400">
            This can take a few minutes.
          </span>
        </span>
      </div>,
      { duration: Infinity }
    );
    try {
      const response = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(prompt),
      });
      if (!response.ok) throw new Error("Failed to generate dataset");
      const result = await response.json();
      let content = "";
      if (prompt.schemaType === "star") {
        // Star schema: export all tables with _fact/_dim suffix
        content = result.data.tables
          .map((table: any) => {
            const tableName = table.name || "table";
            const suffix = FACT_TABLES.includes(tableName) ? "_fact" : "_dim";
            if (type === "csv") return toCSV(table.rows, tableName + suffix);
            return toSQL(table.rows, tableName + suffix);
          })
          .join("\n\n");
      } else {
        // OBT: single table
        if (type === "csv")
          content = toCSV(
            result.data.tables[0].rows,
            result.data.tables[0].name
          );
        else
          content = toSQL(
            result.data.tables[0].rows,
            result.data.tables[0].name
          );
      }
      const blob = new Blob([content], {
        type: type === "csv" ? "text/csv" : "text/plain",
      });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `dataset.${type}`;
      a.click();
      toast.dismiss(toastId);
      toast.success(`${type.toUpperCase()} downloaded!`);
    } catch (err) {
      toast.dismiss(toastId);
      toast.error(`Failed to generate ${type.toUpperCase()}`);
    }
  };

  return (
    <div className="flex gap-6 mt-6 flex-wrap">
      <button
        onClick={() => handleExport("csv")}
        className="bg-zinc-200 hover:bg-zinc-300 text-black font-medium px-8 py-2 rounded shadow transition-colors min-w-[120px] disabled:opacity-50"
      >
        Download CSV
      </button>
      <button
        onClick={() => handleExport("sql")}
        className="bg-zinc-200 hover:bg-zinc-300 text-black font-medium px-8 py-2 rounded shadow transition-colors min-w-[120px] disabled:opacity-50"
      >
        Download SQL
      </button>
      {isMetabaseRunning ? (
        <button
          onClick={stopMetabase}
          disabled={isInstallingMetabase}
          className="bg-zinc-200 hover:bg-zinc-300 text-black font-medium px-8 py-2 rounded shadow transition-colors min-w-[120px] disabled:opacity-50"
        >
          Stop Metabase
        </button>
      ) : (
        <button
          onClick={startMetabase}
          disabled={
            isInstallingMetabase ||
            !data ||
            !data.tables ||
            !data.tables[0]?.rows?.length
          }
          className="bg-zinc-200 hover:bg-zinc-300 text-black font-medium px-8 py-2 rounded shadow transition-colors min-w-[120px] disabled:opacity-50"
        >
          {isInstallingMetabase ? "Installing..." : "Explore in Metabase"}
        </button>
      )}
    </div>
  );
}
