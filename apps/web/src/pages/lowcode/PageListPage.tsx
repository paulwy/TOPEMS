import React, { useCallback, useMemo } from 'react';
import { Box, Chip } from '@mui/material';
import { Home as HomeIcon, Upload as PublishIcon } from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { ListPageTemplate } from '@/components/templates/ListPageTemplate';
import type { ColumnDef, RowAction } from '@/components/templates/list';
import type { CrudOperations } from '@/hooks';
import { lowcodePagesApi } from '@/api/lowcode';
import type { LowcodePage, CreateLowcodePageRequest } from '@/api/lowcode';
import { useNotificationStore } from '@/store';

const QUERY_KEY = 'lowcode-pages';

const PAGE_TYPES: LowcodePage['type'][] = [
  'list',
  'detail',
  'form',
  'dashboard',
  'custom',
  'external_link',
];

const lowcodePageCrudApi: CrudOperations<LowcodePage> = {
  list: (params) => {
    const { page, pagesize, keyword, ...rest } = params ?? {};
    return lowcodePagesApi.list({
      page: typeof page === 'number' ? page : undefined,
      pageSize: typeof pagesize === 'number' ? pagesize : undefined,
      search: typeof keyword === 'string' ? keyword : undefined,
      ...rest,
    }) as ReturnType<CrudOperations<LowcodePage>['list']>;
  },
  get: (id) => lowcodePagesApi.get(id) as ReturnType<CrudOperations<LowcodePage>['get']>,
  create: (data) =>
    lowcodePagesApi.create(data as CreateLowcodePageRequest) as ReturnType<
      CrudOperations<LowcodePage>['create']
    >,
  update: (id, data) =>
    lowcodePagesApi.update(id, data as Partial<LowcodePage>) as ReturnType<
      CrudOperations<LowcodePage>['update']
    >,
  delete: async (id) => {
    const response = await lowcodePagesApi.remove(id);
    return {
      success: response.success,
      code: response.code,
      message: response.message,
      data: id,
    };
  },
};

export function PageListPage() {
  const { t } = useTranslation('lowcode');
  const queryClient = useQueryClient();
  const { addNotification } = useNotificationStore();

  const columns = useMemo<ColumnDef<LowcodePage>[]>(
    () => [
      {
        id: 'name',
        label: t('lowcode.page_list_page.k7'),
        minWidth: 160,
        render: (row) => (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
            {row.is_home && (
              <Box
                component='span'
                sx={{ color: 'primary.main', display: 'inline-flex' }}
              >
                <HomeIcon size={18} />
              </Box>
            )}
            {row.name}
          </Box>
        ),
      },
      { id: 'code', label: t('lowcode.page_list_page.k8'), minWidth: 120 },
      { id: 'type', label: t('lowcode.page_list_page.k9'), width: 120 },
      { id: 'route_path', label: t('lowcode.page_list_page.k10'), minWidth: 160 },
      {
        id: 'status',
        label: t('lowcode.page_list_page.k11'),
        width: 100,
        render: (row) => (
          <Chip
            size='small'
            label={row.status}
            color={row.status === 'published' ? 'success' : 'default'}
          />
        ),
      },
    ],
    [t]
  );

  const handleSetHome = useCallback(
    async (row: LowcodePage) => {
      if (row.is_home) return;
      try {
        const response = await lowcodePagesApi.setAsHome(row.id);
        if (!response.success) {
          throw new Error(response.message || t('lowcode.page_list_page.k4'));
        }
        addNotification({
          type: 'success',
          title: t('lowcode.page_list_page.k5'),
          message: t('lowcode.page_list_page.k14'),
        });
        queryClient.invalidateQueries({
          queryKey: [QUERY_KEY, 'list'],
          exact: false,
          refetchType: 'active',
        });
      } catch (err) {
        addNotification({
          type: 'error',
          title: t('lowcode.page_list_page.k5'),
          message: err instanceof Error ? err.message : t('lowcode.page_list_page.k4'),
        });
      }
    },
    [queryClient, addNotification, t]
  );

  const handlePublish = useCallback(
    async (row: LowcodePage) => {
      try {
        const response = await lowcodePagesApi.publish(row.id);
        if (!response.success) {
          throw new Error(response.message || t('lowcode.page_list_page.k3'));
        }
        addNotification({
          type: 'success',
          title: t('lowcode.page_list_page.k5'),
          message: t('lowcode.page_list_page.k16'),
        });
        queryClient.invalidateQueries({
          queryKey: [QUERY_KEY, 'list'],
          exact: false,
          refetchType: 'active',
        });
      } catch (err) {
        addNotification({
          type: 'error',
          title: t('lowcode.page_list_page.k5'),
          message: err instanceof Error ? err.message : t('lowcode.page_list_page.k3'),
        });
      }
    },
    [queryClient, addNotification, t]
  );

  const customRowActions: RowAction<LowcodePage>[] = useMemo(
    () => [
      {
        key: 'setHome',
        label: t('lowcode.page_list_page.k14'),
        icon: <HomeIcon size={16} />,
        show: (row) => !row.is_home,
        onClick: (row) => {
          void handleSetHome(row);
        },
      },
      {
        key: 'publish',
        label: t('lowcode.page_list_page.k16'),
        icon: <PublishIcon size={16} />,
        onClick: (row) => {
          void handlePublish(row);
        },
      },
    ],
    [handleSetHome, handlePublish, t]
  );

  const formFields = useMemo(
    () => [
      {
        key: 'app_id',
        label: t('lowcode.page_list_page.id_19'),
        type: 'text' as const,
        required: true,
      },
      {
        key: 'code',
        label: t('lowcode.page_list_page.k20'),
        type: 'text' as const,
        required: true,
      },
      {
        key: 'name',
        label: t('lowcode.page_list_page.k22'),
        type: 'text' as const,
        required: true,
      },
      {
        key: 'type',
        label: t('lowcode.page_list_page.k23'),
        type: 'select' as const,
        required: true,
        options: PAGE_TYPES.map((value) => ({ value, label: value })),
      },
      {
        key: 'route_path',
        label: t('lowcode.page_list_page.k24'),
        type: 'text' as const,
        required: true,
      },
    ],
    [t]
  );

  return (
    <ListPageTemplate<LowcodePage>
      title={t('lowcode.page_list_page.k5')}
      breadcrumbs={[{ label: t('lowcode.title') }, { label: t('lowcode.page_list_page.k5') }]}
      columns={columns}
      data={[]}
      emptyMessage={t('lowcode.page_list_page.e2')}
      crud={{
        api: lowcodePageCrudApi,
        queryKey: QUERY_KEY,
        entityName: t('lowcode.page_list_page.k5'),
        createButtonText: t('lowcode.page_list_page.e1'),
        formFields,
        formColCount: 1,
        rowActions: customRowActions,
        clickRowToView: false,
        doubleClickToEdit: false,
      }}
    />
  );
}

export default PageListPage;
