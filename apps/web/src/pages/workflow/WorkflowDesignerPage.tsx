import {
  Box,
  CircularProgress,
  Dialog,
  DialogContent,
  DialogActions,
  DialogTitle,
  Stack,
  TextField,
  Typography,
  Button,
} from '@mui/material';
import i18n from '@/i18n';
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
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { QUERY_KEYS } from '@/lib/reactQuery';

const WorkflowDesignerPage: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const workflowId = searchParams.get('id');
  const { addNotification } = useNotificationStore();
  const queryClient = useQueryClient();
  const [showSaveDialog, setShowSaveDialog] = useState(false);
  const [workflow, setWorkflow] = useState<Workflow | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
  });
  const [nodes, setNodes] = useState<NodeData[]>([]);
  const [edges, setEdges] = useState<EdgeData[]>([]);
  const workflowQuery = useQuery<Workflow | null>({
    queryKey: [...QUERY_KEYS.AD_HOC.WORKFLOW_DESIGNER_BASE, workflowId],
    queryFn: async () => {
      if (!workflowId) return null;
      const response = await workflowApi.getWorkflow(workflowId);
      if (response.success && response.data) {
        return response.data;
      }
      return null;
    },
    enabled: !!workflowId,
    staleTime: 5 * 60 * 1000,
  });
  const loading = workflowQuery.isLoading;
  useEffect(() => {
    if (workflowQuery.isError) {
      apiLogger.error(i18n.t('pages.workflow_designer_page.k0'), workflowQuery.error);
      addNotification({
        title: i18n.t('workflow.workflow_designer_page.k0'),
        message: i18n.t('workflow.workflow_designer_page.k1'),
        type: 'error',
      });
    }
  }, [workflowQuery.isError, workflowQuery.error, addNotification]);
  useEffect(() => {
    if (workflowQuery.data) {
      const wf = workflowQuery.data;
      setWorkflow(wf);
      setFormData({
        name: wf.name,
        description: wf.description || '',
      });
      // Convert workflow definition to nodes and edges
      if (wf.definition && wf.definition.nodes) {
        const approvalNodes = wf.definition.nodes;
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
    }
  }, [workflowQuery.data]);
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
  const updateWorkflowMutation = useMutation({
    mutationFn: (params: { id: string; data: UpdateWorkflowRequest }) =>
      workflowApi.updateWorkflow(params.id, params.data),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: [...QUERY_KEYS.AD_HOC.WORKFLOW_DESIGNER_BASE, workflowId],
        exact: false,
        refetchType: 'active',
      });
      addNotification({
        title: i18n.t('workflow.workflow_designer_page.k2'),
        message: i18n.t('workflow.workflow_designer_page.k3'),
        type: 'success',
      });
      setShowSaveDialog(false);
    },
    onError: (err: unknown) => {
      apiLogger.error(i18n.t('pages.workflow_designer_page.k1'), err);
      addNotification({
        title: i18n.t('workflow.workflow_designer_page.k4'),
        message: i18n.t('workflow.workflow_designer_page.k5'),
        type: 'error',
      });
    },
  });
  const createWorkflowMutation = useMutation({
    mutationFn: (data: CreateWorkflowRequest) => workflowApi.createWorkflow(data),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: QUERY_KEYS.AD_HOC.WORKFLOW_DESIGNER_BASE,
        exact: false,
        refetchType: 'active',
      });
      addNotification({
        title: i18n.t('workflow.workflow_designer_page.k6'),
        message: i18n.t('workflow.workflow_designer_page.k7'),
        type: 'success',
      });
      setShowSaveDialog(false);
      // Navigate to edit mode
      navigate(WORKFLOW_PATHS.definitions);
    },
    onError: (err: unknown) => {
      apiLogger.error(i18n.t('pages.workflow_designer_page.k2'), err);
      addNotification({
        title: i18n.t('workflow.workflow_designer_page.k8'),
        message: i18n.t('workflow.workflow_designer_page.k9'),
        type: 'error',
      });
    },
  });
  const saving = updateWorkflowMutation.isPending || createWorkflowMutation.isPending;
  const handleSaveWorkflow = () => {
    if (!formData.name.trim()) {
      addNotification({
        title: i18n.t('workflow.workflow_designer_page.k10'),
        message: i18n.t('workflow.workflow_designer_page.k11'),
        type: 'info',
      });
      return;
    }
    const definition = convertToWorkflowDefinition();
    if (workflow) {
      // Update existing workflow
      const updateData: UpdateWorkflowRequest = {
        name: formData.name,
        description: formData.description,
        definition,
      };
      updateWorkflowMutation.mutate({ id: workflow.id, data: updateData });
    } else {
      // Create new workflow
      const createData: CreateWorkflowRequest = {
        name: formData.name,
        description: formData.description,
        definition,
        isactive: true,
      };
      createWorkflowMutation.mutate(createData);
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
      title={
        workflow
          ? `${i18n.t('pages.workflow_designer_page.k3')}${workflow.name}`
          : i18n.t('workflow.workflow_designer_page.k12')
      }
      subtitle={i18n.t('workflow.workflow_designer_page.k13')}
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
          <DialogTitle>{i18n.t('workflow.workflow_designer_page.k14')}</DialogTitle>
          <Typography
            variant='body2'
            color='text.secondary'
            sx={{ mb: 2 }}
          >
            {i18n.t('pages.workflow_designer_page.k0')}
          </Typography>
          <Stack spacing={2}>
            <Box>
              <Typography
                variant='body2'
                sx={{ mb: 0.5, fontWeight: 500 }}
              >
                {i18n.t('pages.workflow_designer_page.k1')}
              </Typography>
              <TextField
                fullWidth
                size='small'
                value={formData.name}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  setFormData({ ...formData, name: e.target.value })
                }
                placeholder={i18n.t('workflow.workflow_designer_page.k15')}
              />
            </Box>
            <Box>
              <Typography
                variant='body2'
                sx={{ mb: 0.5, fontWeight: 500 }}
              >
                {i18n.t('pages.workflow_designer_page.k2')}
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
                placeholder={i18n.t('workflow.workflow_designer_page.k16')}
              />
            </Box>
          </Stack>
          <DialogActions>
            <Button
              variant='outlined'
              onClick={() => setShowSaveDialog(false)}
            >
              {i18n.t('pages.workflow_designer_page.k3')}
            </Button>
            <Button
              onClick={handleSaveWorkflow}
              disabled={saving}
              variant='contained'
              startIcon={saving ? undefined : <Save size={16} />}
            >
              {saving
                ? i18n.t('pages.workflow_designer_page.k4')
                : i18n.t('workflow.workflow_designer_page.k17')}
            </Button>
          </DialogActions>
        </DialogContent>
      </Dialog>
    </PageContainer>
  );
};
export default WorkflowDesignerPage;
