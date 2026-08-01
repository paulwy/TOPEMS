import React from 'react';
import { Box, Typography, Card, CardContent, Chip } from '@mui/material';
import { CreditCard } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import CrudPage, { type CrudApiAdapter } from '@/components/templates/CrudPage';
import { tenantInvoiceSchema } from '@/schemas/admin';
import type { Tenant, TenantInvoice } from '@/api/tenant/types';

interface TenantBillingTabProps {
  tenant: Tenant;
  invoices: TenantInvoice[];
}

const TenantBillingTab: React.FC<TenantBillingTabProps> = ({ tenant, invoices }) => {
  const { t } = useTranslation();
  const planLabels: Record<string, string> = {
    free: t('admin.tenant_detail.free_edition'),
    basic: t('admin.tenant_detail.basic_edition'),
    professional: t('admin.tenant_detail.pro_edition'),
    enterprise: t('admin.tenant_detail.enterprise_edition'),
  };

  return (
    <Box>
      <Card
        variant='outlined'
        sx={{ mb: 3 }}
      >
        <CardContent>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
            <CreditCard size={20} />
            <Typography
              variant='h6'
              sx={{ fontWeight: 600 }}
            >
              {t('admin.tenant_detail_page.text_5b6572')}
            </Typography>
          </Box>
          <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 2 }}>
            <Box>
              <Typography
                variant='body2'
                color='text.secondary'
              >
                {t('admin.tenant_detail_page.text_66b579')}
              </Typography>
              <Typography
                variant='h6'
                sx={{ fontWeight: 600 }}
              >
                {planLabels[tenant.plan]}
              </Typography>
            </Box>
            <Box>
              <Typography
                variant='body2'
                color='text.secondary'
              >
                {t('admin.tenant_detail_page.text_9e72dd')}
              </Typography>
              <Typography
                variant='h6'
                sx={{ fontWeight: 600 }}
              >
                2024-01-15
              </Typography>
            </Box>
            <Box>
              <Typography
                variant='body2'
                color='text.secondary'
              >
                {t('admin.tenant_detail_page.text_3fea7c')}
              </Typography>
              <Chip
                label={t('admin.tenant_detail.normal')}
                color='success'
                size='small'
              />
            </Box>
          </Box>
        </CardContent>
      </Card>

      <CrudPage
        schema={tenantInvoiceSchema}
        apiAdapter={
          {
            list: async () => ({ data: invoices, total: invoices.length }),
            create: async () => ({}) as TenantInvoice,
            update: async () => ({}) as TenantInvoice,
            delete: async () => {},
          } as unknown as CrudApiAdapter<Record<string, unknown>>
        }
        breadcrumbs={[]}
        headerContent={
          <Typography variant='h6'>{t('admin.tenant_detail.billing_history')}</Typography>
        }
      />
    </Box>
  );
};

export default TenantBillingTab;
