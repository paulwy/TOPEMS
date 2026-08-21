import React, { useMemo } from 'react';
import { FormBuilder } from '@/components/common';
import { getFormFields } from '@/schema';
import type { EntitySchema } from '@/schema';
import i18n from '@/i18n';

interface SchemaFormProps<T> {
  schema: EntitySchema<Record<string, unknown>>;
  mode: 'create' | 'edit' | 'view';
  record: T | null;
  onSubmit: (data: Partial<T>) => Promise<boolean>;
  onClose: () => void;
}

export function SchemaForm<T>({
  schema,
  mode,
  record,
  onSubmit,
  onClose,
}: SchemaFormProps<T>) {
  const fields = useMemo(
    () => getFormFields<Record<string, unknown>>(schema, mode === 'view' ? 'view' : mode),
    [schema, mode]
  );

  return (
    <FormBuilder
      fields={fields}
      mode={mode}
      initialValues={((record as unknown) as Record<string, unknown>) || {}}
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
