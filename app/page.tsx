"use client";

import { useState, useRef } from "react";
import React from "react";
import { toast } from "sonner";
import JSZip from "jszip";
import {
  Select,
  SelectTrigger,
  SelectContent,
  SelectItem,
  SelectValue,
} from "@/components/ui/select";

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
    rowCount: 100,
    schemaType: "OBT",
    businessType: "SaaS",
    timeRange: "2025",
    growthPattern: "steady",
    variationLevel: "medium",
    granularity: "daily",
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
  const rowCountOptions = [100, 250, 500, 1000, 5000];
  const businessTypeOptions = [
    "SaaS",
    "Ecommerce",
    "Healthcare",
    "Fintech",
    "Education",
    "Retail",
    "Manufacturing",
    "Transportation",
  ];
  const timeRangeOptions = ["2023", "2024", "2025"];

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { name, value, type } = e.target;
    if (name === "rowCount") {
      setPrompt((prev) => ({ ...prev, rowCount: Number(value) }));
    } else if (name === "schemaType") {
      setPrompt((prev) => ({ ...prev, schemaType: value }));
    } else if (name === "timeRange") {
      setPrompt((prev) => ({ ...prev, timeRange: value }));
    } else {
      setPrompt((prev) => ({ ...prev, [name]: value }));
    }
  };

  const handlePreview = async () => {
    setLoading(true);
    setError("");
    setData(null);
    const toastId = toast.loading(
      <div className="flex items-center gap-2 min-w-[220px]">
        <span>🛠️</span>
        <span>
          <span className="block">Generating realistic dataset...</span>
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
        body: JSON.stringify({ ...prompt, rowCount: 10 }), // Always preview 10 rows
      });
      if (!response.ok) throw new Error("Failed to generate dataset");
      const result = await response.json();
      setData(result.data);
      toast.dismiss(toastId);
      toast.success("Dataset generated successfully!");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
      toast.dismiss(toastId);
      toast.error("Failed to generate dataset");
    } finally {
      setLoading(false);
    }
  };

  // Helper to render table from array of objects
  const renderTable = (data: any) => {
    const minRows = 10;
    if (!data || !data.tables || data.tables.length === 0)
      return <div className="text-gray-400">No data</div>;
    if (data.tables.length === 1) {
      const table = data.tables[0];
      if (!Array.isArray(table.rows) || table.rows.length === 0)
        return <div className="text-gray-400">No data</div>;
      const columns = Object.keys(table.rows[0]);
      const emptyRows =
        minRows - table.rows.length > 0 ? minRows - table.rows.length : 0;
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
              {table.rows.map((row: any, i: number) => (
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
          <div className="text-xs text-gray-400 mt-2">
            Showing first {Math.max(table.rows.length, minRows)} rows
          </div>
        </div>
      );
    } else {
      return (
        <div className="space-y-8">
          {data.tables.map((table: any, tableIndex: number) => {
            if (!Array.isArray(table.rows) || table.rows.length === 0)
              return null;
            const columns = Object.keys(table.rows[0]);
            const emptyRows =
              minRows - table.rows.length > 0 ? minRows - table.rows.length : 0;
            return (
              <div key={tableIndex} className="overflow-x-auto">
                <h3 className="text-lg font-bold mb-2">
                  {table.name || `Table ${tableIndex + 1}`}
                </h3>
                <table className="min-w-full table-fixed border border-zinc-700 rounded-lg text-sm">
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
                  <tbody>
                    {table.rows.map((row: any, i: number) => (
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
                <div className="text-xs text-gray-400 mt-2">
                  Showing first {Math.max(table.rows.length, minRows)} rows
                </div>
              </div>
            );
          })}
        </div>
      );
    }
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
          <p className="text-lg text-white/90 leading-relaxed text-left max-w-2xl mb-8">
            I want to generate a{" "}
            <Select
              value={String(prompt.rowCount)}
              onValueChange={(value) =>
                setPrompt((prev) => ({ ...prev, rowCount: Number(value) }))
              }
            >
              <SelectTrigger className="inline-flex items-center gap-1 px-0 py-0 h-auto min-w-0 border-0 bg-transparent text-blue-400 underline underline-offset-2 font-medium text-lg align-baseline focus:ring-0 focus:outline-none focus:shadow-none focus-visible:ring-0 focus-visible:outline-none focus-visible:border-0 [&_svg]:inline [&_svg]:ml-0.5 [&_svg]:size-5">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-zinc-800 text-white">
                {rowCountOptions.map((opt) => (
                  <SelectItem
                    key={opt}
                    value={String(opt)}
                    className="text-sm font-medium"
                  >
                    {opt}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>{" "}
            row dataset for a{" "}
            <Select
              value={prompt.businessType}
              onValueChange={(value) =>
                setPrompt((prev) => ({ ...prev, businessType: value }))
              }
            >
              <SelectTrigger className="inline-flex items-center gap-1 px-0 py-0 h-auto min-w-0 border-0 bg-transparent text-blue-400 underline underline-offset-2 font-medium text-lg align-baseline focus:ring-0 focus:outline-none focus:shadow-none focus-visible:ring-0 focus-visible:outline-none focus-visible:border-0 [&_svg]:inline [&_svg]:ml-0.5 [&_svg]:size-5">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-zinc-800 text-white">
                {businessTypeOptions.map((opt) => (
                  <SelectItem
                    key={opt}
                    value={opt}
                    className="text-sm font-medium"
                  >
                    {opt}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>{" "}
            business, using{" "}
            <Select
              value={prompt.schemaType}
              onValueChange={(value) =>
                setPrompt((prev) => ({ ...prev, schemaType: value }))
              }
            >
              <SelectTrigger className="inline-flex items-center gap-1 px-0 py-0 h-auto min-w-0 border-0 bg-transparent text-blue-400 underline underline-offset-2 font-medium text-lg align-baseline focus:ring-0 focus:outline-none focus:shadow-none focus-visible:ring-0 focus-visible:outline-none focus-visible:border-0 [&_svg]:inline [&_svg]:ml-0.5 [&_svg]:size-5">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-zinc-800 text-white">
                <SelectItem value="OBT" className="text-sm font-medium">
                  One Big Table (OBT)
                </SelectItem>
                <SelectItem value="star" className="text-sm font-medium">
                  Multiple Tables (Star Schema)
                </SelectItem>
              </SelectContent>
            </Select>{" "}
            schema, covering{" "}
            <Select
              value={prompt.timeRange}
              onValueChange={(value) =>
                setPrompt((prev) => ({ ...prev, timeRange: value }))
              }
            >
              <SelectTrigger className="inline-flex items-center gap-1 px-0 py-0 h-auto min-w-0 border-0 bg-transparent text-blue-400 underline underline-offset-2 font-medium text-lg align-baseline focus:ring-0 focus:outline-none focus:shadow-none focus-visible:ring-0 focus-visible:outline-none focus-visible:border-0 [&_svg]:inline [&_svg]:ml-0.5 [&_svg]:size-5">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-zinc-800 text-white">
                {timeRangeOptions.map((opt) => (
                  <SelectItem
                    key={opt}
                    value={opt}
                    className="text-sm font-medium"
                  >
                    {opt}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>{" "}
            with{" "}
            <Select
              value={prompt.growthPattern}
              onValueChange={(value) =>
                setPrompt((prev) => ({ ...prev, growthPattern: value }))
              }
            >
              <SelectTrigger className="inline-flex items-center gap-1 px-0 py-0 h-auto min-w-0 border-0 bg-transparent text-blue-400 underline underline-offset-2 font-medium text-lg align-baseline focus:ring-0 focus:outline-none focus:shadow-none focus-visible:ring-0 focus-visible:outline-none focus-visible:border-0 [&_svg]:inline [&_svg]:ml-0.5 [&_svg]:size-5">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-zinc-800 text-white">
                <SelectItem value="steady" className="text-sm font-medium">
                  steady
                </SelectItem>
                <SelectItem value="spiky" className="text-sm font-medium">
                  spiky
                </SelectItem>
                <SelectItem value="seasonal" className="text-sm font-medium">
                  seasonal
                </SelectItem>
              </SelectContent>
            </Select>{" "}
            growth,{" "}
            <Select
              value={prompt.variationLevel}
              onValueChange={(value) =>
                setPrompt((prev) => ({ ...prev, variationLevel: value }))
              }
            >
              <SelectTrigger className="inline-flex items-center gap-1 px-0 py-0 h-auto min-w-0 border-0 bg-transparent text-blue-400 underline underline-offset-2 font-medium text-lg align-baseline focus:ring-0 focus:outline-none focus:shadow-none focus-visible:ring-0 focus-visible:outline-none focus-visible:border-0 [&_svg]:inline [&_svg]:ml-0.5 [&_svg]:size-5">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-zinc-800 text-white">
                <SelectItem value="low" className="text-sm font-medium">
                  low
                </SelectItem>
                <SelectItem value="medium" className="text-sm font-medium">
                  medium
                </SelectItem>
                <SelectItem value="high" className="text-sm font-medium">
                  high
                </SelectItem>
              </SelectContent>
            </Select>{" "}
            variation, and{" "}
            <Select
              value={prompt.granularity}
              onValueChange={(value) =>
                setPrompt((prev) => ({ ...prev, granularity: value }))
              }
            >
              <SelectTrigger className="inline-flex items-center gap-1 px-0 py-0 h-auto min-w-0 border-0 bg-transparent text-blue-400 underline underline-offset-2 font-medium text-lg align-baseline focus:ring-0 focus:outline-none focus:shadow-none focus-visible:ring-0 focus-visible:outline-none focus-visible:border-0 [&_svg]:inline [&_svg]:ml-0.5 [&_svg]:size-5">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-zinc-800 text-white">
                <SelectItem value="daily" className="text-sm font-medium">
                  daily
                </SelectItem>
                <SelectItem value="weekly" className="text-sm font-medium">
                  weekly
                </SelectItem>
                <SelectItem value="monthly" className="text-sm font-medium">
                  monthly
                </SelectItem>
              </SelectContent>
            </Select>{" "}
            granularity.
          </p>
          <div className="flex justify-end w-full">
            <button
              className="bg-zinc-200 hover:bg-zinc-300 text-black font-medium px-8 py-2 rounded shadow transition-colors min-w-[120px] disabled:opacity-50 flex items-center gap-2"
              onClick={handlePreview}
              disabled={loading}
              type="button"
            >
              {loading ? (
                <>
                  <svg
                    className="animate-spin h-5 w-5 text-black"
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    ></circle>
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    ></path>
                  </svg>
                  Generating...
                </>
              ) : (
                "Preview Data"
              )}
            </button>
          </div>
        </main>
        <section className="flex-1 flex flex-col">
          {loading && (
            <div className="flex-1 flex items-center justify-center">
              <div className="text-center">
                <div className="animate-spin h-12 w-12 border-4 border-blue-500 border-t-transparent rounded-full mx-auto mb-4"></div>
                <p className="text-white/80">Generating realistic dataset...</p>
                <p className="text-white/60 text-sm mt-2">
                  This may take a few moments
                </p>
              </div>
            </div>
          )}
          {!loading && data && data.tables && data.tables[0]?.rows && (
            <div className="space-y-4">
              <h2 className="text-xl font-bold text-blue-300">Preview</h2>
              {renderTable(data)}
              <div className="flex gap-6 mt-6">
                <button
                  onClick={async () => {
                    const csvToastId = toast.loading(
                      <div className="flex flex-col items-start gap-1">
                        <div className="flex items-center gap-2">
                          <span className="animate-bounce">🛠️</span>
                          <span>Generating full dataset (CSV)...</span>
                        </div>
                        <span className="text-xs text-gray-400">
                          This can take a few minutes.
                        </span>
                      </div>,
                      { duration: Infinity }
                    );
                    try {
                      const response = await fetch("/api/generate", {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify(prompt), // Use full rowCount
                      });
                      if (!response.ok)
                        throw new Error("Failed to generate dataset");
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
                      <div className="flex flex-col items-start gap-1">
                        <div className="flex items-center gap-2">
                          <span className="animate-bounce">🛠️</span>
                          <span>Generating full dataset (SQL)...</span>
                        </div>
                        <span className="text-xs text-gray-400">
                          This can take a few minutes.
                        </span>
                      </div>,
                      { duration: Infinity }
                    );
                    try {
                      const response = await fetch("/api/generate", {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify(prompt), // Use full rowCount
                      });
                      if (!response.ok)
                        throw new Error("Failed to generate dataset");
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
                    disabled={isInstallingMetabase || !data || !data.length}
                    className="bg-zinc-200 hover:bg-zinc-300 text-black font-medium px-8 py-2 rounded shadow transition-colors min-w-[120px] disabled:opacity-50"
                  >
                    {isInstallingMetabase
                      ? "Installing..."
                      : "Explore in Metabase"}
                  </button>
                )}
              </div>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
