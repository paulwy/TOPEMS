import React, { useState, useEffect, useMemo } from 'react';
import { 
  Box, Search, Plus, Edit, Trash2, 
  ChevronLeft, AlertCircle, DollarSign, Calendar, User
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { assetApi, type Asset, type Employee } from '../api/erp';
import { employeeApi } from '../api/erp';
import { useAppStore } from '../store';
import { ColumnDef } from '@tanstack/react-table';
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

interface AssetManagementPageProps {
  onNavigate?: (page: string) => void;
}

const AssetManagementPage: React.FC<AssetManagementPageProps> = ({ onNavigate }) => {
  const navigate = useNavigate();
  const addNotification = useAppStore((state) => state.addNotification);
  
  const [assets, setAssets] = useState<Asset[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedAsset, setSelectedAsset] = useState<Asset | null>(null);

  const [newAsset, setNewAsset] = useState<Partial<Asset>>({
    asset_number: '',
    name: '',
    category: '',
    brand: '',
    model: '',
    purchase_date: '',
    purchase_amount: 0,
    location: '',
    responsible_id: '',
    status: 'idle'
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [assetRes, employeeRes] = await Promise.all([
        assetApi.list(),
        employeeApi.list()
      ]);
      
      if (assetRes.success && assetRes.data) {
        setAssets(assetRes.data.items || []);
      }
      
      if (employeeRes.success && employeeRes.data) {
        setEmployees(employeeRes.data.items || []);
      }
    } catch (err: any) {
      setError(err.message || '加载数据失败');
      addNotification({ title: '加载失败', message: '加载数据失败', type: 'error' });
      setAssets([]);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateAsset = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await assetApi.create(newAsset);
      if (res.success) {
        addNotification({ title: '成功', message: '资产创建成功', type: 'success' });
        setShowCreateModal(false);
        setNewAsset({
          asset_number: '',
          name: '',
          category: '',
          brand: '',
          model: '',
          purchase_date: '',
          purchase_amount: 0,
          location: '',
          responsible_id: '',
          status: 'idle'
        });
        loadData();
      } else {
        addNotification({ title: '失败', message: res.message || '创建资产失败', type: 'error' });
      }
    } catch (err: any) {
      addNotification({ title: '失败', message: err.message || '创建资产失败', type: 'error' });
    }
  };

  const handleDeleteAsset = async (id: string) => {
    if (!confirm('确定要删除这个资产吗？')) return;
    try {
      const res = await assetApi.delete(id);
      if (res.success) {
        addNotification({ title: '成功', message: '资产删除成功', type: 'success' });
        loadData();
      } else {
        addNotification({ title: '失败', message: res.message || '删除资产失败', type: 'error' });
      }
    } catch (err: any) {
      addNotification({ title: '失败', message: err.message || '删除资产失败', type: 'error' });
    }
  };

  const handleEditAsset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedAsset) return;
    try {
      const res = await assetApi.update(selectedAsset.id, selectedAsset);
      if (res.success) {
        addNotification({ title: '成功', message: '资产信息更新成功', type: 'success' });
        setShowEditModal(false);
        setSelectedAsset(null);
        loadData();
      } else {
        addNotification({ title: '失败', message: res.message || '更新资产失败', type: 'error' });
      }
    } catch (err: any) {
      addNotification({ title: '失败', message: err.message || '更新资产失败', type: 'error' });
    }
  };

  const getStatusBadge = (status: string) => {
    const colors: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
      'in_use': 'default',
      'idle': 'secondary',
      'maintenance': 'outline',
      'scrapped': 'destructive'
    };
    const labels: Record<string, string> = {
      'in_use': '使用中',
      'idle': '闲置',
      'maintenance': '维护中',
      'scrapped': '报废'
    };
    return (
      <Badge variant={colors[status] || 'outline'}>
        {labels[status] || status}
      </Badge>
    );
  };

  const getEmployeeName = (id: string) => {
    const emp = employees.find(e => e.id === id);
    return emp ? emp.name : '-';
  };

  const columns = useMemo<ColumnDef<Asset>[]>(() => [
    {
      accessorKey: 'asset_number',
      header: '资产编号',
      cell: ({ row }) => (
        <div className="font-medium text-slate-900 dark:text-slate-100">
          {row.original.asset_number}
        </div>
      )
    },
    {
      accessorKey: 'name',
      header: '资产名称',
      cell: ({ row }) => (
        <div className="text-slate-900 dark:text-slate-100">
          {row.original.name}
        </div>
      )
    },
    {
      accessorKey: 'category',
      header: '类别',
      cell: ({ row }) => (
        <span className="text-sm text-slate-500 dark:text-slate-400">
          {row.original.category || '-'}
        </span>
      )
    },
    {
      accessorKey: 'brand',
      header: '品牌',
      cell: ({ row }) => (
        <span className="text-sm text-slate-500 dark:text-slate-400">
          {row.original.brand || '-'}
        </span>
      )
    },
    {
      accessorKey: 'model',
      header: '型号',
      cell: ({ row }) => (
        <span className="text-sm text-slate-500 dark:text-slate-400">
          {row.original.model || '-'}
        </span>
      )
    },
    {
      accessorKey: 'purchase_amount',
      header: '采购金额',
      cell: ({ row }) => (
        <div className="flex items-center text-sm text-slate-900 dark:text-slate-100">
          <DollarSign className="w-3 h-3 mr-1 text-green-600" />
          {row.original.purchase_amount ? `¥${row.original.purchase_amount.toLocaleString()}` : '-'}
        </div>
      )
    },
    {
      accessorKey: 'responsible_id',
      header: '负责人',
      cell: ({ row }) => (
        <div className="flex items-center text-sm text-slate-900 dark:text-slate-100">
          <User className="w-3 h-3 mr-1 text-blue-600" />
          {getEmployeeName(row.original.responsible_id || '')}
        </div>
      )
    },
    {
      accessorKey: 'status',
      header: '状态',
      cell: ({ row }) => getStatusBadge(row.original.status)
    },
    {
      id: 'actions',
      header: '操作',
      cell: ({ row }) => {
        const asset = row.original;
        return (
          <div className="flex items-center justify-end space-x-2">
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setSelectedAsset(asset);
                      setShowEditModal(true);
                    }}
                  >
                    <Edit className="w-4 h-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>编辑</TooltipContent>
              </Tooltip>
            </TooltipProvider>
            
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-red-600 hover:text-red-700 dark:text-red-400"
                    onClick={() => handleDeleteAsset(asset.id)}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>删除</TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
        );
      }
    }
  ], [employees]);

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900">
      <div className="bg-white dark:bg-slate-800 shadow-sm border-b border-slate-200 dark:border-slate-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <Button
                variant="ghost"
                onClick={() => navigate('/dashboard')}
              >
                <ChevronLeft className="w-5 h-5" />
              </Button>
              <div>
                <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100 flex items-center">
                  <Box className="w-7 h-7 mr-3 text-blue-600" />
                  资产管理
                </h1>
                <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                  管理企业资产、设备台账
                </p>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <ModeToggle />
              <Button onClick={() => setShowCreateModal(true)}>
                <Plus className="w-5 h-5 mr-2" />
                新增资产
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Card>
          <CardContent className="p-0">
            {loading ? (
              <div className="p-8 text-center">
                <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-blue-600 border-t-transparent" />
                <p className="mt-2 text-slate-500 dark:text-slate-400">加载中...</p>
              </div>
            ) : error ? (
              <div className="p-8 text-center">
                <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-3" />
                <p className="text-red-600 dark:text-red-400">{error}</p>
                <Button className="mt-4" onClick={loadData}>
                  重试
                </Button>
              </div>
            ) : (
              <DataTable
                columns={columns}
                data={assets}
                searchPlaceholder="搜索资产名称、编号、品牌、型号..."
                searchKey="name"
              />
            )}
          </CardContent>
        </Card>
      </div>

      <Dialog open={showCreateModal} onOpenChange={setShowCreateModal}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>新增资产</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleCreateAsset}>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="asset_number">资产编号 *</Label>
                  <Input
                    id="asset_number"
                    type="text"
                    required
                    value={newAsset.asset_number || ''}
                    onChange={(e) => setNewAsset({ ...newAsset, asset_number: e.target.value })}
                    placeholder="请输入资产编号"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="name">资产名称 *</Label>
                  <Input
                    id="name"
                    type="text"
                    required
                    value={newAsset.name || ''}
                    onChange={(e) => setNewAsset({ ...newAsset, name: e.target.value })}
                    placeholder="请输入资产名称"
                  />
                </div>
              </div>
              
              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="category">类别</Label>
                  <Input
                    id="category"
                    type="text"
                    value={newAsset.category || ''}
                    onChange={(e) => setNewAsset({ ...newAsset, category: e.target.value })}
                    placeholder="请输入类别"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="brand">品牌</Label>
                  <Input
                    id="brand"
                    type="text"
                    value={newAsset.brand || ''}
                    onChange={(e) => setNewAsset({ ...newAsset, brand: e.target.value })}
                    placeholder="请输入品牌"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="model">型号</Label>
                  <Input
                    id="model"
                    type="text"
                    value={newAsset.model || ''}
                    onChange={(e) => setNewAsset({ ...newAsset, model: e.target.value })}
                    placeholder="请输入型号"
                  />
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="purchase_date">采购日期</Label>
                  <Input
                    id="purchase_date"
                    type="date"
                    value={newAsset.purchase_date || ''}
                    onChange={(e) => setNewAsset({ ...newAsset, purchase_date: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="purchase_amount">采购金额</Label>
                  <Input
                    id="purchase_amount"
                    type="number"
                    min="0"
                    step="0.01"
                    value={newAsset.purchase_amount || ''}
                    onChange={(e) => setNewAsset({ ...newAsset, purchase_amount: Number(e.target.value) })}
                    placeholder="请输入采购金额"
                  />
                </div>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="location">存放位置</Label>
                <Input
                  id="location"
                  type="text"
                  value={newAsset.location || ''}
                  onChange={(e) => setNewAsset({ ...newAsset, location: e.target.value })}
                  placeholder="请输入存放位置"
                />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="responsible_id">负责人</Label>
                  <Select
                    value={newAsset.responsible_id || ''}
                    onValueChange={(value) => setNewAsset({ ...newAsset, responsible_id: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="请选择负责人" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">无</SelectItem>
                      {employees.map(emp => (
                        <SelectItem key={emp.id} value={emp.id}>{emp.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="status">状态</Label>
                  <Select
                    value={newAsset.status || 'idle'}
                    onValueChange={(value) => setNewAsset({ ...newAsset, status: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="请选择状态" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="idle">闲置</SelectItem>
                      <SelectItem value="in_use">使用中</SelectItem>
                      <SelectItem value="maintenance">维护中</SelectItem>
                      <SelectItem value="scrapped">报废</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
            
            <DialogFooter className="mt-6">
              <Button
                type="button"
                variant="secondary"
                onClick={() => setShowCreateModal(false)}
              >
                取消
              </Button>
              <Button type="submit">创建</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={showEditModal} onOpenChange={setShowEditModal}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>编辑资产</DialogTitle>
          </DialogHeader>
          {selectedAsset && (
            <form onSubmit={handleEditAsset}>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="edit_asset_number">资产编号 *</Label>
                    <Input
                      id="edit_asset_number"
                      type="text"
                      required
                      value={selectedAsset.asset_number}
                      onChange={(e) => setSelectedAsset({ ...selectedAsset, asset_number: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="edit_name">资产名称 *</Label>
                    <Input
                      id="edit_name"
                      type="text"
                      required
                      value={selectedAsset.name}
                      onChange={(e) => setSelectedAsset({ ...selectedAsset, name: e.target.value })}
                    />
                  </div>
                </div>
                
                <div className="grid grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="edit_category">类别</Label>
                    <Input
                      id="edit_category"
                      type="text"
                      value={selectedAsset.category || ''}
                      onChange={(e) => setSelectedAsset({ ...selectedAsset, category: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="edit_brand">品牌</Label>
                    <Input
                      id="edit_brand"
                      type="text"
                      value={selectedAsset.brand || ''}
                      onChange={(e) => setSelectedAsset({ ...selectedAsset, brand: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="edit_model">型号</Label>
                    <Input
                      id="edit_model"
                      type="text"
                      value={selectedAsset.model || ''}
                      onChange={(e) => setSelectedAsset({ ...selectedAsset, model: e.target.value })}
                    />
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="edit_purchase_date">采购日期</Label>
                    <Input
                      id="edit_purchase_date"
                      type="date"
                      value={selectedAsset.purchase_date || ''}
                      onChange={(e) => setSelectedAsset({ ...selectedAsset, purchase_date: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="edit_purchase_amount">采购金额</Label>
                    <Input
                      id="edit_purchase_amount"
                      type="number"
                      min="0"
                      step="0.01"
                      value={selectedAsset.purchase_amount || ''}
                      onChange={(e) => setSelectedAsset({ ...selectedAsset, purchase_amount: Number(e.target.value) })}
                    />
                  </div>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="edit_location">存放位置</Label>
                  <Input
                    id="edit_location"
                    type="text"
                    value={selectedAsset.location || ''}
                    onChange={(e) => setSelectedAsset({ ...selectedAsset, location: e.target.value })}
                  />
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="edit_responsible_id">负责人</Label>
                    <Select
                      value={selectedAsset.responsible_id || ''}
                      onValueChange={(value) => setSelectedAsset({ ...selectedAsset, responsible_id: value })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="请选择负责人" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="">无</SelectItem>
                        {employees.filter(e => e.id !== selectedAsset.id).map(emp => (
                          <SelectItem key={emp.id} value={emp.id}>{emp.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="edit_status">状态</Label>
                    <Select
                      value={selectedAsset.status}
                      onValueChange={(value) => setSelectedAsset({ ...selectedAsset, status: value })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="请选择状态" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="idle">闲置</SelectItem>
                        <SelectItem value="in_use">使用中</SelectItem>
                        <SelectItem value="maintenance">维护中</SelectItem>
                        <SelectItem value="scrapped">报废</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>
              
              <DialogFooter className="mt-6">
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => {
                    setShowEditModal(false);
                    setSelectedAsset(null);
                  }}
                >
                  取消
                </Button>
                <Button type="submit">保存</Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AssetManagementPage;
