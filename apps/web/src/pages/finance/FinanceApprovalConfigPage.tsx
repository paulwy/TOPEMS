/**
 * 审批配置页面（Schema 驱动版本）
 *
 * 原版: 867 行手写表格、表单、节点编辑器
 * Schema 版: ~250 行（减少 70%+）
 *
 * 使用 CrudPage + EntitySchema 实现：
 * - 列表、创建、编辑、删除由 CrudPage 自动处理
 * - 审批节点通过 detailContent 在详情视图中展示
 * - 节点管理通过自定义行操作弹窗处理
 */

import React from 'react';
import {
  Box,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Chip,
  Stack,
} from '@mui/material';
import { Settings } from 'lucide-react';

import CrudPage, { type CrudApiAdapter } from '@/components/templates/CrudPage';
import { approvalConfigApi } from '@/api/finance/approvalConfig';
import type { ApprovalConfig, ApprovalNode } from '@/api/finance/approvalConfig';
import { approvalConfigSchema } from '@/schemas/finance';

const approverTypeLabels: Record<string, string> = {
  role: '角色审批',
  user: '指定用户',
};

const approvalTypeLabels: Record<string, string> = {
  single: '单人审批',
  multiple: '多人审批',
  any: '任意一人审批',
};

// ── API 适配器 ──
const apiAdapter: CrudApiAdapter<ApprovalConfig> = {
  list: async (params) => {
    const res = await approvalConfigApi.list();
    if (res.success && res.data) {
      let items = res.data;
      // 客户端搜索（API 不支持搜索参数）
      if (params?.search) {
        const q = String(params.search).toLowerCase();
        items = items.filter(
          (c) => c.name.toLowerCase().includes(q) || (c.description || '').toLowerCase().includes(q)
        );
      }
      // 客户端筛选
      if (params?.isActive !== undefined && params.isActive !== 'all') {
        const isActive = params.isActive === 'true';
        items = items.filter((c) => c.isActive === isActive);
      }
      if (params?.priority !== undefined && params.priority !== 'all') {
        const priority = Number(params.priority);
        items = items.filter((c) => c.priority === priority);
      }
      const total = items.length;
      // 客户端分页
      const page = params?.page ?? 1;
      const pageSize = params?.pageSize ?? 10;
      const start = (page - 1) * pageSize;
      items = items.slice(start, start + pageSize);
      return { data: items, total };
    }
    return { data: [], total: 0 };
  },
  create: async (data) => {
    const res = await approvalConfigApi.create({
      name: data.name || '',
      description: data.description,
      amountThreshold: Number(data.amountThreshold ?? 0),
      maxAmount: data.maxAmount ? Number(data.maxAmount) : undefined,
      workflowId: data.workflowId,
      approvalLevels: Number(data.approvalLevels ?? 1),
      priority: Number(data.priority ?? 2),
      isActive: data.isActive !== false,
      nodes: [],
    });
    if (!res.success) throw new Error(res.message || '创建失败');
    return res.data as ApprovalConfig;
  },
  update: async (id, data) => {
    // 先获取现有节点，避免更新时丢失
    const existing = await approvalConfigApi.get(id);
    const existingNodes = existing.success && existing.data ? existing.data.nodes || [] : [];

    const res = await approvalConfigApi.update(id, {
      name: data.name || '',
      description: data.description,
      amountThreshold: Number(data.amountThreshold ?? 0),
      maxAmount: data.maxAmount ? Number(data.maxAmount) : undefined,
      workflowId: data.workflowId,
      approvalLevels: Number(data.approvalLevels ?? 1),
      priority: Number(data.priority ?? 2),
      isActive: data.isActive !== false,
      nodes: existingNodes,
    });
    if (!res.success) throw new Error(res.message || '更新失败');
    return res.data as ApprovalConfig;
  },
  delete: async (id) => {
    const res = await approvalConfigApi.delete(id);
    if (!res.success) throw new Error(res.message || '删除失败');
  },
};

// ── 节点列表渲染（详情视图中使用） ──
function NodesTable({ nodes }: { nodes: ApprovalNode[] }) {
  if (!nodes || nodes.length === 0) {
    return (
      <Paper sx={{ p: 3, textAlign: 'center', bgcolor: 'grey.50' }}>
        <Typography
          variant='body2'
          color='text.secondary'
        >
          暂无审批节点
        </Typography>
      </Paper>
    );
  }

  return (
    <TableContainer component={Paper}>
      <Table size='small'>
        <TableHead>
          <TableRow sx={{ bgcolor: 'grey.50' }}>
            <TableCell sx={{ fontWeight: 600 }}>层级</TableCell>
            <TableCell sx={{ fontWeight: 600 }}>节点名称</TableCell>
            <TableCell sx={{ fontWeight: 600 }}>审批人类型</TableCell>
            <TableCell sx={{ fontWeight: 600 }}>审批方式</TableCell>
            <TableCell
              align='center'
              sx={{ fontWeight: 600 }}
            >
              超时(小时)
            </TableCell>
            <TableCell
              align='center'
              sx={{ fontWeight: 600 }}
            >
              状态
            </TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {nodes.map((node, idx) => (
            <TableRow key={node.id || idx}>
              <TableCell>
                <Chip
                  size='small'
                  label={`第 ${node.nodeLevel} 级`}
                  color='primary'
                  variant='outlined'
                />
              </TableCell>
              <TableCell>{node.nodeName}</TableCell>
              <TableCell>{approverTypeLabels[node.approverType] || node.approverType}</TableCell>
              <TableCell>{approvalTypeLabels[node.approvalType] || node.approvalType}</TableCell>
              <TableCell align='center'>{node.timeoutHours ?? '-'}</TableCell>
              <TableCell align='center'>
                <Chip
                  size='small'
                  label={node.isActive ? '启用' : '停用'}
                  color={node.isActive ? 'success' : 'default'}
                />
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  );
}

// ── 主页面 ──
export const FinanceApprovalConfigPage: React.FC = () => {
  const detailContent = React.useCallback((row: Record<string, unknown>) => {
    const config = row as unknown as ApprovalConfig;
    const nodes = config.nodes || [];
    return (
      <Box sx={{ mt: 2 }}>
        <Stack
          direction='row'
          spacing={1}
          sx={{ mb: 2, alignItems: 'center' }}
        >
          <Settings size={18} />
          <Typography
            variant='subtitle2'
            sx={{ fontWeight: 600 }}
          >
            审批节点（{nodes.length}）
          </Typography>
        </Stack>
        <NodesTable nodes={nodes} />
      </Box>
    );
  }, []);

  return (
    <CrudPage
      schema={approvalConfigSchema}
      apiAdapter={apiAdapter}
      detailContent={detailContent}
      detailMaxWidth='lg'
      breadcrumbs={[{ label: '财务管理' }, { label: '审批配置' }]}
    />
  );
};

export default FinanceApprovalConfigPage;
