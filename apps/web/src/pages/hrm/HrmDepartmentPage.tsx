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

const ct = designTokens.colors;

const HrmDepartmentPage: React.FC = () => {
  const queryClient = useQueryClient();
  const { addNotification } = useNotificationStore();

  const [selectedDeptId, setSelectedDeptId] = useState<string | null>(null);

  const { data: employees = [] } = useQuery({
    queryKey: ['hrm', 'department-employees', selectedDeptId],
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
          addNotification({ title: '成功', message: '部门创建成功', type: 'success' });
          return res.data as Department;
        }
        throw new Error(res.message || '创建失败');
      },
      update: async (id, data) => {
        const res = await departmentApi.update(id, data as Partial<Department>);
        if (res.success && res.data) {
          addNotification({ title: '成功', message: '部门更新成功', type: 'success' });
          queryClient.invalidateQueries({ queryKey: ['hrm', 'departments'] });
          return res.data as Department;
        }
        throw new Error(res.message || '更新失败');
      },
      delete: async (id) => {
        const res = await departmentApi.delete(id);
        if (res.success) {
          addNotification({ title: '成功', message: '部门删除成功', type: 'success' });
          if (selectedDeptId === id) setSelectedDeptId(null);
        } else {
          throw new Error(res.message || '删除失败');
        }
      },
    }),
    [addNotification, queryClient, selectedDeptId]
  );

  const customRowActions: RowAction[] = useMemo(
    () => [
      {
        key: 'view-members',
        label: '查看成员',
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
            部门总数
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
            启用部门
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
            停用部门
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
            选中部门人数
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
              部门成员
            </Typography>
            <Chip
              size='small'
              variant='outlined'
              label={`${employees.length} 人`}
              sx={{ ml: 'auto' }}
            />
          </Box>
        }
      />
      <CardContent>
        {employees.length === 0 ? (
          <EmptyState
            emoji='👤'
            title='暂无成员'
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
                  label={emp.status === 'active' ? '在职' : '离职'}
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
      label: '部门列表',
      content: null,
    },
    {
      id: 'members',
      label: '部门成员',
      content: memberPanel,
    },
  ];

  return (
    <PageContainer
      padding={false}
      maxWidth={false}
      title='部门管理'
      subtitle='管理组织部门结构，包括层级、负责人和成员'
      autoTitle
      autoBreadcrumbs
      headerProps={{
        pageIcon: <Building2 style={{ width: 20, height: 20 }} />,
        pageGradient: `linear-gradient(135deg, ${ct.primary.main}, ${ct.primary.dark})`,
      }}
    >
      <CrudPage
        schema={departmentSchema}
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
