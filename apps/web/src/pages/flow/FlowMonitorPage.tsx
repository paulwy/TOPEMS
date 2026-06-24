import React, { useState, useMemo } from 'react';
import { logger } from '@/utils/logger';
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
} from '@mui/material';
import { Button } from '@mui/material';
import { Eye, Bell, Ban, RotateCcw, Search, Activity, Loader2 } from 'lucide-react';

interface FlowInstance {
  id: string;
  name: string;
  applicant: string;
  currentNode: string;
  status: 'running' | 'completed' | 'rejected' | 'terminated';
  duration: string;
  startTime: string;
}

const mockInstances: FlowInstance[] = [
  {
    id: 'INS-2024-001',
    name: '请假审批流程',
    applicant: '张三',
    currentNode: '部门审批',
    status: 'running',
    duration: '2小时30分',
    startTime: '2024-03-20 09:00',
  },
  {
    id: 'INS-2024-002',
    name: '费用报销流程',
    applicant: '李四',
    currentNode: '财务审批',
    status: 'running',
    duration: '5小时15分',
    startTime: '2024-03-20 08:30',
  },
  {
    id: 'INS-2024-003',
    name: '采购申请流程',
    applicant: '王五',
    currentNode: '已完成',
    status: 'completed',
    duration: '1天2小时',
    startTime: '2024-03-19 10:00',
  },
  {
    id: 'INS-2024-004',
    name: '合同审批流程',
    applicant: '赵六',
    currentNode: '已拒绝',
    status: 'rejected',
    duration: '3小时',
    startTime: '2024-03-20 14:00',
  },
  {
    id: 'INS-2024-005',
    name: '差旅申请流程',
    applicant: '孙七',
    currentNode: '已终止',
    status: 'terminated',
    duration: '30分钟',
    startTime: '2024-03-20 15:30',
  },
  {
    id: 'INS-2024-006',
    name: '加班申请流程',
    applicant: '周八',
    currentNode: '已完成',
    status: 'completed',
    duration: '1小时',
    startTime: '2024-03-20 16:00',
  },
  {
    id: 'INS-2024-007',
    name: '设备借用流程',
    applicant: '吴九',
    currentNode: '部门审批',
    status: 'running',
    duration: '45分钟',
    startTime: '2024-03-20 17:00',
  },
  {
    id: 'INS-2024-008',
    name: '请假审批流程',
    applicant: '郑十',
    currentNode: '经理审批',
    status: 'running',
    duration: '1天',
    startTime: '2024-03-19 17:00',
  },
];

const getStatusColor = (
  status: FlowInstance['status']
): 'success' | 'error' | 'warning' | 'default' => {
  switch (status) {
    case 'running':
      return 'warning';
    case 'completed':
      return 'success';
    case 'rejected':
      return 'error';
    case 'terminated':
      return 'default';
  }
};

const getStatusText = (status: FlowInstance['status']) => {
  switch (status) {
    case 'running':
      return '进行中';
    case 'completed':
      return '已完成';
    case 'rejected':
      return '已拒绝';
    case 'terminated':
      return '已终止';
  }
};

const FlowMonitorPage: React.FC = () => {
  const [data, setData] = useState<FlowInstance[]>(mockInstances);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [nameFilter, setNameFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [page, setPage] = useState(1);
  const [pageSize] = useState(10);
  const [showTerminateDialog, setShowTerminateDialog] = useState(false);
  const [selectedInstance, setSelectedInstance] = useState<FlowInstance | null>(null);

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

  const runningCount = data.filter((d) => d.status === 'running').length;
  const completedCount = data.filter((d) => d.status === 'completed').length;

  const handleView = (instance: FlowInstance) => {
    logger.info('查看实例:', instance.id);
  };

  const handleUrge = (instance: FlowInstance) => {
    logger.info('催办:', instance.id);
  };

  const handleTerminate = (instance: FlowInstance) => {
    setSelectedInstance(instance);
    setShowTerminateDialog(true);
  };

  const confirmTerminate = () => {
    if (selectedInstance) {
      setData((prev) =>
        prev.map((d) =>
          d.id === selectedInstance.id
            ? { ...d, status: 'terminated' as const, currentNode: '已终止' }
            : d
        )
      );
      setShowTerminateDialog(false);
      setSelectedInstance(null);
    }
  };

  const handleRecall = (instance: FlowInstance) => {
    logger.info('取回:', instance.id);
  };

  const uniqueFlowNames = [...new Set(data.map((d) => d.name))];

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: 'grey.50', p: 3 }}>
      <Box sx={{ bgcolor: 'white', borderRadius: 1, boxShadow: 1, p: 3, mb: 3 }}>
        <Stack
          direction='row'
          sx={{ alignItems: 'center' }}
          spacing={2}
        >
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
            <Activity
              size={24}
              style={{ color: 'secondary.main' }}
            />
          </Box>
          <Box>
            <Typography
              variant='h5'
              sx={{ fontWeight: 700 }}
            >
              流程监控
            </Typography>
            <Typography
              variant='body2'
              sx={{ color: 'grey.500' }}
            >
              监控所有流程实例的运行状态
            </Typography>
          </Box>
          <Box sx={{ ml: 'auto' }}>
            <Stack
              direction='row'
              spacing={3}
            >
              <Box sx={{ textAlign: 'center' }}>
                <Typography
                  variant='h4'
                  sx={{ fontWeight: 700, color: 'warning.main' }}
                >
                  {runningCount}
                </Typography>
                <Typography
                  variant='body2'
                  color='text.secondary'
                >
                  进行中
                </Typography>
              </Box>
              <Box sx={{ textAlign: 'center' }}>
                <Typography
                  variant='h4'
                  sx={{ fontWeight: 700, color: 'success.dark' }}
                >
                  {completedCount}
                </Typography>
                <Typography
                  variant='body2'
                  color='text.secondary'
                >
                  已完成
                </Typography>
              </Box>
            </Stack>
          </Box>
        </Stack>
      </Box>

      <Box sx={{ bgcolor: 'white', borderRadius: 1, boxShadow: 1, p: 3, mb: 3 }}>
        <Stack
          direction='row'
          sx={{ alignItems: 'center' }}
          spacing={2}
        >
          <TextField
            size='small'
            type='text'
            placeholder='搜索实例ID或申请人...'
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            slotProps={{
              input: {
                startAdornment: (
                  <Search
                    size={20}
                    style={{ marginRight: 8, color: 'text.disabled' }}
                  />
                ),
              },
            }}
            sx={{ flex: 1, maxWidth: 300 }}
          />
          <FormControl
            size='small'
            sx={{ minWidth: 180 }}
          >
            <InputLabel>流程名称</InputLabel>
            <Select
              value={nameFilter}
              label='流程名称'
              onChange={(e) => setNameFilter(e.target.value)}
            >
              <MenuItem value='all'>全部</MenuItem>
              {uniqueFlowNames.map((name) => (
                <MenuItem
                  key={name}
                  value={name}
                >
                  {name}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          <FormControl
            size='small'
            sx={{ minWidth: 120 }}
          >
            <InputLabel>状态</InputLabel>
            <Select
              value={statusFilter}
              label='状态'
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <MenuItem value='all'>全部</MenuItem>
              <MenuItem value='running'>进行中</MenuItem>
              <MenuItem value='completed'>已完成</MenuItem>
              <MenuItem value='rejected'>已拒绝</MenuItem>
              <MenuItem value='terminated'>已终止</MenuItem>
            </Select>
          </FormControl>
          <IconButton
            onClick={() => setLoading(true)}
            title='刷新'
          >
            <Loader2
              size={20}
              sx={{
                animation: loading ? 'spin 1s linear infinite' : 'none',
              }}
            />
          </IconButton>
        </Stack>
      </Box>

      <Card>
        <CardContent sx={{ p: 0 }}>
          <Box sx={{ overflowX: 'auto' }}>
            <Box
              component='table'
              sx={{ width: '100%', borderCollapse: 'collapse' }}
            >
              <Box component='thead'>
                <Box
                  component='tr'
                  sx={{
                    bgcolor: 'grey.100',
                    '& th': {
                      px: 3,
                      py: 2,
                      textAlign: 'left',
                      fontWeight: 600,
                      fontSize: 14,
                      color: 'grey.700',
                    },
                  }}
                >
                  <th>实例ID</th>
                  <th>流程名称</th>
                  <th>发起人</th>
                  <th>当前节点</th>
                  <th>状态</th>
                  <th>耗时</th>
                  <th>开始时间</th>
                  <th>操作</th>
                </Box>
              </Box>
              <Box component='tbody'>
                {paginatedData.map((instance, index) => (
                  <Box
                    component='tr'
                    key={instance.id}
                    sx={{
                      borderBottom: '1px solid',
                      borderColor: 'divider',
                      bgcolor: index % 2 === 0 ? 'white' : 'grey.50',
                      '&:hover': { bgcolor: 'primary.light' },
                      '& td': {
                        px: 3,
                        py: 2,
                        fontSize: 14,
                      },
                    }}
                  >
                    <td>{instance.id}</td>
                    <td>{instance.name}</td>
                    <td>{instance.applicant}</td>
                    <td>{instance.currentNode}</td>
                    <td>
                      <Chip
                        size='small'
                        label={getStatusText(instance.status)}
                        color={getStatusColor(instance.status)}
                      />
                    </td>
                    <td>{instance.duration}</td>
                    <td>{instance.startTime}</td>
                    <td>
                      <Stack
                        direction='row'
                        spacing={1}
                      >
                        <IconButton
                          size='small'
                          onClick={() => handleView(instance)}
                          title='查看'
                        >
                          <Eye size={18} />
                        </IconButton>
                        {instance.status === 'running' && (
                          <>
                            <IconButton
                              size='small'
                              onClick={() => handleUrge(instance)}
                              title='催办'
                            >
                              <Bell size={18} />
                            </IconButton>
                            <IconButton
                              size='small'
                              onClick={() => handleTerminate(instance)}
                              title='终止'
                            >
                              <Ban size={18} />
                            </IconButton>
                          </>
                        )}
                        {instance.status === 'running' && (
                          <IconButton
                            size='small'
                            onClick={() => handleRecall(instance)}
                            title='取回'
                          >
                            <RotateCcw size={18} />
                          </IconButton>
                        )}
                      </Stack>
                    </td>
                  </Box>
                ))}
              </Box>
            </Box>
          </Box>
        </CardContent>
      </Card>

      {totalPages > 1 && (
        <Box sx={{ display: 'flex', justifyContent: 'center', mt: 3 }}>
          <Pagination
            count={totalPages}
            page={page}
            onChange={(_, newPage) => setPage(newPage)}
            color='primary'
          />
        </Box>
      )}

      <Dialog
        open={showTerminateDialog}
        onClose={() => setShowTerminateDialog(false)}
      >
        <DialogTitle>终止流程实例</DialogTitle>
        <DialogContent>
          <Typography>
            确定要终止流程实例 <strong>{selectedInstance?.id}</strong> 吗？
          </Typography>
          <Typography
            variant='body2'
            sx={{ color: 'grey.500', mt: 1 }}
          >
            终止后该流程将无法恢复
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button
            color='inherit'
            onClick={() => setShowTerminateDialog(false)}
          >
            取消
          </Button>
          <Button
            variant='contained'
            color='error'
            onClick={confirmTerminate}
          >
            确认终止
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default FlowMonitorPage;
