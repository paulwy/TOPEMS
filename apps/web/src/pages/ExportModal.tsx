import React from "react";
import type { ReportData } from "../api/report";

interface ExportModalProps {
  report: ReportData;
  onClose: () => void;
}

const ExportModal: React.FC<ExportModalProps> = ({ report, onClose }) => {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-md">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold">导出报表</h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700"
          >
            ✕
          </button>
        </div>
        <div className="mb-4 p-4 bg-gray-50 rounded-lg">
          <p className="font-medium">{report.config.title}</p>
          <p className="text-sm text-gray-500">共 {report.row_count} 行数据</p>
        </div>
        <div className="mb-4">
          <label className="block text-sm font-medium text-slate-700 mb-2">
            选择导出格式
          </label>
          <select className="w-full px-3 py-2 border border-slate-200 rounded-lg">
            <option value="excel">Excel (.xlsx)</option>
            <option value="pdf">PDF</option>
            <option value="csv">CSV</option>
          </select>
        </div>
        <div className="flex justify-end gap-2">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600"
          >
            取消
          </button>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
          >
            导出
          </button>
        </div>
      </div>
    </div>
  );
};

export default ExportModal;
