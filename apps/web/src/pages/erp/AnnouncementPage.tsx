/**
 * 公告管理页面 — Schema 驱动的 CRUD 页面
 *
 * 已使用 `createCrudPageAdapter` 帮助函数，
 * 将原本 30 行的 adapter 样板代码压缩为 1 行。
 */
import React from 'react';
import CrudPage from '@/components/templates/CrudPage';
import { createCrudPageAdapter } from '@/schema/crudPageAdapter';
import { announcementSchema } from '@/schemas/erp/announcement';
import { announcementApi } from '@/api/erp';
import { QUERY_KEYS } from '@/lib/reactQuery';
import { useQuery } from '@tanstack/react-query';
import { Box, Typography } from '@mui/material';
import { Bell } from 'lucide-react';
import i18n from '@/i18n';
const AnnouncementStats: React.FC = () => {
  const { data } = useQuery({
    queryKey: [QUERY_KEYS.ERP.ANNOUNCEMENTS, 'stats'],
    queryFn: async () => {
      const response = await announcementApi.list({ page: 0, pagesize: 1000 });
      if (!response.success) throw new Error(i18n.t('erp.announcement_page.k0'));
      return response.data;
    },
    staleTime: 5 * 60 * 1000,
  });
  const announcements = data?.items || [];
  const total = announcements.length;
  const published = announcements.filter((a) => a.status === 'published').length;
  const drafts = announcements.filter((a) => a.status === 'draft').length;
  const urgent = announcements.filter((a) => a.priority === 'urgent').length;
  const stats = [
    { label: i18n.t('erp.announcement_page.k1'), value: total, color: 'secondary[100]', textColor: 'secondary.700' },
    { label: i18n.t('erp.announcement_page.k2'), value: published, color: 'success.lighter', textColor: 'success.700' },
    { label: i18n.t('erp.announcement_page.k3'), value: drafts, color: 'warning.light', textColor: 'warning.700' },
    { label: i18n.t('erp.announcement_page.k4'), value: urgent, color: 'error.lighter', textColor: 'error.dark' },
  ];
  return (
    <Box
      sx={{
        display: 'grid',
        gridTemplateColumns: { xs: 'repeat(2, 1fr)', md: 'repeat(4, 1fr)' },
        gap: 2,
        mb: 3,
      }}
    >
      {stats.map((stat) => (
        <Box
          key={stat.label}
          sx={{ p: 2, bgcolor: stat.color, borderRadius: 3 }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
            <Bell
              size={18}
              sx={{ color: stat.textColor }}
            />
            <Typography
              variant='body2'
              sx={{ color: 'text.secondary', fontSize: 14 }}
            >
              {stat.label}
            </Typography>
          </Box>
          <Typography
            variant='h5'
            sx={{ fontWeight: 700, color: stat.textColor }}
          >
            {stat.value}
          </Typography>
        </Box>
      ))}
    </Box>
  );
};
const announcementAdapter = createCrudPageAdapter(announcementApi);
const AnnouncementPage: React.FC = () => {
  return (
    <CrudPage
      schema={announcementSchema}
      apiAdapter={announcementAdapter}
      breadcrumbs={[
        { label: i18n.t('erp.announcement_page.k5'), href: '/dashboard' },
        { label: 'ERP', href: '/erp' },
        { label: i18n.t('erp.announcement_page.k6') },
      ]}
      headerContent={<AnnouncementStats />}
    />
  );
};
export default AnnouncementPage;