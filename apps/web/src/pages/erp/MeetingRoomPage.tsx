import React from 'react';
import CrudPage from '@/components/templates/CrudPage';
import { createCrudPageAdapter } from '@/schema/crudPageAdapter';
import { meetingRoomSchema } from '@/schemas/erp/meetingRoom';
import { meetingRoomApi } from '@/api/erp';
import i18n from '@/i18n';

const meetingRoomApiAdapter = createCrudPageAdapter(meetingRoomApi);
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
