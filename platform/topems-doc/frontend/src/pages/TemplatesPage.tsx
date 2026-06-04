import { useState, useEffect } from 'react';
import {
  Plus,
  Edit,
  Trash2,
  Copy,
  Eye,
  RefreshCw,
  Search,
  Filter,
  FileText,
  CheckCircle2,
  XCircle,
} from 'lucide-react';
import { useTemplateApi } from '../hooks/useTemplateApi';
import type { TemplateResponse } from '../types';
import { TemplateDetailModal } from '../components/TemplateDetailModal';
import { TemplateFormModal } from '../components/TemplateFormModal';

export function TemplatesPage() {
  const { loading, error, listTemplates, deleteTemplate, duplicateTemplate, toggleTemplateStatus } = useTemplateApi();
  const [templates, setTemplates] = useState<TemplateResponse[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(20);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [selectedModule, setSelectedModule] = useState<string>('');
  const [showActiveFilter, setShowActiveFilter] = useState<boolean | undefined>(undefined);

  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<TemplateResponse | null>(null);
  const [showFormModal, setShowFormModal] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<TemplateResponse | null>(null);
  const [isCreating, setIsCreating] = useState(false);

  useEffect(() => {
    loadTemplates();
  }, [page, searchQuery, selectedCategory, selectedModule, showActiveFilter]);

  const loadTemplates = async () => {
    try {
      const response = await listTemplates({
        page,
        page_size: pageSize,
        search: searchQuery || undefined,
        category: selectedCategory || undefined,
        module: selectedModule || undefined,
        is_active: showActiveFilter,
      });
      if (response?.data?.items) {
        setTemplates(response.data.items);
        setTotal(response.data.total);
      }
    } catch (err) {
      console.error('加载模板失败:', err);
    }
  };

  const handleCreate = () => {
    setIsCreating(true);
    setEditingTemplate(null);
    setShowFormModal(true);
  };

  const handleEdit = (template: TemplateResponse) => {
    setIsCreating(false);
    setEditingTemplate(template);
    setShowFormModal(true);
  };

  const handleView = (template: TemplateResponse) => {
    setSelectedTemplate(template);
    setShowDetailModal(true);
  };

  const handleDelete = async (template: TemplateResponse) => {
    if (!window.confirm(`确定要删除模板 "${template.name}" 吗？`)) {
      return;
    }

    try {
      await deleteTemplate(template.id);
      alert('删除成功');
      loadTemplates();
    } catch (err) {
      console.error('删除模板失败:', err);
      alert(err instanceof Error ? err.message : '删除失败，请重试');
    }
  };

  const handleDuplicate = async (template: TemplateResponse) => {
    try {
      await duplicateTemplate(template.id);
      alert('复制成功');
      loadTemplates();
    } catch (err) {
      console.error('复制模板失败:', err);
      alert(err instanceof Error ? err.message : '复制失败，请重试');
    }
  };

  const handleToggleStatus = async (template: TemplateResponse) => {
    try {
      await toggleTemplateStatus(template.id);
      loadTemplates();
    } catch (err) {
      console.error('切换状态失败:', err);
      alert(err instanceof Error ? err.message : '切换失败，请重试');
    }
  };

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

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <p className="text-red-800">{error}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">模板管理</h1>
          <p className="text-gray-600 mt-1">管理文档模板和标准化文档</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={loadTemplates}
            className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
          >
            <RefreshCw className={`h-4 w-4" />
            刷新
          </button>
          <button
            onClick={handleCreate}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            <Plus className="h-4 w-4" />
            新建模板
          </button>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow p-4">
        <div className="flex flex-wrap gap-4">
          <div className="flex-1 min-w-64">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                placeholder="搜索模板..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-gray-500" />
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg"
            >
              <option value="">全部分类</option>
            </select>
            <select
              value={showActiveFilter === undefined ? '' : showActiveFilter.toString()}
              onChange={(e) => {
                const val = e.target.value;
                setShowActiveFilter(val === '' ? undefined : val === 'true');
              }}
              className="px-3 py-2 border border-gray-300 rounded-lg"
            >
              <option value="">全部状态</option>
              <option value="true">启用</option>
              <option value="false">禁用</option>
            </select>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow overflow-hidden">
        {loading && templates.length === 0 ? (
          <div className="p-8 text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-4 text-gray-500">加载中...</p>
          </div>
        ) : templates.length === 0 ? (
          <div className="p-12 text-center">
            <FileText className="h-12 w-12 text-gray-300 mx-auto" />
            <h3 className="mt-4 text-lg font-medium text-gray-900">暂无模板</h3>
            <p className="mt-1 text-gray-500">创建您的第一个模板</p>
          </div>
        ) : (
          <>
            <div className="divide-y divide-gray-200">
              {templates.map((template) => (
                <div key={template.id} className="p-4 hover:bg-gray-50">
                  <div className="flex items-center justify-between">
                    <div className="flex items-start">
                      <div className="flex items-center gap-3">
                        <FileText className="h-8 w-8 text-blue-600" />
                        <div>
                          <div className="flex items-center gap-2">
                            <h3 className="font-medium text-gray-900">{template.name}</h3>
                            {template.is_system ? (
                              <span className="px-2 py-0.5 text-xs bg-purple-100 text-purple-700 rounded-full">
                                系统
                              </span>
                            ) : null}
                            {!template.is_active ? (
                              <span className="px-2 py-0.5 text-xs bg-gray-100 text-gray-600 rounded-full">
                                禁用
                              </span>
                            ) : null}
                          </div>
                          <p className="text-sm text-gray-500">
                            {template.description || '无描述'}
                          </p>
                          <div className="flex items-center gap-4 mt-1 text-xs text-gray-400">
                            <span>编码: {template.code}</span>
                            <span>模块: {template.module}</span>
                            {template.category_name && <span>分类: {template.category_name}</span>}
                            <span>浏览: {template.view_count}</span>
                            <span>使用: {template.use_count}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleView(template)}
                        className="p-2 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded"
                        title="查看"
                      >
                        <Eye className="h-4 w-4" />
                      </button>
                      {!template.is_system && (
                        <>
                          <button
                            onClick={() => handleEdit(template)}
                            className="p-2 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded"
                            title="编辑"
                          >
                            <Edit className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => handleDuplicate(template)}
                            className="p-2 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded"
                            title="复制"
                          >
                            <Copy className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => handleToggleStatus(template)}
                            className={`p-2 rounded ${
                              template.is_active
                                ? 'text-gray-500 hover:text-yellow-600 hover:bg-yellow-50'
                                : 'text-gray-500 hover:text-green-600 hover:bg-green-50'
                            }`}
                            title={template.is_active ? '禁用' : '启用'}
                          >
                            {template.is_active ? (
                              <XCircle className="h-4 w-4" />
                            ) : (
                              <CheckCircle2 className="h-4 w-4" />
                            )}
                          </button>
                          <button
                            onClick={() => handleDelete(template)}
                            className="p-2 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded"
                            title="删除"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center justify-between mt-2 text-xs text-gray-400">
                    <div className="flex items-center gap-4">
                      <span>大小: {formatSize(template.content)}</span>
                      <span>创建: {formatDate(template.created_at)}</span>
                      <span>更新: {formatDate(template.updated_at)}</span>
                      <span>创建者: {template.created_by}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="border-t border-gray-200 px-4 py-3 flex items-center justify-between">
              <p className="text-sm text-gray-500">共 {total} 条记录</p>
              <div className="flex items-center gap-2">
                <button
                  disabled={page <= 1}
                  onClick={() => setPage(Math.max(1, page - 1))}
                  className="px-3 py-1 border border-gray-300 rounded text-gray-500 disabled:opacity-50"
                >
                  上一页
                </button>
                <span className="text-sm text-gray-600">第 {page} 页</span>
                <button
                  disabled={templates.length < pageSize}
                  onClick={() => setPage(page + 1)}
                  className="px-3 py-1 border border-gray-300 rounded text-gray-500 disabled:opacity-50"
                >
                  下一页
                </button>
              </div>
            </div>
          </>
        )}
      </div>

      {showDetailModal && selectedTemplate && (
        <TemplateDetailModal
          template={selectedTemplate}
          onClose={() => {
            setShowDetailModal(false);
            setSelectedTemplate(null);
          }}
        />
      )}

      {showFormModal && (
        <TemplateFormModal
          isCreate={isCreating}
          template={editingTemplate}
          onClose={() => {
            setShowFormModal(false);
            setEditingTemplate(null);
            setIsCreating(false);
          }}
          onSuccess={() => {
            loadTemplates();
          }}
        />
      )}
    </div>
  );
}
