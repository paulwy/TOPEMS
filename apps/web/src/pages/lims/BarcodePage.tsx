import React, { useState, useEffect, useCallback } from 'react';
import { PageContainer } from '@/components/common';
import { useNavigate } from 'react-router-dom';
import {
  Barcode,
  Plus,
  Edit,
  Eye,
  Download,
  Upload,
  Filter,
  Trash2,
  Printer,
  ScanLine,
} from 'lucide-react';
import {
  Box,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Chip,
  Card,
  CardContent,
  Typography,
  MenuItem,
  Button,
} from '@mui/material';
import {
  ListPageTemplate,
  type ColumnDef,
  type FilterConfig,
  type RowAction,
} from '@/components/templates';
import { limsApi } from '@/api/lims';
import type {
  Barcode as BarcodeType,
  CreateBarcodeRequest,
  UpdateBarcodeRequest,
} from '@/api/lims';
import { useAppStore } from '@/store';
import { apiLogger } from '@/utils/logger';
import { designTokens } from '@/theme/tokens';

const ct = designTokens.colors;

const BarcodePage: React.FC = () => {
  const navigate = useNavigate();
  const [barcodes, setBarcodes] = useState<BarcodeType[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedBarcode, setSelectedBarcode] = useState<BarcodeType | null>(null);
  const [formData, setFormData] = useState<CreateBarcodeRequest>({
    barcode_type: '',
    sample_id: '',
    format: 'CODE128',
    content: '',
    quantity: 1,
    prefix: '',
  });
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(10);
  const [isEditing, setIsEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [barcodeTypes, setBarcodeTypes] = useState<{ id: string; name: string; code: string }[]>(
    []
  );
  const addNotification = useAppStore((state) => state.addNotification);

  const loadBarcodes = useCallback(async () => {
    try {
      setLoading(true);
      const response = await limsApi.listBarcodes();
      if (response.success && response.data) {
        const data = response.data as any;
        let rawBarcodes: BarcodeType[] = [];
        if (Array.isArray(data)) {
          rawBarcodes = data;
        } else if (data.items && Array.isArray(data.items)) {
          rawBarcodes = data.items;
        }
        setBarcodes(rawBarcodes);
      } else {
        setBarcodes([]);
      }
    } catch (err: unknown) {
      apiLogger.error('加载条码列表失败:', err);
      setBarcodes([]);
      addNotification({
        title: '错误',
        message: '加载条码列表失败，请稍后重试',
        type: 'error',
      });
    } finally {
      setLoading(false);
    }
  }, [addNotification]);

  const loadBarcodeTypes = useCallback(async () => {
    try {
      const response = await limsApi.getBarcodeTypes();
      if (response.success && response.data) {
        const data = response.data as any;
        if (Array.isArray(data)) {
          setBarcodeTypes(data);
        } else if (data.items && Array.isArray(data.items)) {
          setBarcodeTypes(data.items);
        }
      }
    } catch (err: unknown) {
      apiLogger.error('加载条码类型失败:', err);
    }
  }, []);

  useEffect(() => {
    loadBarcodes();
    loadBarcodeTypes();
  }, [loadBarcodes, loadBarcodeTypes]);

  const getStatusBadge = (status: string) => {
    const statusMap: Record<string, { bg: string; color: string }> = {
      正常: { bg: 'success.lighter', color: 'success.dark' },
      已打印: { bg: 'info.lighter', color: 'info.dark' },
      已扫描: { bg: 'primary.lighter', color: 'primary.dark' },
      停用: { bg: 'grey.100', color: 'text.secondary' },
      normal: { bg: 'success.lighter', color: 'success.dark' },
      printed: { bg: 'info.lighter', color: 'info.dark' },
      scanned: { bg: 'primary.lighter', color: 'primary.dark' },
      disabled: { bg: 'grey.100', color: 'text.secondary' },
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

  const columns: ColumnDef<BarcodeType>[] = [
    { id: 'barcode', label: '条码' },
    { id: 'barcode_type', label: '条码类型' },
    { id: 'format', label: '格式' },
    {
      id: 'sample_name',
      label: '关联样品',
      render: (row) => row.sample_name || '-',
    },
    {
      id: 'status',
      label: '状态',
      render: (row) => getStatusBadge(row.status || '正常'),
    },
    {
      id: 'generated_at',
      label: '生成时间',
      render: (row) =>
        row.generated_at ? new Date(row.generated_at).toLocaleDateString('zh-CN') : '-',
    },
    {
      id: 'printed_at',
      label: '打印时间',
      render: (row) =>
        row.printed_at ? new Date(row.printed_at).toLocaleDateString('zh-CN') : '-',
    },
  ];

  const rowActions: RowAction<BarcodeType>[] = [
    {
      label: '查看',
      icon: <Eye style={{ width: 16, height: 16 }} />,
      onClick: (row) => handleView(row),
    },
    {
      label: '打印',
      icon: <Printer style={{ width: 16, height: 16 }} />,
      onClick: (row) => handlePrint(row),
    },
    {
      label: '编辑',
      icon: <Edit style={{ width: 16, height: 16 }} />,
      onClick: (row) => handleEdit(row),
    },
  ];

  const filters: FilterConfig[] = [
    {
      id: 'barcode_type',
      label: '条码类型',
      type: 'select',
      options: [
        { label: '全部类型', value: 'all' },
        ...barcodeTypes.map((t) => ({ label: t.name, value: t.code })),
      ],
      value: typeFilter,
      onChange: (value: unknown) => setTypeFilter(value as string),
    },
    {
      id: 'status',
      label: '状态',
      type: 'select',
      options: [
        { label: '全部状态', value: 'all' },
        { label: '正常', value: '正常' },
        { label: '已打印', value: '已打印' },
        { label: '已扫描', value: '已扫描' },
        { label: '停用', value: '停用' },
      ],
      value: statusFilter,
      onChange: (value: unknown) => setStatusFilter(value as string),
    },
  ];

  const filteredBarcodes = barcodes.filter((barcode) => {
    const matchesSearch =
      barcode.barcode.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (barcode.sample_name || '').toLowerCase().includes(searchTerm.toLowerCase());
    const matchesType = typeFilter === 'all' || barcode.barcode_type === typeFilter;
    const matchesStatus = statusFilter === 'all' || barcode.status === statusFilter;
    return matchesSearch && matchesType && matchesStatus;
  });

  const paginatedData = filteredBarcodes.slice(page * pageSize, page * pageSize + pageSize);

  const handleView = (barcode: BarcodeType) => {
    setSelectedBarcode(barcode);
    setShowDetailModal(true);
  };

  const handleEdit = (barcode: BarcodeType) => {
    setSelectedBarcode(barcode);
    setIsEditing(true);
    setFormData({
      barcode_type: barcode.barcode_type,
      sample_id: barcode.sample_id || '',
      format: barcode.format,
      content: barcode.content || '',
    });
    setShowCreateModal(true);
  };

  const handleCreate = () => {
    setSelectedBarcode(null);
    setIsEditing(false);
    setFormData({
      barcode_type: '',
      sample_id: '',
      format: 'CODE128',
      content: '',
      quantity: 1,
      prefix: '',
    });
    setShowCreateModal(true);
  };

  const handlePrint = async (barcode: BarcodeType) => {
    try {
      const response = await limsApi.printBarcode({ barcode_ids: [barcode.id] });
      if (response.success) {
        addNotification({
          title: '成功',
          message: '条码已开始打印',
          type: 'success',
        });
        loadBarcodes();
      } else {
        addNotification({
          title: '错误',
          message: response.message || '打印失败，请稍后重试',
          type: 'error',
        });
      }
    } catch (err: unknown) {
      apiLogger.error('打印条码失败:', err);
      addNotification({
        title: '错误',
        message: '打印条码失败，请稍后重试',
        type: 'error',
      });
    }
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      if (isEditing && selectedBarcode) {
        const response = await limsApi.updateBarcode(selectedBarcode.id, {
          ...formData,
          status: (formData as any).status || selectedBarcode.status,
        } as UpdateBarcodeRequest);
        if (response.success) {
          addNotification({
            title: '成功',
            message: '条码更新成功',
            type: 'success',
          });
          setShowCreateModal(false);
          loadBarcodes();
        } else {
          addNotification({
            title: '错误',
            message: response.message || '更新失败，请稍后重试',
            type: 'error',
          });
        }
      } else {
        const response = await limsApi.generateBarcode(formData);
        if (response.success) {
          addNotification({
            title: '成功',
            message: '条码生成成功',
            type: 'success',
          });
          setShowCreateModal(false);
          loadBarcodes();
        } else {
          addNotification({
            title: '错误',
            message: response.message || '生成失败，请稍后重试',
            type: 'error',
          });
        }
      }
    } catch (err: unknown) {
      apiLogger.error('保存条码失败:', err);
      addNotification({
        title: '错误',
        message: isEditing ? '更新条码失败，请稍后重试' : '生成条码失败，请稍后重试',
        type: 'error',
      });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (barcode: BarcodeType) => {
    if (!confirm(`确定要删除条码 "${barcode.barcode}" 吗？`)) return;
    try {
      const response = await limsApi.deleteBarcode(barcode.id);
      if (response.success) {
        addNotification({
          title: '成功',
          message: '条码删除成功',
          type: 'success',
        });
        setShowDetailModal(false);
        loadBarcodes();
      } else {
        addNotification({
          title: '错误',
          message: response.message || '删除失败，请稍后重试',
          type: 'error',
        });
      }
    } catch (err: unknown) {
      apiLogger.error('删除条码失败:', err);
      addNotification({
        title: '错误',
        message: '删除条码失败，请稍后重试',
        type: 'error',
      });
    }
  };

  const handleScan = async (barcode: BarcodeType) => {
    try {
      const response = await limsApi.scanBarcode(barcode.barcode);
      if (response.success) {
        addNotification({
          title: '扫描成功',
          message: `条码 ${barcode.barcode} 扫描成功`,
          type: 'success',
        });
        loadBarcodes();
      } else {
        addNotification({
          title: '扫描失败',
          message: response.message || '条码扫描失败，请稍后重试',
          type: 'error',
        });
      }
    } catch (err: unknown) {
      apiLogger.error('扫描条码失败:', err);
      addNotification({
        title: '错误',
        message: '扫描条码失败，请稍后重试',
        type: 'error',
      });
    }
  };

  const stats = {
    total: barcodes.length,
    normal: barcodes.filter((b) => b.status === '正常' || b.status === 'normal').length,
    printed: barcodes.filter((b) => b.status === '已打印' || b.status === 'printed').length,
    scanned: barcodes.filter((b) => b.status === '已扫描' || b.status === 'scanned').length,
  };

  const statsCards = (
    <Box
      sx={{
        display: 'grid',
        gridTemplateColumns: { xs: 'repeat(1, 1fr)', md: 'repeat(4, 1fr)' },
        gap: 2,
        mb: 3,
      }}
    >
      <Card sx={{ bgcolor: 'teal.light' }}>
        <CardContent sx={{ p: 2 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <Box
              sx={{
                width: 40,
                height: 40,
                bgcolor: 'success.lighter',
                borderRadius: 3,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Barcode sx={{ width: 20, height: 20, color: 'info.main' }} />
            </Box>
            <Box>
              <Typography
                variant='body2'
                sx={{ color: 'slate.600', fontSize: '0.875rem' }}
              >
                条码总数
              </Typography>
              <Typography
                variant='h5'
                sx={{ fontWeight: 700, color: 'slate.900' }}
              >
                {stats.total}
              </Typography>
            </Box>
          </Box>
        </CardContent>
      </Card>
      <Card>
        <CardContent sx={{ p: 2 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <Box
              sx={{
                width: 40,
                height: 40,
                bgcolor: 'success.lighter',
                borderRadius: 3,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Barcode sx={{ width: 20, height: 20, color: 'success.main' }} />
            </Box>
            <Box>
              <Typography
                variant='body2'
                sx={{ color: 'slate.600', fontSize: '0.875rem' }}
              >
                正常
              </Typography>
              <Typography
                variant='h5'
                sx={{ fontWeight: 700, color: 'slate.900' }}
              >
                {stats.normal}
              </Typography>
            </Box>
          </Box>
        </CardContent>
      </Card>
      <Card>
        <CardContent sx={{ p: 2 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <Box
              sx={{
                width: 40,
                height: 40,
                bgcolor: 'info.lighter',
                borderRadius: 3,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Printer sx={{ width: 20, height: 20, color: 'info.main' }} />
            </Box>
            <Box>
              <Typography
                variant='body2'
                sx={{ color: 'slate.600', fontSize: '0.875rem' }}
              >
                已打印
              </Typography>
              <Typography
                variant='h5'
                sx={{ fontWeight: 700, color: 'slate.900' }}
              >
                {stats.printed}
              </Typography>
            </Box>
          </Box>
        </CardContent>
      </Card>
      <Card>
        <CardContent sx={{ p: 2 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <Box
              sx={{
                width: 40,
                height: 40,
                bgcolor: 'primary.lighter',
                borderRadius: 3,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <ScanLine sx={{ width: 20, height: 20, color: 'primary.main' }} />
            </Box>
            <Box>
              <Typography
                variant='body2'
                sx={{ color: 'slate.600', fontSize: '0.875rem' }}
              >
                已扫描
              </Typography>
              <Typography
                variant='h5'
                sx={{ fontWeight: 700, color: 'slate.900' }}
              >
                {stats.scanned}
              </Typography>
            </Box>
          </Box>
        </CardContent>
      </Card>
    </Box>
  );

  if (loading) {
    return (
      <Box
        sx={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: `linear-gradient(135deg, ${ct.teal[50]} 0%, ${ct.background.default} 100%)`,
        }}
      >
        <Box sx={{ textAlign: 'center' }}>
          <Box
            sx={{
              width: 48,
              height: 48,
              border: 4,
              borderColor: 'info.main',
              borderTopColor: 'cyan.dark',
              borderRadius: '50%',
              animation: 'spin 1s linear infinite',
              mx: 'auto',
              mb: 2,
            }}
          />
          <Typography sx={{ color: 'slate.600' }}>加载中...</Typography>
        </Box>
      </Box>
    );
  }

  return (
    <PageContainer
      title='条码管理'
      subtitle='Barcode Management'
      headerProps={{
        pageIcon: <Barcode style={{ width: 20, height: 20 }} />,
        pageGradient: `linear-gradient(135deg, ${ct.teal[400]} 0%, ${ct.teal[600]} 100%)`,
      }}
    >
      <ListPageTemplate
        title=''
        subtitle=''
        breadcrumbs={[
          { label: '首页', href: '/dashboard' },
          { label: 'LIMS' },
          { label: '条码管理' },
        ]}
        backButton={{ onClick: () => navigate('/dashboard') }}
        columns={columns}
        data={paginatedData}
        loading={loading}
        getRowId={(row) => row.id}
        filters={filters}
        searchable
        searchPlaceholder='搜索条码或样品名称...'
        searchValue={searchTerm}
        onSearch={setSearchTerm}
        pagination={{
          page,
          pageSize,
          total: filteredBarcodes.length,
          onPageChange: setPage,
          onPageSizeChange: setPageSize,
        }}
        actions={[
          {
            label: '导入',
            icon: <Upload style={{ width: 18, height: 18 }} />,
            variant: 'outlined',
          },
          {
            label: '导出',
            icon: <Download style={{ width: 18, height: 18 }} />,
            variant: 'outlined',
          },
          {
            label: '生成条码',
            icon: <Plus style={{ width: 18, height: 18 }} />,
            onClick: handleCreate,
            variant: 'contained',
          },
        ]}
        rowActions={rowActions}
        headerContent={statsCards}
      />

      <Dialog
        open={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        maxWidth='sm'
        fullWidth
      >
        <DialogTitle>{isEditing ? '编辑条码' : '生成条码'}</DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 1, display: 'flex', flexDirection: 'column', gap: 2 }}>
            <TextField
              fullWidth
              select
              label='条码类型 *'
              value={formData.barcode_type}
              onChange={(e) => setFormData({ ...formData, barcode_type: e.target.value })}
            >
              {barcodeTypes.map((t) => (
                <MenuItem
                  key={t.id}
                  value={t.code}
                >
                  {t.name}
                </MenuItem>
              ))}
            </TextField>
            <TextField
              fullWidth
              select
              label='条码格式'
              value={formData.format}
              onChange={(e) => setFormData({ ...formData, format: e.target.value })}
            >
              <MenuItem value='CODE128'>CODE128</MenuItem>
              <MenuItem value='CODE39'>CODE39</MenuItem>
              <MenuItem value='EAN13'>EAN13</MenuItem>
              <MenuItem value='EAN8'>EAN8</MenuItem>
              <MenuItem value='UPC'>UPC</MenuItem>
              <MenuItem value='QR_CODE'>二维码</MenuItem>
            </TextField>
            <TextField
              fullWidth
              label='关联样品ID'
              value={formData.sample_id}
              onChange={(e) => setFormData({ ...formData, sample_id: e.target.value })}
              placeholder='请输入样品ID'
            />
            <TextField
              fullWidth
              label='条码内容'
              value={formData.content}
              onChange={(e) => setFormData({ ...formData, content: e.target.value })}
              placeholder='请输入条码内容'
            />
            {!isEditing && (
              <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2 }}>
                <TextField
                  fullWidth
                  label='生成数量'
                  type='number'
                  value={formData.quantity ?? 1}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      quantity: e.target.value ? Number(e.target.value) : 1,
                    })
                  }
                  placeholder='请输入生成数量'
                />
                <TextField
                  fullWidth
                  label='前缀'
                  value={formData.prefix}
                  onChange={(e) => setFormData({ ...formData, prefix: e.target.value })}
                  placeholder='请输入前缀'
                />
              </Box>
            )}
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
            disabled={saving}
            sx={{ bgcolor: 'info.main' }}
          >
            {saving ? '处理中...' : isEditing ? '保存' : '生成'}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog
        open={showDetailModal}
        onClose={() => setShowDetailModal(false)}
        maxWidth='md'
        fullWidth
      >
        <DialogTitle>条码详情</DialogTitle>
        <DialogContent>
          {selectedBarcode && (
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
                  条码
                </Box>
                <Box sx={{ fontWeight: 500, fontFamily: 'monospace' }}>
                  {selectedBarcode.barcode}
                </Box>
              </Box>
              <Box>
                <Box
                  component='span'
                  sx={{ color: 'text.secondary', fontSize: '0.875rem' }}
                >
                  条码类型
                </Box>
                <Box>{selectedBarcode.barcode_type}</Box>
              </Box>
              <Box>
                <Box
                  component='span'
                  sx={{ color: 'text.secondary', fontSize: '0.875rem' }}
                >
                  格式
                </Box>
                <Box>{selectedBarcode.format}</Box>
              </Box>
              <Box>
                <Box
                  component='span'
                  sx={{ color: 'text.secondary', fontSize: '0.875rem' }}
                >
                  状态
                </Box>
                <Box sx={{ mt: 0.5 }}>{getStatusBadge(selectedBarcode.status || '正常')}</Box>
              </Box>
              <Box>
                <Box
                  component='span'
                  sx={{ color: 'text.secondary', fontSize: '0.875rem' }}
                >
                  关联样品
                </Box>
                <Box>{selectedBarcode.sample_name || '-'}</Box>
              </Box>
              <Box>
                <Box
                  component='span'
                  sx={{ color: 'text.secondary', fontSize: '0.875rem' }}
                >
                  内容
                </Box>
                <Box>{selectedBarcode.content || '-'}</Box>
              </Box>
              <Box>
                <Box
                  component='span'
                  sx={{ color: 'text.secondary', fontSize: '0.875rem' }}
                >
                  生成时间
                </Box>
                <Box>
                  {selectedBarcode.generated_at
                    ? new Date(selectedBarcode.generated_at).toLocaleString('zh-CN')
                    : '-'}
                </Box>
              </Box>
              <Box>
                <Box
                  component='span'
                  sx={{ color: 'text.secondary', fontSize: '0.875rem' }}
                >
                  打印时间
                </Box>
                <Box>
                  {selectedBarcode.printed_at
                    ? new Date(selectedBarcode.printed_at).toLocaleString('zh-CN')
                    : '-'}
                </Box>
              </Box>
              <Box>
                <Box
                  component='span'
                  sx={{ color: 'text.secondary', fontSize: '0.875rem' }}
                >
                  扫描时间
                </Box>
                <Box>
                  {selectedBarcode.scanned_at
                    ? new Date(selectedBarcode.scanned_at).toLocaleString('zh-CN')
                    : '-'}
                </Box>
              </Box>
              <Box>
                <Box
                  component='span'
                  sx={{ color: 'text.secondary', fontSize: '0.875rem' }}
                >
                  创建人
                </Box>
                <Box>{selectedBarcode.created_by || '-'}</Box>
              </Box>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button
            variant='outlined'
            color='primary'
            startIcon={<ScanLine style={{ width: 16, height: 16 }} />}
            onClick={() => selectedBarcode && handleScan(selectedBarcode)}
          >
            扫描
          </Button>
          <Button
            variant='outlined'
            startIcon={<Printer style={{ width: 16, height: 16 }} />}
            onClick={() => selectedBarcode && handlePrint(selectedBarcode)}
          >
            打印
          </Button>
          <Button
            variant='outlined'
            color='error'
            startIcon={<Trash2 style={{ width: 16, height: 16 }} />}
            onClick={() => selectedBarcode && handleDelete(selectedBarcode)}
          >
            删除
          </Button>
          <Box sx={{ flex: 1 }} />
          <Button onClick={() => setShowDetailModal(false)}>关闭</Button>
          <Button
            variant='contained'
            onClick={() => {
              setShowDetailModal(false);
              if (selectedBarcode) {
                handleEdit(selectedBarcode);
              }
            }}
            sx={{ bgcolor: 'info.main' }}
          >
            编辑
          </Button>
        </DialogActions>
      </Dialog>
    </PageContainer>
  );
};

export default BarcodePage;
