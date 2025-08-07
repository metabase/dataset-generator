import React from "react";
import toast, { Toaster } from "react-hot-toast";
import JSZip from "jszip";
import { DataFactory } from "@/lib/data-factory";

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
    if (data && data.spec && prompt) {
      // Always use the in-memory spec to generate the full dataset
      const spec = data.spec;
      const rowCount = prompt.rowCount || 100;
      const factory = new DataFactory(spec);
      const generated = factory.generate(
        rowCount,
        prompt.timeRange,
        prompt.schemaType === "star" ? "Star Schema" : "OBT"
      );
      const allTables = generated.tables || [];
      const toastId = toast.loading(
        <span className="text-sm">
          ⌛ Generating {type.toUpperCase()} file... This can take a few minutes
        </span>,
        { duration: Infinity, icon: null }
      );
      try {
        if (prompt.schemaType === "star" && type === "csv") {
          // Use JSZip to zip multiple CSVs
          const zip = new JSZip();
          allTables.forEach((table) => {
            const csv = toCSV(table.rows, table.name);
            zip.file(`${table.name}.csv`, csv);
          });
          const content = await zip.generateAsync({ type: "blob" });
          const url = window.URL.createObjectURL(content);
          const a = document.createElement("a");
          const businessType = (prompt.businessType || "dataset").toLowerCase();
          a.href = url;
          a.download = `${businessType}_dataset.zip`;
          a.click();
          toast.dismiss(toastId);
          toast.success(
            <span className="text-sm">✅ CSVs downloaded as ZIP!</span>,
            { icon: null }
          );
        } else {
          let content = "";
          if (prompt.schemaType === "star") {
            if (type === "sql") {
              content = allTables
                .map((table) => toSQL(table.rows, table.name))
                .join("\n\n");
            } else {
              content = allTables
                .map((table) => toCSV(table.rows, table.name))
                .join("\n\n");
            }
          } else {
            const table = allTables[0];
            if (type === "sql") {
              content = toSQL(table.rows, table.name);
            } else {
              content = toCSV(table.rows, table.name);
            }
          }
          const blob = new Blob([content], {
            type: type === "csv" ? "text/csv" : "text/plain",
          });
          const url = window.URL.createObjectURL(blob);
          const a = document.createElement("a");
          a.href = url;
          const businessType = (prompt.businessType || "dataset").toLowerCase();
          a.download = `${businessType}_dataset.${type}`;
          a.click();
          toast.dismiss(toastId);
          toast.success(
            <span className="text-sm">
              ✅ {type.toUpperCase()} downloaded!
            </span>,
            { icon: null }
          );
        }
      } catch (err) {
        toast.dismiss(toastId);
        toast.error(
          <span className="text-sm">
            ❌ Failed to generate {type.toUpperCase()}
          </span>,
          { icon: null }
        );
      }
      return;
    }
    // If spec is missing, show an error
    toast.error(
      <span className="text-sm">
        ❌ No data spec available for export. Please preview or generate data
        first.
      </span>,
      { icon: null }
    );
  };

  return (
    <div className="flex gap-6 mt-6 flex-wrap">
      <button
        onClick={() => handleExport("csv")}
        className="bg-white hover:bg-gray-50 text-[#509EE3] border border-[#509EE3] font-medium px-8 py-2 rounded shadow transition-all duration-200 hover:scale-105 min-w-[120px] disabled:opacity-50 text-sm"
      >
        Download CSV
      </button>
      <button
        onClick={() => handleExport("sql")}
        className="bg-white hover:bg-gray-50 text-[#509EE3] border border-[#509EE3] font-medium px-8 py-2 rounded shadow transition-all duration-200 hover:scale-105 min-w-[120px] disabled:opacity-50 text-sm"
      >
        Download SQL
      </button>
      {isMetabaseRunning ? (
        <button
          onClick={stopMetabase}
          disabled={isInstallingMetabase}
          className="bg-white hover:bg-gray-50 text-[#509EE3] border border-[#509EE3] font-medium px-8 py-2 rounded shadow transition-all duration-200 hover:scale-105 min-w-[120px] disabled:opacity-50 text-sm"
        >
          Stop Metabase
        </button>
      ) : (
        <button
          onClick={startMetabase}
          disabled={isInstallingMetabase}
          className="bg-white hover:bg-gray-50 text-[#509EE3] border border-[#509EE3] font-medium px-8 py-2 rounded shadow transition-all duration-200 hover:scale-105 min-w-[120px] disabled:opacity-50 text-sm"
        >
          {isInstallingMetabase ? "Installing..." : "Explore in Metabase"}
        </button>
      )}
      <button
        onClick={() =>
          window.open(
            "https://store.metabase.com/checkout?plan=starter",
            "_blank"
          )
        }
        className="bg-[#509EE3] hover:bg-[#6BA8E8] text-white font-medium px-6 py-2 rounded shadow transition-all duration-200 hover:scale-105 min-w-[120px] text-sm whitespace-nowrap"
      >
        Try Metabase Cloud free
      </button>
    </div>
  );
}

export { Toaster };
