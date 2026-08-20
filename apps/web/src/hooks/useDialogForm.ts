import { useState, useCallback } from 'react';
import { useForm, type UseFormProps, type FieldValues, type DefaultValues } from 'react-hook-form';

interface UseDialogFormOptions<T extends FieldValues> {
  formOptions?: UseFormProps<T>;
}

interface UseDialogFormResult<T extends FieldValues> {
  open: boolean;
  mode: 'create' | 'edit' | 'view';
  editingData: Partial<T> | null;
  openCreate: () => void;
  openEdit: (data: Partial<T>) => void;
  openView: (data: Partial<T>) => void;
  close: () => void;
  form: ReturnType<typeof useForm<T>>;
  isEdit: boolean;
  isView: boolean;
}

export function useDialogForm<T extends FieldValues>({
  formOptions,
}: UseDialogFormOptions<T> = {}): UseDialogFormResult<T> {
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<'create' | 'edit' | 'view'>('create');
  const [editingData, setEditingData] = useState<Partial<T> | null>(null);

  const form = useForm<T>(formOptions as UseFormProps<T>);

  const openCreate = useCallback(() => {
    setMode('create');
    setEditingData(null);
    form.reset({} as DefaultValues<T>);
    setOpen(true);
  }, [form]);

  const openEdit = useCallback(
    (data: Partial<T>) => {
      setMode('edit');
      setEditingData(data);
      form.reset(data as DefaultValues<T>);
      setOpen(true);
    },
    [form]
  );

  const openView = useCallback(
    (data: Partial<T>) => {
      setMode('view');
      setEditingData(data);
      form.reset(data as DefaultValues<T>);
      setOpen(true);
    },
    [form]
  );

  const close = useCallback(() => {
    setOpen(false);
    form.reset({} as DefaultValues<T>);
  }, [form]);

  return {
    open,
    mode,
    editingData,
    openCreate,
    openEdit,
    openView,
    close,
    form,
    isEdit: mode === 'edit',
    isView: mode === 'view',
  };
}

export default useDialogForm;
