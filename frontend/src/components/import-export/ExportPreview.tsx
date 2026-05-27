import React from 'react';
import { FileText, Download, X } from 'lucide-react';

export interface ExportPreviewProps {
  isOpen: boolean;
  onClose: () => void;
  onDownload: () => void;
  data: any[];
  columns: string[];
  format: string;
  fileName?: string;
  title?: string;
}

export const ExportPreview: React.FC<ExportPreviewProps> = ({
  isOpen,
  onClose,
  onDownload,
  data,
  columns,
  format,
  fileName,
  title = '导出预览',
}) => {
  if (!isOpen) return null;

  const previewData = data.slice(0, 10);
  const getColumnLabel = (col: string) => {
    return col
      .replace(/_/g, ' ')
      .replace(/\b\w/g, (l) => l.toUpperCase());
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-4xl max-h-[90vh] overflow-hidden">
        <div className="p-6 border-b border-slate-200 flex justify-between items-center">
          <h3 className="text-lg font-semibold text-slate-900">{title}</h3>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 max-h-[calc(90vh-180px)] overflow-auto">
          <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-4">
            <div className="flex items-center mb-2">
              <FileText className="w-5 h-5 text-green-600 mr-2" />
              <span className="font-medium text-green-800">
                {fileName || `export.${format}`}
              </span>
            </div>
            <p className="text-sm text-green-700">
              共 {data.length} 条数据，{columns.length} 列
            </p>
          </div>

          <div className="border border-slate-200 rounded-lg overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-slate-200">
                <thead className="bg-slate-50">
                  <tr>
                    {columns.map((col) => (
                      <th
                        key={col}
                        className="px-4 py-2 text-left text-xs font-medium text-slate-500 uppercase"
                      >
                        {getColumnLabel(col)}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-slate-200">
                  {previewData.map((row, idx) => (
                    <tr key={idx}>
                      {columns.map((col) => (
                        <td
                          key={col}
                          className="px-4 py-2 text-sm text-slate-900"
                        >
                          {String(row[col] || '')}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {data.length > 10 && (
              <div className="px-4 py-2 bg-slate-50 text-sm text-slate-600 text-center">
                ... 还有 {data.length - 10} 行数据
              </div>
            )}
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
            onClick={onDownload}
            className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
          >
            <span className="flex items-center">
              <Download className="w-4 h-4 mr-2" />
              下载文件
            </span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default ExportPreview;
