import React, { useState, useEffect } from 'react';
import {
  GitBranch,
  Plus,
  Clock,
  User,
  CheckCircle,
  RotateCcw,
  Trash2,
  Eye,
  Search,
  Loader2,
  ArrowLeft,
  GitCompare,
  Calendar,
  ChevronDown,
} from 'lucide-react';
import { useParams, useNavigate } from 'react-router-dom';
import { flowApi, Workflow, WorkflowVersion } from '../api/flow';
import { useNotification } from '../hooks/useNotification';
import { NotificationContainer } from '../components/NotificationContainer';

const FlowVersionHistoryPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { success, error: showError } = useNotification();
  const [workflow, setWorkflow] = useState<Workflow | null>(null);
  const [versions, setVersions] = useState<WorkflowVersion[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedVersions, setSelectedVersions] = useState<string[]>([]);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showRollbackModal, setShowRollbackModal] = useState(false);
  const [selectedVersion, setSelectedVersion] = useState<WorkflowVersion | null>(null);
  const [createForm, setCreateForm] = useState({
    version: '',
    change_description: '',
  });
  const [rollbackForm, setRollbackForm] = useState({
    reason: '',
  });
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    loadData();
  }, [id]);

  const loadData = async () => {
    if (!id) return;

    try {
      setLoading(true);

      const workflowResponse = await flowApi.getWorkflow(id);
      if (workflowResponse.success && workflowResponse.data) {
        setWorkflow(workflowResponse.data as any);
      }

      const versionsResponse = await flowApi.getVersions(id);
      if (versionsResponse.success && versionsResponse.data) {
        const data = versionsResponse.data as any;
        const versionList = Array.isArray(data) ? data : data.items || [];
        setVersions(versionList);
      }
    } catch (err) {
      console.error('加载数据失败:', err);
      showError('加载数据失败');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateVersion = async () => {
    if (!id || !createForm.version.trim()) {
      showError('请输入版本号');
      return;
    }

    try {
      setActionLoading(true);

      const workflow = await flowApi.getWorkflow(id);
      if (!workflow.success || !workflow.data) {
        showError('获取工作流失败');
        return;
      }

      const workflowData = workflow.data as any;
      const response = await flowApi.createVersion(id, {
        version: createForm.version,
        definition: workflowData.definition || {},
        change_description: createForm.change_description,
        created_by: 'current-user',
      });

      if (response.success) {
        success('版本创建成功');
        setShowCreateModal(false);
        setCreateForm({ version: '', change_description: '' });
        loadData();
      } else {
        showError(response.message || '创建失败');
      }
    } catch (err) {
      console.error('创建版本失败:', err);
      showError('创建版本失败');
    } finally {
      setActionLoading(false);
    }
  };

  const handleActivateVersion = async (version: WorkflowVersion) => {
    if (!id) return;

    try {
      setActionLoading(true);

      const response = await flowApi.activateVersion(id, version.id);
      if (response.success) {
        success('版本激活成功');
        loadData();
      } else {
        showError(response.message || '激活失败');
      }
    } catch (err) {
      console.error('激活版本失败:', err);
      showError('激活版本失败');
    } finally {
      setActionLoading(false);
    }
  };

  const handleRollback = async () => {
    if (!id || !selectedVersion) return;

    try {
      setActionLoading(true);

      const response = await flowApi.rollbackVersion(id, {
        to_version: selectedVersion.version,
        reason: rollbackForm.reason,
        rolled_back_by: 'current-user',
      });

      if (response.success) {
        success('回滚成功');
        setShowRollbackModal(false);
        setSelectedVersion(null);
        setRollbackForm({ reason: '' });
        loadData();
      } else {
        showError(response.message || '回滚失败');
      }
    } catch (err) {
      console.error('回滚失败:', err);
      showError('回滚失败');
    } finally {
      setActionLoading(false);
    }
  };

  const handleDeleteVersion = async (version: WorkflowVersion) => {
    if (!id || version.is_active) {
      showError('无法删除当前激活的版本');
      return;
    }

    if (!confirm('确定要删除这个版本吗？')) return;

    try {
      setActionLoading(true);

      const response = await flowApi.deleteVersion(id, version.id);
      if (response.success) {
        success('版本删除成功');
        loadData();
      } else {
        showError(response.message || '删除失败');
      }
    } catch (err) {
      console.error('删除版本失败:', err);
      showError('删除版本失败');
    } finally {
      setActionLoading(false);
    }
  };

  const handleCompare = (version1: string, version2: string) => {
    navigate(`/flow/workflows/${id}/compare/${version1}/${version2}`);
  };

  if (loading) {
    return (
      <div className='min-h-screen bg-gray-50 flex items-center justify-center'>
        <Loader2 className='w-8 h-8 animate-spin text-purple-600' />
      </div>
    );
  }

  return (
    <div className='min-h-screen bg-gray-50 p-6'>
      <NotificationContainer notifications={[]} onClose={() => {}} />

      {/* Header */}
      <div className='bg-white rounded-lg shadow-sm p-6 mb-6'>
        <div className='flex items-center justify-between'>
          <div className='flex items-center space-x-3'>
            <button onClick={() => navigate(`/flow/workflows`)} className='p-2 hover:bg-gray-100 rounded-lg'>
              <ArrowLeft className='w-5 h-5 text-gray-600' />
            </button>
            <div className='w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center'>
              <GitBranch className='w-6 h-6 text-purple-600' />
            </div>
            <div>
              <h1 className='text-2xl font-bold text-gray-900'>版本历史</h1>
              <p className='text-sm text-gray-500'>{workflow?.name}</p>
            </div>
          </div>
          <button
            onClick={() => setShowCreateModal(true)}
            className='flex items-center px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors'
          >
            <Plus className='w-5 h-5 mr-2' />
            创建版本
          </button>
        </div>
      </div>

      {/* Version Timeline */}
      <div className='bg-white rounded-lg shadow-sm p-6'>
        <h2 className='text-lg font-semibold text-gray-900 mb-4'>版本列表</h2>

        {versions.length === 0 ? (
          <div className='text-center py-12'>
            <GitBranch className='w-16 h-16 mx-auto text-gray-300 mb-4' />
            <p className='text-gray-500'>暂无版本历史</p>
            <button
              onClick={() => setShowCreateModal(true)}
              className='mt-4 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700'
            >
              创建第一个版本
            </button>
          </div>
        ) : (
          <div className='space-y-4'>
            {versions.map((version, index) => (
              <div
                key={version.id}
                className={`border rounded-lg p-4 transition-all ${
                  version.is_active ? 'border-purple-500 bg-purple-50' : 'border-gray-200 hover:border-purple-300'
                }`}
              >
                <div className='flex items-start justify-between'>
                  <div className='flex items-start space-x-4'>
                    <div
                      className={`w-10 h-10 rounded-full flex items-center justify-center ${
                        version.is_active ? 'bg-purple-600 text-white' : 'bg-gray-100 text-gray-600'
                      }`}
                    >
                      {version.is_active ? (
                        <CheckCircle className='w-5 h-5' />
                      ) : (
                        <span className='text-sm font-bold'>{index + 1}</span>
                      )}
                    </div>
                    <div>
                      <div className='flex items-center space-x-3 mb-1'>
                        <h3 className='text-lg font-semibold text-gray-900'>v{version.version}</h3>
                        {version.is_active && (
                          <span className='px-2 py-1 text-xs bg-purple-600 text-white rounded-full'>当前版本</span>
                        )}
                      </div>
                      {version.change_description && (
                        <p className='text-sm text-gray-600 mb-2'>{version.change_description}</p>
                      )}
                      <div className='flex items-center space-x-4 text-xs text-gray-500'>
                        <span className='flex items-center'>
                          <User className='w-4 h-4 mr-1' />
                          {version.created_by || '系统'}
                        </span>
                        <span className='flex items-center'>
                          <Calendar className='w-4 h-4 mr-1' />
                          {new Date(version.created_at).toLocaleString()}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className='flex items-center space-x-2'>
                    {!version.is_active && (
                      <>
                        <button
                          onClick={() => {
                            setSelectedVersion(version);
                            setShowRollbackModal(true);
                          }}
                          className='p-2 rounded-lg text-orange-600 hover:bg-orange-50'
                          title='回滚到此版本'
                        >
                          <RotateCcw className='w-5 h-5' />
                        </button>
                        <button
                          onClick={() => handleDeleteVersion(version)}
                          className='p-2 rounded-lg text-red-600 hover:bg-red-50'
                          title='删除版本'
                        >
                          <Trash2 className='w-5 h-5' />
                        </button>
                      </>
                    )}
                    <button
                      onClick={() => handleActivateVersion(version)}
                      disabled={version.is_active}
                      className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                        version.is_active
                          ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                          : 'bg-purple-600 text-white hover:bg-purple-700'
                      }`}
                    >
                      {version.is_active ? '已激活' : '激活'}
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Create Version Modal */}
      {showCreateModal && (
        <div className='fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50'>
          <div className='bg-white rounded-lg p-6 w-full max-w-md'>
            <h2 className='text-xl font-bold mb-4'>创建新版本</h2>
            <div className='space-y-4'>
              <div>
                <label className='block text-sm font-medium text-gray-700 mb-1'>版本号 *</label>
                <input
                  type='text'
                  value={createForm.version}
                  onChange={(e) => setCreateForm({ ...createForm, version: e.target.value })}
                  className='w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent'
                  placeholder='例如: 1.0.1'
                />
              </div>
              <div>
                <label className='block text-sm font-medium text-gray-700 mb-1'>变更说明</label>
                <textarea
                  value={createForm.change_description}
                  onChange={(e) => setCreateForm({ ...createForm, change_description: e.target.value })}
                  className='w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent'
                  rows={4}
                  placeholder='描述本次变更内容'
                />
              </div>
            </div>
            <div className='flex justify-end space-x-3 mt-6'>
              <button
                onClick={() => setShowCreateModal(false)}
                className='px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50'
              >
                取消
              </button>
              <button
                onClick={handleCreateVersion}
                disabled={actionLoading || !createForm.version.trim()}
                className='px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center'
              >
                {actionLoading && <Loader2 className='w-4 h-4 mr-2 animate-spin' />}
                创建
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Rollback Modal */}
      {showRollbackModal && selectedVersion && (
        <div className='fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50'>
          <div className='bg-white rounded-lg p-6 w-full max-w-md'>
            <h2 className='text-xl font-bold mb-4'>回滚到 v{selectedVersion.version}</h2>
            <div className='mb-4'>
              <p className='text-gray-600 mb-2'>
                确定要回滚到版本 <strong>v{selectedVersion.version}</strong> 吗？
              </p>
              <p className='text-sm text-gray-500'>当前工作流将被更新为该版本的内容。</p>
            </div>
            <div>
              <label className='block text-sm font-medium text-gray-700 mb-1'>回滚原因</label>
              <textarea
                value={rollbackForm.reason}
                onChange={(e) => setRollbackForm({ ...rollbackForm, reason: e.target.value })}
                className='w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent'
                rows={3}
                placeholder='可选：输入回滚原因'
              />
            </div>
            <div className='flex justify-end space-x-3 mt-6'>
              <button
                onClick={() => {
                  setShowRollbackModal(false);
                  setSelectedVersion(null);
                  setRollbackForm({ reason: '' });
                }}
                className='px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50'
              >
                取消
              </button>
              <button
                onClick={handleRollback}
                disabled={actionLoading}
                className='px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center'
              >
                {actionLoading && <Loader2 className='w-4 h-4 mr-2 animate-spin' />}
                确认回滚
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default FlowVersionHistoryPage;
