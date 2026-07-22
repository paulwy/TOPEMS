import {
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Box,
  InputLabel,
  Select,
  MenuItem,
  FormControl,
  Button,
  Tabs,
  Tab,
} from '@mui/material';
import { PageContainer } from '@/components/common/PageContainerV2';
import React, { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { QUERY_KEYS } from '@/lib/reactQuery';
import type { MeetingRoom, MeetingBooking, PaginationParams } from '@/api/erp';
import { meetingRoomApi, meetingBookingApi } from '@/api/erp';
import { useNotificationStore } from '@/store';
import { LoadingSpinner } from '@topems/shared-components';
import {
  ListPageTemplate,
  type ColumnDef,
  type RowAction,
  type FilterConfig,
} from '@/components/templates';
import { Edit, Trash2, Eye, Save, Calendar, CalendarCheck } from 'lucide-react';
import { apiLogger } from '@/utils/logger';
import { designTokens } from '@/theme/tokens';

const ct = designTokens.colors;

const MeetingRoomPage: React.FC = () => {
  const queryClient = useQueryClient();
  const addNotification = useNotificationStore((state) => state.addNotification);

  const [activeTab, setActiveTab] = useState(0);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize] = useState(10);
  const [showDialog, setShowDialog] = useState(false);
  const [showDetailDialog, setShowDetailDialog] = useState(false);
  const [selectedItem, setSelectedItem] = useState<MeetingRoom | MeetingBooking | null>(null);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [formData, setFormData] = useState<{
    [key: string]: unknown;
    name: string;
    location: string;
    capacity: number;
    facilities: string[];
    status: string;
    room_id: string;
    room_name: string;
    title: string;
    start_time: string;
    end_time: string;
    organizer: string;
  }>({
    name: '',
    location: '',
    capacity: 10,
    facilities: [],
    status: 'available',
    room_id: '',
    room_name: '',
    title: '',
    start_time: '',
    end_time: '',
    organizer: '',
  });

  const params: PaginationParams = {
    page: currentPage - 1,
    pagesize: pageSize,
  };
  if (searchTerm) params.search = searchTerm;
  if (statusFilter !== 'all') params.status = statusFilter;

  const { data: roomsData, isLoading: roomsLoading } = useQuery<{ items: MeetingRoom[]; total: number }>({
    queryKey: [...QUERY_KEYS.ERP.MEETING_ROOMS, params],
    queryFn: async () => {
      const response = await meetingRoomApi.list(params);
      if (response.success && response.data) {
        return { items: response.data.items || [], total: response.data.total || 0 };
      }
      return { items: [], total: 0 };
    },
    enabled: activeTab === 0,
  });

  const { data: bookingsData, isLoading: bookingsLoading } = useQuery<{ items: MeetingBooking[]; total: number }>({
    queryKey: [...QUERY_KEYS.ERP.MEETING_BOOKINGS, params],
    queryFn: async () => {
      const response = await meetingBookingApi.list(params);
      if (response.success && response.data) {
        return { items: response.data.items || [], total: response.data.total || 0 };
      }
      return { items: [], total: 0 };
    },
    enabled: activeTab === 1,
  });

  const rooms = roomsData?.items || [];
  const bookings = bookingsData?.items || [];
  const data = activeTab === 0 ? rooms : bookings;
  const total = activeTab === 0 ? (roomsData?.total || 0) : (bookingsData?.total || 0);
  const loading = activeTab === 0 ? roomsLoading : bookingsLoading;

  const invalidateData = () => {
    queryClient.invalidateQueries({ queryKey: QUERY_KEYS.ERP.MEETING_ROOMS });
    queryClient.invalidateQueries({ queryKey: QUERY_KEYS.ERP.MEETING_BOOKINGS });
  };

  const createMutation = useMutation({
    mutationFn: (data: unknown) =>
      activeTab === 0 ? meetingRoomApi.create(data as Partial<MeetingRoom>) as Promise<unknown> : meetingBookingApi.create(data as Partial<MeetingBooking>) as Promise<unknown>,
    onSuccess: () => {
      addNotification({ type: 'success', title: '创建成功', message: '记录已添加' });
      invalidateData();
      setShowDialog(false);
      resetForm();
    },
    onError: (error: unknown) => {
      apiLogger.error('操作失败:', error);
      addNotification({ type: 'error', title: '操作失败', message: '添加记录失败' });
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: unknown }) =>
      activeTab === 0 ? meetingRoomApi.update(id, data as Partial<MeetingRoom>) as Promise<unknown> : meetingBookingApi.update(id, data as Partial<MeetingBooking>) as Promise<unknown>,
    onSuccess: () => {
      addNotification({ type: 'success', title: '更新成功', message: '记录信息已更新' });
      invalidateData();
      setShowDialog(false);
      resetForm();
    },
    onError: (error: unknown) => {
      apiLogger.error('操作失败:', error);
      addNotification({ type: 'error', title: '操作失败', message: '更新记录失败' });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) =>
      activeTab === 0 ? meetingRoomApi.delete(id) : meetingBookingApi.delete(id),
    onSuccess: () => {
      addNotification({ type: 'success', title: '删除成功', message: '记录已删除' });
      invalidateData();
    },
    onError: (error: unknown) => {
      apiLogger.error('删除失败:', error);
      addNotification({ type: 'error', title: '删除失败', message: '无法删除记录' });
    },
  });

  const getStatusText = (status: string) => {
    const statusMap: Record<string, string> = {
      available: '可用',
      occupied: '占用中',
      maintenance: '维护中',
      unavailable: '不可用',
      pending: '待确认',
      confirmed: '已确认',
      cancelled: '已取消',
      completed: '已完成',
    };
    return statusMap[status] || status;
  };

  const getStatusBadge = (status: string) => {
    const statusMap: Record<
      string,
      {
        label: string;
        bg: string;
        color: string;
      }
    > = {
      available: { label: '可用', bg: 'success.lighter', color: 'success.700' },
      occupied: { label: '占用中', bg: 'warning.light', color: 'warning.700' },
      maintenance: { label: '维护中', bg: 'info.light', color: 'info.700' },
      unavailable: { label: '不可用', bg: 'error.lighter', color: 'error.dark' },
      pending: { label: '待确认', bg: 'warning.light', color: 'warning.700' },
      confirmed: { label: '已确认', bg: 'success.lighter', color: 'success.700' },
      cancelled: { label: '已取消', bg: 'grey.100', color: 'text.secondary' },
      completed: { label: '已完成', bg: 'secondary[100]', color: 'secondary.700' },
    };
    const s = statusMap[status] || { label: status, bg: 'grey.100', color: 'text.secondary' };
    return (
      <Chip
        size='small'
        label={s.label}
        sx={{ backgroundColor: s.bg, color: s.color, fontWeight: 500 }}
      />
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedItem) {
      updateMutation.mutate({ id: selectedItem.id, data: formData });
    } else {
      createMutation.mutate(formData);
    }
  };

  const handleDelete = (id: string) => {
    if (!window.confirm('确定要删除这条记录吗?')) return;
    deleteMutation.mutate(id);
  };

  const handleEdit = (item: MeetingRoom | MeetingBooking) => {
    setSelectedItem(item);
    setFormData({
      name: (item as MeetingRoom).name || '',
      location: (item as MeetingRoom).location || '',
      capacity: (item as MeetingRoom).capacity || 10,
      facilities: (item as MeetingRoom).facilities || [],
      status: item.status || 'available',
      room_id: (item as MeetingBooking).room_id || '',
      room_name: (item as MeetingBooking).room_name || '',
      title: (item as MeetingBooking).title || '',
      start_time: (item as MeetingBooking).start_time || '',
      end_time: (item as MeetingBooking).end_time || '',
      organizer: (item as MeetingBooking).organizer || '',
    });
    setShowDialog(true);
  };

  const handleViewDetail = (item: MeetingRoom | MeetingBooking) => {
    setSelectedItem(item);
    setShowDetailDialog(true);
  };

  const resetForm = () => {
    setSelectedItem(null);
    setFormData({
      name: '',
      location: '',
      capacity: 10,
      facilities: [],
      status: 'available',
      room_id: '',
      room_name: '',
      title: '',
      start_time: '',
      end_time: '',
      organizer: '',
    });
  };

  const handleSearch = (value: string) => {
    setSearchTerm(value);
    setCurrentPage(1);
  };

  const columns: ColumnDef<MeetingRoom | MeetingBooking>[] = useMemo(
    () => [
      {
        id: 'name',
        label: activeTab === 0 ? '会议室名称' : '会议主题',
        render: (row) => (activeTab === 0 ? (row as MeetingRoom).name : (row as MeetingBooking).title),
        sortable: true,
      },
      {
        id: 'location',
        label: activeTab === 0 ? '位置' : '会议室',
        render: (row) =>
          activeTab === 0
            ? (row as MeetingRoom).location || '-'
            : (row as MeetingBooking).room_name || '-',
      },
      {
        id: 'capacity',
        label: activeTab === 0 ? '容纳人数' : '状态',
        render: (row) =>
          activeTab === 0 ? (row as MeetingRoom).capacity || '-' : '-',
      },
      {
        id: 'time',
        label: activeTab === 0 ? '设施' : '时间',
        render: (row) =>
          activeTab === 0
            ? ((row as MeetingRoom).facilities || []).join(', ') || '-'
            : `${(row as MeetingBooking).start_time?.slice(11, 16) || '-'} - ${(row as MeetingBooking).end_time?.slice(11, 16) || '-'}`,
      },
      {
        id: 'status',
        label: '状态',
        render: (row) => getStatusBadge(row.status),
      },
      {
        id: 'created_at',
        label: '创建时间',
        render: (row) => new Date(row.created_at).toLocaleDateString('zh-CN'),
      },
    ],
    [activeTab]
  );

  const filters: FilterConfig[] = useMemo(
    () => [
      {
        id: 'status',
        label: '状态',
        type: 'select',
        options:
          activeTab === 0
            ? [
                { label: '全部状态', value: 'all' },
                { label: '可用', value: 'available' },
                { label: '占用中', value: 'occupied' },
                { label: '维护中', value: 'maintenance' },
                { label: '不可用', value: 'unavailable' },
              ]
            : [
                { label: '全部状态', value: 'all' },
                { label: '待确认', value: 'pending' },
                { label: '已确认', value: 'confirmed' },
                { label: '已完成', value: 'completed' },
                { label: '已取消', value: 'cancelled' },
              ],
        value: statusFilter,
        onChange: (value: unknown) => {
          setStatusFilter(value as string);
          setCurrentPage(1);
        },
      },
    ],
    [statusFilter, activeTab]
  );

  const rowActions: RowAction<MeetingRoom | MeetingBooking>[] = useMemo(
    () => [
      {
        label: '查看详情',
        icon: <Eye size={16} />,
        onClick: handleViewDetail,
      },
      {
        label: '编辑',
        icon: <Edit size={16} />,
        onClick: handleEdit,
      },
      {
        label: '删除',
        icon: <Trash2 size={16} />,
        color: 'error',
        onClick: (row) => handleDelete(row.id),
        confirm: true,
        confirmMessage: '确定要删除这条记录吗?',
      },
    ],
    []
  );

  const handleOpenCreate = () => {
    resetForm();
    setShowDialog(true);
  };

  const availableRooms = rooms.filter((r) => r.status === 'available').length;
  const todayBookings = bookings.filter((b) => b.start_time?.startsWith(new Date().toISOString().slice(0, 10))).length;

  const statsContent = (
    <Box
      sx={{
        display: 'grid',
        gridTemplateColumns: { xs: 'repeat(2, 1fr)', md: 'repeat(4, 1fr)' },
        gap: 2,
        mb: 3,
      }}
    >
      <Box sx={{ p: 2, bgcolor: ct.secondary[100], borderRadius: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
          {activeTab === 0 ? (
            <Calendar size={18} sx={{ color: 'secondary.700' }} />
          ) : (
            <CalendarCheck size={18} sx={{ color: 'secondary.700' }} />
          )}
          <Box component='span' sx={{ color: 'text.secondary', fontSize: 14 }}>
            {activeTab === 0 ? '会议室总数' : '预订总数'}
          </Box>
        </Box>
        <Box sx={{ fontWeight: 700, fontSize: 24, color: 'secondary.700' }}>{data.length}</Box>
      </Box>
      <Box sx={{ p: 2, bgcolor: 'success.lighter', borderRadius: 3 }}>
        <Box sx={{ color: 'text.secondary', fontSize: 14, mb: 1 }}>
          {activeTab === 0 ? '可用会议室' : '今日预订'}
        </Box>
        <Box sx={{ fontWeight: 700, fontSize: 24, color: 'success.700' }}>
          {activeTab === 0 ? availableRooms : todayBookings}
        </Box>
      </Box>
      <Box sx={{ p: 2, bgcolor: 'warning.light', borderRadius: 3 }}>
        <Box sx={{ color: 'text.secondary', fontSize: 14, mb: 1 }}>
          {activeTab === 0 ? '占用中' : '待确认'}
        </Box>
        <Box sx={{ fontWeight: 700, fontSize: 24, color: 'warning.700' }}>
          {activeTab === 0
            ? rooms.filter((r) => r.status === 'occupied').length
            : bookings.filter((b) => b.status === 'pending').length}
        </Box>
      </Box>
      <Box sx={{ p: 2, bgcolor: 'error.lighter', borderRadius: 3 }}>
        <Box sx={{ color: 'text.secondary', fontSize: 14, mb: 1 }}>
          {activeTab === 0 ? '维护/不可用' : '已取消'}
        </Box>
        <Box sx={{ fontWeight: 700, fontSize: 24, color: 'error.dark' }}>
          {activeTab === 0
            ? rooms.filter((r) => ['maintenance', 'unavailable'].includes(r.status)).length
            : bookings.filter((b) => b.status === 'cancelled').length}
        </Box>
      </Box>
    </Box>
  );

  if (loading) return <LoadingSpinner />;

  return (
    <PageContainer
      autoTitle
      autoBreadcrumbs
      headerProps={{
        pageIcon: activeTab === 0 ? <Calendar style={{ width: 20, height: 20 }} /> : <CalendarCheck style={{ width: 20, height: 20 }} />,
        pageGradient: `linear-gradient(135deg, ${ct.primary.main} 0%, ${ct.primary.dark} 100%)`,
      }}
    >
      <Tabs
        value={activeTab}
        onChange={(_, v) => {
          setActiveTab(v);
          setCurrentPage(1);
        }}
        sx={{ mb: 3 }}
      >
        <Tab label='会议室管理' icon={<Calendar size={16} />} />
        <Tab label='会议室预订' icon={<CalendarCheck size={16} />} />
      </Tabs>

      <ListPageTemplate
        title=''
        subtitle=''
        columns={columns}
        data={data}
        loading={loading}
        filters={filters}
        searchable
        searchPlaceholder={activeTab === 0 ? '搜索会议室名称...' : '搜索会议主题...'}
        searchValue={searchTerm}
        onSearch={handleSearch}
        pagination={{
          page: currentPage - 1,
          pageSize,
          total,
          onPageChange: (page) => setCurrentPage(page + 1),
        }}
        selectable
        selectedIds={selectedIds}
        onSelectionChange={(ids) => setSelectedIds(ids.map(String))}
        actions={[
          {
            label: `新增${activeTab === 0 ? '会议室' : '预订'}`,
            icon: <Save size={16} />,
            onClick: handleOpenCreate,
          },
        ]}
        rowActions={rowActions}
        headerContent={statsContent}
        emptyMessage={`暂无${activeTab === 0 ? '会议室' : '预订'}数据`}
        getRowId={(row) => row.id}
      />

      <Dialog
        open={showDialog}
        onClose={() => setShowDialog(false)}
        maxWidth='md'
      >
        <DialogTitle>{selectedItem ? '编辑记录' : `新增${activeTab === 0 ? '会议室' : '预订'}`}</DialogTitle>
        <DialogContent>
          <form onSubmit={handleSubmit}>
            <Box
              sx={{
                display: 'grid',
                gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' },
                gap: 2,
                py: 2,
              }}
            >
              {activeTab === 0 ? (
                <>
                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                    <InputLabel htmlFor='name'>会议室名称 *</InputLabel>
                    <TextField
                      id='name'
                      required
                      size='small'
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    />
                  </Box>
                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                    <InputLabel htmlFor='location'>位置</InputLabel>
                    <TextField
                      id='location'
                      size='small'
                      value={formData.location || ''}
                      onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                    />
                  </Box>
                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                    <InputLabel htmlFor='capacity'>容纳人数</InputLabel>
                    <TextField
                      id='capacity'
                      size='small'
                      type='number'
                      value={formData.capacity}
                      onChange={(e) =>
                        setFormData({ ...formData, capacity: parseInt(e.target.value) || 10 })
                      }
                    />
                  </Box>
                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                    <InputLabel htmlFor='facilities'>设施</InputLabel>
                    <TextField
                      id='facilities'
                      size='small'
                      value={(formData.facilities || []).join(', ')}
                      onChange={(e) => setFormData({ ...formData, facilities: e.target.value.split(',').map((s) => s.trim()).filter(Boolean) })}
                    />
                  </Box>
                </>
              ) : (
                <>
                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                    <InputLabel htmlFor='room_name'>会议室 *</InputLabel>
                    <TextField
                      id='room_name'
                      required
                      size='small'
                      value={formData.room_name}
                      onChange={(e) => setFormData({ ...formData, room_name: e.target.value })}
                    />
                  </Box>
                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                    <InputLabel htmlFor='title'>会议主题 *</InputLabel>
                    <TextField
                      id='title'
                      required
                      size='small'
                      value={formData.title}
                      onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    />
                  </Box>
                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                    <InputLabel htmlFor='start_time'>开始时间 *</InputLabel>
                    <TextField
                      id='start_time'
                      required
                      size='small'
                      type='datetime-local'
                      value={formData.start_time || ''}
                      onChange={(e) => setFormData({ ...formData, start_time: e.target.value })}
                    />
                  </Box>
                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                    <InputLabel htmlFor='end_time'>结束时间 *</InputLabel>
                    <TextField
                      id='end_time'
                      required
                      size='small'
                      type='datetime-local'
                      value={formData.end_time || ''}
                      onChange={(e) => setFormData({ ...formData, end_time: e.target.value })}
                    />
                  </Box>
                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                    <InputLabel htmlFor='organizer'>组织者</InputLabel>
                    <TextField
                      id='organizer'
                      size='small'
                      value={formData.organizer || ''}
                      onChange={(e) => setFormData({ ...formData, organizer: e.target.value })}
                    />
                  </Box>
                </>
              )}
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                <InputLabel htmlFor='status'>状态</InputLabel>
                <FormControl fullWidth size='small'>
                  <Select
                    id='status'
                    value={formData.status || (activeTab === 0 ? 'available' : 'pending')}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                  >
                    {activeTab === 0 ? (
                      <>
                        <MenuItem value='available'>可用</MenuItem>
                        <MenuItem value='occupied'>占用中</MenuItem>
                        <MenuItem value='maintenance'>维护中</MenuItem>
                        <MenuItem value='unavailable'>不可用</MenuItem>
                      </>
                    ) : (
                      <>
                        <MenuItem value='pending'>待确认</MenuItem>
                        <MenuItem value='confirmed'>已确认</MenuItem>
                        <MenuItem value='completed'>已完成</MenuItem>
                        <MenuItem value='cancelled'>已取消</MenuItem>
                      </>
                    )}
                  </Select>
                </FormControl>
              </Box>
            </Box>

            <DialogActions sx={{ mt: 2 }}>
              <Button type='button' variant='outlined' onClick={() => setShowDialog(false)}>
                取消
              </Button>
              <Button type='submit' variant='contained' startIcon={<Save size={16} />}>
                保存
              </Button>
            </DialogActions>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog
        open={showDetailDialog}
        onClose={() => setShowDetailDialog(false)}
        maxWidth='md'
      >
        <DialogTitle>{activeTab === 0 ? '会议室' : '预订'}详情</DialogTitle>
        <DialogContent>
          {selectedItem && (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
              <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 2 }}>
                <Box>
                  <InputLabel sx={{ color: 'text.secondary', fontSize: 12 }}>名称</InputLabel>
                  <Box sx={{ fontWeight: 500 }}>
                    {activeTab === 0 ? (selectedItem as MeetingRoom).name : (selectedItem as MeetingBooking).title}
                  </Box>
                </Box>
                <Box>
                  <InputLabel sx={{ color: 'text.secondary', fontSize: 12 }}>位置/会议室</InputLabel>
                  <Box component='span'>
                    {activeTab === 0
                      ? (selectedItem as MeetingRoom).location || '-'
                      : (selectedItem as MeetingBooking).room_name || '-'}
                  </Box>
                </Box>
                {activeTab === 0 && (
                  <Box>
                    <InputLabel sx={{ color: 'text.secondary', fontSize: 12 }}>容纳人数</InputLabel>
                    <Box component='span'>{(selectedItem as MeetingRoom).capacity || '-'}</Box>
                  </Box>
                )}
                {activeTab === 1 && (
                  <Box>
                    <InputLabel sx={{ color: 'text.secondary', fontSize: 12 }}>开始时间</InputLabel>
                    <Box component='span'>{(selectedItem as MeetingBooking).start_time || '-'}</Box>
                  </Box>
                )}
                {activeTab === 0 && (
                  <Box>
                    <InputLabel sx={{ color: 'text.secondary', fontSize: 12 }}>设施</InputLabel>
                    <Box component='span'>{(selectedItem as MeetingRoom).facilities || '-'}</Box>
                  </Box>
                )}
                {activeTab === 1 && (
                  <Box>
                    <InputLabel sx={{ color: 'text.secondary', fontSize: 12 }}>结束时间</InputLabel>
                    <Box component='span'>{(selectedItem as MeetingBooking).end_time || '-'}</Box>
                  </Box>
                )}
                <Box>
                  <InputLabel sx={{ color: 'text.secondary', fontSize: 12 }}>状态</InputLabel>
                  <Box>{getStatusBadge(selectedItem.status)}</Box>
                </Box>
                <Box>
                  <InputLabel sx={{ color: 'text.secondary', fontSize: 12 }}>创建时间</InputLabel>
                  <Box component='span'>{new Date(selectedItem.created_at).toLocaleString('zh-CN')}</Box>
                </Box>
              </Box>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowDetailDialog(false)}>关闭</Button>
        </DialogActions>
      </Dialog>
    </PageContainer>
  );
};

export default MeetingRoomPage;