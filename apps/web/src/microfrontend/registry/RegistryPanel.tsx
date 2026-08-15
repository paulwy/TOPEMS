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
import i18n from '@/i18n';
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
      setSnackbar({ open: true, message: `${i18n.t('microfrontend.registry_panel.k0')} ${newModule.id} ${i18n.t('microfrontend.registry_panel.k1')}`, type: 'success' });
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
        message: err instanceof Error ? err.message : i18n.t('microfrontend.registry_panel.k0'),
        type: 'error',
      });
    }
  };

  const handleUnregister = (moduleId: string) => {
    const success = moduleRegistry.unregisterModule(moduleId);
    if (success) {
      setSnackbar({ open: true, message: `${i18n.t('microfrontend.registry_panel.k2')} ${moduleId} ${i18n.t('microfrontend.registry_panel.k3')}`, type: 'success' });
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
            {i18n.t('microfrontend.registry_panel.k4')}
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
            {i18n.t('microfrontend.registry_panel.k5')}
          </Button>
          <Button
            size='small'
            onClick={() => setShowRegisterDialog(true)}
            startIcon={<PlusIcon size={16} />}
            sx={{ color: 'common.white', borderColor: 'action.disabledBackground' }}
            variant='outlined'
          >
            {i18n.t('microfrontend.registry_panel.k6')}
          </Button>
          <Button
            size='small'
            onClick={refreshModules}
            startIcon={<RefreshIcon size={16} />}
            sx={{ color: 'common.white', borderColor: 'action.disabledBackground' }}
            variant='outlined'
          >
            {i18n.t('microfrontend.registry_panel.k7')}
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
          placeholder={i18n.t('microfrontend.registry_panel.k8')}
          value={searchKeyword}
          onChange={(e) => setSearchKeyword(e.target.value)}
          sx={{ minWidth: 200 }}
        />
        <FormControl
          size='small'
          sx={{ minWidth: 120 }}
        >
          <InputLabel>{i18n.t('microfrontend.registry_panel.k1')}</InputLabel>
          <Select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            label={i18n.t('microfrontend.registry_panel.k2')}
          >
            <MenuItem value=''>{i18n.t('microfrontend.registry_panel.k3')}</MenuItem>
            <MenuItem value='app'>{i18n.t('microfrontend.registry_panel.k4')}</MenuItem>
            <MenuItem value='component'>{i18n.t('microfrontend.registry_panel.k5')}</MenuItem>
            <MenuItem value='library'>{i18n.t('microfrontend.registry_panel.k9')}</MenuItem>
            <MenuItem value='utility'>{i18n.t('microfrontend.registry_panel.k6')}</MenuItem>
          </Select>
        </FormControl>
        <FormControl
          size='small'
          sx={{ minWidth: 120 }}
        >
          <InputLabel>{i18n.t('microfrontend.registry_panel.k7')}</InputLabel>
          <Select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            label={i18n.t('microfrontend.registry_panel.k8')}
          >
            <MenuItem value=''>{i18n.t('microfrontend.registry_panel.k9')}</MenuItem>
            <MenuItem value='active'>{i18n.t('microfrontend.registry_panel.k10')}</MenuItem>
            <MenuItem value='disabled'>{i18n.t('microfrontend.registry_panel.k11')}</MenuItem>
            <MenuItem value='deprecated'>{i18n.t('microfrontend.registry_panel.k12')}</MenuItem>
            <MenuItem value='error'>{i18n.t('microfrontend.registry_panel.k13')}</MenuItem>
          </Select>
        </FormControl>
      </Box>

      {circularResult.hasCircular && (
        <Alert
          severity='warning'
          sx={{ mx: 2, mt: 2 }}
        >
          {i18n.t('microfrontend.registry_panel.k0')} {circularResult.cycles.length} {i18n.t('microfrontend.registry_panel.k1')}
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
                <TableCell sx={{ fontWeight: 600 }}>{i18n.t('microfrontend.registry_panel.id_14')}</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>{i18n.t('microfrontend.registry_panel.k15')}</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>{i18n.t('microfrontend.registry_panel.k16')}</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>{i18n.t('microfrontend.registry_panel.k17')}</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>{i18n.t('microfrontend.registry_panel.k18')}</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>{i18n.t('microfrontend.registry_panel.url_19')}</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>{i18n.t('microfrontend.registry_panel.k20')}</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>{i18n.t('microfrontend.registry_panel.k21')}</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>{i18n.t('microfrontend.registry_panel.k22')}</TableCell>
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
                      {i18n.t('microfrontend.registry_panel.k10')}
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
              {i18n.t('microfrontend.registry_panel.k11')}
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
                  {i18n.t('microfrontend.registry_panel.id_12')}
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
                  {i18n.t('microfrontend.registry_panel.k13')}
                </Typography>
                <Typography variant='body1'>{selectedModule.name}</Typography>
              </Box>
              {selectedModule.description && (
                <Box>
                  <Typography
                    variant='caption'
                    color='text.secondary'
                  >
                    {i18n.t('microfrontend.registry_panel.k14')}
                  </Typography>
                  <Typography variant='body1'>{selectedModule.description}</Typography>
                </Box>
              )}
              <Box>
                <Typography
                  variant='caption'
                  color='text.secondary'
                >
                  {i18n.t('microfrontend.registry_panel.k15')}
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
                  {i18n.t('microfrontend.registry_panel.k16')}
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
                  {i18n.t('microfrontend.registry_panel.k17')}
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
                  {i18n.t('microfrontend.registry_panel.url_18')}
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
                  {i18n.t('microfrontend.registry_panel.k2')}{selectedModule.dependencies.length})
                </Typography>
                {selectedModule.dependencies.length === 0 ? (
                  <Typography
                    variant='body2'
                    color='text.secondary'
                  >
                    {i18n.t('microfrontend.registry_panel.k19')}
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
                  {i18n.t('microfrontend.registry_panel.k3')}{selectedModule.exposes.length})
                </Typography>
                {selectedModule.exposes.length === 0 ? (
                  <Typography
                    variant='body2'
                    color='text.secondary'
                  >
                    {i18n.t('microfrontend.registry_panel.k20')}
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
                  {i18n.t('microfrontend.registry_panel.k21')}
                </Typography>
                {(() => {
                  const dependents = moduleRegistry.getModuleDependents(selectedModule.id);
                  if (dependents.length === 0) {
                    return (
                      <Typography
                        variant='body2'
                        color='text.secondary'
                      >
                        {i18n.t('microfrontend.registry_panel.k22')}
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
                  {i18n.t('microfrontend.registry_panel.k23')}
                </Typography>
                <Typography variant='body2'>{formatDate(selectedModule.createdAt)}</Typography>
              </Box>
              <Box>
                <Typography
                  variant='caption'
                  color='text.secondary'
                >
                  {i18n.t('microfrontend.registry_panel.k24')}
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
              {i18n.t('microfrontend.registry_panel.k25')}
            </Typography>
            <IconButton onClick={() => setShowRegisterDialog(false)}>
              <XIcon size={20} />
            </IconButton>
          </Box>
          <Divider sx={{ mb: 2 }} />
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <TextField
              label={i18n.t('microfrontend.registry_panel.id_23')}
              value={newModule.id}
              onChange={(e) => setNewModule({ ...newModule, id: e.target.value })}
              size='small'
              helperText={i18n.t('microfrontend.registry_panel.k24')}
            />
            <TextField
              label={i18n.t('microfrontend.registry_panel.k25')}
              value={newModule.name}
              onChange={(e) => setNewModule({ ...newModule, name: e.target.value })}
              size='small'
            />
            <TextField
              label={i18n.t('microfrontend.registry_panel.k26')}
              value={newModule.version}
              onChange={(e) => setNewModule({ ...newModule, version: e.target.value })}
              size='small'
            />
            <TextField
              label={i18n.t('microfrontend.registry_panel.url_27')}
              value={newModule.entryUrl}
              onChange={(e) => setNewModule({ ...newModule, entryUrl: e.target.value })}
              size='small'
              helperText={i18n.t('microfrontend.registry_panel.k28')}
            />
            <FormControl size='small'>
              <InputLabel>{i18n.t('microfrontend.registry_panel.k29')}</InputLabel>
              <Select
                value={newModule.type}
                onChange={(e) => setNewModule({ ...newModule, type: e.target.value as ModuleType })}
                label={i18n.t('microfrontend.registry_panel.k30')}
              >
                <MenuItem value='app'>{i18n.t('microfrontend.registry_panel.k31')}</MenuItem>
                <MenuItem value='component'>{i18n.t('microfrontend.registry_panel.k32')}</MenuItem>
                <MenuItem value='library'>{i18n.t('microfrontend.registry_panel.k26')}</MenuItem>
                <MenuItem value='utility'>{i18n.t('microfrontend.registry_panel.k33')}</MenuItem>
              </Select>
            </FormControl>
            <FormControl size='small'>
              <InputLabel>{i18n.t('microfrontend.registry_panel.k34')}</InputLabel>
              <Select
                value={newModule.status}
                onChange={(e) =>
                  setNewModule({ ...newModule, status: e.target.value as ModuleStatus })
                }
                label={i18n.t('microfrontend.registry_panel.k35')}
              >
                <MenuItem value='active'>{i18n.t('microfrontend.registry_panel.k36')}</MenuItem>
                <MenuItem value='disabled'>{i18n.t('microfrontend.registry_panel.k37')}</MenuItem>
                <MenuItem value='deprecated'>{i18n.t('microfrontend.registry_panel.k38')}</MenuItem>
                <MenuItem value='error'>{i18n.t('microfrontend.registry_panel.k39')}</MenuItem>
              </Select>
            </FormControl>
            <TextField
              label={i18n.t('microfrontend.registry_panel.k40')}
              value={newModule.description}
              onChange={(e) => setNewModule({ ...newModule, description: e.target.value })}
              size='small'
              multiline
              rows={2}
            />
            <TextField
              label={i18n.t('microfrontend.registry_panel.k41')}
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
              helperText={i18n.t('microfrontend.registry_panel.id_42')}
            />
            <Button
              variant='contained'
              onClick={handleRegister}
              startIcon={<PlusIcon size={18} />}
            >
              {i18n.t('microfrontend.registry_panel.k27')}
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
