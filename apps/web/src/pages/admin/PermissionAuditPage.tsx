import {
  Card,
  CardContent,
  Chip,
  Typography,
  Box,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Grid,
  Button,
} from '@mui/material';
import i18n from '@/i18n';
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useDebounce } from '@topems/shared-hooks';
import { Shield, User, Calendar, Download, RefreshCw } from 'lucide-react';
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
import { QUERY_KEYS } from '@/lib/reactQuery';
import { ListPageTemplate } from '@/components/templates';
import type { ColumnDef } from '@/components/templates';

interface PermissionAuditPageProps {
  onNavigate?: (page: string) => void;
}

type TabType = 'permissionChanges' | 'accessControl';

const PER_PAGE = 20;

const PERMISSION_CHANGE_TYPES = [
  'role_assignment',
  'role_removal',
  'permission_add',
  'permission_remove',
  'role_create',
  'role_update',
  'role_delete',
];

const ACCESS_CONTROL_TYPES = ['login', 'logout', 'api_access', 'page_access', 'denied'];

const PermissionAuditPage: React.FC<PermissionAuditPageProps> = () => {
  const addNotification = useNotificationStore((state) => state.addNotification);
  const [activeTab, setActiveTab] = useState<TabType>('permissionChanges');
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<string>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const debouncedSearch = useDebounce(searchQuery, 300);

  const permissionChangesQuery = useQuery<{ items: PermissionChange[]; total: number }>({
    queryKey: [
      ...QUERY_KEYS.AD_HOC.ADMIN_PERMISSION_CHANGES_BASE,
      currentPage,
      debouncedSearch,
      filterType,
    ],
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
    queryKey: [
      ...QUERY_KEYS.AD_HOC.ADMIN_ACCESS_LOGS_BASE,
      currentPage,
      debouncedSearch,
      filterType,
    ],
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
    queryKey: QUERY_KEYS.AD_HOC.ADMIN_PERMISSION_CHANGE_STATS_BASE,
    queryFn: async () => {
      const res = await permissionAuditApi.getPermissionChangeStats();
      return res.success && res.data ? res.data : null;
    },
    staleTime: 5 * 60 * 1000,
  });

  const accessStatsQuery = useQuery<AccessControlStats | null>({
    queryKey: QUERY_KEYS.AD_HOC.ADMIN_ACCESS_CONTROL_STATS_BASE,
    queryFn: async () => {
      const res = await permissionAuditApi.getAccessControlStats();
      return res.success && res.data ? res.data : null;
    },
    staleTime: 5 * 60 * 1000,
  });

  const permissionChanges = permissionChangesQuery.data?.items ?? [];
  const accessLogs = accessLogsQuery.data?.items ?? [];
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
        message: i18n.t('admin:permission_audit_page.load_permission_changes_error', {
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
        message: i18n.t('admin:permission_audit_page.load_access_logs_error', {
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

  const handleExport = useCallback(async () => {
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
      addNotification({ type: 'success', message: i18n.t('admin.permission_audit_page.k0') });
    } catch (error) {
      apiLogger.error(i18n.t('pages.permission_audit_page.k0'), error);
      addNotification({
        type: 'error',
        message: `${i18n.t('pages.permission_audit_page.k1')}${extractErrorMessage(error)}`,
      });
    }
  }, [activeTab, addNotification]);

  const handleRefresh = useCallback(() => {
    if (activeTab === 'permissionChanges') {
      permissionChangesQuery.refetch();
      permissionStatsQuery.refetch();
    } else {
      accessLogsQuery.refetch();
      accessStatsQuery.refetch();
    }
  }, [activeTab, permissionChangesQuery, accessLogsQuery, permissionStatsQuery, accessStatsQuery]);

  const getChangeTypeLabel = useCallback((type?: string) => {
    const labels: Record<string, string> = {
      role_assignment: i18n.t('admin.permission_audit_page.type_role_assignment'),
      role_removal: i18n.t('admin.permission_audit_page.type_role_removal'),
      permission_add: i18n.t('admin.permission_audit_page.type_permission_add'),
      permission_remove: i18n.t('admin.permission_audit_page.type_permission_remove'),
      role_create: i18n.t('admin.permission_audit_page.type_role_create'),
      role_update: i18n.t('admin.permission_audit_page.type_role_update'),
      role_delete: i18n.t('admin.permission_audit_page.type_role_delete'),
      user_create: i18n.t('admin.permission_audit_page.type_user_create'),
      user_update: i18n.t('admin.permission_audit_page.type_user_update'),
      user_delete: i18n.t('admin.permission_audit_page.type_user_delete'),
    };
    return labels[type || ''] || type || '-';
  }, []);

  const getAccessTypeLabel = useCallback((type?: string) => {
    const labels: Record<string, string> = {
      login: i18n.t('admin.permission_audit_page.type_login'),
      logout: i18n.t('admin.permission_audit_page.type_logout'),
      api_access: i18n.t('admin.permission_audit_page.type_api_access'),
      page_access: i18n.t('admin.permission_audit_page.type_page_access'),
      permission_check: i18n.t('admin.permission_audit_page.type_permission_check'),
      denied: i18n.t('admin.permission_audit_page.type_denied'),
    };
    return labels[type || ''] || type || '-';
  }, []);

  const getStatusColor = useCallback((status?: string) => {
    if (status === 'success') return 'success';
    if (status === 'failed') return 'error';
    if (status === 'denied') return 'warning';
    return 'info';
  }, []);

  const formatDate = useCallback((dateStr?: string) => {
    if (!dateStr) return '-';
    const d = new Date(dateStr);
    return isNaN(d.getTime()) ? '-' : d.toLocaleString('zh-CN');
  }, []);

  const permissionChangeColumns: ColumnDef<PermissionChange>[] = useMemo(
    () => [
      {
        id: 'created_at',
        label: i18n.t('admin.permission_audit_page.col_time'),
        render: (change) => (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Calendar className='w-4 h-4' />
            <Typography variant='body2'>{formatDate(change.created_at)}</Typography>
          </Box>
        ),
      },
      {
        id: 'change_type',
        label: i18n.t('admin.permission_audit_page.col_change_type'),
        render: (change) => (
          <Chip
            label={getChangeTypeLabel(change.change_type)}
            size='small'
          />
        ),
      },
      {
        id: 'operator',
        label: i18n.t('admin.permission_audit_page.col_operator'),
        render: (change) => (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <User className='w-4 h-4' />
            <Typography>{change.operator_name || change.operator_id}</Typography>
          </Box>
        ),
      },
      {
        id: 'target_user',
        label: i18n.t('admin.permission_audit_page.col_target_user'),
        render: (change) => (
          <Typography>{change.target_user_name || change.target_user_id}</Typography>
        ),
      },
      {
        id: 'role_permission',
        label: i18n.t('admin.permission_audit_page.col_role_permission'),
        render: (change) => (
          <Chip
            label={change.role_name || change.permission_code}
            size='small'
            color='primary'
          />
        ),
      },
      {
        id: 'old_value',
        label: i18n.t('admin.permission_audit_page.col_old_value'),
        render: (change) => (
          <Typography
            variant='body2'
            color='textSecondary'
          >
            {change.old_value || '-'}
          </Typography>
        ),
      },
      {
        id: 'new_value',
        label: i18n.t('admin.permission_audit_page.col_new_value'),
        render: (change) => (
          <Typography
            variant='body2'
            color='primary'
          >
            {change.new_value || '-'}
          </Typography>
        ),
      },
      {
        id: 'status',
        label: i18n.t('admin.permission_audit_page.col_status'),
        render: (change) => (
          <Chip
            label={
              change.status === 'success'
                ? i18n.t('admin.permission_audit_page.status_success')
                : i18n.t('admin.permission_audit_page.status_failed')
            }
            size='small'
            color={getStatusColor(change.status) as React.ComponentProps<typeof Chip>['color']}
          />
        ),
      },
    ],
    [formatDate, getChangeTypeLabel, getStatusColor]
  );

  const accessLogColumns: ColumnDef<AccessControlLog>[] = useMemo(
    () => [
      {
        id: 'access_time',
        label: i18n.t('admin.permission_audit_page.col_time'),
        render: (log) => (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Calendar className='w-4 h-4' />
            <Typography variant='body2'>{formatDate(log.access_time || log.created_at)}</Typography>
          </Box>
        ),
      },
      {
        id: 'access_type',
        label: i18n.t('admin.permission_audit_page.col_access_type'),
        render: (log) => (
          <Chip
            label={getAccessTypeLabel(log.access_type)}
            size='small'
          />
        ),
      },
      {
        id: 'user',
        label: i18n.t('admin.permission_audit_page.col_user'),
        render: (log) => (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <User className='w-4 h-4' />
            <Typography>{log.user_name || log.username || log.user_id}</Typography>
          </Box>
        ),
      },
      {
        id: 'resource_path',
        label: i18n.t('admin.permission_audit_page.col_resource_path'),
        render: (log) => (
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
        ),
      },
      {
        id: 'ip_address',
        label: i18n.t('admin.permission_audit_page.col_ip_address'),
        render: (log) => <Typography>{log.ip_address}</Typography>,
      },
      {
        id: 'device_type',
        label: i18n.t('admin.permission_audit_page.col_device'),
        render: (log) => <Typography>{log.device_type}</Typography>,
      },
      {
        id: 'status',
        label: i18n.t('admin.permission_audit_page.col_status'),
        render: (log) => (
          <Chip
            label={
              log.status === 'success'
                ? i18n.t('admin.permission_audit_page.status_success')
                : log.status === 'denied'
                  ? i18n.t('admin.permission_audit_page.status_denied')
                  : i18n.t('admin.permission_audit_page.status_failed')
            }
            size='small'
            color={getStatusColor(log.status) as React.ComponentProps<typeof Chip>['color']}
          />
        ),
      },
      {
        id: 'response_time',
        label: i18n.t('admin.permission_audit_page.col_response_time'),
        render: (log) => <Typography>{`${log.response_time || 0}ms`}</Typography>,
      },
    ],
    [formatDate, getAccessTypeLabel, getStatusColor]
  );

  const renderStatsCards = useMemo(
    () => (
      <Grid
        container
        spacing={3}
        sx={{ mb: 3 }}
      >
        {permissionStats && (
          <Grid size={{ xs: 12, md: 6 }}>
            <Card>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
                  <Shield className='w-5 h-5 text-blue-600' />
                  <Typography variant='h6'>
                    {i18n.t('admin.permission_audit_page.permission_change_stats')}
                  </Typography>
                </Box>
                <Grid
                  container
                  spacing={2}
                >
                  <Grid size={{ xs: 6 }}>
                    <Typography
                      variant='body2'
                      color='textSecondary'
                    >
                      {i18n.t('admin.permission_audit_page.total_changes')}
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
                      {i18n.t('admin.permission_audit_page.today_changes')}
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
                      {i18n.t('admin.permission_audit_page.role_changes')}
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
                      {i18n.t('admin.permission_audit_page.permission_changes')}
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
                    {i18n.t('admin.permission_audit_page.access_control_stats')}
                  </Typography>
                </Box>
                <Grid
                  container
                  spacing={2}
                >
                  <Grid size={{ xs: 6 }}>
                    <Typography
                      variant='body2'
                      color='textSecondary'
                    >
                      {i18n.t('admin.permission_audit_page.total_access')}
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
                      {i18n.t('admin.permission_audit_page.today_access')}
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
                      {i18n.t('admin.permission_audit_page.login_count')}
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
                      {i18n.t('admin.permission_audit_page.denied_count')}
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
      </Grid>
    ),
    [permissionStats, accessStats]
  );

  const renderTabs = useMemo(
    () => (
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3 }}>
        <Button
          onClick={() => setActiveTab('permissionChanges')}
          variant={activeTab === 'permissionChanges' ? 'contained' : 'outlined'}
          startIcon={<Shield className='w-4 h-4' />}
        >
          {i18n.t('admin.permission_audit_page.permission_changes_tab')}
        </Button>
        <Button
          onClick={() => setActiveTab('accessControl')}
          variant={activeTab === 'accessControl' ? 'contained' : 'outlined'}
          startIcon={<User className='w-4 h-4' />}
        >
          {i18n.t('admin.permission_audit_page.access_control_tab')}
        </Button>
      </Box>
    ),
    [activeTab]
  );

  const renderFilter = useMemo(
    () => (
      <FormControl
        fullWidth
        sx={{ minWidth: 150 }}
      >
        <InputLabel>{i18n.t('admin.permission_audit_page.filter_type')}</InputLabel>
        <Select
          value={filterType}
          onChange={(e) => setFilterType(e.target.value)}
          label={i18n.t('admin.permission_audit_page.filter_type')}
        >
          <MenuItem value='all'>{i18n.t('admin.permission_audit_page.all_types')}</MenuItem>
          {activeTab === 'permissionChanges'
            ? PERMISSION_CHANGE_TYPES.map((type) => (
                <MenuItem
                  key={type}
                  value={type}
                >
                  {i18n.t(`admin.permission_audit_page.type_${type}`)}
                </MenuItem>
              ))
            : ACCESS_CONTROL_TYPES.map((type) => (
                <MenuItem
                  key={type}
                  value={type}
                >
                  {i18n.t(`admin.permission_audit_page.type_${type}`)}
                </MenuItem>
              ))}
        </Select>
      </FormControl>
    ),
    [activeTab, filterType]
  );

  const commonActions = useMemo(
    () => [
      {
        label: i18n.t('admin.permission_audit_page.refresh'),
        icon: <RefreshCw className='w-4 h-4' />,
        onClick: handleRefresh,
        variant: 'outlined' as const,
      },
      {
        label: i18n.t('admin.permission_audit_page.export'),
        icon: <Download className='w-4 h-4' />,
        onClick: handleExport,
        variant: 'contained' as const,
      },
    ],
    [handleExport, handleRefresh]
  );

  const commonHeaderContent = useMemo(
    () => (
      <Box>
        {renderStatsCards}
        {renderTabs}
      </Box>
    ),
    [renderStatsCards, renderTabs]
  );

  const commonSearchProps = useMemo(
    () => ({
      searchable: true,
      searchValue: searchQuery,
      onSearch: (value: string) => setSearchQuery(value),
      searchPlaceholder: i18n.t('admin.permission_audit_page.search_placeholder'),
    }),
    [searchQuery]
  );

  return (
    <>
      {activeTab === 'permissionChanges' ? (
        <ListPageTemplate<PermissionChange>
          key='permissionChanges'
          title={i18n.t('admin.permission_audit_page.title')}
          subtitle={i18n.t('admin.permission_audit_page.subtitle')}
          columns={permissionChangeColumns}
          data={permissionChanges}
          loading={permissionChangesQuery.isLoading}
          actions={commonActions}
          headerContent={commonHeaderContent}
          filterContent={renderFilter}
          pagination={{
            page: currentPage,
            pageSize: PER_PAGE,
            total: permissionChangesQuery.data?.total ?? 0,
            onPageChange: (page) => setCurrentPage(page),
          }}
          {...commonSearchProps}
          emptyMessage={i18n.t('pages.permission_audit_page.k0')}
        />
      ) : (
        <ListPageTemplate<AccessControlLog>
          key='accessControl'
          title={i18n.t('admin.permission_audit_page.title')}
          subtitle={i18n.t('admin.permission_audit_page.subtitle')}
          columns={accessLogColumns}
          data={accessLogs}
          loading={accessLogsQuery.isLoading}
          actions={commonActions}
          headerContent={commonHeaderContent}
          filterContent={renderFilter}
          pagination={{
            page: currentPage,
            pageSize: PER_PAGE,
            total: accessLogsQuery.data?.total ?? 0,
            onPageChange: (page) => setCurrentPage(page),
          }}
          {...commonSearchProps}
          emptyMessage={i18n.t('pages.permission_audit_page.k0')}
        />
      )}
    </>
  );
};

export default PermissionAuditPage;
