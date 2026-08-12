import { useState, useMemo, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { templateApi, type Template, type CreateTemplateRequest } from '@/api/template';
import { useNotificationStore } from '@/store';
import { apiLogger } from '@/utils/logger';
import { useCrudMutations } from '@/hooks';


import { QUERY_KEYS } from '@/lib/reactQuery';

export function useTemplateManagement() {
  const queryClient = useQueryClient();
  const { t } = useTranslation();
  const addNotification = useNotificationStore((state) => state.addNotification);

  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showPreviewModal, setShowPreviewModal] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<Template | null>(null);

  const templatesQuery = useQuery({
    queryKey: [...QUERY_KEYS.AD_HOC.TEMPLATES_BASE, searchQuery, selectedCategory],
    queryFn: async () => {
      const response = await templateApi.list({ search: searchQuery, category: selectedCategory });
      if (!response.success || !response.data) {
        throw new Error(response.message || t('report.template_management_page.load_failed'));
      }
      return response.data.items || [];
    },
    staleTime: 5 * 60 * 1000,
  });

  const categoriesQuery = useQuery({
    queryKey: QUERY_KEYS.AD_HOC.TEMPLATE_CATEGORIES_BASE,
    queryFn: async () => {
      const response = await templateApi.listCategories();
      if (!response.success || !response.data) {
        throw new Error(
          response.message || t('report.template_management_page.load_categories_failed')
        );
      }
      return response.data;
    },
    staleTime: 5 * 60 * 1000,
  });

  const templates = templatesQuery.data || [];
  const categories = categoriesQuery.data || [];
  const loading = templatesQuery.isLoading || categoriesQuery.isLoading;

  const { createMutation, updateMutation, deleteMutation } = useCrudMutations<
    CreateTemplateRequest,
    Partial<CreateTemplateRequest>,
    string
  >({
    queryKeyToInvalidate: ['templates'],
    createFn: async (data) => {
      const response = await templateApi.create(data);
      if (!response.success) {
        throw new Error(response.message || t('report.template_management_page.create_failed'));
      }
      return response.data;
    },
    updateFn: async ({ id, data }) => {
      const response = await templateApi.update(String(id), data);
      if (!response.success) {
        throw new Error(response.message || t('report.template_management_page.update_failed'));
      }
      return response.data;
    },
    deleteFn: async (id) => {
      const response = await templateApi.delete(String(id));
      if (!response.success) {
        throw new Error(response.message || t('report.template_management_page.delete_failed'));
      }
      return id;
    },
    entityName: t('report.template_management_page.entity_name'),
    onCreateSuccess: () => {
      setShowCreateModal(false);
    },
    onUpdateSuccess: () => {
      setShowEditModal(false);
      setSelectedTemplate(null);
    },
  });

  const duplicateMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await templateApi.duplicate(id);
      if (!response.success) {
        throw new Error(response.message || t('report.template_management_page.duplicate_failed'));
      }
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.AD_HOC.TEMPLATES_BASE ,
  exact: false,
  refetchType: 'active',
});
      addNotification({
        type: 'success',
        title: t('report.template_management_page.success_title'),
        message: t('report.template_management_page.duplicate_success'),
      });
    },
    onError: (err: unknown) => {
      apiLogger.error(t('report.template_management_page.duplicate_log_failed'), err);
      addNotification({
        type: 'error',
        title: t('report.template_management_page.failed_title'),
        message: (err as Error).message || t('report.template_management_page.duplicate_failed'),
      });
    },
  });

  const toggleStatusMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await templateApi.toggleStatus(id);
      if (!response.success) {
        throw new Error(response.message || t('report.template_management_page.update_failed'));
      }
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.AD_HOC.TEMPLATES_BASE ,
  exact: false,
  refetchType: 'active',
});
      addNotification({
        type: 'success',
        title: t('report.template_management_page.success_title'),
        message: t('report.template_management_page.status_updated'),
      });
    },
    onError: (err: unknown) => {
      apiLogger.error(t('report.template_management_page.toggle_status_log_failed'), err);
      addNotification({
        type: 'error',
        title: t('report.template_management_page.failed_title'),
        message: (err as Error).message || t('report.template_management_page.update_failed'),
      });
    },
  });

  const handleCreateTemplate = useCallback(
    async (data: CreateTemplateRequest) => {
      await createMutation.mutateAsync(data);
    },
    [createMutation]
  );

  const handleUpdateTemplate = useCallback(
    async (id: string, data: Partial<CreateTemplateRequest>) => {
      await updateMutation.mutateAsync({ id, data });
    },
    [updateMutation]
  );

  const handleDeleteTemplate = useCallback(
    async (id: string) => {
      if (!confirm(t('report.template_management_page.delete_confirm'))) return;
      await deleteMutation.mutateAsync(id);
    },
    [deleteMutation, t]
  );

  const handleDuplicateTemplate = useCallback(
    async (id: string) => {
      await duplicateMutation.mutateAsync(id);
    },
    [duplicateMutation]
  );

  const handleToggleStatus = useCallback(
    async (id: string) => {
      await toggleStatusMutation.mutateAsync(id);
    },
    [toggleStatusMutation]
  );

  const filteredTemplates = useMemo(
    () =>
      templates.filter(
        (t) =>
          t.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          t.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
          t.description?.toLowerCase().includes(searchQuery.toLowerCase())
      ),
    [templates, searchQuery]
  );

  return {
    viewMode,
    setViewMode,
    searchQuery,
    setSearchQuery,
    selectedCategory,
    setSelectedCategory,
    showCreateModal,
    setShowCreateModal,
    showEditModal,
    setShowEditModal,
    showPreviewModal,
    setShowPreviewModal,
    selectedTemplate,
    setSelectedTemplate,
    templates,
    categories,
    loading,
    templatesQuery,
    categoriesQuery,
    createMutation,
    updateMutation,
    deleteMutation,
    duplicateMutation,
    toggleStatusMutation,
    handleCreateTemplate,
    handleUpdateTemplate,
    handleDeleteTemplate,
    handleDuplicateTemplate,
    handleToggleStatus,
    filteredTemplates,
  };
}
