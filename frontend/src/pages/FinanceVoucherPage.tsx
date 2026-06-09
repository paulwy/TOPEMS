import React, { useState, useEffect, useMemo } from 'react';
import {
  FileText,
  Plus,
  Edit,
  Trash2,
  Eye,
  Upload,
  Download,
  ChevronLeft,
  Calendar,
  Search,
  X,
  Check,
  AlertCircle,
  RefreshCw,
  DollarSign,
  FileCheck,
  Clock,
  Building2,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import {
  voucherApi,
  accountingSubjectApi,
  type FinancialVoucher,
  type VoucherItem,
  type VoucherItemRequest,
  type AccountingSubject,
} from '../api/erp';
import { useAppStore } from '../store';
import type { ColumnDef } from '@tanstack/react-table';
import { DataTable } from '@/components/DataTable';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';

const FinanceVoucherPage: React.FC = () => {
  const navigate = useNavigate();
  const addNotification = useAppStore((state) => state.addNotification);

  const [activeTab, setActiveTab] = useState<string>('vouchers');
  const [searchQuery, setSearchQuery] = useState('');
  const [periodFilter, setPeriodFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  const [vouchers, setVouchers] = useState<FinancialVoucher[]>([]);
  const [subjects, setSubjects] = useState<AccountingSubject[]>([]);
  const [voucherItems, setVoucherItems] = useState<VoucherItem[]>([]);

  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [currentVoucher, setCurrentVoucher] = useState<FinancialVoucher | null>(null);

  const [newVoucher, setNewVoucher] = useState({
    voucher_number: '',
    voucher_date: '',
    period: '',
    attachment_count: 0,
    summary: '',
    maker_name: '',
    items: [] as VoucherItemRequest[],
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [voucherResult, subjectResult] = await Promise.all([voucherApi.list(), accountingSubjectApi.list()]);

      if (voucherResult.success && voucherResult.data) {
        setVouchers(voucherResult.data.items || []);
      }

      if (subjectResult.success && subjectResult.data) {
        setSubjects(subjectResult.data.items || []);
      }
    } catch (err) {
      console.error('加载数据失败:', err);
      addNotification({ title: '错误', message: '加载数据失败', type: 'error' });
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
    } catch (err) {
      console.error('加载凭证明细失败:', err);
    }
  };

  const handleCreate = async () => {
    if (!newVoucher.voucher_number || !newVoucher.voucher_date || !newVoucher.period) {
      addNotification({ title: '提示', message: '请填写必填字段', type: 'warning' });
      return;
    }

    const totalDebit = newVoucher.items.reduce((sum, item) => sum + item.debit_amount, 0);
    const totalCredit = newVoucher.items.reduce((sum, item) => sum + item.credit_amount, 0);

    if (totalDebit !== totalCredit) {
      addNotification({ title: '错误', message: '借贷不平，无法创建凭证', type: 'error' });
      return;
    }

    try {
      const result = await voucherApi.create({
        ...newVoucher,
        items: newVoucher.items,
      });

      if (result.success) {
        addNotification({ title: '成功', message: '凭证创建成功', type: 'success' });
        setShowCreateModal(false);
        resetForm();
        loadData();
      } else {
        addNotification({ title: '失败', message: result.message || '创建失败', type: 'error' });
      }
    } catch (err) {
      addNotification({ title: '错误', message: '操作失败', type: 'error' });
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('确定要删除该凭证吗？')) return;

    try {
      const result = await voucherApi.delete(id);
      if (result.success) {
        addNotification({ title: '成功', message: '删除成功', type: 'success' });
        loadData();
      } else {
        addNotification({ title: '失败', message: result.message || '删除失败', type: 'error' });
      }
    } catch (err) {
      addNotification({ title: '错误', message: '操作失败', type: 'error' });
    }
  };

  const handleImport = async (fileContent: string) => {
    try {
      const result = await voucherApi.importU8({
        file_name: 'u8_vouchers.json',
        file_content: fileContent,
        import_mode: 'insert',
      });

      if (result.success && result.data) {
        const { success_count, failed_count, errors } = result.data;
        if (failed_count === 0) {
          addNotification({ title: '成功', message: `成功导入${success_count}张凭证`, type: 'success' });
        } else {
          addNotification({
            title: '部分成功',
            message: `成功导入${success_count}张，失败${failed_count}张`,
            type: 'warning',
          });
          errors.forEach((err) => console.warn('导入错误:', err));
        }
        setShowImportModal(false);
        loadData();
      }
    } catch (err) {
      addNotification({ title: '错误', message: '导入失败', type: 'error' });
    }
  };

  const resetForm = () => {
    setNewVoucher({
      voucher_number: '',
      voucher_date: '',
      period: '',
      attachment_count: 0,
      summary: '',
      maker_name: '',
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

  const getStatusBadge = (status: string) => {
    const badges: Record<string, { variant: 'default' | 'secondary' | 'destructive' | 'outline'; label: string }> = {
      draft: { variant: 'outline', label: '草稿' },
      pending: { variant: 'secondary', label: '待审核' },
      approved: { variant: 'default', label: '已审核' },
      posted: { variant: 'default', label: '已记账' },
      imported: { variant: 'secondary', label: '已导入' },
    };
    const config = badges[status] || { variant: 'outline' as const, label: status };
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  const formatCurrency = (amount: number) => `¥${amount.toLocaleString('zh-CN', { minimumFractionDigits: 2 })}`;

  const voucherColumns = useMemo<ColumnDef<FinancialVoucher>[]>(
    () => [
      {
        accessorKey: 'voucher_number',
        header: '凭证编号',
        cell: ({ row }) => <div className='font-medium text-blue-600'>{row.original.voucher_number}</div>,
      },
      {
        accessorKey: 'voucher_date',
        header: '凭证日期',
        cell: ({ row }) => (
          <div className='text-sm text-slate-900 dark:text-slate-100'>
            {row.original.voucher_date?.split('T')[0] || '-'}
          </div>
        ),
      },
      {
        accessorKey: 'period',
        header: '期间',
        cell: ({ row }) => <div className='text-sm text-slate-500 dark:text-slate-400'>{row.original.period}</div>,
      },
      {
        accessorKey: 'total_debit',
        header: '借方金额',
        cell: ({ row }) => <div className='font-bold text-red-600'>{formatCurrency(row.original.total_debit)}</div>,
      },
      {
        accessorKey: 'total_credit',
        header: '贷方金额',
        cell: ({ row }) => <div className='font-bold text-green-600'>{formatCurrency(row.original.total_credit)}</div>,
      },
      {
        accessorKey: 'maker_name',
        header: '制单人',
        cell: ({ row }) => (
          <div className='text-sm text-slate-900 dark:text-slate-100'>{row.original.maker_name || '-'}</div>
        ),
      },
      {
        accessorKey: 'status',
        header: '状态',
        cell: ({ row }) => getStatusBadge(row.original.status),
      },
      {
        id: 'actions',
        header: '操作',
        cell: ({ row }) => (
          <div className='flex items-center space-x-2'>
            <Button
              variant='ghost'
              size='sm'
              onClick={() => {
                setCurrentVoucher(row.original);
                loadVoucherItems(row.original.id);
                setShowDetailModal(true);
              }}
            >
              <Eye className='w-4 h-4' />
            </Button>
            <Button
              variant='ghost'
              size='sm'
              onClick={() => {
                setNewVoucher({
                  voucher_number: row.original.voucher_number,
                  voucher_date: row.original.voucher_date?.split('T')[0] || '',
                  period: row.original.period,
                  attachment_count: row.original.attachment_count || 0,
                  summary: row.original.summary || '',
                  maker_name: row.original.maker_name || '',
                  items: [],
                });
                setShowCreateModal(true);
              }}
            >
              <Edit className='w-4 h-4' />
            </Button>
            <Button variant='ghost' size='sm' className='text-red-600' onClick={() => handleDelete(row.original.id)}>
              <Trash2 className='w-4 h-4' />
            </Button>
          </div>
        ),
      },
    ],
    []
  );

  const filteredVouchers = useMemo(() => {
    return vouchers.filter((voucher) => {
      const matchesSearch =
        !searchQuery ||
        voucher.voucher_number.toLowerCase().includes(searchQuery.toLowerCase()) ||
        voucher.summary?.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesPeriod = !periodFilter || voucher.period === periodFilter;
      const matchesStatus = !statusFilter || voucher.status === statusFilter;
      return matchesSearch && matchesPeriod && matchesStatus;
    });
  }, [vouchers, searchQuery, periodFilter, statusFilter]);

  return (
    <div className='min-h-screen bg-slate-50 dark:bg-slate-900'>
      <div className='bg-white dark:bg-slate-800 shadow-sm border-b border-slate-200 dark:border-slate-700'>
        <div className='max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6'>
          <div className='flex items-center justify-between'>
            <div className='flex items-center space-x-4'>
              <Button variant='ghost' onClick={() => navigate('/dashboard')}>
                <ChevronLeft className='w-5 h-5' />
              </Button>
              <div>
                <h1 className='text-2xl font-bold text-slate-900 dark:text-slate-100 flex items-center'>
                  <FileText className='w-7 h-7 mr-3 text-indigo-600' />
                  财务凭证管理
                </h1>
                <p className='mt-1 text-sm text-slate-500 dark:text-slate-400'>
                  管理财务凭证、会计科目，支持用友凭证导入
                </p>
              </div>
            </div>
            <div className='flex items-center space-x-2'>
              <Button onClick={() => setShowImportModal(true)} className='bg-green-600 hover:bg-green-700'>
                <Upload className='w-4 h-4 mr-2' />
                导入用友凭证
              </Button>
              <Button
                onClick={() => {
                  resetForm();
                  setShowCreateModal(true);
                }}
              >
                <Plus className='w-4 h-4 mr-2' />
                新增凭证
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className='max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6'>
        <Tabs value={activeTab} onValueChange={setActiveTab} className='w-full'>
          <TabsList className='mb-6'>
            <TabsTrigger value='vouchers' className='flex items-center space-x-2'>
              <FileText className='w-4 h-4' />
              <span>财务凭证</span>
            </TabsTrigger>
            <TabsTrigger value='subjects' className='flex items-center space-x-2'>
              <Search className='w-4 h-4' />
              <span>会计科目</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value='vouchers' className='space-y-4'>
            <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4'>
              <Card className='bg-gradient-to-br from-blue-500 to-indigo-500 text-white'>
                <CardContent className='p-6'>
                  <div className='flex items-center justify-between'>
                    <div>
                      <p className='text-sm opacity-80'>凭证总数</p>
                      <p className='text-3xl font-bold mt-2'>{vouchers.length}</p>
                    </div>
                    <div className='p-3 bg-white/20 rounded-full'>
                      <FileText className='w-6 h-6' />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className='bg-gradient-to-br from-green-500 to-emerald-500 text-white'>
                <CardContent className='p-6'>
                  <div className='flex items-center justify-between'>
                    <div>
                      <p className='text-sm opacity-80'>已审核</p>
                      <p className='text-3xl font-bold mt-2'>
                        {vouchers.filter((v) => v.status === 'approved' || v.status === 'posted').length}
                      </p>
                    </div>
                    <div className='p-3 bg-white/20 rounded-full'>
                      <FileCheck className='w-6 h-6' />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className='bg-gradient-to-br from-orange-500 to-red-500 text-white'>
                <CardContent className='p-6'>
                  <div className='flex items-center justify-between'>
                    <div>
                      <p className='text-sm opacity-80'>待审核</p>
                      <p className='text-3xl font-bold mt-2'>{vouchers.filter((v) => v.status === 'pending').length}</p>
                    </div>
                    <div className='p-3 bg-white/20 rounded-full'>
                      <Clock className='w-6 h-6' />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className='bg-gradient-to-br from-purple-500 to-violet-500 text-white'>
                <CardContent className='p-6'>
                  <div className='flex items-center justify-between'>
                    <div>
                      <p className='text-sm opacity-80'>总金额</p>
                      <p className='text-3xl font-bold mt-2'>
                        {formatCurrency(vouchers.reduce((sum, v) => sum + v.total_debit, 0))}
                      </p>
                    </div>
                    <div className='p-3 bg-white/20 rounded-full'>
                      <DollarSign className='w-6 h-6' />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            <div className='flex items-center justify-between'>
              <div className='flex items-center space-x-4'>
                <div className='relative flex-1 max-w-md'>
                  <Search className='absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400' />
                  <Input
                    placeholder='搜索凭证编号或摘要...'
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className='pl-10'
                  />
                </div>
                <Select value={periodFilter} onValueChange={setPeriodFilter}>
                  <SelectTrigger className='w-32'>
                    <SelectValue placeholder='选择期间' />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value='all'>全部期间</SelectItem>
                    <SelectItem value='2024-01'>2024年01月</SelectItem>
                    <SelectItem value='2024-02'>2024年02月</SelectItem>
                    <SelectItem value='2024-03'>2024年03月</SelectItem>
                    <SelectItem value='2024-04'>2024年04月</SelectItem>
                    <SelectItem value='2024-05'>2024年05月</SelectItem>
                    <SelectItem value='2024-06'>2024年06月</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className='w-32'>
                    <SelectValue placeholder='选择状态' />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value='all'>全部状态</SelectItem>
                    <SelectItem value='draft'>草稿</SelectItem>
                    <SelectItem value='pending'>待审核</SelectItem>
                    <SelectItem value='approved'>已审核</SelectItem>
                    <SelectItem value='posted'>已记账</SelectItem>
                    <SelectItem value='imported'>已导入</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Button variant='outline' size='sm' onClick={loadData}>
                <RefreshCw className='w-4 h-4 mr-2' />
                刷新
              </Button>
            </div>

            <Card>
              <CardHeader>
                <CardTitle className='flex items-center'>
                  <FileText className='w-5 h-5 mr-2 text-indigo-600' />
                  财务凭证列表
                </CardTitle>
              </CardHeader>
              <CardContent className='p-0'>
                {loading ? (
                  <div className='p-8 text-center'>
                    <div className='inline-block animate-spin rounded-full h-8 w-8 border-4 border-blue-600 border-t-transparent' />
                    <p className='mt-2 text-slate-500 dark:text-slate-400'>加载中...</p>
                  </div>
                ) : (
                  <DataTable
                    columns={voucherColumns}
                    data={filteredVouchers}
                    searchPlaceholder='搜索凭证...'
                    searchKey='voucher_number'
                  />
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value='subjects' className='space-y-4'>
            <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4'>
              <Card className='bg-gradient-to-br from-blue-50 to-indigo-50'>
                <CardContent className='p-6'>
                  <div className='flex items-center justify-between'>
                    <div>
                      <p className='text-sm text-slate-500'>科目总数</p>
                      <p className='text-3xl font-bold text-indigo-600 mt-2'>{subjects.length}</p>
                    </div>
                    <div className='p-3 bg-blue-100 rounded-full'>
                      <Building2 className='w-6 h-6 text-blue-600' />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className='bg-gradient-to-br from-green-50 to-emerald-50'>
                <CardContent className='p-6'>
                  <div className='flex items-center justify-between'>
                    <div>
                      <p className='text-sm text-slate-500'>已启用</p>
                      <p className='text-3xl font-bold text-green-600 mt-2'>
                        {subjects.filter((s) => s.status === 'active').length}
                      </p>
                    </div>
                    <div className='p-3 bg-green-100 rounded-full'>
                      <FileCheck className='w-6 h-6 text-green-600' />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className='bg-gradient-to-br from-orange-50 to-amber-50'>
                <CardContent className='p-6'>
                  <div className='flex items-center justify-between'>
                    <div>
                      <p className='text-sm text-slate-500'>一级科目</p>
                      <p className='text-3xl font-bold text-orange-600 mt-2'>
                        {subjects.filter((s) => s.level === 1).length}
                      </p>
                    </div>
                    <div className='p-3 bg-orange-100 rounded-full'>
                      <DollarSign className='w-6 h-6 text-orange-600' />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className='bg-gradient-to-br from-purple-50 to-violet-50'>
                <CardContent className='p-6'>
                  <div className='flex items-center justify-between'>
                    <div>
                      <p className='text-sm text-slate-500'>现金流量科目</p>
                      <p className='text-3xl font-bold text-purple-600 mt-2'>
                        {subjects.filter((s) => s.is_cash_flow).length}
                      </p>
                    </div>
                    <div className='p-3 bg-purple-100 rounded-full'>
                      <Clock className='w-6 h-6 text-purple-600' />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4'>
              {subjects.map((subject) => (
                <Card key={subject.id} className='hover:shadow-md transition-shadow border border-slate-200'>
                  <CardContent className='p-5'>
                    <div className='flex items-start justify-between mb-3'>
                      <div className='flex items-center space-x-2'>
                        <span className='font-bold text-indigo-600 text-lg'>{subject.code}</span>
                        {subject.is_cash_flow && (
                          <Badge variant='secondary' className='text-xs'>
                            现金流量
                          </Badge>
                        )}
                      </div>
                      <Badge
                        variant={subject.status === 'active' ? 'default' : 'outline'}
                        className='bg-green-100 text-green-700 hover:bg-green-100'
                      >
                        {subject.status === 'active' ? '启用' : '禁用'}
                      </Badge>
                    </div>
                    <h3 className='text-lg font-semibold text-slate-900'>{subject.name}</h3>
                    <div className='flex items-center space-x-4 mt-2 text-sm text-slate-500'>
                      <span>层级: {subject.level}</span>
                      <span className='w-1 h-1 bg-slate-300 rounded-full' />
                      <span>{subject.category || '未分类'}</span>
                    </div>
                    {subject.parent_code && (
                      <div className='mt-3 pt-3 border-t border-slate-100'>
                        <p className='text-xs text-slate-400'>
                          <span className='font-medium'>上级科目:</span> {subject.parent_code}
                        </p>
                      </div>
                    )}
                    {subject.description && (
                      <p className='text-sm text-slate-500 mt-2 line-clamp-2'>{subject.description}</p>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>
        </Tabs>
      </div>

      <Dialog open={showCreateModal} onOpenChange={setShowCreateModal}>
        <DialogContent className='max-w-3xl'>
          <DialogHeader>
            <DialogTitle>{newVoucher.voucher_number ? '编辑凭证' : '新增财务凭证'}</DialogTitle>
          </DialogHeader>
          <div className='space-y-4 mt-4'>
            <div className='grid grid-cols-3 gap-4'>
              <div className='space-y-2'>
                <Label>凭证编号 *</Label>
                <Input
                  value={newVoucher.voucher_number}
                  onChange={(e) => setNewVoucher((prev) => ({ ...prev, voucher_number: e.target.value }))}
                  placeholder='请输入凭证编号'
                />
              </div>
              <div className='space-y-2'>
                <Label>凭证日期 *</Label>
                <Input
                  type='date'
                  value={newVoucher.voucher_date}
                  onChange={(e) => setNewVoucher((prev) => ({ ...prev, voucher_date: e.target.value }))}
                />
              </div>
              <div className='space-y-2'>
                <Label>期间 *</Label>
                <Input
                  value={newVoucher.period}
                  onChange={(e) => setNewVoucher((prev) => ({ ...prev, period: e.target.value }))}
                  placeholder='如: 2024-06'
                />
              </div>
            </div>
            <div className='grid grid-cols-2 gap-4'>
              <div className='space-y-2'>
                <Label>附件数量</Label>
                <Input
                  type='number'
                  value={newVoucher.attachment_count}
                  onChange={(e) =>
                    setNewVoucher((prev) => ({ ...prev, attachment_count: parseInt(e.target.value) || 0 }))
                  }
                />
              </div>
              <div className='space-y-2'>
                <Label>制单人</Label>
                <Input
                  value={newVoucher.maker_name}
                  onChange={(e) => setNewVoucher((prev) => ({ ...prev, maker_name: e.target.value }))}
                  placeholder='制单人姓名'
                />
              </div>
            </div>
            <div className='space-y-2'>
              <Label>摘要</Label>
              <textarea
                className='w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500'
                value={newVoucher.summary}
                onChange={(e) => setNewVoucher((prev) => ({ ...prev, summary: e.target.value }))}
                placeholder='凭证摘要'
                rows={2}
              />
            </div>

            <div className='border-t pt-4'>
              <div className='flex items-center justify-between mb-3'>
                <h3 className='font-semibold'>凭证明细</h3>
                <Button size='sm' onClick={addVoucherItem}>
                  <Plus className='w-4 h-4' />
                  添加分录
                </Button>
              </div>
              <ScrollArea className='h-64'>
                <div className='space-y-2'>
                  {newVoucher.items.map((item, index) => (
                    <div key={index} className='flex items-center space-x-2 p-3 bg-slate-50 rounded-md'>
                      <span className='w-6 text-center text-sm font-medium text-slate-500'>{item.line_number}</span>
                      <div className='flex-1'>
                        <Select
                          value={item.subject_code}
                          onValueChange={(value) => updateVoucherItem(index, 'subject_code', value)}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder='选择科目' />
                          </SelectTrigger>
                          <SelectContent>
                            {subjects.map((s) => (
                              <SelectItem key={s.id} value={s.code}>
                                {s.code} - {s.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <Input className='w-32' type='text' value={item.subject_name} readOnly placeholder='科目名称' />
                      <Input
                        className='w-32'
                        type='number'
                        value={item.debit_amount || ''}
                        onChange={(e) => updateVoucherItem(index, 'debit_amount', parseFloat(e.target.value) || 0)}
                        placeholder='借方'
                      />
                      <Input
                        className='w-32'
                        type='number'
                        value={item.credit_amount || ''}
                        onChange={(e) => updateVoucherItem(index, 'credit_amount', parseFloat(e.target.value) || 0)}
                        placeholder='贷方'
                      />
                      <Button
                        variant='ghost'
                        size='sm'
                        className='text-red-600'
                        onClick={() => removeVoucherItem(index)}
                      >
                        <X className='w-4 h-4' />
                      </Button>
                    </div>
                  ))}
                </div>
              </ScrollArea>
              <div className='flex justify-end mt-3 space-x-4'>
                <div className='text-right'>
                  <p className='text-sm text-slate-500'>借方合计</p>
                  <p className='font-bold text-red-600'>
                    {formatCurrency(newVoucher.items.reduce((sum, item) => sum + item.debit_amount, 0))}
                  </p>
                </div>
                <div className='text-right'>
                  <p className='text-sm text-slate-500'>贷方合计</p>
                  <p className='font-bold text-green-600'>
                    {formatCurrency(newVoucher.items.reduce((sum, item) => sum + item.credit_amount, 0))}
                  </p>
                </div>
              </div>
            </div>
          </div>
          <DialogFooter className='mt-4'>
            <Button
              variant='outline'
              onClick={() => {
                setShowCreateModal(false);
                resetForm();
              }}
            >
              取消
            </Button>
            <Button onClick={handleCreate}>
              <Check className='w-4 h-4 mr-2' />
              保存凭证
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showImportModal} onOpenChange={setShowImportModal}>
        <DialogContent className='max-w-2xl'>
          <DialogHeader>
            <DialogTitle>导入用友财务凭证</DialogTitle>
          </DialogHeader>
          <div className='space-y-4 mt-4'>
            <div className='p-4 bg-blue-50 rounded-lg'>
              <AlertCircle className='w-5 h-5 text-blue-600 mb-2' />
              <p className='text-sm text-blue-800'>
                请将用友U8系统导出的凭证数据粘贴到下方文本框中。支持JSON格式数据导入。
              </p>
            </div>
            <div className='space-y-2'>
              <Label>用友凭证数据 (JSON格式)</Label>
              <textarea
                className='w-full h-64 rounded-md border border-slate-300 px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-500'
                id='importData'
                placeholder='[{"voucher_number": "记-001", "voucher_date": "2024-01-15", "period": "2024-01", "summary": "支付办公费用", "maker": "张三", "items": [{"line_number": 1, "subject_code": "6602", "subject_name": "管理费用", "summary": "办公用品", "debit_amount": 500.00, "credit_amount": 0}]}]'
              />
            </div>
            <div className='flex items-center space-x-2'>
              <Button
                variant='outline'
                onClick={() => {
                  const sampleData = JSON.stringify(
                    [
                      {
                        voucher_number: '记-001',
                        voucher_date: '2024-01-15',
                        period: '2024-01',
                        summary: '支付办公费用',
                        maker: '张三',
                        items: [
                          {
                            line_number: 1,
                            subject_code: '6602',
                            subject_name: '管理费用',
                            summary: '办公用品',
                            debit_amount: 500.0,
                            credit_amount: 0,
                          },
                          {
                            line_number: 2,
                            subject_code: '1002',
                            subject_name: '银行存款',
                            summary: '',
                            debit_amount: 0,
                            credit_amount: 500.0,
                          },
                        ],
                      },
                    ],
                    null,
                    2
                  );
                  (document.getElementById('importData') as HTMLTextAreaElement).value = sampleData;
                }}
              >
                <Download className='w-4 h-4 mr-2' />
                加载示例数据
              </Button>
            </div>
          </div>
          <DialogFooter className='mt-4'>
            <Button variant='outline' onClick={() => setShowImportModal(false)}>
              取消
            </Button>
            <Button
              className='bg-green-600 hover:bg-green-700'
              onClick={() => {
                const content = (document.getElementById('importData') as HTMLTextAreaElement).value;
                if (!content.trim()) {
                  addNotification({ title: '提示', message: '请输入凭证数据', type: 'warning' });
                  return;
                }
                handleImport(content);
              }}
            >
              <Upload className='w-4 h-4 mr-2' />
              开始导入
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showDetailModal} onOpenChange={setShowDetailModal}>
        <DialogContent className='max-w-2xl'>
          <DialogHeader>
            <DialogTitle>凭证详情</DialogTitle>
          </DialogHeader>
          {currentVoucher && (
            <div className='space-y-4 mt-4'>
              <div className='grid grid-cols-2 gap-4'>
                <div className='p-3 bg-slate-50 rounded-lg'>
                  <p className='text-sm text-slate-500'>凭证编号</p>
                  <p className='font-bold text-indigo-600'>{currentVoucher.voucher_number}</p>
                </div>
                <div className='p-3 bg-slate-50 rounded-lg'>
                  <p className='text-sm text-slate-500'>凭证日期</p>
                  <p className='font-bold'>{currentVoucher.voucher_date?.split('T')[0]}</p>
                </div>
                <div className='p-3 bg-slate-50 rounded-lg'>
                  <p className='text-sm text-slate-500'>期间</p>
                  <p className='font-bold'>{currentVoucher.period}</p>
                </div>
                <div className='p-3 bg-slate-50 rounded-lg'>
                  <p className='text-sm text-slate-500'>状态</p>
                  {getStatusBadge(currentVoucher.status)}
                </div>
              </div>
              <div className='p-3 bg-slate-50 rounded-lg'>
                <p className='text-sm text-slate-500'>摘要</p>
                <p className='font-medium'>{currentVoucher.summary || '-'}</p>
              </div>
              <div className='grid grid-cols-2 gap-4'>
                <div className='p-3 bg-slate-50 rounded-lg'>
                  <p className='text-sm text-slate-500'>制单人</p>
                  <p className='font-medium'>{currentVoucher.maker_name || '-'}</p>
                </div>
                <div className='p-3 bg-slate-50 rounded-lg'>
                  <p className='text-sm text-slate-500'>审核人</p>
                  <p className='font-medium'>{currentVoucher.checker_name || '-'}</p>
                </div>
              </div>
              <div className='border-t pt-4'>
                <h3 className='font-semibold mb-3'>凭证明细</h3>
                <div className='space-y-2'>
                  {voucherItems.map((item) => (
                    <div key={item.id} className='flex items-center justify-between p-3 bg-slate-50 rounded-md'>
                      <div className='flex items-center space-x-4'>
                        <span className='w-6 text-center text-sm text-slate-500'>{item.line_number}</span>
                        <span className='font-medium'>{item.subject_code}</span>
                        <span>{item.subject_name}</span>
                        <span className='text-sm text-slate-500'>{item.summary}</span>
                      </div>
                      <div className='flex items-center space-x-6'>
                        <span className='text-red-600 font-bold'>
                          {item.debit_amount > 0 ? formatCurrency(item.debit_amount) : ''}
                        </span>
                        <span className='text-green-600 font-bold'>
                          {item.credit_amount > 0 ? formatCurrency(item.credit_amount) : ''}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
                <div className='flex justify-end mt-4 space-x-8 border-t pt-4'>
                  <div className='text-right'>
                    <p className='text-sm text-slate-500'>借方合计</p>
                    <p className='font-bold text-red-600'>{formatCurrency(currentVoucher.total_debit)}</p>
                  </div>
                  <div className='text-right'>
                    <p className='text-sm text-slate-500'>贷方合计</p>
                    <p className='font-bold text-green-600'>{formatCurrency(currentVoucher.total_credit)}</p>
                  </div>
                </div>
              </div>
            </div>
          )}
          <DialogFooter className='mt-4'>
            <Button onClick={() => setShowDetailModal(false)}>关闭</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default FinanceVoucherPage;
