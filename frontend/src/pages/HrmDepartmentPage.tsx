import React, { useState, useEffect, useMemo } from 'react';
import { Building2, Search, Plus, Edit, Trash2, Eye, Users, X, RefreshCw } from 'lucide-react';
import { departmentApi, employeeApi, type Department, type Employee, type PaginatedResult, type ListParams } from '../api/hrm';
import { useAppStore } from '../store';
import { HrmLayout } from '../components/HrmLayout';
import TreeView, { TreeNode } from '../components/TreeView';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

const HrmDepartmentPage: React.FC = () => {
  const addNotification = useAppStore((state) => state.addNotification);

  const [loading, setLoading] = useState(false);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [searchText, setSearchText] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const [selectedDepartment, setSelectedDepartment] = useState<Department | null>(null);

  const [formData, setFormData] = useState<Partial<Department>>({});
  const [treeData, setTreeData] = useState<TreeNode[]>([]);
  const [selectedDeptId, setSelectedDeptId] = useState<string | undefined>();

  const fetchDepartments = async (params?: ListParams) => {
    setLoading(true);
    try {
      const response = await departmentApi.list(params);
      if (response.code === 200 && response.data) {
        const data = response.data as any;
        const depts = data.items || [];
        setDepartments(depts);
        
        const tree = buildTree(depts);
        setTreeData(tree);
      } else {
        setDepartments([]);
        setTreeData([]);
      }
    } catch (error: any) {
      addNotification({ title: '加载失败', message: error.message || '获取部门列表失败', type: 'error' });
      setDepartments([]);
      setTreeData([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchDepartmentEmployees = async (deptId: string) => {
    try {
      const response = await employeeApi.list({ department_id: deptId, page_size: 100 });
      if (response.code === 200 && response.data) {
        const data = response.data as any;
        setEmployees(data.items || []);
      } else {
        setEmployees([]);
      }
    } catch (error: any) {
      console.error('Failed to fetch employees:', error);
      setEmployees([]);
    }
  };

  const buildTree = (depts: Department[]): TreeNode[] => {
    const deptMap = new Map<string, TreeNode>();
    const rootNodes: TreeNode[] = [];

    depts.forEach(dept => {
      deptMap.set(dept.id, {
        id: dept.id,
        name: dept.name,
        type: 'department' as const,
        children: [],
        data: dept
      });
    });

    depts.forEach(dept => {
      const node = deptMap.get(dept.id)!;
      if (dept.parent_id && deptMap.has(dept.parent_id)) {
        deptMap.get(dept.parent_id)!.children!.push(node);
      } else {
        rootNodes.push(node);
      }
    });

    return rootNodes;
  };

  useEffect(() => {
    fetchDepartments();
  }, []);

  useEffect(() => {
    if (selectedDeptId) {
      fetchDepartmentEmployees(selectedDeptId);
    }
  }, [selectedDeptId]);

  const handleSearch = () => {
    fetchDepartments({
      page: 1,
      search: searchText || undefined,
      status: statusFilter || undefined,
    });
  };

  const handleReset = () => {
    setSearchText('');
    setStatusFilter('');
    fetchDepartments({ page: 1 });
  };

  const handleAdd = () => {
    setSelectedDepartment(null);
    setFormData({});
    setShowCreateModal(true);
  };

  const handleEdit = (record: Department) => {
    setSelectedDepartment(record);
    setFormData(record);
    setShowEditModal(true);
  };

  const handleView = (record: Department) => {
    setSelectedDepartment(record);
    setShowViewModal(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('确定要删除这个部门吗？')) return;
    try {
      const response = await departmentApi.delete(id);
      if (response.code === 200) {
        addNotification({ title: '成功', message: '部门删除成功', type: 'success' });
        fetchDepartments();
        if (selectedDeptId === id) {
          setSelectedDeptId(undefined);
          setEmployees([]);
        }
      } else {
        addNotification({ title: '失败', message: '删除部门失败', type: 'error' });
      }
    } catch (error: any) {
      addNotification({ title: '失败', message: error.message || '删除部门失败', type: 'error' });
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await departmentApi.create(formData);
      addNotification({ title: '成功', message: '部门创建成功', type: 'success' });
      setShowCreateModal(false);
      setFormData({});
      fetchDepartments();
    } catch (error: any) {
      addNotification({ title: '失败', message: error.message || '创建部门失败', type: 'error' });
    }
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedDepartment) return;
    try {
      await departmentApi.update(selectedDepartment.id, formData);
      addNotification({ title: '成功', message: '部门更新成功', type: 'success' });
      setShowEditModal(false);
      setSelectedDepartment(null);
      fetchDepartments();
    } catch (error: any) {
      addNotification({ title: '失败', message: error.message || '更新部门失败', type: 'error' });
    }
  };

  const handleInputChange = (field: string, value: string | number) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleSelectNode = (node: TreeNode) => {
    if (node.type === 'department') {
      setSelectedDeptId(node.id);
    }
  };

  const getStatusBadge = (status: string) => {
    const colors: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
      active: 'default',
      inactive: 'secondary',
    };
    const labels: Record<string, string> = {
      active: '启用',
      inactive: '禁用',
    };
    return <Badge variant={colors[status] || 'outline'}>{labels[status] || status}</Badge>;
  };

  const selectedDept = departments.find(d => d.id === selectedDeptId);

  return (
    <HrmLayout title='部门管理' subtitle='管理企业组织架构'>
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-3">
            <Button variant="ghost" onClick={() => {
              fetchDepartments();
              setSelectedDeptId(undefined);
              setEmployees([]);
            }}>
              <RefreshCw className="w-4 h-4" />
            </Button>
          </div>
          <div className="flex items-center space-x-2">
            <Button onClick={handleAdd}>
              <Plus className="w-5 h-5 mr-2" />
              新增部门
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-1">
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold flex items-center gap-2">
                    <Building2 className="w-5 h-5 text-emerald-600" />
                    部门树
                  </h3>
                  <div className="text-sm text-slate-500">{departments.length} 个部门</div>
                </div>
                <div className="mb-4">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <Input
                      type="text"
                      placeholder="搜索部门"
                      value={searchText}
                      onChange={(e) => setSearchText(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                      className="pl-9 text-sm"
                    />
                  </div>
                </div>
                {loading ? (
                  <div className="p-8 text-center">
                    <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-emerald-600 border-t-transparent"></div>
                    <p className="mt-2 text-gray-500">加载中...</p>
                  </div>
                ) : treeData.length === 0 ? (
                  <div className="p-8 text-center text-slate-500">
                    <Building2 className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                    <p>暂无部门数据</p>
                  </div>
                ) : (
                  <TreeView data={treeData} onSelect={handleSelectNode} selectedId={selectedDeptId} />
                )}
              </CardContent>
            </Card>
          </div>

          <div className="lg:col-span-2">
            {selectedDept ? (
              <div className="space-y-6">
                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between mb-4">
                      <div>
                        <h2 className="text-xl font-bold text-slate-900">{selectedDept.name}</h2>
                        {selectedDept.code && (
                          <p className="text-sm text-slate-500">编码: {selectedDept.code}</p>
                        )}
                      </div>
                      <div className="flex items-center space-x-2">
                        {getStatusBadge(selectedDept.status)}
                        <Button variant="ghost" size="sm" onClick={() => handleView(selectedDept)}>
                          <Eye className="w-4 h-4" />
                        </Button>
                        <Button variant="ghost" size="sm" onClick={() => handleEdit(selectedDept)}>
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button variant="ghost" size="sm" className="text-red-600" onClick={() => handleDelete(selectedDept.id)}>
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label className="text-sm text-slate-500">上级部门</Label>
                        <p className="font-medium mt-1">
                          {selectedDept.parent_id 
                            ? departments.find(d => d.id === selectedDept.parent_id)?.name || '-'
                            : '无'
                          }
                        </p>
                      </div>
                      <div>
                        <Label className="text-sm text-slate-500">部门人数</Label>
                        <p className="font-medium mt-1">{employees.length} 人</p>
                      </div>
                    </div>
                    {selectedDept.description && (
                      <div className="mt-4">
                        <Label className="text-sm text-slate-500">部门描述</Label>
                        <p className="font-medium mt-1">{selectedDept.description}</p>
                      </div>
                    )}
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-4">
                    <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                      <Users className="w-5 h-5 text-blue-500" />
                      部门成员
                    </h3>
                    {employees.length === 0 ? (
                      <div className="p-8 text-center text-slate-500">
                        <Users className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                        <p>该部门暂无员工</p>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {employees.map(emp => (
                          <div key={emp.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                            <div>
                              <p className="font-medium text-slate-900">{emp.name}</p>
                              <p className="text-sm text-slate-500">
                                {emp.employee_number} · {emp.position || '无职位'}
                              </p>
                            </div>
                            <div className="text-right">
                              <p className="text-sm text-slate-600">{emp.email}</p>
                              <p className="text-xs text-slate-400">{emp.phone}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            ) : (
              <Card className="h-full">
                <CardContent className="p-12 text-center">
                  <Building2 className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-slate-500 mb-2">选择部门查看详情</h3>
                  <p className="text-sm text-slate-400">从左侧部门树中选择一个部门，查看部门详情和成员信息</p>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>

      <Dialog open={showCreateModal} onOpenChange={setShowCreateModal}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>新增部门</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleCreate}>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="create-name">部门名称 *</Label>
                <Input
                  id="create-name"
                  type="text"
                  required
                  value={(formData as Department)?.name || ''}
                  onChange={(e) => handleInputChange('name', e.target.value)}
                  placeholder="请输入部门名称"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="create-code">部门编码</Label>
                <Input
                  id="create-code"
                  type="text"
                  value={(formData as Department)?.code || ''}
                  onChange={(e) => handleInputChange('code', e.target.value)}
                  placeholder="请输入部门编码"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="create-parent">上级部门</Label>
                <Select
                  value={(formData as Department)?.parent_id || ''}
                  onValueChange={(value) => handleInputChange('parent_id', value === 'none' ? undefined : value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="请选择" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">无</SelectItem>
                    {departments.map((d) => (
                      <SelectItem key={d.id} value={d.id}>
                        {d.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="create-description">部门描述</Label>
                <Textarea
                  id="create-description"
                  value={(formData as Department)?.description || ''}
                  onChange={(e) => handleInputChange('description', e.target.value)}
                  rows={3}
                  placeholder="请输入部门描述"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="create-status">状态</Label>
                <Select
                  value={(formData as Department)?.status || 'active'}
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
              <Button type="button" variant="secondary" onClick={() => setShowCreateModal(false)}>
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
            <DialogTitle>编辑部门</DialogTitle>
          </DialogHeader>
          {selectedDepartment && (
            <form onSubmit={handleUpdate}>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="edit-name">部门名称 *</Label>
                  <Input
                    id="edit-name"
                    type="text"
                    required
                    value={(formData as Department)?.name || ''}
                    onChange={(e) => handleInputChange('name', e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-code">部门编码</Label>
                  <Input
                    id="edit-code"
                    type="text"
                    value={(formData as Department)?.code || ''}
                    onChange={(e) => handleInputChange('code', e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-parent">上级部门</Label>
                  <Select
                    value={(formData as Department)?.parent_id || ''}
                    onValueChange={(value) => handleInputChange('parent_id', value === 'none' ? undefined : value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="请选择" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">无</SelectItem>
                      {departments
                        .filter((d) => d.id !== selectedDepartment.id)
                        .map((d) => (
                          <SelectItem key={d.id} value={d.id}>
                            {d.name}
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-description">部门描述</Label>
                  <Textarea
                    id="edit-description"
                    value={(formData as Department)?.description || ''}
                    onChange={(e) => handleInputChange('description', e.target.value)}
                    rows={3}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-status">状态</Label>
                  <Select
                    value={(formData as Department)?.status || 'active'}
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
                    setSelectedDepartment(null);
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
            <DialogTitle>部门详情</DialogTitle>
          </DialogHeader>
          {selectedDepartment && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>部门名称</Label>
                <div className="text-sm text-gray-900">{selectedDepartment.name}</div>
              </div>
              {selectedDepartment.code && (
                <div className="space-y-2">
                  <Label>部门编码</Label>
                  <div className="text-sm text-gray-900">{selectedDepartment.code}</div>
                </div>
              )}
              {selectedDepartment.parent_id && (
                <div className="space-y-2">
                  <Label>上级部门</Label>
                  <div className="text-sm text-gray-900">
                    {departments.find((d) => d.id === selectedDepartment.parent_id)?.name || '-'}
                  </div>
                </div>
              )}
              {selectedDepartment.description && (
                <div className="space-y-2">
                  <Label>部门描述</Label>
                  <div className="text-sm text-gray-900">{selectedDepartment.description}</div>
                </div>
              )}
              <div className="space-y-2">
                <Label>状态</Label>
                <div>{getStatusBadge(selectedDepartment.status)}</div>
              </div>
            </div>
          )}
          <DialogFooter className="mt-6">
            <Button type="button" variant="secondary" onClick={() => setShowViewModal(false)}>
              关闭
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </HrmLayout>
  );
};

export default HrmDepartmentPage;
