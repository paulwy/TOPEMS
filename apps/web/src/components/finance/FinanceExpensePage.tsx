import { useCallback, useMemo } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { CreditCard } from 'lucide-react';
import CrudPage from '@/components/templates/CrudPage';
import type { RowAction } from '@/components/templates/list/types';
import { createCrudPageAdapter } from '@/schema-dsl/crudPageAdapter';
import { expenseSchema } from '@/schemas/finance';
import { financeApi } from '@/api/finance';
import { useNotificationStore } from '@/store';
import { useTranslation } from 'react-i18next';
import i18n from '@/i18n';

/**
 * B358：此前这里绑的是 `financeApi.account`（会计科目表），页面 schema 却是
 * `financeExpense`——列表实际在查科目，费用记录根本显示不出来，B351 的支付动作
 * 也就没有可挂的入口。改回 `expenseApi`（`GET /api/finance/expenses`）。
 */
const apiAdapter = createCrudPageAdapter(financeApi.expense);

/** B351/B358：支付专用动作只允许从 approved 出发，列表行按钮同口径收窄。 */
const PAYABLE_STATUS = 'approved';

export default function FinanceExpensePage() {
  const { t } = useTranslation('finance');
  const addNotification = useNotificationStore((s) => s.addNotification);
  const queryClient = useQueryClient();

  const handlePay = useCallback(
    async (row: Record<string, unknown>) => {
      const id = String(row.id ?? '');
      if (!id) {
        addNotification({
          type: 'error',
          title: i18n.t('finance.finance_expense_page.pay_failed'),
          message: i18n.t('finance.finance_expense_page.pay_missing_id'),
        });
        return;
      }
      try {
        const res = await financeApi.expense.pay(id);
        if (!res.success) {
          addNotification({
            type: 'error',
            title: i18n.t('finance.finance_expense_page.pay_failed'),
            message: res.message || '',
          });
          return;
        }
        queryClient.invalidateQueries({ queryKey: ['financeExpense'], exact: false });
        addNotification({
          type: 'success',
          title: i18n.t('finance.finance_expense_page.pay_success'),
          message: '',
        });
      } catch (err) {
        addNotification({
          type: 'error',
          title: i18n.t('finance.finance_expense_page.pay_failed'),
          message: err instanceof Error ? err.message : '',
        });
      }
    },
    [addNotification, queryClient]
  );

  const customRowActions = useMemo<RowAction[]>(
    () => [
      {
        key: 'pay',
        label: i18n.t('finance.finance_expense_page.pay_action'),
        icon: <CreditCard size={16} />,
        color: 'success',
        show: (row) => row.status === PAYABLE_STATUS,
        confirm: true,
        confirmMessage: i18n.t('finance.finance_expense_page.pay_confirm'),
        onClick: (row) => {
          void handlePay(row);
        },
      },
    ],
    [handlePay]
  );

  return (
    <CrudPage
      schema={expenseSchema}
      apiAdapter={apiAdapter}
      customRowActions={customRowActions}
      breadcrumbs={[
        { label: t('finance.finance_expense_page.k1') },
        { label: t('finance.finance_expense_page.k0') },
      ]}
    />
  );
}
