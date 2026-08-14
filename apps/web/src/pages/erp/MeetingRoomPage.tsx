import React from 'react';
import CrudPage, { type CrudApiAdapter } from '@/components/templates/CrudPage';
import { meetingRoomSchema } from '@/schemas/erp/meetingRoom';
import { meetingRoomApi } from '@/api/erp';
import i18n from '@/i18n';
const meetingRoomApiAdapter: CrudApiAdapter = {
  list: async (params) => {
    const response = await meetingRoomApi.list({
      page: params?.page,
      pagesize: params?.pageSize,
      search: params?.search,
      status: params?.status as string | undefined,
    });
    if (!response.success) {
      throw new Error(i18n.t('erp.meeting_room_page.k0'));
    }
    const data = response.data;
    return {
      data: (data?.items || []) as unknown as Record<string, unknown>[],
      total: data?.total || 0,
    };
  },
  create: async (data) => {
    const response = await meetingRoomApi.create(
      data as unknown as Parameters<typeof meetingRoomApi.create>[0]
    );
    if (!response.success) {
      throw new Error(i18n.t('erp.meeting_room_page.k1'));
    }
    return response.data as unknown as Record<string, unknown>;
  },
  update: async (id, data) => {
    const response = await meetingRoomApi.update(
      id,
      data as unknown as Parameters<typeof meetingRoomApi.update>[1]
    );
    if (!response.success) {
      throw new Error(i18n.t('erp.meeting_room_page.k2'));
    }
    return response.data as unknown as Record<string, unknown>;
  },
  delete: async (id) => {
    const response = await meetingRoomApi.delete(id);
    if (!response.success) {
      throw new Error(i18n.t('erp.meeting_room_page.k3'));
    }
  },
};
const MeetingRoomPage: React.FC = () => {
  return (
    <CrudPage
      schema={meetingRoomSchema}
      apiAdapter={meetingRoomApiAdapter}
      breadcrumbs={[
        { label: i18n.t('erp.meeting_room_page.k4'), href: '/dashboard' },
        { label: 'ERP', href: '/erp' },
        { label: i18n.t('erp.meeting_room_page.k5') },
      ]}
    />
  );
};
export default MeetingRoomPage;