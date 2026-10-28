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
import i18n from '@/i18n';
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
  Tabs,
  Tab,
  Paper,
  MenuItem,
  FormControl,
  InputLabel,
  Select,
  Switch,
  FormControlLabel,
  Grid,
  Alert,
  useTheme,
} from '@mui/material';
import { PageContainer } from '@/components/common';
import { ListPageTemplate, type ColumnDef, type RowAction } from '@/components/templates';
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
import { QUERY_KEYS } from '@/lib/reactQuery';

const BiPermissionPage = () => {
  const theme = useTheme();
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
    queryKey: QUERY_KEYS.AD_HOC.BI_ROW_PERMISSIONS_BASE,
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
    queryKey: QUERY_KEYS.AD_HOC.BI_DATA_PERMISSIONS_BASE,
    queryFn: async () => {
      const res = await listDataPermissions();
      if (res.success && res.data) {
        return res.data.items || [];
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
      queryClient.invalidateQueries({
        queryKey: QUERY_KEYS.AD_HOC.BI_ROW_PERMISSIONS_BASE,
        exact: false,
        refetchType: 'active',
      });
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
      queryClient.invalidateQueries({
        queryKey: QUERY_KEYS.AD_HOC.BI_ROW_PERMISSIONS_BASE,
        exact: false,
        refetchType: 'active',
      });
    },
    onError: (error: unknown) => {
      logger.error('Failed to delete permission:', error);
    },
  });
  const toggleMutation = useMutation({
    mutationFn: (item: RowLevelPermission) =>
      updateRowLevelPermission(item.id, { isEnabled: !item.isEnabled }),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: QUERY_KEYS.AD_HOC.BI_ROW_PERMISSIONS_BASE,
        exact: false,
        refetchType: 'active',
      });
    },
    onError: (error: unknown) => {
      logger.error('Failed to toggle permission:', error);
    },
  });
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
    if (!confirm(i18n.t('bi.bi_permission_page.confirm'))) return;
    deleteMutation.mutate(id);
  };
  const handleToggle = (item: RowLevelPermission) => {
    toggleMutation.mutate(item);
  };
  const handleTest = async (item: RowLevelPermission) => {
    try {
      const res = await testRowLevelPermission(item.id);
      if (res.success) {
        setTestResult({ success: true, message: i18n.t('bi.bi_permission_page.sql_0') });
      } else {
        setTestResult({ success: false, message: i18n.t('bi.bi_permission_page.k1') });
      }
    } catch (error: unknown) {
      logger.error('Failed to test permission:', error);
      setTestResult({ success: true, message: i18n.t('bi.bi_permission_page.k2') });
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
      dashboard: i18n.t('bi.bi_permission_page.dashboard_resource'),
      dataset: i18n.t('bi.bi_permission_page.dataset_resource'),
      datasource: i18n.t('bi.bi_permission_page.datasource_resource'),
      report: i18n.t('bi.bi_permission_page.report_resource'),
    };
    return labels[type] || type;
  };
  const getPermissionTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      view: i18n.t('bi.bi_permission_page.view'),
      edit: i18n.t('bi.bi_permission_page.edit'),
      admin: i18n.t('bi.bi_permission_page.system_mgmt_role'),
      export: i18n.t('bi.bi_permission_page.export'),
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

  // 行级权限表格列配置
  const rowColumns: ColumnDef<RowLevelPermission>[] = [
    {
      id: 'name',
      label: i18n.t('bi.bi_permission_page.k5'),
      render: (perm) => (
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
      ),
    },
    {
      id: 'table_name',
      label: i18n.t('bi.bi_permission_page.k6'),
      render: (perm) => (
        <Chip
          label={perm.table_name}
          size='small'
          variant='outlined'
        />
      ),
    },
    {
      id: 'condition',
      label: i18n.t('bi.bi_permission_page.k7'),
      render: (perm) => (
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
      ),
    },
    {
      id: 'roles',
      label: i18n.t('bi.bi_permission_page.k8'),
      render: (perm) =>
        perm.roles.length > 0 ? (
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
        ),
    },
    {
      id: 'priority',
      label: i18n.t('bi.bi_permission_page.k9'),
      render: (perm) => (
        <Chip
          label={`P${perm.priority}`}
          size='small'
          color='warning'
        />
      ),
    },
    {
      id: 'isEnabled',
      label: i18n.t('bi.bi_permission_page.k10'),
      render: (perm) => (
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
              ? i18n.t('bi.bi_permission_page.active')
              : i18n.t('bi.bi_permission_page.inactive')
          }
          sx={{ m: 0 }}
        />
      ),
    },
  ];

  const rowActions: RowAction<RowLevelPermission>[] = [
    {
      key: 'test',
      label: i18n.t('bi.bi_permission_page.test'),
      icon: <CheckCircle2 size={16} />,
      onClick: (perm) => handleTest(perm),
    },
    {
      key: 'edit',
      label: i18n.t('bi.bi_permission_page.edit'),
      icon: <Edit2 size={16} />,
      onClick: (perm) => handleOpenDialog(perm),
    },
    {
      key: 'delete',
      label: i18n.t('bi.bi_permission_page.delete'),
      icon: <Trash2 size={16} />,
      color: 'error',
      onClick: (perm) => handleDelete(perm.id),
    },
  ];

  // 数据权限表格列配置
  const dataColumns: ColumnDef<DataPermissionRule>[] = [
    {
      id: 'name',
      label: i18n.t('bi.bi_permission_page.k13'),
      render: (perm) => (
        <Typography
          variant='body2'
          sx={{ fontWeight: 600 }}
        >
          {perm.name}
        </Typography>
      ),
    },
    {
      id: 'resource_type',
      label: i18n.t('bi.bi_permission_page.k14'),
      render: (perm) => (
        <Chip
          label={getResourceTypeLabel(perm.resource_type)}
          size='small'
          variant='outlined'
        />
      ),
    },
    {
      id: 'permission_type',
      label: i18n.t('bi.bi_permission_page.k15'),
      render: (perm) => (
        <Chip
          label={getPermissionTypeLabel(perm.permission_type)}
          size='small'
          color={
            getPermissionTypeColor(perm.permission_type) as React.ComponentProps<
              typeof Chip
            >['color']
          }
        />
      ),
    },
    {
      id: 'role_ids',
      label: i18n.t('bi.bi_permission_page.k16'),
      render: (perm) =>
        perm.role_ids.length > 0 ? (
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
        ),
    },
    {
      id: 'user_ids',
      label: i18n.t('bi.bi_permission_page.k17'),
      render: (perm) =>
        perm.user_ids.length > 0 ? (
          `${perm.user_ids.length}${i18n.t('pages.bi_permission_page.k0')}`
        ) : (
          <Typography
            variant='caption'
            color='text.secondary'
          >
            -
          </Typography>
        ),
    },
    {
      id: 'created_at',
      label: i18n.t('bi.bi_permission_page.k18'),
      render: (perm) => new Date(perm.created_at).toLocaleDateString(),
    },
  ];

  return (
    <PageContainer
      title={i18n.t('bi.bi_permission_page.permission_mgmt_heading')}
      subtitle={i18n.t('bi.bi_permission_page.page_subtitle')}
      headerProps={{
        pageIcon: <Shield style={{ width: 20, height: 20 }} />,
        pageGradient: `linear-gradient(135deg, ${theme.palette.error.main} 0%, ${theme.palette.error[600]} 100%)`,
      }}
      padding={false}
      maxWidth={false}
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
                      backgroundColor: theme.palette.error[50],
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
                      {i18n.t('pages.bi_permission_page.k0')}
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
                      {i18n.t('pages.bi_permission_page.k1')}
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
                      backgroundColor: theme.palette.success[100],
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
                      {i18n.t('pages.bi_permission_page.k2')}
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
                      {i18n.t('pages.bi_permission_page.k3')}
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
                label={i18n.t('bi.bi_permission_page.row_level_tab')}
                icon={<KeyRound size={16} />}
                iconPosition='start'
              />
              <Tab
                value='data'
                label={i18n.t('bi.bi_permission_page.data_permission_tab')}
                icon={<Database size={16} />}
                iconPosition='start'
              />
            </Tabs>
            <Box sx={{ display: 'flex', gap: 2 }}>
              <TextField
                placeholder={i18n.t('bi.bi_permission_page.search')}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                size='small'
                sx={{ width: 250 }}
                slotProps={{
                  input: {
                    startAdornment: (
                      <Search
                        size={18}
                        style={{ marginRight: 8, color: theme.palette.grey[400] }}
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
                  {i18n.t('pages.bi_permission_page.k4')}
                </Button>
              )}
            </Box>
          </Box>
          <Box sx={{ p: 3 }}>
            {activeTab === 'row-level' && (
              <ListPageTemplate
                columns={rowColumns}
                data={filteredRowPermissions}
                loading={loading}
                getRowId={(row) => row.id}
                rowActions={rowActions}
                emptyMessage={i18n.t('bi.bi_permission_page.k3')}
                emptyIcon={<Shield sx={{ width: 64, height: 64, opacity: 0.5 }} />}
              />
            )}
            {activeTab === 'data' && (
              <ListPageTemplate
                columns={dataColumns}
                data={filteredDataPermissions}
                loading={false}
                getRowId={(row) => row.id}
                emptyMessage={i18n.t('bi.bi_permission_page.k12')}
                emptyIcon={<Database sx={{ width: 64, height: 64, opacity: 0.5 }} />}
              />
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
              ? i18n.t('bi.bi_permission_page.edit_3')
              : i18n.t('bi.bi_permission_page.new_rule_button')}
          </DialogTitle>
          <DialogContent sx={{ mt: 2 }}>
            <Grid
              container
              spacing={3}
            >
              <Grid size={{ xs: 12 }}>
                <TextField
                  label={i18n.t('bi.bi_permission_page.name')}
                  fullWidth
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                />
              </Grid>
              <Grid size={{ xs: 12 }}>
                <TextField
                  label={i18n.t('bi.bi_permission_page.description')}
                  multiline
                  rows={2}
                  fullWidth
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                />
              </Grid>
              <Grid size={{ xs: 12, sm: 6 }}>
                <FormControl fullWidth>
                  <InputLabel>{i18n.t('bi.bi_permission_page.k20')}</InputLabel>
                  <Select
                    value={formData.data_source_id}
                    label={i18n.t('bi.bi_permission_page.datasource_resource')}
                    onChange={(e) => setFormData({ ...formData, data_source_id: e.target.value })}
                  >
                    <MenuItem value='ds-001'>{i18n.t('bi.bi_permission_page.k21')}</MenuItem>
                    <MenuItem value='ds-002'>{i18n.t('pages.bi_permission_page.me_0')}</MenuItem>
                    <MenuItem value='ds-003'>{i18n.t('pages.bi_permission_page.wm_1')}</MenuItem>
                    <MenuItem value='ds-004'>{i18n.t('pages.bi_permission_page.k2')}</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              <Grid size={{ xs: 12, sm: 6 }}>
                <TextField
                  label={i18n.t('bi.bi_permission_page.rule_name_label')}
                  fullWidth
                  value={formData.table_name}
                  onChange={(e) => setFormData({ ...formData, table_name: e.target.value })}
                />
              </Grid>
              <Grid size={{ xs: 12 }}>
                <TextField
                  label={i18n.t('bi.bi_permission_page.data_table_label')}
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
                  helperText={i18n.t('bi.bi_permission_page.sql_condition_hint')}
                />
              </Grid>
              <Grid size={{ xs: 12, sm: 6 }}>
                <TextField
                  label={i18n.t('bi.bi_permission_page.applicable_roles_label')}
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
                  label={i18n.t('bi.bi_permission_page.user_label')}
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
                  label={i18n.t('bi.bi_permission_page.priority_label')}
                  fullWidth
                  value={formData.priority}
                  onChange={(e) =>
                    setFormData({ ...formData, priority: parseInt(e.target.value) || 1 })
                  }
                  helperText={i18n.t('bi.bi_permission_page.priority_hint')}
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
                  label={i18n.t('bi.bi_permission_page.active_1')}
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
            <Button onClick={() => setDialogOpen(false)}>
              {i18n.t('bi.bi_permission_page.k22')}
            </Button>
            {editingItem && (
              <Button
                variant='outlined'
                onClick={() => handleTest(editingItem)}
              >
                {i18n.t('pages.bi_permission_page.k5')}
              </Button>
            )}
            <Button
              variant='contained'
              onClick={handleSave}
              disabled={!formData.name || !formData.condition}
            >
              {i18n.t('pages.bi_permission_page.k6')}
            </Button>
          </DialogActions>
        </Dialog>
      </Box>
    </PageContainer>
  );
};
export default BiPermissionPage;
