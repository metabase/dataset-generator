"use client";

import { useState, useRef, useEffect, useMemo } from "react";
import React from "react";
import {
  Select,
  SelectTrigger,
  SelectContent,
  SelectItem,
  SelectValue,
  MultiSelect
} from "@/components/ui/select";
import { ChevronDownIcon } from "lucide-react";
import DataTable from "@/components/DataTable";
import ExportButtons from "@/components/ExportButtons";
import { toCSV, toSQL } from "@/lib/export";
import toast, { Toaster } from "react-hot-toast";
import { GeneratedData } from "@/lib/types/data-types";

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
    context: ""
  });
  const [data, setData] = useState<GeneratedData | undefined>(undefined);
  const [loading, setLoading] = useState(false);
  const setError = useState<string>("")[1];
  const [isInstallingMetabase, setIsInstallingMetabase] = useState(false);
  const [isMetabaseRunning, setIsMetabaseRunning] = useState(false);
  const [hasPreviewed, setHasPreviewed] = useState(false);
  const [canGenerate, setCanGenerate] = useState(true);
  const metabaseReadyToastRef = useRef<string | null>(null);

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
    "Hospitality",
    "Real Estate"
  ];
  const timeRangeOptions = ["2023", "2024", "2025"];
  const growthPatternOptions = ["steady", "spike", "decline"];

  // Extract computed dep to satisfy react-hooks/exhaustive-deps
  const timeRangeKey = useMemo(() => prompt.timeRange.join(","), [
    prompt.timeRange
  ]);

  useEffect(
    () => {
      setData(null);
      setHasPreviewed(false);
      setCanGenerate(true);
    },
    [
      prompt.schemaType,
      prompt.businessType,
      prompt.rowCount,
      timeRangeKey,
      prompt.growthPattern,
      prompt.variationLevel,
      prompt.granularity
      // prompt.context,
    ]
  );

  const handlePreview = async () => {
    setHasPreviewed(true);
    setLoading(true);
    setError("");
    setData(null);
    const previewPrompt = {
      ...prompt,
      rowCount: 10,
      // context: prompt.context,
      isPreview: true,
      schemaType: prompt.schemaType === "star" ? "Star Schema" : "OBT"
    };
    try {
      const response = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(previewPrompt) // Always preview 10 rows
      });
      if (!response.ok) throw new Error("Failed to generate dataset");
      const result = await response.json();
      setData(result.data);
      setCanGenerate(false);
      toast.success(
        <span className="text-sm">✅ Preview generated successfully!</span>,
        { icon: null }
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
      toast.error(
        <span className="text-sm">❌ Failed to generate dataset</span>,
        { duration: 8000, icon: null }
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
        method: "POST"
      });
      if (!response.ok) {
        const err = await response.json();
        setIsInstallingMetabase(false);
        toast.dismiss(toastId);
        toast.error(
          <span className="text-sm">
            ❌ {err.error || "Failed to start Metabase"}
          </span>,
          { duration: 8000, icon: null }
        );
        return;
      }

      await response.json();

      // Start checking Metabase status
      const checkStatus = async () => {
        try {
          const statusResponse = await fetch("/api/metabase/status");
          const status = await statusResponse.json();

          if (status.ready) {
            setIsInstallingMetabase(false);
            setIsMetabaseRunning(true);
            toast.dismiss(toastId);
            const metabaseReadyToast = toast.success(
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
                    marginLeft: "8px"
                  }}
                  onMouseOver={e =>
                    (e.currentTarget.style.backgroundColor = "#6BA8E8")
                  }
                  onMouseOut={e =>
                    (e.currentTarget.style.backgroundColor = "#509EE3")
                  }
                >
                  Open Metabase
                </a>
              </span>,
              { duration: Infinity, icon: null } // Stays until user closes it
            );
            metabaseReadyToastRef.current = metabaseReadyToast;
          } else {
            // Check again in 5 seconds
            setTimeout(checkStatus, 5000);
          }
        } catch {
          // If there's an error checking status, try again in 5 seconds
          setTimeout(checkStatus, 5000);
        }
      };

      // Start checking status
      checkStatus();
    } catch {
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
          { duration: 8000, icon: null }
        );
        return;
      }
      setIsMetabaseRunning(false);
      toast.dismiss(toastId);

      // Dismiss the Metabase ready toast if it exists
      if (metabaseReadyToastRef.current) {
        toast.dismiss(metabaseReadyToastRef.current);
        metabaseReadyToastRef.current = null;
      }

      toast.success(
        <span className="text-sm">
          ✅ Dataset generator resources cleaned up.
        </span>,
        { icon: null }
      );
    } catch {
      toast.dismiss(toastId);
      toast.error(
        <span className="text-sm">
          ❌ Failed to stop Metabase. Please try again.
        </span>,
        { duration: 8000, icon: null }
      );
    }
  }

  return (
    <div className="min-h-screen flex flex-col items-center pt-8 gap-6">
      <Toaster
        position="bottom-right"
        toastOptions={{
          style: {
            background: "#F9FBFE",
            color: "#22242B",
            fontSize: "1rem",
            boxShadow: "0 2px 8px rgba(0, 0, 0, 0.1)",
            border: "1px solid #E1E5E9"
          },
          success: { icon: "✅" },
          error: { icon: "❌" }
        }}
      />

      {/* Header */}
      <header className="w-full" style={{ width: "min(864px, 100% - 32px)" }}>
        <h1
          className="text-left"
          style={{
            fontFamily: "Lato",
            fontWeight: 700,
            fontSize: "36px",
            lineHeight: "40px",
            letterSpacing: "0%",
            color: "#22242B"
          }}
        >
          Open Source AI Data Generator
        </h1>
      </header>

      {/* Configuration Container */}
      <div
        className="bg-white w-full flex items-center justify-center"
        style={{
          width: "min(864px, 100% - 32px)",
          borderRadius: "24px",
          padding: "24px",
          gap: "12px",
          border: "1px solid #F1F2F4",
          boxShadow: "0 1px 2px 0 rgba(16, 24, 40, 0.06)"
        }}
      >
        <div
          className="text-metabase-subheader text-left"
          style={{
            fontFamily: "Lato",
            fontWeight: 400,
            fontSize: "24px",
            lineHeight: "32px",
            letterSpacing: "0%",
            verticalAlign: "middle",
            maxWidth: "min(750px, 100%)",
            wordWrap: "break-word",
            overflowWrap: "break-word"
          }}
        >
          I want to generate a{" "}
          <Select
            value={String(prompt.rowCount)}
            onValueChange={value =>
              setPrompt(prev => ({ ...prev, rowCount: Number(value) }))
            }
          >
            <SelectTrigger
              className="inline-flex items-center border-0 bg-[#f1f2f4] hover:bg-[#e2e3e6] focus:ring-0 focus:outline-none focus:shadow-none focus-visible:ring-0 focus-visible:outline-none [&_svg]:inline [&_svg]:size-4"
              style={{
                fontFamily: "Lato",
                fontWeight: 700,
                fontSize: "24px",
                lineHeight: "32px",
                letterSpacing: "0%",
                verticalAlign: "middle",
                height: "36px",
                borderRadius: "12px",
                paddingTop: "2px",
                paddingRight: "8px",
                paddingBottom: "2px",
                paddingLeft: "8px",
                gap: "8px",
                minWidth: "fit-content",
                marginLeft: "4px",
                marginRight: "4px",
                marginTop: "4px",
                marginBottom: "4px",
                color: "#5A6072"
              }}
            >
              <SelectValue />
              <ChevronDownIcon className="text-gray-700 size-4" />
            </SelectTrigger>
            <SelectContent className="bg-white text-gray-700 border border-gray-200 shadow-lg">
              {rowCountOptions.map(opt => (
                <SelectItem
                  key={opt}
                  value={String(opt)}
                  className="text-sm font-medium hover:bg-gray-50"
                >
                  {opt}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>{" "}
          row dataset for a{" "}
          <Select
            value={prompt.businessType}
            onValueChange={value =>
              setPrompt(prev => ({ ...prev, businessType: value }))
            }
          >
            <SelectTrigger
              className="inline-flex items-center border-0 bg-[#f1f2f4] hover:bg-[#e2e3e6] focus:ring-0 focus:outline-none focus:shadow-none focus-visible:ring-0 focus-visible:outline-none [&_svg]:inline [&_svg]:size-4"
              style={{
                fontFamily: "Lato",
                fontWeight: 700,
                fontSize: "24px",
                lineHeight: "32px",
                letterSpacing: "0%",
                verticalAlign: "middle",
                height: "36px",
                borderRadius: "12px",
                paddingTop: "2px",
                paddingRight: "8px",
                paddingBottom: "2px",
                paddingLeft: "8px",
                gap: "8px",
                minWidth: "fit-content",
                marginLeft: "4px",
                marginRight: "4px",
                marginTop: "4px",
                marginBottom: "4px",
                color: "#5A6072"
              }}
            >
              <SelectValue />
              <ChevronDownIcon className="text-gray-700 size-4" />
            </SelectTrigger>
            <SelectContent className="bg-white text-gray-700 border border-gray-200 shadow-lg">
              {businessTypeOptions.map(opt => (
                <SelectItem
                  key={opt}
                  value={opt}
                  className="text-sm font-medium hover:bg-gray-50"
                >
                  {opt}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>{" "}
          business, using{" "}
          <Select
            value={prompt.schemaType}
            onValueChange={value =>
              setPrompt(prev => ({ ...prev, schemaType: value }))
            }
          >
            <SelectTrigger
              className="inline-flex items-center border-0 bg-[#f1f2f4] hover:bg-[#e2e3e6] focus:ring-0 focus:outline-none focus:shadow-none focus-visible:ring-0 focus-visible:outline-none [&_svg]:inline [&_svg]:size-4"
              style={{
                fontFamily: "Lato",
                fontWeight: 700,
                fontSize: "24px",
                lineHeight: "32px",
                letterSpacing: "0%",
                verticalAlign: "middle",
                height: "36px",
                borderRadius: "12px",
                paddingTop: "2px",
                paddingRight: "8px",
                paddingBottom: "2px",
                paddingLeft: "8px",
                gap: "8px",
                minWidth: "fit-content",
                marginLeft: "4px",
                marginRight: "4px",
                marginTop: "4px",
                marginBottom: "4px",
                color: "#5A6072"
              }}
            >
              <SelectValue />
              <ChevronDownIcon className="text-gray-700 size-4" />
            </SelectTrigger>
            <SelectContent className="bg-white text-gray-700 border border-gray-200 shadow-lg">
              <SelectItem
                value="OBT"
                className="text-sm font-medium hover:bg-gray-50"
              >
                One Big Table (OBT)
              </SelectItem>
              <SelectItem
                value="star"
                className="text-sm font-medium hover:bg-gray-50"
              >
                Multiple Tables (Star Schema)
              </SelectItem>
            </SelectContent>
          </Select>
          , covering{" "}
          <MultiSelect
            className="inline-block align-baseline !px-0 !py-0"
            options={timeRangeOptions}
            value={prompt.timeRange}
            onChange={(vals: string[]) =>
              setPrompt(prev => ({ ...prev, timeRange: vals }))
            }
            placeholder="Select year(s)"
          />{" "}
          with{" "}
          <Select
            value={prompt.growthPattern}
            onValueChange={value =>
              setPrompt(prev => ({ ...prev, growthPattern: value }))
            }
          >
            <SelectTrigger
              className="inline-flex items-center border-0 bg-[#f1f2f4] hover:bg-[#e2e3e6] focus:ring-0 focus:outline-none focus:shadow-none focus-visible:ring-0 focus-visible:outline-none [&_svg]:inline [&_svg]:size-4"
              style={{
                fontFamily: "Lato",
                fontWeight: 700,
                fontSize: "24px",
                lineHeight: "32px",
                letterSpacing: "0%",
                verticalAlign: "middle",
                height: "36px",
                borderRadius: "12px",
                paddingTop: "2px",
                paddingRight: "8px",
                paddingBottom: "2px",
                paddingLeft: "8px",
                gap: "8px",
                minWidth: "fit-content",
                marginLeft: "4px",
                marginRight: "4px",
                marginTop: "4px",
                marginBottom: "4px",
                color: "#5A6072"
              }}
            >
              <SelectValue />
              <ChevronDownIcon className="text-gray-700 size-4" />
            </SelectTrigger>
            <SelectContent className="bg-white text-gray-700 border border-gray-200 shadow-lg">
              {growthPatternOptions.map(opt => (
                <SelectItem
                  key={opt}
                  value={opt}
                  className="text-sm font-medium hover:bg-gray-50"
                >
                  {opt}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>{" "}
          growth,{" "}
          <Select
            value={prompt.variationLevel}
            onValueChange={value =>
              setPrompt(prev => ({ ...prev, variationLevel: value }))
            }
          >
            <SelectTrigger
              className="inline-flex items-center border-0 bg-[#f1f2f4] hover:bg-[#e2e3e6] focus:ring-0 focus:outline-none focus:shadow-none focus-visible:ring-0 focus-visible:outline-none [&_svg]:inline [&_svg]:size-4"
              style={{
                fontFamily: "Lato",
                fontWeight: 700,
                fontSize: "24px",
                lineHeight: "32px",
                letterSpacing: "0%",
                verticalAlign: "middle",
                height: "36px",
                borderRadius: "12px",
                paddingTop: "2px",
                paddingRight: "8px",
                paddingBottom: "2px",
                paddingLeft: "8px",
                gap: "8px",
                minWidth: "fit-content",
                marginLeft: "4px",
                marginRight: "4px",
                marginTop: "4px",
                marginBottom: "4px",
                color: "#5A6072"
              }}
            >
              <SelectValue />
              <ChevronDownIcon className="text-gray-700 size-4" />
            </SelectTrigger>
            <SelectContent className="bg-white text-gray-700 border border-gray-200 shadow-lg">
              <SelectItem
                value="low"
                className="text-sm font-medium hover:bg-gray-50"
              >
                low
              </SelectItem>
              <SelectItem
                value="medium"
                className="text-sm font-medium hover:bg-gray-50"
              >
                medium
              </SelectItem>
              <SelectItem
                value="high"
                className="text-sm font-medium hover:bg-gray-50"
              >
                high
              </SelectItem>
            </SelectContent>
          </Select>{" "}
          variation, and{" "}
          <Select
            value={prompt.granularity}
            onValueChange={value =>
              setPrompt(prev => ({ ...prev, granularity: value }))
            }
          >
            <SelectTrigger
              className="inline-flex items-center border-0 bg-[#f1f2f4] hover:bg-[#e2e3e6] focus:ring-0 focus:outline-none focus:shadow-none focus-visible:ring-0 focus-visible:outline-none [&_svg]:inline [&_svg]:size-4"
              style={{
                fontFamily: "Lato",
                fontWeight: 700,
                fontSize: "24px",
                lineHeight: "32px",
                letterSpacing: "0%",
                verticalAlign: "middle",
                height: "36px",
                borderRadius: "12px",
                paddingTop: "2px",
                paddingRight: "8px",
                paddingBottom: "2px",
                paddingLeft: "8px",
                gap: "8px",
                minWidth: "fit-content",
                marginLeft: "4px",
                marginRight: "4px",
                marginTop: "4px",
                marginBottom: "4px",
                color: "#5A6072"
              }}
            >
              <SelectValue />
              <ChevronDownIcon className="text-gray-700 size-4" />
            </SelectTrigger>
            <SelectContent className="bg-white text-gray-700 border border-gray-200 shadow-lg">
              <SelectItem
                value="daily"
                className="text-sm font-medium hover:bg-gray-50"
              >
                daily
              </SelectItem>
              <SelectItem
                value="weekly"
                className="text-sm font-medium hover:bg-gray-50"
              >
                weekly
              </SelectItem>
              <SelectItem
                value="monthly"
                className="text-sm font-medium hover:bg-gray-50"
              >
                monthly
              </SelectItem>
            </SelectContent>
          </Select>{" "}
          granularity.{" "}
          <div
            className="float-right"
            title={!canGenerate ? "Results below" : "Generate data"}
          >
            <button
              className={`font-medium rounded shadow transition-all duration-200 hover:scale-105 disabled:opacity-50 text-sm ${
                !canGenerate
                  ? "bg-gray-300 text-gray-600 cursor-not-allowed"
                  : "bg-metabase-blue hover:bg-metabase-blue-hover text-white"
              }`}
              style={{
                width: "36px",
                height: "36px",
                borderRadius: "8px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center"
              }}
              onClick={handlePreview}
              disabled={loading || !canGenerate}
              type="button"
            >
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M12 19V5M5 12l7-7 7 7" />
              </svg>
            </button>
          </div>
        </div>
      </div>

      {/* Data Display Container */}
      <div
        className="w-full flex-1 flex flex-col"
        style={{
          width: "min(864px, 100% - 32px)",
          minHeight: "471px",
          borderRadius: "24px",
          padding: "24px",
          gap: "12px",
          backgroundColor: "#F9FAFB",
          border: "1px solid #F1F2F4",
          boxShadow: "0 1px 2px 0 rgba(16, 24, 40, 0.05)"
        }}
      >
        <div className="flex items-center justify-between mb-6">
          <h2
            className="text-metabase-subheader"
            style={{
              fontFamily: "Lato",
              fontWeight: 700,
              fontSize: "24px",
              lineHeight: "32px",
              letterSpacing: "0%",
              verticalAlign: "middle"
            }}
          >
            Generated data
          </h2>
          <div className="flex gap-2">
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
        </div>

        <div className="flex-1 flex flex-col">
          {loading && (
            <div className="flex-1 flex items-center justify-center">
              <div className="text-center">
                <div className="animate-spin h-12 w-12 border-4 border-[#509EE3] border-t-transparent rounded-full mx-auto mb-4" />
                <p className="text-metabase-subheader">
                  Generating realistic dataset...
                </p>
                <p className="text-gray-500 text-sm mt-2">
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
              </div>
            )}
          {/* Only show 'No data' if user has previewed and there is no data */}
          {!loading &&
          hasPreviewed &&
          (!data || !data.tables || data.tables.length === 0) ? (
            <div className="text-gray-500">No data</div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
