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
import type { Workflow, WorkflowVersion } from '../api/flow';
import { flowApi } from '../api/flow';
import { useAppStore } from '../store';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';

const FlowVersionHistoryPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const addNotification = useAppStore((state) => state.addNotification);
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
      addNotification({ title: '错误', message: '加载数据失败', type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const handleCreateVersion = async () => {
    if (!id || !createForm.version.trim()) {
      addNotification({ title: '提示', message: '请输入版本号', type: 'info' });
      return;
    }

    try {
      setActionLoading(true);

      const workflow = await flowApi.getWorkflow(id);
      if (!workflow.success || !workflow.data) {
        addNotification({ title: '错误', message: '获取工作流失败', type: 'error' });
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
        addNotification({ title: '成功', message: '版本创建成功', type: 'success' });
        setShowCreateModal(false);
        setCreateForm({ version: '', change_description: '' });
        loadData();
      } else {
        addNotification({ title: '失败', message: response.message || '创建失败', type: 'error' });
      }
    } catch (err) {
      console.error('创建版本失败:', err);
      addNotification({ title: '错误', message: '创建版本失败', type: 'error' });
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
        addNotification({ title: '成功', message: '版本激活成功', type: 'success' });
        loadData();
      } else {
        addNotification({ title: '失败', message: response.message || '激活失败', type: 'error' });
      }
    } catch (err) {
      console.error('激活版本失败:', err);
      addNotification({ title: '错误', message: '激活版本失败', type: 'error' });
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
        addNotification({ title: '成功', message: '回滚成功', type: 'success' });
        setShowRollbackModal(false);
        setSelectedVersion(null);
        setRollbackForm({ reason: '' });
        loadData();
      } else {
        addNotification({ title: '失败', message: response.message || '回滚失败', type: 'error' });
      }
    } catch (err) {
      console.error('回滚失败:', err);
      addNotification({ title: '错误', message: '回滚失败', type: 'error' });
    } finally {
      setActionLoading(false);
    }
  };

  const handleDeleteVersion = async (version: WorkflowVersion) => {
    if (!id || version.is_active) {
      addNotification({ title: '提示', message: '无法删除当前激活的版本', type: 'info' });
      return;
    }

    if (!confirm('确定要删除这个版本吗？')) return;

    try {
      setActionLoading(true);

      const response = await flowApi.deleteVersion(id, version.id);
      if (response.success) {
        addNotification({ title: '成功', message: '版本删除成功', type: 'success' });
        loadData();
      } else {
        addNotification({ title: '失败', message: response.message || '删除失败', type: 'error' });
      }
    } catch (err) {
      console.error('删除版本失败:', err);
      addNotification({ title: '错误', message: '删除版本失败', type: 'error' });
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
      {/* Header */}
      <div className='bg-white rounded-lg shadow-sm p-6 mb-6'>
        <div className='flex items-center justify-between'>
          <div className='flex items-center space-x-3'>
            <Button variant='ghost' onClick={() => navigate(`/flow/workflows`)}>
              <ArrowLeft className='w-5 h-5' />
            </Button>
            <div className='w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center'>
              <GitBranch className='w-6 h-6 text-purple-600' />
            </div>
            <div>
              <h1 className='text-2xl font-bold text-gray-900'>版本历史</h1>
              <p className='text-sm text-gray-500'>{workflow?.name}</p>
            </div>
          </div>
          <Button onClick={() => setShowCreateModal(true)} className='bg-purple-600 hover:bg-purple-700'>
            <Plus className='w-5 h-5 mr-2' />
            创建版本
          </Button>
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
                        <Button
                          variant='ghost'
                          size='sm'
                          onClick={() => {
                            setSelectedVersion(version);
                            setShowRollbackModal(true);
                          }}
                          className='text-orange-600 hover:text-orange-700 hover:bg-orange-50'
                          title='回滚到此版本'
                        >
                          <RotateCcw className='w-4 h-4' />
                        </Button>
                        <Button
                          variant='ghost'
                          size='sm'
                          onClick={() => handleDeleteVersion(version)}
                          className='text-red-600 hover:text-red-700 hover:bg-red-50'
                          title='删除版本'
                        >
                          <Trash2 className='w-4 h-4' />
                        </Button>
                      </>
                    )}
                    <Button
                      size='sm'
                      onClick={() => handleActivateVersion(version)}
                      disabled={version.is_active}
                      className={
                        version.is_active
                          ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                          : 'bg-purple-600 hover:bg-purple-700'
                      }
                    >
                      {version.is_active ? '已激活' : '激活'}
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Create Version Modal */}
      <Dialog open={showCreateModal} onOpenChange={setShowCreateModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>创建新版本</DialogTitle>
            <DialogDescription>创建一个新的工作流版本</DialogDescription>
          </DialogHeader>
          <div className='space-y-4'>
            <div className='space-y-2'>
              <Label htmlFor='version'>版本号 *</Label>
              <Input
                id='version'
                value={createForm.version}
                onChange={(e) => setCreateForm({ ...createForm, version: e.target.value })}
                placeholder='例如: 1.0.1'
              />
            </div>
            <div className='space-y-2'>
              <Label htmlFor='change_description'>变更说明</Label>
              <Textarea
                id='change_description'
                value={createForm.change_description}
                onChange={(e) => setCreateForm({ ...createForm, change_description: e.target.value })}
                rows={4}
                placeholder='描述本次变更内容'
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant='secondary' onClick={() => setShowCreateModal(false)}>
              取消
            </Button>
            <Button
              onClick={handleCreateVersion}
              disabled={actionLoading || !createForm.version.trim()}
              className='bg-purple-600 hover:bg-purple-700'
            >
              {actionLoading && <Loader2 className='w-4 h-4 mr-2 animate-spin' />}
              创建
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Rollback Modal */}
      <Dialog open={showRollbackModal} onOpenChange={setShowRollbackModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>回滚到 v{selectedVersion?.version}</DialogTitle>
            <DialogDescription>
              {selectedVersion && (
                <>
                  <p>
                    确定要回滚到版本 <strong>v{selectedVersion.version}</strong> 吗？
                  </p>
                  <p className='text-sm text-gray-500'>当前工作流将被更新为该版本的内容。</p>
                </>
              )}
            </DialogDescription>
          </DialogHeader>
          <div className='space-y-2'>
            <Label htmlFor='rollback_reason'>回滚原因</Label>
            <Textarea
              id='rollback_reason'
              value={rollbackForm.reason}
              onChange={(e) => setRollbackForm({ ...rollbackForm, reason: e.target.value })}
              rows={3}
              placeholder='可选：输入回滚原因'
            />
          </div>
          <DialogFooter>
            <Button
              variant='secondary'
              onClick={() => {
                setShowRollbackModal(false);
                setSelectedVersion(null);
                setRollbackForm({ reason: '' });
              }}
            >
              取消
            </Button>
            <Button onClick={handleRollback} disabled={actionLoading} className='bg-orange-600 hover:bg-orange-700'>
              {actionLoading && <Loader2 className='w-4 h-4 mr-2 animate-spin' />}
              确认回滚
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default FlowVersionHistoryPage;
