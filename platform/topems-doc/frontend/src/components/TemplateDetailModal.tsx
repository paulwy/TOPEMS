import { X, FileText } from 'lucide-react';
import type { TemplateResponse } from '../types';

interface TemplateDetailModalProps {
  template: TemplateResponse;
  onClose: () => void;
}

export function TemplateDetailModal({ template, onClose }: TemplateDetailModalProps) {
  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const formatSize = (content: string) => {
    const bytes = new Blob([content]).size;
    return `${(bytes / 1024).toFixed(2)} KB`;
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20">
        <div className="fixed inset-0 transition-opacity bg-gray-500 bg-opacity-75" onClick={onClose}></div>

        <div className="relative w-full max-w-4xl bg-white rounded-lg shadow-xl">
          <div className="flex items-center justify-between p-6 border-b border-gray-200">
            <div className="flex items-center gap-3">
              <FileText className="h-6 w-6 text-blue-600" />
              <div>
                <h2 className="text-lg font-medium text-gray-900">{template.name}</h2>
                <p className="text-sm text-gray-500">{template.code}</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 text-gray-400 hover:text-gray-600"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          <div className="p-6">
            <div className="grid grid-cols-2 gap-4 mb-6">
              <div>
                <h3 className="text-sm font-medium text-gray-500 mb-1">模块</h3>
                <p className="text-gray-900">{template.module}</p>
              </div>
              {template.category_name && (
                <div>
                  <h3 className="text-sm font-medium text-gray-500 mb-1">分类</h3>
                  <p className="text-gray-900">{template.category_name}</p>
                </div>
              )}
              <div>
                <h3 className="text-sm font-medium text-gray-500 mb-1">大小</h3>
                <p className="text-gray-900">{formatSize(template.content)}</p>
              </div>
              <div>
                <h3 className="text-sm font-medium text-gray-500 mb-1">状态</h3>
                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                  template.is_active 
                    ? 'bg-green-100 text-green-800' 
                    : 'bg-gray-100 text-gray-800'
                }`}>
                  {template.is_active ? '启用' : '禁用'}
                </span>
              </div>
              <div>
                <h3 className="text-sm font-medium text-gray-500 mb-1">浏览次数</h3>
                <p className="text-gray-900">{template.view_count}</p>
              </div>
              <div>
                <h3 className="text-sm font-medium text-gray-500 mb-1">使用次数</h3>
                <p className="text-gray-900">{template.use_count}</p>
              </div>
              <div>
                <h3 className="text-sm font-medium text-gray-500 mb-1">创建时间</h3>
                <p className="text-gray-900">{formatDate(template.created_at)}</p>
              </div>
              <div>
                <h3 className="text-sm font-medium text-gray-500 mb-1">更新时间</h3>
                <p className="text-gray-900">{formatDate(template.updated_at)}</p>
              </div>
              <div>
                <h3 className="text-sm font-medium text-gray-500 mb-1">创建者</h3>
                <p className="text-gray-900">{template.created_by}</p>
              </div>
            </div>

            {template.description && (
              <div className="mb-6">
                <h3 className="text-sm font-medium text-gray-500 mb-1">描述</h3>
                <p className="text-gray-900">{template.description}</p>
              </div>
            )}

            <div>
              <h3 className="text-sm font-medium text-gray-500 mb-2">内容</h3>
              <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 max-h-96 overflow-auto">
                <pre className="text-sm text-gray-700 whitespace-pre-wrap">{template.content}</pre>
              </div>
            </div>

            {template.variables && Object.keys(template.variables as object).length > 0 && (
              <div className="mt-6">
                <h3 className="text-sm font-medium text-gray-500 mb-2">变量</h3>
                <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                  <pre className="text-sm text-gray-700 whitespace-pre-wrap">
                    {JSON.stringify(template.variables, null, 2)}
                  </pre>
                </div>
              </div>
            )}
          </div>

          <div className="flex justify-end gap-2 p-6 border-t border-gray-200">
            <button
              onClick={onClose}
              className="px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50"
            >
              关闭
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
