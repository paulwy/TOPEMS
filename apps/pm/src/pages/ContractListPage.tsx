import React, { useEffect, useState, useMemo } from 'react';
import {
  Box,
  Typography,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Chip,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  CircularProgress,
  Alert,
  Pagination,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Grid,
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Refresh as RefreshIcon,
  Visibility as VisibilityIcon,
} from '@mui/icons-material';
import { usePmStore } from '../store/pmStore';
import type { CreateContractRequest } from '../api/pm';

const getStatusColor = (status: string): 'success' | 'default' | 'warning' | 'primary' | 'error' => {
  switch (status) {
    case 'active':
    case 'in_progress':
      return 'success';
    case 'completed':
    case 'closed':
      return 'primary';
    case 'pending':
    case 'draft':
      return 'warning';
    case 'terminated':
    case 'cancelled':
      return 'error';
    default:
      return 'default';
  }
};

const getStatusLabel = (status: string) => {
  switch (status) {
    case 'active':
    case 'in_progress':
      return '执行中';
    case 'completed':
    case 'closed':
      return '已完成';
    case 'pending':
    case 'draft':
      return '待签署';
    case 'terminated':
    case 'cancelled':
      return '已终止';
    default:
      return status;
  }
};

const formatCurrency = (amount: number) => {
  if (!amount) return '-';
  return new Intl.NumberFormat('zh-CN', {
    style: 'currency',
    currency: 'CNY',
    minimumFractionDigits: 0,
  }).format(amount);
};

const formatDate = (dateStr?: string) => {
  if (!dateStr) return '-';
  return new Date(dateStr).toLocaleDateString('zh-CN');
};

export const ContractListPage: React.FC = () => {
  const {
    contracts,
    contractsTotal,
    contractsPage,
    contractsPageSize,
    loading,
    error,
    loadContracts,
    addContract,
    removeContract,
  } = usePmStore();

  const [statusFilter, setStatusFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [newContract, setNewContract] = useState<CreateContractRequest>({
    contract_code: '',
    contract_name: '',
    contract_type: 'sales',
    amount: 0,
  });
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    loadContracts({ page: 1, pageSize: 10 });
  }, [loadContracts]);

  const handleSearch = () => {
    loadContracts({
      page: 1,
      pageSize: contractsPageSize,
      status: statusFilter !== 'all' ? statusFilter : undefined,
      contract_type: typeFilter !== 'all' ? typeFilter : undefined,
    });
  };

  const handlePageChange = (_event: React.ChangeEvent<unknown>, page: number) => {
    loadContracts({
      page,
      pageSize: contractsPageSize,
      status: statusFilter !== 'all' ? statusFilter : undefined,
      contract_type: typeFilter !== 'all' ? typeFilter : undefined,
    });
  };

  const handleCreate = async () => {
    if (!newContract.contract_name || !newContract.contract_code) return;
    setSubmitting(true);
    try {
      await addContract(newContract);
      setCreateDialogOpen(false);
      setNewContract({
        contract_code: '',
        contract_name: '',
        contract_type: 'sales',
        amount: 0,
      });
    } catch (err) {
      console.error('创建合同失败:', err);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('确定要删除该合同吗？')) return;
    try {
      await removeContract(id);
    } catch (err) {
      console.error('删除合同失败:', err);
    }
  };

  const totalPages = useMemo(
    () => Math.ceil(contractsTotal / contractsPageSize),
    [contractsTotal, contractsPageSize]
  );

  return (
    <Box sx={{ p: 3 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Box>
          <Typography variant="h5" component="h1" sx={{ fontWeight: 600 }}>
            合同管理
          </Typography>
          <Typography variant="body2" color="text.secondary">
            跟踪项目合同、付款计划和里程碑
          </Typography>
        </Box>
        <Box sx={{ display: 'flex', gap: 2 }}>
          <Button
            variant="outlined"
            startIcon={<RefreshIcon />}
            onClick={() =>
              loadContracts({
                page: contractsPage,
                pageSize: contractsPageSize,
                status: statusFilter !== 'all' ? statusFilter : undefined,
                contract_type: typeFilter !== 'all' ? typeFilter : undefined,
              })
            }
          >
            刷新
          </Button>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => setCreateDialogOpen(true)}
          >
            新建合同
          </Button>
        </Box>
      </Box>

      <Paper sx={{ mb: 3, p: 2 }}>
        <Grid container spacing={2} alignItems="center">
          <Grid item xs={12} md={3}>
            <FormControl size="small" fullWidth>
              <InputLabel>状态</InputLabel>
              <Select
                value={statusFilter}
                label="状态"
                onChange={(e) => setStatusFilter(e.target.value)}
              >
                <MenuItem value="all">全部</MenuItem>
                <MenuItem value="draft">待签署</MenuItem>
                <MenuItem value="active">执行中</MenuItem>
                <MenuItem value="completed">已完成</MenuItem>
                <MenuItem value="terminated">已终止</MenuItem>
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12} md={3}>
            <FormControl size="small" fullWidth>
              <InputLabel>类型</InputLabel>
              <Select
                value={typeFilter}
                label="类型"
                onChange={(e) => setTypeFilter(e.target.value)}
              >
                <MenuItem value="all">全部</MenuItem>
                <MenuItem value="sales">销售合同</MenuItem>
                <MenuItem value="service">服务合同</MenuItem>
                <MenuItem value="procurement">采购合同</MenuItem>
                <MenuItem value="construction">施工合同</MenuItem>
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12} md={3}>
            <Button variant="outlined" onClick={handleSearch} fullWidth>
              搜索
            </Button>
          </Grid>
        </Grid>
      </Paper>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      <Paper>
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>合同编号</TableCell>
                <TableCell>合同名称</TableCell>
                <TableCell>类型</TableCell>
                <TableCell>金额</TableCell>
                <TableCell>甲方</TableCell>
                <TableCell>乙方</TableCell>
                <TableCell>签订日期</TableCell>
                <TableCell>状态</TableCell>
                <TableCell align="right">操作</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={9} align="center" sx={{ py: 4 }}>
                    <CircularProgress />
                  </TableCell>
                </TableRow>
              ) : contracts.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={9} align="center" sx={{ py: 4 }}>
                    <Typography color="text.secondary">暂无合同数据</Typography>
                  </TableCell>
                </TableRow>
              ) : (
                contracts.map((contract) => (
                  <TableRow key={contract.id} hover>
                    <TableCell>
                      <Chip
                        label={contract.contract_code}
                        size="small"
                        variant="outlined"
                      />
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" sx={{ fontWeight: 500 }}>
                        {contract.contract_name}
                      </Typography>
                    </TableCell>
                    <TableCell>{contract.contract_type}</TableCell>
                    <TableCell>{formatCurrency(contract.amount)}</TableCell>
                    <TableCell>{contract.party_a_name || '-'}</TableCell>
                    <TableCell>{contract.party_b_name || '-'}</TableCell>
                    <TableCell>{formatDate(contract.signing_date)}</TableCell>
                    <TableCell>
                      <Chip
                        label={getStatusLabel(contract.status || '')}
                        size="small"
                        color={getStatusColor(contract.status || '')}
                        variant="filled"
                      />
                    </TableCell>
                    <TableCell align="right">
                      <IconButton size="small" title="查看详情">
                        <VisibilityIcon fontSize="small" />
                      </IconButton>
                      <IconButton size="small" title="编辑">
                        <EditIcon fontSize="small" />
                      </IconButton>
                      <IconButton
                        size="small"
                        color="error"
                        onClick={() => handleDelete(contract.id)}
                        title="删除"
                      >
                        <DeleteIcon fontSize="small" />
                      </IconButton>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </TableContainer>
        {contractsTotal > 0 && (
          <Box sx={{ display: 'flex', justifyContent: 'flex-end', p: 2 }}>
            <Pagination
              count={totalPages}
              page={contractsPage}
              onChange={handlePageChange}
              size="small"
            />
          </Box>
        )}
      </Paper>

      <Dialog
        open={createDialogOpen}
        onClose={() => setCreateDialogOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>新建合同</DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
            <TextField
              label="合同编号"
              required
              value={newContract.contract_code}
              onChange={(e) =>
                setNewContract({ ...newContract, contract_code: e.target.value })
              }
              fullWidth
            />
            <TextField
              label="合同名称"
              required
              value={newContract.contract_name}
              onChange={(e) =>
                setNewContract({ ...newContract, contract_name: e.target.value })
              }
              fullWidth
            />
            <FormControl fullWidth>
              <InputLabel>合同类型</InputLabel>
              <Select
                value={newContract.contract_type}
                label="合同类型"
                onChange={(e) =>
                  setNewContract({ ...newContract, contract_type: e.target.value })
                }
              >
                <MenuItem value="sales">销售合同</MenuItem>
                <MenuItem value="service">服务合同</MenuItem>
                <MenuItem value="procurement">采购合同</MenuItem>
                <MenuItem value="construction">施工合同</MenuItem>
              </Select>
            </FormControl>
            <TextField
              label="合同金额"
              type="number"
              required
              value={newContract.amount}
              onChange={(e) =>
                setNewContract({ ...newContract, amount: Number(e.target.value) })
              }
              fullWidth
            />
            <Grid container spacing={2}>
              <Grid item xs={6}>
                <TextField
                  label="甲方"
                  value={newContract.party_a_name || ''}
                  onChange={(e) =>
                    setNewContract({
                      ...newContract,
                      party_a_name: e.target.value,
                    })
                  }
                  fullWidth
                />
              </Grid>
              <Grid item xs={6}>
                <TextField
                  label="乙方"
                  value={newContract.party_b_name || ''}
                  onChange={(e) =>
                    setNewContract({
                      ...newContract,
                      party_b_name: e.target.value,
                    })
                  }
                  fullWidth
                />
              </Grid>
            </Grid>
            <TextField
              label="描述"
              multiline
              rows={2}
              value={newContract.description || ''}
              onChange={(e) =>
                setNewContract({ ...newContract, description: e.target.value })
              }
              fullWidth
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCreateDialogOpen(false)}>取消</Button>
          <Button
            variant="contained"
            onClick={handleCreate}
            disabled={
              submitting ||
              !newContract.contract_name ||
              !newContract.contract_code
            }
          >
            {submitting ? '创建中...' : '创建'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default ContractListPage;
