import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Chip } from '@mui/material';
import { emailApi, type Email, type EmailStats } from '@/api/mail';
import { useNotificationStore } from '@/store';
import { QUERY_KEYS, CACHE_DURATIONS } from '@/lib/reactQuery';
import { validateEmailList } from '@/components/im/mail/utils';
import { STATUS_MAP, PRIORITY_MAP } from '@/components/im/mail/constants';
import type { SendForm } from '@/components/im/mail/types';
import i18n from '@/i18n';

const INITIAL_SEND_FORM: SendForm = {
  subject: '',
  to_addresses: '',
  cc_addresses: '',
  bcc_addresses: '',
  body: '',
  priority: 'normal',
};

export function useMailPage() {
  const addNotification = useNotificationStore((state) => state.addNotification);
  const queryClient = useQueryClient();

  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [priorityFilter, setPriorityFilter] = useState('');

  const [showSendModal, setShowSendModal] = useState(false);
  const [showEmailDetail, setShowEmailDetail] = useState(false);
  const [selectedEmail, setSelectedEmail] = useState<Email | null>(null);

  const [sendForm, setSendForm] = useState<SendForm>(INITIAL_SEND_FORM);

  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 10;

  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [selectedEmails, setSelectedEmails] = useState<string[]>([]);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const [deleteEmailDialogOpen, setDeleteEmailDialogOpen] = useState(false);
  const [deletingEmailId, setDeletingEmailId] = useState<string | null>(null);
  const [resendEmailDialogOpen, setResendEmailDialogOpen] = useState(false);
  const [resendingEmailId, setResendingEmailId] = useState<string | null>(null);
  const [batchDeleteDialogOpen, setBatchDeleteDialogOpen] = useState(false);
  const [batchResendDialogOpen, setBatchResendDialogOpen] = useState(false);

  const statsQuery = useQuery<EmailStats | null>({
    queryKey: QUERY_KEYS.MAIL.STATS,
    queryFn: async () => {
      try {
        const res = await emailApi.getStats();
        if (res.success && res.data) {
          return res.data;
        }
      } catch (err: unknown) {
        addNotification({
          title: i18n.t('im.hooks.k0'),
          message: (err as { message?: string }).message || i18n.t('im.hooks.k1'),
          type: 'error',
        });
      }
      return null;
    },
    staleTime: CACHE_DURATIONS.MEDIUM,
  });

  const emailsQuery = useQuery<{ items: Email[]; total: number }>({
    queryKey: [
      ...QUERY_KEYS.MAIL.EMAILS,
      currentPage,
      pageSize,
      searchQuery,
      statusFilter,
      priorityFilter,
    ],
    queryFn: async () => {
      try {
        const res = await emailApi.list({
          page: currentPage,
          page_size: pageSize,
          search: searchQuery || undefined,
          status: statusFilter || undefined,
          priority: priorityFilter || undefined,
        });
        if (res.success && res.data) {
          return { items: res.data.items || [], total: res.data.total || 0 };
        }
      } catch (err: unknown) {
        addNotification({
          title: i18n.t('im.hooks.k2'),
          message: (err as { message?: string }).message || i18n.t('im.hooks.k3'),
          type: 'error',
        });
      }
      return { items: [], total: 0 };
    },
    staleTime: CACHE_DURATIONS.MEDIUM,
  });

  const emails = emailsQuery.data?.items ?? [];
  const totalEmails = emailsQuery.data?.total ?? 0;
  const loading = emailsQuery.isLoading;
  const stats = statsQuery.data ?? null;
  const statsLoading = statsQuery.isLoading;

  const resetSendForm = () => {
    setSendForm(INITIAL_SEND_FORM);
  };

  const sendEmailMutation = useMutation({
    mutationFn: async (params: {
      subject: string;
      to_addresses: string[];
      cc_addresses?: string[];
      bcc_addresses?: string[];
      body: string;
      priority: string;
    }) =>
      emailApi.send({
        subject: params.subject,
        to_addresses: params.to_addresses,
        cc_addresses: params.cc_addresses,
        bcc_addresses: params.bcc_addresses,
        body: params.body,
        priority: params.priority,
      }),
    onSuccess: (res) => {
      if (res.success) {
        addNotification({
          title: i18n.t('im.hooks.k7'),
          message: i18n.t('im.hooks.k6'),
          type: 'success',
        });
        setShowSendModal(false);
        resetSendForm();
        queryClient.invalidateQueries({
          queryKey: QUERY_KEYS.MAIL.EMAILS,
          exact: false,
          refetchType: 'active',
        });
      } else {
        addNotification({
          title: i18n.t('im.hooks.k9'),
          message: res.message || i18n.t('im.hooks.k8'),
          type: 'error',
        });
      }
    },
    onError: (err: unknown) => {
      addNotification({
        title: i18n.t('im.hooks.k10'),
        message: (err as { message?: string }).message || i18n.t('im.hooks.k11'),
        type: 'error',
      });
    },
  });

  const handleSendEmail = (e: React.FormEvent) => {
    e.preventDefault();
    const errors: Record<string, string> = {};

    if (!sendForm.subject.trim()) {
      errors.subject = i18n.t('im.hooks.k12');
    }

    if (!sendForm.to_addresses.trim()) {
      errors.to_addresses = i18n.t('im.hooks.k13');
    } else {
      const { valid, invalidEmails } = validateEmailList(sendForm.to_addresses);
      if (!valid) {
        errors.to_addresses = i18n.t('im.mail_page_hooks.e1', { v1: invalidEmails.join(', ') });
      }
    }

    if (sendForm.cc_addresses && !validateEmailList(sendForm.cc_addresses).valid) {
      const { invalidEmails } = validateEmailList(sendForm.cc_addresses);
      errors.cc_addresses = i18n.t('im.mail_page_hooks.e2', { v1: invalidEmails.join(', ') });
    }

    if (sendForm.bcc_addresses && !validateEmailList(sendForm.bcc_addresses).valid) {
      const { invalidEmails } = validateEmailList(sendForm.bcc_addresses);
      errors.bcc_addresses = i18n.t('im.mail_page_hooks.e3', { v1: invalidEmails.join(', ') });
    }

    if (!sendForm.body.trim()) {
      errors.body = i18n.t('im.hooks.k14');
    }

    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      return;
    }

    setFormErrors({});

    const toAddresses = sendForm.to_addresses
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);
    const ccAddresses = sendForm.cc_addresses
      ? sendForm.cc_addresses
          .split(',')
          .map((s) => s.trim())
          .filter(Boolean)
      : undefined;
    const bccAddresses = sendForm.bcc_addresses
      ? sendForm.bcc_addresses
          .split(',')
          .map((s) => s.trim())
          .filter(Boolean)
      : undefined;

    sendEmailMutation.mutate({
      subject: sendForm.subject,
      to_addresses: toAddresses,
      cc_addresses: ccAddresses,
      bcc_addresses: bccAddresses,
      body: sendForm.body,
      priority: sendForm.priority,
    });
  };

  const deleteEmailMutation = useMutation({
    mutationFn: (id: string) => emailApi.delete(id),
    onSuccess: (res, id) => {
      if (res.success) {
        addNotification({
          title: i18n.t('im.hooks.k17'),
          message: i18n.t('im.hooks.k16'),
          type: 'success',
        });
        setSelectedEmails((prev) => prev.filter((emailId) => emailId !== id));
        queryClient.invalidateQueries({
          queryKey: QUERY_KEYS.MAIL.EMAILS,
          exact: false,
          refetchType: 'active',
        });
      } else {
        addNotification({
          title: i18n.t('im.hooks.k19'),
          message: res.message || i18n.t('im.hooks.k18'),
          type: 'error',
        });
      }
    },
    onError: (err: unknown) => {
      addNotification({
        title: i18n.t('im.hooks.k20'),
        message: (err as { message?: string }).message || i18n.t('im.hooks.k21'),
        type: 'error',
      });
    },
  });

  const handleDeleteEmail = () => {
    if (!deletingEmailId) return;
    deleteEmailMutation.mutate(deletingEmailId);
  };

  const openDeleteEmailDialog = (emailId: string) => {
    setDeletingEmailId(emailId);
    setDeleteEmailDialogOpen(true);
  };

  const resendEmailMutation = useMutation({
    mutationFn: async (emailId: string) => {
      const res = await emailApi.get(emailId);
      if (res.success && res.data) {
        const email = res.data;
        const toAddresses = Array.isArray(email.to_addresses)
          ? email.to_addresses
          : [email.to_addresses];
        const ccAddresses = email.cc_addresses
          ? Array.isArray(email.cc_addresses)
            ? email.cc_addresses
            : [email.cc_addresses]
          : undefined;
        const bccAddresses = email.bcc_addresses
          ? Array.isArray(email.bcc_addresses)
            ? email.bcc_addresses
            : [email.bcc_addresses]
          : undefined;

        return emailApi.send({
          subject: email.subject,
          to_addresses: toAddresses,
          cc_addresses: ccAddresses,
          bcc_addresses: bccAddresses,
          body: email.body,
          priority: email.priority,
        });
      }
      throw new Error(i18n.t('im.hooks.k22'));
    },
    onSuccess: (sendRes) => {
      if (sendRes.success) {
        addNotification({
          title: i18n.t('im.hooks.k24'),
          message: i18n.t('im.hooks.k23'),
          type: 'success',
        });
        queryClient.invalidateQueries({
          queryKey: QUERY_KEYS.MAIL.EMAILS,
          exact: false,
          refetchType: 'active',
        });
      } else {
        addNotification({
          title: i18n.t('im.hooks.k25'),
          message: sendRes.message || i18n.t('im.hooks.k26'),
          type: 'error',
        });
      }
    },
    onError: (err: unknown) => {
      addNotification({
        title: i18n.t('im.hooks.k27'),
        message: (err as { message?: string }).message || i18n.t('im.hooks.k28'),
        type: 'error',
      });
    },
  });

  const handleResendEmail = () => {
    if (!resendingEmailId) return;
    resendEmailMutation.mutate(resendingEmailId);
  };

  const openResendEmailDialog = (emailId: string) => {
    setResendingEmailId(emailId);
    setResendEmailDialogOpen(true);
  };

  const batchDeleteMutation = useMutation({
    mutationFn: async (emailIds: string[]) => {
      let successCount = 0;
      for (const emailId of emailIds) {
        try {
          const res = await emailApi.delete(emailId);
          if (res.success) successCount++;
        } catch {
          // ignore individual failures
        }
      }
      return { successCount, total: emailIds.length };
    },
    onSuccess: (result) => {
      addNotification({
        title: i18n.t('im.hooks.k29'),
        message: i18n.t('im.mail_page_hooks.e4', { v1: result.successCount, v2: result.total }),
        type: result.successCount === result.total ? 'success' : 'warning',
      });
      setSelectedEmails([]);
      queryClient.invalidateQueries({
        queryKey: QUERY_KEYS.MAIL.EMAILS,
        exact: false,
        refetchType: 'active',
      });
    },
  });

  const handleBatchDeleteEmails = () => {
    if (selectedEmails.length === 0) return;
    batchDeleteMutation.mutate(selectedEmails);
  };

  const batchResendMutation = useMutation({
    mutationFn: (emailIds: string[]) => emailApi.resend(emailIds),
    onSuccess: (res) => {
      if (res.success && res.data) {
        const result = res.data;
        addNotification({
          title: i18n.t('im.hooks.k30'),
          message: i18n.t('im.mail_page_hooks.e5', { v1: result.success, v2: result.total }),
          type: result.success === result.total ? 'success' : 'warning',
        });
      } else {
        addNotification({
          title: i18n.t('im.hooks.k32'),
          message: res.message || i18n.t('im.hooks.k31'),
          type: 'error',
        });
      }
      setSelectedEmails([]);
      queryClient.invalidateQueries({
        queryKey: QUERY_KEYS.MAIL.EMAILS,
        exact: false,
        refetchType: 'active',
      });
      queryClient.invalidateQueries({
        queryKey: QUERY_KEYS.MAIL.STATS,
        exact: false,
        refetchType: 'active',
      });
    },
    onError: (err: unknown) => {
      addNotification({
        title: i18n.t('im.hooks.k33'),
        message: (err as { message?: string }).message || i18n.t('im.hooks.k34'),
        type: 'error',
      });
      setSelectedEmails([]);
    },
  });

  const handleBatchResendEmails = () => {
    if (selectedEmails.length === 0) return;
    batchResendMutation.mutate(selectedEmails);
  };

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const openEmailDetail = (email: Email) => {
    setSelectedEmail(email);
    setShowEmailDetail(true);
  };

  const getStatusBadge = (status: string) => {
    const s = STATUS_MAP[status] || { label: status, variant: 'outline' };
    return (
      <Chip
        size='small'
        variant={s.variant === 'outline' ? 'outlined' : 'filled'}
        label={s.label}
      />
    );
  };

  const getPriorityBadge = (priority: string) => {
    const p = PRIORITY_MAP[priority] || { label: priority, variant: 'outline' };
    return (
      <Chip
        size='small'
        variant={p.variant === 'outline' ? 'outlined' : 'filled'}
        label={p.label}
      />
    );
  };

  const handlePrevPage = () => {
    if (currentPage > 1) {
      setCurrentPage((prev) => prev - 1);
    }
  };

  const handleNextPage = () => {
    const totalPages = Math.ceil(totalEmails / pageSize);
    if (currentPage < totalPages) {
      setCurrentPage((prev) => prev + 1);
    }
  };

  return {
    searchQuery,
    setSearchQuery,
    statusFilter,
    setStatusFilter,
    priorityFilter,
    setPriorityFilter,
    showSendModal,
    setShowSendModal,
    showEmailDetail,
    setShowEmailDetail,
    selectedEmail,
    setSelectedEmail,
    sendForm,
    setSendForm,
    currentPage,
    setCurrentPage,
    pageSize,
    formErrors,
    setFormErrors,
    selectedEmails,
    setSelectedEmails,
    copiedId,
    setCopiedId,
    deleteEmailDialogOpen,
    setDeleteEmailDialogOpen,
    resendingEmailId,
    setDeletingEmailId,
    resendEmailDialogOpen,
    setResendEmailDialogOpen,
    setResendingEmailId,
    batchDeleteDialogOpen,
    setBatchDeleteDialogOpen,
    batchResendDialogOpen,
    setBatchResendDialogOpen,
    emails,
    totalEmails,
    loading,
    stats,
    statsLoading,
    resetSendForm,
    handleSendEmail,
    handleDeleteEmail,
    openDeleteEmailDialog,
    handleResendEmail,
    openResendEmailDialog,
    handleBatchDeleteEmails,
    handleBatchResendEmails,
    copyToClipboard,
    openEmailDetail,
    getStatusBadge,
    getPriorityBadge,
    handlePrevPage,
    handleNextPage,
  };
}
