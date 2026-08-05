import {
  Card,
  CardContent,
  Chip,
  Typography,
  Box,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Grid,
  Paper,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Pagination,
} from '@mui/material';
import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';
import { useDebounce } from '@topems/shared-hooks';
import { Search, Shield, User, Calendar, Download, RefreshCw } from 'lucide-react';
import { PageContainer } from '@/components/common';
import { permissionAuditApi } from '@/api/admin/permissionAudit';
import type {
  PermissionChange,
  AccessControlLog,
  PermissionChangeStats,
  AccessControlStats,
} from '@/api/admin/permissionAudit';
import { useNotificationStore } from '@/store';
import { apiLogger } from '@/utils/logger';
import { extractErrorMessage } from '@/utils/errors';

interface PermissionAuditPageProps {
  onNavigate?: (page: string) => void;
}

type TabType = 'permissionChanges' | 'accessControl';

const PermissionAuditPage: React.FC<PermissionAuditPageProps> = () => {
  const { t } = useTranslation();
  const addNotification = useNotificationStore((state) => state.addNotification);
  const [activeTab, setActiveTab] = useState<TabType>('permissionChanges');
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<string>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const debouncedSearch = useDebounce(searchQuery, 300);

  const PER_PAGE = 20;

  const permissionChangesQuery = useQuery<{ items: PermissionChange[]; total: number }>({
    queryKey: ['admin-permission-changes', currentPage, debouncedSearch, filterType],
    queryFn: async () => {
      const response = await permissionAuditApi.listPermissionChanges({
        page: currentPage,
        pagesize: PER_PAGE,
        ...(debouncedSearch ? { search: debouncedSearch } : {}),
        ...(filterType !== 'all' ? { change_type: filterType } : {}),
      });
      if (response.success && response.data) {
        return { items: response.data.items || [], total: response.data.total || 0 };
      }
      return { items: [], total: 0 };
    },
    enabled: activeTab === 'permissionChanges',
    staleTime: 30 * 1000,
  });

  const accessLogsQuery = useQuery<{ items: AccessControlLog[]; total: number }>({
    queryKey: ['admin-access-logs', currentPage, debouncedSearch, filterType],
    queryFn: async () => {
      const response = await permissionAuditApi.listAccessLogs({
        page: currentPage,
        pagesize: PER_PAGE,
        ...(debouncedSearch ? { search: debouncedSearch } : {}),
        ...(filterType !== 'all' ? { action: filterType } : {}),
      });
      if (response.success && response.data) {
        return { items: response.data.items || [], total: response.data.total || 0 };
      }
      return { items: [], total: 0 };
    },
    enabled: activeTab === 'accessControl',
    staleTime: 30 * 1000,
  });

  const permissionStatsQuery = useQuery<PermissionChangeStats | null>({
    queryKey: ['admin-permission-change-stats'],
    queryFn: async () => {
      const res = await permissionAuditApi.getPermissionChangeStats();
      return res.success && res.data ? res.data : null;
    },
    staleTime: 5 * 60 * 1000,
  });

  const accessStatsQuery = useQuery<AccessControlStats | null>({
    queryKey: ['admin-access-control-stats'],
    queryFn: async () => {
      const res = await permissionAuditApi.getAccessControlStats();
      return res.success && res.data ? res.data : null;
    },
    staleTime: 5 * 60 * 1000,
  });

  const loading =
    activeTab === 'permissionChanges'
      ? permissionChangesQuery.isLoading
      : accessLogsQuery.isLoading;
  const permissionChanges = permissionChangesQuery.data?.items ?? [];
  const accessLogs = accessLogsQuery.data?.items ?? [];
  const total =
    activeTab === 'permissionChanges'
      ? (permissionChangesQuery.data?.total ?? 0)
      : (accessLogsQuery.data?.total ?? 0);
  const permissionStats = permissionStatsQuery.data ?? null;
  const accessStats = accessStatsQuery.data ?? null;

  // 切换 Tab 时重置分页、搜索和筛选类型
  useEffect(() => {
    setCurrentPage(1);
    setSearchQuery('');
    setFilterType('all');
  }, [activeTab]);

  // 切换筛选类型时仅重置分页
  useEffect(() => {
    setCurrentPage(1);
  }, [filterType]);

  useEffect(() => {
    if (permissionChangesQuery.isError) {
      apiLogger.error('Failed to load permission changes:', permissionChangesQuery.error);
      addNotification({
        type: 'error',
        message: t('admin:permission_audit_page.load_permission_changes_error', {
          error: extractErrorMessage(permissionChangesQuery.error),
        }),
      });
    }
  }, [permissionChangesQuery.isError, permissionChangesQuery.error, addNotification]);

  useEffect(() => {
    if (accessLogsQuery.isError) {
      apiLogger.error('Failed to load access logs:', accessLogsQuery.error);
      addNotification({
        type: 'error',
        message: t('admin:permission_audit_page.load_access_logs_error', {
          error: extractErrorMessage(accessLogsQuery.error),
        }),
      });
    }
  }, [accessLogsQuery.isError, accessLogsQuery.error, addNotification]);

  useEffect(() => {
    if (permissionStatsQuery.isError) {
      apiLogger.error('Failed to load stats:', permissionStatsQuery.error);
    }
  }, [permissionStatsQuery.isError, permissionStatsQuery.error]);

  useEffect(() => {
    if (accessStatsQuery.isError) {
      apiLogger.error('Failed to load stats:', accessStatsQuery.error);
    }
  }, [accessStatsQuery.isError, accessStatsQuery.error]);

  const handleExport = async () => {
    try {
      const blob =
        activeTab === 'permissionChanges'
          ? await permissionAuditApi.exportPermissionChanges({ format: 'excel' })
          : await permissionAuditApi.exportAccessLogs({ format: 'excel' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${activeTab}_${new Date().toISOString().split('T')[0]}.xlsx`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
      addNotification({ type: 'success', message: '导出成功' });
    } catch (error) {
      apiLogger.error('导出失败:', error);
      addNotification({
        type: 'error',
        message: `导出失败: ${extractErrorMessage(error)}`,
      });
    }
  };

  const getChangeTypeLabel = (type?: string) => {
    const labels: Record<string, string> = {
      role_assignment: t('admin:permission_audit_page.type_role_assignment'),
      role_removal: t('admin:permission_audit_page.type_role_removal'),
      permission_add: t('admin:permission_audit_page.type_permission_add'),
      permission_remove: t('admin:permission_audit_page.type_permission_remove'),
      role_create: t('admin:permission_audit_page.type_role_create'),
      role_update: t('admin:permission_audit_page.type_role_update'),
      role_delete: t('admin:permission_audit_page.type_role_delete'),
      user_create: t('admin:permission_audit_page.type_user_create'),
      user_update: t('admin:permission_audit_page.type_user_update'),
      user_delete: t('admin:permission_audit_page.type_user_delete'),
    };
    return labels[type || ''] || type || '-';
  };

  const getAccessTypeLabel = (type?: string) => {
    const labels: Record<string, string> = {
      login: t('admin:permission_audit_page.type_login'),
      logout: t('admin:permission_audit_page.type_logout'),
      api_access: t('admin:permission_audit_page.type_api_access'),
      page_access: t('admin:permission_audit_page.type_page_access'),
      permission_check: t('admin:permission_audit_page.type_permission_check'),
      denied: t('admin:permission_audit_page.type_denied'),
    };
    return labels[type || ''] || type || '-';
  };

  const getStatusColor = (status?: string) => {
    if (status === 'success') return 'success';
    if (status === 'failed') return 'error';
    if (status === 'denied') return 'warning';
    return 'info';
  };

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return '-';
    const d = new Date(dateStr);
    return isNaN(d.getTime()) ? '-' : d.toLocaleString('zh-CN');
  };

  return (
    <PageContainer
      title={t('admin:permission_audit_page.title')}
      subtitle={t('admin:permission_audit_page.subtitle')}
      headerActions={[
        <Button
          key='refresh'
          onClick={() => {
            if (activeTab === 'permissionChanges') permissionChangesQuery.refetch();
            else accessLogsQuery.refetch();
          }}
          startIcon={<RefreshCw className='w-4 h-4' />}
          variant='outlined'
        >
          {t('admin:permission_audit_page.refresh')}
        </Button>,
        <Button
          key='export'
          onClick={handleExport}
          startIcon={<Download className='w-4 h-4' />}
          variant='contained'
        >
          {t('admin:permission_audit_page.export')}
        </Button>,
      ]}
    >
      <Grid spacing={3}>
        {permissionStats && (
          <Grid size={{ xs: 12, md: 6 }}>
            <Card>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
                  <Shield className='w-5 h-5 text-blue-600' />
                  <Typography variant='h6'>
                    {t('admin:permission_audit_page.permission_change_stats')}
                  </Typography>
                </Box>
                <Grid spacing={2}>
                  <Grid size={{ xs: 6 }}>
                    <Typography
                      variant='body2'
                      color='textSecondary'
                    >
                      {t('admin:permission_audit_page.total_changes')}
                    </Typography>
                    <Typography
                      variant='h4'
                      sx={{ fontWeight: 'bold' }}
                    >
                      {permissionStats.total_changes}
                    </Typography>
                  </Grid>
                  <Grid size={{ xs: 6 }}>
                    <Typography
                      variant='body2'
                      color='textSecondary'
                    >
                      {t('admin:permission_audit_page.today_changes')}
                    </Typography>
                    <Typography
                      variant='h4'
                      sx={{ fontWeight: 'bold' }}
                      color='primary'
                    >
                      {permissionStats.today_changes}
                    </Typography>
                  </Grid>
                  <Grid size={{ xs: 6 }}>
                    <Typography
                      variant='body2'
                      color='textSecondary'
                    >
                      {t('admin:permission_audit_page.role_changes')}
                    </Typography>
                    <Typography
                      variant='h4'
                      sx={{ fontWeight: 'bold' }}
                    >
                      {permissionStats.role_changes}
                    </Typography>
                  </Grid>
                  <Grid size={{ xs: 6 }}>
                    <Typography
                      variant='body2'
                      color='textSecondary'
                    >
                      {t('admin:permission_audit_page.permission_changes')}
                    </Typography>
                    <Typography
                      variant='h4'
                      sx={{ fontWeight: 'bold' }}
                    >
                      {permissionStats.permission_changes}
                    </Typography>
                  </Grid>
                </Grid>
              </CardContent>
            </Card>
          </Grid>
        )}
        {accessStats && (
          <Grid size={{ xs: 12, md: 6 }}>
            <Card>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
                  <User className='w-5 h-5 text-green-600' />
                  <Typography variant='h6'>
                    {t('admin:permission_audit_page.access_control_stats')}
                  </Typography>
                </Box>
                <Grid spacing={2}>
                  <Grid size={{ xs: 6 }}>
                    <Typography
                      variant='body2'
                      color='textSecondary'
                    >
                      {t('admin:permission_audit_page.total_access')}
                    </Typography>
                    <Typography
                      variant='h4'
                      sx={{ fontWeight: 'bold' }}
                    >
                      {accessStats.total_access}
                    </Typography>
                  </Grid>
                  <Grid size={{ xs: 6 }}>
                    <Typography
                      variant='body2'
                      color='textSecondary'
                    >
                      {t('admin:permission_audit_page.today_access')}
                    </Typography>
                    <Typography
                      variant='h4'
                      sx={{ fontWeight: 'bold' }}
                      color='primary'
                    >
                      {accessStats.today_access}
                    </Typography>
                  </Grid>
                  <Grid size={{ xs: 6 }}>
                    <Typography
                      variant='body2'
                      color='textSecondary'
                    >
                      {t('admin:permission_audit_page.login_count')}
                    </Typography>
                    <Typography
                      variant='h4'
                      sx={{ fontWeight: 'bold' }}
                    >
                      {accessStats.login_count}
                    </Typography>
                  </Grid>
                  <Grid size={{ xs: 6 }}>
                    <Typography
                      variant='body2'
                      color='textSecondary'
                    >
                      {t('admin:permission_audit_page.denied_count')}
                    </Typography>
                    <Typography
                      variant='h4'
                      sx={{ fontWeight: 'bold' }}
                      color='error'
                    >
                      {accessStats.denied_count}
                    </Typography>
                  </Grid>
                </Grid>
              </CardContent>
            </Card>
          </Grid>
        )}

        <Grid size={{ xs: 12 }}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3 }}>
                <Button
                  onClick={() => setActiveTab('permissionChanges')}
                  variant={activeTab === 'permissionChanges' ? 'contained' : 'outlined'}
                  startIcon={<Shield className='w-4 h-4' />}
                >
                  {t('admin:permission_audit_page.permission_changes_tab')}
                </Button>
                <Button
                  onClick={() => setActiveTab('accessControl')}
                  variant={activeTab === 'accessControl' ? 'contained' : 'outlined'}
                  startIcon={<User className='w-4 h-4' />}
                >
                  {t('admin:permission_audit_page.access_control_tab')}
                </Button>
              </Box>

              <Box sx={{ display: 'flex', gap: 2, mb: 3 }}>
                <TextField
                  fullWidth
                  label={t('admin:permission_audit_page.search_label')}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder={t('admin:permission_audit_page.search_placeholder')}
                  slotProps={{
                    input: {
                      startAdornment: <Search className='w-4 h-4 mr-2 text-gray-400' />,
                    },
                  }}
                />
                <FormControl
                  fullWidth
                  sx={{ minWidth: 150 }}
                >
                  <InputLabel>{t('admin:permission_audit_page.filter_type')}</InputLabel>
                  <Select
                    value={filterType}
                    onChange={(e) => setFilterType(e.target.value)}
                    label={t('admin:permission_audit_page.filter_type')}
                  >
                    <MenuItem value='all'>{t('admin:permission_audit_page.all_types')}</MenuItem>
                    {activeTab === 'permissionChanges' ? (
                      <>
                        <MenuItem value='role_assignment'>
                          {t('admin:permission_audit_page.type_role_assignment')}
                        </MenuItem>
                        <MenuItem value='role_removal'>
                          {t('admin:permission_audit_page.type_role_removal')}
                        </MenuItem>
                        <MenuItem value='permission_add'>
                          {t('admin:permission_audit_page.type_permission_add')}
                        </MenuItem>
                        <MenuItem value='permission_remove'>
                          {t('admin:permission_audit_page.type_permission_remove')}
                        </MenuItem>
                        <MenuItem value='role_create'>
                          {t('admin:permission_audit_page.type_role_create')}
                        </MenuItem>
                        <MenuItem value='role_update'>
                          {t('admin:permission_audit_page.type_role_update')}
                        </MenuItem>
                        <MenuItem value='role_delete'>
                          {t('admin:permission_audit_page.type_role_delete')}
                        </MenuItem>
                      </>
                    ) : (
                      <>
                        <MenuItem value='login'>
                          {t('admin:permission_audit_page.type_login')}
                        </MenuItem>
                        <MenuItem value='logout'>
                          {t('admin:permission_audit_page.type_logout')}
                        </MenuItem>
                        <MenuItem value='api_access'>
                          {t('admin:permission_audit_page.type_api_access')}
                        </MenuItem>
                        <MenuItem value='page_access'>
                          {t('admin:permission_audit_page.type_page_access')}
                        </MenuItem>
                        <MenuItem value='denied'>
                          {t('admin:permission_audit_page.type_denied')}
                        </MenuItem>
                      </>
                    )}
                  </Select>
                </FormControl>
              </Box>

              <TableContainer component={Paper}>
                <Table>
                  <TableHead>
                    <TableRow>
                      {activeTab === 'permissionChanges' ? (
                        <>
                          <TableCell>{t('admin:permission_audit_page.col_time')}</TableCell>
                          <TableCell>{t('admin:permission_audit_page.col_change_type')}</TableCell>
                          <TableCell>{t('admin:permission_audit_page.col_operator')}</TableCell>
                          <TableCell>{t('admin:permission_audit_page.col_target_user')}</TableCell>
                          <TableCell>
                            {t('admin:permission_audit_page.col_role_permission')}
                          </TableCell>
                          <TableCell>{t('admin:permission_audit_page.col_old_value')}</TableCell>
                          <TableCell>{t('admin:permission_audit_page.col_new_value')}</TableCell>
                          <TableCell>{t('admin:permission_audit_page.col_status')}</TableCell>
                        </>
                      ) : (
                        <>
                          <TableCell>{t('admin:permission_audit_page.col_time')}</TableCell>
                          <TableCell>{t('admin:permission_audit_page.col_access_type')}</TableCell>
                          <TableCell>{t('admin:permission_audit_page.col_user')}</TableCell>
                          <TableCell>
                            {t('admin:permission_audit_page.col_resource_path')}
                          </TableCell>
                          <TableCell>{t('admin:permission_audit_page.col_ip_address')}</TableCell>
                          <TableCell>{t('admin:permission_audit_page.col_device')}</TableCell>
                          <TableCell>{t('admin:permission_audit_page.col_status')}</TableCell>
                          <TableCell>
                            {t('admin:permission_audit_page.col_response_time')}
                          </TableCell>
                        </>
                      )}
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {loading ? (
                      <TableRow>
                        <TableCell colSpan={8}>
                          <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
                            <Typography
                              variant='body1'
                              color='textSecondary'
                            >
                              {t('admin:permission_audit_page.loading')}
                            </Typography>
                          </Box>
                        </TableCell>
                      </TableRow>
                    ) : (activeTab === 'permissionChanges' ? permissionChanges : accessLogs)
                        .length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={8}>
                          <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
                            <Typography
                              variant='body1'
                              color='textSecondary'
                            >
                              暂无数据
                            </Typography>
                          </Box>
                        </TableCell>
                      </TableRow>
                    ) : activeTab === 'permissionChanges' ? (
                      permissionChanges.map((change) => (
                        <TableRow key={change.id}>
                          <TableCell>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                              <Calendar className='w-4 h-4' />
                              <Typography variant='body2'>
                                {formatDate(change.created_at)}
                              </Typography>
                            </Box>
                          </TableCell>
                          <TableCell>
                            <Chip
                              label={getChangeTypeLabel(change.change_type)}
                              size='small'
                            />
                          </TableCell>
                          <TableCell>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                              <User className='w-4 h-4' />
                              <Typography>{change.operator_name || change.operator_id}</Typography>
                            </Box>
                          </TableCell>
                          <TableCell>{change.target_user_name || change.target_user_id}</TableCell>
                          <TableCell>
                            <Chip
                              label={change.role_name || change.permission_code}
                              size='small'
                              color='primary'
                            />
                          </TableCell>
                          <TableCell>
                            <Typography
                              variant='body2'
                              color='textSecondary'
                            >
                              {change.old_value || '-'}
                            </Typography>
                          </TableCell>
                          <TableCell>
                            <Typography
                              variant='body2'
                              color='primary'
                            >
                              {change.new_value || '-'}
                            </Typography>
                          </TableCell>
                          <TableCell>
                            <Chip
                              label={
                                change.status === 'success'
                                  ? t('admin:permission_audit_page.status_success')
                                  : t('admin:permission_audit_page.status_failed')
                              }
                              size='small'
                              color={
                                getStatusColor(change.status) as React.ComponentProps<
                                  typeof Chip
                                >['color']
                              }
                            />
                          </TableCell>
                        </TableRow>
                      ))
                    ) : (
                      accessLogs.map((log) => (
                        <TableRow key={log.id}>
                          <TableCell>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                              <Calendar className='w-4 h-4' />
                              <Typography variant='body2'>
                                {formatDate(log.access_time || log.created_at)}
                              </Typography>
                            </Box>
                          </TableCell>
                          <TableCell>
                            <Chip
                              label={getAccessTypeLabel(log.access_type)}
                              size='small'
                            />
                          </TableCell>
                          <TableCell>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                              <User className='w-4 h-4' />
                              <Typography>
                                {log.user_name || log.username || log.user_id}
                              </Typography>
                            </Box>
                          </TableCell>
                          <TableCell>
                            <Typography
                              variant='body2'
                              sx={{
                                maxWidth: 200,
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                                whiteSpace: 'nowrap',
                              }}
                              title={log.resource_path}
                            >
                              {log.resource_path || log.resource}
                            </Typography>
                          </TableCell>
                          <TableCell>{log.ip_address}</TableCell>
                          <TableCell>{log.device_type}</TableCell>
                          <TableCell>
                            <Chip
                              label={
                                log.status === 'success'
                                  ? t('admin:permission_audit_page.status_success')
                                  : log.status === 'denied'
                                    ? t('admin:permission_audit_page.status_denied')
                                    : t('admin:permission_audit_page.status_failed')
                              }
                              size='small'
                              color={
                                getStatusColor(log.status) as React.ComponentProps<
                                  typeof Chip
                                >['color']
                              }
                            />
                          </TableCell>
                          <TableCell>{log.response_time || 0}ms</TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </TableContainer>

              <Box sx={{ display: 'flex', justifyContent: 'center', mt: 3 }}>
                <Pagination
                  count={Math.ceil(total / PER_PAGE)}
                  page={currentPage}
                  onChange={(_, page) => setCurrentPage(page)}
                  siblingCount={1}
                  boundaryCount={2}
                />
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </PageContainer>
  );
};

export default PermissionAuditPage;
