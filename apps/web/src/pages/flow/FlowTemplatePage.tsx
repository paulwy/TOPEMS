import React, { useState, useEffect, useMemo } from 'react';
import { apiLogger } from '@/utils/logger';
import { Box, Dialog, DialogActions, DialogContent, DialogTitle, Typography } from '@mui/material';
import { Button } from '@mui/material';
import { Eye, Edit, Copy, Trash2, Plus, FileText } from 'lucide-react';
import { ListPageTemplate } from '@/components/templates';
import type { ColumnDef, RowAction, FilterConfig } from '@/components/templates';

interface FlowTemplate {
  id: string;
  name: string;
  type: string;
  scope: string;
  usageCount: number;
  creator: string;
  createdAt: string;
}

const mockTemplates: FlowTemplate[] = [
  {
    id: 'TPL-001',
    name: '标准请假流程',
    type: 'approval',
    scope: '全公司',
    usageCount: 156,
    creator: '张三',
    createdAt: '2024-01-10',
  },
  {
    id: 'TPL-002',
    name: '差旅报销流程',
    type: 'reimbursement',
    scope: '全公司',
    usageCount: 89,
    creator: '李四',
    createdAt: '2024-01-15',
  },
  {
    id: 'TPL-003',
    name: '采购审批流程',
    type: 'purchase',
    scope: '采购部',
    usageCount: 45,
    creator: '王五',
    createdAt: '2024-02-01',
  },
  {
    id: 'TPL-004',
    name: '合同审批流程',
    type: 'contract',
    scope: '法务部',
    usageCount: 23,
    creator: '赵六',
    createdAt: '2024-02-10',
  },
  {
    id: 'TPL-005',
    name: '加班申请流程',
    type: 'approval',
    scope: '全公司',
    usageCount: 234,
    creator: '张三',
    createdAt: '2024-02-15',
  },
  {
    id: 'TPL-006',
    name: '设备借用流程',
    type: 'approval',
    scope: '行政部',
    usageCount: 67,
    creator: '李四',
    createdAt: '2024-02-20',
  },
  {
    id: 'TPL-007',
    name: '入职审批流程',
    type: 'approval',
    scope: '人力资源部',
    usageCount: 12,
    creator: '孙七',
    createdAt: '2024-03-01',
  },
  {
    id: 'TPL-008',
    name: '离职审批流程',
    type: 'approval',
    scope: '人力资源部',
    usageCount: 8,
    creator: '孙七',
    createdAt: '2024-03-05',
  },
];

const getTypeText = (type: string) => {
  switch (type) {
    case 'approval':
      return '审批流程';
    case 'reimbursement':
      return '报销流程';
    case 'purchase':
      return '采购流程';
    case 'contract':
      return '合同流程';
    default:
      return type;
  }
};

const FlowTemplatePage: React.FC = () => {
  const [data, setData] = useState<FlowTemplate[]>(mockTemplates);
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>('');
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<FlowTemplate | null>(null);

  const filteredData = data.filter((item) => {
    const matchesSearch = item.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesType = !typeFilter || item.type === typeFilter;
    return matchesSearch && matchesType;
  });

  const handleView = (template: FlowTemplate) => {
    apiLogger.info('查看模板:', template.id);
  };

  const handleEdit = (template: FlowTemplate) => {
    apiLogger.info('编辑模板:', template.id);
  };

  const handleCopy = (template: FlowTemplate) => {
    const newTemplate: FlowTemplate = {
      ...template,
      id: `TPL-${String(data.length + 1).padStart(3, '0')}`,
      name: `${template.name} (副本)`,
      usageCount: 0,
      createdAt: new Date().toISOString().split('T')[0],
    };
    setData((prev) => [...prev, newTemplate]);
  };

  const handleDelete = (template: FlowTemplate) => {
    setSelectedTemplate(template);
    setShowDeleteDialog(true);
  };

  const confirmDelete = () => {
    if (selectedTemplate) {
      setData((prev) => prev.filter((t) => t.id !== selectedTemplate.id));
      setShowDeleteDialog(false);
      setSelectedTemplate(null);
    }
  };

  const columns = useMemo<ColumnDef<FlowTemplate>[]>(
    () => [
      {
        id: 'name',
        label: '模板名称',
        render: (row) => (
          <Typography
            variant='body2'
            sx={{ fontWeight: 500 }}
          >
            {row.name}
          </Typography>
        ),
      },
      {
        id: 'type',
        label: '模板类型',
        render: (row) => getTypeText(row.type),
      },
      {
        id: 'scope',
        label: '适用范围',
        render: (row) => row.scope,
      },
      {
        id: 'usageCount',
        label: '使用次数',
        render: (row) => row.usageCount,
      },
      {
        id: 'creator',
        label: '创建人',
        render: (row) => row.creator,
      },
      {
        id: 'createdAt',
        label: '创建时间',
        render: (row) => row.createdAt,
      },
    ],
    []
  );

  const rowActions = useMemo<RowAction<FlowTemplate>[]>(
    () => [
      {
        label: '查看',
        icon: <Eye size={16} />,
        onClick: (row) => handleView(row),
      },
      {
        label: '编辑',
        icon: <Edit size={16} />,
        onClick: (row) => handleEdit(row),
      },
      {
        label: '复制',
        icon: <Copy size={16} />,
        onClick: (row) => handleCopy(row),
      },
      {
        label: '删除',
        icon: <Trash2 size={16} />,
        color: 'error',
        onClick: (row) => handleDelete(row),
      },
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  );

  const filters = useMemo<FilterConfig[]>(
    () => [
      {
        id: 'type',
        label: '模板类型',
        type: 'select',
        options: [
          { value: '', label: '全部' },
          { value: 'approval', label: '审批流程' },
          { value: 'reimbursement', label: '报销流程' },
          { value: 'purchase', label: '采购流程' },
          { value: 'contract', label: '合同流程' },
        ],
        value: typeFilter,
        onChange: (value) => {
          setTypeFilter(value as string);
        },
      },
    ],
    [typeFilter]
  );

  return (
    <>
      <ListPageTemplate<FlowTemplate>
        title='流程模板'
        subtitle='管理和使用流程模板'
        backButton={{
          href: '/dashboard',
        }}
        columns={columns}
        data={filteredData}
        searchable
        searchPlaceholder='搜索模板名称...'
        searchValue={searchTerm}
        onSearch={(value) => {
          setSearchTerm(value);
        }}
        filters={filters}
        rowActions={rowActions}
        actions={[
          {
            label: '新建模板',
            icon: <Plus size={18} />,
            onClick: () => {},
            variant: 'contained',
          },
        ]}
      />

      <Dialog
        open={showDeleteDialog}
        onClose={() => setShowDeleteDialog(false)}
      >
        <DialogTitle>删除模板</DialogTitle>
        <DialogContent>
          <Typography>
            确定要删除模板 <strong>{selectedTemplate?.name}</strong> 吗？
          </Typography>
          <Typography
            variant='body2'
            sx={{ color: 'grey.500', mt: 1 }}
          >
            删除后无法恢复
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button
            color='inherit'
            onClick={() => setShowDeleteDialog(false)}
          >
            取消
          </Button>
          <Button
            variant='contained'
            color='error'
            onClick={confirmDelete}
          >
            确认删除
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
};

export default FlowTemplatePage;
