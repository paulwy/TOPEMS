import { useState, useEffect } from 'react';
import {
  Box,
  Tabs,
  Tab,
  Typography,
  Chip,
  Button,
  Card,
  CardContent,
  Avatar,
  Grid,
  List,
  ListItem,
  ListItemAvatar,
  ListItemText,
  IconButton,
  Divider,
} from '@mui/material';
import {
  ArrowLeft,
  Database,
  Layout,
  Settings,
  Users,
  Workflow,
  Tag,
  Plus,
  Edit,
  Trash2,
  Table,
  FileText,
  Shield,
} from 'lucide-react';
import { useParams, useNavigate } from 'react-router-dom';
import { PageContainer } from '@/components/common';
import { getApp, getAppVersions } from '../../api/lowcode';
import type { LowCodeApp, AppVersion } from '../../api/lowcode/types';
import AppVersionList from '../../components/lowcode/AppVersionList';
import AppPublishDialog from '../../components/lowcode/AppPublishDialog';

type TabType = 'overview' | 'pages' | 'models' | 'workflows' | 'permissions' | 'versions';

const AppDetailPage = () => {
  const { appId } = useParams<{ appId: string }>();
  const navigate = useNavigate();
  const [app, setApp] = useState<LowCodeApp | null>(null);
  const [versions, setVersions] = useState<AppVersion[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<TabType>('overview');
  const [publishDialogOpen, setPublishDialogOpen] = useState(false);

  useEffect(() => {
    if (appId) {
      loadApp();
    }
  }, [appId]);

  const loadApp = async () => {
    setLoading(true);
    try {
      const [appRes, versionsRes] = await Promise.all([getApp(appId!), getAppVersions(appId!)]);
      if (appRes.success) setApp(appRes.data || null);
      if (versionsRes.success) setVersions(versionsRes.data || []);
    } catch (error) {
      console.error('Failed to load app:', error);
    } finally {
      setLoading(false);
    }
  };

  const handlePublish = async (_params: { version: string; description: string }) => {
    setPublishDialogOpen(false);
    loadApp();
  };

  const stringToColor = (string: string) => {
    let hash = 0;
    for (let i = 0; i < string.length; i++) {
      hash = string.charCodeAt(i) + ((hash << 5) - hash);
    }
    const hue = Math.abs(hash % 360);
    return `hsl(${hue}, 70%, 50%)`;
  };

  const statusLabels: Record<string, string> = {
    draft: '草稿',
    published: '已发布',
    archived: '已归档',
  };

  const statusColors: Record<string, 'default' | 'success' | 'warning'> = {
    draft: 'default',
    published: 'success',
    archived: 'warning',
  };

  const tabs = [
    { value: 'overview', label: '概览', icon: Layout },
    { value: 'pages', label: '页面', icon: FileText },
    { value: 'models', label: '数据模型', icon: Database },
    { value: 'workflows', label: '工作流', icon: Workflow },
    { value: 'permissions', label: '权限', icon: Shield },
    { value: 'versions', label: '版本', icon: Tag },
  ] as const;

  return (
    <PageContainer
      loading={loading}
      headerContent={
        <Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 1 }}>
            <IconButton
              onClick={() => navigate('/lowcode/apps')}
              size='small'
            >
              <ArrowLeft style={{ width: 20, height: 20 }} />
            </IconButton>
            <Avatar
              sx={{
                width: 40,
                height: 40,
                bgcolor: app ? stringToColor(app.name) : 'primary.main',
                fontSize: 18,
                fontWeight: 700,
              }}
            >
              {(app?.label || app?.name)?.charAt(0)}
            </Avatar>
            <Box>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Typography
                  variant='h5'
                  sx={{ fontWeight: 600 }}
                >
                  {app?.label}
                </Typography>
                {app && (
                  <Chip
                    label={statusLabels[app.status]}
                    size='small'
                    color={statusColors[app.status]}
                    variant='outlined'
                  />
                )}
              </Box>
              <Typography
                variant='body2'
                color='text.secondary'
              >
                {app?.description}
              </Typography>
            </Box>
          </Box>
        </Box>
      }
      headerActions={
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Button
            variant='outlined'
            startIcon={<Edit style={{ width: 16, height: 16 }} />}
            size='small'
          >
            编辑信息
          </Button>
          <Button
            variant='contained'
            startIcon={<Tag style={{ width: 16, height: 16 }} />}
            size='small'
            onClick={() => setPublishDialogOpen(true)}
          >
            发布
          </Button>
        </Box>
      }
    >
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
          <Tabs
            value={activeTab}
            onChange={(_, v) => setActiveTab(v)}
            variant='scrollable'
            scrollButtons='auto'
          >
            {tabs.map((tab) => (
              <Tab
                key={tab.value}
                value={tab.value}
                label={tab.label}
                icon={<tab.icon style={{ width: 16, height: 16 }} />}
                iconPosition='start'
              />
            ))}
          </Tabs>
        </Box>

        {activeTab === 'overview' && app && (
          <Grid
            container
            spacing={3}
          >
            <Grid size={{ xs: 12, md: 8 }}>
              <Card variant='outlined'>
                <CardContent>
                  <Typography
                    variant='h6'
                    gutterBottom
                  >
                    应用概览
                  </Typography>
                  <Grid
                    container
                    spacing={3}
                  >
                    <Grid size={{ xs: 4 }}>
                      <Box sx={{ textAlign: 'center' }}>
                        <Typography
                          variant='h4'
                          sx={{ fontWeight: 700 }}
                          color='primary.main'
                        >
                          {app.pageCount || 0}
                        </Typography>
                        <Typography
                          variant='body2'
                          color='text.secondary'
                        >
                          页面数
                        </Typography>
                      </Box>
                    </Grid>
                    <Grid size={{ xs: 4 }}>
                      <Box sx={{ textAlign: 'center' }}>
                        <Typography
                          variant='h4'
                          sx={{ fontWeight: 700 }}
                          color='secondary.main'
                        >
                          {app.modelCount || 0}
                        </Typography>
                        <Typography
                          variant='body2'
                          color='text.secondary'
                        >
                          数据模型
                        </Typography>
                      </Box>
                    </Grid>
                    <Grid size={{ xs: 4 }}>
                      <Box sx={{ textAlign: 'center' }}>
                        <Typography
                          variant='h4'
                          sx={{ fontWeight: 700 }}
                          color='success.main'
                        >
                          {app.workflowCount || 0}
                        </Typography>
                        <Typography
                          variant='body2'
                          color='text.secondary'
                        >
                          工作流
                        </Typography>
                      </Box>
                    </Grid>
                  </Grid>
                </CardContent>
              </Card>
            </Grid>
            <Grid size={{ xs: 12, md: 4 }}>
              <Card variant='outlined'>
                <CardContent>
                  <Typography
                    variant='h6'
                    gutterBottom
                  >
                    应用信息
                  </Typography>
                  <List dense>
                    <ListItem>
                      <ListItemText
                        primary='应用标识'
                        secondary={app.name}
                      />
                    </ListItem>
                    <Divider />
                    <ListItem>
                      <ListItemText
                        primary='当前版本'
                        secondary={`v${app.currentVersion || '0.0.0'}`}
                      />
                    </ListItem>
                    <Divider />
                    <ListItem>
                      <ListItemText
                        primary='创建时间'
                        secondary={new Date(app.createdAt).toLocaleString('zh-CN')}
                      />
                    </ListItem>
                    <Divider />
                    <ListItem>
                      <ListItemText
                        primary='更新时间'
                        secondary={new Date(app.updatedAt).toLocaleString('zh-CN')}
                      />
                    </ListItem>
                    <Divider />
                    <ListItem>
                      <ListItemText
                        primary='分类'
                        secondary={app.category || '-'}
                      />
                    </ListItem>
                  </List>
                </CardContent>
              </Card>
            </Grid>
          </Grid>
        )}

        {activeTab === 'pages' && (
          <Card variant='outlined'>
            <CardContent>
              <Box
                sx={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  mb: 2,
                }}
              >
                <Typography variant='h6'>页面列表</Typography>
                <Button
                  size='small'
                  variant='contained'
                  startIcon={<Plus style={{ width: 16, height: 16 }} />}
                >
                  新建页面
                </Button>
              </Box>
              <List>
                {[
                  { name: '首页', type: '仪表盘', icon: Layout },
                  { name: '数据列表', type: '列表页', icon: Table },
                  { name: '表单页面', type: '表单页', icon: FileText },
                ].map((page, idx) => (
                  <ListItem
                    key={idx}
                    secondaryAction={
                      <Box sx={{ display: 'flex', gap: 1 }}>
                        <IconButton
                          edge='end'
                          size='small'
                        >
                          <Edit style={{ width: 18, height: 18 }} />
                        </IconButton>
                        <IconButton
                          edge='end'
                          size='small'
                          color='error'
                        >
                          <Trash2 style={{ width: 18, height: 18 }} />
                        </IconButton>
                      </Box>
                    }
                  >
                    <ListItemAvatar>
                      <Avatar sx={{ bgcolor: 'primary.light', color: 'primary.main' }}>
                        <page.icon style={{ width: 20, height: 20 }} />
                      </Avatar>
                    </ListItemAvatar>
                    <ListItemText
                      primary={page.name}
                      secondary={page.type}
                    />
                  </ListItem>
                ))}
              </List>
            </CardContent>
          </Card>
        )}

        {activeTab === 'models' && (
          <Card variant='outlined'>
            <CardContent>
              <Box
                sx={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  mb: 2,
                }}
              >
                <Typography variant='h6'>数据模型</Typography>
                <Button
                  size='small'
                  variant='contained'
                  startIcon={<Plus style={{ width: 16, height: 16 }} />}
                  onClick={() => navigate('/lowcode/models')}
                >
                  管理模型
                </Button>
              </Box>
              <List>
                {(app?.modelIds || []).map((modelId, idx) => (
                  <ListItem
                    key={modelId}
                    onClick={() => navigate(`/lowcode/models/${modelId}`)}
                    sx={{ cursor: 'pointer' }}
                  >
                    <ListItemAvatar>
                      <Avatar sx={{ bgcolor: 'secondary.light', color: 'secondary.main' }}>
                        <Database style={{ width: 20, height: 20 }} />
                      </Avatar>
                    </ListItemAvatar>
                    <ListItemText
                      primary={`数据模型 ${idx + 1}`}
                      secondary={modelId}
                    />
                  </ListItem>
                ))}
              </List>
            </CardContent>
          </Card>
        )}

        {activeTab === 'workflows' && (
          <Card variant='outlined'>
            <CardContent>
              <Box
                sx={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  mb: 2,
                }}
              >
                <Typography variant='h6'>工作流</Typography>
                <Button
                  size='small'
                  variant='contained'
                  startIcon={<Plus style={{ width: 16, height: 16 }} />}
                >
                  新建工作流
                </Button>
              </Box>
              <List>
                {[
                  { name: '审批流程', status: '已发布' },
                  { name: '数据同步', status: '草稿' },
                ].map((wf, idx) => (
                  <ListItem key={idx}>
                    <ListItemAvatar>
                      <Avatar sx={{ bgcolor: 'success.light', color: 'success.main' }}>
                        <Workflow style={{ width: 20, height: 20 }} />
                      </Avatar>
                    </ListItemAvatar>
                    <ListItemText
                      primary={wf.name}
                      secondary={wf.status}
                    />
                  </ListItem>
                ))}
              </List>
            </CardContent>
          </Card>
        )}

        {activeTab === 'permissions' && (
          <Card variant='outlined'>
            <CardContent>
              <Box
                sx={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  mb: 2,
                }}
              >
                <Typography variant='h6'>权限配置</Typography>
                <Button
                  size='small'
                  variant='outlined'
                  startIcon={<Users style={{ width: 16, height: 16 }} />}
                >
                  管理角色
                </Button>
              </Box>
              <List>
                {[
                  { role: '管理员', users: 3, perms: '全部权限' },
                  { role: '编辑者', users: 8, perms: '读写权限' },
                  { role: '查看者', users: 15, perms: '只读权限' },
                ].map((item, idx) => (
                  <ListItem key={idx}>
                    <ListItemAvatar>
                      <Avatar sx={{ bgcolor: 'warning.light', color: 'warning.main' }}>
                        <Shield style={{ width: 20, height: 20 }} />
                      </Avatar>
                    </ListItemAvatar>
                    <ListItemText
                      primary={item.role}
                      secondary={`${item.users} 人 · ${item.perms}`}
                    />
                  </ListItem>
                ))}
              </List>
            </CardContent>
          </Card>
        )}

        {activeTab === 'versions' && (
          <AppVersionList
            versions={versions}
            currentVersion={app?.currentVersion}
          />
        )}
      </Box>

      <AppPublishDialog
        open={publishDialogOpen}
        app={app}
        onClose={() => setPublishDialogOpen(false)}
        onPublish={handlePublish}
      />
    </PageContainer>
  );
};

export default AppDetailPage;
