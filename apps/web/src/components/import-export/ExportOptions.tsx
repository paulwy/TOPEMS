import React, { useState } from "react";
import { X, Download, Check } from "lucide-react";

export interface ExportOptionsProps {
  isOpen: boolean;
  onClose: () => void;
  onExport: (format: string, columns: string[]) => void;
  availableColumns: Array<{ key: string; label: string }>;
  title?: string;
}

export const ExportOptions: React.FC<ExportOptionsProps> = ({
  isOpen,
  onClose,
  onExport,
  availableColumns,
  title = "导出选项",
}) => {
  const [format, setFormat] = useState("csv");
  const [selectedColumns, setSelectedColumns] = useState<string[]>(
    availableColumns.map((col) => col.key),
  );
  const [selectAll, setSelectAll] = useState(true);

  if (!isOpen) return null;

  const handleSelectAll = () => {
    if (selectAll) {
      setSelectedColumns([]);
    } else {
      setSelectedColumns(availableColumns.map((col) => col.key));
    }
    setSelectAll(!selectAll);
  };

  const handleToggleColumn = (key: string) => {
    if (selectedColumns.includes(key)) {
      setSelectedColumns(selectedColumns.filter((k) => k !== key));
    } else {
      setSelectedColumns([...selectedColumns, key]);
    }
  };

  const handleExport = () => {
    onExport(format, selectedColumns);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-hidden">
        <div className="p-6 border-b border-slate-200 flex justify-between items-center">
          <h3 className="text-lg font-semibold text-slate-900">{title}</h3>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-6 max-h-[calc(90vh-180px)] overflow-y-auto">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              导出格式
            </label>
            <div className="space-y-2">
              <label className="flex items-center">
                <input
                  type="radio"
                  name="format"
                  value="csv"
                  checked={format === "csv"}
                  onChange={(e) => setFormat(e.target.value)}
                  className="mr-2"
                />
                <span className="text-sm text-slate-700">CSV (逗号分隔)</span>
              </label>
              <label className="flex items-center">
                <input
                  type="radio"
                  name="format"
                  value="xlsx"
                  checked={format === "xlsx"}
                  onChange={(e) => setFormat(e.target.value)}
                  className="mr-2"
                />
                <span className="text-sm text-slate-700">Excel (.xlsx)</span>
              </label>
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-sm font-medium text-slate-700">
                选择导出列
              </label>
              <button
                onClick={handleSelectAll}
                className="text-sm text-blue-600 hover:text-blue-700"
              >
                {selectAll ? "取消全选" : "全选"}
              </button>
            </div>
            <div className="border border-slate-200 rounded-lg p-4 max-h-60 overflow-y-auto">
              <div className="space-y-2">
                {availableColumns.map((column) => (
                  <label
                    key={column.key}
                    className="flex items-center cursor-pointer hover:bg-slate-50 p-2 rounded"
                  >
                    <input
                      type="checkbox"
                      checked={selectedColumns.includes(column.key)}
                      onChange={() => handleToggleColumn(column.key)}
                      className="mr-3"
                    />
                    <span className="text-sm text-slate-700">
                      {column.label}
                    </span>
                  </label>
                ))}
              </div>
            </div>
          </div>

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <p className="text-sm text-blue-800">
              已选择 {selectedColumns.length} 列，共 {availableColumns.length}{" "}
              列
            </p>
          </div>
        </div>

        <div className="p-6 border-t border-slate-200 flex justify-end space-x-3">
          <button
            onClick={onClose}
            className="px-4 py-2 text-slate-700 bg-slate-100 rounded-lg hover:bg-slate-200 transition-colors"
          >
            取消
          </button>
          <button
            onClick={handleExport}
            disabled={selectedColumns.length === 0}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <span className="flex items-center">
              <Download className="w-4 h-4 mr-2" />
              导出
            </span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default ExportOptions;
