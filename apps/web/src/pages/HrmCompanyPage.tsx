import React, { useState, useEffect } from 'react';
import {
  Building,
  Search,
  Plus,
  Edit,
  Trash2,
  Eye,
  ArrowLeft,
  Users,
  Folder,
  Phone,
  Mail,
  MapPin,
  Globe,
  FileText,
} from 'lucide-react';
import {
  companyApi,
  departmentApi,
  employeeApi,
  type Company,
  type Department,
  type Employee,
  type PaginatedResult,
  type ListParams,
} from '../api/hrm';
import { useAppStore } from '../store';
import { HrmLayout } from '../components/HrmLayout';
import type { TreeNode } from '../components/TreeView';
import TreeView from '../components/TreeView';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from '@/components/ui/pagination';

const HrmCompanyPage: React.FC = () => {
  const addNotification = useAppStore((state) => state.addNotification);

  const [loading, setLoading] = useState(false);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [searchText, setSearchText] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [total, setTotal] = useState(0);

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
        const data = response.data as PaginatedResult<Company>;
        setCompanies(data.items || []);
        setTotal(data.total || 0);
      } else {
        setCompanies([]);
        setTotal(0);
      }
    } catch (error: any) {
      addNotification({ title: '加载失败', message: error.message || '获取公司列表失败', type: 'error' });
      setCompanies([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  };

  const fetchCompanyDetails = async (companyId: string) => {
    setLoading(true);
    try {
      const [deptResponse, empResponse] = await Promise.all([
        departmentApi.list({ company_id: companyId, page_size: 100 }),
        employeeApi.list({ page_size: 200 }),
      ]);

      const depts: Department[] =
        deptResponse.code === 200 && deptResponse.data
          ? (deptResponse.data as PaginatedResult<Department>).items || []
          : [];
      const emps: Employee[] =
        empResponse.code === 200 && empResponse.data ? (empResponse.data as PaginatedResult<Employee>).items || [] : [];

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

    depts.forEach((dept) => {
      deptMap.set(dept.id, {
        id: dept.id,
        name: dept.name,
        type: 'department' as const,
        children: [],
      });
    });

    depts.forEach((dept) => {
      const node = deptMap.get(dept.id)!;
      if (dept.parent_id && deptMap.has(dept.parent_id)) {
        deptMap.get(dept.parent_id)!.children!.push(node);
      } else {
        rootNodes.push(node);
      }
    });

    emps.forEach((emp) => {
      const empNode: TreeNode = {
        id: emp.id,
        name: emp.name,
        type: 'employee' as const,
        data: emp,
      };
      if (emp.department_id && deptMap.has(emp.department_id)) {
        deptMap.get(emp.department_id)!.children!.push(empNode);
      }
    });

    return rootNodes;
  };

  useEffect(() => {
    fetchCompanies({ page: currentPage, page_size: pageSize });
  }, [currentPage, pageSize]);

  useEffect(() => {
    if (currentCompany) {
      fetchCompanyDetails(currentCompany.id);
    }
  }, [currentCompany]);

  const handleSearch = () => {
    setCurrentPage(1);
    fetchCompanies({
      page: 1,
      page_size: pageSize,
      search: searchText || undefined,
      status: statusFilter === 'all' ? undefined : statusFilter || undefined,
    });
  };

  const handleReset = () => {
    setSearchText('');
    setStatusFilter('all');
    setCurrentPage(1);
    fetchCompanies({ page: 1, page_size: pageSize });
  };

  const handleAdd = () => {
    setSelectedCompany(null);
    setFormData({ status: 'active', organization_id: '00000000-0000-0000-0000-000000000001' });
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
        fetchCompanies({ page: currentPage, page_size: pageSize });
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
      fetchCompanies({ page: currentPage, page_size: pageSize });
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
      fetchCompanies({ page: currentPage, page_size: pageSize });
    } catch (error: any) {
      addNotification({ title: '失败', message: error.message || '更新公司失败', type: 'error' });
    }
  };

  const handleInputChange = (field: string, value: string | number) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const getStatusBadge = (status: string) => {
    const colors: Record<string, 'default' | 'secondary' | 'outline'> = {
      active: 'default',
      inactive: 'secondary',
      archived: 'outline',
    };
    const labels: Record<string, string> = {
      active: '启用',
      inactive: '禁用',
      archived: '归档',
    };
    return (
      <Badge variant={colors[status] || 'outline'} className='px-2 py-0.5 text-xs'>
        {labels[status] || status}
      </Badge>
    );
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

  const pages = Math.ceil(total / pageSize);

  return (
    <HrmLayout title='公司管理' subtitle='管理企业基本信息和组织架构' showSidebar={false}>
      {showDetailView && currentCompany ? (
        <div className='space-y-6'>
          <Card>
            <CardHeader className='flex flex-row items-center justify-between pb-2'>
              <div className='flex items-center gap-4'>
                <Button variant='ghost' onClick={closeDetailView} className='p-2 -ml-2'>
                  <ArrowLeft className='w-5 h-5' />
                </Button>
                <div>
                  <CardTitle className='text-2xl'>{currentCompany.name}</CardTitle>
                  {currentCompany.short_name && <CardDescription>{currentCompany.short_name}</CardDescription>}
                </div>
              </div>
              <div className='flex items-center gap-2'>
                {getStatusBadge(currentCompany.status)}
                <Button variant='outline' size='sm' onClick={() => handleEdit(currentCompany)}>
                  <Edit className='w-4 h-4 mr-2' />
                  编辑
                </Button>
              </div>
            </CardHeader>
            <CardContent className='pt-4'>
              <div className='grid grid-cols-1 lg:grid-cols-3 gap-6'>
                <div className='lg:col-span-1'>
                  <Card className='mb-4'>
                    <CardHeader className='pb-2'>
                      <CardTitle className='flex items-center gap-2 text-base'>
                        <Folder className='w-5 h-5 text-amber-500' />
                        组织架构
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      {loading ? (
                        <div className='p-8 text-center'>
                          <div className='inline-block animate-spin rounded-full h-8 w-8 border-4 border-blue-600 border-t-transparent'></div>
                          <p className='mt-2 text-gray-500 text-sm'>加载中...</p>
                        </div>
                      ) : treeData.length === 0 ? (
                        <div className='p-6 text-center text-slate-500 text-sm'>暂无部门和员工数据</div>
                      ) : (
                        <TreeView data={treeData} />
                      )}
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className='pb-2'>
                      <CardTitle className='flex items-center gap-2 text-base'>
                        <FileText className='w-5 h-5 text-slate-500' />
                        公司信息
                      </CardTitle>
                    </CardHeader>
                    <CardContent className='space-y-3'>
                      <div className='grid grid-cols-2 gap-4'>
                        <div>
                          <Label className='text-xs text-slate-500'>公司名称</Label>
                          <p className='font-medium text-sm mt-0.5'>{currentCompany.name}</p>
                        </div>
                        <div>
                          <Label className='text-xs text-slate-500'>简称</Label>
                          <p className='font-medium text-sm mt-0.5'>{currentCompany.short_name || '-'}</p>
                        </div>
                        <div>
                          <Label className='text-xs text-slate-500'>注册号</Label>
                          <p className='font-medium text-sm mt-0.5'>{currentCompany.registration_number || '-'}</p>
                        </div>
                        <div>
                          <Label className='text-xs text-slate-500'>税号</Label>
                          <p className='font-medium text-sm mt-0.5'>{currentCompany.tax_number || '-'}</p>
                        </div>
                      </div>
                      <div>
                        <Label className='text-xs text-slate-500'>地址</Label>
                        <p className='font-medium text-sm mt-0.5'>{currentCompany.address || '-'}</p>
                      </div>
                      <div className='flex items-center gap-4 text-sm'>
                        {currentCompany.contact_phone && (
                          <div className='flex items-center gap-1 text-slate-600'>
                            <Phone className='w-4 h-4' />
                            <span>{currentCompany.contact_phone}</span>
                          </div>
                        )}
                        {currentCompany.email && (
                          <div className='flex items-center gap-1 text-slate-600'>
                            <Mail className='w-4 h-4' />
                            <span>{currentCompany.email}</span>
                          </div>
                        )}
                        {currentCompany.website && (
                          <div className='flex items-center gap-1 text-slate-600'>
                            <Globe className='w-4 h-4' />
                            <span>{currentCompany.website}</span>
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                </div>

                <div className='lg:col-span-2'>
                  <div className='grid grid-cols-2 gap-4 mb-6'>
                    <Card className='bg-gradient-to-br from-indigo-50 to-indigo-100 border-indigo-200'>
                      <CardContent className='p-4'>
                        <div className='flex items-center justify-between'>
                          <div>
                            <p className='text-sm text-indigo-600'>部门数量</p>
                            <p className='text-2xl font-bold text-indigo-700'>{departments.length}</p>
                          </div>
                          <div className='p-3 bg-white/60 rounded-full shadow-sm'>
                            <Folder className='w-6 h-6 text-indigo-600' />
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                    <Card className='bg-gradient-to-br from-green-50 to-green-100 border-green-200'>
                      <CardContent className='p-4'>
                        <div className='flex items-center justify-between'>
                          <div>
                            <p className='text-sm text-green-600'>员工数量</p>
                            <p className='text-2xl font-bold text-green-700'>{employees.length}</p>
                          </div>
                          <div className='p-3 bg-white/60 rounded-full shadow-sm'>
                            <Users className='w-6 h-6 text-green-600' />
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </div>

                  <Card>
                    <CardHeader>
                      <CardTitle className='flex items-center gap-2'>
                        <Users className='w-5 h-5 text-blue-500' />
                        部门列表
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      {departments.length === 0 ? (
                        <div className='p-8 text-center text-slate-500'>
                          <Folder className='w-12 h-12 text-gray-400 mx-auto mb-3' />
                          <p>暂无部门数据</p>
                        </div>
                      ) : (
                        <div className='space-y-3'>
                          {departments.map((dept) => (
                            <div
                              key={dept.id}
                              className='flex items-center justify-between p-3 bg-slate-50 rounded-lg hover:bg-slate-100 transition-colors'
                            >
                              <div>
                                <p className='font-medium text-slate-900'>{dept.name}</p>
                                {dept.code && <p className='text-xs text-slate-500'>编码: {dept.code}</p>}
                              </div>
                              <Badge variant={dept.status === 'active' ? 'default' : 'secondary'} className='text-xs'>
                                {dept.status === 'active' ? '启用' : '禁用'}
                              </Badge>
                            </div>
                          ))}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      ) : (
        <div className='space-y-6'>
          <Card>
            <CardHeader className='flex flex-row items-center justify-between'>
              <div>
                <CardTitle className='text-lg'>公司列表</CardTitle>
                <CardDescription>共 {total} 家公司</CardDescription>
              </div>
              <Button onClick={handleAdd} className='gap-2'>
                <Plus className='w-4 h-4' />
                新增公司
              </Button>
            </CardHeader>
            <CardContent>
              <div className='flex flex-wrap gap-4 mb-6'>
                <div className='flex-1 min-w-[200px] relative'>
                  <Search className='absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400' />
                  <Input
                    type='text'
                    placeholder='搜索公司名称、编码或邮箱'
                    value={searchText}
                    onChange={(e) => setSearchText(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                    className='pl-9 h-10'
                  />
                </div>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className='w-[140px] h-10'>
                    <SelectValue placeholder='全部状态' />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value='all'>全部状态</SelectItem>
                    <SelectItem value='active'>启用</SelectItem>
                    <SelectItem value='inactive'>禁用</SelectItem>
                    <SelectItem value='archived'>归档</SelectItem>
                  </SelectContent>
                </Select>
                <Button variant='secondary' onClick={handleSearch} className='h-10'>
                  搜索
                </Button>
                <Button variant='outline' onClick={handleReset} className='h-10'>
                  重置
                </Button>
              </div>

              {loading ? (
                <div className='p-12 text-center'>
                  <div className='inline-block animate-spin rounded-full h-8 w-8 border-4 border-blue-600 border-t-transparent'></div>
                  <p className='mt-2 text-gray-500'>加载中...</p>
                </div>
              ) : companies.length === 0 ? (
                <div className='p-16 text-center'>
                  <Building className='w-16 h-16 text-gray-400 mx-auto mb-4' />
                  <p className='text-gray-500'>暂无公司数据</p>
                  <Button onClick={handleAdd} className='mt-4 gap-2'>
                    <Plus className='w-5 h-5' />
                    新增公司
                  </Button>
                </div>
              ) : (
                <>
                  <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6'>
                    {companies.map((company) => (
                      <Card
                        key={company.id}
                        className='cursor-pointer hover:shadow-lg transition-all duration-200 hover:-translate-y-1 group'
                        onClick={() => openDetailView(company)}
                      >
                        <CardContent className='p-5'>
                          <div className='flex items-start justify-between mb-4'>
                            <div className='flex items-center gap-3'>
                              <div className='w-12 h-12 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl flex items-center justify-center shadow-lg shadow-blue-200'>
                                <Building className='w-6 h-6 text-white' />
                              </div>
                              <div>
                                <h3 className='text-lg font-semibold text-slate-900'>{company.name}</h3>
                                {company.short_name && <p className='text-sm text-slate-500'>{company.short_name}</p>}
                              </div>
                            </div>
                            {getStatusBadge(company.status)}
                          </div>
                          <div className='space-y-2 text-sm text-slate-600'>
                            {company.contact_phone && (
                              <div className='flex items-center gap-2'>
                                <Phone className='w-3.5 h-3.5 text-slate-400' />
                                <span>{company.contact_phone}</span>
                              </div>
                            )}
                            {company.email && (
                              <div className='flex items-center gap-2'>
                                <Mail className='w-3.5 h-3.5 text-slate-400' />
                                <span className='truncate'>{company.email}</span>
                              </div>
                            )}
                            {company.address && (
                              <div className='flex items-start gap-2'>
                                <MapPin className='w-3.5 h-3.5 text-slate-400 mt-0.5' />
                                <span className='truncate'>{company.address}</span>
                              </div>
                            )}
                          </div>
                          <div className='flex justify-end space-x-2 mt-4 pt-4 border-t border-slate-100 opacity-0 group-hover:opacity-100 transition-opacity'>
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button
                                    variant='ghost'
                                    size='sm'
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleView(company);
                                    }}
                                  >
                                    <Eye className='w-4 h-4' />
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>查看</TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button
                                    variant='ghost'
                                    size='sm'
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleEdit(company);
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
                                    className='text-red-600 hover:text-red-700'
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleDelete(company.id);
                                    }}
                                  >
                                    <Trash2 className='w-4 h-4' />
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

                  {pages > 1 && (
                    <div className='flex items-center justify-between pt-4 border-t border-slate-100'>
                      <div className='flex items-center gap-4'>
                        <span className='text-sm text-slate-600'>每页显示</span>
                        <Select
                          value={String(pageSize)}
                          onValueChange={(v) => {
                            setPageSize(Number(v));
                            setCurrentPage(1);
                          }}
                        >
                          <SelectTrigger className='w-[80px] h-8'>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value='10'>10</SelectItem>
                            <SelectItem value='20'>20</SelectItem>
                            <SelectItem value='50'>50</SelectItem>
                          </SelectContent>
                        </Select>
                        <span className='text-sm text-slate-600'>条</span>
                      </div>
                      <Pagination>
                        <PaginationContent>
                          <PaginationItem>
                            <PaginationPrevious
                              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                              className={currentPage === 1 ? 'opacity-50 cursor-not-allowed' : ''}
                            />
                          </PaginationItem>
                          {Array.from({ length: pages }, (_, i) => i + 1).map((page) => (
                            <PaginationItem key={page} className={currentPage === page ? 'bg-blue-600 text-white' : ''}>
                              <PaginationLink onClick={() => setCurrentPage(page)}>{page}</PaginationLink>
                            </PaginationItem>
                          ))}
                          <PaginationItem>
                            <PaginationNext
                              onClick={() => setCurrentPage((p) => Math.min(pages, p + 1))}
                              className={currentPage === pages ? 'opacity-50 cursor-not-allowed' : ''}
                            />
                          </PaginationItem>
                        </PaginationContent>
                      </Pagination>
                    </div>
                  )}
                </>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      <Dialog open={showCreateModal} onOpenChange={setShowCreateModal}>
        <DialogContent className='max-w-lg max-h-[90vh] overflow-y-auto'>
          <DialogHeader>
            <DialogTitle className='text-lg'>新增公司</DialogTitle>
            <DialogDescription>请填写公司信息</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleCreate} className='space-y-4 mt-4'>
            <div className='space-y-2'>
              <Label htmlFor='create-name' className='text-sm font-medium'>
                公司名称 <span className='text-red-500'>*</span>
              </Label>
              <Input
                id='create-name'
                type='text'
                required
                value={(formData as Company)?.name || ''}
                onChange={(e) => handleInputChange('name', e.target.value)}
                placeholder='请输入公司名称'
                className='h-10'
              />
            </div>
            <div className='space-y-2'>
              <Label htmlFor='create-short_name' className='text-sm font-medium'>
                公司简称
              </Label>
              <Input
                id='create-short_name'
                type='text'
                value={(formData as Company)?.short_name || ''}
                onChange={(e) => handleInputChange('short_name', e.target.value)}
                placeholder='请输入公司简称'
                className='h-10'
              />
            </div>
            <div className='grid grid-cols-2 gap-4'>
              <div className='space-y-2'>
                <Label htmlFor='create-registration_number' className='text-sm font-medium'>
                  注册号
                </Label>
                <Input
                  id='create-registration_number'
                  type='text'
                  value={(formData as Company)?.registration_number || ''}
                  onChange={(e) => handleInputChange('registration_number', e.target.value)}
                  placeholder='请输入注册号'
                  className='h-10'
                />
              </div>
              <div className='space-y-2'>
                <Label htmlFor='create-tax_number' className='text-sm font-medium'>
                  税号
                </Label>
                <Input
                  id='create-tax_number'
                  type='text'
                  value={(formData as Company)?.tax_number || ''}
                  onChange={(e) => handleInputChange('tax_number', e.target.value)}
                  placeholder='请输入税号'
                  className='h-10'
                />
              </div>
            </div>
            <div className='space-y-2'>
              <Label htmlFor='create-address' className='text-sm font-medium'>
                地址
              </Label>
              <Textarea
                id='create-address'
                value={(formData as Company)?.address || ''}
                onChange={(e) => handleInputChange('address', e.target.value)}
                rows={2}
                placeholder='请输入地址'
              />
            </div>
            <div className='grid grid-cols-2 gap-4'>
              <div className='space-y-2'>
                <Label htmlFor='create-contact_phone' className='text-sm font-medium'>
                  联系电话
                </Label>
                <Input
                  id='create-contact_phone'
                  type='text'
                  value={(formData as Company)?.contact_phone || ''}
                  onChange={(e) => handleInputChange('contact_phone', e.target.value)}
                  placeholder='请输入联系电话'
                  className='h-10'
                />
              </div>
              <div className='space-y-2'>
                <Label htmlFor='create-email' className='text-sm font-medium'>
                  邮箱
                </Label>
                <Input
                  id='create-email'
                  type='email'
                  value={(formData as Company)?.email || ''}
                  onChange={(e) => handleInputChange('email', e.target.value)}
                  placeholder='请输入邮箱'
                  className='h-10'
                />
              </div>
            </div>
            <div className='space-y-2'>
              <Label htmlFor='create-website' className='text-sm font-medium'>
                网站
              </Label>
              <Input
                id='create-website'
                type='text'
                value={(formData as Company)?.website || ''}
                onChange={(e) => handleInputChange('website', e.target.value)}
                placeholder='请输入网站地址'
                className='h-10'
              />
            </div>
            <div className='space-y-2'>
              <Label htmlFor='create-status' className='text-sm font-medium'>
                状态
              </Label>
              <Select
                value={(formData as Company)?.status || 'active'}
                onValueChange={(value) => handleInputChange('status', value)}
              >
                <SelectTrigger className='h-10'>
                  <SelectValue placeholder='请选择' />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value='active'>启用</SelectItem>
                  <SelectItem value='inactive'>禁用</SelectItem>
                  <SelectItem value='archived'>归档</SelectItem>
                </SelectContent>
              </Select>
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
        <DialogContent className='max-w-lg max-h-[90vh] overflow-y-auto'>
          <DialogHeader>
            <DialogTitle className='text-lg'>编辑公司</DialogTitle>
            <DialogDescription>修改公司信息</DialogDescription>
          </DialogHeader>
          {selectedCompany && (
            <form onSubmit={handleUpdate} className='space-y-4 mt-4'>
              <div className='space-y-2'>
                <Label htmlFor='edit-name' className='text-sm font-medium'>
                  公司名称 <span className='text-red-500'>*</span>
                </Label>
                <Input
                  id='edit-name'
                  type='text'
                  required
                  value={(formData as Company)?.name || ''}
                  onChange={(e) => handleInputChange('name', e.target.value)}
                  className='h-10'
                />
              </div>
              <div className='space-y-2'>
                <Label htmlFor='edit-short_name' className='text-sm font-medium'>
                  公司简称
                </Label>
                <Input
                  id='edit-short_name'
                  type='text'
                  value={(formData as Company)?.short_name || ''}
                  onChange={(e) => handleInputChange('short_name', e.target.value)}
                  className='h-10'
                />
              </div>
              <div className='grid grid-cols-2 gap-4'>
                <div className='space-y-2'>
                  <Label htmlFor='edit-registration_number' className='text-sm font-medium'>
                    注册号
                  </Label>
                  <Input
                    id='edit-registration_number'
                    type='text'
                    value={(formData as Company)?.registration_number || ''}
                    onChange={(e) => handleInputChange('registration_number', e.target.value)}
                    className='h-10'
                  />
                </div>
                <div className='space-y-2'>
                  <Label htmlFor='edit-tax_number' className='text-sm font-medium'>
                    税号
                  </Label>
                  <Input
                    id='edit-tax_number'
                    type='text'
                    value={(formData as Company)?.tax_number || ''}
                    onChange={(e) => handleInputChange('tax_number', e.target.value)}
                    className='h-10'
                  />
                </div>
              </div>
              <div className='space-y-2'>
                <Label htmlFor='edit-address' className='text-sm font-medium'>
                  地址
                </Label>
                <Textarea
                  id='edit-address'
                  value={(formData as Company)?.address || ''}
                  onChange={(e) => handleInputChange('address', e.target.value)}
                  rows={2}
                />
              </div>
              <div className='grid grid-cols-2 gap-4'>
                <div className='space-y-2'>
                  <Label htmlFor='edit-contact_phone' className='text-sm font-medium'>
                    联系电话
                  </Label>
                  <Input
                    id='edit-contact_phone'
                    type='text'
                    value={(formData as Company)?.contact_phone || ''}
                    onChange={(e) => handleInputChange('contact_phone', e.target.value)}
                    className='h-10'
                  />
                </div>
                <div className='space-y-2'>
                  <Label htmlFor='edit-email' className='text-sm font-medium'>
                    邮箱
                  </Label>
                  <Input
                    id='edit-email'
                    type='email'
                    value={(formData as Company)?.email || ''}
                    onChange={(e) => handleInputChange('email', e.target.value)}
                    className='h-10'
                  />
                </div>
              </div>
              <div className='space-y-2'>
                <Label htmlFor='edit-website' className='text-sm font-medium'>
                  网站
                </Label>
                <Input
                  id='edit-website'
                  type='text'
                  value={(formData as Company)?.website || ''}
                  onChange={(e) => handleInputChange('website', e.target.value)}
                  className='h-10'
                />
              </div>
              <div className='space-y-2'>
                <Label htmlFor='edit-status' className='text-sm font-medium'>
                  状态
                </Label>
                <Select
                  value={(formData as Company)?.status || 'active'}
                  onValueChange={(value) => handleInputChange('status', value)}
                >
                  <SelectTrigger className='h-10'>
                    <SelectValue placeholder='请选择' />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value='active'>启用</SelectItem>
                    <SelectItem value='inactive'>禁用</SelectItem>
                    <SelectItem value='archived'>归档</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <DialogFooter className='mt-6'>
                <Button
                  type='button'
                  variant='secondary'
                  onClick={() => {
                    setShowEditModal(false);
                    setSelectedCompany(null);
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

      <Dialog open={showViewModal} onOpenChange={setShowViewModal}>
        <DialogContent className='max-w-lg max-h-[90vh] overflow-y-auto'>
          <DialogHeader>
            <DialogTitle className='text-lg'>公司详情</DialogTitle>
            <DialogDescription>查看公司详细信息</DialogDescription>
          </DialogHeader>
          {selectedCompany && (
            <div className='space-y-4 mt-4'>
              <div className='grid grid-cols-2 gap-4'>
                <div>
                  <Label className='text-sm text-gray-500'>公司名称</Label>
                  <div className='font-medium mt-1 text-slate-900'>{selectedCompany.name}</div>
                </div>
                <div>
                  <Label className='text-sm text-gray-500'>公司简称</Label>
                  <div className='font-medium mt-1 text-slate-900'>{selectedCompany.short_name || '-'}</div>
                </div>
              </div>
              <div className='grid grid-cols-2 gap-4'>
                <div>
                  <Label className='text-sm text-gray-500'>注册号</Label>
                  <div className='font-medium mt-1 text-slate-900'>{selectedCompany.registration_number || '-'}</div>
                </div>
                <div>
                  <Label className='text-sm text-gray-500'>税号</Label>
                  <div className='font-medium mt-1 text-slate-900'>{selectedCompany.tax_number || '-'}</div>
                </div>
              </div>
              <div>
                <Label className='text-sm text-gray-500'>地址</Label>
                <div className='font-medium mt-1 text-slate-900'>{selectedCompany.address || '-'}</div>
              </div>
              <div className='grid grid-cols-2 gap-4'>
                <div>
                  <Label className='text-sm text-gray-500'>联系电话</Label>
                  <div className='font-medium mt-1 text-slate-900'>{selectedCompany.contact_phone || '-'}</div>
                </div>
                <div>
                  <Label className='text-sm text-gray-500'>邮箱</Label>
                  <div className='font-medium mt-1 text-slate-900'>{selectedCompany.email || '-'}</div>
                </div>
              </div>
              <div>
                <Label className='text-sm text-gray-500'>网站</Label>
                <div className='font-medium mt-1 text-slate-900'>{selectedCompany.website || '-'}</div>
              </div>
              <div>
                <Label className='text-sm text-gray-500'>状态</Label>
                <div className='mt-1'>{getStatusBadge(selectedCompany.status)}</div>
              </div>
            </div>
          )}
          <DialogFooter className='mt-6'>
            <Button type='button' variant='secondary' onClick={() => setShowViewModal(false)}>
              关闭
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </HrmLayout>
  );
};

export default HrmCompanyPage;
