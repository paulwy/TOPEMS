import React from "react";
import { Loader2, CheckCircle, XCircle } from "lucide-react";

export interface ImportProgressProps {
  progress: number;
  totalRows: number;
  processedRows: number;
  successRows: number;
  failedRows: number;
  status: string;
}

export const ImportProgress: React.FC<ImportProgressProps> = ({
  progress,
  totalRows,
  processedRows,
  successRows,
  failedRows,
  status,
}) => {
  const getStatusIcon = () => {
    if (status === "completed") {
      return <CheckCircle style={{ width: 20, height: 20, color: "#16a34a" }} />;
    } else if (status === "failed") {
      return <XCircle style={{ width: 20, height: 20, color: "#dc2626" }} />;
    } else {
      return <Loader2 style={{ width: 20, height: 20, color: "#2563eb", animation: "spin 1s linear infinite" }} />;
    }
  };

  const getStatusText = () => {
    switch (status) {
      case "processing":
        return "处理中...";
      case "completed":
        return "导入完成";
      case "failed":
        return "导入失败";
      default:
        return "准备中...";
    }
  };

  return (
    <div style={{ backgroundColor: "white", borderRadius: 8, boxShadow: "0 10px 15px -3px rgba(0, 0, 0, 0.1)", padding: 24, maxWidth: 448, margin: "0 auto" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
        <h3 style={{ fontSize: 18, fontWeight: 600, color: "#0f172a", margin: 0 }}>导入进度</h3>
        {getStatusIcon()}
      </div>

      <div style={{ marginBottom: 16 }}>
        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 14, color: "#475569", marginBottom: 4 }}>
          <span>{getStatusText()}</span>
          <span>{progress}%</span>
        </div>
        <div style={{ width: "100%", backgroundColor: "#e2e8f0", borderRadius: 9999, height: 8 }}>
          <div
            style={{
              height: 8,
              borderRadius: 9999,
              transition: "all 0.3s",
              width: `${progress}%`,
              backgroundColor: status === "completed" ? "#16a34a" : status === "failed" ? "#dc2626" : "#2563eb"
            }}
          />
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 16, fontSize: 14 }}>
        <div>
          <p style={{ color: "#475569", margin: 0 }}>总行数</p>
          <p style={{ fontSize: 18, fontWeight: 600, color: "#0f172a", margin: 0 }}>{totalRows}</p>
        </div>
        <div>
          <p style={{ color: "#475569", margin: 0 }}>已处理</p>
          <p style={{ fontSize: 18, fontWeight: 600, color: "#0f172a", margin: 0 }}>
            {processedRows}
          </p>
        </div>
        <div>
          <p style={{ color: "#475569", margin: 0 }}>成功</p>
          <p style={{ fontSize: 18, fontWeight: 600, color: "#16a34a", margin: 0 }}>{successRows}</p>
        </div>
        <div>
          <p style={{ color: "#475569", margin: 0 }}>失败</p>
          <p style={{ fontSize: 18, fontWeight: 600, color: "#dc2626", margin: 0 }}>{failedRows}</p>
        </div>
      </div>

      {status === "processing" && (
        <div style={{ marginTop: 16, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, color: "#475569" }}>
          <Loader2 style={{ width: 16, height: 16, animation: "spin 1s linear infinite", marginRight: 8 }} />
          正在导入数据，请稍候...
        </div>
      )}
    </div>
  );
};

export default ImportProgress;
