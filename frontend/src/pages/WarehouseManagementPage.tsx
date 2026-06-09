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
import { Label } from '@/components/ui/label';
import type { Warehouse, CreateWarehouseRequest, UpdateWarehouseRequest } from '@/api/wms';
import { wmsApi } from '@/api/wms';
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

const WarehouseManagementPage: React.FC = () => {
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize] = useState(10);
  const [total, setTotal] = useState(0);
  const [showDialog, setShowDialog] = useState(false);
  const [showDetailDialog, setShowDetailDialog] = useState(false);
  const [selectedWarehouse, setSelectedWarehouse] = useState<Warehouse | null>(null);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [formData, setFormData] = useState<CreateWarehouseRequest>({
    name: '',
    code: '',
    address: '',
    manager: '',
    phone: '',
  });

  const { addNotification } = useAppStore();

  useEffect(() => {
    loadWarehouses();
  }, [currentPage, pageSize, searchTerm, statusFilter]);

  const loadWarehouses = async () => {
    try {
      setLoading(true);
      const params: any = {
        page: currentPage,
        page_size: pageSize,
      };
      if (searchTerm) params.search = searchTerm;
      if (statusFilter !== 'all') params.status = statusFilter;

      const response = await wmsApi.warehouses.list(params);
      if (response.success && response.data) {
        setWarehouses(response.data.items || []);
        setTotal(response.data.total || 0);
      }
    } catch (error) {
      console.error('加载仓库列表失败:', error);
      addNotification({
        type: 'error',
        title: '加载失败',
        message: '无法加载仓库列表',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (selectedWarehouse) {
        await wmsApi.warehouses.update(selectedWarehouse.id, formData as UpdateWarehouseRequest);
        addNotification({
          type: 'success',
          title: '更新成功',
          message: '仓库信息已更新',
        });
      } else {
        await wmsApi.warehouses.create(formData);
        addNotification({
          type: 'success',
          title: '创建成功',
          message: '新仓库已创建',
        });
      }
      setShowDialog(false);
      resetForm();
      loadWarehouses();
    } catch (error) {
      console.error('操作失败:', error);
      addNotification({
        type: 'error',
        title: '操作失败',
        message: selectedWarehouse ? '更新仓库失败' : '创建仓库失败',
      });
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('确定要删除这个仓库吗?')) return;
    try {
      await wmsApi.warehouses.delete(id);
      addNotification({
        type: 'success',
        title: '删除成功',
        message: '仓库已删除',
      });
      loadWarehouses();
    } catch (error) {
      console.error('删除失败:', error);
      addNotification({
        type: 'error',
        title: '删除失败',
        message: '无法删除仓库',
      });
    }
  };

  const handleEdit = (warehouse: Warehouse) => {
    setSelectedWarehouse(warehouse);
    setFormData({
      name: warehouse.name,
      code: warehouse.code || '',
      address: warehouse.address || '',
      manager: warehouse.manager || '',
      phone: warehouse.phone || '',
    });
    setShowDialog(true);
  };

  const handleViewDetail = (warehouse: Warehouse) => {
    setSelectedWarehouse(warehouse);
    setShowDetailDialog(true);
  };

  const resetForm = () => {
    setSelectedWarehouse(null);
    setFormData({
      name: '',
      code: '',
      address: '',
      manager: '',
      phone: '',
    });
  };

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => (prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]));
  };

  const toggleSelectAll = () => {
    if (selectedIds.length === warehouses.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(warehouses.map((w) => w.id));
    }
  };

  const getStatusBadge = (status: string) => {
    const statusMap: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
      active: { label: '活跃', variant: 'default' },
      inactive: { label: '非活跃', variant: 'secondary' },
      maintenance: { label: '维护中', variant: 'outline' },
    };
    const s = statusMap[status] || { label: status, variant: 'outline' };
    return <Badge variant={s.variant}>{s.label}</Badge>;
  };

  if (loading) return <LoadingSpinner />;

  return (
    <div className='space-y-6'>
      <Card>
        <CardHeader>
          <CardTitle>仓库管理</CardTitle>
          <CardDescription>管理仓库信息,包括仓库名称、编码、地址、负责人等</CardDescription>
        </CardHeader>
        <CardContent>
          <div className='flex flex-col sm:flex-row gap-4 mb-6'>
            <div className='flex-1'>
              <div className='relative'>
                <Search className='absolute left-2 top-2.5 h-4 w-4 text-muted-foreground' />
                <Input
                  placeholder='搜索仓库名称或编码...'
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
                <SelectItem value='maintenance'>维护中</SelectItem>
              </SelectContent>
            </Select>
            <Button
              onClick={() => {
                resetForm();
                setShowDialog(true);
              }}
            >
              <Plus className='mr-2 h-4 w-4' />
              新增仓库
            </Button>
          </div>

          {selectedIds.length > 0 && (
            <div className='mb-4 p-3 bg-muted rounded-lg flex items-center justify-between'>
              <span className='text-sm'>已选择 {selectedIds.length} 个仓库</span>
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
                      checked={selectedIds.length === warehouses.length && warehouses.length > 0}
                      onCheckedChange={toggleSelectAll}
                    />
                  </TableHead>
                  <TableHead>仓库名称</TableHead>
                  <TableHead>仓库编码</TableHead>
                  <TableHead>地址</TableHead>
                  <TableHead>负责人</TableHead>
                  <TableHead>联系电话</TableHead>
                  <TableHead>状态</TableHead>
                  <TableHead className='text-right'>操作</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {warehouses.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className='text-center'>
                      <EmptyState title='暂无仓库数据' description='点击上方按钮添加第一个仓库' />
                    </TableCell>
                  </TableRow>
                ) : (
                  warehouses.map((warehouse) => (
                    <TableRow key={warehouse.id}>
                      <TableCell>
                        <Checkbox
                          checked={selectedIds.includes(warehouse.id)}
                          onCheckedChange={() => toggleSelect(warehouse.id)}
                        />
                      </TableCell>
                      <TableCell className='font-medium'>{warehouse.name}</TableCell>
                      <TableCell>{warehouse.code || '-'}</TableCell>
                      <TableCell>{warehouse.address || '-'}</TableCell>
                      <TableCell>{warehouse.manager || '-'}</TableCell>
                      <TableCell>{warehouse.phone || '-'}</TableCell>
                      <TableCell>{getStatusBadge(warehouse.status)}</TableCell>
                      <TableCell className='text-right'>
                        <Button variant='ghost' size='sm' onClick={() => handleViewDetail(warehouse)}>
                          <Eye className='h-4 w-4' />
                        </Button>
                        <Button variant='ghost' size='sm' onClick={() => handleEdit(warehouse)}>
                          <Edit className='h-4 w-4' />
                        </Button>
                        <Button variant='ghost' size='sm' onClick={() => handleDelete(warehouse.id)}>
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
            <DialogTitle>{selectedWarehouse ? '编辑仓库' : '新增仓库'}</DialogTitle>
            <DialogDescription>{selectedWarehouse ? '修改仓库信息' : '填写新仓库信息'}</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit}>
            <div className='grid grid-cols-2 gap-4 py-4'>
              <div className='space-y-2'>
                <Label htmlFor='name'>仓库名称 *</Label>
                <Input
                  id='name'
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                />
              </div>
              <div className='space-y-2'>
                <Label htmlFor='code'>仓库编码</Label>
                <Input
                  id='code'
                  value={formData.code}
                  onChange={(e) => setFormData({ ...formData, code: e.target.value })}
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
              <div className='space-y-2'>
                <Label htmlFor='manager'>负责人</Label>
                <Input
                  id='manager'
                  value={formData.manager}
                  onChange={(e) => setFormData({ ...formData, manager: e.target.value })}
                />
              </div>
              <div className='space-y-2'>
                <Label htmlFor='phone'>联系电话</Label>
                <Input
                  id='phone'
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
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
            <DialogTitle>仓库详情</DialogTitle>
          </DialogHeader>
          {selectedWarehouse && (
            <div className='space-y-4'>
              <div className='grid grid-cols-2 gap-4'>
                <div>
                  <Label className='text-muted-foreground'>仓库名称</Label>
                  <p className='font-medium'>{selectedWarehouse.name}</p>
                </div>
                <div>
                  <Label className='text-muted-foreground'>仓库编码</Label>
                  <p>{selectedWarehouse.code || '-'}</p>
                </div>
                <div className='col-span-2'>
                  <Label className='text-muted-foreground'>地址</Label>
                  <p>{selectedWarehouse.address || '-'}</p>
                </div>
                <div>
                  <Label className='text-muted-foreground'>负责人</Label>
                  <p>{selectedWarehouse.manager || '-'}</p>
                </div>
                <div>
                  <Label className='text-muted-foreground'>联系电话</Label>
                  <p>{selectedWarehouse.phone || '-'}</p>
                </div>
                <div>
                  <Label className='text-muted-foreground'>状态</Label>
                  <div>{getStatusBadge(selectedWarehouse.status)}</div>
                </div>
                <div>
                  <Label className='text-muted-foreground'>创建时间</Label>
                  <p>{new Date(selectedWarehouse.created_at).toLocaleString('zh-CN')}</p>
                </div>
                <div>
                  <Label className='text-muted-foreground'>更新时间</Label>
                  <p>{new Date(selectedWarehouse.updated_at).toLocaleString('zh-CN')}</p>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default WarehouseManagementPage;
