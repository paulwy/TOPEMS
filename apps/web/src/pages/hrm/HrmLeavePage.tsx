import React, { useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { Check, X, FileText, Clock, CheckCircle, XCircle } from 'lucide-react';
import { Card, CardContent } from '@mui/material';
import { PageContainer, StatCardGroup } from '@/components';
import CrudPage from '@/components/templates/CrudPage';
import type { RowAction } from '@/components/templates/list/types';
import { createCrudPageAdapter } from '@/schema/crudPageAdapter';
import { leaveSchema } from '@/schemas/hrm';
import { leaveApi, type LeaveRequest } from '@/api/hrm';
import { useNotificationStore } from '@/store';

const leaveApiAdapter = createCrudPageAdapter(leaveApi);

const HrmLeavePage: React.FC = () => {
  const { t } = useTranslation();
  const addNotification = useNotificationStore((state) => state.addNotification);

  const handleApprove = useCallback(
    async (row: Record<string, unknown>) => {
      const id = row.id as string;
      try {
        const response = await leaveApi.approve(id, 'admin');
        if (response.code === 200) {
          addNotification({
            type: 'success',
            title: t('common.success'),
            message: t('hrm.hrm_leave_page.text_337737'),
          });
        }
      } catch (error) {
        addNotification({
          type: 'error',
          title: t('common.fail'),
          message: t('hrm.hrm_leave_page.operation_failed'),
        });
      }
    },
    [addNotification, t]
  );

  const handleReject = useCallback(
    async (row: Record<string, unknown>) => {
      const id = row.id as string;
      try {
        const response = await leaveApi.reject(id, 'admin', t('hrm.hrm_leave_page.text_81233d'));
        if (response.code === 200) {
          addNotification({
            type: 'success',
            title: t('common.success'),
            message: t('hrm.hrm_leave_page.text_81233d'),
          });
        }
      } catch (error) {
        addNotification({
          type: 'error',
          title: t('common.fail'),
          message: t('hrm.hrm_leave_page.operation_failed'),
        });
      }
    },
    [addNotification, t]
  );

  const customRowActions: RowAction[] = [
    {
      label: t('hrm.hrm_leave_page.text_7a712b'),
      icon: <Check size={16} />,
      onClick: handleApprove,
      color: 'success',
      show: (row: Record<string, unknown>) => row.status === 'pending',
    },
    {
      label: t('hrm.hrm_leave_page.text_7173f8'),
      icon: <X size={16} />,
      onClick: handleReject,
      color: 'error',
      show: (row: Record<string, unknown>) => row.status === 'pending',
      divider: true,
    },
  ];

  return (
    <PageContainer
      autoTitle
      autoBreadcrumbs
      padding={false}
      maxWidth={false}
    >
      <CrudPage
        schema={leaveSchema}
        apiAdapter={leaveApiAdapter}
        customRowActions={customRowActions}
        headerContent={(rows: LeaveRequest[], total: number) => {
          const items = rows as LeaveRequest[];
          const pending = items.filter((i) => i.status === 'pending').length;
          const approved = items.filter((i) => i.status === 'approved').length;
          const rejected = items.filter((i) => i.status === 'rejected').length;

          return (
            <Card sx={{ mb: 3, borderRadius: 3 }}>
              <CardContent sx={{ p: 2 }}>
                <StatCardGroup
                  stats={[
                    {
                      title: t('hrm.hrm_leave_page.text_88ce9c'),
                      value: total,
                      icon: <FileText size={20} />,
                      color: 'primary' as const,
                    },
                    {
                      title: t('hrm.hrm_leave_page.text_b0bf01'),
                      value: pending,
                      icon: <Clock size={20} />,
                      color: 'warning' as const,
                    },
                    {
                      title: t('hrm.hrm_leave_page.text_337737'),
                      value: approved,
                      icon: <CheckCircle size={20} />,
                      color: 'success' as const,
                    },
                    {
                      title: t('hrm.hrm_leave_page.text_81233d'),
                      value: rejected,
                      icon: <XCircle size={20} />,
                      color: 'error' as const,
                    },
                  ]}
                  columns={4}
                />
              </CardContent>
            </Card>
          );
        }}
      />
    </PageContainer>
  );
};

export default HrmLeavePage;
