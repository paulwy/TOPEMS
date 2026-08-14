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
import i18n from '@/i18n';
import { useNotificationStore } from '@/store';
import { apiLogger } from '@/utils/logger';

import { queryClient, QUERY_KEYS } from '@/lib/reactQuery';
import { useTranslation } from 'react-i18next';

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
  const { t } = useTranslation('scm');
  const queryClient = useQueryClient();
  const { addNotification } = useNotificationStore();
  const [pendingAction, setPendingAction] = useState<PendingAction | null>(null);

  const invalidateAdmissions = () =>
    queryClient.invalidateQueries({
      queryKey: [supplierAdmissionSchema.entity],
      exact: false,
      refetchType: 'active',
    });

  const submitMutation = useMutation({
    mutationFn: (id: string) => scmApi.supplierAdmissions.submit(id),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: QUERY_KEYS.SCM.OVERVIEW,
        exact: false,
        refetchType: 'active',
      });
      invalidateAdmissions();
      addNotification({
        type: 'success',
        title: t('scm.supplier_admission_page.k0'),
        message: t('scm.supplier_admission_page.k1'),
      });
    },
    onError: (err: unknown) => {
      apiLogger.error(i18n.t('scm.supplier_admission_page.m1'), err);
      addNotification({
        type: 'error',
        title: t('scm.supplier_admission_page.k2'),
        message: t('scm.supplier_admission_page.k3'),
      });
    },
  });

  const approveMutation = useMutation({
    mutationFn: (id: string) => scmApi.supplierAdmissions.approve(id),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: QUERY_KEYS.SCM.OVERVIEW,
        exact: false,
        refetchType: 'active',
      });
      invalidateAdmissions();
      addNotification({
        type: 'success',
        title: t('scm.supplier_admission_page.k4'),
        message: t('scm.supplier_admission_page.k5'),
      });
    },
    onError: (err: unknown) => {
      apiLogger.error(i18n.t('scm.supplier_admission_page.m2'), err);
      addNotification({
        type: 'error',
        title: t('scm.supplier_admission_page.k6'),
        message: t('scm.supplier_admission_page.k7'),
      });
    },
  });

  const rejectMutation = useMutation({
    mutationFn: (id: string) => scmApi.supplierAdmissions.reject(id),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: QUERY_KEYS.SCM.OVERVIEW,
        exact: false,
        refetchType: 'active',
      });
      invalidateAdmissions();
      addNotification({
        type: 'success',
        title: t('scm.supplier_admission_page.k8'),
        message: t('scm.supplier_admission_page.k9'),
      });
    },
    onError: (err: unknown) => {
      apiLogger.error(i18n.t('scm.supplier_admission_page.m2'), err);
      addNotification({
        type: 'error',
        title: t('scm.supplier_admission_page.k10'),
        message: t('scm.supplier_admission_page.k11'),
      });
    },
  });

  const activateMutation = useMutation({
    mutationFn: (id: string) => scmApi.supplierAdmissions.activateSupplier(id),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: QUERY_KEYS.SCM.OVERVIEW,
        exact: false,
        refetchType: 'active',
      });
      invalidateAdmissions();
      addNotification({
        type: 'success',
        title: t('scm.supplier_admission_page.k12'),
        message: t('scm.supplier_admission_page.k13'),
      });
    },
    onError: (err: unknown) => {
      apiLogger.error(i18n.t('scm.supplier_admission_page.m4'), err);
      addNotification({
        type: 'error',
        title: t('scm.supplier_admission_page.k14'),
        message: t('scm.supplier_admission_page.k15'),
      });
    },
  });

  const customRowActions: RowAction<SupplierAdmission>[] = [
    {
      key: 'submit',
      label: t('scm.supplier_admission_page.k16'),
      icon: <Send size={14} />,
      color: 'primary',
      show: (row) => row.status === 'draft',
      onClick: (row) => {
        setPendingAction({
          title: t('scm.supplier_admission_page.k17'),
          message: i18n.t('scm.supplier_admission_page.e1', { v1: row.admission_no }),
          onConfirm: () => submitMutation.mutate(row.id),
        });
      },
    },
    {
      key: 'approve',
      label: t('scm.supplier_admission_page.k18'),
      icon: <Check size={14} />,
      color: 'success',
      show: (row) => row.status === 'pending',
      onClick: (row) => {
        setPendingAction({
          title: t('scm.supplier_admission_page.k19'),
          message: i18n.t('scm.supplier_admission_page.e2', { v1: row.admission_no }),
          onConfirm: () => approveMutation.mutate(row.id),
        });
      },
    },
    {
      key: 'reject',
      label: t('scm.supplier_admission_page.k20'),
      icon: <XCircle size={14} />,
      color: 'error',
      show: (row) => row.status === 'pending',
      onClick: (row) => {
        setPendingAction({
          title: t('scm.supplier_admission_page.k21'),
          message: i18n.t('scm.supplier_admission_page.e3', { v1: row.admission_no }),
          onConfirm: () => rejectMutation.mutate(row.id),
          danger: true,
        });
      },
    },
    {
      key: 'activate',
      label: t('scm.supplier_admission_page.k22'),
      icon: <UserCheck size={14} />,
      color: 'success',
      show: (row) => row.status === 'approved',
      onClick: (row) => {
        setPendingAction({
          title: t('scm.supplier_admission_page.k23'),
          message: i18n.t('scm.supplier_admission_page.e4', { v1: row.supplier_name }),
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
        customRowActions={customRowActions as unknown as RowAction<Record<string, unknown>>[]}
        breadcrumbs={[{ label: 'SCM' }, { label: t('scm.supplier_admission_page.k24') }]}
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
