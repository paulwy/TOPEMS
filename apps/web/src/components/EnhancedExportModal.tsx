import React, { useState } from "react";
import {
  Download,
  X,
  FileSpreadsheet,
  File,
  FileJson,
  FileText,
  Image,
  Database,
  Loader2,
  ChevronRight,
} from "lucide-react";

export type ExportFormat =
  | "excel"
  | "pdf"
  | "csv"
  | "json"
  | "html"
  | "markdown"
  | "image"
  | "xml";

export interface ExportOptions {
  format: ExportFormat;
  includeHeaders: boolean;
  includeSummary: boolean;
  dateRange?: { start: string; end: string };
  selectedColumns?: string[];
  fileName?: string;
}

interface EnhancedExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onExport: (_options: ExportOptions) => void;
  availableColumns?: string[];
  defaultColumns?: string[];
}

const exportFormats: {
  id: ExportFormat;
  label: string;
  description: string;
  icon: React.ReactNode;
  color: string;
  extension: string;
}[] = [
  {
    id: "excel",
    label: "Excel",
    description: "Microsoft Excel 格式，支持复杂表格和公式",
    icon: <FileSpreadsheet className="w-6 h-6" />,
    color: "bg-green-500",
    extension: ".xlsx",
  },
  {
    id: "pdf",
    label: "PDF",
    description: "便携文档格式，适合打印和分享",
    icon: <File className="w-6 h-6" />,
    color: "bg-red-500",
    extension: ".pdf",
  },
  {
    id: "csv",
    label: "CSV",
    description: "逗号分隔值，兼容各种电子表格软件",
    icon: <FileText className="w-6 h-6" />,
    color: "bg-blue-500",
    extension: ".csv",
  },
  {
    id: "json",
    label: "JSON",
    description: "JavaScript对象表示法，适合程序处理",
    icon: <FileJson className="w-6 h-6" />,
    color: "bg-purple-500",
    extension: ".json",
  },
  {
    id: "html",
    label: "HTML",
    description: "网页格式，可直接在浏览器中查看",
    icon: <FileText className="w-6 h-6" />,
    color: "bg-orange-500",
    extension: ".html",
  },
  {
    id: "markdown",
    label: "Markdown",
    description: "轻量级标记语言，适合文档编写",
    icon: <FileText className="w-6 h-6" />,
    color: "bg-gray-500",
    extension: ".md",
  },
  {
    id: "image",
    label: "图片",
    description: "PNG图片格式，适合嵌入文档或演示",
    icon: <Image className="w-6 h-6" />,
    color: "bg-pink-500",
    extension: ".png",
  },
  {
    id: "xml",
    label: "XML",
    description: "可扩展标记语言，适合数据交换",
    icon: <Database className="w-6 h-6" />,
    color: "bg-teal-500",
    extension: ".xml",
  },
];

const EnhancedExportModal: React.FC<EnhancedExportModalProps> = ({
  isOpen,
  onClose,
  onExport,
  availableColumns = [],
  defaultColumns = [],
}) => {
  const [selectedFormat, setSelectedFormat] = useState<ExportFormat>("excel");
  const [includeHeaders, setIncludeHeaders] = useState(true);
  const [includeSummary, setIncludeSummary] = useState(false);
  const [selectedColumns, setSelectedColumns] =
    useState<string[]>(defaultColumns);
  const [customFileName, setCustomFileName] = useState("");
  const [isExporting, setIsExporting] = useState(false);
  const [showAdvancedOptions, setShowAdvancedOptions] = useState(false);

  const handleExport = async () => {
    setIsExporting(true);

    // Simulate export process
    await new Promise((resolve) => setTimeout(resolve, 1500));

    const options: ExportOptions = {
      format: selectedFormat,
      includeHeaders,
      includeSummary,
      selectedColumns: selectedColumns.length > 0 ? selectedColumns : undefined,
      fileName: customFileName || undefined,
    };

    onExport(options);
    setIsExporting(false);
    onClose();
  };

  const toggleColumn = (column: string) => {
    setSelectedColumns((prev) =>
      prev.includes(column)
        ? prev.filter((c) => c !== column)
        : [...prev, column],
    );
  };

  const selectAllColumns = () => {
    setSelectedColumns(availableColumns);
  };

  const deselectAllColumns = () => {
    setSelectedColumns([]);
  };

  const formatDescription = () => {
    const format = exportFormats.find((f) => f.id === selectedFormat);
    return format?.description || "";
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <Download className="w-6 h-6" />
              <h2 className="text-2xl font-bold">导出数据</h2>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-white/20 rounded-lg transition-colors"
            >
              <X className="w-6 h-6" />
            </button>
          </div>
          <p className="text-blue-100 text-sm mt-2">{formatDescription()}</p>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Format Selection */}
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              选择格式
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {exportFormats.map((format) => (
                <button
                  key={format.id}
                  onClick={() => setSelectedFormat(format.id)}
                  className={`p-4 rounded-lg border-2 transition-all text-left ${
                    selectedFormat === format.id
                      ? "border-blue-500 bg-blue-50"
                      : "border-gray-200 hover:border-blue-300"
                  }`}
                >
                  <div
                    className={`inline-flex p-2 rounded-lg ${
                      selectedFormat === format.id
                        ? format.color + " text-white"
                        : "bg-gray-100 text-gray-500"
                    }`}
                  >
                    {format.icon}
                  </div>
                  <div className="mt-2 font-medium text-gray-900">
                    {format.label}
                  </div>
                  <div className="text-xs text-gray-500 mt-1">
                    {format.extension}
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Basic Options */}
          <div className="space-y-3">
            <h3 className="text-lg font-semibold text-gray-900">基本选项</h3>

            <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
              <div>
                <div className="font-medium text-gray-900">包含表头</div>
                <div className="text-sm text-gray-500">
                  在文件开头包含列标题
                </div>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={includeHeaders}
                  onChange={(e) => setIncludeHeaders(e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
              </label>
            </div>

            <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
              <div>
                <div className="font-medium text-gray-900">包含摘要</div>
                <div className="text-sm text-gray-500">
                  在文件末尾添加统计摘要
                </div>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={includeSummary}
                  onChange={(e) => setIncludeSummary(e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
              </label>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                自定义文件名
              </label>
              <input
                type="text"
                value={customFileName}
                onChange={(e) => setCustomFileName(e.target.value)}
                className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="输入文件名（不含扩展名）"
              />
            </div>
          </div>

          {/* Advanced Options Toggle */}
          <button
            onClick={() => setShowAdvancedOptions(!showAdvancedOptions)}
            className="w-full flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
          >
            <span className="font-medium text-gray-900">高级选项</span>
            {showAdvancedOptions ? (
              <ChevronRight className="w-5 h-5 text-gray-500 rotate-90" />
            ) : (
              <ChevronRight className="w-5 h-5 text-gray-500" />
            )}
          </button>

          {/* Advanced Options */}
          {showAdvancedOptions && availableColumns.length > 0 && (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-gray-900">选择列</h3>

              <div className="flex items-center justify-between mb-3">
                <span className="text-sm text-gray-500">
                  已选择 {selectedColumns.length}/{availableColumns.length} 列
                </span>
                <div className="flex space-x-2">
                  <button
                    onClick={selectAllColumns}
                    className="text-sm text-blue-600 hover:text-blue-700"
                  >
                    全选
                  </button>
                  <span className="text-gray-300">|</span>
                  <button
                    onClick={deselectAllColumns}
                    className="text-sm text-gray-600 hover:text-gray-700"
                  >
                    取消全选
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                {availableColumns.map((column) => (
                  <label
                    key={column}
                    className={`flex items-center p-3 border rounded-lg cursor-pointer transition-colors ${
                      selectedColumns.includes(column)
                        ? "border-blue-500 bg-blue-50"
                        : "border-gray-200 hover:border-blue-300"
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={selectedColumns.includes(column)}
                      onChange={() => toggleColumn(column)}
                      className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                    />
                    <span className="ml-2 text-sm text-gray-700">{column}</span>
                  </label>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="bg-gray-50 px-6 py-4 border-t border-gray-200">
          <div className="flex items-center justify-between">
            <div className="text-sm text-gray-500">
              {selectedFormat === "excel" && "支持 .xlsx 格式"}
              {selectedFormat === "pdf" && "支持分页和打印"}
              {selectedFormat === "csv" && "兼容所有电子表格"}
              {selectedFormat === "json" && "结构化数据格式"}
              {selectedFormat === "html" && "浏览器友好"}
              {selectedFormat === "markdown" && "文档友好"}
              {selectedFormat === "image" && "PNG 图片格式"}
              {selectedFormat === "xml" && "数据交换标准"}
            </div>
            <div className="flex space-x-3">
              <button
                onClick={onClose}
                disabled={isExporting}
                className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-100 transition-colors disabled:opacity-50"
              >
                取消
              </button>
              <button
                onClick={handleExport}
                disabled={isExporting}
                className="flex items-center px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
              >
                {isExporting ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    导出中...
                  </>
                ) : (
                  <>
                    <Download className="w-4 h-4 mr-2" />
                    导出
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EnhancedExportModal;
