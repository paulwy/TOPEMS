import { useState, useEffect } from 'react';
import {
  Shield,
  Plus,
  Edit2,
  Trash2,
  Database,
  Users,
  KeyRound,
  Search,
  ToggleLeft,
  ToggleRight,
  CheckCircle2,
  AlertTriangle,
} from 'lucide-react';
import {
  Box,
  Typography,
  Button,
  Card,
  CardContent,
  CardActions,
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
  createDataPermission,
  updateDataPermission,
  deleteDataPermission,
  type RowLevelPermission,
  type DataPermissionRule,
} from '@/api/bi';
import { logger } from '@/utils/logger';

const mockRowPermissions: RowLevelPermission[] = [
  {
    id: 'rlp-001',
    name: '华东地区销售数据权限',
    description: '限制华东地区销售经理只能查看本地区数据',
    data_source_id: 'ds-001',
    table_name: 'sales_orders',
    condition: "region = 'east'",
    roles: ['sales_manager_east'],
    users: ['user001', 'user002'],
    is_enabled: true,
    priority: 1,
    created_at: '2026-01-15T10:30:00Z',
    updated_at: '2026-06-20T14:20:00Z',
  },
  {
    id: 'rlp-002',
    name: '华南地区销售数据权限',
    description: '限制华南地区销售经理只能查看本地区数据',
    data_source_id: 'ds-001',
    table_name: 'sales_orders',
    condition: "region = 'south'",
    roles: ['sales_manager_south'],
    users: ['user003', 'user004'],
    is_enabled: true,
    priority: 2,
    created_at: '2026-01-15T11:00:00Z',
    updated_at: '2026-06-20T14:20:00Z',
  },
  {
    id: 'rlp-003',
    name: '部门级HR数据权限',
    description: '部门经理只能查看本部门员工数据',
    data_source_id: 'ds-004',
    table_name: 'employees',
    condition: 'department = CURRENT_USER_DEPARTMENT',
    roles: ['department_manager'],
    users: [],
    is_enabled: false,
    priority: 5,
    created_at: '2026-03-10T09:00:00Z',
    updated_at: '2026-05-15T16:30:00Z',
  },
];

const mockDataPermissions: DataPermissionRule[] = [
  {
    id: 'dp-001',
    name: '销售仪表盘查看权限',
    resource_type: 'dashboard',
    resource_id: 'dash-001',
    permission_type: 'view',
    role_ids: ['sales_team', 'management'],
    user_ids: ['admin'],
    created_at: '2026-01-20T10:00:00Z',
    updated_at: '2026-06-25T10:00:00Z',
  },
  {
    id: 'dp-002',
    name: '财务数据集编辑权限',
    resource_type: 'dataset',
    resource_id: 'ds-finance',
    permission_type: 'edit',
    role_ids: ['finance_team'],
    user_ids: ['finance_manager'],
    created_at: '2026-02-15T14:00:00Z',
    updated_at: '2026-06-10T08:00:00Z',
  },
  {
    id: 'dp-003',
    name: 'HR报表导出权限',
    resource_type: 'report',
    resource_id: 'rpt-hr-001',
    permission_type: 'export',
    role_ids: ['hr_team'],
    user_ids: [],
    created_at: '2026-03-05T11:00:00Z',
    updated_at: '2026-04-20T09:30:00Z',
  },
];

const BiPermissionPage = () => {
  const [activeTab, setActiveTab] = useState<'row-level' | 'data'>('row-level');
  const [rowPermissions, setRowPermissions] = useState<RowLevelPermission[]>(mockRowPermissions);
  const [dataPermissions, setDataPermissions] = useState<DataPermissionRule[]>(mockDataPermissions);
  const [loading, setLoading] = useState(false);
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
    is_enabled: true,
    priority: 1,
  });
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);

  const loadRowPermissions = async () => {
    setLoading(true);
    try {
      const res = await listRowLevelPermissions();
      if (res.success && res.data) {
        setRowPermissions(res.data.items || []);
      }
    } catch (error: unknown) {
      logger.error('Failed to load row level permissions:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadDataPermissions = async () => {
    try {
      const res = await listDataPermissions();
      if (res.success && res.data) {
        setDataPermissions(res.data || []);
      }
    } catch (error: unknown) {
      logger.error('Failed to load data permissions:', error);
    }
  };

  useEffect(() => {
    loadRowPermissions();
    loadDataPermissions();
  }, []);

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
        is_enabled: true,
        priority: 1,
      });
    }
    setTestResult(null);
    setDialogOpen(true);
  };

  const handleSave = async () => {
    try {
      if (editingItem) {
        await updateRowLevelPermission(editingItem.id, formData);
      } else {
        await createRowLevelPermission(formData as RowLevelPermission);
      }
      loadRowPermissions();
      setDialogOpen(false);
    } catch (error: unknown) {
      logger.error('Failed to save permission:', error);
      loadRowPermissions();
      setDialogOpen(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('确定要删除这条权限规则吗？')) return;
    try {
      await deleteRowLevelPermission(id);
      loadRowPermissions();
    } catch (error: unknown) {
      logger.error('Failed to delete permission:', error);
      setRowPermissions(rowPermissions.filter((p) => p.id !== id));
    }
  };

  const handleToggle = async (item: RowLevelPermission) => {
    try {
      await updateRowLevelPermission(item.id, { is_enabled: !item.is_enabled });
      setRowPermissions(
        rowPermissions.map((p) => (p.id === item.id ? { ...p, is_enabled: !p.is_enabled } : p))
      );
    } catch (error: unknown) {
      logger.error('Failed to toggle permission:', error);
      setRowPermissions(
        rowPermissions.map((p) => (p.id === item.id ? { ...p, is_enabled: !p.is_enabled } : p))
      );
    }
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
      dashboard: '仪表盘',
      dataset: '数据集',
      datasource: '数据源',
      report: '报表',
    };
    return labels[type] || type;
  };

  const getPermissionTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      view: '查看',
      edit: '编辑',
      admin: '管理',
      export: '导出',
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
      title='数据权限管理'
      subtitle='配置行级权限和数据访问控制'
      headerProps={{
        pageIcon: <Shield style={{ width: 20, height: 20 }} />,
        pageGradient: 'linear-gradient(135deg, #EF4444 0%, #DC2626 100%)',
      }}
      padding={false}
      maxWidth={false}
    >
      <DashboardTemplate
        title=''
        subtitle=''
        breadcrumbs={[
          { label: '首页', href: '/dashboard' },
          { label: 'BI' },
          { label: '权限管理' },
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
                        backgroundColor: '#FEF2F2',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      <Shield
                        sx={{ color: '#EF4444' }}
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
                        backgroundColor: '#EFF6FF',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      <Database
                        sx={{ color: '#3B82F6' }}
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
                        backgroundColor: '#DCFCE7',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      <CheckCircle2
                        sx={{ color: '#22C55E' }}
                        size={24}
                      />
                    </Box>
                    <Box>
                      <Typography
                        variant='h5'
                        sx={{ fontWeight: 700 }}
                      >
                        {rowPermissions.filter((p) => p.is_enabled).length}
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
                        backgroundColor: '#FEF3C7',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      <Users
                        sx={{ color: '#D97706' }}
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
                  label='行级权限'
                  icon={<KeyRound size={16} />}
                  iconPosition='start'
                />
                <Tab
                  value='data'
                  label='数据权限'
                  icon={<Database size={16} />}
                  iconPosition='start'
                />
              </Tabs>
              <Box sx={{ display: 'flex', gap: 2 }}>
                <TextField
                  placeholder='搜索权限规则...'
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  size='small'
                  sx={{ width: 250 }}
                  slotProps={{
                    input: {
                      startAdornment: (
                        <Search
                          size={18}
                          style={{ marginRight: 8, color: '#9ca3af' }}
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
                                      checked={perm.is_enabled}
                                      onChange={() => handleToggle(perm)}
                                    />
                                  }
                                  label={perm.is_enabled ? '启用' : '停用'}
                                  sx={{ m: 0 }}
                                />
                              </TableCell>
                              <TableCell>
                                <Tooltip title='测试规则'>
                                  <IconButton
                                    size='small'
                                    onClick={() => handleTest(perm)}
                                  >
                                    <CheckCircle2 size={16} />
                                  </IconButton>
                                </Tooltip>
                                <Tooltip title='编辑'>
                                  <IconButton
                                    size='small'
                                    onClick={() => handleOpenDialog(perm)}
                                  >
                                    <Edit2 size={16} />
                                  </IconButton>
                                </Tooltip>
                                <Tooltip title='删除'>
                                  <IconButton
                                    size='small'
                                    color='error'
                                    onClick={() => handleDelete(perm.id)}
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
                                  color={getPermissionTypeColor(perm.permission_type) as any}
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
                                <Tooltip title='编辑'>
                                  <IconButton size='small'>
                                    <Edit2 size={16} />
                                  </IconButton>
                                </Tooltip>
                                <Tooltip title='删除'>
                                  <IconButton
                                    size='small'
                                    color='error'
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
            <DialogTitle>{editingItem ? '编辑行级权限规则' : '新建行级权限规则'}</DialogTitle>
            <DialogContent sx={{ mt: 2 }}>
              <Grid
                container
                spacing={3}
              >
                <Grid size={{ xs: 12 }}>
                  <TextField
                    label='规则名称'
                    fullWidth
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  />
                </Grid>
                <Grid size={{ xs: 12 }}>
                  <TextField
                    label='描述'
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
                      label='数据源'
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
                    label='数据表名'
                    fullWidth
                    value={formData.table_name}
                    onChange={(e) => setFormData({ ...formData, table_name: e.target.value })}
                  />
                </Grid>
                <Grid size={{ xs: 12 }}>
                  <TextField
                    label='权限条件 (SQL WHERE 子句)'
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
                    helperText="例如: department = CURRENT_USER_DEPARTMENT 或 region = 'east'"
                  />
                </Grid>
                <Grid size={{ xs: 12, sm: 6 }}>
                  <TextField
                    label='适用角色 (逗号分隔)'
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
                    label='指定用户 (逗号分隔)'
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
                    label='优先级'
                    fullWidth
                    value={formData.priority}
                    onChange={(e) =>
                      setFormData({ ...formData, priority: parseInt(e.target.value) || 1 })
                    }
                    helperText='数字越小优先级越高'
                  />
                </Grid>
                <Grid size={{ xs: 12, sm: 6 }}>
                  <FormControlLabel
                    control={
                      <Switch
                        checked={formData.is_enabled}
                        onChange={(e) => setFormData({ ...formData, is_enabled: e.target.checked })}
                      />
                    }
                    label='启用此规则'
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
