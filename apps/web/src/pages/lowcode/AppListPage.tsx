import React, { useCallback, useMemo } from 'react';
import { TextField } from '@mui/material';
import { Copy } from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { ListPageTemplate } from '@/components/templates/ListPageTemplate';
import type { ColumnDef, RowAction } from '@/components/templates/list';
import type { CrudOperations } from '@/hooks';
import { lowcodeAppsApi } from '@/api/lowcode';
import type { LowcodeApp, CreateLowcodeAppRequest } from '@/api/lowcode';
import { useNotificationStore } from '@/store';

const QUERY_KEY = 'lowcode-apps';

const lowcodeAppCrudApi: CrudOperations<LowcodeApp> = {
  list: (params) => {
    const { page, pagesize, keyword, ...rest } = params ?? {};
    return lowcodeAppsApi.list({
      page: typeof page === 'number' ? page : undefined,
      pageSize: typeof pagesize === 'number' ? pagesize : undefined,
      search: typeof keyword === 'string' ? keyword : undefined,
      ...rest,
    }) as ReturnType<CrudOperations<LowcodeApp>['list']>;
  },
  get: (id) => lowcodeAppsApi.get(id) as ReturnType<CrudOperations<LowcodeApp>['get']>,
  create: (data) =>
    lowcodeAppsApi.create(data as CreateLowcodeAppRequest) as ReturnType<
      CrudOperations<LowcodeApp>['create']
    >,
  update: (id, data) =>
    lowcodeAppsApi.update(id, data as Partial<LowcodeApp>) as ReturnType<
      CrudOperations<LowcodeApp>['update']
    >,
  delete: async (id) => {
    const response = await lowcodeAppsApi.remove(id);
    return {
      success: response.success,
      code: response.code,
      message: response.message,
      data: id,
    };
  },
};

export function AppListPage() {
  const { t } = useTranslation('lowcode');
  const queryClient = useQueryClient();
  const { addNotification } = useNotificationStore();

  const columns = useMemo<ColumnDef<LowcodeApp>[]>(
    () => [
      { id: 'id', label: t('lowcode.app_list_page.k23'), width: 120 },
      { id: 'name', label: t('lowcode.app_list_page.k6'), minWidth: 160 },
      { id: 'code', label: t('lowcode.app_list_page.k7'), minWidth: 120 },
      { id: 'description', label: t('lowcode.app_list_page.k20'), minWidth: 200 },
      { id: 'status', label: t('lowcode.app_list_page.k8'), width: 100 },
      {
        id: 'version',
        label: t('lowcode.app_list_page.k9'),
        width: 80,
        render: (row) => `v${row.version}`,
      },
      { id: 'created_at', label: t('lowcode.app_list_page.k24'), width: 160 },
    ],
    [t]
  );

  const handleDuplicate = useCallback(
    async (row: LowcodeApp) => {
      if (!window.confirm(t('lowcode.app_list_page.k25'))) {
        return;
      }
      try {
        const response = await lowcodeAppsApi.duplicate(row.id);
        if (!response.success) {
          throw new Error(response.message || t('lowcode.app_list_page.k3'));
        }
        addNotification({
          type: 'success',
          title: t('lowcode.app_list_page.k12'),
          message: t('lowcode.app_list_page.k12'),
        });
        queryClient.invalidateQueries({
          queryKey: [QUERY_KEY, 'list'],
          exact: false,
          refetchType: 'active',
        });
      } catch (err) {
        addNotification({
          type: 'error',
          title: t('lowcode.app_list_page.k3'),
          message: err instanceof Error ? err.message : t('lowcode.app_list_page.k3'),
        });
      }
    },
    [queryClient, addNotification, t]
  );

  const customRowActions: RowAction<LowcodeApp>[] = useMemo(
    () => [
      {
        key: 'duplicate',
        label: t('lowcode.app_list_page.k12'),
        icon: <Copy size={16} />,
        onClick: (row) => {
          void handleDuplicate(row);
        },
      },
    ],
    [handleDuplicate, t]
  );

  const formFields = useMemo(
    () => [
      {
        key: 'name',
        label: t('lowcode.app_list_page.k17'),
        type: 'text' as const,
        required: true,
      },
      {
        key: 'code',
        label: t('lowcode.app_list_page.k18'),
        type: 'text' as const,
        required: true,
        render: ({
          value,
          onChange,
          mode,
        }: {
          value: unknown;
          onChange: (value: unknown) => void;
          mode: 'create' | 'edit' | 'view';
        }) => (
          <TextField
            fullWidth
            size='small'
            label={t('lowcode.app_list_page.k18')}
            value={value ?? ''}
            onChange={(e) => onChange(e.target.value)}
            required
            disabled={mode !== 'create'}
            helperText={mode === 'create' ? t('lowcode.app_list_page.k19') : undefined}
          />
        ),
      },
      {
        key: 'description',
        label: t('lowcode.app_list_page.k20'),
        type: 'textarea' as const,
        rows: 2,
      },
    ],
    [t]
  );

  return (
    <ListPageTemplate<LowcodeApp>
      title={t('lowcode.app_list_page.k5')}
      breadcrumbs={[{ label: t('lowcode.title') }, { label: t('lowcode.app_list_page.k4') }]}
      columns={columns}
      data={[]}
      emptyMessage={t('lowcode.app_list_page.e2')}
      crud={{
        api: lowcodeAppCrudApi,
        queryKey: QUERY_KEY,
        entityName: t('lowcode.app_list_page.k4'),
        createButtonText: t('lowcode.app_list_page.e1'),
        formFields,
        formColCount: 1,
        rowActions: customRowActions,
        clickRowToView: false,
        doubleClickToEdit: false,
        searchable: true,
        searchFields: ['name', 'code', 'description'],
      }}
    />
  );
}

export default AppListPage;
