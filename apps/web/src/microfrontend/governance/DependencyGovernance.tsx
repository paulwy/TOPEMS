import React, { useState, useEffect, useCallback, useMemo } from 'react';
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
  ListItemText,
  Avatar,
  Grid,
  Paper,
  Tabs,
  Tab,
  Alert,
  LinearProgress,
  Tooltip,
  IconButton,
  Accordion,
  AccordionSummary,
  AccordionDetails,
} from '@mui/material';
import {
  GitBranch as GitBranchIcon,
  AlertTriangle as AlertTriangleIcon,
  RefreshCw as RefreshIcon,
  CheckCircle as CheckCircleIcon,
  XCircle as XCircleIcon,
  ArrowUp as ArrowUpIcon,
  Package as PackageIcon,
  Shield as ShieldIcon,
  Layers as LayersIcon,
  Link as LinkIcon,
  AlertCircle as AlertCircleIcon,
  ChevronDown as ChevronDownIcon,
  TrendingUp as TrendingUpIcon,
  Zap as ZapIcon,
} from 'lucide-react';
import {
  dependencyGovernor,
  type DependencyGraph,
  type DependencyGraphNode,
  type DependencyConflict,
  type VersionUpgradeSuggestion,
  type DependencyStats,
  type ConflictSeverity,
} from './dependency-governor';

interface DependencyGovernanceProps {
  onClose?: () => void;
}

const StatCard: React.FC<{
  label: string;
  value: string | number;
  icon: React.ReactNode;
  color: string;
  trend?: string;
  trendUp?: boolean;
}> = ({ label, value, icon, color, trend, trendUp }) => (
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
          {trend && (
            <Typography
              variant='caption'
              sx={{
                mt: 0.5,
                display: 'flex',
                alignItems: 'center',
                gap: 0.5,
                color: trendUp ? '#2e7d32' : '#d32f2f',
              }}
            >
              {trendUp ? (
                <ArrowUpIcon size={12} />
              ) : (
                <ArrowUpIcon
                  size={12}
                  style={{ transform: 'rotate(180deg)' }}
                />
              )}
              {trend}
            </Typography>
          )}
        </Box>
        <Box sx={{ p: 1.5, borderRadius: 2, bgcolor: `${color}15`, color, flexShrink: 0 }}>
          {icon}
        </Box>
      </Box>
    </CardContent>
  </Card>
);

const DependencyGraphVisualization: React.FC<{ graph: DependencyGraph }> = ({ graph }) => {
  const [hoveredNode, setHoveredNode] = useState<string | null>(null);

  const positions = useMemo(() => {
    const pos: Record<string, { x: number; y: number }> = {};
    const levels: Record<number, string[]> = {};

    graph.nodes.forEach((node) => {
      if (!levels[node.level]) {
        levels[node.level] = [];
      }
      levels[node.level].push(node.id);
    });

    const maxLevel = Math.max(...Object.keys(levels).map(Number), 0);
    const levelWidth = 600 / (maxLevel + 1 || 1);

    Object.keys(levels).forEach((levelStr) => {
      const level = parseInt(levelStr, 10);
      const nodesAtLevel = levels[level];
      const levelHeight = 400 / (nodesAtLevel.length + 1);

      nodesAtLevel.forEach((nodeId, idx) => {
        pos[nodeId] = {
          x: 40 + level * levelWidth + levelWidth / 3,
          y: levelHeight * (idx + 1),
        };
      });
    });

    return pos;
  }, [graph]);

  const getNodeColor = (level: number) => {
    const colors = ['#1976d2', '#388e3c', '#f57c00', '#c2185b', '#7b1fa2'];
    return colors[level % colors.length];
  };

  return (
    <Paper sx={{ p: 2, height: '100%', minHeight: 450 }}>
      <Typography
        variant='subtitle2'
        sx={{ mb: 2, fontWeight: 600 }}
      >
        依赖关系图
      </Typography>
      <Box sx={{ width: '100%', overflow: 'auto' }}>
        <svg
          width='640'
          height='420'
          style={{ display: 'block' }}
        >
          <defs>
            <marker
              id='arrowhead'
              markerWidth='10'
              markerHeight='7'
              refX='9'
              refY='3.5'
              orient='auto'
            >
              <polygon
                points='0 0, 10 3.5, 0 7'
                fill='#90caf9'
              />
            </marker>
          </defs>

          {graph.edges.map((edge, idx) => {
            const fromPos = positions[edge.from];
            const toPos = positions[edge.to];
            if (!fromPos || !toPos) return null;

            const isHighlighted = hoveredNode === edge.from || hoveredNode === edge.to;

            return (
              <line
                key={idx}
                x1={fromPos.x + 28}
                y1={fromPos.y + 20}
                x2={toPos.x - 5}
                y2={toPos.y + 20}
                stroke={isHighlighted ? '#1976d2' : '#90caf9'}
                strokeWidth={isHighlighted ? 2 : 1.5}
                markerEnd='url(#arrowhead)'
                opacity={hoveredNode ? (isHighlighted ? 1 : 0.3) : 1}
              />
            );
          })}

          {graph.nodes.map((node) => {
            const pos = positions[node.id];
            if (!pos) return null;

            const color = getNodeColor(node.level);
            const isHovered = hoveredNode === node.id;

            return (
              <g
                key={node.id}
                onMouseEnter={() => setHoveredNode(node.id)}
                onMouseLeave={() => setHoveredNode(null)}
                style={{ cursor: 'pointer' }}
              >
                <rect
                  x={pos.x - 5}
                  y={pos.y - 5}
                  width={150}
                  height={50}
                  rx={8}
                  fill={isHovered ? `${color}20` : 'white'}
                  stroke={color}
                  strokeWidth={isHovered ? 2 : 1}
                />
                <text
                  x={pos.x + 70}
                  y={pos.y + 16}
                  textAnchor='middle'
                  style={{ fontSize: 12, fontWeight: 600, fill: color }}
                >
                  {node.name.length > 10 ? `${node.name.slice(0, 10)}...` : node.name}
                </text>
                <text
                  x={pos.x + 70}
                  y={pos.y + 34}
                  textAnchor='middle'
                  style={{ fontSize: 10, fill: '#666' }}
                >
                  v{node.version}
                </text>
              </g>
            );
          })}
        </svg>
      </Box>
      <Box sx={{ display: 'flex', gap: 2, mt: 2, flexWrap: 'wrap' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Box sx={{ width: 12, height: 12, borderRadius: 2, bgcolor: '#1976d2' }} />
          <Typography
            variant='caption'
            color='text.secondary'
          >
            顶层模块 (Level 0)
          </Typography>
        </Box>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Box sx={{ width: 12, height: 12, borderRadius: 2, bgcolor: '#388e3c' }} />
          <Typography
            variant='caption'
            color='text.secondary'
          >
            直接依赖 (Level 1)
          </Typography>
        </Box>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Box sx={{ width: 12, height: 12, borderRadius: 2, bgcolor: '#f57c00' }} />
          <Typography
            variant='caption'
            color='text.secondary'
          >
            传递依赖 (Level 2+)
          </Typography>
        </Box>
      </Box>
    </Paper>
  );
};

const ConflictItem: React.FC<{ conflict: DependencyConflict }> = ({ conflict }) => {
  const severityColors: Record<ConflictSeverity, string> = {
    low: '#94a3b8',
    medium: '#f59e0b',
    high: '#ef4444',
    critical: '#dc2626',
  };

  const severityLabels: Record<ConflictSeverity, string> = {
    low: '低',
    medium: '中',
    high: '高',
    critical: '严重',
  };

  return (
    <Paper sx={{ p: 2, mb: 2, borderLeft: 4, borderColor: severityColors[conflict.severity] }}>
      <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
        <Box sx={{ flex: 1 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
            <AlertTriangleIcon
              size={18}
              style={{ color: severityColors[conflict.severity] }}
            />
            <Typography
              variant='subtitle2'
              sx={{ fontWeight: 600 }}
            >
              {conflict.dependency_name} 版本冲突
            </Typography>
            <Chip
              label={severityLabels[conflict.severity]}
              size='small'
              sx={{
                bgcolor: `${severityColors[conflict.severity]}15`,
                color: severityColors[conflict.severity],
                fontWeight: 600,
              }}
            />
          </Box>
          <Typography
            variant='body2'
            color='text.secondary'
            sx={{ mb: 2 }}
          >
            模块 <strong>{conflict.module_a}</strong> 需要版本 {conflict.version_a}， 模块{' '}
            <strong>{conflict.module_b}</strong> 需要版本 {conflict.version_b}
          </Typography>
          <Box sx={{ display: 'flex', gap: 1 }}>
            <Button
              size='small'
              variant='outlined'
            >
              查看详情
            </Button>
            <Button
              size='small'
              variant='contained'
              color='primary'
            >
              尝试解决
            </Button>
          </Box>
        </Box>
      </Box>
    </Paper>
  );
};

const CyclePathDisplay: React.FC<{ cycles: string[][] }> = ({ cycles }) => {
  if (cycles.length === 0) {
    return (
      <Paper sx={{ p: 4, textAlign: 'center' }}>
        <CheckCircleIcon
          size={48}
          style={{ color: '#10b981', marginBottom: 16 }}
        />
        <Typography
          variant='h6'
          sx={{ fontWeight: 600, mb: 1 }}
        >
          无循环依赖
        </Typography>
        <Typography
          variant='body2'
          color='text.secondary'
        >
          依赖关系结构清晰，没有检测到循环依赖
        </Typography>
      </Paper>
    );
  }

  return (
    <Box>
      {cycles.map((cycle, idx) => (
        <Paper
          key={idx}
          sx={{ p: 2, mb: 2, borderLeft: 4, borderColor: '#f59e0b' }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
            <AlertCircleIcon
              size={18}
              style={{ color: '#f59e0b' }}
            />
            <Typography
              variant='subtitle2'
              sx={{ fontWeight: 600 }}
            >
              循环依赖 #{idx + 1} ({cycle.length - 1} 个模块)
            </Typography>
          </Box>
          <Box sx={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 1 }}>
            {cycle.map((moduleId, modIdx) => (
              <React.Fragment key={modIdx}>
                <Chip
                  icon={<PackageIcon size={14} />}
                  label={moduleId}
                  size='small'
                  color='warning'
                  variant='outlined'
                />
                {modIdx < cycle.length - 1 && (
                  <ArrowUpIcon
                    size={16}
                    style={{ color: '#f59e0b', transform: 'rotate(90deg)' }}
                  />
                )}
              </React.Fragment>
            ))}
          </Box>
        </Paper>
      ))}
    </Box>
  );
};

const UpgradeSuggestionItem: React.FC<{ suggestion: VersionUpgradeSuggestion }> = ({
  suggestion,
}) => (
  <Paper sx={{ p: 2, mb: 2 }}>
    <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 2 }}>
      <Box sx={{ p: 1.5, borderRadius: 2, bgcolor: '#10b98115', color: '#10b981' }}>
        <TrendingUpIcon size={24} />
      </Box>
      <Box sx={{ flex: 1 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
          <Typography
            variant='subtitle2'
            sx={{ fontWeight: 600 }}
          >
            {suggestion.module_name}
          </Typography>
          <Chip
            label={`${suggestion.current_version} → ${suggestion.suggested_version}`}
            size='small'
            color='success'
          />
        </Box>
        <Typography
          variant='body2'
          color='text.secondary'
          sx={{ mb: 2 }}
        >
          {suggestion.reason}
        </Typography>

        {suggestion.benefits.length > 0 && (
          <Box sx={{ mb: 1 }}>
            <Typography
              variant='caption'
              sx={{ fontWeight: 600, color: '#10b981' }}
            >
              升级收益:
            </Typography>
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, mt: 0.5 }}>
              {suggestion.benefits.map((b, i) => (
                <Chip
                  key={i}
                  label={b}
                  size='small'
                  variant='outlined'
                  color='success'
                />
              ))}
            </Box>
          </Box>
        )}

        {suggestion.breaking_changes.length > 0 && (
          <Box sx={{ mb: 2 }}>
            <Typography
              variant='caption'
              sx={{ fontWeight: 600, color: '#f59e0b' }}
            >
              破坏性变更:
            </Typography>
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, mt: 0.5 }}>
              {suggestion.breaking_changes.map((b, i) => (
                <Chip
                  key={i}
                  label={b}
                  size='small'
                  variant='outlined'
                  color='warning'
                />
              ))}
            </Box>
          </Box>
        )}

        <Button
          size='small'
          variant='contained'
          color='success'
          startIcon={<ArrowUpIcon size={16} />}
        >
          立即升级
        </Button>
      </Box>
    </Box>
  </Paper>
);

const DependencyGovernance: React.FC<DependencyGovernanceProps> = ({ onClose }) => {
  const [activeTab, setActiveTab] = useState(0);
  const [stats, setStats] = useState<DependencyStats | null>(null);
  const [graph, setGraph] = useState<DependencyGraph | null>(null);
  const [conflicts, setConflicts] = useState<DependencyConflict[]>([]);
  const [cycles, setCycles] = useState<string[][]>([]);
  const [upgrades, setUpgrades] = useState<VersionUpgradeSuggestion[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  const refreshData = useCallback(() => {
    setRefreshing(true);
    setTimeout(() => {
      dependencyGovernor.refreshModules();
      const analysis = dependencyGovernor.analyzeDependencies();
      setStats(analysis.stats);
      setGraph(analysis.graph);
      setConflicts(analysis.conflicts);
      setCycles(analysis.cycles);
      setUpgrades(dependencyGovernor.suggestUpgrades());
      setRefreshing(false);
    }, 300);
  }, []);

  useEffect(() => {
    refreshData();
  }, [refreshData]);

  if (!stats || !graph) {
    return (
      <Box sx={{ p: 4 }}>
        <LinearProgress />
      </Box>
    );
  }

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
        <GitBranchIcon
          size={24}
          style={{ color: 'var(--mui-palette-primary-main)' }}
        />
        <Typography
          variant='h6'
          sx={{ fontWeight: 700 }}
        >
          依赖治理
        </Typography>
        <Box sx={{ flex: 1 }} />
        <Button
          variant='outlined'
          startIcon={<RefreshIcon size={18} />}
          onClick={refreshData}
          disabled={refreshing}
        >
          刷新
        </Button>
      </Box>

      <Box sx={{ p: 2, pb: 0 }}>
        <Grid
          container
          spacing={2}
          sx={{ mb: 2 }}
        >
          <Grid
            item
            xs={6}
            sm={3}
          >
            <StatCard
              label='模块总数'
              value={stats.total_modules}
              icon={<PackageIcon size={20} />}
              color='#1976d2'
            />
          </Grid>
          <Grid
            item
            xs={6}
            sm={3}
          >
            <StatCard
              label='依赖关系'
              value={stats.total_dependencies}
              icon={<LinkIcon size={20} />}
              color='#388e3c'
            />
          </Grid>
          <Grid
            item
            xs={6}
            sm={3}
          >
            <StatCard
              label='循环依赖'
              value={stats.cycles_count}
              icon={<AlertTriangleIcon size={20} />}
              color={stats.cycles_count > 0 ? '#f59e0b' : '#10b981'}
            />
          </Grid>
          <Grid
            item
            xs={6}
            sm={3}
          >
            <StatCard
              label='许可证合规率'
              value={`${stats.license_compliance_rate}%`}
              icon={<ShieldIcon size={20} />}
              color={stats.license_compliance_rate >= 90 ? '#10b981' : '#f59e0b'}
            />
          </Grid>
        </Grid>
      </Box>

      <Box sx={{ px: 2 }}>
        <Tabs
          value={activeTab}
          onChange={(_, v) => setActiveTab(v)}
        >
          <Tab
            label='依赖图'
            icon={<LayersIcon size={16} />}
            iconPosition='start'
          />
          <Tab
            label={`冲突 (${conflicts.length})`}
            icon={<AlertTriangleIcon size={16} />}
            iconPosition='start'
          />
          <Tab
            label={`循环 (${cycles.length})`}
            icon={<AlertCircleIcon size={16} />}
            iconPosition='start'
          />
          <Tab
            label={`升级建议 (${upgrades.length})`}
            icon={<TrendingUpIcon size={16} />}
            iconPosition='start'
          />
          <Tab
            label='许可证'
            icon={<ShieldIcon size={16} />}
            iconPosition='start'
          />
        </Tabs>
      </Box>

      <Box sx={{ flex: 1, overflow: 'auto', p: 2 }}>
        {refreshing && <LinearProgress sx={{ mb: 2 }} />}

        {activeTab === 0 && graph && (
          <Grid
            container
            spacing={2}
          >
            <Grid
              item
              xs={12}
              md={8}
            >
              <DependencyGraphVisualization graph={graph} />
            </Grid>
            <Grid
              item
              xs={12}
              md={4}
            >
              <Paper sx={{ p: 2, height: '100%' }}>
                <Typography
                  variant='subtitle2'
                  sx={{ mb: 2, fontWeight: 600 }}
                >
                  依赖统计
                </Typography>
                <List dense>
                  <ListItem>
                    <ListItemText
                      primary='直接依赖'
                      secondary={stats.direct_dependencies}
                    />
                  </ListItem>
                  <Divider component='li' />
                  <ListItem>
                    <ListItemText
                      primary='传递依赖'
                      secondary={stats.transitive_dependencies}
                    />
                  </ListItem>
                  <Divider component='li' />
                  <ListItem>
                    <ListItemText
                      primary='平均依赖深度'
                      secondary={stats.avg_dependency_depth}
                    />
                  </ListItem>
                  <Divider component='li' />
                  <ListItem>
                    <ListItemText
                      primary='版本冲突数'
                      secondary={stats.conflicts_count}
                    />
                  </ListItem>
                </List>
              </Paper>
            </Grid>
          </Grid>
        )}

        {activeTab === 1 && (
          <Box>
            {conflicts.length === 0 ? (
              <Paper sx={{ p: 4, textAlign: 'center' }}>
                <CheckCircleIcon
                  size={48}
                  style={{ color: '#10b981', marginBottom: 16 }}
                />
                <Typography
                  variant='h6'
                  sx={{ fontWeight: 600, mb: 1 }}
                >
                  无版本冲突
                </Typography>
                <Typography
                  variant='body2'
                  color='text.secondary'
                >
                  所有依赖版本均兼容，没有检测到冲突
                </Typography>
              </Paper>
            ) : (
              conflicts.map((conflict, idx) => (
                <ConflictItem
                  key={idx}
                  conflict={conflict}
                />
              ))
            )}
          </Box>
        )}

        {activeTab === 2 && <CyclePathDisplay cycles={cycles} />}

        {activeTab === 3 && (
          <Box>
            {upgrades.length === 0 ? (
              <Paper sx={{ p: 4, textAlign: 'center' }}>
                <CheckCircleIcon
                  size={48}
                  style={{ color: '#10b981', marginBottom: 16 }}
                />
                <Typography
                  variant='h6'
                  sx={{ fontWeight: 600, mb: 1 }}
                >
                  已是最新版本
                </Typography>
                <Typography
                  variant='body2'
                  color='text.secondary'
                >
                  所有已安装模块均为最新版本
                </Typography>
              </Paper>
            ) : (
              upgrades.map((suggestion, idx) => (
                <UpgradeSuggestionItem
                  key={idx}
                  suggestion={suggestion}
                />
              ))
            )}
          </Box>
        )}

        {activeTab === 4 && <LicenseCompliancePanel />}
      </Box>
    </Box>
  );
};

const LicenseCompliancePanel: React.FC = () => {
  const licenseCheck = dependencyGovernor.checkLicenseCompliance();

  return (
    <Box>
      <Paper sx={{ p: 3, mb: 2 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
          <Box
            sx={{
              p: 2,
              borderRadius: 2,
              bgcolor: licenseCheck.compliant ? '#10b98115' : '#ef444415',
              color: licenseCheck.compliant ? '#10b981' : '#ef4444',
            }}
          >
            <ShieldIcon size={32} />
          </Box>
          <Box>
            <Typography
              variant='h6'
              sx={{ fontWeight: 700 }}
            >
              {licenseCheck.compliant ? '许可证合规' : '存在许可证问题'}
            </Typography>
            <Typography
              variant='body2'
              color='text.secondary'
            >
              已检查 {licenseCheck.licenses.length} 个模块的许可证
            </Typography>
          </Box>
        </Box>
        {licenseCheck.issues.length > 0 && (
          <Alert
            severity='warning'
            sx={{ mt: 2 }}
          >
            检测到 {licenseCheck.issues.length} 个许可证问题
          </Alert>
        )}
      </Paper>

      <Typography
        variant='subtitle2'
        sx={{ mb: 1, fontWeight: 600 }}
      >
        许可证列表
      </Typography>
      <List>
        {licenseCheck.licenses.map((license) => {
          const hasIssue = licenseCheck.issues.some((i) => i.module_id === license.module_id);
          return (
            <ListItem
              key={license.module_id}
              divider
              sx={{ py: 1.5 }}
            >
              <Avatar
                sx={{ width: 40, height: 40, mr: 2, bgcolor: hasIssue ? '#f59e0b20' : '#10b98120' }}
              >
                <PackageIcon
                  size={20}
                  style={{ color: hasIssue ? '#f59e0b' : '#10b981' }}
                />
              </Avatar>
              <Box sx={{ flex: 1 }}>
                <Typography
                  variant='body2'
                  sx={{ fontWeight: 600 }}
                >
                  {license.module_id}
                </Typography>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Chip
                    label={license.license_type}
                    size='small'
                    color={license.is_commercial ? 'warning' : 'primary'}
                    variant='outlined'
                  />
                  {license.attribution_required && (
                    <Typography
                      variant='caption'
                      color='text.secondary'
                    >
                      需要署名
                    </Typography>
                  )}
                </Box>
              </Box>
              {hasIssue ? (
                <AlertTriangleIcon
                  size={20}
                  style={{ color: '#f59e0b' }}
                />
              ) : (
                <CheckCircleIcon
                  size={20}
                  style={{ color: '#10b981' }}
                />
              )}
            </ListItem>
          );
        })}
      </List>
    </Box>
  );
};

export default DependencyGovernance;
