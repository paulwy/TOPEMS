import React, { useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { useNotificationStore } from '@/store';
import { CheckCircle, TrendingUp } from 'lucide-react';
import { PageContainer } from '@/components/common';
import CrudPage from '@/components/templates/CrudPage';
import type { RowAction } from '@/components/templates/list/types';
import { createCrudPageAdapter } from '@/schema/crudPageAdapter';
import { salaryAdjustmentSchema } from '@/schemas/hrm';
import { salaryAdjustmentApi } from '@/api/hrm';
import i18n from '@/i18n';

const salaryAdjustmentAdapter = createCrudPageAdapter(salaryAdjustmentApi);

const HrmSalaryAdjustmentPage: React.FC = () => {
  const { t } = useTranslation();
  const addNotification = useNotificationStore((state) => state.addNotification);

  const handleApprove = useCallback(
    async (row: Record<string, unknown>) => {
      const id = row.id as string;
      try {
        const response = await salaryAdjustmentApi.approve(id, 'current-user');
        if (response.success) {
          addNotification({
            type: 'success',
            title: t('hrm.hrm_salary_adjustment_page.success'),
            message: t('hrm.hrm_salary_adjustment_page.text_c0b5ba'),
          });
        }
      } catch {
        addNotification({
          type: 'error',
          title: t('hrm.hrm_salary_adjustment_page.fail'),
          message: t('hrm.hrm_salary_adjustment_page.fail'),
        });
      }
    },
    [addNotification, t]
  );

  const customRowActions: RowAction[] = [
    {
      label: t('hrm.hrm_salary_adjustment_page.view_detail'),
      icon: <TrendingUp size={16} />,
      onClick: (row: Record<string, unknown>) => {
        addNotification({
          type: 'info',
          title: t('hrm.hrm_salary_adjustment_page.detail'),
          message: i18n.t('hrm.hrm_salary_adjustment_page.e1', { v1: row.employee_name }),
        });
      },
    },
    {
      label: t('hrm.hrm_salary_adjustment_page.text_0273ba'),
      icon: <CheckCircle size={16} />,
      onClick: handleApprove,
      color: 'success',
      show: (row: Record<string, unknown>) => row.status === 'pending',
    },
  ];

  return (
    <PageContainer
      title={t('hrm.hrm_salary_adjustment_page.text_56e426')}
      subtitle={t('hrm.hrm_salary_adjustment_page.text_cfb890')}
    >
      <CrudPage
        schema={salaryAdjustmentSchema}
        apiAdapter={salaryAdjustmentAdapter}
        customRowActions={customRowActions}
      />
    </PageContainer>
  );
};

export default HrmSalaryAdjustmentPage;
