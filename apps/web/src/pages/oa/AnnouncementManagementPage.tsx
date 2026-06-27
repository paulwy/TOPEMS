import React, { useState, useEffect, useCallback } from 'react';
import { ListPageTemplate } from '@/components/templates/ListPageTemplate';
import { PageContainer } from '@/components/common';
import { announcementApi, type Announcement } from '@/api/erp';
import { useAppStore } from '@/store';
import {
  Bell,
  Plus,
  Edit,
  Trash2,
  CheckCircle,
  XCircle,
  Calendar,
  User,
  AlertCircle,
} from 'lucide-react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Button,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Box,
  Chip,
} from '@mui/material';

const AnnouncementManagementPage: React.FC = () => {
  const addNotification = useAppStore((state) => state.addNotification);

  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedAnnouncement, setSelectedAnnouncement] = useState<Announcement | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [total, setTotal] = useState(0);
  const [searchQuery, setSearchQuery] = useState('');

  const [newAnnouncement, setNewAnnouncement] = useState<Partial<Announcement>>({
    title: '',
    content: '',
    author: '',
    status: 'draft',
    priority: 'normal',
  });

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await announcementApi.list({
        page: currentPage,
        page_size: pageSize,
        search: searchQuery,
      });
      if (res.success && res.data) {
        setAnnouncements(res.data.items || []);
        setTotal(res.data.total);
      }
    } catch (err: unknown) {
      const errorMsg = (err as { message?: string }).message || '加载数据失败';
      setError(errorMsg);
      addNotification({
        title: '加载失败',
        message: errorMsg,
        type: 'error',
      });
      setAnnouncements([]);
    } finally {
      setLoading(false);
    }
  }, [currentPage, pageSize, searchQuery, addNotification]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleCreateAnnouncement = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await announcementApi.create(newAnnouncement);
      if (res.success) {
        addNotification({
          title: '成功',
          message: '公告创建成功',
          type: 'success',
        });
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
        addNotification({
          title: '失败',
          message: res.message || '创建公告失败',
          type: 'error',
        });
      }
    } catch (err: unknown) {
      const errorMsg = (err as { message?: string }).message || '创建公告失败';
      addNotification({
        title: '失败',
        message: errorMsg,
        type: 'error',
      });
    }
  };

  const handleDeleteAnnouncement = async (id: string) => {
    if (!confirm('确定要删除这条公告吗？')) return;
    try {
      const res = await announcementApi.delete(id);
      if (res.success) {
        addNotification({
          title: '成功',
          message: '公告删除成功',
          type: 'success',
        });
        loadData();
      } else {
        addNotification({
          title: '失败',
          message: res.message || '删除公告失败',
          type: 'error',
        });
      }
    } catch (err: unknown) {
      const errorMsg = (err as { message?: string }).message || '删除公告失败';
      addNotification({
        title: '失败',
        message: errorMsg,
        type: 'error',
      });
    }
  };

  const handleEditAnnouncement = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedAnnouncement) return;
    try {
      const res = await announcementApi.update(selectedAnnouncement.id, selectedAnnouncement);
      if (res.success) {
        addNotification({
          title: '成功',
          message: '公告信息更新成功',
          type: 'success',
        });
        setShowEditModal(false);
        setSelectedAnnouncement(null);
        loadData();
      } else {
        addNotification({
          title: '失败',
          message: res.message || '更新公告失败',
          type: 'error',
        });
      }
    } catch (err: unknown) {
      const errorMsg = (err as { message?: string }).message || '更新公告失败';
      addNotification({
        title: '失败',
        message: errorMsg,
        type: 'error',
      });
    }
  };

  const handlePublish = async (id: string) => {
    try {
      const res = await announcementApi.publish(id);
      if (res.success) {
        addNotification({
          title: '成功',
          message: '公告发布成功',
          type: 'success',
        });
        loadData();
      } else {
        addNotification({
          title: '失败',
          message: res.message || '发布公告失败',
          type: 'error',
        });
      }
    } catch (err: unknown) {
      const errorMsg = (err as { message?: string }).message || '发布公告失败';
      addNotification({
        title: '失败',
        message: errorMsg,
        type: 'error',
      });
    }
  };

  const handleUnpublish = async (id: string) => {
    try {
      const res = await announcementApi.unpublish(id);
      if (res.success) {
        addNotification({
          title: '成功',
          message: '公告已下架',
          type: 'success',
        });
        loadData();
      } else {
        addNotification({
          title: '失败',
          message: res.message || '下架公告失败',
          type: 'error',
        });
      }
    } catch (err: unknown) {
      const errorMsg = (err as { message?: string }).message || '下架公告失败';
      addNotification({
        title: '失败',
        message: errorMsg,
        type: 'error',
      });
    }
  };

  const getStatusBadge = (status: string) => {
    const colors: Record<
      string,
      'default' | 'primary' | 'secondary' | 'error' | 'info' | 'success' | 'warning'
    > = {
      draft: 'default',
      published: 'success',
      archived: 'default',
    };
    const labels: Record<string, string> = {
      draft: '草稿',
      published: '已发布',
      archived: '已归档',
    };
    return (
      <Chip
        size='small'
        color={colors[status] || 'default'}
        label={labels[status] || status}
      />
    );
  };

  const getPriorityBadge = (priority?: string) => {
    const colors: Record<
      string,
      'default' | 'primary' | 'secondary' | 'error' | 'info' | 'success' | 'warning'
    > = {
      low: 'default',
      normal: 'info',
      high: 'warning',
      urgent: 'error',
    };
    const labels: Record<string, string> = {
      low: '低',
      normal: '普通',
      high: '高',
      urgent: '紧急',
    };
    return (
      <Chip
        size='small'
        color={colors[priority || 'normal'] || 'default'}
        label={labels[priority || 'normal'] || priority}
      />
    );
  };

  const columns = [
    {
      id: 'title',
      label: '标题',
      sortable: true,
      minWidth: 200,
    },
    {
      id: 'author',
      label: '作者',
      width: 120,
      render: (row: Announcement) => (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
          <User
            size={14}
            style={{ color: '#1976d2' }}
          />
          {row.author}
        </Box>
      ),
    },
    {
      id: 'priority',
      label: '优先级',
      width: 100,
      align: 'center' as const,
      render: (row: Announcement) => getPriorityBadge(row.priority),
    },
    {
      id: 'status',
      label: '状态',
      width: 100,
      align: 'center' as const,
      render: (row: Announcement) => getStatusBadge(row.status),
    },
    {
      id: 'publish_at',
      label: '发布时间',
      width: 180,
      sortable: true,
      render: (row: Announcement) => (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
          <Calendar size={14} />
          {row.publish_at ? new Date(row.publish_at).toLocaleString() : '-'}
        </Box>
      ),
    },
    {
      id: 'created_at',
      label: '创建时间',
      width: 180,
      sortable: true,
      render: (row: Announcement) => new Date(row.created_at).toLocaleDateString(),
    },
  ];

  const rowActions = [
    {
      label: '发布',
      icon: <CheckCircle size={16} />,
      color: 'success' as const,
      onClick: (row: Announcement) => handlePublish(row.id),
      show: (row: Announcement) => row.status === 'draft',
    },
    {
      label: '下架',
      icon: <XCircle size={16} />,
      color: 'warning' as const,
      onClick: (row: Announcement) => handleUnpublish(row.id),
      show: (row: Announcement) => row.status === 'published',
    },
    {
      label: '编辑',
      icon: <Edit size={16} />,
      color: 'primary' as const,
      onClick: (row: Announcement) => {
        setSelectedAnnouncement(row);
        setShowEditModal(true);
      },
    },
    {
      label: '删除',
      icon: <Trash2 size={16} />,
      color: 'error' as const,
      onClick: (row: Announcement) => handleDeleteAnnouncement(row.id),
    },
  ];

  return (
    <PageContainer
      title='公告管理'
      subtitle='管理企业公告和通知'
    >
      <ListPageTemplate
        title=''
        subtitle=''
        columns={columns}
        data={announcements}
        loading={loading}
        error={error ?? undefined}
        searchable
        searchPlaceholder='搜索公告标题、作者...'
        searchValue={searchQuery}
        onSearch={setSearchQuery}
        pagination={{
          page: currentPage,
          pageSize,
          total,
          onPageChange: setCurrentPage,
          onPageSizeChange: setPageSize,
        }}
        sortable
        actions={[
          {
            label: '新增公告',
            icon: <Plus size={18} />,
            onClick: () => setShowCreateModal(true),
          },
        ]}
        rowActions={rowActions}
        onRefresh={loadData}
      />

      <Dialog
        open={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        maxWidth='md'
        fullWidth
      >
        <DialogTitle>新增公告</DialogTitle>
        <form onSubmit={handleCreateAnnouncement}>
          <DialogContent>
            <Box
              sx={{
                display: 'grid',
                gridTemplateColumns: 'repeat(2, 1fr)',
                gap: 2,
                pt: 1,
              }}
            >
              <TextField
                label='标题 *'
                required
                value={newAnnouncement.title || ''}
                onChange={(e) =>
                  setNewAnnouncement({
                    ...newAnnouncement,
                    title: e.target.value,
                  })
                }
                fullWidth
              />
              <FormControl fullWidth>
                <InputLabel>优先级</InputLabel>
                <Select
                  value={newAnnouncement.priority || 'normal'}
                  label='优先级'
                  onChange={(e) =>
                    setNewAnnouncement({
                      ...newAnnouncement,
                      priority: e.target.value,
                    })
                  }
                >
                  <MenuItem value='low'>低</MenuItem>
                  <MenuItem value='normal'>普通</MenuItem>
                  <MenuItem value='high'>高</MenuItem>
                  <MenuItem value='urgent'>紧急</MenuItem>
                </Select>
              </FormControl>
              <TextField
                label='作者 *'
                required
                value={newAnnouncement.author || ''}
                onChange={(e) =>
                  setNewAnnouncement({
                    ...newAnnouncement,
                    author: e.target.value,
                  })
                }
                fullWidth
              />
              <FormControl fullWidth>
                <InputLabel>状态</InputLabel>
                <Select
                  value={newAnnouncement.status || 'draft'}
                  label='状态'
                  onChange={(e) =>
                    setNewAnnouncement({
                      ...newAnnouncement,
                      status: e.target.value,
                    })
                  }
                >
                  <MenuItem value='draft'>草稿</MenuItem>
                  <MenuItem value='published'>发布</MenuItem>
                  <MenuItem value='archived'>归档</MenuItem>
                </Select>
              </FormControl>
              <TextField
                label='发布时间'
                type='datetime-local'
                value={newAnnouncement.publish_at || ''}
                onChange={(e) =>
                  setNewAnnouncement({
                    ...newAnnouncement,
                    publish_at: e.target.value,
                  })
                }
                fullWidth
              />
              <TextField
                label='过期时间'
                type='datetime-local'
                value={newAnnouncement.expire_at || ''}
                onChange={(e) =>
                  setNewAnnouncement({
                    ...newAnnouncement,
                    expire_at: e.target.value,
                  })
                }
                fullWidth
              />
              <TextField
                label='内容'
                multiline
                rows={6}
                value={newAnnouncement.content || ''}
                onChange={(e) =>
                  setNewAnnouncement({
                    ...newAnnouncement,
                    content: e.target.value,
                  })
                }
                fullWidth
                sx={{ gridColumn: 'span 2' }}
              />
            </Box>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setShowCreateModal(false)}>取消</Button>
            <Button
              type='submit'
              variant='contained'
            >
              创建
            </Button>
          </DialogActions>
        </form>
      </Dialog>

      <Dialog
        open={showEditModal}
        onClose={() => setShowEditModal(false)}
        maxWidth='md'
        fullWidth
      >
        <DialogTitle>编辑公告</DialogTitle>
        {selectedAnnouncement && (
          <form onSubmit={handleEditAnnouncement}>
            <DialogContent>
              <Box
                sx={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(2, 1fr)',
                  gap: 2,
                  pt: 1,
                }}
              >
                <TextField
                  label='标题 *'
                  required
                  value={selectedAnnouncement.title}
                  onChange={(e) =>
                    setSelectedAnnouncement({
                      ...selectedAnnouncement,
                      title: e.target.value,
                    })
                  }
                  fullWidth
                />
                <FormControl fullWidth>
                  <InputLabel>优先级</InputLabel>
                  <Select
                    value={selectedAnnouncement.priority || 'normal'}
                    label='优先级'
                    onChange={(e) =>
                      setSelectedAnnouncement({
                        ...selectedAnnouncement,
                        priority: e.target.value,
                      })
                    }
                  >
                    <MenuItem value='low'>低</MenuItem>
                    <MenuItem value='normal'>普通</MenuItem>
                    <MenuItem value='high'>高</MenuItem>
                    <MenuItem value='urgent'>紧急</MenuItem>
                  </Select>
                </FormControl>
                <TextField
                  label='作者 *'
                  required
                  value={selectedAnnouncement.author}
                  onChange={(e) =>
                    setSelectedAnnouncement({
                      ...selectedAnnouncement,
                      author: e.target.value,
                    })
                  }
                  fullWidth
                />
                <FormControl fullWidth>
                  <InputLabel>状态</InputLabel>
                  <Select
                    value={selectedAnnouncement.status}
                    label='状态'
                    onChange={(e) =>
                      setSelectedAnnouncement({
                        ...selectedAnnouncement,
                        status: e.target.value,
                      })
                    }
                  >
                    <MenuItem value='draft'>草稿</MenuItem>
                    <MenuItem value='published'>发布</MenuItem>
                    <MenuItem value='archived'>归档</MenuItem>
                  </Select>
                </FormControl>
                <TextField
                  label='发布时间'
                  type='datetime-local'
                  value={selectedAnnouncement.publish_at || ''}
                  onChange={(e) =>
                    setSelectedAnnouncement({
                      ...selectedAnnouncement,
                      publish_at: e.target.value,
                    })
                  }
                  fullWidth
                />
                <TextField
                  label='过期时间'
                  type='datetime-local'
                  value={selectedAnnouncement.expire_at || ''}
                  onChange={(e) =>
                    setSelectedAnnouncement({
                      ...selectedAnnouncement,
                      expire_at: e.target.value,
                    })
                  }
                  fullWidth
                />
                <TextField
                  label='内容'
                  multiline
                  rows={6}
                  value={selectedAnnouncement.content || ''}
                  onChange={(e) =>
                    setSelectedAnnouncement({
                      ...selectedAnnouncement,
                      content: e.target.value,
                    })
                  }
                  fullWidth
                  sx={{ gridColumn: 'span 2' }}
                />
              </Box>
            </DialogContent>
            <DialogActions>
              <Button
                onClick={() => {
                  setShowEditModal(false);
                  setSelectedAnnouncement(null);
                }}
              >
                取消
              </Button>
              <Button
                type='submit'
                variant='contained'
              >
                保存
              </Button>
            </DialogActions>
          </form>
        )}
      </Dialog>
    </PageContainer>
  );
};

export default AnnouncementManagementPage;
