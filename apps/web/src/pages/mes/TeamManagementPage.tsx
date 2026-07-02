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
  Stack,
  Typography,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
} from '@mui/material';
import { PageContainer } from '@/components/common';
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import type { Team, TeamMember, CreateTeamRequest, UpdateTeamRequest } from '@/api/mes';
import { mesApi } from '@/api/mes';
import { useAppStore } from '@/store';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';
import {
  ListPageTemplate,
  type ColumnDef,
  type RowAction,
  type FilterConfig,
} from '@/components/templates';
import { Plus, Edit, Trash2, Eye, Users } from 'lucide-react';
import { apiLogger } from '@/utils/logger';

const TeamManagementPage: React.FC = () => {
  const [teams, setTeams] = useState<Team[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize] = useState(10);
  const [total, setTotal] = useState(0);
  const [showDialog, setShowDialog] = useState(false);
  const [showDetailDialog, setShowDetailDialog] = useState(false);
  const [selectedTeam, setSelectedTeam] = useState<Team | null>(null);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [membersLoading, setMembersLoading] = useState(false);
  const [formData, setFormData] = useState<CreateTeamRequest>({
    team_code: '',
    team_name: '',
    team_type: 'production',
    description: '',
  });

  const { addNotification } = useAppStore();

  const loadTeams = useCallback(async () => {
    try {
      setLoading(true);
      const params: any = {
        page: currentPage - 1,
        pagesize: pageSize,
      };
      if (searchTerm) params.search = searchTerm;
      if (statusFilter !== 'all') params.status = statusFilter;

      const response = await mesApi.teams.list(params);
      if (response.success && response.data) {
        setTeams(response.data.teams || []);
        setTotal(response.data.total || 0);
      }
    } catch (error: unknown) {
      apiLogger.error('加载班组列表失败:', error);
      addNotification({
        type: 'error',
        title: '加载失败',
        message: '无法加载班组列表',
      });
    } finally {
      setLoading(false);
    }
  }, [currentPage, pageSize, searchTerm, statusFilter, addNotification]);

  useEffect(() => {
    loadTeams();
  }, [loadTeams]);

  const loadTeamMembers = useCallback(async (teamId: string) => {
    try {
      setMembersLoading(true);
      const response = await mesApi.teams.getMembers(teamId);
      if (response.success && response.data) {
        setTeamMembers(response.data.members || []);
      }
    } catch (error: unknown) {
      apiLogger.error('加载班组成员失败:', error);
    } finally {
      setMembersLoading(false);
    }
  }, []);

  const getStatusText = (status: string) => {
    const statusMap: Record<string, string> = {
      active: '活跃',
      inactive: '停用',
    };
    return statusMap[status] || status;
  };

  const getTeamTypeText = (type?: string) => {
    const typeMap: Record<string, string> = {
      production: '生产班组',
      maintenance: '维修班组',
      quality: '质检班组',
      logistics: '物流班组',
    };
    return typeMap[type || ''] || type || '-';
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (selectedTeam) {
        await mesApi.teams.update(selectedTeam.id, formData as UpdateTeamRequest);
        addNotification({
          type: 'success',
          title: '更新成功',
          message: '班组信息已更新',
        });
      } else {
        await mesApi.teams.create(formData);
        addNotification({
          type: 'success',
          title: '创建成功',
          message: '新班组已创建',
        });
      }
      setShowDialog(false);
      resetForm();
      loadTeams();
    } catch (error: unknown) {
      apiLogger.error('操作失败:', error);
      addNotification({
        type: 'error',
        title: '操作失败',
        message: selectedTeam ? '更新班组失败' : '创建班组失败',
      });
    }
  };

  const handleDelete = useCallback(
    async (id: string) => {
      if (!window.confirm('确定要删除这个班组吗?')) return;
      try {
        await mesApi.teams.delete(id);
        addNotification({
          type: 'success',
          title: '删除成功',
          message: '班组已删除',
        });
        loadTeams();
      } catch (error: unknown) {
        apiLogger.error('删除失败:', error);
        addNotification({
          type: 'error',
          title: '删除失败',
          message: '无法删除班组',
        });
      }
    },
    [loadTeams, addNotification]
  );

  const handleEdit = useCallback((team: Team) => {
    setSelectedTeam(team);
    setFormData({
      team_code: team.team_code,
      team_name: team.team_name,
      team_type: team.team_type,
      work_station_id: team.work_station_id,
      leader_id: team.leader_id,
      description: team.description,
    });
    setShowDialog(true);
  }, []);

  const handleViewDetail = useCallback(
    (team: Team) => {
      setSelectedTeam(team);
      loadTeamMembers(team.id);
      setShowDetailDialog(true);
    },
    [loadTeamMembers]
  );

  const resetForm = () => {
    setSelectedTeam(null);
    setFormData({
      team_code: '',
      team_name: '',
      team_type: 'production',
      description: '',
    });
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
      active: { label: '活跃', bg: 'success.lighter', color: 'success.700' },
      inactive: { label: '停用', bg: 'grey.100', color: 'text.secondary' },
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

  const columns: ColumnDef<Team>[] = useMemo(
    () => [
      { id: 'team_code', label: '班组编码', sortable: true },
      { id: 'team_name', label: '班组名称', sortable: true },
      {
        id: 'team_type',
        label: '班组类型',
        render: (row) => getTeamTypeText(row.team_type),
      },
      { id: 'work_station_name', label: '所属工作站', sortable: true },
      { id: 'leader_name', label: '班组长', sortable: true },
      { id: 'member_count', label: '成员数', sortable: true },
      {
        id: 'status',
        label: '状态',
        render: (row) => getStatusBadge(row.status),
      },
    ],
    []
  );

  const filters: FilterConfig[] = useMemo(
    () => [
      {
        id: 'status',
        label: '状态',
        type: 'select',
        options: [
          { label: '全部状态', value: 'all' },
          { label: '活跃', value: 'active' },
          { label: '停用', value: 'inactive' },
        ],
        value: statusFilter,
        onChange: (value) => {
          setStatusFilter(value);
          setCurrentPage(1);
        },
      },
    ],
    [statusFilter]
  );

  const rowActions: RowAction<Team>[] = useMemo(
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
        confirmMessage: '确定要删除这个班组吗?',
      },
    ],
    [handleViewDetail, handleEdit, handleDelete]
  );

  const handleOpenCreate = () => {
    resetForm();
    setShowDialog(true);
  };

  const handleSearch = (value: string) => {
    setSearchTerm(value);
    setCurrentPage(1);
  };

  const stats = useMemo(() => {
    return {
      total: teams.length,
      active: teams.filter((t) => t.status === 'active').length,
      inactive: teams.filter((t) => t.status === 'inactive').length,
      total_members: teams.reduce((sum, t) => sum + (t.member_count || 0), 0),
    };
  }, [teams]);

  if (loading) return <LoadingSpinner />;

  const statsContent = (
    <Box
      sx={{
        display: 'grid',
        gridTemplateColumns: { xs: 'repeat(2, 1fr)', md: 'repeat(4, 1fr)' },
        gap: 2,
        mb: 3,
      }}
    >
      <Box sx={{ p: 2, bgcolor: 'grey.100', borderRadius: 3 }}>
        <Typography
          variant='body2'
          sx={{ color: 'text.secondary' }}
        >
          总班组数
        </Typography>
        <Typography
          variant='h5'
          sx={{ fontWeight: 700 }}
        >
          {stats.total}
        </Typography>
      </Box>
      <Box sx={{ p: 2, bgcolor: 'success.lighter', borderRadius: 3 }}>
        <Typography
          variant='body2'
          sx={{ color: 'text.secondary' }}
        >
          活跃班组
        </Typography>
        <Typography
          variant='h5'
          sx={{ fontWeight: 700 }}
        >
          {stats.active}
        </Typography>
      </Box>
      <Box sx={{ p: 2, bgcolor: 'grey.100', borderRadius: 3 }}>
        <Typography
          variant='body2'
          sx={{ color: 'text.secondary' }}
        >
          停用班组
        </Typography>
        <Typography
          variant='h5'
          sx={{ fontWeight: 700 }}
        >
          {stats.inactive}
        </Typography>
      </Box>
      <Box sx={{ p: 2, bgcolor: '#e0e7ff', borderRadius: 3 }}>
        <Typography
          variant='body2'
          sx={{ color: 'text.secondary' }}
        >
          总成员数
        </Typography>
        <Typography
          variant='h5'
          sx={{ fontWeight: 700, color: 'secondary.700' }}
        >
          {stats.total_members}
        </Typography>
      </Box>
    </Box>
  );

  return (
    <PageContainer
      title='班组管理'
      subtitle='管理生产班组信息,包括班组编码、名称、类型、成员等'
      headerProps={{
        pageIcon: <Users style={{ width: 20, height: 20 }} />,
        pageGradient: 'linear-gradient(135deg, #10B981 0%, #059669 100%)',
      }}
    >
      <ListPageTemplate
        title=''
        subtitle=''
        columns={columns}
        data={teams}
        loading={loading}
        filters={filters}
        searchable
        searchPlaceholder='搜索班组编码或名称...'
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
            label: '新增班组',
            icon: <Plus size={16} />,
            onClick: handleOpenCreate,
          },
        ]}
        rowActions={rowActions}
        headerContent={statsContent}
        emptyMessage='暂无班组数据'
        getRowId={(row) => row.id}
      />

      <Dialog
        open={showDialog}
        onClose={() => setShowDialog(false)}
        maxWidth='md'
      >
        <DialogTitle>{selectedTeam ? '编辑班组' : '新增班组'}</DialogTitle>
        <DialogContent>
          <Box
            component='span'
            sx={{
              display: 'block',
              color: 'text.secondary',
              mb: 2,
              fontSize: 14,
            }}
          >
            {selectedTeam ? '修改班组信息' : '填写新班组信息'}
          </Box>
          <form onSubmit={handleSubmit}>
            <Box
              sx={{
                display: 'grid',
                gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' },
                gap: 2,
                py: 2,
              }}
            >
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                <InputLabel htmlFor='team_code'>班组编码 *</InputLabel>
                <TextField
                  id='team_code'
                  required
                  size='small'
                  value={formData.team_code}
                  onChange={(e) => setFormData({ ...formData, team_code: e.target.value })}
                />
              </Box>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                <InputLabel htmlFor='team_name'>班组名称 *</InputLabel>
                <TextField
                  id='team_name'
                  required
                  size='small'
                  value={formData.team_name}
                  onChange={(e) => setFormData({ ...formData, team_name: e.target.value })}
                />
              </Box>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                <InputLabel htmlFor='team_type'>班组类型</InputLabel>
                <FormControl
                  fullWidth
                  size='small'
                >
                  <Select
                    id='team_type'
                    value={formData.team_type || 'production'}
                    onChange={(e) => setFormData({ ...formData, team_type: e.target.value })}
                  >
                    <MenuItem value='production'>生产班组</MenuItem>
                    <MenuItem value='maintenance'>维修班组</MenuItem>
                    <MenuItem value='quality'>质检班组</MenuItem>
                    <MenuItem value='logistics'>物流班组</MenuItem>
                  </Select>
                </FormControl>
              </Box>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                <InputLabel htmlFor='work_station_id'>所属工作站</InputLabel>
                <TextField
                  id='work_station_id'
                  size='small'
                  value={formData.work_station_id || ''}
                  onChange={(e) => setFormData({ ...formData, work_station_id: e.target.value })}
                />
              </Box>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                <InputLabel htmlFor='leader_id'>班组长ID</InputLabel>
                <TextField
                  id='leader_id'
                  size='small'
                  value={formData.leader_id || ''}
                  onChange={(e) => setFormData({ ...formData, leader_id: e.target.value })}
                />
              </Box>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1, gridColumn: '1 / -1' }}>
                <InputLabel htmlFor='description'>描述</InputLabel>
                <TextField
                  id='description'
                  size='small'
                  multiline
                  rows={3}
                  value={formData.description || ''}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                />
              </Box>
            </Box>
            <DialogActions>
              <Button
                type='button'
                variant='outlined'
                onClick={() => setShowDialog(false)}
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
        </DialogContent>
      </Dialog>

      <Dialog
        open={showDetailDialog}
        onClose={() => setShowDetailDialog(false)}
        maxWidth='lg'
      >
        <DialogTitle>班组详情</DialogTitle>
        <DialogContent>
          {selectedTeam && (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
              <Box
                sx={{
                  display: 'grid',
                  gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' },
                  gap: 2,
                }}
              >
                <Box>
                  <InputLabel sx={{ color: 'text.secondary', fontSize: 12 }}>班组编码</InputLabel>
                  <Box
                    component='span'
                    sx={{ fontWeight: 500 }}
                  >
                    {selectedTeam.team_code}
                  </Box>
                </Box>
                <Box>
                  <InputLabel sx={{ color: 'text.secondary', fontSize: 12 }}>班组名称</InputLabel>
                  <Box component='span'>{selectedTeam.team_name}</Box>
                </Box>
                <Box>
                  <InputLabel sx={{ color: 'text.secondary', fontSize: 12 }}>班组类型</InputLabel>
                  <Box component='span'>{getTeamTypeText(selectedTeam.team_type)}</Box>
                </Box>
                <Box>
                  <InputLabel sx={{ color: 'text.secondary', fontSize: 12 }}>所属工作站</InputLabel>
                  <Box component='span'>{selectedTeam.work_station_name || '-'}</Box>
                </Box>
                <Box>
                  <InputLabel sx={{ color: 'text.secondary', fontSize: 12 }}>班组长</InputLabel>
                  <Box component='span'>{selectedTeam.leader_name || '-'}</Box>
                </Box>
                <Box>
                  <InputLabel sx={{ color: 'text.secondary', fontSize: 12 }}>成员数</InputLabel>
                  <Box component='span'>{selectedTeam.member_count || 0}</Box>
                </Box>
                <Box>
                  <InputLabel sx={{ color: 'text.secondary', fontSize: 12 }}>状态</InputLabel>
                  <Box>{getStatusBadge(selectedTeam.status)}</Box>
                </Box>
                <Box sx={{ gridColumn: '1 / -1' }}>
                  <InputLabel sx={{ color: 'text.secondary', fontSize: 12 }}>描述</InputLabel>
                  <Box component='span'>{selectedTeam.description || '-'}</Box>
                </Box>
              </Box>

              <Box>
                <Typography
                  variant='h6'
                  sx={{ mb: 2 }}
                >
                  成员列表
                </Typography>
                {membersLoading ? (
                  <LoadingSpinner />
                ) : (
                  <TableContainer
                    component={Paper}
                    variant='outlined'
                  >
                    <Table size='small'>
                      <TableHead>
                        <TableRow>
                          <TableCell>员工编码</TableCell>
                          <TableCell>员工姓名</TableCell>
                          <TableCell>职位</TableCell>
                          <TableCell>加入日期</TableCell>
                          <TableCell>状态</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {teamMembers.length === 0 ? (
                          <TableRow>
                            <TableCell
                              colSpan={5}
                              align='center'
                              sx={{ py: 3, color: 'text.secondary' }}
                            >
                              暂无成员数据
                            </TableCell>
                          </TableRow>
                        ) : (
                          teamMembers.map((member) => (
                            <TableRow key={member.id}>
                              <TableCell>{member.employee_code || '-'}</TableCell>
                              <TableCell>{member.employee_name}</TableCell>
                              <TableCell>{member.position || '-'}</TableCell>
                              <TableCell>
                                {member.join_date
                                  ? new Date(member.join_date).toLocaleDateString('zh-CN')
                                  : '-'}
                              </TableCell>
                              <TableCell>
                                <Chip
                                  size='small'
                                  label={member.status === 'active' ? '在职' : '离职'}
                                  sx={{
                                    backgroundColor:
                                      member.status === 'active' ? 'success.lighter' : 'grey.100',
                                    color:
                                      member.status === 'active' ? 'success.700' : 'text.secondary',
                                    fontWeight: 500,
                                  }}
                                />
                              </TableCell>
                            </TableRow>
                          ))
                        )}
                      </TableBody>
                    </Table>
                  </TableContainer>
                )}
              </Box>
            </Box>
          )}
        </DialogContent>
      </Dialog>
    </PageContainer>
  );
};

export default TeamManagementPage;
