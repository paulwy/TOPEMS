import React from "react";
import { AlertCircle } from "lucide-react";

export interface ImportPreviewProps {
  data: any[];
  errors: Array<{
    row: number;
    field: string;
    message: string;
    value: string;
  }>;
  onConfirm: () => void;
  onCancel: () => void;
}

export const ImportPreview: React.FC<ImportPreviewProps> = ({
  data,
  errors,
  onConfirm,
  onCancel,
}) => {
  if (data.length === 0) {
    return (
      <div style={{ textAlign: "center", paddingTop: 32, paddingBottom: 32 }}>
        <AlertCircle style={{ width: 48, height: 48, color: "#eab308", margin: "0 auto 8px" }} />
        <p style={{ color: "#475569", margin: 0 }}>没有可预览的数据</p>
      </div>
    );
  }

  const columns = Object.keys(data[0] || {});

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <div style={{ backgroundColor: "#eff6ff", border: "1px solid #bfdbfe", borderRadius: 8, padding: 16 }}>
        <p style={{ fontSize: 14, color: "#1e40af", margin: 0 }}>
          共 {data.length} 条数据，将导入 {data.length - errors.length} 条
          {errors.length > 0 && `，${errors.length} 条有错误`}
        </p>
      </div>

      <div style={{ border: "1px solid #e2e8f0", borderRadius: 8, overflow: "hidden" }}>
        <div style={{ overflowX: "auto" }}>
          <table style={{ minWidth: "100%", borderCollapse: "collapse" }}>
            <thead style={{ backgroundColor: "#f8fafc" }}>
              <tr>
                <th style={{ padding: "8px 16px", textAlign: "left", fontSize: 12, fontWeight: 500, color: "#64748b", textTransform: "uppercase" }}>
                  行号
                </th>
                {columns.map((col) => (
                  <th
                    key={col}
                    style={{ padding: "8px 16px", textAlign: "left", fontSize: 12, fontWeight: 500, color: "#64748b", textTransform: "uppercase" }}
                  >
                    {col}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody style={{ backgroundColor: "white" }}>
              {data.slice(0, 20).map((row, idx) => {
                const rowErrors = errors.filter((e) => e.row === idx + 1);
                return (
                  <tr
                    key={idx}
                    style={rowErrors.length > 0 ? { backgroundColor: "#fef2f2" } : {}}
                  >
                    <td style={{ padding: "8px 16px", fontSize: 14, color: "#475569" }}>
                      {idx + 1}
                    </td>
                    {columns.map((col) => (
                      <td
                        key={col}
                        style={{ padding: "8px 16px", fontSize: 14, color: "#0f172a" }}
                      >
                        {String(row[col] || "")}
                      </td>
                    ))}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        {data.length > 20 && (
          <div style={{ padding: "8px 16px", backgroundColor: "#f8fafc", fontSize: 14, color: "#475569", textAlign: "center" }}>
            ... 还有 {data.length - 20} 行数据
          </div>
        )}
      </div>

      {errors.length > 0 && (
        <div>
          <h4 style={{ fontWeight: 500, color: "#334155", marginBottom: 8, display: "flex", alignItems: "center" }}>
            <AlertCircle style={{ width: 16, height: 16, marginRight: 4, color: "#ef4444" }} />
            验证错误:
          </h4>
          <div style={{ backgroundColor: "#fef2f2", border: "1px solid #fecaca", borderRadius: 8, padding: 16, maxHeight: 240, overflowY: "auto" }}>
            {errors.slice(0, 20).map((error, idx) => (
              <div key={idx} style={{ fontSize: 14, color: "#b91c1c", marginBottom: 8 }} sx={{ "&:last-child": { mb: 0 } }}>
                <span style={{ fontWeight: 500 }}>
                  第{error.row}行 {error.field}:
                </span>{" "}
                {error.message}
              </div>
            ))}
            {errors.length > 20 && (
              <p style={{ fontSize: 14, color: "#dc2626", marginTop: 8 }}>
                ... 还有 {errors.length - 20} 个错误
              </p>
            )}
          </div>
        </div>
      )}

      <div style={{ display: "flex", justifyContent: "flex-end", gap: 12, paddingTop: 16, borderTop: "1px solid #e2e8f0" }}>
        <button
          onClick={onCancel}
          style={{ padding: "8px 16px", color: "#334155", backgroundColor: "#f1f5f9", borderRadius: 8 }}
          sx={{ "&:hover": { backgroundColor: "#e2e8f0" }, transition: "colors 0.2s" }}
        >
          取消
        </button>
        <button
          onClick={onConfirm}
          disabled={errors.length > 0}
          style={{ padding: "8px 16px", backgroundColor: "#2563eb", color: "white", borderRadius: 8 }}
          sx={{ "&:hover": { backgroundColor: "#1d4ed8" }, "&:disabled": { opacity: 0.5, cursor: "not-allowed" }, transition: "colors 0.2s" }}
        >
          确认导入
        </button>
      </div>
    </div>
  );
};

export default ImportPreview;
