import React, { useState } from "react";
import {
  X,
  Download,
  ChevronLeft,
  ChevronRight,
  FileText,
  Columns,
  Rows3,
} from "lucide-react";
import type { ReportData } from "../api/report";

interface ReportViewerProps {
  report: ReportData;
  onClose: () => void;
}

const ReportViewer: React.FC<ReportViewerProps> = ({ report, onClose }) => {
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [sortColumn, setSortColumn] = useState<string | null>(null);
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc");

  const sortedData = [...report.data].sort((a, b) => {
    if (!sortColumn) return 0;
    const aVal = a[sortColumn];
    const bVal = b[sortColumn];

    if (aVal === undefined || aVal === null) return 1;
    if (bVal === undefined || bVal === null) return -1;

    if (typeof aVal === "number" && typeof bVal === "number") {
      return sortDirection === "asc" ? aVal - bVal : bVal - aVal;
    }

    const aStr = String(aVal);
    const bStr = String(bVal);
    return sortDirection === "asc"
      ? aStr.localeCompare(bStr, "zh-CN")
      : bStr.localeCompare(aStr, "zh-CN");
  });

  const totalPages = Math.ceil(sortedData.length / pageSize);
  const startIndex = (currentPage - 1) * pageSize;
  const endIndex = startIndex + pageSize;
  const currentData = sortedData.slice(startIndex, endIndex);

  const handleSort = (column: string) => {
    if (sortColumn === column) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortColumn(column);
      setSortDirection("asc");
    }
  };

  const getCellValue = (value: any): string => {
    if (value === undefined || value === null) return "-";
    if (typeof value === "object") return JSON.stringify(value);
    return String(value);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-7xl max-h-[95vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="p-6 border-b border-slate-200 bg-gradient-to-r from-blue-50 to-indigo-50">
          <div className="flex justify-between items-start">
            <div>
              <h3 className="text-xl font-semibold text-slate-900">
                {report.config.title}
              </h3>
              {report.config.description && (
                <p className="text-sm text-slate-600 mt-1">
                  {report.config.description}
                </p>
              )}
              <div className="flex items-center space-x-4 mt-3 text-sm text-slate-500">
                <span className="flex items-center">
                  <Rows3 className="w-4 h-4 mr-1" />共 {report.row_count} 条记录
                </span>
                <span className="flex items-center">
                  <Columns className="w-4 h-4 mr-1" />
                  {report.config.columns.length} 列
                </span>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Table */}
        <div className="flex-1 overflow-auto p-6">
          <div className="overflow-x-auto border border-slate-200 rounded-lg">
            <table className="min-w-full divide-y divide-slate-200">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                    #
                  </th>
                  {report.config.columns.map((column) => (
                    <th
                      key={column}
                      onClick={() => handleSort(column)}
                      className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider cursor-pointer hover:bg-slate-100"
                    >
                      <div className="flex items-center space-x-1">
                        <span>{column}</span>
                        {sortColumn === column && (
                          <span className="text-blue-600">
                            {sortDirection === "asc" ? "↑" : "↓"}
                          </span>
                        )}
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-slate-200">
                {currentData.length === 0 ? (
                  <tr>
                    <td
                      colSpan={report.config.columns.length + 1}
                      className="px-4 py-12 text-center"
                    >
                      <FileText className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                      <p className="text-slate-500">暂无数据</p>
                    </td>
                  </tr>
                ) : (
                  currentData.map((row, idx) => (
                    <tr key={idx} className="hover:bg-slate-50">
                      <td className="px-4 py-3 text-sm text-slate-500">
                        {startIndex + idx + 1}
                      </td>
                      {report.config.columns.map((column) => (
                        <td
                          key={column}
                          className="px-4 py-3 text-sm text-slate-900"
                        >
                          {getCellValue(row[column])}
                        </td>
                      ))}
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Pagination */}
        <div className="p-4 border-t border-slate-200 bg-slate-50">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <span className="text-sm text-slate-600">每页显示</span>
              <select
                value={pageSize}
                onChange={(e) => {
                  setPageSize(Number(e.target.value));
                  setCurrentPage(1);
                }}
                className="px-2 py-1 border border-slate-200 rounded text-sm"
              >
                <option value={10}>10</option>
                <option value={20}>20</option>
                <option value={50}>50</option>
                <option value={100}>100</option>
              </select>
              <span className="text-sm text-slate-600">条</span>
            </div>

            <div className="flex items-center space-x-2">
              <span className="text-sm text-slate-600">
                显示 {startIndex + 1}-{Math.min(endIndex, report.row_count)} 共{" "}
                {report.row_count}
              </span>
              <button
                onClick={() => setCurrentPage(currentPage - 1)}
                disabled={currentPage === 1}
                className="p-2 text-slate-600 hover:bg-slate-100 rounded disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className="text-sm text-slate-600">
                第 {currentPage}/{totalPages} 页
              </span>
              <button
                onClick={() => setCurrentPage(currentPage + 1)}
                disabled={currentPage === totalPages}
                className="p-2 text-slate-600 hover:bg-slate-100 rounded disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ReportViewer;
