import React, { useState, useEffect, useMemo } from 'react';
import { Package, Search, Plus, Edit, Trash2, ChevronLeft, AlertCircle, DollarSign, MapPin } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { officeSupplyApi, type OfficeSupply } from '../api/erp';
import { useAppStore } from '../store';
import type { ColumnDef } from '@tanstack/react-table';
import { DataTable } from '@/components/DataTable';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { ModeToggle } from '@/components/ModeToggle';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

interface OfficeSuppliesManagementPageProps {
  onNavigate?: (page: string) => void;
}

const OfficeSuppliesManagementPage: React.FC<OfficeSuppliesManagementPageProps> = ({ onNavigate }) => {
  const navigate = useNavigate();
  const addNotification = useAppStore((state) => state.addNotification);

  const [supplies, setSupplies] = useState<OfficeSupply[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedSupply, setSelectedSupply] = useState<OfficeSupply | null>(null);

  const [newSupply, setNewSupply] = useState<Partial<OfficeSupply>>({
    name: '',
    category: '',
    quantity: 0,
    unit: '',
    price: 0,
    location: '',
    status: 'active',
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await officeSupplyApi.list();
      if (res.success && res.data) {
        setSupplies(res.data.items || []);
      } else {
        setSupplies([]);
      }
    } catch (err: any) {
      setError(err.message || '加载数据失败');
      addNotification({ title: '加载失败', message: '加载数据失败', type: 'error' });
      setSupplies([]);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateSupply = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await officeSupplyApi.create(newSupply);
      if (res.success) {
        addNotification({ title: '成功', message: '办公用品创建成功', type: 'success' });
        setShowCreateModal(false);
        setNewSupply({
          name: '',
          category: '',
          quantity: 0,
          unit: '',
          price: 0,
          location: '',
          status: 'active',
        });
        loadData();
      } else {
        addNotification({ title: '失败', message: res.message || '创建办公用品失败', type: 'error' });
      }
    } catch (err: any) {
      addNotification({ title: '失败', message: err.message || '创建办公用品失败', type: 'error' });
    }
  };

  const handleDeleteSupply = async (id: string) => {
    if (!confirm('确定要删除这个办公用品吗？')) return;
    try {
      const res = await officeSupplyApi.delete(id);
      if (res.success) {
        addNotification({ title: '成功', message: '办公用品删除成功', type: 'success' });
        loadData();
      } else {
        addNotification({ title: '失败', message: res.message || '删除办公用品失败', type: 'error' });
      }
    } catch (err: any) {
      addNotification({ title: '失败', message: err.message || '删除办公用品失败', type: 'error' });
    }
  };

  const handleEditSupply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSupply) return;
    try {
      const res = await officeSupplyApi.update(selectedSupply.id, selectedSupply);
      if (res.success) {
        addNotification({ title: '成功', message: '办公用品信息更新成功', type: 'success' });
        setShowEditModal(false);
        setSelectedSupply(null);
        loadData();
      } else {
        addNotification({ title: '失败', message: res.message || '更新办公用品失败', type: 'error' });
      }
    } catch (err: any) {
      addNotification({ title: '失败', message: err.message || '更新办公用品失败', type: 'error' });
    }
  };

  const getStatusBadge = (status: string) => {
    const colors: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
      active: 'default',
      inactive: 'secondary',
      low_stock: 'outline',
      out_of_stock: 'destructive',
    };
    const labels: Record<string, string> = {
      active: '正常',
      inactive: '停用',
      low_stock: '库存不足',
      out_of_stock: '缺货',
    };
    return <Badge variant={colors[status] || 'outline'}>{labels[status] || status}</Badge>;
  };

  const columns = useMemo<ColumnDef<OfficeSupply>[]>(
    () => [
      {
        accessorKey: 'name',
        header: '物品名称',
        cell: ({ row }) => <div className='font-medium text-slate-900 dark:text-slate-100'>{row.original.name}</div>,
      },
      {
        accessorKey: 'category',
        header: '类别',
        cell: ({ row }) => (
          <span className='text-sm text-slate-500 dark:text-slate-400'>{row.original.category || '-'}</span>
        ),
      },
      {
        accessorKey: 'quantity',
        header: '数量',
        cell: ({ row }) => (
          <span className='text-sm text-slate-900 dark:text-slate-100'>
            {row.original.quantity} {row.original.unit || ''}
          </span>
        ),
      },
      {
        accessorKey: 'price',
        header: '单价',
        cell: ({ row }) => (
          <div className='flex items-center text-sm text-slate-900 dark:text-slate-100'>
            <DollarSign className='w-3 h-3 mr-1 text-green-600' />
            {row.original.price ? `¥${row.original.price.toFixed(2)}` : '-'}
          </div>
        ),
      },
      {
        accessorKey: 'location',
        header: '存放位置',
        cell: ({ row }) => (
          <div className='flex items-center text-sm text-slate-500 dark:text-slate-400'>
            <MapPin className='w-3 h-3 mr-1 text-blue-600' />
            {row.original.location || '-'}
          </div>
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
        cell: ({ row }) => {
          const supply = row.original;
          return (
            <div className='flex items-center justify-end space-x-2'>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant='ghost'
                      size='sm'
                      onClick={() => {
                        setSelectedSupply(supply);
                        setShowEditModal(true);
                      }}
                    >
                      <Edit className='w-4 h-4' />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>编辑</TooltipContent>
                </Tooltip>
              </TooltipProvider>

              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant='ghost'
                      size='sm'
                      className='text-red-600 hover:text-red-700 dark:text-red-400'
                      onClick={() => handleDeleteSupply(supply.id)}
                    >
                      <Trash2 className='w-4 h-4' />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>删除</TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
          );
        },
      },
    ],
    []
  );

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
                  <Package className='w-7 h-7 mr-3 text-green-600' />
                  办公用品管理
                </h1>
                <p className='mt-1 text-sm text-slate-500 dark:text-slate-400'>管理办公用品的库存、领用、归还等</p>
              </div>
            </div>
            <div className='flex items-center space-x-2'>
              <ModeToggle />
              <Button onClick={() => setShowCreateModal(true)}>
                <Plus className='w-5 h-5 mr-2' />
                新增物品
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className='max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8'>
        <Card>
          <CardContent className='p-0'>
            {loading ? (
              <div className='p-8 text-center'>
                <div className='inline-block animate-spin rounded-full h-8 w-8 border-4 border-green-600 border-t-transparent' />
                <p className='mt-2 text-slate-500 dark:text-slate-400'>加载中...</p>
              </div>
            ) : error ? (
              <div className='p-8 text-center'>
                <AlertCircle className='w-12 h-12 text-red-500 mx-auto mb-3' />
                <p className='text-red-600 dark:text-red-400'>{error}</p>
                <Button className='mt-4' onClick={loadData}>
                  重试
                </Button>
              </div>
            ) : (
              <DataTable
                columns={columns}
                data={supplies}
                searchPlaceholder='搜索物品名称、类别、存放位置...'
                searchKey='name'
              />
            )}
          </CardContent>
        </Card>
      </div>

      <Dialog open={showCreateModal} onOpenChange={setShowCreateModal}>
        <DialogContent className='max-w-xl max-h-[90vh] overflow-y-auto'>
          <DialogHeader>
            <DialogTitle>新增办公用品</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleCreateSupply}>
            <div className='space-y-4'>
              <div className='space-y-2'>
                <Label htmlFor='name'>物品名称 *</Label>
                <Input
                  id='name'
                  type='text'
                  required
                  value={newSupply.name || ''}
                  onChange={(e) => setNewSupply({ ...newSupply, name: e.target.value })}
                  placeholder='请输入物品名称'
                />
              </div>

              <div className='grid grid-cols-3 gap-4'>
                <div className='space-y-2'>
                  <Label htmlFor='category'>类别</Label>
                  <Input
                    id='category'
                    type='text'
                    value={newSupply.category || ''}
                    onChange={(e) => setNewSupply({ ...newSupply, category: e.target.value })}
                    placeholder='如：文具、耗材等'
                  />
                </div>
                <div className='space-y-2'>
                  <Label htmlFor='unit'>单位</Label>
                  <Input
                    id='unit'
                    type='text'
                    value={newSupply.unit || ''}
                    onChange={(e) => setNewSupply({ ...newSupply, unit: e.target.value })}
                    placeholder='如：个、盒等'
                  />
                </div>
                <div className='space-y-2'>
                  <Label htmlFor='quantity'>数量 *</Label>
                  <Input
                    id='quantity'
                    type='number'
                    required
                    value={newSupply.quantity || ''}
                    onChange={(e) => setNewSupply({ ...newSupply, quantity: Number(e.target.value) })}
                    placeholder='请输入数量'
                  />
                </div>
              </div>

              <div className='grid grid-cols-2 gap-4'>
                <div className='space-y-2'>
                  <Label htmlFor='price'>单价</Label>
                  <Input
                    id='price'
                    type='number'
                    min='0'
                    step='0.01'
                    value={newSupply.price || ''}
                    onChange={(e) => setNewSupply({ ...newSupply, price: Number(e.target.value) })}
                    placeholder='请输入单价'
                  />
                </div>
                <div className='space-y-2'>
                  <Label htmlFor='location'>存放位置</Label>
                  <Input
                    id='location'
                    type='text'
                    value={newSupply.location || ''}
                    onChange={(e) => setNewSupply({ ...newSupply, location: e.target.value })}
                    placeholder='请输入存放位置'
                  />
                </div>
              </div>

              <div className='space-y-2'>
                <Label htmlFor='status'>状态</Label>
                <Select
                  value={newSupply.status || 'active'}
                  onValueChange={(value) => setNewSupply({ ...newSupply, status: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder='请选择状态' />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value='active'>正常</SelectItem>
                    <SelectItem value='inactive'>停用</SelectItem>
                    <SelectItem value='low_stock'>库存不足</SelectItem>
                    <SelectItem value='out_of_stock'>缺货</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <DialogFooter className='mt-6'>
              <Button type='button' variant='secondary' onClick={() => setShowCreateModal(false)}>
                取消
              </Button>
              <Button type='submit'>创建</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={showEditModal} onOpenChange={setShowEditModal}>
        <DialogContent className='max-w-xl max-h-[90vh] overflow-y-auto'>
          <DialogHeader>
            <DialogTitle>编辑办公用品</DialogTitle>
          </DialogHeader>
          {selectedSupply && (
            <form onSubmit={handleEditSupply}>
              <div className='space-y-4'>
                <div className='space-y-2'>
                  <Label htmlFor='edit_name'>物品名称 *</Label>
                  <Input
                    id='edit_name'
                    type='text'
                    required
                    value={selectedSupply.name}
                    onChange={(e) => setSelectedSupply({ ...selectedSupply, name: e.target.value })}
                  />
                </div>

                <div className='grid grid-cols-3 gap-4'>
                  <div className='space-y-2'>
                    <Label htmlFor='edit_category'>类别</Label>
                    <Input
                      id='edit_category'
                      type='text'
                      value={selectedSupply.category || ''}
                      onChange={(e) => setSelectedSupply({ ...selectedSupply, category: e.target.value })}
                    />
                  </div>
                  <div className='space-y-2'>
                    <Label htmlFor='edit_unit'>单位</Label>
                    <Input
                      id='edit_unit'
                      type='text'
                      value={selectedSupply.unit || ''}
                      onChange={(e) => setSelectedSupply({ ...selectedSupply, unit: e.target.value })}
                    />
                  </div>
                  <div className='space-y-2'>
                    <Label htmlFor='edit_quantity'>数量 *</Label>
                    <Input
                      id='edit_quantity'
                      type='number'
                      required
                      value={selectedSupply.quantity}
                      onChange={(e) => setSelectedSupply({ ...selectedSupply, quantity: Number(e.target.value) })}
                    />
                  </div>
                </div>

                <div className='grid grid-cols-2 gap-4'>
                  <div className='space-y-2'>
                    <Label htmlFor='edit_price'>单价</Label>
                    <Input
                      id='edit_price'
                      type='number'
                      min='0'
                      step='0.01'
                      value={selectedSupply.price || ''}
                      onChange={(e) => setSelectedSupply({ ...selectedSupply, price: Number(e.target.value) })}
                    />
                  </div>
                  <div className='space-y-2'>
                    <Label htmlFor='edit_location'>存放位置</Label>
                    <Input
                      id='edit_location'
                      type='text'
                      value={selectedSupply.location || ''}
                      onChange={(e) => setSelectedSupply({ ...selectedSupply, location: e.target.value })}
                    />
                  </div>
                </div>

                <div className='space-y-2'>
                  <Label htmlFor='edit_status'>状态</Label>
                  <Select
                    value={selectedSupply.status}
                    onValueChange={(value) => setSelectedSupply({ ...selectedSupply, status: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder='请选择状态' />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value='active'>正常</SelectItem>
                      <SelectItem value='inactive'>停用</SelectItem>
                      <SelectItem value='low_stock'>库存不足</SelectItem>
                      <SelectItem value='out_of_stock'>缺货</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <DialogFooter className='mt-6'>
                <Button
                  type='button'
                  variant='secondary'
                  onClick={() => {
                    setShowEditModal(false);
                    setSelectedSupply(null);
                  }}
                >
                  取消
                </Button>
                <Button type='submit'>保存</Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default OfficeSuppliesManagementPage;
