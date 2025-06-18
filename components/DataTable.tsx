import React from "react";

export default function DataTable({ data }: { data: any }) {
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
  }
  return (
    <div>
      {data.tables.map((table: any, tableIndex: number) => {
        if (!Array.isArray(table.rows) || table.rows.length === 0) return null;
        const columns = Object.keys(table.rows[0]);
        const emptyRows =
          minRows - table.rows.length > 0 ? minRows - table.rows.length : 0;
        const tableName = table.name || `Table ${tableIndex + 1}`;
        let suffix = "";
        if (table.type === "fact") suffix = "_fact";
        else if (table.type === "dim") suffix = "_dim";
        return (
          <div key={tableIndex} className="flex flex-col">
            <div className="text-xs text-gray-400 mb-1">
              {tableName}
              {suffix}
            </div>
            <div className="overflow-x-auto">
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
            </div>
            <div className="text-xs text-gray-400 mt-2 mb-8">
              Showing first {Math.max(table.rows.length, minRows)} rows
            </div>
          </div>
        );
      })}
    </div>
  );
}
