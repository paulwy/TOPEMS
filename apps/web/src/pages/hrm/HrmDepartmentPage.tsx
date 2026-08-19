import CrudPage from '@/components/templates/CrudPage';
import type { CrudApiAdapter } from '@/components/templates/CrudPage';
import type { RowAction } from '@/components/templates/list/types';
import { PageContainer } from '@/components/common';
import { useNotificationStore } from '@/store';
import { departmentApi, employeeApi, type Department, type Employee } from '@/api/hrm';
import { designTokens } from '@/theme/tokens';

import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Box, Typography, Chip, Avatar, Card, CardHeader, CardContent } from '@mui/material';
import { Building2, User } from 'lucide-react';
import React, { useMemo, useState } from 'react';
import { departmentSchema } from '@/schemas/hrm';
import { EmptyState } from '@/components';

import { QUERY_KEYS } from '@/lib/reactQuery';
import { useTranslation } from 'react-i18next';
import i18n from '@/i18n';

const ct = designTokens.colors;

const HrmDepartmentPage: React.FC = () => {
  const { t } = useTranslation('hrm');
  const queryClient = useQueryClient();
  const { addNotification } = useNotificationStore();

  const [selectedDeptId, setSelectedDeptId] = useState<string | null>(null);

  const { data: employees = [] } = useQuery({
    queryKey: [...QUERY_KEYS.AD_HOC.HRM_DEPARTMENT_EMPLOYEES_BASE, selectedDeptId],
    queryFn: async () => {
      if (!selectedDeptId) return [];
      const response = await employeeApi.list({
        department_id: selectedDeptId,
        pagesize: 100,
      });
      if (response.success && response.data) {
        return response.data.items || [];
      }
      return [];
    },
    enabled: !!selectedDeptId,
    staleTime: 5 * 60 * 1000,
  });

  const apiAdapter: CrudApiAdapter<Department> = useMemo(
    () => ({
      list: async (params) => {
        const response = await departmentApi.list({
          page: params?.page ?? 1,
          pagesize: params?.pageSize ?? 10,
          search: params?.search as string | undefined,
        });
        if (response.success && response.data) {
          return {
            data: response.data.items as Department[],
            total: response.data.total as number,
          };
        }
        return { data: [], total: 0 };
      },
      create: async (data) => {
        const res = await departmentApi.create(data as Partial<Department>);
        if (res.success && res.data) {
          addNotification({
            title: t('hrm.hrm_department_page.k1'),
            message: t('hrm.hrm_department_page.k0'),
            type: 'success',
          });
          return res.data as Department;
        }
        throw new Error(res.message || t('hrm.hrm_department_page.k2'));
      },
      update: async (id, data) => {
        const res = await departmentApi.update(id, data as Partial<Department>);
        if (res.success && res.data) {
          addNotification({
            title: t('hrm.hrm_department_page.k4'),
            message: t('hrm.hrm_department_page.k3'),
            type: 'success',
          });
          queryClient.invalidateQueries({
            queryKey: QUERY_KEYS.AD_HOC.HRM_DEPARTMENTS_BASE,
            exact: false,
            refetchType: 'active',
          });
          return res.data as Department;
        }
        throw new Error(res.message || t('hrm.hrm_department_page.k5'));
      },
      delete: async (id) => {
        const res = await departmentApi.delete(id);
        if (res.success) {
          addNotification({
            title: t('hrm.hrm_department_page.k7'),
            message: t('hrm.hrm_department_page.k6'),
            type: 'success',
          });
          if (selectedDeptId === id) setSelectedDeptId(null);
        } else {
          throw new Error(res.message || t('hrm.hrm_department_page.k8'));
        }
      },
    }),
    [addNotification, queryClient, selectedDeptId]
  );

  const customRowActions: RowAction[] = useMemo(
    () => [
      {
        key: 'view-members',
        label: i18n.t('hrm.hrm_department_page.k9'),
        icon: <User size={16} />,
        color: 'primary',
        onClick: (row: Record<string, unknown>) => {
          setSelectedDeptId(row.id as string);
        },
      },
    ],
    []
  );

  const statsContent = (rows: Department[]) => {
    const total = rows.length;
    const active = rows.filter((r) => r.status === 'active').length;
    const inactive = rows.filter((r) => r.status === 'inactive').length;

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
            {t('hrm.hrm_department_page.e1')}
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
            {t('hrm.hrm_department_page.e2')}
          </Typography>
          <Typography
            variant='h5'
            sx={{ fontWeight: 700, color: 'success.main' }}
          >
            {active}
          </Typography>
        </Box>
        <Box sx={{ p: 2, bgcolor: 'warning.lighter', borderRadius: 3 }}>
          <Typography
            variant='body2'
            sx={{ color: 'text.secondary' }}
          >
            {t('hrm.hrm_department_page.e3')}
          </Typography>
          <Typography
            variant='h5'
            sx={{ fontWeight: 700, color: 'warning.main' }}
          >
            {inactive}
          </Typography>
        </Box>
        <Box sx={{ p: 2, bgcolor: 'info.lighter', borderRadius: 3 }}>
          <Typography
            variant='body2'
            sx={{ color: 'text.secondary' }}
          >
            {t('hrm.hrm_department_page.e4')}
          </Typography>
          <Typography
            variant='h5'
            sx={{ fontWeight: 700, color: 'info.main' }}
          >
            {employees.length}
          </Typography>
        </Box>
      </Box>
    );
  };

  const memberPanel = selectedDeptId ? (
    <Card sx={{ mb: 3 }}>
      <CardHeader
        sx={{ pb: 2 }}
        title={
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <User sx={{ width: 20, height: 20, color: 'primary.main' }} />
            <Typography
              variant='subtitle1'
              sx={{ fontWeight: 600 }}
            >
              {t('hrm.hrm_department_page.e5')}
            </Typography>
            <Chip
              size='small'
              variant='outlined'
              label={t('hrm.hrm_department_page.e6')}
              sx={{ ml: 'auto' }}
            />
          </Box>
        }
      />
      <CardContent>
        {employees.length === 0 ? (
          <EmptyState
            emoji='👤'
            title={t('hrm.hrm_department_page.k10')}
            compact
          />
        ) : (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
            {employees.map((emp: Employee) => (
              <Box
                key={emp.id}
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 2,
                  p: 2,
                  bgcolor: 'grey.50',
                  borderRadius: 3,
                }}
              >
                <Avatar sx={{ bgcolor: 'primary.main', width: 36, height: 36 }}>
                  <User sx={{ width: 20, height: 20 }} />
                </Avatar>
                <Box sx={{ flex: 1 }}>
                  <Typography
                    variant='body2'
                    sx={{ fontWeight: 500 }}
                  >
                    {emp.name}
                  </Typography>
                  <Typography
                    variant='caption'
                    color='text.secondary'
                  >
                    {emp.employee_no} · {emp.position || '-'}
                  </Typography>
                </Box>
                <Chip
                  label={
                    emp.status === 'active'
                      ? t('hrm.hrm_department_page.k12')
                      : t('hrm.hrm_department_page.k11')
                  }
                  color={emp.status === 'active' ? 'success' : 'default'}
                  size='small'
                />
              </Box>
            ))}
          </Box>
        )}
      </CardContent>
    </Card>
  ) : null;

  const tabs = [
    {
      id: 'list',
      label: t('hrm.hrm_department_page.k13'),
      content: null,
    },
    {
      id: 'members',
      label: t('hrm.hrm_department_page.k14'),
      content: memberPanel,
    },
  ];

  return (
    <PageContainer
      padding={false}
      maxWidth={false}
      title={t('hrm.hrm_department_page.k15')}
      subtitle={t('hrm.hrm_department_page.k16')}
      autoTitle
      autoBreadcrumbs
      headerProps={{
        pageIcon: <Building2 style={{ width: 20, height: 20 }} />,
        pageGradient: `linear-gradient(135deg, ${ct.primary.main}, ${ct.primary.dark})`,
      }}
    >
      <CrudPage
        schema={departmentSchema()}
        apiAdapter={apiAdapter}
        customRowActions={customRowActions}
        headerContent={statsContent}
        tabs={tabs}
        defaultTab='list'
      />
    </PageContainer>
  );
};

export default HrmDepartmentPage;
