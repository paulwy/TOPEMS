import { useMemo } from 'react';
import { FormBuilder } from '@/components/common';
import { getFormFields } from '@/schema-dsl';
import type { EntitySchema } from '@/schema-dsl';
// SchemaForm 之前完全忽略 schema.dynamicOptions，走这条路渲染的表单
// （WMS 的库位/入库单/序列号、SRM 供应商明细等）下拉永远是空的
import { mergeDynamicOptions, useDynamicOptions } from '@/hooks/useDynamicOptions';
import i18n from '@/i18n';

interface SchemaFormProps<T> {
  schema: EntitySchema<Record<string, unknown>>;
  mode: 'create' | 'edit' | 'view';
  record: T | null;
  onSubmit: (data: Partial<T>) => Promise<boolean>;
  onClose: () => void;
}

export function SchemaForm<T>({ schema, mode, record, onSubmit, onClose }: SchemaFormProps<T>) {
  const dynamicOptions = useDynamicOptions(schema.dynamicOptions);
  const fields = useMemo(
    () =>
      mergeDynamicOptions(
        getFormFields<Record<string, unknown>>(schema, mode === 'view' ? 'view' : mode),
        dynamicOptions
      ),
    [schema, mode, dynamicOptions]
  );

  return (
    <FormBuilder
      fields={fields}
      mode={mode}
      initialValues={(record as unknown as Record<string, unknown>) || {}}
      colCount={schema.formColCount || 2}
      showReset={mode !== 'view'}
      submitLabel={
        mode === 'create'
          ? i18n.t('common.create')
          : mode === 'edit'
            ? i18n.t('common.save')
            : undefined
      }
      resetLabel={i18n.t('common.cancel')}
      onSubmit={async (values) => {
        const ok = await onSubmit(values as unknown as Partial<T>);
        if (!ok) {
          throw new Error(i18n.t('common.submit_failed'));
        }
      }}
      onReset={onClose}
    />
  );
}
