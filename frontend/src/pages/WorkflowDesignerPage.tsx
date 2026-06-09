import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import WorkflowDesigner from '../components/WorkflowDesigner';
import { useAppStore } from '../store';
import type { Workflow, CreateWorkflowRequest, UpdateWorkflowRequest } from '../api/flow';
import { flowApi } from '../api/flow';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Loader2, Save, ArrowLeft } from 'lucide-react';

const WorkflowDesignerPage: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const workflowId = searchParams.get('id');

  const { addNotification } = useAppStore();
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [showSaveDialog, setShowSaveDialog] = useState(false);
  const [workflow, setWorkflow] = useState<Workflow | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
  });
  const [nodes, setNodes] = useState<any[]>([]);
  const [edges, setEdges] = useState<any[]>([]);

  useEffect(() => {
    if (workflowId) {
      loadWorkflow(workflowId);
    }
  }, [workflowId]);

  const loadWorkflow = async (id: string) => {
    try {
      setLoading(true);
      const response = await flowApi.getWorkflow(id);
      if (response.success && response.data) {
        const wf = response.data;
        setWorkflow(wf);
        setFormData({
          name: wf.name,
          description: wf.description || '',
        });
        // TODO: Convert workflow definition to nodes and edges
        if (wf.definition && wf.definition.nodes) {
          setNodes(wf.definition.nodes || []);
          setEdges([]);
        }
      } else {
        addNotification({
          title: '加载失败',
          message: response.message || '无法加载工作流',
          type: 'error',
        });
      }
    } catch (error) {
      console.error('加载工作流失败:', error);
      addNotification({
        title: '加载失败',
        message: '加载工作流失败',
        type: 'error',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSave = (newNodes: any[], newEdges: any[]) => {
    setNodes(newNodes);
    setEdges(newEdges);
    setShowSaveDialog(true);
  };

  const convertToWorkflowDefinition = () => {
    // Convert nodes and edges to workflow definition format
    const approvalNodes = nodes
      .filter((n) => n.type === 'approval' || n.type === 'task')
      .map((node, _index) => ({
        node_id: node.id,
        name: node.label,
        approvers: ['system-user-id'], // TODO: Get from node data
        approval_type: node.type === 'approval' ? 'single' : 'single',
        conditions: undefined,
        timeout_hours: 24,
        auto_action: undefined,
        notification_users: undefined,
        next_nodes: edges.filter((e) => e.source === node.id).map((e) => e.target),
      }));

    const startNode = nodes.find((n) => n.type === 'start');
    const endNodes = nodes.filter((n) => n.type === 'end').map((n) => n.id);

    return {
      version: '1.0',
      nodes: approvalNodes,
      start_node: startNode?.id || '',
      end_nodes: endNodes,
      timeout_action: 'reject',
    };
  };

  const handleSaveWorkflow = async () => {
    if (!formData.name.trim()) {
      addNotification({
        title: '提示',
        message: '请输入工作流名称',
        type: 'info',
      });
      return;
    }

    try {
      setSaving(true);
      const definition = convertToWorkflowDefinition();

      if (workflow) {
        // Update existing workflow
        const updateData: UpdateWorkflowRequest = {
          name: formData.name,
          description: formData.description,
          definition,
        };
        const response = await flowApi.updateWorkflow(workflow.id, updateData);
        if (response.success) {
          addNotification({
            title: '保存成功',
            message: '工作流已更新',
            type: 'success',
          });
          setShowSaveDialog(false);
        } else {
          addNotification({
            title: '保存失败',
            message: response.message || '更新工作流失败',
            type: 'error',
          });
        }
      } else {
        // Create new workflow
        const createData: CreateWorkflowRequest = {
          name: formData.name,
          description: formData.description,
          definition,
          is_active: true,
        };
        const response = await flowApi.createWorkflow(createData);
        if (response.success && response.data) {
          addNotification({
            title: '保存成功',
            message: '工作流已创建',
            type: 'success',
          });
          setShowSaveDialog(false);
          // Navigate to edit mode
          navigate(`/workflow/designer?id=${response.data.id}`);
        } else {
          addNotification({
            title: '保存失败',
            message: response.message || '创建工作流失败',
            type: 'error',
          });
        }
      }
    } catch (error) {
      console.error('保存工作流失败:', error);
      addNotification({
        title: '保存失败',
        message: '保存工作流失败',
        type: 'error',
      });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className='flex items-center justify-center h-screen'>
        <Loader2 className='w-8 h-8 animate-spin text-blue-600' />
      </div>
    );
  }

  return (
    <div className='h-screen flex flex-col'>
      {/* Header */}
      <div className='bg-white dark:bg-gray-800 border-b dark:border-gray-700 px-6 py-4'>
        <div className='flex items-center justify-between'>
          <div className='flex items-center space-x-4'>
            <Button variant='ghost' onClick={() => navigate('/flow/workflows')}>
              <ArrowLeft className='w-5 h-5 mr-2' />
              返回
            </Button>
            <div>
              <h1 className='text-xl font-bold text-gray-900 dark:text-gray-100'>
                {workflow ? `编辑: ${workflow.name}` : '新建工作流'}
              </h1>
              <p className='text-sm text-gray-500 dark:text-gray-400'>设计工作流审批流程</p>
            </div>
          </div>
        </div>
      </div>

      {/* Designer */}
      <div className='flex-1'>
        <WorkflowDesigner initialNodes={nodes} initialEdges={edges} onSave={handleSave} />
      </div>

      {/* Save Dialog */}
      <Dialog open={showSaveDialog} onOpenChange={setShowSaveDialog}>
        <DialogContent className='max-w-md'>
          <DialogHeader>
            <DialogTitle>保存工作流</DialogTitle>
            <DialogDescription>请输入工作流名称和描述</DialogDescription>
          </DialogHeader>
          <div className='space-y-4'>
            <div className='space-y-2'>
              <Label htmlFor='name'>工作流名称 *</Label>
              <Input
                id='name'
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder='请输入工作流名称'
              />
            </div>
            <div className='space-y-2'>
              <Label htmlFor='description'>描述</Label>
              <Textarea
                id='description'
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder='请输入工作流描述'
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant='outline' onClick={() => setShowSaveDialog(false)}>
              取消
            </Button>
            <Button onClick={handleSaveWorkflow} disabled={saving}>
              {saving && <Loader2 className='w-4 h-4 mr-2 animate-spin' />}
              <Save className='w-4 h-4 mr-2' />
              保存
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default WorkflowDesignerPage;
