import {
  Box,
  Chip,
  Typography,
  TextField,
  Dialog,
  DialogTitle,
  DialogContent,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Button,
} from '@mui/material';
import { PageContainer } from '@/components/common';
import React, { useState, useEffect, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Edit, ClipboardCheck } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { assetApi, type Asset } from '@/api/erp';
import { mesEquipmentApi, type InspectionRecord, type CreateInspectionRecord } from '@/api/mes';
import { ASSET_PATHS } from '@/modules/asset/config';
import { useNotificationStore } from '../../store';
import { ListPageTemplate, type ColumnDef, type RowAction } from '@/components/templates';
import { apiLogger } from '@/utils/logger';

const STATUS_COLOR_MAP: Record<string, 'success' | 'error' | 'default'> = {
  normal: 'success',
  abnormal: 'error',
};

const STATUS_LABEL_MAP: Record<string, string> = {
  normal: '正常',
  abnormal: '异常',
};

const EquipmentInspectionPage: React.FC = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const addNotification = useNotificationStore((state) => state.addNotification);

  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [currentPage, setCurrentPage] = useState(0);
  const [pageSize, setPageSize] = useState(20);

  const [showInspectionModal, setShowInspectionModal] = useState(false);
  const [selectedForInspection, setSelectedForInspection] = useState<Asset | null>(null);

  const [newInspection, setNewInspection] = useState<Partial<InspectionRecord>>({
    inspector: '',
    inspection_date: new Date().toISOString().split('T')[0],
    status: 'normal',
  });

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchQuery);
      setCurrentPage(0);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  const assetsQuery = useQuery({
    queryKey: ['erp-assets'],
    queryFn: async () => {
      const response = await assetApi.list();
      if (!response.success || !response.data) {
        throw new Error(response.message || '加载资产列表失败');
      }
      return response.data.items || [];
    },
    staleTime: 10 * 60 * 1000,
    retry: 2,
  });

  const assets = assetsQuery.data ?? [];

  const inspectionsQuery = useQuery({
    queryKey: ['mes-inspections', currentPage, pageSize, debouncedSearch],
    queryFn: async () => {
      const params: Record<string, unknown> = {
        page: currentPage + 1,
        pagesize: pageSize,
      };
      if (debouncedSearch) {
        params.search = debouncedSearch;
      }

      const response = await mesEquipmentApi.listInspections(params);
      if (!response.success || !response.data) {
        throw new Error(response.message || '加载点检记录失败');
      }
      return {
        items: response.data.items || [],
        total: response.data.total || 0,
      };
    },
    staleTime: 5 * 60 * 1000,
    retry: 2,
  });

  const inspections = inspectionsQuery.data?.items ?? [];
  const totalInspections = inspectionsQuery.data?.total ?? 0;
  const loading = inspectionsQuery.isLoading || assetsQuery.isLoading;
  const error = inspectionsQuery.error?.message || assetsQuery.error?.message;

  const createMutation = useMutation({
    mutationFn: async (data: CreateInspectionRecord) => {
      const response = await mesEquipmentApi.createInspection(data);
      if (!response.success) {
        throw new Error(response.message || '创建点检记录失败');
      }
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['mes-inspections'] });
      addNotification({
        title: '成功',
        message: '点检记录创建成功',
        type: 'success',
      });
      setShowInspectionModal(false);
      setSelectedForInspection(null);
    },
    onError: (err: unknown) => {
      apiLogger.error('创建点检记录失败:', err);
      const message = (err as { message?: string }).message || '创建点检记录失败';
      addNotification({
        title: '失败',
        message,
        type: 'error',
      });
    },
  });

  const handleCreateInspection = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedForInspection) return;

    const data = {
      equipment_id: selectedForInspection.id,
      inspector: newInspection.inspector || '',
      inspection_date: newInspection.inspection_date || '',
      status: newInspection.status || 'normal',
      location: newInspection.location,
      temperature: newInspection.temperature,
      vibration: newInspection.vibration,
      noiselevel: newInspection.noiselevel,
      abnormalities: newInspection.abnormalities,
      remarks: newInspection.remarks,
    };

    await createMutation.mutateAsync(data as CreateInspectionRecord);
  };

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  const handlePageSizeChange = (size: number) => {
    setPageSize(size);
    setCurrentPage(0);
  };

  const handleRefresh = () => {
    queryClient.invalidateQueries({ queryKey: ['mes-inspections'] });
    queryClient.invalidateQueries({ queryKey: ['erp-assets'] });
  };

  const getStatusBadge = (status: string) => (
    <Chip
      size='small'
      color={STATUS_COLOR_MAP[status] || 'default'}
      label={STATUS_LABEL_MAP[status] || status}
      variant='outlined'
    />
  );

  const columns = useMemo<ColumnDef<InspectionRecord>[]>(
    () => [
      {
        id: 'equipment_code',
        label: '设备编号',
        width: 140,
        sortable: true,
        render: (row) => (
          <Typography sx={{ fontWeight: 500, color: 'grey.900' }}>{row.equipment_code}</Typography>
        ),
      },
      {
        id: 'equipment_name',
        label: '设备名称',
        width: 180,
        render: (row) => <Typography sx={{ color: 'grey.900' }}>{row.equipment_name}</Typography>,
      },
      {
        id: 'inspector',
        label: '点检人',
        width: 100,
        render: (row) => (
          <Typography sx={{ fontSize: '0.875rem', color: 'grey.600' }}>
            {row.inspector || '-'}
          </Typography>
        ),
      },
      {
        id: 'inspection_date',
        label: '点检日期',
        width: 130,
        sortable: true,
        render: (row) => (
          <Typography sx={{ fontSize: '0.875rem', color: 'grey.600' }}>
            {row.inspection_date}
          </Typography>
        ),
      },
      {
        id: 'temperature',
        label: '温度(°C)',
        width: 100,
        align: 'right',
        render: (row) => (
          <Typography sx={{ fontSize: '0.875rem', color: 'grey.600' }}>
            {row.temperature || '-'}
          </Typography>
        ),
      },
      {
        id: 'status',
        label: '状态',
        width: 100,
        render: (row) => getStatusBadge(row.status),
      },
      {
        id: 'abnormalities',
        label: '异常情况',
        minWidth: 150,
        render: (row) => (
          <Typography sx={{ fontSize: '0.875rem', color: 'grey.600' }}>
            {row.abnormalities || '-'}
          </Typography>
        ),
      },
    ],
    []
  );

  const rowActions = useMemo<RowAction<InspectionRecord>[]>(
    () => [
      {
        label: '编辑',
        icon: <Edit sx={{ width: 16, height: 16 }} />,
        onClick: () => {
          addNotification({
            title: '提示',
            message: '编辑功能开发中',
            type: 'info',
          });
        },
      },
    ],
    [addNotification]
  );

  return (
    <PageContainer
      sx={{ minHeight: '100vh', backgroundColor: 'background.default' }}
      title='设备点检记录'
      subtitle='设备点检记录管理'
    >
      <ListPageTemplate
        title=''
        subtitle=''
        backButton={{
          onClick: () => navigate(ASSET_PATHS.equipment),
        }}
        columns={columns}
        data={inspections}
        loading={loading}
        error={error || undefined}
        getRowId={(row) => row.id}
        sortable
        defaultSortBy='inspection_date'
        defaultSortOrder='desc'
        searchable
        searchPlaceholder='搜索设备名称、编号、点检人...'
        searchValue={searchQuery}
        onSearch={setSearchQuery}
        pagination={{
          page: currentPage,
          pageSize,
          total: totalInspections,
          onPageChange: handlePageChange,
          onPageSizeChange: handlePageSizeChange,
        }}
        rowActions={rowActions}
        onRefresh={handleRefresh}
        actions={[
          {
            label: '新增点检',
            icon: <Plus sx={{ width: 16, height: 16 }} />,
            onClick: () => {
              setSelectedForInspection(assets[0] || null);
              setShowInspectionModal(true);
            },
            variant: 'contained',
          },
        ]}
        showRowNumber
        columnConfigurable
        persistColumnConfig
        columnConfigStorageKey='equipment-inspections-columns'
      />

      <Dialog
        open={showInspectionModal}
        onClose={() => setShowInspectionModal(false)}
        maxWidth='md'
        fullWidth
      >
        <DialogTitle>设备点检记录</DialogTitle>
        <DialogContent>
          <form onSubmit={handleCreateInspection}>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 2 }}>
              <Box sx={{ backgroundColor: 'grey.50', p: 2, borderRadius: 3 }}>
                <Typography
                  sx={{
                    fontSize: '0.875rem',
                    fontWeight: 500,
                    color: 'text.secondary',
                  }}
                >
                  设备: {selectedForInspection?.name} ({selectedForInspection?.asset_number})
                </Typography>
              </Box>

              <Box
                sx={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(2, 1fr)',
                  gap: 2,
                }}
              >
                <TextField
                  label='点检人 *'
                  value={newInspection.inspector || ''}
                  onChange={(e) =>
                    setNewInspection({
                      ...newInspection,
                      inspector: e.target.value,
                    })
                  }
                  fullWidth
                  required
                />
                <TextField
                  label='点检日期 *'
                  type='date'
                  value={newInspection.inspection_date || ''}
                  onChange={(e) =>
                    setNewInspection({
                      ...newInspection,
                      inspection_date: e.target.value,
                    })
                  }
                  fullWidth
                  required
                  slotProps={{ inputLabel: { shrink: true } } as any}
                />
              </Box>

              <Box
                sx={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(3, 1fr)',
                  gap: 2,
                }}
              >
                <TextField
                  label='温度 (°C)'
                  type='number'
                  slotProps={{ htmlInput: { step: '0.1' } }}
                  value={newInspection.temperature || ''}
                  onChange={(e) =>
                    setNewInspection({
                      ...newInspection,
                      temperature: Number(e.target.value),
                    })
                  }
                  fullWidth
                />
                <TextField
                  label='振动'
                  type='number'
                  slotProps={{ htmlInput: { step: '0.01' } }}
                  value={newInspection.vibration || ''}
                  onChange={(e) =>
                    setNewInspection({
                      ...newInspection,
                      vibration: Number(e.target.value),
                    })
                  }
                  fullWidth
                />
                <TextField
                  label='噪音 (dB)'
                  type='number'
                  slotProps={{ htmlInput: { step: '0.1' } }}
                  value={newInspection.noiselevel || ''}
                  onChange={(e) =>
                    setNewInspection({
                      ...newInspection,
                      noiselevel: Number(e.target.value),
                    })
                  }
                  fullWidth
                />
              </Box>

              <FormControl fullWidth>
                <InputLabel>点检状态</InputLabel>
                <Select
                  value={newInspection.status || 'normal'}
                  label='点检状态'
                  onChange={(e) =>
                    setNewInspection({
                      ...newInspection,
                      status: e.target.value,
                    })
                  }
                >
                  <MenuItem value='normal'>正常</MenuItem>
                  <MenuItem value='abnormal'>异常</MenuItem>
                </Select>
              </FormControl>

              <TextField
                label='异常情况'
                multiline
                rows={3}
                value={newInspection.abnormalities || ''}
                onChange={(e) =>
                  setNewInspection({
                    ...newInspection,
                    abnormalities: e.target.value,
                  })
                }
                fullWidth
              />

              <TextField
                label='备注'
                multiline
                rows={2}
                value={newInspection.remarks || ''}
                onChange={(e) =>
                  setNewInspection({
                    ...newInspection,
                    remarks: e.target.value,
                  })
                }
                fullWidth
              />
            </Box>

            <Box
              sx={{
                mt: 3,
                display: 'flex',
                justifyContent: 'flex-end',
                gap: 1,
              }}
            >
              <Button
                variant='outlined'
                onClick={() => setShowInspectionModal(false)}
              >
                取消
              </Button>
              <Button
                variant='contained'
                type='submit'
                disabled={createMutation.isPending}
              >
                {createMutation.isPending ? '提交中...' : '提交'}
              </Button>
            </Box>
          </form>
        </DialogContent>
      </Dialog>
    </PageContainer>
  );
};

export default EquipmentInspectionPage;
