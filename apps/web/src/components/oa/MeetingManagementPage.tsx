import React from 'react';
import { useTranslation } from 'react-i18next';
import { UserPlus, UserMinus } from 'lucide-react';
import { ListPageTemplate } from '@/components/templates';
import type { ColumnDef } from '@/components/templates';
import type { FilterConfig } from '@topems/shared-components';
import type { CrudOperations } from '@/hooks';
import type { RowAction } from '@/components/templates/list/types';
import { oaApi, type Meeting } from '@/api/mobile';
import { useQueryClient } from '@tanstack/react-query';

const formatDateTime = (value: string) =>
  new Intl.DateTimeFormat('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(value));

export const MeetingManagementPage: React.FC = () => {
  const { t } = useTranslation('oa');
  const queryClient = useQueryClient();

  const crudApi: CrudOperations<Meeting> = {
    list: async (params) => {
      const res = await oaApi.listMeetings({
        page: params?.page as number,
        page_size: params?.pageSize as number,
        status: params?.status as Meeting['status'],
        start_date: params?.startDate as string,
        end_date: params?.endDate as string,
      });
      const data = res.success && res.data ? res.data.items : [];
      const total = res.success && res.data ? res.data.total : 0;
      return { success: true, code: 0, message: '', data: { items: data, total } };
    },
    get: async (id) => {
      const res = await oaApi.getMeeting(id);
      return { success: res.success, code: 0, message: '', data: res.data };
    },
    create: async (data) => {
      const res = await oaApi.createMeeting(data as Parameters<typeof oaApi.createMeeting>[0]);
      return { success: res.success, code: 0, message: '', data: res.data };
    },
    update: async (id, data) => {
      const res = await oaApi.updateMeeting(id, data);
      return { success: res.success, code: 0, message: '', data: res.data };
    },
    delete: async (id) => {
      await oaApi.deleteMeeting(id);
      return { success: true, code: 0, message: '', data: '' };
    },
  };

  const rowActions: RowAction<Meeting>[] = [
    {
      key: 'join',
      label: t('oa.join'),
      icon: <UserPlus size={16} />,
      show: (row) => row.status === 'scheduled',
      onClick: async (row) => {
        await oaApi.joinMeeting(row.id);
        queryClient.invalidateQueries({ queryKey: ['oa-meetings'] });
      },
    },
    {
      key: 'leave',
      label: t('oa.leave'),
      icon: <UserMinus size={16} />,
      show: (row) => row.status === 'in_progress' || row.status === 'scheduled',
      onClick: async (row) => {
        await oaApi.leaveMeeting(row.id);
        queryClient.invalidateQueries({ queryKey: ['oa-meetings'] });
      },
    },
  ];

  const columns: ColumnDef<Meeting>[] = [
    { id: 'title', label: t('oa.meeting_management_page.k1'), width: 200 },
    {
      id: 'type',
      label: t('oa.meeting_management_page.k2'),
      width: 120,
      render: (row) => t(`oa.meeting_type.${row.type}`),
    },
    {
      id: 'status',
      label: t('oa.meeting_management_page.k3'),
      width: 120,
      render: (row) => t(`oa.meeting_status.${row.status}`),
    },
    {
      id: 'start_time',
      label: t('oa.meeting_management_page.k4'),
      width: 160,
      render: (row) => formatDateTime(row.start_time),
    },
    {
      id: 'end_time',
      label: t('oa.meeting_management_page.k5'),
      width: 160,
      render: (row) => formatDateTime(row.end_time),
    },
    { id: 'location', label: t('oa.meeting_management_page.k6'), width: 160 },
    { id: 'organizer_name', label: t('oa.meeting_management_page.k7'), width: 120 },
    {
      id: 'attendees_count',
      label: t('oa.meeting_management_page.k8'),
      width: 100,
      render: (row) => row.attendees?.length ?? 0,
    },
  ];

  const filters: FilterConfig[] = [
    {
      id: 'status',
      label: t('oa.meeting_management_page.k3'),
      type: 'select',
      options: [
        { label: t('oa.meeting_status.scheduled'), value: 'scheduled' },
        { label: t('oa.meeting_status.in_progress'), value: 'in_progress' },
        { label: t('oa.meeting_status.completed'), value: 'completed' },
        { label: t('oa.meeting_status.cancelled'), value: 'cancelled' },
      ],
    },
    {
      id: 'type',
      label: t('oa.meeting_management_page.k2'),
      type: 'select',
      options: [
        { label: t('oa.meeting_type.internal'), value: 'internal' },
        { label: t('oa.meeting_type.external'), value: 'external' },
        { label: t('oa.meeting_type.recurring'), value: 'recurring' },
      ],
    },
    { id: 'startDate', label: t('oa.meeting_management_page.k9'), type: 'date' },
    { id: 'endDate', label: t('oa.meeting_management_page.k10'), type: 'date' },
  ];

  return (
    <ListPageTemplate<Meeting>
      title={t('oa.meeting_management_page.k0')}
      data={[]}
      crud={{
        api: crudApi,
        queryKey: 'oa-meetings',
        searchParamName: 'search',
      }}
      columns={columns}
      filters={filters}
      rowActions={rowActions}
    />
  );
};

export default MeetingManagementPage;
