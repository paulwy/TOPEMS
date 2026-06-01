import React, { useState, useEffect, useMemo } from 'react';
import { 
  Box, Search, Plus, Edit, Trash2, 
  ChevronLeft, AlertCircle, DollarSign, Calendar, User,
  Activity, ClipboardCheck, Wrench
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { assetApi, type Asset, type Employee } from '../api/erp';
import { employeeApi } from '../api/erp';
import { mesEquipmentApi, type InspectionRecord, type MaintenanceRecord } from '../api/mesEquipment';
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

interface EquipmentManagementPageProps {
  onNavigate?: (page: string) => void;
}

const EquipmentManagementPage: React.FC<EquipmentManagementPageProps> = ({ onNavigate }) => {
  const navigate = useNavigate();
  const addNotification = useAppStore((state) => state.addNotification);
  
  const [assets, setAssets] = useState<Asset[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [inspections, setInspections] = useState<InspectionRecord[]>([]);
  const [maintenances, setMaintenances] = useState<MaintenanceRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('assets');
  
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showInspectionModal, setShowInspectionModal] = useState(false);
  const [showMaintenanceModal, setShowMaintenanceModal] = useState(false);
  const [selectedAsset, setSelectedAsset] = useState<Asset | null>(null);
  const [selectedForInspection, setSelectedForInspection] = useState<Asset | null>(null);
  const [selectedForMaintenance, setSelectedForMaintenance] = useState<Asset | null>(null);

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

  const [newInspection, setNewInspection] = useState<Partial<InspectionRecord>>({
    inspector: '',
    inspection_date: new Date().toISOString().split('T')[0],
    status: 'normal'
  });

  const [newMaintenance, setNewMaintenance] = useState<Partial<MaintenanceRecord>>({
    maintenance_type: '',
    description: '',
    maintainer: '',
    start_time: new Date().toISOString(),
    status: 'pending'
  });

  useEffect(() => {
    loadData();
  }, [activeTab]);

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

      if (activeTab === 'inspections') {
        const inspectionRes = await mesEquipmentApi.listInspections();
        if (inspectionRes.success && inspectionRes.data) {
          setInspections(inspectionRes.data.items || []);
        }
      }

      if (activeTab === 'maintenances') {
        const maintenanceRes = await mesEquipmentApi.listMaintenances();
        if (maintenanceRes.success && maintenanceRes.data) {
          setMaintenances(maintenanceRes.data.items || []);
        }
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
        addNotification({ title: '成功', message: '设备创建成功', type: 'success' });
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
        addNotification({ title: '失败', message: res.message || '创建设备失败', type: 'error' });
      }
    } catch (err: any) {
      addNotification({ title: '失败', message: err.message || '创建设备失败', type: 'error' });
    }
  };

  const handleDeleteAsset = async (id: string) => {
    if (!confirm('确定要删除这个设备吗？')) return;
    try {
      const res = await assetApi.delete(id);
      if (res.success) {
        addNotification({ title: '成功', message: '设备删除成功', type: 'success' });
        loadData();
      } else {
        addNotification({ title: '失败', message: res.message || '删除设备失败', type: 'error' });
      }
    } catch (err: any) {
      addNotification({ title: '失败', message: err.message || '删除设备失败', type: 'error' });
    }
  };

  const handleEditAsset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedAsset) return;
    try {
      const res = await assetApi.update(selectedAsset.id, selectedAsset);
      if (res.success) {
        addNotification({ title: '成功', message: '设备信息更新成功', type: 'success' });
        setShowEditModal(false);
        setSelectedAsset(null);
        loadData();
      } else {
        addNotification({ title: '失败', message: res.message || '更新设备失败', type: 'error' });
      }
    } catch (err: any) {
      addNotification({ title: '失败', message: err.message || '更新设备失败', type: 'error' });
    }
  };

  const handleCreateInspection = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedForInspection) return;
    try {
      const data: any = {
        equipment_id: selectedForInspection.id,
        inspector: newInspection.inspector,
        inspection_date: newInspection.inspection_date,
        status: newInspection.status,
        location: newInspection.location,
        temperature: newInspection.temperature,
        vibration: newInspection.vibration,
        noise_level: newInspection.noise_level,
        abnormalities: newInspection.abnormalities,
        remarks: newInspection.remarks
      };
      const res = await mesEquipmentApi.createInspection(data);
      if (res.success) {
        addNotification({ title: '成功', message: '点检记录创建成功', type: 'success' });
        setShowInspectionModal(false);
        setSelectedForInspection(null);
        loadData();
      } else {
        addNotification({ title: '失败', message: res.message || '创建点检记录失败', type: 'error' });
      }
    } catch (err: any) {
      addNotification({ title: '失败', message: err.message || '创建点检记录失败', type: 'error' });
    }
  };

  const handleCreateMaintenance = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedForMaintenance) return;
    try {
      const data: any = {
        equipment_id: selectedForMaintenance.id,
        maintenance_type: newMaintenance.maintenance_type,
        description: newMaintenance.description,
        maintainer: newMaintenance.maintainer,
        start_time: newMaintenance.start_time,
        end_time: newMaintenance.end_time,
        cost: newMaintenance.cost,
        status: newMaintenance.status,
        remarks: newMaintenance.remarks
      };
      const res = await mesEquipmentApi.createMaintenance(data);
      if (res.success) {
        addNotification({ title: '成功', message: '维护记录创建成功', type: 'success' });
        setShowMaintenanceModal(false);
        setSelectedForMaintenance(null);
        loadData();
      } else {
        addNotification({ title: '失败', message: res.message || '创建维护记录失败', type: 'error' });
      }
    } catch (err: any) {
      addNotification({ title: '失败', message: err.message || '创建维护记录失败', type: 'error' });
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

  const assetColumns = useMemo<ColumnDef<Asset>[]>(() => [
    {
      accessorKey: 'asset_number',
      header: '设备编号',
      cell: ({ row }) => (
        <div className="font-medium text-slate-900 dark:text-slate-100">
          {row.original.asset_number}
        </div>
      )
    },
    {
      accessorKey: 'name',
      header: '设备名称',
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
      accessorKey: 'department',
      header: '部门',
      cell: ({ row }) => (
        <span className="text-sm text-slate-500 dark:text-slate-400">
          {row.original.department || '-'}
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
                    onClick={() => {
                      setSelectedForInspection(asset);
                      setShowInspectionModal(true);
                    }}
                  >
                    <ClipboardCheck className="w-4 h-4 text-blue-500" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>点检</TooltipContent>
              </Tooltip>
            </TooltipProvider>
            
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setSelectedForMaintenance(asset);
                      setShowMaintenanceModal(true);
                    }}
                  >
                    <Wrench className="w-4 h-4 text-orange-500" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>维护</TooltipContent>
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

  const inspectionColumns = useMemo<ColumnDef<InspectionRecord>[]>(() => [
    {
      accessorKey: 'equipment_code',
      header: '设备编号',
      cell: ({ row }) => row.original.equipment_code
    },
    {
      accessorKey: 'equipment_name',
      header: '设备名称',
      cell: ({ row }) => row.original.equipment_name
    },
    {
      accessorKey: 'inspector',
      header: '点检人',
      cell: ({ row }) => row.original.inspector
    },
    {
      accessorKey: 'inspection_date',
      header: '点检日期',
      cell: ({ row }) => row.original.inspection_date
    },
    {
      accessorKey: 'temperature',
      header: '温度(°C)',
      cell: ({ row }) => row.original.temperature || '-'
    },
    {
      accessorKey: 'status',
      header: '状态',
      cell: ({ row }) => (
        <Badge variant={row.original.status === 'normal' ? 'default' : 'destructive'}>
          {row.original.status === 'normal' ? '正常' : '异常'}
        </Badge>
      )
    },
    {
      accessorKey: 'abnormalities',
      header: '异常情况',
      cell: ({ row }) => row.original.abnormalities || '-'
    }
  ], []);

  const maintenanceColumns = useMemo<ColumnDef<MaintenanceRecord>[]>(() => [
    {
      accessorKey: 'equipment_code',
      header: '设备编号',
      cell: ({ row }) => row.original.equipment_code
    },
    {
      accessorKey: 'equipment_name',
      header: '设备名称',
      cell: ({ row }) => row.original.equipment_name
    },
    {
      accessorKey: 'maintenance_type',
      header: '维护类型',
      cell: ({ row }) => row.original.maintenance_type
    },
    {
      accessorKey: 'description',
      header: '维护描述',
      cell: ({ row }) => row.original.description
    },
    {
      accessorKey: 'maintainer',
      header: '维护人员',
      cell: ({ row }) => row.original.maintainer
    },
    {
      accessorKey: 'status',
      header: '状态',
      cell: ({ row }) => (
        <Badge variant={row.original.status === 'completed' ? 'default' : 'outline'}>
          {row.original.status === 'pending' ? '待处理' : row.original.status === 'in_progress' ? '进行中' : '完成'}
        </Badge>
      )
    }
  ], []);

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
                <ChevronLeft className="w-5 h-5 mr-1" />
                返回
              </Button>
              <div>
                <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100 flex items-center ml-4">
                  <Activity className="w-7 h-7 mr-3 text-blue-600" />
                  设备管理
                </h1>
                <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                  管理设备台账、点巡检、维护维修
                </p>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <ModeToggle />
              {activeTab === 'assets' && (
                <Button onClick={() => setShowCreateModal(true)}>
                  <Plus className="w-4 h-4 mr-2" />
                  新增设备
                </Button>
              )}
              {activeTab === 'inspections' && (
                <Button onClick={() => {
                  setSelectedForInspection(assets[0] || null);
                  setShowInspectionModal(true);
                }}>
                  <Plus className="w-4 h-4 mr-2" />
                  新增点检
                </Button>
              )}
              {activeTab === 'maintenances' && (
                <Button onClick={() => {
                  setSelectedForMaintenance(assets[0] || null);
                  setShowMaintenanceModal(true);
                }}>
                  <Plus className="w-4 h-4 mr-2" />
                  新增维护
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Tabs defaultValue="assets" value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="mb-6">
            <TabsTrigger value="assets">
              <Box className="w-4 h-4 mr-2" />
              设备台账
            </TabsTrigger>
            <TabsTrigger value="inspections">
              <ClipboardCheck className="w-4 h-4 mr-2" />
              点检记录
            </TabsTrigger>
            <TabsTrigger value="maintenances">
              <Wrench className="w-4 h-4 mr-2" />
              维护维修
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="assets">
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
                    columns={assetColumns}
                    data={assets}
                    searchPlaceholder="搜索设备名称、编号、品牌、型号..."
                    searchKey="name"
                  />
                )}
              </CardContent>
            </Card>
          </TabsContent>
          
          <TabsContent value="inspections">
            <Card>
              <CardContent className="p-0">
                {loading ? (
                  <div className="p-8 text-center">
                    <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-blue-600 border-t-transparent" />
                    <p className="mt-2 text-slate-500 dark:text-slate-400">加载中...</p>
                  </div>
                ) : (
                  <DataTable
                    columns={inspectionColumns}
                    data={inspections}
                    searchPlaceholder="搜索点检记录..."
                    searchKey="equipment_name"
                  />
                )}
              </CardContent>
            </Card>
          </TabsContent>
          
          <TabsContent value="maintenances">
            <Card>
              <CardContent className="p-0">
                {loading ? (
                  <div className="p-8 text-center">
                    <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-blue-600 border-t-transparent" />
                    <p className="mt-2 text-slate-500 dark:text-slate-400">加载中...</p>
                  </div>
                ) : (
                  <DataTable
                    columns={maintenanceColumns}
                    data={maintenances}
                    searchPlaceholder="搜索维护记录..."
                    searchKey="description"
                  />
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      <Dialog open={showCreateModal} onOpenChange={setShowCreateModal}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>新增设备</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleCreateAsset}>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="asset_number">设备编号 *</Label>
                  <Input
                    id="asset_number"
                    type="text"
                    required
                    value={newAsset.asset_number || ''}
                    onChange={(e) => setNewAsset({ ...newAsset, asset_number: e.target.value })}
                    placeholder="请输入设备编号"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="name">设备名称 *</Label>
                  <Input
                    id="name"
                    type="text"
                    required
                    value={newAsset.name || ''}
                    onChange={(e) => setNewAsset({ ...newAsset, name: e.target.value })}
                    placeholder="请输入设备名称"
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
              
              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="serial_number">序列号</Label>
                  <Input
                    id="serial_number"
                    type="text"
                    value={newAsset.serial_number || ''}
                    onChange={(e) => setNewAsset({ ...newAsset, serial_number: e.target.value })}
                    placeholder="请输入序列号"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="manufacturer">制造商</Label>
                  <Input
                    id="manufacturer"
                    type="text"
                    value={newAsset.manufacturer || ''}
                    onChange={(e) => setNewAsset({ ...newAsset, manufacturer: e.target.value })}
                    placeholder="请输入制造商"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="department">部门</Label>
                  <Input
                    id="department"
                    type="text"
                    value={newAsset.department || ''}
                    onChange={(e) => setNewAsset({ ...newAsset, department: e.target.value })}
                    placeholder="请输入部门"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="rated_power">额定功率 (kW)</Label>
                  <Input
                    id="rated_power"
                    type="number"
                    step="0.01"
                    value={newAsset.rated_power || ''}
                    onChange={(e) => setNewAsset({ ...newAsset, rated_power: Number(e.target.value) })}
                    placeholder="请输入额定功率"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="rated_voltage">额定电压 (V)</Label>
                  <Input
                    id="rated_voltage"
                    type="number"
                    step="0.01"
                    value={newAsset.rated_voltage || ''}
                    onChange={(e) => setNewAsset({ ...newAsset, rated_voltage: Number(e.target.value) })}
                    placeholder="请输入额定电压"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="rated_current">额定电流 (A)</Label>
                  <Input
                    id="rated_current"
                    type="number"
                    step="0.01"
                    value={newAsset.rated_current || ''}
                    onChange={(e) => setNewAsset({ ...newAsset, rated_current: Number(e.target.value) })}
                    placeholder="请输入额定电流"
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
              
              <div className="grid grid-cols-2 gap-4">
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
              </div>
              
              <div className="grid grid-cols-2 gap-4">
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
                <div className="space-y-2">
                  <Label htmlFor="image_url">图片URL</Label>
                  <Input
                    id="image_url"
                    type="text"
                    value={newAsset.image_url || ''}
                    onChange={(e) => setNewAsset({ ...newAsset, image_url: e.target.value })}
                    placeholder="请输入图片URL"
                  />
                </div>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="specifications">技术规格</Label>
                <Textarea
                  id="specifications"
                  value={newAsset.specifications || ''}
                  onChange={(e) => setNewAsset({ ...newAsset, specifications: e.target.value })}
                  placeholder="请输入技术规格或设备描述"
                  rows={3}
                />
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
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>编辑设备</DialogTitle>
          </DialogHeader>
          {selectedAsset && (
            <form onSubmit={handleEditAsset}>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="edit_asset_number">设备编号 *</Label>
                    <Input
                      id="edit_asset_number"
                      type="text"
                      required
                      value={selectedAsset.asset_number}
                      onChange={(e) => setSelectedAsset({ ...selectedAsset, asset_number: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="edit_name">设备名称 *</Label>
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

                <div className="grid grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="edit_serial_number">序列号</Label>
                    <Input
                      id="edit_serial_number"
                      type="text"
                      value={selectedAsset.serial_number || ''}
                      onChange={(e) => setSelectedAsset({ ...selectedAsset, serial_number: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="edit_manufacturer">制造商</Label>
                    <Input
                      id="edit_manufacturer"
                      type="text"
                      value={selectedAsset.manufacturer || ''}
                      onChange={(e) => setSelectedAsset({ ...selectedAsset, manufacturer: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="edit_department">部门</Label>
                    <Input
                      id="edit_department"
                      type="text"
                      value={selectedAsset.department || ''}
                      onChange={(e) => setSelectedAsset({ ...selectedAsset, department: e.target.value })}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="edit_rated_power">额定功率 (kW)</Label>
                    <Input
                      id="edit_rated_power"
                      type="number"
                      step="0.01"
                      value={selectedAsset.rated_power || ''}
                      onChange={(e) => setSelectedAsset({ ...selectedAsset, rated_power: Number(e.target.value) })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="edit_rated_voltage">额定电压 (V)</Label>
                    <Input
                      id="edit_rated_voltage"
                      type="number"
                      step="0.01"
                      value={selectedAsset.rated_voltage || ''}
                      onChange={(e) => setSelectedAsset({ ...selectedAsset, rated_voltage: Number(e.target.value) })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="edit_rated_current">额定电流 (A)</Label>
                    <Input
                      id="edit_rated_current"
                      type="number"
                      step="0.01"
                      value={selectedAsset.rated_current || ''}
                      onChange={(e) => setSelectedAsset({ ...selectedAsset, rated_current: Number(e.target.value) })}
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
                        {employees.map(emp => (
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

      <Dialog open={showInspectionModal} onOpenChange={setShowInspectionModal}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>设备点检记录</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleCreateInspection}>
            <div className="space-y-4">
              <div className="bg-slate-50 p-4 rounded-lg">
                <p className="text-sm font-medium text-slate-700">设备: {selectedForInspection?.name} ({selectedForInspection?.asset_number})</p>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="inspector">点检人 *</Label>
                  <Input
                    id="inspector"
                    type="text"
                    required
                    value={newInspection.inspector || ''}
                    onChange={(e) => setNewInspection({ ...newInspection, inspector: e.target.value })}
                    placeholder="请输入点检人"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="inspection_date">点检日期 *</Label>
                  <Input
                    id="inspection_date"
                    type="date"
                    required
                    value={newInspection.inspection_date || ''}
                    onChange={(e) => setNewInspection({ ...newInspection, inspection_date: e.target.value })}
                  />
                </div>
              </div>
              
              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="temperature">温度 (°C)</Label>
                  <Input
                    id="temperature"
                    type="number"
                    step="0.1"
                    value={newInspection.temperature || ''}
                    onChange={(e) => setNewInspection({ ...newInspection, temperature: Number(e.target.value) })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="vibration">振动</Label>
                  <Input
                    id="vibration"
                    type="number"
                    step="0.01"
                    value={newInspection.vibration || ''}
                    onChange={(e) => setNewInspection({ ...newInspection, vibration: Number(e.target.value) })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="noise_level">噪音 (dB)</Label>
                  <Input
                    id="noise_level"
                    type="number"
                    step="0.1"
                    value={newInspection.noise_level || ''}
                    onChange={(e) => setNewInspection({ ...newInspection, noise_level: Number(e.target.value) })}
                  />
                </div>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="inspection_status">点检状态</Label>
                <Select
                  value={newInspection.status || 'normal'}
                  onValueChange={(value) => setNewInspection({ ...newInspection, status: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="normal">正常</SelectItem>
                    <SelectItem value="abnormal">异常</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="abnormalities">异常情况</Label>
                <Textarea
                  id="abnormalities"
                  value={newInspection.abnormalities || ''}
                  onChange={(e) => setNewInspection({ ...newInspection, abnormalities: e.target.value })}
                  placeholder="请描述异常情况"
                  rows={3}
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="inspection_remarks">备注</Label>
                <Textarea
                  id="inspection_remarks"
                  value={newInspection.remarks || ''}
                  onChange={(e) => setNewInspection({ ...newInspection, remarks: e.target.value })}
                  placeholder="点检备注"
                  rows={2}
                />
              </div>
            </div>
            
            <DialogFooter className="mt-6">
              <Button
                type="button"
                variant="secondary"
                onClick={() => setShowInspectionModal(false)}
              >
                取消
              </Button>
              <Button type="submit">提交</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={showMaintenanceModal} onOpenChange={setShowMaintenanceModal}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>设备维护记录</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleCreateMaintenance}>
            <div className="space-y-4">
              <div className="bg-slate-50 p-4 rounded-lg">
                <p className="text-sm font-medium text-slate-700">设备: {selectedForMaintenance?.name} ({selectedForMaintenance?.asset_number})</p>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="maintenance_type">维护类型 *</Label>
                <Select
                  value={newMaintenance.maintenance_type || ''}
                  onValueChange={(value) => setNewMaintenance({ ...newMaintenance, maintenance_type: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="请选择维护类型" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="定期维护">定期维护</SelectItem>
                    <SelectItem value="故障维修">故障维修</SelectItem>
                    <SelectItem value="预防性维护">预防性维护</SelectItem>
                    <SelectItem value="大修">大修</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="description">维护描述 *</Label>
                <Textarea
                  id="description"
                  required
                  value={newMaintenance.description || ''}
                  onChange={(e) => setNewMaintenance({ ...newMaintenance, description: e.target.value })}
                  placeholder="请描述维护内容"
                  rows={3}
                />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="maintainer">维护人员 *</Label>
                  <Input
                    id="maintainer"
                    type="text"
                    required
                    value={newMaintenance.maintainer || ''}
                    onChange={(e) => setNewMaintenance({ ...newMaintenance, maintainer: e.target.value })}
                    placeholder="请输入维护人员"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="start_time">开始时间 *</Label>
                  <Input
                    id="start_time"
                    type="datetime-local"
                    required
                    value={newMaintenance.start_time ? newMaintenance.start_time.substring(0, 16) : ''}
                    onChange={(e) => setNewMaintenance({ ...newMaintenance, start_time: new Date(e.target.value).toISOString() })}
                  />
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="end_time">结束时间</Label>
                  <Input
                    id="end_time"
                    type="datetime-local"
                    value={newMaintenance.end_time ? newMaintenance.end_time.substring(0, 16) : ''}
                    onChange={(e) => setNewMaintenance({ ...newMaintenance, end_time: new Date(e.target.value).toISOString() })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="cost">费用 (元)</Label>
                  <Input
                    id="cost"
                    type="number"
                    min="0"
                    step="0.01"
                    value={newMaintenance.cost || ''}
                    onChange={(e) => setNewMaintenance({ ...newMaintenance, cost: Number(e.target.value) })}
                    placeholder="请输入费用"
                  />
                </div>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="maintenance_status">维护状态</Label>
                <Select
                  value={newMaintenance.status || 'pending'}
                  onValueChange={(value) => setNewMaintenance({ ...newMaintenance, status: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pending">待处理</SelectItem>
                    <SelectItem value="in_progress">进行中</SelectItem>
                    <SelectItem value="completed">已完成</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="maintenance_remarks">备注</Label>
                <Textarea
                  id="maintenance_remarks"
                  value={newMaintenance.remarks || ''}
                  onChange={(e) => setNewMaintenance({ ...newMaintenance, remarks: e.target.value })}
                  placeholder="维护备注"
                  rows={2}
                />
              </div>
            </div>
            
            <DialogFooter className="mt-6">
              <Button
                type="button"
                variant="secondary"
                onClick={() => setShowMaintenanceModal(false)}
              >
                取消
              </Button>
              <Button type="submit">提交</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default EquipmentManagementPage;
