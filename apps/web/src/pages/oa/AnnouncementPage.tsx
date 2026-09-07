import React, { useMemo, useState } from 'react';
import { Typography } from '@mui/material';
import { Calendar, User, Tag } from 'lucide-react';
import { ListPageTemplate } from '@/components/templates';
import type { ColumnDef } from '@/components/templates/list/types';
import { useTranslation } from 'react-i18next';

type Announcement = {
  id: string;
  title: string;
  content: string;
  author: string;
  created_at: string;
  category: string;
  status: string;
};

export const AnnouncementPage: React.FC = () => {
  const { t } = useTranslation('oa');
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(10);

  // TODO: replace with real API integration when backend OA service is ready（svc 无 oa 模块，mobile 仅有 announcements 3 接口）
  const data: Announcement[] = [];
  const isLoading = false;

  const columns: ColumnDef<Announcement>[] = useMemo(
    () => [
      {
        id: 'title',
        label: t('oa.announcement_page.col_title'),
        render: (row) => <Typography sx={{ fontWeight: 500 }}>{row.title}</Typography>,
      },
      {
        id: 'category',
        label: t('oa.announcement_page.col_category'),
        render: (row) => (
          <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <Tag size={14} />
            {row.category}
          </span>
        ),
      },
      {
        id: 'author',
        label: t('oa.announcement_page.col_author'),
        render: (row) => (
          <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <User size={14} />
            {row.author}
          </span>
        ),
      },
      {
        id: 'created_at',
        label: t('oa.announcement_page.col_created_at'),
        render: (row) => (
          <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <Calendar size={14} />
            {row.created_at}
          </span>
        ),
      },
      {
        id: 'status',
        label: t('oa.announcement_page.col_status'),
        render: (row) => <span>{row.status}</span>,
      },
    ],
    [t]
  );

  return (
    <ListPageTemplate<Announcement>
      title={t('oa.announcement_page.k0')}
      columns={columns}
      data={data}
      loading={isLoading}
      pagination={{
        page,
        pageSize,
        total: data.length,
        onPageChange: setPage,
        onPageSizeChange: setPageSize,
      }}
      emptyMessage={t('pages.announcement_page.k0')}
    />
  );
};

export default AnnouncementPage;
