import React, { useState, useMemo, useCallback } from 'react';
import {
  Box,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Grid,
  Button,
  Chip,
} from '@mui/material';
import { Plus, Edit, Delete, RefreshCw, AlertTriangle, FileWarning } from 'lucide-react';
import { pdmApi } from '@/api/pdm';
import type { ChangeOrder, CreateChangeOrderRequest } from '@/api/pdm';
import { useAppStore } from '@/store';
import { apiLogger } from '@/utils/logger';
import {
  ListPageTemplate,
  type ColumnDef,
  type RowAction,
  type FilterConfig,
} from '@/components/templates';
import { PageContainer } from '@/components/common/PageContainerV2';
import { designTokens } from '@/theme/tokens';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { QUERY_KEYS } from '@/lib/reactQuery';

const ct = designTokens.colors;

interface ChangeOrderFormData {
  change_no: string;
  title: string;
  type: string;
  priority: string;
  status: string;
  applicant: string;
  apply_date: string;
  description: string;
  reason: string;
  impact_analysis: string;
  remarks: string;
}

const STATUS_COLORS: Record<
  string,
  'default' | 'primary' | 'secondary' | 'success' | 'warning' | 'error'
> = {
  pending: 'warning',
  approved: 'success',
  rejected: 'error',
  implemented: 'primary',
  cancelled: 'default',
};

const PRIORITY_COLORS: Record<
  string,
  'default' | 'primary' | 'secondary' | 'success' | 'warning' | 'error'
> = {
  low: 'default',
  medium: 'warning',
  high: 'error',
  urgent: 'error',
};

const TYPE_OPTIONS = [
  { label: '设计变更', value: 'design' },
  { label: '工艺变更', value: 'process' },
  { label: '材料变更', value: 'material' },
  { label: '规格变更', value: 'specification' },
  { label: '其他变更', value: 'other' },
];

const PRIORITY_OPTIONS = [
  { label: '低', value: 'low' },
  { label: '中', value: 'medium' },
  { label: '高', value: 'high' },
  { label: '紧急', value: 'urgent' },
];

const STATUS_OPTIONS = [
  { label: '待审批', value: 'pending' },
  { label: '已批准', value: 'approved' },
  { label: '已拒绝', value: 'rejected' },
  { label: '已实施', value: 'implemented' },
  { label: '已取消', value: 'cancelled' },
];

export const ChangePage: React.FC = () => {
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState('');
  const [openDialog, setOpenDialog] = useState(false);
  const [editingChange, setEditingChange] = useState<ChangeOrder | null>(null);
  const [formData, setFormData] = useState<ChangeOrderFormData>({
    change_no: '',
    title: '',
    type: 'design',
    priority: 'medium',
    status: 'pending',
    applicant: '',
    apply_date: new Date().toISOString().split('T')[0],
    description: '',
    reason: '',
    impact_analysis: '',
    remarks: '',
  });
  const addNotification = useAppStore((state) => state.addNotification);

  const loadChangeOrders = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: QUERY_KEYS.PDM.CHANGE_ORDERS });
  }, [queryClient]);

  const { data: changeOrders = [], isLoading: loading } = useQuery({
    queryKey: QUERY_KEYS.PDM.CHANGE_ORDERS,
    queryFn: async () => {
      const response = await pdmApi.listChangeOrders();
      if (response.success && response.data) {
        const data = response.data as any;
        return Array.isArray(data) ? data : data.changeOrders || [];
      }
      return [];
    },
    staleTime: 5 * 60 * 1000,
  });

  const createChangeOrderMutation = useMutation({
    mutationFn: (data: CreateChangeOrderRequest) => pdmApi.createChangeOrder(data),
    onSuccess: () => {
      addNotification({ title: '成功', message: '变更单创建成功', type: 'success' });
      setOpenDialog(false);
      setEditingChange(null);
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.PDM.CHANGE_ORDERS });
    },
    onError: () => {
      addNotification({ title: '错误', message: '创建失败', type: 'error' });
    },
  });

  const updateChangeOrderMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: CreateChangeOrderRequest }) =>
      pdmApi.updateChangeOrder(id, data),
    onSuccess: () => {
      addNotification({ title: '成功', message: '变更单更新成功', type: 'success' });
      setOpenDialog(false);
      setEditingChange(null);
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.PDM.CHANGE_ORDERS });
    },
    onError: () => {
      addNotification({ title: '错误', message: '更新失败', type: 'error' });
    },
  });

  const deleteChangeOrderMutation = useMutation({
    mutationFn: (id: string) => pdmApi.deleteChangeOrder(id),
    onSuccess: () => {
      addNotification({ title: '成功', message: '变更单删除成功', type: 'success' });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.PDM.CHANGE_ORDERS });
    },
    onError: () => {
      addNotification({ title: '错误', message: '删除失败', type: 'error' });
    },
  });

  const handleEditChange = (change: ChangeOrder) => {
    setEditingChange(change);
    setFormData({
      change_no: change.change_no || '',
      title: change.title || '',
      type: change.type || 'design',
      priority: change.priority || 'medium',
      status: change.status || 'pending',
      applicant: change.applicant || '',
      apply_date: change.apply_date?.split('T')[0] || new Date().toISOString().split('T')[0],
      description: change.description || '',
      reason: change.reason || '',
      impact_analysis: change.impact_analysis || '',
      remarks: change.remarks || '',
    });
    setOpenDialog(true);
  };

  const handleDeleteChange = (id: string) => {
    deleteChangeOrderMutation.mutate(id);
  };

  const handleCreate = () => {
    setEditingChange(null);
    setFormData({
      change_no: `CO-${Date.now()}`,
      title: '',
      type: 'design',
      priority: 'medium',
      status: 'pending',
      applicant: '',
      apply_date: new Date().toISOString().split('T')[0],
      description: '',
      reason: '',
      impact_analysis: '',
      remarks: '',
    });
    setOpenDialog(true);
  };

  const handleSaveChange = () => {
    const requestData: CreateChangeOrderRequest = {
      change_no: formData.change_no,
      title: formData.title,
      type: formData.type,
      priority: formData.priority,
      status: formData.status,
      applicant: formData.applicant,
      apply_date: formData.apply_date,
      description: formData.description,
      reason: formData.reason,
      impact_analysis: formData.impact_analysis,
      remarks: formData.remarks,
    };

    if (editingChange) {
      updateChangeOrderMutation.mutate({ id: editingChange.id, data: requestData });
    } else {
      createChangeOrderMutation.mutate(requestData);
    }
  };

  const filteredChanges = useMemo(() => {
    return changeOrders.filter((change: ChangeOrder) => {
      const matchesSearch =
        !searchTerm ||
        change.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        change.change_no.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (change.applicant_name &&
          change.applicant_name.toLowerCase().includes(searchTerm.toLowerCase()));
      return matchesSearch;
    });
  }, [changeOrders, searchTerm]);

  const typeFilterOptions = TYPE_OPTIONS.map((opt) => ({ label: opt.label, value: opt.value }));
  const priorityFilterOptions = PRIORITY_OPTIONS.map((opt) => ({
    label: opt.label,
    value: opt.value,
  }));
  const statusFilterOptions = STATUS_OPTIONS.map((opt) => ({ label: opt.label, value: opt.value }));

  const filters: FilterConfig[] = useMemo(
    () => [
      {
        id: 'type',
        label: '变更类型',
        type: 'select',
        options: typeFilterOptions,
      },
      {
        id: 'priority',
        label: '优先级',
        type: 'select',
        options: priorityFilterOptions,
      },
      {
        id: 'status',
        label: '状态',
        type: 'select',
        options: statusFilterOptions,
      },
    ],
    [typeFilterOptions, priorityFilterOptions, statusFilterOptions]
  );

  const handleFilterChange = useCallback((values: Record<string, any>) => {
    // Filter implementation
  }, []);

  const handleSearch = useCallback((value: string) => {
    setSearchTerm(value);
  }, []);

  const columns: ColumnDef<ChangeOrder>[] = useMemo(
    () => [
      { id: 'change_no', label: '变更单号', minWidth: 140 },
      { id: 'title', label: '变更标题', minWidth: 200 },
      {
        id: 'type',
        label: '类型',
        minWidth: 100,
        render: (row) => {
          const type = TYPE_OPTIONS.find((t) => t.value === row.type);
          return type?.label || row.type || '-';
        },
      },
      {
        id: 'priority',
        label: '优先级',
        minWidth: 80,
        render: (row) => (
          <Chip
            label={PRIORITY_OPTIONS.find((p) => p.value === row.priority)?.label || row.priority}
            color={PRIORITY_COLORS[row.priority] || 'default'}
            size='small'
          />
        ),
      },
      {
        id: 'status',
        label: '状态',
        minWidth: 100,
        render: (row) => (
          <Chip
            label={STATUS_OPTIONS.find((s) => s.value === row.status)?.label || row.status}
            color={STATUS_COLORS[row.status] || 'default'}
            size='small'
          />
        ),
      },
      { id: 'applicant_name', label: '申请人', minWidth: 100 },
      {
        id: 'apply_date',
        label: '申请日期',
        minWidth: 120,
        render: (row) => {
          if (!row.apply_date) return '-';
          const date = new Date(row.apply_date);
          return date.toLocaleDateString('zh-CN');
        },
      },
    ],
    []
  );

  const rowActions: RowAction<ChangeOrder>[] = useMemo(
    () => [
      {
        label: '编辑',
        icon: <Edit size={16} />,
        color: 'primary',
        onClick: (row) => handleEditChange(row),
      },
      {
        label: '删除',
        icon: <Delete size={16} />,
        color: 'error',
        onClick: (row) => handleDeleteChange(row.id),
        confirm: true,
        confirmMessage: '确定要删除这个变更单吗？',
      },
    ],
    []
  );

  const pendingCount = filteredChanges.filter((c: ChangeOrder) => c.status === 'pending').length;
  const approvedCount = filteredChanges.filter((c: ChangeOrder) => c.status === 'approved').length;
  const implementedCount = filteredChanges.filter((c: ChangeOrder) => c.status === 'implemented').length;

  const statsCards = (
    <Grid
      container
      spacing={3}
      sx={{ mb: 2 }}
    >
      <Grid size={{ xs: 12, sm: 4 }}>
        <Box
          sx={{
            p: 2,
            borderRadius: 3,
            bgcolor: 'background.paper',
            border: 1,
            borderColor: 'divider',
          }}
        >
          <Box sx={{ color: 'text.secondary', fontSize: '0.875rem', mb: 1 }}>变更单总数</Box>
          <Box sx={{ fontWeight: 'bold', fontSize: '1.5rem' }}>
            {loading ? '...' : `${filteredChanges.length} 个`}
          </Box>
        </Box>
      </Grid>
      <Grid size={{ xs: 12, sm: 4 }}>
        <Box
          sx={{
            p: 2,
            borderRadius: 3,
            bgcolor: 'background.paper',
            border: 1,
            borderColor: 'divider',
          }}
        >
          <Box sx={{ color: 'text.secondary', fontSize: '0.875rem', mb: 1 }}>待审批</Box>
          <Box sx={{ fontWeight: 'bold', fontSize: '1.5rem', color: 'warning.main' }}>
            {loading ? '...' : `${pendingCount} 个`}
          </Box>
        </Box>
      </Grid>
      <Grid size={{ xs: 12, sm: 4 }}>
        <Box
          sx={{
            p: 2,
            borderRadius: 3,
            bgcolor: 'background.paper',
            border: 1,
            borderColor: 'divider',
          }}
        >
          <Box sx={{ color: 'text.secondary', fontSize: '0.875rem', mb: 1 }}>已实施</Box>
          <Box sx={{ fontWeight: 'bold', fontSize: '1.5rem', color: 'success.main' }}>
            {loading ? '...' : `${implementedCount} 个`}
          </Box>
        </Box>
      </Grid>
    </Grid>
  );

  return (
    <PageContainer
      headerProps={{
        pageIcon: <FileWarning style={{ width: 20, height: 20 }} />,
        pageGradient: `linear-gradient(135deg, ${ct.warning.main} 0%, ${ct.warning.dark} 100%)`,
      }}
    >
      <ListPageTemplate
        title=''
        subtitle=''
        columns={columns}
        data={filteredChanges}
        loading={loading}
        searchable
        searchPlaceholder='搜索变更单号、标题或申请人...'
        onSearch={handleSearch}
        filters={filters}
        filtersValue={{}}
        onFilterChange={handleFilterChange}
        rowActions={rowActions}
        actions={[
          {
            label: '创建变更单',
            icon: <Plus size={16} />,
            onClick: handleCreate,
            variant: 'contained',
          },
        ]}
        onRefresh={() => queryClient.invalidateQueries({ queryKey: QUERY_KEYS.PDM.CHANGE_ORDERS })}
        headerContent={statsCards}
        emptyMessage='暂无变更单数据'
      />

      <Dialog
        open={openDialog}
        onClose={() => setOpenDialog(false)}
        maxWidth='md'
        fullWidth
      >
        <DialogTitle>{editingChange ? '编辑变更单' : '创建变更单'}</DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3, mt: 2 }}>
            <Grid
              container
              spacing={3}
            >
              <Grid size={{ xs: 6 }}>
                <TextField
                  label='变更单号 *'
                  value={formData.change_no}
                  onChange={(e) => setFormData({ ...formData, change_no: e.target.value })}
                  fullWidth
                  required
                  disabled={!!editingChange}
                />
              </Grid>
              <Grid size={{ xs: 6 }}>
                <TextField
                  label='申请日期'
                  type='date'
                  value={formData.apply_date}
                  onChange={(e) => setFormData({ ...formData, apply_date: e.target.value })}
                  fullWidth
                  slotProps={{
                    inputLabel: { shrink: true },
                  }}
                />
              </Grid>
            </Grid>
            <TextField
              label='变更标题 *'
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              fullWidth
              required
            />
            <Grid
              container
              spacing={3}
            >
              <Grid size={{ xs: 4 }}>
                <FormControl fullWidth>
                  <InputLabel>变更类型</InputLabel>
                  <Select
                    value={formData.type}
                    label='变更类型'
                    onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                  >
                    {TYPE_OPTIONS.map((option) => (
                      <MenuItem
                        key={option.value}
                        value={option.value}
                      >
                        {option.label}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
              <Grid size={{ xs: 4 }}>
                <FormControl fullWidth>
                  <InputLabel>优先级</InputLabel>
                  <Select
                    value={formData.priority}
                    label='优先级'
                    onChange={(e) => setFormData({ ...formData, priority: e.target.value })}
                  >
                    {PRIORITY_OPTIONS.map((option) => (
                      <MenuItem
                        key={option.value}
                        value={option.value}
                      >
                        {option.label}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
              <Grid size={{ xs: 4 }}>
                <FormControl fullWidth>
                  <InputLabel>状态</InputLabel>
                  <Select
                    value={formData.status}
                    label='状态'
                    onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                  >
                    {STATUS_OPTIONS.map((option) => (
                      <MenuItem
                        key={option.value}
                        value={option.value}
                      >
                        {option.label}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
            </Grid>
            <TextField
              label='申请人'
              value={formData.applicant}
              onChange={(e) => setFormData({ ...formData, applicant: e.target.value })}
              fullWidth
            />
            <TextField
              label='变更原因 *'
              value={formData.reason}
              onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
              fullWidth
              multiline
              rows={2}
              required
            />
            <TextField
              label='变更描述 *'
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              fullWidth
              multiline
              rows={3}
              required
            />
            <TextField
              label='影响分析'
              value={formData.impact_analysis}
              onChange={(e) => setFormData({ ...formData, impact_analysis: e.target.value })}
              fullWidth
              multiline
              rows={2}
            />
            <TextField
              label='备注'
              value={formData.remarks}
              onChange={(e) => setFormData({ ...formData, remarks: e.target.value })}
              fullWidth
              multiline
              rows={2}
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenDialog(false)}>取消</Button>
          <Button
            variant='contained'
            onClick={handleSaveChange}
            disabled={
              !formData.change_no || !formData.title || !formData.reason || !formData.description
            }
          >
            保存
          </Button>
        </DialogActions>
      </Dialog>
    </PageContainer>
  );
};

export default ChangePage;
