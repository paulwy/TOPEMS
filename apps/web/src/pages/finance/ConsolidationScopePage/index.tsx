/**
 * Consolidation Scope Page
 * @refactored V79 Phase 2 - Split into modular components
 * @target-size <= 600 lines
 */
import React from 'react';
import { useTranslation } from 'react-i18next';
import {
  Card,
  CardContent,
  CardHeader,
  Typography,
  TextField,
  Box,
  Tabs,
  Tab,
  Button,
} from '@mui/material';
import { Plus, Search, Users, Edit2, Network } from 'lucide-react';
import { FolderOpen, PlayCircle, People, Business } from '@mui/icons-material';
import { PageContainer } from '@/components/common';
import { StatCardGroup } from '@/components';
import { useConsolidationScope } from './hooks/useConsolidationScope';
import {
  ConsolidationScopeTable,
  ConsolidationCompanyTable,
} from './components/ConsolidationScopeTable';
import {
  ScopeFormDialog,
  AddCompanyDialog,
  RuleConfigDialog,
} from './components/ConsolidationScopeFormDialog';

export default function ConsolidationScopePage() {
  const { t } = useTranslation();

  // Use custom hook for all state and API logic
  const {
    searchKeyword,
    setSearchKeyword,
    selectedScope,
    activeTab,
    setActiveTab,
    showCreateScopeModal,
    setShowCreateScopeModal,
    showEditScopeModal,
    setShowEditScopeModal,
    showAddCompanyModal,
    setShowAddCompanyModal,
    showRuleConfigModal,
    setShowRuleConfigModal,
    scopeFormData,
    setScopeFormData,
    companyFormData,
    setCompanyFormData,
    scopesData,
    scopesLoading,
    companiesData,
    companiesLoading,
    createScope,
    updateScope,
    addCompany,
    removeCompany,
    handleOpenCreateScopeModal,
    handleOpenEditScopeModal,
    handleSaveScope,
    handleOpenAddCompanyModal,
    handleAddCompany,
    handleSelectScope,
    handleDeleteScope,
    stats,
  } = useConsolidationScope();

  // Convert icon names to components
  const statsWithIcons = stats.map((stat) => {
    const iconMap: Record<string, React.ReactNode> = {
      FolderOpen: <FolderOpen sx={{ width: 20, height: 20 }} />,
      PlayCircle: <PlayCircle sx={{ width: 20, height: 20 }} />,
      Users2: <People sx={{ width: 20, height: 20 }} />,
      Briefcase: <Business sx={{ width: 20, height: 20 }} />,
    };
    return { ...stat, icon: iconMap[stat.icon] };
  });

  return (
    <PageContainer
      title={t('finance.consolidation_scope_page.text_1ef9d7')}
      subtitle={t('finance.consolidation_scope_page.text_1dec08')}
      maxWidth='xl'
      headerProps={{
        actions: [
          {
            label: t('finance.consolidation_scope_page.text_425d69'),
            icon: <Plus sx={{ width: 16, height: 16 }} />,
            onClick: handleOpenCreateScopeModal,
            variant: 'contained',
          },
        ],
      }}
    >
      {/* Search section */}
      <Card sx={{ mb: 3 }}>
        <CardContent sx={{ pt: 3 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <Box sx={{ position: 'relative', flex: 1, maxWidth: 400 }}>
              <Search
                sx={{
                  position: 'absolute',
                  left: 12,
                  top: '50%',
                  transform: 'translateY(-50%)',
                  width: 16,
                  height: 16,
                  color: 'text.disabled',
                }}
              />
              <TextField
                placeholder={t('finance.consolidation_scope_page.search')}
                value={searchKeyword}
                onChange={(e) => setSearchKeyword(e.target.value)}
                size='small'
                sx={{ pl: 5, width: '100%' }}
              />
            </Box>
            <Button variant='outlined'>
              {t('finance.consolidation_scope_page.advanced_search')}
            </Button>
          </Box>
        </CardContent>
      </Card>

      {/* Statistics section */}
      <Box sx={{ mb: 3 }}>
        <StatCardGroup
          stats={statsWithIcons}
          loading={scopesLoading || companiesLoading}
        />
      </Box>

      {/* Main content section */}
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: { xs: '1fr', lg: '5fr 7fr' },
          gap: 3,
        }}
      >
        {/* Scope list section */}
        <Box>
          <Card>
            <CardHeader>
              <Typography
                variant='h6'
                sx={{
                  fontWeight: 600,
                  fontSize: '1rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 1,
                }}
              >
                <Network sx={{ width: 20, height: 20, color: 'primary.dark' }} />
                {t('finance.consolidation_scope_page.scope_list')}
              </Typography>
            </CardHeader>
            <CardContent>
              <ConsolidationScopeTable
                scopes={scopesData?.items}
                loading={scopesLoading}
                onSelectScope={handleSelectScope}
                onDeleteScope={handleDeleteScope}
                onRuleConfig={() => setShowRuleConfigModal(true)}
              />
            </CardContent>
          </Card>
        </Box>

        {/* Scope detail section */}
        <Box>
          {selectedScope ? (
            <Card>
              <CardHeader>
                <Box
                  sx={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                  }}
                >
                  <Typography
                    variant='h6'
                    sx={{
                      fontWeight: 600,
                      fontSize: '1rem',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 1,
                    }}
                  >
                    <Users sx={{ width: 20, height: 20, color: 'primary.dark' }} />
                    {selectedScope.name}
                  </Typography>
                  <Button
                    variant='outlined'
                    size='small'
                    onClick={handleOpenEditScopeModal}
                    startIcon={<Edit2 sx={{ width: 16, height: 16 }} />}
                  >
                    {t('finance.consolidation_scope_page.action_edit')}
                  </Button>
                </Box>
                <Typography
                  variant='body2'
                  sx={{ color: 'text.secondary', mt: 1 }}
                >
                  {selectedScope.code} |{' '}
                  {selectedScope.description || t('finance.consolidation_scope_page.description_1')}
                </Typography>
              </CardHeader>
              <CardContent>
                <Tabs
                  value={activeTab}
                  onChange={(_, v) => setActiveTab(v)}
                  sx={{ mb: 2 }}
                >
                  <Tab
                    value='companies'
                    label={t('finance.consolidation_scope_page.tab_companies')}
                  />
                  <Tab
                    value='rules'
                    label={t('finance.consolidation_scope_page.text_6d836a')}
                  />
                  <Tab
                    value='transactions'
                    label={t('finance.consolidation_scope_page.text_efd827')}
                  />
                </Tabs>

                {activeTab === 'companies' && (
                  <Box>
                    <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: 2 }}>
                      <Button
                        size='small'
                        variant='contained'
                        onClick={handleOpenAddCompanyModal}
                        startIcon={<Plus sx={{ width: 16, height: 16 }} />}
                      >
                        {t('finance.consolidation_scope_page.action_add_company')}
                      </Button>
                    </Box>
                    <ConsolidationCompanyTable
                      companies={companiesData?.data}
                      loading={companiesLoading}
                      onRemoveCompany={(id) => removeCompany.mutate(id)}
                    />
                  </Box>
                )}

                {activeTab === 'rules' && (
                  <Box>
                    <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: 2 }}>
                      <Button
                        size='small'
                        variant='contained'
                        onClick={() => setShowRuleConfigModal(true)}
                        startIcon={<Plus sx={{ width: 16, height: 16 }} />}
                      >
                        {t('finance.consolidation_scope_page.action_create_rule')}
                      </Button>
                    </Box>
                    <Box sx={{ textAlign: 'center', py: 4, color: 'text.secondary' }}>
                      {t('finance.consolidation_scope_page.no_rules_hint')}
                    </Box>
                  </Box>
                )}

                {activeTab === 'transactions' && (
                  <Box sx={{ textAlign: 'center', py: 4, color: 'text.secondary' }}>
                    {t('finance.consolidation_scope_page.no_transactions_hint')}
                  </Box>
                )}
              </CardContent>
            </Card>
          ) : (
            <Card
              sx={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                minHeight: 384,
              }}
            >
              <Box sx={{ textAlign: 'center', color: 'text.secondary' }}>
                <Network
                  sx={{
                    width: 48,
                    height: 48,
                    margin: 'auto',
                    marginBottom: 8,
                    color: 'grey.300',
                  }}
                />
                <Typography>{t('finance.consolidation_scope_page.select_scope_prompt')}</Typography>
              </Box>
            </Card>
          )}
        </Box>
      </Box>

      {/* Dialogs */}
      <ScopeFormDialog
        open={showCreateScopeModal || showEditScopeModal}
        editMode={showEditScopeModal}
        formData={scopeFormData}
        isSubmitting={createScope.isPending || updateScope.isPending}
        onFormDataChange={setScopeFormData}
        onSave={handleSaveScope}
        onClose={() => {
          setShowCreateScopeModal(false);
          setShowEditScopeModal(false);
        }}
      />

      <AddCompanyDialog
        open={showAddCompanyModal}
        formData={companyFormData}
        isSubmitting={addCompany.isPending}
        onFormDataChange={setCompanyFormData}
        onAdd={handleAddCompany}
        onClose={() => setShowAddCompanyModal(false)}
      />

      <RuleConfigDialog
        open={showRuleConfigModal}
        onClose={() => setShowRuleConfigModal(false)}
      />
    </PageContainer>
  );
}
