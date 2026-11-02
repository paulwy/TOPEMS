import React, { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { PageContainer } from '@/components/common';
import { DashboardTemplate } from '@/components/templates';
import type { StatCard, ChartCard, QuickAction } from '@/components/templates';
import { useTranslation } from 'react-i18next';
import { MessageSquare, Users, User, Hash } from 'lucide-react';
import { imApi, type ChatRoom } from '@/api/im';

export const DashboardPage: React.FC = () => {
  const { t } = useTranslation('im');

  const { data: rooms = [] } = useQuery<ChatRoom[]>({
    queryKey: ['im-rooms'],
    queryFn: async () => {
      const res = await imApi.listChatRooms();
      const arr = res.data as unknown;
      return Array.isArray(arr) ? (arr as ChatRoom[]) : [];
    },
  });

  const stats: StatCard[] = useMemo(() => {
    const total = rooms.length;
    const groups = rooms.filter((r) => r.room_type === 'group').length;
    const direct = rooms.filter((r) => r.room_type === 'direct' || r.room_type === 'private').length;
    const members = rooms.reduce((acc, r) => acc + (r.members?.length ?? 0), 0);
    return [
      {
        id: 'total-rooms',
        title: t('im.dashboard_page.k3'),
        value: String(total),
        icon: <MessageSquare size={20} />,
        change: 0,
        changeLabel: t('im.dashboard_page.k4'),
        color: 'primary',
      },
      {
        id: 'group-rooms',
        title: t('im.dashboard_page.k5'),
        value: String(groups),
        icon: <Users size={20} />,
        change: 0,
        changeLabel: t('im.dashboard_page.k6'),
        color: 'info',
      },
      {
        id: 'direct-rooms',
        title: t('im.dashboard_page.k7'),
        value: String(direct),
        icon: <User size={20} />,
        change: 0,
        changeLabel: t('im.dashboard_page.k8'),
        color: 'success',
      },
      {
        id: 'total-members',
        title: t('im.dashboard_page.k9'),
        value: String(members),
        icon: <Hash size={20} />,
        change: 0,
        changeLabel: t('im.dashboard_page.k10'),
        color: 'warning',
      },
    ];
  }, [rooms, t]);

  const charts: ChartCard[] = [];
  const quickActions: QuickAction[] = [];

  return (
    <PageContainer
      title={t('im.dashboard_page.k0')}
      subtitle={t('im.dashboard_page.k1')}
      padding={false}
      maxWidth={false}
    >
      <DashboardTemplate
        autoTitle={false}
        title=''
        subtitle=''
        stats={stats}
        charts={charts}
        quickActions={quickActions}
        quickActionsTitle={t('im.dashboard_page.k2')}
        loading={false}
      />
    </PageContainer>
  );
};

export default DashboardPage;
