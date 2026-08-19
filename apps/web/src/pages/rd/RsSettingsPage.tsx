import React, { useState } from 'react';
import {
  Box,
  Typography,
  Paper,
  Stack,
  TextField,
  Switch,
  FormControlLabel,
  Card,
  CardContent,
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Button,
} from '@mui/material';
import i18n from '@/i18n';
import { GitBranch, Layers, Code2, Plug, Plus, ArrowRight } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { CrudPage } from '@/components/templates/CrudPage';
import type { CrudApiAdapter } from '@/components/templates/CrudPage';
import { settingSchema } from '@/schemas/rd';
import type { EntitySchema } from '@/schema';
import { PageContainer } from '@/components/common';
import { rdApi } from '@/api/rd';
import { QUERY_KEYS, CACHE_DURATIONS } from '@/lib/reactQuery';

interface SettingItem extends Record<string, unknown> {
  id: string;
  name: string;
  description: string;
  enabled: boolean;
}
// 默认数据
const getDefaultData = (): Record<string, SettingItem[]> => ({
  repo: [
    {
      id: '1',
      name: 'frontend-app',
      description: 'git@example.com:frontend-app.git',
      enabled: true,
    },
    {
      id: '2',
      name: 'backend-api',
      description: 'git@example.com:backend-api.git',
      enabled: true,
    },
    {
      id: '3',
      name: 'mobile-app',
      description: 'git@example.com:mobile-app.git',
      enabled: false,
    },
  ],
  cicd: [
    {
      id: '1',
      name: i18n.t('rd.rs_settings_page.k0'),
      description: i18n.t('pages.rs_settings_page.push_0'),
      enabled: true,
    },
    {
      id: '2',
      name: i18n.t('rd.rs_settings_page.k1'),
      description: i18n.t('pages.rs_settings_page.push_1'),
      enabled: true,
    },
    {
      id: '3',
      name: i18n.t('rd.rs_settings_page.k2'),
      description: i18n.t('pages.rs_settings_page.tag_2'),
      enabled: true,
    },
    {
      id: '4',
      name: i18n.t('rd.rs_settings_page.k3'),
      description: i18n.t('pages.rs_settings_page.schedule_3'),
      enabled: false,
    },
  ],
  quality: [
    {
      id: '1',
      name: i18n.t('rd.rs_settings_page.k5'),
      description: i18n.t('rd.rs_settings_page.80_4'),
      enabled: true,
    },
    {
      id: '2',
      name: i18n.t('rd.rs_settings_page.k7'),
      description: i18n.t('rd.rs_settings_page.k6'),
      enabled: true,
    },
    {
      id: '3',
      name: i18n.t('rd.rs_settings_page.k9'),
      description: i18n.t('rd.rs_settings_page.eslint_8'),
      enabled: true,
    },
    {
      id: '4',
      name: i18n.t('rd.rs_settings_page.k11'),
      description: i18n.t('rd.rs_settings_page.k10'),
      enabled: false,
    },
  ],
  integration: [
    {
      id: '1',
      name: 'GitLab',
      description: i18n.t('pages.rs_settings_page.code_4'),
      enabled: true,
    },
    { id: '2', name: 'Jenkins', description: i18n.t('pages.rs_settings_page.ci_5'), enabled: true },
    {
      id: '3',
      name: 'SonarQube',
      description: i18n.t('pages.rs_settings_page.quality_6'),
      enabled: true,
    },
    {
      id: '4',
      name: 'Jira',
      description: i18n.t('pages.rs_settings_page.project_7'),
      enabled: false,
    },
    {
      id: '5',
      name: 'Slack',
      description: i18n.t('pages.rs_settings_page.notification_8'),
      enabled: false,
    },
  ],
});
const RsSettingsPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<string>('repo');
  const [localData, setLocalData] = useState<Record<string, SettingItem[]>>(getDefaultData());
  const statisticsQuery = useQuery({
    queryKey: QUERY_KEYS.RD.STATISTICS,
    queryFn: async () => {
      const response = await rdApi.getStatistics();
      if (!response.success || !response.data) {
        throw new Error(response.message || i18n.t('rd.rs_settings_page.k12'));
      }
      return response.data;
    },

    staleTime: CACHE_DURATIONS.MEDIUM,
  });
  const statistics = statisticsQuery.data || null;
  const loading = statisticsQuery.isLoading;
  const tabs = [
    { id: 'repo', label: i18n.t('rd.rs_settings_page.k13'), icon: <GitBranch size={18} /> },
    { id: 'cicd', label: i18n.t('pages.rs_settings_page.cicd_9'), icon: <Layers size={18} /> },
    { id: 'quality', label: i18n.t('rd.rs_settings_page.k14'), icon: <Code2 size={18} /> },
    { id: 'integration', label: i18n.t('rd.rs_settings_page.k15'), icon: <Plug size={18} /> },
  ];
  // 当前Tab的数据
  const currentData = localData[activeTab] || [];
  // 创建本地数据的API适配器（支持所有Tab）
  const localApiAdapter: CrudApiAdapter<SettingItem> = {
    list: async () => ({ data: currentData, total: currentData.length }),
    create: async (data) => {
      const newItem: SettingItem = {
        id: String(Date.now()),
        name: String(data.name || ''),
        description: String(data.description || ''),
        enabled: data.enabled ?? true,
      };
      setLocalData((prev) => ({
        ...prev,
        [activeTab]: [...(prev[activeTab] || []), newItem],
      }));
      return newItem;
    },
    update: async (id, data) => {
      setLocalData((prev) => ({
        ...prev,
        [activeTab]: (prev[activeTab] || []).map((item) =>
          item.id === id ? { ...item, ...data } : item
        ),
      }));
      const updatedItem = currentData.find((item) => item.id === id);
      return updatedItem
        ? { ...updatedItem, ...data }
        : ({ id, name: '', description: '', enabled: false } as SettingItem);
    },
    delete: async (id) => {
      setLocalData((prev) => ({
        ...prev,
        [activeTab]: (prev[activeTab] || []).filter((item) => item.id !== id),
      }));
    },
  };
  // 获取当前Tab的标题
  const getTabTitle = () => {
    switch (activeTab) {
      case 'repo':
        return i18n.t('rd.rs_settings_page.k16');
      case 'cicd':
        return i18n.t('rd.rs_settings_page.k17');
      case 'quality':
        return i18n.t('rd.rs_settings_page.k18');
      case 'integration':
        return i18n.t('rd.rs_settings_page.k19');
      default:
        return '';
    }
  };
  return (
    <PageContainer>
      <Box sx={{ maxWidth: 1200, mx: 'auto' }}>
        {/* 统计概览 */}
        <Box sx={{ mb: 3 }}>
          <Typography
            variant='subtitle2'
            color='text.secondary'
            sx={{ mb: 2 }}
          >
            {i18n.t('pages.rs_settings_page.k0')}
          </Typography>
          <Stack
            direction='row'
            spacing={3}
          >
            <Card sx={{ flex: 1 }}>
              <CardContent>
                <Typography
                  variant='caption'
                  color='text.secondary'
                >
                  {i18n.t('pages.rs_settings_page.k1')}
                </Typography>
                <Typography
                  variant='h4'
                  sx={{ fontWeight: 'bold', mt: 1 }}
                >
                  {loading ? '-' : statistics?.total_projects || 0}
                </Typography>
              </CardContent>
            </Card>
            <Card sx={{ flex: 1 }}>
              <CardContent>
                <Typography
                  variant='caption'
                  color='text.secondary'
                >
                  {i18n.t('pages.rs_settings_page.k2')}
                </Typography>
                <Typography
                  variant='h4'
                  sx={{ fontWeight: 'bold', mt: 1 }}
                >
                  {loading ? '-' : statistics?.total_experiments || 0}
                </Typography>
              </CardContent>
            </Card>
            <Card sx={{ flex: 1 }}>
              <CardContent>
                <Typography
                  variant='caption'
                  color='text.secondary'
                >
                  {i18n.t('pages.rs_settings_page.k3')}
                </Typography>
                <Typography
                  variant='h4'
                  sx={{ fontWeight: 'bold', mt: 1 }}
                >
                  {loading ? '-' : statistics?.total_formulas || 0}
                </Typography>
              </CardContent>
            </Card>
            <Card sx={{ flex: 1 }}>
              <CardContent>
                <Typography
                  variant='caption'
                  color='text.secondary'
                >
                  {i18n.t('pages.rs_settings_page.k4')}
                </Typography>
                <Typography
                  variant='h4'
                  sx={{ fontWeight: 'bold', mt: 1 }}
                >
                  {loading ? '-' : statistics?.total_tasks || 0}
                </Typography>
              </CardContent>
            </Card>
          </Stack>
        </Box>
        <Box sx={{ display: 'flex', gap: 3 }}>
          {/* 左侧Tab导航 */}
          <Paper sx={{ width: 240, p: 2 }}>
            <List>
              {tabs.map((tab) => (
                <ListItemButton
                  key={tab.id}
                  selected={activeTab === tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  sx={{
                    borderRadius: 1,
                    mb: 0.5,
                    '&.Mui-selected': {
                      bgcolor: 'primary.main',
                      color: 'common.white',
                      '& .MuiListItemIcon-root': {
                        color: 'common.white',
                      },
                    },
                  }}
                >
                  <ListItemIcon sx={{ minWidth: 36 }}>{tab.icon}</ListItemIcon>
                  <ListItemText primary={tab.label} />
                  {activeTab === tab.id && <ArrowRight size={16} />}
                </ListItemButton>
              ))}
            </List>
          </Paper>
          {/* 右侧内容区 - 使用CrudPage */}
          <Box sx={{ flex: 1 }}>
            <CrudPage<SettingItem>
              schema={settingSchema as EntitySchema<SettingItem>}
              apiAdapter={localApiAdapter}
              breadcrumbs={[]}
              headerContent={
                <Box
                  sx={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    mb: 2,
                  }}
                >
                  <Typography variant='h6'>{getTabTitle()}</Typography>
                  {activeTab === 'repo' && (
                    <Button
                      variant='contained'
                      startIcon={<Plus size={18} />}
                      onClick={() => {}}
                    >
                      {i18n.t('pages.rs_settings_page.k5')}
                    </Button>
                  )}
                </Box>
              }
            />
            {/* 各Tab特有的额外内容 */}
            {activeTab === 'cicd' && (
              <Paper sx={{ p: 3, mt: 2 }}>
                <Typography
                  variant='subtitle1'
                  sx={{ fontWeight: 'bold' }}
                >
                  {i18n.t('pages.rs_settings_page.cicd_6')}
                </Typography>
                <Stack
                  spacing={2}
                  sx={{ mt: 2 }}
                >
                  <FormControlLabel
                    control={<Switch defaultChecked />}
                    label={i18n.t('rd.rs_settings_page.k20')}
                  />
                  <FormControlLabel
                    control={<Switch defaultChecked />}
                    label={i18n.t('rd.rs_settings_page.k21')}
                  />
                  <TextField
                    label={i18n.t('rd.rs_settings_page.k22')}
                    type='number'
                    size='small'
                    defaultValue={30}
                    sx={{ width: 200 }}
                  />
                </Stack>
              </Paper>
            )}
            {activeTab === 'quality' && (
              <Paper sx={{ p: 3, mt: 2 }}>
                <Typography
                  variant='subtitle1'
                  sx={{ fontWeight: 'bold' }}
                >
                  {i18n.t('pages.rs_settings_page.k7')}
                </Typography>
                <Stack
                  spacing={2}
                  sx={{ mt: 2 }}
                >
                  <TextField
                    label={i18n.t('rd.rs_settings_page.k23')}
                    type='number'
                    size='small'
                    defaultValue={80}
                    sx={{ width: 200 }}
                  />
                  <TextField
                    label={i18n.t('rd.rs_settings_page.k24')}
                    type='number'
                    size='small'
                    defaultValue={500}
                    sx={{ width: 200 }}
                  />
                </Stack>
              </Paper>
            )}
            {activeTab === 'integration' && (
              <Paper sx={{ p: 3, mt: 2 }}>
                <Typography
                  variant='subtitle1'
                  sx={{ fontWeight: 'bold' }}
                >
                  {i18n.t('pages.rs_settings_page.k8')}
                </Typography>
                <Typography
                  variant='body2'
                  color='text.secondary'
                  sx={{ mt: 1 }}
                >
                  {i18n.t('pages.rs_settings_page.k9')}
                </Typography>
              </Paper>
            )}
          </Box>
        </Box>
      </Box>
    </PageContainer>
  );
};
export default RsSettingsPage;
