import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Grid,
  Card,
  CardContent,
  CardActionArea,
  Button,
  Stack,
  Chip,
  Avatar,
  useTheme,
  TextField,
  InputAdornment,
  Tabs,
  Tab,
} from '@mui/material';
import {
  FileText,
  Layout,
  Plus,
  Search,
  Clock,
  Star,
  TrendingUp,
  FileEdit,
  Eye,
  MoreHorizontal,
} from 'lucide-react';
import { PageContainer } from '@/components';
import { lowcodeApi } from '@/api';
import type { FormSchema, PageSchema } from '@/api/lowcode';
import { useNavigate } from 'react-router-dom';

const LowCodeHomePage: React.FC = () => {
  const theme = useTheme();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState(0);
  const [recentForms, setRecentForms] = useState<FormSchema[]>([]);
  const [recentPages, setRecentPages] = useState<PageSchema[]>([]);
  const [searchKeyword, setSearchKeyword] = useState('');

  useEffect(() => {
    loadRecentData();
  }, []);

  const loadRecentData = async () => {
    const [formsRes, pagesRes] = await Promise.all([
      lowcodeApi.formApi.list({ pageSize: 5 }),
      lowcodeApi.pageApi.list({ pageSize: 5 }),
    ]);
    setRecentForms(formsRes.items);
    setRecentPages(pagesRes.items);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'published':
        return 'success';
      case 'draft':
        return 'warning';
      case 'archived':
        return 'default';
      default:
        return 'default';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'published':
        return '已发布';
      case 'draft':
        return '草稿';
      case 'archived':
        return '已归档';
      default:
        return status;
    }
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('zh-CN', {
      month: 'short',
      day: 'numeric',
    });
  };

  const quickActions = [
    {
      icon: FileText,
      title: '新建表单',
      description: '快速创建一个新的表单',
      action: () => navigate('/lowcode/forms/new'),
      color: 'primary',
    },
    {
      icon: Layout,
      title: '新建页面',
      description: '可视化搭建业务页面',
      action: () => navigate('/lowcode/pages/new'),
      color: 'secondary',
    },
    {
      icon: FileEdit,
      title: '表单模板',
      description: '从模板快速创建',
      action: () => navigate('/lowcode/forms'),
      color: 'success',
    },
    {
      icon: TrendingUp,
      title: '数据大屏',
      description: '可视化数据看板',
      action: () => navigate('/lowcode/pages'),
      color: 'info',
    },
  ];

  return (
    <PageContainer
      title='低代码平台'
      subtitle='可视化搭建业务应用'
    >
      <Box sx={{ mb: 4 }}>
        <Grid
          container
          spacing={3}
        >
          {quickActions.map((action, idx) => (
            <Grid
              size={{ xs: 12, sm: 6, md: 3 }}
              key={idx}
            >
              <Card
                elevation={0}
                sx={{
                  border: 1,
                  borderColor: 'divider',
                  transition: 'all 0.2s',
                  cursor: 'pointer',
                  '&:hover': {
                    borderColor: `${action.color}.main`,
                    transform: 'translateY(-2px)',
                    boxShadow: theme.shadows[4],
                  },
                }}
                onClick={action.action}
              >
                <CardContent sx={{ p: 3 }}>
                  <Stack
                    direction='row'
                    spacing={2}
                    sx={{ alignItems: 'center' }}
                  >
                    <Avatar
                      sx={{
                        bgcolor: `${action.color}.lighter`,
                        color: `${action.color}.main`,
                        width: 48,
                        height: 48,
                      }}
                    >
                      <action.icon size={24} />
                    </Avatar>
                    <Box>
                      <Typography
                        variant='h6'
                        sx={{ fontWeight: 600 }}
                      >
                        {action.title}
                      </Typography>
                      <Typography
                        variant='body2'
                        color='text.secondary'
                      >
                        {action.description}
                      </Typography>
                    </Box>
                  </Stack>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      </Box>

      <Box sx={{ mb: 3, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <Tabs
          value={activeTab}
          onChange={(_, v) => setActiveTab(v)}
        >
          <Tab
            label='最近编辑'
            icon={<Clock size={16} />}
            iconPosition='start'
          />
          <Tab
            label='我的收藏'
            icon={<Star size={16} />}
            iconPosition='start'
          />
        </Tabs>
        <TextField
          size='small'
          placeholder='搜索...'
          value={searchKeyword}
          onChange={(e) => setSearchKeyword(e.target.value)}
          sx={{ width: 240 }}
          slotProps={{
            input: {
              startAdornment: (
                <InputAdornment position='start'>
                  <Search size={18} />
                </InputAdornment>
              ),
            },
          }}
        />
      </Box>

      <Grid
        container
        spacing={3}
      >
        <Grid size={{ xs: 12, md: 6 }}>
          <Card
            elevation={0}
            sx={{ border: 1, borderColor: 'divider' }}
          >
            <Box sx={{ p: 2, borderBottom: 1, borderColor: 'divider' }}>
              <Stack
                direction='row'
                sx={{ alignItems: 'center', justifyContent: 'space-between' }}
              >
                <Typography
                  variant='subtitle1'
                  sx={{ fontWeight: 600 }}
                >
                  最近编辑的表单
                </Typography>
                <Button
                  size='small'
                  onClick={() => navigate('/lowcode/forms')}
                >
                  查看全部
                </Button>
              </Stack>
            </Box>
            <Box sx={{ p: 2 }}>
              <Stack spacing={1.5}>
                {recentForms.map((form) => (
                  <Card
                    key={form.id}
                    elevation={0}
                    sx={{
                      border: 1,
                      borderColor: 'divider',
                      transition: 'all 0.15s',
                      cursor: 'pointer',
                      '&:hover': {
                        bgcolor: 'action.hover',
                      },
                    }}
                    onClick={() => navigate(`/lowcode/forms/${form.id}`)}
                  >
                    <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
                      <Stack
                        direction='row'
                        spacing={2}
                        sx={{ alignItems: 'center' }}
                      >
                        <Avatar
                          sx={{
                            bgcolor: 'primary.lighter',
                            color: 'primary.main',
                            width: 40,
                            height: 40,
                          }}
                        >
                          <FileText size={20} />
                        </Avatar>
                        <Box sx={{ flex: 1, minWidth: 0 }}>
                          <Stack
                            direction='row'
                            spacing={1}
                            sx={{ alignItems: 'center' }}
                          >
                            <Typography
                              variant='subtitle2'
                              noWrap
                              sx={{ fontWeight: 600, flex: 1 }}
                            >
                              {form.name}
                            </Typography>
                            <Chip
                              label={getStatusLabel(form.status)}
                              size='small'
                              color={getStatusColor(form.status) as any}
                              variant='outlined'
                            />
                          </Stack>
                          <Typography
                            variant='caption'
                            color='text.secondary'
                            noWrap
                          >
                            {form.description || '暂无描述'}
                          </Typography>
                          <Typography
                            variant='caption'
                            color='text.disabled'
                          >
                            更新于 {formatDate(form.updatedAt)}
                          </Typography>
                        </Box>
                        <Button
                          size='small'
                          variant='outlined'
                          sx={{ minWidth: 0, px: 1.5 }}
                        >
                          <Eye size={16} />
                        </Button>
                      </Stack>
                    </CardContent>
                  </Card>
                ))}
                {recentForms.length === 0 && (
                  <Box
                    sx={{
                      py: 4,
                      textAlign: 'center',
                      color: 'text.secondary',
                    }}
                  >
                    <Typography variant='body2'>暂无表单</Typography>
                    <Button
                      size='small'
                      startIcon={<Plus size={16} />}
                      sx={{ mt: 1 }}
                      onClick={() => navigate('/lowcode/forms/new')}
                    >
                      新建表单
                    </Button>
                  </Box>
                )}
              </Stack>
            </Box>
          </Card>
        </Grid>

        <Grid size={{ xs: 12, md: 6 }}>
          <Card
            elevation={0}
            sx={{ border: 1, borderColor: 'divider' }}
          >
            <Box sx={{ p: 2, borderBottom: 1, borderColor: 'divider' }}>
              <Stack
                direction='row'
                sx={{ alignItems: 'center', justifyContent: 'space-between' }}
              >
                <Typography
                  variant='subtitle1'
                  sx={{ fontWeight: 600 }}
                >
                  最近编辑的页面
                </Typography>
                <Button
                  size='small'
                  onClick={() => navigate('/lowcode/pages')}
                >
                  查看全部
                </Button>
              </Stack>
            </Box>
            <Box sx={{ p: 2 }}>
              <Stack spacing={1.5}>
                {recentPages.map((page) => (
                  <Card
                    key={page.id}
                    elevation={0}
                    sx={{
                      border: 1,
                      borderColor: 'divider',
                      transition: 'all 0.15s',
                      cursor: 'pointer',
                      '&:hover': {
                        bgcolor: 'action.hover',
                      },
                    }}
                    onClick={() => navigate(`/lowcode/pages/${page.id}`)}
                  >
                    <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
                      <Stack
                        direction='row'
                        spacing={2}
                        sx={{ alignItems: 'center' }}
                      >
                        <Avatar
                          sx={{
                            bgcolor: 'secondary.lighter',
                            color: 'secondary.main',
                            width: 40,
                            height: 40,
                          }}
                        >
                          <Layout size={20} />
                        </Avatar>
                        <Box sx={{ flex: 1, minWidth: 0 }}>
                          <Stack
                            direction='row'
                            spacing={1}
                            sx={{ alignItems: 'center' }}
                          >
                            <Typography
                              variant='subtitle2'
                              noWrap
                              sx={{ fontWeight: 600, flex: 1 }}
                            >
                              {page.name}
                            </Typography>
                            <Chip
                              label={getStatusLabel(page.status)}
                              size='small'
                              color={getStatusColor(page.status) as any}
                              variant='outlined'
                            />
                          </Stack>
                          <Typography
                            variant='caption'
                            color='text.secondary'
                            noWrap
                          >
                            {page.description || '暂无描述'}
                          </Typography>
                          <Typography
                            variant='caption'
                            color='text.disabled'
                          >
                            更新于 {formatDate(page.updatedAt)}
                          </Typography>
                        </Box>
                        <Button
                          size='small'
                          variant='outlined'
                          sx={{ minWidth: 0, px: 1.5 }}
                        >
                          <Eye size={16} />
                        </Button>
                      </Stack>
                    </CardContent>
                  </Card>
                ))}
                {recentPages.length === 0 && (
                  <Box
                    sx={{
                      py: 4,
                      textAlign: 'center',
                      color: 'text.secondary',
                    }}
                  >
                    <Typography variant='body2'>暂无页面</Typography>
                    <Button
                      size='small'
                      startIcon={<Plus size={16} />}
                      sx={{ mt: 1 }}
                      onClick={() => navigate('/lowcode/pages/new')}
                    >
                      新建页面
                    </Button>
                  </Box>
                )}
              </Stack>
            </Box>
          </Card>
        </Grid>
      </Grid>
    </PageContainer>
  );
};

export default LowCodeHomePage;
