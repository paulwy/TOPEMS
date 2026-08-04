import React, { useState, useMemo, useEffect } from 'react';
import { designTokens } from '@/theme/tokens';
import {
  Card,
  CardContent,
  CardHeader,
  Chip,
  Typography,
  TextField,
  Box,
  Tabs,
  Tab,
  Button,
  useTheme,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
} from '@mui/material';
import type { ColumnDef } from '@tanstack/react-table';
import {
  Plus,
  Search,
  Building2,
  Users,
  Settings,
  Edit2,
  Trash2,
  ChevronRight,
  Network,
  GitMerge,
  AlertCircle,
  CheckCircle,
  XCircle,
  FolderOpen,
  PlayCircle,
  Users2,
  Briefcase,
} from 'lucide-react';
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
import { DataTable } from '@/components/common/DataTable';
import { StatCardGroup } from '@/components';
import type {
  ConsolidationScope,
  ConsolidationCompany,
  ConsolidationScopeStatus,
} from '@/types/consolidation';
import { PageContainer } from '@/components/common';

import { useTranslation } from 'react-i18next';

const ct = designTokens.colors;

// Helper to convert tailwind color class to sx
const getChipSx = (colorClass: string): object => {
  const colorMap: Record<string, { backgroundColor: string; color: string }> = {
    'bg-green-100 text-green-800': {
      backgroundColor: 'success.lighter',
      color: ct.success[800],
    },
    'bg-gray-100 text-gray-800': {
      backgroundColor: 'grey.100',
      color: 'grey.700',
    },
    'bg-yellow-100 text-yellow-800': {
      backgroundColor: 'warning.100',
      color: 'warning.800',
    },
    'bg-blue-100 text-blue-800': {
      backgroundColor: 'primary.100',
      color: 'primary.800',
    },
    'bg-purple-100 text-purple-800': {
      backgroundColor: 'secondary.light',
      color: ct.purple[700],
    },
    'bg-teal-100 text-teal-800': {
      backgroundColor: ct.teal[100],
      color: ct.teal[800],
    },
    'bg-orange-100 text-orange-800': {
      backgroundColor: ct.orange[100],
      color: ct.orange[800],
    },
  };
  return colorMap[colorClass] || { backgroundColor: 'grey.100', color: 'grey.700' };
};

// 状态配置
const STATUS_CONFIG = {
  active: {
    label: '启用',
    color: 'bg-green-100 text-green-800',
    icon: CheckCircle,
  },
  inactive: {
    label: '停用',
    color: 'bg-gray-100 text-gray-800',
    icon: XCircle,
  },
  draft: {
    label: '草稿',
    color: 'bg-yellow-100 text-yellow-800',
    icon: AlertCircle,
  },
};

// 合并方法配置
const METHOD_CONFIG = {
  full: { label: '完全合并', color: 'bg-blue-100 text-blue-800' },
  equity: { label: '权益法', color: 'bg-purple-100 text-purple-800' },
  proportional: { label: '比例合并', color: 'bg-teal-100 text-teal-800' },
};

// 控制类型配置
const CONTROL_TYPE_CONFIG = {
  full_control: { label: '全资子公司', color: 'bg-blue-100 text-blue-800' },
  joint_venture: { label: '合资公司', color: 'bg-purple-100 text-purple-800' },
  associate: { label: '联营公司', color: 'bg-orange-100 text-orange-800' },
};

export default function ConsolidationScopePage() {
  const { t } = useTranslation();
  const theme = useTheme();
  const { error: notifyError, success: notifySuccess } = useNotification();

  // 状态
  const [searchKeyword, setSearchKeyword] = useState('');
  const [selectedScope, setSelectedScope] = useState<ConsolidationScope | null>(null);
  const [activeTab, setActiveTab] = useState('companies');

  // 弹窗状态
  const [showCreateScopeModal, setShowCreateScopeModal] = useState(false);
  const [showEditScopeModal, setShowEditScopeModal] = useState(false);
  const [showAddCompanyModal, setShowAddCompanyModal] = useState(false);
  const [showRuleConfigModal, setShowRuleConfigModal] = useState(false);

  // 表单数据
  const [scopeFormData, setScopeFormData] = useState<Partial<ConsolidationScope>>({
    code: '',
    name: '',
    consolidation_method: 'full',
    description: '',
    status: 'active' as ConsolidationScopeStatus,
  });

  const [companyFormData, setCompanyFormData] = useState({
    company_id: '',
    control_type: 'full_control' as 'full_control' | 'joint_venture' | 'associate',
    ownership_percentage: 100,
    consolidation_percentage: 100,
  });

  // 查询合并范围列表
  const {
    data: scopesData,
    isLoading: scopesLoading,
    error: scopesError,
  } = useConsolidationScopes({
    keyword: searchKeyword,
  });

  // 删除合并范围
  const deleteScope = useDeleteConsolidationScope();

  // 创建合并范围
  const createScope = useCreateConsolidationScope();

  // 更新合并范围
  const updateScope = useUpdateConsolidationScope();

  // 查询选中合并范围的公司列表
  const {
    data: companiesData,
    isLoading: companiesLoading,
    error: companiesError,
  } = useScopeCompanies(selectedScope?.id || '');

  // 添加公司到合并范围
  const addCompany = useAddCompanyToScope();

  // 从合并范围移除公司
  const removeCompany = useRemoveCompanyFromScope();

  useEffect(() => {
    if (scopesError) {
      notifyError(t('finance.consolidation_scope_page.list'));
    }
  }, [scopesError, notifyError]);

  useEffect(() => {
    if (companiesError) {
      notifyError(t('finance.consolidation_scope_page.list_1'));
    }
  }, [companiesError, notifyError]);

  // 打开新建合并范围弹窗
  const handleOpenCreateScopeModal = () => {
    setScopeFormData({
      code: '',
      name: '',
      consolidation_method: 'full',
      description: '',
      status: 'active' as ConsolidationScopeStatus,
    });
    setShowCreateScopeModal(true);
  };

  // 打开编辑合并范围弹窗
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

  // 保存合并范围
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

  // 打开添加公司弹窗
  const handleOpenAddCompanyModal = () => {
    setCompanyFormData({
      company_id: '',
      control_type: 'full_control',
      ownership_percentage: 100,
      consolidation_percentage: 100,
    });
    setShowAddCompanyModal(true);
  };

  // 添加公司
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

  // 统计数据
  const stats = useMemo(() => {
    const totalCount = scopesData?.items?.length || 0;
    const activeCount = scopesData?.items?.filter((s) => s.status === 'active').length || 0;
    const totalCompanies = companiesData?.data?.length || 0;
    const parentCount = companiesData?.data?.filter((c) => c.is_parent).length || 0;

    return [
      {
        title: t('finance.consolidation_scope_page.text_75028a'),
        value: totalCount,
        icon: <FolderOpen sx={{ width: 20, height: 20 }} />,
        color: 'primary' as const,
      },
      {
        title: t('finance.consolidation_scope_page.active_1'),
        value: activeCount,
        icon: <PlayCircle sx={{ width: 20, height: 20 }} />,
        color: 'success' as const,
      },
      {
        title: t('finance.consolidation_scope_page.text_6e86b8'),
        value: totalCompanies,
        icon: <Users2 sx={{ width: 20, height: 20 }} />,
        color: 'info' as const,
      },
      {
        title: t('finance.consolidation_scope_page.text_5d26d3'),
        value: parentCount,
        icon: <Briefcase sx={{ width: 20, height: 20 }} />,
        color: 'secondary' as const,
      },
    ];
  }, [scopesData?.items, companiesData?.data]);

  // 处理选择合并范围
  const handleSelectScope = (scope: ConsolidationScope) => {
    setSelectedScope(scope);
  };

  // 处理删除合并范围
  const handleDeleteScope = async (scopeId: string) => {
    if (window.confirm(t('finance.consolidation_scope_page.confirm'))) {
      deleteScope.mutate(scopeId);
    }
  };

  // 合并范围列定义
  const scopeColumns: ColumnDef<ConsolidationScope>[] = [
    {
      id: 'code',
      header: t('finance.consolidation_scope_page.code'),
      accessorKey: 'code',
      cell: ({ row }) => (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Network sx={{ width: 16, height: 16, color: 'primary.dark' }} />
          <span style={{ fontFamily: 'monospace', fontSize: 14 }}>{row.getValue('code')}</span>
        </div>
      ),
    },
    {
      id: 'name',
      header: t('finance.consolidation_scope_page.name'),
      accessorKey: 'name',
      cell: ({ row }) => <div style={{ fontWeight: 500 }}>{row.getValue('name')}</div>,
    },
    {
      id: 'consolidation_method',
      header: t('finance.consolidation_scope_page.text_e15d05'),
      accessorKey: 'consolidation_method',
      cell: ({ row }) => {
        const method = row.getValue<string>('consolidation_method');
        const config = (METHOD_CONFIG as Record<string, { label: string; color: string }>)[
          method
        ] || {
          label: method,
          color: 'bg-gray-100 text-gray-800',
        };
        return (
          <Chip
            size='small'
            sx={getChipSx(config.color)}
            label={config.label}
          />
        );
      },
    },
    {
      id: 'description',
      header: t('finance.consolidation_scope_page.description'),
      accessorKey: 'description',
      cell: ({ row }) => (
        <span style={{ color: theme.palette.text.secondary, fontSize: 14 }}>
          {row.getValue('description') || '-'}
        </span>
      ),
    },
    {
      id: 'status',
      header: t('finance.consolidation_scope_page.status'),
      accessorKey: 'status',
      cell: ({ row }) => {
        const status = row.getValue<string>('status');
        const config = (
          STATUS_CONFIG as Record<
            string,
            { label: string; color: string; icon: React.ComponentType<any> }
          >
        )[status] || {
          label: status,
          color: 'bg-gray-100 text-gray-800',
          icon: AlertCircle,
        };
        return (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Chip
              size='small'
              sx={{ backgroundColor: 'grey.100', color: 'grey.700' }}
              label={config.label}
            />
          </div>
        );
      },
    },
    {
      id: 'actions',
      header: t('finance.consolidation_scope_page.action'),
      cell: ({ row }) => (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Button
            variant='text'
            size='small'
            onClick={() => setShowRuleConfigModal(true)}
            startIcon={<Settings sx={{ width: 16, height: 16 }} />}
          >
            规则
          </Button>
          <Button
            variant='text'
            size='small'
            onClick={() => handleDeleteScope(row.original.id)}
          >
            <Trash2 sx={{ width: 16, height: 16, color: 'error.main' }} />
          </Button>
        </div>
      ),
    },
  ];

  // 公司列定义
  const companyColumns: ColumnDef<ConsolidationCompany>[] = [
    {
      id: 'company_code',
      header: t('finance.consolidation_scope_page.code_1'),
      accessorKey: 'company_code',
      cell: ({ row }) => (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Building2 sx={{ width: 16, height: 16, color: 'text.disabled' }} />
          <span style={{ fontFamily: 'monospace', fontSize: 14 }}>
            {row.getValue('company_code')}
          </span>
        </div>
      ),
    },
    {
      id: 'company_name',
      header: t('finance.consolidation_scope_page.name_1'),
      accessorKey: 'company_name',
      cell: ({ row }) => (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontWeight: 500 }}>{row.getValue('company_name')}</span>
          {row.original.is_parent && (
            <Chip
              size='small'
              sx={{ backgroundColor: 'primary.100', color: 'primary.800' }}
              label={t('finance.consolidation_scope_page.text_0d1ada')}
            />
          )}
        </div>
      ),
    },
    {
      id: 'control_type',
      header: t('finance.consolidation_scope_page.type'),
      accessorKey: 'control_type',
      cell: ({ row }) => {
        const controlType = row.getValue<string>('control_type');
        const config = CONTROL_TYPE_CONFIG[controlType as keyof typeof CONTROL_TYPE_CONFIG] || {
          label: controlType,
          color: 'bg-gray-100 text-gray-800',
        };
        return (
          <Chip
            size='small'
            sx={getChipSx(config.color)}
            label={config.label}
          />
        );
      },
    },
    {
      id: 'ownership_percentage',
      header: t('finance.consolidation_scope_page.text_745ed7'),
      accessorKey: 'ownership_percentage',
      cell: ({ row }) => (
        <span style={{ fontFamily: 'monospace' }}>{row.getValue('ownership_percentage')}%</span>
      ),
    },
    {
      id: 'consolidation_percentage',
      header: t('finance.consolidation_scope_page.text_e40b32'),
      accessorKey: 'consolidation_percentage',
      cell: ({ row }) => (
        <span style={{ fontFamily: 'monospace' }}>{row.getValue('consolidation_percentage')}%</span>
      ),
    },
    {
      id: 'minority_interest',
      header: t('finance.consolidation_scope_page.text_4d013f'),
      accessorKey: 'minority_interest',
      cell: ({ row }) => (
        <span style={{ fontFamily: 'monospace', textAlign: 'right' }}>
          ¥
          {row.original.minority_interest.toLocaleString('zh-CN', {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
          })}
        </span>
      ),
    },
    {
      id: 'actions',
      header: t('finance.consolidation_scope_page.action'),
      cell: ({ row }) => (
        <Button
          variant='text'
          size='small'
          onClick={() => removeCompany.mutate(row.original.id)}
          disabled={row.original.is_parent}
        >
          <Trash2 sx={{ width: 16, height: 16, color: 'error.main' }} />
        </Button>
      ),
    },
  ];

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
      {/* 搜索栏 */}
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
            <Button variant='outlined'>高级搜索</Button>
          </Box>
        </CardContent>
      </Card>

      {/* 统计卡片 */}
      <Box sx={{ mb: 3 }}>
        <StatCardGroup
          stats={stats}
          loading={scopesLoading || companiesLoading}
        />
      </Box>

      {/* 合并范围列表和详情 */}
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: { xs: '1fr', lg: '5fr 7fr' },
          gap: 3,
        }}
      >
        {/* 左侧：合并范围列表 */}
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
                合并范围列表
              </Typography>
            </CardHeader>
            <CardContent>
              {scopesLoading ? (
                <Box sx={{ textAlign: 'center', py: 4, color: 'text.secondary' }}>加载中...</Box>
              ) : scopesData?.items?.length === 0 ? (
                <Box sx={{ textAlign: 'center', py: 4, color: 'text.secondary' }}>
                  暂无合并范围，点击右上角新建
                </Box>
              ) : (
                <DataTable
                  columns={scopeColumns}
                  data={scopesData?.items || []}
                  onRowClick={(row) => handleSelectScope(row)}
                />
              )}
            </CardContent>
          </Card>
        </Box>

        {/* 右侧：合并范围详情 */}
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
                    编辑
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
                    label={`成员公司 (${companiesData?.data?.length || 0})`}
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
                    <Box
                      sx={{
                        display: 'flex',
                        justifyContent: 'flex-end',
                        mb: 2,
                      }}
                    >
                      <Button
                        size='small'
                        variant='contained'
                        onClick={handleOpenAddCompanyModal}
                        startIcon={<Plus sx={{ width: 16, height: 16 }} />}
                      >
                        添加公司
                      </Button>
                    </Box>

                    {companiesLoading ? (
                      <Box
                        sx={{
                          textAlign: 'center',
                          py: 4,
                          color: 'text.secondary',
                        }}
                      >
                        加载中...
                      </Box>
                    ) : companiesData?.data?.length === 0 ? (
                      <Box
                        sx={{
                          textAlign: 'center',
                          py: 4,
                          color: 'text.secondary',
                        }}
                      >
                        暂无成员公司
                      </Box>
                    ) : (
                      <DataTable
                        columns={companyColumns}
                        data={companiesData?.data || []}
                      />
                    )}
                  </Box>
                )}

                {activeTab === 'rules' && (
                  <Box>
                    <Box
                      sx={{
                        display: 'flex',
                        justifyContent: 'flex-end',
                        mb: 2,
                      }}
                    >
                      <Button
                        size='small'
                        variant='contained'
                        onClick={() => setShowRuleConfigModal(true)}
                        startIcon={<Plus sx={{ width: 16, height: 16 }} />}
                      >
                        新建规则
                      </Button>
                    </Box>
                    <Box
                      sx={{
                        textAlign: 'center',
                        py: 4,
                        color: 'text.secondary',
                      }}
                    >
                      点击上方按钮添加抵消规则
                    </Box>
                  </Box>
                )}

                {activeTab === 'transactions' && (
                  <Box sx={{ textAlign: 'center', py: 4, color: 'text.secondary' }}>
                    内部交易列表将显示在此处
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
                <Typography>请从左侧选择一个合并范围</Typography>
              </Box>
            </Card>
          )}
        </Box>
      </Box>

      {/* 新建/编辑合并范围弹窗 */}
      <Dialog
        open={showCreateScopeModal || showEditScopeModal}
        onClose={() => {
          setShowCreateScopeModal(false);
          setShowEditScopeModal(false);
        }}
        maxWidth='sm'
        fullWidth
      >
        <DialogTitle>
          {showEditScopeModal
            ? t('finance.consolidation_scope_page.edit')
            : t('finance.consolidation_scope_page.text_425d69')}
        </DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 1, display: 'flex', flexDirection: 'column', gap: 2 }}>
            <TextField
              fullWidth
              label={t('finance.consolidation_scope_page.code_2')}
              value={scopeFormData.code}
              onChange={(e) => setScopeFormData({ ...scopeFormData, code: e.target.value })}
              placeholder={t('finance.consolidation_scope_page.please_input_1')}
              disabled={showEditScopeModal}
            />
            <TextField
              fullWidth
              label={t('finance.consolidation_scope_page.name_2')}
              value={scopeFormData.name}
              onChange={(e) => setScopeFormData({ ...scopeFormData, name: e.target.value })}
              placeholder={t('finance.consolidation_scope_page.please_input_2')}
            />
            <FormControl fullWidth>
              <InputLabel>合并方法</InputLabel>
              <Select
                value={scopeFormData.consolidation_method}
                label={t('finance.consolidation_scope_page.text_e15d05')}
                onChange={(e) =>
                  setScopeFormData({ ...scopeFormData, consolidation_method: e.target.value })
                }
              >
                <MenuItem value='full'>完全合并</MenuItem>
                <MenuItem value='equity'>权益法</MenuItem>
                <MenuItem value='proportional'>比例合并</MenuItem>
              </Select>
            </FormControl>
            <FormControl fullWidth>
              <InputLabel>状态</InputLabel>
              <Select
                value={scopeFormData.status}
                label={t('finance.consolidation_scope_page.status')}
                onChange={(e) => setScopeFormData({ ...scopeFormData, status: e.target.value })}
              >
                <MenuItem value='active'>启用</MenuItem>
                <MenuItem value='inactive'>停用</MenuItem>
                <MenuItem value='draft'>草稿</MenuItem>
              </Select>
            </FormControl>
            <TextField
              fullWidth
              label={t('finance.consolidation_scope_page.description')}
              value={scopeFormData.description}
              onChange={(e) => setScopeFormData({ ...scopeFormData, description: e.target.value })}
              placeholder={t('finance.consolidation_scope_page.please_input_3')}
              multiline
              rows={3}
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button
            variant='outlined'
            onClick={() => {
              setShowCreateScopeModal(false);
              setShowEditScopeModal(false);
            }}
          >
            取消
          </Button>
          <Button
            variant='contained'
            onClick={handleSaveScope}
            disabled={createScope.isPending || updateScope.isPending}
          >
            {createScope.isPending || updateScope.isPending
              ? t('finance.consolidation_scope_page.save')
              : t('finance.consolidation_scope_page.save_1')}
          </Button>
        </DialogActions>
      </Dialog>

      {/* 添加公司弹窗 */}
      <Dialog
        open={showAddCompanyModal}
        onClose={() => setShowAddCompanyModal(false)}
        maxWidth='sm'
        fullWidth
      >
        <DialogTitle>添加公司到合并范围</DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 1, display: 'flex', flexDirection: 'column', gap: 2 }}>
            <FormControl fullWidth>
              <InputLabel>选择公司 *</InputLabel>
              <Select
                value={companyFormData.company_id}
                label={t('finance.consolidation_scope_page.text_b868e7')}
                onChange={(e) =>
                  setCompanyFormData({ ...companyFormData, company_id: e.target.value })
                }
              >
                <MenuItem value=''>请选择公司</MenuItem>
                <MenuItem value='company-1'>集团母公司</MenuItem>
                <MenuItem value='company-2'>子公司A</MenuItem>
                <MenuItem value='company-3'>子公司B</MenuItem>
                <MenuItem value='company-4'>合资公司C</MenuItem>
              </Select>
            </FormControl>
            <FormControl fullWidth>
              <InputLabel>控制类型</InputLabel>
              <Select
                value={companyFormData.control_type}
                label={t('finance.consolidation_scope_page.type')}
                onChange={(e) =>
                  setCompanyFormData({
                    ...companyFormData,
                    control_type: e.target.value as 'full_control' | 'joint_venture' | 'associate',
                  })
                }
              >
                <MenuItem value='full_control'>全资子公司</MenuItem>
                <MenuItem value='joint_venture'>合资公司</MenuItem>
                <MenuItem value='associate'>联营公司</MenuItem>
              </Select>
            </FormControl>
            <TextField
              fullWidth
              label={t('finance.consolidation_scope_page.text_6563f0')}
              type='number'
              value={companyFormData.ownership_percentage}
              onChange={(e) =>
                setCompanyFormData({
                  ...companyFormData,
                  ownership_percentage: Number(e.target.value),
                })
              }
              placeholder={t('finance.consolidation_scope_page.please_input_4')}
            />
            <TextField
              fullWidth
              label={t('finance.consolidation_scope_page.text_5c6273')}
              type='number'
              value={companyFormData.consolidation_percentage}
              onChange={(e) =>
                setCompanyFormData({
                  ...companyFormData,
                  consolidation_percentage: Number(e.target.value),
                })
              }
              placeholder={t('finance.consolidation_scope_page.please_input_5')}
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button
            variant='outlined'
            onClick={() => setShowAddCompanyModal(false)}
          >
            取消
          </Button>
          <Button
            variant='contained'
            onClick={handleAddCompany}
            disabled={addCompany.isPending}
          >
            {addCompany.isPending
              ? t('finance.consolidation_scope_page.text_745316')
              : t('finance.consolidation_scope_page.text_b58c75')}
          </Button>
        </DialogActions>
      </Dialog>

      {/* 规则配置弹窗 */}
      <Dialog
        open={showRuleConfigModal}
        onClose={() => setShowRuleConfigModal(false)}
        maxWidth='md'
        fullWidth
      >
        <DialogTitle>抵消规则配置</DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 1 }}>
            <Typography
              variant='body2'
              color='text.secondary'
              sx={{ mb: 2 }}
            >
              抵消规则用于定义合并报表中的内部交易抵消逻辑。
            </Typography>
            <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2 }}>
              <TextField
                fullWidth
                label={t('finance.consolidation_scope_page.name_3')}
                placeholder={t('finance.consolidation_scope_page.please_input_6')}
              />
              <FormControl fullWidth>
                <InputLabel>规则类型</InputLabel>
                <Select
                  value=''
                  label={t('finance.consolidation_scope_page.type_1')}
                >
                  <MenuItem value=''>请选择类型</MenuItem>
                  <MenuItem value='intercompany'>内部交易抵消</MenuItem>
                  <MenuItem value='inventory'>存货抵消</MenuItem>
                  <MenuItem value='fixed_asset'>固定资产抵消</MenuItem>
                  <MenuItem value='equity'>权益抵消</MenuItem>
                </Select>
              </FormControl>
              <TextField
                fullWidth
                label={t('finance.consolidation_scope_page.text_0251e1')}
                placeholder={t('finance.consolidation_scope_page.please_input_7')}
              />
              <TextField
                fullWidth
                label={t('finance.consolidation_scope_page.text_765fea')}
                placeholder={t('finance.consolidation_scope_page.please_input_8')}
              />
              <FormControl fullWidth>
                <InputLabel>计算方式</InputLabel>
                <Select
                  value=''
                  label={t('finance.consolidation_scope_page.text_cbc6f6')}
                >
                  <MenuItem value=''>请选择计算方式</MenuItem>
                  <MenuItem value='full'>全额抵消</MenuItem>
                  <MenuItem value='percentage'>比例抵消</MenuItem>
                  <MenuItem value='manual'>手动录入</MenuItem>
                </Select>
              </FormControl>
              <TextField
                fullWidth
                label={t('finance.consolidation_scope_page.text_ee8ecb')}
                type='number'
                placeholder={t('finance.consolidation_scope_page.text_3446e5')}
              />
            </Box>
            <TextField
              fullWidth
              label={t('finance.consolidation_scope_page.description_2')}
              placeholder={t('finance.consolidation_scope_page.please_input_9')}
              multiline
              rows={3}
              sx={{ mt: 2 }}
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button
            variant='outlined'
            onClick={() => setShowRuleConfigModal(false)}
          >
            取消
          </Button>
          <Button variant='contained'>保存规则</Button>
        </DialogActions>
      </Dialog>
    </PageContainer>
  );
}
