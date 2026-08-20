import { useState, useEffect, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { useParams } from 'react-router-dom';
import { useConfirmDialog } from '@/hooks';
import { tenantApi } from '@/api/tenant';
import { logger } from '@/utils/logger';
import { QUERY_KEYS, queryClient } from '@/lib/reactQuery';

import type {
  Tenant,
  TenantUser,
  TenantStats,
  TenantRole,
  TenantInvoice,
} from '@/api/tenant/types';

const useTenantDetail = () => {
  const { tenantId } = useParams<{ tenantId: string }>();
  const queryClient = useQueryClient();
  const { t } = useTranslation();

  const [showInviteDialog, setShowInviteDialog] = useState(false);
  const [inviteForm, setInviteForm] = useState({ email: '', role: 'member' as TenantRole });
  const {
    confirmOpen: confirmDialogOpen,
    confirmConfig,
    openConfirm: openConfirmDialog,
    closeConfirm: setConfirmDialogClosed,
  } = useConfirmDialog();

  const tenantQuery = useQuery<Tenant | null>({
    queryKey: [...QUERY_KEYS.AD_HOC.ADMIN_TENANT_BASE, tenantId],
    queryFn: async () => {
      if (!tenantId) return null;
      const res = await tenantApi.getTenant(tenantId);
      return res.success && res.data ? res.data : null;
    },
    enabled: !!tenantId,
    staleTime: 5 * 60 * 1000,
  });

  const statsQuery = useQuery<TenantStats | null>({
    queryKey: [...QUERY_KEYS.AD_HOC.ADMIN_TENANT_STATS_BASE, tenantId],
    queryFn: async () => {
      if (!tenantId) return null;
      const res = await tenantApi.getTenantStats(tenantId);
      return res.success && res.data ? res.data : null;
    },
    enabled: !!tenantId,
    staleTime: 5 * 60 * 1000,
  });

  const usersQuery = useQuery<{ items: TenantUser[] }>({
    queryKey: [...QUERY_KEYS.AD_HOC.ADMIN_TENANT_USERS_BASE, tenantId],
    queryFn: async () => {
      if (!tenantId) return { items: [] };
      const res = await tenantApi.getTenantUsers(tenantId, { pageSize: 100 });
      if (res.success && res.data) {
        return { items: res.data.items };
      }
      return { items: [] };
    },
    enabled: !!tenantId,
    staleTime: 5 * 60 * 1000,
  });

  const invoicesQuery = useQuery<TenantInvoice[]>({
    queryKey: [...QUERY_KEYS.AD_HOC.ADMIN_TENANT_INVOICES_BASE, tenantId],
    queryFn: async () => {
      if (!tenantId) return [];
      const res = await tenantApi.getInvoices(tenantId);
      return res.success && res.data ? res.data : [];
    },
    enabled: !!tenantId,
    staleTime: 5 * 60 * 1000,
  });

  const tenant = tenantQuery.data ?? null;
  const stats = statsQuery.data ?? null;
  const users = usersQuery.data?.items ?? [];
  const invoices = invoicesQuery.data ?? [];
  const loading = tenantQuery.isLoading;
  const usersLoading = usersQuery.isLoading;

  useEffect(() => {
    if (tenantQuery.isError) {
      logger.error('Failed to load tenant:', tenantQuery.error);
    }
  }, [tenantQuery.isError, tenantQuery.error]);

  useEffect(() => {
    if (statsQuery.isError) {
      logger.error('Failed to load tenant stats:', statsQuery.error);
    }
  }, [statsQuery.isError, statsQuery.error]);

  useEffect(() => {
    if (usersQuery.isError) {
      logger.error('Failed to load users:', usersQuery.error);
    }
  }, [usersQuery.isError, usersQuery.error]);

  useEffect(() => {
    if (invoicesQuery.isError) {
      logger.error('Failed to load invoices:', invoicesQuery.error);
    }
  }, [invoicesQuery.isError, invoicesQuery.error]);

  const invalidateUsers = () =>
    queryClient.invalidateQueries({
      queryKey: QUERY_KEYS.AD_HOC.ADMIN_TENANT_USERS_BASE,
      exact: false,
      refetchType: 'active',
    });

  const inviteMemberMutation = useMutation({
    mutationFn: (params: { tenantId: string; data: { email: string; role: TenantRole } }) =>
      tenantApi.inviteMember(params.tenantId, params.data),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: QUERY_KEYS.AD_HOC.ADMIN_TENANT_BASE,
        exact: false,
        refetchType: 'active',
      });
      invalidateUsers();
      setShowInviteDialog(false);
      setInviteForm({ email: '', role: 'member' });
    },
    onError: (error: unknown) => {
      logger.error('Failed to invite member:', error);
    },
  });

  const removeMemberMutation = useMutation({
    mutationFn: (params: { tenantId: string; userId: string }) =>
      tenantApi.removeMember(params.tenantId, params.userId),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: QUERY_KEYS.AD_HOC.ADMIN_TENANT_BASE,
        exact: false,
        refetchType: 'active',
      });
      invalidateUsers();
      setConfirmDialogClosed();
    },
    onError: (error: unknown) => {
      logger.error('Failed to remove member:', error);
    },
  });

  const updateMemberRoleMutation = useMutation({
    mutationFn: (params: { tenantId: string; userId: string; role: TenantRole }) =>
      tenantApi.updateMemberRole(params.tenantId, params.userId, { role: params.role }),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: QUERY_KEYS.AD_HOC.ADMIN_TENANT_BASE,
        exact: false,
        refetchType: 'active',
      });
      invalidateUsers();
    },
    onError: (error: unknown) => {
      logger.error('Failed to update member role:', error);
    },
  });

  const handleInviteMember = () => {
    if (!tenantId) return;
    inviteMemberMutation.mutate({ tenantId, data: inviteForm });
  };

  const handleRemoveMember = useCallback(
    (user: TenantUser) => {
      openConfirmDialog({
        title: t('admin.tenant_detail.confirm_remove_member'),
        message: t('admin.tenant_detail_page.text_f58fc2', { user_email: user.email }),
        danger: true,
        onConfirm: () => {
          if (!tenantId) return;
          removeMemberMutation.mutate({ tenantId, userId: user.id });
        },
      });
    },
    [tenantId, removeMemberMutation, openConfirmDialog, t]
  );

  const handleUpdateMemberRole = (userId: string, role: TenantRole) => {
    if (!tenantId) return;
    updateMemberRoleMutation.mutate({ tenantId, userId, role });
  };

  return {
    tenantId,
    tenant,
    stats,
    users,
    invoices,
    loading,
    usersLoading,
    showInviteDialog,
    setShowInviteDialog,
    inviteForm,
    setInviteForm,
    confirmDialogOpen,
    confirmConfig,
    setConfirmDialogClosed,
    handleInviteMember,
    handleRemoveMember,
    handleUpdateMemberRole,
    refetchTenant: tenantQuery.refetch,
    refetchStats: statsQuery.refetch,
  };
};
