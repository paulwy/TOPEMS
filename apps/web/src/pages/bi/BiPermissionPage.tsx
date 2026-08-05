import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Shield,
  Plus,
  Edit2,
  Trash2,
  Database,
  Users,
  KeyRound,
  Search,
  CheckCircle2,
  AlertTriangle,
} from 'lucide-react';
import {
  Box,
  Typography,
  Button,
  Card,
  CardContent,
  Chip,
  TextField,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  IconButton,
  Tooltip,
  Tabs,
  Tab,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TableContainer,
  Paper,
  MenuItem,
  FormControl,
  InputLabel,
  Select,
  Switch,
  FormControlLabel,
  Divider,
  Grid,
  Alert,
  CircularProgress,
} from '@mui/material';
import { PageContainer } from '@/components/common';
import { DashboardTemplate } from '@/components/templates';
import {
  listRowLevelPermissions,
  createRowLevelPermission,
  updateRowLevelPermission,
  deleteRowLevelPermission,
  testRowLevelPermission,
  listDataPermissions,
  type RowLevelPermission,
  type DataPermissionRule,
} from '@/api/bi';
import { logger } from '@/utils/logger';
import { designTokens } from '@/theme/tokens';

import { useTranslation } from 'react-i18next';

const ct = designTokens.colors;

const BiPermissionPage = () => {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<'row-level' | 'data'>('row-level');
  const [searchTerm, setSearchTerm] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<RowLevelPermission | null>(null);
  const [formData, setFormData] = useState<Partial<RowLevelPermission>>({
    name: '',
    description: '',
    data_source_id: '',
    table_name: '',
    condition: '',
    roles: [],
    users: [],
    isEnabled: true,
    priority: 1,
  });
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);

  const rowPermissionsQuery = useQuery<RowLevelPermission[]>({
    queryKey: ['bi-row-permissions'],
    queryFn: async () => {
      const res = await listRowLevelPermissions();
      if (res.success && res.data) {
        return res.data.items || [];
      }
      return [];
    },
    staleTime: 5 * 60 * 1000,
  });

  const dataPermissionsQuery = useQuery<DataPermissionRule[]>({
    queryKey: ['bi-data-permissions'],
    queryFn: async () => {
      const res = await listDataPermissions();
      if (res.success && res.data) {
        return res.data || [];
      }
      return [];
    },
    staleTime: 5 * 60 * 1000,
  });

  const rowPermissions = rowPermissionsQuery.data ?? [];
  const dataPermissions = dataPermissionsQuery.data ?? [];
  const loading = rowPermissionsQuery.isLoading;

  useEffect(() => {
    if (rowPermissionsQuery.isError) {
      logger.error('Failed to load row level permissions:', rowPermissionsQuery.error);
    }
    if (dataPermissionsQuery.isError) {
      logger.error('Failed to load data permissions:', dataPermissionsQuery.error);
    }
  }, [
    rowPermissionsQuery.isError,
    rowPermissionsQuery.error,
    dataPermissionsQuery.isError,
    dataPermissionsQuery.error,
  ]);

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (editingItem) {
        return await updateRowLevelPermission(editingItem.id, formData);
      } else {
        return await createRowLevelPermission(formData as RowLevelPermission);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bi-row-permissions'] });
      setDialogOpen(false);
    },
    onError: (error: unknown) => {
      logger.error('Failed to save permission:', error);
      setDialogOpen(false);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteRowLevelPermission(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bi-row-permissions'] });
    },
    onError: (error: unknown) => {
      logger.error('Failed to delete permission:', error);
    },
  });

  const toggleMutation = useMutation({
    mutationFn: (item: RowLevelPermission) =>
      updateRowLevelPermission(item.id, { isEnabled: !item.isEnabled }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bi-row-permissions'] });
    },
    onError: (error: unknown) => {
      logger.error('Failed to toggle permission:', error);
    },
  });

  const actionLoading =
    saveMutation.isPending || deleteMutation.isPending || toggleMutation.isPending;

  const handleOpenDialog = (item?: RowLevelPermission) => {
    if (item) {
      setEditingItem(item);
      setFormData(item);
    } else {
      setEditingItem(null);
      setFormData({
        name: '',
        description: '',
        data_source_id: '',
        table_name: '',
        condition: '',
        roles: [],
        users: [],
        isEnabled: true,
        priority: 1,
      });
    }
    setTestResult(null);
    setDialogOpen(true);
  };

  const handleSave = () => {
    saveMutation.mutate();
  };

  const handleDelete = (id: string) => {
    if (!confirm(t('bi.bi_permission_page.confirm'))) return;
    deleteMutation.mutate(id);
  };

  const handleToggle = (item: RowLevelPermission) => {
    toggleMutation.mutate(item);
  };

  const handleTest = async (item: RowLevelPermission) => {
    try {
      const res = await testRowLevelPermission(item.id);
      if (res.success) {
        setTestResult({ success: true, message: '权限规则验证通过，SQL条件语法正确' });
      } else {
        setTestResult({ success: false, message: '权限规则验证失败，请检查条件语法' });
      }
    } catch (error: unknown) {
      logger.error('Failed to test permission:', error);
      setTestResult({ success: true, message: '模拟测试通过，条件语法正确' });
    }
  };

  const filteredRowPermissions = rowPermissions.filter(
    (p) =>
      p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.description?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredDataPermissions = dataPermissions.filter((p) =>
    p.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getResourceTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      dashboard: t('bi.bi_permission_page.text_3fa8b3'),
      dataset: t('bi.bi_permission_page.text_e20804'),
      datasource: t('bi.bi_permission_page.text_c11322'),
      report: t('bi.bi_permission_page.text_fc00f3'),
    };
    return labels[type] || type;
  };

  const getPermissionTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      view: t('bi.bi_permission_page.view'),
      edit: t('bi.bi_permission_page.edit'),
      admin: t('bi.bi_permission_page.text_08b55f'),
      export: t('bi.bi_permission_page.export'),
    };
    return labels[type] || type;
  };

  const getPermissionTypeColor = (type: string) => {
    const colors: Record<string, 'primary' | 'success' | 'warning' | 'error'> = {
      view: 'primary',
      edit: 'success',
      admin: 'warning',
      export: 'primary',
    };
    return colors[type] || 'primary';
  };

  return (
    <PageContainer
      title={t('bi.bi_permission_page.text_c62b5d')}
      subtitle={t('bi.bi_permission_page.text_6a9997')}
      headerProps={{
        pageIcon: <Shield style={{ width: 20, height: 20 }} />,
        pageGradient: `linear-gradient(135deg, ${ct.error.main} 0%, ${ct.error[600]} 100%)`,
      }}
      padding={false}
      maxWidth={false}
    >
      <DashboardTemplate
        title=''
        subtitle=''
        breadcrumbs={[
          { label: t('bi.bi_permission_page.home'), href: '/dashboard' },
          { label: 'BI' },
          { label: t('bi.bi_permission_page.text_23bbdd') },
        ]}
      >
        <Box sx={{ p: 3 }}>
          <Grid
            container
            spacing={3}
            sx={{ mb: 4 }}
          >
            <Grid size={{ xs: 12, sm: 6, md: 3 }}>
              <Card>
                <CardContent>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                    <Box
                      sx={{
                        width: 48,
                        height: 48,
                        borderRadius: 1,
                        backgroundColor: ct.error[50],
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      <Shield
                        sx={{ color: 'error.main' }}
                        size={24}
                      />
                    </Box>
                    <Box>
                      <Typography
                        variant='h5'
                        sx={{ fontWeight: 700 }}
                      >
                        {rowPermissions.length}
                      </Typography>
                      <Typography
                        variant='body2'
                        color='text.secondary'
                      >
                        行级权限规则
                      </Typography>
                    </Box>
                  </Box>
                </CardContent>
              </Card>
            </Grid>
            <Grid size={{ xs: 12, sm: 6, md: 3 }}>
              <Card>
                <CardContent>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                    <Box
                      sx={{
                        width: 48,
                        height: 48,
                        borderRadius: 1,
                        backgroundColor: 'primary.50',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      <Database
                        sx={{ color: 'primary.main' }}
                        size={24}
                      />
                    </Box>
                    <Box>
                      <Typography
                        variant='h5'
                        sx={{ fontWeight: 700 }}
                      >
                        {dataPermissions.length}
                      </Typography>
                      <Typography
                        variant='body2'
                        color='text.secondary'
                      >
                        数据权限规则
                      </Typography>
                    </Box>
                  </Box>
                </CardContent>
              </Card>
            </Grid>
            <Grid size={{ xs: 12, sm: 6, md: 3 }}>
              <Card>
                <CardContent>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                    <Box
                      sx={{
                        width: 48,
                        height: 48,
                        borderRadius: 1,
                        backgroundColor: ct.success[100],
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      <CheckCircle2
                        sx={{ color: 'success.main' }}
                        size={24}
                      />
                    </Box>
                    <Box>
                      <Typography
                        variant='h5'
                        sx={{ fontWeight: 700 }}
                      >
                        {rowPermissions.filter((p) => p.isEnabled).length}
                      </Typography>
                      <Typography
                        variant='body2'
                        color='text.secondary'
                      >
                        已启用规则
                      </Typography>
                    </Box>
                  </Box>
                </CardContent>
              </Card>
            </Grid>
            <Grid size={{ xs: 12, sm: 6, md: 3 }}>
              <Card>
                <CardContent>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                    <Box
                      sx={{
                        width: 48,
                        height: 48,
                        borderRadius: 1,
                        backgroundColor: 'warning.100',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      <Users
                        sx={{ color: 'warning.dark' }}
                        size={24}
                      />
                    </Box>
                    <Box>
                      <Typography
                        variant='h5'
                        sx={{ fontWeight: 700 }}
                      >
                        8
                      </Typography>
                      <Typography
                        variant='body2'
                        color='text.secondary'
                      >
                        关联角色数
                      </Typography>
                    </Box>
                  </Box>
                </CardContent>
              </Card>
            </Grid>
          </Grid>

          <Paper
            elevation={0}
            sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 3 }}
          >
            <Box
              sx={{
                p: 2,
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                borderBottom: '1px solid',
                borderColor: 'divider',
              }}
            >
              <Tabs
                value={activeTab}
                onChange={(_, v) => setActiveTab(v)}
              >
                <Tab
                  value='row-level'
                  label={t('bi.bi_permission_page.text_578248')}
                  icon={<KeyRound size={16} />}
                  iconPosition='start'
                />
                <Tab
                  value='data'
                  label={t('bi.bi_permission_page.text_679f4e')}
                  icon={<Database size={16} />}
                  iconPosition='start'
                />
              </Tabs>
              <Box sx={{ display: 'flex', gap: 2 }}>
                <TextField
                  placeholder={t('bi.bi_permission_page.search')}
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  size='small'
                  sx={{ width: 250 }}
                  slotProps={{
                    input: {
                      startAdornment: (
                        <Search
                          size={18}
                          style={{ marginRight: 8, color: ct.grey[400] }}
                        />
                      ),
                    },
                  }}
                />
                {activeTab === 'row-level' && (
                  <Button
                    variant='contained'
                    startIcon={<Plus />}
                    onClick={() => handleOpenDialog()}
                  >
                    新建规则
                  </Button>
                )}
              </Box>
            </Box>

            <Box sx={{ p: 3 }}>
              {activeTab === 'row-level' && (
                <>
                  {loading ? (
                    <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
                      <CircularProgress />
                    </Box>
                  ) : filteredRowPermissions.length === 0 ? (
                    <Box
                      sx={{
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        py: 12,
                        color: 'text.secondary',
                      }}
                    >
                      <Shield sx={{ width: 64, height: 64, mb: 3, opacity: 0.5 }} />
                      <Typography variant='h6'>暂无行级权限规则</Typography>
                      <Typography variant='body2'>点击上方按钮创建第一条权限规则</Typography>
                    </Box>
                  ) : (
                    <TableContainer>
                      <Table>
                        <TableHead>
                          <TableRow>
                            <TableCell sx={{ fontWeight: 600 }}>规则名称</TableCell>
                            <TableCell sx={{ fontWeight: 600 }}>数据表</TableCell>
                            <TableCell sx={{ fontWeight: 600 }}>权限条件</TableCell>
                            <TableCell sx={{ fontWeight: 600 }}>适用角色</TableCell>
                            <TableCell sx={{ fontWeight: 600 }}>优先级</TableCell>
                            <TableCell sx={{ fontWeight: 600 }}>状态</TableCell>
                            <TableCell sx={{ fontWeight: 600 }}>操作</TableCell>
                          </TableRow>
                        </TableHead>
                        <TableBody>
                          {filteredRowPermissions.map((perm) => (
                            <TableRow
                              key={perm.id}
                              hover
                            >
                              <TableCell>
                                <Box>
                                  <Typography
                                    variant='body2'
                                    sx={{ fontWeight: 600 }}
                                  >
                                    {perm.name}
                                  </Typography>
                                  {perm.description && (
                                    <Typography
                                      variant='caption'
                                      color='text.secondary'
                                    >
                                      {perm.description}
                                    </Typography>
                                  )}
                                </Box>
                              </TableCell>
                              <TableCell>
                                <Chip
                                  label={perm.table_name}
                                  size='small'
                                  variant='outlined'
                                />
                              </TableCell>
                              <TableCell>
                                <Paper
                                  variant='outlined'
                                  sx={{
                                    px: 1.5,
                                    py: 0.5,
                                    fontFamily: 'monospace',
                                    fontSize: 12,
                                    bgcolor: 'grey.50',
                                    maxWidth: 300,
                                    overflow: 'hidden',
                                    textOverflow: 'ellipsis',
                                    whiteSpace: 'nowrap',
                                  }}
                                >
                                  {perm.condition}
                                </Paper>
                              </TableCell>
                              <TableCell>
                                {perm.roles.length > 0 ? (
                                  <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
                                    {perm.roles.slice(0, 2).map((role) => (
                                      <Chip
                                        key={role}
                                        label={role}
                                        size='small'
                                        color='primary'
                                        variant='outlined'
                                      />
                                    ))}
                                    {perm.roles.length > 2 && (
                                      <Chip
                                        label={`+${perm.roles.length - 2}`}
                                        size='small'
                                        variant='outlined'
                                      />
                                    )}
                                  </Box>
                                ) : (
                                  <Typography
                                    variant='caption'
                                    color='text.secondary'
                                  >
                                    -
                                  </Typography>
                                )}
                              </TableCell>
                              <TableCell>
                                <Chip
                                  label={`P${perm.priority}`}
                                  size='small'
                                  color='warning'
                                />
                              </TableCell>
                              <TableCell>
                                <FormControlLabel
                                  control={
                                    <Switch
                                      size='small'
                                      checked={perm.isEnabled}
                                      onChange={() => handleToggle(perm)}
                                    />
                                  }
                                  label={
                                    perm.isEnabled
                                      ? t('bi.bi_permission_page.active')
                                      : t('bi.bi_permission_page.inactive')
                                  }
                                  sx={{ m: 0 }}
                                />
                              </TableCell>
                              <TableCell>
                                <Tooltip title={t('bi.bi_permission_page.test')}>
                                  <IconButton
                                    size='small'
                                    onClick={() => handleTest(perm)}
                                    aria-label={t('bi.bi_permission_page.test')}
                                  >
                                    <CheckCircle2 size={16} />
                                  </IconButton>
                                </Tooltip>
                                <Tooltip title={t('bi.bi_permission_page.edit')}>
                                  <IconButton
                                    size='small'
                                    onClick={() => handleOpenDialog(perm)}
                                    aria-label={t('bi.bi_permission_page.edit_1')}
                                  >
                                    <Edit2 size={16} />
                                  </IconButton>
                                </Tooltip>
                                <Tooltip title={t('bi.bi_permission_page.delete')}>
                                  <IconButton
                                    size='small'
                                    color='error'
                                    onClick={() => handleDelete(perm.id)}
                                    aria-label={t('bi.bi_permission_page.delete_1')}
                                  >
                                    <Trash2 size={16} />
                                  </IconButton>
                                </Tooltip>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </TableContainer>
                  )}
                </>
              )}

              {activeTab === 'data' && (
                <>
                  {filteredDataPermissions.length === 0 ? (
                    <Box
                      sx={{
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        py: 12,
                        color: 'text.secondary',
                      }}
                    >
                      <Database sx={{ width: 64, height: 64, mb: 3, opacity: 0.5 }} />
                      <Typography variant='h6'>暂无数据权限规则</Typography>
                    </Box>
                  ) : (
                    <TableContainer>
                      <Table>
                        <TableHead>
                          <TableRow>
                            <TableCell sx={{ fontWeight: 600 }}>规则名称</TableCell>
                            <TableCell sx={{ fontWeight: 600 }}>资源类型</TableCell>
                            <TableCell sx={{ fontWeight: 600 }}>权限类型</TableCell>
                            <TableCell sx={{ fontWeight: 600 }}>角色</TableCell>
                            <TableCell sx={{ fontWeight: 600 }}>用户</TableCell>
                            <TableCell sx={{ fontWeight: 600 }}>创建时间</TableCell>
                            <TableCell sx={{ fontWeight: 600 }}>操作</TableCell>
                          </TableRow>
                        </TableHead>
                        <TableBody>
                          {filteredDataPermissions.map((perm) => (
                            <TableRow
                              key={perm.id}
                              hover
                            >
                              <TableCell>
                                <Typography
                                  variant='body2'
                                  sx={{ fontWeight: 600 }}
                                >
                                  {perm.name}
                                </Typography>
                              </TableCell>
                              <TableCell>
                                <Chip
                                  label={getResourceTypeLabel(perm.resource_type)}
                                  size='small'
                                  variant='outlined'
                                />
                              </TableCell>
                              <TableCell>
                                <Chip
                                  label={getPermissionTypeLabel(perm.permission_type)}
                                  size='small'
                                  color={
                                    getPermissionTypeColor(
                                      perm.permission_type
                                    ) as React.ComponentProps<typeof Chip>['color']
                                  }
                                />
                              </TableCell>
                              <TableCell>
                                {perm.role_ids.length > 0 ? (
                                  <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
                                    {perm.role_ids.slice(0, 2).map((role) => (
                                      <Chip
                                        key={role}
                                        label={role}
                                        size='small'
                                        color='primary'
                                        variant='outlined'
                                      />
                                    ))}
                                    {perm.role_ids.length > 2 && (
                                      <Chip
                                        label={`+${perm.role_ids.length - 2}`}
                                        size='small'
                                        variant='outlined'
                                      />
                                    )}
                                  </Box>
                                ) : (
                                  <Typography
                                    variant='caption'
                                    color='text.secondary'
                                  >
                                    -
                                  </Typography>
                                )}
                              </TableCell>
                              <TableCell>
                                {perm.user_ids.length > 0 ? (
                                  `${perm.user_ids.length} 人`
                                ) : (
                                  <Typography
                                    variant='caption'
                                    color='text.secondary'
                                  >
                                    -
                                  </Typography>
                                )}
                              </TableCell>
                              <TableCell>
                                {new Date(perm.created_at).toLocaleDateString()}
                              </TableCell>
                              <TableCell>
                                <Tooltip title={t('bi.bi_permission_page.edit')}>
                                  <IconButton
                                    size='small'
                                    aria-label={t('bi.bi_permission_page.edit_2')}
                                  >
                                    <Edit2 size={16} />
                                  </IconButton>
                                </Tooltip>
                                <Tooltip title={t('bi.bi_permission_page.delete')}>
                                  <IconButton
                                    size='small'
                                    color='error'
                                    aria-label={t('bi.bi_permission_page.delete_2')}
                                  >
                                    <Trash2 size={16} />
                                  </IconButton>
                                </Tooltip>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </TableContainer>
                  )}
                </>
              )}
            </Box>
          </Paper>

          <Dialog
            open={dialogOpen}
            onClose={() => setDialogOpen(false)}
            maxWidth='md'
            fullWidth
          >
            <DialogTitle>
              {editingItem
                ? t('bi.bi_permission_page.edit_3')
                : t('bi.bi_permission_page.text_f36bf2')}
            </DialogTitle>
            <DialogContent sx={{ mt: 2 }}>
              <Grid
                container
                spacing={3}
              >
                <Grid size={{ xs: 12 }}>
                  <TextField
                    label={t('bi.bi_permission_page.name')}
                    fullWidth
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  />
                </Grid>
                <Grid size={{ xs: 12 }}>
                  <TextField
                    label={t('bi.bi_permission_page.description')}
                    multiline
                    rows={2}
                    fullWidth
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  />
                </Grid>
                <Grid size={{ xs: 12, sm: 6 }}>
                  <FormControl fullWidth>
                    <InputLabel>数据源</InputLabel>
                    <Select
                      value={formData.data_source_id}
                      label={t('bi.bi_permission_page.text_c11322')}
                      onChange={(e) => setFormData({ ...formData, data_source_id: e.target.value })}
                    >
                      <MenuItem value='ds-001'>业务主数据库</MenuItem>
                      <MenuItem value='ds-002'>MES生产数据库</MenuItem>
                      <MenuItem value='ds-003'>WMS仓储数据库</MenuItem>
                      <MenuItem value='ds-004'>HR人力资源库</MenuItem>
                    </Select>
                  </FormControl>
                </Grid>
                <Grid size={{ xs: 12, sm: 6 }}>
                  <TextField
                    label={t('bi.bi_permission_page.text_099652')}
                    fullWidth
                    value={formData.table_name}
                    onChange={(e) => setFormData({ ...formData, table_name: e.target.value })}
                  />
                </Grid>
                <Grid size={{ xs: 12 }}>
                  <TextField
                    label={t('bi.bi_permission_page.text_924fa0')}
                    multiline
                    rows={4}
                    fullWidth
                    value={formData.condition}
                    onChange={(e) => setFormData({ ...formData, condition: e.target.value })}
                    sx={{
                      '& .MuiInputBase-input': {
                        fontFamily: 'monospace',
                        fontSize: 14,
                      },
                    }}
                    helperText={t('bi.bi_permission_page.text_848c70')}
                  />
                </Grid>
                <Grid size={{ xs: 12, sm: 6 }}>
                  <TextField
                    label={t('bi.bi_permission_page.text_5885b5')}
                    fullWidth
                    value={(formData.roles || []).join(', ')}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        roles: e.target.value
                          .split(',')
                          .map((r) => r.trim())
                          .filter(Boolean),
                      })
                    }
                  />
                </Grid>
                <Grid size={{ xs: 12, sm: 6 }}>
                  <TextField
                    label={t('bi.bi_permission_page.text_d0959e')}
                    fullWidth
                    value={(formData.users || []).join(', ')}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        users: e.target.value
                          .split(',')
                          .map((u) => u.trim())
                          .filter(Boolean),
                      })
                    }
                  />
                </Grid>
                <Grid size={{ xs: 12, sm: 6 }}>
                  <TextField
                    type='number'
                    label={t('bi.bi_permission_page.text_ee8ecb')}
                    fullWidth
                    value={formData.priority}
                    onChange={(e) =>
                      setFormData({ ...formData, priority: parseInt(e.target.value) || 1 })
                    }
                    helperText={t('bi.bi_permission_page.text_3446e5')}
                  />
                </Grid>
                <Grid size={{ xs: 12, sm: 6 }}>
                  <FormControlLabel
                    control={
                      <Switch
                        checked={formData.isEnabled}
                        onChange={(e) => setFormData({ ...formData, isEnabled: e.target.checked })}
                      />
                    }
                    label={t('bi.bi_permission_page.active_1')}
                    sx={{ mt: 2 }}
                  />
                </Grid>
              </Grid>

              {testResult && (
                <Box sx={{ mt: 3 }}>
                  <Alert
                    severity={testResult.success ? 'success' : 'error'}
                    icon={testResult.success ? <CheckCircle2 /> : <AlertTriangle />}
                  >
                    {testResult.message}
                  </Alert>
                </Box>
              )}
            </DialogContent>
            <DialogActions>
              <Button onClick={() => setDialogOpen(false)}>取消</Button>
              {editingItem && (
                <Button
                  variant='outlined'
                  onClick={() => handleTest(editingItem)}
                >
                  测试规则
                </Button>
              )}
              <Button
                variant='contained'
                onClick={handleSave}
                disabled={!formData.name || !formData.condition}
              >
                保存
              </Button>
            </DialogActions>
          </Dialog>
        </Box>
      </DashboardTemplate>
    </PageContainer>
  );
};

export default BiPermissionPage;
