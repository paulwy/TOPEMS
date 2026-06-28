import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Paper,
  Typography,
  Chip,
  Button,
  Card,
  CardContent,
  CardActionArea,
  Avatar,
  List,
  ListItem,
  ListItemAvatar,
  ListItemText,
  Divider,
} from '@mui/material';
import {
  Bot,
  MessageSquare,
  FileText,
  Code2,
  BookOpen,
  Database,
  Settings,
  TrendingUp,
  Users,
  Zap,
  Clock,
  ChevronRight,
  Sparkles,
  Layers,
} from 'lucide-react';
import { PageContainer, Grid } from '@/components/common';
import LineChartComponent from '@/components/charts/LineChart';
import BarChartComponent from '@/components/charts/BarChart';
import PieChartComponent from '@/components/charts/PieChart';
import { logger } from '@/utils/logger';

const iconMap: Record<string, React.ReactNode> = {
  Bot: <Bot size={24} />,
  MessageSquare: <MessageSquare size={24} />,
  FileText: <FileText size={24} />,
  Code2: <Code2 size={24} />,
  BookOpen: <BookOpen size={24} />,
  Database: <Database size={24} />,
  Settings: <Settings size={24} />,
};

const activityData = [
  { name: '周一', conversations: 120, messages: 340, tokens: 45000 },
  { name: '周二', conversations: 150, messages: 420, tokens: 58000 },
  { name: '周三', conversations: 180, messages: 500, tokens: 72000 },
  { name: '周四', conversations: 165, messages: 460, tokens: 65000 },
  { name: '周五', conversations: 200, messages: 560, tokens: 80000 },
  { name: '周六', conversations: 80, messages: 180, tokens: 22000 },
  { name: '周日', conversations: 60, messages: 140, tokens: 18000 },
];

const featureUsageData = [
  { name: '智能对话', value: 45 },
  { name: '文档分析', value: 25 },
  { name: '代码助手', value: 15 },
  { name: '知识库', value: 10 },
  { name: '其他', value: 5 },
];

const modelUsageData = [
  { name: 'GPT-4', value: 1200 },
  { name: 'GPT-3.5', value: 2800 },
  { name: 'Claude', value: 800 },
  { name: '文心一言', value: 500 },
  { name: '通义千问', value: 300 },
];

const quickActions = [
  {
    id: 'chat',
    title: '智能对话',
    description: '与AI助手进行实时对话',
    icon: <MessageSquare size={28} />,
    path: '/ai/chat',
    color: 'primary',
    gradient: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
  },
  {
    id: 'knowledge',
    title: '知识库管理',
    description: '管理向量库和文档索引',
    icon: <Database size={28} />,
    path: '/ai/knowledge',
    color: 'success',
    gradient: 'linear-gradient(135deg, #11998e 0%, #38ef7d 100%)',
  },
  {
    id: 'document',
    title: '文档分析',
    description: '文档摘要、翻译、问答',
    icon: <FileText size={28} />,
    path: '/ai/document-analysis',
    color: 'info',
    gradient: 'linear-gradient(135deg, #2193b0 0%, #6dd5ed 100%)',
  },
  {
    id: 'code',
    title: '代码助手',
    description: '代码生成、解释、优化',
    icon: <Code2 size={28} />,
    path: '/ai/code-assistant',
    color: 'warning',
    gradient: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
  },
  {
    id: 'prompt',
    title: 'Prompt库',
    description: 'Prompt模板管理',
    icon: <BookOpen size={28} />,
    path: '/ai/prompt-library',
    color: 'secondary',
    gradient: 'linear-gradient(135deg, #a8edea 0%, #fed6e3 100%)',
  },
  {
    id: 'models',
    title: '模型设置',
    description: '模型配置和用量统计',
    icon: <Settings size={28} />,
    path: '/ai/model-settings',
    color: 'error',
    gradient: 'linear-gradient(135deg, #ff9a9e 0%, #fecfef 100%)',
  },
];

const recentConversations = [
  { id: '1', title: '如何设置库存预警？', time: '2分钟前', preview: '库存预警的设置步骤如下...' },
  { id: '2', title: '采购订单审批流程', time: '15分钟前', preview: '采购订单审批需要经过...' },
  { id: '3', title: 'Python代码优化建议', time: '1小时前', preview: '这段代码可以从以下几个方面优化...' },
  { id: '4', title: '产品规格书摘要', time: '2小时前', preview: '本产品规格书主要包含...' },
  { id: '5', title: '销售数据分析报告', time: '昨天', preview: '根据销售数据显示...' },
];

export const AiDashboardPage: React.FC = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => setLoading(false), 500);
    return () => clearTimeout(timer);
  }, []);

  const stats = [
    {
      id: 'total-conversations',
      title: '总对话数',
      value: '2,345',
      icon: <MessageSquare size={24} />,
      change: '+23%',
      changeLabel: '较上周',
      color: 'primary',
      bgColor: 'primary.50',
      iconColor: 'primary.main',
    },
    {
      id: 'total-documents',
      title: '知识库文档',
      value: '1,256',
      icon: <FileText size={24} />,
      change: '+12%',
      changeLabel: '较上周',
      color: 'success',
      bgColor: 'success.50',
      iconColor: 'success.main',
    },
    {
      id: 'total-tokens',
      title: 'Token消耗',
      value: '2.8M',
      icon: <Zap size={24} />,
      change: '+35%',
      changeLabel: '较上周',
      color: 'warning',
      bgColor: 'warning.50',
      iconColor: 'warning.main',
    },
    {
      id: 'active-users',
      title: '活跃用户',
      value: '156',
      icon: <Users size={24} />,
      change: '+8%',
      changeLabel: '较上周',
      color: 'info',
      bgColor: 'info.50',
      iconColor: 'info.main',
    },
  ];

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return '上午好';
    if (hour < 18) return '下午好';
    return '晚上好';
  };

  return (
    <PageContainer
      title='AI智能助手'
      subtitle={`${getGreeting()}，欢迎使用智能助手`}
      padding={false}
      maxWidth={false}
      headerProps={{
        pageIcon: <Sparkles style={{ width: 20, height: 20 }} />,
        pageGradient: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      }}
    >
      <Box sx={{ p: 3 }}>
        {/* 统计卡片 */}
        <Grid container spacing={3} sx={{ mb: 3 }}>
          {stats.map((stat) => (
            <Grid item xs={12} sm={6} md={3} key={stat.id}>
              <Paper
                sx={{
                  p: 3,
                  borderRadius: 2,
                  height: '100%',
                }}
              >
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
                  <Box>
                    <Typography
                      variant='body2'
                      color='text.secondary'
                      sx={{ mb: 1 }}
                    >
                      {stat.title}
                    </Typography>
                    <Typography
                      variant='h4'
                      sx={{ fontWeight: 700 }}
                    >
                      {stat.value}
                    </Typography>
                  </Box>
                  <Avatar
                    sx={{
                      bgcolor: stat.bgColor,
                      color: stat.iconColor,
                    }}
                  >
                    {stat.icon}
                  </Avatar>
                </Box>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <TrendingUp size={14} style={{ color: '#10b981' }} />
                  <Typography
                    variant='caption'
                    sx={{ color: 'success.main', fontWeight: 600 }}
                  >
                    {stat.change}
                  </Typography>
                  <Typography variant='caption' color='text.secondary'>
                    {stat.changeLabel}
                  </Typography>
                </Box>
              </Paper>
            </Grid>
          ))}
        </Grid>

        {/* 功能入口 */}
        <Typography
          variant='h6'
          sx={{ fontWeight: 600, mb: 2 }}
        >
          功能入口
        </Typography>
        <Grid container spacing={3} sx={{ mb: 3 }}>
          {quickActions.map((action) => (
            <Grid item xs={12} sm={6} md={4} key={action.id}>
              <Card
                sx={{
                  height: '100%',
                  borderRadius: 2,
                  cursor: 'pointer',
                  transition: 'transform 0.2s, box-shadow 0.2s',
                  '&:hover': {
                    transform: 'translateY(-4px)',
                    boxShadow: 4,
                  },
                }}
                onClick={() => navigate(action.path)}
              >
                <CardActionArea sx={{ p: 2 }}>
                  <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
                    <Box
                      sx={{
                        width: 56,
                        height: 56,
                        borderRadius: 2,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: 'white',
                        background: action.gradient,
                      }}
                    >
                      {action.icon}
                    </Box>
                    <Box sx={{ flex: 1 }}>
                      <Typography
                        variant='subtitle1'
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
                    <ChevronRight size={20} style={{ color: '#9ca3af' }} />
                  </Box>
                </CardActionArea>
              </Card>
            </Grid>
          ))}
        </Grid>

        {/* 图表区域 */}
        <Grid container spacing={3} sx={{ mb: 3 }}>
          <Grid item xs={12} md={8}>
            <Paper sx={{ p: 3, borderRadius: 2, height: '100%' }}>
              <Typography
                variant='h6'
                sx={{ fontWeight: 600, mb: 2 }}
              >
                活跃度趋势
              </Typography>
              <Box sx={{ height: 280 }}>
                <LineChartComponent
                  data={activityData}
                  xKey='name'
                  yKey='messages'
                />
              </Box>
            </Paper>
          </Grid>
          <Grid item xs={12} md={4}>
            <Paper sx={{ p: 3, borderRadius: 2, height: '100%' }}>
              <Typography
                variant='h6'
                sx={{ fontWeight: 600, mb: 2 }}
              >
                功能使用分布
              </Typography>
              <Box sx={{ height: 280 }}>
                <PieChartComponent data={featureUsageData} />
              </Box>
            </Paper>
          </Grid>
        </Grid>

        {/* 底部区域 */}
        <Grid container spacing={3}>
          {/* 最近对话 */}
          <Grid item xs={12} md={6}>
            <Paper sx={{ p: 3, borderRadius: 2 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                <Typography
                  variant='h6'
                  sx={{ fontWeight: 600 }}
                >
                  最近对话
                </Typography>
                <Button
                  size='small'
                  onClick={() => navigate('/ai/chat')}
                  sx={{ textTransform: 'none' }}
                >
                  查看全部
                </Button>
              </Box>
              <Divider sx={{ mb: 1 }} />
              <List disablePadding>
                {recentConversations.map((item, index) => (
                  <React.Fragment key={item.id}>
                    <ListItem
                      sx={{
                        px: 0,
                        cursor: 'pointer',
                        borderRadius: 1,
                        '&:hover': { bgcolor: 'grey.50' },
                      }}
                      onClick={() => navigate('/ai/chat')}
                    >
                      <ListItemAvatar>
                        <Avatar sx={{ bgcolor: 'primary.50', color: 'primary.main' }}>
                          <MessageSquare size={20} />
                        </Avatar>
                      </ListItemAvatar>
                      <ListItemText
                        primary={
                          <Typography
                            variant='body1'
                            sx={{ fontWeight: 500 }}
                          >
                            {item.title}
                          </Typography>
                        }
                        secondary={
                          <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 0.5 }}>
                            <Typography
                              variant='body2'
                              color='text.secondary'
                              sx={{ maxWidth: '70%', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
                            >
                              {item.preview}
                            </Typography>
                            <Typography variant='caption' color='text.disabled'>
                              {item.time}
                            </Typography>
                          </Box>
                        }
                      />
                    </ListItem>
                    {index < recentConversations.length - 1 && <Divider variant='inset' />}
                  </React.Fragment>
                ))}
              </List>
            </Paper>
          </Grid>

          {/* 模型使用排行 */}
          <Grid item xs={12} md={6}>
            <Paper sx={{ p: 3, borderRadius: 2 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                <Typography
                  variant='h6'
                  sx={{ fontWeight: 600 }}
                >
                  模型使用排行
                </Typography>
                <Button
                  size='small'
                  onClick={() => navigate('/ai/model-settings')}
                  sx={{ textTransform: 'none' }}
                >
                  查看详情
                </Button>
              </Box>
              <Divider sx={{ mb: 2 }} />
              <Box sx={{ height: 220 }}>
                <BarChartComponent
                  data={modelUsageData}
                  xKey='name'
                  yKey='value'
                />
              </Box>
            </Paper>
          </Grid>
        </Grid>
      </Box>
    </PageContainer>
  );
};

export default AiDashboardPage;
