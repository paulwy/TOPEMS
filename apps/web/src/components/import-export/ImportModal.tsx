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
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-hidden">
        <div className="p-6 border-b border-slate-200 flex justify-between items-center">
          <h3 className="text-lg font-semibold text-slate-900">{title}</h3>
          <button
            onClick={handleClose}
            className="text-slate-400 hover:text-slate-600"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-4 max-h-[calc(90vh-180px)] overflow-y-auto">
          {!importResult ? (
            <>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  导入类型 *
                </label>
                <select
                  value={entityType}
                  onChange={(e) => setEntityType(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500"
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
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  导入模式
                </label>
                <select
                  value={importMode}
                  onChange={(e) => setImportMode(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500"
                >
                  <option value="create">仅创建（跳过已存在）</option>
                  <option value="update">仅更新</option>
                  <option value="create_update">创建或更新</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  选择文件 *
                </label>
                <div
                  onClick={() => fileInputRef.current?.click()}
                  className="border-2 border-dashed border-slate-300 rounded-lg p-8 text-center cursor-pointer hover:border-blue-500 transition-colors"
                >
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".csv,.xlsx"
                    onChange={handleFileSelect}
                    className="hidden"
                  />
                  {selectedFile ? (
                    <div className="flex items-center justify-center">
                      <FileSpreadsheet className="w-8 h-8 text-green-600 mr-2" />
                      <span className="text-slate-700">
                        {selectedFile.name}
                      </span>
                    </div>
                  ) : (
                    <>
                      <Upload className="w-12 h-12 text-slate-400 mx-auto mb-2" />
                      <p className="text-slate-600">
                        点击选择文件 或 拖拽文件到此处
                      </p>
                      <p className="text-sm text-slate-500 mt-1">
                        支持 .xlsx, .csv 格式
                      </p>
                    </>
                  )}
                </div>
              </div>

              {error && (
                <div className="flex items-center text-red-600 text-sm">
                  <AlertCircle className="w-4 h-4 mr-2" />
                  {error}
                </div>
              )}
            </>
          ) : (
            <div className="space-y-4">
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <div className="flex items-center mb-2">
                  <CheckCircle className="w-5 h-5 text-green-600 mr-2" />
                  <span className="font-medium text-green-800">导入完成</span>
                </div>
                <div className="text-sm text-green-700 space-y-1">
                  <p>总行数: {importResult.total_rows}</p>
                  <p>成功: {importResult.success_rows}</p>
                  <p>失败: {importResult.failed_rows.length}</p>
                </div>
              </div>

              {importResult.failed_rows.length > 0 && (
                <div>
                  <h4 className="font-medium text-slate-700 mb-2">错误详情:</h4>
                  <div className="bg-red-50 border border-red-200 rounded-lg p-4 max-h-60 overflow-y-auto">
                    {importResult.failed_rows.slice(0, 10).map((error, idx) => (
                      <div
                        key={idx}
                        className="text-sm text-red-700 mb-2 last:mb-0"
                      >
                        <span className="font-medium">第{error.row}行:</span>{" "}
                        {error.message}
                        {error.field && ` (字段: ${error.field})`}
                      </div>
                    ))}
                    {importResult.failed_rows.length > 10 && (
                      <p className="text-sm text-red-600 mt-2">
                        ... 还有 {importResult.failed_rows.length - 10} 个错误
                      </p>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        <div className="p-6 border-t border-slate-200 flex justify-end space-x-3">
          <button
            onClick={handleClose}
            className="px-4 py-2 text-slate-700 bg-slate-100 rounded-lg hover:bg-slate-200 transition-colors"
          >
            {importResult ? "关闭" : "取消"}
          </button>
          {!importResult && (
            <button
              onClick={handleImport}
              disabled={!selectedFile || !entityType || isImporting}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isImporting ? (
                <span className="flex items-center">
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
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
