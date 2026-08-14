import React, { useMemo } from 'react';
import { Box, Typography } from '@mui/material';
import { Users } from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';

import CrudPage, { type CrudApiAdapter } from '@/components/templates/CrudPage';
import type { RowAction } from '@/components/templates/list/types';
import { PageContainer } from '@/components/common';
import { useNotificationStore } from '@/store';
import { employeeSchema } from '@/schemas/hrm';
import { employeeApi, type Employee } from '@/api/hrm';
import { designTokens } from '@/theme/tokens';
import EmployeeDetailDialog from './components/EmployeeDetailDialog';
import type { EmployeeListParams } from './types';

import { QUERY_KEYS } from '@/lib/reactQuery';
import { useTranslation } from 'react-i18next';
import i18n from '@/i18n';

const ct = designTokens.colors;

const HrmEmployeePage: React.FC = () => {
  const { t } = useTranslation('hrm');
  const queryClient = useQueryClient();
  const { addNotification } = useNotificationStore();

  const [showViewModal, setShowViewModal] = React.useState(false);
  const [selectedEmployee, setSelectedEmployee] = React.useState<Employee | null>(null);

  const apiAdapter: CrudApiAdapter<Employee> = useMemo(
    () => ({
      list: async (params) => {
        const queryParams: EmployeeListParams = {
          page: params?.page ?? 1,
          pagesize: params?.pageSize ?? 10,
        };
        if (params?.search) queryParams.search = params.search as string;
        if (params?.status && params.status !== 'all') queryParams.status = params.status as string;
        if (params?.department_id && params.department_id !== 'all')
          queryParams.department_id = params.department_id as string;

        const response = await employeeApi.list(queryParams);
        if (response.success && response.data) {
          return {
            data: response.data.items as Employee[],
            total: response.data.total as number,
          };
        }
        return { data: [], total: 0 };
      },
      create: async (data) => {
        const res = await employeeApi.create(data as Partial<Employee>);
        if (res.success && res.data) {
          addNotification({
            title: t('hrm.index.k0'),
            message: t('hrm.index.k1'),
            type: 'success',
          });
          return res.data as Employee;
        }
        throw new Error(res.message || t('hrm.index.k2'));
      },
      update: async (id, data) => {
        const res = await employeeApi.update(id, data as Partial<Employee>);
        if (res.success && res.data) {
          addNotification({
            title: t('hrm.index.k3'),
            message: t('hrm.index.k4'),
            type: 'success',
          });
          queryClient.invalidateQueries({
            queryKey: QUERY_KEYS.AD_HOC.HRM_EMPLOYEES_BASE,
            exact: false,
            refetchType: 'active',
          });
          return res.data as Employee;
        }
        throw new Error(res.message || t('hrm.index.k5'));
      },
      delete: async (id) => {
        const res = await employeeApi.delete(id);
        if (res.success) {
          addNotification({
            title: t('hrm.index.k6'),
            message: t('hrm.index.k7'),
            type: 'success',
          });
        } else {
          throw new Error(res.message || t('hrm.index.k8'));
        }
      },
    }),
    [addNotification, queryClient]
  );

  const customRowActions: RowAction[] = useMemo(
    () => [
      {
        key: 'view-detail',
        label: i18n.t('hrm.index.k9'),
        icon: <Users size={16} />,
        color: 'primary',
        onClick: (row: Record<string, unknown>) => {
          setSelectedEmployee(row as unknown as Employee);
          setShowViewModal(true);
        },
      },
    ],
    []
  );

  const statsContent = (rows: Employee[]) => {
    const total = rows.length;
    const active = rows.filter((r) => r.status === 'active').length;
    const inactive = rows.filter((r) => r.status === 'inactive').length;
    const activeRate = total > 0 ? Math.round((active / total) * 100) : 0;

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
            员工总数
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
            在职员工
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
            离职员工
          </Typography>
          <Typography
            variant='h5'
            sx={{ fontWeight: 700, color: 'text.secondary' }}
          >
            {inactive}
          </Typography>
        </Box>
        <Box sx={{ p: 2, bgcolor: 'info.lighter', borderRadius: 3 }}>
          <Typography
            variant='body2'
            sx={{ color: 'text.secondary' }}
          >
            在职率
          </Typography>
          <Typography
            variant='h5'
            sx={{ fontWeight: 700, color: 'info.main' }}
          >
            {activeRate}%
          </Typography>
        </Box>
      </Box>
    );
  };

  return (
    <PageContainer
      padding={false}
      maxWidth={false}
      title={t('hrm.index.k10')}
      subtitle={t('hrm.index.k11')}
      autoTitle
      autoBreadcrumbs
      headerProps={{
        pageIcon: <Users style={{ width: 20, height: 20 }} />,
        pageGradient: `linear-gradient(135deg, ${ct.success.main}, ${ct.success.dark})`,
      }}
    >
      <CrudPage
        schema={employeeSchema}
        apiAdapter={apiAdapter}
        customRowActions={customRowActions}
        headerContent={statsContent}
      />

      <EmployeeDetailDialog
        open={showViewModal}
        onClose={() => setShowViewModal(false)}
        employee={selectedEmployee}
      />
    </PageContainer>
  );
};

export default HrmEmployeePage;
