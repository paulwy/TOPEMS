import React, { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { ListPageTemplate } from '@/components/templates/ListPageTemplate';
import type { ColumnDef } from '@/components/templates/list';
import type { CrudOperations } from '@/hooks';
import { lowcodeDataModelsApi } from '@/api/lowcode';
import type { LowcodeDataModel, CreateLowcodeDataModelRequest } from '@/api/lowcode';

const QUERY_KEY = 'lowcode-data-models';

const lowcodeDataModelCrudApi: CrudOperations<LowcodeDataModel> = {
  list: (params) => {
    const { page, pagesize, keyword, ...rest } = params ?? {};
    return lowcodeDataModelsApi.list({
      page: typeof page === 'number' ? page : undefined,
      pageSize: typeof pagesize === 'number' ? pagesize : undefined,
      search: typeof keyword === 'string' ? keyword : undefined,
      ...rest,
    }) as ReturnType<CrudOperations<LowcodeDataModel>['list']>;
  },
  get: (id) => lowcodeDataModelsApi.get(id) as ReturnType<CrudOperations<LowcodeDataModel>['get']>,
  create: (data) =>
    lowcodeDataModelsApi.create(data as CreateLowcodeDataModelRequest) as ReturnType<
      CrudOperations<LowcodeDataModel>['create']
    >,
  update: (id, data) =>
    lowcodeDataModelsApi.update(id, data) as ReturnType<CrudOperations<LowcodeDataModel>['update']>,
  delete: async (id) => {
    const response = await lowcodeDataModelsApi.remove(id);
    return {
      success: response.success,
      code: response.code,
      message: response.message,
      data: id,
    };
  },
};

export function DataModelListPage() {
  const { t } = useTranslation('lowcode');

  const columns = useMemo<ColumnDef<LowcodeDataModel>[]>(
    () => [
      { id: 'model_name', label: t('lowcode.data_model_list_page.k5'), minWidth: 160 },
      { id: 'label', label: t('lowcode.data_model_list_page.k6'), minWidth: 160 },
      {
        id: 'fields',
        label: t('lowcode.data_model_list_page.k7'),
        width: 100,
        render: (row) => row.fields?.length ?? 0,
      },
      {
        id: 'materialized',
        label: t('lowcode.data_model_list_page.k8'),
        width: 120,
        render: (row) =>
          row.materialized
            ? t('lowcode.data_model_list_page.k12')
            : t('lowcode.data_model_list_page.k11'),
      },
      { id: 'updated_at', label: t('lowcode.data_model_list_page.k9'), width: 160 },
    ],
    [t]
  );

  const formFields = useMemo(
    () => [
      {
        key: 'app_id',
        label: t('lowcode.data_model_list_page.id_15'),
        type: 'text' as const,
        required: true,
      },
      {
        key: 'model_name',
        label: t('lowcode.data_model_list_page.k17'),
        type: 'text' as const,
        required: true,
      },
      {
        key: 'label',
        label: t('lowcode.data_model_list_page.k18'),
        type: 'text' as const,
        required: true,
      },
      {
        key: 'description',
        label: t('lowcode.data_model_list_page.k19'),
        type: 'textarea' as const,
        rows: 2,
      },
    ],
    [t]
  );

  return (
    <ListPageTemplate<LowcodeDataModel>
      title={t('lowcode.data_model_list_page.k3')}
      breadcrumbs={[{ label: t('lowcode.title') }, { label: t('lowcode.data_model_list_page.k3') }]}
      columns={columns}
      data={[]}
      emptyMessage={t('lowcode.data_model_list_page.e2')}
      crud={{
        api: lowcodeDataModelCrudApi,
        queryKey: QUERY_KEY,
        entityName: t('lowcode.data_model_list_page.k3'),
        createButtonText: t('lowcode.data_model_list_page.e1'),
        formFields,
        formColCount: 1,
        clickRowToView: false,
        doubleClickToEdit: false,
      }}
    />
  );
}

export default DataModelListPage;
