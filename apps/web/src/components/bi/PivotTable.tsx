import React, { useState, useMemo } from "react";

export interface PivotData {
  [key: string]: string | number | boolean;
}

export interface PivotConfig {
  data: PivotData[];
  rows: string[];
  cols: string[];
  values: string[];
  aggregator?: "sum" | "count" | "avg" | "min" | "max";
  title?: string;
}

const aggregators = {
  sum: (values: number[]) => values.reduce((a, b) => a + b, 0),
  count: (values: number[]) => values.length,
  avg: (values: number[]) => values.reduce((a, b) => a + b, 0) / values.length,
  min: (values: number[]) => Math.min(...values),
  max: (values: number[]) => Math.max(...values),
};

export const PivotTable: React.FC<PivotConfig> = ({
  data,
  rows,
  cols,
  values,
  aggregator = "sum",
  title,
}) => {
  const [sortConfig, setSortConfig] = useState<{ key: string; direction: "asc" | "desc" } | null>(null);

  const pivotResult = useMemo(() => {
    if (!data || data.length === 0) return { rows: [], cols: [], cells: {} };

    const rowValues = [...new Set(data.map((d) => d[rows[0]])).values()];
    const colValues = [...new Set(data.map((d) => d[cols[0]])).values()];

    const cells: Record<string, Record<string, number>> = {};

    rowValues.forEach((row) => {
      cells[row as string] = {};
      colValues.forEach((col) => {
        cells[row as string][col as string] = 0;
      });
    });

    data.forEach((item) => {
      const rowKey = item[rows[0]] as string;
      const colKey = item[cols[0]] as string;
      const value = values[0] ? (item[values[0]] as number) : 1;

      if (cells[rowKey] && cells[rowKey][colKey] !== undefined) {
        cells[rowKey][colKey] += value;
      }
    });

    return { rows: rowValues, cols: colValues, cells };
  }, [data, rows, cols, values]);

  const handleSort = (key: string) => {
    setSortConfig((prev) => {
      if (prev?.key === key) {
        return { key, direction: prev.direction === "asc" ? "desc" : "asc" };
      }
      return { key, direction: "asc" };
    });
  };

  const sortedRows = useMemo(() => {
    if (!sortConfig) return pivotResult.rows;

    return [...pivotResult.rows].sort((a, b) => {
      const aVal = pivotResult.cells[a as string]?.[pivotResult.cols[0] as string] || 0;
      const bVal = pivotResult.cells[b as string]?.[pivotResult.cols[0] as string] || 0;
      return sortConfig.direction === "asc" ? aVal - bVal : bVal - aVal;
    });
  }, [pivotResult, sortConfig]);

  const rowTotals = useMemo(() => {
    const totals: Record<string, number> = {};
    sortedRows.forEach((row) => {
      totals[row as string] = pivotResult.cols.reduce((sum, col) => {
        return sum + (pivotResult.cells[row as string]?.[col as string] || 0);
      }, 0);
    });
    return totals;
  }, [sortedRows, pivotResult]);

  const colTotals = useMemo(() => {
    const totals: Record<string, number> = {};
    pivotResult.cols.forEach((col) => {
      totals[col as string] = sortedRows.reduce((sum, row) => {
        return sum + (pivotResult.cells[row as string]?.[col as string] || 0);
      }, 0);
    });
    return totals;
  }, [sortedRows, pivotResult]);

  const grandTotal = useMemo(() => {
    return Object.values(rowTotals).reduce((sum, val) => sum + val, 0);
  }, [rowTotals]);

  if (!data || data.length === 0) {
    return (
      <div
        style={{
          backgroundColor: "#ffffff",
          borderRadius: "12px",
          boxShadow: "0 1px 3px 0 rgba(0, 0, 0, 0.1)",
          padding: "24px",
          minHeight: "200px",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        {title && (
          <h3
            style={{
              fontSize: "18px",
              fontWeight: 600,
              color: "#0f172a",
              marginBottom: "16px",
            }}
          >
            {title}
          </h3>
        )}
        <div style={{ color: "#94a3b8", textAlign: "center" }}>
          <svg
            width="48"
            height="48"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="8" x2="12" y2="12" />
            <line x1="12" y1="16" x2="12.01" y2="16" />
          </svg>
          <p style={{ marginTop: "8px" }}>暂无数据</p>
        </div>
      </div>
    );
  }

  return (
    <div
      style={{
        backgroundColor: "#ffffff",
        borderRadius: "12px",
        boxShadow: "0 1px 3px 0 rgba(0, 0, 0, 0.1)",
        padding: "24px",
      }}
    >
      {title && (
        <h3
          style={{
            fontSize: "18px",
            fontWeight: 600,
            color: "#0f172a",
            marginBottom: "16px",
          }}
        >
          {title}
        </h3>
      )}
      <div style={{ overflowX: "auto" }}>
        <table
          style={{
            width: "100%",
            borderCollapse: "collapse",
            minWidth: "500px",
          }}
        >
          <thead>
            <tr>
              <th
                style={{
                  backgroundColor: "#f8fafc",
                  padding: "12px 16px",
                  textAlign: "left",
                  fontWeight: 600,
                  color: "#334155",
                  borderBottom: "2px solid #e2e8f0",
                  borderRight: "1px solid #e2e8f0",
                }}
              >
                {rows[0]}
              </th>
              {pivotResult.cols.map((col) => (
                <th
                  key={col}
                  style={{
                    backgroundColor: "#f8fafc",
                    padding: "12px 16px",
                    textAlign: "right",
                    fontWeight: 600,
                    color: "#334155",
                    borderBottom: "2px solid #e2e8f0",
                    borderRight: col !== pivotResult.cols[pivotResult.cols.length - 1] ? "1px solid #e2e8f0" : "none",
                  }}
                >
                  {col}
                </th>
              ))}
              <th
                style={{
                  backgroundColor: "#f1f5f9",
                  padding: "12px 16px",
                  textAlign: "right",
                  fontWeight: 600,
                  color: "#1e293b",
                  borderBottom: "2px solid #e2e8f0",
                }}
              >
                总计
              </th>
            </tr>
          </thead>
          <tbody>
            {sortedRows.map((row) => (
              <tr key={row} style={{ borderBottom: "1px solid #e2e8f0" }}>
                <td
                  style={{
                    padding: "12px 16px",
                    fontWeight: 500,
                    color: "#1e293b",
                    borderRight: "1px solid #e2e8f0",
                  }}
                  onClick={() => handleSort(row as string)}
                  style={{
                    cursor: "pointer",
                    padding: "12px 16px",
                    fontWeight: 500,
                    color: "#1e293b",
                    borderRight: "1px solid #e2e8f0",
                  }}
                >
                  {row}
                  {sortConfig?.key === row && (
                    <span style={{ marginLeft: "8px", color: "#6366f1" }}>
                      {sortConfig.direction === "asc" ? "↑" : "↓"}
                    </span>
                  )}
                </td>
                {pivotResult.cols.map((col) => (
                  <td
                    key={col}
                    style={{
                      padding: "12px 16px",
                      textAlign: "right",
                      color: "#475569",
                      borderRight: col !== pivotResult.cols[pivotResult.cols.length - 1] ? "1px solid #e2e8f0" : "none",
                    }}
                  >
                    {pivotResult.cells[row as string]?.[col as string]?.toLocaleString()}
                  </td>
                ))}
                <td
                  style={{
                    padding: "12px 16px",
                    textAlign: "right",
                    fontWeight: 600,
                    color: "#1e293b",
                    backgroundColor: "#f8fafc",
                  }}
                >
                  {rowTotals[row as string]?.toLocaleString()}
                </td>
              </tr>
            ))}
            <tr style={{ backgroundColor: "#f1f5f9" }}>
              <td
                style={{
                  padding: "12px 16px",
                  fontWeight: 600,
                  color: "#1e293b",
                  borderRight: "1px solid #e2e8f0",
                }}
              >
                总计
              </td>
              {pivotResult.cols.map((col) => (
                <td
                  key={col}
                  style={{
                    padding: "12px 16px",
                    textAlign: "right",
                    fontWeight: 600,
                    color: "#1e293b",
                    borderRight: col !== pivotResult.cols[pivotResult.cols.length - 1] ? "1px solid #e2e8f0" : "none",
                  }}
                >
                  {colTotals[col as string]?.toLocaleString()}
                </td>
              ))}
              <td
                style={{
                  padding: "12px 16px",
                  textAlign: "right",
                  fontWeight: 700,
                  color: "#6366f1",
                  backgroundColor: "#e0e7ff",
                }}
              >
                {grandTotal.toLocaleString()}
              </td>
            </tr>
          </tbody>
        </table>
      </div>
      <div
        style={{
          marginTop: "12px",
          fontSize: "13px",
          color: "#94a3b8",
          textAlign: "right",
        }}
      >
        聚合方式: {aggregator} | 总计: {grandTotal.toLocaleString()}
      </div>
    </div>
  );
};

export default PivotTable;
