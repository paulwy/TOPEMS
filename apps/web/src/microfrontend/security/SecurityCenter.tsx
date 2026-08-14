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
  info: '信息',
  low: '低危',
  medium: '中危',
  high: '高危',
  critical: '严重',
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
  [SecurityCategory.DEPENDENCY]: '依赖',
  [SecurityCategory.PERMISSION]: '权限',
  [SecurityCategory.SANDBOX]: '沙箱',
  [SecurityCategory.NETWORK]: '网络',
  [SecurityCategory.DATA]: '数据',
  [SecurityCategory.CODE]: '代码',
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
          stroke='#e5e7eb'
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
          安全评分
        </text>
      </svg>
      <Typography
        variant='body2'
        color='text.secondary'
        sx={{ mt: 1 }}
      >
        {score >= 90 ? '优秀' : score >= 70 ? '良好' : score >= 50 ? '一般' : '较差'}
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
                fontSize: '0.7rem',
              }}
            />
            {issue.fixed && (
              <Chip
                icon={<CheckIcon size={12} />}
                label='已修复'
                size='small'
                color='success'
                variant='outlined'
              />
            )}
          </Box>
          <Typography
            variant='body2'
            color='text.secondary'
            sx={{ fontSize: '0.85rem' }}
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
            <strong>修复建议:</strong> {issue.recommendation}
          </Typography>
          {issue.fixed_version && (
            <Typography
              variant='body2'
              color='text.secondary'
              sx={{ mb: 2 }}
            >
              修复版本: {issue.fixed_version}
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
              修复此问题
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
          <TableCell>权限</TableCell>
          <TableCell>是否必需</TableCell>
          <TableCell>说明</TableCell>
          <TableCell>风险</TableCell>
          <TableCell>替代方案</TableCell>
        </TableRow>
      </TableHead>
      <TableBody>
        {permissions.map((perm, idx) => (
          <TableRow key={idx}>
            <TableCell sx={{ fontWeight: 600 }}>{perm.permission}</TableCell>
            <TableCell>
              <Chip
                label={perm.required ? '必需' : '可选'}
                size='small'
                color={perm.required ? 'primary' : 'default'}
                variant='outlined'
              />
            </TableCell>
            <TableCell>{perm.justification}</TableCell>
            <TableCell>
              <Chip
                label={perm.risky ? '有风险' : '安全'}
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
        <Typography color='text.secondary'>暂无扫描历史</Typography>
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
                全量扫描
              </Typography>
              <Chip
                label={`${entry.avg_score}分`}
                size='small'
                color={entry.avg_score >= 80 ? 'success' : 'warning'}
              />
            </Box>
            <Typography
              variant='caption'
              color='text.secondary'
            >
              {new Date(entry.scan_time).toLocaleString('zh-CN')} · {entry.module_count} 个模块 ·{' '}
              {entry.total_issues} 个问题
            </Typography>
          </Box>
          <Box sx={{ display: 'flex', gap: 1 }}>
            {entry.critical_count > 0 && (
              <Chip
                label={`严重 ${entry.critical_count}`}
                size='small'
                sx={{ bgcolor: 'error.600', color: 'error.600' }}
              />
            )}
            {entry.high_count > 0 && (
              <Chip
                label={`高危 ${entry.high_count}`}
                size='small'
                sx={{ bgcolor: 'error.500', color: 'error.500' }}
              />
            )}
            {entry.medium_count > 0 && (
              <Chip
                label={`中危 ${entry.medium_count}`}
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
      setSnackbar({ open: true, message: '问题已标记为修复', type: 'success' });
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
    setSnackbar({ open: true, message: `已自动修复 ${fixedCount} 个低风险问题`, type: 'success' });
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
          安全中心
        </Typography>
        <Box sx={{ flex: 1 }} />
        <Button
          variant='outlined'
          color='success'
          startIcon={<WrenchIcon size={18} />}
          onClick={handleAutoFix}
          disabled={scanning}
        >
          一键修复
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
          {scanning ? '扫描中...' : '开始扫描'}
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
                  label='已扫描模块'
                  value={scanResults.length}
                  icon={<PackageIcon size={20} />}
                  color={designTokens.colors.primary.dark}
                />
              </Grid>
              <Grid size={{ xs: 6, sm: 3 }}>
                <StatCard
                  label='严重问题'
                  value={criticalCount}
                  icon={<XCircleIcon size={20} />}
                  color={designTokens.colors.error.dark}
                />
              </Grid>
              <Grid size={{ xs: 6, sm: 3 }}>
                <StatCard
                  label='高危问题'
                  value={highCount}
                  icon={<AlertTriangleIcon size={20} />}
                  color={designTokens.colors.error.main}
                />
              </Grid>
              <Grid size={{ xs: 6, sm: 3 }}>
                <StatCard
                  label='中低危问题'
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
            label='问题列表'
            icon={<AlertTriangleIcon size={16} />}
            iconPosition='start'
          />
          <Tab
            label='模块安全'
            icon={<PackageIcon size={16} />}
            iconPosition='start'
          />
          <Tab
            label='权限审计'
            icon={<LockIcon size={16} />}
            iconPosition='start'
          />
          <Tab
            label='扫描历史'
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
                <InputLabel>严重程度</InputLabel>
                <Select
                  value={selectedSeverity}
                  label='严重程度'
                  onChange={(e) => setSelectedSeverity(e.target.value)}
                >
                  <MenuItem value=''>全部</MenuItem>
                  <MenuItem value='critical'>严重</MenuItem>
                  <MenuItem value='high'>高危</MenuItem>
                  <MenuItem value='medium'>中危</MenuItem>
                  <MenuItem value='low'>低危</MenuItem>
                  <MenuItem value='info'>信息</MenuItem>
                </Select>
              </FormControl>
              <FormControl
                size='small'
                sx={{ minWidth: 150 }}
              >
                <InputLabel>类别</InputLabel>
                <Select
                  value={selectedCategory}
                  label='类别'
                  onChange={(e) => setSelectedCategory(e.target.value)}
                >
                  <MenuItem value=''>全部</MenuItem>
                  <MenuItem value='dependency'>依赖</MenuItem>
                  <MenuItem value='permission'>权限</MenuItem>
                  <MenuItem value='sandbox'>沙箱</MenuItem>
                  <MenuItem value='network'>网络</MenuItem>
                  <MenuItem value='data'>数据</MenuItem>
                  <MenuItem value='code'>代码</MenuItem>
                </Select>
              </FormControl>
              <Box sx={{ flex: 1 }} />
              <Typography
                variant='body2'
                color='text.secondary'
                sx={{ alignSelf: 'center' }}
              >
                共 {filteredIssues.length} 个问题
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
                  没有发现安全问题
                </Typography>
                <Typography
                  variant='body2'
                  color='text.secondary'
                >
                  当前筛选条件下未发现安全问题
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
                        {result.passed_checks} 项通过 · {result.failed_checks} 项失败
                      </Typography>
                    </Box>
                    <Chip
                      label={`${result.overall_score}分`}
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
              选择模块查看权限审计详情
            </Typography>
            <FormControl
              fullWidth
              size='small'
              sx={{ mb: 2 }}
            >
              <InputLabel>选择模块</InputLabel>
              <Select
                value={selectedModule}
                label='选择模块'
                onChange={(e) => setSelectedModule(e.target.value)}
              >
                <MenuItem value=''>请选择模块</MenuItem>
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
