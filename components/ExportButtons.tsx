import React from "react";
import { toast } from "sonner";

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
  return (
    <div className="flex gap-6 mt-6 flex-wrap">
      <button
        onClick={async () => {
          const csvToastId = toast.loading(
            <div className="flex items-center gap-2 min-w-[220px]">
              <span>🛠️</span>
              <span>
                <span className="block">Generating full dataset (CSV)...</span>
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
            const csv = toCSV(result.data.tables[0].rows);
            const blob = new Blob([csv], { type: "text/csv" });
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = url;
            a.download = "dataset.csv";
            a.click();
            toast.dismiss(csvToastId);
            toast.success("CSV downloaded!");
          } catch (err) {
            toast.dismiss(csvToastId);
            toast.error("Failed to generate CSV");
          }
        }}
        className="bg-zinc-200 hover:bg-zinc-300 text-black font-medium px-8 py-2 rounded shadow transition-colors min-w-[120px] disabled:opacity-50"
      >
        Download CSV
      </button>
      <button
        onClick={async () => {
          const sqlToastId = toast.loading(
            <div className="flex items-center gap-2 min-w-[220px]">
              <span>🛠️</span>
              <span>
                <span className="block">Generating full dataset (SQL)...</span>
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
            const sql = toSQL(result.data.tables[0].rows);
            const blob = new Blob([sql], { type: "text/plain" });
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = url;
            a.download = "dataset.sql";
            a.click();
            toast.dismiss(sqlToastId);
            toast.success("SQL downloaded!");
          } catch (err) {
            toast.dismiss(sqlToastId);
            toast.error("Failed to generate SQL");
          }
        }}
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
