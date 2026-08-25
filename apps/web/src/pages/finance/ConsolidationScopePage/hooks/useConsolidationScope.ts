import { useState, useMemo, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import {
  useConsolidationScopes,
  useDeleteConsolidationScope,
  useScopeCompanies,
  useAddCompanyToScope,
  useRemoveCompanyFromScope,
  useCreateConsolidationScope,
  useUpdateConsolidationScope,
} from '@/hooks/useConsolidation';
import { useNotification } from '@/hooks/useNotification';
import type { ConsolidationScope, ConsolidationScopeStatus } from '@/types/consolidation';

export interface ScopeFormData {
  code: string;
  name: string;
  consolidation_method: 'full' | 'equity' | 'proportional';
  description: string;
  status: ConsolidationScopeStatus;
}

export interface CompanyFormData {
  company_id: string;
  control_type: 'full_control' | 'joint_venture' | 'associate';
  ownership_percentage: number;
  consolidation_percentage: number;
}

export function useConsolidationScope() {
  const { t } = useTranslation();
  const { error: notifyError, success: notifySuccess } = useNotification();

  // Search and selection state
  const [searchKeyword, setSearchKeyword] = useState('');
  const [selectedScope, setSelectedScope] = useState<ConsolidationScope | null>(null);
  const [activeTab, setActiveTab] = useState('companies');

  // Modal visibility state
  const [showCreateScopeModal, setShowCreateScopeModal] = useState(false);
  const [showEditScopeModal, setShowEditScopeModal] = useState(false);
  const [showAddCompanyModal, setShowAddCompanyModal] = useState(false);
  const [showRuleConfigModal, setShowRuleConfigModal] = useState(false);

  // Form data state
  const [scopeFormData, setScopeFormData] = useState<Partial<ScopeFormData>>({
    code: '',
    name: '',
    consolidation_method: 'full',
    description: '',
    status: 'active',
  });

  const [companyFormData, setCompanyFormData] = useState<CompanyFormData>({
    company_id: '',
    control_type: 'full_control',
    ownership_percentage: 100,
    consolidation_percentage: 100,
  });

  // API hooks
  const {
    data: scopesData,
    isLoading: scopesLoading,
    error: scopesError,
  } = useConsolidationScopes({
    keyword: searchKeyword,
  });

  const deleteScope = useDeleteConsolidationScope();
  const createScope = useCreateConsolidationScope();
  const updateScope = useUpdateConsolidationScope();

  const {
    data: companiesData,
    isLoading: companiesLoading,
    error: companiesError,
  } = useScopeCompanies(selectedScope?.id || '');

  const addCompany = useAddCompanyToScope();
  const removeCompany = useRemoveCompanyFromScope();

  // Error notifications
  useEffect(() => {
    if (scopesError) {
      notifyError(t('finance.consolidation_scope_page.list'));
    }
  }, [scopesError, notifyError, t]);

  useEffect(() => {
    if (companiesError) {
      notifyError(t('finance.consolidation_scope_page.list_1'));
    }
  }, [companiesError, notifyError, t]);

  // Handlers
  const handleOpenCreateScopeModal = () => {
    setScopeFormData({
      code: '',
      name: '',
      consolidation_method: 'full',
      description: '',
      status: 'active',
    });
    setShowCreateScopeModal(true);
  };

  const handleOpenEditScopeModal = () => {
    if (selectedScope) {
      setScopeFormData({
        code: selectedScope.code,
        name: selectedScope.name,
        consolidation_method: selectedScope.consolidation_method,
        description: selectedScope.description || '',
        status: selectedScope.status,
      });
      setShowEditScopeModal(true);
    }
  };

  const handleSaveScope = async () => {
    if (
      !scopeFormData.code ||
      !scopeFormData.name ||
      !scopeFormData.code.trim() ||
      !scopeFormData.name.trim()
    ) {
      notifyError(t('finance.consolidation_scope_page.please_input'));
      return;
    }

    if (showEditScopeModal && selectedScope) {
      await updateScope.mutateAsync({
        scopeId: selectedScope.id,
        data: scopeFormData,
      });
      notifySuccess(t('finance.consolidation_scope_page.update'));
      setShowEditScopeModal(false);
    } else {
      await createScope.mutateAsync(scopeFormData);
      notifySuccess(t('finance.consolidation_scope_page.create'));
      setShowCreateScopeModal(false);
    }
  };

  const handleOpenAddCompanyModal = () => {
    setCompanyFormData({
      company_id: '',
      control_type: 'full_control',
      ownership_percentage: 100,
      consolidation_percentage: 100,
    });
    setShowAddCompanyModal(true);
  };

  const handleAddCompany = async () => {
    if (!companyFormData.company_id) {
      notifyError(t('finance.consolidation_scope_page.please_select'));
      return;
    }

    if (!selectedScope) return;

    await addCompany.mutateAsync({
      scope_id: selectedScope.id,
      company_id: companyFormData.company_id,
      control_type: companyFormData.control_type,
      ownership_percentage: companyFormData.ownership_percentage,
      consolidation_percentage: companyFormData.consolidation_percentage,
    });
    notifySuccess(t('finance.consolidation_scope_page.success'));
    setShowAddCompanyModal(false);
  };

  const handleSelectScope = (scope: ConsolidationScope) => {
    setSelectedScope(scope);
  };

  const handleDeleteScope = async (scopeId: string) => {
    if (window.confirm(t('finance.consolidation_scope_page.confirm'))) {
      deleteScope.mutate(scopeId);
    }
  };

  // Statistics
  const stats = useMemo(() => {
    const totalCount = scopesData?.items?.length || 0;
    const activeCount = scopesData?.items?.filter((s) => s.status === 'active').length || 0;
    const totalCompanies = companiesData?.data?.length || 0;
    const parentCount = companiesData?.data?.filter((c) => c.is_parent).length || 0;

    return [
      {
        title: t('finance.consolidation_scope_page.text_75028a'),
        value: totalCount,
        icon: 'FolderOpen',
        color: 'primary' as const,
      },
      {
        title: t('finance.consolidation_scope_page.active_1'),
        value: activeCount,
        icon: 'PlayCircle',
        color: 'success' as const,
      },
      {
        title: t('finance.consolidation_scope_page.text_6e86b8'),
        value: totalCompanies,
        icon: 'Users2',
        color: 'info' as const,
      },
      {
        title: t('finance.consolidation_scope_page.text_5d26d3'),
        value: parentCount,
        icon: 'Briefcase',
        color: 'secondary' as const,
      },
    ];
  }, [scopesData?.items, companiesData?.data, t]);

  return {
    // State
    searchKeyword,
    setSearchKeyword,
    selectedScope,
    setSelectedScope,
    activeTab,
    setActiveTab,

    // Modal state
    showCreateScopeModal,
    setShowCreateScopeModal,
    showEditScopeModal,
    setShowEditScopeModal,
    showAddCompanyModal,
    setShowAddCompanyModal,
    showRuleConfigModal,
    setShowRuleConfigModal,

    // Form data
    scopeFormData,
    setScopeFormData,
    companyFormData,
    setCompanyFormData,

    // API data
    scopesData,
    scopesLoading,
    companiesData,
    companiesLoading,

    // Mutations
    createScope,
    updateScope,
    deleteScope,
    addCompany,
    removeCompany,

    // Handlers
    handleOpenCreateScopeModal,
    handleOpenEditScopeModal,
    handleSaveScope,
    handleOpenAddCompanyModal,
    handleAddCompany,
    handleSelectScope,
    handleDeleteScope,

    // Statistics
    stats,
  };
}
