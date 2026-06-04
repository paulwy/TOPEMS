import { useState, useEffect } from 'react';
import { X, Save } from 'lucide-react';
import { useTemplateApi } from '../hooks/useTemplateApi';
import type { TemplateResponse, CreateTemplateRequest, UpdateTemplateRequest } from '../types';

interface TemplateFormModalProps {
  isCreate: boolean;
  template?: TemplateResponse | null;
  onClose: () => void;
  onSuccess: () => void;
}

export function TemplateFormModal({ isCreate, template, onClose, onSuccess }: TemplateFormModalProps) {
  const { loading, createTemplate, updateTemplate } = useTemplateApi();
  const [formData, setFormData] = useState<{
    name: string;
    code: string;
    category_id?: string;
    module: string;
    description?: string;
    content: string;
    variables?: string;
    is_active: boolean;
    sort_order?: number;
  }>({
    name: '',
    code: '',
    module: '',
    content: '',
    is_active: true,
  });

  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (template) {
      setFormData({
        name: template.name,
        code: template.code,
        category_id: template.category_id || undefined,
        module: template.module,
        description: template.description || undefined,
        content: template.content,
        variables: template.variables ? JSON.stringify(template.variables, null, 2) : undefined,
        is_active: template.is_active,
        sort_order: template.sort_order,
      });
    } else {
      setFormData({
        name: '',
        code: '',
        module: '',
        content: '',
        is_active: true,
      });
    }
  }, [template]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!formData.name.trim() || !formData.code.trim() || !formData.module.trim() || !formData.content.trim()) {
      setError('请填写必填字段');
      return;
    }

    try {
      let parsedVariables: any = undefined;
      if (formData.variables?.trim()) {
        try {
          parsedVariables = JSON.parse(formData.variables);
        } catch {
          setError('变量必须是有效的 JSON 格式');
          return;
        }
      }

      if (isCreate) {
        const data: CreateTemplateRequest = {
          name: formData.name,
          code: formData.code,
          category_id: formData.category_id,
          module: formData.module,
          description: formData.description,
          content: formData.content,
          variables: parsedVariables,
          is_active: formData.is_active,
          sort_order: formData.sort_order,
        };
        await createTemplate(data);
      } else if (template) {
        const data: UpdateTemplateRequest = {};
        if (formData.name !== template.name) data.name = formData.name;
        if (formData.code !== template.code) data.code = formData.code;
        if (formData.category_id !== template.category_id) data.category_id = formData.category_id;
        if (formData.module !== template.module) data.module = formData.module;
        if (formData.description !== template.description) data.description = formData.description;
        if (formData.content !== template.content) data.content = formData.content;
        if (JSON.stringify(parsedVariables) !== JSON.stringify(template.variables)) data.variables = parsedVariables;
        if (formData.is_active !== template.is_active) data.is_active = formData.is_active;
        if (formData.sort_order !== template.sort_order) data.sort_order = formData.sort_order;
        
        await updateTemplate(template.id, data);
      }

      alert(isCreate ? '创建成功' : '更新成功');
      onSuccess();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : '操作失败，请重试');
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20">
        <div className="fixed inset-0 transition-opacity bg-gray-500 bg-opacity-75" onClick={onClose}></div>

        <div className="relative w-full max-w-2xl bg-white rounded-lg shadow-xl">
          <div className="flex items-center justify-between p-6 border-b border-gray-200">
            <h2 className="text-lg font-medium text-gray-900">
              {isCreate ? '新建模板' : '编辑模板'}
            </h2>
            <button
              onClick={onClose}
              className="p-2 text-gray-400 hover:text-gray-600"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="p-6 space-y-4">
            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                <p className="text-red-800 text-sm">{error}</p>
              </div>
            )}

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
                  名称 <span className="text-red-500">*</span>
                </label>
                <input
                  id="name"
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  required
                />
              </div>
              <div>
                <label htmlFor="code" className="block text-sm font-medium text-gray-700 mb-1">
                  编码 <span className="text-red-500">*</span>
                </label>
                <input
                  id="code"
                  type="text"
                  value={formData.code}
                  onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  required
                  disabled={!isCreate}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label htmlFor="module" className="block text-sm font-medium text-gray-700 mb-1">
                  模块 <span className="text-red-500">*</span>
                </label>
                <input
                  id="module"
                  type="text"
                  value={formData.module}
                  onChange={(e) => setFormData({ ...formData, module: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="如: qms, lims, hr"
                  required
                />
              </div>
              <div>
                <label htmlFor="sort_order" className="block text-sm font-medium text-gray-700 mb-1">
                  排序
                </label>
                <input
                  id="sort_order"
                  type="number"
                  value={formData.sort_order || ''}
                  onChange={(e) => setFormData({ ...formData, sort_order: parseInt(e.target.value) || 0 })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            </div>

            <div>
              <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-1">
                描述
              </label>
              <textarea
                id="description"
                value={formData.description || ''}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                rows={2}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            <div>
              <label htmlFor="content" className="block text-sm font-medium text-gray-700 mb-1">
                内容 <span className="text-red-500">*</span>
              </label>
              <textarea
                id="content"
                value={formData.content}
                onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                rows={12}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 font-mono text-sm"
                required
              />
            </div>

            <div>
              <label htmlFor="variables" className="block text-sm font-medium text-gray-700 mb-1">
                变量 (JSON)
              </label>
              <textarea
                id="variables"
                value={formData.variables || ''}
                onChange={(e) => setFormData({ ...formData, variables: e.target.value })}
                rows={4}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 font-mono text-sm"
                placeholder='{ "variable1": "description1", "variable2": "description2" }'
              />
            </div>

            <div className="flex items-center">
              <input
                id="is_active"
                type="checkbox"
                checked={formData.is_active}
                onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
              />
              <label htmlFor="is_active" className="ml-2 block text-sm text-gray-700">
                启用
              </label>
            </div>

            <div className="flex justify-end gap-2 pt-4 border-t border-gray-200">
              <button
                type="button"
                onClick={onClose}
                disabled={loading}
                className="px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50"
              >
                取消
              </button>
              <button
                type="submit"
                disabled={loading}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
              >
                <Save className="h-4 w-4" />
                {loading ? '保存中...' : '保存'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
