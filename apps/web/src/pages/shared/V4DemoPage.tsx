import React, { useState, useMemo } from 'react';
import {
  Box,
  Paper,
  Typography,
  Tabs,
  Tab,
  Chip,
  Card,
  CardContent,
  List,
  ListItem,
  ListItemText,
  Alert,
} from '@mui/material';
import i18n from '@/i18n';
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

const ct= designTokens.colors;

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
    { label: i18n.t('pages.v4_demo_page.k0'), value: allNavItems.length, color: 'primary' },
    {
      label: i18n.t('pages.v4_demo_page.k1'),
      value: allNavItems.filter((i) => i.showInSidebar).length,
      color: 'success',
    },
    { label: i18n.t('pages.v4_demo_page.tab_0'), value: allNavItems.filter((i) => i.showInTabs).length, color: 'info' },
    { label: i18n.t('pages.v4_demo_page.k2'), value: Object.keys(sidebarGrouped).length, color: 'warning' },
  ];

  const renderIcon = (iconName?: string) => {
    if (!iconName) return null;
    return iconMap[iconName] || <FolderTree size={20} />;
  };

  return (
    <PageContainer
      title={i18n.t('pages.v4_demo_page.v40_1')}
      subtitle={i18n.t('pages.v4_demo_page.iam_2')}
      headerProps={{
        pageIcon: <Shield size={20} />,
        pageGradient: `linear-gradient(135deg, ${ct.secondary[400]} 0%, ${ct.secondary.main} 100%)`,
      }}
    >
      <Alert
        severity='info'
        sx={{ mb: 3 }}
      >
        {i18n.t('pages.v4_demo_page.v40_3')}
        {i18n.t('pages.v4_demo_page.k4')}
      </Alert>

      <Tabs
        value={activeTab}
        onChange={(_, v) => setActiveTab(v)}
        sx={{ mb: 3 }}
      >
        <Tab label={i18n.t('pages.v4_demo_page.k3')} />
        <Tab label={i18n.t('pages.v4_demo_page.k4')} />
        <Tab label={i18n.t('pages.v4_demo_page.k5')} />
        <Tab label={i18n.t('pages.v4_demo_page.k6')} />
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
                  {i18n.t('pages.v4_demo_page.iam_5')}
                </Typography>
                <Typography
                  variant='caption'
                  color='text.secondary'
                >
                  {i18n.t('pages.v4_demo_page.5_6')}
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
                {i18n.t('pages.v4_demo_page.k7')}
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
                {i18n.t('pages.v4_demo_page.k8')}
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
                [i18n.t('pages.v4_demo_page.k9')]: <code>{selectedPath}</code>
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
                {i18n.t('pages.v4_demo_page.k10')}
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
                    {i18n.t('pages.v4_demo_page.k11')}
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
                    {i18n.t('pages.v4_demo_page.k12')}
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
                    {i18n.t('pages.v4_demo_page.k13')}
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
                    {i18n.t('pages.v4_demo_page.k14')}
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
                {i18n.t('pages.v4_demo_page.k15')}
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
  label: i18n.t('pages.v4_demo_page.k7'),
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
                {i18n.t('pages.v4_demo_page.5_16')}
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
                        label={`${(sidebarGrouped[key] || []).length} ${i18n.t('pages.v4_demo_page.k17')}`}
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
                {i18n.t('pages.v4_demo_page.8_18')}
              </Typography>
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2 }}>
                {[
                  {
                    name: 'DashboardTemplate',
                    desc: i18n.t('pages.v4_demo_page.k8'),
                    icon: 'LayoutDashboard',
                    color: 'primary',
                  },
                  { name: 'ListPageTemplate', desc: i18n.t('pages.v4_demo_page.crud_9'), icon: 'List', color: 'success' },
                  {
                    name: 'DetailPageTemplate',
                    desc: i18n.t('pages.v4_demo_page.k10'),
                    icon: 'FileText',
                    color: 'info',
                  },
                  {
                    name: 'FormPageTemplate',
                    desc: i18n.t('pages.v4_demo_page.k11'),
                    icon: 'FormInput',
                    color: 'warning',
                  },
                  {
                    name: 'TreePageTemplate',
                    desc: i18n.t('pages.v4_demo_page.k12'),
                    icon: 'FolderTree',
                    color: 'secondary',
                  },
                  {
                    name: 'StatsPageTemplate',
                    desc: i18n.t('pages.v4_demo_page.k13'),
                    icon: 'BarChart3',
                    color: 'error',
                  },
                  {
                    name: 'SettingsPageTemplate',
                    desc: i18n.t('pages.v4_demo_page.k14'),
                    icon: 'Settings',
                    color: 'default',
                  },
                  {
                    name: 'KanbanPageTemplate',
                    desc: i18n.t('pages.v4_demo_page.k15'),
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
                            color={template.color as React.ComponentProps<typeof Chip>['color']}
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
