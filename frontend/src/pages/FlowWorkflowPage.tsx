import React, { useState, useEffect } from 'react';
import {
  GitBranch,
  Plus,
  Edit,
  Trash2,
  Eye,
  Search,
  Filter,
  List as ListIcon,
  Grid as GridIcon,
  CheckCircle,
  Clock,
  XCircle,
  AlertCircle,
  Loader2,
  ToggleRight,
  ToggleLeft,
  ChevronLeft,
  Play,
  FileText,
  User,
  Users,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { flowApi, Workflow, WorkflowInstance, Approval } from '../api/flow';
import { useAppStore } from '../store';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { ModeToggle } from '@/components/ModeToggle';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

const FlowWorkflowPage: React.FC = () => {
  const navigate = useNavigate();
  const addNotification = useAppStore((state) => state.addNotification);

  const [workflows, setWorkflows] = useState<Workflow[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [showModal, setShowModal] = useState(false);
  const [editingWorkflow, setEditingWorkflow] = useState<Workflow | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    is_active: true,
  });
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    loadWorkflows();
  }, []);

  const loadWorkflows = async () => {
    try {
      setLoading(true);
      const response = await flowApi.listWorkflows();
      if (response.success && response.data) {
        const data = response.data as any;
        const workflowList = Array.isArray(data) ? data : data.items || [];
        setWorkflows(workflowList);
      } else {
        setWorkflows([]);
      }
    } catch (err) {
      console.error('加载工作流失败:', err);
      addNotification({ title: '加载失败', message: '加载工作流失败', type: 'error' });
      setWorkflows([]);
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async () => {
    if (!formData.name.trim()) {
      addNotification({ title: '表单错误', message: '请输入工作流名称', type: 'error' });
      return;
    }

    try {
      setCreating(true);
      const response = await flowApi.createWorkflow({
        name: formData.name,
        description: formData.description,
        is_active: formData.is_active,
        definition: {
          version: '1.0',
          nodes: [],
          start_node: '',
          end_nodes: [],
        },
      });

      if (response.success) {
        addNotification({ title: '成功', message: '工作流创建成功', type: 'success' });
        setShowModal(false);
        setFormData({ name: '', description: '', is_active: true });
        loadWorkflows();
      } else {
        addNotification({ title: '创建失败', message: response.message || '创建失败', type: 'error' });
      }
    } catch (err) {
      addNotification({ title: '错误', message: '创建工作流失败', type: 'error' });
      console.error('创建工作流失败:', err);
    } finally {
      setCreating(false);
    }
  };

  const handleToggleStatus = async (workflow: Workflow) => {
    try {
      const response = await flowApi.updateWorkflow(workflow.id, {
        is_active: !workflow.is_active,
      });

      if (response.success) {
        addNotification({
          title: '成功',
          message: `工作流${workflow.is_active ? '停用' : '激活'}成功`,
          type: 'success',
        });
        loadWorkflows();
      } else {
        addNotification({ title: '操作失败', message: response.message || '操作失败', type: 'error' });
      }
    } catch (err) {
      addNotification({ title: '操作失败', message: '操作失败', type: 'error' });
      console.error('操作失败:', err);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('确定要删除这个工作流吗？')) return;

    try {
      const response = await flowApi.deleteWorkflow(id);
      if (response.success) {
        addNotification({ title: '成功', message: '工作流删除成功', type: 'success' });
        loadWorkflows();
      } else {
        addNotification({ title: '删除失败', message: response.message || '删除失败', type: 'error' });
      }
    } catch (err) {
      addNotification({ title: '错误', message: '删除工作流失败', type: 'error' });
      console.error('删除工作流失败:', err);
    }
  };

  const filteredWorkflows = workflows.filter((w) => {
    const matchesSearch =
      w.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      w.description?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus =
      statusFilter === 'all' ||
      (statusFilter === 'active' && w.is_active) ||
      (statusFilter === 'inactive' && !w.is_active);
    return matchesSearch && matchesStatus;
  });

  return (
    <div className='min-h-screen bg-gray-50 dark:bg-gray-900 p-6'>
      {/* Header */}
      <div className='bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6 mb-6'>
        <div className='flex items-center justify-between'>
          <div className='flex items-center space-x-3'>
            <Button variant='ghost' onClick={() => navigate('/dashboard')}>
              <ChevronLeft className='w-5 h-5' />
            </Button>
            <div className='w-12 h-12 bg-purple-100 dark:bg-purple-900/30 rounded-lg flex items-center justify-center'>
              <GitBranch className='w-6 h-6 text-purple-600 dark:text-purple-400' />
            </div>
            <div>
              <h1 className='text-2xl font-bold text-gray-900 dark:text-gray-100'>工作流管理</h1>
              <p className='text-sm text-gray-500 dark:text-gray-400'>设计和管理审批流程</p>
            </div>
          </div>
          <div className='flex items-center space-x-3'>
            <ModeToggle />
            <Button
              onClick={() => {
                setEditingWorkflow(null);
                setFormData({ name: '', description: '', is_active: true });
                setShowModal(true);
              }}
            >
              <Plus className='w-5 h-5 mr-2' />
              创建工作流
            </Button>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className='bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6 mb-6'>
        <div className='flex items-center space-x-4'>
          <div className='flex-1 relative'>
            <Search className='absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400' />
            <Input
              type='text'
              placeholder='搜索工作流...'
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className='pl-10'
            />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className='w-[180px]'>
              <SelectValue placeholder='筛选状态' />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value='all'>全部状态</SelectItem>
              <SelectItem value='active'>已激活</SelectItem>
              <SelectItem value='inactive'>已停用</SelectItem>
            </SelectContent>
          </Select>
          <Button variant='ghost' onClick={loadWorkflows} title='刷新'>
            <Loader2 className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
          </Button>
        </div>
      </div>

      {/* Workflow List */}
      <div className='bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6'>
        {loading ? (
          <div className='flex items-center justify-center py-12'>
            <Loader2 className='w-8 h-8 animate-spin text-purple-600 dark:text-purple-400' />
          </div>
        ) : filteredWorkflows.length === 0 ? (
          <div className='text-center py-12'>
            <GitBranch className='w-16 h-16 mx-auto text-gray-300 dark:text-gray-600 mb-4' />
            <p className='text-gray-500 dark:text-gray-400'>暂无工作流</p>
            <Button onClick={() => setShowModal(true)} className='mt-4'>
              创建第一个工作流
            </Button>
          </div>
        ) : (
          <div className='space-y-4'>
            {filteredWorkflows.map((workflow) => (
              <Card
                key={workflow.id}
                className='hover:border-purple-300 dark:hover:border-purple-700 transition-colors'
              >
                <CardContent className='p-4'>
                  <div className='flex items-start justify-between'>
                    <div className='flex-1'>
                      <div className='flex items-center space-x-3 mb-2'>
                        <h3 className='text-lg font-semibold text-gray-900 dark:text-gray-100'>{workflow.name}</h3>
                        <Badge variant={workflow.is_active ? 'default' : 'secondary'}>
                          {workflow.is_active ? '已激活' : '已停用'}
                        </Badge>
                      </div>
                      {workflow.description && (
                        <p className='text-sm text-gray-600 dark:text-gray-300 mb-3'>{workflow.description}</p>
                      )}
                      <div className='flex items-center space-x-4 text-xs text-gray-500 dark:text-gray-400'>
                        <span className='flex items-center'>
                          <Clock className='w-4 h-4 mr-1' />
                          创建于 {new Date(workflow.created_at).toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                    <div className='flex items-center space-x-2'>
                      <Button
                        variant='ghost'
                        size='sm'
                        onClick={() => handleToggleStatus(workflow)}
                        title={workflow.is_active ? '停用' : '激活'}
                      >
                        {workflow.is_active ? <ToggleRight className='w-5 h-5' /> : <ToggleLeft className='w-5 h-5' />}
                      </Button>
                      <Button
                        variant='ghost'
                        size='sm'
                        onClick={() => navigate(`/flow/workflows/${workflow.id}`)}
                        title='查看详情'
                      >
                        <Eye className='w-5 h-5' />
                      </Button>
                      <Button
                        variant='ghost'
                        size='sm'
                        className='text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300'
                        onClick={() => handleDelete(workflow.id)}
                        title='删除'
                      >
                        <Trash2 className='w-5 h-5' />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Create/Edit Modal */}
      <Dialog open={showModal} onOpenChange={setShowModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingWorkflow ? '编辑工作流' : '创建工作流'}</DialogTitle>
            <DialogDescription>{editingWorkflow ? '编辑工作流的详细信息' : '创建一个新的工作流'}</DialogDescription>
          </DialogHeader>
          <div className='space-y-4'>
            <div>
              <Label htmlFor='workflow_name'>工作流名称 *</Label>
              <Input
                id='workflow_name'
                type='text'
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder='输入工作流名称'
              />
            </div>
            <div>
              <Label htmlFor='workflow_desc'>描述</Label>
              <Textarea
                id='workflow_desc'
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                rows={3}
                placeholder='输入工作流描述'
              />
            </div>
            <div className='flex items-center space-x-3'>
              <Switch
                id='is_active'
                checked={formData.is_active}
                onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })}
              />
              <Label htmlFor='is_active'>创建后立即激活</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant='secondary' onClick={() => setShowModal(false)}>
              取消
            </Button>
            <Button onClick={handleCreate} disabled={creating || !formData.name.trim()}>
              {creating && <Loader2 className='w-4 h-4 mr-2 animate-spin' />}
              创建
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default FlowWorkflowPage;
