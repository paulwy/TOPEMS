/**
 * 外部ERP连接管理页面
 * 管理金蝶、用友、SAP等外部ERP系统的连接配置
 */

import React, { useState, useMemo, useCallback } from "react";
import { apiLogger } from "@/utils/logger";
import { useNavigate } from "react-router-dom";
import {
  Plus,
  Settings,
  RefreshCw,
  Trash2,
  Edit,
  Power,
  TestTube,
  Eye,
} from "lucide-react";

import { Box, Typography, TextField, Chip, Card, CardContent, CardHeader, Dialog, DialogTitle, DialogContent, DialogActions,  } from "@mui/material";
import { Button } from "@/components/ui/Button";

import {
  ListPageTemplate,
  type ColumnDef,
  type RowAction,
} from "@/components/templates";

import {
  useErpConnections,
  useCreateErpConnection,
  useUpdateErpConnection,
  useDeleteErpConnection,
  useToggleErpConnection,
  useTestErpConnection,
} from "@/hooks/useExternalErp";

// ERP系统类型配置
const ERP_TYPE_CONFIG: Record<
  string,
  { name: string; logo: string; color: string }
> = {
  kingdee: {
    name: "金蝶K/3",
    logo: "K",
    color: "#3b82f6",
  },
  yonyou: {
    name: "用友U8",
    logo: "Y",
    color: "#f59e0b",
  },
  sap: {
    name: "SAP S/4",
    logo: "S",
    color: "#22c55e",
  },
};

// 状态配置
const STATUS_CONFIG: Record<
  string,
  { label: string; color: "success" | "default" | "error" | "warning" }
> = {
  connected: {
    label: "已连接",
    color: "success",
  },
  disconnected: {
    label: "未连接",
    color: "default",
  },
  error: {
    label: "连接错误",
    color: "error",
  },
  syncing: {
    label: "同步中",
    color: "warning",
  },
};

interface ErpConnection {
  id: string;
  type: string;
  name: string;
  api_url: string;
  app_key?: string;
  app_secret?: string;
  sync_direction: string;
  sync_mode: string;
  timeout?: number;
  is_active?: boolean;
  status?: string;
  last_sync_at?: string;
}

export default function ExternalErpConnectionsPage() {
  const navigate = useNavigate();

  // 查询连接列表
  const { data: connectionsData, isLoading, refetch } = useErpConnections();

  // mutations
  const createConnection = useCreateErpConnection();
  const updateConnection = useUpdateErpConnection();
  const deleteConnection = useDeleteErpConnection();
  const toggleConnection = useToggleErpConnection();
  const testConnection = useTestErpConnection();

  // 状态
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingConnection, setEditingConnection] =
    useState<ErpConnection | null>(null);
  const [searchValue, setSearchValue] = useState("");
  const [pagination, setPagination] = useState({ page: 0, pageSize: 10 });

  // 连接列表数据
  const connections: ErpConnection[] = connectionsData?.data?.items || [];

  // 筛选后的数据
  const filteredData = useMemo(() => {
    if (!searchValue) return connections;
    const keyword = searchValue.toLowerCase();
    return connections.filter(
      (conn) =>
        conn.name.toLowerCase().includes(keyword) ||
        ERP_TYPE_CONFIG[conn.type]?.name.toLowerCase().includes(keyword),
    );
  }, [connections, searchValue]);

  // 表格列定义
  const columns: ColumnDef<ErpConnection>[] = [
    {
      id: "name",
      label: "连接名称",
      render: (row) => (
        <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
          <Box
            sx={{
              width: 32,
              height: 32,
              borderRadius: 1,
              bgcolor: ERP_TYPE_CONFIG[row.type]?.color || "#9ca3af",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "white",
              fontWeight: 700,
              fontSize: "0.875rem",
            }}
          >
            {ERP_TYPE_CONFIG[row.type]?.logo || "?"}
          </Box>
          <Box>
            <Typography variant="body2" sx={{ fontWeight: 500 }}>
              {row.name}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              {ERP_TYPE_CONFIG[row.type]?.name || row.type}
            </Typography>
          </Box>
        </Box>
      ),
    },
    {
      id: "api_url",
      label: "API地址",
      render: (row) => (
        <Typography
          variant="body2"
          sx={{
            fontFamily: "monospace",
            fontSize: "0.75rem",
            maxWidth: 200,
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
          }}
          title={row.api_url}
        >
          {row.api_url}
        </Typography>
      ),
    },
    {
      id: "sync_direction",
      label: "同步方向",
      render: (row) => {
        const directionMap: Record<string, string> = {
          bidirectional: "双向同步",
          import: "导入",
          export: "导出",
        };
        return (
          <Typography variant="body2">
            {directionMap[row.sync_direction] || row.sync_direction}
          </Typography>
        );
      },
    },
    {
      id: "sync_mode",
      label: "同步模式",
      render: (row) => {
        const modeMap: Record<string, string> = {
          realtime: "实时",
          scheduled: "定时",
          manual: "手动",
        };
        return (
          <Typography variant="body2">
            {modeMap[row.sync_mode] || row.sync_mode}
          </Typography>
        );
      },
    },
    {
      id: "last_sync_at",
      label: "最后同步",
      render: (row) => (
        <Typography
          variant="body2"
          sx={{ fontSize: "0.75rem", color: "text.secondary" }}
        >
          {row.last_sync_at
            ? new Date(row.last_sync_at).toLocaleString("zh-CN")
            : "从未同步"}
        </Typography>
      ),
    },
    {
      id: "status",
      label: "状态",
      render: (row) => {
        const status = row.status || "disconnected";
        const config = STATUS_CONFIG[status] || STATUS_CONFIG.disconnected;
        return <Chip label={config.label} color={config.color} size="small" />;
      },
    },
  ];

  // 行操作
  const rowActions: RowAction<ErpConnection>[] = [
    {
      label: "查看",
      icon: <Eye size={14} />,
      onClick: (row) => setEditingConnection(row),
    },
    {
      label: "编辑",
      icon: <Edit size={14} />,
      onClick: (row) => setEditingConnection(row),
    },
    {
      label: "测试",
      icon: <TestTube size={14} />,
      onClick: (row) => handleTestConnection(row),
      confirm: true,
      confirmMessage: "确定要测试此连接吗？",
    },
    {
      label: "映射管理",
      icon: <Settings size={14} />,
      onClick: (row) =>
        navigate(`/integration/external-erp/${row.id}/mappings`),
    },
    {
      label: "删除",
      icon: <Trash2 size={14} />,
      color: "error",
      onClick: (row) => handleDelete(row.id),
      confirm: true,
      confirmMessage: "确定要删除此连接吗？此操作不可恢复。",
    },
  ];

  // 处理测试连接
  const handleTestConnection = useCallback(
    async (connection: ErpConnection) => {
      try {
        await testConnection.mutateAsync({
          api_url: connection.api_url,
          app_key: connection.app_key || "",
          app_secret: connection.app_secret || "",
          timeout: connection.timeout || 30000,
        });
      } catch (error) {
        apiLogger.error("Test connection failed:", error);
      }
    },
    [testConnection],
  );

  // 处理删除
  const handleDelete = useCallback(
    async (connectionId: string) => {
      try {
        await deleteConnection.mutateAsync(connectionId);
      } catch (error) {
        apiLogger.error("Delete connection failed:", error);
      }
    },
    [deleteConnection],
  );

  // 处理创建
  const handleCreate = useCallback(
    async (data: Partial<ErpConnection>) => {
      try {
        await createConnection.mutateAsync(data as any);
        setShowCreateModal(false);
      } catch (error) {
        apiLogger.error("Create connection failed:", error);
      }
    },
    [createConnection],
  );

  // 处理更新
  const handleUpdate = useCallback(
    async (data: Partial<ErpConnection>) => {
      if (!editingConnection) return;
      try {
        await updateConnection.mutateAsync({
          connectionId: editingConnection.id,
          data: data as any,
        });
        setEditingConnection(null);
      } catch (error) {
        apiLogger.error("Update connection failed:", error);
      }
    },
    [updateConnection, editingConnection],
  );

  return (
    <ListPageTemplate
      title="外部ERP连接管理"
      subtitle="管理金蝶、用友、SAP等外部ERP系统的连接配置"
      columns={columns}
      data={filteredData}
      loading={isLoading}
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
      searchPlaceholder="搜索连接名称..."
      actions={[
        {
          label: "新建连接",
          icon: <Plus size={16} />,
          onClick: () => setShowCreateModal(true),
          variant: "contained",
        },
      ]}
      rowActions={rowActions}
      onRefresh={refetch}
      emptyMessage="暂无外部ERP连接"
    />
  );
}
