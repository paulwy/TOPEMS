import React, { useState, useEffect, useMemo } from 'react';
import { Briefcase, Search, Plus, Edit, Trash2, ChevronLeft, AlertCircle, Eye } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { positionApi, departmentApi, type Position, type PaginatedResult, type ListParams } from '../api/hrm';
import { useAppStore } from '../store';
import { ColumnDef } from '@tanstack/react-table';
import { DataTable } from '../components/DataTable';

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

interface PositionManagementPageProps {
  onNavigate?: (page: string) => void;
}

const PositionManagementPage: React.FC<PositionManagementPageProps> = ({ onNavigate }) => {
  const navigate = useNavigate();
  const addNotification = useAppStore((state) => state.addNotification);
  
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<PaginatedResult<Position>>({ items: [], total: 0, page: 1, page_size: 10 });
  const [searchText, setSearchText] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [departments, setDepartments] = useState<{ id: string; name: string }[]>([]);
  const [departmentFilter, setDepartmentFilter] = useState('');
  
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const [selectedPosition, setSelectedPosition] = useState<Position | null>(null);
  
  const [formData, setFormData] = useState<Partial<Position>>({});

  const fetchPositions = async (params?: ListParams) => {
    setLoading(true);
    try {
      const response = await positionApi.list(params);
      if (response.code === 200 && response.data) {
        const data = response.data as any;
        setData({
          items: data.items || [],
          total: data.total || 0,
          page: data.page || 1,
          page_size: data.page_size || 10,
        });
      } else {
        setData({ items: [], total: 0, page: 1, page_size: 10 });
      }
    } catch (error: any) {
      addNotification({ title: '加载失败', message: error.message || '获取岗位列表失败', type: 'error' });
      setData({ items: [], total: 0, page: 1, page_size: 10 });
    } finally {
      setLoading(false);
    }
  };

  const fetchDepartments = async () => {
    try {
      const response = await departmentApi.list();
      if (response.code === 200 && response.data) {
        const items = (response.data as any).items || [];
        setDepartments(items.map((d: any) => ({ id: d.id, name: d.name })));
      } else {
        setDepartments([]);
      }
    } catch (error: any) {
      addNotification({ title: '加载失败', message: error.message || '获取部门列表失败', type: 'error' });
      setDepartments([]);
    }
  };

  useEffect(() => {
    fetchPositions();
    fetchDepartments();
  }, []);

  const handleSearch = () => {
    fetchPositions({
      page: 1,
      search: searchText || undefined,
      status: statusFilter || undefined,
      department_id: departmentFilter || undefined,
    });
  };

  const handleReset = () => {
    setSearchText('');
    setStatusFilter('');
    setDepartmentFilter('');
    fetchPositions({ page: 1 });
  };

  const handleAdd = () => {
    setSelectedPosition(null);
    setFormData({});
    setShowCreateModal(true);
  };

  const handleEdit = (record: Position) => {
    setSelectedPosition(record);
    setFormData(record);
    setShowEditModal(true);
  };

  const handleView = (record: Position) => {
    setSelectedPosition(record);
    setShowViewModal(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('确定要删除这个岗位吗？')) return;
    try {
      const response = await positionApi.delete(id);
      if (response.code === 200) {
        addNotification({ title: '成功', message: '岗位删除成功', type: 'success' });
        fetchPositions();
      } else {
        addNotification({ title: '失败', message: '删除岗位失败', type: 'error' });
      }
    } catch (error: any) {
      addNotification({ title: '失败', message: error.message || '删除岗位失败', type: 'error' });
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await positionApi.create(formData);
      addNotification({ title: '成功', message: '岗位创建成功', type: 'success' });
      setShowCreateModal(false);
      setFormData({});
      fetchPositions();
    } catch (error: any) {
      addNotification({ title: '失败', message: error.message || '创建岗位失败', type: 'error' });
    }
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPosition) return;
    try {
      await positionApi.update(selectedPosition.id, formData);
      addNotification({ title: '成功', message: '岗位更新成功', type: 'success' });
      setShowEditModal(false);
      setSelectedPosition(null);
      fetchPositions();
    } catch (error: any) {
      addNotification({ title: '失败', message: error.message || '更新岗位失败', type: 'error' });
    }
  };

  const handleInputChange = (field: string, value: string | number) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const getStatusBadge = (status: string) => {
    const colors: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
      active: 'default',
      inactive: 'secondary',
    };
    const labels: Record<string, string> = {
      active: '启用',
      inactive: '禁用',
    };
    return (
      <Badge variant={colors[status] || 'outline'}>
        {labels[status] || status}
      </Badge>
    );
  };

  const columns = useMemo<ColumnDef<Position>[]>(() => [
    {
      accessorKey: 'name',
      header: '岗位名称',
      cell: ({ row }) => {
        return (
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-indigo-100 dark:bg-indigo-900 rounded-lg flex items-center justify-center">
              <Briefcase className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
            </div>
            <div>
              <div className="font-medium text-gray-900 dark:text-gray-100">
                {row.original.name}
              </div>
              {row.original.code && (
                <div className="text-sm text-gray-500 dark:text-gray-400">
                  {row.original.code}
                </div>
              )}
            </div>
          </div>
        );
      },
    },
    {
      accessorKey: 'department_id',
      header: '所属部门',
      cell: ({ row }) => (
        <span className="text-sm text-gray-900 dark:text-gray-100">
          {departments.find(d => d.id === row.original.department_id)?.name || '-'}
        </span>
      ),
    },
    {
      accessorKey: 'level',
      header: '岗位级别',
      cell: ({ row }) => (
        <span className="text-sm text-gray-900 dark:text-gray-100">
          {row.original.level || '-'}
        </span>
      ),
    },
    {
      accessorKey: 'salary_range',
      header: '薪资范围',
      cell: ({ row }) => (
        <span className="text-sm text-gray-900 dark:text-gray-100">
          {row.original.min_salary || 0} - {row.original.max_salary || 0}
        </span>
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
        const position = row.original;
        return (
          <div className="flex items-center justify-end space-x-2">
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleView(position)}
                  >
                    <Eye className="w-4 h-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>查看</TooltipContent>
              </Tooltip>
            </TooltipProvider>
            
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleEdit(position)}
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
                    onClick={() => handleDelete(position.id)}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>删除</TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
        );
      },
    },
  ], [departments]);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="bg-white dark:bg-gray-800 shadow-sm border-b border-gray-200 dark:border-gray-700">
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
                <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 flex items-center">
                  <Briefcase className="w-7 h-7 mr-3 text-indigo-600" />
                  岗位管理
                </h1>
                <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                  管理企业岗位信息、薪资范围
                </p>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <ModeToggle />
              <Button onClick={handleAdd}>
                <Plus className="w-5 h-5 mr-2" />
                新增岗位
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Card className="mb-6">
          <CardContent className="p-4">
            <div className="flex flex-wrap gap-4">
              <div className="flex-1 min-w-[200px] relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                <Input
                  type="text"
                  placeholder="搜索岗位名称或编码"
                  value={searchText}
                  onChange={(e) => setSearchText(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                  className="pl-10"
                />
              </div>
              <Select
                value={departmentFilter}
                onValueChange={setDepartmentFilter}
              >
                <SelectTrigger className="w-[160px]">
                  <SelectValue placeholder="全部部门" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">全部部门</SelectItem>
                  {departments.map(d => (
                    <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select
                value={statusFilter}
                onValueChange={setStatusFilter}
              >
                <SelectTrigger className="w-[140px]">
                  <SelectValue placeholder="全部状态" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">全部状态</SelectItem>
                  <SelectItem value="active">启用</SelectItem>
                  <SelectItem value="inactive">禁用</SelectItem>
                </SelectContent>
              </Select>
              <Button variant="secondary" onClick={handleSearch}>
                搜索
              </Button>
              <Button variant="outline" onClick={handleReset}>
                重置
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-0">
            {loading ? (
              <div className="p-8 text-center">
                <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-indigo-600 border-t-transparent"></div>
                <p className="mt-2 text-gray-500 dark:text-gray-400">加载中...</p>
              </div>
            ) : data.items.length === 0 ? (
              <div className="p-8 text-center">
                <Briefcase className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                <p className="text-gray-500 dark:text-gray-400">暂无岗位数据</p>
              </div>
            ) : (
              <DataTable
                columns={columns}
                data={data.items}
                enablePagination={true}
                pageCount={Math.ceil(data.total / data.page_size)}
                onPageChange={(page) => fetchPositions({ page })}
                currentPage={data.page}
              />
            )}
          </CardContent>
        </Card>
      </div>

      <Dialog open={showCreateModal} onOpenChange={setShowCreateModal}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>新增岗位</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleCreate}>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="create-name">岗位名称 *</Label>
                <Input
                  id="create-name"
                  type="text"
                  required
                  value={(formData as Position)?.name || ''}
                  onChange={(e) => handleInputChange('name', e.target.value)}
                  placeholder="请输入岗位名称"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="create-code">岗位编码</Label>
                <Input
                  id="create-code"
                  type="text"
                  value={(formData as Position)?.code || ''}
                  onChange={(e) => handleInputChange('code', e.target.value)}
                  placeholder="请输入岗位编码"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="create-department">所属部门</Label>
                <Select
                  value={(formData as Position)?.department_id || ''}
                  onValueChange={(value) => handleInputChange('department_id', value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="请选择" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">无</SelectItem>
                    {departments.map(d => (
                      <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="create-level">岗位级别</Label>
                <Input
                  id="create-level"
                  type="text"
                  value={(formData as Position)?.level || ''}
                  onChange={(e) => handleInputChange('level', e.target.value)}
                  placeholder="请输入岗位级别"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="create-min-salary">最低薪资</Label>
                  <Input
                    id="create-min-salary"
                    type="number"
                    value={(formData as Position)?.min_salary || ''}
                    onChange={(e) => handleInputChange('min_salary', parseFloat(e.target.value) || 0)}
                    placeholder="最低薪资"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="create-max-salary">最高薪资</Label>
                  <Input
                    id="create-max-salary"
                    type="number"
                    value={(formData as Position)?.max_salary || ''}
                    onChange={(e) => handleInputChange('max_salary', parseFloat(e.target.value) || 0)}
                    placeholder="最高薪资"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="create-description">岗位描述</Label>
                <Textarea
                  id="create-description"
                  value={(formData as Position)?.description || ''}
                  onChange={(e) => handleInputChange('description', e.target.value)}
                  rows={3}
                  placeholder="请输入岗位描述"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="create-requirements">任职要求</Label>
                <Textarea
                  id="create-requirements"
                  value={(formData as Position)?.requirements || ''}
                  onChange={(e) => handleInputChange('requirements', e.target.value)}
                  rows={3}
                  placeholder="请输入任职要求"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="create-status">状态</Label>
                <Select
                  value={(formData as Position)?.status || 'active'}
                  onValueChange={(value) => handleInputChange('status', value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="请选择" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">启用</SelectItem>
                    <SelectItem value="inactive">禁用</SelectItem>
                  </SelectContent>
                </Select>
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
            <DialogTitle>编辑岗位</DialogTitle>
          </DialogHeader>
          {selectedPosition && (
            <form onSubmit={handleUpdate}>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="edit-name">岗位名称 *</Label>
                  <Input
                    id="edit-name"
                    type="text"
                    required
                    value={(formData as Position)?.name || ''}
                    onChange={(e) => handleInputChange('name', e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-code">岗位编码</Label>
                  <Input
                    id="edit-code"
                    type="text"
                    value={(formData as Position)?.code || ''}
                    onChange={(e) => handleInputChange('code', e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-department">所属部门</Label>
                  <Select
                    value={(formData as Position)?.department_id || ''}
                    onValueChange={(value) => handleInputChange('department_id', value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="请选择" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">无</SelectItem>
                      {departments.map(d => (
                        <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-level">岗位级别</Label>
                  <Input
                    id="edit-level"
                    type="text"
                    value={(formData as Position)?.level || ''}
                    onChange={(e) => handleInputChange('level', e.target.value)}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="edit-min-salary">最低薪资</Label>
                    <Input
                      id="edit-min-salary"
                      type="number"
                      value={(formData as Position)?.min_salary || ''}
                      onChange={(e) => handleInputChange('min_salary', parseFloat(e.target.value) || 0)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="edit-max-salary">最高薪资</Label>
                    <Input
                      id="edit-max-salary"
                      type="number"
                      value={(formData as Position)?.max_salary || ''}
                      onChange={(e) => handleInputChange('max_salary', parseFloat(e.target.value) || 0)}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-description">岗位描述</Label>
                  <Textarea
                    id="edit-description"
                    value={(formData as Position)?.description || ''}
                    onChange={(e) => handleInputChange('description', e.target.value)}
                    rows={3}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-requirements">任职要求</Label>
                  <Textarea
                    id="edit-requirements"
                    value={(formData as Position)?.requirements || ''}
                    onChange={(e) => handleInputChange('requirements', e.target.value)}
                    rows={3}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-status">状态</Label>
                  <Select
                    value={(formData as Position)?.status || 'active'}
                    onValueChange={(value) => handleInputChange('status', value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="请选择" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="active">启用</SelectItem>
                      <SelectItem value="inactive">禁用</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <DialogFooter className="mt-6">
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => {
                    setShowEditModal(false);
                    setSelectedPosition(null);
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

      <Dialog open={showViewModal} onOpenChange={setShowViewModal}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>岗位详情</DialogTitle>
          </DialogHeader>
          {selectedPosition && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <Label className="text-gray-500 dark:text-gray-400">岗位名称</Label>
                  <div className="font-medium">{selectedPosition.name}</div>
                </div>
                <div className="space-y-1">
                  <Label className="text-gray-500 dark:text-gray-400">岗位编码</Label>
                  <div className="font-medium">{selectedPosition.code || '-'}</div>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <Label className="text-gray-500 dark:text-gray-400">所属部门</Label>
                  <div className="font-medium">{departments.find(d => d.id === selectedPosition.department_id)?.name || '-'}</div>
                </div>
                <div className="space-y-1">
                  <Label className="text-gray-500 dark:text-gray-400">岗位级别</Label>
                  <div className="font-medium">{selectedPosition.level || '-'}</div>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <Label className="text-gray-500 dark:text-gray-400">薪资范围</Label>
                  <div className="font-medium">{selectedPosition.min_salary || 0} - {selectedPosition.max_salary || 0}</div>
                </div>
                <div className="space-y-1">
                  <Label className="text-gray-500 dark:text-gray-400">状态</Label>
                  <div className="font-medium">{getStatusBadge(selectedPosition.status)}</div>
                </div>
              </div>
              <div className="space-y-1">
                <Label className="text-gray-500 dark:text-gray-400">岗位描述</Label>
                <div className="text-sm text-gray-700 dark:text-gray-300">{selectedPosition.description || '-'}</div>
              </div>
              <div className="space-y-1">
                <Label className="text-gray-500 dark:text-gray-400">任职要求</Label>
                <div className="text-sm text-gray-700 dark:text-gray-300">{selectedPosition.requirements || '-'}</div>
              </div>
              {selectedPosition.created_at && (
                <div className="space-y-1">
                  <Label className="text-gray-500 dark:text-gray-400">创建时间</Label>
                  <div className="text-sm text-gray-500">{selectedPosition.created_at}</div>
                </div>
              )}
            </div>
          )}
          <DialogFooter>
            <Button onClick={() => setShowViewModal(false)}>
              关闭
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default PositionManagementPage;
