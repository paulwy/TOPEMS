import {
  Box,
  Card,
  CardContent,
  CircularProgress,
  Dialog,
  DialogContent,
  DialogActions,
  DialogTitle,
  InputAdornment,
  Stack,
  TextField,
  Typography,
  Button,
} from '@mui/material';
import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import type { NodeData, EdgeData } from '@/components/workflow/WorkflowDesigner';
import WorkflowDesigner from '@/components/workflow/WorkflowDesigner';
import { useNotificationStore } from '../../store';
import type { Workflow, CreateWorkflowRequest, UpdateWorkflowRequest } from '@/api/workflow';
import { workflowApi } from '@/api/workflow';
import { apiLogger } from '@/utils/logger';
import { Save } from 'lucide-react';
import { PageContainer } from '@/components/common';
import { WORKFLOW_PATHS } from '@/modules/workflow/config';

const WorkflowDesignerPage: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const workflowId = searchParams.get('id');

  const { addNotification } = useNotificationStore();
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [showSaveDialog, setShowSaveDialog] = useState(false);
  const [workflow, setWorkflow] = useState<Workflow | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
  });
  const [nodes, setNodes] = useState<NodeData[]>([]);
  const [edges, setEdges] = useState<EdgeData[]>([]);

  useEffect(() => {
    if (workflowId) {
      loadWorkflow(workflowId);
    }
  }, [workflowId]);

  const loadWorkflow = async (id: string) => {
    try {
      setLoading(true);
      const response = await workflowApi.getWorkflow(id);
      if (response.success && response.data) {
        const wf = response.data;
        setWorkflow(wf);
        setFormData({
          name: wf.name,
          description: wf.description || '',
        });
        // Convert workflow definition to nodes and edges
        if (wf.definition && wf.definition.nodes) {
          const approvalNodes = wf.definition.nodes as any[];
          const startNode = approvalNodes.find((n) => n.node_id === wf.definition.startnode);
          const convertedNodes = approvalNodes.map((node, index) => ({
            id: node.node_id,
            type: index === 0 ? 'start' : node.approvers?.length > 1 ? 'approval' : 'task',
            x: 100 + (index % 3) * 250,
            y: 100 + Math.floor(index / 3) * 150,
            label: node.name || node.node_id,
            description: node.name,
            approvers: node.approvers || [],
          }));
          const convertedEdges = approvalNodes.flatMap((node) =>
            (node.nextnodes || []).map((targetId: string) => ({
              id: `edge-${node.node_id}-${targetId}`,
              source: node.node_id,
              target: targetId,
            }))
          );
          setNodes(convertedNodes);
          setEdges(convertedEdges);
        }
      } else {
        addNotification({
          title: '加载失败',
          message: response.message || '无法加载工作流',
          type: 'error',
        });
      }
    } catch (error: unknown) {
      apiLogger.error('加载工作流失败:', error);
      addNotification({
        title: '加载失败',
        message: '加载工作流失败',
        type: 'error',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSave = (newNodes: NodeData[], newEdges: EdgeData[]) => {
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
        approvers:
          node.approvers && node.approvers.length > 0 ? node.approvers : ['system-user-id'],
        approval_type: (node.type === 'approval' ? 'single' : 'single') as 'single',
        conditions: undefined,
        timeout_hours: 24,
        auto_action: undefined,
        notification_users: undefined,
        nextnodes: edges.filter((e) => e.source === node.id).map((e) => e.target),
      }));

    const startNode = nodes.find((n) => n.type === 'start');
    const endNodes = nodes.filter((n) => n.type === 'end').map((n) => n.id);

    return {
      version: '1.0',
      nodes: approvalNodes,
      startnode: startNode?.id || '',
      endnodes: endNodes,
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
        const response = await workflowApi.updateWorkflow(workflow.id, updateData);
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
          isactive: true,
        };
        const response = await workflowApi.createWorkflow(createData);
        if (response.success && response.data) {
          addNotification({
            title: '保存成功',
            message: '工作流已创建',
            type: 'success',
          });
          setShowSaveDialog(false);
          // Navigate to edit mode
          navigate(WORKFLOW_PATHS.definitions);
        } else {
          addNotification({
            title: '保存失败',
            message: response.message || '创建工作流失败',
            type: 'error',
          });
        }
      }
    } catch (error: unknown) {
      apiLogger.error('保存工作流失败:', error);
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
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          height: '100vh',
        }}
      >
        <CircularProgress />
      </Box>
    );
  }

  return (
    <PageContainer
      title={workflow ? `编辑: ${workflow.name}` : '新建工作流'}
      subtitle='设计工作流审批流程'
      headerProps={{
        showDivider: true,
      }}
      maxWidth={false}
      padding={false}
      sx={{ height: '100vh', display: 'flex', flexDirection: 'column' }}
      contentSx={{ flex: 1, display: 'flex', flexDirection: 'column' }}
    >
      {/* Designer */}
      <Box sx={{ flex: 1 }}>
        <WorkflowDesigner
          initialNodes={nodes}
          initialEdges={edges}
          onSave={handleSave}
        />
      </Box>

      {/* Save Dialog */}
      <Dialog
        open={showSaveDialog}
        onClose={() => setShowSaveDialog(false)}
      >
        <DialogContent sx={{ maxWidth: 400 }}>
          <DialogTitle>保存工作流</DialogTitle>
          <Typography
            variant='body2'
            color='text.secondary'
            sx={{ mb: 2 }}
          >
            请输入工作流名称和描述
          </Typography>
          <Stack spacing={2}>
            <Box>
              <Typography
                variant='body2'
                sx={{ mb: 0.5, fontWeight: 500 }}
              >
                工作流名称 *
              </Typography>
              <TextField
                fullWidth
                size='small'
                value={formData.name}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  setFormData({ ...formData, name: e.target.value })
                }
                placeholder='请输入工作流名称'
              />
            </Box>
            <Box>
              <Typography
                variant='body2'
                sx={{ mb: 0.5, fontWeight: 500 }}
              >
                描述
              </Typography>
              <TextField
                fullWidth
                size='small'
                multiline
                rows={3}
                value={formData.description}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  setFormData({ ...formData, description: e.target.value })
                }
                placeholder='请输入工作流描述'
              />
            </Box>
          </Stack>
          <DialogActions>
            <Button
              variant='outlined'
              onClick={() => setShowSaveDialog(false)}
            >
              取消
            </Button>
            <Button
              onClick={handleSaveWorkflow}
              disabled={saving}
              variant='contained'
              startIcon={saving ? undefined : <Save size={16} />}
            >
              {saving ? '保存中...' : '保存'}
            </Button>
          </DialogActions>
        </DialogContent>
      </Dialog>
    </PageContainer>
  );
};

export default WorkflowDesignerPage;
