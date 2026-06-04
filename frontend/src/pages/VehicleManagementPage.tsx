import React, { useState, useEffect, useMemo } from 'react';
import { Car, Search, Plus, Edit, Trash2, ChevronLeft, AlertCircle, Calendar, User } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { vehicleApi, vehicleRequestApi, type Vehicle, type VehicleRequest } from '../api/erp';
import { useAppStore } from '../store';
import { ColumnDef } from '@tanstack/react-table';
import { DataTable } from '@/components/DataTable';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ModeToggle } from '@/components/ModeToggle';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

interface VehicleManagementPageProps {
  onNavigate?: (page: string) => void;
}

const VehicleManagementPage: React.FC<VehicleManagementPageProps> = ({ onNavigate }) => {
  const navigate = useNavigate();
  const addNotification = useAppStore((state) => state.addNotification);

  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [requests, setRequests] = useState<VehicleRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showRequestModal, setShowRequestModal] = useState(false);
  const [selectedVehicle, setSelectedVehicle] = useState<Vehicle | null>(null);

  const [newVehicle, setNewVehicle] = useState<Partial<Vehicle>>({
    plate_number: '',
    brand: '',
    model: '',
    vehicle_type: '',
    status: 'available',
    driver: '',
    fuel_type: '',
  });

  const [newRequest, setNewRequest] = useState<Partial<VehicleRequest>>({
    vehicle_id: '',
    vehicle_plate: '',
    requester: '',
    purpose: '',
    start_time: '',
    end_time: '',
    driver_required: false,
    status: 'pending',
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [vehicleRes, requestRes] = await Promise.all([vehicleApi.list(), vehicleRequestApi.list()]);

      if (vehicleRes.success && vehicleRes.data) {
        setVehicles(vehicleRes.data.items || []);
      }

      if (requestRes.success && requestRes.data) {
        setRequests(requestRes.data.items || []);
      }
    } catch (err: any) {
      setError(err.message || '加载数据失败');
      addNotification({ title: '加载失败', message: '加载数据失败', type: 'error' });
      setVehicles([]);
      setRequests([]);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateVehicle = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await vehicleApi.create(newVehicle);
      if (res.success) {
        addNotification({ title: '成功', message: '车辆创建成功', type: 'success' });
        setShowCreateModal(false);
        setNewVehicle({
          plate_number: '',
          brand: '',
          model: '',
          vehicle_type: '',
          status: 'available',
          driver: '',
          fuel_type: '',
        });
        loadData();
      } else {
        addNotification({ title: '失败', message: res.message || '创建车辆失败', type: 'error' });
      }
    } catch (err: any) {
      addNotification({ title: '失败', message: err.message || '创建车辆失败', type: 'error' });
    }
  };

  const handleDeleteVehicle = async (id: string) => {
    if (!confirm('确定要删除这辆车吗？')) return;
    try {
      const res = await vehicleApi.delete(id);
      if (res.success) {
        addNotification({ title: '成功', message: '车辆删除成功', type: 'success' });
        loadData();
      } else {
        addNotification({ title: '失败', message: res.message || '删除车辆失败', type: 'error' });
      }
    } catch (err: any) {
      addNotification({ title: '失败', message: err.message || '删除车辆失败', type: 'error' });
    }
  };

  const handleEditVehicle = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedVehicle) return;
    try {
      const res = await vehicleApi.update(selectedVehicle.id, selectedVehicle);
      if (res.success) {
        addNotification({ title: '成功', message: '车辆信息更新成功', type: 'success' });
        setShowEditModal(false);
        setSelectedVehicle(null);
        loadData();
      } else {
        addNotification({ title: '失败', message: res.message || '更新车辆失败', type: 'error' });
      }
    } catch (err: any) {
      addNotification({ title: '失败', message: err.message || '更新车辆失败', type: 'error' });
    }
  };

  const handleCreateRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await vehicleRequestApi.create(newRequest);
      if (res.success) {
        addNotification({ title: '成功', message: '用车申请创建成功', type: 'success' });
        setShowRequestModal(false);
        setNewRequest({
          vehicle_id: '',
          vehicle_plate: '',
          requester: '',
          purpose: '',
          start_time: '',
          end_time: '',
          driver_required: false,
          status: 'pending',
        });
        loadData();
      } else {
        addNotification({ title: '失败', message: res.message || '创建用车申请失败', type: 'error' });
      }
    } catch (err: any) {
      addNotification({ title: '失败', message: err.message || '创建用车申请失败', type: 'error' });
    }
  };

  const handleUpdateRequestStatus = async (id: string, status: string) => {
    try {
      const request = requests.find((r) => r.id === id);
      if (!request) return;

      const res = await vehicleRequestApi.update(id, { ...request, status });
      if (res.success) {
        addNotification({ title: '成功', message: '申请状态更新成功', type: 'success' });
        loadData();
      } else {
        addNotification({ title: '失败', message: res.message || '更新申请状态失败', type: 'error' });
      }
    } catch (err: any) {
      addNotification({ title: '失败', message: err.message || '更新申请状态失败', type: 'error' });
    }
  };

  const getVehicleStatusBadge = (status: string) => {
    const colors: Record<string, 'default' | 'secondary' | 'destructive' | 'outline' | 'success'> = {
      available: 'success',
      in_use: 'default',
      maintenance: 'outline',
      out_of_service: 'destructive',
    };
    const labels: Record<string, string> = {
      available: '可用',
      in_use: '使用中',
      maintenance: '维护中',
      out_of_service: '停用',
    };
    return <Badge variant={colors[status] || 'outline'}>{labels[status] || status}</Badge>;
  };

  const getRequestStatusBadge = (status: string) => {
    const colors: Record<string, 'default' | 'secondary' | 'destructive' | 'outline' | 'success'> = {
      pending: 'outline',
      approved: 'success',
      rejected: 'destructive',
      completed: 'default',
    };
    const labels: Record<string, string> = {
      pending: '待审批',
      approved: '已批准',
      rejected: '已拒绝',
      completed: '已完成',
    };
    return <Badge variant={colors[status] || 'outline'}>{labels[status] || status}</Badge>;
  };

  const vehicleColumns = useMemo<ColumnDef<Vehicle>[]>(
    () => [
      {
        accessorKey: 'plate_number',
        header: '车牌号',
        cell: ({ row }) => (
          <div className='font-medium text-slate-900 dark:text-slate-100'>{row.original.plate_number}</div>
        ),
      },
      {
        accessorKey: 'brand',
        header: '品牌',
        cell: ({ row }) => <div className='text-slate-900 dark:text-slate-100'>{row.original.brand || '-'}</div>,
      },
      {
        accessorKey: 'model',
        header: '型号',
        cell: ({ row }) => <div className='text-slate-900 dark:text-slate-100'>{row.original.model || '-'}</div>,
      },
      {
        accessorKey: 'vehicle_type',
        header: '车辆类型',
        cell: ({ row }) => (
          <span className='text-sm text-slate-500 dark:text-slate-400'>{row.original.vehicle_type || '-'}</span>
        ),
      },
      {
        accessorKey: 'driver',
        header: '司机',
        cell: ({ row }) => (
          <div className='flex items-center text-sm text-slate-900 dark:text-slate-100'>
            <User className='w-3 h-3 mr-1 text-blue-600' />
            {row.original.driver || '-'}
          </div>
        ),
      },
      {
        accessorKey: 'fuel_type',
        header: '燃料类型',
        cell: ({ row }) => (
          <span className='text-sm text-slate-500 dark:text-slate-400'>{row.original.fuel_type || '-'}</span>
        ),
      },
      {
        accessorKey: 'mileage',
        header: '里程(km)',
        cell: ({ row }) => (
          <span className='text-sm text-slate-500 dark:text-slate-400'>
            {row.original.mileage ? row.original.mileage.toLocaleString() : '-'}
          </span>
        ),
      },
      {
        accessorKey: 'status',
        header: '状态',
        cell: ({ row }) => getVehicleStatusBadge(row.original.status),
      },
      {
        id: 'actions',
        header: '操作',
        cell: ({ row }) => {
          const vehicle = row.original;
          return (
            <div className='flex items-center justify-end space-x-2'>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant='ghost'
                      size='sm'
                      onClick={() => {
                        setNewRequest({
                          ...newRequest,
                          vehicle_id: vehicle.id,
                          vehicle_plate: vehicle.plate_number,
                        });
                        setShowRequestModal(true);
                      }}
                    >
                      用车
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>申请用车</TooltipContent>
                </Tooltip>
              </TooltipProvider>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant='ghost'
                      size='sm'
                      onClick={() => {
                        setSelectedVehicle(vehicle);
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
                      onClick={() => handleDeleteVehicle(vehicle.id)}
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
    [vehicles]
  );

  const requestColumns = useMemo<ColumnDef<VehicleRequest>[]>(
    () => [
      {
        accessorKey: 'vehicle_plate',
        header: '车牌号',
        cell: ({ row }) => (
          <div className='font-medium text-slate-900 dark:text-slate-100'>{row.original.vehicle_plate}</div>
        ),
      },
      {
        accessorKey: 'requester',
        header: '申请人',
        cell: ({ row }) => <div className='text-slate-900 dark:text-slate-100'>{row.original.requester}</div>,
      },
      {
        accessorKey: 'purpose',
        header: '用途',
        cell: ({ row }) => (
          <span className='text-sm text-slate-500 dark:text-slate-400'>{row.original.purpose || '-'}</span>
        ),
      },
      {
        accessorKey: 'start_time',
        header: '开始时间',
        cell: ({ row }) => (
          <div className='flex items-center text-sm text-slate-900 dark:text-slate-100'>
            <Calendar className='w-3 h-3 mr-1 text-blue-600' />
            {row.original.start_time ? new Date(row.original.start_time).toLocaleString() : '-'}
          </div>
        ),
      },
      {
        accessorKey: 'end_time',
        header: '结束时间',
        cell: ({ row }) => (
          <div className='flex items-center text-sm text-slate-900 dark:text-slate-100'>
            <Calendar className='w-3 h-3 mr-1 text-blue-600' />
            {row.original.end_time ? new Date(row.original.end_time).toLocaleString() : '-'}
          </div>
        ),
      },
      {
        accessorKey: 'driver_required',
        header: '需要司机',
        cell: ({ row }) => (
          <span className='text-sm text-slate-500 dark:text-slate-400'>
            {row.original.driver_required ? '是' : '否'}
          </span>
        ),
      },
      {
        accessorKey: 'status',
        header: '状态',
        cell: ({ row }) => getRequestStatusBadge(row.original.status),
      },
      {
        id: 'actions',
        header: '操作',
        cell: ({ row }) => {
          const request = row.original;
          return (
            <div className='flex items-center justify-end space-x-2'>
              {request.status === 'pending' && (
                <>
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          variant='ghost'
                          size='sm'
                          className='text-green-600 hover:text-green-700 dark:text-green-400'
                          onClick={() => handleUpdateRequestStatus(request.id, 'approved')}
                        >
                          批准
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>批准申请</TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          variant='ghost'
                          size='sm'
                          className='text-red-600 hover:text-red-700 dark:text-red-400'
                          onClick={() => handleUpdateRequestStatus(request.id, 'rejected')}
                        >
                          拒绝
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>拒绝申请</TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </>
              )}
              {request.status === 'approved' && (
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant='ghost'
                        size='sm'
                        className='text-blue-600 hover:text-blue-700 dark:text-blue-400'
                        onClick={() => handleUpdateRequestStatus(request.id, 'completed')}
                      >
                        完成
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>标记完成</TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              )}
            </div>
          );
        },
      },
    ],
    [requests]
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
                  <Car className='w-7 h-7 mr-3 text-blue-600' />
                  车辆管理
                </h1>
                <p className='mt-1 text-sm text-slate-500 dark:text-slate-400'>管理企业车辆和用车申请</p>
              </div>
            </div>
            <div className='flex items-center space-x-2'>
              <ModeToggle />
              <Button onClick={() => setShowCreateModal(true)}>
                <Plus className='w-5 h-5 mr-2' />
                添加车辆
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className='max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8'>
        <Tabs defaultValue='vehicles' className='w-full'>
          <TabsList className='grid w-full max-w-md grid-cols-2'>
            <TabsTrigger value='vehicles'>车辆列表</TabsTrigger>
            <TabsTrigger value='requests'>用车申请</TabsTrigger>
          </TabsList>
          <TabsContent value='vehicles'>
            <Card>
              <CardContent className='p-0'>
                {loading ? (
                  <div className='p-8 text-center'>
                    <div className='inline-block animate-spin rounded-full h-8 w-8 border-4 border-blue-600 border-t-transparent' />
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
                    columns={vehicleColumns}
                    data={vehicles}
                    searchPlaceholder='搜索车牌号、品牌、型号...'
                    searchKey='plate_number'
                  />
                )}
              </CardContent>
            </Card>
          </TabsContent>
          <TabsContent value='requests'>
            <Card>
              <CardContent className='p-0'>
                {loading ? (
                  <div className='p-8 text-center'>
                    <div className='inline-block animate-spin rounded-full h-8 w-8 border-4 border-blue-600 border-t-transparent' />
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
                    columns={requestColumns}
                    data={requests}
                    searchPlaceholder='搜索车牌号、申请人、用途...'
                    searchKey='requester'
                  />
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      <Dialog open={showCreateModal} onOpenChange={setShowCreateModal}>
        <DialogContent className='max-w-2xl max-h-[90vh] overflow-y-auto'>
          <DialogHeader>
            <DialogTitle>添加车辆</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleCreateVehicle}>
            <div className='space-y-4'>
              <div className='grid grid-cols-2 gap-4'>
                <div className='space-y-2'>
                  <Label htmlFor='plate_number'>车牌号 *</Label>
                  <Input
                    id='plate_number'
                    type='text'
                    required
                    value={newVehicle.plate_number || ''}
                    onChange={(e) => setNewVehicle({ ...newVehicle, plate_number: e.target.value })}
                    placeholder='请输入车牌号'
                  />
                </div>
                <div className='space-y-2'>
                  <Label htmlFor='brand'>品牌</Label>
                  <Input
                    id='brand'
                    type='text'
                    value={newVehicle.brand || ''}
                    onChange={(e) => setNewVehicle({ ...newVehicle, brand: e.target.value })}
                    placeholder='请输入品牌'
                  />
                </div>
              </div>

              <div className='grid grid-cols-2 gap-4'>
                <div className='space-y-2'>
                  <Label htmlFor='model'>型号</Label>
                  <Input
                    id='model'
                    type='text'
                    value={newVehicle.model || ''}
                    onChange={(e) => setNewVehicle({ ...newVehicle, model: e.target.value })}
                    placeholder='请输入型号'
                  />
                </div>
                <div className='space-y-2'>
                  <Label htmlFor='vehicle_type'>车辆类型</Label>
                  <Select
                    value={newVehicle.vehicle_type || ''}
                    onValueChange={(value) => setNewVehicle({ ...newVehicle, vehicle_type: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder='请选择车辆类型' />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value='sedan'>轿车</SelectItem>
                      <SelectItem value='suv'>SUV</SelectItem>
                      <SelectItem value='van'>面包车</SelectItem>
                      <SelectItem value='truck'>货车</SelectItem>
                      <SelectItem value='bus'>客车</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className='grid grid-cols-2 gap-4'>
                <div className='space-y-2'>
                  <Label htmlFor='driver'>司机</Label>
                  <Input
                    id='driver'
                    type='text'
                    value={newVehicle.driver || ''}
                    onChange={(e) => setNewVehicle({ ...newVehicle, driver: e.target.value })}
                    placeholder='请输入司机姓名'
                  />
                </div>
                <div className='space-y-2'>
                  <Label htmlFor='fuel_type'>燃料类型</Label>
                  <Select
                    value={newVehicle.fuel_type || ''}
                    onValueChange={(value) => setNewVehicle({ ...newVehicle, fuel_type: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder='请选择燃料类型' />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value='gasoline'>汽油</SelectItem>
                      <SelectItem value='diesel'>柴油</SelectItem>
                      <SelectItem value='electric'>电动</SelectItem>
                      <SelectItem value='hybrid'>混动</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className='grid grid-cols-2 gap-4'>
                <div className='space-y-2'>
                  <Label htmlFor='mileage'>里程(km)</Label>
                  <Input
                    id='mileage'
                    type='number'
                    value={newVehicle.mileage || ''}
                    onChange={(e) => setNewVehicle({ ...newVehicle, mileage: Number(e.target.value) })}
                    placeholder='请输入里程'
                  />
                </div>
                <div className='space-y-2'>
                  <Label htmlFor='status'>状态</Label>
                  <Select
                    value={newVehicle.status || 'available'}
                    onValueChange={(value) => setNewVehicle({ ...newVehicle, status: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder='请选择状态' />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value='available'>可用</SelectItem>
                      <SelectItem value='in_use'>使用中</SelectItem>
                      <SelectItem value='maintenance'>维护中</SelectItem>
                      <SelectItem value='out_of_service'>停用</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className='space-y-2'>
                <Label htmlFor='last_service'>上次保养时间</Label>
                <Input
                  id='last_service'
                  type='date'
                  value={newVehicle.last_service || ''}
                  onChange={(e) => setNewVehicle({ ...newVehicle, last_service: e.target.value })}
                />
              </div>
            </div>

            <DialogFooter className='mt-6'>
              <Button type='button' variant='secondary' onClick={() => setShowCreateModal(false)}>
                取消
              </Button>
              <Button type='submit'>添加</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={showEditModal} onOpenChange={setShowEditModal}>
        <DialogContent className='max-w-2xl max-h-[90vh] overflow-y-auto'>
          <DialogHeader>
            <DialogTitle>编辑车辆</DialogTitle>
          </DialogHeader>
          {selectedVehicle && (
            <form onSubmit={handleEditVehicle}>
              <div className='space-y-4'>
                <div className='grid grid-cols-2 gap-4'>
                  <div className='space-y-2'>
                    <Label htmlFor='edit_plate_number'>车牌号 *</Label>
                    <Input
                      id='edit_plate_number'
                      type='text'
                      required
                      value={selectedVehicle.plate_number}
                      onChange={(e) => setSelectedVehicle({ ...selectedVehicle, plate_number: e.target.value })}
                    />
                  </div>
                  <div className='space-y-2'>
                    <Label htmlFor='edit_brand'>品牌</Label>
                    <Input
                      id='edit_brand'
                      type='text'
                      value={selectedVehicle.brand || ''}
                      onChange={(e) => setSelectedVehicle({ ...selectedVehicle, brand: e.target.value })}
                    />
                  </div>
                </div>

                <div className='grid grid-cols-2 gap-4'>
                  <div className='space-y-2'>
                    <Label htmlFor='edit_model'>型号</Label>
                    <Input
                      id='edit_model'
                      type='text'
                      value={selectedVehicle.model || ''}
                      onChange={(e) => setSelectedVehicle({ ...selectedVehicle, model: e.target.value })}
                    />
                  </div>
                  <div className='space-y-2'>
                    <Label htmlFor='edit_vehicle_type'>车辆类型</Label>
                    <Select
                      value={selectedVehicle.vehicle_type || ''}
                      onValueChange={(value) => setSelectedVehicle({ ...selectedVehicle, vehicle_type: value })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder='请选择车辆类型' />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value='sedan'>轿车</SelectItem>
                        <SelectItem value='suv'>SUV</SelectItem>
                        <SelectItem value='van'>面包车</SelectItem>
                        <SelectItem value='truck'>货车</SelectItem>
                        <SelectItem value='bus'>客车</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className='grid grid-cols-2 gap-4'>
                  <div className='space-y-2'>
                    <Label htmlFor='edit_driver'>司机</Label>
                    <Input
                      id='edit_driver'
                      type='text'
                      value={selectedVehicle.driver || ''}
                      onChange={(e) => setSelectedVehicle({ ...selectedVehicle, driver: e.target.value })}
                    />
                  </div>
                  <div className='space-y-2'>
                    <Label htmlFor='edit_fuel_type'>燃料类型</Label>
                    <Select
                      value={selectedVehicle.fuel_type || ''}
                      onValueChange={(value) => setSelectedVehicle({ ...selectedVehicle, fuel_type: value })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder='请选择燃料类型' />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value='gasoline'>汽油</SelectItem>
                        <SelectItem value='diesel'>柴油</SelectItem>
                        <SelectItem value='electric'>电动</SelectItem>
                        <SelectItem value='hybrid'>混动</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className='grid grid-cols-2 gap-4'>
                  <div className='space-y-2'>
                    <Label htmlFor='edit_mileage'>里程(km)</Label>
                    <Input
                      id='edit_mileage'
                      type='number'
                      value={selectedVehicle.mileage || ''}
                      onChange={(e) => setSelectedVehicle({ ...selectedVehicle, mileage: Number(e.target.value) })}
                    />
                  </div>
                  <div className='space-y-2'>
                    <Label htmlFor='edit_status'>状态</Label>
                    <Select
                      value={selectedVehicle.status}
                      onValueChange={(value) => setSelectedVehicle({ ...selectedVehicle, status: value })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder='请选择状态' />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value='available'>可用</SelectItem>
                        <SelectItem value='in_use'>使用中</SelectItem>
                        <SelectItem value='maintenance'>维护中</SelectItem>
                        <SelectItem value='out_of_service'>停用</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className='space-y-2'>
                  <Label htmlFor='edit_last_service'>上次保养时间</Label>
                  <Input
                    id='edit_last_service'
                    type='date'
                    value={selectedVehicle.last_service || ''}
                    onChange={(e) => setSelectedVehicle({ ...selectedVehicle, last_service: e.target.value })}
                  />
                </div>
              </div>

              <DialogFooter className='mt-6'>
                <Button
                  type='button'
                  variant='secondary'
                  onClick={() => {
                    setShowEditModal(false);
                    setSelectedVehicle(null);
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

      <Dialog open={showRequestModal} onOpenChange={setShowRequestModal}>
        <DialogContent className='max-w-xl max-h-[90vh] overflow-y-auto'>
          <DialogHeader>
            <DialogTitle>申请用车</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleCreateRequest}>
            <div className='space-y-4'>
              <div className='space-y-2'>
                <Label htmlFor='request_vehicle'>选择车辆</Label>
                <Select
                  value={newRequest.vehicle_id || ''}
                  onValueChange={(value) => {
                    const vehicle = vehicles.find((v) => v.id === value);
                    setNewRequest({
                      ...newRequest,
                      vehicle_id: value,
                      vehicle_plate: vehicle?.plate_number || '',
                    });
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder='请选择车辆' />
                  </SelectTrigger>
                  <SelectContent>
                    {vehicles
                      .filter((v) => v.status === 'available')
                      .map((vehicle) => (
                        <SelectItem key={vehicle.id} value={vehicle.id}>
                          {vehicle.plate_number} - {vehicle.brand} {vehicle.model}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>

              <div className='space-y-2'>
                <Label htmlFor='requester'>申请人 *</Label>
                <Input
                  id='requester'
                  type='text'
                  required
                  value={newRequest.requester || ''}
                  onChange={(e) => setNewRequest({ ...newRequest, requester: e.target.value })}
                  placeholder='请输入申请人姓名'
                />
              </div>

              <div className='space-y-2'>
                <Label htmlFor='purpose'>用途</Label>
                <Input
                  id='purpose'
                  type='text'
                  value={newRequest.purpose || ''}
                  onChange={(e) => setNewRequest({ ...newRequest, purpose: e.target.value })}
                  placeholder='请输入用车用途'
                />
              </div>

              <div className='grid grid-cols-2 gap-4'>
                <div className='space-y-2'>
                  <Label htmlFor='start_time'>开始时间 *</Label>
                  <Input
                    id='start_time'
                    type='datetime-local'
                    required
                    value={newRequest.start_time || ''}
                    onChange={(e) => setNewRequest({ ...newRequest, start_time: e.target.value })}
                  />
                </div>
                <div className='space-y-2'>
                  <Label htmlFor='end_time'>结束时间 *</Label>
                  <Input
                    id='end_time'
                    type='datetime-local'
                    required
                    value={newRequest.end_time || ''}
                    onChange={(e) => setNewRequest({ ...newRequest, end_time: e.target.value })}
                  />
                </div>
              </div>

              <div className='space-y-2'>
                <Label htmlFor='driver_required'>需要司机</Label>
                <Select
                  value={newRequest.driver_required ? 'true' : 'false'}
                  onValueChange={(value) => setNewRequest({ ...newRequest, driver_required: value === 'true' })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder='请选择' />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value='true'>是</SelectItem>
                    <SelectItem value='false'>否</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <DialogFooter className='mt-6'>
              <Button
                type='button'
                variant='secondary'
                onClick={() => {
                  setShowRequestModal(false);
                  setNewRequest({
                    vehicle_id: '',
                    vehicle_plate: '',
                    requester: '',
                    purpose: '',
                    start_time: '',
                    end_time: '',
                    driver_required: false,
                    status: 'pending',
                  });
                }}
              >
                取消
              </Button>
              <Button type='submit'>提交申请</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default VehicleManagementPage;
