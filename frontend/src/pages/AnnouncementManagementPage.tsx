import React, { useState, useEffect, useMemo } from 'react';
import { Bell, Search, Plus, Edit, Trash2, ChevronLeft, AlertCircle, Calendar, User } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { announcementApi, type Announcement } from '../api/erp';
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

interface AnnouncementManagementPageProps {
  onNavigate?: (page: string) => void;
}

const AnnouncementManagementPage: React.FC<AnnouncementManagementPageProps> = ({ onNavigate }) => {
  const navigate = useNavigate();
  const addNotification = useAppStore((state) => state.addNotification);

  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedAnnouncement, setSelectedAnnouncement] = useState<Announcement | null>(null);

  const [newAnnouncement, setNewAnnouncement] = useState<Partial<Announcement>>({
    title: '',
    content: '',
    author: '',
    status: 'draft',
    priority: 'normal',
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await announcementApi.list();
      if (res.success && res.data) {
        setAnnouncements(res.data.items || []);
      }
    } catch (err: any) {
      setError(err.message || '加载数据失败');
      addNotification({ title: '加载失败', message: '加载数据失败', type: 'error' });
      setAnnouncements([]);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateAnnouncement = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await announcementApi.create(newAnnouncement);
      if (res.success) {
        addNotification({ title: '成功', message: '公告创建成功', type: 'success' });
        setShowCreateModal(false);
        setNewAnnouncement({
          title: '',
          content: '',
          author: '',
          status: 'draft',
          priority: 'normal',
        });
        loadData();
      } else {
        addNotification({ title: '失败', message: res.message || '创建公告失败', type: 'error' });
      }
    } catch (err: any) {
      addNotification({ title: '失败', message: err.message || '创建公告失败', type: 'error' });
    }
  };

  const handleDeleteAnnouncement = async (id: string) => {
    if (!confirm('确定要删除这条公告吗？')) return;
    try {
      const res = await announcementApi.delete(id);
      if (res.success) {
        addNotification({ title: '成功', message: '公告删除成功', type: 'success' });
        loadData();
      } else {
        addNotification({ title: '失败', message: res.message || '删除公告失败', type: 'error' });
      }
    } catch (err: any) {
      addNotification({ title: '失败', message: err.message || '删除公告失败', type: 'error' });
    }
  };

  const handleEditAnnouncement = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedAnnouncement) return;
    try {
      const res = await announcementApi.update(selectedAnnouncement.id, selectedAnnouncement);
      if (res.success) {
        addNotification({ title: '成功', message: '公告信息更新成功', type: 'success' });
        setShowEditModal(false);
        setSelectedAnnouncement(null);
        loadData();
      } else {
        addNotification({ title: '失败', message: res.message || '更新公告失败', type: 'error' });
      }
    } catch (err: any) {
      addNotification({ title: '失败', message: err.message || '更新公告失败', type: 'error' });
    }
  };

  const handlePublish = async (id: string) => {
    try {
      const res = await announcementApi.publish(id);
      if (res.success) {
        addNotification({ title: '成功', message: '公告发布成功', type: 'success' });
        loadData();
      } else {
        addNotification({ title: '失败', message: res.message || '发布公告失败', type: 'error' });
      }
    } catch (err: any) {
      addNotification({ title: '失败', message: err.message || '发布公告失败', type: 'error' });
    }
  };

  const handleUnpublish = async (id: string) => {
    try {
      const res = await announcementApi.unpublish(id);
      if (res.success) {
        addNotification({ title: '成功', message: '公告已下架', type: 'success' });
        loadData();
      } else {
        addNotification({ title: '失败', message: res.message || '下架公告失败', type: 'error' });
      }
    } catch (err: any) {
      addNotification({ title: '失败', message: err.message || '下架公告失败', type: 'error' });
    }
  };

  const getStatusBadge = (status: string) => {
    const colors: Record<string, 'default' | 'secondary' | 'destructive' | 'outline' | 'success'> = {
      draft: 'secondary',
      published: 'success',
      archived: 'outline',
    };
    const labels: Record<string, string> = {
      draft: '草稿',
      published: '已发布',
      archived: '已归档',
    };
    return <Badge variant={colors[status] || 'outline'}>{labels[status] || status}</Badge>;
  };

  const getPriorityBadge = (priority?: string) => {
    const colors: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
      low: 'outline',
      normal: 'secondary',
      high: 'default',
      urgent: 'destructive',
    };
    const labels: Record<string, string> = {
      low: '低',
      normal: '普通',
      high: '高',
      urgent: '紧急',
    };
    return (
      <Badge variant={colors[priority || 'normal'] || 'outline'}>{labels[priority || 'normal'] || priority}</Badge>
    );
  };

  const columns = useMemo<ColumnDef<Announcement>[]>(
    () => [
      {
        accessorKey: 'title',
        header: '标题',
        cell: ({ row }) => <div className='font-medium text-slate-900 dark:text-slate-100'>{row.original.title}</div>,
      },
      {
        accessorKey: 'author',
        header: '作者',
        cell: ({ row }) => (
          <div className='flex items-center text-sm text-slate-900 dark:text-slate-100'>
            <User className='w-3 h-3 mr-1 text-blue-600' />
            {row.original.author}
          </div>
        ),
      },
      {
        accessorKey: 'priority',
        header: '优先级',
        cell: ({ row }) => getPriorityBadge(row.original.priority),
      },
      {
        accessorKey: 'status',
        header: '状态',
        cell: ({ row }) => getStatusBadge(row.original.status),
      },
      {
        accessorKey: 'publish_at',
        header: '发布时间',
        cell: ({ row }) => (
          <div className='flex items-center text-sm text-slate-500 dark:text-slate-400'>
            <Calendar className='w-3 h-3 mr-1' />
            {row.original.publish_at ? new Date(row.original.publish_at).toLocaleString() : '-'}
          </div>
        ),
      },
      {
        accessorKey: 'created_at',
        header: '创建时间',
        cell: ({ row }) => (
          <div className='text-sm text-slate-500 dark:text-slate-400'>
            {new Date(row.original.created_at).toLocaleDateString()}
          </div>
        ),
      },
      {
        id: 'actions',
        header: '操作',
        cell: ({ row }) => {
          const announcement = row.original;
          return (
            <div className='flex items-center justify-end space-x-2'>
              {announcement.status === 'draft' && (
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant='ghost'
                        size='sm'
                        className='text-green-600 hover:text-green-700 dark:text-green-400'
                        onClick={() => handlePublish(announcement.id)}
                      >
                        发布
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>发布公告</TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              )}
              {announcement.status === 'published' && (
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant='ghost'
                        size='sm'
                        className='text-orange-600 hover:text-orange-700 dark:text-orange-400'
                        onClick={() => handleUnpublish(announcement.id)}
                      >
                        下架
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>下架公告</TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              )}
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant='ghost'
                      size='sm'
                      onClick={() => {
                        setSelectedAnnouncement(announcement);
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
                      onClick={() => handleDeleteAnnouncement(announcement.id)}
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
                  <Bell className='w-7 h-7 mr-3 text-blue-600' />
                  公告管理
                </h1>
                <p className='mt-1 text-sm text-slate-500 dark:text-slate-400'>管理企业公告和通知</p>
              </div>
            </div>
            <div className='flex items-center space-x-2'>
              <ModeToggle />
              <Button onClick={() => setShowCreateModal(true)}>
                <Plus className='w-5 h-5 mr-2' />
                新增公告
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className='max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8'>
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
                columns={columns}
                data={announcements}
                searchPlaceholder='搜索公告标题、作者...'
                searchKey='title'
              />
            )}
          </CardContent>
        </Card>
      </div>

      <Dialog open={showCreateModal} onOpenChange={setShowCreateModal}>
        <DialogContent className='max-w-2xl max-h-[90vh] overflow-y-auto'>
          <DialogHeader>
            <DialogTitle>新增公告</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleCreateAnnouncement}>
            <div className='space-y-4'>
              <div className='space-y-2'>
                <Label htmlFor='title'>标题 *</Label>
                <Input
                  id='title'
                  type='text'
                  required
                  value={newAnnouncement.title || ''}
                  onChange={(e) => setNewAnnouncement({ ...newAnnouncement, title: e.target.value })}
                  placeholder='请输入公告标题'
                />
              </div>

              <div className='grid grid-cols-2 gap-4'>
                <div className='space-y-2'>
                  <Label htmlFor='author'>作者 *</Label>
                  <Input
                    id='author'
                    type='text'
                    required
                    value={newAnnouncement.author || ''}
                    onChange={(e) => setNewAnnouncement({ ...newAnnouncement, author: e.target.value })}
                    placeholder='请输入作者'
                  />
                </div>
                <div className='space-y-2'>
                  <Label htmlFor='priority'>优先级</Label>
                  <Select
                    value={newAnnouncement.priority || 'normal'}
                    onValueChange={(value) => setNewAnnouncement({ ...newAnnouncement, priority: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder='请选择优先级' />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value='low'>低</SelectItem>
                      <SelectItem value='normal'>普通</SelectItem>
                      <SelectItem value='high'>高</SelectItem>
                      <SelectItem value='urgent'>紧急</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className='space-y-2'>
                <Label htmlFor='content'>内容</Label>
                <Textarea
                  id='content'
                  value={newAnnouncement.content || ''}
                  onChange={(e) => setNewAnnouncement({ ...newAnnouncement, content: e.target.value })}
                  placeholder='请输入公告内容'
                  rows={8}
                />
              </div>

              <div className='grid grid-cols-2 gap-4'>
                <div className='space-y-2'>
                  <Label htmlFor='publish_at'>发布时间</Label>
                  <Input
                    id='publish_at'
                    type='datetime-local'
                    value={newAnnouncement.publish_at || ''}
                    onChange={(e) => setNewAnnouncement({ ...newAnnouncement, publish_at: e.target.value })}
                  />
                </div>
                <div className='space-y-2'>
                  <Label htmlFor='expire_at'>过期时间</Label>
                  <Input
                    id='expire_at'
                    type='datetime-local'
                    value={newAnnouncement.expire_at || ''}
                    onChange={(e) => setNewAnnouncement({ ...newAnnouncement, expire_at: e.target.value })}
                  />
                </div>
              </div>

              <div className='space-y-2'>
                <Label htmlFor='status'>状态</Label>
                <Select
                  value={newAnnouncement.status || 'draft'}
                  onValueChange={(value) => setNewAnnouncement({ ...newAnnouncement, status: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder='请选择状态' />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value='draft'>草稿</SelectItem>
                    <SelectItem value='published'>发布</SelectItem>
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
        <DialogContent className='max-w-2xl max-h-[90vh] overflow-y-auto'>
          <DialogHeader>
            <DialogTitle>编辑公告</DialogTitle>
          </DialogHeader>
          {selectedAnnouncement && (
            <form onSubmit={handleEditAnnouncement}>
              <div className='space-y-4'>
                <div className='space-y-2'>
                  <Label htmlFor='edit_title'>标题 *</Label>
                  <Input
                    id='edit_title'
                    type='text'
                    required
                    value={selectedAnnouncement.title}
                    onChange={(e) => setSelectedAnnouncement({ ...selectedAnnouncement, title: e.target.value })}
                  />
                </div>

                <div className='grid grid-cols-2 gap-4'>
                  <div className='space-y-2'>
                    <Label htmlFor='edit_author'>作者 *</Label>
                    <Input
                      id='edit_author'
                      type='text'
                      required
                      value={selectedAnnouncement.author}
                      onChange={(e) => setSelectedAnnouncement({ ...selectedAnnouncement, author: e.target.value })}
                    />
                  </div>
                  <div className='space-y-2'>
                    <Label htmlFor='edit_priority'>优先级</Label>
                    <Select
                      value={selectedAnnouncement.priority || 'normal'}
                      onValueChange={(value) => setSelectedAnnouncement({ ...selectedAnnouncement, priority: value })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder='请选择优先级' />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value='low'>低</SelectItem>
                        <SelectItem value='normal'>普通</SelectItem>
                        <SelectItem value='high'>高</SelectItem>
                        <SelectItem value='urgent'>紧急</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className='space-y-2'>
                  <Label htmlFor='edit_content'>内容</Label>
                  <Textarea
                    id='edit_content'
                    value={selectedAnnouncement.content || ''}
                    onChange={(e) => setSelectedAnnouncement({ ...selectedAnnouncement, content: e.target.value })}
                    rows={8}
                  />
                </div>

                <div className='grid grid-cols-2 gap-4'>
                  <div className='space-y-2'>
                    <Label htmlFor='edit_publish_at'>发布时间</Label>
                    <Input
                      id='edit_publish_at'
                      type='datetime-local'
                      value={selectedAnnouncement.publish_at || ''}
                      onChange={(e) => setSelectedAnnouncement({ ...selectedAnnouncement, publish_at: e.target.value })}
                    />
                  </div>
                  <div className='space-y-2'>
                    <Label htmlFor='edit_expire_at'>过期时间</Label>
                    <Input
                      id='edit_expire_at'
                      type='datetime-local'
                      value={selectedAnnouncement.expire_at || ''}
                      onChange={(e) => setSelectedAnnouncement({ ...selectedAnnouncement, expire_at: e.target.value })}
                    />
                  </div>
                </div>

                <div className='space-y-2'>
                  <Label htmlFor='edit_status'>状态</Label>
                  <Select
                    value={selectedAnnouncement.status}
                    onValueChange={(value) => setSelectedAnnouncement({ ...selectedAnnouncement, status: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder='请选择状态' />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value='draft'>草稿</SelectItem>
                      <SelectItem value='published'>发布</SelectItem>
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
                    setSelectedAnnouncement(null);
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
    </div>
  );
};

export default AnnouncementManagementPage;
