import { designTokens } from '@topems/tokens';
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
  Box,
  Tabs,
  Tab,
  Button,
  Chip,
} from '@mui/material';
import { Plus, Users, Edit2, Network, Settings, Trash2 } from 'lucide-react';
import FolderOpen from '@mui/icons-material/FolderOpen';
import PlayCircle from '@mui/icons-material/PlayCircle';
import People from '@mui/icons-material/People';
import Business from '@mui/icons-material/Business';
import { PageContainer } from '@/components/common';
import { StatCardGroup } from '@/components';
import { useConsolidationScope } from './hooks/useConsolidationScope';
import { ConsolidationCompanyTable } from './components/ConsolidationScopeTable';
import {
  ScopeFormDialog,
  AddCompanyDialog,
  RuleConfigDialog,
} from './components/ConsolidationScopeFormDialog';
import { ListPageTemplate } from '@/components/templates';
import type { ColumnDef, RowAction } from '@/components/templates/list/types';
import type { ConsolidationScope } from '@/types/consolidation';

const METHOD_CONFIG: Record<
  string,
  { labelKey: string; color: React.ComponentProps<typeof Chip>['color'] }
> = {
  full: { labelKey: 'finance.consolidation_scope_page.text_a8d219', color: 'primary' },
  equity: { labelKey: 'finance.consolidation_scope_page.text_08dfd4', color: 'secondary' },
  proportional: { labelKey: 'finance.consolidation_scope_page.text_ad6e8a', color: 'info' },
};

const STATUS_CONFIG: Record<
  string,
  { labelKey: string; color: React.ComponentProps<typeof Chip>['color'] }
> = {
  active: { labelKey: 'finance.consolidation_scope_page.active', color: 'success' },
  inactive: { labelKey: 'finance.consolidation_scope_page.inactive', color: 'default' },
  draft: { labelKey: 'finance.consolidation_scope_page.text_22b433', color: 'warning' },
};

export default function ConsolidationScopePage() {
  const { t } = useTranslation();

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
    deleteScope,
    stats,
  } = useConsolidationScope();

  const statsWithIcons = stats.map((stat) => {
    const iconMap: Record<string, React.ReactNode> = {
      FolderOpen: <FolderOpen sx={{ width: 20, height: 20 }} />,
      PlayCircle: <PlayCircle sx={{ width: 20, height: 20 }} />,
      Users2: <People sx={{ width: 20, height: 20 }} />,
      Briefcase: <Business sx={{ width: 20, height: 20 }} />,
    };
    return { ...stat, icon: iconMap[stat.icon] };
  });

  const scopeColumns: ColumnDef<ConsolidationScope>[] = React.useMemo(
    () => [
      {
        id: 'code',
        label: t('finance.consolidation_scope_page.code'),
        render: (row) => (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Network
              size={16}
              color={designTokens.colors.primary.dark}
            />
            <Typography sx={{ fontFamily: 'monospace', fontSize: 14 }}>{row.code}</Typography>
          </Box>
        ),
      },
      {
        id: 'name',
        label: t('finance.consolidation_scope_page.name'),
        render: (row) => <Typography sx={{ fontWeight: 500 }}>{row.name}</Typography>,
      },
      {
        id: 'consolidation_method',
        label: t('finance.consolidation_scope_page.text_e15d05'),
        render: (row) => {
          const config = METHOD_CONFIG[row.consolidation_method] || {
            labelKey: row.consolidation_method,
            color: 'default',
          };
          return (
            <Chip
              size='small'
              color={config.color}
              variant='outlined'
              label={config.labelKey.startsWith('finance.') ? t(config.labelKey) : config.labelKey}
            />
          );
        },
      },
      {
        id: 'description',
        label: t('finance.consolidation_scope_page.description'),
        render: (row) => (
          <Typography
            variant='body2'
            color='text.secondary'
          >
            {row.description || '-'}
          </Typography>
        ),
      },
      {
        id: 'status',
        label: t('finance.consolidation_scope_page.status'),
        render: (row) => {
          const config = STATUS_CONFIG[row.status] || { labelKey: row.status, color: 'default' };
          return (
            <Chip
              size='small'
              color={config.color}
              variant='outlined'
              label={config.labelKey.startsWith('finance.') ? t(config.labelKey) : config.labelKey}
            />
          );
        },
      },
    ],
    [t]
  );

  const scopeRowActions: RowAction<ConsolidationScope>[] = React.useMemo(
    () => [
      {
        key: 'rule-config',
        label: t('finance.consolidation_scope_page.action_rule'),
        icon: <Settings size={16} />,
        onClick: () => setShowRuleConfigModal(true),
      },
      {
        key: 'delete',
        label: t('finance.consolidation_scope_page.action_delete'),
        icon: <Trash2 size={16} />,
        color: 'error',
        confirm: true,
        confirmMessage: t('finance.consolidation_scope_page.confirm'),
        onClick: (row) => deleteScope.mutate(row.id),
      },
    ],
    [t, setShowRuleConfigModal, deleteScope]
  );

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
      <Box sx={{ mb: 3 }}>
        <StatCardGroup
          stats={statsWithIcons}
          loading={scopesLoading || companiesLoading}
        />
      </Box>

      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: { xs: '1fr', lg: '5fr 7fr' },
          gap: 3,
        }}
      >
        <ListPageTemplate<ConsolidationScope>
          columns={scopeColumns}
          data={scopesData?.items ?? []}
          loading={scopesLoading}
          searchable
          searchValue={searchKeyword}
          onSearch={setSearchKeyword}
          onRowClick={handleSelectScope}
          rowActions={scopeRowActions}
          emptyMessage={t('finance.consolidation_scope_page.no_scopes')}
        />

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
                      fontSize: designTokens.typography.fontSize.scale['1rem'],
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
