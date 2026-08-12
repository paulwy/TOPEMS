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
import { GitBranch, Layers, Code2, Plug, Plus, ArrowRight } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';

import { CrudPage } from '@/components/templates/CrudPage';
import type { CrudApiAdapter } from '@/components/templates/CrudPage';
import { settingSchema } from '@/schemas/rd';
import type { EntitySchema } from '@/schema';
import { PageContainer } from '@/components/common';
import { rdApi } from '@/api/rd';

import {QUERY_KEYS, CACHE_DURATIONS} from '@/lib/reactQuery';

interface SettingItem extends Record<string, unknown> {
  id: string;
  name: string;
  description: string;
  enabled: boolean;
}

// 默认数据
const defaultData: Record<string, SettingItem[]> = {
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
    { id: '1', name: '前端构建流水线', description: '触发方式: push', enabled: true },
    { id: '2', name: '后端构建流水线', description: '触发方式: push', enabled: true },
    { id: '3', name: '移动端构建流水线', description: '触发方式: tag', enabled: true },
    { id: '4', name: '定时回归测试', description: '触发方式: schedule', enabled: false },
  ],
  quality: [
    { id: '1', name: '代码覆盖率门槛', description: '单元测试覆盖率不低于80%', enabled: true },
    { id: '2', name: '禁止提交敏感信息', description: '检测密码、密钥等敏感信息', enabled: true },
    { id: '3', name: '代码风格检查', description: '使用ESLint进行代码风格检查', enabled: true },
    { id: '4', name: '安全漏洞扫描', description: '检测已知安全漏洞', enabled: false },
  ],
  integration: [
    { id: '1', name: 'GitLab', description: '类型: code', enabled: true },
    { id: '2', name: 'Jenkins', description: '类型: ci', enabled: true },
    { id: '3', name: 'SonarQube', description: '类型: quality', enabled: true },
    { id: '4', name: 'Jira', description: '类型: project', enabled: false },
    { id: '5', name: 'Slack', description: '类型: notification', enabled: false },
  ],
};

const RsSettingsPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<string>('repo');
  const [localData, setLocalData] = useState<Record<string, SettingItem[]>>(defaultData);

  const statisticsQuery = useQuery({
    queryKey: QUERY_KEYS.RD.STATISTICS,
    queryFn: async () => {
      const response = await rdApi.getStatistics();
      if (!response.success || !response.data) {
        throw new Error(response.message || '加载统计数据失败');
      }
      return response.data;
    },
  
      staleTime: CACHE_DURATIONS.MEDIUM,});

  const statistics = statisticsQuery.data || null;
  const loading = statisticsQuery.isLoading;

  const tabs = [
    { id: 'repo', label: '仓库管理', icon: <GitBranch size={18} /> },
    { id: 'cicd', label: 'CI/CD配置', icon: <Layers size={18} /> },
    { id: 'quality', label: '代码规范', icon: <Code2 size={18} /> },
    { id: 'integration', label: '集成设置', icon: <Plug size={18} /> },
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
        return '仓库列表';
      case 'cicd':
        return '流水线配置';
      case 'quality':
        return '质量规则';
      case 'integration':
        return '第三方集成';
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
            系统统计
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
                  项目总数
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
                  试验总数
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
                  配方总数
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
                  任务总数
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
                      添加
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
                  CI/CD 全局设置
                </Typography>
                <Stack
                  spacing={2}
                  sx={{ mt: 2 }}
                >
                  <FormControlLabel
                    control={<Switch defaultChecked />}
                    label='代码提交后自动触发构建'
                  />
                  <FormControlLabel
                    control={<Switch defaultChecked />}
                    label='构建失败时发送通知'
                  />
                  <TextField
                    label='构建超时时间(分钟)'
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
                  代码规范配置
                </Typography>
                <Stack
                  spacing={2}
                  sx={{ mt: 2 }}
                >
                  <TextField
                    label='最小代码覆盖率'
                    type='number'
                    size='small'
                    defaultValue={80}
                    sx={{ width: 200 }}
                  />
                  <TextField
                    label='最大代码行数限制'
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
                  连接管理
                </Typography>
                <Typography
                  variant='body2'
                  color='text.secondary'
                  sx={{ mt: 1 }}
                >
                  选择要集成的第三方服务并配置连接参数。
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
