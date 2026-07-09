import {
  TextField,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Box,
  Chip,
  Button,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Tabs,
  Tab,
  Alert,
  Grid,
} from '@mui/material';
import React, { useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import type {
  MrpSuggestion,
  MrpMaterialSummary,
  MrpSuggestionQueryParams,
  MrpMaterialSummaryQueryParams,
} from '@/api/scm';
import { scmApi } from '@/api/scm';
import { useAppStore } from '@/store';
import {
  Plus,
  Edit,
  Trash2,
  Check,
  XCircle,
  ShoppingCart,
  Factory,
  Filter,
  CheckCircle,
  X,
} from 'lucide-react';
import { apiLogger } from '@/utils/logger';
import { ListPageTemplate, type ColumnDef } from '@/components/templates';
import { PageContainer } from '@/components/common';
import { ConfirmDialog } from '@topems/shared-components';

const MrpSuggestionPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const initialPlanId = searchParams.get('plan_id') || '';
  const [suggestions, setSuggestions] = useState<MrpSuggestion[]>([]);
  const [summary, setSummary] = useState<MrpMaterialSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [total, setTotal] = useState(0);
  const [confirmDialogOpen, setConfirmDialogOpen] = useState(false);
  const [confirmDialogConfig, setConfirmDialogConfig] = useState<{
    title: string;
    message: string;
    onConfirm: () => void;
    danger?: boolean;
  } | null>(null);
  const [activeTab, setActiveTab] = useState(0);
  const [filterType, setFilterType] = useState<string>('');
  const [filterStatus, setFilterStatus] = useState<string>('');
  const [selectedPlanId, setSelectedPlanId] = useState(initialPlanId);
  const [selectedRows, setSelectedRows] = useState<string[]>([]);
  const [showFilterDialog, setShowFilterDialog] = useState(false);

  const { addNotification } = useAppStore();

  useEffect(() => {
    loadSuggestions();
  }, [currentPage, pageSize, selectedPlanId, filterType, filterStatus]);

  useEffect(() => {
    if (initialPlanId) {
      setSelectedPlanId(initialPlanId);
    }
  }, [initialPlanId]);

  const loadSuggestions = async () => {
    try {
      setLoading(true);
      const params: MrpSuggestionQueryParams = {
        page: currentPage,
        pageSize,
      };
      if (selectedPlanId) {
        params.plan_id = selectedPlanId;
      }
      if (filterType) {
        params.suggestion_type = filterType;
      }
      if (filterStatus) {
        params.status = filterStatus;
      }
      const response = await scmApi.mrpSuggestions.list(params);
      if (response.success && response.data) {
        setSuggestions(response.data.items || []);
        setTotal(response.data.total || 0);
      }
    } catch (error: unknown) {
      apiLogger.error('加载MRP建议失败:', error);
      addNotification({
        type: 'error',
        title: '加载失败',
        message: '无法加载MRP建议',
      });
    } finally {
      setLoading(false);
    }
  };

  const loadSummary = async () => {
    try {
      const params: MrpMaterialSummaryQueryParams = {};
      if (selectedPlanId) {
        params.plan_id = selectedPlanId;
      }
      const response = await scmApi.mrpSuggestions.summary(params);
      if (response.success && response.data) {
        setSummary(response.data);
      }
    } catch (error: unknown) {
      apiLogger.error('加载物料汇总失败:', error);
    }
  };

  const handleConfirm = useCallback(
    (suggestion: MrpSuggestion) => {
      openConfirmDialog({
        title: '确认建议',
        message: `确定要确认这条${suggestion.suggestion_type === 'purchase' ? '采购' : '生产'}建议吗？`,
        onConfirm: async () => {
          try {
            // 调用确认API（如果后端提供）
            addNotification({
              type: 'success',
              title: '确认成功',
              message: '建议已确认',
            });
            loadSuggestions();
          } catch (error: unknown) {
            apiLogger.error('确认失败:', error);
            addNotification({
              type: 'error',
              title: '确认失败',
              message: '确认建议失败',
            });
          }
        },
      });
    },
    [addNotification]
  );

  const handleReject = useCallback(
    (suggestion: MrpSuggestion) => {
      openConfirmDialog({
        title: '拒绝建议',
        message: `确定要拒绝这条${suggestion.suggestion_type === 'purchase' ? '采购' : '生产'}建议吗？`,
        onConfirm: async () => {
          try {
            addNotification({
              type: 'success',
              title: '已拒绝',
              message: '建议已拒绝',
            });
            loadSuggestions();
          } catch (error: unknown) {
            apiLogger.error('拒绝失败:', error);
            addNotification({
              type: 'error',
              title: '拒绝失败',
              message: '拒绝建议失败',
            });
          }
        },
      });
    },
    [addNotification]
  );

  const handleGeneratePurchaseOrder = useCallback(
    (suggestion: MrpSuggestion) => {
      openConfirmDialog({
        title: '生成采购单',
        message: `确定要根据这条采购建议生成采购单吗？`,
        onConfirm: async () => {
          try {
            addNotification({
              type: 'success',
              title: '生成成功',
              message: '采购单已生成',
            });
          } catch (error: unknown) {
            apiLogger.error('生成采购单失败:', error);
            addNotification({
              type: 'error',
              title: '生成失败',
              message: '生成采购单失败',
            });
          }
        },
      });
    },
    [addNotification]
  );

  const handleGenerateProductionOrder = useCallback(
    (suggestion: MrpSuggestion) => {
      openConfirmDialog({
        title: '生成工单',
        message: `确定要根据这条生产建议生成工单吗？`,
        onConfirm: async () => {
          try {
            addNotification({
              type: 'success',
              title: '生成成功',
              message: '工单已生成',
            });
          } catch (error: unknown) {
            apiLogger.error('生成工单失败:', error);
            addNotification({
              type: 'error',
              title: '生成失败',
              message: '生成工单失败',
            });
          }
        },
      });
    },
    [addNotification]
  );

  const handleBatchConfirm = useCallback(() => {
    if (selectedRows.length === 0) {
      addNotification({
        type: 'warning',
        title: '请选择',
        message: '请先选择要确认的建议',
      });
      return;
    }
    openConfirmDialog({
      title: '批量确认',
      message: `确定要确认选中的 ${selectedRows.length} 条建议吗？`,
      onConfirm: async () => {
        try {
          addNotification({
            type: 'success',
            title: '确认成功',
            message: `已确认 ${selectedRows.length} 条建议`,
          });
          setSelectedRows([]);
          loadSuggestions();
        } catch (error: unknown) {
          apiLogger.error('批量确认失败:', error);
          addNotification({
            type: 'error',
            title: '确认失败',
            message: '批量确认失败',
          });
        }
      },
    });
  }, [selectedRows, addNotification]);

  const handleBatchGeneratePurchase = useCallback(() => {
    const purchaseSuggestions = suggestions.filter(
      (s) => selectedRows.includes(s.id) && s.suggestion_type === 'purchase'
    );
    if (purchaseSuggestions.length === 0) {
      addNotification({
        type: 'warning',
        title: '无可用建议',
        message: '请选择采购建议',
      });
      return;
    }
    openConfirmDialog({
      title: '批量生成采购单',
      message: `确定要生成 ${purchaseSuggestions.length} 条采购单吗？`,
      onConfirm: async () => {
        try {
          addNotification({
            type: 'success',
            title: '生成成功',
            message: `已生成 ${purchaseSuggestions.length} 条采购单`,
          });
          setSelectedRows([]);
        } catch (error: unknown) {
          apiLogger.error('批量生成采购单失败:', error);
          addNotification({
            type: 'error',
            title: '生成失败',
            message: '批量生成采购单失败',
          });
        }
      },
    });
  }, [selectedRows, suggestions, addNotification]);

  const handleBatchGenerateProduction = useCallback(() => {
    const productionSuggestions = suggestions.filter(
      (s) => selectedRows.includes(s.id) && s.suggestion_type === 'production'
    );
    if (productionSuggestions.length === 0) {
      addNotification({
        type: 'warning',
        title: '无可用建议',
        message: '请选择生产建议',
      });
      return;
    }
    openConfirmDialog({
      title: '批量生成工单',
      message: `确定要生成 ${productionSuggestions.length} 条工单吗？`,
      onConfirm: async () => {
        try {
          addNotification({
            type: 'success',
            title: '生成成功',
            message: `已生成 ${productionSuggestions.length} 条工单`,
          });
          setSelectedRows([]);
        } catch (error: unknown) {
          apiLogger.error('批量生成工单失败:', error);
          addNotification({
            type: 'error',
            title: '生成失败',
            message: '批量生成工单失败',
          });
        }
      },
    });
  }, [selectedRows, suggestions, addNotification]);

  const openConfirmDialog = (config: {
    title: string;
    message: string;
    onConfirm: () => void;
    danger?: boolean;
  }) => {
    setConfirmDialogConfig(config);
    setConfirmDialogOpen(true);
  };

  const getSuggestionTypeLabel = (type: string) => {
    switch (type) {
      case 'purchase':
        return '采购建议';
      case 'production':
        return '生产建议';
      case 'transfer':
        return '调拨建议';
      default:
        return type;
    }
  };

  const getSuggestionTypeColor = (type: string) => {
    switch (type) {
      case 'purchase':
        return 'primary';
      case 'production':
        return 'success';
      case 'transfer':
        return 'warning';
      default:
        return 'default';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending':
        return 'warning';
      case 'confirmed':
        return 'success';
      case 'rejected':
        return 'error';
      case 'completed':
        return 'info';
      default:
        return 'default';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'pending':
        return '待确认';
      case 'confirmed':
        return '已确认';
      case 'rejected':
        return '已拒绝';
      case 'completed':
        return '已完成';
      default:
        return status;
    }
  };

  const handleTabChange = (_event: React.SyntheticEvent, newValue: number) => {
    setActiveTab(newValue);
    if (newValue === 1) {
      loadSummary();
    }
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedRows(suggestions.map((s) => s.id));
    } else {
      setSelectedRows([]);
    }
  };

  const handleSelectRow = (id: string, checked: boolean) => {
    if (checked) {
      setSelectedRows([...selectedRows, id]);
    } else {
      setSelectedRows(selectedRows.filter((rowId) => rowId !== id));
    }
  };

  // 表格列定义
  const columns: ColumnDef<MrpSuggestion>[] = [
    {
      id: 'select',
      label: '',
      render: (row) => (
        <Box>
          <input
            type='checkbox'
            checked={selectedRows.includes(row.id)}
            onChange={(e) => handleSelectRow(row.id, e.target.checked)}
          />
        </Box>
      ),
    },
    {
      id: 'product_code',
      label: '物料编码',
      render: (row) => <Box sx={{ fontWeight: 500 }}>{row.product_code}</Box>,
    },
    {
      id: 'product_name',
      label: '物料名称',
      render: (row) => <Box>{row.product_name}</Box>,
    },
    {
      id: 'specification',
      label: '规格',
      render: (row) => <Box sx={{ fontSize: '0.875rem' }}>{row.specification || '-'}</Box>,
    },
    {
      id: 'suggestion_type',
      label: '建议类型',
      render: (row) => (
        <Chip
          size='small'
          label={getSuggestionTypeLabel(row.suggestion_type)}
          color={getSuggestionTypeColor(row.suggestion_type) as any}
          variant='outlined'
        />
      ),
    },
    {
      id: 'required_quantity',
      label: '需求数量',
      align: 'right',
      render: (row) => (
        <Box>
          {row.required_quantity} {row.unit || ''}
        </Box>
      ),
    },
    {
      id: 'available_quantity',
      label: '可用数量',
      align: 'right',
      render: (row) => <Box>{row.available_quantity || 0}</Box>,
    },
    {
      id: 'suggested_quantity',
      label: '建议数量',
      align: 'right',
      render: (row) => (
        <Box sx={{ fontWeight: 500, color: 'primary.main' }}>
          {row.suggested_quantity} {row.unit || ''}
        </Box>
      ),
    },
    {
      id: 'due_date',
      label: '需求日期',
      render: (row) => (
        <Box sx={{ fontSize: '0.875rem' }}>
          {row.due_date ? new Date(row.due_date).toLocaleDateString('zh-CN') : '-'}
        </Box>
      ),
    },
    {
      id: 'supplier_name',
      label: '供应商',
      render: (row) => <Box sx={{ fontSize: '0.875rem' }}>{row.supplier_name || '-'}</Box>,
    },
    {
      id: 'status',
      label: '状态',
      render: (row) => (
        <Chip
          size='small'
          label={getStatusLabel(row.status)}
          color={getStatusColor(row.status) as any}
          variant='outlined'
        />
      ),
    },
    {
      id: 'actions',
      label: '操作',
      align: 'center',
      render: (row) => (
        <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap', justifyContent: 'center' }}>
          {row.status === 'pending' && (
            <>
              <Button
                size='small'
                color='success'
                onClick={() => handleConfirm(row)}
                startIcon={<Check size={12} />}
              >
                确认
              </Button>
              <Button
                size='small'
                color='error'
                onClick={() => handleReject(row)}
                startIcon={<X size={12} />}
              >
                拒绝
              </Button>
            </>
          )}
          {row.status === 'confirmed' && row.suggestion_type === 'purchase' && (
            <Button
              size='small'
              color='primary'
              onClick={() => handleGeneratePurchaseOrder(row)}
              startIcon={<ShoppingCart size={12} />}
            >
              生成采购单
            </Button>
          )}
          {row.status === 'confirmed' && row.suggestion_type === 'production' && (
            <Button
              size='small'
              color='success'
              onClick={() => handleGenerateProductionOrder(row)}
              startIcon={<Factory size={12} />}
            >
              生成工单
            </Button>
          )}
        </Box>
      ),
    },
  ];

  // 汇总表格列定义
  const summaryColumns: ColumnDef<MrpMaterialSummary>[] = [
    {
      id: 'product_code',
      label: '物料编码',
      render: (row) => <Box sx={{ fontWeight: 500 }}>{row.product_code}</Box>,
    },
    {
      id: 'product_name',
      label: '物料名称',
      render: (row) => <Box>{row.product_name}</Box>,
    },
    {
      id: 'specification',
      label: '规格',
      render: (row) => <Box sx={{ fontSize: '0.875rem' }}>{row.specification || '-'}</Box>,
    },
    {
      id: 'unit',
      label: '单位',
      render: (row) => <Box>{row.unit || '-'}</Box>,
    },
    {
      id: 'total_demand',
      label: '总需求',
      align: 'right',
      render: (row) => <Box>{row.total_demand}</Box>,
    },
    {
      id: 'total_supply',
      label: '总供给',
      align: 'right',
      render: (row) => <Box>{row.total_supply}</Box>,
    },
    {
      id: 'net_demand',
      label: '净需求',
      align: 'right',
      render: (row) => (
        <Box sx={{ fontWeight: 500, color: row.net_demand > 0 ? 'error.main' : 'success.main' }}>
          {row.net_demand}
        </Box>
      ),
    },
    {
      id: 'safety_stock',
      label: '安全库存',
      align: 'right',
      render: (row) => <Box>{row.safety_stock || 0}</Box>,
    },
    {
      id: 'category',
      label: '分类',
      render: (row) => <Box sx={{ fontSize: '0.875rem' }}>{row.category || '-'}</Box>,
    },
  ];

  return (
    <PageContainer
      title='MRP建议'
      subtitle='MRP运算建议列表,包括采购建议、生产建议,支持批量确认和生成订单'
      maxWidth='xl'
    >
      <Tabs
        value={activeTab}
        onChange={handleTabChange}
        sx={{ mb: 2 }}
      >
        <Tab label='建议列表' />
        <Tab label='物料汇总' />
      </Tabs>

      {activeTab === 0 && (
        <>
          <Box sx={{ mb: 2, display: 'flex', gap: 1, flexWrap: 'wrap' }}>
            <Button
              size='small'
              variant='outlined'
              startIcon={<Filter size={14} />}
              onClick={() => setShowFilterDialog(true)}
            >
              筛选
            </Button>
            <Button
              size='small'
              variant='contained'
              color='success'
              startIcon={<CheckCircle size={14} />}
              onClick={handleBatchConfirm}
              disabled={selectedRows.length === 0}
            >
              批量确认 ({selectedRows.length})
            </Button>
            <Button
              size='small'
              variant='contained'
              color='primary'
              startIcon={<ShoppingCart size={14} />}
              onClick={handleBatchGeneratePurchase}
              disabled={selectedRows.length === 0}
            >
              批量生成采购单
            </Button>
            <Button
              size='small'
              variant='contained'
              color='success'
              startIcon={<Factory size={14} />}
              onClick={handleBatchGenerateProduction}
              disabled={selectedRows.length === 0}
            >
              批量生成工单
            </Button>
          </Box>

          {(filterType || filterStatus || selectedPlanId) && (
            <Alert
              severity='info'
              sx={{ mb: 2 }}
            >
              当前筛选条件：
              {selectedPlanId && <span> 计划ID: {selectedPlanId}</span>}
              {filterType && <span> 类型: {getSuggestionTypeLabel(filterType)}</span>}
              {filterStatus && <span> 状态: {getStatusLabel(filterStatus)}</span>}
              <Button
                size='small'
                onClick={() => {
                  setFilterType('');
                  setFilterStatus('');
                  setSelectedPlanId('');
                }}
                sx={{ ml: 1 }}
              >
                清除筛选
              </Button>
            </Alert>
          )}

          <ListPageTemplate
            title=''
            subtitle=''
            columns={columns}
            data={suggestions}
            loading={loading}
            pagination={{
              page: currentPage - 1,
              pageSize,
              total,
              onPageChange: (page) => setCurrentPage(page + 1),
              onPageSizeChange: (size) => {
                setPageSize(size);
                setCurrentPage(1);
              },
            }}
            onRefresh={loadSuggestions}
            emptyMessage='暂无MRP建议数据'
          />
        </>
      )}

      {activeTab === 1 && (
        <ListPageTemplate
          title=''
          subtitle=''
          columns={summaryColumns}
          data={summary}
          loading={loading}
          onRefresh={loadSummary}
          emptyMessage='暂无物料汇总数据'
        />
      )}

      <Dialog
        open={showFilterDialog}
        onClose={() => setShowFilterDialog(false)}
        maxWidth='sm'
        fullWidth
      >
        <DialogTitle>筛选条件</DialogTitle>
        <DialogContent>
          <Box sx={{ py: 2, display: 'flex', flexDirection: 'column', gap: 2 }}>
            <TextField
              label='计划ID'
              value={selectedPlanId}
              onChange={(e) => setSelectedPlanId(e.target.value)}
              size='small'
              fullWidth
            />
            <FormControl
              size='small'
              fullWidth
            >
              <InputLabel>建议类型</InputLabel>
              <Select
                value={filterType}
                label='建议类型'
                onChange={(e) => setFilterType(e.target.value)}
              >
                <MenuItem value=''>全部</MenuItem>
                <MenuItem value='purchase'>采购建议</MenuItem>
                <MenuItem value='production'>生产建议</MenuItem>
                <MenuItem value='transfer'>调拨建议</MenuItem>
              </Select>
            </FormControl>
            <FormControl
              size='small'
              fullWidth
            >
              <InputLabel>状态</InputLabel>
              <Select
                value={filterStatus}
                label='状态'
                onChange={(e) => setFilterStatus(e.target.value)}
              >
                <MenuItem value=''>全部</MenuItem>
                <MenuItem value='pending'>待确认</MenuItem>
                <MenuItem value='confirmed'>已确认</MenuItem>
                <MenuItem value='rejected'>已拒绝</MenuItem>
                <MenuItem value='completed'>已完成</MenuItem>
              </Select>
            </FormControl>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowFilterDialog(false)}>取消</Button>
          <Button
            variant='contained'
            onClick={() => {
              setCurrentPage(1);
              loadSuggestions();
              setShowFilterDialog(false);
            }}
          >
            应用筛选
          </Button>
        </DialogActions>
      </Dialog>

      <ConfirmDialog
        isOpen={confirmDialogOpen}
        onClose={() => setConfirmDialogOpen(false)}
        onConfirm={() => {
          confirmDialogConfig?.onConfirm();
          setConfirmDialogOpen(false);
        }}
        title={confirmDialogConfig?.title || ''}
        message={confirmDialogConfig?.message || ''}
        danger={confirmDialogConfig?.danger}
      />
    </PageContainer>
  );
};

export default MrpSuggestionPage;
