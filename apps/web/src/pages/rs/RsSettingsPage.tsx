import React, { useState, useMemo, useCallback, useEffect } from 'react';
import {
  Box,
  Typography,
  Paper,
  Stack,
  TextField,
  Switch,
  FormControlLabel,
  Divider,
  Card,
  CardContent,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  ListItemSecondaryAction,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  IconButton,
  Button,
} from '@mui/material';
import {
  GitBranch,
  Layers,
  Code2,
  Plug,
  Save,
  Plus,
  Trash2,
  ExternalLink,
  X,
  ArrowRight,
} from 'lucide-react';
import { ListPageTemplate, type ColumnDef } from '@/components/templates';
import { PageContainer } from '@/components/common';
import { rsApi } from '@/api/rs';
import { useAppStore } from '@/store';
import type { RsStatistics } from '@/api/rs';

interface RepoConfig {
  id: string;
  name: string;
  url: string;
  type: string;
  enabled: boolean;
}

interface SettingItem {
  id: string;
  name: string;
  description: string;
  enabled: boolean;
  type?: string;
}

const RsSettingsPage: React.FC = () => {
  const { addNotification } = useAppStore();
  const [activeTab, setActiveTab] = useState<string>('repo');
  const [repos, setRepos] = useState<RepoConfig[]>([
    {
      id: '1',
      name: 'frontend-app',
      url: 'git@example.com:frontend-app.git',
      type: 'gitlab',
      enabled: true,
    },
    {
      id: '2',
      name: 'backend-api',
      url: 'git@example.com:backend-api.git',
      type: 'gitlab',
      enabled: true,
    },
    {
      id: '3',
      name: 'mobile-app',
      url: 'git@example.com:mobile-app.git',
      type: 'github',
      enabled: false,
    },
  ]);
  const [statistics, setStatistics] = useState<RsStatistics | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadStatistics();
  }, []);

  const loadStatistics = async () => {
    try {
      setLoading(true);
      const response = await rsApi.getStatistics();
      if (response.success && response.data) {
        setStatistics(response.data);
      }
    } catch (error: unknown) {
      console.error('加载统计数据失败:', error);
      addNotification({
        type: 'error',
        title: '加载失败',
        message: '无法加载统计数据',
      });
    } finally {
      setLoading(false);
    }
  };

  const tabs = [
    { id: 'repo', label: '仓库管理', icon: <GitBranch size={18} /> },
    { id: 'cicd', label: 'CI/CD配置', icon: <Layers size={18} /> },
    { id: 'quality', label: '代码规范', icon: <Code2 size={18} /> },
    { id: 'integration', label: '集成设置', icon: <Plug size={18} /> },
  ];

  // 根据当前Tab获取数据
  const getCurrentData = useCallback(() => {
    switch (activeTab) {
      case 'repo':
        return repos.map((r) => ({
          id: r.id,
          name: r.name,
          description: r.url,
          enabled: r.enabled,
        }));
      case 'cicd':
        return [
          {
            id: '1',
            name: '前端构建流水线',
            description: '触发方式: push',
            enabled: true,
          },
          {
            id: '2',
            name: '后端构建流水线',
            description: '触发方式: push',
            enabled: true,
          },
          {
            id: '3',
            name: '移动端构建流水线',
            description: '触发方式: tag',
            enabled: true,
          },
          {
            id: '4',
            name: '定时回归测试',
            description: '触发方式: schedule',
            enabled: false,
          },
        ];
      case 'quality':
        return [
          {
            id: '1',
            name: '代码覆盖率门槛',
            description: '单元测试覆盖率不低于80%',
            enabled: true,
          },
          {
            id: '2',
            name: '禁止提交敏感信息',
            description: '检测密码、密钥等敏感信息',
            enabled: true,
          },
          {
            id: '3',
            name: '代码风格检查',
            description: '使用ESLint进行代码风格检查',
            enabled: true,
          },
          {
            id: '4',
            name: '安全漏洞扫描',
            description: '检测已知安全漏洞',
            enabled: false,
          },
        ];
      case 'integration':
        return [
          { id: '1', name: 'GitLab', description: '类型: code', enabled: true },
          { id: '2', name: 'Jenkins', description: '类型: ci', enabled: true },
          {
            id: '3',
            name: 'SonarQube',
            description: '类型: quality',
            enabled: true,
          },
          {
            id: '4',
            name: 'Jira',
            description: '类型: project',
            enabled: false,
          },
          {
            id: '5',
            name: 'Slack',
            description: '类型: notification',
            enabled: false,
          },
        ];
      default:
        return [];
    }
  }, [activeTab, repos]);

  const currentData = useMemo(() => getCurrentData(), [getCurrentData]);

  const handleToggle = (id: string) => {
    if (activeTab === 'repo') {
      setRepos(repos.map((r) => (r.id === id ? { ...r, enabled: !r.enabled } : r)));
    }
  };

  const handleDelete = (id: string) => {
    if (activeTab === 'repo') {
      setRepos(repos.filter((r) => r.id !== id));
    }
  };

  // 表格列定义
  const columns: ColumnDef<any>[] = [
    {
      id: 'name',
      label: '名称',
      render: (row) => (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          {activeTab === 'repo' && (
            <GitBranch
              size={16}
              color='primary.main'
            />
          )}
          {activeTab === 'cicd' && (
            <Layers
              size={16}
              color='primary.main'
            />
          )}
          {activeTab === 'quality' && (
            <Code2
              size={16}
              color='primary.main'
            />
          )}
          {activeTab === 'integration' && (
            <Plug
              size={16}
              color={row.enabled ? 'primary.main' : '#9e9e9e'}
            />
          )}
          <Box>
            <Typography
              variant='body2'
              sx={{ fontWeight: 500 }}
            >
              {row.name}
            </Typography>
            {activeTab === 'repo' && (
              <Typography
                variant='caption'
                color='text.secondary'
              >
                {row.description}
              </Typography>
            )}
          </Box>
        </Box>
      ),
    },
    {
      id: 'description',
      label: '描述',
      render: (row) => (
        <Typography
          variant='body2'
          color='text.secondary'
        >
          {row.description}
        </Typography>
      ),
    },
    {
      id: 'enabled',
      label: '状态',
      render: (row) => (
        <FormControlLabel
          control={
            <Switch
              checked={row.enabled}
              onChange={() => handleToggle(row.id)}
            />
          }
          label=''
        />
      ),
    },
    {
      id: 'actions',
      label: '操作',
      render: (row) => (
        <IconButton
          size='small'
          onClick={() => handleDelete(row.id)}
        >
          <Trash2 size={16} />
        </IconButton>
      ),
    },
  ];

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
                      color: 'white',
                      '& .MuiListItemIcon-root': {
                        color: 'white',
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

          {/* 右侧内容区 - 使用ListPageTemplate */}
          <Box sx={{ flex: 1 }}>
            <ListPageTemplate
              title={getTabTitle()}
              columns={columns}
              data={currentData}
              filters={[]}
              actions={[
                {
                  label: '添加',
                  icon: <Plus size={18} />,
                  onClick: () => {},
                },
              ]}
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
                    slotProps={{
                      input: {
                        endAdornment: <Typography variant='body2'>%</Typography>,
                      },
                    }}
                    sx={{ width: 200 }}
                  />
                  <TextField
                    label='最大代码行数限制'
                    type='number'
                    size='small'
                    defaultValue={500}
                    slotProps={{
                      input: {
                        endAdornment: <Typography variant='body2'>行</Typography>,
                      },
                    }}
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
