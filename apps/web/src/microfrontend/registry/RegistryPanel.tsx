import React, { useState, useEffect, useCallback } from 'react';
import {
  Box,
  Typography,
  Button,
  IconButton,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Chip,
  TextField,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Drawer,
  Divider,
  Alert,
  Snackbar,
} from '@mui/material';
import {
  Layers as LayersIcon,
  X as XIcon,
  Plus as PlusIcon,
  Trash2 as TrashIcon,
  RefreshCw as RefreshIcon,
  AlertTriangle as AlertIcon,
  CheckCircle as CheckIcon,
  XCircle as XCircleIcon,
  ArrowRight as ArrowRightIcon,
} from 'lucide-react';
import {
  moduleRegistry,
  type ModuleRegistration,
  type ModuleStatus,
  type ModuleType,
} from './module-registry';

interface RegistryPanelProps {
  onClose?: () => void;
}

const RegistryPanel: React.FC<RegistryPanelProps> = ({ onClose }) => {
  const [modules, setModules] = useState<ModuleRegistration[]>([]);
  const [selectedModule, setSelectedModule] = useState<ModuleRegistration | null>(null);
  const [filterType, setFilterType] = useState<string>('');
  const [filterStatus, setFilterStatus] = useState<string>('');
  const [searchKeyword, setSearchKeyword] = useState('');
  const [showRegisterDialog, setShowRegisterDialog] = useState(false);
  const [circularResult, setCircularResult] = useState<{
    hasCircular: boolean;
    cycles: string[][];
  }>({ hasCircular: false, cycles: [] });
  const [snackbar, setSnackbar] = useState<{
    open: boolean;
    message: string;
    type: 'success' | 'error';
  }>({ open: false, message: '', type: 'success' });

  const [newModule, setNewModule] = useState<Partial<ModuleRegistration>>({
    id: '',
    name: '',
    version: '1.0.0',
    entryUrl: '',
    type: 'app',
    status: 'active',
    description: '',
    dependencies: [],
  });

  const refreshModules = useCallback(() => {
    const filtered = moduleRegistry.listModules({
      type: filterType as ModuleType | undefined,
      status: filterStatus as ModuleStatus | undefined,
      keyword: searchKeyword || undefined,
    });
    setModules(filtered);
  }, [filterType, filterStatus, searchKeyword]);

  useEffect(() => {
    refreshModules();
    const unsubscribe = moduleRegistry.subscribe(() => refreshModules());
    return unsubscribe;
  }, [refreshModules]);

  const handleRegister = () => {
    try {
      moduleRegistry.registerModule(newModule as any);
      setShowRegisterDialog(false);
      setSnackbar({ open: true, message: `模块 ${newModule.id} 注册成功`, type: 'success' });
      setNewModule({
        id: '',
        name: '',
        version: '1.0.0',
        entryUrl: '',
        type: 'app',
        status: 'active',
        description: '',
        dependencies: [],
      });
    } catch (err) {
      setSnackbar({
        open: true,
        message: err instanceof Error ? err.message : '注册失败',
        type: 'error',
      });
    }
  };

  const handleUnregister = (moduleId: string) => {
    const success = moduleRegistry.unregisterModule(moduleId);
    if (success) {
      setSnackbar({ open: true, message: `模块 ${moduleId} 已注销`, type: 'success' });
      if (selectedModule?.id === moduleId) {
        setSelectedModule(null);
      }
    }
  };

  const handleCheckCircular = () => {
    const result = moduleRegistry.checkCircularDependencies();
    setCircularResult(result);
  };

  const getStatusColor = (status: ModuleStatus) => {
    switch (status) {
      case 'active':
        return 'success';
      case 'disabled':
        return 'default';
      case 'deprecated':
        return 'warning';
      case 'error':
        return 'error';
      default:
        return 'default';
    }
  };

  const formatDate = (timestamp: number): string => {
    return new Date(timestamp).toLocaleString();
  };

  return (
    <Box
      sx={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        bgcolor: 'background.default',
        zIndex: 10000,
        display: 'flex',
        flexDirection: 'column',
        fontFamily: 'system-ui, -apple-system, sans-serif',
      }}
    >
      <Box
        sx={{
          p: 2,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          bgcolor: 'secondary.main',
          color: 'secondary.contrastText',
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <LayersIcon size={24} />
          <Typography
            variant='h6'
            sx={{ fontWeight: 700 }}
          >
            模块注册中心
          </Typography>
          <Chip
            label={modules.length}
            size='small'
            sx={{ bgcolor: 'action.disabledBackground', color: 'common.white' }}
          />
        </Box>
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Button
            size='small'
            onClick={handleCheckCircular}
            startIcon={<AlertIcon size={16} />}
            sx={{ color: 'common.white', borderColor: 'action.disabledBackground' }}
            variant='outlined'
          >
            检测循环依赖
          </Button>
          <Button
            size='small'
            onClick={() => setShowRegisterDialog(true)}
            startIcon={<PlusIcon size={16} />}
            sx={{ color: 'common.white', borderColor: 'action.disabledBackground' }}
            variant='outlined'
          >
            注册模块
          </Button>
          <Button
            size='small'
            onClick={refreshModules}
            startIcon={<RefreshIcon size={16} />}
            sx={{ color: 'common.white', borderColor: 'action.disabledBackground' }}
            variant='outlined'
          >
            刷新
          </Button>
          {onClose && (
            <IconButton
              onClick={onClose}
              sx={{ color: 'common.white' }}
            >
              <XIcon size={20} />
            </IconButton>
          )}
        </Box>
      </Box>

      <Box
        sx={{
          p: 2,
          display: 'flex',
          gap: 2,
          alignItems: 'center',
          bgcolor: 'background.paper',
          borderBottom: 1,
          borderColor: 'divider',
        }}
      >
        <TextField
          size='small'
          placeholder='搜索模块...'
          value={searchKeyword}
          onChange={(e) => setSearchKeyword(e.target.value)}
          sx={{ minWidth: 200 }}
        />
        <FormControl
          size='small'
          sx={{ minWidth: 120 }}
        >
          <InputLabel>类型</InputLabel>
          <Select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            label='类型'
          >
            <MenuItem value=''>全部</MenuItem>
            <MenuItem value='app'>应用</MenuItem>
            <MenuItem value='component'>组件</MenuItem>
            <MenuItem value='library'>库</MenuItem>
            <MenuItem value='utility'>工具</MenuItem>
          </Select>
        </FormControl>
        <FormControl
          size='small'
          sx={{ minWidth: 120 }}
        >
          <InputLabel>状态</InputLabel>
          <Select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            label='状态'
          >
            <MenuItem value=''>全部</MenuItem>
            <MenuItem value='active'>活跃</MenuItem>
            <MenuItem value='disabled'>禁用</MenuItem>
            <MenuItem value='deprecated'>废弃</MenuItem>
            <MenuItem value='error'>错误</MenuItem>
          </Select>
        </FormControl>
      </Box>

      {circularResult.hasCircular && (
        <Alert
          severity='warning'
          sx={{ mx: 2, mt: 2 }}
        >
          检测到 {circularResult.cycles.length} 个循环依赖:
          <Box sx={{ mt: 1 }}>
            {circularResult.cycles.map((cycle, idx) => (
              <Typography
                key={idx}
                variant='body2'
                sx={{ fontFamily: 'monospace' }}
              >
                {cycle.join(' → ')}
              </Typography>
            ))}
          </Box>
        </Alert>
      )}

      <Box sx={{ flex: 1, overflow: 'auto', p: 2 }}>
        <TableContainer
          component={Paper}
          variant='outlined'
        >
          <Table size='small'>
            <TableHead>
              <TableRow sx={{ bgcolor: 'action.hover' }}>
                <TableCell sx={{ fontWeight: 600 }}>模块ID</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>名称</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>版本</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>类型</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>状态</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>入口URL</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>依赖数</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>更新时间</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>操作</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {modules.map((m) => (
                <TableRow
                  key={m.id}
                  hover
                  onClick={() => setSelectedModule(m)}
                  sx={{ cursor: 'pointer' }}
                >
                  <TableCell sx={{ fontFamily: 'monospace', fontSize: 12, fontWeight: 600 }}>
                    {m.id}
                  </TableCell>
                  <TableCell>{m.name}</TableCell>
                  <TableCell sx={{ fontFamily: 'monospace' }}>{m.version}</TableCell>
                  <TableCell>
                    <Chip
                      label={m.type}
                      size='small'
                      variant='outlined'
                    />
                  </TableCell>
                  <TableCell>
                    <Chip
                      label={m.status}
                      size='small'
                      color={getStatusColor(m.status)}
                      variant='outlined'
                    />
                  </TableCell>
                  <TableCell
                    sx={{
                      fontFamily: 'monospace',
                      fontSize: 11,
                      maxWidth: 200,
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {m.entryUrl}
                  </TableCell>
                  <TableCell align='center'>{m.dependencies.length}</TableCell>
                  <TableCell>{formatDate(m.updatedAt)}</TableCell>
                  <TableCell>
                    <IconButton
                      size='small'
                      color='error'
                      onClick={(e) => {
                        e.stopPropagation();
                        handleUnregister(m.id);
                      }}
                    >
                      <TrashIcon size={16} />
                    </IconButton>
                  </TableCell>
                </TableRow>
              ))}
              {modules.length === 0 && (
                <TableRow>
                  <TableCell
                    colSpan={9}
                    align='center'
                  >
                    <Typography
                      color='text.secondary'
                      sx={{ py: 4 }}
                    >
                      暂无注册模块
                    </Typography>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </Box>

      <Drawer
        anchor='right'
        open={!!selectedModule}
        onClose={() => setSelectedModule(null)}
      >
        <Box sx={{ width: 400, p: 3 }}>
          <Box
            sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}
          >
            <Typography
              variant='h6'
              sx={{ fontWeight: 600 }}
            >
              模块详情
            </Typography>
            <IconButton onClick={() => setSelectedModule(null)}>
              <XIcon size={20} />
            </IconButton>
          </Box>
          <Divider sx={{ mb: 2 }} />
          {selectedModule && (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              <Box>
                <Typography
                  variant='caption'
                  color='text.secondary'
                >
                  模块ID
                </Typography>
                <Typography
                  variant='body1'
                  sx={{ fontFamily: 'monospace', fontWeight: 600 }}
                >
                  {selectedModule.id}
                </Typography>
              </Box>
              <Box>
                <Typography
                  variant='caption'
                  color='text.secondary'
                >
                  名称
                </Typography>
                <Typography variant='body1'>{selectedModule.name}</Typography>
              </Box>
              {selectedModule.description && (
                <Box>
                  <Typography
                    variant='caption'
                    color='text.secondary'
                  >
                    描述
                  </Typography>
                  <Typography variant='body1'>{selectedModule.description}</Typography>
                </Box>
              )}
              <Box>
                <Typography
                  variant='caption'
                  color='text.secondary'
                >
                  版本
                </Typography>
                <Typography
                  variant='body1'
                  sx={{ fontFamily: 'monospace' }}
                >
                  {selectedModule.version}
                </Typography>
              </Box>
              <Box>
                <Typography
                  variant='caption'
                  color='text.secondary'
                >
                  类型
                </Typography>
                <Chip
                  label={selectedModule.type}
                  size='small'
                />
              </Box>
              <Box>
                <Typography
                  variant='caption'
                  color='text.secondary'
                >
                  状态
                </Typography>
                <Chip
                  label={selectedModule.status}
                  size='small'
                  color={getStatusColor(selectedModule.status)}
                />
              </Box>
              <Box>
                <Typography
                  variant='caption'
                  color='text.secondary'
                >
                  入口URL
                </Typography>
                <Typography
                  variant='body2'
                  sx={{ fontFamily: 'monospace', wordBreak: 'break-all' }}
                >
                  {selectedModule.entryUrl}
                </Typography>
              </Box>

              <Divider />

              <Box>
                <Typography
                  variant='subtitle2'
                  sx={{ fontWeight: 600, mb: 1 }}
                >
                  依赖模块 ({selectedModule.dependencies.length})
                </Typography>
                {selectedModule.dependencies.length === 0 ? (
                  <Typography
                    variant='body2'
                    color='text.secondary'
                  >
                    无依赖
                  </Typography>
                ) : (
                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                    {selectedModule.dependencies.map((dep) => (
                      <Chip
                        key={dep}
                        label={dep}
                        size='small'
                        variant='outlined'
                      />
                    ))}
                  </Box>
                )}
              </Box>

              <Box>
                <Typography
                  variant='subtitle2'
                  sx={{ fontWeight: 600, mb: 1 }}
                >
                  暴露模块 ({selectedModule.exposes.length})
                </Typography>
                {selectedModule.exposes.length === 0 ? (
                  <Typography
                    variant='body2'
                    color='text.secondary'
                  >
                    无暴露
                  </Typography>
                ) : (
                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                    {selectedModule.exposes.map((exp) => (
                      <Chip
                        key={exp}
                        label={exp}
                        size='small'
                        color='primary'
                        variant='outlined'
                      />
                    ))}
                  </Box>
                )}
              </Box>

              <Box>
                <Typography
                  variant='subtitle2'
                  sx={{ fontWeight: 600, mb: 1 }}
                >
                  被依赖模块
                </Typography>
                {(() => {
                  const dependents = moduleRegistry.getModuleDependents(selectedModule.id);
                  if (dependents.length === 0) {
                    return (
                      <Typography
                        variant='body2'
                        color='text.secondary'
                      >
                        无被依赖
                      </Typography>
                    );
                  }
                  return (
                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                      {dependents.map((d) => (
                        <Chip
                          key={d.id}
                          label={d.id}
                          size='small'
                          color='secondary'
                          variant='outlined'
                        />
                      ))}
                    </Box>
                  );
                })()}
              </Box>

              <Divider />

              <Box>
                <Typography
                  variant='caption'
                  color='text.secondary'
                >
                  创建时间
                </Typography>
                <Typography variant='body2'>{formatDate(selectedModule.createdAt)}</Typography>
              </Box>
              <Box>
                <Typography
                  variant='caption'
                  color='text.secondary'
                >
                  更新时间
                </Typography>
                <Typography variant='body2'>{formatDate(selectedModule.updatedAt)}</Typography>
              </Box>
            </Box>
          )}
        </Box>
      </Drawer>

      <Drawer
        anchor='right'
        open={showRegisterDialog}
        onClose={() => setShowRegisterDialog(false)}
      >
        <Box sx={{ width: 400, p: 3 }}>
          <Box
            sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}
          >
            <Typography
              variant='h6'
              sx={{ fontWeight: 600 }}
            >
              注册新模块
            </Typography>
            <IconButton onClick={() => setShowRegisterDialog(false)}>
              <XIcon size={20} />
            </IconButton>
          </Box>
          <Divider sx={{ mb: 2 }} />
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <TextField
              label='模块ID'
              value={newModule.id}
              onChange={(e) => setNewModule({ ...newModule, id: e.target.value })}
              size='small'
              helperText='字母开头，字母数字下划线连字符'
            />
            <TextField
              label='模块名称'
              value={newModule.name}
              onChange={(e) => setNewModule({ ...newModule, name: e.target.value })}
              size='small'
            />
            <TextField
              label='版本号'
              value={newModule.version}
              onChange={(e) => setNewModule({ ...newModule, version: e.target.value })}
              size='small'
            />
            <TextField
              label='入口URL'
              value={newModule.entryUrl}
              onChange={(e) => setNewModule({ ...newModule, entryUrl: e.target.value })}
              size='small'
              helperText='远程模块入口地址'
            />
            <FormControl size='small'>
              <InputLabel>类型</InputLabel>
              <Select
                value={newModule.type}
                onChange={(e) => setNewModule({ ...newModule, type: e.target.value as ModuleType })}
                label='类型'
              >
                <MenuItem value='app'>应用</MenuItem>
                <MenuItem value='component'>组件</MenuItem>
                <MenuItem value='library'>库</MenuItem>
                <MenuItem value='utility'>工具</MenuItem>
              </Select>
            </FormControl>
            <FormControl size='small'>
              <InputLabel>状态</InputLabel>
              <Select
                value={newModule.status}
                onChange={(e) =>
                  setNewModule({ ...newModule, status: e.target.value as ModuleStatus })
                }
                label='状态'
              >
                <MenuItem value='active'>活跃</MenuItem>
                <MenuItem value='disabled'>禁用</MenuItem>
                <MenuItem value='deprecated'>废弃</MenuItem>
                <MenuItem value='error'>错误</MenuItem>
              </Select>
            </FormControl>
            <TextField
              label='描述'
              value={newModule.description}
              onChange={(e) => setNewModule({ ...newModule, description: e.target.value })}
              size='small'
              multiline
              rows={2}
            />
            <TextField
              label='依赖模块 (逗号分隔)'
              value={(newModule.dependencies || []).join(', ')}
              onChange={(e) =>
                setNewModule({
                  ...newModule,
                  dependencies: e.target.value
                    .split(',')
                    .map((s) => s.trim())
                    .filter(Boolean),
                })
              }
              size='small'
              helperText='模块ID列表，用逗号分隔'
            />
            <Button
              variant='contained'
              onClick={handleRegister}
              startIcon={<PlusIcon size={18} />}
            >
              注册模块
            </Button>
          </Box>
        </Box>
      </Drawer>

      <Snackbar
        open={snackbar.open}
        autoHideDuration={3000}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert
          severity={snackbar.type}
          onClose={() => setSnackbar({ ...snackbar, open: false })}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default RegistryPanel;
