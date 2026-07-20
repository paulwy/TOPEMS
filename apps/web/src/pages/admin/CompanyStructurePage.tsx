/**
 * 公司架构管理页面
 * 管理母子公司关系、持股比例、控制类型等，用于合并报表
 */

import React, { useState, useMemo } from 'react';
import type { ColumnDef } from '@tanstack/react-table';
import {
  Plus,
  Search,
  Building2,
  Network,
  Edit2,
  Trash2,
  ChevronRight,
  ChevronDown,
  Users,
  GitMerge,
  AlertCircle,
  CheckCircle,
  XCircle,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import {
  Card,
  CardContent,
  TextField,
  Chip,
  Box,
  Typography,
  Stack,
  Tabs,
  Tab,
  Button,
} from '@mui/material';
import { PageContainer } from '@/components/common';
import {
  useCompanyRelations,
  useCompanyTree,
  useCreateCompanyRelation,
  useUpdateCompanyRelation,
  useDeleteCompanyRelation,
} from '@/hooks/useConsolidation';
import { DataTable } from '@/components/common/DataTable';
import type { CompanyRelation, CompanyTreeNode, CompanyRelationType } from '@/types/consolidation';
import { ConfirmDialog } from '@topems/shared-components';
import { useConfirmDialog } from '@/hooks';

// 关系类型配置
const RELATION_TYPE_CONFIG: Record<
  CompanyRelationType,
  {
    label: string;
    color: 'default' | 'primary' | 'secondary' | 'error' | 'info' | 'success' | 'warning';
  }
> = {
  parent: { label: '母公司', color: 'primary' },
  subsidiary: { label: '子公司', color: 'success' },
  associate: { label: '联营公司', color: 'warning' },
  joint_venture: { label: '合营公司', color: 'secondary' },
  branch: { label: '分公司', color: 'default' },
};

// 状态配置
const STATUS_CONFIG = {
  active: {
    label: '生效',
    color: 'success' as const,
    icon: CheckCircle,
  },
  inactive: {
    label: '失效',
    color: 'default' as const,
    icon: XCircle,
  },
};

// 公司架构树节点组件
const TreeNodeComponent: React.FC<{
  node: CompanyTreeNode;
  level: number;
  expandedNodes: Set<string>;
  onToggle: (id: string) => void;
}> = ({ node, level, expandedNodes, onToggle }) => {
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
            label='母公司'
            color='primary'
            size='small'
          />
        )}
        {node.relation_type && (
          <Chip
            label={RELATION_TYPE_CONFIG[node.relation_type]?.label}
            color={RELATION_TYPE_CONFIG[node.relation_type]?.color}
            size='small'
          />
        )}
        <Typography
          variant='caption'
          color='text.secondary'
        >
          持股 {node.ownership_percentage}%
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
  // 状态
  const navigate = useNavigate();
  const [searchKeyword, setSearchKeyword] = useState('');
  const [selectedRelation, setSelectedRelation] = useState<CompanyRelation | null>(null);
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

  // 创建公司关系
  const createRelation = useCreateCompanyRelation();

  // 更新公司关系
  const updateRelation = useUpdateCompanyRelation();

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

  // 处理选择关系
  const handleSelectRelation = (relation: CompanyRelation) => {
    setSelectedRelation(relation);
  };

  // 处理删除关系
  const handleDeleteRelation = (relationId: string) => {
    openConfirmDialog({
      title: '确认删除',
      message: '确定要删除此公司关系吗？',
      danger: true,
      onConfirm: () => {
        deleteRelation.mutate(relationId);
      },
    });
  };

  // 关系列表列定义
  const relationColumns: ColumnDef<CompanyRelation>[] = [
    {
      id: 'parent_company',
      header: '母公司',
      accessorKey: 'parent_company_name',
      cell: ({ row }) => (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Building2 sx={{ width: 16, height: 16, color: 'primary.main' }} />
          <Typography sx={{ fontWeight: 'medium' }}>{row.original.parent_company_name}</Typography>
          <Typography
            variant='caption'
            color='text.secondary'
          >
            ({row.original.parent_company_code})
          </Typography>
        </Box>
      ),
    },
    {
      id: 'relation_type',
      header: '关系类型',
      accessorKey: 'relation_type',
      cell: ({ row }) => {
        const relationType = row.getValue<string>('relation_type');
        const config = RELATION_TYPE_CONFIG[relationType as keyof typeof RELATION_TYPE_CONFIG] || {
          label: relationType,
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
      header: '子公司',
      accessorKey: 'child_company_name',
      cell: ({ row }) => (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Building2 sx={{ width: 16, height: 16, color: 'success.main' }} />
          <Typography sx={{ fontWeight: 'medium' }}>{row.original.child_company_name}</Typography>
          <Typography
            variant='caption'
            color='text.secondary'
          >
            ({row.original.child_company_code})
          </Typography>
        </Box>
      ),
    },
    {
      id: 'ownership_percentage',
      header: '持股比例',
      accessorKey: 'ownership_percentage',
      cell: ({ row }) => (
        <Typography sx={{ fontFamily: 'monospace' }}>
          {row.getValue('ownership_percentage')}%
        </Typography>
      ),
    },
    {
      id: 'control_percentage',
      header: '控制比例',
      accessorKey: 'control_percentage',
      cell: ({ row }) => (
        <Typography sx={{ fontFamily: 'monospace' }}>
          {row.getValue('control_percentage')}%
        </Typography>
      ),
    },
    {
      id: 'effective_date',
      header: '生效日期',
      accessorKey: 'effective_date',
      cell: ({ row }) => <Typography variant='body2'>{row.getValue('effective_date')}</Typography>,
    },
    {
      id: 'status',
      header: '状态',
      accessorKey: 'status',
      cell: ({ row }) => {
        const status = row.getValue<string>('status');
        const config = STATUS_CONFIG[status as keyof typeof STATUS_CONFIG] || {
          label: status,
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
      id: 'actions',
      header: '操作',
      cell: ({ row }) => (
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Button
            size='small'
            color='error'
            onClick={() => handleDeleteRelation(row.original.id)}
          >
            <Trash2 sx={{ width: 16, height: 16 }} />
          </Button>
        </Box>
      ),
    },
  ];

  return (
    <PageContainer
      title='公司架构管理'
      subtitle='管理母子公司关系，用于多公司合并报表'
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
                placeholder='搜索公司名称或编码...'
                value={searchKeyword}
                onChange={(e) => setSearchKeyword(e.target.value)}
                sx={{ pl: 4, width: '100%' }}
              />
            </Box>
            <Button variant='outlined'>高级搜索</Button>
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
              label='架构视图'
              icon={<Network sx={{ width: 16, height: 16 }} />}
              iconPosition='start'
            />
            <Tab
              label='关系列表'
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
                  加载中...
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
                  暂无公司架构数据
                </Typography>
              )}
            </Box>
          )}

          {/* 关系列表视图 */}
          {activeTab === 1 && (
            <Box sx={{ mt: 2 }}>
              <DataTable
                columns={relationColumns}
                data={relationsData?.data || []}
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
        {Object.entries(RELATION_TYPE_CONFIG).map(([key, config]) => {
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
              <Typography sx={{ fontWeight: 'medium', color: 'info.dark' }}>使用提示</Typography>
              <Box
                component='ul'
                sx={{ mt: 1, pl: 2, color: 'info.dark' }}
              >
                <li>公司架构用于多公司合并报表的抵消计算</li>
                <li>持股比例决定少数股东权益和归属母公司净利润的计算</li>
                <li>联营公司和合营公司采用权益法核算</li>
                <li>添加公司关系后可到合并范围管理中配置抵消规则</li>
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
