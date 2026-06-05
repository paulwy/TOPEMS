import React, { useState, useEffect, useMemo } from 'react';
import { Building, Search, Plus, Edit, Trash2, Eye } from 'lucide-react';
import { companyApi, type Company, type PaginatedResult, type ListParams } from '../api/hrm';
import { useAppStore } from '../store';
import { ColumnDef } from '@tanstack/react-table';
import { DataTable } from '../components/DataTable';
import { HrmLayout } from '../components/HrmLayout';

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

const HrmCompanyPage: React.FC = () => {
  const addNotification = useAppStore((state) => state.addNotification);

  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<PaginatedResult<Company>>({ items: [], total: 0, page: 1, page_size: 10 });
  const [searchText, setSearchText] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const [selectedCompany, setSelectedCompany] = useState<Company | null>(null);

  const [formData, setFormData] = useState<Partial<Company>>({});

  const fetchCompanies = async (params?: ListParams) => {
    setLoading(true);
    try {
      const response = await companyApi.list(params);
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
      addNotification({ title: '加载失败', message: error.message || '获取公司列表失败', type: 'error' });
      setData({ items: [], total: 0, page: 1, page_size: 10 });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCompanies();
  }, []);

  const handleSearch = () => {
    fetchCompanies({
      page: 1,
      search: searchText || undefined,
      status: statusFilter || undefined,
    });
  };

  const handleReset = () => {
    setSearchText('');
    setStatusFilter('');
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

  const columns = useMemo<ColumnDef<Company>[]>(
    () => [
      {
        accessorKey: 'name',
        header: '公司名称',
        cell: ({ row }) => {
          return (
            <div className='flex items-center space-x-3'>
              <div className='w-10 h-10 bg-blue-100 dark:bg-blue-900 rounded-lg flex items-center justify-center'>
                <Building className='w-5 h-5 text-blue-600 dark:text-blue-400' />
              </div>
              <div>
                <div className='font-medium text-gray-900 dark:text-gray-100'>{row.original.name}</div>
                {row.original.short_name && (
                  <div className='text-sm text-gray-500 dark:text-gray-400'>{row.original.short_name}</div>
                )}
              </div>
            </div>
          );
        },
      },
      {
        accessorKey: 'email',
        header: '邮箱',
        cell: ({ row }) => (
          <span className='text-sm text-gray-900 dark:text-gray-100'>{row.original.email || '-'}</span>
        ),
      },
      {
        accessorKey: 'contact_phone',
        header: '联系电话',
        cell: ({ row }) => (
          <span className='text-sm text-gray-900 dark:text-gray-100'>{row.original.contact_phone || '-'}</span>
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
          const company = row.original;
          return (
            <div className='flex items-center justify-end space-x-2'>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button variant='ghost' size='sm' onClick={() => handleView(company)}>
                      <Eye className='w-4 h-4' />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>查看</TooltipContent>
                </Tooltip>
              </TooltipProvider>

              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button variant='ghost' size='sm' onClick={() => handleEdit(company)}>
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
                      onClick={() => handleDelete(company.id)}
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
    <HrmLayout title='公司管理' subtitle='管理企业基本信息'>
      <div className='bg-white rounded-lg shadow p-6'>
        <div className='flex items-center justify-between mb-6'>
          <div></div>
          <div className='flex items-center space-x-2'>
            <ModeToggle />
            <Button onClick={handleAdd}>
              <Plus className='w-5 h-5 mr-2' />
              新增公司
            </Button>
          </div>
        </div>

        <div className='space-y-6'>
          <Card className='mb-6'>
            <CardContent className='p-4'>
              <div className='flex flex-wrap gap-4'>
                <div className='flex-1 min-w-[200px] relative'>
                  <Search className='absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400' />
                  <Input
                    type='text'
                    placeholder='搜索公司名称、编码或邮箱'
                    value={searchText}
                    onChange={(e) => setSearchText(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                    className='pl-10'
                  />
                </div>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className='w-[140px]'>
                    <SelectValue placeholder='全部状态' />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value=''>全部状态</SelectItem>
                    <SelectItem value='active'>启用</SelectItem>
                    <SelectItem value='inactive'>禁用</SelectItem>
                    <SelectItem value='archived'>归档</SelectItem>
                  </SelectContent>
                </Select>
                <Button variant='secondary' onClick={handleSearch}>
                  搜索
                </Button>
                <Button variant='outline' onClick={handleReset}>
                  重置
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className='p-0'>
              {loading ? (
                <div className='p-8 text-center'>
                  <div className='inline-block animate-spin rounded-full h-8 w-8 border-4 border-blue-600 border-t-transparent'></div>
                  <p className='mt-2 text-gray-500 dark:text-gray-400'>加载中...</p>
                </div>
              ) : data.items.length === 0 ? (
                <div className='p-8 text-center'>
                  <Building className='w-12 h-12 text-gray-400 mx-auto mb-3' />
                  <p className='text-gray-500 dark:text-gray-400'>暂无公司数据</p>
                </div>
              ) : (
                <DataTable
                  columns={columns}
                  data={data.items}
                  enablePagination={true}
                  pageCount={Math.ceil(data.total / data.page_size)}
                  onPageChange={(page) => fetchCompanies({ page })}
                  currentPage={data.page}
                />
              )}
            </CardContent>
          </Card>
        </div>

        <Dialog open={showCreateModal} onOpenChange={setShowCreateModal}>
          <DialogContent className='max-w-lg'>
            <DialogHeader>
              <DialogTitle>新增公司</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleCreate}>
              <div className='space-y-4'>
                <div className='space-y-2'>
                  <Label htmlFor='create-name'>公司名称 *</Label>
                  <Input
                    id='create-name'
                    type='text'
                    required
                    value={(formData as Company)?.name || ''}
                    onChange={(e) => handleInputChange('name', e.target.value)}
                    placeholder='请输入公司名称'
                  />
                </div>
                <div className='space-y-2'>
                  <Label htmlFor='create-short_name'>公司简称</Label>
                  <Input
                    id='create-short_name'
                    type='text'
                    value={(formData as Company)?.short_name || ''}
                    onChange={(e) => handleInputChange('short_name', e.target.value)}
                    placeholder='请输入公司简称'
                  />
                </div>
                <div className='grid grid-cols-2 gap-4'>
                  <div className='space-y-2'>
                    <Label htmlFor='create-registration_number'>注册号</Label>
                    <Input
                      id='create-registration_number'
                      type='text'
                      value={(formData as Company)?.registration_number || ''}
                      onChange={(e) => handleInputChange('registration_number', e.target.value)}
                      placeholder='请输入注册号'
                    />
                  </div>
                  <div className='space-y-2'>
                    <Label htmlFor='create-tax_number'>税号</Label>
                    <Input
                      id='create-tax_number'
                      type='text'
                      value={(formData as Company)?.tax_number || ''}
                      onChange={(e) => handleInputChange('tax_number', e.target.value)}
                      placeholder='请输入税号'
                    />
                  </div>
                </div>
                <div className='space-y-2'>
                  <Label htmlFor='create-address'>地址</Label>
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
                    <Label htmlFor='create-contact_phone'>联系电话</Label>
                    <Input
                      id='create-contact_phone'
                      type='text'
                      value={(formData as Company)?.contact_phone || ''}
                      onChange={(e) => handleInputChange('contact_phone', e.target.value)}
                      placeholder='请输入联系电话'
                    />
                  </div>
                  <div className='space-y-2'>
                    <Label htmlFor='create-email'>邮箱</Label>
                    <Input
                      id='create-email'
                      type='email'
                      value={(formData as Company)?.email || ''}
                      onChange={(e) => handleInputChange('email', e.target.value)}
                      placeholder='请输入邮箱'
                    />
                  </div>
                </div>
                <div className='space-y-2'>
                  <Label htmlFor='create-website'>网站</Label>
                  <Input
                    id='create-website'
                    type='text'
                    value={(formData as Company)?.website || ''}
                    onChange={(e) => handleInputChange('website', e.target.value)}
                    placeholder='请输入网站地址'
                  />
                </div>
                <div className='space-y-2'>
                  <Label htmlFor='create-status'>状态</Label>
                  <Select
                    value={(formData as Company)?.status || 'active'}
                    onValueChange={(value) => handleInputChange('status', value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder='请选择' />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value='active'>启用</SelectItem>
                      <SelectItem value='inactive'>禁用</SelectItem>
                      <SelectItem value='archived'>归档</SelectItem>
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
          <DialogContent className='max-w-lg'>
            <DialogHeader>
              <DialogTitle>编辑公司</DialogTitle>
            </DialogHeader>
            {selectedCompany && (
              <form onSubmit={handleUpdate}>
                <div className='space-y-4'>
                  <div className='space-y-2'>
                    <Label htmlFor='edit-name'>公司名称 *</Label>
                    <Input
                      id='edit-name'
                      type='text'
                      required
                      value={(formData as Company)?.name || ''}
                      onChange={(e) => handleInputChange('name', e.target.value)}
                    />
                  </div>
                  <div className='space-y-2'>
                    <Label htmlFor='edit-short_name'>公司简称</Label>
                    <Input
                      id='edit-short_name'
                      type='text'
                      value={(formData as Company)?.short_name || ''}
                      onChange={(e) => handleInputChange('short_name', e.target.value)}
                    />
                  </div>
                  <div className='grid grid-cols-2 gap-4'>
                    <div className='space-y-2'>
                      <Label htmlFor='edit-registration_number'>注册号</Label>
                      <Input
                        id='edit-registration_number'
                        type='text'
                        value={(formData as Company)?.registration_number || ''}
                        onChange={(e) => handleInputChange('registration_number', e.target.value)}
                      />
                    </div>
                    <div className='space-y-2'>
                      <Label htmlFor='edit-tax_number'>税号</Label>
                      <Input
                        id='edit-tax_number'
                        type='text'
                        value={(formData as Company)?.tax_number || ''}
                        onChange={(e) => handleInputChange('tax_number', e.target.value)}
                      />
                    </div>
                  </div>
                  <div className='space-y-2'>
                    <Label htmlFor='edit-address'>地址</Label>
                    <Textarea
                      id='edit-address'
                      value={(formData as Company)?.address || ''}
                      onChange={(e) => handleInputChange('address', e.target.value)}
                      rows={2}
                    />
                  </div>
                  <div className='grid grid-cols-2 gap-4'>
                    <div className='space-y-2'>
                      <Label htmlFor='edit-contact_phone'>联系电话</Label>
                      <Input
                        id='edit-contact_phone'
                        type='text'
                        value={(formData as Company)?.contact_phone || ''}
                        onChange={(e) => handleInputChange('contact_phone', e.target.value)}
                      />
                    </div>
                    <div className='space-y-2'>
                      <Label htmlFor='edit-email'>邮箱</Label>
                      <Input
                        id='edit-email'
                        type='email'
                        value={(formData as Company)?.email || ''}
                        onChange={(e) => handleInputChange('email', e.target.value)}
                      />
                    </div>
                  </div>
                  <div className='space-y-2'>
                    <Label htmlFor='edit-website'>网站</Label>
                    <Input
                      id='edit-website'
                      type='text'
                      value={(formData as Company)?.website || ''}
                      onChange={(e) => handleInputChange('website', e.target.value)}
                    />
                  </div>
                  <div className='space-y-2'>
                    <Label htmlFor='edit-status'>状态</Label>
                    <Select
                      value={(formData as Company)?.status || 'active'}
                      onValueChange={(value) => handleInputChange('status', value)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder='请选择' />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value='active'>启用</SelectItem>
                        <SelectItem value='inactive'>禁用</SelectItem>
                        <SelectItem value='archived'>归档</SelectItem>
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
          <DialogContent className='max-w-lg'>
            <DialogHeader>
              <DialogTitle>公司详情</DialogTitle>
            </DialogHeader>
            {selectedCompany && (
              <div className='space-y-4'>
                <div className='grid grid-cols-2 gap-4'>
                  <div>
                    <Label className='text-sm text-gray-500'>公司名称</Label>
                    <div className='font-medium mt-1'>{selectedCompany.name}</div>
                  </div>
                  <div>
                    <Label className='text-sm text-gray-500'>公司简称</Label>
                    <div className='font-medium mt-1'>{selectedCompany.short_name || '-'}</div>
                  </div>
                </div>
                <div className='grid grid-cols-2 gap-4'>
                  <div>
                    <Label className='text-sm text-gray-500'>注册号</Label>
                    <div className='font-medium mt-1'>{selectedCompany.registration_number || '-'}</div>
                  </div>
                  <div>
                    <Label className='text-sm text-gray-500'>税号</Label>
                    <div className='font-medium mt-1'>{selectedCompany.tax_number || '-'}</div>
                  </div>
                </div>
                <div>
                  <Label className='text-sm text-gray-500'>地址</Label>
                  <div className='font-medium mt-1'>{selectedCompany.address || '-'}</div>
                </div>
                <div className='grid grid-cols-2 gap-4'>
                  <div>
                    <Label className='text-sm text-gray-500'>联系电话</Label>
                    <div className='font-medium mt-1'>{selectedCompany.contact_phone || '-'}</div>
                  </div>
                  <div>
                    <Label className='text-sm text-gray-500'>邮箱</Label>
                    <div className='font-medium mt-1'>{selectedCompany.email || '-'}</div>
                  </div>
                </div>
                <div>
                  <Label className='text-sm text-gray-500'>网站</Label>
                  <div className='font-medium mt-1'>{selectedCompany.website || '-'}</div>
                </div>
                <div>
                  <Label className='text-sm text-gray-500'>状态</Label>
                  <div className='mt-1'>{getStatusBadge(selectedCompany.status)}</div>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </HrmLayout>
  );
};

export default HrmCompanyPage;
