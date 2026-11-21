// V66.7 P2-1 双实现说明：
// - 本文件是 pages/iam/ 目录的主实现（由 Admin 控制台 /admin/iam 路由统一调度）
// - 旧的兼容实现位于 src/iam/ 目录（由 App 根路由 /iam 访问，保留向后兼容）
// - 如非必要，请优先修改 pages/iam/ 中的新页面版本
/**
 * 公司架构管理页面
 * 管理母子公司关系、持股比例、控制类型等，用于合并报表
 */

import React, { useState, useCallback, useMemo } from 'react';
import {
  Search,
  Building2,
  Network,
  Trash2,
  ChevronRight,
  ChevronDown,
  Users,
  AlertCircle,
  CheckCircle,
  XCircle,
} from 'lucide-react';
import {
  Card,
  CardContent,
  TextField,
  Chip,
  Box,
  Typography,
  Tabs,
  Tab,
  Button,
} from '@mui/material';
import { PageContainer } from '@/components/common';
import {
  useCompanyRelations,
  useCompanyTree,
  useDeleteCompanyRelation,
} from '@/hooks/useConsolidation';
import { ListPageTemplate } from '@/components/templates';
import type { ColumnDef, RowAction } from '@/components/templates/list/types';
import type { CompanyRelation, CompanyTreeNode, CompanyRelationType } from '@/types/consolidation';
import { ConfirmDialog } from '@topems/shared-components';
import { useConfirmDialog } from '@/hooks';
import { useTranslation } from 'react-i18next';
import i18n from '@/i18n';

type RelationTypeConfig = {
  label: string;
  color: 'default' | 'primary' | 'secondary' | 'error' | 'info' | 'success' | 'warning';
};

function getRelationTypeConfig(): Record<CompanyRelationType, RelationTypeConfig> {
  return {
    parent: { label: i18n.t('iam.company_structure_page.k0'), color: 'primary' },
    subsidiary: { label: i18n.t('iam.company_structure_page.k1'), color: 'success' },
    associate: { label: i18n.t('iam.company_structure_page.k2'), color: 'warning' },
    joint_venture: { label: i18n.t('iam.company_structure_page.k3'), color: 'secondary' },
    branch: { label: i18n.t('iam.company_structure_page.k4'), color: 'default' },
  };
}

function getStatusConfig() {
  return {
    active: {
      label: i18n.t('iam.company_structure_page.k5'),
      color: 'success' as const,
      icon: CheckCircle,
    },
    inactive: {
      label: i18n.t('iam.company_structure_page.k6'),
      color: 'default' as const,
      icon: XCircle,
    },
  };
}

// 公司架构树节点组件
const TreeNodeComponent: React.FC<{
  node: CompanyTreeNode;
  level: number;
  expandedNodes: Set<string>;
  onToggle: (id: string) => void;
}> = ({ node, level, expandedNodes, onToggle }) => {
  const { t } = useTranslation('iam');
  const relationTypeConfig = getRelationTypeConfig();
  const hasChildren = node.children && node.children.length > 0;
  const isExpanded = expandedNodes.has(node.id);

  return (
    <Box>
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          gap: 1,
          py: 1,
          px: 1.5,
          cursor: 'pointer',
          '&:hover': { bgcolor: 'grey.100' },
          pl: level * 3 + 1.5,
        }}
        onClick={() => hasChildren && onToggle(node.id)}
      >
        {hasChildren ? (
          isExpanded ? (
            <ChevronDown sx={{ width: 16, height: 16, color: 'grey.400' }} />
          ) : (
            <ChevronRight sx={{ width: 16, height: 16, color: 'grey.400' }} />
          )
        ) : (
          <Box sx={{ width: 16 }} />
        )}
        <Building2 sx={{ width: 16, height: 16, color: 'primary.main' }} />
        <Typography sx={{ fontWeight: 'medium' }}>{node.name}</Typography>
        <Typography
          variant='caption'
          color='text.secondary'
        >
          ({node.code})
        </Typography>
        {node.is_parent && (
          <Chip
            label={t('iam.company_structure_page.k7')}
            color='primary'
            size='small'
          />
        )}
        {node.relation_type && (
          <Chip
            label={relationTypeConfig[node.relation_type]?.label}
            color={relationTypeConfig[node.relation_type]?.color}
            size='small'
          />
        )}
        <Typography
          variant='caption'
          color='text.secondary'
        >
          {i18n.t('pages.company_structure_page.k0')} {node.ownership_percentage}%
        </Typography>
      </Box>
      {hasChildren && isExpanded && (
        <Box>
          {node.children.map((child) => (
            <TreeNodeComponent
              key={child.id}
              node={child}
              level={level + 1}
              expandedNodes={expandedNodes}
              onToggle={onToggle}
            />
          ))}
        </Box>
      )}
    </Box>
  );
};

export default function CompanyStructurePage() {
  const { t } = useTranslation('iam');
  const relationTypeConfig = getRelationTypeConfig();
  const statusConfig = getStatusConfig();
  // 状态
  const [searchKeyword, setSearchKeyword] = useState('');
  const [activeTab, setActiveTab] = useState(0);
  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set());

  const {
    confirmOpen: confirmDialogOpen,
    confirmConfig: confirmDialogConfig,
    openConfirm: openConfirmDialog,
    closeConfirm: setConfirmDialogClosed,
  } = useConfirmDialog();

  // 查询公司关系列表
  const { data: relationsData, isLoading: relationsLoading } = useCompanyRelations({
    keyword: searchKeyword,
  });

  // 查询公司架构树
  const { data: treeData, isLoading: treeLoading } = useCompanyTree();

  // 删除公司关系
  const deleteRelation = useDeleteCompanyRelation();

  // 处理展开/折叠
  const handleToggle = (id: string) => {
    setExpandedNodes((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  // 处理删除关系
  const handleDeleteRelation = useCallback(
    (relationId: string) => {
      openConfirmDialog({
        title: t('iam.company_structure_page.k8'),
        message: t('iam.company_structure_page.k9'),
        danger: true,
        onConfirm: () => {
          deleteRelation.mutate(relationId);
        },
      });
    },
    [openConfirmDialog, t, deleteRelation]
  );

  // 关系列表列定义
  const relationColumns: ColumnDef<CompanyRelation>[] = useMemo(
    () => [
      {
        id: 'parent_company',
        label: t('iam.company_structure_page.k10'),
        render: (row) => (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Building2 sx={{ width: 16, height: 16, color: 'primary.main' }} />
            <Typography sx={{ fontWeight: 'medium' }}>{row.parent_company_name}</Typography>
            <Typography
              variant='caption'
              color='text.secondary'
            >
              ({row.parent_company_code})
            </Typography>
          </Box>
        ),
      },
      {
        id: 'relation_type',
        label: t('iam.company_structure_page.k11'),
        render: (row) => {
          const config = relationTypeConfig[row.relation_type] || {
            label: row.relation_type,
            color: 'default' as const,
          };
          return (
            <Chip
              label={config.label}
              color={config.color}
              size='small'
            />
          );
        },
      },
      {
        id: 'child_company',
        label: t('iam.company_structure_page.k12'),
        render: (row) => (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Building2 sx={{ width: 16, height: 16, color: 'success.main' }} />
            <Typography sx={{ fontWeight: 'medium' }}>{row.child_company_name}</Typography>
            <Typography
              variant='caption'
              color='text.secondary'
            >
              ({row.child_company_code})
            </Typography>
          </Box>
        ),
      },
      {
        id: 'ownership_percentage',
        label: t('iam.company_structure_page.k13'),
        render: (row) => (
          <Typography sx={{ fontFamily: 'monospace' }}>{row.ownership_percentage}%</Typography>
        ),
      },
      {
        id: 'control_percentage',
        label: t('iam.company_structure_page.k14'),
        render: (row) => (
          <Typography sx={{ fontFamily: 'monospace' }}>{row.control_percentage}%</Typography>
        ),
      },
      {
        id: 'effective_date',
        label: t('iam.company_structure_page.k15'),
        render: (row) => <Typography variant='body2'>{row.effective_date}</Typography>,
      },
      {
        id: 'status',
        label: t('iam.company_structure_page.k16'),
        render: (row) => {
          const config = statusConfig[row.status] || {
            label: row.status,
            color: 'default' as const,
          };
          return (
            <Chip
              label={config.label}
              color={config.color}
              size='small'
            />
          );
        },
      },
    ],
    [t, relationTypeConfig, statusConfig]
  );

  const rowActions: RowAction<CompanyRelation>[] = useMemo(
    () => [
      {
        key: 'delete',
        label: t('iam.company_structure_page.k8'),
        icon: <Trash2 size={16} />,
        onClick: (row) => handleDeleteRelation(row.id),
        color: 'error',
        disabled: () => deleteRelation.isPending,
      },
    ],
    [t, handleDeleteRelation, deleteRelation.isPending]
  );

  return (
    <PageContainer
      title={t('iam.company_structure_page.k18')}
      subtitle={t('iam.company_structure_page.k19')}
      maxWidth='xl'
    >
      {/* 搜索栏 */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Box sx={{ display: 'flex', gap: 2 }}>
            <Box sx={{ position: 'relative', flex: 1, maxWidth: 400 }}>
              <Search
                sx={{
                  position: 'absolute',
                  left: 12,
                  top: '50%',
                  transform: 'translateY(-50%)',
                  width: 16,
                  height: 16,
                  color: 'grey.400',
                }}
              />
              <TextField
                size='small'
                placeholder={i18n.t('pages.company_structure_page.k0')}
                value={searchKeyword}
                onChange={(e) => setSearchKeyword(e.target.value)}
                sx={{ pl: 4, width: '100%' }}
              />
            </Box>
            <Button variant='outlined'>{t('iam.company_structure_page.k20')}</Button>
          </Box>
        </CardContent>
      </Card>

      {/* 公司架构内容 */}
      <Card>
        <CardContent>
          <Tabs
            value={activeTab}
            onChange={(_, newValue) => setActiveTab(newValue)}
          >
            <Tab
              label={t('iam.company_structure_page.k21')}
              icon={<Network sx={{ width: 16, height: 16 }} />}
              iconPosition='start'
            />
            <Tab
              label={t('iam.company_structure_page.k22')}
              icon={<Users sx={{ width: 16, height: 16 }} />}
              iconPosition='start'
            />
          </Tabs>

          {/* 架构树视图 */}
          {activeTab === 0 && (
            <Box sx={{ mt: 2 }}>
              {treeLoading ? (
                <Typography
                  sx={{ textAlign: 'center', py: 4 }}
                  color='text.secondary'
                >
                  {i18n.t('pages.company_structure_page.k1')}
                </Typography>
              ) : treeData?.data ? (
                <Box sx={{ border: 1, borderColor: 'divider', borderRadius: 1 }}>
                  <TreeNodeComponent
                    node={treeData.data}
                    level={0}
                    expandedNodes={expandedNodes}
                    onToggle={handleToggle}
                  />
                </Box>
              ) : (
                <Typography
                  sx={{ textAlign: 'center', py: 4 }}
                  color='text.secondary'
                >
                  {i18n.t('pages.company_structure_page.k2')}
                </Typography>
              )}
            </Box>
          )}

          {/* 关系列表视图 */}
          {activeTab === 1 && (
            <Box sx={{ mt: 2 }}>
              <ListPageTemplate<CompanyRelation>
                columns={relationColumns}
                data={relationsData?.data || []}
                loading={relationsLoading}
                rowActions={rowActions}
                emptyMessage={i18n.t('pages.company_structure_page.k2')}
              />
            </Box>
          )}
        </CardContent>
      </Card>

      {/* 统计信息 */}
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: 'repeat(4, 1fr)',
          gap: 2,
          mt: 3,
        }}
      >
        {Object.entries(relationTypeConfig).map(([key, config]) => {
          const count = relationsData?.data?.filter((r) => r.relation_type === key).length || 0;
          return (
            <Card
              key={key}
              sx={{
                cursor: 'pointer',
                '&:hover': { borderColor: 'primary.light' },
              }}
            >
              <CardContent>
                <Box
                  sx={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                  }}
                >
                  <Box>
                    <Typography
                      variant='body2'
                      color='text.secondary'
                    >
                      {config.label}
                    </Typography>
                    <Typography
                      variant='h5'
                      sx={{ fontWeight: 'bold', mt: 0.5 }}
                    >
                      {count}
                    </Typography>
                  </Box>
                  <Box sx={{ p: 1.5, borderRadius: '50%', bgcolor: 'grey.100' }}>
                    <Building2 sx={{ width: 24, height: 24 }} />
                  </Box>
                </Box>
              </CardContent>
            </Card>
          );
        })}
      </Box>

      {/* 提示信息 */}
      <Card sx={{ mt: 3, bgcolor: 'info.light', borderColor: 'info.main' }}>
        <CardContent>
          <Box sx={{ display: 'flex', gap: 1.5 }}>
            <AlertCircle sx={{ width: 20, height: 20, color: 'info.main' }} />
            <Box>
              <Typography sx={{ fontWeight: 'medium', color: 'info.dark' }}>
                {t('iam.company_structure_page.k23')}
              </Typography>
              <Box
                component='ul'
                sx={{ mt: 1, pl: 2, color: 'info.dark' }}
              >
                <li>{t('iam.company_structure_page.k24')}</li>
                <li>{t('iam.company_structure_page.k25')}</li>
                <li>{t('iam.company_structure_page.k26')}</li>
                <li>{t('iam.company_structure_page.k27')}</li>
              </Box>
            </Box>
          </Box>
        </CardContent>
      </Card>

      <ConfirmDialog
        isOpen={confirmDialogOpen}
        onClose={setConfirmDialogClosed}
        onConfirm={() => {
          confirmDialogConfig?.onConfirm();
          setConfirmDialogClosed();
        }}
        title={confirmDialogConfig?.title || ''}
        message={confirmDialogConfig?.message || ''}
        danger={confirmDialogConfig?.danger}
      />
    </PageContainer>
  );
}
