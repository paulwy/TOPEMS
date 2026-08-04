import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Chip } from '@mui/material';
import {
  emailApi,
  templateApi,
  type Email,
  type EmailTemplate,
  type EmailStats,
  TEMPLATE_CATEGORIES,
} from '@/api/mail';
import { useNotificationStore } from '@/store';
import { QUERY_KEYS } from '@/lib/reactQuery';
import { useCrudMutations } from '@/hooks';
import { validateEmailList, validateJson } from './utils';
import { STATUS_MAP, PRIORITY_MAP, PREVIEW_SAMPLE_DATA } from './constants';
import type { SendForm, TemplateForm, PreviewContent } from './types';

const INITIAL_SEND_FORM: SendForm = {
  subject: '',
  to_addresses: '',
  cc_addresses: '',
  bcc_addresses: '',
  body: '',
  priority: 'normal',
  template_code: '',
  useTemplate: false,
  templateData: '',
};

const INITIAL_TEMPLATE_FORM: TemplateForm = {
  code: '',
  name: '',
  description: '',
  subject_template: '',
  body_template: '',
  body_html_template: '',
  category: 'general',
  tags: '',
};

export function useMailPage() {
  const addNotification = useNotificationStore((state) => state.addNotification);
  const queryClient = useQueryClient();

  const [activeTab, setActiveTab] = useState('emails');
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [priorityFilter, setPriorityFilter] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');

  const [showSendModal, setShowSendModal] = useState(false);
  const [showEmailDetail, setShowEmailDetail] = useState(false);
  const [showTemplateModal, setShowTemplateModal] = useState(false);
  const [showEditTemplateModal, setShowEditTemplateModal] = useState(false);
  const [selectedEmail, setSelectedEmail] = useState<Email | null>(null);
  const [selectedTemplate, setSelectedTemplate] = useState<EmailTemplate | null>(null);
  const [selectedTemplateForSend, setSelectedTemplateForSend] = useState<string | null>(null);

  const [sendForm, setSendForm] = useState<SendForm>(INITIAL_SEND_FORM);
  const [templateForm, setTemplateForm] = useState<TemplateForm>(INITIAL_TEMPLATE_FORM);

  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 10;

  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [selectedEmails, setSelectedEmails] = useState<string[]>([]);
  const [previewContent, setPreviewContent] = useState<PreviewContent | null>(null);
  const [showEyeModal, setShowEyeModal] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const [deleteEmailDialogOpen, setDeleteEmailDialogOpen] = useState(false);
  const [deletingEmailId, setDeletingEmailId] = useState<string | null>(null);
  const [resendEmailDialogOpen, setResendEmailDialogOpen] = useState(false);
  const [resendingEmailId, setResendingEmailId] = useState<string | null>(null);
  const [batchDeleteDialogOpen, setBatchDeleteDialogOpen] = useState(false);
  const [batchResendDialogOpen, setBatchResendDialogOpen] = useState(false);
  const [deleteTemplateDialogOpen, setDeleteTemplateDialogOpen] = useState(false);
  const [deletingTemplateId, setDeletingTemplateId] = useState<string | null>(null);

  const statsQuery = useQuery<EmailStats | null>({
    queryKey: [...QUERY_KEYS.MAIL.STATS, activeTab],
    queryFn: async () => {
      if (activeTab !== 'emails') return null;
      try {
        const res = await emailApi.getStats();
        if (res.success && res.data) {
          return res.data;
        }
      } catch (err: unknown) {
        addNotification({
          title: '加载失败',
          message: (err as { message?: string }).message || '加载统计数据失败',
          type: 'error',
        });
      }
      return null;
    },
    enabled: activeTab === 'emails',
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
      if (activeTab !== 'emails') return { items: [], total: 0 };
      try {
        const res = await emailApi.list({
          page: currentPage,
          pagesize: pageSize,
          search: searchQuery || undefined,
          status: statusFilter || undefined,
          priority: priorityFilter || undefined,
        });
        if (res.success && res.data) {
          return { items: res.data.items || [], total: res.data.total || 0 };
        }
      } catch (err: unknown) {
        addNotification({
          title: '加载失败',
          message: (err as { message?: string }).message || '加载邮件列表失败',
          type: 'error',
        });
      }
      return { items: [], total: 0 };
    },
    enabled: activeTab === 'emails',
  });

  const templatesQuery = useQuery<{ items: EmailTemplate[]; total: number }>({
    queryKey: [
      ...QUERY_KEYS.MAIL.TEMPLATES_LIST,
      currentPage,
      pageSize,
      searchQuery,
      categoryFilter,
    ],
    queryFn: async () => {
      if (activeTab !== 'templates') return { items: [], total: 0 };
      try {
        const res = await templateApi.list({
          page: currentPage,
          pagesize: pageSize,
          search: searchQuery || undefined,
          category: categoryFilter || undefined,
        });
        if (res.success && res.data) {
          return { items: res.data.items || [], total: res.data.total || 0 };
        }
      } catch (err: unknown) {
        addNotification({
          title: '加载失败',
          message: (err as { message?: string }).message || '加载模板列表失败',
          type: 'error',
        });
      }
      return { items: [], total: 0 };
    },
    enabled: activeTab === 'templates',
  });

  const emails = emailsQuery.data?.items ?? [];
  const templates = templatesQuery.data?.items ?? [];
  const totalEmails = emailsQuery.data?.total ?? 0;
  const totalTemplates = templatesQuery.data?.total ?? 0;
  const loading = activeTab === 'emails' ? emailsQuery.isLoading : templatesQuery.isLoading;
  const stats = statsQuery.data ?? null;
  const statsLoading = statsQuery.isLoading;

  const resetSendForm = () => {
    setSendForm(INITIAL_SEND_FORM);
    setSelectedTemplateForSend(null);
  };

  const resetTemplateForm = () => {
    setTemplateForm(INITIAL_TEMPLATE_FORM);
  };

  const sendEmailMutation = useMutation({
    mutationFn: async (params: {
      useTemplate: boolean;
      template_code: string;
      templateData: string;
      subject: string;
      to_addresses: string[];
      cc_addresses?: string[];
      bcc_addresses?: string[];
      body: string;
      priority: string;
    }) => {
      if (params.useTemplate && params.template_code) {
        let templateData: Record<string, unknown> = {};
        try {
          templateData = JSON.parse(params.templateData || '{}');
        } catch {
          templateData = {};
        }
        return emailApi.sendWithTemplate({
          template_code: params.template_code,
          to_addresses: params.to_addresses,
          cc_addresses: params.cc_addresses,
          bcc_addresses: params.bcc_addresses,
          template_data: templateData,
          priority: params.priority,
        });
      }
      return emailApi.send({
        subject: params.subject,
        to_addresses: params.to_addresses,
        cc_addresses: params.cc_addresses,
        bcc_addresses: params.bcc_addresses,
        body: params.body,
        priority: params.priority,
      });
    },
    onSuccess: (res) => {
      if (res.success) {
        addNotification({ title: '成功', message: '邮件发送成功', type: 'success' });
        setShowSendModal(false);
        resetSendForm();
        queryClient.invalidateQueries({ queryKey: QUERY_KEYS.MAIL.EMAILS });
      } else {
        addNotification({ title: '失败', message: res.message || '发送邮件失败', type: 'error' });
      }
    },
    onError: (err: unknown) => {
      addNotification({
        title: '失败',
        message: (err as { message?: string }).message || '发送邮件失败',
        type: 'error',
      });
    },
  });

  const handleSendEmail = (e: React.FormEvent) => {
    e.preventDefault();
    const errors: Record<string, string> = {};

    if (!sendForm.subject.trim()) {
      errors.subject = '请输入邮件主题';
    }

    if (!sendForm.to_addresses.trim()) {
      errors.to_addresses = '请输入收件人邮箱';
    } else {
      const { valid, invalidEmails } = validateEmailList(sendForm.to_addresses);
      if (!valid) {
        errors.to_addresses = `无效的邮箱地址: ${invalidEmails.join(', ')}`;
      }
    }

    if (sendForm.cc_addresses && !validateEmailList(sendForm.cc_addresses).valid) {
      const { invalidEmails } = validateEmailList(sendForm.cc_addresses);
      errors.cc_addresses = `无效的抄送邮箱: ${invalidEmails.join(', ')}`;
    }

    if (sendForm.bcc_addresses && !validateEmailList(sendForm.bcc_addresses).valid) {
      const { invalidEmails } = validateEmailList(sendForm.bcc_addresses);
      errors.bcc_addresses = `无效的密送邮箱: ${invalidEmails.join(', ')}`;
    }

    if (!sendForm.body.trim()) {
      errors.body = '请输入邮件内容';
    }

    if (
      sendForm.useTemplate &&
      sendForm.template_code &&
      sendForm.templateData &&
      !validateJson(sendForm.templateData)
    ) {
      errors.templateData = '无效的JSON格式';
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
      useTemplate: sendForm.useTemplate,
      template_code: sendForm.template_code,
      templateData: sendForm.templateData,
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
        addNotification({ title: '成功', message: '邮件记录删除成功', type: 'success' });
        setSelectedEmails((prev) => prev.filter((emailId) => emailId !== id));
        queryClient.invalidateQueries({ queryKey: QUERY_KEYS.MAIL.EMAILS });
      } else {
        addNotification({ title: '失败', message: res.message || '删除失败', type: 'error' });
      }
    },
    onError: (err: unknown) => {
      addNotification({
        title: '失败',
        message: (err as { message?: string }).message || '删除失败',
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
      throw new Error('无法获取邮件详情');
    },
    onSuccess: (sendRes) => {
      if (sendRes.success) {
        addNotification({ title: '成功', message: '邮件重新发送成功', type: 'success' });
        queryClient.invalidateQueries({ queryKey: QUERY_KEYS.MAIL.EMAILS });
      } else {
        addNotification({
          title: '失败',
          message: sendRes.message || '重发邮件失败',
          type: 'error',
        });
      }
    },
    onError: (err: unknown) => {
      addNotification({
        title: '失败',
        message: (err as { message?: string }).message || '重发邮件失败',
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
        title: '完成',
        message: `成功删除 ${result.successCount}/${result.total} 条记录`,
        type: result.successCount === result.total ? 'success' : 'warning',
      });
      setSelectedEmails([]);
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.MAIL.EMAILS });
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
          title: '完成',
          message: `成功重发 ${result.success}/${result.total} 条邮件`,
          type: result.success === result.total ? 'success' : 'warning',
        });
      } else {
        addNotification({ title: '失败', message: res.message || '批量重发失败', type: 'error' });
      }
      setSelectedEmails([]);
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.MAIL.EMAILS });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.MAIL.STATS });
    },
    onError: (err: unknown) => {
      addNotification({
        title: '失败',
        message: (err as { message?: string }).message || '批量重发失败',
        type: 'error',
      });
      setSelectedEmails([]);
    },
  });

  const handleBatchResendEmails = () => {
    if (selectedEmails.length === 0) return;
    batchResendMutation.mutate(selectedEmails);
  };

  const toggleTemplateStatusMutation = useMutation({
    mutationFn: ({ template, newStatus }: { template: EmailTemplate; newStatus: string }) =>
      templateApi.updateStatus(template.id, newStatus),
    onSuccess: (res, variables) => {
      if (res.success) {
        addNotification({
          title: '成功',
          message: `模板已${variables.newStatus === 'active' ? '启用' : '禁用'}`,
          type: 'success',
        });
        queryClient.invalidateQueries({ queryKey: QUERY_KEYS.MAIL.TEMPLATES_LIST });
      } else {
        addNotification({ title: '失败', message: res.message || '更新状态失败', type: 'error' });
      }
    },
    onError: (err: unknown) => {
      addNotification({
        title: '失败',
        message: (err as { message?: string }).message || '更新状态失败',
        type: 'error',
      });
    },
  });

  const handleToggleTemplateStatus = (template: EmailTemplate) => {
    const newStatus = template.status === 'active' ? 'inactive' : 'active';
    toggleTemplateStatusMutation.mutate({ template, newStatus });
  };

  const previewTemplateMutation = useMutation({
    mutationFn: ({ code, sampleData }: { code: string; sampleData: Record<string, string> }) =>
      templateApi.render(code, sampleData),
    onSuccess: (res) => {
      if (res.success && res.data) {
        setPreviewContent({
          subject: res.data.subject,
          body: res.data.body,
        });
        setShowEyeModal(true);
      }
    },
    onError: (err: unknown) => {
      addNotification({
        title: '失败',
        message: (err as { message?: string }).message || '预览模板失败',
        type: 'error',
      });
    },
  });

  const handleEyeTemplate = (template: EmailTemplate) => {
    previewTemplateMutation.mutate({ code: template.code, sampleData: PREVIEW_SAMPLE_DATA });
  };

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const {
    createMutation: createTemplateMutation,
    updateMutation: updateTemplateMutation,
    deleteMutation: deleteTemplateMutation,
  } = useCrudMutations<
    Parameters<typeof templateApi.create>[0],
    Parameters<typeof templateApi.update>[1],
    string
  >({
    queryKeyToInvalidate: QUERY_KEYS.MAIL.TEMPLATES_LIST,
    createFn: async (data) => {
      const res = await templateApi.create(data);
      if (!res.success) {
        throw new Error(res.message || '创建模板失败');
      }
      return res;
    },
    updateFn: async ({ id, data }) => {
      const res = await templateApi.update(String(id), data);
      if (!res.success) {
        throw new Error(res.message || '更新模板失败');
      }
      return res;
    },
    deleteFn: async (id) => {
      const res = await templateApi.delete(String(id));
      if (!res.success) {
        throw new Error(res.message || '删除模板失败');
      }
      return res;
    },
    entityName: '模板',
    onCreateSuccess: () => {
      setShowTemplateModal(false);
      resetTemplateForm();
    },
    onUpdateSuccess: () => {
      setShowEditTemplateModal(false);
      setSelectedTemplate(null);
      resetTemplateForm();
    },
  });

  const handleCreateTemplate = (e: React.FormEvent) => {
    e.preventDefault();
    const tags = templateForm.tags
      ? templateForm.tags
          .split(',')
          .map((s) => s.trim())
          .filter(Boolean)
      : undefined;

    createTemplateMutation.mutate({
      code: templateForm.code,
      name: templateForm.name,
      description: templateForm.description || undefined,
      subject_template: templateForm.subject_template,
      body_template: templateForm.body_template,
      body_html_template: templateForm.body_html_template || undefined,
      category: templateForm.category,
      tags,
    });
  };

  const handleUpdateTemplate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTemplate) return;
    const tags = templateForm.tags
      ? templateForm.tags
          .split(',')
          .map((s) => s.trim())
          .filter(Boolean)
      : undefined;

    updateTemplateMutation.mutate({
      id: selectedTemplate.id,
      data: {
        name: templateForm.name || undefined,
        description: templateForm.description || undefined,
        subject_template: templateForm.subject_template || undefined,
        body_template: templateForm.body_template || undefined,
        body_html_template: templateForm.body_html_template || undefined,
        category: templateForm.category || undefined,
        tags,
      },
    });
  };

  const handleDeleteTemplate = () => {
    if (!deletingTemplateId) return;
    deleteTemplateMutation.mutate(deletingTemplateId);
  };

  const openDeleteTemplateDialog = (templateId: string) => {
    setDeletingTemplateId(templateId);
    setDeleteTemplateDialogOpen(true);
  };

  const openEditTemplate = (template: EmailTemplate) => {
    setSelectedTemplate(template);
    setTemplateForm({
      code: template.code,
      name: template.name,
      description: template.description || '',
      subject_template: template.subject_template,
      body_template: template.body_template,
      body_html_template: template.body_html_template || '',
      category: template.category,
      tags: template.tags?.join(', ') || '',
    });
    setShowEditTemplateModal(true);
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

  const getCategoryLabel = (category: string) => {
    const cat = TEMPLATE_CATEGORIES.find((c) => c.value === category);
    return cat?.label || category;
  };

  const handleTemplateChange = async (code: string) => {
    if (!code) return;
    const template = templates.find((t) => t.code === code);
    if (template) {
      setSendForm((prev) => ({
        ...prev,
        subject: template.subject_template,
        body: template.body_template,
        template_code: code,
      }));
    }
  };

  const handlePrevPage = () => {
    if (currentPage > 1) {
      setCurrentPage((prev) => prev - 1);
    }
  };

  const handleNextPage = () => {
    const totalPages =
      activeTab === 'emails'
        ? Math.ceil(totalEmails / pageSize)
        : Math.ceil(totalTemplates / pageSize);
    if (currentPage < totalPages) {
      setCurrentPage((prev) => prev + 1);
    }
  };

  return {
    activeTab,
    setActiveTab,
    searchQuery,
    setSearchQuery,
    statusFilter,
    setStatusFilter,
    priorityFilter,
    setPriorityFilter,
    categoryFilter,
    setCategoryFilter,
    showSendModal,
    setShowSendModal,
    showEmailDetail,
    setShowEmailDetail,
    showTemplateModal,
    setShowTemplateModal,
    showEditTemplateModal,
    setShowEditTemplateModal,
    selectedEmail,
    setSelectedEmail,
    selectedTemplate,
    setSelectedTemplate,
    selectedTemplateForSend,
    setSelectedTemplateForSend,
    sendForm,
    setSendForm,
    templateForm,
    setTemplateForm,
    currentPage,
    setCurrentPage,
    pageSize,
    formErrors,
    setFormErrors,
    selectedEmails,
    setSelectedEmails,
    previewContent,
    setPreviewContent,
    showEyeModal,
    setShowEyeModal,
    copiedId,
    setCopiedId,
    deleteEmailDialogOpen,
    setDeleteEmailDialogOpen,
    deletingEmailId,
    setDeletingEmailId,
    resendEmailDialogOpen,
    setResendEmailDialogOpen,
    resendingEmailId,
    setResendingEmailId,
    batchDeleteDialogOpen,
    setBatchDeleteDialogOpen,
    batchResendDialogOpen,
    setBatchResendDialogOpen,
    deleteTemplateDialogOpen,
    setDeleteTemplateDialogOpen,
    deletingTemplateId,
    setDeletingTemplateId,
    emails,
    templates,
    totalEmails,
    totalTemplates,
    loading,
    stats,
    statsLoading,
    resetSendForm,
    resetTemplateForm,
    handleSendEmail,
    handleDeleteEmail,
    openDeleteEmailDialog,
    handleResendEmail,
    openResendEmailDialog,
    handleBatchDeleteEmails,
    handleBatchResendEmails,
    handleToggleTemplateStatus,
    handleEyeTemplate,
    copyToClipboard,
    handleCreateTemplate,
    handleUpdateTemplate,
    handleDeleteTemplate,
    openDeleteTemplateDialog,
    openEditTemplate,
    openEmailDetail,
    getStatusBadge,
    getPriorityBadge,
    getCategoryLabel,
    handleTemplateChange,
    handlePrevPage,
    handleNextPage,
  };
}
