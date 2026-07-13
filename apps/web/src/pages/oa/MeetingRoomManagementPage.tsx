import React, { useState, useMemo } from 'react';
import { ListPageTemplate } from '@/components/templates/ListPageTemplate';
import { PageContainer } from '@/components/common';
import {
  meetingRoomCrudApi,
  meetingBookingCrudApi,
  meetingBookingApi,
  type MeetingRoom,
  type MeetingBooking,
} from '@/api/erp';
import { useCrudOperations } from '@/hooks/useCrudQueries';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNotificationStore } from '@/store';
import {
  Calendar,
  Plus,
  Edit,
  Trash2,
  Users,
  MapPin,
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
  Stack,
} from '@mui/material';
import { designTokens } from '@/theme/tokens';

const ct = designTokens.colors;

const MeetingRoomManagementPage: React.FC = () => {
  const addNotification = useNotificationStore((state) => state.addNotification);
  const queryClient = useQueryClient();

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showBookingModal, setShowBookingModal] = useState(false);
  const [selectedRoom, setSelectedRoom] = useState<MeetingRoom | null>(null);
  const [selectedBooking, setSelectedBooking] = useState<Partial<MeetingBooking>>({});

  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  const [newRoom, setNewRoom] = useState<Partial<MeetingRoom>>({
    name: '',
    capacity: 0,
    location: '',
    facilities: [],
    status: 'active',
  });

  const {
    data: rooms,
    loading,
    error,
    pagination,
    fetch,
    refresh,
    create: createRoom,
    update: updateRoom,
    delete: deleteRoom,
  } = useCrudOperations<MeetingRoom>({
    api: meetingRoomCrudApi,
    queryKey: 'oa-meeting-rooms',
    defaultPageSize: 20,
    pageParamName: 'page',
    pageSizeParamName: 'pagesize',
  });

  const { data: bookingsData } = useQuery({
    queryKey: ['oa-meeting-bookings'],
    queryFn: async () => {
      const res = await meetingBookingApi.list();
      if (res.success && res.data) {
        return res.data.items || [];
      }
      return [];
    },
    staleTime: 5 * 60 * 1000,
  });

  const bookings = bookingsData || [];

  const createBookingMutation = useMutation({
    mutationFn: (data: Partial<MeetingBooking>) => meetingBookingApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['oa-meeting-bookings'] });
      addNotification({ title: '成功', message: '预约成功', type: 'success' });
    },
    onError: (err: unknown) => {
      const errAny = err as { response?: { data?: { message?: string } }; message?: string };
      const message = errAny?.response?.data?.message || errAny?.message || '预约失败';
      addNotification({ title: '失败', message, type: 'error' });
    },
  });

  const handleSearch = (value: string) => {
    setSearchQuery(value);
    pagination.setPage(1);
    const params: Record<string, unknown> = {};
    if (value) params.search = value;
    if (statusFilter) params.status = statusFilter;
    fetch(params);
  };

  const handleStatusFilterChange = (value: string) => {
    setStatusFilter(value);
    pagination.setPage(1);
    const params: Record<string, unknown> = {};
    if (searchQuery) params.search = searchQuery;
    if (value) params.status = value;
    fetch(params);
  };

  const handleCreateRoom = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await createRoom(newRoom);
      setShowCreateModal(false);
      setNewRoom({
        name: '',
        capacity: 0,
        location: '',
        facilities: [],
        status: 'active',
      });
    } catch (_err: unknown) {
      // 错误已由 useCrudOperations 处理
    }
  };

  const handleDeleteRoom = async (id: string) => {
    if (!confirm('确定要删除这个会议室吗？')) return;
    try {
      await deleteRoom(id);
    } catch (_err: unknown) {
      // 错误已由 useCrudOperations 处理
    }
  };

  const handleEditRoom = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedRoom) return;
    try {
      await updateRoom(selectedRoom.id, selectedRoom);
      setShowEditModal(false);
      setSelectedRoom(null);
    } catch (_err: unknown) {
      // 错误已由 useCrudOperations 处理
    }
  };

  const handleCreateBooking = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await createBookingMutation.mutateAsync(selectedBooking);
      setShowBookingModal(false);
      setSelectedBooking({});
    } catch (_err: unknown) {
      // 错误已由 mutation 处理
    }
  };

  const getStatusBadge = (status: string) => {
    const colors: Record<
      string,
      'primary' | 'secondary' | 'default' | 'error' | 'info' | 'success' | 'warning'
    > = {
      active: 'success',
      inactive: 'default',
      confirmed: 'success',
      pending: 'warning',
      cancelled: 'error',
    };
    const labels: Record<string, string> = {
      active: '可用',
      inactive: '停用',
      confirmed: '已确认',
      pending: '待确认',
      cancelled: '已取消',
    };
    return (
      <Chip
        size='small'
        color={colors[status] || 'default'}
        label={labels[status] || status}
      />
    );
  };

  const roomsColumns = [
    {
      id: 'name',
      label: '会议室名称',
      sortable: true,
      minWidth: 150,
    },
    {
      id: 'capacity',
      label: '容量',
      width: 100,
      align: 'center' as const,
      render: (row: MeetingRoom) => (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, justifyContent: 'center' }}>
          <Users
            size={14}
            style={{ color: ct.primary.dark }}
          />
          {row.capacity} 人
        </Box>
      ),
    },
    {
      id: 'location',
      label: '位置',
      width: 150,
      render: (row: MeetingRoom) => (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
          <MapPin
            size={14}
            style={{ color: ct.primary.dark }}
          />
          {row.location || '-'}
        </Box>
      ),
    },
    {
      id: 'facilities',
      label: '设施',
      width: 200,
      render: (row: MeetingRoom) => row.facilities?.join(', ') || '-',
    },
    {
      id: 'status',
      label: '状态',
      width: 100,
      align: 'center' as const,
      render: (row: MeetingRoom) => getStatusBadge(row.status),
    },
    {
      id: 'created_at',
      label: '创建时间',
      width: 180,
      sortable: true,
      render: (row: MeetingRoom) => new Date(row.created_at).toLocaleDateString(),
    },
  ];

  const roomsRowActions = [
    {
      label: '预约',
      icon: <Calendar size={16} />,
      color: 'primary' as const,
      onClick: (row: MeetingRoom) => {
        setSelectedBooking({
          room_id: row.id,
          room_name: row.name,
          status: 'confirmed',
        });
        setShowBookingModal(true);
      },
      show: (row: MeetingRoom) => row.status === 'active',
    },
    {
      label: '编辑',
      icon: <Edit size={16} />,
      color: 'primary' as const,
      onClick: (row: MeetingRoom) => {
        setSelectedRoom(row);
        setShowEditModal(true);
      },
    },
    {
      label: '删除',
      icon: <Trash2 size={16} />,
      color: 'error' as const,
      onClick: (row: MeetingRoom) => handleDeleteRoom(row.id),
    },
  ];

  const bookingsColumns = [
    {
      id: 'room_name',
      label: '会议室',
      sortable: true,
      minWidth: 150,
    },
    {
      id: 'title',
      label: '会议主题',
      sortable: true,
      minWidth: 150,
    },
    {
      id: 'organizer',
      label: '组织者',
      width: 120,
    },
    {
      id: 'start_time',
      label: '开始时间',
      width: 180,
      sortable: true,
      render: (row: MeetingBooking) => new Date(row.start_time).toLocaleString(),
    },
    {
      id: 'end_time',
      label: '结束时间',
      width: 180,
      sortable: true,
      render: (row: MeetingBooking) => new Date(row.end_time).toLocaleString(),
    },
    {
      id: 'status',
      label: '状态',
      width: 100,
      align: 'center' as const,
      render: (row: MeetingBooking) => getStatusBadge(row.status),
    },
  ];

  return (
    <PageContainer
      title='会议室管理'
      subtitle='管理会议室信息和预约安排'
    >
      <Stack spacing={4}>
        <ListPageTemplate
          title=''
          subtitle=''
          columns={roomsColumns}
          data={rooms}
          loading={loading || createBookingMutation.isPending}
          error={error ?? undefined}
          searchable
          searchPlaceholder='搜索会议室名称、位置...'
          searchValue={searchQuery}
          onSearch={handleSearch}
          filters={[
            {
              id: 'status',
              label: '状态',
              type: 'select' as const,
              options: [
                { label: '全部', value: '' },
                { label: '可用', value: 'active' },
                { label: '停用', value: 'inactive' },
              ],
              value: statusFilter,
              onChange: (value: unknown) => {
                handleStatusFilterChange(value as string);
              },
            },
          ]}
          pagination={{
            page: pagination.page,
            pageSize: pagination.pageSize,
            total: pagination.total,
            onPageChange: pagination.setPage,
            onPageSizeChange: pagination.setPageSize,
          }}
          sortable
          actions={[
            {
              label: '新增会议室',
              icon: <Plus size={18} />,
              onClick: () => setShowCreateModal(true),
            },
          ]}
          rowActions={roomsRowActions}
          onRefresh={refresh}
        />

        {bookings.length > 0 && (
          <ListPageTemplate
            title='预约记录'
            subtitle='查看近期会议室预约'
            columns={bookingsColumns}
            data={bookings}
            searchable
            searchPlaceholder='搜索预约记录...'
            sortable
          />
        )}

        <Dialog
          open={showCreateModal}
          onClose={() => setShowCreateModal(false)}
          maxWidth='xl'
        >
          <DialogTitle>新增会议室</DialogTitle>
          <DialogContent sx={{ maxWidth: 540, overflowY: 'auto' }}>
            <form onSubmit={handleCreateRoom}>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5, pt: 1 }}>
                <TextField
                  label='会议室名称 *'
                  value={newRoom.name || ''}
                  onChange={(e) => setNewRoom({ ...newRoom, name: e.target.value })}
                  placeholder='请输入会议室名称'
                  size='small'
                  fullWidth
                  required
                />

                <Box sx={{ display: 'flex', gap: 2 }}>
                  <TextField
                    label='容量 *'
                    type='number'
                    value={newRoom.capacity || ''}
                    onChange={(e) =>
                      setNewRoom({
                        ...newRoom,
                        capacity: Number(e.target.value),
                      })
                    }
                    placeholder='请输入容量'
                    size='small'
                    fullWidth
                    required
                  />
                  <TextField
                    label='位置'
                    value={newRoom.location || ''}
                    onChange={(e) => setNewRoom({ ...newRoom, location: e.target.value })}
                    placeholder='请输入位置'
                    size='small'
                    fullWidth
                  />
                </Box>

                <TextField
                  label='设施（用逗号分隔）'
                  value={(newRoom.facilities || []).join(', ')}
                  onChange={(e) =>
                    setNewRoom({
                      ...newRoom,
                      facilities: e.target.value
                        .split(',')
                        .map((s: string) => s.trim())
                        .filter((s: string) => s),
                    })
                  }
                  placeholder='如：投影仪, 麦克风, 白板'
                  size='small'
                  fullWidth
                />

                <FormControl
                  size='small'
                  fullWidth
                >
                  <InputLabel>状态</InputLabel>
                  <Select
                    value={newRoom.status || 'active'}
                    label='状态'
                    onChange={(e) => setNewRoom({ ...newRoom, status: e.target.value })}
                  >
                    <MenuItem value='active'>可用</MenuItem>
                    <MenuItem value='inactive'>停用</MenuItem>
                  </Select>
                </FormControl>
              </Box>

              <DialogActions sx={{ mt: 3 }}>
                <Button
                  type='button'
                  onClick={() => setShowCreateModal(false)}
                >
                  取消
                </Button>
                <Button
                  type='submit'
                  variant='contained'
                  disabled={loading}
                >
                  创建
                </Button>
              </DialogActions>
            </form>
          </DialogContent>
        </Dialog>

        <Dialog
          open={showEditModal}
          onClose={() => setShowEditModal(false)}
          maxWidth='xl'
        >
          <DialogTitle>编辑会议室</DialogTitle>
          <DialogContent sx={{ maxWidth: 540, overflowY: 'auto' }}>
            {selectedRoom && (
              <form onSubmit={handleEditRoom}>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5, pt: 1 }}>
                  <TextField
                    label='会议室名称 *'
                    value={selectedRoom.name}
                    onChange={(e) => setSelectedRoom({ ...selectedRoom, name: e.target.value })}
                    size='small'
                    fullWidth
                    required
                  />

                  <Box sx={{ display: 'flex', gap: 2 }}>
                    <TextField
                      label='容量 *'
                      type='number'
                      value={selectedRoom.capacity}
                      onChange={(e) =>
                        setSelectedRoom({
                          ...selectedRoom,
                          capacity: Number(e.target.value),
                        })
                      }
                      size='small'
                      fullWidth
                      required
                    />
                    <TextField
                      label='位置'
                      value={selectedRoom.location || ''}
                      onChange={(e) =>
                        setSelectedRoom({
                          ...selectedRoom,
                          location: e.target.value,
                        })
                      }
                      size='small'
                      fullWidth
                    />
                  </Box>

                  <TextField
                    label='设施（用逗号分隔）'
                    value={(selectedRoom.facilities || []).join(', ')}
                    onChange={(e) =>
                      setSelectedRoom({
                        ...selectedRoom,
                        facilities: e.target.value
                          .split(',')
                          .map((s: string) => s.trim())
                          .filter((s: string) => s),
                      })
                    }
                    size='small'
                    fullWidth
                  />

                  <FormControl
                    size='small'
                    fullWidth
                  >
                    <InputLabel>状态</InputLabel>
                    <Select
                      value={selectedRoom.status}
                      label='状态'
                      onChange={(e) =>
                        setSelectedRoom({
                          ...selectedRoom,
                          status: e.target.value,
                        })
                      }
                    >
                      <MenuItem value='active'>可用</MenuItem>
                      <MenuItem value='inactive'>停用</MenuItem>
                    </Select>
                  </FormControl>
                </Box>

                <DialogActions sx={{ mt: 3 }}>
                  <Button
                    type='button'
                    onClick={() => {
                      setShowEditModal(false);
                      setSelectedRoom(null);
                    }}
                  >
                    取消
                  </Button>
                  <Button
                    type='submit'
                    variant='contained'
                    disabled={loading}
                  >
                    保存
                  </Button>
                </DialogActions>
              </form>
            )}
          </DialogContent>
        </Dialog>

        <Dialog
          open={showBookingModal}
          onClose={() => setShowBookingModal(false)}
          maxWidth='xl'
        >
          <DialogTitle>预约会议室</DialogTitle>
          <DialogContent sx={{ maxWidth: 540, overflowY: 'auto' }}>
            <form onSubmit={handleCreateBooking}>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5, pt: 1 }}>
                <TextField
                  label='会议室'
                  value={selectedBooking.room_name || ''}
                  disabled
                  size='small'
                  fullWidth
                />

                <TextField
                  label='会议主题 *'
                  value={selectedBooking.title || ''}
                  onChange={(e) =>
                    setSelectedBooking({
                      ...selectedBooking,
                      title: e.target.value,
                    })
                  }
                  placeholder='请输入会议主题'
                  size='small'
                  fullWidth
                  required
                />

                <TextField
                  label='组织者 *'
                  value={selectedBooking.organizer || ''}
                  onChange={(e) =>
                    setSelectedBooking({
                      ...selectedBooking,
                      organizer: e.target.value,
                    })
                  }
                  placeholder='请输入组织者'
                  size='small'
                  fullWidth
                  required
                />

                <Box sx={{ display: 'flex', gap: 2 }}>
                  <TextField
                    label='开始时间 *'
                    type='datetime-local'
                    value={
                      selectedBooking.start_time
                        ? new Date(selectedBooking.start_time).toISOString().slice(0, 16)
                        : ''
                    }
                    onChange={(e) =>
                      setSelectedBooking({
                        ...selectedBooking,
                        start_time: e.target.value,
                      })
                    }
                    size='small'
                    fullWidth
                    required
                    slotProps={{ inputLabel: { shrink: true } } as any}
                  />
                  <TextField
                    label='结束时间 *'
                    type='datetime-local'
                    value={
                      selectedBooking.end_time
                        ? new Date(selectedBooking.end_time).toISOString().slice(0, 16)
                        : ''
                    }
                    onChange={(e) =>
                      setSelectedBooking({
                        ...selectedBooking,
                        end_time: e.target.value,
                      })
                    }
                    size='small'
                    fullWidth
                    required
                    slotProps={{ inputLabel: { shrink: true } } as any}
                  />
                </Box>
              </Box>

              <DialogActions sx={{ mt: 3 }}>
                <Button
                  type='button'
                  onClick={() => {
                    setShowBookingModal(false);
                    setSelectedBooking({});
                  }}
                >
                  取消
                </Button>
                <Button
                  type='submit'
                  variant='contained'
                  disabled={createBookingMutation.isPending}
                >
                  预约
                </Button>
              </DialogActions>
            </form>
          </DialogContent>
        </Dialog>
      </Stack>
    </PageContainer>
  );
};

export default MeetingRoomManagementPage;
