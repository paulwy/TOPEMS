import React, { useEffect, useState, useMemo } from 'react';
import {
  Box,
  Typography,
  TextField,
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
  MenuItem,
  Select,
  FormControl,
  InputLabel,
} from '@mui/material';

import { useCrmStore } from '../store/crmStore';
import type { Opportunity, CreateOpportunityRequest, UpdateOpportunityRequest } from '../api/crm';
import { Eye, Pencil, Plus, RefreshCw, Search, Trash2 } from 'lucide-react';
const AddIcon = Plus;
const DeleteIcon = Trash2;
const EditIcon = Pencil;
const RefreshIcon = RefreshCw;
const SearchIcon = Search;
const VisibilityIcon = Eye;

const getStageColor = (stage: string): 'default' | 'primary' | 'success' | 'warning' | 'error' | 'info' => {
  switch (stage) {
    case 'prospecting':
      return 'default';
    case 'qualification':
      return 'info';
    case 'proposal':
      return 'warning';
    case 'negotiation':
      return 'primary';
    case 'won':
      return 'success';
    case 'lost':
      return 'error';
    default:
      return 'default';
  }
};

const getStageLabel = (stage: string) => {
  const map: Record<string, string> = {
    prospecting: '线索',
    qualification: '资格审查',
    proposal: '方案报价',
    negotiation: '商务谈判',
    won: '成交',
    lost: '丢单',
  };
  return map[stage] || stage;
};

export const OpportunityManagementPage: React.FC = () => {
  const {
    opportunities,
    opportunitiesTotal,
    opportunitiesPage,
    opportunitiesPageSize,
    loading,
    error,
    loadOpportunities,
    addOpportunity,
    updateOpportunity,
    removeOpportunity,
  } = useCrmStore();

  const [searchKeyword, setSearchKeyword] = useState('');
  const [stageFilter, setStageFilter] = useState('all');
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [selectedOpportunity, setSelectedOpportunity] = useState<Opportunity | null>(null);
  const [newOpportunity, setNewOpportunity] = useState<CreateOpportunityRequest>({
    name: '',
  });
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    loadOpportunities({ page: 1, pageSize: 10 });
  }, [loadOpportunities]);

  const handleSearch = () => {
    loadOpportunities({
      page: 1,
      pageSize: opportunitiesPageSize,
      search: searchKeyword || undefined,
      stage: stageFilter !== 'all' ? stageFilter : undefined,
    });
  };

  const handlePageChange = (_event: React.ChangeEvent<unknown>, page: number) => {
    loadOpportunities({
      page,
      pageSize: opportunitiesPageSize,
      search: searchKeyword || undefined,
      stage: stageFilter !== 'all' ? stageFilter : undefined,
    });
  };

  const handleCreate = async () => {
    if (!newOpportunity.name) return;
    setSubmitting(true);
    try {
      await addOpportunity(newOpportunity);
      setCreateDialogOpen(false);
      setNewOpportunity({ name: '' });
    } catch (err) {
      console.error('创建销售机会失败:', err);
    } finally {
      setSubmitting(false);
    }
  };

  const handleEdit = async () => {
    if (!selectedOpportunity) return;
    setSubmitting(true);
    try {
      const updateData: UpdateOpportunityRequest = {
        name: selectedOpportunity.name,
        value: selectedOpportunity.value,
        stage: selectedOpportunity.stage,
        probability: selectedOpportunity.probability,
        close_date: selectedOpportunity.close_date,
        notes: selectedOpportunity.notes,
      };
      await updateOpportunity(selectedOpportunity.id, updateData);
      setEditDialogOpen(false);
      setSelectedOpportunity(null);
    } catch (err) {
      console.error('更新销售机会失败:', err);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('确定要删除该销售机会吗？')) return;
    try {
      await removeOpportunity(id);
    } catch (err) {
      console.error('删除销售机会失败:', err);
    }
  };

  const totalPages = useMemo(
    () => Math.ceil(opportunitiesTotal / opportunitiesPageSize),
    [opportunitiesTotal, opportunitiesPageSize]
  );

  return (
    <Box sx={{ p: 3 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Box>
          <Typography variant="h5" component="h1" sx={{ fontWeight: 600 }}>
            销售机会
          </Typography>
          <Typography variant="body2" color="text.secondary">
            管理销售管道、商机阶段与赢率
          </Typography>
        </Box>
        <Box sx={{ display: 'flex', gap: 2 }}>
          <Button
            variant="outlined"
            startIcon={<RefreshIcon />}
            onClick={() =>
              loadOpportunities({
                page: opportunitiesPage,
                pageSize: opportunitiesPageSize,
                search: searchKeyword || undefined,
                stage: stageFilter !== 'all' ? stageFilter : undefined,
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
            新建商机
          </Button>
        </Box>
      </Box>

      <Paper sx={{ mb: 3, p: 2 }}>
        <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
          <TextField
            placeholder="搜索商机名称..."
            
            value={searchKeyword}
            onChange={(e) => setSearchKeyword(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
             
            slotProps={{ input: { size: 'small', startAdornment: <SearchIcon style={{ color: '#9e9e9e', marginRight: 4, fontSize: 20 }}  />  }}}
            sx={{ minWidth: 300 }}
          />
          <FormControl size="small" sx={{ minWidth: 150 }}>
            <InputLabel>阶段</InputLabel>
            <Select
              value={stageFilter}
              label="阶段"
              onChange={(e) => setStageFilter(e.target.value)}
            >
              <MenuItem value="all">全部</MenuItem>
              <MenuItem value="prospecting">线索</MenuItem>
              <MenuItem value="qualification">资格审查</MenuItem>
              <MenuItem value="proposal">方案报价</MenuItem>
              <MenuItem value="negotiation">商务谈判</MenuItem>
              <MenuItem value="won">成交</MenuItem>
              <MenuItem value="lost">丢单</MenuItem>
            </Select>
          </FormControl>
          <Button variant="outlined" onClick={handleSearch}>
            搜索
          </Button>
        </Box>
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
                <TableCell>商机名称</TableCell>
                <TableCell>客户</TableCell>
                <TableCell>金额</TableCell>
                <TableCell>赢率</TableCell>
                <TableCell>阶段</TableCell>
                <TableCell>预计成交日期</TableCell>
                <TableCell align="right">操作</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={7} align="center" sx={{ py: 4 }}>
                    <CircularProgress />
                  </TableCell>
                </TableRow>
              ) : opportunities.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} align="center" sx={{ py: 4 }}>
                    <Typography color="text.secondary">暂无销售机会</Typography>
                  </TableCell>
                </TableRow>
              ) : (
                opportunities.map((opportunity) => (
                  <TableRow key={opportunity.id} hover>
                    <TableCell>
                      <Typography variant="body2" sx={{ fontWeight: 500 }}>
                        {opportunity.name}
                      </Typography>
                    </TableCell>
                    <TableCell>{opportunity.customer_id || '-'}</TableCell>
                    <TableCell>
                      <Typography variant="body2" sx={{ fontWeight: 500 }}>
                        ¥{(opportunity.value || 0).toLocaleString()}
                      </Typography>
                    </TableCell>
                    <TableCell>{opportunity.probability || 0}%</TableCell>
                    <TableCell>
                      <Chip
                        label={getStageLabel(opportunity.stage)}
                        size="small"
                        color={getStageColor(opportunity.stage)}
                        variant="filled"
                      />
                    </TableCell>
                    <TableCell>
                      {opportunity.close_date
                        ? new Date(opportunity.close_date).toLocaleDateString('zh-CN')
                        : '-'}
                    </TableCell>
                    <TableCell align="right">
                      <IconButton size="small" title="查看详情">
                        <VisibilityIcon fontSize="small" />
                      </IconButton>
                      <IconButton
                        size="small"
                        onClick={() => {
                          setSelectedOpportunity(opportunity);
                          setEditDialogOpen(true);
                        }}
                        title="编辑"
                      >
                        <EditIcon fontSize="small" />
                      </IconButton>
                      <IconButton
                        size="small"
                        color="error"
                        onClick={() => handleDelete(opportunity.id)}
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
        {opportunitiesTotal > 0 && (
          <Box sx={{ display: 'flex', justifyContent: 'flex-end', p: 2 }}>
            <Pagination
              count={totalPages}
              page={opportunitiesPage}
              onChange={handlePageChange}
              size="small"
            />
          </Box>
        )}
      </Paper>

      <Dialog open={createDialogOpen} onClose={() => setCreateDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>新建销售机会</DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
            <TextField
              label="商机名称"
              required
              value={newOpportunity.name}
              onChange={(e) => setNewOpportunity({ ...newOpportunity, name: e.target.value })}
              fullWidth
            />
            <TextField
              label="金额"
              type="number"
              value={newOpportunity.value || ''}
              onChange={(e) =>
                setNewOpportunity({ ...newOpportunity, value: Number(e.target.value) })
              }
              fullWidth
            />
            <TextField
              label="赢率 (%)"
              type="number"
              value={newOpportunity.probability || ''}
              onChange={(e) =>
                setNewOpportunity({ ...newOpportunity, probability: Number(e.target.value) })
              }
              fullWidth
            />
            <TextField
              label="预计成交日期"
              type="date"
              value={newOpportunity.close_date || ''}
              onChange={(e) => setNewOpportunity({ ...newOpportunity, close_date: e.target.value })}
              slotProps={{ inputLabel: { shrink: true } }}
              fullWidth
            />
            <TextField
              label="备注"
              multiline
              rows={3}
              value={newOpportunity.notes || ''}
              onChange={(e) => setNewOpportunity({ ...newOpportunity, notes: e.target.value })}
              fullWidth
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCreateDialogOpen(false)}>取消</Button>
          <Button
            variant="contained"
            onClick={handleCreate}
            disabled={submitting || !newOpportunity.name}
          >
            {submitting ? '创建中...' : '创建'}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={editDialogOpen} onClose={() => setEditDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>编辑销售机会</DialogTitle>
        {selectedOpportunity && (
          <DialogContent>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
              <TextField
                label="商机名称"
                required
                value={selectedOpportunity.name}
                onChange={(e) =>
                  setSelectedOpportunity({ ...selectedOpportunity, name: e.target.value })
                }
                fullWidth
              />
              <FormControl fullWidth>
                <InputLabel>阶段</InputLabel>
                <Select
                  value={selectedOpportunity.stage}
                  label="阶段"
                  onChange={(e) =>
                    setSelectedOpportunity({ ...selectedOpportunity, stage: e.target.value })
                  }
                >
                  <MenuItem value="prospecting">线索</MenuItem>
                  <MenuItem value="qualification">资格审查</MenuItem>
                  <MenuItem value="proposal">方案报价</MenuItem>
                  <MenuItem value="negotiation">商务谈判</MenuItem>
                  <MenuItem value="won">成交</MenuItem>
                  <MenuItem value="lost">丢单</MenuItem>
                </Select>
              </FormControl>
              <TextField
                label="金额"
                type="number"
                value={selectedOpportunity.value || 0}
                onChange={(e) =>
                  setSelectedOpportunity({ ...selectedOpportunity, value: Number(e.target.value) })
                }
                fullWidth
              />
              <TextField
                label="赢率 (%)"
                type="number"
                value={selectedOpportunity.probability || 0}
                onChange={(e) =>
                  setSelectedOpportunity({
                    ...selectedOpportunity,
                    probability: Number(e.target.value),
                  })
                }
                fullWidth
              />
            </Box>
          </DialogContent>
        )}
        <DialogActions>
          <Button
            onClick={() => {
              setEditDialogOpen(false);
              setSelectedOpportunity(null);
            }}
          >
            取消
          </Button>
          <Button variant="contained" onClick={handleEdit} disabled={submitting}>
            {submitting ? '保存中...' : '保存'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default OpportunityManagementPage;
