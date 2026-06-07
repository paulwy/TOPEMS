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
import { scmApi, Supplier, CreateSupplierRequest, UpdateSupplierRequest } from '@/api/scm';
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
import { Search, Plus, Edit, Trash2, Eye } from 'lucide-react';

const SupplierManagementPage: React.FC = () => {
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize] = useState(10);
  const [total, setTotal] = useState(0);
  const [showDialog, setShowDialog] = useState(false);
  const [showDetailDialog, setShowDetailDialog] = useState(false);
  const [selectedSupplier, setSelectedSupplier] = useState<Supplier | null>(null);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [formData, setFormData] = useState<CreateSupplierRequest>({
    name: '',
    short_name: '',
    contact_name: '',
    contact_phone: '',
    email: '',
    address: '',
    bank_account: '',
    tax_number: '',
  });

  const { addNotification } = useAppStore();

  useEffect(() => {
    loadSuppliers();
  }, [currentPage, pageSize, searchTerm, statusFilter]);

  const loadSuppliers = async () => {
    try {
      setLoading(true);
      const params: any = {
        page: currentPage,
        page_size: pageSize,
      };
      if (searchTerm) params.search = searchTerm;
      if (statusFilter !== 'all') params.status = statusFilter;

      const response = await scmApi.suppliers.list(params);
      if (response.success && response.data) {
        setSuppliers(response.data.items || []);
        setTotal(response.data.total || 0);
      }
    } catch (error) {
      console.error('加载供应商列表失败:', error);
      addNotification({
        type: 'error',
        title: '加载失败',
        message: '无法加载供应商列表',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (selectedSupplier) {
        await scmApi.suppliers.update(selectedSupplier.id, formData as UpdateSupplierRequest);
        addNotification({
          type: 'success',
          title: '更新成功',
          message: '供应商信息已更新',
        });
      } else {
        await scmApi.suppliers.create(formData);
        addNotification({
          type: 'success',
          title: '创建成功',
          message: '新供应商已创建',
        });
      }
      setShowDialog(false);
      resetForm();
      loadSuppliers();
    } catch (error) {
      console.error('操作失败:', error);
      addNotification({
        type: 'error',
        title: '操作失败',
        message: selectedSupplier ? '更新供应商失败' : '创建供应商失败',
      });
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('确定要删除这个供应商吗?')) return;
    try {
      await scmApi.suppliers.delete(id);
      addNotification({
        type: 'success',
        title: '删除成功',
        message: '供应商已删除',
      });
      loadSuppliers();
    } catch (error) {
      console.error('删除失败:', error);
      addNotification({
        type: 'error',
        title: '删除失败',
        message: '无法删除供应商',
      });
    }
  };

  const handleEdit = (supplier: Supplier) => {
    setSelectedSupplier(supplier);
    setFormData({
      name: supplier.name,
      short_name: supplier.short_name || '',
      contact_name: supplier.contact_name || '',
      contact_phone: supplier.contact_phone || '',
      email: supplier.email || '',
      address: supplier.address || '',
      bank_account: supplier.bank_account || '',
      tax_number: supplier.tax_number || '',
    });
    setShowDialog(true);
  };

  const handleViewDetail = (supplier: Supplier) => {
    setSelectedSupplier(supplier);
    setShowDetailDialog(true);
  };

  const resetForm = () => {
    setSelectedSupplier(null);
    setFormData({
      name: '',
      short_name: '',
      contact_name: '',
      contact_phone: '',
      email: '',
      address: '',
      bank_account: '',
      tax_number: '',
    });
  };

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => (prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]));
  };

  const toggleSelectAll = () => {
    if (selectedIds.length === suppliers.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(suppliers.map((s) => s.id));
    }
  };

  const getStatusBadge = (status: string) => {
    const statusMap: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
      active: { label: '活跃', variant: 'default' },
      inactive: { label: '非活跃', variant: 'secondary' },
      blocked: { label: '已冻结', variant: 'destructive' },
    };
    const s = statusMap[status] || { label: status, variant: 'outline' };
    return <Badge variant={s.variant}>{s.label}</Badge>;
  };

  if (loading) return <LoadingSpinner />;

  return (
    <div className='space-y-6'>
      <Card>
        <CardHeader>
          <CardTitle>供应商管理</CardTitle>
          <CardDescription>管理供应商信息,包括基本信息、联系方式、银行账户等</CardDescription>
        </CardHeader>
        <CardContent>
          <div className='flex flex-col sm:flex-row gap-4 mb-6'>
            <div className='flex-1'>
              <div className='relative'>
                <Search className='absolute left-2 top-2.5 h-4 w-4 text-muted-foreground' />
                <Input
                  placeholder='搜索供应商名称或联系人...'
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
                <SelectItem value='blocked'>已冻结</SelectItem>
              </SelectContent>
            </Select>
            <Button
              onClick={() => {
                resetForm();
                setShowDialog(true);
              }}
            >
              <Plus className='mr-2 h-4 w-4' />
              新增供应商
            </Button>
          </div>

          {selectedIds.length > 0 && (
            <div className='mb-4 p-3 bg-muted rounded-lg flex items-center justify-between'>
              <span className='text-sm'>已选择 {selectedIds.length} 个供应商</span>
              <Button variant='destructive' size='sm' onClick={() => setSelectedIds([])}>
                清除选择
              </Button>
            </div>
          )}

          <div className='rounded-md border'>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className='w-[50px]'>
                    <Checkbox
                      checked={selectedIds.length === suppliers.length && suppliers.length > 0}
                      onCheckedChange={toggleSelectAll}
                    />
                  </TableHead>
                  <TableHead>供应商名称</TableHead>
                  <TableHead>简称</TableHead>
                  <TableHead>联系人</TableHead>
                  <TableHead>联系电话</TableHead>
                  <TableHead>邮箱</TableHead>
                  <TableHead>状态</TableHead>
                  <TableHead className='text-right'>操作</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {suppliers.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className='text-center'>
                      <EmptyState title='暂无供应商数据' description='点击上方按钮添加第一个供应商' />
                    </TableCell>
                  </TableRow>
                ) : (
                  suppliers.map((supplier) => (
                    <TableRow key={supplier.id}>
                      <TableCell>
                        <Checkbox
                          checked={selectedIds.includes(supplier.id)}
                          onCheckedChange={() => toggleSelect(supplier.id)}
                        />
                      </TableCell>
                      <TableCell className='font-medium'>{supplier.name}</TableCell>
                      <TableCell>{supplier.short_name || '-'}</TableCell>
                      <TableCell>{supplier.contact_name || '-'}</TableCell>
                      <TableCell>{supplier.contact_phone || '-'}</TableCell>
                      <TableCell>{supplier.email || '-'}</TableCell>
                      <TableCell>{getStatusBadge(supplier.status)}</TableCell>
                      <TableCell className='text-right'>
                        <Button variant='ghost' size='sm' onClick={() => handleViewDetail(supplier)}>
                          <Eye className='h-4 w-4' />
                        </Button>
                        <Button variant='ghost' size='sm' onClick={() => handleEdit(supplier)}>
                          <Edit className='h-4 w-4' />
                        </Button>
                        <Button variant='ghost' size='sm' onClick={() => handleDelete(supplier.id)}>
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

      {/* 新增/编辑对话框 */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className='max-w-2xl'>
          <DialogHeader>
            <DialogTitle>{selectedSupplier ? '编辑供应商' : '新增供应商'}</DialogTitle>
            <DialogDescription>{selectedSupplier ? '修改供应商信息' : '填写新供应商信息'}</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit}>
            <div className='grid grid-cols-2 gap-4 py-4'>
              <div className='space-y-2'>
                <Label htmlFor='name'>供应商名称 *</Label>
                <Input
                  id='name'
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                />
              </div>
              <div className='space-y-2'>
                <Label htmlFor='short_name'>简称</Label>
                <Input
                  id='short_name'
                  value={formData.short_name}
                  onChange={(e) => setFormData({ ...formData, short_name: e.target.value })}
                />
              </div>
              <div className='space-y-2'>
                <Label htmlFor='contact_name'>联系人</Label>
                <Input
                  id='contact_name'
                  value={formData.contact_name}
                  onChange={(e) => setFormData({ ...formData, contact_name: e.target.value })}
                />
              </div>
              <div className='space-y-2'>
                <Label htmlFor='contact_phone'>联系电话</Label>
                <Input
                  id='contact_phone'
                  value={formData.contact_phone}
                  onChange={(e) => setFormData({ ...formData, contact_phone: e.target.value })}
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
                <Label htmlFor='bank_account'>银行账户</Label>
                <Input
                  id='bank_account'
                  value={formData.bank_account}
                  onChange={(e) => setFormData({ ...formData, bank_account: e.target.value })}
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
                <Label htmlFor='tax_number'>税号</Label>
                <Input
                  id='tax_number'
                  value={formData.tax_number}
                  onChange={(e) => setFormData({ ...formData, tax_number: e.target.value })}
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
            <DialogTitle>供应商详情</DialogTitle>
          </DialogHeader>
          {selectedSupplier && (
            <div className='space-y-4'>
              <div className='grid grid-cols-2 gap-4'>
                <div>
                  <Label className='text-muted-foreground'>供应商名称</Label>
                  <p className='font-medium'>{selectedSupplier.name}</p>
                </div>
                <div>
                  <Label className='text-muted-foreground'>简称</Label>
                  <p>{selectedSupplier.short_name || '-'}</p>
                </div>
                <div>
                  <Label className='text-muted-foreground'>联系人</Label>
                  <p>{selectedSupplier.contact_name || '-'}</p>
                </div>
                <div>
                  <Label className='text-muted-foreground'>联系电话</Label>
                  <p>{selectedSupplier.contact_phone || '-'}</p>
                </div>
                <div>
                  <Label className='text-muted-foreground'>邮箱</Label>
                  <p>{selectedSupplier.email || '-'}</p>
                </div>
                <div>
                  <Label className='text-muted-foreground'>银行账户</Label>
                  <p>{selectedSupplier.bank_account || '-'}</p>
                </div>
                <div className='col-span-2'>
                  <Label className='text-muted-foreground'>地址</Label>
                  <p>{selectedSupplier.address || '-'}</p>
                </div>
                <div>
                  <Label className='text-muted-foreground'>税号</Label>
                  <p>{selectedSupplier.tax_number || '-'}</p>
                </div>
                <div>
                  <Label className='text-muted-foreground'>状态</Label>
                  <div>{getStatusBadge(selectedSupplier.status)}</div>
                </div>
                <div>
                  <Label className='text-muted-foreground'>创建时间</Label>
                  <p>{new Date(selectedSupplier.created_at).toLocaleString('zh-CN')}</p>
                </div>
                <div>
                  <Label className='text-muted-foreground'>更新时间</Label>
                  <p>{new Date(selectedSupplier.updated_at).toLocaleString('zh-CN')}</p>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default SupplierManagementPage;