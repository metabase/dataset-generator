"use client";

import { useState, useRef } from "react";
import React from "react";
import { toast } from "sonner";

interface Prompt {
  rowCount: number;
  schemaType: string;
  businessType: string;
  timeRange: string;
  growthPattern: string;
  variationLevel: string;
  granularity: string;
}

export default function Home() {
  const [prompt, setPrompt] = useState<Prompt>({
    rowCount: 10,
    schemaType: "flat",
    businessType: "SaaS",
    timeRange: "2021–2023",
    growthPattern: "steady",
    variationLevel: "medium",
    granularity: "monthly",
  });
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [isInstallingMetabase, setIsInstallingMetabase] = useState(false);
  const [metabaseMessage, setMetabaseMessage] = useState("");
  const [metabaseProgress, setMetabaseProgress] = useState(0);
  const [isMetabaseRunning, setIsMetabaseRunning] = useState(false);
  const metabaseWindowRef = useRef<Window | null>(null);

  // Dropdown options
  const rowCountOptions = [10, 50, 100, 250, 500, 1000, 5000];
  const businessTypeOptions = [
    "SaaS",
    "E-commerce",
    "Fintech",
    "Healthcare",
    "Education",
    "Retail",
  ];
  const timeRangeOptions = ["2021–2022", "2022–2023", "2020–2024", "2019–2023"];

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    setPrompt((prev) => ({
      ...prev,
      [name]: name === "rowCount" ? Number(value) : value,
    }));
  };

  const handlePreview = async () => {
    setLoading(true);
    setError("");
    setData(null);
    try {
      const response = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(prompt),
      });
      if (!response.ok) throw new Error("Failed to generate dataset");
      const result = await response.json();
      setData(result.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  // Helper to render table from array of objects
  const renderTable = (data: any) => {
    const minRows = 10;
    if (!Array.isArray(data) || data.length === 0)
      return <div className="text-gray-400">No data</div>;
    const columns = Object.keys(data[0]);
    const emptyRows = minRows - data.length > 0 ? minRows - data.length : 0;
    return (
      <div className="overflow-x-auto h-full flex flex-col justify-center pb-6">
        <table className="min-w-full h-full table-fixed border border-zinc-700 rounded-lg text-sm">
          <thead>
            <tr>
              {columns.map((col) => (
                <th
                  key={col}
                  className="px-3 py-2 bg-zinc-800 text-blue-300 font-semibold border-b border-zinc-700 text-left"
                >
                  {col}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="h-full">
            {data.map((row: any, i: number) => (
              <tr key={i} className="even:bg-zinc-900 odd:bg-zinc-950">
                {columns.map((col) => (
                  <td
                    key={col}
                    className="px-3 py-2 border-b border-zinc-800 text-white"
                  >
                    {row[col]}
                  </td>
                ))}
              </tr>
            ))}
            {/* Render empty rows to fill space */}
            {Array.from({ length: emptyRows }).map((_, i) => (
              <tr
                key={`empty-${i}`}
                className="even:bg-zinc-900 odd:bg-zinc-950"
              >
                {columns.map((col) => (
                  <td
                    key={col}
                    className="px-3 py-2 border-b border-zinc-800 text-white"
                  >
                    &nbsp;
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
        <div>
          <div className="text-xs text-gray-400 mt-2">
            Showing first {Math.max(data.length, minRows)} rows
          </div>
          <div className="flex gap-6 mt-10">
            <button
              onClick={() => {
                const csv = toCSV(data);
                const blob = new Blob([csv], { type: "text/csv" });
                const url = window.URL.createObjectURL(blob);
                const a = document.createElement("a");
                a.href = url;
                a.download = "dataset.csv";
                a.click();
              }}
              className="bg-zinc-200 hover:bg-zinc-300 text-black font-medium px-8 py-2 rounded shadow transition-colors min-w-[120px] disabled:opacity-50"
            >
              Download CSV
            </button>
            <button
              onClick={() => {
                const sql = toSQL(data);
                const blob = new Blob([sql], { type: "text/plain" });
                const url = window.URL.createObjectURL(blob);
                const a = document.createElement("a");
                a.href = url;
                a.download = "dataset.sql";
                a.click();
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
                disabled={isInstallingMetabase || !data || !data.length}
                className="bg-zinc-200 hover:bg-zinc-300 text-black font-medium px-8 py-2 rounded shadow transition-colors min-w-[120px] disabled:opacity-50"
              >
                {isInstallingMetabase ? "Installing..." : "Explore in Metabase"}
              </button>
            )}
          </div>
        </div>
      </div>
    );
  };

  // Utility: Convert array of objects to CSV
  function toCSV(rows: any[]) {
    if (!rows || !rows.length) return "";
    const columns = Object.keys(rows[0]);
    const header = columns.join(",");
    const body = rows
      .map((row) =>
        columns.map((col) => JSON.stringify(row[col] ?? "")).join(",")
      )
      .join("\n");
    return header + "\n" + body;
  }

  // Utility: Generate SQL CREATE TABLE and INSERTs (batched, 500 rows per statement)
  function toSQL(rows: any[]) {
    if (!rows || !rows.length) return "";
    const columns = Object.keys(rows[0]);
    // Guess types (very basic)
    const typeMap: Record<string, string> = {};
    for (const col of columns) {
      const val = rows[0][col];
      if (typeof val === "number")
        typeMap[col] = Number.isInteger(val) ? "INTEGER" : "REAL";
      else if (typeof val === "string" && /^\d{4}-\d{2}-\d{2}/.test(val))
        typeMap[col] = "DATE";
      else typeMap[col] = "TEXT";
    }
    const create = `CREATE TABLE dataset (\n  ${columns
      .map((col) => `${col} ${typeMap[col]}`)
      .join(",\n  ")}\n);`;
    // Batch rows
    const batchSize = 500;
    const insertBatches = [];
    for (let i = 0; i < rows.length; i += batchSize) {
      const batch = rows.slice(i, i + batchSize);
      const values = batch
        .map(
          (row) =>
            `(${columns
              .map((col) =>
                typeof row[col] === "number"
                  ? row[col]
                  : `'${String(row[col]).replace(/'/g, "''")}'`
              )
              .join(", ")})`
        )
        .join(",\n  ");
      insertBatches.push(
        `INSERT INTO dataset (${columns.join(", ")}) VALUES\n  ${values};`
      );
    }
    return create + "\n" + insertBatches.join("\n\n");
  }

  // Download helper
  function downloadFile(filename: string, content: string) {
    const blob = new Blob([content], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    setTimeout(() => {
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }, 100);
  }

  // Utility: Start Metabase in Docker
  async function startMetabase() {
    setIsInstallingMetabase(true);
    setMetabaseProgress(0);
    // Open window immediately to avoid popup blocker
    if (!metabaseWindowRef.current || metabaseWindowRef.current.closed) {
      metabaseWindowRef.current = window.open("about:blank", "_blank");
    }
    // Show sticky gray toast for installing
    const toastId = toast.loading(
      "Metabase is installing and will open in a new window. This can take 2-3 minutes.",
      { duration: Infinity, icon: null, closeButton: true }
    );
    try {
      const response = await fetch("/api/metabase/start", {
        method: "POST",
      });
      if (!response.ok) {
        const err = await response.json();
        setIsInstallingMetabase(false);
        setMetabaseProgress(0);
        toast.dismiss(toastId);
        toast.error(err.error || "Failed to start Metabase", {
          duration: Infinity,
          icon: null,
          closeButton: true,
        });
        if (metabaseWindowRef.current) metabaseWindowRef.current.close();
        return;
      }
      const data = await response.json();
      // Wait for Metabase to be ready
      let attempts = 0;
      const maxAttempts = 30; // 2 minutes total (4 seconds * 30)
      const checkMetabase = async () => {
        try {
          const checkResponse = await fetch("/api/metabase/status");
          const status = await checkResponse.json();
          setMetabaseProgress(Math.min(100, (attempts / maxAttempts) * 100));
          if (status.ready) {
            setIsInstallingMetabase(false);
            setMetabaseProgress(100);
            setIsMetabaseRunning(true);
            toast.dismiss(toastId);
            if (metabaseWindowRef.current) {
              metabaseWindowRef.current.location.href = "http://localhost:3001";
              metabaseWindowRef.current.focus();
            }
            return;
          }
          attempts++;
          if (attempts < maxAttempts) {
            setTimeout(checkMetabase, 4000); // Check every 4 seconds
          } else {
            throw new Error("Metabase failed to start within timeout");
          }
        } catch (error) {
          setIsInstallingMetabase(false);
          setMetabaseProgress(0);
          setIsMetabaseRunning(false);
          toast.dismiss(toastId);
          toast.error("Failed to start Metabase. Please try again.", {
            duration: Infinity,
            icon: null,
            closeButton: true,
          });
          if (metabaseWindowRef.current) metabaseWindowRef.current.close();
          console.error("Error checking Metabase status:", error);
        }
      };
      checkMetabase();
    } catch (error) {
      setIsInstallingMetabase(false);
      setMetabaseProgress(0);
      setIsMetabaseRunning(false);
      toast.dismiss(toastId);
      toast.error("Failed to start Metabase. Please try again.", {
        duration: Infinity,
        icon: null,
        closeButton: true,
      });
      if (metabaseWindowRef.current) metabaseWindowRef.current.close();
      console.error("Error starting Metabase:", error);
    }
  }

  // Utility: Stop Metabase in Docker
  async function stopMetabase() {
    const toastId = toast.loading("Stopping Metabase and cleaning up...", {
      duration: Infinity,
      icon: null,
      closeButton: true,
    });
    try {
      const response = await fetch("/api/metabase/stop", { method: "POST" });
      if (!response.ok) {
        const err = await response.json();
        toast.dismiss(toastId);
        toast.error(err.error || "Failed to stop Metabase", {
          duration: Infinity,
          icon: null,
          closeButton: true,
        });
        return;
      }
      setIsMetabaseRunning(false);
      toast.dismiss(toastId);
      toast.success("Metabase stopped and cleaned up.", {
        icon: null,
        closeButton: true,
      });
      if (metabaseWindowRef.current) {
        metabaseWindowRef.current.close();
        metabaseWindowRef.current = null;
      }
    } catch (error) {
      toast.dismiss(toastId);
      toast.error("Failed to stop Metabase. Please try again.", {
        duration: Infinity,
        icon: null,
        closeButton: true,
      });
      console.error("Error stopping Metabase:", error);
    }
  }

  return (
    <div className="min-h-screen bg-black flex items-start justify-center">
      <div
        className="bg-black rounded-lg shadow-2xl px-4 sm:px-8 py-8 sm:py-12 w-full max-w-4xl flex flex-col"
        style={{ minHeight: "60vh" }}
      >
        <header className="mb-8">
          <h1 className="text-3xl sm:text-4xl font-extrabold text-white text-left leading-tight">
            Dataset
            <br />
            Generator
          </h1>
        </header>
        <main className="mb-8">
          <p className="text-lg text-white/90 leading-relaxed text-left max-w-3xl">
            I want to generate a
            <select
              name="rowCount"
              value={prompt.rowCount}
              onChange={handleChange}
              className="align-middle inline-block mx-1 underline underline-offset-4 decoration-blue-400 bg-transparent text-blue-400 focus:outline-none transition-colors duration-150 w-auto min-w-[60px] max-w-[120px] appearance-none"
            >
              {rowCountOptions.map((opt) => (
                <option key={opt} value={opt}>
                  {opt}
                </option>
              ))}
            </select>
            row dataset for a
            <select
              name="businessType"
              value={prompt.businessType}
              onChange={handleChange}
              className="align-middle inline-block mx-1 underline underline-offset-4 decoration-blue-400 bg-transparent text-blue-400 focus:outline-none transition-colors duration-150 w-auto min-w-[60px] max-w-[120px] appearance-none"
            >
              {businessTypeOptions.map((opt) => (
                <option key={opt} value={opt}>
                  {opt}
                </option>
              ))}
            </select>
            business, covering
            <select
              name="timeRange"
              value={prompt.timeRange}
              onChange={handleChange}
              className="align-middle inline-block mx-1 underline underline-offset-4 decoration-blue-400 bg-transparent text-blue-400 focus:outline-none transition-colors duration-150 w-auto min-w-[90px] max-w-[140px] appearance-none"
            >
              {timeRangeOptions.map((opt) => (
                <option key={opt} value={opt}>
                  {opt}
                </option>
              ))}
            </select>
            with
            <select
              name="growthPattern"
              value={prompt.growthPattern}
              onChange={handleChange}
              className="align-middle inline-block mx-1 underline underline-offset-4 decoration-blue-400 bg-transparent text-blue-400 focus:outline-none transition-colors duration-150 w-auto min-w-[60px] max-w-[120px] appearance-none"
            >
              <option value="steady">steady</option>
              <option value="positive">positive</option>
              <option value="negative">negative</option>
            </select>
            growth,
            <select
              name="variationLevel"
              value={prompt.variationLevel}
              onChange={handleChange}
              className="align-middle inline-block mx-1 underline underline-offset-4 decoration-blue-400 bg-transparent text-blue-400 focus:outline-none transition-colors duration-150 w-auto min-w-[60px] max-w-[120px] appearance-none"
            >
              <option value="low">low</option>
              <option value="medium">medium</option>
              <option value="high">high</option>
            </select>
            variation, and
            <select
              name="granularity"
              value={prompt.granularity}
              onChange={handleChange}
              className="align-middle inline-block mx-1 underline underline-offset-4 decoration-blue-400 bg-transparent text-blue-400 focus:outline-none transition-colors duration-150 w-auto min-w-[60px] max-w-[120px] appearance-none"
            >
              <option value="daily">daily</option>
              <option value="weekly">weekly</option>
              <option value="monthly">monthly</option>
            </select>
            granularity.
          </p>
          <div className="flex justify-end w-full">
            <button
              className="bg-zinc-200 hover:bg-zinc-300 text-black font-medium px-8 py-2 rounded shadow transition-colors min-w-[120px] disabled:opacity-50"
              onClick={handlePreview}
              disabled={loading}
              type="button"
            >
              {loading ? "Loading..." : "Preview Data"}
            </button>
          </div>
        </main>
        <section className="flex-1 flex flex-col">
          {data && data.tables && data.tables[0]?.rows && (
            <div className="space-y-4">
              <h2 className="text-xl font-bold">Preview</h2>
              {renderTable(data.tables[0].rows)}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
