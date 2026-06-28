import React, { useState, useMemo } from 'react';
import { Ban, BellRing, CircleCheck, Eye, Play, RefreshCw, RotateCcw, Search, X } from 'lucide-react';
const Block = Ban;
const Cancel = X;
const CheckCircle = CircleCheck;
const NotificationsActive = BellRing;
const PlayArrow = Play;
const Refresh = RefreshCw;
const RotateLeft = RotateCcw;
const Visibility = Eye;
import {
  Box,
  Card,
  CardContent,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControl,
  IconButton,
  InputLabel,
  MenuItem,
  Pagination,
  Select,
  Stack,
  TextField,
  Typography,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Divider,
} from '@mui/material';


interface FlowInstance {
  id: string;
  name: string;
  applicant: string;
  currentNode: string;
  currentNodeId: string;
  status: 'running' | 'completed' | 'cancelled';
  duration: string;
  startTime: string;
  definitionId: string;
}

interface FlowNode {
  id: string;
  type: string;
  label: string;
  x: number;
  y: number;
}

interface FlowEdge {
  id: string;
  source: string;
  target: string;
  label?: string;
}

const mockInstances: FlowInstance[] = [
  {
    id: 'INS-2024-001',
    name: '请假审批流程',
    applicant: '张三',
    currentNode: '部门审批',
    currentNodeId: 'approval-1',
    status: 'running',
    duration: '2小时30分',
    startTime: '2024-03-20 09:00',
    definitionId: 'def-001',
  },
  {
    id: 'INS-2024-002',
    name: '费用报销流程',
    applicant: '李四',
    currentNode: '财务审批',
    currentNodeId: 'approval-3',
    status: 'running',
    duration: '5小时15分',
    startTime: '2024-03-20 08:30',
    definitionId: 'def-002',
  },
  {
    id: 'INS-2024-003',
    name: '采购申请流程',
    applicant: '王五',
    currentNode: '已完成',
    currentNodeId: 'end-1',
    status: 'completed',
    duration: '1天2小时',
    startTime: '2024-03-19 10:00',
    definitionId: 'def-003',
  },
  {
    id: 'INS-2024-004',
    name: '合同审批流程',
    applicant: '赵六',
    currentNode: '已取消',
    currentNodeId: 'end-1',
    status: 'cancelled',
    duration: '3小时',
    startTime: '2024-03-20 14:00',
    definitionId: 'def-004',
  },
  {
    id: 'INS-2024-005',
    name: '差旅申请流程',
    applicant: '孙七',
    currentNode: '经理审批',
    currentNodeId: 'approval-2',
    status: 'running',
    duration: '45分钟',
    startTime: '2024-03-20 15:30',
    definitionId: 'def-001',
  },
  {
    id: 'INS-2024-006',
    name: '加班申请流程',
    applicant: '周八',
    currentNode: '已完成',
    currentNodeId: 'end-1',
    status: 'completed',
    duration: '1小时',
    startTime: '2024-03-20 16:00',
    definitionId: 'def-005',
  },
  {
    id: 'INS-2024-007',
    name: '设备借用流程',
    applicant: '吴九',
    currentNode: '部门审批',
    currentNodeId: 'approval-1',
    status: 'running',
    duration: '30分钟',
    startTime: '2024-03-20 17:00',
    definitionId: 'def-006',
  },
  {
    id: 'INS-2024-008',
    name: '请假审批流程',
    applicant: '郑十',
    currentNode: '已完成',
    currentNodeId: 'end-1',
    status: 'completed',
    duration: '1天',
    startTime: '2024-03-19 17:00',
    definitionId: 'def-001',
  },
];

const demoNodes: FlowNode[] = [
  { id: 'start-1', type: 'start', label: '开始', x: 50, y: 100 },
  { id: 'approval-1', type: 'approval', label: '部门审批', x: 180, y: 100 },
  { id: 'condition-1', type: 'condition', label: '金额判断', x: 310, y: 100 },
  { id: 'approval-2', type: 'approval', label: '经理审批', x: 440, y: 30 },
  { id: 'approval-3', type: 'approval', label: '财务审批', x: 440, y: 170 },
  { id: 'end-1', type: 'end', label: '结束', x: 570, y: 100 },
];

const demoEdges: FlowEdge[] = [
  { id: 'e1', source: 'start-1', target: 'approval-1' },
  { id: 'e2', source: 'approval-1', target: 'condition-1' },
  { id: 'e3', source: 'condition-1', target: 'approval-2', label: '≤5000' },
  { id: 'e4', source: 'condition-1', target: 'approval-3', label: '>5000' },
  { id: 'e5', source: 'approval-2', target: 'end-1' },
  { id: 'e6', source: 'approval-3', target: 'end-1' },
];

const getStatusColor = (
  status: FlowInstance['status']
): 'success' | 'error' | 'warning' | 'default' => {
  switch (status) {
    case 'running':
      return 'warning';
    case 'completed':
      return 'success';
    case 'cancelled':
      return 'error';
    default:
      return 'default';
  }
};

const getStatusText = (status: FlowInstance['status']) => {
  switch (status) {
    case 'running':
      return '运行中';
    case 'completed':
      return '已完成';
    case 'cancelled':
      return '已取消';
    default:
      return status;
  }
};

export const FlowMonitorPage: React.FC = () => {
  const [data, setData] = useState<FlowInstance[]>(mockInstances);
  const [searchTerm, setSearchTerm] = useState('');
  const [nameFilter, setNameFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [page, setPage] = useState(1);
  const [pageSize] = useState(10);
  const [showCancelDialog, setShowCancelDialog] = useState(false);
  const [selectedInstance, setSelectedInstance] = useState<FlowInstance | null>(null);
  const [showDetailDialog, setShowDetailDialog] = useState(false);
  const [detailInstance, setDetailInstance] = useState<FlowInstance | null>(null);

  const filteredData = data.filter((item) => {
    const matchesSearch =
      item.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.applicant.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesName = nameFilter === 'all' || item.name === nameFilter;
    const matchesStatus = statusFilter === 'all' || item.status === statusFilter;
    return matchesSearch && matchesName && matchesStatus;
  });

  const paginatedData = filteredData.slice((page - 1) * pageSize, page * pageSize);
  const totalPages = Math.ceil(filteredData.length / pageSize);

  const stats = useMemo(() => {
    return {
      running: data.filter((d) => d.status === 'running').length,
      completed: data.filter((d) => d.status === 'completed').length,
      cancelled: data.filter((d) => d.status === 'cancelled').length,
    };
  }, [data]);

  const uniqueFlowNames = useMemo(
    () => [...new Set(data.map((d) => d.name))],
    [data]
  );

  const handleView = (instance: FlowInstance) => {
    setDetailInstance(instance);
    setShowDetailDialog(true);
  };

  const handleUrge = (instance: FlowInstance) => {
    console.log('催办:', instance.id);
  };

  const handleCancel = (instance: FlowInstance) => {
    setSelectedInstance(instance);
    setShowCancelDialog(true);
  };

  const confirmCancel = () => {
    if (selectedInstance) {
      setData((prev) =>
        prev.map((d) =>
          d.id === selectedInstance.id
            ? { ...d, status: 'cancelled' as const, currentNode: '已取消' }
            : d
        )
      );
      setShowCancelDialog(false);
      setSelectedInstance(null);
    }
  };

  const handleRecall = (instance: FlowInstance) => {
    console.log('取回:', instance.id);
  };

  const getNodeColor = (nodeId: string, currentNodeId: string, type: string) => {
    if (nodeId === currentNodeId) return '#f57c00';
    if (type === 'start') return '#2e7d32';
    if (type === 'end') return '#c62828';
    if (type === 'approval') return '#e0e0e0';
    if (type === 'condition') return '#e0e0e0';
    return '#e0e0e0';
  };

  const isNodeActive = (nodeId: string, currentNodeId: string) => {
    return nodeId === currentNodeId;
  };

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: 'grey.50', p: 3 }}>
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Stack direction="row" sx={{ alignItems: 'center' }} spacing={2}>
            <Box
              sx={{
                width: 48,
                height: 48,
                bgcolor: 'primary.light',
                borderRadius: 1,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <PlayArrow style={{ color: '#1976d2' }} />
            </Box>
            <Box>
              <Typography variant="h5" sx={{ fontWeight: 700 }}>
                流程监控
              </Typography>
              <Typography variant="body2" color="text.secondary">
                监控所有流程实例的运行状态
              </Typography>
            </Box>
            <Box sx={{ ml: 'auto' }}>
              <Stack direction="row" spacing={4}>
                <Box sx={{ textAlign: 'center' }}>
                  <Typography
                    variant="h4"
                    sx={{ fontWeight: 700, color: 'warning.main' }}
                  >
                    {stats.running}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    运行中
                  </Typography>
                </Box>
                <Box sx={{ textAlign: 'center' }}>
                  <Typography
                    variant="h4"
                    sx={{ fontWeight: 700, color: 'success.main' }}
                  >
                    {stats.completed}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    已完成
                  </Typography>
                </Box>
                <Box sx={{ textAlign: 'center' }}>
                  <Typography
                    variant="h4"
                    sx={{ fontWeight: 700, color: 'error.main' }}
                  >
                    {stats.cancelled}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    已取消
                  </Typography>
                </Box>
              </Stack>
            </Box>
          </Stack>
        </CardContent>
      </Card>

      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Stack direction="row" sx={{ alignItems: 'center' }} spacing={2}>
            <TextField
              placeholder="搜索实例ID或发起人..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              slotProps={{
                input: {
                  size: 'small',
                  startAdornment: <Search style={{ marginRight: 4, color: '#bdbdbd' }} />,
                },
              }}
              sx={{ flex: 1, maxWidth: 300 }}
            />
            <FormControl size="small" sx={{ minWidth: 180 }}>
              <InputLabel>流程名称</InputLabel>
              <Select
                value={nameFilter}
                label="流程名称"
                onChange={(e) => setNameFilter(e.target.value)}
              >
                <MenuItem value="all">全部</MenuItem>
                {uniqueFlowNames.map((name) => (
                  <MenuItem key={name} value={name}>
                    {name}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            <FormControl size="small" sx={{ minWidth: 120 }}>
              <InputLabel>状态</InputLabel>
              <Select
                value={statusFilter}
                label="状态"
                onChange={(e) => setStatusFilter(e.target.value)}
              >
                <MenuItem value="all">全部</MenuItem>
                <MenuItem value="running">运行中</MenuItem>
                <MenuItem value="completed">已完成</MenuItem>
                <MenuItem value="cancelled">已取消</MenuItem>
              </Select>
            </FormControl>
            <IconButton title="刷新">
              <Refresh />
            </IconButton>
          </Stack>
        </CardContent>
      </Card>

      <Card>
        <CardContent sx={{ p: 0 }}>
          <TableContainer component={Paper} elevation={0}>
            <Table>
              <TableHead>
                <TableRow sx={{ bgcolor: 'grey.100' }}>
                  <TableCell sx={{ fontWeight: 600 }}>实例ID</TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>流程名称</TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>发起人</TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>当前节点</TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>状态</TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>耗时</TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>开始时间</TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>操作</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {paginatedData.map((instance, index) => (
                  <TableRow
                    key={instance.id}
                    sx={{
                      bgcolor: index % 2 === 0 ? 'white' : 'grey.50',
                      '&:hover': { bgcolor: 'action.hover' },
                    }}
                  >
                    <TableCell>{instance.id}</TableCell>
                    <TableCell>{instance.name}</TableCell>
                    <TableCell>{instance.applicant}</TableCell>
                    <TableCell>{instance.currentNode}</TableCell>
                    <TableCell>
                      <Chip
                        size="small"
                        label={getStatusText(instance.status)}
                        color={getStatusColor(instance.status)}
                        icon={
                          instance.status === 'running' ? (
                            <PlayArrow fontSize="small" />
                          ) : instance.status === 'completed' ? (
                            <CheckCircle fontSize="small" />
                          ) : (
                            <Cancel fontSize="small" />
                          )
                        }
                      />
                    </TableCell>
                    <TableCell>{instance.duration}</TableCell>
                    <TableCell>{instance.startTime}</TableCell>
                    <TableCell>
                      <Stack direction="row" spacing={1}>
                        <IconButton
                          size="small"
                          onClick={() => handleView(instance)}
                          title="查看"
                        >
                          <Visibility fontSize="small" />
                        </IconButton>
                        {instance.status === 'running' && (
                          <>
                            <IconButton
                              size="small"
                              onClick={() => handleUrge(instance)}
                              title="催办"
                            >
                              <NotificationsActive fontSize="small" />
                            </IconButton>
                            <IconButton
                              size="small"
                              onClick={() => handleCancel(instance)}
                              title="取消"
                            >
                              <Block fontSize="small" />
                            </IconButton>
                            <IconButton
                              size="small"
                              onClick={() => handleRecall(instance)}
                              title="取回"
                            >
                              <RotateLeft fontSize="small" />
                            </IconButton>
                          </>
                        )}
                      </Stack>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </CardContent>
      </Card>

      {totalPages > 1 && (
        <Box sx={{ display: 'flex', justifyContent: 'center', mt: 3 }}>
          <Pagination
            count={totalPages}
            page={page}
            onChange={(_, newPage) => setPage(newPage)}
            color="primary"
          />
        </Box>
      )}

      <Dialog
        open={showCancelDialog}
        onClose={() => setShowCancelDialog(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>取消流程实例</DialogTitle>
        <DialogContent>
          <Typography>
            确定要取消流程实例 <strong>{selectedInstance?.id}</strong> 吗？
          </Typography>
          <Typography variant="body2" sx={{ color: 'text.secondary', mt: 1 }}>
            取消后该流程将无法恢复
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowCancelDialog(false)}>取消</Button>
          <Button variant="contained" color="error" onClick={confirmCancel}>
            确认取消
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog
        open={showDetailDialog}
        onClose={() => setShowDetailDialog(false)}
        maxWidth="lg"
        fullWidth
      >
        <DialogTitle>流程实例详情</DialogTitle>
        <DialogContent dividers>
          {detailInstance && (
            <Stack spacing={3}>
              <Stack direction="row" spacing={4}>
                <Box>
                  <Typography variant="body2" color="text.secondary">
                    实例ID
                  </Typography>
                  <Typography variant="body1" sx={{ fontWeight: 500 }}>
                    {detailInstance.id}
                  </Typography>
                </Box>
                <Box>
                  <Typography variant="body2" color="text.secondary">
                    流程名称
                  </Typography>
                  <Typography variant="body1" sx={{ fontWeight: 500 }}>
                    {detailInstance.name}
                  </Typography>
                </Box>
                <Box>
                  <Typography variant="body2" color="text.secondary">
                    发起人
                  </Typography>
                  <Typography variant="body1" sx={{ fontWeight: 500 }}>
                    {detailInstance.applicant}
                  </Typography>
                </Box>
                <Box>
                  <Typography variant="body2" color="text.secondary">
                    当前状态
                  </Typography>
                  <Chip
                    size="small"
                    label={getStatusText(detailInstance.status)}
                    color={getStatusColor(detailInstance.status)}
                  />
                </Box>
              </Stack>

              <Divider />

              <Box>
                <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 2 }}>
                  流程图
                </Typography>
                <Box
                  sx={{
                    bgcolor: 'grey.50',
                    borderRadius: 1,
                    p: 2,
                    overflow: 'auto',
                  }}
                >
                  <svg width="680" height="250">
                    <defs>
                      <marker
                        id="arrowhead-detail"
                        markerWidth="10"
                        markerHeight="7"
                        refX="9"
                        refY="3.5"
                        orient="auto"
                      >
                        <polygon points="0 0, 10 3.5, 0 7" fill="#9e9e9e" />
                      </marker>
                    </defs>

                    {demoEdges.map((edge) => {
                      const sourceNode = demoNodes.find((n) => n.id === edge.source);
                      const targetNode = demoNodes.find((n) => n.id === edge.target);
                      if (!sourceNode || !targetNode) return null;

                      const sourceX = sourceNode.x + 100;
                      const sourceY = sourceNode.y + 20;
                      const targetX = targetNode.x;
                      const targetY = targetNode.y + 20;
                      const midX = (sourceX + targetX) / 2;
                      const path = `M ${sourceX} ${sourceY} C ${midX} ${sourceY}, ${midX} ${targetY}, ${targetX} ${targetY}`;

                      return (
                        <g key={edge.id}>
                          <path
                            d={path}
                            fill="none"
                            stroke="#9e9e9e"
                            strokeWidth="2"
                            markerEnd="url(#arrowhead-detail)"
                          />
                          {edge.label && (
                            <text
                              x={(sourceX + targetX) / 2}
                              y={(sourceY + targetY) / 2 - 5}
                              textAnchor="middle"
                              fontSize="11"
                              fill="#616161"
                            >
                              {edge.label}
                            </text>
                          )}
                        </g>
                      );
                    })}

                    {demoNodes.map((node) => {
                      const isActive = isNodeActive(
                        node.id,
                        detailInstance.currentNodeId
                      );
                      const color = getNodeColor(
                        node.id,
                        detailInstance.currentNodeId,
                        node.type
                      );
                      const fillColor =
                        node.type === 'start' || node.type === 'end'
                          ? color
                          : 'white';
                      const textColor =
                        node.type === 'start' || node.type === 'end'
                          ? 'white'
                          : '#424242';

                      return (
                        <g key={node.id} transform={`translate(${node.x}, ${node.y})`}>
                          <rect
                            x="0"
                            y="0"
                            width="100"
                            height="40"
                            rx="4"
                            fill={fillColor}
                            stroke={color}
                            strokeWidth={isActive ? 3 : 2}
                          />
                          {isActive && (
                            <animate
                              attributeName="stroke-opacity"
                              values="1;0.5;1"
                              dur="1.5s"
                              repeatCount="indefinite"
                            />
                          )}
                          <text
                            x="50"
                            y="25"
                            textAnchor="middle"
                            dominantBaseline="middle"
                            fontSize="12"
                            fill={textColor}
                          >
                            {node.label}
                          </text>
                        </g>
                      );
                    })}
                  </svg>
                </Box>
              </Box>
            </Stack>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowDetailDialog(false)}>关闭</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};
