import React, { useState, useEffect } from 'react';
import {
  Plus,
  Search,
  Edit2,
  Trash2,
  Eye,
  Calendar,
  Users,
  DollarSign,
  CreditCard,
  AlertCircle,
  CheckCircle2,
  Clock,
  Filter,
  RefreshCw,
  ArrowUpRight,
  ArrowDownRight,
} from 'lucide-react';
import { receivableApi, payableApi, type Receivable, type Payable } from '../api/erp';
import { useAppStore } from '../store';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

const FinanceReceivablePayablePage: React.FC = () => {
  const addNotification = useAppStore((state) => state.addNotification);

  const [activeTab, setActiveTab] = useState<string>('receivable');
  const [receivables, setReceivables] = useState<Receivable[]>([]);
  const [payables, setPayables] = useState<Payable[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [editingItem, setEditingItem] = useState<Receivable | Payable | null>(null);
  const [showDetailDialog, setShowDetailDialog] = useState(false);
  const [selectedItem, setSelectedItem] = useState<Receivable | Payable | null>(null);

  const [formData, setFormData] = useState({
    invoice_number: '',
    customer_name: '',
    supplier_name: '',
    project_name: '',
    category: '',
    amount: '',
    invoice_date: '',
    due_date: '',
    status: 'pending',
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [receivableRes, payableRes] = await Promise.all([receivableApi.list(), payableApi.list()]);
      if (receivableRes.success && receivableRes.data) {
        setReceivables(receivableRes.data.items || []);
      }
      if (payableRes.success && payableRes.data) {
        setPayables(payableRes.data.items || []);
      }
    } catch (err) {
      console.error('加载数据失败:', err);
      addNotification({ title: '错误', message: '加载数据失败', type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const handleCreateReceivable = async () => {
    try {
      const data = {
        invoice_number: formData.invoice_number,
        customer_name: formData.customer_name,
        project_name: formData.project_name,
        amount: parseFloat(formData.amount),
        invoice_date: formData.invoice_date,
        due_date: formData.due_date,
        status: formData.status,
      };
      const response = await receivableApi.create(data);
      if (response.success) {
        addNotification({ title: '成功', message: '应收账款创建成功', type: 'success' });
        setShowCreateDialog(false);
        resetForm();
        loadData();
      }
    } catch (err) {
      console.error('创建应收账款失败:', err);
      addNotification({ title: '错误', message: '创建应收账款失败', type: 'error' });
    }
  };

  const handleCreatePayable = async () => {
    try {
      const data = {
        invoice_number: formData.invoice_number,
        supplier_name: formData.supplier_name,
        category: formData.category,
        amount: parseFloat(formData.amount),
        invoice_date: formData.invoice_date,
        due_date: formData.due_date,
        status: formData.status,
      };
      const response = await payableApi.create(data);
      if (response.success) {
        addNotification({ title: '成功', message: '应付账款创建成功', type: 'success' });
        setShowCreateDialog(false);
        resetForm();
        loadData();
      }
    } catch (err) {
      console.error('创建应付账款失败:', err);
      addNotification({ title: '错误', message: '创建应付账款失败', type: 'error' });
    }
  };

  const handleUpdateReceivable = async () => {
    if (!editingItem) return;
    try {
      const data = {
        invoice_number: formData.invoice_number,
        customer_name: formData.customer_name,
        project_name: formData.project_name,
        amount: parseFloat(formData.amount),
        invoice_date: formData.invoice_date,
        due_date: formData.due_date,
        status: formData.status,
      };
      const response = await receivableApi.update(editingItem.id, data);
      if (response.success) {
        addNotification({ title: '成功', message: '应收账款更新成功', type: 'success' });
        setEditingItem(null);
        setShowCreateDialog(false);
        resetForm();
        loadData();
      }
    } catch (err) {
      console.error('更新应收账款失败:', err);
      addNotification({ title: '错误', message: '更新应收账款失败', type: 'error' });
    }
  };

  const handleUpdatePayable = async () => {
    if (!editingItem) return;
    try {
      const data = {
        invoice_number: formData.invoice_number,
        supplier_name: formData.supplier_name,
        category: formData.category,
        amount: parseFloat(formData.amount),
        invoice_date: formData.invoice_date,
        due_date: formData.due_date,
        status: formData.status,
      };
      const response = await payableApi.update(editingItem.id, data);
      if (response.success) {
        addNotification({ title: '成功', message: '应付账款更新成功', type: 'success' });
        setEditingItem(null);
        setShowCreateDialog(false);
        resetForm();
        loadData();
      }
    } catch (err) {
      console.error('更新应付账款失败:', err);
      addNotification({ title: '错误', message: '更新应付账款失败', type: 'error' });
    }
  };

  const handleDeleteReceivable = async (id: string) => {
    if (!window.confirm('确定要删除此应收账款吗？')) return;
    try {
      const response = await receivableApi.delete(id);
      if (response.success) {
        addNotification({ title: '成功', message: '应收账款删除成功', type: 'success' });
        loadData();
      }
    } catch (err) {
      console.error('删除应收账款失败:', err);
      addNotification({ title: '错误', message: '删除应收账款失败', type: 'error' });
    }
  };

  const handleDeletePayable = async (id: string) => {
    if (!window.confirm('确定要删除此应付账款吗？')) return;
    try {
      const response = await payableApi.delete(id);
      if (response.success) {
        addNotification({ title: '成功', message: '应付账款删除成功', type: 'success' });
        loadData();
      }
    } catch (err) {
      console.error('删除应付账款失败:', err);
      addNotification({ title: '错误', message: '删除应付账款失败', type: 'error' });
    }
  };

  const openEditDialog = (item: Receivable | Payable) => {
    setEditingItem(item);
    if ('customer_name' in item) {
      setFormData({
        invoice_number: item.invoice_number,
        customer_name: item.customer_name || '',
        supplier_name: '',
        project_name: item.project_name || '',
        category: '',
        amount: item.amount.toString(),
        invoice_date: item.invoice_date || '',
        due_date: item.due_date || '',
        status: item.status,
      });
    } else {
      setFormData({
        invoice_number: item.invoice_number,
        customer_name: '',
        supplier_name: item.supplier_name || '',
        project_name: '',
        category: item.category || '',
        amount: item.amount.toString(),
        invoice_date: item.invoice_date || '',
        due_date: item.due_date || '',
        status: item.status,
      });
    }
    setShowCreateDialog(true);
  };

  const openDetailDialog = (item: Receivable | Payable) => {
    setSelectedItem(item);
    setShowDetailDialog(true);
  };

  const resetForm = () => {
    setFormData({
      invoice_number: '',
      customer_name: '',
      supplier_name: '',
      project_name: '',
      category: '',
      amount: '',
      invoice_date: '',
      due_date: '',
      status: 'pending',
    });
  };

  const formatCurrency = (amount: number) => `¥${amount.toLocaleString('zh-CN', { minimumFractionDigits: 2 })}`;

  const getStatusBadge = (status: string) => {
    const variants = {
      pending: 'bg-yellow-100 text-yellow-700',
      partial: 'bg-orange-100 text-orange-700',
      paid: 'bg-green-100 text-green-700',
      overdue: 'bg-red-100 text-red-700',
      cancelled: 'bg-gray-100 text-gray-700',
    };
    const labels = {
      pending: '待收/待付',
      partial: '部分收/付',
      paid: '已结清',
      overdue: '已逾期',
      cancelled: '已取消',
    };
    return (
      <Badge className={variants[status as keyof typeof variants] || variants.pending}>
        {labels[status as keyof typeof labels] || status}
      </Badge>
    );
  };

  const isOverdue = (dueDate?: string) => {
    if (!dueDate) return false;
    return new Date(dueDate) < new Date();
  };

  const totalReceivable = receivables.reduce((sum, r) => sum + r.amount, 0);
  const receivedAmount = receivables.reduce((sum, r) => sum + (r.received_amount || 0), 0);
  const pendingReceivable = receivables
    .filter((r) => r.status !== 'paid')
    .reduce((sum, r) => sum + (r.amount - (r.received_amount || 0)), 0);
  const overdueReceivable = receivables
    .filter((r) => isOverdue(r.due_date) && r.status !== 'paid')
    .reduce((sum, r) => sum + (r.amount - (r.received_amount || 0)), 0);

  const totalPayable = payables.reduce((sum, p) => sum + p.amount, 0);
  const paidAmount = payables.reduce((sum, p) => sum + (p.paid_amount || 0), 0);
  const pendingPayable = payables
    .filter((p) => p.status !== 'paid')
    .reduce((sum, p) => sum + (p.amount - (p.paid_amount || 0)), 0);
  const overduePayable = payables
    .filter((p) => isOverdue(p.due_date) && p.status !== 'paid')
    .reduce((sum, p) => sum + (p.amount - (p.paid_amount || 0)), 0);

  const filteredReceivables = receivables.filter((r) => {
    const matchesSearch =
      r.invoice_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
      r.customer_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      r.project_name?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = !filterStatus || r.status === filterStatus;
    return matchesSearch && matchesStatus;
  });

  const filteredPayables = payables.filter((p) => {
    const matchesSearch =
      p.invoice_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.supplier_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.category?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = !filterStatus || p.status === filterStatus;
    return matchesSearch && matchesStatus;
  });

  return (
    <div className='space-y-6'>
      <div className='flex items-center justify-between'>
        <div>
          <h1 className='text-2xl font-bold'>应收应付管理</h1>
          <p className='text-slate-500 mt-1'>管理企业应收账款和应付账款</p>
        </div>
        <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
          <DialogTrigger asChild>
            <Button className='flex items-center space-x-2'>
              <Plus className='w-4 h-4' />
              <span>新增{activeTab === 'receivable' ? '应收' : '应付'}</span>
            </Button>
          </DialogTrigger>
          <DialogContent className='sm:max-w-md'>
            <DialogHeader>
              <DialogTitle>
                {editingItem ? '编辑' : '新增'}
                {activeTab === 'receivable' ? '应收账款' : '应付账款'}
              </DialogTitle>
            </DialogHeader>
            <div className='space-y-4 mt-4'>
              <div className='space-y-2'>
                <Label htmlFor='invoice_number'>单据编号</Label>
                <Input
                  id='invoice_number'
                  value={formData.invoice_number}
                  onChange={(e) => setFormData({ ...formData, invoice_number: e.target.value })}
                  placeholder='请输入单据编号'
                />
              </div>
              {activeTab === 'receivable' ? (
                <>
                  <div className='space-y-2'>
                    <Label htmlFor='customer_name'>客户名称</Label>
                    <Input
                      id='customer_name'
                      value={formData.customer_name}
                      onChange={(e) => setFormData({ ...formData, customer_name: e.target.value })}
                      placeholder='请输入客户名称'
                    />
                  </div>
                  <div className='space-y-2'>
                    <Label htmlFor='project_name'>项目名称</Label>
                    <Input
                      id='project_name'
                      value={formData.project_name}
                      onChange={(e) => setFormData({ ...formData, project_name: e.target.value })}
                      placeholder='请输入项目名称'
                    />
                  </div>
                </>
              ) : (
                <>
                  <div className='space-y-2'>
                    <Label htmlFor='supplier_name'>供应商名称</Label>
                    <Input
                      id='supplier_name'
                      value={formData.supplier_name}
                      onChange={(e) => setFormData({ ...formData, supplier_name: e.target.value })}
                      placeholder='请输入供应商名称'
                    />
                  </div>
                  <div className='space-y-2'>
                    <Label htmlFor='category'>费用类别</Label>
                    <Select
                      value={formData.category}
                      onValueChange={(value) => setFormData({ ...formData, category: value })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder='选择费用类别' />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value='materials'>材料采购</SelectItem>
                        <SelectItem value='services'>服务费用</SelectItem>
                        <SelectItem value='salary'>薪资福利</SelectItem>
                        <SelectItem value='utilities'>水电费用</SelectItem>
                        <SelectItem value='other'>其他</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </>
              )}
              <div className='space-y-2'>
                <Label htmlFor='amount'>金额</Label>
                <Input
                  id='amount'
                  type='number'
                  value={formData.amount}
                  onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                  placeholder='请输入金额'
                />
              </div>
              <div className='grid grid-cols-2 gap-4'>
                <div className='space-y-2'>
                  <Label htmlFor='invoice_date'>开票日期</Label>
                  <Input
                    id='invoice_date'
                    type='date'
                    value={formData.invoice_date}
                    onChange={(e) => setFormData({ ...formData, invoice_date: e.target.value })}
                  />
                </div>
                <div className='space-y-2'>
                  <Label htmlFor='due_date'>到期日期</Label>
                  <Input
                    id='due_date'
                    type='date'
                    value={formData.due_date}
                    onChange={(e) => setFormData({ ...formData, due_date: e.target.value })}
                  />
                </div>
              </div>
              <div className='space-y-2'>
                <Label htmlFor='status'>状态</Label>
                <Select value={formData.status} onValueChange={(value) => setFormData({ ...formData, status: value })}>
                  <SelectTrigger>
                    <SelectValue placeholder='选择状态' />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value='pending'>待收/待付</SelectItem>
                    <SelectItem value='partial'>部分收/付</SelectItem>
                    <SelectItem value='paid'>已结清</SelectItem>
                    <SelectItem value='overdue'>已逾期</SelectItem>
                    <SelectItem value='cancelled'>已取消</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter className='mt-4'>
              <Button
                variant='outline'
                onClick={() => {
                  setShowCreateDialog(false);
                  setEditingItem(null);
                  resetForm();
                }}
              >
                取消
              </Button>
              <Button
                onClick={
                  editingItem
                    ? activeTab === 'receivable'
                      ? handleUpdateReceivable
                      : handleUpdatePayable
                    : activeTab === 'receivable'
                      ? handleCreateReceivable
                      : handleCreatePayable
                }
              >
                {editingItem ? '更新' : '创建'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4'>
        <Card className='bg-gradient-to-br from-blue-500 to-indigo-500 text-white'>
          <CardContent className='p-6'>
            <div className='flex items-center justify-between'>
              <div>
                <p className='text-sm opacity-80'>应收总额</p>
                <p className='text-3xl font-bold mt-2'>{formatCurrency(totalReceivable)}</p>
              </div>
              <div className='p-3 bg-white/20 rounded-full'>
                <ArrowUpRight className='w-6 h-6' />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className='bg-gradient-to-br from-green-500 to-emerald-500 text-white'>
          <CardContent className='p-6'>
            <div className='flex items-center justify-between'>
              <div>
                <p className='text-sm opacity-80'>应付总额</p>
                <p className='text-3xl font-bold mt-2'>{formatCurrency(totalPayable)}</p>
              </div>
              <div className='p-3 bg-white/20 rounded-full'>
                <ArrowDownRight className='w-6 h-6' />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className='bg-gradient-to-br from-orange-500 to-red-500 text-white'>
          <CardContent className='p-6'>
            <div className='flex items-center justify-between'>
              <div>
                <p className='text-sm opacity-80'>待收金额</p>
                <p className='text-3xl font-bold mt-2'>{formatCurrency(pendingReceivable)}</p>
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
                <p className='text-sm opacity-80'>待付金额</p>
                <p className='text-3xl font-bold mt-2'>{formatCurrency(pendingPayable)}</p>
              </div>
              <div className='p-3 bg-white/20 rounded-full'>
                <CreditCard className='w-6 h-6' />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className='w-full'>
        <TabsList className='mb-4'>
          <TabsTrigger value='receivable' className='flex items-center space-x-2'>
            <ArrowUpRight className='w-4 h-4' />
            <span>应收账款</span>
          </TabsTrigger>
          <TabsTrigger value='payable' className='flex items-center space-x-2'>
            <ArrowDownRight className='w-4 h-4' />
            <span>应付账款</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value='receivable' className='space-y-4'>
          <div className='flex flex-col sm:flex-row gap-4'>
            <div className='flex-1 relative'>
              <Search className='absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400' />
              <Input
                placeholder='搜索单据编号、客户名称或项目...'
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className='pl-10'
              />
            </div>
            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger className='w-32'>
                <SelectValue placeholder='状态筛选' />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value=''>全部</SelectItem>
                <SelectItem value='pending'>待收</SelectItem>
                <SelectItem value='partial'>部分收</SelectItem>
                <SelectItem value='paid'>已结清</SelectItem>
                <SelectItem value='overdue'>已逾期</SelectItem>
              </SelectContent>
            </Select>
            <Button variant='outline' size='sm' onClick={loadData}>
              <RefreshCw className='w-4 h-4 mr-2' />
              刷新
            </Button>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className='flex items-center justify-between'>
                <span className='flex items-center'>
                  <Users className='w-5 h-5 mr-2 text-indigo-600' />
                  应收账款列表
                </span>
                {overdueReceivable > 0 && (
                  <Badge className='bg-red-500 text-white'>{formatCurrency(overdueReceivable)} 逾期</Badge>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className='p-8 text-center'>
                  <div className='inline-block animate-spin rounded-full h-8 w-8 border-4 border-blue-600 border-t-transparent' />
                  <p className='mt-2 text-slate-500'>加载中...</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>单据编号</TableHead>
                      <TableHead>客户名称</TableHead>
                      <TableHead>项目名称</TableHead>
                      <TableHead className='text-right'>金额</TableHead>
                      <TableHead className='text-right'>已收</TableHead>
                      <TableHead className='text-right'>待收</TableHead>
                      <TableHead>到期日期</TableHead>
                      <TableHead>状态</TableHead>
                      <TableHead className='text-right'>操作</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredReceivables.length > 0 ? (
                      filteredReceivables.map((item) => (
                        <TableRow key={item.id}>
                          <TableCell className='font-medium'>{item.invoice_number}</TableCell>
                          <TableCell>{item.customer_name || '-'}</TableCell>
                          <TableCell>{item.project_name || '-'}</TableCell>
                          <TableCell className='text-right'>{formatCurrency(item.amount)}</TableCell>
                          <TableCell className='text-right'>{formatCurrency(item.received_amount || 0)}</TableCell>
                          <TableCell
                            className={`text-right font-medium ${isOverdue(item.due_date) && item.status !== 'paid' ? 'text-red-600' : 'text-orange-600'}`}
                          >
                            {formatCurrency(item.amount - (item.received_amount || 0))}
                          </TableCell>
                          <TableCell
                            className={isOverdue(item.due_date) && item.status !== 'paid' ? 'text-red-600' : ''}
                          >
                            {item.due_date ? new Date(item.due_date).toLocaleDateString() : '-'}
                          </TableCell>
                          <TableCell>{getStatusBadge(item.status)}</TableCell>
                          <TableCell className='text-right'>
                            <div className='flex items-center justify-end space-x-2'>
                              <Button variant='ghost' size='sm' onClick={() => openDetailDialog(item)}>
                                <Eye className='w-4 h-4' />
                              </Button>
                              <Button variant='ghost' size='sm' onClick={() => openEditDialog(item)}>
                                <Edit2 className='w-4 h-4' />
                              </Button>
                              <Button
                                variant='ghost'
                                size='sm'
                                className='text-red-500'
                                onClick={() => handleDeleteReceivable(item.id)}
                              >
                                <Trash2 className='w-4 h-4' />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell colSpan={9} className='text-center py-8'>
                          <AlertCircle className='w-12 h-12 mx-auto text-slate-300 mb-2' />
                          <p className='text-slate-500'>暂无应收账款数据</p>
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value='payable' className='space-y-4'>
          <div className='flex flex-col sm:flex-row gap-4'>
            <div className='flex-1 relative'>
              <Search className='absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400' />
              <Input
                placeholder='搜索单据编号、供应商或类别...'
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className='pl-10'
              />
            </div>
            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger className='w-32'>
                <SelectValue placeholder='状态筛选' />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value=''>全部</SelectItem>
                <SelectItem value='pending'>待付</SelectItem>
                <SelectItem value='partial'>部分付</SelectItem>
                <SelectItem value='paid'>已结清</SelectItem>
                <SelectItem value='overdue'>已逾期</SelectItem>
              </SelectContent>
            </Select>
            <Button variant='outline' size='sm' onClick={loadData}>
              <RefreshCw className='w-4 h-4 mr-2' />
              刷新
            </Button>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className='flex items-center justify-between'>
                <span className='flex items-center'>
                  <CreditCard className='w-5 h-5 mr-2 text-indigo-600' />
                  应付账款列表
                </span>
                {overduePayable > 0 && (
                  <Badge className='bg-red-500 text-white'>{formatCurrency(overduePayable)} 逾期</Badge>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className='p-8 text-center'>
                  <div className='inline-block animate-spin rounded-full h-8 w-8 border-4 border-blue-600 border-t-transparent' />
                  <p className='mt-2 text-slate-500'>加载中...</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>单据编号</TableHead>
                      <TableHead>供应商</TableHead>
                      <TableHead>费用类别</TableHead>
                      <TableHead className='text-right'>金额</TableHead>
                      <TableHead className='text-right'>已付</TableHead>
                      <TableHead className='text-right'>待付</TableHead>
                      <TableHead>到期日期</TableHead>
                      <TableHead>状态</TableHead>
                      <TableHead className='text-right'>操作</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredPayables.length > 0 ? (
                      filteredPayables.map((item) => (
                        <TableRow key={item.id}>
                          <TableCell className='font-medium'>{item.invoice_number}</TableCell>
                          <TableCell>{item.supplier_name || '-'}</TableCell>
                          <TableCell>{item.category || '-'}</TableCell>
                          <TableCell className='text-right'>{formatCurrency(item.amount)}</TableCell>
                          <TableCell className='text-right'>{formatCurrency(item.paid_amount || 0)}</TableCell>
                          <TableCell
                            className={`text-right font-medium ${isOverdue(item.due_date) && item.status !== 'paid' ? 'text-red-600' : 'text-orange-600'}`}
                          >
                            {formatCurrency(item.amount - (item.paid_amount || 0))}
                          </TableCell>
                          <TableCell
                            className={isOverdue(item.due_date) && item.status !== 'paid' ? 'text-red-600' : ''}
                          >
                            {item.due_date ? new Date(item.due_date).toLocaleDateString() : '-'}
                          </TableCell>
                          <TableCell>{getStatusBadge(item.status)}</TableCell>
                          <TableCell className='text-right'>
                            <div className='flex items-center justify-end space-x-2'>
                              <Button variant='ghost' size='sm' onClick={() => openDetailDialog(item)}>
                                <Eye className='w-4 h-4' />
                              </Button>
                              <Button variant='ghost' size='sm' onClick={() => openEditDialog(item)}>
                                <Edit2 className='w-4 h-4' />
                              </Button>
                              <Button
                                variant='ghost'
                                size='sm'
                                className='text-red-500'
                                onClick={() => handleDeletePayable(item.id)}
                              >
                                <Trash2 className='w-4 h-4' />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell colSpan={9} className='text-center py-8'>
                          <AlertCircle className='w-12 h-12 mx-auto text-slate-300 mb-2' />
                          <p className='text-slate-500'>暂无应付账款数据</p>
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <Dialog open={showDetailDialog} onOpenChange={setShowDetailDialog}>
        <DialogContent className='sm:max-w-lg'>
          <DialogHeader>
            <DialogTitle className='flex items-center'>
              {'customer_name' in selectedItem ? (
                <ArrowUpRight className='w-5 h-5 mr-2 text-indigo-600' />
              ) : (
                <ArrowDownRight className='w-5 h-5 mr-2 text-indigo-600' />
              )}
              {'customer_name' in selectedItem ? '应收账款' : '应付账款'}详情
            </DialogTitle>
          </DialogHeader>
          {selectedItem && (
            <div className='space-y-6 mt-4'>
              <div className='grid grid-cols-2 gap-4'>
                <div className='p-4 bg-slate-50 rounded-lg'>
                  <p className='text-sm text-slate-500'>单据编号</p>
                  <p className='font-medium mt-1'>{selectedItem.invoice_number}</p>
                </div>
                {'customer_name' in selectedItem ? (
                  <div className='p-4 bg-slate-50 rounded-lg'>
                    <p className='text-sm text-slate-500'>客户名称</p>
                    <p className='font-medium mt-1'>{selectedItem.customer_name || '-'}</p>
                  </div>
                ) : (
                  <div className='p-4 bg-slate-50 rounded-lg'>
                    <p className='text-sm text-slate-500'>供应商</p>
                    <p className='font-medium mt-1'>{selectedItem.supplier_name || '-'}</p>
                  </div>
                )}
              </div>

              {'project_name' in selectedItem && selectedItem.project_name && (
                <div className='p-4 bg-slate-50 rounded-lg'>
                  <p className='text-sm text-slate-500'>项目名称</p>
                  <p className='font-medium mt-1'>{selectedItem.project_name}</p>
                </div>
              )}

              {'category' in selectedItem && selectedItem.category && (
                <div className='p-4 bg-slate-50 rounded-lg'>
                  <p className='text-sm text-slate-500'>费用类别</p>
                  <p className='font-medium mt-1'>{selectedItem.category}</p>
                </div>
              )}

              <div className='p-4 bg-gradient-to-br from-blue-50 to-indigo-50 rounded-lg'>
                <div className='flex items-center justify-between mb-4'>
                  <span className='text-sm text-slate-500'>总金额</span>
                  <span className='text-2xl font-bold text-indigo-600'>{formatCurrency(selectedItem.amount)}</span>
                </div>
                <div className='grid grid-cols-2 gap-4'>
                  <div>
                    <p className='text-sm text-slate-500'>{'received_amount' in selectedItem ? '已收' : '已付'}</p>
                    <p className='text-lg font-bold text-green-600'>
                      {formatCurrency(
                        ('received_amount' in selectedItem ? selectedItem.received_amount : selectedItem.paid_amount) ||
                          0
                      )}
                    </p>
                  </div>
                  <div>
                    <p className='text-sm text-slate-500'>{'received_amount' in selectedItem ? '待收' : '待付'}</p>
                    <p
                      className={`text-lg font-bold ${isOverdue(selectedItem.due_date) && selectedItem.status !== 'paid' ? 'text-red-600' : 'text-orange-600'}`}
                    >
                      {formatCurrency(
                        selectedItem.amount -
                          (('received_amount' in selectedItem
                            ? selectedItem.received_amount
                            : selectedItem.paid_amount) || 0)
                      )}
                    </p>
                  </div>
                </div>
              </div>

              <div className='grid grid-cols-2 gap-4'>
                <div className='p-4 bg-slate-50 rounded-lg'>
                  <p className='text-sm text-slate-500'>开票日期</p>
                  <p className='font-medium mt-1'>
                    {selectedItem.invoice_date ? new Date(selectedItem.invoice_date).toLocaleDateString() : '-'}
                  </p>
                </div>
                <div
                  className={`p-4 rounded-lg ${isOverdue(selectedItem.due_date) && selectedItem.status !== 'paid' ? 'bg-red-50' : 'bg-slate-50'}`}
                >
                  <p className='text-sm text-slate-500'>到期日期</p>
                  <p
                    className={`font-medium mt-1 ${isOverdue(selectedItem.due_date) && selectedItem.status !== 'paid' ? 'text-red-600' : ''}`}
                  >
                    {selectedItem.due_date ? new Date(selectedItem.due_date).toLocaleDateString() : '-'}
                  </p>
                </div>
              </div>

              <div className='flex items-center justify-between p-4 bg-slate-50 rounded-lg'>
                <span className='text-sm text-slate-500'>状态</span>
                {getStatusBadge(selectedItem.status)}
              </div>

              <div className='flex items-center justify-between text-sm text-slate-500'>
                <span>创建时间: {new Date(selectedItem.created_at).toLocaleString()}</span>
                <span>更新时间: {new Date(selectedItem.updated_at).toLocaleString()}</span>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default FinanceReceivablePayablePage;
