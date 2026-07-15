import {
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Box,
  InputLabel,
  Select,
  MenuItem,
  FormControl,
  Typography,
  Button,
  Stack,
  Tabs,
  Tab,
} from '@mui/material';
import { PageContainer } from '@/components/common/PageContainerV2';
import React, { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { QUERY_KEYS } from '@/lib/reactQuery';
import type {
  QualityInspection,
  CreateQualityInspectionRequest,
  UpdateQualityInspectionRequest,
  PatrolInspection,
  CreatePatrolInspectionRequest,
  QualityStandard,
} from '@/api/mes/quality';
import type { ListParams } from '@/api/mes';
import { qualityApi } from '@/api/mes/quality';
import { useNotificationStore } from '@/store';
import { LoadingSpinner } from '@topems/shared-components';
import {
  ListPageTemplate,
  type ColumnDef,
  type RowAction,
  type FilterConfig,
} from '@/components/templates';
import {
  Plus,
  Edit,
  Trash2,
  Eye,
  ClipboardCheck,
  Search,
  FileCheck,
  AlertCircle,
} from 'lucide-react';
import { apiLogger } from '@/utils/logger';
import { designTokens } from '@/theme/tokens';

const ct = designTokens.colors;

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props;
  return (
    <div
      role='tabpanel'
      hidden={value !== index}
      id={`quality-tabpanel-${index}`}
      aria-labelledby={`quality-tab-${index}`}
      {...other}
    >
      {value === index && <Box sx={{ pt: 3 }}>{children}</Box>}
    </div>
  );
}

const MesQualityPage: React.FC = () => {
  const queryClient = useQueryClient();
  const [tabValue, setTabValue] = useState(0);

  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize] = useState(10);

  type QualityItem = QualityInspection | PatrolInspection;

  const [showDialog, setShowDialog] = useState(false);
  const [showDetailDialog, setShowDetailDialog] = useState(false);
  const [selectedItem, setSelectedItem] = useState<QualityItem | null>(null);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  const [inspectionFormData, setInspectionFormData] = useState<CreateQualityInspectionRequest>({
    product_code: '',
    product_name: '',
    inspection_type: 'first_article',
    quantity: 0,
    inspector: '',
    memo: '',
  });

  const [patrolFormData, setPatrolFormData] = useState<CreatePatrolInspectionRequest>({
    production_line: '',
    inspector: '',
    findings: '',
    memo: '',
  });

  const { addNotification } = useNotificationStore();

  const params: ListParams = {
    page: currentPage - 1,
    pagesize: pageSize,
  };
  if (searchTerm) params.search = searchTerm;
  if (statusFilter !== 'all') params.status = statusFilter;

  const { data: inspectionsData, isLoading: inspectionsLoading } = useQuery({
    queryKey: [...QUERY_KEYS.MES.QUALITY_INSPECTIONS, params],
    queryFn: async () => {
      const response = await qualityApi.listInspections(params);
      if (response.success && response.data) {
        return {
          inspections: response.data.inspections || [],
          total: response.data.total || 0,
        };
      }
      return { inspections: [], total: 0 };
    },
    enabled: tabValue === 0,
  });

  const { data: patrolsData, isLoading: patrolsLoading } = useQuery({
    queryKey: [...QUERY_KEYS.MES.QUALITY_PATROLS, params],
    queryFn: async () => {
      const response = await qualityApi.listPatrolInspections(params);
      if (response.success && response.data) {
        return {
          patrols: response.data.patrols || [],
          total: response.data.total || 0,
        };
      }
      return { patrols: [], total: 0 };
    },
    enabled: tabValue === 1,
  });

  const { data: standardsData, isLoading: standardsLoading } = useQuery({
    queryKey: [...QUERY_KEYS.MES.QUALITY_STANDARDS, params],
    queryFn: async () => {
      const response = await qualityApi.listStandards(params);
      if (response.success && response.data) {
        return {
          standards: response.data.standards || [],
          total: response.data.total || 0,
        };
      }
      return { standards: [], total: 0 };
    },
    enabled: tabValue === 2,
  });

  const inspections = inspectionsData?.inspections || [];
  const patrols = patrolsData?.patrols || [];
  const standards = standardsData?.standards || [];
  const loading =
    tabValue === 0 ? inspectionsLoading : tabValue === 1 ? patrolsLoading : standardsLoading;
  const total =
    tabValue === 0
      ? inspectionsData?.total || 0
      : tabValue === 1
        ? patrolsData?.total || 0
        : standardsData?.total || 0;

  const invalidateQuality = () => {
    queryClient.invalidateQueries({ queryKey: QUERY_KEYS.MES.QUALITY_INSPECTIONS });
    queryClient.invalidateQueries({ queryKey: QUERY_KEYS.MES.QUALITY_PATROLS });
    queryClient.invalidateQueries({ queryKey: QUERY_KEYS.MES.QUALITY_STANDARDS });
  };

  const getStatusBadge = (status: string, type?: string) => {
    const s =
      type === 'patrol'
        ? {
            qualified: { label: '正常', bg: 'success.lighter', color: 'success.dark' },
            abnormal: { label: '异常', bg: 'error.lighter', color: 'error.dark' },
            pending: { label: '待处理', bg: 'warning.light', color: 'warning.dark' },
          }[status]
        : {
            qualified: { label: '合格', bg: 'success.lighter', color: 'success.dark' },
            unqualified: { label: '不合格', bg: 'error.lighter', color: 'error.dark' },
            pending: { label: '待检', bg: 'warning.light', color: 'warning.dark' },
          }[status];

    const info = s || { label: status, bg: 'grey.100', color: 'text.secondary' };

    return (
      <Chip
        size='small'
        label={info.label}
        sx={{ backgroundColor: info.bg, color: info.color, fontWeight: 500 }}
      />
    );
  };

  const createInspectionMutation = useMutation({
    mutationFn: (data: CreateQualityInspectionRequest) => qualityApi.createInspection(data),
    onSuccess: () => {
      addNotification({ type: 'success', title: '创建成功', message: '新质检记录已创建' });
      invalidateQuality();
      setShowDialog(false);
      resetInspectionForm();
    },
    onError: (error: unknown) => {
      apiLogger.error('操作失败:', error);
      addNotification({ type: 'error', title: '操作失败', message: '创建质检记录失败' });
    },
  });

  const updateInspectionMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateQualityInspectionRequest }) =>
      qualityApi.updateInspection(id, data),
    onSuccess: () => {
      addNotification({ type: 'success', title: '更新成功', message: '质检记录已更新' });
      invalidateQuality();
      setShowDialog(false);
      resetInspectionForm();
    },
    onError: (error: unknown) => {
      apiLogger.error('操作失败:', error);
      addNotification({ type: 'error', title: '操作失败', message: '更新质检记录失败' });
    },
  });

  const deleteInspectionMutation = useMutation({
    mutationFn: (id: string) => qualityApi.deleteInspection(id),
    onSuccess: () => {
      addNotification({ type: 'success', title: '删除成功', message: '质检记录已删除' });
      invalidateQuality();
    },
    onError: (error: unknown) => {
      apiLogger.error('删除失败:', error);
      addNotification({ type: 'error', title: '删除失败', message: '无法删除质检记录' });
    },
  });

  const createPatrolMutation = useMutation({
    mutationFn: (data: CreatePatrolInspectionRequest) => qualityApi.createPatrolInspection(data),
    onSuccess: () => {
      addNotification({ type: 'success', title: '创建成功', message: '新巡检记录已创建' });
      invalidateQuality();
      setShowDialog(false);
      resetPatrolForm();
    },
    onError: (error: unknown) => {
      apiLogger.error('操作失败:', error);
      addNotification({ type: 'error', title: '操作失败', message: '创建巡检记录失败' });
    },
  });

  const updatePatrolMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: CreatePatrolInspectionRequest }) =>
      qualityApi.updatePatrolInspection(id, data),
    onSuccess: () => {
      addNotification({ type: 'success', title: '更新成功', message: '巡检记录已更新' });
      invalidateQuality();
      setShowDialog(false);
      resetPatrolForm();
    },
    onError: (error: unknown) => {
      apiLogger.error('操作失败:', error);
      addNotification({ type: 'error', title: '操作失败', message: '更新巡检记录失败' });
    },
  });

  const deletePatrolMutation = useMutation({
    mutationFn: (id: string) => qualityApi.deletePatrolInspection(id),
    onSuccess: () => {
      addNotification({ type: 'success', title: '删除成功', message: '巡检记录已删除' });
      invalidateQuality();
    },
    onError: (error: unknown) => {
      apiLogger.error('删除失败:', error);
      addNotification({ type: 'error', title: '删除失败', message: '无法删除巡检记录' });
    },
  });

  const handleSubmitInspection = async (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedItem) {
      updateInspectionMutation.mutate({
        id: selectedItem.id,
        data: inspectionFormData as UpdateQualityInspectionRequest,
      });
    } else {
      createInspectionMutation.mutate(inspectionFormData);
    }
  };

  const handleSubmitPatrol = async (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedItem) {
      updatePatrolMutation.mutate({ id: selectedItem.id, data: patrolFormData });
    } else {
      createPatrolMutation.mutate(patrolFormData);
    }
  };

  const handleDeleteInspection = (id: string) => {
    if (!window.confirm('确定要删除这条质检记录吗?')) return;
    deleteInspectionMutation.mutate(id);
  };

  const handleDeletePatrol = (id: string) => {
    if (!window.confirm('确定要删除这条巡检记录吗?')) return;
    deletePatrolMutation.mutate(id);
  };

  const handleEditInspection = (inspection: QualityInspection) => {
    setSelectedItem(inspection);
    setInspectionFormData({
      product_code: inspection.product_code,
      product_name: inspection.product_name,
      inspection_type: inspection.inspection_type,
      quantity: inspection.quantity,
      inspector: inspection.inspector || '',
      memo: inspection.memo || '',
    });
    setShowDialog(true);
  };

  const handleEditPatrol = (patrol: PatrolInspection) => {
    setSelectedItem(patrol);
    setPatrolFormData({
      production_line: patrol.production_line || '',
      workstation_id: patrol.workstation_id,
      inspector: patrol.inspector,
      findings: patrol.findings || '',
      memo: patrol.memo || '',
    });
    setShowDialog(true);
  };

  const handleViewDetail = (item: QualityItem) => {
    setSelectedItem(item);
    setShowDetailDialog(true);
  };

  const resetInspectionForm = () => {
    setSelectedItem(null);
    setInspectionFormData({
      product_code: '',
      product_name: '',
      inspection_type: 'first_article',
      quantity: 0,
      inspector: '',
      memo: '',
    });
  };

  const resetPatrolForm = () => {
    setSelectedItem(null);
    setPatrolFormData({
      production_line: '',
      inspector: '',
      findings: '',
      memo: '',
    });
  };

  const handleOpenCreate = () => {
    if (tabValue === 0) {
      resetInspectionForm();
    } else {
      resetPatrolForm();
    }
    setShowDialog(true);
  };

  const handleSearch = (value: string) => {
    setSearchTerm(value);
    setCurrentPage(1);
  };

  const handleTabChange = (_event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
    setCurrentPage(1);
    setSearchTerm('');
  };

  const inspectionColumns: ColumnDef<QualityInspection>[] = useMemo(
    () => [
      { id: 'inspection_no', label: '质检单号', sortable: true },
      { id: 'product_name', label: '产品名称', sortable: true },
      { id: 'inspection_type', label: '质检类型', sortable: true },
      { id: 'quantity', label: '数量', sortable: true },
      {
        id: 'qualification_rate',
        label: '合格率',
        sortable: true,
        render: (row) => `${(row.qualification_rate * 100).toFixed(1)}%`,
      },
      { id: 'inspector', label: '质检员', sortable: true },
      {
        id: 'status',
        label: '状态',
        render: (row) => getStatusBadge(row.status),
      },
    ],
    []
  );

  const patrolColumns: ColumnDef<PatrolInspection>[] = useMemo(
    () => [
      { id: 'patrol_no', label: '巡检单号', sortable: true },
      { id: 'production_line', label: '生产线', sortable: true },
      { id: 'workstation_name', label: '工位', sortable: true },
      { id: 'inspector', label: '巡检员', sortable: true },
      { id: 'patrol_time', label: '巡检时间', sortable: true },
      {
        id: 'status',
        label: '状态',
        render: (row) => getStatusBadge(row.status, 'patrol'),
      },
    ],
    []
  );

  const filters: FilterConfig[] = useMemo(
    () => [
      {
        id: 'status',
        label: '状态',
        type: 'select',
        options: [
          { label: '全部状态', value: 'all' },
          { label: '合格', value: 'qualified' },
          { label: '不合格', value: 'unqualified' },
          { label: '待检', value: 'pending' },
        ],
        value: statusFilter,
        onChange: (value: unknown) => {
          setStatusFilter(value as string);
          setCurrentPage(1);
        },
      },
    ],
    [statusFilter]
  );

  const patrolFilters: FilterConfig[] = useMemo(
    () => [
      {
        id: 'status',
        label: '状态',
        type: 'select',
        options: [
          { label: '全部状态', value: 'all' },
          { label: '正常', value: 'normal' },
          { label: '异常', value: 'abnormal' },
          { label: '待处理', value: 'pending' },
        ],
        value: statusFilter,
        onChange: (value: unknown) => {
          setStatusFilter(value as string);
          setCurrentPage(1);
        },
      },
    ],
    [statusFilter]
  );

  const inspectionRowActions: RowAction<QualityInspection>[] = useMemo(
    () => [
      {
        label: '查看详情',
        icon: <Eye size={16} />,
        onClick: handleViewDetail,
      },
      {
        label: '编辑',
        icon: <Edit size={16} />,
        onClick: handleEditInspection,
      },
      {
        label: '删除',
        icon: <Trash2 size={16} />,
        color: 'error',
        onClick: (row) => handleDeleteInspection(row.id),
        confirm: true,
        confirmMessage: '确定要删除这条质检记录吗?',
      },
    ],
    [handleViewDetail, handleEditInspection, handleDeleteInspection]
  );

  const patrolRowActions: RowAction<PatrolInspection>[] = useMemo(
    () => [
      {
        label: '查看详情',
        icon: <Eye size={16} />,
        onClick: handleViewDetail,
      },
      {
        label: '编辑',
        icon: <Edit size={16} />,
        onClick: handleEditPatrol,
      },
      {
        label: '删除',
        icon: <Trash2 size={16} />,
        color: 'error',
        onClick: (row) => handleDeletePatrol(row.id),
        confirm: true,
        confirmMessage: '确定要删除这条巡检记录吗?',
      },
    ],
    [handleViewDetail, handleEditPatrol, handleDeletePatrol]
  );

  if (loading) return <LoadingSpinner />;

  return (
    <PageContainer
      autoTitle
      autoBreadcrumbs
      headerProps={{
        pageIcon: <ClipboardCheck style={{ width: 20, height: 20 }} />,
        pageGradient: `linear-gradient(135deg, ${ct.success.main} 0%, ${ct.success.dark} 100%)`,
      }}
    >
      <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
        <Tabs
          value={tabValue}
          onChange={handleTabChange}
        >
          <Tab
            label='生产质检'
            icon={<ClipboardCheck size={18} />}
            iconPosition='start'
          />
          <Tab
            label='巡检记录'
            icon={<Search size={18} />}
            iconPosition='start'
          />
          <Tab
            label='质检标准'
            icon={<FileCheck size={18} />}
            iconPosition='start'
          />
        </Tabs>
      </Box>

      <TabPanel
        value={tabValue}
        index={0}
      >
        <ListPageTemplate
          title=''
          subtitle=''
          columns={inspectionColumns}
          data={inspections}
          loading={loading}
          filters={filters}
          searchable
          searchPlaceholder='搜索质检单号或产品名称...'
          searchValue={searchTerm}
          onSearch={handleSearch}
          pagination={{
            page: currentPage - 1,
            pageSize,
            total,
            onPageChange: (page) => setCurrentPage(page + 1),
          }}
          selectable
          selectedIds={selectedIds}
          onSelectionChange={(ids) => setSelectedIds(ids.map(String))}
          actions={[
            {
              label: '新增质检',
              icon: <Plus size={16} />,
              onClick: handleOpenCreate,
            },
          ]}
          rowActions={inspectionRowActions}
          emptyMessage='暂无质检数据'
          getRowId={(row) => row.id}
        />
      </TabPanel>

      <TabPanel
        value={tabValue}
        index={1}
      >
        <ListPageTemplate
          title=''
          subtitle=''
          columns={patrolColumns}
          data={patrols}
          loading={loading}
          filters={patrolFilters}
          searchable
          searchPlaceholder='搜索巡检单号或生产线...'
          searchValue={searchTerm}
          onSearch={handleSearch}
          pagination={{
            page: currentPage - 1,
            pageSize,
            total,
            onPageChange: (page) => setCurrentPage(page + 1),
          }}
          selectable
          selectedIds={selectedIds}
          onSelectionChange={(ids) => setSelectedIds(ids.map(String))}
          actions={[
            {
              label: '新增巡检',
              icon: <Plus size={16} />,
              onClick: handleOpenCreate,
            },
          ]}
          rowActions={patrolRowActions}
          emptyMessage='暂无巡检数据'
          getRowId={(row) => row.id}
        />
      </TabPanel>

      <TabPanel
        value={tabValue}
        index={2}
      >
        <ListPageTemplate
          title=''
          subtitle=''
          columns={[
            { id: 'code', label: '标准编号', sortable: true },
            { id: 'name', label: '标准名称', sortable: true },
            { id: 'product_name', label: '适用产品', sortable: true },
            { id: 'inspection_type', label: '质检类型', sortable: true },
            { id: 'version', label: '版本', sortable: true },
            {
              id: 'status',
              label: '状态',
              render: (row) => getStatusBadge(row.status),
            },
          ]}
          data={standards as unknown as QualityItem[]}
          loading={loading}
          filters={filters}
          searchable
          searchPlaceholder='搜索标准编号或名称...'
          searchValue={searchTerm}
          onSearch={handleSearch}
          pagination={{
            page: currentPage - 1,
            pageSize,
            total,
            onPageChange: (page) => setCurrentPage(page + 1),
          }}
          selectable
          selectedIds={selectedIds}
          onSelectionChange={(ids) => setSelectedIds(ids.map(String))}
          actions={[
            {
              label: '新增标准',
              icon: <Plus size={16} />,
              onClick: handleOpenCreate,
            },
          ]}
          rowActions={[
            {
              label: '查看详情',
              icon: <Eye size={16} />,
              onClick: handleViewDetail,
            },
          ]}
          emptyMessage='暂无质检标准'
          getRowId={(row) => row.id}
        />
      </TabPanel>

      {/* 新增/编辑质检对话框 */}
      <Dialog
        open={showDialog && tabValue === 0}
        onClose={() => setShowDialog(false)}
        maxWidth='md'
      >
        <DialogTitle>{selectedItem ? '编辑质检记录' : '新增质检记录'}</DialogTitle>
        <DialogContent>
          <Box
            component='span'
            sx={{
              display: 'block',
              color: 'text.secondary',
              mb: 2,
              fontSize: 14,
            }}
          >
            {selectedItem ? '修改质检记录信息' : '填写新质检记录信息'}
          </Box>
          <form onSubmit={handleSubmitInspection}>
            <Box
              sx={{
                display: 'grid',
                gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' },
                gap: 2,
                py: 2,
              }}
            >
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                <InputLabel htmlFor='product_code'>产品编号 *</InputLabel>
                <TextField
                  id='product_code'
                  required
                  size='small'
                  value={inspectionFormData.product_code}
                  onChange={(e) =>
                    setInspectionFormData({ ...inspectionFormData, product_code: e.target.value })
                  }
                />
              </Box>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                <InputLabel htmlFor='product_name'>产品名称 *</InputLabel>
                <TextField
                  id='product_name'
                  required
                  size='small'
                  value={inspectionFormData.product_name}
                  onChange={(e) =>
                    setInspectionFormData({ ...inspectionFormData, product_name: e.target.value })
                  }
                />
              </Box>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                <InputLabel htmlFor='inspection_type'>质检类型</InputLabel>
                <FormControl
                  fullWidth
                  size='small'
                >
                  <Select
                    id='inspection_type'
                    value={inspectionFormData.inspection_type}
                    onChange={(e) =>
                      setInspectionFormData({
                        ...inspectionFormData,
                        inspection_type: e.target.value,
                      })
                    }
                  >
                    <MenuItem value='first_article'>首件检验</MenuItem>
                    <MenuItem value='routine'>常规检验</MenuItem>
                    <MenuItem value='final'>成品检验</MenuItem>
                    <MenuItem value='spot'>巡检</MenuItem>
                  </Select>
                </FormControl>
              </Box>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                <InputLabel htmlFor='quantity'>数量 *</InputLabel>
                <TextField
                  id='quantity'
                  type='number'
                  required
                  size='small'
                  value={inspectionFormData.quantity}
                  onChange={(e) =>
                    setInspectionFormData({
                      ...inspectionFormData,
                      quantity: parseInt(e.target.value) || 0,
                    })
                  }
                />
              </Box>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                <InputLabel htmlFor='inspector'>质检员</InputLabel>
                <TextField
                  id='inspector'
                  size='small'
                  value={inspectionFormData.inspector || ''}
                  onChange={(e) =>
                    setInspectionFormData({ ...inspectionFormData, inspector: e.target.value })
                  }
                />
              </Box>
              <Box sx={{ gridColumn: '1 / -1', display: 'flex', flexDirection: 'column', gap: 1 }}>
                <InputLabel htmlFor='memo'>备注</InputLabel>
                <TextField
                  id='memo'
                  size='small'
                  multiline
                  rows={2}
                  value={inspectionFormData.memo || ''}
                  onChange={(e) =>
                    setInspectionFormData({ ...inspectionFormData, memo: e.target.value })
                  }
                />
              </Box>
            </Box>
            <DialogActions>
              <Button
                type='button'
                variant='outlined'
                onClick={() => setShowDialog(false)}
              >
                取消
              </Button>
              <Button
                type='submit'
                variant='contained'
              >
                保存
              </Button>
            </DialogActions>
          </form>
        </DialogContent>
      </Dialog>

      {/* 新增/编辑巡检对话框 */}
      <Dialog
        open={showDialog && tabValue === 1}
        onClose={() => setShowDialog(false)}
        maxWidth='md'
      >
        <DialogTitle>{selectedItem ? '编辑巡检记录' : '新增巡检记录'}</DialogTitle>
        <DialogContent>
          <Box
            component='span'
            sx={{
              display: 'block',
              color: 'text.secondary',
              mb: 2,
              fontSize: 14,
            }}
          >
            {selectedItem ? '修改巡检记录信息' : '填写新巡检记录信息'}
          </Box>
          <form onSubmit={handleSubmitPatrol}>
            <Box
              sx={{
                display: 'grid',
                gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' },
                gap: 2,
                py: 2,
              }}
            >
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                <InputLabel htmlFor='production_line'>生产线</InputLabel>
                <TextField
                  id='production_line'
                  size='small'
                  value={patrolFormData.production_line || ''}
                  onChange={(e) =>
                    setPatrolFormData({ ...patrolFormData, production_line: e.target.value })
                  }
                />
              </Box>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                <InputLabel htmlFor='patrol_inspector'>巡检员 *</InputLabel>
                <TextField
                  id='patrol_inspector'
                  required
                  size='small'
                  value={patrolFormData.inspector}
                  onChange={(e) =>
                    setPatrolFormData({ ...patrolFormData, inspector: e.target.value })
                  }
                />
              </Box>
              <Box sx={{ gridColumn: '1 / -1', display: 'flex', flexDirection: 'column', gap: 1 }}>
                <InputLabel htmlFor='findings'>巡检发现</InputLabel>
                <TextField
                  id='findings'
                  size='small'
                  multiline
                  rows={3}
                  value={patrolFormData.findings || ''}
                  onChange={(e) =>
                    setPatrolFormData({ ...patrolFormData, findings: e.target.value })
                  }
                />
              </Box>
              <Box sx={{ gridColumn: '1 / -1', display: 'flex', flexDirection: 'column', gap: 1 }}>
                <InputLabel htmlFor='patrol_memo'>备注</InputLabel>
                <TextField
                  id='patrol_memo'
                  size='small'
                  multiline
                  rows={2}
                  value={patrolFormData.memo || ''}
                  onChange={(e) => setPatrolFormData({ ...patrolFormData, memo: e.target.value })}
                />
              </Box>
            </Box>
            <DialogActions>
              <Button
                type='button'
                variant='outlined'
                onClick={() => setShowDialog(false)}
              >
                取消
              </Button>
              <Button
                type='submit'
                variant='contained'
              >
                保存
              </Button>
            </DialogActions>
          </form>
        </DialogContent>
      </Dialog>

      {/* 详情对话框 */}
      <Dialog
        open={showDetailDialog}
        onClose={() => setShowDetailDialog(false)}
        maxWidth='md'
      >
        <DialogTitle>详情</DialogTitle>
        <DialogContent>
          {selectedItem && (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              {tabValue === 0 && (
                <Box
                  sx={{
                    display: 'grid',
                    gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' },
                    gap: 2,
                  }}
                >
                  <Box>
                    <InputLabel sx={{ color: 'text.secondary', fontSize: 12 }}>质检单号</InputLabel>
                    <Box
                      component='span'
                      sx={{ fontWeight: 500 }}
                    >
                      {(selectedItem as QualityInspection).inspection_no}
                    </Box>
                  </Box>
                  <Box>
                    <InputLabel sx={{ color: 'text.secondary', fontSize: 12 }}>产品名称</InputLabel>
                    <Box component='span'>{(selectedItem as QualityInspection).product_name}</Box>
                  </Box>
                  <Box>
                    <InputLabel sx={{ color: 'text.secondary', fontSize: 12 }}>质检类型</InputLabel>
                    <Box component='span'>
                      {(selectedItem as QualityInspection).inspection_type}
                    </Box>
                  </Box>
                  <Box>
                    <InputLabel sx={{ color: 'text.secondary', fontSize: 12 }}>数量</InputLabel>
                    <Box component='span'>{(selectedItem as QualityInspection).quantity}</Box>
                  </Box>
                  <Box>
                    <InputLabel sx={{ color: 'text.secondary', fontSize: 12 }}>合格数量</InputLabel>
                    <Box component='span'>
                      {(selectedItem as QualityInspection).qualified_quantity}
                    </Box>
                  </Box>
                  <Box>
                    <InputLabel sx={{ color: 'text.secondary', fontSize: 12 }}>
                      不合格数量
                    </InputLabel>
                    <Box component='span'>
                      {(selectedItem as QualityInspection).unqualified_quantity}
                    </Box>
                  </Box>
                  <Box>
                    <InputLabel sx={{ color: 'text.secondary', fontSize: 12 }}>合格率</InputLabel>
                    <Box component='span'>
                      {((selectedItem as QualityInspection).qualification_rate * 100).toFixed(1)}%
                    </Box>
                  </Box>
                  <Box>
                    <InputLabel sx={{ color: 'text.secondary', fontSize: 12 }}>质检员</InputLabel>
                    <Box component='span'>
                      {(selectedItem as QualityInspection).inspector || '-'}
                    </Box>
                  </Box>
                  <Box>
                    <InputLabel sx={{ color: 'text.secondary', fontSize: 12 }}>状态</InputLabel>
                    <Box>{getStatusBadge((selectedItem as QualityInspection).status)}</Box>
                  </Box>
                  <Box>
                    <InputLabel sx={{ color: 'text.secondary', fontSize: 12 }}>质检时间</InputLabel>
                    <Box component='span'>
                      {(selectedItem as QualityInspection).inspection_time
                        ? new Date(
                            (selectedItem as QualityInspection).inspection_time
                          ).toLocaleString('zh-CN')
                        : '-'}
                    </Box>
                  </Box>
                </Box>
              )}

              {tabValue === 1 && (
                <Box
                  sx={{
                    display: 'grid',
                    gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' },
                    gap: 2,
                  }}
                >
                  <Box>
                    <InputLabel sx={{ color: 'text.secondary', fontSize: 12 }}>巡检单号</InputLabel>
                    <Box
                      component='span'
                      sx={{ fontWeight: 500 }}
                    >
                      {(selectedItem as PatrolInspection).patrol_no}
                    </Box>
                  </Box>
                  <Box>
                    <InputLabel sx={{ color: 'text.secondary', fontSize: 12 }}>生产线</InputLabel>
                    <Box component='span'>
                      {(selectedItem as PatrolInspection).production_line || '-'}
                    </Box>
                  </Box>
                  <Box>
                    <InputLabel sx={{ color: 'text.secondary', fontSize: 12 }}>工位</InputLabel>
                    <Box component='span'>
                      {(selectedItem as PatrolInspection).workstation_name || '-'}
                    </Box>
                  </Box>
                  <Box>
                    <InputLabel sx={{ color: 'text.secondary', fontSize: 12 }}>巡检员</InputLabel>
                    <Box component='span'>{(selectedItem as PatrolInspection).inspector}</Box>
                  </Box>
                  <Box>
                    <InputLabel sx={{ color: 'text.secondary', fontSize: 12 }}>巡检时间</InputLabel>
                    <Box component='span'>
                      {new Date((selectedItem as PatrolInspection).patrol_time).toLocaleString(
                        'zh-CN'
                      )}
                    </Box>
                  </Box>
                  <Box>
                    <InputLabel sx={{ color: 'text.secondary', fontSize: 12 }}>状态</InputLabel>
                    <Box>{getStatusBadge((selectedItem as PatrolInspection).status, 'patrol')}</Box>
                  </Box>
                  <Box sx={{ gridColumn: '1 / -1' }}>
                    <InputLabel sx={{ color: 'text.secondary', fontSize: 12 }}>巡检发现</InputLabel>
                    <Box component='span'>{(selectedItem as PatrolInspection).findings || '-'}</Box>
                  </Box>
                </Box>
              )}

              {tabValue === 2 && (
                <Box
                  sx={{
                    display: 'grid',
                    gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' },
                    gap: 2,
                  }}
                >
                  <Box>
                    <InputLabel sx={{ color: 'text.secondary', fontSize: 12 }}>标准编号</InputLabel>
                    <Box
                      component='span'
                      sx={{ fontWeight: 500 }}
                    >
                      {(selectedItem as unknown as QualityStandard).code}
                    </Box>
                  </Box>
                  <Box>
                    <InputLabel sx={{ color: 'text.secondary', fontSize: 12 }}>标准名称</InputLabel>
                    <Box component='span'>{(selectedItem as unknown as QualityStandard).name}</Box>
                  </Box>
                  <Box>
                    <InputLabel sx={{ color: 'text.secondary', fontSize: 12 }}>适用产品</InputLabel>
                    <Box component='span'>
                      {(selectedItem as unknown as QualityStandard).product_name || '-'}
                    </Box>
                  </Box>
                  <Box>
                    <InputLabel sx={{ color: 'text.secondary', fontSize: 12 }}>质检类型</InputLabel>
                    <Box component='span'>
                      {(selectedItem as unknown as QualityStandard).inspection_type}
                    </Box>
                  </Box>
                  <Box>
                    <InputLabel sx={{ color: 'text.secondary', fontSize: 12 }}>版本</InputLabel>
                    <Box component='span'>
                      {(selectedItem as unknown as QualityStandard).version || '-'}
                    </Box>
                  </Box>
                  <Box>
                    <InputLabel sx={{ color: 'text.secondary', fontSize: 12 }}>状态</InputLabel>
                    <Box>{getStatusBadge((selectedItem as unknown as QualityStandard).status)}</Box>
                  </Box>
                  <Box sx={{ gridColumn: '1 / -1' }}>
                    <InputLabel sx={{ color: 'text.secondary', fontSize: 12 }}>描述</InputLabel>
                    <Box component='span'>
                      {(selectedItem as unknown as QualityStandard).description || '-'}
                    </Box>
                  </Box>
                </Box>
              )}
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button
            variant='outlined'
            onClick={() => setShowDetailDialog(false)}
          >
            关闭
          </Button>
        </DialogActions>
      </Dialog>
    </PageContainer>
  );
};

export default MesQualityPage;
