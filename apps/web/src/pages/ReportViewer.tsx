import React, { useState, useMemo } from "react";
import {
  FileText,
  Download,
  Printer,
  Search,
  Calendar,
  User,
  Hash,
  ChevronLeft,
  ChevronRight,
  X,
  Table,
  Eye,
} from "lucide-react";
import type { ReportData } from "../api/report";

interface ReportViewerProps {
  report: ReportData;
  onClose: () => void;
}

const ReportViewer: React.FC<ReportViewerProps> = ({ report, onClose }) => {
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [showAllColumns, setShowAllColumns] = useState(false);
  const itemsPerPage = 10;

  const filteredData = useMemo(() => {
    if (!searchTerm) return report.data;
    return report.data.filter((row) =>
      Object.values(row).some((value) =>
        String(value).toLowerCase().includes(searchTerm.toLowerCase()),
      ),
    );
  }, [report.data, searchTerm]);

  const totalPages = Math.ceil(filteredData.length / itemsPerPage);
  const paginatedData = filteredData.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage,
  );

  const displayColumns = showAllColumns
    ? report.config.columns
    : report.config.columns.slice(0, 6);

  const handlePrint = () => {
    window.print();
  };

  const handleExportCSV = () => {
    const headers = report.config.columns.join(",");
    const rows = report.data.map((row) =>
      report.config.columns
        .map((col) => {
          const value = row[col];
          if (value === null || value === undefined) return "";
          const str = String(value);
          return str.includes(",") || str.includes('"') || str.includes("\n")
            ? `"${str.replace(/"/g, '""')}"`
            : str;
        })
        .join(","),
    );
    const csv = [headers, ...rows].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `${report.config.title}_${new Date().toISOString().split("T")[0]}.csv`;
    link.click();
  };

  const handleExportJSON = () => {
    const json = JSON.stringify(report.data, null, 2);
    const blob = new Blob([json], { type: "application/json" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `${report.config.title}_${new Date().toISOString().split("T")[0]}.json`;
    link.click();
  };

  const formatValue = (value: any): string => {
    if (value === null || value === undefined) return "-";
    if (typeof value === "boolean") return value ? "是" : "否";
    if (typeof value === "number") {
      return value.toLocaleString("zh-CN");
    }
    if (value instanceof Date) {
      return value.toLocaleDateString("zh-CN");
    }
    return String(value);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg w-full max-w-6xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white p-6">
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <div className="flex items-center space-x-3 mb-2">
                <FileText className="w-6 h-6" />
                <h2 className="text-2xl font-bold">{report.config.title}</h2>
              </div>
              {report.config.description && (
                <p className="text-blue-100 text-sm">
                  {report.config.description}
                </p>
              )}
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-white/20 rounded-lg transition-colors"
            >
              <X className="w-6 h-6" />
            </button>
          </div>
        </div>

        {/* Meta Info */}
        <div className="bg-gray-50 px-6 py-4 border-b border-gray-200">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div className="flex items-center space-x-6 text-sm text-gray-600">
              <span className="flex items-center">
                <Hash className="w-4 h-4 mr-1" />
                报表ID: {report.id}
              </span>
              <span className="flex items-center">
                <Calendar className="w-4 h-4 mr-1" />
                创建时间:{" "}
                {new Date(report.created_at).toLocaleDateString("zh-CN")}
              </span>
              <span className="flex items-center">
                <Table className="w-4 h-4 mr-1" />共 {report.row_count} 条记录
              </span>
              <span className="flex items-center">
                <User className="w-4 h-4 mr-1" />
                类型: {report.config.report_type}
              </span>
            </div>
            <div className="flex items-center space-x-2">
              <button
                onClick={handleExportCSV}
                className="flex items-center px-3 py-1.5 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm"
              >
                <Download className="w-4 h-4 mr-1" />
                导出CSV
              </button>
              <button
                onClick={handleExportJSON}
                className="flex items-center px-3 py-1.5 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors text-sm"
              >
                <Download className="w-4 h-4 mr-1" />
                导出JSON
              </button>
              <button
                onClick={handlePrint}
                className="flex items-center px-3 py-1.5 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors text-sm"
              >
                <Printer className="w-4 h-4 mr-1" />
                打印
              </button>
            </div>
          </div>
        </div>

        {/* Search */}
        <div className="px-6 py-4 border-b border-gray-200">
          <div className="flex items-center space-x-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                  setCurrentPage(1);
                }}
                placeholder="搜索报表数据..."
                className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <button
              onClick={() => setShowAllColumns(!showAllColumns)}
              className="flex items-center px-3 py-2 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors text-sm"
            >
              <Eye className="w-4 h-4 mr-1" />
              {showAllColumns ? "收起列" : "显示全部列"}
            </button>
            <span className="text-sm text-gray-500">
              {filteredData.length} 条匹配
            </span>
          </div>
        </div>

        {/* Table */}
        <div className="flex-1 overflow-auto p-6">
          {paginatedData.length === 0 ? (
            <div className="text-center py-12">
              <FileText className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500">暂无数据</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-16">
                      #
                    </th>
                    {displayColumns.map((column) => (
                      <th
                        key={column}
                        className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                      >
                        {column}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {paginatedData.map((row, idx) => (
                    <tr
                      key={idx}
                      className="hover:bg-gray-50 transition-colors"
                    >
                      <td className="px-4 py-3 text-sm text-gray-500">
                        {(currentPage - 1) * itemsPerPage + idx + 1}
                      </td>
                      {displayColumns.map((column) => (
                        <td
                          key={column}
                          className="px-4 py-3 text-sm text-gray-900 whitespace-nowrap"
                        >
                          {formatValue(row[column])}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="bg-white border-t border-gray-200 px-6 py-4">
            <div className="flex items-center justify-between">
              <div className="text-sm text-gray-500">
                显示 {(currentPage - 1) * itemsPerPage + 1} -{" "}
                {Math.min(currentPage * itemsPerPage, filteredData.length)} 条，
                共 {filteredData.length} 条
              </div>
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  className="px-3 py-1 border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                  let pageNum;
                  if (totalPages <= 5) {
                    pageNum = i + 1;
                  } else if (currentPage <= 3) {
                    pageNum = i + 1;
                  } else if (currentPage >= totalPages - 2) {
                    pageNum = totalPages - 4 + i;
                  } else {
                    pageNum = currentPage - 2 + i;
                  }
                  return (
                    <button
                      key={pageNum}
                      onClick={() => setCurrentPage(pageNum)}
                      className={`px-3 py-1 rounded-lg transition-colors ${
                        currentPage === pageNum
                          ? "bg-blue-600 text-white"
                          : "border border-gray-200 hover:bg-gray-50"
                      }`}
                    >
                      {pageNum}
                    </button>
                  );
                })}
                <button
                  onClick={() =>
                    setCurrentPage((p) => Math.min(totalPages, p + 1))
                  }
                  disabled={currentPage === totalPages}
                  className="px-3 py-1 border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Date Range Info */}
        {report.config.date_range && (
          <div className="bg-gray-50 px-6 py-3 border-t border-gray-200">
            <div className="flex items-center text-sm text-gray-600">
              <Calendar className="w-4 h-4 mr-2" />
              时间范围: {report.config.date_range.start_date} 至{" "}
              {report.config.date_range.end_date}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ReportViewer;
