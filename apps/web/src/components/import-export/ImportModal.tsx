import React, { useState, useRef } from "react";
import {
  X,
  Upload,
  FileSpreadsheet,
  AlertCircle,
  CheckCircle,
  Loader2,
} from "lucide-react";

export interface ImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImport: (
    file: File,
    entityType: string,
    importMode: string,
  ) => Promise<void>;
  entityTypes: Array<{ value: string; label: string }>;
  title?: string;
}

export interface ImportResult {
  total_rows: number;
  success_rows: number;
  failed_rows: Array<{
    row: number;
    field: string;
    message: string;
    value: string;
  }>;
  errors: string[];
}

export const ImportModal: React.FC<ImportModalProps> = ({
  isOpen,
  onClose,
  onImport,
  entityTypes,
  title = "导入数据",
}) => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [entityType, setEntityType] = useState<string>("");
  const [importMode, setImportMode] = useState<string>("create");
  const [isImporting, setIsImporting] = useState(false);
  const [importResult, setImportResult] = useState<ImportResult | null>(null);
  const [error, setError] = useState<string>("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const validTypes = [
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "application/vnd.ms-excel",
        "text/csv",
      ];
      if (
        validTypes.includes(file.type) ||
        file.name.endsWith(".csv") ||
        file.name.endsWith(".xlsx")
      ) {
        setSelectedFile(file);
        setError("");
      } else {
        setError("请选择 Excel 或 CSV 文件");
        setSelectedFile(null);
      }
    }
  };

  const handleImport = async () => {
    if (!selectedFile || !entityType) {
      setError("请选择文件和导入类型");
      return;
    }

    setIsImporting(true);
    setError("");
    setImportResult(null);

    try {
      await onImport(selectedFile, entityType, importMode);
    } catch (err: any) {
      setError(err.message || "导入失败");
    } finally {
      setIsImporting(false);
    }
  };

  const handleClose = () => {
    setSelectedFile(null);
    setEntityType("");
    setImportMode("create");
    setImportResult(null);
    setError("");
    onClose();
  };

  return (
    <div style={{ position: "fixed", inset: 0, backgroundColor: "rgba(0, 0, 0, 0.5)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 50, padding: 16 }}>
      <div style={{ backgroundColor: "white", borderRadius: 12, boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.25)", width: "100%", maxWidth: 576, maxHeight: "90vh", overflow: "hidden" }}>
        <div style={{ padding: 24, borderBottom: "1px solid #e2e8f0", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <h3 style={{ fontSize: 18, fontWeight: 600, color: "#0f172a", margin: 0 }}>{title}</h3>
          <button
            onClick={handleClose}
            style={{ color: "#94a3b8" }}
          >
            <X style={{ width: 20, height: 20 }} />
          </button>
        </div>

        <div style={{ padding: 24, display: "flex", flexDirection: "column", gap: 16, maxHeight: "calc(90vh - 180px)", overflowY: "auto" }}>
          {!importResult ? (
            <>
              <div>
                <label style={{ display: "block", fontSize: 14, fontWeight: 500, color: "#334155", marginBottom: 8 }}>
                  导入类型 *
                </label>
                <select
                  value={entityType}
                  onChange={(e) => setEntityType(e.target.value)}
                  style={{ width: "100%", padding: "8px 12px", border: "1px solid #e2e8f0", borderRadius: 8, outline: "none" }}
                >
                  <option value="">请选择导入类型</option>
                  {entityTypes.map((type) => (
                    <option key={type.value} value={type.value}>
                      {type.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label style={{ display: "block", fontSize: 14, fontWeight: 500, color: "#334155", marginBottom: 8 }}>
                  导入模式
                </label>
                <select
                  value={importMode}
                  onChange={(e) => setImportMode(e.target.value)}
                  style={{ width: "100%", padding: "8px 12px", border: "1px solid #e2e8f0", borderRadius: 8, outline: "none" }}
                >
                  <option value="create">仅创建（跳过已存在）</option>
                  <option value="update">仅更新</option>
                  <option value="create_update">创建或更新</option>
                </select>
              </div>

              <div>
                <label style={{ display: "block", fontSize: 14, fontWeight: 500, color: "#334155", marginBottom: 8 }}>
                  选择文件 *
                </label>
                <div
                  onClick={() => fileInputRef.current?.click()}
                  style={{ border: "2px dashed #cbd5e1", borderRadius: 8, padding: 32, textAlign: "center", cursor: "pointer" }}
                >
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".csv,.xlsx"
                    onChange={handleFileSelect}
                    style={{ display: "none" }}
                  />
                  {selectedFile ? (
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "center" }}>
                      <FileSpreadsheet style={{ width: 32, height: 32, color: "#16a34a", marginRight: 8 }} />
                      <span style={{ color: "#334155" }}>
                        {selectedFile.name}
                      </span>
                    </div>
                  ) : (
                    <>
                      <Upload style={{ width: 48, height: 48, color: "#94a3b8", margin: "0 auto 8px" }} />
                      <p style={{ color: "#475569", margin: "8px 0 0" }}>
                        点击选择文件 或 拖拽文件到此处
                      </p>
                      <p style={{ fontSize: 14, color: "#64748b", marginTop: 4 }}>
                        支持 .xlsx, .csv 格式
                      </p>
                    </>
                  )}
                </div>
              </div>

              {error && (
                <div style={{ display: "flex", alignItems: "center", color: "#dc2626", fontSize: 14 }}>
                  <AlertCircle style={{ width: 16, height: 16, marginRight: 8 }} />
                  {error}
                </div>
              )}
            </>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              <div style={{ backgroundColor: "#f0fdf4", border: "1px solid #bbf7d0", borderRadius: 8, padding: 16 }}>
                <div style={{ display: "flex", alignItems: "center", marginBottom: 8 }}>
                  <CheckCircle style={{ width: 20, height: 20, color: "#16a34a", marginRight: 8 }} />
                  <span style={{ fontWeight: 500, color: "#166534" }}>导入完成</span>
                </div>
                <div style={{ fontSize: 14, color: "#15803d", display: "flex", flexDirection: "column", gap: 4 }}>
                  <p>总行数: {importResult.total_rows}</p>
                  <p>成功: {importResult.success_rows}</p>
                  <p>失败: {importResult.failed_rows.length}</p>
                </div>
              </div>

              {importResult.failed_rows.length > 0 && (
                <div>
                  <h4 style={{ fontWeight: 500, color: "#334155", marginBottom: 8 }}>错误详情:</h4>
                  <div style={{ backgroundColor: "#fef2f2", border: "1px solid #fecaca", borderRadius: 8, padding: 16, maxHeight: 240, overflowY: "auto" }}>
                    {importResult.failed_rows.slice(0, 10).map((error, idx) => (
                      <div
                        key={idx}
                        style={{ fontSize: 14, color: "#b91c1c", marginBottom: 8 }}
                      >
                        <span style={{ fontWeight: 500 }}>第{error.row}行:</span>{" "}
                        {error.message}
                        {error.field && ` (字段: ${error.field})`}
                      </div>
                    ))}
                    {importResult.failed_rows.length > 10 && (
                      <p style={{ fontSize: 14, color: "#dc2626", marginTop: 8 }}>
                        ... 还有 {importResult.failed_rows.length - 10} 个错误
                      </p>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        <div style={{ padding: 24, borderTop: "1px solid #e2e8f0", display: "flex", justifyContent: "flex-end", gap: 12 }}>
          <button
            onClick={handleClose}
            style={{ padding: "8px 16px", color: "#334155", backgroundColor: "#f1f5f9", borderRadius: 8 }}
          >
            {importResult ? "关闭" : "取消"}
          </button>
          {!importResult && (
            <button
              onClick={handleImport}
              disabled={!selectedFile || !entityType || isImporting}
              style={{ padding: "8px 16px", backgroundColor: "#2563eb", color: "white", borderRadius: 8 }}
            >
              {isImporting ? (
                <span style={{ display: "flex", alignItems: "center" }}>
                  <Loader2 style={{ width: 16, height: 16, animation: "spin 1s linear infinite", marginRight: 8 }} />
                  导入中...
                </span>
              ) : (
                "开始导入"
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default ImportModal;
