import React from 'react';
import CrudPage, { type CrudApiAdapter } from '@/components/templates/CrudPage';
import { meetingRoomSchema } from '@/schemas/erp/meetingRoom';
import { meetingRoomApi } from '@/api/erp';

const meetingRoomApiAdapter: CrudApiAdapter = {
  list: async (params) => {
    const response = await meetingRoomApi.list({
      page: params?.page,
      pagesize: params?.pageSize,
      search: params?.search,
      status: params?.status as string | undefined,
    });
    if (!response.success) {
      throw new Error('加载会议室列表失败');
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
      throw new Error('创建会议室失败');
    }
    return response.data as unknown as Record<string, unknown>;
  },

  update: async (id, data) => {
    const response = await meetingRoomApi.update(
      id,
      data as unknown as Parameters<typeof meetingRoomApi.update>[1]
    );
    if (!response.success) {
      throw new Error('更新会议室失败');
    }
    return response.data as unknown as Record<string, unknown>;
  },

  delete: async (id) => {
    const response = await meetingRoomApi.delete(id);
    if (!response.success) {
      throw new Error('删除会议室失败');
    }
  },
};

const MeetingRoomPage: React.FC = () => {
  return (
    <CrudPage
      schema={meetingRoomSchema}
      apiAdapter={meetingRoomApiAdapter}
      breadcrumbs={[
        { label: '首页', href: '/dashboard' },
        { label: 'ERP', href: '/erp' },
        { label: '会议室管理' },
      ]}
    />
  );
};

export default MeetingRoomPage;
