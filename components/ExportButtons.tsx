import React from "react";
import toast, { Toaster } from "react-hot-toast";
import JSZip from "jszip";
import { DataFactory } from "@/lib/data-factory";
import { ExportData } from "@/lib/types/data-types";

export default function ExportButtons({
  data,
  prompt,
  toCSV,
  toSQL,
  isMetabaseRunning,
  isInstallingMetabase,
  startMetabase,
  stopMetabase,
}: ExportData) {
  // Check if data is available for styling
  const hasData = data && data.tables && data.tables.length > 0;

  // Check if running locally - use useState to avoid hydration mismatch
  const [isLocalhost, setIsLocalhost] = React.useState(false);

  React.useEffect(() => {
    setIsLocalhost(
      window.location.hostname === "localhost" ||
        window.location.hostname === "127.0.0.1" ||
        window.location.hostname.includes("localhost")
    );
  }, []);

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
      } catch {
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

  // Base button classes
  const baseClasses =
    "font-medium transition-all duration-200 disabled:opacity-50 text-sm";
  const dataAvailableClasses =
    "bg-[#F1F2F4] hover:bg-[#E8E9EB] text-[#509EE3] border border-[#F1F2F4]";
  const noDataClasses =
    "bg-[#F1F2F4] hover:bg-[#E8E9EB] text-gray-600 border border-[#F1F2F4]";

  return (
    <div className="flex gap-2">
      <div title={!hasData ? "Generate data first" : "Download CSV file"}>
        <button
          onClick={() => handleExport("csv")}
          disabled={!hasData}
          className={`${baseClasses} ${
            hasData ? dataAvailableClasses : noDataClasses
          }`}
          style={{
            paddingTop: "6px",
            paddingRight: "12px",
            paddingBottom: "6px",
            paddingLeft: "12px",
            borderRadius: "8px",
            gap: "8px",
            height: "32px",
            minWidth: "fit-content",
          }}
        >
          Download CSV
        </button>
      </div>
      <div title={!hasData ? "Generate data first" : "Download SQL file"}>
        <button
          onClick={() => handleExport("sql")}
          disabled={!hasData}
          className={`${baseClasses} ${
            hasData ? dataAvailableClasses : noDataClasses
          }`}
          style={{
            paddingTop: "6px",
            paddingRight: "12px",
            paddingBottom: "6px",
            paddingLeft: "12px",
            borderRadius: "8px",
            gap: "8px",
            height: "32px",
            minWidth: "fit-content",
          }}
        >
          Download SQL
        </button>
      </div>
      {/* Show Metabase buttons only if running locally */}
      {isLocalhost &&
        (isMetabaseRunning ? (
          <div title={!hasData ? "Generate data first" : "Stop Metabase"}>
            <button
              onClick={stopMetabase}
              disabled={isInstallingMetabase || !hasData}
              className={`${baseClasses} ${
                hasData ? dataAvailableClasses : noDataClasses
              }`}
              style={{
                paddingTop: "6px",
                paddingRight: "12px",
                paddingBottom: "6px",
                paddingLeft: "12px",
                borderRadius: "8px",
                gap: "8px",
                height: "32px",
                minWidth: "fit-content",
              }}
            >
              Stop Metabase
            </button>
          </div>
        ) : (
          <div
            title={
              !hasData ? "Generate data first" : "Explore data in Metabase"
            }
          >
            <button
              onClick={startMetabase}
              disabled={isInstallingMetabase || !hasData}
              className={`${baseClasses} ${
                hasData ? dataAvailableClasses : noDataClasses
              }`}
              style={{
                paddingTop: "6px",
                paddingRight: "12px",
                paddingBottom: "6px",
                paddingLeft: "12px",
                borderRadius: "8px",
                gap: "8px",
                height: "32px",
                minWidth: "fit-content",
              }}
            >
              {isInstallingMetabase ? "Installing..." : "Explore in Metabase"}
            </button>
          </div>
        ))}
    </div>
  );
}

export { Toaster };
