import React from 'react';
import { Play } from 'lucide-react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import CrudPage from '@/components/templates/CrudPage';
import { createCrudPageAdapter } from '@/schema/crudPageAdapter';
import type { RowAction } from '@/components/templates/list/types';
import { testSchema } from '@/schemas/rd';
import { rdApi } from '@/api/rd';
import type { UpdateTestCaseRequest, CreateTestCaseRequest } from '@/api/rd';
import { QUERY_KEYS } from '@/lib/reactQuery';
import { useNotificationStore } from '@/store';
import { logger } from '@/utils/logger';
import i18n from '@/i18n';

const testApiAdapter = createCrudPageAdapter(
  {
    list: (params?) => rdApi.listTests(params),
    create: (data: CreateTestCaseRequest) => rdApi.createTest(data),
    update: (id, data) => rdApi.updateTest(id, data),
    delete: (id: string) => rdApi.deleteTest(id),
  },
  { itemsField: 'test_cases' }
);
const RsTestPage: React.FC = () => {
  const queryClient = useQueryClient();
  const { addNotification } = useNotificationStore();
  const executeTestMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: UpdateTestCaseRequest }) => {
      const response = await rdApi.updateTest(id, data);
      if (!response.success) {
        throw new Error(response.message || i18n.t('rd.rs_test_page.k4'));
      }
      return response;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: QUERY_KEYS.RD.TEST_CASES,
        exact: false,
        refetchType: 'active',
      });
      addNotification({
        type: 'success',
        title: i18n.t('rd.rs_test_page.k5'),
        message: i18n.t('rd.rs_test_page.k6'),
      });
    },
    onError: (error: unknown) => {
      logger.error(i18n.t('pages.rs_test_page.k0'), error);
      addNotification({
        type: 'error',
        title: i18n.t('rd.rs_test_page.k7'),
        message: error instanceof Error ? error.message : i18n.t('rd.rs_test_page.k8'),
      });
    },
  });
  const handleExecuteTest = (row: Record<string, unknown>) => {
    executeTestMutation.mutate({
      id: String(row.id),
      data: { status: 'passed' },
    });
  };
  const customRowActions: RowAction[] = [
    {
      key: 'execute-test',
      label: i18n.t('rd.rs_test_page.k9'),
      icon: <Play size={16} />,
      color: 'success',
      onClick: handleExecuteTest,
    },
  ];
  return (
    <CrudPage
      schema={testSchema}
      apiAdapter={testApiAdapter}
      customRowActions={customRowActions}
      breadcrumbs={[
        { label: i18n.t('rd.rs_test_page.k11'), href: '/rd' },
        { label: i18n.t('rd.rs_test_page.k10') },
      ]}
    />
  );
};
export default RsTestPage;
