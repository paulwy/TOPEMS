import React, { useState, useEffect } from 'react';
import {
  Bell,
  Plus,
  Edit,
  Trash2,
  Copy,
  Eye,
  ChevronLeft,
  Search,
  Loader2,
  Archive,
  FileText,
  RefreshCw,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import {
  getTemplates,
  getTemplate,
  createTemplate,
  updateTemplate,
  deleteTemplate,
  renderTemplate,
  NotificationTemplate,
  CreateTemplateRequest,
  UpdateTemplateRequest,
  TemplateStatusEnum,
  NotificationTypeEnum,
} from '../api/notification';
import { useNotification } from '../hooks/useNotification';
import { NotificationContainer } from '../components/NotificationContainer';

const NotificationTemplatesPage: React.FC = () => {
  const navigate = useNavigate();
  const { success, error, notifications, hideNotification } = useNotification();

  const [templates, setTemplates] = useState<NotificationTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStatus, setSelectedStatus] = useState<TemplateStatusEnum | ''>('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showPreviewModal, setShowPreviewModal] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<NotificationTemplate | null>(null);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [renderModalOpen, setRenderModalOpen] = useState(false);

  useEffect(() => {
    loadTemplates();
  }, [page, selectedStatus]);

  const loadTemplates = async () => {
    setLoading(true);
    try {
      const statusParam = selectedStatus || undefined;
      const response = await getTemplates(page, 20, statusParam || undefined);
      if (response.success && response.data) {
        setTemplates(response.data.templates);
        setTotal(response.data.total);
      }
    } catch (err) {
      console.error('Error loading templates:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateTemplate = async (data: CreateTemplateRequest) => {
    try {
      const res = await createTemplate(data);
      if (res.success) {
        success('模板创建成功');
        setShowCreateModal(false);
        loadTemplates();
      } else {
        error(res.message || '创建失败');
      }
    } catch (err: any) {
      error(err.message || '创建失败');
    }
  };

  const handleUpdateTemplate = async (id: string, data: CreateTemplateRequest | UpdateTemplateRequest) => {
    try {
      const updateData: UpdateTemplateRequest = { ...data, id };
      const res = await updateTemplate(id, updateData);
      if (res.success) {
        success('模板更新成功');
        setShowEditModal(false);
        setSelectedTemplate(null);
        loadTemplates();
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
      const res = await deleteTemplate(id);
      if (res.success) {
        success('模板删除成功');
        loadTemplates();
      } else {
        error(res.message || '删除失败');
      }
    } catch (err: any) {
      error(err.message || '删除失败');
    }
  };

  const handleToggleArchive = async (id: string) => {
    try {
      const template = templates.find((t) => t.id === id);
      if (!template) return;

      const res = await updateTemplate(id, { id, status: template.status === 'active' ? 'inactive' as TemplateStatusEnum : 'active' as TemplateStatusEnum });
      if (res.success) {
        success('模板状态更新成功');
        loadTemplates();
      } else {
        error(res.message || '更新失败');
      }
    } catch (err: any) {
      error(err.message || '更新失败');
    }
  };

  const filteredTemplates = templates.filter(
    (t) =>
      t.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.title_template.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getStatusBadge = (status: TemplateStatusEnum) => {
    switch (status) {
      case 'active':
        return <span className='px-2 py-1 text-xs rounded-full bg-green-100 text-green-700'>启用</span>;
      case 'inactive':
        return <span className='px-2 py-1 text-xs rounded-full bg-gray-100 text-gray-700'>禁用</span>;
      case 'deprecated':
        return <span className='px-2 py-1 text-xs rounded-full bg-red-100 text-red-700'>废弃</span>;
    }
  };

  const getTypeLabel = (type: NotificationTypeEnum) => {
    const labels: Record<NotificationTypeEnum, string> = {
      system: '系统通知',
      workflow: '审批通知',
      reminder: '提醒通知',
      alert: '告警通知',
      message: '消息通知',
      info: '信息通知',
      success: '成功通知',
      warning: '警告通知',
      error: '错误通知',
    };
    return labels[type] || type;
  };

  const getTypeColor = (type: NotificationTypeEnum) => {
    const colors: Record<NotificationTypeEnum, string> = {
      system: 'bg-blue-100 text-blue-700',
      workflow: 'bg-purple-100 text-purple-700',
      reminder: 'bg-yellow-100 text-yellow-700',
      alert: 'bg-red-100 text-red-700',
      message: 'bg-green-100 text-green-700',
      info: 'bg-cyan-100 text-cyan-700',
      success: 'bg-emerald-100 text-emerald-700',
      warning: 'bg-orange-100 text-orange-700',
      error: 'bg-rose-100 text-rose-700',
    };
    return colors[type] || 'bg-gray-100 text-gray-700';
  };

  const totalPages = Math.max(1, Math.ceil(total / 20));

  return (
    <div className='min-h-screen bg-gray-50'>
      <NotificationContainer notifications={notifications} onClose={hideNotification} />

      {/* Header */}
      <div className='bg-white shadow-sm border-b border-gray-200'>
        <div className='max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6'>
          <div className='flex items-center justify-between'>
            <div className='flex items-center space-x-4'>
              <button
                onClick={() => navigate('/notifications')}
                className='p-2 hover:bg-gray-100 rounded-lg transition-colors'
              >
                <ChevronLeft className='w-5 h-5 text-gray-600' />
              </button>
              <div>
                <h1 className='text-2xl font-bold text-gray-900 flex items-center'>
                  <FileText className='w-7 h-7 mr-3 text-blue-600' />
                  通知模板管理
                </h1>
                <p className='mt-1 text-sm text-gray-500'>管理和配置通知消息模板</p>
              </div>
            </div>
            <div className='flex items-center space-x-3'>
              <button
                onClick={loadTemplates}
                className='flex items-center px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors'
              >
                <RefreshCw className='w-5 h-5 mr-2' />
                刷新
              </button>
              <button
                onClick={() => setShowCreateModal(true)}
                className='flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors'
              >
                <Plus className='w-5 h-5 mr-2' />
                新增模板
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className='max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6'>
        <div className='bg-white rounded-lg shadow-sm p-4 mb-6'>
          <div className='flex items-center space-x-4'>
            <div className='flex-1 relative'>
              <Search className='absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400' />
              <input
                type='text'
                placeholder='搜索模板名称、描述...'
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className='w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent'
              />
            </div>

            <select
              value={selectedStatus}
              onChange={(e) => {
                setSelectedStatus(e.target.value as TemplateStatusEnum | '');
                setPage(1);
              }}
              className='px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500'
            >
              <option value=''>全部状态</option>
              <option value='active'>启用</option>
              <option value='inactive'>禁用</option>
              <option value='deprecated'>废弃</option>
            </select>
          </div>
        </div>

        {/* Content */}
        <div className='bg-white rounded-lg shadow-sm overflow-hidden'>
          {loading ? (
            <div className='p-8 text-center'>
              <Loader2 className='w-12 h-12 text-blue-600 mx-auto animate-spin' />
              <p className='mt-2 text-gray-500'>加载中...</p>
            </div>
          ) : filteredTemplates.length === 0 ? (
            <div className='p-8 text-center'>
              <FileText className='w-12 h-12 text-gray-400 mx-auto mb-3' />
              <p className='text-gray-500'>暂无模板数据</p>
            </div>
          ) : (
            <>
              <div className='overflow-x-auto'>
                <table className='min-w-full divide-y divide-gray-200'>
                  <thead className='bg-gray-50'>
                    <tr>
                      <th className='px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider'>
                        模板名称
                      </th>
                      <th className='px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider'>
                        类型
                      </th>
                      <th className='px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider'>
                        标题模板
                      </th>
                      <th className='px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider'>
                        状态
                      </th>
                      <th className='px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider'>
                        优先级
                      </th>
                      <th className='px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider'>
                        创建时间
                      </th>
                      <th className='px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider'>
                        操作
                      </th>
                    </tr>
                  </thead>
                  <tbody className='bg-white divide-y divide-gray-200'>
                    {filteredTemplates.map((template) => (
                      <tr key={template.id} className='hover:bg-gray-50'>
                        <td className='px-6 py-4 whitespace-nowrap'>
                          <div className='flex items-center'>
                            <div className='w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center mr-3'>
                              <Bell className='w-5 h-5 text-blue-600' />
                            </div>
                            <div>
                              <div className='text-sm font-medium text-gray-900'>{template.name}</div>
                              {template.description && (
                                <div className='text-xs text-gray-500 truncate max-w-xs'>{template.description}</div>
                              )}
                            </div>
                          </div>
                        </td>
                        <td className='px-6 py-4 whitespace-nowrap'>
                          <span className={`px-2 py-1 text-xs rounded-full ${getTypeColor(template.notification_type)}`}>
                            {getTypeLabel(template.notification_type)}
                          </span>
                        </td>
                        <td className='px-6 py-4 whitespace-nowrap'>
                          <div className='text-sm text-gray-900 truncate max-w-xs'>{template.title_template}</div>
                        </td>
                        <td className='px-6 py-4 whitespace-nowrap'>{getStatusBadge(template.status)}</td>
                        <td className='px-6 py-4 whitespace-nowrap text-sm text-gray-500'>
                          {template.default_priority >= 4
                            ? '紧急'
                            : template.default_priority >= 3
                              ? '高'
                              : template.default_priority >= 2
                                ? '中'
                                : '低'}
                        </td>
                        <td className='px-6 py-4 whitespace-nowrap text-sm text-gray-500'>
                          {new Date(template.created_at).toLocaleDateString('zh-CN')}
                        </td>
                        <td className='px-6 py-4 whitespace-nowrap text-right text-sm font-medium'>
                          <div className='flex items-center justify-end space-x-2'>
                            <button
                              onClick={() => {
                                setSelectedTemplate(template);
                                setShowPreviewModal(true);
                              }}
                              className='p-2 text-blue-600 hover:bg-blue-100 rounded-lg transition-colors'
                              title='预览'
                            >
                              <Eye className='w-4 h-4' />
                            </button>
                            <button
                              onClick={() => handleToggleArchive(template.id)}
                              className='p-2 text-orange-600 hover:bg-orange-100 rounded-lg transition-colors'
                              title={template.status === 'active' ? '禁用' : '启用'}
                            >
                              <Archive className='w-4 h-4' />
                            </button>
                            <button
                              onClick={() => {
                                setSelectedTemplate(template);
                                setShowEditModal(true);
                              }}
                              className='p-2 text-blue-600 hover:bg-blue-100 rounded-lg transition-colors'
                              title='编辑'
                            >
                              <Edit className='w-4 h-4' />
                            </button>
                            <button
                              onClick={() => handleDeleteTemplate(template.id)}
                              className='p-2 text-red-600 hover:bg-red-100 rounded-lg transition-colors'
                              title='删除'
                            >
                              <Trash2 className='w-4 h-4' />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              {total > 20 && (
                <div className='px-6 py-4 border-t border-gray-200 flex items-center justify-between'>
                  <div className='text-sm text-gray-600'>
                    第 {page} 页，共 {totalPages} 页
                  </div>
                  <div className='flex items-center space-x-2'>
                    <button
                      onClick={() => setPage((p) => Math.max(1, p - 1))}
                      disabled={page === 1}
                      className='px-3 py-1.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed'
                    >
                      上一页
                    </button>
                    <button
                      onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                      disabled={page >= totalPages}
                      className='px-3 py-1.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed'
                    >
                      下一页
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* Create/Edit Modal */}
      {showCreateModal && (
        <TemplateFormModal
          onClose={() => setShowCreateModal(false)}
          onSubmit={handleCreateTemplate}
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
  template?: NotificationTemplate;
  onClose: () => void;
  onSubmit: (data: CreateTemplateRequest | UpdateTemplateRequest) => void;
}

const TemplateFormModal: React.FC<TemplateFormModalProps> = ({ template, onClose, onSubmit }) => {
  const [formData, setFormData] = useState<CreateTemplateRequest>({
    name: template?.name || '',
    description: template?.description || '',
    notification_type: template?.notification_type || 'system',
    title_template: template?.title_template || '',
    content_template: template?.content_template || '',
    data_schema: template?.data_schema || undefined,
    default_priority: template?.default_priority || 2,
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(formData);
  };

  return (
    <div className='fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4'>
      <div className='bg-white rounded-xl shadow-xl w-full max-w-3xl max-h-[90vh] overflow-hidden flex flex-col'>
        <div className='p-6 border-b border-gray-200'>
          <h3 className='text-lg font-semibold text-gray-900'>{template ? '编辑模板' : '新增模板'}</h3>
        </div>

        <form onSubmit={handleSubmit} className='flex-1 overflow-y-auto p-6'>
          <div className='space-y-4'>
            <div className='grid grid-cols-2 gap-4'>
              <div>
                <label className='block text-sm font-medium text-gray-700 mb-1'>模板名称 *</label>
                <input
                  type='text'
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className='w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500'
                  placeholder='请输入模板名称'
                />
              </div>
              <div>
                <label className='block text-sm font-medium text-gray-700 mb-1'>通知类型 *</label>
                <select
                  required
                  value={formData.notification_type}
                  onChange={(e) =>
                    setFormData({ ...formData, notification_type: e.target.value as NotificationTypeEnum })
                  }
                  className='w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500'
                >
                  <option value='system'>系统通知</option>
                  <option value='workflow'>审批通知</option>
                  <option value='reminder'>提醒通知</option>
                  <option value='alert'>告警通知</option>
                  <option value='message'>消息通知</option>
                </select>
              </div>
            </div>

            <div>
              <label className='block text-sm font-medium text-gray-700 mb-1'>描述</label>
              <textarea
                value={formData.description || ''}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                className='w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500'
                rows={2}
                placeholder='请输入模板描述'
              />
            </div>

            <div>
              <label className='block text-sm font-medium text-gray-700 mb-1'>标题模板 *</label>
              <input
                type='text'
                required
                value={formData.title_template}
                onChange={(e) => setFormData({ ...formData, title_template: e.target.value })}
                className='w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500'
                placeholder='请输入标题模板，使用 {{variable}} 格式定义变量'
              />
            </div>

            <div>
              <label className='block text-sm font-medium text-gray-700 mb-1'>内容模板 *</label>
              <textarea
                required
                value={formData.content_template}
                onChange={(e) => setFormData({ ...formData, content_template: e.target.value })}
                className='w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 font-mono'
                rows={6}
                placeholder='请输入内容模板，使用 {{variable}} 格式定义变量'
              />
              <p className='text-xs text-gray-500 mt-1'>使用 {'{{variable}}'} 格式定义变量</p>
            </div>

            <div>
              <label className='block text-sm font-medium text-gray-700 mb-1'>默认优先级</label>
              <select
                value={formData.default_priority}
                onChange={(e) => setFormData({ ...formData, default_priority: parseInt(e.target.value) })}
                className='w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500'
              >
                <option value={1}>低</option>
                <option value={2}>中</option>
                <option value={3}>高</option>
                <option value={4}>紧急</option>
              </select>
            </div>
          </div>
        </form>

        <div className='p-6 border-t border-gray-200 flex justify-end space-x-3'>
          <button
            type='button'
            onClick={onClose}
            className='px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200'
          >
            取消
          </button>
          <button onClick={handleSubmit} className='px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700'>
            {template ? '保存' : '创建'}
          </button>
        </div>
      </div>
    </div>
  );
};

// Template Preview Modal Component
interface TemplatePreviewModalProps {
  template: NotificationTemplate;
  onClose: () => void;
}

const TemplatePreviewModal: React.FC<TemplatePreviewModalProps> = ({ template, onClose }) => {
  return (
    <div className='fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4'>
      <div className='bg-white rounded-xl shadow-xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col'>
        <div className='p-6 border-b border-gray-200'>
          <h3 className='text-lg font-semibold text-gray-900'>模板预览</h3>
        </div>

        <div className='flex-1 overflow-y-auto p-6'>
          <div className='mb-6'>
            <h4 className='text-xl font-bold text-gray-900 mb-2'>{template.name}</h4>
            <div className='flex items-center space-x-4 text-sm text-gray-500'>
              <span>类型：{getTypeLabel(template.notification_type)}</span>
              <span>状态：{template.status}</span>
              <span>优先级：{template.default_priority}</span>
            </div>
            {template.description && <p className='mt-2 text-gray-600'>{template.description}</p>}
          </div>

          <div className='bg-gray-50 rounded-lg p-6 border border-gray-200 mb-4'>
            <h5 className='font-semibold text-gray-900 mb-3'>标题模板：</h5>
            <pre className='whitespace-pre-wrap text-sm text-gray-700 font-mono'>{template.title_template}</pre>
          </div>

          <div className='bg-gray-50 rounded-lg p-6 border border-gray-200'>
            <h5 className='font-semibold text-gray-900 mb-3'>内容模板：</h5>
            <pre className='whitespace-pre-wrap text-sm text-gray-700 font-mono'>{template.content_template}</pre>
          </div>

          {template.data_schema && (
            <div className='mt-6'>
              <h5 className='font-semibold text-gray-900 mb-3'>数据模式：</h5>
              <pre className='whitespace-pre-wrap text-sm text-gray-700 font-mono bg-gray-50 p-4 rounded-lg'>
                {JSON.stringify(template.data_schema, null, 2)}
              </pre>
            </div>
          )}
        </div>

        <div className='p-6 border-t border-gray-200 flex justify-end'>
          <button onClick={onClose} className='px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200'>
            关闭
          </button>
        </div>
      </div>
    </div>
  );
};

const getTypeLabel = (type: NotificationTypeEnum) => {
  const labels: Record<NotificationTypeEnum, string> = {
    system: '系统通知',
    workflow: '审批通知',
    reminder: '提醒通知',
    alert: '告警通知',
    message: '消息通知',
    info: '信息通知',
    success: '成功通知',
    warning: '警告通知',
    error: '错误通知',
  };
  return labels[type] || type;
};

export default NotificationTemplatesPage;
