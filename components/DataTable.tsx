import React from "react";
import { GeneratedData, DataRecord } from "@/lib/types/data-types";

export default function DataTable({ data }: { data: GeneratedData }) {
  const minRows = 10;

  // Helper function to determine if a value is numeric
  const isNumeric = (value: string | number | boolean | null | undefined) => {
    if (typeof value === "number") return true;
    if (typeof value === "string") {
      // Check if it's a pure number (no letters, no special chars except decimal point)
      const trimmed = value.trim();
      return /^\d+(\.\d+)?$/.test(trimmed) && !isNaN(Number(trimmed));
    }
    return false;
  };

  // Helper function to get alignment class
  const getAlignmentClass = (
    value: string | number | boolean | null | undefined
  ) => {
    return isNumeric(value) ? "text-right" : "text-left";
  };

  if (!data || !data.tables || data.tables.length === 0) {
    return <div className="text-gray-500">No data</div>;
  }
  if (data.tables.length === 1) {
    const table = data.tables[0];
    if (!Array.isArray(table.rows) || table.rows.length === 0)
      return <div className="text-gray-500">No data</div>;
    const columns = Object.keys(table.rows[0]);
    const emptyRows =
      minRows - table.rows.length > 0 ? minRows - table.rows.length : 0;
    return (
      <div className="overflow-x-auto h-full flex flex-col justify-center pb-6 w-full">
        <div className="bg-white rounded-lg border border-gray-200 shadow-sm w-full min-w-max">
          <table className="w-full h-full text-sm">
            <thead>
              <tr className="border-b border-gray-200">
                {columns.map((col) => (
                  <th
                    key={col}
                    className="px-4 py-3 bg-gray-50 text-metabase-subheader font-semibold text-left text-xs uppercase tracking-wider"
                  >
                    {col}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="h-full">
              {table.rows.map((row: DataRecord, i: number) => (
                <tr
                  key={i}
                  className="border-b border-gray-100 hover:bg-gray-50 transition-colors"
                >
                  {columns.map((col) => (
                    <td
                      key={col}
                      className={`px-4 py-3 text-metabase-subheader ${getAlignmentClass(
                        row[col]
                      )}`}
                    >
                      {row[col]}
                    </td>
                  ))}
                </tr>
              ))}
              {Array.from({ length: emptyRows }).map((_, i) => (
                <tr key={`empty-${i}`} className="border-b border-gray-100">
                  {columns.map((col) => (
                    <td key={col} className="px-4 py-3 text-metabase-subheader">
                      &nbsp;
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="text-xs text-gray-500 mt-3">
          Showing first {Math.max(table.rows.length, minRows)} rows
        </div>
      </div>
    );
  }
  return (
    <div>
      {data.tables.map((table, tableIndex: number) => {
        const columns =
          Array.isArray(table.rows) && table.rows.length > 0
            ? Object.keys(table.rows[0])
            : [];
        const emptyRows =
          minRows - (table.rows ? table.rows.length : 0) > 0
            ? minRows - (table.rows ? table.rows.length : 0)
            : 0;
        const tableName = table.name || `Table ${tableIndex + 1}`;
        return (
          <div key={tableIndex} className="flex flex-col mb-8">
            <div className="text-sm text-gray-600 mb-2 font-medium">
              {tableName}
            </div>
            <div className="overflow-x-auto">
              <div className="bg-white rounded-lg border border-gray-200 shadow-sm w-full min-w-max">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-200">
                      {columns.length > 0 ? (
                        columns.map((col) => (
                          <th
                            key={col}
                            className="px-4 py-3 bg-gray-50 text-metabase-blue font-semibold text-left text-xs uppercase tracking-wider"
                          >
                            {col}
                          </th>
                        ))
                      ) : (
                        <th className="px-4 py-3 bg-gray-50 text-metabase-blue font-semibold text-left text-xs uppercase tracking-wider">
                          (No columns)
                        </th>
                      )}
                    </tr>
                  </thead>
                  <tbody>
                    {Array.isArray(table.rows) && table.rows.length > 0 ? (
                      table.rows.map((row: DataRecord, i: number) => (
                        <tr
                          key={i}
                          className="border-b border-gray-100 hover:bg-gray-50 transition-colors"
                        >
                          {columns.map((col) => (
                            <td
                              key={col}
                              className={`px-4 py-3 text-metabase-subheader ${getAlignmentClass(
                                row[col]
                              )}`}
                            >
                              {row[col]}
                            </td>
                          ))}
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td
                          className="px-4 py-3 text-metabase-subheader"
                          colSpan={columns.length || 1}
                        >
                          (No rows)
                        </td>
                      </tr>
                    )}
                    {Array.from({ length: emptyRows }).map((_, i) => (
                      <tr
                        key={`empty-${i}`}
                        className="border-b border-gray-100"
                      >
                        {columns.map((col) => (
                          <td
                            key={col}
                            className="px-4 py-3 text-metabase-subheader"
                          >
                            &nbsp;
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
            <div className="text-xs text-gray-500 mt-3">
              Showing first{" "}
              {Math.max(table.rows ? table.rows.length : 0, minRows)} rows
            </div>
          </div>
        );
      })}
    </div>
  );
}
