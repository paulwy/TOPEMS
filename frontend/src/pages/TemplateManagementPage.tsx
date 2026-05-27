import React, { useState, useEffect } from 'react';
import { 
  FileText, Plus, Edit, Trash2, Copy, Eye, 
  ChevronLeft, Search, Filter, Grid, List, 
  X, CheckCircle, AlertCircle, Loader2, ToggleLeft, ToggleRight
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { templateApi, type Template, type TemplateCategory, type CreateTemplateRequest } from '../api/template';
import { useNotification } from '../hooks/useNotification';

const TemplateManagementPage: React.FC = () => {
  const navigate = useNavigate();
  const { success, error, notifications, hideNotification } = useNotification();
  
  const [templates, setTemplates] = useState<Template[]>([]);
  const [categories, setCategories] = useState<TemplateCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showPreviewModal, setShowPreviewModal] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<Template | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [templatesRes, categoriesRes] = await Promise.all([
        templateApi.list({ search: searchQuery, category: selectedCategory }),
        templateApi.listCategories(),
      ]);
      
      if (templatesRes.success) {
        setTemplates(templatesRes.data.items);
      }
      
      if (categoriesRes.success) {
        setCategories(categoriesRes.data);
      }
    } catch (err: any) {
      error(err.message || '加载数据失败');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateTemplate = async (data: CreateTemplateRequest) => {
    try {
      const res = await templateApi.create(data);
      if (res.success) {
        success('模板创建成功');
        setShowCreateModal(false);
        loadData();
      } else {
        error(res.message || '创建失败');
      }
    } catch (err: any) {
      error(err.message || '创建失败');
    }
  };

  const handleUpdateTemplate = async (id: string, data: Partial<CreateTemplateRequest>) => {
    try {
      const res = await templateApi.update(id, data);
      if (res.success) {
        success('模板更新成功');
        setShowEditModal(false);
        setSelectedTemplate(null);
        loadData();
      } else {
        error(res.message || '更新失败');
      }
    } catch (err: any) {
      error(err.message || '更新失败');
    }
  };

  const handleDeleteTemplate = async (id: string) => {
    if (!confirm('确定要删除这个模板吗？')) return;
    
    try {
      const res = await templateApi.delete(id);
      if (res.success) {
        success('模板删除成功');
        loadData();
      } else {
        error(res.message || '删除失败');
      }
    } catch (err: any) {
      error(err.message || '删除失败');
    }
  };

  const handleDuplicateTemplate = async (id: string) => {
    try {
      const res = await templateApi.duplicate(id);
      if (res.success) {
        success('模板复制成功');
        loadData();
      } else {
        error(res.message || '复制失败');
      }
    } catch (err: any) {
      error(err.message || '复制失败');
    }
  };

  const handleToggleStatus = async (id: string) => {
    try {
      const res = await templateApi.toggleStatus(id);
      if (res.success) {
        success('状态更新成功');
        loadData();
      } else {
        error(res.message || '更新失败');
      }
    } catch (err: any) {
      error(err.message || '更新失败');
    }
  };

  const filteredTemplates = templates.filter(t => 
    t.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    t.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
    t.description?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-gray-50">
      <NotificationContainer notifications={notifications} onClose={hideNotification} />
      
      {/* Header */}
      <div className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <button
                onClick={() => navigate('/dashboard')}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <ChevronLeft className="w-5 h-5 text-gray-600" />
              </button>
              <div>
                <h1 className="text-2xl font-bold text-gray-900 flex items-center">
                  <FileText className="w-7 h-7 mr-3 text-blue-600" />
                  模板管理
                </h1>
                <p className="mt-1 text-sm text-gray-500">
                  管理和配置系统中的各类模板
                </p>
              </div>
            </div>
            <button
              onClick={() => setShowCreateModal(true)}
              className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              <Plus className="w-5 h-5 mr-2" />
              新增模板
            </button>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="bg-white rounded-lg shadow-sm p-4 mb-6">
          <div className="flex items-center space-x-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                placeholder="搜索模板名称、编码..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            >
              <option value="">全部分类</option>
              {categories.map(cat => (
                <option key={cat.id} value={cat.code}>{cat.name}</option>
              ))}
            </select>

            <div className="flex border border-gray-300 rounded-lg overflow-hidden">
              <button
                onClick={() => setViewMode('grid')}
                className={`p-2 ${viewMode === 'grid' ? 'bg-blue-600 text-white' : 'bg-white text-gray-600 hover:bg-gray-50'}`}
              >
                <Grid className="w-5 h-5" />
              </button>
              <button
                onClick={() => setViewMode('list')}
                className={`p-2 ${viewMode === 'list' ? 'bg-blue-600 text-white' : 'bg-white text-gray-600 hover:bg-gray-50'}`}
              >
                <List className="w-5 h-5" />
              </button>
            </div>

            <button
              onClick={loadData}
              className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
            >
              刷新
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="bg-white rounded-lg shadow-sm overflow-hidden">
          {loading ? (
            <div className="p-8 text-center">
              <Loader2 className="w-12 h-12 text-blue-600 mx-auto animate-spin" />
              <p className="mt-2 text-gray-500">加载中...</p>
            </div>
          ) : filteredTemplates.length === 0 ? (
            <div className="p-8 text-center">
              <FileText className="w-12 h-12 text-gray-400 mx-auto mb-3" />
              <p className="text-gray-500">暂无模板数据</p>
            </div>
          ) : viewMode === 'grid' ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 p-6">
              {filteredTemplates.map((template) => (
                <div key={template.id} className="bg-gray-50 rounded-lg p-6 border border-gray-200 hover:shadow-md transition-shadow">
                  <div className="flex items-start justify-between mb-4">
                    <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0">
                      <FileText className="w-6 h-6 text-blue-600" />
                    </div>
                    <button
                      onClick={() => handleToggleStatus(template.id)}
                      className={`p-2 rounded-lg transition-colors ${
                        template.is_active ? 'text-green-600 hover:bg-green-100' : 'text-gray-400 hover:bg-gray-200'
                      }`}
                      title={template.is_active ? '已启用' : '已禁用'}
                    >
                      {template.is_active ? <ToggleRight className="w-5 h-5" /> : <ToggleLeft className="w-5 h-5" />}
                    </button>
                  </div>
                  
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">{template.name}</h3>
                  <p className="text-sm text-gray-600 mb-2">{template.code}</p>
                  
                  <div className="space-y-1 text-sm text-gray-500 mb-4">
                    <div>分类：{template.category}</div>
                    <div>模块：{template.module}</div>
                    <div>变量数：{template.variables?.length || 0}</div>
                  </div>
                  
                  <div className="pt-4 border-t border-gray-200 flex justify-end space-x-2">
                    <button
                      onClick={() => {
                        setSelectedTemplate(template);
                        setShowPreviewModal(true);
                      }}
                      className="p-2 text-blue-600 hover:bg-blue-100 rounded-lg transition-colors"
                      title="预览"
                    >
                      <Eye className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDuplicateTemplate(template.id)}
                      className="p-2 text-green-600 hover:bg-green-100 rounded-lg transition-colors"
                      title="复制"
                    >
                      <Copy className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => {
                        setSelectedTemplate(template);
                        setShowEditModal(true);
                      }}
                      className="p-2 text-blue-600 hover:bg-blue-100 rounded-lg transition-colors"
                      title="编辑"
                    >
                      <Edit className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDeleteTemplate(template.id)}
                      className="p-2 text-red-600 hover:bg-red-100 rounded-lg transition-colors"
                      title="删除"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="divide-y divide-gray-200">
              {filteredTemplates.map((template) => (
                <div key={template.id} className="p-4 hover:bg-gray-50 transition-colors flex items-center justify-between">
                  <div className="flex items-center space-x-4 flex-1">
                    <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                      <FileText className="w-5 h-5 text-blue-600" />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center space-x-2">
                        <h4 className="font-medium text-gray-900">{template.name}</h4>
                        <span className={`px-2 py-0.5 rounded-full text-xs ${
                          template.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'
                        }`}>
                          {template.is_active ? '已启用' : '已禁用'}
                        </span>
                      </div>
                      <p className="text-sm text-gray-500">{template.code} · {template.category}</p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => handleToggleStatus(template.id)}
                      className={`p-2 rounded-lg transition-colors ${
                        template.is_active ? 'text-green-600 hover:bg-green-100' : 'text-gray-400 hover:bg-gray-200'
                      }`}
                    >
                      {template.is_active ? <ToggleRight className="w-5 h-5" /> : <ToggleLeft className="w-5 h-5" />}
                    </button>
                    <button
                      onClick={() => {
                        setSelectedTemplate(template);
                        setShowPreviewModal(true);
                      }}
                      className="p-2 text-blue-600 hover:bg-blue-100 rounded-lg"
                    >
                      <Eye className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDuplicateTemplate(template.id)}
                      className="p-2 text-green-600 hover:bg-green-100 rounded-lg"
                    >
                      <Copy className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => {
                        setSelectedTemplate(template);
                        setShowEditModal(true);
                      }}
                      className="p-2 text-blue-600 hover:bg-blue-100 rounded-lg"
                    >
                      <Edit className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDeleteTemplate(template.id)}
                      className="p-2 text-red-600 hover:bg-red-100 rounded-lg"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Create/Edit Modal */}
      {showCreateModal && (
        <TemplateFormModal
          onClose={() => setShowCreateModal(false)}
          onSubmit={handleCreateTemplate}
          categories={categories}
        />
      )}
      
      {showEditModal && selectedTemplate && (
        <TemplateFormModal
          template={selectedTemplate}
          onClose={() => {
            setShowEditModal(false);
            setSelectedTemplate(null);
          }}
          onSubmit={(data) => handleUpdateTemplate(selectedTemplate.id, data)}
          categories={categories}
        />
      )}

      {/* Preview Modal */}
      {showPreviewModal && selectedTemplate && (
        <TemplatePreviewModal
          template={selectedTemplate}
          onClose={() => {
            setShowPreviewModal(false);
            setSelectedTemplate(null);
          }}
        />
      )}
    </div>
  );
};

// Template Form Modal Component
interface TemplateFormModalProps {
  template?: Template;
  onClose: () => void;
  onSubmit: (data: CreateTemplateRequest) => void;
  categories: TemplateCategory[];
}

const TemplateFormModal: React.FC<TemplateFormModalProps> = ({ template, onClose, onSubmit, categories }) => {
  const [formData, setFormData] = useState<CreateTemplateRequest>({
    name: template?.name || '',
    code: template?.code || '',
    category: template?.category || '',
    module: template?.module || '',
    description: template?.description || '',
    content: template?.content || '',
    variables: template?.variables || [],
    is_active: template?.is_active ?? true,
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(formData);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-3xl max-h-[90vh] overflow-hidden flex flex-col">
        <div className="p-6 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">
            {template ? '编辑模板' : '新增模板'}
          </h3>
        </div>

        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6">
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">模板名称 *</label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  placeholder="请输入模板名称"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">模板编码 *</label>
                <input
                  type="text"
                  required
                  value={formData.code}
                  onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  placeholder="请输入模板编码"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">分类 *</label>
                <select
                  required
                  value={formData.category}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">请选择分类</option>
                  {categories.map(cat => (
                    <option key={cat.id} value={cat.code}>{cat.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">所属模块 *</label>
                <select
                  required
                  value={formData.module}
                  onChange={(e) => setFormData({ ...formData, module: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">请选择模块</option>
                  <option value="ERP">ERP</option>
                  <option value="HRM">HRM</option>
                  <option value="CRM">CRM</option>
                  <option value="QMS">QMS</option>
                  <option value="LIMS">LIMS</option>
                  <option value="其他">其他</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">描述</label>
              <textarea
                value={formData.description || ''}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                rows={2}
                placeholder="请输入模板描述"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">模板内容 *</label>
              <textarea
                required
                value={formData.content}
                onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 font-mono"
                rows={10}
                placeholder="请输入模板内容"
              />
              <p className="text-xs text-gray-500 mt-1">
                使用 {"{{variable_name}}"} 格式定义变量
              </p>
            </div>
          </div>
        </form>

        <div className="p-6 border-t border-gray-200 flex justify-end space-x-3">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200"
          >
            取消
          </button>
          <button
            onClick={handleSubmit}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            {template ? '保存' : '创建'}
          </button>
        </div>
      </div>
    </div>
  );
};

// Template Preview Modal Component
interface TemplatePreviewModalProps {
  template: Template;
  onClose: () => void;
}

const TemplatePreviewModal: React.FC<TemplatePreviewModalProps> = ({ template, onClose }) => {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        <div className="p-6 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">模板预览</h3>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          <div className="mb-6">
            <h4 className="text-xl font-bold text-gray-900 mb-2">{template.name}</h4>
            <div className="flex items-center space-x-4 text-sm text-gray-500">
              <span>编码：{template.code}</span>
              <span>分类：{template.category}</span>
              <span>模块：{template.module}</span>
            </div>
            {template.description && (
              <p className="mt-2 text-gray-600">{template.description}</p>
            )}
          </div>

          <div className="bg-gray-50 rounded-lg p-6 border border-gray-200">
            <h5 className="font-semibold text-gray-900 mb-4">模板内容：</h5>
            <pre className="whitespace-pre-wrap text-sm text-gray-700 font-mono">
              {template.content}
            </pre>
          </div>

          {template.variables && template.variables.length > 0 && (
            <div className="mt-6">
              <h5 className="font-semibold text-gray-900 mb-4">变量定义：</h5>
              <div className="space-y-2">
                {template.variables.map((variable, idx) => (
                  <div key={idx} className="flex items-center space-x-4 p-3 bg-gray-50 rounded-lg">
                    <span className="font-mono text-blue-600">{"{{"}{variable.key}{"}"}</span>
                    <span className="text-gray-600">{variable.label}</span>
                    <span className="text-xs px-2 py-1 bg-gray-200 rounded">
                      {variable.type}
                    </span>
                    {variable.required && (
                      <span className="text-xs text-red-600">必填</span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="p-6 border-t border-gray-200 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200"
          >
            关闭
          </button>
        </div>
      </div>
    </div>
  );
};

export default TemplateManagementPage;
