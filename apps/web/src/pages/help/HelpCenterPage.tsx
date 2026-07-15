import React, { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
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
  Building2,
  Briefcase,
  Package,
  Factory,
  ClipboardList,
  Truck,
  Award,
  Target,
  Globe,
  Heart,
  Bookmark,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { PageContainer } from '@/components/common';
import { useTranslation } from 'react-i18next';
import { DASHBOARD_PATHS } from '@/routes/dashboard';
import { helpApi } from '@/api';
import type { Faq, Guide } from '@/api/help';
import { QUERY_KEYS } from '@/lib/reactQuery';

const MODULE_CATEGORIES = [
  {
    id: 'iam',
    title: 'IAM身份管理',
    description: '用户管理、角色权限、认证授权',
    icon: Users,
    color: 'primary',
    count: 6,
    docs: [
      '用户创建与管理',
      '角色与权限配置',
      '认证方式设置',
      '单点登录配置',
      '审计日志查看',
      '组织架构管理',
    ],
  },
  {
    id: 'workflow',
    title: 'Workflow工作流',
    description: '流程设计、审批流转、任务管理',
    icon: Clock,
    color: 'info',
    count: 7,
    docs: [
      '流程设计器使用',
      '审批流程创建',
      '流程节点配置',
      '审批委托设置',
      '流程监控与追踪',
      '流程统计分析',
      '流程版本管理',
    ],
  },
  {
    id: 'crm',
    title: 'CRM客户管理',
    description: '客户档案、商机追踪、销售管理',
    icon: Building2,
    color: 'success',
    count: 6,
    docs: [
      '客户信息录入',
      '商机创建与跟踪',
      '销售漏斗管理',
      '联系人管理',
      '客户跟进记录',
      '销售报表分析',
    ],
  },
  {
    id: 'erp',
    title: 'ERP企业资源',
    description: '财务、采购、销售、库存一体化',
    icon: Briefcase,
    color: 'warning',
    count: 8,
    docs: [
      '采购订单管理',
      '销售订单处理',
      '应收应付管理',
      '总账凭证录入',
      '预算编制与控制',
      '成本核算',
      '财务报表生成',
      '多币种管理',
    ],
  },
  {
    id: 'wms',
    title: 'WMS仓储管理',
    description: '入库、出库、库位、盘点管理',
    icon: Package,
    color: 'error',
    count: 6,
    docs: ['入库作业流程', '出库作业流程', '库位管理', '库存盘点', '库存调拨', '库存预警设置'],
  },
  {
    id: 'mes',
    title: 'MES生产制造',
    description: '生产计划、工序管理、设备监控',
    icon: Factory,
    color: 'secondary',
    count: 7,
    docs: [
      '生产订单创建',
      '工单下达与报工',
      '工序流转',
      '设备管理',
      '质量检验',
      '生产进度追踪',
      '产能分析',
    ],
  },
  {
    id: 'hrm',
    title: 'HRM人力资源',
    description: '员工管理、考勤、薪酬、绩效',
    icon: Users,
    color: 'primary',
    count: 8,
    docs: [
      '员工入职流程',
      '考勤打卡管理',
      '请假申请审批',
      '薪资核算',
      '绩效评估',
      '培训管理',
      '招聘流程',
      '合同管理',
    ],
  },
  {
    id: 'qms',
    title: 'QMS质量管理',
    description: '质量管控、审核、不合格品处理',
    icon: Award,
    color: 'success',
    count: 6,
    docs: ['质量检验流程', '不合格品管理', '纠正措施', '内部审核', '文档控制', '质量报表'],
  },
  {
    id: 'pm',
    title: 'PM项目管理',
    description: '项目立项、任务分配、进度跟踪',
    icon: Target,
    color: 'warning',
    count: 5,
    docs: ['项目创建与规划', '任务分配与跟踪', '里程碑管理', '项目预算控制', '风险识别与应对'],
  },
  {
    id: 'scm',
    title: 'SCM供应链',
    description: '供应商、采购、物流协同',
    icon: Truck,
    color: 'info',
    count: 5,
    docs: ['供应商管理', '采购计划', '订单协同', '物流追踪', '供应链报表'],
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
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchQuery);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  const { data: faqs = [], isLoading: faqsLoading } = useQuery<Faq[]>({
    queryKey: [...QUERY_KEYS.HELP.FAQS, 'home', 4],
    queryFn: async () => {
      const response = await helpApi.listFaqs({ page: 1, page_size: 4 });
      if (response.success && response.data) {
        return response.data.items;
      }
      return [];
    },
  });

  const { data: guides = [], isLoading: guidesLoading } = useQuery<Guide[]>({
    queryKey: [...QUERY_KEYS.HELP.GUIDES, 'home', 6],
    queryFn: async () => {
      const response = await helpApi.listGuides({ page: 1, page_size: 6 });
      if (response.success && response.data) {
        return response.data.items;
      }
      return [];
    },
  });

  const { data: searchFaqResults = [], isLoading: searchingFaqs } = useQuery<Faq[]>({
    queryKey: [...QUERY_KEYS.HELP.FAQS, 'search', debouncedSearch],
    queryFn: async () => {
      if (!debouncedSearch.trim()) return [];
      const response = await helpApi.listFaqs({ keyword: debouncedSearch, page: 1, page_size: 10 });
      if (response.success && response.data) {
        return response.data.items;
      }
      return [];
    },
    enabled: !!debouncedSearch.trim(),
  });

  const { data: searchGuideResults = [], isLoading: searchingGuides } = useQuery<Guide[]>({
    queryKey: [...QUERY_KEYS.HELP.GUIDES, 'search', debouncedSearch],
    queryFn: async () => {
      if (!debouncedSearch.trim()) return [];
      const response = await helpApi.listGuides({
        keyword: debouncedSearch,
        page: 1,
        page_size: 10,
      });
      if (response.success && response.data) {
        return response.data.items;
      }
      return [];
    },
    enabled: !!debouncedSearch.trim(),
  });

  const loading = faqsLoading || guidesLoading;
  const isSearching = searchingFaqs || searchingGuides;
  const searchResults = {
    faqs: searchFaqResults,
    guides: searchGuideResults,
  };

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

      {searchQuery.trim() && (
        <Box sx={{ mb: 8 }}>
          {isSearching ? (
            <Box sx={{ textAlign: 'center', py: 8 }}>
              <CircularProgress />
            </Box>
          ) : (
            <Box>
              <Typography
                variant='h5'
                sx={{ fontWeight: 600, mb: 4 }}
              >
                搜索结果："{searchQuery}"
              </Typography>
              {searchResults.faqs.length > 0 && (
                <Box sx={{ mb: 6 }}>
                  <Typography
                    variant='h6'
                    sx={{ fontWeight: 600, mb: 3 }}
                  >
                    常见问题 ({searchResults.faqs.length})
                  </Typography>
                  <Stack spacing={2}>
                    {searchResults.faqs.map((faq) => (
                      <Card
                        key={faq.id}
                        sx={{
                          borderRadius: 1,
                          cursor: 'pointer',
                          transition: 'box-shadow 0.2s',
                          '&:hover': { boxShadow: theme.shadows[2] },
                        }}
                      >
                        <CardContent>
                          <Typography variant='body1'>{faq.question}</Typography>
                        </CardContent>
                      </Card>
                    ))}
                  </Stack>
                </Box>
              )}
              {searchResults.guides.length > 0 && (
                <Box sx={{ mb: 6 }}>
                  <Typography
                    variant='h6'
                    sx={{ fontWeight: 600, mb: 3 }}
                  >
                    操作指南 ({searchResults.guides.length})
                  </Typography>
                  <Grid
                    container
                    spacing={3}
                  >
                    {searchResults.guides.slice(0, 4).map((guide) => (
                      <Grid
                        size={{ xs: 12, md: 6 }}
                        key={guide.id}
                      >
                        <Card
                          sx={{
                            height: '100%',
                            borderRadius: 1,
                            cursor: 'pointer',
                            transition: 'box-shadow 0.2s',
                            '&:hover': { boxShadow: theme.shadows[2] },
                          }}
                        >
                          <CardContent>
                            <Typography
                              variant='body1'
                              sx={{ fontWeight: 600 }}
                            >
                              {guide.title}
                            </Typography>
                            <Typography
                              variant='body2'
                              color='text.secondary'
                              sx={{ mt: 1 }}
                            >
                              {guide.description}
                            </Typography>
                          </CardContent>
                        </Card>
                      </Grid>
                    ))}
                  </Grid>
                </Box>
              )}
              {searchResults.faqs.length === 0 && searchResults.guides.length === 0 && (
                <Box sx={{ textAlign: 'center', py: 8 }}>
                  <Search
                    size={48}
                    sx={{ color: theme.palette.text.disabled, mx: 'auto', mb: 3 }}
                  />
                  <Typography
                    variant='h6'
                    sx={{ mb: 2 }}
                  >
                    未找到相关内容
                  </Typography>
                  <Typography
                    variant='body2'
                    color='text.secondary'
                  >
                    尝试更换关键词或选择其他分类
                  </Typography>
                </Box>
              )}
            </Box>
          )}
        </Box>
      )}

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
          {MODULE_CATEGORIES.map((category) => {
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
                  onClick={() => navigate(`${DASHBOARD_PATHS.helpGuide}?category=${category.id}`)}
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
                      {category.docs.slice(0, 3).map((doc, index) => (
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
                          {doc}
                        </Typography>
                      ))}
                      {category.docs.length > 3 && (
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
                    color={getTypeChip(update.type).color as any}
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
