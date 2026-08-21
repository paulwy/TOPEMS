import React from 'react';
import {
  Box,
  Typography,
  IconButton,
  Button,
  Paper,
  Chip,
  Stack,
  Tabs,
  Tab,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  List,
  ListItem,
  Divider,
  Alert,
  LinearProgress,
  Badge,
  TextField,
  MenuItem,
  Select,
  FormControl,
  InputLabel,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Card,
  useTheme,
} from '@mui/material';
import i18n from '@/i18n';
import {
  X as XIcon,
  Cpu,
  MemoryStick,
  Zap,
  Gauge,
  AlertTriangle,
  Search,
  Activity,
  Workflow,
  Wrench,
  Clock,
  Play,
  PauseCircle,
  Plus,
  Bot,
  Database,
  Shield,
  FileText,
  RefreshCw,
  ChevronDown,
  ChevronRight,
  Sparkles,
  Server,
  ArrowUpCircle,
  ArrowDownCircle,
} from 'lucide-react';
import {
  autoScaler,
  type ScalingPolicy,
  type ScalingAction,
  type ScalingMetric,
} from './auto-scaler';
import {
  rootCauseLocator,
  type Incident,
  type IncidentSeverity,
  type RootCause,
} from './root-cause-locator';
import {
  intelligentRepair,
  type RepairAction,
  type RepairPlaybook,
  type RepairType,
} from './intelligent-repair';
import { designTokens } from '@topems/tokens';
import { alpha } from '@mui/material/styles';

type TabId = 'scaling' | 'rca' | 'repair' | 'timeline';

const METRIC_ICONS: Record<ScalingMetric, React.ReactNode> = {
  CPU: <Cpu size={16} />,
  Memory: <MemoryStick size={16} />,
  RequestRate: <Zap size={16} />,
  Latency: <Gauge size={16} />,
};

const SEVERITY_COLORS: Record<IncidentSeverity, string> = {
  Critical: designTokens.colors.error.main,
  High: `${designTokens.colors.orange['500']}`,
  Medium: designTokens.colors.warning.main,
  Low: designTokens.colors.primary.main,
  Info: 'colors.grey.500',
};

const REPAIR_TYPE_COLORS: Record<RepairType, string> = {
  Restart: designTokens.colors.primary.main,
  ScaleUp: designTokens.colors.success.dark,
  ConfigUpdate: designTokens.colors.warning.main,
  Patched: designTokens.colors.secondary.main,
};

const REPAIR_STATUS_COLORS: Record<string, string> = {
  Pending: designTokens.colors.warning.main,
  Approved: designTokens.colors.primary.main,
  Executing: designTokens.colors.secondary.main,
  Completed: designTokens.colors.success.dark,
  Failed: designTokens.colors.error.main,
  RolledBack: 'colors.grey.500',
  Draft: `${designTokens.colors.grey['400']}`,
  Active: designTokens.colors.success.dark,
  Paused: designTokens.colors.warning.main,
  Archived: 'colors.grey.500',
};

const V56OpsPanel: React.FC<{ onClose: () => void }> = ({ onClose }) => {
  const [activeTab, setActiveTab] = React.useState<TabId>('scaling');
  const [policies, setPolicies] = React.useState<ScalingPolicy[]>([]);
  const [scalingHistory, setScalingHistory] = React.useState<ScalingAction[]>([]);
  const [incidents, setIncidents] = React.useState<Incident[]>([]);
  const [rootCauses, setRootCauses] = React.useState<Map<string, RootCause[]>>(new Map());
  const [playbooks, setPlaybooks] = React.useState<RepairPlaybook[]>([]);
  const [repairHistory, setRepairHistory] = React.useState<RepairAction[]>([]);
  const [selectedIncident, setSelectedIncident] = React.useState<string | null>(null);
  const [showCreateIncident, setShowCreateIncident] = React.useState(false);
  const [showCreatePlaybook, setShowCreatePlaybook] = React.useState(false);
  const [newIncident, setNewIncident] = React.useState({
    severity: 'High' as IncidentSeverity,
    symptoms: '',
    components: '',
  });
  const [newPlaybook, setNewPlaybook] = React.useState({
    name: '',
    trigger: '',
    target: '',
    type: 'Restart' as RepairType,
  });

  React.useEffect(() => {
    refreshData();
  }, []);

  const refreshData = () => {
  const theme = useTheme();
    setPolicies(autoScaler.listPolicies());
    setScalingHistory(autoScaler.getScalingHistory());
    setIncidents(rootCauseLocator.getIncidentHistory());
    setPlaybooks(intelligentRepair.getPlaybooks());
    setRepairHistory(intelligentRepair.getActionHistory());
  };

  const handleScale = (policyId: string) => {
    const action = autoScaler.scale(policyId);
    if (action) {
      setScalingHistory(autoScaler.getScalingHistory());
    }
  };

  const handleLocateRootCause = (incidentId: string) => {
    const causes = rootCauseLocator.locateRootCause(incidentId);
    setRootCauses((prev) => {
      const next = new Map(prev);
      next.set(incidentId, causes);
      return next;
    });
  };

  const handleCreateIncident = () => {
    if (!newIncident.symptoms.trim() || !newIncident.components.trim()) return;
    const incident = rootCauseLocator.createIncident(
      newIncident.severity,
      newIncident.symptoms.split(',').map((s) => s.trim()),
      newIncident.components.split(',').map((c) => c.trim())
    );
    setIncidents(rootCauseLocator.getIncidentHistory());
    setSelectedIncident(incident.id);
    setShowCreateIncident(false);
    setNewIncident({ severity: 'High', symptoms: '', components: '' });
  };

  const handleCreatePlaybook = () => {
    if (!newPlaybook.name.trim() || !newPlaybook.trigger.trim()) return;
    intelligentRepair.createPlaybook(
      newPlaybook.name,
      newPlaybook.trigger,
      [{ type: newPlaybook.type, target: newPlaybook.target || 'unknown' }],
      false,
      true
    );
    setPlaybooks(intelligentRepair.getPlaybooks());
    setShowCreatePlaybook(false);
    setNewPlaybook({ name: '', trigger: '', target: '', type: 'Restart' });
  };

  const handleRunPlaybook = (id: string) => {
    intelligentRepair.runPlaybook(id);
    setTimeout(() => {
      setRepairHistory(intelligentRepair.getActionHistory());
      setPlaybooks(intelligentRepair.getPlaybooks());
    }, 2500);
  };

  const handleExecuteRepair = (type: RepairType, target: string) => {
    intelligentRepair.executeRepair(type, target);
    setTimeout(() => {
      setRepairHistory(intelligentRepair.getActionHistory());
    }, 2500);
  };

  return (
    <Box
      sx={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        bgcolor: 'action.active',
        zIndex: 10000,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backdropFilter: 'blur(8px)',
      }}
      onClick={onClose}
    >
      <Box
        sx={{
          width: '98%',
          maxWidth: 1500,
          height: '94vh',
          bgcolor: 'background.paper',
          borderRadius: 3,
          overflow: 'hidden',
          boxShadow: designTokens.darkShadows['3xl'],
          display: 'flex',
          flexDirection: 'column',
          border: '1px solid ${alpha(theme.palette.warning.main, 0.2)}',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <V56PanelHeader onClose={onClose} />
        <Box sx={{ px: 2, py: 1.5, borderBottom: 1, borderColor: 'divider' }}>
          <Tabs
            value={activeTab}
            onChange={(_, v) => setActiveTab(v as TabId)}
            variant='scrollable'
            scrollButtons='auto'
          >
            <Tab
              icon={<Activity size={16} />}
              iconPosition='start'
              label={i18n.t('intelligent-ops.v56-ops-panel.k0')}
              value='scaling'
            />
            <Tab
              icon={<Search size={16} />}
              iconPosition='start'
              label={`${i18n.t('intelligent_ops.v56-ops-panel.k0')}${incidents.length})`}
              value='rca'
            />
            <Tab
              icon={<Wrench size={16} />}
              iconPosition='start'
              label={`${i18n.t('intelligent_ops.v56-ops-panel.k1')}${playbooks.length})`}
              value='repair'
            />
            <Tab
              icon={<Clock size={16} />}
              iconPosition='start'
              label={i18n.t('intelligent-ops.v56-ops-panel.k1')}
              value='timeline'
            />
          </Tabs>
        </Box>
        <Box sx={{ flex: 1, overflow: 'auto', bgcolor: 'grey.50' }}>
          {activeTab === 'scaling' && (
            <ScalingTab
              policies={policies}
              scalingHistory={scalingHistory}
              onScale={handleScale}
              onRefresh={refreshData}
            />
          )}
          {activeTab === 'rca' && (
            <RCATab
              incidents={incidents}
              rootCauses={rootCauses}
              selectedIncident={selectedIncident}
              onSelectIncident={setSelectedIncident}
              onLocateRootCause={handleLocateRootCause}
              onCreateIncident={() => setShowCreateIncident(true)}
              onUpdateStatus={(id, status) => {
                rootCauseLocator.updateIncidentStatus(id, status);
                setIncidents(rootCauseLocator.getIncidentHistory());
              }}
            />
          )}
          {activeTab === 'repair' && (
            <RepairTab
              playbooks={playbooks}
              repairHistory={repairHistory}
              onRunPlaybook={handleRunPlaybook}
              onExecuteRepair={handleExecuteRepair}
              onToggleStatus={(id) => {
                intelligentRepair.togglePlaybookStatus(id);
                setPlaybooks(intelligentRepair.getPlaybooks());
              }}
              onCreatePlaybook={() => setShowCreatePlaybook(true)}
            />
          )}
          {activeTab === 'timeline' && (
            <TimelineTab
              incidents={incidents}
              scalingHistory={scalingHistory}
              repairHistory={repairHistory}
            />
          )}
        </Box>
      </Box>

      {showCreateIncident && (
        <Dialog
          open={showCreateIncident}
          onClose={() => setShowCreateIncident(false)}
          maxWidth='sm'
          fullWidth
        >
          <DialogTitle>{i18n.t('intelligent-ops.v56-ops-panel.k2')}</DialogTitle>
          <DialogContent>
            <Box sx={{ mt: 2, display: 'flex', flexDirection: 'column', gap: 2 }}>
              <FormControl size='small'>
                <InputLabel>{i18n.t('intelligent-ops.v56-ops-panel.k3')}</InputLabel>
                <Select
                  value={newIncident.severity}
                  label={i18n.t('intelligent-ops.v56-ops-panel.k4')}
                  onChange={(e) =>
                    setNewIncident((prev) => ({
                      ...prev,
                      severity: e.target.value as IncidentSeverity,
                    }))
                  }
                >
                  <MenuItem value='Critical'>Critical</MenuItem>
                  <MenuItem value='High'>High</MenuItem>
                  <MenuItem value='Medium'>Medium</MenuItem>
                  <MenuItem value='Low'>Low</MenuItem>
                  <MenuItem value='Info'>Info</MenuItem>
                </Select>
              </FormControl>
              <TextField
                label={i18n.t('intelligent-ops.v56-ops-panel.k5')}
                value={newIncident.symptoms}
                onChange={(e) => setNewIncident((prev) => ({ ...prev, symptoms: e.target.value }))}
                fullWidth
                size='small'
                placeholder={i18n.t('intelligent_ops.v56-ops-panel.k2')}
              />
              <TextField
                label={i18n.t('intelligent-ops.v56-ops-panel.k6')}
                value={newIncident.components}
                onChange={(e) =>
                  setNewIncident((prev) => ({ ...prev, components: e.target.value }))
                }
                fullWidth
                size='small'
                placeholder={i18n.t('intelligent_ops.v56-ops-panel.k3')}
              />
            </Box>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setShowCreateIncident(false)}>
              {i18n.t('intelligent-ops.v56-ops-panel.k7')}
            </Button>
            <Button
              onClick={handleCreateIncident}
              variant='contained'
              sx={{ bgcolor: 'orange.500' }}
            >
              {i18n.t('intelligent_ops.v56-ops-panel.k4')}
            </Button>
          </DialogActions>
        </Dialog>
      )}

      {showCreatePlaybook && (
        <Dialog
          open={showCreatePlaybook}
          onClose={() => setShowCreatePlaybook(false)}
          maxWidth='sm'
          fullWidth
        >
          <DialogTitle>{i18n.t('intelligent-ops.v56-ops-panel.k8')}</DialogTitle>
          <DialogContent>
            <Box sx={{ mt: 2, display: 'flex', flexDirection: 'column', gap: 2 }}>
              <TextField
                label={i18n.t('intelligent-ops.v56-ops-panel.k9')}
                value={newPlaybook.name}
                onChange={(e) => setNewPlaybook((prev) => ({ ...prev, name: e.target.value }))}
                fullWidth
                size='small'
              />
              <TextField
                label={i18n.t('intelligent-ops.v56-ops-panel.k10')}
                value={newPlaybook.trigger}
                onChange={(e) => setNewPlaybook((prev) => ({ ...prev, trigger: e.target.value }))}
                fullWidth
                size='small'
                placeholder={i18n.t('intelligent_ops.v56-ops-panel.k5')}
              />
              <FormControl size='small'>
                <InputLabel>{i18n.t('intelligent-ops.v56-ops-panel.k11')}</InputLabel>
                <Select
                  value={newPlaybook.type}
                  label={i18n.t('intelligent-ops.v56-ops-panel.k12')}
                  onChange={(e) =>
                    setNewPlaybook((prev) => ({ ...prev, type: e.target.value as RepairType }))
                  }
                >
                  <MenuItem value='Restart'>{i18n.t('intelligent-ops.v56-ops-panel.k13')}</MenuItem>
                  <MenuItem value='ScaleUp'>{i18n.t('intelligent-ops.v56-ops-panel.k14')}</MenuItem>
                  <MenuItem value='ConfigUpdate'>
                    {i18n.t('intelligent-ops.v56-ops-panel.k15')}
                  </MenuItem>
                  <MenuItem value='Patched'>{i18n.t('intelligent-ops.v56-ops-panel.k16')}</MenuItem>
                </Select>
              </FormControl>
              <TextField
                label={i18n.t('intelligent-ops.v56-ops-panel.k17')}
                value={newPlaybook.target}
                onChange={(e) => setNewPlaybook((prev) => ({ ...prev, target: e.target.value }))}
                fullWidth
                size='small'
                placeholder={i18n.t('intelligent_ops.v56-ops-panel.apigateway_6')}
              />
            </Box>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setShowCreatePlaybook(false)}>
              {i18n.t('intelligent-ops.v56-ops-panel.k18')}
            </Button>
            <Button
              onClick={handleCreatePlaybook}
              variant='contained'
              sx={{ bgcolor: 'orange.500' }}
            >
              {i18n.t('intelligent_ops.v56-ops-panel.k7')}
            </Button>
          </DialogActions>
        </Dialog>
      )}
    </Box>
  );
};

const V56PanelHeader: React.FC<{ onClose: () => void }> = ({ onClose }) => (
  <Box
    sx={{
      p: 2,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      background: `linear-gradient(135deg, ${designTokens.colors.orange['500']} 0%, ${designTokens.colors.orange['600']} 50%, ${designTokens.colors.error.dark} 100%)`,
      color: 'common.white',
    }}
  >
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
      <Box
        sx={{
          width: 40,
          height: 40,
          borderRadius: 2,
          bgcolor: 'action.disabledBackground',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Bot size={22} />
      </Box>
      <Box>
        <Typography
          variant='h6'
          sx={{ fontWeight: 700, fontSize: 18 }}
        >
          {i18n.t('intelligent_ops.v56-ops-panel.v560_8')}
        </Typography>
        <Typography
          variant='caption'
          sx={{ opacity: 0.85, fontSize: 12 }}
        >
          {i18n.t('intelligent_ops.v56-ops-panel.k9')}
        </Typography>
      </Box>
    </Box>
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
      <Badge
        badgeContent='V56'
        color='secondary'
        sx={{
          '& .MuiBadge-badge': {
            bgcolor: 'warning.400',
            color: 'text.primary',
            fontWeight: 700,
            fontSize: 10,
          },
        }}
      >
        <Sparkles size={18} />
      </Badge>
      <IconButton
        size='small'
        onClick={onClose}
        sx={{ color: 'common.white' }}
      >
        <XIcon size={20} />
      </IconButton>
    </Box>
  </Box>
);

const ScalingTab: React.FC<{
  policies: ScalingPolicy[];
  scalingHistory: ScalingAction[];
  onScale: (policyId: string) => void;
  onRefresh: () => void;
}> = ({ policies, scalingHistory, onScale, onRefresh }) => {
  const [predictions] = React.useState(() => autoScaler.predictDemand(24));
  const totalInstances = React.useMemo(() => {
    let total = 0;
    policies.forEach((p) => {
      const capacity = autoScaler.getCurrentCapacity(p.id);
      capacity.forEach((v) => {
        total += v;
      });
    });
    return total || policies.length * 2;
  }, [policies]);

  return (
    <Box sx={{ p: 3 }}>
      <Stack
        direction='row'
        spacing={2}
        sx={{ mb: 3, justifyContent: 'space-between' }}
      >
        <Stack
          direction='row'
          spacing={2}
        >
          <Typography
            variant='h6'
            sx={{ fontWeight: 600, display: 'flex', alignItems: 'center', gap: 1 }}
          >
            <Server size={20} />
            {i18n.t('intelligent_ops.v56-ops-panel.k10')}
          </Typography>
          <Chip
            label={`${policies.length} ${i18n.t('intelligent_ops.v56-ops-panel.k11')}`}
            size='small'
            sx={{ bgcolor: 'orange.50', color: 'orange.800', fontWeight: 600 }}
          />
          <Chip
            label={`${i18n.t('intelligent_ops.v56-ops-panel.k12')} ${totalInstances} ${i18n.t('intelligent_ops.v56-ops-panel.k13')}`}
            size='small'
            sx={{ bgcolor: 'warning.100', color: 'warning.800', fontWeight: 600 }}
          />
          <Chip
            label={`${scalingHistory.length} ${i18n.t('intelligent_ops.v56-ops-panel.k14')}`}
            size='small'
            sx={{ bgcolor: 'success.50', color: 'teal.900', fontWeight: 600 }}
          />
        </Stack>
        <Button
          variant='outlined'
          startIcon={<RefreshCw size={14} />}
          onClick={onRefresh}
          size='small'
        >
          {i18n.t('intelligent_ops.v56-ops-panel.k15')}
        </Button>
      </Stack>

      <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 3 }}>
        <Card
          variant='outlined'
          sx={{ p: 2 }}
        >
          <Typography
            variant='subtitle2'
            sx={{ fontWeight: 600, mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}
          >
            <Gauge size={16} />
            {i18n.t('intelligent_ops.v56-ops-panel.k16')}
          </Typography>
          {policies.length === 0 && (
            <Alert severity='info'>{i18n.t('intelligent-ops.v56-ops-panel.k19')}</Alert>
          )}
          {policies.map((policy) => {
            const currentValue = autoScaler.getMetricValue(policy.metric);
            const capacity = autoScaler.getCurrentCapacity(policy.id);
            const currentInstances = Array.from(capacity.values())[0] ?? policy.min_instances;
            const percent = Math.min(100, (currentValue / policy.target) * 100);

            return (
              <Paper
                key={policy.id}
                elevation={0}
                sx={{
                  mb: 1.5,
                  border: '1px solid',
                  borderColor: 'divider',
                  borderRadius: 1,
                  p: 2,
                  bgcolor: 'common.white',
                }}
              >
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                  {METRIC_ICONS[policy.metric]}
                  <Typography
                    variant='body2'
                    sx={{ fontWeight: 600, flex: 1 }}
                  >
                    {policy.metric} {i18n.t('intelligent-ops.v56-ops-panel.k0')}
                  </Typography>
                  <Chip
                    label={`${currentInstances} ${i18n.t('intelligent_ops.v56-ops-panel.k17')}`}
                    size='small'
                    sx={{ fontSize: 10, height: 20 }}
                  />
                </Box>
                <Box sx={{ mb: 1 }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                    <Typography
                      variant='caption'
                      color='text.secondary'
                    >
                      [i18n.t('intelligent_ops.v56-ops-panel.k18')]: {currentValue.toFixed(1)}
                    </Typography>
                    <Typography
                      variant='caption'
                      color='text.secondary'
                    >
                      [i18n.t('intelligent_ops.v56-ops-panel.k19')]: {policy.target}
                    </Typography>
                  </Box>
                  <LinearProgress
                    variant='determinate'
                    value={percent}
                    sx={{
                      height: 6,
                      borderRadius: 2,
                      bgcolor:
                        percent > 90
                          ? designTokens.colors.error['200']
                          : percent > 70
                            ? 'var(--color-error-200)'
                            : 'colors.success.100',
                      '& .MuiLinearProgress-bar': {
                        bgcolor:
                          percent > 90
                            ? designTokens.colors.error.dark
                            : percent > 70
                              ? `${designTokens.colors.orange['500']}`
                              : designTokens.colors.success.dark,
                      },
                    }}
                  />
                </Box>
                <Typography
                  variant='caption'
                  color='text.secondary'
                  sx={{ display: 'block', mb: 1 }}
                >
                  [i18n.t('intelligent_ops.v56-ops-panel.k20')]: {policy.min_instances} -{' '}
                  {policy.max_instances} | {i18n.t('intelligent_ops.v56-ops-panel.k0')}:{' '}
                  {policy.cooldown_ms / 60000}
                  {i18n.t('intelligent-ops.v56-ops-panel.k1')}
                </Typography>
                <Button
                  variant='contained'
                  size='small'
                  startIcon={<Zap size={12} />}
                  onClick={() => onScale(policy.id)}
                  sx={{ bgcolor: 'orange.500', '&:hover': { bgcolor: 'orange.600' } }}
                >
                  {i18n.t('intelligent_ops.v56-ops-panel.k21')}
                </Button>
              </Paper>
            );
          })}
        </Card>

        <Card
          variant='outlined'
          sx={{ p: 2 }}
        >
          <Typography
            variant='subtitle2'
            sx={{ fontWeight: 600, mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}
          >
            <Activity size={16} />
            {i18n.t('intelligent_ops.v56-ops-panel.k22')}
          </Typography>
          {scalingHistory.length === 0 && (
            <Alert severity='info'>{i18n.t('intelligent-ops.v56-ops-panel.k20')}</Alert>
          )}
          {scalingHistory.length > 0 && (
            <Box sx={{ maxHeight: 400, overflow: 'auto' }}>
              <Table size='small'>
                <TableHead>
                  <TableRow>
                    <TableCell sx={{ fontWeight: 600, fontSize: 12 }}>
                      {i18n.t('intelligent-ops.v56-ops-panel.k21')}
                    </TableCell>
                    <TableCell sx={{ fontWeight: 600, fontSize: 12 }}>
                      {i18n.t('intelligent-ops.v56-ops-panel.k22')}
                    </TableCell>
                    <TableCell sx={{ fontWeight: 600, fontSize: 12 }}>
                      {i18n.t('intelligent-ops.v56-ops-panel.k23')}
                    </TableCell>
                    <TableCell sx={{ fontWeight: 600, fontSize: 12 }}>
                      {i18n.t('intelligent-ops.v56-ops-panel.k24')}
                    </TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {scalingHistory.slice(0, 30).map((action) => (
                    <TableRow key={action.id}>
                      <TableCell
                        sx={{ fontSize: 11, color: 'text.secondary', whiteSpace: 'nowrap' }}
                      >
                        {new Date(action.executed_at).toLocaleTimeString()}
                      </TableCell>
                      <TableCell sx={{ fontSize: 12 }}>{action.policy_id}</TableCell>
                      <TableCell>
                        <Chip
                          label={action.direction}
                          size='small'
                          icon={
                            action.direction === 'ScaleUp' ? (
                              <ArrowUpCircle size={12} />
                            ) : (
                              <ArrowDownCircle size={12} />
                            )
                          }
                          sx={{
                            fontSize: 10,
                            height: 20,
                            bgcolor:
                              action.direction === 'ScaleUp'
                                ? 'colors.success.100'
                                : 'colors.primary.100',
                            color:
                              action.direction === 'ScaleUp'
                                ? 'colors.success.dark'
                                : designTokens.colors.primary['800'],
                          }}
                        />
                      </TableCell>
                      <TableCell sx={{ fontSize: 12 }}>{action.instances}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Box>
          )}
        </Card>
      </Box>

      <Card
        variant='outlined'
        sx={{ p: 2, mt: 3 }}
      >
        <Typography
          variant='subtitle2'
          sx={{ fontWeight: 600, mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}
        >
          <Sparkles size={16} />
          {i18n.t('intelligent_ops.v56-ops-panel.k23')}
        </Typography>
        <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
          {predictions.map((p, i) => (
            <Paper
              key={i}
              elevation={0}
              sx={{
                p: 1,
                border: '1px solid',
                borderColor: 'divider',
                borderRadius: 1,
                minWidth: 80,
                textAlign: 'center',
                bgcolor:
                  p.hour >= 9 && p.hour <= 17
                    ? 'var(--color-warning-50)'
                    : 'var(--color-primary-foreground)',
              }}
            >
              <Typography
                variant='caption'
                color='text.secondary'
                sx={{ fontSize: 10 }}
              >
                {String(p.hour).padStart(2, '0')}:00
              </Typography>
              <Typography
                variant='body2'
                sx={{ fontWeight: 600, fontSize: 13 }}
              >
                {p.predicted_requests}
              </Typography>
              <Typography
                variant='caption'
                sx={{ fontSize: 10, color: 'grey.500' }}
              >
                {(p.confidence * 100).toFixed(0)}%
              </Typography>
            </Paper>
          ))}
        </Box>
      </Card>
    </Box>
  );
};

const RCATab: React.FC<{
  incidents: Incident[];
  rootCauses: Map<string, RootCause[]>;
  selectedIncident: string | null;
  onSelectIncident: (id: string | null) => void;
  onLocateRootCause: (id: string) => void;
  onCreateIncident: () => void;
  onUpdateStatus: (id: string, status: Incident['status']) => void;
}> = ({
  incidents,
  rootCauses,
  selectedIncident,
  onSelectIncident,
  onLocateRootCause,
  onCreateIncident,
  onUpdateStatus,
}) => {
  const getSeverityIcon = (severity: IncidentSeverity) => {
    const color = SEVERITY_COLORS[severity];
    return (
      <AlertTriangle
        size={14}
        style={{ color }}
      />
    );
  };

  const getStatusChip = (status: Incident['status']) => {
    const colors: Record<string, string> = {
      Open: designTokens.colors.error.main,
      Investigating: designTokens.colors.warning.main,
      Resolved: designTokens.colors.success.dark,
      Closed: 'colors.grey.500',
    };
    const bgColors: Record<string, string> = {
      Open: 'colors.error.50',
      Investigating: 'var(--color-warning-50)',
      Resolved: 'colors.success.50',
      Closed: 'colors.grey.100',
    };
    return (
      <Chip
        label={status}
        size='small'
        sx={{
          fontSize: 10,
          height: 20,
          bgcolor: bgColors[status],
          color: colors[status],
          fontWeight: 600,
        }}
      />
    );
  };

  const causes = selectedIncident ? rootCauses.get(selectedIncident) : undefined;
  const report = selectedIncident ? rootCauseLocator.generateCauseReport(selectedIncident) : '';

  return (
    <Box sx={{ p: 3 }}>
      <Stack
        direction='row'
        spacing={2}
        sx={{ mb: 3, justifyContent: 'space-between' }}
      >
        <Stack
          direction='row'
          spacing={2}
        >
          <Typography
            variant='h6'
            sx={{ fontWeight: 600, display: 'flex', alignItems: 'center', gap: 1 }}
          >
            <Search size={20} />
            {i18n.t('intelligent_ops.v56-ops-panel.k24')}
          </Typography>
          <Chip
            label={`${incidents.length} ${i18n.t('intelligent_ops.v56-ops-panel.k25')}`}
            size='small'
            sx={{ bgcolor: 'orange.50', color: 'orange.800', fontWeight: 600 }}
          />
        </Stack>
        <Button
          variant='contained'
          startIcon={<Plus size={14} />}
          onClick={onCreateIncident}
          size='small'
          sx={{ bgcolor: 'orange.500', '&:hover': { bgcolor: 'orange.600' } }}
        >
          {i18n.t('intelligent_ops.v56-ops-panel.k26')}
        </Button>
      </Stack>

      <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 3 }}>
        <Card
          variant='outlined'
          sx={{ p: 2 }}
        >
          <Typography
            variant='subtitle2'
            sx={{ fontWeight: 600, mb: 2 }}
          >
            {i18n.t('intelligent_ops.v56-ops-panel.k27')}
          </Typography>
          {incidents.length === 0 && (
            <Alert severity='info'>{i18n.t('intelligent-ops.v56-ops-panel.k25')}</Alert>
          )}
          {incidents.length > 0 && (
            <List sx={{ maxHeight: 500, overflow: 'auto' }}>
              {incidents.map((incident) => (
                <Paper
                  key={incident.id}
                  elevation={0}
                  sx={{
                    mb: 1,
                    border: '1px solid',
                    borderColor:
                      selectedIncident === incident.id
                        ? `${designTokens.colors.orange['500']}`
                        : 'divider',
                    borderRadius: 1,
                    bgcolor:
                      selectedIncident === incident.id
                        ? 'var(--color-warning-50)'
                        : 'var(--color-primary-foreground)',
                    cursor: 'pointer',
                  }}
                  onClick={() => onSelectIncident(incident.id)}
                >
                  <ListItem sx={{ py: 1.5 }}>
                    <Box sx={{ width: '100%' }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                        {getSeverityIcon(incident.severity)}
                        <Typography
                          variant='body2'
                          sx={{ fontWeight: 600, flex: 1 }}
                        >
                          {incident.symptoms[0] || i18n.t('intelligent-ops.v56-ops-panel.k26')}
                        </Typography>
                        {getStatusChip(incident.status)}
                      </Box>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                        <Typography
                          variant='caption'
                          color='text.secondary'
                          sx={{ fontSize: 11 }}
                        >
                          {incident.severity} · {new Date(incident.detected_at).toLocaleString()}
                        </Typography>
                      </Box>
                      <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
                        {incident.affected_components.slice(0, 3).map((c) => (
                          <Chip
                            key={c}
                            label={c}
                            size='small'
                            sx={{ fontSize: 9, height: 16 }}
                          />
                        ))}
                      </Box>
                    </Box>
                  </ListItem>
                </Paper>
              ))}
            </List>
          )}
        </Card>

        <Card
          variant='outlined'
          sx={{ p: 2 }}
        >
          <Typography
            variant='subtitle2'
            sx={{ fontWeight: 600, mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}
          >
            <Database size={16} />
            {i18n.t('intelligent_ops.v56-ops-panel.k28')}
          </Typography>
          {!selectedIncident && (
            <Alert severity='info'>{i18n.t('intelligent-ops.v56-ops-panel.k27')}</Alert>
          )}
          {selectedIncident && !causes && (
            <Stack
              direction='column'
              spacing={2}
            >
              <Alert severity='info'>{i18n.t('intelligent-ops.v56-ops-panel.k28')}</Alert>
              <Button
                variant='contained'
                startIcon={<Search size={14} />}
                onClick={() => onLocateRootCause(selectedIncident)}
                sx={{ bgcolor: 'orange.500', '&:hover': { bgcolor: 'orange.600' } }}
                size='small'
              >
                {i18n.t('intelligent_ops.v56-ops-panel.k29')}
              </Button>
            </Stack>
          )}
          {selectedIncident && causes && causes.length > 0 && (
            <Box>
              <Stack
                direction='row'
                spacing={1}
                sx={{ mb: 2 }}
              >
                <Button
                  variant='outlined'
                  size='small'
                  startIcon={<RefreshCw size={12} />}
                  onClick={() => onLocateRootCause(selectedIncident)}
                >
                  {i18n.t('intelligent_ops.v56-ops-panel.k30')}
                </Button>
                <Button
                  variant='outlined'
                  size='small'
                  onClick={() => onUpdateStatus(selectedIncident, 'Resolved')}
                >
                  {i18n.t('intelligent_ops.v56-ops-panel.k31')}
                </Button>
              </Stack>
              {causes.map((cause, i) => (
                <Paper
                  key={i}
                  elevation={0}
                  sx={{
                    mb: 1.5,
                    p: 2,
                    border: '1px solid',
                    borderColor: 'divider',
                    borderRadius: 1,
                    bgcolor: 'common.white',
                  }}
                >
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                    <Chip
                      label={cause.cause_type}
                      size='small'
                      sx={{
                        fontSize: 10,
                        height: 20,
                        bgcolor: 'warning.100',
                        color: 'warning.800',
                        fontWeight: 600,
                      }}
                    />
                    <Typography
                      variant='body2'
                      sx={{ fontWeight: 600, flex: 1 }}
                    >
                      {cause.component}
                    </Typography>
                    <Chip
                      label={`${i18n.t('intelligent_ops.v56-ops-panel.k32')} ${(cause.confidence * 100).toFixed(0)}%`}
                      size='small'
                      sx={{
                        fontSize: 10,
                        height: 20,
                        bgcolor:
                          cause.confidence > 0.7 ? 'colors.success.100' : 'colors.warning.100',
                        color: cause.confidence > 0.7 ? 'colors.success.dark' : 'colors.orange.800',
                      }}
                    />
                  </Box>
                  <Typography
                    variant='caption'
                    color='text.secondary'
                    sx={{ display: 'block', mb: 0.5 }}
                  >
                    [i18n.t('intelligent_ops.v56-ops-panel.k33')]: {cause.depth} 跳
                  </Typography>
                  {cause.evidence.length > 0 && (
                    <Box sx={{ mt: 1 }}>
                      <Typography
                        variant='caption'
                        sx={{ fontWeight: 600, fontSize: 11, display: 'block', mb: 0.5 }}
                      >
                        [i18n.t('intelligent_ops.v56-ops-panel.k34')]:
                      </Typography>
                      {cause.evidence.slice(0, 3).map((e, idx) => (
                        <Typography
                          key={idx}
                          variant='caption'
                          sx={{ fontSize: 11, display: 'block', color: 'text.secondary' }}
                        >
                          • {e}
                        </Typography>
                      ))}
                    </Box>
                  )}
                </Paper>
              ))}
              <Divider sx={{ my: 2 }} />
              <Typography
                variant='subtitle2'
                sx={{ fontWeight: 600, mb: 1, fontSize: 12 }}
              >
                <FileText
                  size={14}
                  style={{ display: 'inline', marginRight: 4 }}
                />
                {i18n.t('intelligent_ops.v56-ops-panel.k35')}
              </Typography>
              <Paper
                elevation={0}
                sx={{
                  p: 1.5,
                  bgcolor: 'background.default',
                  borderRadius: 1,
                  maxHeight: 200,
                  overflow: 'auto',
                }}
              >
                <Typography
                  variant='caption'
                  sx={{ fontFamily: 'monospace', fontSize: 11, whiteSpace: 'pre-wrap' }}
                >
                  {report}
                </Typography>
              </Paper>
            </Box>
          )}
        </Card>
      </Box>
    </Box>
  );
};

const RepairTab: React.FC<{
  playbooks: RepairPlaybook[];
  repairHistory: RepairAction[];
  onRunPlaybook: (id: string) => void;
  onExecuteRepair: (type: RepairType, target: string) => void;
  onToggleStatus: (id: string) => void;
  onCreatePlaybook: () => void;
}> = ({
  playbooks,
  repairHistory,
  onRunPlaybook,
  onExecuteRepair,
  onToggleStatus,
  onCreatePlaybook,
}) => {
  return (
    <Box sx={{ p: 3 }}>
      <Stack
        direction='row'
        spacing={2}
        sx={{ mb: 3, justifyContent: 'space-between' }}
      >
        <Stack
          direction='row'
          spacing={2}
        >
          <Typography
            variant='h6'
            sx={{ fontWeight: 600, display: 'flex', alignItems: 'center', gap: 1 }}
          >
            <Wrench size={20} />
            {i18n.t('intelligent_ops.v56-ops-panel.k36')}
          </Typography>
          <Chip
            label={`${playbooks.length} ${i18n.t('intelligent_ops.v56-ops-panel.k37')}`}
            size='small'
            sx={{ bgcolor: 'purple.50', color: 'purple.800', fontWeight: 600 }}
          />
          <Chip
            label={`${repairHistory.length} ${i18n.t('intelligent_ops.v56-ops-panel.k38')}`}
            size='small'
            sx={{ bgcolor: 'success.50', color: 'teal.900', fontWeight: 600 }}
          />
        </Stack>
        <Button
          variant='contained'
          startIcon={<Plus size={14} />}
          onClick={onCreatePlaybook}
          size='small'
          sx={{ bgcolor: 'orange.500', '&:hover': { bgcolor: 'orange.600' } }}
        >
          {i18n.t('intelligent_ops.v56-ops-panel.k39')}
        </Button>
      </Stack>

      <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 3 }}>
        <Card
          variant='outlined'
          sx={{ p: 2 }}
        >
          <Typography
            variant='subtitle2'
            sx={{ fontWeight: 600, mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}
          >
            <Workflow size={16} />
            {i18n.t('intelligent_ops.v56-ops-panel.k40')}
          </Typography>
          {playbooks.length === 0 && (
            <Alert severity='info'>{i18n.t('intelligent-ops.v56-ops-panel.k29')}</Alert>
          )}
          {playbooks.map((playbook) => (
            <Paper
              key={playbook.id}
              elevation={0}
              sx={{
                mb: 1.5,
                p: 2,
                border: '1px solid',
                borderColor:
                  playbook.status === 'Active' ? designTokens.colors.success.dark : 'divider',
                borderRadius: 1,
                bgcolor:
                  playbook.status === 'Active'
                    ? 'colors.success.50'
                    : 'var(--color-primary-foreground)',
              }}
            >
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                <Typography
                  variant='body2'
                  sx={{ fontWeight: 600, flex: 1 }}
                >
                  {playbook.name}
                </Typography>
                <Chip
                  label={playbook.status}
                  size='small'
                  sx={{
                    fontSize: 10,
                    height: 20,
                    bgcolor: `${REPAIR_STATUS_COLORS[playbook.status]}20`,
                    color: REPAIR_STATUS_COLORS[playbook.status],
                    fontWeight: 600,
                  }}
                />
              </Box>
              <Typography
                variant='caption'
                color='text.secondary'
                sx={{ display: 'block', mb: 1 }}
              >
                [i18n.t('intelligent_ops.v56-ops-panel.k41')]: {playbook.trigger_condition}
              </Typography>
              <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap', mb: 1.5 }}>
                {playbook.actions.map((a) => (
                  <Chip
                    key={a.id}
                    label={`${a.type} → ${a.target}`}
                    size='small'
                    sx={{
                      fontSize: 10,
                      height: 18,
                      bgcolor: `${REPAIR_TYPE_COLORS[a.type]}20`,
                      color: REPAIR_TYPE_COLORS[a.type],
                    }}
                  />
                ))}
              </Box>
              <Stack
                direction='row'
                spacing={1}
              >
                <Button
                  variant='contained'
                  size='small'
                  startIcon={<Play size={12} />}
                  onClick={() => onRunPlaybook(playbook.id)}
                  sx={{ bgcolor: 'teal.500', minWidth: 'auto', px: 1.5 }}
                >
                  {i18n.t('intelligent_ops.v56-ops-panel.k42')}
                </Button>
                <Button
                  variant='outlined'
                  size='small'
                  startIcon={
                    playbook.status === 'Active' ? <PauseCircle size={12} /> : <Play size={12} />
                  }
                  onClick={() => onToggleStatus(playbook.id)}
                  sx={{ minWidth: 'auto', px: 1.5 }}
                >
                  {playbook.status === 'Active'
                    ? i18n.t('intelligent-ops.v56-ops-panel.k31')
                    : i18n.t('intelligent-ops.v56-ops-panel.k30')}
                </Button>
              </Stack>
            </Paper>
          ))}
        </Card>

        <Card
          variant='outlined'
          sx={{ p: 2 }}
        >
          <Typography
            variant='subtitle2'
            sx={{ fontWeight: 600, mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}
          >
            <Activity size={16} />
            {i18n.t('intelligent_ops.v56-ops-panel.k43')}
          </Typography>
          <Typography
            variant='caption'
            sx={{ display: 'block', mb: 2, color: 'text.secondary' }}
          >
            {i18n.t('intelligent_ops.v56-ops-panel.k44')}
          </Typography>
          <Stack
            direction='row'
            spacing={1}
            sx={{ mb: 3, flexWrap: 'wrap', gap: 1 }}
          >
            {(['Restart', 'ScaleUp', 'ConfigUpdate', 'Patched'] as RepairType[]).map((type) => (
              <Button
                key={type}
                variant='outlined'
                size='small'
                onClick={() => onExecuteRepair(type, 'api-gateway')}
                sx={{
                  borderColor: REPAIR_TYPE_COLORS[type],
                  color: REPAIR_TYPE_COLORS[type],
                  '&:hover': { bgcolor: `${REPAIR_TYPE_COLORS[type]}10` },
                }}
              >
                {type}
              </Button>
            ))}
          </Stack>

          <Typography
            variant='subtitle2'
            sx={{ fontWeight: 600, mb: 1, fontSize: 12 }}
          >
            {i18n.t('intelligent_ops.v56-ops-panel.k45')}
          </Typography>
          {repairHistory.length === 0 && (
            <Alert
              severity='info'
              sx={{ py: 1 }}
            >
              {i18n.t('intelligent_ops.v56-ops-panel.k46')}
            </Alert>
          )}
          {repairHistory.length > 0 && (
            <Box sx={{ maxHeight: 350, overflow: 'auto' }}>
              <Table size='small'>
                <TableHead>
                  <TableRow>
                    <TableCell sx={{ fontWeight: 600, fontSize: 11 }}>
                      {i18n.t('intelligent-ops.v56-ops-panel.k32')}
                    </TableCell>
                    <TableCell sx={{ fontWeight: 600, fontSize: 11 }}>
                      {i18n.t('intelligent-ops.v56-ops-panel.k33')}
                    </TableCell>
                    <TableCell sx={{ fontWeight: 600, fontSize: 11 }}>
                      {i18n.t('intelligent-ops.v56-ops-panel.k34')}
                    </TableCell>
                    <TableCell sx={{ fontWeight: 600, fontSize: 11 }}>
                      {i18n.t('intelligent-ops.v56-ops-panel.k35')}
                    </TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {repairHistory.slice(0, 30).map((action) => (
                    <TableRow key={action.id}>
                      <TableCell
                        sx={{ fontSize: 10, color: 'text.secondary', whiteSpace: 'nowrap' }}
                      >
                        {new Date(action.created_at).toLocaleTimeString()}
                      </TableCell>
                      <TableCell>
                        <Chip
                          label={action.type}
                          size='small'
                          sx={{
                            fontSize: 9,
                            height: 16,
                            bgcolor: `${REPAIR_TYPE_COLORS[action.type]}20`,
                            color: REPAIR_TYPE_COLORS[action.type],
                          }}
                        />
                      </TableCell>
                      <TableCell sx={{ fontSize: 11 }}>{action.target}</TableCell>
                      <TableCell>
                        <Chip
                          label={action.status}
                          size='small'
                          sx={{
                            fontSize: 9,
                            height: 16,
                            bgcolor: `${REPAIR_STATUS_COLORS[action.status]}20`,
                            color: REPAIR_STATUS_COLORS[action.status],
                          }}
                        />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Box>
          )}
        </Card>
      </Box>
    </Box>
  );
};

const TimelineTab: React.FC<{
  incidents: Incident[];
  scalingHistory: ScalingAction[];
  repairHistory: RepairAction[];
}> = ({ incidents, scalingHistory, repairHistory }) => {
  const events = React.useMemo(() => {
    const all: { time: number; category: string; title: string; color: string; details: string }[] =
      [];

    incidents.forEach((i) => {
      all.push({
        time: i.detected_at,
        category: i18n.t('intelligent-ops.v56-ops-panel.k36'),
        title: i.symptoms[0] || i18n.t('intelligent-ops.v56-ops-panel.k37'),
        color: SEVERITY_COLORS[i.severity],
        details: `${i.severity} · ${i.status}`,
      });
    });

    scalingHistory.forEach((s) => {
      all.push({
        time: s.executed_at,
        category: i18n.t('intelligent-ops.v56-ops-panel.k38'),
        title: `${s.direction} → ${s.instances} ${i18n.t('intelligent_ops.v56-ops-panel.k47')}`,
        color:
          s.direction === 'ScaleUp'
            ? designTokens.colors.success.dark
            : designTokens.colors.primary.main,
        details: s.reason,
      });
    });

    repairHistory.forEach((r) => {
      all.push({
        time: r.created_at,
        category: i18n.t('intelligent-ops.v56-ops-panel.k39'),
        title: `${r.type} on ${r.target}`,
        color: REPAIR_TYPE_COLORS[r.type],
        details: r.status,
      });
    });

    return all.sort((a, b) => b.time - a.time);
  }, [incidents, scalingHistory, repairHistory]);

  const categoryColors: Record<string, string> = {
    [i18n.t('intelligent_ops.v56-ops-panel.k48')]: `${designTokens.colors.orange['500']}`,
    [i18n.t('intelligent_ops.v56-ops-panel.k49')]: designTokens.colors.success.dark,
    [i18n.t('intelligent_ops.v56-ops-panel.k50')]: designTokens.colors.secondary.main,
  };

  return (
    <Box sx={{ p: 3 }}>
      <Stack
        direction='row'
        spacing={2}
        sx={{ mb: 3 }}
      >
        <Typography
          variant='h6'
          sx={{ fontWeight: 600, display: 'flex', alignItems: 'center', gap: 1 }}
        >
          <Clock size={20} />
          {i18n.t('intelligent_ops.v56-ops-panel.k51')}
        </Typography>
        <Chip
          label={`${events.length} ${i18n.t('intelligent_ops.v56-ops-panel.k52')}`}
          size='small'
          sx={{ bgcolor: 'orange.50', color: 'orange.800', fontWeight: 600 }}
        />
      </Stack>

      {events.length === 0 && (
        <Alert severity='info'>{i18n.t('intelligent-ops.v56-ops-panel.k40')}</Alert>
      )}

      {events.length > 0 && (
        <Card
          variant='outlined'
          sx={{ p: 2 }}
        >
          <Box sx={{ position: 'relative', pl: 3 }}>
            <Box
              sx={{
                position: 'absolute',
                left: 8,
                top: 0,
                bottom: 0,
                width: 2,
                bgcolor: 'divider',
              }}
            />
            {events.slice(0, 60).map((event, i) => (
              <Box
                key={i}
                sx={{
                  position: 'relative',
                  mb: 2,
                  pl: 3,
                  '&:last-child': { mb: 0 },
                }}
              >
                <Box
                  sx={{
                    position: 'absolute',
                    left: -12,
                    top: 4,
                    width: 12,
                    height: 12,
                    borderRadius: '50%',
                    bgcolor: event.color,
                    border: '2px solid var(--color-primary-foreground)',
                    boxShadow: 1,
                  }}
                />
                <Paper
                  elevation={0}
                  sx={{
                    p: 1.5,
                    border: '1px solid',
                    borderColor: 'divider',
                    borderRadius: 1,
                    bgcolor: 'common.white',
                  }}
                >
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                    <Chip
                      label={event.category}
                      size='small'
                      sx={{
                        fontSize: 10,
                        height: 18,
                        bgcolor: `${categoryColors[event.category]}20`,
                        color: categoryColors[event.category],
                        fontWeight: 600,
                      }}
                    />
                    <Typography
                      variant='body2'
                      sx={{ fontWeight: 600, flex: 1, fontSize: 13 }}
                    >
                      {event.title}
                    </Typography>
                  </Box>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Typography
                      variant='caption'
                      color='text.secondary'
                      sx={{ fontSize: 11 }}
                    >
                      {new Date(event.time).toLocaleString()}
                    </Typography>
                    <Typography
                      variant='caption'
                      color='text.secondary'
                      sx={{ fontSize: 11 }}
                    >
                      · {event.details}
                    </Typography>
                  </Box>
                </Paper>
              </Box>
            ))}
          </Box>
        </Card>
      )}
    </Box>
  );
};

export { V56OpsPanel };
export default V56OpsPanel;
