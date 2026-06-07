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
import { crmApi, Interaction, CreateInteractionRequest, UpdateInteractionRequest } from '@/api/crm';
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

const InteractionManagementPage: React.FC = () => {
  const [interactions, setInteractions] = useState<Interaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [total, setTotal] = useState(0);
  const [showDialog, setShowDialog] = useState(false);
  const [showDetailDialog, setShowDetailDialog] = useState(false);
  const [selectedInteraction, setSelectedInteraction] = useState<Interaction | null>(null);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [formData, setFormData] = useState<CreateInteractionRequest>({
    type: 'call',
    subject: '',
    content: '',
    scheduled_at: '',
    notes: '',
  });

  const { addNotification } = useAppStore();

  useEffect(() => {
    loadInteractions();
  }, [currentPage, pageSize, searchTerm, statusFilter, typeFilter]);

  const loadInteractions = async () => {
    try {
      setLoading(true);
      const params: any = {
        page: currentPage,
        pageSize,
      };
      if (searchTerm) params.search = searchTerm;
      if (statusFilter !== 'all') params.status = statusFilter;

      const response = await crmApi.interactions.list(params);
      if (response.success && response.data) {
        setInteractions(response.data.items || []);
        setTotal(response.data.total || 0);
      }
    } catch (error) {
      console.error('加载交互记录列表失败:', error);
      addNotification({
        type: 'error',
        title: '加载失败',
        message: '无法加载交互记录列表',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (selectedInteraction) {
        await crmApi.interactions.update(selectedInteraction.id, formData as UpdateInteractionRequest);
        addNotification({
          type: 'success',
          title: '更新成功',
          message: '交互记录已更新',
        });
      } else {
        await crmApi.interactions.create(formData);
        addNotification({
          type: 'success',
          title: '创建成功',
          message: '新交互记录已创建',
        });
      }
      setShowDialog(false);
      resetForm();
      loadInteractions();
    } catch (error) {
      console.error('操作失败:', error);
      addNotification({
        type: 'error',
        title: '操作失败',
        message: selectedInteraction ? '更新交互记录失败' : '创建交互记录失败',
      });
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('确定要删除这条交互记录吗?')) return;
    try {
      await crmApi.interactions.delete(id);
      addNotification({
        type: 'success',
        title: '删除成功',
        message: '交互记录已删除',
      });
      loadInteractions();
    } catch (error) {
      console.error('删除失败:', error);
      addNotification({
        type: 'error',
        title: '删除失败',
        message: '无法删除交互记录',
      });
    }
  };

  const handleBatchDelete = async () => {
    if (selectedIds.length === 0) return;
    if (!window.confirm(`确定要删除选中的 ${selectedIds.length} 条交互记录吗?`)) return;
    try {
      await crmApi.interactions.batchDelete(selectedIds);
      addNotification({
        type: 'success',
        title: '删除成功',
        message: `已删除 ${selectedIds.length} 条交互记录`,
      });
      setSelectedIds([]);
      loadInteractions();
    } catch (error) {
      console.error('批量删除失败:', error);
      addNotification({
        type: 'error',
        title: '删除失败',
        message: '批量删除失败',
      });
    }
  };

  const handleEdit = (interaction: Interaction) => {
    setSelectedInteraction(interaction);
    setFormData({
      customer_id: interaction.customer_id,
      contact_id: interaction.contact_id,
      type: interaction.type,
      subject: interaction.subject || '',
      content: interaction.content || '',
      scheduled_at: interaction.scheduled_at || '',
      notes: '',
    });
    setShowDialog(true);
  };

  const handleViewDetail = (interaction: Interaction) => {
    setSelectedInteraction(interaction);
    setShowDetailDialog(true);
  };

  const resetForm = () => {
    setSelectedInteraction(null);
    setFormData({
      type: 'call',
      subject: '',
      content: '',
      scheduled_at: '',
      notes: '',
    });
  };

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => (prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]));
  };

  const toggleSelectAll = () => {
    if (selectedIds.length === interactions.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(interactions.map((i) => i.id));
    }
  };

  const getTypeBadge = (type: string) => {
    const typeMap: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
      call: { label: '电话', variant: 'default' },
      email: { label: '邮件', variant: 'secondary' },
      meeting: { label: '会议', variant: 'outline' },
      visit: { label: '拜访', variant: 'outline' },
      other: { label: '其他', variant: 'outline' },
    };
    const t = typeMap[type] || { label: type, variant: 'outline' };
    return <Badge variant={t.variant}>{t.label}</Badge>;
  };

  const getStatusBadge = (status: string) => {
    const statusMap: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
      scheduled: { label: '已计划', variant: 'outline' },
      completed: { label: '已完成', variant: 'default' },
      cancelled: { label: '已取消', variant: 'destructive' },
    };
    const s = statusMap[status] || { label: status, variant: 'outline' };
    return <Badge variant={s.variant}>{s.label}</Badge>;
  };

  if (loading) return <LoadingSpinner />;

  return (
    <div className='space-y-6'>
      <Card>
        <CardHeader>
          <CardTitle>交互记录管理</CardTitle>
          <CardDescription>管理客户交互记录,包括电话、邮件、会议、拜访等</CardDescription>
        </CardHeader>
        <CardContent>
          <div className='flex flex-col sm:flex-row gap-4 mb-6'>
            <div className='flex-1'>
              <div className='relative'>
                <Search className='absolute left-2 top-2.5 h-4 w-4 text-muted-foreground' />
                <Input
                  placeholder='搜索交互主题...'
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className='pl-8'
                />
              </div>
            </div>
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className='w-[150px]'>
                <SelectValue placeholder='类型筛选' />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value='all'>全部类型</SelectItem>
                <SelectItem value='call'>电话</SelectItem>
                <SelectItem value='email'>邮件</SelectItem>
                <SelectItem value='meeting'>会议</SelectItem>
                <SelectItem value='visit'>拜访</SelectItem>
                <SelectItem value='other'>其他</SelectItem>
              </SelectContent>
            </Select>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className='w-[150px]'>
                <SelectValue placeholder='状态筛选' />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value='all'>全部状态</SelectItem>
                <SelectItem value='scheduled'>已计划</SelectItem>
                <SelectItem value='completed'>已完成</SelectItem>
                <SelectItem value='cancelled'>已取消</SelectItem>
              </SelectContent>
            </Select>
            <Button
              onClick={() => {
                resetForm();
                setShowDialog(true);
              }}
            >
              <Plus className='mr-2 h-4 w-4' />
              新增交互
            </Button>
          </div>

          {selectedIds.length > 0 && (
            <div className='mb-4 p-3 bg-muted rounded-lg flex items-center justify-between'>
              <span className='text-sm'>已选择 {selectedIds.length} 条交互记录</span>
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
                      checked={selectedIds.length === interactions.length && interactions.length > 0}
                      onCheckedChange={toggleSelectAll}
                    />
                  </TableHead>
                  <TableHead>主题</TableHead>
                  <TableHead>类型</TableHead>
                  <TableHead>计划时间</TableHead>
                  <TableHead>完成时间</TableHead>
                  <TableHead>状态</TableHead>
                  <TableHead className='text-right'>操作</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {interactions.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className='text-center'>
                      <EmptyState title='暂无交互记录' description='点击上方按钮添加第一条交互记录' />
                    </TableCell>
                  </TableRow>
                ) : (
                  interactions.map((interaction) => (
                    <TableRow key={interaction.id}>
                      <TableCell>
                        <Checkbox
                          checked={selectedIds.includes(interaction.id)}
                          onCheckedChange={() => toggleSelect(interaction.id)}
                        />
                      </TableCell>
                      <TableCell className='font-medium'>{interaction.subject || '-'}</TableCell>
                      <TableCell>{getTypeBadge(interaction.type)}</TableCell>
                      <TableCell>
                        {interaction.scheduled_at ? new Date(interaction.scheduled_at).toLocaleString('zh-CN') : '-'}
                      </TableCell>
                      <TableCell>
                        {interaction.completed_at ? new Date(interaction.completed_at).toLocaleString('zh-CN') : '-'}
                      </TableCell>
                      <TableCell>{getStatusBadge(interaction.status)}</TableCell>
                      <TableCell className='text-right'>
                        <Button variant='ghost' size='sm' onClick={() => handleViewDetail(interaction)}>
                          <Eye className='h-4 w-4' />
                        </Button>
                        <Button variant='ghost' size='sm' onClick={() => handleEdit(interaction)}>
                          <Edit className='h-4 w-4' />
                        </Button>
                        <Button variant='ghost' size='sm' onClick={() => handleDelete(interaction.id)}>
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
            <DialogTitle>{selectedInteraction ? '编辑交互记录' : '新增交互记录'}</DialogTitle>
            <DialogDescription>{selectedInteraction ? '修改交互记录信息' : '填写新交互记录信息'}</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit}>
            <div className='grid grid-cols-2 gap-4 py-4'>
              <div className='space-y-2'>
                <Label htmlFor='type'>类型 *</Label>
                <Select value={formData.type} onValueChange={(value) => setFormData({ ...formData, type: value })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value='call'>电话</SelectItem>
                    <SelectItem value='email'>邮件</SelectItem>
                    <SelectItem value='meeting'>会议</SelectItem>
                    <SelectItem value='visit'>拜访</SelectItem>
                    <SelectItem value='other'>其他</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className='space-y-2'>
                <Label htmlFor='subject'>主题</Label>
                <Input
                  id='subject'
                  value={formData.subject}
                  onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                />
              </div>
              <div className='col-span-2 space-y-2'>
                <Label htmlFor='content'>内容</Label>
                <Textarea
                  id='content'
                  value={formData.content}
                  onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                  rows={4}
                />
              </div>
              <div className='space-y-2'>
                <Label htmlFor='scheduledAt'>计划时间</Label>
                <Input
                  id='scheduledAt'
                  type='datetime-local'
                  value={formData.scheduled_at}
                  onChange={(e) => setFormData({ ...formData, scheduled_at: e.target.value })}
                />
              </div>
              {selectedInteraction && (
                <div className='space-y-2'>
                  <Label htmlFor='status'>状态</Label>
                  <Select
                    value={selectedInteraction.status}
                    onValueChange={(value) => setSelectedInteraction({ ...selectedInteraction, status: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value='scheduled'>已计划</SelectItem>
                      <SelectItem value='completed'>已完成</SelectItem>
                      <SelectItem value='cancelled'>已取消</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}
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
            <DialogTitle>交互记录详情</DialogTitle>
          </DialogHeader>
          {selectedInteraction && (
            <div className='space-y-4'>
              <div className='grid grid-cols-2 gap-4'>
                <div>
                  <Label className='text-muted-foreground'>类型</Label>
                  <div>{getTypeBadge(selectedInteraction.type)}</div>
                </div>
                <div>
                  <Label className='text-muted-foreground'>主题</Label>
                  <p className='font-medium'>{selectedInteraction.subject || '-'}</p>
                </div>
                <div className='col-span-2'>
                  <Label className='text-muted-foreground'>内容</Label>
                  <p>{selectedInteraction.content || '-'}</p>
                </div>
                <div>
                  <Label className='text-muted-foreground'>计划时间</Label>
                  <p>
                    {selectedInteraction.scheduled_at
                      ? new Date(selectedInteraction.scheduled_at).toLocaleString('zh-CN')
                      : '-'}
                  </p>
                </div>
                <div>
                  <Label className='text-muted-foreground'>完成时间</Label>
                  <p>
                    {selectedInteraction.completed_at
                      ? new Date(selectedInteraction.completed_at).toLocaleString('zh-CN')
                      : '-'}
                  </p>
                </div>
                <div>
                  <Label className='text-muted-foreground'>状态</Label>
                  <div>{getStatusBadge(selectedInteraction.status)}</div>
                </div>
                <div>
                  <Label className='text-muted-foreground'>创建时间</Label>
                  <p>{new Date(selectedInteraction.created_at).toLocaleString('zh-CN')}</p>
                </div>
                <div>
                  <Label className='text-muted-foreground'>更新时间</Label>
                  <p>{new Date(selectedInteraction.updated_at).toLocaleString('zh-CN')}</p>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default InteractionManagementPage;
