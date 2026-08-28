import { useCallback, useMemo, useState } from 'react';
import {
  Button,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Paper,
  TextField,
} from '@mui/material';
import { Eye, Play } from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { ListPageTemplate } from '@/components/templates/ListPageTemplate';
import type { ColumnDef, RowAction } from '@/components/templates/list';
import type { CrudOperations } from '@/hooks';
import { lowcodeFormsApi } from '@/api/lowcode';
import type { LowcodeForm, CreateLowcodeFormRequest } from '@/api/lowcode';
import { useNotificationStore } from '@/store';

const QUERY_KEY = 'lowcode-forms';

const lowcodeFormCrudApi: CrudOperations<LowcodeForm> = {
  list: (params) => {
    const { page, pagesize, keyword, ...rest } = params ?? {};
    return lowcodeFormsApi.list({
      page: typeof page === 'number' ? page : undefined,
      pageSize: typeof pagesize === 'number' ? pagesize : undefined,
      search: typeof keyword === 'string' ? keyword : undefined,
      ...rest,
    }) as ReturnType<CrudOperations<LowcodeForm>['list']>;
  },
  get: (id) => lowcodeFormsApi.get(id) as ReturnType<CrudOperations<LowcodeForm>['get']>,
  create: (data) =>
    lowcodeFormsApi.create(data as CreateLowcodeFormRequest) as ReturnType<
      CrudOperations<LowcodeForm>['create']
    >,
  update: (id, data) =>
    lowcodeFormsApi.update(id, data as Partial<LowcodeForm>) as ReturnType<
      CrudOperations<LowcodeForm>['update']
    >,
  delete: async (id) => {
    const response = await lowcodeFormsApi.remove(id);
    return {
      success: response.success,
      code: response.code,
      message: response.message,
      data: id,
    };
  },
};

export function FormListPage() {
  const { t } = useTranslation('lowcode');
  const queryClient = useQueryClient();
  const { addNotification } = useNotificationStore();
  const [previewForm, setPreviewForm] = useState<LowcodeForm | null>(null);

  const columns = useMemo<ColumnDef<LowcodeForm>[]>(
    () => [
      { id: 'name', label: t('lowcode.form_list_page.k7'), minWidth: 160 },
      { id: 'code', label: t('lowcode.form_list_page.k8'), minWidth: 120 },
      {
        id: 'fields',
        label: t('lowcode.form_list_page.k9'),
        width: 100,
        render: (row) => row.fields?.length ?? 0,
      },
      {
        id: 'status',
        label: t('lowcode.form_list_page.k10'),
        width: 120,
        render: (row) => (
          <Chip
            size='small'
            label={row.status}
            color={row.status === 'published' ? 'success' : 'default'}
          />
        ),
      },
      {
        id: 'version',
        label: t('lowcode.form_list_page.k11'),
        width: 80,
        render: (row) => `v${row.version}`,
      },
    ],
    [t]
  );

  const handlePublish = useCallback(
    async (row: LowcodeForm) => {
      try {
        const response = await lowcodeFormsApi.publish(row.id);
        if (!response.success) {
          throw new Error(response.message || t('lowcode.form_list_page.k4'));
        }
        addNotification({
          type: 'success',
          title: t('lowcode.form_list_page.k16'),
          message: t('lowcode.form_list_page.k16'),
        });
        queryClient.invalidateQueries({
          queryKey: [QUERY_KEY, 'list'],
          exact: false,
          refetchType: 'active',
        });
      } catch (err) {
        addNotification({
          type: 'error',
          title: t('lowcode.form_list_page.k4'),
          message: err instanceof Error ? err.message : t('lowcode.form_list_page.k4'),
        });
      }
    },
    [queryClient, addNotification, t]
  );

  const handlePreview = useCallback(
    async (row: LowcodeForm) => {
      try {
        const res = await lowcodeFormsApi.preview(row.id);
        setPreviewForm(res.data ?? null);
      } catch (err) {
        addNotification({
          type: 'error',
          title: t('lowcode.form_list_page.k3'),
          message: err instanceof Error ? err.message : t('lowcode.form_list_page.k3'),
        });
      }
    },
    [addNotification, t]
  );

  const customRowActions: RowAction<LowcodeForm>[] = useMemo(
    () => [
      {
        key: 'preview',
        label: t('lowcode.form_list_page.k14'),
        icon: <Eye size={16} />,
        onClick: (row) => {
          void handlePreview(row);
        },
      },
      {
        key: 'publish',
        label: t('lowcode.form_list_page.k16'),
        icon: <Play size={16} />,
        color: 'success',
        onClick: (row) => {
          void handlePublish(row);
        },
      },
    ],
    [handlePreview, handlePublish, t]
  );

  const formFields = useMemo(
    () => [
      {
        key: 'app_id',
        label: t('lowcode.form_list_page.id_19'),
        type: 'text' as const,
        required: true,
      },
      {
        key: 'code',
        label: t('lowcode.form_list_page.k20'),
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
            label={t('lowcode.form_list_page.k20')}
            value={value ?? ''}
            onChange={(e) => onChange(e.target.value)}
            required
            disabled={mode !== 'create'}
            helperText={mode === 'create' ? t('lowcode.form_list_page.k21') : undefined}
          />
        ),
      },
      {
        key: 'name',
        label: t('lowcode.form_list_page.k22'),
        type: 'text' as const,
        required: true,
      },
      {
        key: 'description',
        label: t('lowcode.form_list_page.k23'),
        type: 'textarea' as const,
        rows: 2,
      },
    ],
    [t]
  );

  return (
    <>
      <ListPageTemplate<LowcodeForm>
        title={t('lowcode.form_list_page.k5')}
        columns={columns}
        data={[]}
        emptyMessage={t('lowcode.form_list_page.e2')}
        crud={{
          api: lowcodeFormCrudApi,
          queryKey: QUERY_KEY,
          entityName: t('lowcode.form_list_page.k5'),
          createButtonText: t('lowcode.form_list_page.e1'),
          formFields,
          formColCount: 1,
          rowActions: customRowActions,
        }}
      />
      <Dialog
        open={!!previewForm}
        onClose={() => setPreviewForm(null)}
        maxWidth='md'
        fullWidth
      >
        <DialogTitle>{t('lowcode.form_list_page.r2', { v1: previewForm?.name })}</DialogTitle>
        <DialogContent>
          <Paper
            variant='outlined'
            sx={{ p: 2 }}
            component='pre'
          >
            {JSON.stringify(previewForm, null, 2)}
          </Paper>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setPreviewForm(null)}>{t('lowcode.form_list_page.k26')}</Button>
        </DialogActions>
      </Dialog>
    </>
  );
}

export default FormListPage;
