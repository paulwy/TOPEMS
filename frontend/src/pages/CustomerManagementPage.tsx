import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Checkbox } from '@/components/ui/checkbox';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { crmApi, Customer, CreateCustomerRequest, UpdateCustomerRequest } from '@/api/crm';
import { useAppStore } from '@/store';
import { LoadingSpinner } from '@/components/LoadingSpinner';
import { EmptyState } from '@/components/EmptyState';
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from '@/components/ui/pagination';
import { ImportExportModal } from '@/components/ImportExportModal';
import { Search, Plus, Edit, Trash2, Eye, Download } from 'lucide-react';
import { ExportColumn } from '@/utils/importExport';

const customerColumns: ExportColumn<Customer>[] = [
  { key: 'name', label: '客户名称' },
  { key: 'code', label: '客户代码' },
  { key: 'industry', label: '行业' },
  { key: 'website', label: '网站' },
  { key: 'email', label: '邮箱' },
  { key: 'phone', label: '电话' },
  { key: 'address', label: '地址' },
  { key: 'status', label: '状态' },
  { key: 'notes', label: '备注' },
  { key: 'created_at', label: '创建时间' },
];

const CustomerManagementPage: React.FC = () => {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize] = useState(10);
  const [total, setTotal] = useState(0);
  const [showDialog, setShowDialog] = useState(false);
  const [showDetailDialog, setShowDetailDialog] = useState(false);
  const [showImportExport, setShowImportExport] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [formData, setFormData] = useState<CreateCustomerRequest>({
    name: '',
    code: '',
    industry: '',
    website: '',
    email: '',
    phone: '',
    address: '',
    notes: '',
  });

  const { addNotification } = useAppStore();

  useEffect(() => {
    loadCustomers();
  }, [currentPage, pageSize, searchTerm, statusFilter]);

  const loadCustomers = async () => {
    try {
      setLoading(true);
      const params: any = {
        page: currentPage,
        pageSize,
      };
      if (searchTerm) params.search = searchTerm;
      if (statusFilter !== 'all') params.status = statusFilter;

      const response = await crmApi.customers.list(params);
      if (response.success && response.data) {
        setCustomers(response.data.items || []);
        setTotal(response.data.total || 0);
      }
    } catch (error) {
      console.error('加载客户列表失败:', error);
      addNotification({
        type: 'error',
        title: '加载失败',
        message: '无法加载客户列表',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (selectedCustomer) {
        await crmApi.customers.update(selectedCustomer.id, formData as UpdateCustomerRequest);
        addNotification({
          type: 'success',
          title: '更新成功',
          message: '客户信息已更新',
        });
      } else {
        await crmApi.customers.create(formData);
        addNotification({
          type: 'success',
          title: '创建成功',
          message: '新客户已创建',
        });
      }
      setShowDialog(false);
      resetForm();
      loadCustomers();
    } catch (error) {
      console.error('操作失败:', error);
      addNotification({
        type: 'error',
        title: '操作失败',
        message: selectedCustomer ? '更新客户失败' : '创建客户失败',
      });
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('确定要删除这个客户吗?')) return;
    try {
      await crmApi.customers.delete(id);
      addNotification({
        type: 'success',
        title: '删除成功',
        message: '客户已删除',
      });
      loadCustomers();
    } catch (error) {
      console.error('删除失败:', error);
      addNotification({
        type: 'error',
        title: '删除失败',
        message: '无法删除客户',
      });
    }
  };

  const handleBatchDelete = async () => {
    if (selectedIds.length === 0) return;
    if (!window.confirm(`确定要删除选中的 ${selectedIds.length} 个客户吗?`)) return;
    try {
      await crmApi.customers.batchDelete(selectedIds);
      addNotification({
        type: 'success',
        title: '删除成功',
        message: `已删除 ${selectedIds.length} 个客户`,
      });
      setSelectedIds([]);
      loadCustomers();
    } catch (error) {
      console.error('批量删除失败:', error);
      addNotification({
        type: 'error',
        title: '删除失败',
        message: '批量删除失败',
      });
    }
  };

  const handleImportSuccess = async (data: Customer[]) => {
    for (const item of data) {
      try {
        await crmApi.customers.create({
          name: item.name,
          code: item.code,
          industry: item.industry,
          website: item.website,
          email: item.email,
          phone: item.phone,
          address: item.address,
          notes: item.notes,
        });
      } catch (error) {
        console.error('导入单个客户失败:', error);
      }
    }
    addNotification({
      type: 'success',
      title: '导入完成',
      message: `成功导入 ${data.length} 条客户数据`,
    });
    loadCustomers();
  };

  const handleEdit = (customer: Customer) => {
    setSelectedCustomer(customer);
    setFormData({
      name: customer.name,
      code: customer.code || '',
      industry: customer.industry || '',
      website: customer.website || '',
      email: customer.email || '',
      phone: customer.phone || '',
      address: customer.address || '',
      notes: customer.notes || '',
    });
    setShowDialog(true);
  };

  const handleViewDetail = (customer: Customer) => {
    setSelectedCustomer(customer);
    setShowDetailDialog(true);
  };

  const resetForm = () => {
    setSelectedCustomer(null);
    setFormData({
      name: '',
      code: '',
      industry: '',
      website: '',
      email: '',
      phone: '',
      address: '',
      notes: '',
    });
  };

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => (prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]));
  };

  const toggleSelectAll = () => {
    if (selectedIds.length === customers.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(customers.map((c) => c.id));
    }
  };

  const getStatusBadge = (status: string) => {
    const statusMap: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
      active: { label: '活跃', variant: 'default' },
      inactive: { label: '非活跃', variant: 'secondary' },
      prospect: { label: '潜在', variant: 'outline' },
    };
    const s = statusMap[status] || { label: status, variant: 'outline' };
    return <Badge variant={s.variant}>{s.label}</Badge>;
  };

  if (loading) return <LoadingSpinner />;

  return (
    <div className='space-y-6'>
      <Card>
        <CardHeader>
          <CardTitle>客户管理</CardTitle>
          <CardDescription>管理客户信息,包括客户基本信息、联系方式等</CardDescription>
        </CardHeader>
        <CardContent>
          <div className='flex flex-col sm:flex-row gap-4 mb-6'>
            <div className='flex-1'>
              <div className='relative'>
                <Search className='absolute left-2 top-2.5 h-4 w-4 text-muted-foreground' />
                <Input
                  placeholder='搜索客户名称或代码...'
                  value={searchTerm}
                  onChange={(e) => {
                    setSearchTerm(e.target.value);
                    setCurrentPage(1);
                  }}
                  className='pl-8'
                />
              </div>
            </div>
            <Select
              value={statusFilter}
              onValueChange={(value) => {
                setStatusFilter(value);
                setCurrentPage(1);
              }}
            >
              <SelectTrigger className='w-[150px]'>
                <SelectValue placeholder='状态筛选' />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value='all'>全部状态</SelectItem>
                <SelectItem value='active'>活跃</SelectItem>
                <SelectItem value='inactive'>非活跃</SelectItem>
                <SelectItem value='prospect'>潜在</SelectItem>
              </SelectContent>
            </Select>
            <Button
              onClick={() => {
                resetForm();
                setShowDialog(true);
              }}
            >
              <Plus className='mr-2 h-4 w-4' />
              新增客户
            </Button>
            <Button variant='outline' onClick={() => setShowImportExport(true)}>
              <Download className='mr-2 h-4 w-4' />
              导入导出
            </Button>
          </div>

          {selectedIds.length > 0 && (
            <div className='mb-4 p-3 bg-muted rounded-lg flex items-center justify-between'>
              <span className='text-sm'>已选择 {selectedIds.length} 个客户</span>
              <Button variant='destructive' size='sm' onClick={handleBatchDelete}>
                <Trash2 className='mr-2 h-4 w-4' />
                批量删除
              </Button>
            </div>
          )}

          <div className='rounded-md border'>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className='w-[50px]'>
                    <Checkbox
                      checked={selectedIds.length === customers.length && customers.length > 0}
                      onCheckedChange={toggleSelectAll}
                    />
                  </TableHead>
                  <TableHead>客户名称</TableHead>
                  <TableHead>客户代码</TableHead>
                  <TableHead>行业</TableHead>
                  <TableHead>邮箱</TableHead>
                  <TableHead>电话</TableHead>
                  <TableHead>状态</TableHead>
                  <TableHead className='text-right'>操作</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {customers.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className='text-center'>
                      <EmptyState title='暂无客户数据' description='点击上方按钮添加第一个客户' />
                    </TableCell>
                  </TableRow>
                ) : (
                  customers.map((customer) => (
                    <TableRow key={customer.id}>
                      <TableCell>
                        <Checkbox
                          checked={selectedIds.includes(customer.id)}
                          onCheckedChange={() => toggleSelect(customer.id)}
                        />
                      </TableCell>
                      <TableCell className='font-medium'>{customer.name}</TableCell>
                      <TableCell>{customer.code || '-'}</TableCell>
                      <TableCell>{customer.industry || '-'}</TableCell>
                      <TableCell>{customer.email || '-'}</TableCell>
                      <TableCell>{customer.phone || '-'}</TableCell>
                      <TableCell>{getStatusBadge(customer.status)}</TableCell>
                      <TableCell className='text-right'>
                        <Button variant='ghost' size='sm' onClick={() => handleViewDetail(customer)}>
                          <Eye className='h-4 w-4' />
                        </Button>
                        <Button variant='ghost' size='sm' onClick={() => handleEdit(customer)}>
                          <Edit className='h-4 w-4' />
                        </Button>
                        <Button variant='ghost' size='sm' onClick={() => handleDelete(customer.id)}>
                          <Trash2 className='h-4 w-4' />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>

          <div className='mt-4 flex items-center justify-between'>
            <div className='text-sm text-muted-foreground'>
              共 {total} 条记录,第 {currentPage} / {Math.ceil(total / pageSize) || 1} 页
            </div>
            <Pagination>
              <PaginationContent>
                <PaginationItem>
                  <PaginationPrevious
                    onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                    className={currentPage === 1 ? 'pointer-events-none opacity-50' : 'cursor-pointer'}
                  />
                </PaginationItem>
                {Array.from({ length: Math.min(5, Math.ceil(total / pageSize)) }, (_, i) => {
                  const page = i + 1;
                  return (
                    <PaginationItem key={page}>
                      <PaginationLink
                        onClick={() => setCurrentPage(page)}
                        isActive={currentPage === page}
                        className='cursor-pointer'
                      >
                        {page}
                      </PaginationLink>
                    </PaginationItem>
                  );
                })}
                <PaginationItem>
                  <PaginationNext
                    onClick={() => setCurrentPage(Math.min(Math.ceil(total / pageSize), currentPage + 1))}
                    className={
                      currentPage >= Math.ceil(total / pageSize) ? 'pointer-events-none opacity-50' : 'cursor-pointer'
                    }
                  />
                </PaginationItem>
              </PaginationContent>
            </Pagination>
          </div>
        </CardContent>
      </Card>

      {/* 导入导出对话框 */}
      <ImportExportModal
        open={showImportExport}
        onOpenChange={setShowImportExport}
        data={customers}
        columns={customerColumns}
        fileName='customers'
        onImportSuccess={handleImportSuccess}
      />

      {/* 新增/编辑对话框 */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className='max-w-2xl'>
          <DialogHeader>
            <DialogTitle>{selectedCustomer ? '编辑客户' : '新增客户'}</DialogTitle>
            <DialogDescription>{selectedCustomer ? '修改客户信息' : '填写新客户信息'}</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit}>
            <div className='grid grid-cols-2 gap-4 py-4'>
              <div className='space-y-2'>
                <Label htmlFor='name'>客户名称 *</Label>
                <Input
                  id='name'
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                />
              </div>
              <div className='space-y-2'>
                <Label htmlFor='code'>客户代码</Label>
                <Input
                  id='code'
                  value={formData.code}
                  onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                />
              </div>
              <div className='space-y-2'>
                <Label htmlFor='industry'>行业</Label>
                <Input
                  id='industry'
                  value={formData.industry}
                  onChange={(e) => setFormData({ ...formData, industry: e.target.value })}
                />
              </div>
              <div className='space-y-2'>
                <Label htmlFor='website'>网站</Label>
                <Input
                  id='website'
                  type='url'
                  value={formData.website}
                  onChange={(e) => setFormData({ ...formData, website: e.target.value })}
                />
              </div>
              <div className='space-y-2'>
                <Label htmlFor='email'>邮箱</Label>
                <Input
                  id='email'
                  type='email'
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                />
              </div>
              <div className='space-y-2'>
                <Label htmlFor='phone'>电话</Label>
                <Input
                  id='phone'
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                />
              </div>
              <div className='col-span-2 space-y-2'>
                <Label htmlFor='address'>地址</Label>
                <Input
                  id='address'
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                />
              </div>
              <div className='col-span-2 space-y-2'>
                <Label htmlFor='notes'>备注</Label>
                <Textarea
                  id='notes'
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  rows={3}
                />
              </div>
            </div>
            <DialogFooter>
              <Button type='button' variant='outline' onClick={() => setShowDialog(false)}>
                取消
              </Button>
              <Button type='submit'>保存</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* 详情对话框 */}
      <Dialog open={showDetailDialog} onOpenChange={setShowDetailDialog}>
        <DialogContent className='max-w-2xl'>
          <DialogHeader>
            <DialogTitle>客户详情</DialogTitle>
          </DialogHeader>
          {selectedCustomer && (
            <div className='space-y-4'>
              <div className='grid grid-cols-2 gap-4'>
                <div>
                  <Label className='text-muted-foreground'>客户名称</Label>
                  <p className='font-medium'>{selectedCustomer.name}</p>
                </div>
                <div>
                  <Label className='text-muted-foreground'>客户代码</Label>
                  <p>{selectedCustomer.code || '-'}</p>
                </div>
                <div>
                  <Label className='text-muted-foreground'>行业</Label>
                  <p>{selectedCustomer.industry || '-'}</p>
                </div>
                <div>
                  <Label className='text-muted-foreground'>网站</Label>
                  <p>{selectedCustomer.website || '-'}</p>
                </div>
                <div>
                  <Label className='text-muted-foreground'>邮箱</Label>
                  <p>{selectedCustomer.email || '-'}</p>
                </div>
                <div>
                  <Label className='text-muted-foreground'>电话</Label>
                  <p>{selectedCustomer.phone || '-'}</p>
                </div>
                <div className='col-span-2'>
                  <Label className='text-muted-foreground'>地址</Label>
                  <p>{selectedCustomer.address || '-'}</p>
                </div>
                <div>
                  <Label className='text-muted-foreground'>状态</Label>
                  <div>{getStatusBadge(selectedCustomer.status)}</div>
                </div>
                <div>
                  <Label className='text-muted-foreground'>创建时间</Label>
                  <p>{new Date(selectedCustomer.created_at).toLocaleString('zh-CN')}</p>
                </div>
                <div className='col-span-2'>
                  <Label className='text-muted-foreground'>备注</Label>
                  <p>{selectedCustomer.notes || '-'}</p>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default CustomerManagementPage;
