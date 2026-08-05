import React from 'react';
import { FormDialog, FormDrawer } from '@/components/common';
import type { ListPageCrudConfig } from './types';

export interface CrudFormDialogProps {
  open: boolean;
  mode: 'create' | 'edit' | 'view';
  crud: ListPageCrudConfig<any, any, any> | undefined;
  submitting: boolean;
  formContent: React.ReactNode;
  onClose: () => void;
  onSubmit: () => void;
}

/**
 * CRUD 表单容器（Dialog 或 Drawer 模式）
 * 从 ListPageTemplate 中抽离的 CRUD 表单容器渲染
 */
export const CrudFormDialog: React.FC<CrudFormDialogProps> = ({
  open,
  mode,
  crud,
  submitting,
  formContent,
  onClose,
  onSubmit,
}) => {
  if (!crud) return null;

  const title =
    mode === 'create'
      ? `{t('components.components.crudformdialog.key_4573d8')}{crud.entityName || ""}`
      : mode === 'edit'
        ? `{t('components.components.crudformdialog.key_4fcdf1')}{crud.entityName || ""}`
        : `{t('components.components.crudformdialog.key_2c7943')}{crud.entityName || "'}`;

  if (crud.editMode === 'drawer') {
    return (
      <FormDrawer
        open={open}
        title={title}
        onClose={onClose}
        onSubmit={onSubmit}
        loading={submitting}
        width={crud.drawerWidth}
        anchor={crud.drawerAnchor as any}
      >
        {formContent}
      </FormDrawer>
    );
  }

  return (
    <FormDialog
      open={open}
      title={title}
      onClose={onClose}
      onSubmit={onSubmit}
      loading={submitting}
      maxWidth={crud.dialogMaxWidth as any}
    >
      {formContent}
    </FormDialog>
  );
};
