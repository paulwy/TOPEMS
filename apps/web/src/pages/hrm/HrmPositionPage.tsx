import { Box, Typography } from '@mui/material';
import { useQuery } from '@tanstack/react-query';
import CrudPage from '@/components/templates/CrudPage';
import type { ColumnDef } from '@/components/templates/list/types';
import { createCrudPageAdapter } from '@/schema/crudPageAdapter';
import { positionSchema } from '@/schemas/hrm';
import { positionApi, departmentApi, type Department } from '@/api/hrm';

import { QUERY_KEYS } from '@/lib/reactQuery';
import { useTranslation } from 'react-i18next';

const apiAdapter = createCrudPageAdapter(positionApi);

export default function HrmPositionPage() {
  const { t } = useTranslation('hrm');
  const { data: departmentsData } = useQuery<{ items: Department[] }>({
    queryKey: QUERY_KEYS.AD_HOC.HRM_DEPARTMENTS_2_BASE,
    queryFn: async () => {
      const response = await departmentApi.list();
      if (response.code === 200 && response.data) {
        return { items: response.data.items || [] };
      }
      return { items: [] };
    },
    staleTime: 5 * 60 * 1000,
  });

  const departments = departmentsData?.items || [];
  const deptMap = new Map(departments.map((d) => [d.id, d.name]));

  const customColumns: ColumnDef[] = [
    {
      id: 'name',
      label: t('hrm.hrm_position_page.k0'),
      width: 160,
      sortable: true,
      render: (row: Record<string, unknown>) => (
        <Box>
          <Typography
            variant='body2'
            sx={{ fontWeight: 500, color: 'grey.900' }}
          >
            {String(row.name ?? '')}
          </Typography>
          {typeof row.code === 'string' && row.code && (
            <Typography
              variant='caption'
              sx={{ color: 'grey.500' }}
            >
              {row.code}
            </Typography>
          )}
        </Box>
      ),
    },
    {
      id: 'department_id',
      label: t('hrm.hrm_position_page.k1'),
      width: 140,
      render: (row: Record<string, unknown>) => (
        <Typography
          variant='body2'
          sx={{ color: 'grey.900' }}
        >
          {deptMap.get(String(row.department_id ?? '')) || '-'}
        </Typography>
      ),
    },
    {
      id: 'level',
      label: t('hrm.hrm_position_page.k2'),
      width: 100,
      render: (row: Record<string, unknown>) => (
        <Typography
          variant='body2'
          sx={{ color: 'grey.900' }}
        >
          {row.level ? String(row.level) : '-'}
        </Typography>
      ),
    },
    {
      id: 'min_salary',
      label: t('hrm.hrm_position_page.k3'),
      width: 100,
      render: (row: Record<string, unknown>) => (
        <Typography
          variant='body2'
          sx={{ color: 'grey.900' }}
        >
          {row.min_salary != null ? String(row.min_salary) : '-'}
        </Typography>
      ),
    },
    {
      id: 'max_salary',
      label: t('hrm.hrm_position_page.k4'),
      width: 100,
      render: (row: Record<string, unknown>) => (
        <Typography
          variant='body2'
          sx={{ color: 'grey.900' }}
        >
          {row.max_salary != null ? String(row.max_salary) : '-'}
        </Typography>
      ),
    },
    {
      id: 'employee_count',
      label: t('hrm.hrm_position_page.k5'),
      width: 100,
      render: (row: Record<string, unknown>) => (
        <Typography
          variant='body2'
          sx={{ color: 'grey.900' }}
        >
          {row.employee_count != null ? String(row.employee_count) : '0'}
        </Typography>
      ),
    },
    {
      id: 'status',
      label: t('hrm.hrm_position_page.k6'),
      width: 100,
    },
  ];

  return (
    <CrudPage
      schema={positionSchema}
      apiAdapter={apiAdapter}
      customColumns={customColumns}
      breadcrumbs={[
        { label: t('hrm.hrm_position_page.k8'), href: '/hrm' },
        { label: t('hrm.hrm_position_page.k7') },
      ]}
    />
  );
}
