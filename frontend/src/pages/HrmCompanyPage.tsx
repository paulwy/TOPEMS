import React, { useState, useEffect } from 'react';
import { Building, Search, Plus, Edit, Trash2, Eye, ArrowLeft, X, Users, Folder } from 'lucide-react';
import { companyApi, departmentApi, employeeApi, type Company, type Department, type Employee, type PaginatedResult, type ListParams } from '../api/hrm';
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

const HrmCompanyPage: React.FC = () => {
  const addNotification = useAppStore((state) => state.addNotification);

  const [loading, setLoading] = useState(false);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [searchText, setSearchText] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const [selectedCompany, setSelectedCompany] = useState<Company | null>(null);
  const [formData, setFormData] = useState<Partial<Company>>({});

  const [showDetailView, setShowDetailView] = useState(false);
  const [currentCompany, setCurrentCompany] = useState<Company | null>(null);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [treeData, setTreeData] = useState<TreeNode[]>([]);

  const fetchCompanies = async (params?: ListParams) => {
    setLoading(true);
    try {
      const response = await companyApi.list(params);
      if (response.code === 200 && response.data) {
        const data = response.data as any;
        setCompanies(data.items || []);
      } else {
        setCompanies([]);
      }
    } catch (error: any) {
      addNotification({ title: '加载失败', message: error.message || '获取公司列表失败', type: 'error' });
      setCompanies([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchCompanyDetails = async (companyId: string) => {
    setLoading(true);
    try {
      const [deptResponse, empResponse] = await Promise.all([
        departmentApi.list({ company_id: companyId }),
        employeeApi.list({ department_id: undefined, page_size: 100 })
      ]);

      const depts: Department[] = deptResponse.code === 200 && deptResponse.data 
        ? (deptResponse.data as any).items || [] 
        : [];
      const emps: Employee[] = empResponse.code === 200 && empResponse.data 
        ? (empResponse.data as any).items || [] 
        : [];

      setDepartments(depts);
      setEmployees(emps);

      const tree = buildTree(depts, emps);
      setTreeData(tree);
    } catch (error: any) {
      console.error('Failed to fetch company details:', error);
    } finally {
      setLoading(false);
    }
  };

  const buildTree = (depts: Department[], emps: Employee[]): TreeNode[] => {
    const deptMap = new Map<string, TreeNode>();
    const rootNodes: TreeNode[] = [];

    depts.forEach(dept => {
      deptMap.set(dept.id, {
        id: dept.id,
        name: dept.name,
        type: 'department' as const,
        children: []
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

    emps.forEach(emp => {
      const empNode: TreeNode = {
        id: emp.id,
        name: emp.name,
        type: 'employee' as const,
        data: emp
      };
      if (emp.department_id && deptMap.has(emp.department_id)) {
        deptMap.get(emp.department_id)!.children!.push(empNode);
      }
    });

    return rootNodes;
  };

  useEffect(() => {
    fetchCompanies();
  }, []);

  useEffect(() => {
    if (currentCompany) {
      fetchCompanyDetails(currentCompany.id);
    }
  }, [currentCompany]);

  const handleSearch = () => {
    fetchCompanies({
      page: 1,
      search: searchText || undefined,
      status: statusFilter === 'all' ? undefined : statusFilter || undefined,
    });
  };

  const handleReset = () => {
    setSearchText('');
    setStatusFilter('all');
    fetchCompanies({ page: 1 });
  };

  const handleAdd = () => {
    setSelectedCompany(null);
    setFormData({ status: 'active' });
    setShowCreateModal(true);
  };

  const handleEdit = (record: Company) => {
    setSelectedCompany(record);
    setFormData(record);
    setShowEditModal(true);
  };

  const handleView = (record: Company) => {
    setSelectedCompany(record);
    setShowViewModal(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('确定要删除这个公司吗？')) return;
    try {
      const response = await companyApi.delete(id);
      if (response.code === 200) {
        addNotification({ title: '成功', message: '公司删除成功', type: 'success' });
        fetchCompanies();
      } else {
        addNotification({ title: '失败', message: '删除公司失败', type: 'error' });
      }
    } catch (error: any) {
      addNotification({ title: '失败', message: error.message || '删除公司失败', type: 'error' });
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await companyApi.create(formData);
      addNotification({ title: '成功', message: '公司创建成功', type: 'success' });
      setShowCreateModal(false);
      setFormData({ status: 'active' });
      fetchCompanies();
    } catch (error: any) {
      addNotification({ title: '失败', message: error.message || '创建公司失败', type: 'error' });
    }
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCompany) return;
    try {
      await companyApi.update(selectedCompany.id, formData);
      addNotification({ title: '成功', message: '公司更新成功', type: 'success' });
      setShowEditModal(false);
      setSelectedCompany(null);
      fetchCompanies();
    } catch (error: any) {
      addNotification({ title: '失败', message: error.message || '更新公司失败', type: 'error' });
    }
  };

  const handleInputChange = (field: string, value: string | number) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const getStatusBadge = (status: string) => {
    const colors: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
      active: 'default',
      inactive: 'secondary',
      archived: 'outline',
    };
    const labels: Record<string, string> = {
      active: '启用',
      inactive: '禁用',
      archived: '归档',
    };
    return <Badge variant={colors[status] || 'outline'}>{labels[status] || status}</Badge>;
  };

  const openDetailView = (company: Company) => {
    setCurrentCompany(company);
    setShowDetailView(true);
  };

  const closeDetailView = () => {
    setCurrentCompany(null);
    setShowDetailView(false);
    setTreeData([]);
  };

  return (
    <HrmLayout title='公司管理' subtitle='管理企业基本信息'>
      {showDetailView && currentCompany ? (
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center space-x-4 mb-6">
            <Button variant="ghost" onClick={closeDetailView} className="p-2">
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div>
              <h1 className="text-2xl font-bold text-slate-900">{currentCompany.name}</h1>
              <p className="text-sm text-slate-500">查看公司组织架构</p>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-1">
              <Card>
                <CardContent className="p-4">
                  <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                    <Folder className="w-5 h-5 text-amber-500" />
                    组织架构
                  </h3>
                  {loading ? (
                    <div className="p-8 text-center">
                      <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-blue-600 border-t-transparent"></div>
                      <p className="mt-2 text-gray-500">加载中...</p>
                    </div>
                  ) : treeData.length === 0 ? (
                    <div className="p-8 text-center text-slate-500">暂无部门和员工数据</div>
                  ) : (
                    <TreeView data={treeData} />
                  )}
                </CardContent>
              </Card>
            </div>

            <div className="lg:col-span-2">
              <div className="grid grid-cols-2 gap-4 mb-6">
                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-slate-500">部门数量</p>
                        <p className="text-2xl font-bold text-indigo-600">{departments.length}</p>
                      </div>
                      <div className="p-3 bg-indigo-100 rounded-full">
                        <Folder className="w-6 h-6 text-indigo-600" />
                      </div>
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-slate-500">员工数量</p>
                        <p className="text-2xl font-bold text-green-600">{employees.length}</p>
                      </div>
                      <div className="p-3 bg-green-100 rounded-full">
                        <Users className="w-6 h-6 text-green-600" />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              <Card>
                <CardContent className="p-4">
                  <h3 className="text-lg font-semibold mb-4">公司信息</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label className="text-sm text-slate-500">公司名称</Label>
                      <p className="font-medium">{currentCompany.name}</p>
                    </div>
                    <div>
                      <Label className="text-sm text-slate-500">简称</Label>
                      <p className="font-medium">{currentCompany.short_name || '-'}</p>
                    </div>
                    <div>
                      <Label className="text-sm text-slate-500">注册号</Label>
                      <p className="font-medium">{currentCompany.registration_number || '-'}</p>
                    </div>
                    <div>
                      <Label className="text-sm text-slate-500">税号</Label>
                      <p className="font-medium">{currentCompany.tax_number || '-'}</p>
                    </div>
                    <div>
                      <Label className="text-sm text-slate-500">联系电话</Label>
                      <p className="font-medium">{currentCompany.contact_phone || '-'}</p>
                    </div>
                    <div>
                      <Label className="text-sm text-slate-500">邮箱</Label>
                      <p className="font-medium">{currentCompany.email || '-'}</p>
                    </div>
                    <div className="col-span-2">
                      <Label className="text-sm text-slate-500">地址</Label>
                      <p className="font-medium">{currentCompany.address || '-'}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between mb-6">
            <div></div>
            <div className="flex items-center space-x-2">
              <Button onClick={handleAdd}>
                <Plus className="w-5 h-5 mr-2" />
                新增公司
              </Button>
            </div>
          </div>

          <Card className="mb-6">
            <CardContent className="p-4">
              <div className="flex flex-wrap gap-4">
                <div className="flex-1 min-w-[200px] relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <Input
                    type="text"
                    placeholder="搜索公司名称、编码或邮箱"
                    value={searchText}
                    onChange={(e) => setSearchText(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                    className="pl-10"
                  />
                </div>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-[140px]">
                    <SelectValue placeholder="全部状态" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">全部状态</SelectItem>
                    <SelectItem value="active">启用</SelectItem>
                    <SelectItem value="inactive">禁用</SelectItem>
                    <SelectItem value="archived">归档</SelectItem>
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

          {loading ? (
            <div className="p-8 text-center">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-blue-600 border-t-transparent"></div>
              <p className="mt-2 text-gray-500">加载中...</p>
            </div>
          ) : companies.length === 0 ? (
            <div className="p-16 text-center">
              <Building className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-500">暂无公司数据</p>
              <Button onClick={handleAdd} className="mt-4">
                <Plus className="w-5 h-5 mr-2" />
                新增公司
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {companies.map((company) => (
                <Card key={company.id} className="cursor-pointer hover:shadow-lg transition-shadow" onClick={() => openDetailView(company)}>
                  <CardContent className="p-5">
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
                          <Building className="w-6 h-6 text-blue-600" />
                        </div>
                        <div>
                          <h3 className="text-lg font-semibold text-slate-900">{company.name}</h3>
                          {company.short_name && (
                            <p className="text-sm text-slate-500">{company.short_name}</p>
                          )}
                        </div>
                      </div>
                      {getStatusBadge(company.status)}
                    </div>
                    <div className="space-y-2 text-sm text-slate-600">
                      {company.contact_phone && (
                        <div className="flex justify-between">
                          <span className="text-slate-500">电话:</span>
                          <span>{company.contact_phone}</span>
                        </div>
                      )}
                      {company.email && (
                        <div className="flex justify-between">
                          <span className="text-slate-500">邮箱:</span>
                          <span>{company.email}</span>
                        </div>
                      )}
                    </div>
                    <div className="flex justify-end space-x-2 mt-4 pt-4 border-t border-slate-100">
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button variant="ghost" size="sm" onClick={(e) => { e.stopPropagation(); handleView(company); }}>
                              <Eye className="w-4 h-4" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>查看</TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button variant="ghost" size="sm" onClick={(e) => { e.stopPropagation(); handleEdit(company); }}>
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
                              className="text-red-600 hover:text-red-700"
                              onClick={(e) => { e.stopPropagation(); handleDelete(company.id); }}
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>删除</TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      )}

      <Dialog open={showCreateModal} onOpenChange={setShowCreateModal}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>新增公司</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleCreate}>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="create-name">公司名称 *</Label>
                <Input
                  id="create-name"
                  type="text"
                  required
                  value={(formData as Company)?.name || ''}
                  onChange={(e) => handleInputChange('name', e.target.value)}
                  placeholder="请输入公司名称"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="create-short_name">公司简称</Label>
                <Input
                  id="create-short_name"
                  type="text"
                  value={(formData as Company)?.short_name || ''}
                  onChange={(e) => handleInputChange('short_name', e.target.value)}
                  placeholder="请输入公司简称"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="create-registration_number">注册号</Label>
                  <Input
                    id="create-registration_number"
                    type="text"
                    value={(formData as Company)?.registration_number || ''}
                    onChange={(e) => handleInputChange('registration_number', e.target.value)}
                    placeholder="请输入注册号"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="create-tax_number">税号</Label>
                  <Input
                    id="create-tax_number"
                    type="text"
                    value={(formData as Company)?.tax_number || ''}
                    onChange={(e) => handleInputChange('tax_number', e.target.value)}
                    placeholder="请输入税号"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="create-address">地址</Label>
                <Textarea
                  id="create-address"
                  value={(formData as Company)?.address || ''}
                  onChange={(e) => handleInputChange('address', e.target.value)}
                  rows={2}
                  placeholder="请输入地址"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="create-contact_phone">联系电话</Label>
                  <Input
                    id="create-contact_phone"
                    type="text"
                    value={(formData as Company)?.contact_phone || ''}
                    onChange={(e) => handleInputChange('contact_phone', e.target.value)}
                    placeholder="请输入联系电话"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="create-email">邮箱</Label>
                  <Input
                    id="create-email"
                    type="email"
                    value={(formData as Company)?.email || ''}
                    onChange={(e) => handleInputChange('email', e.target.value)}
                    placeholder="请输入邮箱"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="create-website">网站</Label>
                <Input
                  id="create-website"
                  type="text"
                  value={(formData as Company)?.website || ''}
                  onChange={(e) => handleInputChange('website', e.target.value)}
                  placeholder="请输入网站地址"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="create-status">状态</Label>
                <Select
                  value={(formData as Company)?.status || 'active'}
                  onValueChange={(value) => handleInputChange('status', value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="请选择" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">启用</SelectItem>
                    <SelectItem value="inactive">禁用</SelectItem>
                    <SelectItem value="archived">归档</SelectItem>
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
            <DialogTitle>编辑公司</DialogTitle>
          </DialogHeader>
          {selectedCompany && (
            <form onSubmit={handleUpdate}>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="edit-name">公司名称 *</Label>
                  <Input
                    id="edit-name"
                    type="text"
                    required
                    value={(formData as Company)?.name || ''}
                    onChange={(e) => handleInputChange('name', e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-short_name">公司简称</Label>
                  <Input
                    id="edit-short_name"
                    type="text"
                    value={(formData as Company)?.short_name || ''}
                    onChange={(e) => handleInputChange('short_name', e.target.value)}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="edit-registration_number">注册号</Label>
                    <Input
                      id="edit-registration_number"
                      type="text"
                      value={(formData as Company)?.registration_number || ''}
                      onChange={(e) => handleInputChange('registration_number', e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="edit-tax_number">税号</Label>
                    <Input
                      id="edit-tax_number"
                      type="text"
                      value={(formData as Company)?.tax_number || ''}
                      onChange={(e) => handleInputChange('tax_number', e.target.value)}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-address">地址</Label>
                  <Textarea
                    id="edit-address"
                    value={(formData as Company)?.address || ''}
                    onChange={(e) => handleInputChange('address', e.target.value)}
                    rows={2}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="edit-contact_phone">联系电话</Label>
                    <Input
                      id="edit-contact_phone"
                      type="text"
                      value={(formData as Company)?.contact_phone || ''}
                      onChange={(e) => handleInputChange('contact_phone', e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="edit-email">邮箱</Label>
                    <Input
                      id="edit-email"
                      type="email"
                      value={(formData as Company)?.email || ''}
                      onChange={(e) => handleInputChange('email', e.target.value)}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-website">网站</Label>
                  <Input
                    id="edit-website"
                    type="text"
                    value={(formData as Company)?.website || ''}
                    onChange={(e) => handleInputChange('website', e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-status">状态</Label>
                  <Select
                    value={(formData as Company)?.status || 'active'}
                    onValueChange={(value) => handleInputChange('status', value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="请选择" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="active">启用</SelectItem>
                      <SelectItem value="inactive">禁用</SelectItem>
                      <SelectItem value="archived">归档</SelectItem>
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
                    setSelectedCompany(null);
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
            <DialogTitle>公司详情</DialogTitle>
          </DialogHeader>
          {selectedCompany && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-sm text-gray-500">公司名称</Label>
                  <div className="font-medium mt-1">{selectedCompany.name}</div>
                </div>
                <div>
                  <Label className="text-sm text-gray-500">公司简称</Label>
                  <div className="font-medium mt-1">{selectedCompany.short_name || '-'}</div>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-sm text-gray-500">注册号</Label>
                  <div className="font-medium mt-1">{selectedCompany.registration_number || '-'}</div>
                </div>
                <div>
                  <Label className="text-sm text-gray-500">税号</Label>
                  <div className="font-medium mt-1">{selectedCompany.tax_number || '-'}</div>
                </div>
              </div>
              <div>
                <Label className="text-sm text-gray-500">地址</Label>
                <div className="font-medium mt-1">{selectedCompany.address || '-'}</div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-sm text-gray-500">联系电话</Label>
                  <div className="font-medium mt-1">{selectedCompany.contact_phone || '-'}</div>
                </div>
                <div>
                  <Label className="text-sm text-gray-500">邮箱</Label>
                  <div className="font-medium mt-1">{selectedCompany.email || '-'}</div>
                </div>
              </div>
              <div>
                <Label className="text-sm text-gray-500">网站</Label>
                <div className="font-medium mt-1">{selectedCompany.website || '-'}</div>
              </div>
              <div>
                <Label className="text-sm text-gray-500">状态</Label>
                <div className="mt-1">{getStatusBadge(selectedCompany.status)}</div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </HrmLayout>
  );
};

export default HrmCompanyPage;
