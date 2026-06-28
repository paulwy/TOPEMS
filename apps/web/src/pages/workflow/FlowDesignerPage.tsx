import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useParams } from 'react-router-dom';
import { logger } from '@/utils/logger';
import { workflowApi } from '@/api/workflow';
import type { Workflow, WorkflowDefinition, ApprovalNode } from '@/api/workflow';
import { useNotification } from '@/hooks/useNotification';
import {
  Box,
  Card,
  CardContent,
  Divider,
  Drawer,
  IconButton,
  Stack,
  TextField,
  Typography,
  Button,
} from '@mui/material';
import {
  Play,
  Save,
  ChevronLeft,
  ChevronRight,
  Circle,
  Square,
  Diamond,
  ArrowRight,
  Settings,
  ZoomIn,
  ZoomOut,
  Maximize,
} from 'lucide-react';

interface FlowNode {
  id: string;
  type: 'start' | 'end' | 'task' | 'approval' | 'condition';
  label: string;
  x: number;
  y: number;
  config?: Record<string, any>;
}

interface FlowEdge {
  id: string;
  source: string;
  target: string;
  label?: string;
}

const nodeTypes = [
  { type: 'start', label: '开始', icon: Play, color: 'success.dark' },
  { type: 'end', label: '结束', icon: Square, color: 'error.dark' },
  { type: 'task', label: '任务', icon: Circle, color: 'secondary.main' },
  { type: 'approval', label: '审批', icon: Diamond, color: 'warning.main' },
  { type: 'condition', label: '条件', icon: Diamond, color: 'primary.main' },
];

const FlowDesignerPage: React.FC = () => {
  const { success, error } = useNotification();
  const { id: workflowId } = useParams<{ id: string }>();

  const [nodes, setNodes] = useState<FlowNode[]>([]);
  const [edges, setEdges] = useState<FlowEdge[]>([]);
  const [selectedNode, setSelectedNode] = useState<FlowNode | null>(null);
  const [showProperties, setShowProperties] = useState(false);
  const [zoom, setZoom] = useState(100);
  const [loading, setLoading] = useState(false);
  const [workflow, setWorkflow] = useState<Workflow | null>(null);
  const [saving, setSaving] = useState(false);

  const loadWorkflow = useCallback(async () => {
    if (!workflowId) return;
    try {
      setLoading(true);
      const res = await workflowApi.getWorkflow(workflowId);
      if (res.success && res.data) {
        setWorkflow(res.data);
        const definition = res.data.definition;
        if (definition?.nodes) {
          const approvalNodes = definition.nodes;
          const convertedNodes: FlowNode[] = approvalNodes.map((node, index) => ({
            id: node.node_id,
            type: index === 0 ? 'start' : node.approvers?.length > 0 ? 'approval' : 'task',
            label: node.name || node.node_id,
            x: 100 + (index % 3) * 200,
            y: 150 + Math.floor(index / 3) * 150,
            config: {
              approvers: node.approvers,
              approval_type: node.approval_type,
              timeout_hours: node.timeout_hours,
            },
          }));
          setNodes(convertedNodes);
        }
        if (definition?.nodes) {
          const approvalNodes = definition.nodes;
          const convertedEdges: FlowEdge[] = approvalNodes.flatMap((node) =>
            (node.nextnodes || []).map((targetId: string) => ({
              id: `edge-${node.node_id}-${targetId}`,
              source: node.node_id,
              target: targetId,
            }))
          );
          setEdges(convertedEdges);
        }
      }
    } catch (err: unknown) {
      logger.error('Error loading workflow:', err);
      error('加载流程失败');
    } finally {
      setLoading(false);
    }
  }, [workflowId, error]);

  useEffect(() => {
    if (workflowId) {
      loadWorkflow();
    } else {
      setNodes([
        { id: 'start-1', type: 'start', label: '开始', x: 100, y: 200 },
        { id: 'task-1', type: 'task', label: '填写申请', x: 250, y: 200 },
        { id: 'approval-1', type: 'approval', label: '部门审批', x: 400, y: 200 },
        { id: 'condition-1', type: 'condition', label: '金额判断', x: 550, y: 200 },
        { id: 'approval-2', type: 'approval', label: '经理审批', x: 700, y: 100 },
        { id: 'approval-3', type: 'approval', label: '财务审批', x: 700, y: 300 },
        { id: 'end-1', type: 'end', label: '结束', x: 850, y: 200 },
      ]);
      setEdges([
        { id: 'e1', source: 'start-1', target: 'task-1' },
        { id: 'e2', source: 'task-1', target: 'approval-1' },
        { id: 'e3', source: 'approval-1', target: 'condition-1' },
        { id: 'e4', source: 'condition-1', target: 'approval-2', label: '≤5000' },
        { id: 'e5', source: 'condition-1', target: 'approval-3', label: '>5000' },
        { id: 'e6', source: 'approval-2', target: 'end-1' },
        { id: 'e7', source: 'approval-3', target: 'end-1' },
      ]);
    }
  }, [workflowId, loadWorkflow]);

  const handleNodeClick = (node: FlowNode) => {
    setSelectedNode(node);
    setShowProperties(true);
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      const approvalNodes: ApprovalNode[] = nodes
        .filter((n) => n.type === 'approval' || n.type === 'task')
        .map((node) => ({
          node_id: node.id,
          name: node.label,
          approvers: node.config?.approvers || [],
          approval_type: node.config?.approval_type || 'single',
          conditions: undefined,
          timeout_hours: node.config?.timeout_hours || 24,
          auto_action: undefined,
          notification_users: undefined,
          nextnodes: edges.filter((e) => e.source === node.id).map((e) => e.target),
        }));

      const startNodeId = nodes.find((n) => n.type === 'start')?.id || '';

      const definition: WorkflowDefinition = {
        version: workflow?.definition?.version || '1.0',
        nodes: approvalNodes,
        startnode: startNodeId,
        endnodes: nodes.filter((n) => n.type === 'end').map((n) => n.id),
        timeout_action: 'reject',
      };

      if (workflowId) {
        await workflowApi.updateWorkflow(workflowId, { definition });
        success('流程更新成功');
      } else {
        await workflowApi.createWorkflow({
          name: '新流程',
          definition,
          isactive: false,
        });
        success('流程创建成功');
      }
    } catch (err: unknown) {
      logger.error('Error saving workflow:', err);
      error('保存流程失败');
    } finally {
      setSaving(false);
    }
  };

  const handlePreview = () => {
    logger.info('预览流程');
  };

  return (
    <Box sx={{ height: '100vh', display: 'flex', flexDirection: 'column' }}>
      <Card
        sx={{
          borderRadius: 0,
          borderBottom: '1px solid',
          borderColor: 'divider',
        }}
      >
        <CardContent sx={{ p: 2 }}>
          <Stack
            direction='row'
            sx={{ alignItems: 'center', justifyContent: 'space-between' }}
          >
            <Stack
              direction='row'
              spacing={2}
              sx={{ alignItems: 'center' }}
            >
              <Button
                variant='text'
                startIcon={<ChevronLeft size={20} />}
                sx={{ color: 'grey.600' }}
              >
                返回
              </Button>
              <Box>
                <Typography
                  variant='h6'
                  sx={{ fontWeight: 700 }}
                >
                  流程设计器
                </Typography>
                <Typography
                  variant='body2'
                  color='text.secondary'
                >
                  {workflow?.name || '设计工作流程和审批节点'}
                </Typography>
              </Box>
            </Stack>
            <Stack
              direction='row'
              spacing={2}
            >
              <Button
                variant='outlined'
                startIcon={<Settings size={16} />}
                onClick={() => setZoom(100)}
              >
                重置
              </Button>
              <Button
                variant='outlined'
                startIcon={<ZoomOut size={16} />}
                onClick={() => setZoom(Math.max(50, zoom - 10))}
              >
                缩小
              </Button>
              <Typography
                variant='body2'
                sx={{ minWidth: 60, textAlign: 'center', alignSelf: 'center' }}
              >
                {zoom}%
              </Typography>
              <Button
                variant='outlined'
                startIcon={<ZoomIn size={16} />}
                onClick={() => setZoom(Math.min(200, zoom + 10))}
              >
                放大
              </Button>
              <Button
                variant='outlined'
                startIcon={<Maximize size={16} />}
              >
                适应画布
              </Button>
              <Button
                variant='outlined'
                startIcon={<Play size={16} />}
                onClick={handlePreview}
              >
                预览
              </Button>
              <Button
                variant='contained'
                startIcon={<Save size={16} />}
                onClick={handleSave}
                disabled={saving}
                sx={{ bgcolor: 'secondary.main', '&:hover': { bgcolor: 'secondary.dark' } }}
              >
                {saving ? '保存中...' : '保存'}
              </Button>
            </Stack>
          </Stack>
        </CardContent>
      </Card>

      <Box sx={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
        <Card
          sx={{
            width: 240,
            borderRadius: 0,
            borderRight: '1px solid',
            borderColor: 'divider',
          }}
        >
          <CardContent sx={{ p: 2 }}>
            <Typography
              variant='subtitle2'
              sx={{ fontWeight: 600, mb: 2 }}
            >
              流程节点
            </Typography>
            <Stack spacing={1}>
              {nodeTypes.map((nodeType) => {
                const Icon = nodeType.icon;
                return (
                  <Box
                    key={nodeType.type}
                    sx={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 1.5,
                      p: 1.5,
                      borderRadius: 1,
                      border: '1px solid',
                      borderColor: 'divider',
                      cursor: 'grab',
                      '&:hover': {
                        borderColor: 'primary.light',
                        bgcolor: 'grey.50',
                      },
                    }}
                  >
                    <Box
                      sx={{
                        width: 32,
                        height: 32,
                        borderRadius: 1,
                        bgcolor: nodeType.color,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      <Icon
                        size={16}
                        color='white'
                      />
                    </Box>
                    <Typography variant='body2'>{nodeType.label}</Typography>
                  </Box>
                );
              })}
            </Stack>

            <Divider sx={{ my: 2 }} />

            <Typography
              variant='subtitle2'
              sx={{ fontWeight: 600, mb: 2 }}
            >
              节点属性
            </Typography>
            <Typography
              variant='body2'
              color='text.secondary'
            >
              点击画布上的节点可编辑其属性
            </Typography>
          </CardContent>
        </Card>

        <Box
          sx={{
            flex: 1,
            bgcolor: 'grey.100',
            overflow: 'auto',
            position: 'relative',
          }}
        >
          <Box
            sx={{
              width: 1200,
              height: 800,
              position: 'relative',
              transform: `scale(${zoom / 100})`,
              transformOrigin: 'top left',
            }}
          >
            {nodes.map((node) => (
              <Box
                key={node.id}
                onClick={() => handleNodeClick(node)}
                sx={{
                  position: 'absolute',
                  left: node.x,
                  top: node.y,
                  px: 3,
                  py: 2,
                  bgcolor:
                    node.type === 'start'
                      ? 'success.dark'
                      : node.type === 'end'
                        ? 'error.dark'
                        : node.type === 'approval'
                          ? 'warning.main'
                          : node.type === 'condition'
                            ? 'primary.main'
                            : 'white',
                  color:
                    node.type === 'start' ||
                    node.type === 'end' ||
                    node.type === 'approval' ||
                    node.type === 'condition'
                      ? 'white'
                      : 'grey.800',
                  borderRadius: 1,
                  border: node.type === 'start' || node.type === 'end' ? 'none' : '2px solid',
                  borderColor:
                    node.type === 'start'
                      ? 'success.dark'
                      : node.type === 'end'
                        ? 'error.dark'
                        : node.type === 'approval'
                          ? 'warning.main'
                          : node.type === 'condition'
                            ? 'primary.main'
                            : 'grey.300',
                  cursor: 'pointer',
                  '&:hover': {
                    boxShadow: 3,
                  },
                }}
              >
                <Typography
                  variant='body2'
                  sx={{ fontWeight: 500, textAlign: 'center' }}
                >
                  {node.label}
                </Typography>
              </Box>
            ))}

            {edges.map((edge) => {
              const sourceNode = nodes.find((n) => n.id === edge.source);
              const targetNode = nodes.find((n) => n.id === edge.target);
              if (!sourceNode || !targetNode) return null;

              const sourceX = sourceNode.x + 60;
              const sourceY = sourceNode.y + 20;
              const targetX = targetNode.x;
              const targetY = targetNode.y + 20;

              return (
                <Box
                  key={edge.id}
                  sx={{
                    position: 'absolute',
                    left: sourceX,
                    top: Math.min(sourceY, targetY) + 10,
                    width: Math.sqrt(
                      Math.pow(targetX - sourceX, 2) + Math.pow(targetY - sourceY, 2)
                    ),
                    height: 2,
                    bgcolor: 'grey.400',
                    transform: `rotate(${Math.atan2(targetY - sourceY, targetX - sourceX)}rad)`,
                    transformOrigin: 'left center',
                  }}
                >
                  {edge.label && (
                    <Box
                      sx={{
                        position: 'absolute',
                        top: -12,
                        left: '50%',
                        transform: 'translateX(-50%)',
                        bgcolor: 'white',
                        px: 1,
                      }}
                    >
                      <Typography variant='caption'>{edge.label}</Typography>
                    </Box>
                  )}
                </Box>
              );
            })}
          </Box>
        </Box>

        <Drawer
          anchor='right'
          open={showProperties}
          onClose={() => setShowProperties(false)}
        >
          <Box sx={{ width: 320, p: 3 }}>
            <Stack
              direction='row'
              sx={{ alignItems: 'center', justifyContent: 'space-between' }}
            >
              <Typography
                variant='h6'
                sx={{ fontWeight: 600 }}
              >
                属性配置
              </Typography>
              <IconButton onClick={() => setShowProperties(false)}>
                <ChevronRight size={20} />
              </IconButton>
            </Stack>

            <Divider sx={{ my: 2 }} />

            {selectedNode && (
              <Stack spacing={3}>
                <Box>
                  <Typography
                    variant='body2'
                    sx={{ color: 'grey.500', mb: 1 }}
                  >
                    节点ID
                  </Typography>
                  <Typography variant='body1'>{selectedNode.id}</Typography>
                </Box>

                <Box>
                  <Typography
                    variant='body2'
                    sx={{ color: 'grey.500', mb: 1 }}
                  >
                    节点类型
                  </Typography>
                  <Typography variant='body1'>{selectedNode.type}</Typography>
                </Box>

                <TextField
                  fullWidth
                  size='small'
                  label='节点名称'
                  defaultValue={selectedNode.label}
                />

                <TextField
                  fullWidth
                  size='small'
                  label='节点描述'
                  multiline
                  rows={3}
                  defaultValue=''
                />

                {selectedNode.type === 'approval' && (
                  <>
                    <TextField
                      fullWidth
                      size='small'
                      label='审批人'
                      defaultValue=''
                    />
                    <TextField
                      fullWidth
                      size='small'
                      label='审批类型'
                      select
                      defaultValue='single'
                    >
                      <option value='single'>单人审批</option>
                      <option value='counter'>会签审批</option>
                      <option value='or'>或签审批</option>
                    </TextField>
                    <TextField
                      fullWidth
                      size='small'
                      label='超时时间（小时）'
                      type='number'
                      defaultValue={24}
                    />
                  </>
                )}

                {selectedNode.type === 'condition' && (
                  <TextField
                    fullWidth
                    size='small'
                    label='条件表达式'
                    placeholder='例如: amount > 5000'
                    defaultValue=''
                  />
                )}

                <Stack
                  direction='row'
                  spacing={2}
                >
                  <Button
                    variant='outlined'
                    fullWidth
                  >
                    取消
                  </Button>
                  <Button
                    variant='contained'
                    fullWidth
                    sx={{ bgcolor: 'secondary.main' }}
                  >
                    保存
                  </Button>
                </Stack>
              </Stack>
            )}
          </Box>
        </Drawer>
      </Box>
    </Box>
  );
};

export default FlowDesignerPage;
