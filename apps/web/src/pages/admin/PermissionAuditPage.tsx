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
import { useQuery } from '@tanstack/react-query';
import { Search, Shield, User, Calendar, Download, RefreshCw, ArrowRight } from 'lucide-react';
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
  const addNotification = useNotificationStore((state) => state.addNotification);
  const [activeTab, setActiveTab] = useState<TabType>('permissionChanges');
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<string>('all');
  const [currentPage, setCurrentPage] = useState(1);

  const PER_PAGE = 20;

  const permissionChangesQuery = useQuery<{ items: PermissionChange[]; total: number }>({
    queryKey: ['admin-permission-changes', currentPage, searchQuery, filterType],
    queryFn: async () => {
      const params: Record<string, unknown> = {
        page: currentPage,
        per_page: PER_PAGE,
      };
      if (searchQuery) params.query = searchQuery;
      if (filterType !== 'all') params.change_type = filterType;

      const response = await permissionAuditApi.listPermissionChanges(params as never);
      if (response.success && response.data) {
        return { items: response.data.items || [], total: response.data.total || 0 };
      }
      return { items: [], total: 0 };
    },
    enabled: activeTab === 'permissionChanges',
    staleTime: 5 * 60 * 1000,
  });

  const accessLogsQuery = useQuery<{ items: AccessControlLog[]; total: number }>({
    queryKey: ['admin-access-logs', currentPage, searchQuery, filterType],
    queryFn: async () => {
      const params: Record<string, unknown> = {
        page: currentPage,
        per_page: PER_PAGE,
      };
      if (searchQuery) params.query = searchQuery;
      if (filterType !== 'all') params.access_type = filterType;

      const response = await permissionAuditApi.listAccessLogs(params as never);
      if (response.success && response.data) {
        return { items: response.data.items || [], total: response.data.total || 0 };
      }
      return { items: [], total: 0 };
    },
    enabled: activeTab === 'accessControl',
    staleTime: 5 * 60 * 1000,
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

  useEffect(() => {
    setCurrentPage(1);
  }, [activeTab, filterType]);

  useEffect(() => {
    if (permissionChangesQuery.isError) {
      apiLogger.error('Failed to load permission changes:', permissionChangesQuery.error);
      addNotification({
        type: 'error',
        message: `加载权限变更记录失败: ${extractErrorMessage(permissionChangesQuery.error)}`,
      });
    }
  }, [permissionChangesQuery.isError, permissionChangesQuery.error, addNotification]);

  useEffect(() => {
    if (accessLogsQuery.isError) {
      apiLogger.error('Failed to load access logs:', accessLogsQuery.error);
      addNotification({
        type: 'error',
        message: `加载访问控制日志失败: ${extractErrorMessage(accessLogsQuery.error)}`,
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

  const handleExport = () => {
    if (activeTab === 'permissionChanges') {
      permissionAuditApi.exportPermissionChanges({ format: 'excel' });
    } else {
      permissionAuditApi.exportAccessLogs({ format: 'excel' });
    }
  };

  const getChangeTypeLabel = (type?: string) => {
    const labels: Record<string, string> = {
      role_assignment: '角色分配',
      role_removal: '角色移除',
      permission_add: '权限添加',
      permission_remove: '权限移除',
      role_create: '角色创建',
      role_update: '角色更新',
      role_delete: '角色删除',
      user_create: '用户创建',
      user_update: '用户更新',
      user_delete: '用户删除',
    };
    return labels[type || ''] || type || '-';
  };

  const getAccessTypeLabel = (type?: string) => {
    const labels: Record<string, string> = {
      login: '登录',
      logout: '登出',
      api_access: 'API访问',
      page_access: '页面访问',
      permission_check: '权限检查',
      denied: '访问拒绝',
    };
    return labels[type || ''] || type || '-';
  };

  const getStatusColor = (status?: string) => {
    if (status === 'success') return 'success';
    if (status === 'failed') return 'error';
    if (status === 'denied') return 'warning';
    return 'info';
  };

  return (
    <PageContainer
      title='权限审计'
      subtitle='查看权限变更和访问控制记录'
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
          刷新
        </Button>,
        <Button
          key='export'
          onClick={handleExport}
          startIcon={<Download className='w-4 h-4' />}
          variant='contained'
        >
          导出
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
                  <Typography variant='h6'>权限变更统计</Typography>
                </Box>
                <Grid spacing={2}>
                  <Grid size={{ xs: 6 }}>
                    <Typography
                      variant='body2'
                      color='textSecondary'
                    >
                      总变更数
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
                      今日变更
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
                      角色变更
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
                      权限变更
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
                  <Typography variant='h6'>访问控制统计</Typography>
                </Box>
                <Grid spacing={2}>
                  <Grid size={{ xs: 6 }}>
                    <Typography
                      variant='body2'
                      color='textSecondary'
                    >
                      总访问次数
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
                      今日访问
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
                      登录次数
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
                      拒绝次数
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
                  权限变更记录
                </Button>
                <Button
                  onClick={() => setActiveTab('accessControl')}
                  variant={activeTab === 'accessControl' ? 'contained' : 'outlined'}
                  startIcon={<User className='w-4 h-4' />}
                >
                  访问控制日志
                </Button>
              </Box>

              <Box sx={{ display: 'flex', gap: 2, mb: 3 }}>
                <TextField
                  fullWidth
                  label='搜索'
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder='搜索用户、角色或权限'
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
                  <InputLabel>类型筛选</InputLabel>
                  <Select
                    value={filterType}
                    onChange={(e) => setFilterType(e.target.value)}
                    label='类型筛选'
                  >
                    <MenuItem value='all'>全部类型</MenuItem>
                    {activeTab === 'permissionChanges' ? (
                      <>
                        <MenuItem value='role_assignment'>角色分配</MenuItem>
                        <MenuItem value='role_removal'>角色移除</MenuItem>
                        <MenuItem value='permission_add'>权限添加</MenuItem>
                        <MenuItem value='permission_remove'>权限移除</MenuItem>
                        <MenuItem value='role_create'>角色创建</MenuItem>
                        <MenuItem value='role_update'>角色更新</MenuItem>
                        <MenuItem value='role_delete'>角色删除</MenuItem>
                      </>
                    ) : (
                      <>
                        <MenuItem value='login'>登录</MenuItem>
                        <MenuItem value='logout'>登出</MenuItem>
                        <MenuItem value='api_access'>API访问</MenuItem>
                        <MenuItem value='page_access'>页面访问</MenuItem>
                        <MenuItem value='denied'>访问拒绝</MenuItem>
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
                          <TableCell>时间</TableCell>
                          <TableCell>变更类型</TableCell>
                          <TableCell>操作者</TableCell>
                          <TableCell>目标用户</TableCell>
                          <TableCell>角色/权限</TableCell>
                          <TableCell>变更前</TableCell>
                          <TableCell>变更后</TableCell>
                          <TableCell>状态</TableCell>
                        </>
                      ) : (
                        <>
                          <TableCell>时间</TableCell>
                          <TableCell>访问类型</TableCell>
                          <TableCell>用户</TableCell>
                          <TableCell>资源路径</TableCell>
                          <TableCell>IP地址</TableCell>
                          <TableCell>设备</TableCell>
                          <TableCell>状态</TableCell>
                          <TableCell>耗时(ms)</TableCell>
                        </>
                      )}
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {loading ? (
                      <TableRow>
                        <TableCell colSpan={activeTab === 'permissionChanges' ? 8 : 8}>
                          <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
                            <Typography
                              variant='body1'
                              color='textSecondary'
                            >
                              加载中...
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
                                {new Date(change.created_at).toLocaleString('zh-CN')}
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
                              label={change.status === 'success' ? '成功' : '失败'}
                              size='small'
                              color={getStatusColor(change.status) as React.ComponentProps<typeof import('@mui/material/Chip').default>['color']}
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
                                {new Date(log.access_time || log.created_at).toLocaleString(
                                  'zh-CN'
                                )}
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
                                  ? '成功'
                                  : log.status === 'denied'
                                    ? '拒绝'
                                    : '失败'
                              }
                              size='small'
                              color={getStatusColor(log.status) as React.ComponentProps<typeof import('@mui/material/Chip').default>['color']}
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
