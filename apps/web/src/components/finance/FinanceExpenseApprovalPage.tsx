import { useCallback, useMemo } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Banknote } from 'lucide-react';
import CrudPage from '@/components/templates/CrudPage';
import type { RowAction } from '@/components/templates/list/types';
import { createCrudPageAdapter } from '@/schema-dsl/crudPageAdapter';
import { expenseApprovalSchema } from '@/schemas/finance';
import { financeApi } from '@/api/finance';
import { useNotificationStore } from '@/store';
import { useTranslation } from 'react-i18next';
import i18n from '@/i18n';

const apiAdapter = createCrudPageAdapter(financeApi.expenseApproval);

/** B357：报销专用动作只允许从 approved 出发，列表行按钮同口径收窄。 */
const REIMBURSABLE_STATUS = 'approved';

export default function FinanceExpenseApprovalPage() {
  const { t } = useTranslation('finance');
  const addNotification = useNotificationStore((s) => s.addNotification);
  const queryClient = useQueryClient();

  const handleReimburse = useCallback(
    async (row: Record<string, unknown>) => {
      const id = String(row.id ?? '');
      if (!id) {
        addNotification({
          type: 'error',
          title: i18n.t('finance.finance_expense_approval_page.reimburse_failed'),
          message: i18n.t('finance.finance_expense_approval_page.reimburse_missing_id'),
        });
        return;
      }
      try {
        const res = await financeApi.expenseApproval.reimburse(id);
        if (!res.success) {
          addNotification({
            type: 'error',
            title: i18n.t('finance.finance_expense_approval_page.reimburse_failed'),
            message: res.message || '',
          });
          return;
        }
        queryClient.invalidateQueries({ queryKey: ['financeExpenseApproval'], exact: false });
        addNotification({
          type: 'success',
          title: i18n.t('finance.finance_expense_approval_page.reimburse_success'),
          message: '',
        });
      } catch (err) {
        addNotification({
          type: 'error',
          title: i18n.t('finance.finance_expense_approval_page.reimburse_failed'),
          message: err instanceof Error ? err.message : '',
        });
      }
    },
    [addNotification, queryClient]
  );

  const customRowActions = useMemo<RowAction[]>(
    () => [
      {
        key: 'reimburse',
        label: i18n.t('finance.finance_expense_approval_page.reimburse_action'),
        icon: <Banknote size={16} />,
        color: 'success',
        show: (row) => row.status === REIMBURSABLE_STATUS,
        confirm: true,
        confirmMessage: i18n.t('finance.finance_expense_approval_page.reimburse_confirm'),
        onClick: (row) => {
          void handleReimburse(row);
        },
      },
    ],
    [handleReimburse]
  );

  return (
    <CrudPage
      schema={expenseApprovalSchema}
      apiAdapter={apiAdapter}
      customRowActions={customRowActions}
      breadcrumbs={[
        { label: t('finance.finance_expense_approval_page.k1') },
        { label: t('finance.finance_expense_approval_page.k0') },
      ]}
    />
  );
}
