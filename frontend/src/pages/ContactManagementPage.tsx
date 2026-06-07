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
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { crmApi, Contact, CreateContactRequest, UpdateContactRequest } from '@/api/crm';
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

const ContactManagementPage: React.FC = () => {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [total, setTotal] = useState(0);
  const [showDialog, setShowDialog] = useState(false);
  const [showDetailDialog, setShowDetailDialog] = useState(false);
  const [selectedContact, setSelectedContact] = useState<Contact | null>(null);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [formData, setFormData] = useState<CreateContactRequest>({
    first_name: '',
    last_name: '',
    email: '',
    phone: '',
    position: '',
    notes: '',
  });

  const { addNotification } = useAppStore();

  useEffect(() => {
    loadContacts();
  }, [currentPage, pageSize, searchTerm, statusFilter]);

  const loadContacts = async () => {
    try {
      setLoading(true);
      const params: any = {
        page: currentPage,
        pageSize,
      };
      if (searchTerm) params.search = searchTerm;
      if (statusFilter !== 'all') params.status = statusFilter;

      const response = await crmApi.contacts.list(params);
      if (response.success && response.data) {
        setContacts(response.data.items || []);
        setTotal(response.data.total || 0);
      }
    } catch (error) {
      console.error('加载联系人列表失败:', error);
      addNotification({
        type: 'error',
        title: '加载失败',
        message: '无法加载联系人列表',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (selectedContact) {
        await crmApi.contacts.update(selectedContact.id, formData as UpdateContactRequest);
        addNotification({
          type: 'success',
          title: '更新成功',
          message: '联系人信息已更新',
        });
      } else {
        await crmApi.contacts.create(formData);
        addNotification({
          type: 'success',
          title: '创建成功',
          message: '新联系人已创建',
        });
      }
      setShowDialog(false);
      resetForm();
      loadContacts();
    } catch (error) {
      console.error('操作失败:', error);
      addNotification({
        type: 'error',
        title: '操作失败',
        message: selectedContact ? '更新联系人失败' : '创建联系人失败',
      });
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('确定要删除这个联系人吗?')) return;
    try {
      await crmApi.contacts.delete(id);
      addNotification({
        type: 'success',
        title: '删除成功',
        message: '联系人已删除',
      });
      loadContacts();
    } catch (error) {
      console.error('删除失败:', error);
      addNotification({
        type: 'error',
        title: '删除失败',
        message: '无法删除联系人',
      });
    }
  };

  const handleBatchDelete = async () => {
    if (selectedIds.length === 0) return;
    if (!window.confirm(`确定要删除选中的 ${selectedIds.length} 个联系人吗?`)) return;
    try {
      await crmApi.contacts.batchDelete(selectedIds);
      addNotification({
        type: 'success',
        title: '删除成功',
        message: `已删除 ${selectedIds.length} 个联系人`,
      });
      setSelectedIds([]);
      loadContacts();
    } catch (error) {
      console.error('批量删除失败:', error);
      addNotification({
        type: 'error',
        title: '删除失败',
        message: '批量删除失败',
      });
    }
  };

  const handleEdit = (contact: Contact) => {
    setSelectedContact(contact);
    setFormData({
      customer_id: contact.customer_id,
      first_name: contact.first_name,
      last_name: contact.last_name || '',
      email: contact.email || '',
      phone: contact.phone || '',
      position: contact.position || '',
      notes: contact.notes || '',
    });
    setShowDialog(true);
  };

  const handleViewDetail = (contact: Contact) => {
    setSelectedContact(contact);
    setShowDetailDialog(true);
  };

  const resetForm = () => {
    setSelectedContact(null);
    setFormData({
      first_name: '',
      last_name: '',
      email: '',
      phone: '',
      position: '',
      notes: '',
    });
  };

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => (prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]));
  };

  const toggleSelectAll = () => {
    if (selectedIds.length === contacts.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(contacts.map((c) => c.id));
    }
  };

  const getStatusBadge = (status: string) => {
    const statusMap: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
      active: { label: '活跃', variant: 'default' },
      inactive: { label: '非活跃', variant: 'secondary' },
    };
    const s = statusMap[status] || { label: status, variant: 'outline' };
    return <Badge variant={s.variant}>{s.label}</Badge>;
  };

  if (loading) return <LoadingSpinner />;

  return (
    <div className='space-y-6'>
      <Card>
        <CardHeader>
          <CardTitle>联系人管理</CardTitle>
          <CardDescription>管理联系人信息,包括姓名、联系方式、职位等</CardDescription>
        </CardHeader>
        <CardContent>
          <div className='flex flex-col sm:flex-row gap-4 mb-6'>
            <div className='flex-1'>
              <div className='relative'>
                <Search className='absolute left-2 top-2.5 h-4 w-4 text-muted-foreground' />
                <Input
                  placeholder='搜索联系人姓名或邮箱...'
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className='pl-8'
                />
              </div>
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className='w-[150px]'>
                <SelectValue placeholder='状态筛选' />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value='all'>全部状态</SelectItem>
                <SelectItem value='active'>活跃</SelectItem>
                <SelectItem value='inactive'>非活跃</SelectItem>
              </SelectContent>
            </Select>
            <Button
              onClick={() => {
                resetForm();
                setShowDialog(true);
              }}
            >
              <Plus className='mr-2 h-4 w-4' />
              新增联系人
            </Button>
          </div>

          {selectedIds.length > 0 && (
            <div className='mb-4 p-3 bg-muted rounded-lg flex items-center justify-between'>
              <span className='text-sm'>已选择 {selectedIds.length} 个联系人</span>
              <Button variant='destructive' size='sm' onClick={handleBatchDelete}>
                <Trash2 className='mr-2 h-4 w-4' />
                批量删除
              </Button>
            </div>
          )}

          <div className='rounded-md border'>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className='w-[50px]'>
                    <Checkbox
                      checked={selectedIds.length === contacts.length && contacts.length > 0}
                      onCheckedChange={toggleSelectAll}
                    />
                  </TableHead>
                  <TableHead>姓名</TableHead>
                  <TableHead>邮箱</TableHead>
                  <TableHead>电话</TableHead>
                  <TableHead>职位</TableHead>
                  <TableHead>状态</TableHead>
                  <TableHead className='text-right'>操作</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {contacts.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className='text-center'>
                      <EmptyState title='暂无联系人数据' description='点击上方按钮添加第一个联系人' />
                    </TableCell>
                  </TableRow>
                ) : (
                  contacts.map((contact) => (
                    <TableRow key={contact.id}>
                      <TableCell>
                        <Checkbox
                          checked={selectedIds.includes(contact.id)}
                          onCheckedChange={() => toggleSelect(contact.id)}
                        />
                      </TableCell>
                      <TableCell className='font-medium'>
                        {contact.first_name} {contact.last_name || ''}
                      </TableCell>
                      <TableCell>{contact.email || '-'}</TableCell>
                      <TableCell>{contact.phone || '-'}</TableCell>
                      <TableCell>{contact.position || '-'}</TableCell>
                      <TableCell>{getStatusBadge(contact.status)}</TableCell>
                      <TableCell className='text-right'>
                        <Button variant='ghost' size='sm' onClick={() => handleViewDetail(contact)}>
                          <Eye className='h-4 w-4' />
                        </Button>
                        <Button variant='ghost' size='sm' onClick={() => handleEdit(contact)}>
                          <Edit className='h-4 w-4' />
                        </Button>
                        <Button variant='ghost' size='sm' onClick={() => handleDelete(contact.id)}>
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
            <DialogTitle>{selectedContact ? '编辑联系人' : '新增联系人'}</DialogTitle>
            <DialogDescription>{selectedContact ? '修改联系人信息' : '填写新联系人信息'}</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit}>
            <div className='grid grid-cols-2 gap-4 py-4'>
              <div className='space-y-2'>
                <Label htmlFor='first_name'>名 *</Label>
                <Input
                  id='first_name'
                  required
                  value={formData.first_name}
                  onChange={(e) => setFormData({ ...formData, first_name: e.target.value })}
                />
              </div>
              <div className='space-y-2'>
                <Label htmlFor='last_name'>姓</Label>
                <Input
                  id='last_name'
                  value={formData.last_name}
                  onChange={(e) => setFormData({ ...formData, last_name: e.target.value })}
                />
              </div>
              <div className='space-y-2'>
                <Label htmlFor='email'>邮箱</Label>
                <Input
                  id='email'
                  type='email'
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                />
              </div>
              <div className='space-y-2'>
                <Label htmlFor='phone'>电话</Label>
                <Input
                  id='phone'
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                />
              </div>
              <div className='col-span-2 space-y-2'>
                <Label htmlFor='position'>职位</Label>
                <Input
                  id='position'
                  value={formData.position}
                  onChange={(e) => setFormData({ ...formData, position: e.target.value })}
                />
              </div>
              <div className='col-span-2 space-y-2'>
                <Label htmlFor='notes'>备注</Label>
                <Textarea
                  id='notes'
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  rows={3}
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
            <DialogTitle>联系人详情</DialogTitle>
          </DialogHeader>
          {selectedContact && (
            <div className='space-y-4'>
              <div className='grid grid-cols-2 gap-4'>
                <div>
                  <Label className='text-muted-foreground'>名</Label>
                  <p className='font-medium'>{selectedContact.first_name}</p>
                </div>
                <div>
                  <Label className='text-muted-foreground'>姓</Label>
                  <p>{selectedContact.last_name || '-'}</p>
                </div>
                <div>
                  <Label className='text-muted-foreground'>邮箱</Label>
                  <p>{selectedContact.email || '-'}</p>
                </div>
                <div>
                  <Label className='text-muted-foreground'>电话</Label>
                  <p>{selectedContact.phone || '-'}</p>
                </div>
                <div>
                  <Label className='text-muted-foreground'>职位</Label>
                  <p>{selectedContact.position || '-'}</p>
                </div>
                <div>
                  <Label className='text-muted-foreground'>状态</Label>
                  <div>{getStatusBadge(selectedContact.status)}</div>
                </div>
                <div>
                  <Label className='text-muted-foreground'>创建时间</Label>
                  <p>{new Date(selectedContact.created_at).toLocaleString('zh-CN')}</p>
                </div>
                <div>
                  <Label className='text-muted-foreground'>更新时间</Label>
                  <p>{new Date(selectedContact.updated_at).toLocaleString('zh-CN')}</p>
                </div>
                <div className='col-span-2'>
                  <Label className='text-muted-foreground'>备注</Label>
                  <p>{selectedContact.notes || '-'}</p>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ContactManagementPage;
