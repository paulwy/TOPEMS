import React, { useState, useMemo } from 'react';
import {
  Box,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Chip,
  Typography,
  Button,
} from '@mui/material';
import { apiLogger } from '@/utils/logger';
import { Plus, Eye, Clock } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { PageContainer } from '@/components/common/PageContainerV2';
import { ListPageTemplate } from '@/components/templates';

import type { RowAction, FilterConfig, ColumnDef } from '@/components/templates';
import { pdmApi } from '@/api/pdm';
import type { ProductionFormula } from '@/api/pdm';
import { useAppStore } from '@/store';
import { designTokens } from '@/theme/tokens';
import { QUERY_KEYS } from '@/lib/reactQuery';

const ct = designTokens.colors;

const adaptFormula = (item: { [key: string]: unknown }) => ({
  ...item,
  product_name: item.name || '',
  status:
    item.status === 'active'
      ? '启用'
      : item.status === 'inactive'
        ? '禁用'
        : item.status === 'draft'
          ? '草稿'
          : item.status === 'approved'
            ? '已批准'
            : item.status,
});

const PdmFormulaPage: React.FC = () => {
  const queryClient = useQueryClient();
  const addNotification = useAppStore((state) => state.addNotification);

  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedFormula, setSelectedFormula] = useState<ProductionFormula | null>(null);
  const [formData, setFormData] = useState({
    formula_no: '',
    name: '',
    description: '',
    version: '1.0',
    process_id: '',
  });

  const { data: formulas = [], isLoading } = useQuery({
    queryKey: QUERY_KEYS.PDM.FORMULAS,
    queryFn: async () => {
      const response = await pdmApi.listFormulas();
      if (response.success && response.data) {
        const adapted = (response.data as any).map(adaptFormula);
        return adapted;
      }
      return [];
    },
    staleTime: 5 * 60 * 1000,
  });

  const createFormulaMutation = useMutation({
    mutationFn: (data: {
      formula_no: string;
      name: string;
      description?: string;
      version: string;
      process_id?: string;
    }) =>
      pdmApi.createFormula({
        formula_no: data.formula_no,
        name: data.name,
        description: data.description || undefined,
        version: data.version,
        process_id: data.process_id || undefined,
        status: 'draft',
      }),
    onSuccess: () => {
      addNotification({ title: '成功', message: '配方创建成功', type: 'success' });
      setShowCreateModal(false);
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.PDM.FORMULAS });
    },
    onError: (err: unknown) => {
      addNotification({ title: '错误', message: '创建失败', type: 'error' });
      apiLogger.error('创建配方失败:', err);
    },
  });

  const getStatusBadge = (status: string) => {
    const statusMap: Record<string, { bg: string; color: string }> = {
      启用: { bg: 'success.lighter', color: 'success.dark' },
      禁用: { bg: 'error.lighter', color: 'error.dark' },
      草稿: { bg: 'warning.light', color: ct.yellow[600] },
      已批准: { bg: 'primary.100', color: 'primary.main' },
    };
    const colors = statusMap[status] || { bg: 'grey.100', color: 'text.secondary' };
    return (
      <Chip
        label={status}
        size='small'
        sx={{
          backgroundColor: colors.bg,
          color: colors.color,
          fontWeight: 500,
        }}
      />
    );
  };

  const filteredFormulas = useMemo(() => {
    return formulas.filter((formula: any) => {
      const matchesSearch =
        formula.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        formula.formula_no.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesStatus = !statusFilter || formula.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [formulas, searchTerm, statusFilter]);

  const columns = useMemo<ColumnDef<ProductionFormula>[]>(
    () => [
      { id: 'formula_no', label: '配方编号' },
      { id: 'name', label: '产品名称' },
      { id: 'version', label: '版本' },
      {
        id: 'status',
        label: '状态',
        render: (row) => getStatusBadge(row.status),
      },
    ],
    []
  );

  const rowActions = useMemo<RowAction<ProductionFormula>[]>(
    () => [
      {
        label: '详情',
        icon: <Eye size={16} />,
        onClick: (row) => {
          setSelectedFormula(row);
          setShowDetailModal(true);
        },
      },
    ],
    []
  );

  const filters = useMemo<FilterConfig[]>(
    () => [
      {
        id: 'status',
        label: '状态',
        type: 'select',
        options: [
          { value: '', label: '全部' },
          { value: '启用', label: '启用' },
          { value: '禁用', label: '禁用' },
          { value: '草稿', label: '草稿' },
          { value: '已批准', label: '已批准' },
        ],
        value: statusFilter,
        onChange: (value) => setStatusFilter(value as string),
      },
    ],
    [statusFilter]
  );

  const handleCreate = () => {
    setFormData({
      formula_no: '',
      name: '',
      description: '',
      version: '1.0',
      process_id: '',
    });
    setShowCreateModal(true);
  };

  const handleSave = () => {
    createFormulaMutation.mutate(formData);
  };

  const stats = {
    total: formulas.length,
    active: formulas.filter((f: any) => f.status === '启用').length,
    draft: formulas.filter((f: any) => f.status === '草稿').length,
    approved: formulas.filter((f: any) => f.status === '已批准').length,
  };

  const statsContent = (
    <Box
      sx={{
        display: 'grid',
        gridTemplateColumns: { xs: 'repeat(1, 1fr)', md: 'repeat(4, 1fr)' },
        gap: 2,
        mb: 3,
      }}
    >
      <Box sx={{ p: 2, bgcolor: ct.pink[50], borderRadius: 3 }}>
        <Typography
          variant='body2'
          sx={{ color: 'slate.600' }}
        >
          配方总数
        </Typography>
        <Typography
          variant='h5'
          sx={{ fontWeight: 700 }}
        >
          {stats.total}
        </Typography>
      </Box>
      <Box sx={{ p: 2, bgcolor: 'success.lighter', borderRadius: 3 }}>
        <Typography
          variant='body2'
          sx={{ color: 'slate.600' }}
        >
          已启用
        </Typography>
        <Typography
          variant='h5'
          sx={{ fontWeight: 700 }}
        >
          {stats.active}
        </Typography>
      </Box>
      <Box sx={{ p: 2, bgcolor: 'warning.light', borderRadius: 3 }}>
        <Typography
          variant='body2'
          sx={{ color: 'slate.600' }}
        >
          草稿
        </Typography>
        <Typography
          variant='h5'
          sx={{ fontWeight: 700 }}
        >
          {stats.draft}
        </Typography>
      </Box>
      <Box sx={{ p: 2, bgcolor: 'primary.100', borderRadius: 3 }}>
        <Typography
          variant='body2'
          sx={{ color: 'slate.600' }}
        >
          已批准
        </Typography>
        <Typography
          variant='h5'
          sx={{ fontWeight: 700 }}
        >
          {stats.approved}
        </Typography>
      </Box>
    </Box>
  );

  return (
    <PageContainer
      headerProps={{
        pageIcon: <Clock style={{ width: 20, height: 20 }} />,
        pageGradient: `linear-gradient(135deg, ${ct.pink[500]} 0%, ${ct.pink[600]} 100%)`,
      }}
    >
      <ListPageTemplate<ProductionFormula>
        title=''
        subtitle=''
        backButton={{ href: '/dashboard' }}
        columns={columns}
        data={filteredFormulas}
        loading={isLoading}
        searchable
        searchPlaceholder='搜索产品名称或配方编号...'
        searchValue={searchTerm}
        onSearch={(value) => setSearchTerm(value)}
        filters={filters}
        rowActions={rowActions}
        actions={[
          {
            label: '新增配方',
            icon: <Plus size={18} />,
            onClick: handleCreate,
            variant: 'contained',
          },
        ]}
        headerContent={statsContent}
        emptyMessage='暂无配方数据'
      />

      <Dialog
        open={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        maxWidth='sm'
        fullWidth
      >
        <DialogTitle>新增配方</DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 1, display: 'flex', flexDirection: 'column', gap: 2 }}>
            <TextField
              fullWidth
              label='配方编号 *'
              value={formData.formula_no}
              onChange={(e) => setFormData({ ...formData, formula_no: e.target.value })}
              placeholder='请输入配方编号'
            />
            <TextField
              fullWidth
              label='产品名称 *'
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder='请输入产品名称'
            />
            <TextField
              fullWidth
              label='版本'
              value={formData.version}
              onChange={(e) => setFormData({ ...formData, version: e.target.value })}
              placeholder='请输入版本号'
            />
            <TextField
              fullWidth
              label='所属工艺'
              value={formData.process_id}
              onChange={(e) => setFormData({ ...formData, process_id: e.target.value })}
              placeholder='请输入工艺ID'
            />
            <TextField
              fullWidth
              label='描述'
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder='请输入配方描述'
              multiline
              rows={2}
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button
            variant='outlined'
            onClick={() => setShowCreateModal(false)}
          >
            取消
          </Button>
          <Button
            variant='contained'
            onClick={handleSave}
            disabled={createFormulaMutation.isPending}
            sx={{ bgcolor: ct.pink[500] }}
          >
            保存
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog
        open={showDetailModal}
        onClose={() => setShowDetailModal(false)}
        maxWidth='md'
        fullWidth
      >
        <DialogTitle>配方详情</DialogTitle>
        <DialogContent>
          {selectedFormula && (
            <Box
              sx={{
                pt: 2,
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                gap: 2,
              }}
            >
              <Box>
                <Box
                  component='span'
                  sx={{ color: 'text.secondary', fontSize: '0.875rem' }}
                >
                  配方编号
                </Box>
                <Box sx={{ fontWeight: 500 }}>{selectedFormula.formula_no}</Box>
              </Box>
              <Box>
                <Box
                  component='span'
                  sx={{ color: 'text.secondary', fontSize: '0.875rem' }}
                >
                  产品名称
                </Box>
                <Box>{selectedFormula.name}</Box>
              </Box>
              <Box>
                <Box
                  component='span'
                  sx={{ color: 'text.secondary', fontSize: '0.875rem' }}
                >
                  版本
                </Box>
                <Box>{selectedFormula.version}</Box>
              </Box>
              <Box>
                <Box
                  component='span'
                  sx={{ color: 'text.secondary', fontSize: '0.875rem' }}
                >
                  状态
                </Box>
                <Box sx={{ mt: 0.5 }}>{getStatusBadge(selectedFormula.status)}</Box>
              </Box>
              <Box sx={{ gridColumn: '1 / -1' }}>
                <Box
                  component='span'
                  sx={{ color: 'text.secondary', fontSize: '0.875rem' }}
                >
                  描述
                </Box>
                <Box>{selectedFormula.description || '-'}</Box>
              </Box>
              <Box>
                <Box
                  component='span'
                  sx={{ color: 'text.secondary', fontSize: '0.875rem' }}
                >
                  创建时间
                </Box>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                  <Clock style={{ width: 16, height: 16 }} />
                  {selectedFormula.created_at || '-'}
                </Box>
              </Box>
              <Box>
                <Box
                  component='span'
                  sx={{ color: 'text.secondary', fontSize: '0.875rem' }}
                >
                  更新时间
                </Box>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                  <Clock style={{ width: 16, height: 16 }} />
                  {selectedFormula.updated_at || '-'}
                </Box>
              </Box>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowDetailModal(false)}>关闭</Button>
        </DialogActions>
      </Dialog>
    </PageContainer>
  );
};

export default PdmFormulaPage;
