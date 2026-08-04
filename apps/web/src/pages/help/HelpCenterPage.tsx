import React, { useState } from 'react';
import {
  Box,
  Typography,
  Grid,
  Card,
  CardContent,
  CardActions,
  Button,
  Chip,
  Stack,
  TextField,
  useTheme,
  CircularProgress,
} from '@mui/material';
import {
  HelpCircle,
  FileText,
  MessageCircle,
  Search,
  ChevronRight,
  BookOpen,
  Video,
  Shield,
  Clock,
  Users,
  Rocket,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { PageContainer } from '@/components/common';
import { useTranslation } from 'react-i18next';
import { DASHBOARD_PATHS } from '@/routes/dashboard';
import { helpApi } from '@/api';
import type { Faq, Guide } from '@/api/help';
import { useQuery } from '@tanstack/react-query';
import { useNotificationStore } from '@/store';
import { apiLogger } from '@/utils/logger';

const HELP_CATEGORIES = [
  {
    id: 'getting-started',
    title: '快速入门',
    description: '新用户必读，快速了解系统基础功能',
    icon: Rocket,
    color: 'primary',
    count: 5,
    items: ['系统登录与注册', '首页功能概览', '个人信息设置', '角色权限说明', '快捷键指南'],
  },
  {
    id: 'hrm',
    title: '人力资源',
    description: '员工管理、考勤、休假等HR相关功能',
    icon: Users,
    color: 'success',
    count: 8,
    items: ['员工入职流程', '考勤打卡指南', '请假申请流程', '薪资查询', '绩效评估'],
  },
  {
    id: 'finance',
    title: '财务管理',
    description: '凭证、报表、预算等财务相关功能',
    icon: FileText,
    color: 'warning',
    count: 12,
    items: ['凭证录入', '报表生成', '预算管理', '费用报销', '应收应付'],
  },
  {
    id: 'workflow',
    title: '审批流程',
    description: '流程设计、审批操作、委托设置',
    icon: Clock,
    color: 'info',
    count: 6,
    items: ['新建审批流程', '审批操作指南', '流程委托', '流程监控', '审批统计'],
  },
  {
    id: 'security',
    title: '安全与权限',
    description: '数据安全、权限管理、审计日志',
    icon: Shield,
    color: 'error',
    count: 4,
    items: ['密码安全', '权限申请', '审计日志', '数据备份'],
  },
  {
    id: 'ai',
    title: 'AI智能助手',
    description: 'AI辅助功能使用指南',
    icon: MessageCircle,
    color: 'secondary',
    count: 3,
    items: ['AI问答使用', '文档分析', '代码生成'],
  },
];

const LATEST_UPDATES = [
  { id: '1', title: '新增移动端审批功能', date: '2024-12-15', type: 'new' },
  { id: '2', title: '优化报表导出性能', date: '2024-12-14', type: 'update' },
  { id: '3', title: '修复考勤统计bug', date: '2024-12-13', type: 'fix' },
];

export const HelpCenterPage: React.FC = () => {
  const { t } = useTranslation();
  const theme = useTheme();
  const navigate = useNavigate();
  const { addNotification } = useNotificationStore();
  const [searchQuery, setSearchQuery] = useState('');

  const faqsQuery = useQuery<Faq[]>({
    queryKey: ['help-center-faqs'],
    queryFn: async () => {
      const response = await helpApi.listFaqs({ page: 1, page_size: 4 });
      if (response.success && response.data) {
        return response.data.items || [];
      }
      return [];
    },
    staleTime: 5 * 60 * 1000,
  });
  const faqs = faqsQuery.data || [];

  const guidesQuery = useQuery<Guide[]>({
    queryKey: ['help-center-guides'],
    queryFn: async () => {
      const response = await helpApi.listGuides({ page: 1, page_size: 6 });
      if (response.success && response.data) {
        return response.data.items || [];
      }
      return [];
    },
    staleTime: 5 * 60 * 1000,
  });
  const guides = guidesQuery.data || [];
  const loading = faqsQuery.isLoading || guidesQuery.isLoading;

  React.useEffect(() => {
    if (faqsQuery.isError) {
      apiLogger.error('获取FAQ列表失败:', faqsQuery.error);
      addNotification({
        type: 'error',
        title: '加载失败',
        message: '无法加载FAQ列表',
      });
    }
  }, [faqsQuery.isError, faqsQuery.error, apiLogger, addNotification]);

  React.useEffect(() => {
    if (guidesQuery.isError) {
      apiLogger.error('获取指南列表失败:', guidesQuery.error);
      addNotification({
        type: 'error',
        title: '加载失败',
        message: '无法加载指南列表',
      });
    }
  }, [guidesQuery.isError, guidesQuery.error, apiLogger, addNotification]);

  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value);
  };

  const getCategoryColor = (color: string) => {
    const colorMap: Record<string, { bg: string; icon: string }> = {
      primary: { bg: 'primary.50', icon: 'primary.main' },
      success: { bg: 'success.50', icon: 'success.main' },
      warning: { bg: 'warning.50', icon: 'warning.main' },
      info: { bg: 'info.50', icon: 'info.main' },
      error: { bg: 'error.50', icon: 'error.main' },
      secondary: { bg: 'secondary.50', icon: 'secondary.main' },
    };
    return colorMap[color] || colorMap.primary;
  };

  const getTypeChip = (type: string) => {
    const typeMap: Record<string, { label: string; color: string }> = {
      new: { label: '新功能', color: 'success' },
      update: { label: '优化', color: 'primary' },
      fix: { label: '修复', color: 'warning' },
    };
    return typeMap[type] || typeMap.update;
  };

  return (
    <PageContainer
      title={t('help_center.title')}
      subtitle={t('help_center.subtitle')}
      headerProps={{ pageIcon: <HelpCircle size={20} /> }}
    >
      <Box sx={{ mb: 6 }}>
        <Box sx={{ maxWidth: 600, mx: 'auto', position: 'relative' }}>
          <Search
            sx={{
              position: 'absolute',
              left: 16,
              top: '50%',
              transform: 'translateY(-50%)',
              color: theme.palette.text.disabled,
            }}
          />
          <TextField
            fullWidth
            placeholder={t('help_center.search_placeholder')}
            value={searchQuery}
            onChange={handleSearch}
            sx={{ pl: 10 }}
          />
        </Box>
      </Box>

      <Box sx={{ mb: 8 }}>
        <Typography
          variant='h5'
          sx={{ fontWeight: 600, mb: 4 }}
        >
          {t('help_center.categories')}
        </Typography>
        <Grid
          container
          spacing={3}
        >
          {HELP_CATEGORIES.map((category) => {
            const colors = getCategoryColor(category.color);
            const Icon = category.icon;
            return (
              <Grid
                size={{ xs: 12, sm: 6, lg: 4 }}
                key={category.id}
              >
                <Card
                  sx={{
                    height: '100%',
                    borderRadius: 2,
                    transition: 'transform 0.2s, box-shadow 0.2s',
                    '&:hover': { transform: 'translateY(-4px)', boxShadow: theme.shadows[4] },
                  }}
                >
                  <CardContent>
                    <Box sx={{ display: 'flex', gap: 3, mb: 3 }}>
                      <Box
                        sx={{
                          width: 48,
                          height: 48,
                          borderRadius: 1,
                          bgcolor: colors.bg,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}
                      >
                        <Icon sx={{ width: 24, height: 24, color: colors.icon }} />
                      </Box>
                      <Box>
                        <Typography
                          variant='h6'
                          sx={{ fontWeight: 600 }}
                        >
                          {category.title}
                        </Typography>
                        <Typography
                          variant='body2'
                          color='text.secondary'
                        >
                          {category.description}
                        </Typography>
                      </Box>
                    </Box>
                    <Stack spacing={1.5}>
                      {category.items.slice(0, 3).map((item, index) => (
                        <Typography
                          key={index}
                          variant='body2'
                          sx={{
                            color: 'text.secondary',
                            display: 'flex',
                            alignItems: 'center',
                            gap: 1,
                          }}
                        >
                          <ChevronRight size={14} />
                          {item}
                        </Typography>
                      ))}
                      {category.items.length > 3 && (
                        <Typography
                          variant='body2'
                          sx={{
                            color: theme.palette.primary.main,
                            cursor: 'pointer',
                            '&:hover': { textDecoration: 'underline' },
                          }}
                        >
                          查看更多 {category.count} 篇文档
                        </Typography>
                      )}
                    </Stack>
                  </CardContent>
                  <CardActions sx={{ p: 2, pt: 0 }}>
                    <Button
                      size='small'
                      sx={{ textTransform: 'none' }}
                    >
                      浏览 {category.title}
                      <ChevronRight size={16} />
                    </Button>
                  </CardActions>
                </Card>
              </Grid>
            );
          })}
        </Grid>
      </Box>

      <Grid
        container
        spacing={6}
      >
        <Grid size={{ xs: 12, lg: 8 }}>
          <Typography
            variant='h5'
            sx={{ fontWeight: 600, mb: 4 }}
          >
            {t('help_center.faq')}
          </Typography>
          {loading ? (
            <Box sx={{ textAlign: 'center', py: 8 }}>
              <CircularProgress />
            </Box>
          ) : (
            <>
              <Stack spacing={2}>
                {faqs.map((faq) => (
                  <Card
                    key={faq.id}
                    sx={{
                      borderRadius: 1,
                      cursor: 'pointer',
                      transition: 'box-shadow 0.2s',
                      '&:hover': { boxShadow: theme.shadows[2] },
                    }}
                  >
                    <CardContent
                      sx={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                      }}
                    >
                      <Typography variant='body1'>{faq.question}</Typography>
                      <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
                        <Typography
                          variant='body2'
                          color='text.secondary'
                        >
                          查看 {faq.views.toLocaleString()}
                        </Typography>
                        <ChevronRight
                          size={16}
                          sx={{ color: theme.palette.text.disabled }}
                        />
                      </Box>
                    </CardContent>
                  </Card>
                ))}
              </Stack>
              <Box sx={{ mt: 4, textAlign: 'right' }}>
                <Button
                  size='small'
                  sx={{ textTransform: 'none' }}
                  onClick={() => navigate(DASHBOARD_PATHS.helpFaq)}
                >
                  查看全部FAQ
                  <ChevronRight size={16} />
                </Button>
              </Box>
            </>
          )}
        </Grid>

        <Grid size={{ xs: 12, lg: 4 }}>
          <Typography
            variant='h5'
            sx={{ fontWeight: 600, mb: 4 }}
          >
            {t('help_center.latest_updates')}
          </Typography>
          <Stack spacing={3}>
            {LATEST_UPDATES.map((update) => (
              <Box key={update.id}>
                <Box sx={{ display: 'flex', gap: 2, alignItems: 'center', mb: 1 }}>
                  <Chip
                    size='small'
                    label={getTypeChip(update.type).label}
                    color={
                      getTypeChip(update.type).color as React.ComponentProps<typeof Chip>['color']
                    }
                    sx={{ fontWeight: 500 }}
                  />
                  <Typography
                    variant='body2'
                    color='text.secondary'
                  >
                    {update.date}
                  </Typography>
                </Box>
                <Typography
                  variant='body1'
                  sx={{ fontWeight: 500 }}
                >
                  {update.title}
                </Typography>
              </Box>
            ))}
          </Stack>

          <Card sx={{ mt: 6, borderRadius: 2 }}>
            <CardContent>
              <Box sx={{ display: 'flex', gap: 3, mb: 3 }}>
                <Box
                  sx={{
                    width: 48,
                    height: 48,
                    borderRadius: 1,
                    bgcolor: 'primary.50',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <MessageCircle sx={{ width: 24, height: 24, color: 'primary.main' }} />
                </Box>
                <Box>
                  <Typography
                    variant='h6'
                    sx={{ fontWeight: 600 }}
                  >
                    在线客服
                  </Typography>
                  <Typography
                    variant='body2'
                    color='text.secondary'
                  >
                    遇到问题？联系我们的技术支持团队
                  </Typography>
                </Box>
              </Box>
              <Button
                fullWidth
                variant='contained'
                sx={{ textTransform: 'none', borderRadius: 1 }}
              >
                联系客服
              </Button>
              <Typography
                variant='body2'
                color='text.secondary'
                sx={{ mt: 2, textAlign: 'center' }}
              >
                工作时间：周一至周五 9:00-18:00
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      <Box sx={{ mt: 8 }}>
        <Card sx={{ borderRadius: 2 }}>
          <CardContent>
            <Grid
              container
              spacing={4}
            >
              <Grid
                size={{ xs: 12, sm: 4 }}
                onClick={() => navigate(DASHBOARD_PATHS.helpGuide)}
                sx={{ cursor: 'pointer' }}
              >
                <Box sx={{ textAlign: 'center' }}>
                  <BookOpen
                    size={32}
                    sx={{ color: theme.palette.primary.main, mb: 2 }}
                  />
                  <Typography
                    variant='body1'
                    sx={{ fontWeight: 600, mb: 1 }}
                  >
                    操作指南
                  </Typography>
                  <Typography
                    variant='body2'
                    color='text.secondary'
                  >
                    完整的用户手册和操作教程
                  </Typography>
                </Box>
              </Grid>
              <Grid size={{ xs: 12, sm: 4 }}>
                <Box sx={{ textAlign: 'center' }}>
                  <Video
                    size={32}
                    sx={{ color: theme.palette.success.main, mb: 2 }}
                  />
                  <Typography
                    variant='body1'
                    sx={{ fontWeight: 600, mb: 1 }}
                  >
                    视频教程
                  </Typography>
                  <Typography
                    variant='body2'
                    color='text.secondary'
                  >
                    直观的操作演示视频
                  </Typography>
                </Box>
              </Grid>
              <Grid size={{ xs: 12, sm: 4 }}>
                <Box sx={{ textAlign: 'center' }}>
                  <MessageCircle
                    size={32}
                    sx={{ color: theme.palette.info.main, mb: 2 }}
                  />
                  <Typography
                    variant='body1'
                    sx={{ fontWeight: 600, mb: 1 }}
                  >
                    社区论坛
                  </Typography>
                  <Typography
                    variant='body2'
                    color='text.secondary'
                  >
                    与其他用户交流经验
                  </Typography>
                </Box>
              </Grid>
            </Grid>
          </CardContent>
        </Card>
      </Box>
    </PageContainer>
  );
};

export default HelpCenterPage;
