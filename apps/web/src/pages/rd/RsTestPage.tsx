import React from 'react';
import { Play } from 'lucide-react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { CrudPage, type CrudApiAdapter } from '@/components/templates/CrudPage';
import type { RowAction } from '@/components/templates/list/types';
import { testSchema } from '@/schemas/rd';
import { rdApi } from '@/api/rd';
import type { TestCase, UpdateTestCaseRequest } from '@/api/rd';
import { QUERY_KEYS } from '@/lib/reactQuery';
import { useNotificationStore } from '@/store';
import { logger } from '@/utils/logger';
import i18n from '@/i18n';
const testApiAdapter: CrudApiAdapter<TestCase> = {
  list: async (params) => {
    const queryParams: Record<string, unknown> = {
      page: params?.page,
      pagesize: params?.pageSize,
    };
    if (params?.search) queryParams.search = params.search;
    if (params?.case_type) queryParams.case_type = params.case_type;
    if (params?.priority) queryParams.priority = params.priority;
    if (params?.status) queryParams.status = params.status;
    const response = await rdApi.listTests(queryParams);
    if (!response.success || !response.data) {
      throw new Error(response.message || i18n.t('rd.rs_test_page.k0'));
    }
    return {
      data: response.data.test_cases || [],
      total: response.data.total || 0,
    };
  },
  create: async (data) => {
    const response = await rdApi.createTest(data as Parameters<typeof rdApi.createTest>[0]);
    if (!response.success || !response.data) {
      throw new Error(response.message || i18n.t('rd.rs_test_page.k1'));
    }
    return response.data;
  },
  update: async (id, data) => {
    const response = await rdApi.updateTest(id, data as Parameters<typeof rdApi.updateTest>[1]);
    if (!response.success || !response.data) {
      throw new Error(response.message || i18n.t('rd.rs_test_page.k2'));
    }
    return response.data;
  },
  delete: async (id) => {
    const response = await rdApi.deleteTest(id);
    if (!response.success) {
      throw new Error(response.message || i18n.t('rd.rs_test_page.k3'));
    }
  },
};
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
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.RD.TEST_CASES ,
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
      breadcrumbs={[{ label: i18n.t('rd.rs_test_page.k11'), href: '/rd' }, { label: i18n.t('rd.rs_test_page.k10') }]}
    />
  );
};
export default RsTestPage;