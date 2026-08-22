import React, { useState, useEffect, useCallback } from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Chip,
  Divider,
  Button,
  List,
  ListItem,
  Avatar,
  Grid,
  Paper,
  Tabs,
  Tab,
  LinearProgress,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Snackbar,
  Alert,
} from '@mui/material';
import i18n from '@/i18n';
import {
  Shield as ShieldIcon,
  AlertTriangle as AlertTriangleIcon,
  RefreshCw as RefreshIcon,
  CheckCircle as CheckCircleIcon,
  XCircle as XCircleIcon,
  Zap as ZapIcon,
  AlertCircle as AlertCircleIcon,
  Lock as LockIcon,
  Database as DatabaseIcon,
  Code as CodeIcon,
  Globe as GlobeIcon,
  Package as PackageIcon,
  Layers as LayersIcon,
  Clock as ClockIcon,
  Wrench as WrenchIcon,
  ChevronDown as ChevronDownIcon,
  Check as CheckIcon,
  X as XIcon,
} from 'lucide-react';
import {
  securityScanner,
  type SecurityScanResult,
  type SecurityIssue,
  type SecurityIssueSeverity,
  SecurityCategory,
  type PermissionAudit,
  type ScanHistoryEntry,
} from './security-scanner';
import { designTokens, semanticTokens } from '@topems/tokens';

interface SecurityCenterProps {
  onClose?: () => void;
}

const severityColors: Record<SecurityIssueSeverity, string> = {
  info: 'colors.grey.500',
  low: designTokens.colors.success.dark,
  medium: designTokens.colors.warning.main,
  high: designTokens.colors.error.main,
  critical: designTokens.colors.error.dark,
};

const severityLabels: Record<SecurityIssueSeverity, string> = {
  info: i18n.t('microfrontend.security_center.k0'),
  low: i18n.t('microfrontend.security_center.k1'),
  medium: i18n.t('microfrontend.security_center.k2'),
  high: i18n.t('microfrontend.security_center.k3'),
  critical: i18n.t('microfrontend.security_center.k4'),
};

const categoryIcons: Record<SecurityCategory, React.ReactNode> = {
  [SecurityCategory.DEPENDENCY]: <PackageIcon size={16} />,
  [SecurityCategory.PERMISSION]: <LockIcon size={16} />,
  [SecurityCategory.SANDBOX]: <LayersIcon size={16} />,
  [SecurityCategory.NETWORK]: <GlobeIcon size={16} />,
  [SecurityCategory.DATA]: <DatabaseIcon size={16} />,
  [SecurityCategory.CODE]: <CodeIcon size={16} />,
};

const categoryLabels: Record<SecurityCategory, string> = {
  [SecurityCategory.DEPENDENCY]: i18n.t('microfrontend.security_center.k5'),
  [SecurityCategory.PERMISSION]: i18n.t('microfrontend.security_center.k6'),
  [SecurityCategory.SANDBOX]: i18n.t('microfrontend.security_center.k7'),
  [SecurityCategory.NETWORK]: i18n.t('microfrontend.security_center.k8'),
  [SecurityCategory.DATA]: i18n.t('microfrontend.security_center.k9'),
  [SecurityCategory.CODE]: i18n.t('microfrontend.security_center.k10'),
};

const StatCard: React.FC<{
  label: string;
  value: string | number;
  icon: React.ReactNode;
  color: string;
}> = ({ label, value, icon, color }) => (
  <Card sx={{ flex: 1, minWidth: 0 }}>
    <CardContent>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <Box sx={{ minWidth: 0 }}>
          <Typography
            variant='body2'
            color='text.secondary'
            sx={{ mb: 0.5 }}
          >
            {label}
          </Typography>
          <Typography
            variant='h5'
            sx={{ fontWeight: 700, color }}
          >
            {value}
          </Typography>
        </Box>
        <Box sx={{ p: 1.5, borderRadius: 2, bgcolor: `${color}15`, color, flexShrink: 0 }}>
          {icon}
        </Box>
      </Box>
    </CardContent>
  </Card>
);

const SecurityScoreGauge: React.FC<{ score: number }> = ({ score }) => {
  const getScoreColor = () => {
    if (score >= 90) return designTokens.colors.success.dark;
    if (score >= 70) return designTokens.colors.warning.main;
    if (score >= 50) return designTokens.colors.error.main;
    return designTokens.colors.error.dark;
  };

  const color = getScoreColor();
  const circumference = 2 * Math.PI * 80;
  const offset = circumference - (score / 100) * circumference;

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', py: 2 }}>
      <svg
        width='200'
        height='200'
        viewBox='0 0 200 200'
      >
        <circle
          cx='100'
          cy='100'
          r='80'
          fill='none'
          stroke={designTokens.colors.grey['200']}
          strokeWidth='12'
        />
        <circle
          cx='100'
          cy='100'
          r='80'
          fill='none'
          stroke={color}
          strokeWidth='12'
          strokeLinecap='round'
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          transform='rotate(-90 100 100)'
          style={{ transition: 'stroke-dashoffset 0.5s ease' }}
        />
        <text
          x='100'
          y='95'
          textAnchor='middle'
          style={{ fontSize: 36, fontWeight: 700, fill: color }}
        >
          {score}
        </text>
        <text
          x='100'
          y='120'
          textAnchor='middle'
          style={{ fontSize: 14, fill: 'grey.500' }}
        >
          {i18n.t('microfrontend.security_center.k0')}
        </text>
      </svg>
      <Typography
        variant='body2'
        color='text.secondary'
        sx={{ mt: 1 }}
      >
        {score >= 90
          ? i18n.t('microfrontend.security_center.k14')
          : score >= 70
            ? i18n.t('microfrontend.security_center.k13')
            : score >= 50
              ? i18n.t('microfrontend.security_center.k12')
              : i18n.t('microfrontend.security_center.k11')}
      </Typography>
    </Box>
  );
};

const IssueItem: React.FC<{
  issue: SecurityIssue;
  onFix?: () => void;
}> = ({ issue, onFix }) => {
  const [expanded, setExpanded] = useState(false);

  return (
    <Paper
      sx={{
        mb: 1.5,
        borderLeft: 4,
        borderColor: severityColors[issue.severity],
        opacity: issue.fixed ? 0.6 : 1,
      }}
    >
      <Box
        sx={{
          p: 2,
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'flex-start',
          gap: 2,
        }}
        onClick={() => setExpanded(!expanded)}
      >
        <Box
          sx={{
            p: 1,
            borderRadius: 1,
            bgcolor: `${severityColors[issue.severity]}15`,
            color: severityColors[issue.severity],
            flexShrink: 0,
          }}
        >
          {categoryIcons[issue.category]}
        </Box>
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
            <Typography
              variant='subtitle2'
              sx={{ fontWeight: 600 }}
            >
              {issue.title}
            </Typography>
            <Chip
              label={severityLabels[issue.severity]}
              size='small'
              sx={{
                bgcolor: `${severityColors[issue.severity]}15`,
                color: severityColors[issue.severity],
                fontWeight: 600,
                fontSize: designTokens.typography.fontSize.scale['0.7rem'],
              }}
            />
            {issue.fixed && (
              <Chip
                icon={<CheckIcon size={12} />}
                label={i18n.t('microfrontend.security_center.k15')}
                size='small'
                color='success'
                variant='outlined'
              />
            )}
          </Box>
          <Typography
            variant='body2'
            color='text.secondary'
            sx={{ fontSize: designTokens.typography.fontSize.scale['0.85rem'] }}
          >
            {issue.description}
          </Typography>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mt: 1 }}>
            <Typography
              variant='caption'
              color='text.secondary'
            >
              {categoryLabels[issue.category]}
            </Typography>
            <Typography
              variant='caption'
              color='text.secondary'
            >
              CVSS: {issue.cvss_score}
            </Typography>
            <Typography
              variant='caption'
              color='text.secondary'
            >
              {issue.file_path}
            </Typography>
          </Box>
        </Box>
        <ChevronDownIcon
          size={20}
          style={{
            color: 'var(--mui-palette-text-secondary)',
            transform: expanded ? 'rotate(180deg)' : 'rotate(0deg)',
            transition: 'transform 0.2s',
          }}
        />
      </Box>
      {expanded && (
        <Box sx={{ px: 2, pb: 2, pt: 0 }}>
          <Divider sx={{ mb: 2 }} />
          <Typography
            variant='body2'
            sx={{ mb: 1 }}
          >
            {i18n.t('microfrontend.security_center.k0')} {issue.recommendation}
          </Typography>
          {issue.fixed_version && (
            <Typography
              variant='body2'
              color='text.secondary'
              sx={{ mb: 2 }}
            >
              [i18n.t('microfrontend.security_center.k1')]: {issue.fixed_version}
            </Typography>
          )}
          {!issue.fixed && onFix && (
            <Button
              size='small'
              variant='contained'
              color='primary'
              startIcon={<WrenchIcon size={16} />}
              onClick={(e) => {
                e.stopPropagation();
                onFix();
              }}
            >
              {i18n.t('microfrontend.security_center.k2')}
            </Button>
          )}
        </Box>
      )}
    </Paper>
  );
};

const PermissionAuditTable: React.FC<{ permissions: PermissionAudit[] }> = ({ permissions }) => (
  <TableContainer component={Paper}>
    <Table size='small'>
      <TableHead>
        <TableRow>
          <TableCell>{i18n.t('microfrontend.security_center.k16')}</TableCell>
          <TableCell>{i18n.t('microfrontend.security_center.k17')}</TableCell>
          <TableCell>{i18n.t('microfrontend.security_center.k18')}</TableCell>
          <TableCell>{i18n.t('microfrontend.security_center.k19')}</TableCell>
          <TableCell>{i18n.t('microfrontend.security_center.k20')}</TableCell>
        </TableRow>
      </TableHead>
      <TableBody>
        {permissions.map((perm, idx) => (
          <TableRow key={idx}>
            <TableCell sx={{ fontWeight: 600 }}>{perm.permission}</TableCell>
            <TableCell>
              <Chip
                label={
                  perm.required
                    ? i18n.t('microfrontend.security_center.k22')
                    : i18n.t('microfrontend.security_center.k21')
                }
                size='small'
                color={perm.required ? 'primary' : 'default'}
                variant='outlined'
              />
            </TableCell>
            <TableCell>{perm.justification}</TableCell>
            <TableCell>
              <Chip
                label={
                  perm.risky
                    ? i18n.t('microfrontend.security_center.k24')
                    : i18n.t('microfrontend.security_center.k23')
                }
                size='small'
                color={perm.risky ? 'warning' : 'success'}
                variant='outlined'
              />
            </TableCell>
            <TableCell>{perm.alternative}</TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  </TableContainer>
);

const ScanHistoryList: React.FC<{ history: ScanHistoryEntry[] }> = ({ history }) => {
  if (history.length === 0) {
    return (
      <Paper sx={{ p: 4, textAlign: 'center' }}>
        <ClockIcon
          size={48}
          style={{ opacity: 0.3, marginBottom: 16 }}
        />
        <Typography color='text.secondary'>
          {i18n.t('microfrontend.security_center.k25')}
        </Typography>
      </Paper>
    );
  }

  return (
    <List>
      {history.map((entry) => (
        <ListItem
          key={entry.id}
          divider
          sx={{ py: 2 }}
        >
          <Avatar sx={{ mr: 2, bgcolor: 'primary.main' }}>
            <ShieldIcon size={20} />
          </Avatar>
          <Box sx={{ flex: 1 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Typography
                variant='body2'
                sx={{ fontWeight: 600 }}
              >
                {i18n.t('microfrontend.security_center.k3')}
              </Typography>
              <Chip
                label={`${entry.avg_score}${i18n.t('microfrontend.security_center.k4')}`}
                size='small'
                color={entry.avg_score >= 80 ? 'success' : 'warning'}
              />
            </Box>
            <Typography
              variant='caption'
              color='text.secondary'
            >
              {new Date(entry.scan_time).toLocaleString('zh-CN')}
              {entry.total_issues} {i18n.t('microfrontend.security_center.k1')}
            </Typography>
          </Box>
          <Box sx={{ display: 'flex', gap: 1 }}>
            {entry.critical_count > 0 && (
              <Chip
                label={`${i18n.t('microfrontend.security_center.k6')} ${entry.critical_count}`}
                size='small'
                sx={{ bgcolor: 'error.600', color: 'error.600' }}
              />
            )}
            {entry.high_count > 0 && (
              <Chip
                label={`${i18n.t('microfrontend.security_center.k7')} ${entry.high_count}`}
                size='small'
                sx={{ bgcolor: 'error.500', color: 'error.500' }}
              />
            )}
            {entry.medium_count > 0 && (
              <Chip
                label={`${i18n.t('microfrontend.security_center.k8')} ${entry.medium_count}`}
                size='small'
                sx={{ bgcolor: 'warning.500', color: 'warning.500' }}
              />
            )}
          </Box>
        </ListItem>
      ))}
    </List>
  );
};

const SecurityCenter: React.FC<SecurityCenterProps> = ({ onClose }) => {
  const [activeTab, setActiveTab] = useState(0);
  const [scanning, setScanning] = useState(false);
  const [scanResults, setScanResults] = useState<SecurityScanResult[]>([]);
  const [allIssues, setAllIssues] = useState<SecurityIssue[]>([]);
  const [overallScore, setOverallScore] = useState(0);
  const [scanHistory, setScanHistory] = useState<ScanHistoryEntry[]>([]);
  const [selectedSeverity, setSelectedSeverity] = useState<string>('');
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [selectedModule, setSelectedModule] = useState<string>('');
  const [snackbar, setSnackbar] = useState<{
    open: boolean;
    message: string;
    type: 'success' | 'error';
  }>({
    open: false,
    message: '',
    type: 'success',
  });

  const runScan = useCallback(() => {
    setScanning(true);
    setTimeout(() => {
      securityScanner.refreshModules();
      const { results } = securityScanner.scanAll();
      setScanResults(results);
      setAllIssues(securityScanner.getSecurityIssues());
      setOverallScore(securityScanner.getSecurityScore());
      setScanHistory(securityScanner.getScanHistory());
      setScanning(false);
    }, 1500);
  }, []);

  useEffect(() => {
    runScan();
  }, [runScan]);

  const filteredIssues = allIssues.filter((issue) => {
    if (selectedSeverity && issue.severity !== selectedSeverity) return false;
    if (selectedCategory && issue.category !== selectedCategory) return false;
    return true;
  });

  const criticalCount = allIssues.filter((i) => i.severity === 'critical' && !i.fixed).length;
  const highCount = allIssues.filter((i) => i.severity === 'high' && !i.fixed).length;
  const mediumCount = allIssues.filter((i) => i.severity === 'medium' && !i.fixed).length;
  const lowCount = allIssues.filter((i) => i.severity === 'low' && !i.fixed).length;

  const handleFixIssue = (issueId: string) => {
    const success = securityScanner.fixIssue(issueId);
    if (success) {
      setAllIssues(securityScanner.getSecurityIssues());
      setOverallScore(securityScanner.getSecurityScore());
      setSnackbar({
        open: true,
        message: i18n.t('microfrontend.security_center.k26'),
        type: 'success',
      });
    }
  };

  const handleAutoFix = () => {
    let fixedCount = 0;
    scanResults.forEach((result) => {
      const { fixed } = securityScanner.autoFixIssues(result.module_id);
      fixedCount += fixed;
    });
    setAllIssues(securityScanner.getSecurityIssues());
    setOverallScore(securityScanner.getSecurityScore());
    setSnackbar({
      open: true,
      message: `${i18n.t('microfrontend.security_center.k9')} ${fixedCount} ${i18n.t('microfrontend.security_center.k10')}`,
      type: 'success',
    });
  };

  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        fontFamily: 'system-ui, -apple-system, sans-serif',
      }}
    >
      <Box
        sx={{
          p: 2,
          borderBottom: 1,
          borderColor: 'divider',
          display: 'flex',
          alignItems: 'center',
          gap: 2,
        }}
      >
        <ShieldIcon
          size={24}
          style={{ color: 'var(--mui-palette-primary-main)' }}
        />
        <Typography
          variant='h6'
          sx={{ fontWeight: 700 }}
        >
          {i18n.t('microfrontend.security_center.k11')}
        </Typography>
        <Box sx={{ flex: 1 }} />
        <Button
          variant='outlined'
          color='success'
          startIcon={<WrenchIcon size={18} />}
          onClick={handleAutoFix}
          disabled={scanning}
        >
          {i18n.t('microfrontend.security_center.k12')}
        </Button>
        <Button
          variant='contained'
          startIcon={
            scanning ? (
              <RefreshIcon
                size={18}
                style={{ animation: 'spin 1s linear infinite' }}
              />
            ) : (
              <ZapIcon size={18} />
            )
          }
          onClick={runScan}
          disabled={scanning}
        >
          {scanning
            ? i18n.t('microfrontend.security_center.k13')
            : i18n.t('microfrontend.security_center.k27')}
        </Button>
      </Box>

      {scanning && <LinearProgress />}

      <Box sx={{ p: 2, pb: 0 }}>
        <Grid
          container
          spacing={2}
          sx={{ mb: 2 }}
        >
          <Grid size={{ xs: 12, sm: 3 }}>
            <Paper sx={{ p: 2, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
              <SecurityScoreGauge score={overallScore} />
            </Paper>
          </Grid>
          <Grid size={{ xs: 12, sm: 9 }}>
            <Grid
              container
              spacing={2}
              sx={{ height: '100%' }}
            >
              <Grid size={{ xs: 6, sm: 3 }}>
                <StatCard
                  label={i18n.t('microfrontend.security_center.k28')}
                  value={scanResults.length}
                  icon={<PackageIcon size={20} />}
                  color={designTokens.colors.primary.dark}
                />
              </Grid>
              <Grid size={{ xs: 6, sm: 3 }}>
                <StatCard
                  label={i18n.t('microfrontend.security_center.k29')}
                  value={criticalCount}
                  icon={<XCircleIcon size={20} />}
                  color={designTokens.colors.error.dark}
                />
              </Grid>
              <Grid size={{ xs: 6, sm: 3 }}>
                <StatCard
                  label={i18n.t('microfrontend.security_center.k30')}
                  value={highCount}
                  icon={<AlertTriangleIcon size={20} />}
                  color={designTokens.colors.error.main}
                />
              </Grid>
              <Grid size={{ xs: 6, sm: 3 }}>
                <StatCard
                  label={i18n.t('microfrontend.security_center.k31')}
                  value={mediumCount + lowCount}
                  icon={<AlertCircleIcon size={20} />}
                  color={designTokens.colors.warning.main}
                />
              </Grid>
            </Grid>
          </Grid>
        </Grid>
      </Box>

      <Box sx={{ px: 2 }}>
        <Tabs
          value={activeTab}
          onChange={(_, v) => setActiveTab(v)}
        >
          <Tab
            label={i18n.t('microfrontend.security_center.k32')}
            icon={<AlertTriangleIcon size={16} />}
            iconPosition='start'
          />
          <Tab
            label={i18n.t('microfrontend.security_center.k33')}
            icon={<PackageIcon size={16} />}
            iconPosition='start'
          />
          <Tab
            label={i18n.t('microfrontend.security_center.k34')}
            icon={<LockIcon size={16} />}
            iconPosition='start'
          />
          <Tab
            label={i18n.t('microfrontend.security_center.k35')}
            icon={<ClockIcon size={16} />}
            iconPosition='start'
          />
        </Tabs>
      </Box>

      <Box sx={{ flex: 1, overflow: 'auto', p: 2 }}>
        {activeTab === 0 && (
          <Box>
            <Box sx={{ display: 'flex', gap: 2, mb: 2, flexWrap: 'wrap' }}>
              <FormControl
                size='small'
                sx={{ minWidth: 150 }}
              >
                <InputLabel>{i18n.t('microfrontend.security_center.k36')}</InputLabel>
                <Select
                  value={selectedSeverity}
                  label={i18n.t('microfrontend.security_center.k37')}
                  onChange={(e) => setSelectedSeverity(e.target.value)}
                >
                  <MenuItem value=''>{i18n.t('microfrontend.security_center.k38')}</MenuItem>
                  <MenuItem value='critical'>
                    {i18n.t('microfrontend.security_center.k39')}
                  </MenuItem>
                  <MenuItem value='high'>{i18n.t('microfrontend.security_center.k40')}</MenuItem>
                  <MenuItem value='medium'>{i18n.t('microfrontend.security_center.k41')}</MenuItem>
                  <MenuItem value='low'>{i18n.t('microfrontend.security_center.k42')}</MenuItem>
                  <MenuItem value='info'>{i18n.t('microfrontend.security_center.k43')}</MenuItem>
                </Select>
              </FormControl>
              <FormControl
                size='small'
                sx={{ minWidth: 150 }}
              >
                <InputLabel>{i18n.t('microfrontend.security_center.k44')}</InputLabel>
                <Select
                  value={selectedCategory}
                  label={i18n.t('microfrontend.security_center.k45')}
                  onChange={(e) => setSelectedCategory(e.target.value)}
                >
                  <MenuItem value=''>{i18n.t('microfrontend.security_center.k46')}</MenuItem>
                  <MenuItem value='dependency'>
                    {i18n.t('microfrontend.security_center.k47')}
                  </MenuItem>
                  <MenuItem value='permission'>
                    {i18n.t('microfrontend.security_center.k48')}
                  </MenuItem>
                  <MenuItem value='sandbox'>{i18n.t('microfrontend.security_center.k49')}</MenuItem>
                  <MenuItem value='network'>{i18n.t('microfrontend.security_center.k50')}</MenuItem>
                  <MenuItem value='data'>{i18n.t('microfrontend.security_center.k51')}</MenuItem>
                  <MenuItem value='code'>{i18n.t('microfrontend.security_center.k52')}</MenuItem>
                </Select>
              </FormControl>
              <Box sx={{ flex: 1 }} />
              <Typography
                variant='body2'
                color='text.secondary'
                sx={{ alignSelf: 'center' }}
              >
                {i18n.t('microfrontend.security_center.k2')} {filteredIssues.length}{' '}
                {i18n.t('microfrontend.security_center.k3')}
              </Typography>
            </Box>

            {filteredIssues.length === 0 ? (
              <Paper sx={{ p: 4, textAlign: 'center' }}>
                <CheckCircleIcon
                  size={48}
                  style={{ color: 'teal.500', marginBottom: 16 }}
                />
                <Typography
                  variant='h6'
                  sx={{ fontWeight: 600, mb: 1 }}
                >
                  {i18n.t('microfrontend.security_center.k14')}
                </Typography>
                <Typography
                  variant='body2'
                  color='text.secondary'
                >
                  {i18n.t('microfrontend.security_center.k15')}
                </Typography>
              </Paper>
            ) : (
              filteredIssues.map((issue) => (
                <IssueItem
                  key={issue.id}
                  issue={issue}
                  onFix={() => handleFixIssue(issue.id)}
                />
              ))
            )}
          </Box>
        )}

        {activeTab === 1 && (
          <Box>
            {scanResults.map((result) => (
              <Accordion
                key={result.module_id}
                sx={{ mb: 1 }}
              >
                <AccordionSummary expandIcon={<ChevronDownIcon size={20} />}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, width: '100%' }}>
                    <Avatar sx={{ bgcolor: 'primary.main' }}>
                      <PackageIcon size={20} />
                    </Avatar>
                    <Box sx={{ flex: 1 }}>
                      <Typography
                        variant='subtitle2'
                        sx={{ fontWeight: 600 }}
                      >
                        {result.module_name}
                      </Typography>
                      <Typography
                        variant='caption'
                        color='text.secondary'
                      >
                        {result.passed_checks} {i18n.t('microfrontend.security_center.k4')}{' '}
                        {result.failed_checks} {i18n.t('microfrontend.security_center.k5')}
                      </Typography>
                    </Box>
                    <Chip
                      label={`${result.overall_score}${i18n.t('microfrontend.security_center.k16')}`}
                      color={
                        result.overall_score >= 80
                          ? 'success'
                          : result.overall_score >= 60
                            ? 'warning'
                            : 'error'
                      }
                      size='small'
                    />
                  </Box>
                </AccordionSummary>
                <AccordionDetails>
                  {result.issues.map((issue) => (
                    <IssueItem
                      key={issue.id}
                      issue={issue}
                      onFix={() => handleFixIssue(issue.id)}
                    />
                  ))}
                </AccordionDetails>
              </Accordion>
            ))}
          </Box>
        )}

        {activeTab === 2 && (
          <Box>
            <Typography
              variant='body2'
              color='text.secondary'
              sx={{ mb: 2 }}
            >
              {i18n.t('microfrontend.security_center.k17')}
            </Typography>
            <FormControl
              fullWidth
              size='small'
              sx={{ mb: 2 }}
            >
              <InputLabel>{i18n.t('microfrontend.security_center.k53')}</InputLabel>
              <Select
                value={selectedModule}
                label={i18n.t('microfrontend.security_center.k54')}
                onChange={(e) => setSelectedModule(e.target.value)}
              >
                <MenuItem value=''>{i18n.t('microfrontend.security_center.k55')}</MenuItem>
                {scanResults.map((result) => (
                  <MenuItem
                    key={result.module_id}
                    value={result.module_id}
                  >
                    {result.module_name}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            {selectedModule && (
              <PermissionAuditTable
                permissions={securityScanner.getPermissionAudit(selectedModule)}
              />
            )}
          </Box>
        )}

        {activeTab === 3 && <ScanHistoryList history={scanHistory} />}
      </Box>

      <Snackbar
        open={snackbar.open}
        autoHideDuration={3000}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
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

export default SecurityCenter;
