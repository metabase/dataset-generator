"use client";

import { useState, useRef, useEffect } from "react";
import React from "react";
import {
  Select,
  SelectTrigger,
  SelectContent,
  SelectItem,
  SelectValue,
  MultiSelect,
} from "@/components/ui/select";
import DataTable from "@/components/DataTable";
import ExportButtons from "@/components/ExportButtons";
import { toCSV, toSQL } from "@/lib/export";
import toast, { Toaster } from "react-hot-toast";

interface Prompt {
  rowCount: number;
  schemaType: string;
  businessType: string;
  timeRange: string[];
  growthPattern: string;
  variationLevel: string;
  granularity: string;
  context: string;
  isPreview?: boolean;
}

export default function Home() {
  const [prompt, setPrompt] = useState<Prompt>({
    rowCount: 100,
    schemaType: "OBT",
    businessType: "B2B SaaS",
    timeRange: ["2025"],
    growthPattern: "steady",
    variationLevel: "medium",
    granularity: "daily",
    context: "",
  });
  const [data, setData] = useState<any>(undefined);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [isInstallingMetabase, setIsInstallingMetabase] = useState(false);
  const [isMetabaseRunning, setIsMetabaseRunning] = useState(false);
  const [showContext, setShowContext] = useState(false);
  const [hasPreviewed, setHasPreviewed] = useState(false);

  // Dropdown options
  const rowCountOptions = [100, 250, 500, 1000, 5000, 10000];
  const businessTypeOptions = [
    "B2B SaaS",
    "B2C SaaS",
    "Ecommerce",
    "Healthcare",
    "Fintech",
    "Education",
    "Retail",
    "Manufacturing",
    "Transportation",
  ];
  const timeRangeOptions = ["2023", "2024", "2025"];
  const growthPatternOptions = ["steady", "spike", "decline"];

  useEffect(() => {
    setData(null);
    setHasPreviewed(false);
  }, [
    prompt.schemaType,
    prompt.businessType,
    prompt.rowCount,
    prompt.timeRange.join(","),
    prompt.growthPattern,
    prompt.variationLevel,
    prompt.granularity,
    prompt.context,
  ]);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { name, value, type } = e.target;
    if (name === "rowCount") {
      setPrompt((prev) => ({ ...prev, rowCount: Number(value) }));
    } else if (name === "schemaType") {
      setPrompt((prev) => ({ ...prev, schemaType: value }));
    } else {
      setPrompt((prev) => ({ ...prev, [name]: value }));
    }
  };

  const handlePreview = async () => {
    setHasPreviewed(true);
    setLoading(true);
    setError("");
    setData(null);
    const toastId = toast.loading(
      <span className="text-sm">
        ⌛ Hold tight while we generate a preview!
      </span>,
      { duration: Infinity, icon: null }
    );
    const previewPrompt = {
      ...prompt,
      rowCount: 10,
      context: prompt.context,
      isPreview: true,
      schemaType: prompt.schemaType === "star" ? "Star Schema" : "OBT",
    };
    try {
      const response = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(previewPrompt), // Always preview 10 rows
      });
      if (!response.ok) throw new Error("Failed to generate dataset");
      const result = await response.json();
      setData(result.data);
      toast.dismiss(toastId);
      toast.success(
        <span className="text-sm">✅ Preview generated successfully!</span>,
        { icon: null }
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
      toast.dismiss(toastId);
      toast.error(
        <span className="text-sm">❌ Failed to generate dataset</span>,
        { icon: null }
      );
    } finally {
      setLoading(false);
    }
  };

  const handleGenerate = async () => {
    setLoading(true);
    setError("");
    setData(null);
    const toastId = toast.loading(
      <span className="text-sm">⌛ Generating dataset...</span>,
      { duration: Infinity, icon: null }
    );
    const generatePrompt = {
      ...prompt,
      schemaType: prompt.schemaType === "star" ? "Star Schema" : "OBT",
    };
    try {
      const response = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(generatePrompt),
      });
      if (!response.ok) throw new Error("Failed to generate dataset");
      const result = await response.json();
      setData(result.data);
      toast.dismiss(toastId);
      toast.success(
        <span className="text-sm">✅ Dataset generated successfully!</span>,
        { icon: null }
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
      toast.dismiss(toastId);
      toast.error(
        <span className="text-sm">❌ Failed to generate dataset</span>,
        { icon: null }
      );
    } finally {
      setLoading(false);
    }
  };

  // Utility: Start Metabase in Docker
  async function startMetabase() {
    setIsInstallingMetabase(true);
    const toastId = toast.loading(
      <span className="text-sm">
        ⌛ Starting Metabase... This can take a few minutes
      </span>,
      { duration: Infinity, icon: null }
    );
    try {
      const response = await fetch("/api/metabase/start", {
        method: "POST",
      });
      if (!response.ok) {
        const err = await response.json();
        setIsInstallingMetabase(false);
        toast.dismiss(toastId);
        toast.error(
          <span className="text-sm">
            ❌ {err.error || "Failed to start Metabase"}
          </span>,
          { duration: Infinity, icon: null }
        );
        return;
      }
      const data = await response.json();

      // Start checking Metabase status
      const checkStatus = async () => {
        try {
          const statusResponse = await fetch("/api/metabase/status");
          const status = await statusResponse.json();

          if (status.ready) {
            setIsInstallingMetabase(false);
            setIsMetabaseRunning(true);
            toast.dismiss(toastId);
            toast.success(
              <span className="text-sm flex items-center gap-2">
                ✅ Metabase is ready!{" "}
                <a
                  href="http://localhost:3001"
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    backgroundColor: "#509EE3",
                    color: "white",
                    padding: "4px 12px",
                    borderRadius: "4px",
                    fontSize: "12px",
                    fontWeight: 600,
                    textDecoration: "none",
                    display: "inline-block",
                    marginLeft: "8px",
                  }}
                  onMouseOver={(e) =>
                    (e.currentTarget.style.backgroundColor = "#6BA8E8")
                  }
                  onMouseOut={(e) =>
                    (e.currentTarget.style.backgroundColor = "#509EE3")
                  }
                >
                  Open Metabase
                </a>
              </span>,
              { duration: 15000, icon: null }
            );
          } else {
            // Check again in 5 seconds
            setTimeout(checkStatus, 5000);
          }
        } catch (error) {
          // If there's an error checking status, try again in 5 seconds
          setTimeout(checkStatus, 5000);
        }
      };

      // Start checking status
      checkStatus();
    } catch (error) {
      setIsInstallingMetabase(false);
      setIsMetabaseRunning(false);
      toast.dismiss(toastId);
      toast.error(
        <span className="text-sm">
          ❌ Failed to start Metabase. Please try again.
        </span>,
        { duration: Infinity, icon: null }
      );
    }
  }

  // Utility: Stop Metabase in Docker
  async function stopMetabase() {
    const toastId = toast.loading(
      <span className="text-sm">
        ⌛ Stopping Metabase and cleaning up dataset generator resources...
      </span>,
      { duration: Infinity, icon: null }
    );
    try {
      const response = await fetch("/api/metabase/stop", { method: "POST" });
      if (!response.ok) {
        const err = await response.json();
        toast.dismiss(toastId);
        toast.error(
          <span className="text-sm">
            ❌ {err.error || "Failed to stop Metabase"}
          </span>,
          { duration: Infinity, icon: null }
        );
        return;
      }
      setIsMetabaseRunning(false);
      toast.dismiss(toastId);
      toast.success(
        <span className="text-sm">
          ✅ Dataset generator resources cleaned up.
        </span>,
        { icon: null }
      );
    } catch (error) {
      toast.dismiss(toastId);
      toast.error(
        <span className="text-sm">
          ❌ Failed to stop Metabase. Please try again.
        </span>,
        { duration: Infinity, icon: null }
      );
    }
  }

  return (
    <div className="min-h-screen bg-black flex items-start justify-center">
      <Toaster
        position="bottom-right"
        toastOptions={{
          style: {
            background: "#222",
            color: "#fff",
            fontSize: "1rem",
            boxShadow: "0 2px 8px #0008",
            border: "1px solid #333",
          },
          success: { icon: "✅" },
          error: { icon: "❌" },
        }}
      />
      <div
        className="bg-black rounded-lg shadow-2xl px-4 sm:px-8 py-8 sm:py-12 w-full max-w-4xl flex flex-col"
        style={{ minHeight: "60vh" }}
      >
        <header className="mb-8">
          <h1 className="text-3xl sm:text-4xl font-extrabold text-white text-left leading-tight">
            AI Dataset
            <br />
            Generator
          </h1>
        </header>
        <main className="mb-8">
          <div className="text-lg text-white/90 leading-relaxed text-left max-w-2xl mb-8">
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
            </Select>
            , covering{" "}
            <MultiSelect
              className="inline-block align-baseline !px-1 !py-0"
              options={timeRangeOptions}
              value={prompt.timeRange}
              onChange={(vals: string[]) =>
                setPrompt((prev) => ({ ...prev, timeRange: vals }))
              }
              placeholder="Select year(s)"
            />{" "}
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
                {growthPatternOptions.map((opt) => (
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
            granularity
            <button
              type="button"
              aria-label="Add advanced context"
              className={`ml-2 text-lg transition-colors ${
                prompt.context ? "text-blue-400" : "text-zinc-400"
              } hover:text-blue-400 focus:outline-none align-middle`}
              onClick={() => setShowContext((v) => !v)}
              title="Add additional context"
              style={{ verticalAlign: "middle" }}
            >
              <span role="img" aria-label="Advanced options">
                ...
              </span>
            </button>
            {showContext && (
              <div className="mt-4">
                <textarea
                  className="w-full rounded-tl-xl rounded-tr-xl rounded-bl-xl rounded-br-xl bg-zinc-800 text-white px-4 py-2 text-sm border border-zinc-700 focus:border-blue-500 focus:ring-2 focus:ring-blue-500 outline-none resize-vertical placeholder:text-zinc-500"
                  style={{ height: "100px" }}
                  placeholder="Add any additional context..."
                  value={prompt.context}
                  onChange={(e) =>
                    setPrompt((prev) => ({ ...prev, context: e.target.value }))
                  }
                />
              </div>
            )}
          </div>
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
          {!loading &&
            data &&
            Array.isArray(data.tables) &&
            data.tables.length > 0 && (
              <div className="space-y-4">
                <DataTable data={data} />
                <ExportButtons
                  data={data}
                  prompt={prompt}
                  toCSV={toCSV}
                  toSQL={toSQL}
                  isMetabaseRunning={isMetabaseRunning}
                  isInstallingMetabase={isInstallingMetabase}
                  startMetabase={startMetabase}
                  stopMetabase={stopMetabase}
                />
              </div>
            )}
          {/* Only show 'No data' if user has previewed and there is no data */}
          {!loading &&
          hasPreviewed &&
          (!data || !data.tables || data.tables.length === 0) ? (
            <div className="text-gray-400">No data</div>
          ) : null}
        </section>
      </div>
    </div>
  );
}
