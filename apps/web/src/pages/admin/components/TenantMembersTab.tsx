import React from 'react';
import { Box, Typography, Button } from '@mui/material';
import { UserPlus } from 'lucide-react';
import CrudPage, { type CrudApiAdapter } from '@/components/templates/CrudPage';
import { tenantUserSchema } from '@/schemas/admin';
import { tenantApi } from '@/api/tenant';
import type { TenantUser, TenantRole } from '@/api/tenant/types';
import i18n from '@/i18n';

interface TenantMembersTabProps {
  users: TenantUser[];
  tenantId?: string;
  onInviteClick: () => void;
}
const TenantMembersTab: React.FC<TenantMembersTabProps> = ({ users, tenantId, onInviteClick }) => {
  return (
    <CrudPage
      schema={tenantUserSchema}
      apiAdapter={
        {
          list: async () => ({ data: users, total: users.length }),
          create: async () => ({}) as TenantUser,
          update: async (id: string, data: Partial<Record<string, unknown>>) => {
            if (data.role && tenantId) {
              await tenantApi.updateMemberRole(tenantId, id, { role: data.role as TenantRole });
            }
            return {} as TenantUser;
          },
          delete: async (id: string) => {
            if (tenantId) {
              await tenantApi.removeMember(tenantId, id);
            }
          },
        } as unknown as CrudApiAdapter<Record<string, unknown>>
      }
      breadcrumbs={[]}
      headerContent={
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
          <Typography variant='h6'> {i18n.t('admin.tenant_detail.member_management')} </Typography>
          <Button
            variant='contained'
            startIcon={<UserPlus size={18} />}
            onClick={onInviteClick}
          >
            {i18n.t('admin.tenant_detail_page.text_e39cf1')}
          </Button>
        </Box>
      }
    />
  );
};
export default TenantMembersTab;
