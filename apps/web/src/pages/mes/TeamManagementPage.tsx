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
import React, { useState, useMemo, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import type { Team, TeamMember, CreateTeamRequest, UpdateTeamRequest } from '@/api/mes';
import { mesApi } from '@/api/mes';
import { LoadingSpinner } from '@topems/shared-components';
import {
  ListPageTemplate,
  type ColumnDef,
  type RowAction,
  type FilterConfig,
} from '@/components/templates';
import { Plus, Edit, Trash2, Eye, Users } from 'lucide-react';
import { designTokens } from '@/theme/tokens';
import { useCrudMutations } from '@/hooks';

import { useTranslation } from 'react-i18next';
const ct = designTokens.colors;

const TeamManagementPage: React.FC = () => {
  const { t } = useTranslation();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize] = useState(10);
  const [showDialog, setShowDialog] = useState(false);
  const [showDetailDialog, setShowDetailDialog] = useState(false);
  const [selectedTeam, setSelectedTeam] = useState<Team | null>(null);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [formData, setFormData] = useState<CreateTeamRequest>({
    team_code: '',
    team_name: '',
    team_type: 'production',
    description: '',
  });

  const teamsQuery = useQuery({
    queryKey: ['mes-teams', currentPage, pageSize, searchTerm, statusFilter],
    queryFn: async () => {
      const params: Record<string, unknown> = {
        page: currentPage - 1,
        pagesize: pageSize,
      };
      if (searchTerm) params.search = searchTerm;
      if (statusFilter !== 'all') params.status = statusFilter;

      const response = await mesApi.teams.list(params);
      if (!response.success || !response.data) {
        throw new Error(response.message || t('mes.team_management_page.list'));
      }
      return {
        items: response.data.teams || [],
        total: response.data.total || 0,
      };
    },
    staleTime: 5 * 60 * 1000,
    retry: 2,
  });

  const teams = teamsQuery.data?.items ?? [];
  const total = teamsQuery.data?.total ?? 0;
  const loading = teamsQuery.isLoading;

  const teamMembersQuery = useQuery({
    queryKey: ['mes-team-members', selectedTeam?.id],
    queryFn: async () => {
      if (!selectedTeam?.id) return { items: [] as TeamMember[] };
      const response = await mesApi.teams.getMembers(selectedTeam.id);
      if (!response.success || !response.data) {
        throw new Error(response.message || t('mes.team_management_page.fail'));
      }
      return { items: response.data.members || [] };
    },
    enabled: !!selectedTeam?.id && showDetailDialog,
    staleTime: 5 * 60 * 1000,
  });

  const teamMembers = teamMembersQuery.data?.items ?? [];
  const membersLoading = teamMembersQuery.isLoading;

  const { createMutation, updateMutation, deleteMutation } = useCrudMutations<
    CreateTeamRequest,
    UpdateTeamRequest,
    string
  >({
    queryKeyToInvalidate: ['mes-teams'],
    createFn: async (data) => {
      const response = await mesApi.teams.create(data);
      if (!response.success) {
        throw new Error(response.message || '创建班组失败');
      }
      return response.data;
    },
    updateFn: async ({ id, data }) => {
      const response = await mesApi.teams.update(String(id), data);
      if (!response.success) {
        throw new Error(response.message || '更新班组失败');
      }
      return response.data;
    },
    deleteFn: async (id) => {
      const response = await mesApi.teams.delete(String(id));
      if (!response.success) {
        throw new Error(response.message || '删除班组失败');
      }
      return response.data;
    },
    entityName: '班组',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (selectedTeam) {
        await updateMutation.mutateAsync({
          id: selectedTeam.id,
          data: formData as UpdateTeamRequest,
        });
      } else {
        await createMutation.mutateAsync(formData);
      }
      setShowDialog(false);
      resetForm();
    } catch {}
  };

  const handleDelete = useCallback(
    async (id: string) => {
      if (!window.confirm(t('mes.team_management_page.confirm'))) return;
      try {
        await deleteMutation.mutateAsync(id);
      } catch {}
    },
    [deleteMutation]
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

  const handleViewDetail = useCallback((team: Team) => {
    setSelectedTeam(team);
    setShowDetailDialog(true);
  }, []);

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
      active: { label: t('mes.team_management_page.active'), bg: 'success.lighter', color: 'success.700' },
      inactive: { label: t('mes.team_management_page.status_inactive'), bg: 'grey.100', color: 'text.secondary' },
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

  const getTeamTypeText = (type?: string) => {
    const typeMap: Record<string, string> = {
      production: t('mes.team_management_page.team'),
      maintenance: t('mes.team_management_page.team_1'),
      quality: t('mes.team_management_page.team_2'),
      logistics: t('mes.team_management_page.team_3'),
    };
    return typeMap[type || ''] || type || '-';
  };

  const columns: ColumnDef<Team>[] = useMemo(
    () => [
      { id: 'team_code', label: t('mes.team_management_page.column_team_code'), sortable: true },
      { id: 'team_name', label: t('mes.team_management_page.column_team_name'), sortable: true },
      {
        id: 'team_type',
        label: t('mes.team_management_page.type'),
        render: (row) => getTeamTypeText(row.team_type),
      },
      { id: 'work_station_name', label: t('mes.team_management_page.text_915df3'), sortable: true },
      { id: 'leader_name', label: t('mes.team_management_page.field_leader'), sortable: true },
      { id: 'member_count', label: t('mes.team_management_page.column_member_count'), sortable: true },
      {
        id: 'status',
        label: t('mes.team_management_page.filter_status'),
        render: (row) => getStatusBadge(row.status),
      },
    ],
    []
  );

  const filters: FilterConfig[] = useMemo(
    () => [
      {
        id: 'status',
        label: t('mes.team_management_page.filter_status'),
        type: 'select',
        options: [
          { label: t('mes.team_management_page.filter_option_all_status'), value: 'all' },
          { label: t('mes.team_management_page.active'), value: 'active' },
          { label: t('mes.team_management_page.status_inactive'), value: 'inactive' },
        ],
        value: statusFilter,
        onChange: (value: unknown) => {
          setStatusFilter(value as string);
          setCurrentPage(1);
        },
      },
    ],
    [statusFilter]
  );

  const rowActions: RowAction<Team>[] = useMemo(
    () => [
      {
        label: t('mes.team_management_page.action_view_detail'),
        icon: <Eye size={16} />,
        onClick: handleViewDetail,
      },
      {
        label: t('mes.team_management_page.action_edit'),
        icon: <Edit size={16} />,
        onClick: handleEdit,
      },
      {
        label: t('mes.team_management_page.action_delete'),
        icon: <Trash2 size={16} />,
        color: 'error',
        onClick: (row) => handleDelete(row.id),
        confirm: true,
        confirmMessage: t('mes.team_management_page.confirm'),
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
      <Box sx={{ p: 2, bgcolor: ct.secondary[100], borderRadius: 3 }}>
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
      title={t('mes.team_management_page.breadcrumb_current')}
      subtitle={t('mes.team_management_page.team_code')}
      headerProps={{
        pageIcon: <Users style={{ width: 20, height: 20 }} />,
        pageGradient: `linear-gradient(135deg, ${ct.success.main} 0%, ${ct.success.dark} 100%)`,
      }}
    >
      <ListPageTemplate
        title=''
        subtitle=''
        columns={columns}
        data={teams}
        loading={
          loading ||
          createMutation.isPending ||
          updateMutation.isPending ||
          deleteMutation.isPending
        }
        filters={filters}
        searchable
        searchPlaceholder={t('mes.team_management_page.team_code_1')}
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
            label: t('mes.team_management_page.dialog_create_title'),
            icon: <Plus size={16} />,
            onClick: handleOpenCreate,
          },
        ]}
        rowActions={rowActions}
        headerContent={statsContent}
        emptyMessage={t('mes.team_management_page.empty_message')}
        getRowId={(row) => row.id}
      />

      <Dialog
        open={showDialog}
        onClose={() => setShowDialog(false)}
        maxWidth='md'
      >
        <DialogTitle>{selectedTeam ? t('mes.team_management_page.dialog_edit_title') : t('mes.team_management_page.dialog_create_title')}</DialogTitle>
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
            {selectedTeam ? t('mes.team_management_page.info') : t('mes.team_management_page.info_1')}
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
                disabled={createMutation.isPending || updateMutation.isPending}
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
                                  label={member.status === 'active' ? t('mes.team_management_page.text_b5509b') : t('mes.team_management_page.text_583e79')}
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
