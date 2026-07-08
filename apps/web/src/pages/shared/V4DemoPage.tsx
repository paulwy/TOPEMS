import React, { useState, useMemo } from 'react';
import {
  Box,
  Paper,
  Typography,
  Tabs,
  Tab,
  Chip,
  Divider,
  Grid,
  Card,
  CardContent,
  List,
  ListItem,
  ListItemText,
  Alert,
} from '@mui/material';
import {
  Shield,
  LayoutDashboard,
  Users,
  UserCheck,
  Key,
  Building2,
  UserCircle,
  CreditCard,
  Building,
  ScrollText,
  Activity,
  BookOpen,
  Settings,
  Puzzle,
  Database,
  RefreshCw,
  Bug,
  Check,
  FolderTree,
  ArrowRight,
  Network,
} from 'lucide-react';
import { PageContainer } from '@/components/common';
import SidebarNavGroup from '@/lib/navigation/components/SidebarNavGroup';
import { navigationRegistryV2 } from '@/lib/navigation/NavigationRegistryV2';
import { NAV_GROUPS } from '@/lib/navigation/types';
import type { NavItem, NavGroup } from '@/lib/navigation/types';
import { designTokens } from '@/theme/tokens';
const ct = designTokens.colors;

const iconMap: Record<string, React.ReactNode> = {
  Shield: <Shield size={20} />,
  LayoutDashboard: <LayoutDashboard size={20} />,
  Users: <Users size={20} />,
  UserCheck: <UserCheck size={20} />,
  Key: <Key size={20} />,
  Building2: <Building2 size={20} />,
  Network: <Network size={20} />,
  UserCircle: <UserCircle size={20} />,
  CreditCard: <CreditCard size={20} />,
  Building: <Building size={20} />,
  ScrollText: <ScrollText size={20} />,
  Activity: <Activity size={20} />,
  BookOpen: <BookOpen size={20} />,
  Settings: <Settings size={20} />,
  Puzzle: <Puzzle size={20} />,
  Database: <Database size={20} />,
  RefreshCw: <RefreshCw size={20} />,
  Bug: <Bug size={20} />,
};

const V4DemoPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState(0);
  const [selectedPath, setSelectedPath] = useState('/iam/dashboard');

  const sidebarGrouped = useMemo(() => {
    return navigationRegistryV2.getSidebarNavGrouped('iam');
  }, []);

  const navHierarchy = useMemo(() => {
    return navigationRegistryV2.getNavHierarchy(selectedPath);
  }, [selectedPath]);

  const allNavItems = useMemo(() => {
    return navigationRegistryV2.getSidebarNavItems('iam');
  }, []);

  const moduleInfo = navigationRegistryV2.getModule('iam');

  const stats = [
    { label: '导航项总数', value: allNavItems.length, color: 'primary' },
    {
      label: '侧边栏显示',
      value: allNavItems.filter((i) => i.showInSidebar).length,
      color: 'success',
    },
    { label: 'Tab显示', value: allNavItems.filter((i) => i.showInTabs).length, color: 'info' },
    { label: '分组数', value: Object.keys(sidebarGrouped).length, color: 'warning' },
  ];

  const renderIcon = (iconName?: string) => {
    if (!iconName) return null;
    return iconMap[iconName] || <FolderTree size={20} />;
  };

  return (
    <PageContainer
      title='V4.0 架构重整演示'
      subtitle='IAM模块导航系统标准化样板'
      headerProps={{
        pageIcon: <Shield size={20} />,
        pageGradient: `linear-gradient(135deg, ${ct.secondary[400]} 0%, ${ct.secondary.main} 100%)`,
      }}
    >
      <Alert
        severity='info'
        sx={{ mb: 3 }}
      >
        本页面展示 V4.0
        架构重整后的导航系统效果，包括侧边栏分组、面包屑自动生成、路由-导航联动等特性。
      </Alert>

      <Tabs
        value={activeTab}
        onChange={(_, v) => setActiveTab(v)}
        sx={{ mb: 3 }}
      >
        <Tab label='侧边栏分组效果' />
        <Tab label='面包屑层级' />
        <Tab label='导航数据结构' />
        <Tab label='模板分类' />
      </Tabs>

      {activeTab === 0 && (
        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 3 }}>
          <Box sx={{ flex: 1, minWidth: { xs: '100%', md: 'calc(33.333% - 8px)' } }}>
            <Paper
              elevation={0}
              sx={{ borderRadius: 3, border: 1, borderColor: 'divider' }}
            >
              <Box sx={{ p: 2, borderBottom: 1, borderColor: 'divider' }}>
                <Typography
                  variant='subtitle2'
                  sx={{ fontWeight: 600 }}
                >
                  IAM 模块侧边栏
                </Typography>
                <Typography
                  variant='caption'
                  color='text.secondary'
                >
                  5大标准分组
                </Typography>
              </Box>
              <Box sx={{ maxHeight: 500, overflowY: 'auto' }}>
                <SidebarNavGroup grouped={sidebarGrouped} />
              </Box>
            </Paper>
          </Box>

          <Box sx={{ flex: 1, minWidth: { xs: '100%', md: 'calc(66.666% - 8px)' } }}>
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2, mb: 3 }}>
              {stats.map((stat, i) => (
                <Box
                  key={i}
                  sx={{ flex: 1, minWidth: { xs: '50%', sm: 'calc(25% - 8px)' } }}
                >
                  <Paper
                    elevation={0}
                    sx={{ p: 2, borderRadius: 3, border: 1, borderColor: 'divider' }}
                  >
                    <Typography
                      variant='h4'
                      sx={{ fontWeight: 700 }}
                    >
                      {stat.value}
                    </Typography>
                    <Typography
                      variant='caption'
                      color='text.secondary'
                    >
                      {stat.label}
                    </Typography>
                  </Paper>
                </Box>
              ))}
            </Box>

            <Paper
              elevation={0}
              sx={{ p: 3, borderRadius: 3, border: 1, borderColor: 'divider' }}
            >
              <Typography
                variant='subtitle2'
                sx={{ fontWeight: 600, mb: 2 }}
              >
                点击侧边栏菜单项查看效果
              </Typography>
              <List>
                {allNavItems.slice(0, 8).map((item) => (
                  <ListItem
                    key={item.code}
                    component='button'
                    onClick={() => setSelectedPath(item.path)}
                    sx={{
                      borderRadius: 1,
                      mb: 0.5,
                      bgcolor: selectedPath === item.path ? 'action.selected' : 'transparent',
                    }}
                  >
                    <Box
                      sx={{ mr: 2, color: selectedPath === item.path ? 'primary.main' : 'inherit' }}
                    >
                      {renderIcon(item.icon)}
                    </Box>
                    <ListItemText
                      primary={
                        <Typography
                          sx={{
                            fontWeight: selectedPath === item.path ? 600 : 400,
                            color: selectedPath === item.path ? 'primary.main' : 'text.primary',
                          }}
                        >
                          {item.label}
                        </Typography>
                      }
                      secondary={<Typography sx={{ fontSize: '0.75rem' }}>{item.path}</Typography>}
                    />
                    <Chip
                      label={item.group || 'other'}
                      size='small'
                      variant='outlined'
                      sx={{ fontSize: '0.7rem' }}
                    />
                  </ListItem>
                ))}
              </List>
            </Paper>
          </Box>
        </Box>
      )}

      {activeTab === 1 && (
        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 3 }}>
          <Box sx={{ width: '100%' }}>
            <Paper
              elevation={0}
              sx={{ p: 3, borderRadius: 3, border: 1, borderColor: 'divider' }}
            >
              <Typography
                variant='subtitle2'
                sx={{ fontWeight: 600, mb: 2 }}
              >
                面包屑层级自动生成
              </Typography>
              <Box
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 1,
                  mb: 3,
                  p: 2,
                  bgcolor: 'background.default',
                  borderRadius: 1,
                }}
              >
                {navHierarchy.map((item, index) => (
                  <React.Fragment key={item.code}>
                    {index > 0 && (
                      <ArrowRight
                        size={14}
                        color='text.disabled'
                      />
                    )}
                    <Chip
                      label={item.label}
                      size='small'
                      color={index === navHierarchy.length - 1 ? 'primary' : 'default'}
                      variant={index === navHierarchy.length - 1 ? 'filled' : 'outlined'}
                    />
                  </React.Fragment>
                ))}
              </Box>
              <Typography
                variant='body2'
                color='text.secondary'
              >
                当前路径: <code>{selectedPath}</code>
              </Typography>
            </Paper>
          </Box>

          <Box sx={{ width: '100%' }}>
            <Paper
              elevation={0}
              sx={{ p: 3, borderRadius: 3, border: 1, borderColor: 'divider' }}
            >
              <Typography
                variant='subtitle2'
                sx={{ fontWeight: 600, mb: 2 }}
              >
                模块信息
              </Typography>
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2 }}>
                <Box
                  sx={{
                    flex: 1,
                    minWidth: { xs: '50%', sm: 'calc(33.333% - 8px)', md: 'calc(25% - 8px)' },
                  }}
                >
                  <Typography
                    variant='caption'
                    color='text.secondary'
                  >
                    模块编码
                  </Typography>
                  <Typography
                    variant='body2'
                    sx={{ fontFamily: 'monospace' }}
                  >
                    {moduleInfo?.code}
                  </Typography>
                </Box>
                <Box
                  sx={{
                    flex: 1,
                    minWidth: { xs: '50%', sm: 'calc(33.333% - 8px)', md: 'calc(25% - 8px)' },
                  }}
                >
                  <Typography
                    variant='caption'
                    color='text.secondary'
                  >
                    模块名称
                  </Typography>
                  <Typography variant='body2'>{moduleInfo?.name}</Typography>
                </Box>
                <Box
                  sx={{
                    flex: 1,
                    minWidth: { xs: '50%', sm: 'calc(33.333% - 8px)', md: 'calc(25% - 8px)' },
                  }}
                >
                  <Typography
                    variant='caption'
                    color='text.secondary'
                  >
                    模块来源
                  </Typography>
                  <Chip
                    label={moduleInfo?.source}
                    size='small'
                    color={moduleInfo?.source === 'core' ? 'primary' : 'default'}
                  />
                </Box>
                <Box
                  sx={{
                    flex: 1,
                    minWidth: { xs: '50%', sm: 'calc(33.333% - 8px)', md: 'calc(25% - 8px)' },
                  }}
                >
                  <Typography
                    variant='caption'
                    color='text.secondary'
                  >
                    入口路径
                  </Typography>
                  <Typography
                    variant='body2'
                    sx={{ fontFamily: 'monospace' }}
                  >
                    {moduleInfo?.path}
                  </Typography>
                </Box>
              </Box>
            </Paper>
          </Box>
        </Box>
      )}

      {activeTab === 2 && (
        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 3 }}>
          <Box sx={{ flex: 1, minWidth: { xs: '100%', md: 'calc(50% - 8px)' } }}>
            <Paper
              elevation={0}
              sx={{ p: 3, borderRadius: 3, border: 1, borderColor: 'divider' }}
            >
              <Typography
                variant='subtitle2'
                sx={{ fontWeight: 600, mb: 2 }}
              >
                NavItemConfig 数据结构
              </Typography>
              <Box
                component='pre'
                sx={{
                  bgcolor: 'grey.50',
                  p: 2,
                  borderRadius: 1,
                  fontSize: '0.75rem',
                  overflowX: 'auto',
                }}
              >
                {`{
  code: 'iam-users',
  label: '用户管理',
  icon: 'Users',
  path: '/iam/users',
  permission: 'iam:user:read',
  order: 1,
  group: 'business',
  showInSidebar: true,
  showInBreadcrumb: true,
  showInTabs: true,
  badge?: 3,
  badgeColor?: 'primary',
  children?: [...],
}`}
              </Box>
            </Paper>
          </Box>

          <Box sx={{ flex: 1, minWidth: { xs: '100%', md: 'calc(50% - 8px)' } }}>
            <Paper
              elevation={0}
              sx={{ p: 3, borderRadius: 3, border: 1, borderColor: 'divider' }}
            >
              <Typography
                variant='subtitle2'
                sx={{ fontWeight: 600, mb: 2 }}
              >
                5大标准分组
              </Typography>
              <List>
                {(Object.entries(NAV_GROUPS) as [NavGroup, (typeof NAV_GROUPS)[NavGroup]][]).map(
                  ([key, group]) => (
                    <ListItem
                      key={key}
                      divider
                    >
                      <Box sx={{ mr: 2 }}>{renderIcon(group.icon)}</Box>
                      <ListItemText
                        primary={group.label}
                        secondary={`order: ${group.order} | key: ${key}`}
                      />
                      <Chip
                        label={`${(sidebarGrouped[key] || []).length} 项`}
                        size='small'
                        color='primary'
                        variant='outlined'
                      />
                    </ListItem>
                  )
                )}
              </List>
            </Paper>
          </Box>
        </Box>
      )}

      {activeTab === 3 && (
        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 3 }}>
          <Box sx={{ width: '100%' }}>
            <Paper
              elevation={0}
              sx={{ p: 3, borderRadius: 3, border: 1, borderColor: 'divider' }}
            >
              <Typography
                variant='subtitle2'
                sx={{ fontWeight: 600, mb: 2 }}
              >
                8大核心页面模板
              </Typography>
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2 }}>
                {[
                  {
                    name: 'DashboardTemplate',
                    desc: '仪表盘/看板',
                    icon: 'LayoutDashboard',
                    color: 'primary',
                  },
                  { name: 'ListPageTemplate', desc: '列表页/CRUD', icon: 'List', color: 'success' },
                  {
                    name: 'DetailPageTemplate',
                    desc: '详情页/查看',
                    icon: 'FileText',
                    color: 'info',
                  },
                  {
                    name: 'FormPageTemplate',
                    desc: '表单页/新增编辑',
                    icon: 'FormInput',
                    color: 'warning',
                  },
                  {
                    name: 'TreePageTemplate',
                    desc: '树形结构/层级',
                    icon: 'FolderTree',
                    color: 'secondary',
                  },
                  {
                    name: 'StatsPageTemplate',
                    desc: '统计分析/报表',
                    icon: 'BarChart3',
                    color: 'error',
                  },
                  {
                    name: 'SettingsPageTemplate',
                    desc: '设置/配置',
                    icon: 'Settings',
                    color: 'default',
                  },
                  {
                    name: 'KanbanPageTemplate',
                    desc: '看板/任务板',
                    icon: 'LayoutGrid',
                    color: 'info',
                  },
                ].map((template, i) => (
                  <Box
                    key={i}
                    sx={{ flex: 1, minWidth: { xs: '100%', sm: '50%', md: 'calc(25% - 8px)' } }}
                  >
                    <Card
                      elevation={0}
                      sx={{ border: 1, borderColor: 'divider', borderRadius: 3 }}
                    >
                      <CardContent>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                          <Chip
                            label={template.name}
                            size='small'
                            color={template.color as any}
                            variant='outlined'
                          />
                        </Box>
                        <Typography
                          variant='body2'
                          color='text.secondary'
                        >
                          {template.desc}
                        </Typography>
                      </CardContent>
                    </Card>
                  </Box>
                ))}
              </Box>
            </Paper>
          </Box>
        </Box>
      )}
    </PageContainer>
  );
};

export default V4DemoPage;
