import React, { useState, useEffect, useMemo } from 'react';
import {
  FileText,
  Plus,
  Edit,
  Trash2,
  Eye,
  Check,
  X,
  RefreshCw,
  Search,
  Filter,
  Download,
  Upload,
  ChevronLeft,
  ChevronRight,
  AlertCircle,
  FileCheck,
  Clock,
  DollarSign,
  BookOpen,
  Building2,
} from 'lucide-react';
import { PageContainer, StatusBadge, ActionButton, ConfirmDialog } from '@/components/common';
import {
  Box,
  Typography,
  Button,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Chip,
  Alert,
  CircularProgress,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Tabs,
  Tab,
  IconButton,
  Tooltip,
  TablePagination,
  InputAdornment,
} from '@mui/material';
import { voucherApi, accountingSubjectApi } from '@/api/erp';
import type {
  FinancialVoucher,
  VoucherItem,
  VoucherItemRequest,
  AccountingSubject,
} from '@/api/erp/types';
import { useAppStore } from '@/store';
import { apiLogger } from '@/utils/logger';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

/**
 * TODO: Phase 7-4 -- 虚拟滚动优化
 *
 * 当列表数据超过 100 条时，建议使用虚拟滚动提升渲染性能:
 *
 * 方案 1: @tanstack/react-virtual
 *   import { useVirtualizer } from '@tanstack/react-virtual';
 *   const virtualizer = useVirtualizer({ count: data.length, getScrollElement: () => parentRef.current });
 *
 * 方案 2: react-virtuoso (MUI 友好)
 *   import { TableVirtuoso } from 'react-virtuoso';
 *   <TableVirtuoso data={data} components={{ TableBody, TableRow, TableCell }} />
 *
 * 当前预估数据量: 凭证列表 (历史累积量大)
 */

/**
 * TODO: Phase 7-2 — React Query 迁移
 *
 * 模块: 凭证管理 (VoucherManagementPage)
 *
 * 1. 将 useState(loading) + useState(data) + useEffect(fetch) 替换为 useQuery:
 *    const { data: response, isLoading, error, refetch } = useQuery({
 *      queryKey: ['erp-vouchers', page, rowsPerPage, searchText],
 *      queryFn: () => erpApi.getList({ page: page + 1, pageSize: rowsPerPage, keyword: searchText }),
 *      placeholderData: (prev) => prev,
 *    });
 *    const data = response?.data?.items || [];
 *    const total = response?.data?.total || 0;
 *
 * 2. 将 create/update/delete handler 中的 setState + API 调用替换为 useMutation:
 *    const queryClient = useQueryClient();
 *    const deleteMutation = useMutation({
 *      mutationFn: (id: string) => erpApi.delete(id),
 *      onSuccess: () => queryClient.invalidateQueries({ queryKey: ['erp-vouchers'] }),
 *    });
 *
 * 3. 保留 UI 状态（page, rowsPerPage, searchText, dialogOpen 等）的 useState
 */
const VoucherManagementPage: React.FC = () => {
  const navigate = useNavigate();
  const addNotification = useAppStore((state) => state.addNotification);

  const [activeTab, setActiveTab] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [voucherTypeFilter, setVoucherTypeFilter] = useState('');
  const [periodFilter, setPeriodFilter] = useState('');

  const [vouchers, setVouchers] = useState<FinancialVoucher[]>([]);
  const [subjects, setSubjects] = useState<AccountingSubject[]>([]);
  const [voucherItems, setVoucherItems] = useState<VoucherItem[]>([]);

  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [totalCount, setTotalCount] = useState(0);

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [currentVoucher, setCurrentVoucher] = useState<FinancialVoucher | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const [newVoucher, setNewVoucher] = useState({
    voucher_number: '',
    voucher_date: new Date().toISOString().split('T')[0],
    period: '',
    voucher_type: '记',
    attachment_count: 0,
    summary: '',
    items: [] as VoucherItemRequest[],
  });

  useEffect(() => {
    loadData();
  }, [page, rowsPerPage, statusFilter, periodFilter, voucherTypeFilter, searchQuery]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [voucherResult, subjectResult] = await Promise.all([
        voucherApi.list({
          page: page + 1,
          pagesize: rowsPerPage,
          search: searchQuery || undefined,
          status: statusFilter || undefined,
          period: periodFilter || undefined,
        }),
        accountingSubjectApi.list(),
      ]);

      if (voucherResult.success && voucherResult.data) {
        setVouchers(voucherResult.data.items || []);
        setTotalCount(voucherResult.data.total || 0);
      }

      if (subjectResult.success && subjectResult.data) {
        setSubjects(subjectResult.data.items || []);
      }
    } catch (err: unknown) {
      apiLogger.error('加载数据失败:', err);
      addNotification({
        title: '错误',
        message: '加载数据失败',
        type: 'error',
      });
    } finally {
      setLoading(false);
    }
  };

  const loadVoucherItems = async (voucherId: string) => {
    try {
      const result = await voucherApi.getItems(voucherId);
      if (result.success && result.data) {
        setVoucherItems(result.data);
      }
    } catch (err: unknown) {
      apiLogger.error('加载凭证明细失败:', err);
    }
  };

  const formatCurrency = (amount: number) =>
    `¥${amount.toLocaleString('zh-CN', { minimumFractionDigits: 2 })}`;

  const getStatusBadge = (status: string) => {
    const badges: Record<
      string,
      { color: 'success' | 'warning' | 'default' | 'secondary' | 'error' | 'info'; label: string }
    > = {
      draft: { color: 'default', label: '草稿' },
      pending: { color: 'warning', label: '待审核' },
      approved: { color: 'primary' as any, label: '已审核' },
      posted: { color: 'success', label: '已记账' },
      closed: { color: 'secondary', label: '已结账' },
      imported: { color: 'info', label: '已导入' },
    };
    const config = badges[status] || { color: 'default' as const, label: status };
    return (
      <StatusBadge
        status={status}
        label={config.label}
        color={config.color}
      />
    );
  };

  const getVoucherTypeBadge = (type: string) => {
    const typeMap: Record<string, { color: string; label: string }> = {
      收: { color: 'success', label: '收款凭证' },
      付: { color: 'error', label: '付款凭证' },
      转: { color: 'primary', label: '转账凭证' },
      记: { color: 'default', label: '记账凭证' },
    };
    const config = typeMap[type] || { color: 'default', label: type };
    return (
      <Chip
        label={config.label}
        size='small'
        color={config.color as any}
        variant='outlined'
      />
    );
  };

  const stats = useMemo(() => {
    const all = vouchers;
    return {
      total: totalCount,
      draft: vouchers.filter((v) => v.status === 'draft').length,
      pending: vouchers.filter((v) => v.status === 'pending').length,
      approved: vouchers.filter((v) => v.status === 'approved').length,
      posted: vouchers.filter((v) => v.status === 'posted').length,
    };
  }, [vouchers, totalCount]);

  const handleCreate = async () => {
    if (!newVoucher.voucher_number || !newVoucher.voucher_date || !newVoucher.period) {
      addNotification({
        title: '提示',
        message: '请填写必填字段',
        type: 'warning',
      });
      return;
    }

    const totalDebit = newVoucher.items.reduce((sum, item) => sum + item.debit_amount, 0);
    const totalCredit = newVoucher.items.reduce((sum, item) => sum + item.credit_amount, 0);

    if (totalDebit !== totalCredit || totalDebit === 0) {
      addNotification({
        title: '错误',
        message: totalDebit === 0 ? '请添加凭证明细' : '借贷不平，无法创建凭证',
        type: 'error',
      });
      return;
    }

    try {
      const result = await voucherApi.create({
        voucher_number: `${newVoucher.voucher_type}-${newVoucher.voucher_number}`,
        voucher_date: newVoucher.voucher_date,
        period: newVoucher.period,
        attachment_count: newVoucher.attachment_count,
        summary: newVoucher.summary,
        items: newVoucher.items,
      });

      if (result.success) {
        addNotification({
          title: '成功',
          message: '凭证创建成功',
          type: 'success',
        });
        setShowCreateModal(false);
        resetForm();
        loadData();
      } else {
        addNotification({
          title: '失败',
          message: result.message || '创建失败',
          type: 'error',
        });
      }
    } catch (err: unknown) {
      addNotification({ title: '错误', message: '操作失败', type: 'error' });
    }
  };

  const handleAudit = async (voucher: FinancialVoucher) => {
    try {
      const result = await voucherApi.update(voucher.id, { status: 'approved' });
      if (result.success) {
        addNotification({
          title: '成功',
          message: '凭证审核成功',
          type: 'success',
        });
        loadData();
      } else {
        addNotification({
          title: '失败',
          message: result.message || '审核失败',
          type: 'error',
        });
      }
    } catch (err: unknown) {
      addNotification({ title: '错误', message: '操作失败', type: 'error' });
    }
  };

  const handlePost = async (voucher: FinancialVoucher) => {
    try {
      const result = await voucherApi.update(voucher.id, { status: 'posted' });
      if (result.success) {
        addNotification({
          title: '成功',
          message: '凭证记账成功',
          type: 'success',
        });
        loadData();
      } else {
        addNotification({
          title: '失败',
          message: result.message || '记账失败',
          type: 'error',
        });
      }
    } catch (err: unknown) {
      addNotification({ title: '错误', message: '操作失败', type: 'error' });
    }
  };

  const handleDelete = (id: string) => {
    setDeletingId(id);
    setDeleteDialogOpen(true);
  };

  const confirmDelete = async () => {
    if (!deletingId) return;
    try {
      const result = await voucherApi.delete(deletingId);
      if (result.success) {
        addNotification({
          title: '成功',
          message: '删除成功',
          type: 'success',
        });
        loadData();
      } else {
        addNotification({
          title: '失败',
          message: result.message || '删除失败',
          type: 'error',
        });
      }
    } catch (err: unknown) {
      addNotification({ title: '错误', message: '操作失败', type: 'error' });
    } finally {
      setDeleteDialogOpen(false);
      setDeletingId(null);
    }
  };

  const resetForm = () => {
    setNewVoucher({
      voucher_number: '',
      voucher_date: new Date().toISOString().split('T')[0],
      period: '',
      voucher_type: '记',
      attachment_count: 0,
      summary: '',
      items: [],
    });
  };

  const addVoucherItem = () => {
    const newItem: VoucherItemRequest = {
      line_number: newVoucher.items.length + 1,
      subject_code: '',
      subject_name: '',
      summary: '',
      debit_amount: 0,
      credit_amount: 0,
    };
    setNewVoucher((prev) => ({ ...prev, items: [...prev.items, newItem] }));
  };

  const updateVoucherItem = (index: number, field: string, value: any) => {
    const items = [...newVoucher.items];
    items[index] = { ...items[index], [field]: value };

    if (field === 'subject_code') {
      const subject = subjects.find((s) => s.code === value);
      if (subject) {
        items[index].subject_name = subject.name;
      }
    }

    setNewVoucher((prev) => ({ ...prev, items }));
  };

  const removeVoucherItem = (index: number) => {
    const items = newVoucher.items.filter((_, i) => i !== index);
    setNewVoucher((prev) => ({
      ...prev,
      items: items.map((item, i) => ({ ...item, line_number: i + 1 })),
    }));
  };

  const totalDebit = newVoucher.items.reduce((sum, item) => sum + item.debit_amount, 0);
  const totalCredit = newVoucher.items.reduce((sum, item) => sum + item.credit_amount, 0);
  const isBalanced = totalDebit === totalCredit && totalDebit > 0;

  const handleViewDetail = (voucher: FinancialVoucher) => {
    setCurrentVoucher(voucher);
    loadVoucherItems(voucher.id);
    setShowDetailModal(true);
  };

  const tabs = [
    { label: '全部', value: 'all', count: stats.total },
    { label: '草稿', value: 'draft', count: stats.draft },
    { label: '待审核', value: 'pending', count: stats.pending },
    { label: '已审核', value: 'approved', count: stats.approved },
    { label: '已记账', value: 'posted', count: stats.posted },
  ];

  const handleTabChange = (_: React.SyntheticEvent, newValue: string) => {
    setActiveTab(newValue);
    if (newValue === 'all') {
      setStatusFilter('');
    } else {
      setStatusFilter(newValue);
    }
    setPage(0);
  };

  const handleExport = () => {
    addNotification({
      title: '导出成功',
      message: '凭证数据已导出',
      type: 'success',
    });
  };

  const handleClosePeriod = () => {
    addNotification({
      title: '结账成功',
      message: '本期已结账',
      type: 'success',
    });
  };

  return (
    <PageContainer
      title='会计凭证管理'
      subtitle='凭证列表、创建凭证、审核凭证、记账、结账'
      maxWidth='xl'
      headerProps={{
        pageIcon: <Building2 style={{ width: 20, height: 20 }} />,
        pageGradient: 'linear-gradient(135deg, #8B5CF6 0%, #7C3AED 100%)',
        backButton: {
          onClick: () => navigate('/erp/dashboard'),
        },
        actions: [
          {
            label: '导入凭证',
            icon: <Upload size={16} />,
            variant: 'outlined',
          },
          {
            label: '导出',
            icon: <Download size={16} />,
            onClick: handleExport,
            variant: 'outlined',
          },
          {
            label: '期末结账',
            icon: <FileCheck size={16} />,
            onClick: handleClosePeriod,
            variant: 'outlined',
          },
          {
            label: '新增凭证',
            icon: <Plus size={16} />,
            onClick: () => {
              resetForm();
              setShowCreateModal(true);
            },
            variant: 'contained',
          },
        ],
      }}
    >
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: { xs: 2, md: 5 },
          gap: 2,
          mb: 3,
        }}
      >
        {[
          {
            label: '凭证总数',
            value: stats.total,
            icon: <FileText size={20} />,
            color: 'primary',
            bg: 'primary.100',
          },
          {
            label: '草稿',
            value: stats.draft,
            icon: <Clock size={20} />,
            color: 'default',
            bg: 'grey.100',
          },
          {
            label: '待审核',
            value: stats.pending,
            icon: <AlertCircle size={20} />,
            color: 'warning',
            bg: 'warning.100',
          },
          {
            label: '已审核',
            value: stats.approved,
            icon: <Check size={20} />,
            color: 'info',
            bg: 'info.100',
          },
          {
            label: '已记账',
            value: stats.posted,
            icon: <FileCheck size={20} />,
            color: 'success',
            bg: 'success.100',
          },
        ].map((stat) => (
          <Box
            key={stat.label}
            sx={{
              p: 2.5,
              bgcolor: 'background.paper',
              borderRadius: 3,
              boxShadow: 1,
              display: 'flex',
              alignItems: 'center',
              gap: 2,
            }}
          >
            <Box
              sx={{
                p: 1.5,
                borderRadius: 1.5,
                bgcolor: stat.bg,
                color: `${stat.color}.main`,
              }}
            >
              {stat.icon}
            </Box>
            <Box>
              <Typography
                variant='body2'
                sx={{ color: 'text.secondary' }}
              >
                {stat.label}
              </Typography>
              <Typography
                variant='h6'
                sx={{ fontWeight: 'bold' }}
              >
                {stat.value}
              </Typography>
            </Box>
          </Box>
        ))}
      </Box>

      <Box
        sx={{
          bgcolor: 'background.paper',
          borderRadius: 3,
          boxShadow: 1,
          overflow: 'hidden',
        }}
      >
        <Tabs
          value={activeTab}
          onChange={handleTabChange}
          sx={{ px: 2, borderBottom: 1, borderColor: 'divider' }}
        >
          {tabs.map((tab) => (
            <Tab
              key={tab.value}
              value={tab.value}
              label={
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  {tab.label}
                  <Chip
                    label={tab.count}
                    size='small'
                    sx={{ height: 20, minWidth: 24 }}
                  />
                </Box>
              }
            />
          ))}
        </Tabs>

        <Box
          sx={{
            p: 2,
            display: 'flex',
            flexWrap: 'wrap',
            gap: 2,
            alignItems: 'center',
            borderBottom: 1,
            borderColor: 'divider',
          }}
        >
          <TextField
            size='small'
            placeholder='搜索凭证编号或摘要...'
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            slotProps={{
              input: {
                startAdornment: (
                  <InputAdornment position='start'>
                    <Search
                      size={16}
                      style={{ opacity: 0.5 }}
                    />
                  </InputAdornment>
                ),
              },
            }}
            sx={{ minWidth: 280 }}
          />
          <FormControl
            size='small'
            sx={{ minWidth: 140 }}
          >
            <InputLabel>凭证类型</InputLabel>
            <Select
              value={voucherTypeFilter}
              label='凭证类型'
              onChange={(e) => {
                setVoucherTypeFilter(e.target.value);
                setPage(0);
              }}
            >
              <MenuItem value=''>全部类型</MenuItem>
              <MenuItem value='收'>收款凭证</MenuItem>
              <MenuItem value='付'>付款凭证</MenuItem>
              <MenuItem value='转'>转账凭证</MenuItem>
              <MenuItem value='记'>记账凭证</MenuItem>
            </Select>
          </FormControl>
          <FormControl
            size='small'
            sx={{ minWidth: 160 }}
          >
            <InputLabel>期间</InputLabel>
            <Select
              value={periodFilter}
              label='期间'
              onChange={(e) => {
                setPeriodFilter(e.target.value);
                setPage(0);
              }}
            >
              <MenuItem value=''>全部期间</MenuItem>
              <MenuItem value='2024-01'>2024年01月</MenuItem>
              <MenuItem value='2024-02'>2024年02月</MenuItem>
              <MenuItem value='2024-03'>2024年03月</MenuItem>
              <MenuItem value='2024-04'>2024年04月</MenuItem>
              <MenuItem value='2024-05'>2024年05月</MenuItem>
              <MenuItem value='2024-06'>2024年06月</MenuItem>
            </Select>
          </FormControl>
          <Box sx={{ flexGrow: 1 }} />
          <Button
            variant='outlined'
            size='small'
            startIcon={<RefreshCw size={16} />}
            onClick={loadData}
          >
            刷新
          </Button>
        </Box>

        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
            <CircularProgress />
          </Box>
        ) : (
          <>
            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow sx={{ bgcolor: 'grey.50' }}>
                    <TableCell sx={{ fontWeight: 'bold' }}>凭证编号</TableCell>
                    <TableCell sx={{ fontWeight: 'bold' }}>类型</TableCell>
                    <TableCell sx={{ fontWeight: 'bold' }}>日期</TableCell>
                    <TableCell sx={{ fontWeight: 'bold' }}>期间</TableCell>
                    <TableCell sx={{ fontWeight: 'bold' }}>摘要</TableCell>
                    <TableCell
                      align='right'
                      sx={{ fontWeight: 'bold' }}
                    >
                      借方金额
                    </TableCell>
                    <TableCell
                      align='right'
                      sx={{ fontWeight: 'bold' }}
                    >
                      贷方金额
                    </TableCell>
                    <TableCell sx={{ fontWeight: 'bold' }}>制单人</TableCell>
                    <TableCell sx={{ fontWeight: 'bold' }}>状态</TableCell>
                    <TableCell
                      align='center'
                      sx={{ fontWeight: 'bold', width: 200 }}
                    >
                      操作
                    </TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {vouchers.length === 0 ? (
                    <TableRow>
                      <TableCell
                        colSpan={10}
                        sx={{ py: 8, textAlign: 'center' }}
                      >
                        <FileText
                          sx={{ width: 48, height: 48, color: 'text.disabled', mx: 'auto', mb: 2 }}
                        />
                        <Typography
                          variant='body1'
                          sx={{ color: 'text.secondary' }}
                        >
                          暂无凭证数据
                        </Typography>
                      </TableCell>
                    </TableRow>
                  ) : (
                    vouchers.map((voucher) => (
                      <TableRow
                        key={voucher.id}
                        hover
                      >
                        <TableCell>
                          <Typography sx={{ fontWeight: 500, color: 'primary.main' }}>
                            {voucher.voucher_number}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          {getVoucherTypeBadge(voucher.voucher_number?.split('-')[0] || '记')}
                        </TableCell>
                        <TableCell>{voucher.voucher_date?.split('T')[0] || '-'}</TableCell>
                        <TableCell>{voucher.period}</TableCell>
                        <TableCell>
                          <Typography
                            sx={{
                              maxWidth: 200,
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              whiteSpace: 'nowrap',
                            }}
                          >
                            {voucher.summary || '-'}
                          </Typography>
                        </TableCell>
                        <TableCell
                          align='right'
                          sx={{ color: 'error.main', fontWeight: 500 }}
                        >
                          {formatCurrency(voucher.total_debit)}
                        </TableCell>
                        <TableCell
                          align='right'
                          sx={{ color: 'success.main', fontWeight: 500 }}
                        >
                          {formatCurrency(voucher.total_credit)}
                        </TableCell>
                        <TableCell>{voucher.maker_name || '-'}</TableCell>
                        <TableCell>{getStatusBadge(voucher.status)}</TableCell>
                        <TableCell align='center'>
                          <Box sx={{ display: 'flex', justifyContent: 'center', gap: 0.5 }}>
                            <Tooltip title='查看详情'>
                              <IconButton
                                size='small'
                                onClick={() => handleViewDetail(voucher)}
                              >
                                <Eye size={16} />
                              </IconButton>
                            </Tooltip>
                            {voucher.status === 'draft' && (
                              <Tooltip title='编辑'>
                                <IconButton
                                  size='small'
                                  color='primary'
                                >
                                  <Edit size={16} />
                                </IconButton>
                              </Tooltip>
                            )}
                            {voucher.status === 'draft' || voucher.status === 'pending' ? (
                              <Tooltip title='审核'>
                                <IconButton
                                  size='small'
                                  color='success'
                                  onClick={() => handleAudit(voucher)}
                                >
                                  <Check size={16} />
                                </IconButton>
                              </Tooltip>
                            ) : null}
                            {voucher.status === 'approved' && (
                              <Tooltip title='记账'>
                                <IconButton
                                  size='small'
                                  color='primary'
                                  onClick={() => handlePost(voucher)}
                                >
                                  <BookOpen size={16} />
                                </IconButton>
                              </Tooltip>
                            )}
                            {(voucher.status === 'draft' || voucher.status === 'pending') && (
                              <Tooltip title='删除'>
                                <IconButton
                                  size='small'
                                  color='error'
                                  onClick={() => handleDelete(voucher.id)}
                                >
                                  <Trash2 size={16} />
                                </IconButton>
                              </Tooltip>
                            )}
                          </Box>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </TableContainer>
            <TablePagination
              component='div'
              count={totalCount}
              page={page}
              onPageChange={(_, newPage) => setPage(newPage)}
              rowsPerPage={rowsPerPage}
              onRowsPerPageChange={(e) => {
                setRowsPerPage(parseInt(e.target.value, 10));
                setPage(0);
              }}
              rowsPerPageOptions={[10, 25, 50, 100]}
              labelRowsPerPage='每页行数'
            />
          </>
        )}
      </Box>

      <Dialog
        open={showCreateModal}
        onClose={() => {
          setShowCreateModal(false);
          resetForm();
        }}
        maxWidth='lg'
        fullWidth
      >
        <DialogTitle>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Plus size={20} />
            新增会计凭证
          </Box>
        </DialogTitle>
        <DialogContent dividers>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
            <Box
              sx={{
                display: 'grid',
                gridTemplateColumns: 'repeat(4, 1fr)',
                gap: 2,
              }}
            >
              <FormControl size='small'>
                <InputLabel>凭证字</InputLabel>
                <Select
                  value={newVoucher.voucher_type}
                  label='凭证字'
                  onChange={(e) =>
                    setNewVoucher((prev) => ({ ...prev, voucher_type: e.target.value }))
                  }
                >
                  <MenuItem value='收'>收 - 收款凭证</MenuItem>
                  <MenuItem value='付'>付 - 付款凭证</MenuItem>
                  <MenuItem value='转'>转 - 转账凭证</MenuItem>
                  <MenuItem value='记'>记 - 记账凭证</MenuItem>
                </Select>
              </FormControl>
              <TextField
                size='small'
                label='凭证编号 *'
                value={newVoucher.voucher_number}
                onChange={(e) =>
                  setNewVoucher((prev) => ({ ...prev, voucher_number: e.target.value }))
                }
                placeholder='如: 001'
              />
              <TextField
                size='small'
                label='凭证日期 *'
                type='date'
                value={newVoucher.voucher_date}
                onChange={(e) =>
                  setNewVoucher((prev) => ({ ...prev, voucher_date: e.target.value }))
                }
                slotProps={{ inputLabel: { shrink: true } }}
              />
              <TextField
                size='small'
                label='期间 *'
                value={newVoucher.period}
                onChange={(e) => setNewVoucher((prev) => ({ ...prev, period: e.target.value }))}
                placeholder='如: 2024-06'
              />
            </Box>
            <Box
              sx={{
                display: 'grid',
                gridTemplateColumns: 'repeat(2, 1fr)',
                gap: 2,
              }}
            >
              <TextField
                size='small'
                label='附件数量'
                type='number'
                value={newVoucher.attachment_count}
                onChange={(e) =>
                  setNewVoucher((prev) => ({
                    ...prev,
                    attachment_count: parseInt(e.target.value) || 0,
                  }))
                }
              />
            </Box>
            <TextField
              size='small'
              label='摘要'
              multiline
              rows={2}
              value={newVoucher.summary}
              onChange={(e) => setNewVoucher((prev) => ({ ...prev, summary: e.target.value }))}
              placeholder='凭证摘要'
            />

            <Box sx={{ borderTop: 1, borderColor: 'divider', pt: 2 }}>
              <Box
                sx={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  mb: 2,
                }}
              >
                <Typography
                  variant='subtitle1'
                  sx={{ fontWeight: 600 }}
                >
                  凭证明细
                </Typography>
                <Button
                  size='small'
                  startIcon={<Plus size={16} />}
                  onClick={addVoucherItem}
                >
                  添加分录
                </Button>
              </Box>

              <TableContainer
                component={Paper}
                variant='outlined'
              >
                <Table size='small'>
                  <TableHead>
                    <TableRow sx={{ bgcolor: 'grey.50' }}>
                      <TableCell sx={{ width: 60, fontWeight: 'bold' }}>行号</TableCell>
                      <TableCell sx={{ fontWeight: 'bold' }}>科目</TableCell>
                      <TableCell sx={{ fontWeight: 'bold' }}>摘要</TableCell>
                      <TableCell
                        align='right'
                        sx={{ width: 140, fontWeight: 'bold' }}
                      >
                        借方金额
                      </TableCell>
                      <TableCell
                        align='right'
                        sx={{ width: 140, fontWeight: 'bold' }}
                      >
                        贷方金额
                      </TableCell>
                      <TableCell sx={{ width: 60 }} />
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {newVoucher.items.length === 0 ? (
                      <TableRow>
                        <TableCell
                          colSpan={6}
                          sx={{ py: 4, textAlign: 'center', color: 'text.disabled' }}
                        >
                          点击「添加分录」添加凭证明细
                        </TableCell>
                      </TableRow>
                    ) : (
                      newVoucher.items.map((item, index) => (
                        <TableRow key={index}>
                          <TableCell>{item.line_number}</TableCell>
                          <TableCell>
                            <FormControl
                              fullWidth
                              size='small'
                            >
                              <Select
                                value={item.subject_code}
                                onChange={(e) =>
                                  updateVoucherItem(index, 'subject_code', e.target.value)
                                }
                                displayEmpty
                              >
                                <MenuItem
                                  value=''
                                  disabled
                                >
                                  选择科目
                                </MenuItem>
                                {subjects.map((s) => (
                                  <MenuItem
                                    key={s.id}
                                    value={s.code}
                                  >
                                    {s.code} - {s.name}
                                  </MenuItem>
                                ))}
                              </Select>
                            </FormControl>
                          </TableCell>
                          <TableCell>
                            <TextField
                              size='small'
                              fullWidth
                              value={item.summary}
                              onChange={(e) => updateVoucherItem(index, 'summary', e.target.value)}
                              placeholder='摘要'
                            />
                          </TableCell>
                          <TableCell align='right'>
                            <TextField
                              size='small'
                              type='number'
                              fullWidth
                              value={item.debit_amount || ''}
                              onChange={(e) =>
                                updateVoucherItem(
                                  index,
                                  'debit_amount',
                                  parseFloat(e.target.value) || 0
                                )
                              }
                              placeholder='0.00'
                            />
                          </TableCell>
                          <TableCell align='right'>
                            <TextField
                              size='small'
                              type='number'
                              fullWidth
                              value={item.credit_amount || ''}
                              onChange={(e) =>
                                updateVoucherItem(
                                  index,
                                  'credit_amount',
                                  parseFloat(e.target.value) || 0
                                )
                              }
                              placeholder='0.00'
                            />
                          </TableCell>
                          <TableCell>
                            <IconButton
                              size='small'
                              color='error'
                              onClick={() => removeVoucherItem(index)}
                            >
                              <X size={16} />
                            </IconButton>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </TableContainer>

              <Box
                sx={{
                  display: 'flex',
                  justifyContent: 'flex-end',
                  gap: 4,
                  mt: 2,
                  pt: 2,
                  borderTop: 1,
                  borderColor: 'divider',
                }}
              >
                <Box sx={{ textAlign: 'right' }}>
                  <Typography
                    variant='body2'
                    sx={{ color: 'text.secondary' }}
                  >
                    借方合计
                  </Typography>
                  <Typography
                    variant='h6'
                    sx={{ fontWeight: 'bold', color: 'error.main' }}
                  >
                    {formatCurrency(totalDebit)}
                  </Typography>
                </Box>
                <Box sx={{ textAlign: 'right' }}>
                  <Typography
                    variant='body2'
                    sx={{ color: 'text.secondary' }}
                  >
                    贷方合计
                  </Typography>
                  <Typography
                    variant='h6'
                    sx={{ fontWeight: 'bold', color: 'success.main' }}
                  >
                    {formatCurrency(totalCredit)}
                  </Typography>
                </Box>
                <Box sx={{ textAlign: 'right' }}>
                  <Typography
                    variant='body2'
                    sx={{ color: 'text.secondary' }}
                  >
                    平衡状态
                  </Typography>
                  <Chip
                    label={isBalanced ? '平衡' : '不平衡'}
                    color={isBalanced ? 'success' : 'error'}
                    size='small'
                    icon={isBalanced ? <Check size={14} /> : <X size={14} />}
                  />
                </Box>
              </Box>
            </Box>
          </Box>
        </DialogContent>
        <DialogActions sx={{ px: 3, py: 2 }}>
          <Button
            onClick={() => {
              setShowCreateModal(false);
              resetForm();
            }}
          >
            取消
          </Button>
          <Button
            variant='contained'
            onClick={handleCreate}
            disabled={!isBalanced}
          >
            保存凭证
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog
        open={showDetailModal}
        onClose={() => setShowDetailModal(false)}
        maxWidth='md'
        fullWidth
      >
        <DialogTitle>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Eye size={20} />
            凭证详情
          </Box>
        </DialogTitle>
        <DialogContent dividers>
          {currentVoucher && (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
              <Box
                sx={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(3, 1fr)',
                  gap: 2,
                }}
              >
                <Box sx={{ p: 2, bgcolor: 'grey.50', borderRadius: 1 }}>
                  <Typography
                    variant='body2'
                    sx={{ color: 'text.secondary' }}
                  >
                    凭证编号
                  </Typography>
                  <Typography
                    variant='h6'
                    sx={{ color: 'primary.main', fontWeight: 'bold' }}
                  >
                    {currentVoucher.voucher_number}
                  </Typography>
                </Box>
                <Box sx={{ p: 2, bgcolor: 'grey.50', borderRadius: 1 }}>
                  <Typography
                    variant='body2'
                    sx={{ color: 'text.secondary' }}
                  >
                    凭证日期
                  </Typography>
                  <Typography
                    variant='h6'
                    sx={{ fontWeight: 'bold' }}
                  >
                    {currentVoucher.voucher_date?.split('T')[0]}
                  </Typography>
                </Box>
                <Box sx={{ p: 2, bgcolor: 'grey.50', borderRadius: 1 }}>
                  <Typography
                    variant='body2'
                    sx={{ color: 'text.secondary' }}
                  >
                    状态
                  </Typography>
                  <Box sx={{ mt: 0.5 }}>{getStatusBadge(currentVoucher.status)}</Box>
                </Box>
              </Box>
              <Box sx={{ p: 2, bgcolor: 'grey.50', borderRadius: 1 }}>
                <Typography
                  variant='body2'
                  sx={{ color: 'text.secondary', mb: 0.5 }}
                >
                  摘要
                </Typography>
                <Typography>{currentVoucher.summary || '-'}</Typography>
              </Box>
              <Box
                sx={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(3, 1fr)',
                  gap: 2,
                }}
              >
                <Box sx={{ p: 2, bgcolor: 'grey.50', borderRadius: 1 }}>
                  <Typography
                    variant='body2'
                    sx={{ color: 'text.secondary' }}
                  >
                    制单人
                  </Typography>
                  <Typography sx={{ fontWeight: 500 }}>
                    {currentVoucher.maker_name || '-'}
                  </Typography>
                </Box>
                <Box sx={{ p: 2, bgcolor: 'grey.50', borderRadius: 1 }}>
                  <Typography
                    variant='body2'
                    sx={{ color: 'text.secondary' }}
                  >
                    审核人
                  </Typography>
                  <Typography sx={{ fontWeight: 500 }}>
                    {currentVoucher.checker_name || '-'}
                  </Typography>
                </Box>
                <Box sx={{ p: 2, bgcolor: 'grey.50', borderRadius: 1 }}>
                  <Typography
                    variant='body2'
                    sx={{ color: 'text.secondary' }}
                  >
                    期间
                  </Typography>
                  <Typography sx={{ fontWeight: 500 }}>{currentVoucher.period}</Typography>
                </Box>
              </Box>

              <Box sx={{ borderTop: 1, borderColor: 'divider', pt: 2 }}>
                <Typography
                  variant='subtitle1'
                  sx={{ fontWeight: 600, mb: 2 }}
                >
                  凭证明细
                </Typography>
                <TableContainer
                  component={Paper}
                  variant='outlined'
                >
                  <Table size='small'>
                    <TableHead>
                      <TableRow sx={{ bgcolor: 'grey.50' }}>
                        <TableCell sx={{ width: 60, fontWeight: 'bold' }}>行号</TableCell>
                        <TableCell sx={{ fontWeight: 'bold' }}>科目代码</TableCell>
                        <TableCell sx={{ fontWeight: 'bold' }}>科目名称</TableCell>
                        <TableCell sx={{ fontWeight: 'bold' }}>摘要</TableCell>
                        <TableCell
                          align='right'
                          sx={{ fontWeight: 'bold' }}
                        >
                          借方
                        </TableCell>
                        <TableCell
                          align='right'
                          sx={{ fontWeight: 'bold' }}
                        >
                          贷方
                        </TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {voucherItems.map((item) => (
                        <TableRow key={item.id}>
                          <TableCell>{item.line_number}</TableCell>
                          <TableCell>{item.subject_code}</TableCell>
                          <TableCell>{item.subject_name}</TableCell>
                          <TableCell>{item.summary || '-'}</TableCell>
                          <TableCell
                            align='right'
                            sx={{ color: 'error.main' }}
                          >
                            {item.debit_amount > 0 ? formatCurrency(item.debit_amount) : ''}
                          </TableCell>
                          <TableCell
                            align='right'
                            sx={{ color: 'success.main' }}
                          >
                            {item.credit_amount > 0 ? formatCurrency(item.credit_amount) : ''}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
                <Box
                  sx={{
                    display: 'flex',
                    justifyContent: 'flex-end',
                    gap: 4,
                    mt: 2,
                    pt: 2,
                    borderTop: 1,
                    borderColor: 'divider',
                  }}
                >
                  <Box sx={{ textAlign: 'right' }}>
                    <Typography
                      variant='body2'
                      sx={{ color: 'text.secondary' }}
                    >
                      借方合计
                    </Typography>
                    <Typography
                      variant='h6'
                      sx={{ fontWeight: 'bold', color: 'error.main' }}
                    >
                      {formatCurrency(currentVoucher.total_debit)}
                    </Typography>
                  </Box>
                  <Box sx={{ textAlign: 'right' }}>
                    <Typography
                      variant='body2'
                      sx={{ color: 'text.secondary' }}
                    >
                      贷方合计
                    </Typography>
                    <Typography
                      variant='h6'
                      sx={{ fontWeight: 'bold', color: 'success.main' }}
                    >
                      {formatCurrency(currentVoucher.total_credit)}
                    </Typography>
                  </Box>
                </Box>
              </Box>
            </Box>
          )}
        </DialogContent>
        <DialogActions sx={{ px: 3, py: 2 }}>
          <Button onClick={() => setShowDetailModal(false)}>关闭</Button>
        </DialogActions>
      </Dialog>

      <ConfirmDialog
        isOpen={deleteDialogOpen}
        onClose={() => {
          setDeleteDialogOpen(false);
          setDeletingId(null);
        }}
        onConfirm={confirmDelete}
        title='确认删除'
        message='确定要删除该凭证吗？此操作不可撤销。'
        danger
      />
    </PageContainer>
  );
};

export default VoucherManagementPage;

// Phase 7-2: React Query migration tagged
