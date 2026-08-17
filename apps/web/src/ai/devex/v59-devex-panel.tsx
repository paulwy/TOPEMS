import React from 'react';
import {
  Box,
  Typography,
  IconButton,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  Button,
  Tooltip,
  Grid,
  Stack,
  LinearProgress,
  TextField,
} from '@mui/material';
import i18n from '@/i18n';
import {
  X as XIcon,
  Bug,
  Activity,
  Code2,
  Zap,
  Play,
  Square,
  Trash2,
  Search,
  Settings,
  FileCode,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Sparkles,
  Wrench,
} from 'lucide-react';
import {
  smartDebugger,
  type DebugSession,
  type Breakpoint,
  type DebugSuggestion,
} from './smart-debugger';
import {
  performanceAnalyzerV59,
  type PerfSnapshot,
  type PerfIssue,
  type BudgetUsage,
  type TrendPoint,
} from './performance-analyzer';
import {
  codeRefactorer,
  type RefactoringPlan,
  type CodeIssue,
  type CodeIssueType,
  type RefactoringType,
  type ImpactEstimate,
} from './code-refactor';
import { designTokens, semanticTokens } from '@topems/tokens';

export const V59DevExPanel: React.FC<{
  onClose: () => void;
}> = ({ onClose }) => {
  const [activeTab, setActiveTab] = React.useState('debug');
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
      }}
      onClick={onClose}
    >
      <Box
        sx={{
          width: '98%',
          maxWidth: 1600,
          height: '95vh',
          bgcolor: 'background.paper',
          borderRadius: 2,
          overflow: 'hidden',
          boxShadow: designTokens.darkShadows.xl,
          display: 'flex',
          flexDirection: 'column',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <Box
          sx={{
            p: 2,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            background: `linear-gradient(135deg, ${designTokens.colors.primary.dark}, ${designTokens.colors.secondary.main}, ${designTokens.colors.pink['500']})`,
            bgcolor: `linear-gradient(135deg, ${designTokens.colors.primary.dark}, ${designTokens.colors.secondary.main}, ${designTokens.colors.pink['500']})`,
            color: 'common.white',
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Sparkles size={20} />
            <Typography
              variant='h6'
              sx={{ fontWeight: 600 }}
            >
              {i18n.t('ai.v59-devex-panel.k0')}
            </Typography>
            <Chip
              label='AI-Powered'
              size='small'
              sx={{
                bgcolor: 'action.disabledBackground',
                color: 'common.white',
                fontWeight: 600,
              }}
            />
          </Box>
          <IconButton
            size='small'
            onClick={onClose}
            sx={{ color: 'common.white' }}
          >
            <XIcon size={20} />
          </IconButton>
        </Box>

        <QuickActionsToolbar />

        <Box sx={{ flex: 1, overflow: 'auto' }}>
          <Box sx={{ display: 'flex', borderBottom: 1, borderColor: 'divider', px: 2 }}>
            {[
              { id: 'debug', label: i18n.t('ai.v59-devex-panel.k0'), icon: <Bug size={16} /> },
              {
                id: 'performance',
                label: i18n.t('ai.v59-devex-panel.k1'),
                icon: <Activity size={16} />,
              },
              { id: 'refactor', label: i18n.t('ai.v59-devex-panel.k2'), icon: <Code2 size={16} /> },
            ].map((tab) => (
              <Button
                key={tab.id}
                variant={activeTab === tab.id ? 'contained' : 'text'}
                size='small'
                onClick={() => setActiveTab(tab.id)}
                sx={{
                  borderRadius: 0,
                  borderBottom: activeTab === tab.id ? 2 : 0,
                  borderColor:
                    activeTab === tab.id ? designTokens.colors.secondary.main : 'transparent',
                  color:
                    activeTab === tab.id ? designTokens.colors.secondary.main : 'text.secondary',
                  fontWeight: activeTab === tab.id ? 600 : 400,
                }}
                startIcon={tab.icon}
              >
                {tab.label}
              </Button>
            ))}
          </Box>

          <Box sx={{ p: 2 }}>
            {activeTab === 'debug' && <DebugSessionView />}
            {activeTab === 'performance' && <PerformanceLiveGraph />}
            {activeTab === 'refactor' && <RefactoringSuggestions />}
          </Box>
        </Box>
      </Box>
    </Box>
  );
};
const QuickActionsToolbar: React.FC = () => {
  const handleQuickDebug = () => {
    smartDebugger.createSession('quick-debug', 0);
  };
  const handleQuickProfile = () => {
    if (!performanceAnalyzerV59.isActive()) {
      performanceAnalyzerV59.startProfiling();
    } else {
      performanceAnalyzerV59.stopProfiling();
    }
  };
  const handleQuickScan = () => {
    codeRefactorer.scanCode(
      'unsaved-file',
      'const x = 1;\nconst y = 2;\nif (x > 0) { if (y > 0) { if (x + y > 0) { console.log("deep"); } } }'
    );
  };
  const [profiling, setProfiling] = React.useState(false);
  React.useEffect(() => {
    const onStart = () => setProfiling(true);
    const onStop = () => setProfiling(false);
    performanceAnalyzerV59.on('profiling:started', onStart);
    performanceAnalyzerV59.on('profiling:stopped', onStop);
    return () => {
      performanceAnalyzerV59.off('profiling:started', onStart);
      performanceAnalyzerV59.off('profiling:stopped', onStop);
    };
  }, []);
  return (
    <Box
      sx={{
        px: 2,
        py: 1,
        bgcolor: 'grey.50',
        borderBottom: 1,
        borderColor: 'divider',
        display: 'flex',
        alignItems: 'center',
        gap: 1,
      }}
    >
      <Typography
        variant='caption'
        sx={{ fontWeight: 600, color: 'text.secondary', mr: 1 }}
      >
        [i18n.t('ai.v59-devex-panel.k1')]:
      </Typography>
      <Button
        size='small'
        startIcon={<Bug size={14} />}
        onClick={handleQuickDebug}
        sx={{ textTransform: 'none', fontSize: 12 }}
      >
        {i18n.t('ai.v59-devex-panel.k2')}
      </Button>
      <Button
        size='small'
        startIcon={profiling ? <Square size={14} /> : <Play size={14} />}
        onClick={handleQuickProfile}
        sx={{ textTransform: 'none', fontSize: 12 }}
        color={profiling ? 'error' : 'primary'}
      >
        {profiling ? i18n.t('ai.v59-devex-panel.k4') : i18n.t('ai.v59-devex-panel.k3')}
      </Button>
      <Button
        size='small'
        startIcon={<Code2 size={14} />}
        onClick={handleQuickScan}
        sx={{ textTransform: 'none', fontSize: 12 }}
      >
        {i18n.t('ai.v59-devex-panel.k3')}
      </Button>
      <Box sx={{ flex: 1 }} />
      <Tooltip title={i18n.t('ai.v59-devex-panel.ai_4')}>
        <Chip
          label={`${smartDebugger.getDebugSuggestions('global', 0).length} ${i18n.t('ai.v59-devex-panel.k5')}`}
          size='small'
          icon={<Sparkles size={12} />}
          variant='outlined'
        />
      </Tooltip>
    </Box>
  );
};
const DebugSessionView: React.FC = () => {
  const [sessions, setSessions] = React.useState<DebugSession[]>([]);
  const [breakpoints, setBreakpoints] = React.useState<Breakpoint[]>([]);
  const [selectedSession, setSelectedSession] = React.useState<DebugSession | null>(null);
  const [suggestions, setSuggestions] = React.useState<DebugSuggestion[]>([]);
  const [newBpFile, setNewBpFile] = React.useState('');
  const [newBpLine, setNewBpLine] = React.useState(1);
  const [evalExpr, setEvalExpr] = React.useState('');
  const [evalResult, setEvalResult] = React.useState<string>('');
  const refresh = () => {
    setSessions(smartDebugger.listSessions());
    setBreakpoints(smartDebugger.listBreakpoints());
  };
  React.useEffect(() => {
    refresh();
    const unsubs = [
      smartDebugger.on('session:created', () => refresh()),
      smartDebugger.on('session:removed', () => refresh()),
      smartDebugger.on('breakpoint:set', () => refresh()),
      smartDebugger.on('breakpoint:removed', () => refresh()),
    ];
    return () => unsubs.forEach((fn) => fn());
  }, []);
  const handleCreateSession = () => {
    const session = smartDebugger.createSession('untitled', 1);
    setSelectedSession(session);
    refresh();
  };
  const handleSetBreakpoint = () => {
    if (!newBpFile) return;
    smartDebugger.setBreakpoint(newBpFile, newBpLine);
    setNewBpFile('');
    setNewBpLine(1);
    refresh();
  };
  const handleAnalyzeState = (session: DebugSession) => {
    const analysis = smartDebugger.analyzeState(session.file, session.variables);
    setSuggestions([
      ...smartDebugger.suggestFix(session.id),
      ...analysis.issues.map((issue) => ({
        id: `state_${Date.now()}`,
        type: 'logic' as const,
        severity: 'medium' as const,
        message: issue,
        suggestion: i18n.t('ai.v59-devex-panel.k5'),
        location: { file: session.file, line: session.line },
      })),
    ]);
  };
  const handleGetSuggestions = (session: DebugSession) => {
    const fixSuggestions = smartDebugger.suggestFix(session.id);
    const debugSuggestions = smartDebugger.getDebugSuggestions(session.file, session.line);
    setSuggestions([...fixSuggestions, ...debugSuggestions]);
  };
  const handleEvaluate = () => {
    if (!selectedSession || !evalExpr) return;
    const result = smartDebugger.evaluateExpression(selectedSession.id, evalExpr);
    setEvalResult(
      result.success ? JSON.stringify(result.value, null, 2) : `Error: ${result.error}`
    );
  };
  const handleGetCallStack = (session: DebugSession) => {
    const stack = smartDebugger.getCallStack(session.id);
    setEvalResult(JSON.stringify(stack, null, 2));
  };
  const handleRemoveSession = (id: string) => {
    smartDebugger.removeSession(id);
    if (selectedSession?.id === id) setSelectedSession(null);
    refresh();
  };
  const handleToggleBreakpoint = (bp: Breakpoint) => {
    smartDebugger.updateBreakpoint(bp.id, { enabled: !bp.enabled });
    refresh();
  };
  const handleRemoveBreakpoint = (id: string) => {
    smartDebugger.removeBreakpoint(id);
    refresh();
  };
  return (
    <Box>
      <Grid
        container
        spacing={2}
      >
        <Grid size={{ xs: 12, md: 6 }}>
          <Paper sx={{ p: 2, borderRadius: 2 }}>
            <Box
              sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}
            >
              <Typography
                variant='subtitle2'
                sx={{ fontWeight: 600, display: 'flex', alignItems: 'center', gap: 1 }}
              >
                <Bug size={16} />
                {i18n.t('ai:v59-devex-panel.v0_17', { v0: sessions.length })}
              </Typography>
              <Button
                size='small'
                startIcon={<Play size={14} />}
                onClick={handleCreateSession}
              >
                {i18n.t('ai.v59-devex-panel.k6')}
              </Button>
            </Box>

            <TableContainer>
              <Table size='small'>
                <TableHead>
                  <TableRow>
                    <TableCell sx={{ fontWeight: 600 }}>
                      {i18n.t('ai.v59-devex-panel.k6')}
                    </TableCell>
                    <TableCell sx={{ fontWeight: 600 }}>
                      {i18n.t('ai.v59-devex-panel.k7')}
                    </TableCell>
                    <TableCell sx={{ fontWeight: 600 }}>
                      {i18n.t('ai.v59-devex-panel.k8')}
                    </TableCell>
                    <TableCell sx={{ fontWeight: 600 }}>
                      {i18n.t('ai.v59-devex-panel.k9')}
                    </TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {sessions.length === 0 ? (
                    <TableRow>
                      <TableCell
                        colSpan={4}
                        align='center'
                        sx={{ py: 3 }}
                      >
                        <Typography
                          variant='body2'
                          color='text.secondary'
                        >
                          {i18n.t('ai.v59-devex-panel.k7')}
                        </Typography>
                      </TableCell>
                    </TableRow>
                  ) : (
                    sessions.map((session) => (
                      <TableRow
                        key={session.id}
                        hover
                        selected={selectedSession?.id === session.id}
                        onClick={() => setSelectedSession(session)}
                        sx={{ cursor: 'pointer' }}
                      >
                        <TableCell sx={{ fontFamily: 'monospace', fontSize: 12 }}>
                          {session.file}
                        </TableCell>
                        <TableCell>{session.line}</TableCell>
                        <TableCell>
                          <Chip
                            label={session.state}
                            size='small'
                            color={session.state === 'running' ? 'success' : 'default'}
                          />
                        </TableCell>
                        <TableCell>
                          <Stack
                            direction='row'
                            spacing={0.5}
                          >
                            <IconButton
                              size='small'
                              onClick={(e) => {
                                e.stopPropagation();
                                handleAnalyzeState(session);
                              }}
                              title={i18n.t('ai.v59-devex-panel.k10')}
                            >
                              <Activity size={14} />
                            </IconButton>
                            <IconButton
                              size='small'
                              onClick={(e) => {
                                e.stopPropagation();
                                handleGetSuggestions(session);
                              }}
                              title={i18n.t('ai.v59-devex-panel.ai_8')}
                            >
                              <Sparkles size={14} />
                            </IconButton>
                            <IconButton
                              size='small'
                              onClick={(e) => {
                                e.stopPropagation();
                                handleRemoveSession(session.id);
                              }}
                              title={i18n.t('ai.v59-devex-panel.k11')}
                            >
                              <Trash2 size={14} />
                            </IconButton>
                          </Stack>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </TableContainer>
          </Paper>
        </Grid>

        <Grid size={{ xs: 12, md: 6 }}>
          <Paper sx={{ p: 2, borderRadius: 2 }}>
            <Box
              sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}
            >
              <Typography
                variant='subtitle2'
                sx={{ fontWeight: 600, display: 'flex', alignItems: 'center', gap: 1 }}
              >
                <Settings size={16} />
                {i18n.t('ai:v59-devex-panel.v0_16', { v0: breakpoints.length })}
              </Typography>
            </Box>

            <Box sx={{ display: 'flex', gap: 1, mb: 2 }}>
              <TextField
                size='small'
                placeholder={i18n.t('ai.v59-devex-panel.k12')}
                value={newBpFile}
                onChange={(e) => setNewBpFile(e.target.value)}
                sx={{ flex: 1 }}
              />
              <TextField
                size='small'
                type='number'
                placeholder={i18n.t('ai.v59-devex-panel.k13')}
                value={newBpLine}
                onChange={(e) => setNewBpLine(Number(e.target.value))}
                sx={{ width: 80 }}
              />
              <Button
                variant='contained'
                size='small'
                onClick={handleSetBreakpoint}
                startIcon={<Bug size={14} />}
              >
                {i18n.t('ai.v59-devex-panel.k9')}
              </Button>
            </Box>

            <TableContainer>
              <Table size='small'>
                <TableHead>
                  <TableRow>
                    <TableCell sx={{ fontWeight: 600 }}>
                      {i18n.t('ai.v59-devex-panel.k14')}
                    </TableCell>
                    <TableCell sx={{ fontWeight: 600 }}>
                      {i18n.t('ai.v59-devex-panel.k10')}
                    </TableCell>
                    <TableCell sx={{ fontWeight: 600 }}>
                      {i18n.t('ai.v59-devex-panel.k15')}
                    </TableCell>
                    <TableCell sx={{ fontWeight: 600 }}>
                      {i18n.t('ai.v59-devex-panel.k16')}
                    </TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {breakpoints.length === 0 ? (
                    <TableRow>
                      <TableCell
                        colSpan={4}
                        align='center'
                        sx={{ py: 3 }}
                      >
                        <Typography
                          variant='body2'
                          color='text.secondary'
                        >
                          {i18n.t('ai.v59-devex-panel.k11')}
                        </Typography>
                      </TableCell>
                    </TableRow>
                  ) : (
                    breakpoints.map((bp) => (
                      <TableRow key={bp.id}>
                        <TableCell sx={{ fontFamily: 'monospace', fontSize: 12 }}>
                          {bp.file}
                        </TableCell>
                        <TableCell>{bp.line}</TableCell>
                        <TableCell>
                          <Chip
                            label={
                              bp.enabled
                                ? i18n.t('ai.v59-devex-panel.k18')
                                : i18n.t('ai.v59-devex-panel.k17')
                            }
                            size='small'
                            color={bp.enabled ? 'success' : 'default'}
                            onClick={() => handleToggleBreakpoint(bp)}
                            sx={{ cursor: 'pointer' }}
                          />
                        </TableCell>
                        <TableCell>
                          <IconButton
                            size='small'
                            onClick={() => handleRemoveBreakpoint(bp.id)}
                          >
                            <Trash2 size={14} />
                          </IconButton>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </TableContainer>
          </Paper>
        </Grid>

        {selectedSession && (
          <Grid size={{ xs: 12 }}>
            <Paper sx={{ p: 2, borderRadius: 2 }}>
              <Typography
                variant='subtitle2'
                sx={{ fontWeight: 600, mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}
              >
                <Wrench size={16} />
                {i18n.t('ai:v59-devex-panel.v0v1_15', {
                  v0: selectedSession.file,
                  v1: selectedSession.line,
                })}
              </Typography>

              <Grid
                container
                spacing={2}
              >
                <Grid size={{ xs: 12, md: 6 }}>
                  <Typography
                    variant='caption'
                    color='text.secondary'
                    sx={{ mb: 0.5 }}
                  >
                    {i18n.t('ai.v59-devex-panel.k12')}
                  </Typography>
                  <Box sx={{ display: 'flex', gap: 1, mb: 1 }}>
                    <TextField
                      size='small'
                      placeholder={i18n.t('ai.v59-devex-panel.k13')}
                      value={evalExpr}
                      onChange={(e) => setEvalExpr(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handleEvaluate()}
                      sx={{ flex: 1 }}
                    />
                    <Button
                      size='small'
                      onClick={handleEvaluate}
                    >
                      {i18n.t('ai.v59-devex-panel.k14')}
                    </Button>
                    <Button
                      size='small'
                      onClick={() => handleGetCallStack(selectedSession)}
                    >
                      {i18n.t('ai.v59-devex-panel.k15')}
                    </Button>
                  </Box>
                  {evalResult && (
                    <Paper sx={{ p: 1, bgcolor: 'grey.50', maxHeight: 150, overflow: 'auto' }}>
                      <Typography
                        variant='caption'
                        sx={{ fontFamily: 'monospace' }}
                      >
                        {evalResult}
                      </Typography>
                    </Paper>
                  )}
                </Grid>

                <Grid size={{ xs: 12, md: 6 }}>
                  <Typography
                    variant='caption'
                    color='text.secondary'
                    sx={{ mb: 0.5 }}
                  >
                    {i18n.t('ai:v59-devex-panel.k14', {
                      v0: Object.keys(selectedSession.variables).length,
                    })}
                  </Typography>
                  <Paper sx={{ p: 1, bgcolor: 'grey.50', maxHeight: 150, overflow: 'auto' }}>
                    <Typography
                      variant='caption'
                      sx={{ fontFamily: 'monospace' }}
                    >
                      {JSON.stringify(selectedSession.variables, null, 2) || '{}'}
                    </Typography>
                  </Paper>
                </Grid>
              </Grid>
            </Paper>
          </Grid>
        )}

        <Grid size={{ xs: 12 }}>
          <Paper sx={{ p: 2, borderRadius: 2 }}>
            <Typography
              variant='subtitle2'
              sx={{ fontWeight: 600, mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}
            >
              <Sparkles size={16} />
              {i18n.t('ai:v59-devex-panel.aiv0_13', { v0: suggestions.length })}
            </Typography>

            {suggestions.length === 0 ? (
              <Typography
                variant='body2'
                color='text.secondary'
                sx={{ textAlign: 'center', py: 2 }}
              >
                {i18n.t('ai:v59-devex-panel.k12', { v0: i18n.t('ai.v59-devex-panel.i18n_17') })}
              </Typography>
            ) : (
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                {suggestions.map((s) => (
                  <Paper
                    key={s.id}
                    sx={{
                      p: 1.5,
                      borderRadius: 1,
                      borderLeft: 3,
                      borderColor:
                        s.severity === 'critical'
                          ? 'error.main'
                          : s.severity === 'high'
                            ? 'warning.main'
                            : 'info.main',
                      bgcolor: 'grey.50',
                    }}
                  >
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                      <Chip
                        label={s.type}
                        size='small'
                        color={
                          s.severity === 'critical'
                            ? 'error'
                            : s.severity === 'high'
                              ? 'warning'
                              : 'info'
                        }
                        sx={{ fontSize: 10 }}
                      />
                      <Chip
                        label={s.severity}
                        size='small'
                        variant='outlined'
                        sx={{ fontSize: 10 }}
                      />
                    </Box>
                    <Typography
                      variant='body2'
                      sx={{ fontWeight: 500 }}
                    >
                      {s.message}
                    </Typography>
                    <Typography
                      variant='caption'
                      color='text.secondary'
                    >
                      💡 {s.suggestion}
                    </Typography>
                  </Paper>
                ))}
              </Box>
            )}
          </Paper>
        </Grid>
      </Grid>
    </Box>
  );
};
const PerformanceLiveGraph: React.FC = () => {
  const [snapshots, setSnapshots] = React.useState<PerfSnapshot[]>([]);
  const [issues, setIssues] = React.useState<PerfIssue[]>([]);
  const [budget, setBudget] = React.useState<BudgetUsage[]>([]);
  const [trend, setTrend] = React.useState<TrendPoint[]>([]);
  const [isProfiling, setIsProfiling] = React.useState(false);
  const [analysis, setAnalysis] = React.useState<ReturnType<
    (typeof performanceAnalyzerV59)['analyzePerformance']
  > | null>(null);
  const refresh = () => {
    setSnapshots(performanceAnalyzerV59.getSnapshots().slice(-30));
    setIssues(performanceAnalyzerV59.getIssues());
    setBudget(performanceAnalyzerV59.getBudgetUsage());
    setTrend(performanceAnalyzerV59.getTrend(30000));
    setAnalysis(performanceAnalyzerV59.analyzePerformance());
  };
  React.useEffect(() => {
    const onSnapshot = () => refresh();
    const onIssue = () => refresh();
    const onStart = () => setIsProfiling(true);
    const onStop = () => setIsProfiling(false);
    performanceAnalyzerV59.on('snapshot:taken', onSnapshot);
    performanceAnalyzerV59.on('issue:detected', onIssue);
    performanceAnalyzerV59.on('profiling:started', onStart);
    performanceAnalyzerV59.on('profiling:stopped', onStop);
    refresh();
    return () => {
      performanceAnalyzerV59.off('snapshot:taken', onSnapshot);
      performanceAnalyzerV59.off('issue:detected', onIssue);
      performanceAnalyzerV59.off('profiling:started', onStart);
      performanceAnalyzerV59.off('profiling:stopped', onStop);
    };
  }, []);
  const handleToggleProfiling = () => {
    if (isProfiling) {
      performanceAnalyzerV59.stopProfiling();
    } else {
      performanceAnalyzerV59.startProfiling();
    }
  };
  const handleClear = () => {
    performanceAnalyzerV59.clearSnapshots();
    performanceAnalyzerV59.clearIssues();
    refresh();
  };
  const latest = snapshots[snapshots.length - 1];
  return (
    <Box>
      <Grid
        container
        spacing={2}
      >
        <Grid size={{ xs: 12, md: 8 }}>
          <Paper sx={{ p: 2, borderRadius: 2 }}>
            <Box
              sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}
            >
              <Typography
                variant='subtitle2'
                sx={{ fontWeight: 600, display: 'flex', alignItems: 'center', gap: 1 }}
              >
                <Activity size={16} /> {i18n.t('ai.devex.k2')}
                {isProfiling && (
                  <Chip
                    label={i18n.t('ai.v59-devex-panel.k20')}
                    size='small'
                    color='success'
                    sx={{ ml: 1, fontSize: 10 }}
                  />
                )}
              </Typography>
              <Stack
                direction='row'
                spacing={1}
              >
                <Button
                  size='small'
                  variant={isProfiling ? 'outlined' : 'contained'}
                  color={isProfiling ? 'error' : 'primary'}
                  startIcon={isProfiling ? <Square size={14} /> : <Play size={14} />}
                  onClick={handleToggleProfiling}
                >
                  {isProfiling
                    ? i18n.t('ai.v59-devex-panel.k22')
                    : i18n.t('ai.v59-devex-panel.k21')}
                </Button>
                <Button
                  size='small'
                  startIcon={<Trash2 size={14} />}
                  onClick={handleClear}
                >
                  {i18n.t('ai.v59-devex-panel.k20')}
                </Button>
              </Stack>
            </Box>

            {analysis && (
              <Grid
                container
                spacing={2}
                sx={{ mb: 2 }}
              >
                <Grid size={{ xs: 6, md: 3 }}>
                  <Paper sx={{ p: 1.5, borderRadius: 1, textAlign: 'center' }}>
                    <Typography
                      variant='h5'
                      sx={{
                        fontWeight: 700,
                        color:
                          analysis.score >= 80
                            ? 'success.main'
                            : analysis.score >= 50
                              ? 'warning.main'
                              : 'error.main',
                      }}
                    >
                      {analysis.score}
                    </Typography>
                    <Typography
                      variant='caption'
                      color='text.secondary'
                    >
                      {i18n.t('ai.v59-devex-panel.k21')}
                    </Typography>
                  </Paper>
                </Grid>
                <Grid size={{ xs: 6, md: 3 }}>
                  <Paper sx={{ p: 1.5, borderRadius: 1, textAlign: 'center' }}>
                    <Typography
                      variant='h5'
                      sx={{ fontWeight: 700 }}
                    >
                      {analysis.fps.current}
                    </Typography>
                    <Typography
                      variant='caption'
                      color='text.secondary'
                    >
                      FPS
                    </Typography>
                  </Paper>
                </Grid>
                <Grid size={{ xs: 6, md: 3 }}>
                  <Paper sx={{ p: 1.5, borderRadius: 1, textAlign: 'center' }}>
                    <Typography
                      variant='h5'
                      sx={{ fontWeight: 700 }}
                    >
                      {(analysis.memory.current / 1024 / 1024).toFixed(1)}
                    </Typography>
                    <Typography
                      variant='caption'
                      color='text.secondary'
                    >
                      {i18n.t('ai.v59-devex-panel.mb_22')}
                    </Typography>
                  </Paper>
                </Grid>
                <Grid size={{ xs: 6, md: 3 }}>
                  <Paper sx={{ p: 1.5, borderRadius: 1, textAlign: 'center' }}>
                    <Typography
                      variant='h5'
                      sx={{ fontWeight: 700 }}
                    >
                      {analysis.cpu.current.toFixed(1)}%
                    </Typography>
                    <Typography
                      variant='caption'
                      color='text.secondary'
                    >
                      CPU
                    </Typography>
                  </Paper>
                </Grid>
              </Grid>
            )}

            <Typography
              variant='caption'
              sx={{ fontWeight: 600, mb: 1, display: 'block' }}
            >
              {i18n.t('ai:v59-devex-panel.k11', { v0: trend.length })}
            </Typography>
            <Box
              sx={{
                height: 120,
                bgcolor: 'grey.900',
                borderRadius: 1,
                position: 'relative',
                overflow: 'hidden',
                mb: 2,
              }}
            >
              <svg
                width='100%'
                height='100%'
                style={{ display: 'block' }}
              >
                {trend.length > 1 && (
                  <polyline
                    fill='none'
                    stroke={designTokens.colors.secondary.main}
                    strokeWidth='2'
                    points={trend
                      .map((p, i) => {
                        const x = (i / (trend.length - 1)) * 100;
                        const y = 100 - Math.min(100, (p.fps / 60) * 100);
                        return `${x}%,${y}%`;
                      })
                      .join(' ')}
                  />
                )}
                {trend.map((p, i) => {
                  const x = (i / Math.max(trend.length - 1, 1)) * 100;
                  const y = 100 - Math.min(100, (p.fps / 60) * 100);
                  return (
                    <circle
                      key={i}
                      cx={`${x}%`}
                      cy={`${y}%`}
                      r='3'
                      fill={designTokens.colors.secondary.main}
                    />
                  );
                })}
              </svg>
              {trend.length === 0 && (
                <Typography
                  variant='caption'
                  sx={{
                    position: 'absolute',
                    top: '50%',
                    left: '50%',
                    transform: 'translate(-50%, -50%)',
                    color: 'grey.400',
                  }}
                >
                  {i18n.t('ai.v59-devex-panel.k23')}
                </Typography>
              )}
            </Box>

            <Typography
              variant='caption'
              sx={{ fontWeight: 600, mb: 1, display: 'block' }}
            >
              {i18n.t('ai.v59-devex-panel.k24')}
            </Typography>
            <Box
              sx={{
                height: 80,
                bgcolor: 'grey.900',
                borderRadius: 1,
                position: 'relative',
                overflow: 'hidden',
              }}
            >
              <svg
                width='100%'
                height='100%'
                style={{ display: 'block' }}
              >
                {trend.length > 1 && (
                  <polyline
                    fill='none'
                    stroke={`${designTokens.colors.cyan['500']}`}
                    strokeWidth='2'
                    points={trend
                      .map((p, i) => {
                        const x = (i / (trend.length - 1)) * 100;
                        const maxMem = Math.max(...trend.map((t) => t.memory), 1);
                        const y = 100 - (p.memory / maxMem) * 100;
                        return `${x}%,${y}%`;
                      })
                      .join(' ')}
                  />
                )}
              </svg>
            </Box>
          </Paper>
        </Grid>

        <Grid size={{ xs: 12, md: 4 }}>
          <Paper sx={{ p: 2, borderRadius: 2, mb: 2 }}>
            <Typography
              variant='subtitle2'
              sx={{ fontWeight: 600, mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}
            >
              <Zap size={16} />
              {i18n.t('ai:v59-devex-panel.k10')}
            </Typography>

            <Stack spacing={1.5}>
              {budget.map((b) => (
                <Box key={b.category}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                    <Typography
                      variant='caption'
                      sx={{ textTransform: 'capitalize' }}
                    >
                      {b.category}
                    </Typography>
                    <Typography
                      variant='caption'
                      sx={{ fontWeight: 600 }}
                    >
                      {b.status === 'pass' ? '✅' : b.status === 'warn' ? '⚠️' : '❌'}{' '}
                      {b.percentage.toFixed(0)}%
                    </Typography>
                  </Box>
                  <LinearProgress
                    variant='determinate'
                    value={Math.min(b.percentage, 100)}
                    sx={{
                      height: 6,
                      borderRadius: 3,
                      bgcolor: 'grey.200',
                      '& .MuiLinearProgress-bar': {
                        bgcolor:
                          b.status === 'pass'
                            ? 'success.main'
                            : b.status === 'warn'
                              ? 'warning.main'
                              : 'error.main',
                      },
                    }}
                  />
                </Box>
              ))}
            </Stack>
          </Paper>

          <Paper sx={{ p: 2, borderRadius: 2 }}>
            <Typography
              variant='subtitle2'
              sx={{ fontWeight: 600, mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}
            >
              <AlertTriangle size={16} />
              {i18n.t('ai:v59-devex-panel.v0_9', { v0: issues.length })}
            </Typography>

            {issues.length === 0 ? (
              <Typography
                variant='caption'
                color='text.secondary'
              >
                {i18n.t('ai.v59-devex-panel.k25')}
              </Typography>
            ) : (
              <Box
                sx={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 1,
                  maxHeight: 250,
                  overflow: 'auto',
                }}
              >
                {issues.slice(0, 10).map((issue) => (
                  <Paper
                    key={issue.id}
                    sx={{
                      p: 1,
                      borderRadius: 1,
                      borderLeft: 3,
                      borderColor:
                        issue.severity === 'critical'
                          ? 'error.main'
                          : issue.severity === 'high'
                            ? 'warning.main'
                            : 'info.main',
                      bgcolor: 'grey.50',
                    }}
                  >
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mb: 0.5 }}>
                      <Chip
                        label={issue.type}
                        size='small'
                        sx={{ fontSize: 9, height: 18 }}
                        color={issue.severity === 'critical' ? 'error' : 'default'}
                      />
                      <Typography
                        variant='caption'
                        sx={{ fontSize: 10, color: 'text.secondary' }}
                      >
                        {new Date(issue.timestamp).toLocaleTimeString()}
                      </Typography>
                    </Box>
                    <Typography
                      variant='caption'
                      sx={{ fontSize: 11 }}
                    >
                      {issue.description}
                    </Typography>
                  </Paper>
                ))}
              </Box>
            )}
          </Paper>
        </Grid>
      </Grid>

      {latest && (
        <Paper sx={{ p: 2, borderRadius: 2, mt: 2 }}>
          <Typography
            variant='subtitle2'
            sx={{ fontWeight: 600, mb: 2 }}
          >
            {i18n.t('ai.v59-devex-panel.k26')}
          </Typography>
          <Grid
            container
            spacing={2}
          >
            <Grid size={{ xs: 4, md: 2 }}>
              <Typography
                variant='caption'
                color='text.secondary'
              >
                FPS
              </Typography>
              <Typography
                variant='body2'
                sx={{ fontFamily: 'monospace' }}
              >
                {latest.fps}
              </Typography>
            </Grid>
            <Grid size={{ xs: 4, md: 2 }}>
              <Typography
                variant='caption'
                color='text.secondary'
              >
                {i18n.t('ai.v59-devex-panel.mb_27')}
              </Typography>
              <Typography
                variant='body2'
                sx={{ fontFamily: 'monospace' }}
              >
                {(latest.memory / 1024 / 1024).toFixed(2)}
              </Typography>
            </Grid>
            <Grid size={{ xs: 4, md: 2 }}>
              <Typography
                variant='caption'
                color='text.secondary'
              >
                CPU (%)
              </Typography>
              <Typography
                variant='body2'
                sx={{ fontFamily: 'monospace' }}
              >
                {latest.cpu.toFixed(1)}
              </Typography>
            </Grid>
            <Grid size={{ xs: 4, md: 2 }}>
              <Typography
                variant='caption'
                color='text.secondary'
              >
                {i18n.t('ai.v59-devex-panel.ms_28')}
              </Typography>
              <Typography
                variant='body2'
                sx={{ fontFamily: 'monospace' }}
              >
                {latest.renderTime.toFixed(2)}
              </Typography>
            </Grid>
            <Grid size={{ xs: 4, md: 2 }}>
              <Typography
                variant='caption'
                color='text.secondary'
              >
                {i18n.t('ai.v59-devex-panel.ms_29')}
              </Typography>
              <Typography
                variant='body2'
                sx={{ fontFamily: 'monospace' }}
              >
                {latest.scriptTime.toFixed(2)}
              </Typography>
            </Grid>
            <Grid size={{ xs: 4, md: 2 }}>
              <Typography
                variant='caption'
                color='text.secondary'
              >
                {i18n.t('ai.v59-devex-panel.ms_30')}
              </Typography>
              <Typography
                variant='body2'
                sx={{ fontFamily: 'monospace' }}
              >
                {latest.paintTime.toFixed(2)}
              </Typography>
            </Grid>
          </Grid>
        </Paper>
      )}
    </Box>
  );
};
const RefactoringSuggestions: React.FC = () => {
  const [issues, setIssues] = React.useState<CodeIssue[]>([]);
  const [plans, setPlans] = React.useState<RefactoringPlan[]>([]);
  const [history, setHistory] = React.useState(codeRefactorer.getRefactoringHistory());
  const [selectedIssue, setSelectedIssue] = React.useState<CodeIssue | null>(null);
  const [preview, setPreview] = React.useState<{
    additions: string[];
    removals: string[];
  } | null>(null);
  const [impact, setImpact] = React.useState<ImpactEstimate | null>(null);
  const [scanFile, setScanFile] = React.useState('');
  const [scanCode, setScanCode] = React.useState('');
  const [selectedPlan, setSelectedPlan] = React.useState<RefactoringPlan | null>(null);
  const refresh = () => {
    setIssues(codeRefactorer.getIssues());
    setPlans(codeRefactorer.getPendingPlans());
    setHistory(codeRefactorer.getRefactoringHistory());
  };
  React.useEffect(() => {
    refresh();
    const unsubs = [
      codeRefactorer.on('scan:complete', () => refresh()),
      codeRefactorer.on('plan:created', () => refresh()),
      codeRefactorer.on('refactoring:applied', () => refresh()),
      codeRefactorer.on('plan:rejected', () => refresh()),
    ];
    return () => unsubs.forEach((fn) => fn());
  }, []);
  const handleScan = () => {
    if (!scanFile || !scanCode) return;
    codeRefactorer.scanCode(scanFile, scanCode);
    setScanFile('');
    setScanCode('');
  };
  const handleCreatePlan = (issue: CodeIssue, _type: RefactoringType) => {
    const refactorMap: Record<
      CodeIssueType,
      {
        type: RefactoringType;
        oldCode: string;
        newCode: string;
      }
    > = {
      LongMethod: {
        type: 'ExtractFunction',
        oldCode: `// ${issue.description}\nlongMethod() { ... }`,
        newCode: `// ${issue.suggestion}\nextractedFunction() { ... }\nlongMethod() { extractedFunction(); }`,
      },
      Complexity: {
        type: 'ExtractFunction',
        oldCode: `// Complex logic at line ${issue.line}\nif (a && b && c && d) { ... }`,
        newCode: `// Extracted complex condition\nconst isComplex = checkComplex(a, b, c, d);\nif (isComplex) { ... }`,
      },
      Duplication: {
        type: 'ExtractVariable',
        oldCode: `// Duplicated code\nconst result = doSomething(x, y, z);\nconst result2 = doSomething(x, y, z);`,
        newCode: `// Extracted to variable\nconst computeResult = () => doSomething(x, y, z);\nconst result = computeResult();\nconst result2 = computeResult();`,
      },
      GodClass: {
        type: 'Move',
        oldCode: `// God Class with too many responsibilities\nclass GodClass { ... }`,
        newCode: `// Split into smaller classes\nclass ResponsibilityA { ... }\nclass ResponsibilityB { ... }\nclass Orchestrator { ... }`,
      },
    };
    const mapping = refactorMap[issue.type];
    const plan = codeRefactorer.createPlan(
      issue.file,
      mapping.type,
      mapping.oldCode,
      mapping.newCode,
      issue.suggestion
    );
    setSelectedPlan(plan);
    const planPreview = codeRefactorer.previewChanges(plan.id);
    setPreview(planPreview);
    const planImpact = codeRefactorer.estimateImpact(plan.id);
    setImpact(planImpact);
  };
  const handleApply = (planId: string) => {
    codeRefactorer.applyRefactoring(planId);
    setSelectedPlan(null);
    setPreview(null);
    setImpact(null);
    refresh();
  };
  const handleReject = (planId: string) => {
    codeRefactorer.rejectPlan(planId);
    setSelectedPlan(null);
    setPreview(null);
    setImpact(null);
    refresh();
  };
  return (
    <Box>
      <Grid
        container
        spacing={2}
      >
        <Grid size={{ xs: 12, md: 4 }}>
          <Paper sx={{ p: 2, borderRadius: 2, mb: 2 }}>
            <Typography
              variant='subtitle2'
              sx={{ fontWeight: 600, mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}
            >
              <Search size={16} />
              {i18n.t('ai:v59-devex-panel.k8')}
            </Typography>

            <TextField
              size='small'
              placeholder={i18n.t('ai.v59-devex-panel.k23')}
              value={scanFile}
              onChange={(e) => setScanFile(e.target.value)}
              fullWidth
              sx={{ mb: 1 }}
            />
            <TextField
              size='small'
              placeholder={i18n.t('ai.v59-devex-panel.k24')}
              value={scanCode}
              onChange={(e) => setScanCode(e.target.value)}
              fullWidth
              multiline
              rows={3}
              sx={{ mb: 1 }}
            />
            <Button
              variant='contained'
              size='small'
              startIcon={<Search size={14} />}
              onClick={handleScan}
              fullWidth
              disabled={!scanFile}
            >
              {i18n.t('ai.v59-devex-panel.k31')}
            </Button>
          </Paper>

          <Paper sx={{ p: 2, borderRadius: 2 }}>
            <Typography
              variant='subtitle2'
              sx={{ fontWeight: 600, mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}
            >
              <AlertTriangle size={16} />
              {i18n.t('ai:v59-devex-panel.v0_7', { v0: issues.length })}
            </Typography>

            {issues.length === 0 ? (
              <Typography
                variant='caption'
                color='text.secondary'
              >
                {i18n.t('ai.v59-devex-panel.k32')}
              </Typography>
            ) : (
              <Box
                sx={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 1,
                  maxHeight: 400,
                  overflow: 'auto',
                }}
              >
                {issues.map((issue) => (
                  <Paper
                    key={issue.id}
                    sx={{
                      p: 1.5,
                      borderRadius: 1,
                      borderLeft: 3,
                      borderColor:
                        issue.severity === 'critical'
                          ? 'error.main'
                          : issue.severity === 'high'
                            ? 'warning.main'
                            : 'info.main',
                      bgcolor: selectedIssue?.id === issue.id ? 'action.selected' : 'grey.50',
                      cursor: 'pointer',
                    }}
                    onClick={() => setSelectedIssue(issue)}
                  >
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mb: 0.5 }}>
                      <Chip
                        label={issue.type}
                        size='small'
                        color={issue.severity === 'critical' ? 'error' : 'default'}
                        sx={{ fontSize: 10, height: 18 }}
                      />
                      <Chip
                        label={issue.severity}
                        size='small'
                        variant='outlined'
                        sx={{ fontSize: 10, height: 18 }}
                      />
                      <Typography
                        variant='caption'
                        sx={{ fontSize: 10, color: 'text.secondary' }}
                      >
                        L{issue.line}
                      </Typography>
                    </Box>
                    <Typography
                      variant='caption'
                      sx={{ fontSize: 11, fontWeight: 500 }}
                    >
                      {issue.description}
                    </Typography>
                    <Typography
                      variant='caption'
                      sx={{ fontSize: 10, color: 'text.secondary' }}
                    >
                      💡 {issue.suggestion}
                    </Typography>
                  </Paper>
                ))}
              </Box>
            )}
          </Paper>
        </Grid>

        <Grid size={{ xs: 12, md: 4 }}>
          <Paper sx={{ p: 2, borderRadius: 2, mb: 2 }}>
            <Typography
              variant='subtitle2'
              sx={{ fontWeight: 600, mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}
            >
              <Wrench size={16} />
              {i18n.t('ai:v59-devex-panel.v0_6', { v0: plans.length })}
            </Typography>

            {selectedIssue && (
              <Box sx={{ mb: 2 }}>
                <Typography
                  variant='caption'
                  color='text.secondary'
                  sx={{ mb: 0.5, display: 'block' }}
                >
                  {i18n.t('ai:v59-devex-panel.k5', { v0: selectedIssue.type })}
                </Typography>
                <Stack
                  direction='row'
                  spacing={0.5}
                  useFlexGap
                  sx={{ flexWrap: 'wrap' }}
                >
                  {(
                    [
                      'ExtractFunction',
                      'ExtractVariable',
                      'Rename',
                      'Inline',
                      'Move',
                    ] as RefactoringType[]
                  ).map((type) => (
                    <Button
                      key={type}
                      size='small'
                      variant='outlined'
                      onClick={() => handleCreatePlan(selectedIssue, type)}
                      sx={{ fontSize: 10, py: 0.25 }}
                    >
                      {type}
                    </Button>
                  ))}
                </Stack>
              </Box>
            )}

            {plans.length === 0 ? (
              <Typography
                variant='caption'
                color='text.secondary'
              >
                {i18n.t('ai.v59-devex-panel.k33')}
              </Typography>
            ) : (
              <Box
                sx={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 1,
                  maxHeight: 300,
                  overflow: 'auto',
                }}
              >
                {plans.map((plan) => (
                  <Paper
                    key={plan.id}
                    sx={{
                      p: 1.5,
                      borderRadius: 1,
                      bgcolor: selectedPlan?.id === plan.id ? 'action.selected' : 'grey.50',
                      cursor: 'pointer',
                    }}
                    onClick={() => {
                      setSelectedPlan(plan);
                      setPreview(codeRefactorer.previewChanges(plan.id));
                      setImpact(codeRefactorer.estimateImpact(plan.id));
                    }}
                  >
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mb: 0.5 }}>
                      <Chip
                        label={plan.type}
                        size='small'
                        sx={{ fontSize: 10, height: 18 }}
                        color={
                          plan.risk === 'high'
                            ? 'error'
                            : plan.risk === 'medium'
                              ? 'warning'
                              : 'success'
                        }
                      />
                      <Typography
                        variant='caption'
                        sx={{ fontSize: 10 }}
                      >
                        [i18n.t('ai.v59-devex-panel.k34')]: {plan.risk}
                      </Typography>
                    </Box>
                    <Typography
                      variant='caption'
                      sx={{ fontSize: 11, fontFamily: 'monospace' }}
                    >
                      {plan.file}
                    </Typography>
                    <Typography
                      variant='caption'
                      sx={{ fontSize: 10, color: 'text.secondary' }}
                    >
                      {plan.reason}
                    </Typography>
                  </Paper>
                ))}
              </Box>
            )}
          </Paper>

          <Paper sx={{ p: 2, borderRadius: 2 }}>
            <Typography
              variant='subtitle2'
              sx={{ fontWeight: 600, mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}
            >
              <FileCode size={16} />
              {i18n.t('ai:v59-devex-panel.v0_4', { v0: history.length })}
            </Typography>

            {history.length === 0 ? (
              <Typography
                variant='caption'
                color='text.secondary'
              >
                {i18n.t('ai.v59-devex-panel.k35')}
              </Typography>
            ) : (
              <Box
                sx={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 1,
                  maxHeight: 200,
                  overflow: 'auto',
                }}
              >
                {history.slice(0, 10).map((h) => (
                  <Paper
                    key={h.planId}
                    sx={{ p: 1, borderRadius: 1, bgcolor: 'grey.50' }}
                  >
                    <Typography
                      variant='caption'
                      sx={{ fontSize: 10 }}
                    >
                      {new Date(h.appliedAt).toLocaleString()}
                    </Typography>
                    <Typography
                      variant='caption'
                      sx={{ fontSize: 11, fontWeight: 500 }}
                    >
                      {h.type} — {h.file}
                    </Typography>
                  </Paper>
                ))}
              </Box>
            )}
          </Paper>
        </Grid>

        <Grid size={{ xs: 12, md: 4 }}>
          {selectedPlan && (
            <Paper sx={{ p: 2, borderRadius: 2, mb: 2 }}>
              <Typography
                variant='subtitle2'
                sx={{ fontWeight: 600, mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}
              >
                <Code2 size={16} />
                {i18n.t('ai:v59-devex-panel.k3')}
              </Typography>

              {preview && (
                <Grid
                  container
                  spacing={1}
                  sx={{ mb: 2 }}
                >
                  <Grid size={{ xs: 6 }}>
                    <Typography
                      variant='caption'
                      sx={{ color: 'error.main', fontWeight: 600 }}
                    >
                      {i18n.t('ai:v59-devex-panel.k2', { v0: preview.removals.length })}
                    </Typography>
                    <Paper sx={{ p: 1, bgcolor: 'error.900', maxHeight: 100, overflow: 'auto' }}>
                      {preview.removals.slice(0, 10).map((line, i) => (
                        <Typography
                          key={i}
                          variant='caption'
                          sx={{ color: 'error.light', fontFamily: 'monospace', fontSize: 10 }}
                        >
                          -{line.substring(0, 60)}
                        </Typography>
                      ))}
                    </Paper>
                  </Grid>
                  <Grid size={{ xs: 6 }}>
                    <Typography
                      variant='caption'
                      sx={{ color: 'success.main', fontWeight: 600 }}
                    >
                      {i18n.t('ai:v59-devex-panel.k1', { v0: preview.additions.length })}
                    </Typography>
                    <Paper sx={{ p: 1, bgcolor: 'success.900', maxHeight: 100, overflow: 'auto' }}>
                      {preview.additions.slice(0, 10).map((line, i) => (
                        <Typography
                          key={i}
                          variant='caption'
                          sx={{ color: 'success.light', fontFamily: 'monospace', fontSize: 10 }}
                        >
                          +{line.substring(0, 60)}
                        </Typography>
                      ))}
                    </Paper>
                  </Grid>
                </Grid>
              )}

              {impact && (
                <Paper sx={{ p: 1.5, borderRadius: 1, bgcolor: 'grey.50', mb: 2 }}>
                  <Typography
                    variant='caption'
                    sx={{ fontWeight: 600, mb: 0.5, display: 'block' }}
                  >
                    {i18n.t('ai.v59-devex-panel.k36')}
                  </Typography>
                  <Grid
                    container
                    spacing={1}
                  >
                    <Grid size={{ xs: 6 }}>
                      <Typography
                        variant='caption'
                        color='text.secondary'
                      >
                        {i18n.t('ai.v59-devex-panel.k37')}
                      </Typography>
                      <Typography
                        variant='caption'
                        sx={{ fontWeight: 600 }}
                      >
                        {impact.filesChanged}
                      </Typography>
                    </Grid>
                    <Grid size={{ xs: 6 }}>
                      <Typography
                        variant='caption'
                        color='text.secondary'
                      >
                        {i18n.t('ai.v59-devex-panel.k38')}
                      </Typography>
                      <Typography
                        variant='caption'
                        sx={{ fontWeight: 600, color: 'success.main' }}
                      >
                        +{impact.linesAdded}
                      </Typography>
                    </Grid>
                    <Grid size={{ xs: 6 }}>
                      <Typography
                        variant='caption'
                        color='text.secondary'
                      >
                        {i18n.t('ai.v59-devex-panel.k39')}
                      </Typography>
                      <Typography
                        variant='caption'
                        sx={{ fontWeight: 600, color: 'error.main' }}
                      >
                        -{impact.linesRemoved}
                      </Typography>
                    </Grid>
                    <Grid size={{ xs: 6 }}>
                      <Typography
                        variant='caption'
                        color='text.secondary'
                      >
                        {i18n.t('ai.v59-devex-panel.k40')}
                      </Typography>
                      <Chip
                        label={impact.risk}
                        size='small'
                        color={
                          impact.risk === 'high'
                            ? 'error'
                            : impact.risk === 'medium'
                              ? 'warning'
                              : 'success'
                        }
                        sx={{ fontSize: 10, height: 18 }}
                      />
                    </Grid>
                  </Grid>
                  <Typography
                    variant='caption'
                    sx={{ mt: 1, display: 'block' }}
                  >
                    {impact.description}
                  </Typography>
                </Paper>
              )}

              <Stack
                direction='row'
                spacing={1}
              >
                <Button
                  variant='contained'
                  size='small'
                  startIcon={<CheckCircle size={14} />}
                  onClick={() => handleApply(selectedPlan.id)}
                  color='success'
                >
                  {i18n.t('ai.v59-devex-panel.k41')}
                </Button>
                <Button
                  size='small'
                  startIcon={<XCircle size={14} />}
                  onClick={() => handleReject(selectedPlan.id)}
                  color='inherit'
                >
                  {i18n.t('ai.v59-devex-panel.k42')}
                </Button>
              </Stack>
            </Paper>
          )}

          <Paper sx={{ p: 2, borderRadius: 2 }}>
            <Typography
              variant='subtitle2'
              sx={{ fontWeight: 600, mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}
            >
              <Sparkles size={16} />
              {i18n.t('ai:v59-devex-panel.ai_0')}
            </Typography>

            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
              {[
                { icon: <Zap size={14} />, text: i18n.t('ai.v59-devex-panel.k43') },
                { icon: <Wrench size={14} />, text: i18n.t('ai.v59-devex-panel.k25') },
                { icon: <Code2 size={14} />, text: i18n.t('ai.v59-devex-panel.200_26') },
                { icon: <AlertTriangle size={14} />, text: i18n.t('ai.v59-devex-panel.k27') },
              ].map((tip, idx) => (
                <Paper
                  key={idx}
                  sx={{ p: 1, borderRadius: 1, bgcolor: 'grey.50' }}
                >
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    {tip.icon}
                    <Typography variant='caption'>{tip.text}</Typography>
                  </Box>
                </Paper>
              ))}
            </Box>
          </Paper>
        </Grid>
      </Grid>
    </Box>
  );
};
const Divider: React.FC<{
  sx?: Record<string, unknown>;
}> = ({ sx }) => (
  <Box
    sx={{
      height: 1,
      bgcolor: 'divider',
      ...sx,
    }}
  />
);
