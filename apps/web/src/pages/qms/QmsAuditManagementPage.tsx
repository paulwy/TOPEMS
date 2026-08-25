import { designTokens } from '@topems/tokens';
import React from 'react';
import { Card, CardContent, Box, Typography } from '@mui/material';
import { FileText, CheckCircle } from 'lucide-react';
import CrudPage, { type CrudApiAdapter } from '@/components/templates/CrudPage';
import { auditSchema } from '@/schemas/qms';
import { auditApi } from '@/api/qms';
import type { AuditPlan } from '@/api/qms';
import i18n from '@/i18n';

const apiAdapter: CrudApiAdapter<AuditPlan> = {
  list: async () => {
    const res = await auditApi.listAuditPlans();
    if (!res.success) {
      throw new Error(res.message || i18n.t('qms.qms_audit_management_page.k0'));
    }
    const data = res.data || [];
    return { data, total: data.length };
  },
  create: async () => {
    throw new Error(i18n.t('qms.qms_audit_management_page.k1'));
  },
  update: async () => {
    throw new Error(i18n.t('qms.qms_audit_management_page.k2'));
  },
  delete: async () => {
    throw new Error(i18n.t('qms.qms_audit_management_page.k3'));
  },
};
function AuditStatsCards({ rows }: { rows: AuditPlan[] }) {
  const stats = {
    totalAudits: rows.length,
    completedAudits: rows.filter(
      (a) => a.status === 'completed' || a.status === i18n.t('qms.qms_audit_management_page.k4')
    ).length,
    inProgressAudits: rows.filter(
      (a) => a.status === 'in_progress' || a.status === i18n.t('qms.qms_audit_management_page.k5')
    ).length,
  };
  return (
    <Box
      sx={{
        display: 'grid',
        gridTemplateColumns: { xs: 'repeat(1, 1fr)', md: 'repeat(3, 1fr)' },
        gap: 2,
        mb: 4,
      }}
    >
      <Card>
        <CardContent sx={{ p: 2 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <Box
              sx={{
                width: 40,
                height: 40,
                bgcolor: 'primary.100',
                borderRadius: 3,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <FileText sx={{ width: 20, height: 20, color: 'primary.dark' }} />
            </Box>
            <Box>
              <Typography
                variant='body2'
                sx={{
                  color: 'slate.600',
                  fontSize: designTokens.typography.fontSize.scale['0.875rem'],
                }}
              >
                {i18n.t('pages.qms_audit_management_page.k0')}
              </Typography>
              <Typography
                variant='h5'
                sx={{ fontWeight: 700, color: 'slate.900' }}
              >
                {stats.totalAudits}
              </Typography>
            </Box>
          </Box>
        </CardContent>
      </Card>
      <Card>
        <CardContent sx={{ p: 2 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <Box
              sx={{
                width: 40,
                height: 40,
                bgcolor: 'secondary.100',
                borderRadius: 3,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <FileText sx={{ width: 20, height: 20, color: 'secondary.dark' }} />
            </Box>
            <Box>
              <Typography
                variant='body2'
                sx={{
                  color: 'slate.600',
                  fontSize: designTokens.typography.fontSize.scale['0.875rem'],
                }}
              >
                {i18n.t('pages.qms_audit_management_page.k1')}
              </Typography>
              <Typography
                variant='h5'
                sx={{ fontWeight: 700, color: 'slate.900' }}
              >
                {stats.inProgressAudits}
              </Typography>
            </Box>
          </Box>
        </CardContent>
      </Card>
      <Card>
        <CardContent sx={{ p: 2 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <Box
              sx={{
                width: 40,
                height: 40,
                bgcolor: 'success.lighter',
                borderRadius: 3,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <CheckCircle sx={{ width: 20, height: 20, color: 'success.dark' }} />
            </Box>
            <Box>
              <Typography
                variant='body2'
                sx={{
                  color: 'slate.600',
                  fontSize: designTokens.typography.fontSize.scale['0.875rem'],
                }}
              >
                {i18n.t('pages.qms_audit_management_page.k2')}
              </Typography>
              <Typography
                variant='h5'
                sx={{ fontWeight: 700, color: 'slate.900' }}
              >
                {stats.completedAudits}
              </Typography>
            </Box>
          </Box>
        </CardContent>
      </Card>
    </Box>
  );
}
const QmsAuditManagementPage: React.FC = () => {
  return (
    <CrudPage
      schema={auditSchema}
      apiAdapter={apiAdapter}
      breadcrumbs={[{ label: 'QMS' }, { label: i18n.t('qms.qms_audit_management_page.k6') }]}
      headerContent={(rows) => <AuditStatsCards rows={rows as AuditPlan[]} />}
      detailMaxWidth='lg'
    />
  );
};
export default QmsAuditManagementPage;
