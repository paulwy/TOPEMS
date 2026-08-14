import React, { useMemo } from 'react';
import {
  Box,
  Typography,
  Card,
  CardHeader,
  CardContent,
  Avatar,
  Chip,
  Divider,
} from '@mui/material';
import { useQuery } from '@tanstack/react-query';
import { Building, Folder, Phone, Mail, Globe } from 'lucide-react';
import CrudPage, { type CrudApiAdapter } from '@/components/templates/CrudPage';
import type { RowAction } from '@/components/templates/list/types';
import { PageContainer } from '@/components/common';
import { useNotificationStore } from '@/store';
import { designTokens } from '@/theme/tokens';
import { companyApi, departmentApi, employeeApi, type Company } from '@/api/hrm';
import { companySchema } from '@/schemas/hrm';

import { QUERY_KEYS } from '@/lib/reactQuery';
import { useTranslation } from 'react-i18next';
import i18n from '@/i18n';

const ct = designTokens.colors;

const HrmCompanyPage: React.FC = () => {
  const { t } = useTranslation('hrm');
  const { addNotification } = useNotificationStore();

  const { data: departments = [] } = useQuery({
    queryKey: QUERY_KEYS.AD_HOC.HRM_DEPARTMENTS_BASE,
    queryFn: async () => {
      const res = await departmentApi.list({ pagesize: 500 });
      if (res.success && res.data) {
        return res.data.items || [];
      }
      return [];
    },
    staleTime: 5 * 60 * 1000,
  });

  const { data: employees = [] } = useQuery({
    queryKey: QUERY_KEYS.AD_HOC.HRM_EMPLOYEES_BASE,
    queryFn: async () => {
      const res = await employeeApi.list({ pagesize: 500 });
      if (res.success && res.data) {
        return res.data.items || [];
      }
      return [];
    },
    staleTime: 5 * 60 * 1000,
  });

  const apiAdapter: CrudApiAdapter<Company> = useMemo(
    () => ({
      list: async (params) => {
        const res = await companyApi.list(
          params as unknown as Parameters<typeof companyApi.list>[0]
        );
        if (res.success && res.data) {
          return { data: res.data.items as Company[], total: res.data.total as number };
        }
        return { data: [], total: 0 };
      },
      create: async (data) => {
        const res = await companyApi.create(data as Partial<Company>);
        if (res.success && res.data) {
          addNotification({
            title: t('hrm.hrm_company_page.k1'),
            message: t('hrm.hrm_company_page.k0'),
            type: 'success',
          });
          return res.data as Company;
        }
        throw new Error(res.message || t('hrm.hrm_company_page.k2'));
      },
      update: async (id, data) => {
        const res = await companyApi.update(id, data as Partial<Company>);
        if (res.success && res.data) {
          addNotification({
            title: t('hrm.hrm_company_page.k4'),
            message: t('hrm.hrm_company_page.k3'),
            type: 'success',
          });
          return res.data as Company;
        }
        throw new Error(res.message || t('hrm.hrm_company_page.k5'));
      },
      delete: async (id) => {
        const res = await companyApi.delete(id);
        if (res.success) {
          addNotification({
            title: t('hrm.hrm_company_page.k7'),
            message: t('hrm.hrm_company_page.k6'),
            type: 'success',
          });
        } else {
          throw new Error(res.message || t('hrm.hrm_company_page.k8'));
        }
      },
    }),
    [addNotification]
  );

  const customRowActions: RowAction[] = useMemo(
    () => [
      {
        key: 'view-detail',
        label: i18n.t('hrm.hrm_company_page.k9'),
        icon: <Building size={16} />,
        color: 'primary',
      },
    ],
    []
  );

  const renderHeaderContent = (rows: Company[]) => {
    const total = rows.length;
    const active = rows.filter((r) => r.status === 'active').length;
    const inactive = rows.filter((r) => r.status === 'inactive').length;
    const archived = rows.filter((r) => r.status === 'archived').length;

    return (
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: { xs: 'repeat(2, 1fr)', md: 'repeat(4, 1fr)' },
          gap: 2,
          mb: 3,
        }}
      >
        <Box sx={{ p: 2, bgcolor: 'primary.lighter', borderRadius: 3 }}>
          <Typography
            variant='body2'
            sx={{ color: 'text.secondary' }}
          >
            {t('hrm.hrm_company_page.e1')}
          </Typography>
          <Typography
            variant='h5'
            sx={{ fontWeight: 700 }}
          >
            {total}
          </Typography>
        </Box>
        <Box sx={{ p: 2, bgcolor: 'success.lighter', borderRadius: 3 }}>
          <Typography
            variant='body2'
            sx={{ color: 'text.secondary' }}
          >
            {t('hrm.hrm_company_page.e2')}
          </Typography>
          <Typography
            variant='h5'
            sx={{ fontWeight: 700, color: 'success.main' }}
          >
            {active}
          </Typography>
        </Box>
        <Box sx={{ p: 2, bgcolor: 'grey.100', borderRadius: 3 }}>
          <Typography
            variant='body2'
            sx={{ color: 'text.secondary' }}
          >
            {t('hrm.hrm_company_page.e3')}
          </Typography>
          <Typography
            variant='h5'
            sx={{ fontWeight: 700, color: 'text.secondary' }}
          >
            {inactive}
          </Typography>
        </Box>
        <Box sx={{ p: 2, bgcolor: 'warning.lighter', borderRadius: 3 }}>
          <Typography
            variant='body2'
            sx={{ color: 'text.secondary' }}
          >
            {t('hrm.hrm_company_page.e4')}
          </Typography>
          <Typography
            variant='h5'
            sx={{ fontWeight: 700, color: 'warning.main' }}
          >
            {archived}
          </Typography>
        </Box>
      </Box>
    );
  };

  const detailViewContent = (row: Record<string, unknown>) => {
    const company = row as unknown as Company;
    const companyDepts = departments.filter((d) => d.org_id === company.id);
    const companyEmps = employees.filter((e) => e.org_id === company.id);

    return (
      <Box>
        <Card sx={{ mb: 3 }}>
          <CardHeader
            sx={{
              pb: 2,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
            title={
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <Avatar sx={{ width: 48, height: 48, bgcolor: 'primary.main' }}>
                  <Building sx={{ width: 24, height: 24 }} />
                </Avatar>
                <Box>
                  <Typography
                    variant='h6'
                    sx={{ fontWeight: 600 }}
                  >
                    {company.name}
                  </Typography>
                  {company.short_name && (
                    <Typography
                      variant='body2'
                      color='text.secondary'
                    >
                      {company.short_name}
                    </Typography>
                  )}
                </Box>
              </Box>
            }
            action={
              <Chip
                size='small'
                color={company.status === 'active' ? 'success' : 'default'}
                label={
                  company.status === 'active'
                    ? t('hrm.hrm_company_page.k10')
                    : company.status === 'inactive'
                      ? t('hrm.hrm_company_page.k11')
                      : t('hrm.hrm_company_page.k12')
                }
                variant='outlined'
              />
            }
          />
          <CardContent>
            <Box
              sx={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                gap: 2,
                mb: 3,
              }}
            >
              <Box sx={{ bgcolor: 'grey.50', borderRadius: 3, p: 2 }}>
                <Typography
                  variant='caption'
                  color='text.secondary'
                >
                  {t('hrm.hrm_company_page.e5')}
                </Typography>
                <Typography
                  variant='h5'
                  sx={{ fontWeight: 700 }}
                >
                  {companyDepts.length}
                </Typography>
              </Box>
              <Box sx={{ bgcolor: 'grey.50', borderRadius: 3, p: 2 }}>
                <Typography
                  variant='caption'
                  color='text.secondary'
                >
                  {t('hrm.hrm_company_page.e6')}
                </Typography>
                <Typography
                  variant='h5'
                  sx={{ fontWeight: 700 }}
                >
                  {companyEmps.length}
                </Typography>
              </Box>
              {company.registration_number && (
                <Box sx={{ bgcolor: 'grey.50', borderRadius: 3, p: 2 }}>
                  <Typography
                    variant='caption'
                    color='text.secondary'
                  >
                    {t('hrm.hrm_company_page.e7')}
                  </Typography>
                  <Typography
                    variant='body2'
                    sx={{ fontWeight: 500 }}
                  >
                    {company.registration_number}
                  </Typography>
                </Box>
              )}
              {company.tax_number && (
                <Box sx={{ bgcolor: 'grey.50', borderRadius: 3, p: 2 }}>
                  <Typography
                    variant='caption'
                    color='text.secondary'
                  >
                    {t('hrm.hrm_company_page.e8')}
                  </Typography>
                  <Typography
                    variant='body2'
                    sx={{ fontWeight: 500 }}
                  >
                    {company.tax_number}
                  </Typography>
                </Box>
              )}
            </Box>

            {company.address && (
              <Box sx={{ mb: 2 }}>
                <Typography
                  variant='body2'
                  color='text.secondary'
                  sx={{ mb: 0.5 }}
                >
                  {t('hrm.hrm_company_page.e9')}
                </Typography>
                <Typography variant='body2'>{company.address}</Typography>
              </Box>
            )}

            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, flexWrap: 'wrap', mb: 2 }}>
              {company.contact_phone && (
                <Box
                  sx={{ display: 'flex', alignItems: 'center', gap: 0.5, color: 'text.secondary' }}
                >
                  <Phone sx={{ width: 16, height: 16 }} />
                  <Typography variant='body2'>{company.contact_phone}</Typography>
                </Box>
              )}
              {company.email && (
                <Box
                  sx={{ display: 'flex', alignItems: 'center', gap: 0.5, color: 'text.secondary' }}
                >
                  <Mail sx={{ width: 16, height: 16 }} />
                  <Typography variant='body2'>{company.email}</Typography>
                </Box>
              )}
              {company.website && (
                <Box
                  sx={{ display: 'flex', alignItems: 'center', gap: 0.5, color: 'text.secondary' }}
                >
                  <Globe sx={{ width: 16, height: 16 }} />
                  <Typography variant='body2'>{company.website}</Typography>
                </Box>
              )}
            </Box>

            <Divider sx={{ my: 2 }} />

            <Box>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                <Folder sx={{ width: 20, height: 20, color: 'warning.main' }} />
                <Typography
                  variant='subtitle1'
                  sx={{ fontWeight: 600 }}
                >
                  {t('hrm.hrm_company_page.e10')}
                </Typography>
                <Chip
                  size='small'
                  variant='outlined'
                  label={t('hrm.hrm_company_page.e11')}
                  sx={{ ml: 'auto' }}
                />
              </Box>

              {companyDepts.length === 0 ? (
                <Typography
                  variant='body2'
                  color='text.secondary'
                  sx={{ py: 2, textAlign: 'center' }}
                >
                  {t('hrm.hrm_company_page.e12')}
                </Typography>
              ) : (
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                  {companyDepts.map((dept) => (
                    <Box
                      key={dept.id}
                      sx={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        p: 1.5,
                        bgcolor: 'grey.50',
                        borderRadius: 1,
                        '&:hover': { bgcolor: 'grey.100' },
                      }}
                    >
                      <Box>
                        <Typography
                          variant='body2'
                          sx={{ fontWeight: 500 }}
                        >
                          {dept.name}
                        </Typography>
                        {dept.code && (
                          <Typography
                            variant='caption'
                            color='text.secondary'
                          >
                            {t('hrm.hrm_company_page.r1')} {dept.code}
                          </Typography>
                        )}
                      </Box>
                      <Chip
                        size='small'
                        variant={dept.status === 'active' ? 'filled' : 'outlined'}
                        label={
                          dept.status === 'active'
                            ? t('hrm.hrm_company_page.k14')
                            : t('hrm.hrm_company_page.k13')
                        }
                      />
                    </Box>
                  ))}
                </Box>
              )}
            </Box>
          </CardContent>
        </Card>
      </Box>
    );
  };

  return (
    <PageContainer
      padding={false}
      maxWidth={false}
      title={t('hrm.hrm_company_page.k15')}
      subtitle={t('hrm.hrm_company_page.k16')}
      autoTitle
      autoBreadcrumbs
      headerProps={{
        pageIcon: <Building style={{ width: 20, height: 20 }} />,
        pageGradient: `linear-gradient(135deg, ${ct.info.main}, ${ct.info.dark})`,
      }}
    >
      <CrudPage
        schema={companySchema}
        apiAdapter={apiAdapter}
        customRowActions={customRowActions}
        headerContent={renderHeaderContent}
        detailContent={detailViewContent}
      />
    </PageContainer>
  );
};

export default HrmCompanyPage;
