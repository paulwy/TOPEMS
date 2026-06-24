/**
 * 转换规则配置页面
 * 管理数据转换规则和字段映射
 */

import React, { useEffect, useState, useCallback } from 'react';
import {
  Plus,
  RefreshCw,
  Eye,
  Edit,
  Trash2,
  Power,
  PowerOff,
  Play,
  ChevronDown,
  ChevronRight,
} from 'lucide-react';
import {
  Box,
  Typography,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  MenuItem,
  Switch,
  IconButton,
  Collapse,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Button as MuiButton,
} from '@mui/material';
import { Button } from '@/components/ui/Button';

import {
  ListPageTemplate,
  FormPageTemplate,
  type ColumnDef,
  type RowAction,
} from '@/components/templates';
import { integrationApi } from '@/api/integration';
import type {
  ConversionRule,
  CreateConversionRuleRequest,
  UpdateConversionRuleRequest,
  FieldMapping,
  RuleStatus,
  TriggerType,
  ConversionExecution,
} from '@/api/integration';
import { logger } from '@/utils/logger';

// 系统列表
const SYSTEMS = ['erp', 'hrm', 'mes', 'pm', 'iam', 'srm', 'wms', 'scm', 'qms', 'lims'];

// 实体列表
const ENTITIES: Record<string, string[]> = {
  erp: ['sales_order', 'purchase_order', 'customer', 'supplier'],
  hrm: ['employee', 'department', 'position', 'payroll'],
  mes: ['production_order', 'workstation', 'operation'],
  pm: ['project', 'task', 'milestone'],
  iam: ['account', 'role', 'permission'],
  srm: ['supplier', 'supplier_contract', 'supplier_evaluation'],
  wms: ['inventory', 'warehouse', 'location'],
  scm: ['supply', 'purchase_request', 'delivery'],
  qms: ['inspection', 'nonconformance', 'audit'],
  lims: ['sample', 'test', 'instrument'],
};

// 状态配置
const STATUS_CONFIG: Record<RuleStatus, { label: string; color: 'success' | 'error' | 'warning' }> =
  {
    active: { label: '已启用', color: 'success' },
    inactive: { label: '已禁用', color: 'error' },
    draft: { label: '草稿', color: 'warning' },
  };

// 触发类型配置
const TRIGGER_TYPE_CONFIG: Record<
  TriggerType,
  { label: string; color: 'primary' | 'secondary' | 'default' }
> = {
  event: { label: '事件触发', color: 'primary' },
  scheduled: { label: '定时触发', color: 'secondary' },
  manual: { label: '手动触发', color: 'default' },
};

// 表单字段配置
const FORM_SECTIONS = [
  {
    id: 'basic',
    title: '基本信息',
    fields: [
      {
        name: 'code',
        label: '规则编码',
        type: 'text',
        required: true,
        placeholder: '输入规则编码',
      },
      {
        name: 'name',
        label: '规则名称',
        type: 'text',
        required: true,
        placeholder: '输入规则名称',
      },
      {
        name: 'description',
        label: '描述',
        type: 'textarea',
        placeholder: '输入描述（可选）',
        rows: 2,
      },
    ],
  },
  {
    id: 'mapping',
    title: '转换映射',
    fields: [
      {
        name: 'source_system',
        label: '源系统',
        type: 'select',
        required: true,
        options: SYSTEMS.map((s) => ({ label: s.toUpperCase(), value: s })),
      },
      {
        name: 'source_entity',
        label: '源实体',
        type: 'select',
        required: true,
        options: ENTITIES['erp'].map((e) => ({ label: e, value: e })),
      },
      {
        name: 'target_system',
        label: '目标系统',
        type: 'select',
        required: true,
        options: SYSTEMS.map((s) => ({ label: s.toUpperCase(), value: s })),
      },
      {
        name: 'target_entity',
        label: '目标实体',
        type: 'select',
        required: true,
        options: ENTITIES['mes'].map((e) => ({ label: e, value: e })),
      },
    ],
  },
  {
    id: 'trigger',
    title: '触发配置',
    fields: [
      {
        name: 'trigger_type',
        label: '触发方式',
        type: 'select',
        required: true,
        options: [
          { label: '事件触发', value: 'event' },
          { label: '定时触发', value: 'scheduled' },
          { label: '手动触发', value: 'manual' },
        ],
      },
      {
        name: 'priority',
        label: '优先级',
        type: 'number',
        placeholder: '数字越小优先级越高',
      },
    ],
  },
  {
    id: 'advanced',
    title: '高级配置',
    fields: [
      {
        name: 'max_retries',
        label: '最大重试次数',
        type: 'number',
        placeholder: '默认3次',
      },
      {
        name: 'retry_interval_secs',
        label: '重试间隔（秒）',
        type: 'number',
        placeholder: '默认60秒',
      },
      {
        name: 'stop_on_failure',
        label: '失败后停止',
        type: 'switch',
      },
      {
        name: 'transform_script',
        label: '转换脚本',
        type: 'textarea',
        placeholder: 'JavaScript 转换表达式（可选）',
        rows: 4,
      },
    ],
  },
];

const ConversionRulesPage: React.FC = () => {
  // 数据状态
  const [rules, setRules] = useState<ConversionRule[]>([]);
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState({ page: 0, pageSize: 10 });
  const [searchValue, setSearchValue] = useState('');

  // 弹窗状态
  const [openDialog, setOpenDialog] = useState(false);
  const [editingRule, setEditingRule] = useState<ConversionRule | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // 执行记录状态
  const [showExecutions, setShowExecutions] = useState<string | null>(null);
  const [executions, setExecutions] = useState<Record<string, ConversionExecution[]>>({});

  // 加载数据
  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const res = await integrationApi.listConversionRules();
      if (res.success && res.data !== undefined) {
        setRules(res.data);
      }
    } catch (error) {
      logger.error('Error loading conversion rules:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // 筛选数据
  const filteredData = React.useMemo(() => {
    if (!searchValue) return rules;
    const keyword = searchValue.toLowerCase();
    return rules.filter(
      (rule) =>
        rule.name.toLowerCase().includes(keyword) ||
        rule.code.toLowerCase().includes(keyword) ||
        rule.source_system.toLowerCase().includes(keyword) ||
        rule.target_system.toLowerCase().includes(keyword)
    );
  }, [rules, searchValue]);

  // 表格列定义
  const columns: ColumnDef<ConversionRule>[] = [
    {
      id: 'name',
      label: '规则名称',
      sortable: true,
      render: (row) => (
        <Box>
          <Typography sx={{ fontWeight: 500 }}>{row.name}</Typography>
          <Typography sx={{ fontSize: '0.75rem', color: 'text.secondary' }}>{row.code}</Typography>
        </Box>
      ),
    },
    {
      id: 'mapping',
      label: '转换路径',
      render: (row) => (
        <Box>
          <Typography variant='body2'>
            {row.source_system}.{row.source_entity}
          </Typography>
          <Typography
            variant='body2'
            sx={{ fontSize: '0.75rem', color: 'primary.main' }}
          >
            → {row.target_system}.{row.target_entity}
          </Typography>
        </Box>
      ),
    },
    {
      id: 'trigger_type',
      label: '触发方式',
      sortable: true,
      render: (row) => {
        const config = TRIGGER_TYPE_CONFIG[row.trigger_type];
        return (
          <Chip
            label={config?.label || row.trigger_type}
            size='small'
            color={config?.color || 'default'}
          />
        );
      },
    },
    {
      id: 'priority',
      label: '优先级',
      sortable: true,
      render: (row) => <Typography variant='body2'>{row.priority}</Typography>,
    },
    {
      id: 'status',
      label: '状态',
      sortable: true,
      render: (row) => {
        const config = STATUS_CONFIG[row.status];
        return (
          <Chip
            label={config?.label || row.status}
            size='small'
            color={config?.color || 'default'}
          />
        );
      },
    },
  ];

  // 行操作
  const rowActions: RowAction<ConversionRule>[] = [
    {
      label: '查看详情',
      icon: <Eye size={14} />,
      onClick: (row) => handleOpenEditDialog(row),
    },
    {
      label: '编辑',
      icon: <Edit size={14} />,
      onClick: (row) => handleOpenEditDialog(row),
    },
    {
      label: (row) => (row.is_enabled ? '禁用' : '启用'),
      icon: (row) => (row.is_enabled ? <PowerOff size={14} /> : <Power size={14} />),
      onClick: (row) => (row.is_enabled ? handleDisableRule(row) : handleEnableRule(row)),
    },
    {
      label: '删除',
      icon: <Trash2 size={14} />,
      color: 'error',
      onClick: (row) => handleDeleteRule(row),
    },
  ];

  // 打开创建弹窗
  const handleOpenCreateDialog = () => {
    setEditingRule(null);
    setOpenDialog(true);
  };

  // 打开编辑弹窗
  const handleOpenEditDialog = (rule: ConversionRule) => {
    setEditingRule(rule);
    setOpenDialog(true);
  };

  // 关闭弹窗
  const handleCloseDialog = () => {
    setOpenDialog(false);
    setEditingRule(null);
  };

  // 处理提交
  const handleSubmit = async (data: any) => {
    try {
      setSubmitting(true);
      if (editingRule) {
        const updateData: UpdateConversionRuleRequest = {
          name: data.name || undefined,
          description: data.description,
          trigger_type: data.trigger_type,
          field_mappings: data.field_mappings,
          transform_script: data.transform_script,
          priority: data.priority,
          max_retries: data.max_retries,
          retry_interval_secs: data.retry_interval_secs,
          stop_on_failure: data.stop_on_failure,
        };
        await integrationApi.updateConversionRule(editingRule.id, updateData);
      } else {
        const createData: CreateConversionRuleRequest = {
          code: data.code,
          name: data.name,
          description: data.description,
          source_system: data.source_system,
          source_entity: data.source_entity,
          target_system: data.target_system,
          target_entity: data.target_entity,
          trigger_type: data.trigger_type,
          field_mappings: data.field_mappings || [],
          transform_script: data.transform_script,
          priority: data.priority || 0,
          max_retries: data.max_retries,
          retry_interval_secs: data.retry_interval_secs,
          stop_on_failure: data.stop_on_failure,
        };
        await integrationApi.createConversionRule(createData);
      }
      handleCloseDialog();
      loadData();
    } catch (error) {
      logger.error('Error saving conversion rule:', error);
      throw error;
    } finally {
      setSubmitting(false);
    }
  };

  // 启用规则
  const handleEnableRule = async (rule: ConversionRule) => {
    try {
      await integrationApi.enableConversionRule(rule.id);
      loadData();
    } catch (error) {
      logger.error('Error enabling rule:', error);
    }
  };

  // 禁用规则
  const handleDisableRule = async (rule: ConversionRule) => {
    try {
      await integrationApi.disableConversionRule(rule.id);
      loadData();
    } catch (error) {
      logger.error('Error disabling rule:', error);
    }
  };

  // 删除规则
  const handleDeleteRule = async (rule: ConversionRule) => {
    if (!confirm(`确定要删除规则 "${rule.name}" 吗？`)) return;
    try {
      await integrationApi.deleteConversionRule(rule.id);
      loadData();
    } catch (error) {
      logger.error('Error deleting rule:', error);
    }
  };

  // 查看执行记录
  const handleViewExecutions = async (ruleId: string) => {
    if (showExecutions === ruleId) {
      setShowExecutions(null);
      return;
    }
    try {
      const res = await integrationApi.getRuleExecutions(ruleId);
      if (res.success && res.data !== undefined) {
        setExecutions({ ...executions, [ruleId]: res.data });
      }
      setShowExecutions(ruleId);
    } catch (error) {
      logger.error('Error loading executions:', error);
    }
  };

  // 获取表单默认值
  const getDefaultValues = () => {
    if (editingRule) {
      return {
        code: editingRule.code,
        name: editingRule.name,
        description: editingRule.description,
        source_system: editingRule.source_system,
        source_entity: editingRule.source_entity,
        target_system: editingRule.target_system,
        target_entity: editingRule.target_entity,
        trigger_type: editingRule.trigger_type,
        field_mappings: editingRule.field_mappings,
        transform_script: editingRule.transform_script,
        priority: editingRule.priority,
        max_retries: editingRule.max_retries,
        retry_interval_secs: editingRule.retry_interval_secs,
        stop_on_failure: editingRule.stop_on_failure,
      };
    }
    return {
      code: '',
      name: '',
      description: '',
      source_system: 'erp',
      source_entity: ENTITIES['erp'][0],
      target_system: 'mes',
      target_entity: ENTITIES['mes'][0],
      trigger_type: 'event' as TriggerType,
      field_mappings: [],
      transform_script: '',
      priority: 0,
      max_retries: 3,
      retry_interval_secs: 60,
      stop_on_failure: false,
    };
  };

  return (
    <>
      <ListPageTemplate
        title='转换规则配置'
        subtitle='管理数据转换规则和字段映射'
        columns={columns}
        data={filteredData}
        loading={loading}
        pagination={{
          page: pagination.page,
          pageSize: pagination.pageSize,
          total: filteredData.length,
          onPageChange: (page) => setPagination((p) => ({ ...p, page })),
          onPageSizeChange: (pageSize) => setPagination({ page: 0, pageSize }),
        }}
        searchValue={searchValue}
        onSearch={setSearchValue}
        searchable
        searchPlaceholder='搜索规则名称或编码...'
        actions={[
          {
            label: '新建规则',
            icon: <Plus size={16} />,
            onClick: handleOpenCreateDialog,
            variant: 'contained',
          },
        ]}
        rowActions={rowActions}
        onRefresh={loadData}
        emptyMessage='暂无转换规则'
        expandable
        defaultExpandedIds={[]}
      />

      {/* 创建/编辑弹窗 */}
      <Dialog
        open={openDialog}
        onClose={handleCloseDialog}
        maxWidth='md'
        fullWidth
      >
        <DialogTitle>{editingRule ? '编辑转换规则' : '新建转换规则'}</DialogTitle>
        <DialogContent>
          <FormPageTemplate
            sections={FORM_SECTIONS}
            defaultValues={getDefaultValues()}
            onSubmit={handleSubmit}
            onCancel={handleCloseDialog}
            submitting={submitting}
            columns={2}
          />
        </DialogContent>
      </Dialog>
    </>
  );
};

export default ConversionRulesPage;
