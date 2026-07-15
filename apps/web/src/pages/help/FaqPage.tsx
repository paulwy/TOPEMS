import React, { useState, useCallback, useRef } from 'react';
import {
  Box,
  Typography,
  Grid,
  Stack,
  TextField,
  Chip,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  useTheme,
  Button,
  CircularProgress,
} from '@mui/material';
import { Search, ChevronDown, Tag, ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { PageContainer } from '@/components/common';
import { useTranslation } from 'react-i18next';
import { DASHBOARD_PATHS } from '@/routes/dashboard';
import { helpApi } from '@/api';
import type { Faq } from '@/api/help';
import { useQuery } from '@tanstack/react-query';
import { useNotificationStore } from '@/store';
import { apiLogger } from '@/utils/logger';

interface FAQ_CATEGORIES {
  id: string;
  name: string;
  icon: string;
}

const FAQ_CATEGORIES: FAQ_CATEGORIES[] = [
  { id: 'all', name: '全部', icon: '📋' },
  { id: 'account', name: '账户相关', icon: '👤' },
  { id: 'workflow', name: '审批流程', icon: '📝' },
  { id: 'hrm', name: '人力资源', icon: '👥' },
  { id: 'finance', name: '财务管理', icon: '💰' },
  { id: 'system', name: '系统设置', icon: '⚙️' },
];

const debounce = <T extends (...args: unknown[]) => void>(func: T, delay: number): T => {
  let timer: ReturnType<typeof setTimeout> | null = null;
  return ((...args: unknown[]) => {
    if (timer) clearTimeout(timer);
    timer = setTimeout(() => func(...args), delay);
  }) as T;
};

export const FaqPage: React.FC = () => {
  const { t } = useTranslation();
  const theme = useTheme();
  const navigate = useNavigate();
  const { addNotification } = useNotificationStore();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');

  const faqsQuery = useQuery<Faq[]>({
    queryKey: ['help-faqs', selectedCategory, searchQuery],
    queryFn: async () => {
      const params = {
        category: selectedCategory === 'all' ? undefined : selectedCategory,
        keyword: searchQuery || undefined,
        page: 1,
        page_size: 50,
      };
      const response = await helpApi.listFaqs(params);
      if (response.success && response.data) {
        return response.data.items || [];
      }
      return [];
    },
    staleTime: 5 * 60 * 1000,
  });
  const faqs = faqsQuery.data || [];
  const loading = faqsQuery.isLoading;

  const categoriesQuery = useQuery<string[]>({
    queryKey: ['help-faq-categories'],
    queryFn: async () => {
      const response = await helpApi.getFaqCategories();
      if (response.success && response.data) {
        return response.data;
      }
      return [];
    },
    staleTime: 5 * 60 * 1000,
  });
  const categories = categoriesQuery.data || [];

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
    if (categoriesQuery.isError) {
      apiLogger.error('获取FAQ分类失败:', categoriesQuery.error);
    }
  }, [categoriesQuery.isError, categoriesQuery.error, apiLogger]);

  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value);
  };

  const getCategoryName = (categoryId: string) => {
    const category = FAQ_CATEGORIES.find((c) => c.id === categoryId);
    return category ? category.name : categoryId;
  };

  return (
    <PageContainer
      title={t('help_center.faq')}
      subtitle={t('help_center.faq_subtitle')}
      headerProps={{ pageIcon: <Tag size={20} /> }}
    >
      <Box sx={{ mb: 4 }}>
        <Button
          sx={{ textTransform: 'none' }}
          onClick={() => navigate(DASHBOARD_PATHS.helpCenter)}
        >
          <ArrowLeft size={16} sx={{ mr: 1 }} />
          返回帮助中心
        </Button>
      </Box>

      <Box sx={{ mb: 6 }}>
        <Box sx={{ maxWidth: 600, mx: 'auto', position: 'relative' }}>
          <Search sx={{ position: 'absolute', left: 16, top: '50%', transform: 'translateY(-50%)', color: theme.palette.text.disabled }} />
          <TextField
            fullWidth
            placeholder={t('help_center.search_placeholder')}
            value={searchQuery}
            onChange={handleSearch}
            sx={{ pl: 10 }}
          />
        </Box>
      </Box>

      <Box sx={{ mb: 6 }}>
        <Typography variant='body2' color='text.secondary' sx={{ mb: 2 }}>
          {t('help_center.filter_category')}
        </Typography>
        <Stack direction='row' spacing={2} sx={{ flexWrap: 'wrap' }}>
          <Chip
            key='all'
            label={`📋 全部`}
            onClick={() => setSelectedCategory('all')}
            color={selectedCategory === 'all' ? 'primary' : 'default'}
            sx={{ cursor: 'pointer', fontWeight: selectedCategory === 'all' ? 600 : 400 }}
          />
          {[...new Set(categories)].map((category) => (
            <Chip
              key={category}
              label={`${FAQ_CATEGORIES.find(c => c.id === category)?.icon || '📄'} ${getCategoryName(category)}`}
              onClick={() => setSelectedCategory(category)}
              color={selectedCategory === category ? 'primary' : 'default'}
              sx={{ cursor: 'pointer', fontWeight: selectedCategory === category ? 600 : 400 }}
            />
          ))}
        </Stack>
      </Box>

      {loading ? (
        <Box sx={{ textAlign: 'center', py: 12 }}>
          <CircularProgress />
        </Box>
      ) : (
        <>
          <Typography variant='body2' color='text.secondary' sx={{ mb: 4 }}>
            {t('help_center.found')} {faqs.length} {t('help_center.results')}
          </Typography>

          <Grid container spacing={3}>
            <Grid size={{ xs: 12 }}>
              <Stack spacing={2}>
                {faqs.map((faq) => (
                  <Accordion
                    key={faq.id}
                    sx={{ borderRadius: 1, '&:before': { display: 'none' } }}
                  >
                    <AccordionSummary
                      expandIcon={<ChevronDown sx={{ color: theme.palette.text.disabled }} />}
                      sx={{ '&:hover': { bgcolor: theme.palette.action.hover } }}
                    >
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, flex: 1 }}>
                        <Tag size={16} sx={{ color: theme.palette.primary.main }} />
                        <Typography variant='body1' sx={{ fontWeight: 500 }}>
                          {faq.question}
                        </Typography>
                      </Box>
                      <Box sx={{ display: 'flex', gap: 3, alignItems: 'center' }}>
                        <Chip
                          size='small'
                          label={getCategoryName(faq.category)}
                          sx={{ fontWeight: 400 }}
                        />
                        <Typography variant='body2' color='text.secondary'>
                          查看 {faq.views.toLocaleString()}
                        </Typography>
                      </Box>
                    </AccordionSummary>
                    <AccordionDetails>
                      <Typography variant='body2' color='text.secondary'>
                        {faq.answer}
                      </Typography>
                    </AccordionDetails>
                  </Accordion>
                ))}
              </Stack>
            </Grid>
          </Grid>

          {faqs.length === 0 && (
            <Box sx={{ textAlign: 'center', py: 12 }}>
              <Search size={48} sx={{ color: theme.palette.text.disabled, mx: 'auto', mb: 3 }} />
              <Typography variant='h6' sx={{ mb: 2 }}>
                {t('help_center.no_results')}
              </Typography>
              <Typography variant='body2' color='text.secondary'>
                {t('help_center.try_different')}
              </Typography>
            </Box>
          )}
        </>
      )}
    </PageContainer>
  );
};

export default FaqPage;