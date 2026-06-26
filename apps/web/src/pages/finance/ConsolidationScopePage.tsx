import React, { useState, useMemo, useEffect } from 'react';
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
} from '@mui/material';
import { Button } from '@mui/material';
import { useNavigate } from 'react-router-dom';
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
} from '@/hooks/useConsolidation';
import { useNotification } from '@/hooks/useNotification';
import { EnhancedDataTable } from '@/components/EnhancedDataTable';
import { StatCardGroup } from '@/components/mui';
import type { ConsolidationScope, ConsolidationCompany } from '@/types/consolidation';

// Helper to convert tailwind color class to sx
const getChipSx = (colorClass: string): object => {
  const colorMap: Record<string, { backgroundColor: string; color: string }> = {
    'bg-green-100 text-green-800': {
      backgroundColor: 'success.lighter',
      color: '#166534',
    },
    'bg-gray-100 text-gray-800': {
      backgroundColor: 'grey.100',
      color: 'grey.700',
    },
    'bg-yellow-100 text-yellow-800': {
      backgroundColor: '#fef9c3',
      color: '#854d0e',
    },
    'bg-blue-100 text-blue-800': {
      backgroundColor: '#dbeafe',
      color: '#1e40af',
    },
    'bg-purple-100 text-purple-800': {
      backgroundColor: 'secondary.light',
      color: '#6b21a8',
    },
    'bg-teal-100 text-teal-800': {
      backgroundColor: '#ccfbf1',
      color: '#115e59',
    },
    'bg-orange-100 text-orange-800': {
      backgroundColor: '#ffedd5',
      color: '#9a3412',
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
  const navigate = useNavigate();
  const { error: notifyError } = useNotification();

  // 状态
  const [searchKeyword, setSearchKeyword] = useState('');
  const [selectedScope, setSelectedScope] = useState<ConsolidationScope | null>(null);
  const [activeTab, setActiveTab] = useState('companies');

  // 查询合并范围列表
  const { data: scopesData, isLoading: scopesLoading, error: scopesError } = useConsolidationScopes({
    keyword: searchKeyword,
  });

  // 删除合并范围
  const deleteScope = useDeleteConsolidationScope();

  // 查询选中合并范围的公司列表
  const { data: companiesData, isLoading: companiesLoading, error: companiesError } =
    useScopeCompanies(selectedScope?.id || '');

  // 添加公司到合并范围
  const addCompany = useAddCompanyToScope();

  // 从合并范围移除公司
  const removeCompany = useRemoveCompanyFromScope();

  useEffect(() => {
    if (scopesError) {
      notifyError('获取合并范围列表失败');
    }
  }, [scopesError, notifyError]);

  useEffect(() => {
    if (companiesError) {
      notifyError('获取公司列表失败');
    }
  }, [companiesError, notifyError]);

  // 统计数据
  const stats = useMemo(() => {
    const totalCount = scopesData?.items?.length || 0;
    const activeCount = scopesData?.items?.filter((s) => s.status === 'active').length || 0;
    const totalCompanies = companiesData?.data?.length || 0;
    const parentCount = companiesData?.data?.filter((c) => c.is_parent).length || 0;

    return [
      {
        title: '总范围数',
        value: totalCount,
        icon: <FolderOpen sx={{ width: 20, height: 20 }} />,
        color: 'primary' as const,
      },
      {
        title: '启用数',
        value: activeCount,
        icon: <PlayCircle sx={{ width: 20, height: 20 }} />,
        color: 'success' as const,
      },
      {
        title: '公司总数',
        value: totalCompanies,
        icon: <Users2 sx={{ width: 20, height: 20 }} />,
        color: 'info' as const,
      },
      {
        title: '母公司数',
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
    if (window.confirm('确定要删除此合并范围吗？')) {
      deleteScope.mutate(scopeId);
    }
  };

  // 合并范围列定义
  const scopeColumns: ColumnDef<ConsolidationScope>[] = [
    {
      id: 'code',
      header: '合并范围编码',
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
      header: '合并范围名称',
      accessorKey: 'name',
      cell: ({ row }) => <div style={{ fontWeight: 500 }}>{row.getValue('name')}</div>,
    },
    {
      id: 'consolidation_method',
      header: '合并方法',
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
      header: '说明',
      accessorKey: 'description',
      cell: ({ row }) => (
        <span style={{ color: 'text.secondary', fontSize: 14 }}>
          {row.getValue('description') || '-'}
        </span>
      ),
    },
    {
      id: 'status',
      header: '状态',
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
      header: '操作',
      cell: ({ row }) => (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Button
            variant='text'
            size='small'
            onClick={() => navigate(`#`)}
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
      header: '公司编码',
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
      header: '公司名称',
      accessorKey: 'company_name',
      cell: ({ row }) => (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontWeight: 500 }}>{row.getValue('company_name')}</span>
          {row.original.is_parent && (
            <Chip
              size='small'
              sx={{ backgroundColor: '#dbeafe', color: '#1e40af' }}
              label='母公司'
            />
          )}
        </div>
      ),
    },
    {
      id: 'control_type',
      header: '控制类型',
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
      header: '持股比例',
      accessorKey: 'ownership_percentage',
      cell: ({ row }) => (
        <span style={{ fontFamily: 'monospace' }}>{row.getValue('ownership_percentage')}%</span>
      ),
    },
    {
      id: 'consolidation_percentage',
      header: '合并比例',
      accessorKey: 'consolidation_percentage',
      cell: ({ row }) => (
        <span style={{ fontFamily: 'monospace' }}>{row.getValue('consolidation_percentage')}%</span>
      ),
    },
    {
      id: 'minority_interest',
      header: '少数股东权益',
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
      header: '操作',
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
    <Box sx={{ p: 3 }}>
      {/* 页面标题 */}
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          mb: 3,
        }}
      >
        <Box>
          <Typography
            variant='h5'
            sx={{
              fontWeight: 700,
              display: 'flex',
              alignItems: 'center',
              gap: 1,
            }}
          >
            <GitMerge sx={{ width: 24, height: 24, color: 'primary.dark' }} />
            合并范围管理
          </Typography>
          <Typography
            variant='body2'
            sx={{ color: 'text.secondary', mt: 0.5 }}
          >
            配置多公司合并报表的合并范围和抵消规则
          </Typography>
        </Box>
        <Button
          variant='contained'
          onClick={() => navigate('#')}
          startIcon={<Plus sx={{ width: 16, height: 16 }} />}
        >
          新建合并范围
        </Button>
      </Box>

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
                placeholder='搜索合并范围名称或编码...'
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
                <EnhancedDataTable
                  columns={scopeColumns}
                  data={scopesData?.items || []}
                  loading={scopesLoading}
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
                    onClick={() =>
                      navigate(`#`)
                    }
                    startIcon={<Edit2 sx={{ width: 16, height: 16 }} />}
                  >
                    编辑
                  </Button>
                </Box>
                <Typography
                  variant='body2'
                  sx={{ color: 'text.secondary', mt: 1 }}
                >
                  {selectedScope.code} | {selectedScope.description || '无说明'}
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
                    label='抵消规则'
                  />
                  <Tab
                    value='transactions'
                    label='内部交易'
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
                        onClick={() =>
                          navigate(`#`)
                        }
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
                      <EnhancedDataTable
                        columns={companyColumns}
                        data={companiesData?.data || []}
                        loading={companiesLoading}
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
                        onClick={() =>
                          navigate(`#`)
                        }
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
    </Box>
  );
}
