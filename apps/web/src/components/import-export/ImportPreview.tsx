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
      <div className="text-center py-8">
        <AlertCircle className="w-12 h-12 text-yellow-500 mx-auto mb-2" />
        <p className="text-slate-600">没有可预览的数据</p>
      </div>
    );
  }

  const columns = Object.keys(data[0] || {});

  return (
    <div className="space-y-4">
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <p className="text-sm text-blue-800">
          共 {data.length} 条数据，将导入 {data.length - errors.length} 条
          {errors.length > 0 && `，${errors.length} 条有错误`}
        </p>
      </div>

      <div className="border border-slate-200 rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-4 py-2 text-left text-xs font-medium text-slate-500 uppercase">
                  行号
                </th>
                {columns.map((col) => (
                  <th
                    key={col}
                    className="px-4 py-2 text-left text-xs font-medium text-slate-500 uppercase"
                  >
                    {col}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-slate-200">
              {data.slice(0, 20).map((row, idx) => {
                const rowErrors = errors.filter((e) => e.row === idx + 1);
                return (
                  <tr
                    key={idx}
                    className={rowErrors.length > 0 ? "bg-red-50" : ""}
                  >
                    <td className="px-4 py-2 text-sm text-slate-600">
                      {idx + 1}
                    </td>
                    {columns.map((col) => (
                      <td
                        key={col}
                        className="px-4 py-2 text-sm text-slate-900"
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
          <div className="px-4 py-2 bg-slate-50 text-sm text-slate-600 text-center">
            ... 还有 {data.length - 20} 行数据
          </div>
        )}
      </div>

      {errors.length > 0 && (
        <div>
          <h4 className="font-medium text-slate-700 mb-2 flex items-center">
            <AlertCircle className="w-4 h-4 mr-1 text-red-500" />
            验证错误:
          </h4>
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 max-h-60 overflow-y-auto">
            {errors.slice(0, 20).map((error, idx) => (
              <div key={idx} className="text-sm text-red-700 mb-2 last:mb-0">
                <span className="font-medium">
                  第{error.row}行 {error.field}:
                </span>{" "}
                {error.message}
              </div>
            ))}
            {errors.length > 20 && (
              <p className="text-sm text-red-600 mt-2">
                ... 还有 {errors.length - 20} 个错误
              </p>
            )}
          </div>
        </div>
      )}

      <div className="flex justify-end space-x-3 pt-4 border-t border-slate-200">
        <button
          onClick={onCancel}
          className="px-4 py-2 text-slate-700 bg-slate-100 rounded-lg hover:bg-slate-200 transition-colors"
        >
          取消
        </button>
        <button
          onClick={onConfirm}
          disabled={errors.length > 0}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          确认导入
        </button>
      </div>
    </div>
  );
};

export default ImportPreview;
