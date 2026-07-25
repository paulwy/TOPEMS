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
      throw new Error(response.message || '加载测试用例列表失败');
    }
    return {
      data: response.data.test_cases || [],
      total: response.data.total || 0,
    };
  },

  create: async (data) => {
    const response = await rdApi.createTest(data as Parameters<typeof rdApi.createTest>[0]);
    if (!response.success || !response.data) {
      throw new Error(response.message || '创建测试用例失败');
    }
    return response.data;
  },

  update: async (id, data) => {
    const response = await rdApi.updateTest(id, data as Parameters<typeof rdApi.updateTest>[1]);
    if (!response.success || !response.data) {
      throw new Error(response.message || '更新测试用例失败');
    }
    return response.data;
  },

  delete: async (id) => {
    const response = await rdApi.deleteTest(id);
    if (!response.success) {
      throw new Error(response.message || '删除测试用例失败');
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
        throw new Error(response.message || '执行测试失败');
      }
      return response;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.RD.TEST_CASES });
      addNotification({
        type: 'success',
        title: '执行成功',
        message: '测试用例已标记为通过',
      });
    },
    onError: (error: unknown) => {
      logger.error('执行测试失败:', error);
      addNotification({
        type: 'error',
        title: '执行失败',
        message: error instanceof Error ? error.message : '执行测试失败',
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
      label: '执行测试',
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
      breadcrumbs={[{ label: '研发管理', href: '/rd' }, { label: '测试用例' }]}
    />
  );
};

export default RsTestPage;
