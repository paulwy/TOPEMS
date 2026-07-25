import React, { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Send, Check, XCircle, UserCheck } from 'lucide-react';

import CrudPage from '@/components/templates/CrudPage';
import type { CrudApiAdapter } from '@/components/templates/CrudPage';
import type { RowAction } from '@/components/templates/list/types';
import { ConfirmDialog } from '@topems/shared-components';

import { createCrudPageAdapter } from '@/schema/crudPageAdapter';
import { supplierAdmissionSchema } from '@/schemas/scm';
import { scmApi } from '@/api/scm';
import type {
  SupplierAdmission,
  CreateSupplierAdmissionRequest,
  UpdateSupplierAdmissionRequest,
} from '@/api/scm';
import { useNotificationStore } from '@/store';
import { apiLogger } from '@/utils/logger';

const apiAdapter = createCrudPageAdapter<
  SupplierAdmission,
  CreateSupplierAdmissionRequest,
  UpdateSupplierAdmissionRequest
>(scmApi.supplierAdmissions);

interface PendingAction {
  title: string;
  message: string;
  onConfirm: () => void;
  danger?: boolean;
}

const SupplierAdmissionPage: React.FC = () => {
  const queryClient = useQueryClient();
  const { addNotification } = useNotificationStore();
  const [pendingAction, setPendingAction] = useState<PendingAction | null>(null);

  const invalidateAdmissions = () =>
    queryClient.invalidateQueries({ queryKey: [supplierAdmissionSchema.entity] });

  const submitMutation = useMutation({
    mutationFn: (id: string) => scmApi.supplierAdmissions.submit(id),
    onSuccess: () => {
      invalidateAdmissions();
      addNotification({
        type: 'success',
        title: '提交成功',
        message: '供应商准入已提交审核',
      });
    },
    onError: (err: unknown) => {
      apiLogger.error('提交失败:', err);
      addNotification({
        type: 'error',
        title: '提交失败',
        message: '提交供应商准入失败',
      });
    },
  });

  const approveMutation = useMutation({
    mutationFn: (id: string) => scmApi.supplierAdmissions.approve(id),
    onSuccess: () => {
      invalidateAdmissions();
      addNotification({
        type: 'success',
        title: '已通过',
        message: '供应商准入已通过',
      });
    },
    onError: (err: unknown) => {
      apiLogger.error('操作失败:', err);
      addNotification({
        type: 'error',
        title: '操作失败',
        message: '通过供应商准入失败',
      });
    },
  });

  const rejectMutation = useMutation({
    mutationFn: (id: string) => scmApi.supplierAdmissions.reject(id),
    onSuccess: () => {
      invalidateAdmissions();
      addNotification({
        type: 'success',
        title: '已拒绝',
        message: '供应商准入已拒绝',
      });
    },
    onError: (err: unknown) => {
      apiLogger.error('操作失败:', err);
      addNotification({
        type: 'error',
        title: '操作失败',
        message: '拒绝供应商准入失败',
      });
    },
  });

  const activateMutation = useMutation({
    mutationFn: (id: string) => scmApi.supplierAdmissions.activateSupplier(id),
    onSuccess: () => {
      invalidateAdmissions();
      addNotification({
        type: 'success',
        title: '准入成功',
        message: '供应商已正式准入',
      });
    },
    onError: (err: unknown) => {
      apiLogger.error('准入失败:', err);
      addNotification({
        type: 'error',
        title: '准入失败',
        message: '供应商准入失败',
      });
    },
  });

  const customRowActions: RowAction<SupplierAdmission>[] = [
    {
      key: 'submit',
      label: '提交',
      icon: <Send size={14} />,
      color: 'primary',
      show: (row) => row.status === 'draft',
      onClick: (row) => {
        setPendingAction({
          title: '确认提交',
          message: `确定要提交供应商准入 "${row.admission_no}" 审核吗？`,
          onConfirm: () => submitMutation.mutate(row.id),
        });
      },
    },
    {
      key: 'approve',
      label: '通过',
      icon: <Check size={14} />,
      color: 'success',
      show: (row) => row.status === 'pending',
      onClick: (row) => {
        setPendingAction({
          title: '确认通过',
          message: `确定要通过供应商准入 "${row.admission_no}" 吗？`,
          onConfirm: () => approveMutation.mutate(row.id),
        });
      },
    },
    {
      key: 'reject',
      label: '拒绝',
      icon: <XCircle size={14} />,
      color: 'error',
      show: (row) => row.status === 'pending',
      onClick: (row) => {
        setPendingAction({
          title: '确认拒绝',
          message: `确定要拒绝供应商准入 "${row.admission_no}" 吗？`,
          onConfirm: () => rejectMutation.mutate(row.id),
          danger: true,
        });
      },
    },
    {
      key: 'activate',
      label: '准入',
      icon: <UserCheck size={14} />,
      color: 'success',
      show: (row) => row.status === 'approved',
      onClick: (row) => {
        setPendingAction({
          title: '确认准入',
          message: `确定要将供应商 "${row.supplier_name}" 正式准入吗？`,
          onConfirm: () => activateMutation.mutate(row.id),
        });
      },
    },
  ];

  return (
    <>
      <CrudPage
        schema={supplierAdmissionSchema}
        apiAdapter={apiAdapter as CrudApiAdapter}
        customRowActions={customRowActions as RowAction[]}
        breadcrumbs={[{ label: 'SCM' }, { label: '供应商准入管理' }]}
      />

      <ConfirmDialog
        isOpen={!!pendingAction}
        onClose={() => setPendingAction(null)}
        onConfirm={() => {
          pendingAction?.onConfirm();
          setPendingAction(null);
        }}
        title={pendingAction?.title || ''}
        message={pendingAction?.message || ''}
        danger={pendingAction?.danger}
      />
    </>
  );
};

export default SupplierAdmissionPage;
