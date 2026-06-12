/**
 * 外部ERP连接管理页面
 * 管理金蝶、用友、SAP等外部ERP系统的连接配置
 */

import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Plus,
  Settings,
  RefreshCw,
  Trash2,
  Edit,
  Power,
  TestTube,
  ExternalLink,
  AlertCircle,
  CheckCircle,
  XCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  useErpConnections,
  useCreateErpConnection,
  useUpdateErpConnection,
  useDeleteErpConnection,
  useToggleErpConnection,
  useTestErpConnection,
} from "@/hooks/useExternalErp";

// ERP系统类型配置
const ERP_TYPE_CONFIG = {
  kingdee: {
    name: "金蝶K/3",
    logo: "K",
    color: "bg-blue-500",
  },
  yonyou: {
    name: "用友U8",
    logo: "Y",
    color: "bg-orange-500",
  },
  sap: {
    name: "SAP S/4",
    logo: "S",
    color: "bg-green-500",
  },
};

// 状态配置
const STATUS_CONFIG = {
  connected: {
    label: "已连接",
    color: "bg-green-100 text-green-800",
    icon: CheckCircle,
  },
  disconnected: {
    label: "未连接",
    color: "bg-gray-100 text-gray-800",
    icon: XCircle,
  },
  error: {
    label: "连接错误",
    color: "bg-red-100 text-red-800",
    icon: AlertCircle,
  },
  syncing: {
    label: "同步中",
    color: "bg-blue-100 text-blue-800",
    icon: RefreshCw,
  },
};

export default function ExternalErpConnectionsPage() {
  const navigate = useNavigate();

  // 查询连接列表
  const { data: connectionsData, isLoading, refetch } = useErpConnections();

  //  mutations
  const createConnection = useCreateErpConnection();
  const updateConnection = useUpdateErpConnection();
  const deleteConnection = useDeleteErpConnection();
  const toggleConnection = useToggleErpConnection();
  const testConnection = useTestErpConnection();

  // 状态
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingConnection, setEditingConnection] = useState<any>(null);
  const [searchKeyword, setSearchKeyword] = useState("");

  // 筛选连接
  const filteredConnections = (connectionsData?.data?.items || []).filter(
    (conn: any) =>
      conn.name.toLowerCase().includes(searchKeyword.toLowerCase()) ||
      ERP_TYPE_CONFIG[conn.type as keyof typeof ERP_TYPE_CONFIG]?.name.includes(
        searchKeyword,
      ),
  );

  // 处理测试连接
  const handleTestConnection = async (connection: any) => {
    try {
      await testConnection.mutateAsync({
        api_url: connection.api_url,
        app_key: connection.app_key,
        app_secret: connection.app_secret,
        timeout: connection.timeout || 30000,
      });
    } catch (error) {
      console.error("Test connection failed:", error);
    }
  };

  // 处理启用/禁用
  const handleToggle = async (connection: any) => {
    try {
      await toggleConnection.mutateAsync({
        connectionId: connection.id,
        enabled: !connection.is_active,
      });
    } catch (error) {
      console.error("Toggle connection failed:", error);
    }
  };

  // 处理删除
  const handleDelete = async (connectionId: string) => {
    if (!window.confirm("确定要删除此连接吗？")) return;
    try {
      await deleteConnection.mutateAsync(connectionId);
    } catch (error) {
      console.error("Delete connection failed:", error);
    }
  };

  return (
    <div className="container mx-auto py-6 space-y-6">
      {/* 页面标题 */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">外部ERP连接管理</h1>
          <p className="text-gray-500 mt-1">
            管理金蝶、用友、SAP等外部ERP系统的连接配置
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="outline" onClick={() => refetch()}>
            <RefreshCw className="w-4 h-4 mr-2" />
            刷新
          </Button>
          <Button onClick={() => setShowCreateModal(true)}>
            <Plus className="w-4 h-4 mr-2" />
            新建连接
          </Button>
        </div>
      </div>

      {/* 搜索栏 */}
      <div className="flex items-center gap-4">
        <Input
          placeholder="搜索连接名称..."
          value={searchKeyword}
          onChange={(e) => setSearchKeyword(e.target.value)}
          className="max-w-xs"
        />
      </div>

      {/* 连接列表 */}
      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <RefreshCw className="w-8 h-8 animate-spin text-gray-400" />
        </div>
      ) : filteredConnections.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Settings className="w-12 h-12 text-gray-400 mb-4" />
            <p className="text-gray-500">暂无外部ERP连接</p>
            <Button
              variant="outline"
              className="mt-4"
              onClick={() => setShowCreateModal(true)}
            >
              创建第一个连接
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredConnections.map((connection: any) => {
            const typeConfig = ERP_TYPE_CONFIG[
              connection.type as keyof typeof ERP_TYPE_CONFIG
            ] || {
              name: connection.type,
              logo: "?",
              color: "bg-gray-500",
            };
            const statusConfig =
              STATUS_CONFIG[connection.status as keyof typeof STATUS_CONFIG] ||
              STATUS_CONFIG.disconnected;
            const StatusIcon = statusConfig.icon;

            return (
              <Card key={connection.id} className="relative overflow-hidden">
                {/* 顶部颜色条 */}
                <div
                  className={`absolute top-0 left-0 right-0 h-1 ${typeConfig.color}`}
                />

                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      {/* Logo */}
                      <div
                        className={`w-10 h-10 rounded-lg ${typeConfig.color} flex items-center justify-center text-white font-bold text-lg`}
                      >
                        {typeConfig.logo}
                      </div>
                      <div>
                        <CardTitle className="text-lg">
                          {connection.name}
                        </CardTitle>
                        <p className="text-sm text-gray-500">
                          {typeConfig.name}
                        </p>
                      </div>
                    </div>

                    {/* 状态徽章 */}
                    <Badge className={statusConfig.color}>
                      <StatusIcon className="w-3 h-3 mr-1" />
                      {statusConfig.label}
                    </Badge>
                  </div>
                </CardHeader>

                <CardContent className="space-y-4">
                  {/* 连接信息 */}
                  <div className="space-y-2 text-sm">
                    <div className="flex items-center justify-between">
                      <span className="text-gray-500">API地址</span>
                      <span
                        className="font-mono text-xs truncate max-w-[200px]"
                        title={connection.api_url}
                      >
                        {connection.api_url}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-gray-500">同步方向</span>
                      <span>
                        {connection.sync_direction === "bidirectional"
                          ? "双向同步"
                          : connection.sync_direction === "import"
                            ? "导入"
                            : "导出"}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-gray-500">同步模式</span>
                      <span>
                        {connection.sync_mode === "realtime"
                          ? "实时"
                          : connection.sync_mode === "scheduled"
                            ? "定时"
                            : "手动"}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-gray-500">最后同步</span>
                      <span className="text-xs">
                        {connection.last_sync_at
                          ? new Date(connection.last_sync_at).toLocaleString()
                          : "从未同步"}
                      </span>
                    </div>
                  </div>

                  {/* 操作按钮 */}
                  <div className="flex items-center gap-2 pt-2 border-t">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="flex-1"
                      onClick={() => setEditingConnection(connection)}
                    >
                      <Edit className="w-4 h-4 mr-1" />
                      编辑
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="flex-1"
                      onClick={() => handleTestConnection(connection)}
                      disabled={testConnection.isPending}
                    >
                      <TestTube className="w-4 h-4 mr-1" />
                      测试
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleToggle(connection)}
                      disabled={toggleConnection.isPending}
                    >
                      <Power className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDelete(connection.id)}
                      disabled={deleteConnection.isPending}
                      className="text-red-600 hover:text-red-700 hover:bg-red-50"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>

                  {/* 映射管理入口 */}
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full"
                    onClick={() =>
                      navigate(
                        `/integration/external-erp/${connection.id}/mappings`,
                      )
                    }
                  >
                    <Settings className="w-4 h-4 mr-2" />
                    映射管理
                  </Button>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* 创建/编辑模态框 */}
      {showCreateModal && (
        <ConnectionFormModal
          onClose={() => setShowCreateModal(false)}
          onSave={async (data) => {
            try {
              await createConnection.mutateAsync(data);
              setShowCreateModal(false);
            } catch (error) {
              console.error("Create connection failed:", error);
            }
          }}
        />
      )}

      {editingConnection && (
        <ConnectionFormModal
          connection={editingConnection}
          onClose={() => setEditingConnection(null)}
          onSave={async (data) => {
            try {
              await updateConnection.mutateAsync({
                connectionId: editingConnection.id,
                data,
              });
              setEditingConnection(null);
            } catch (error) {
              console.error("Update connection failed:", error);
            }
          }}
        />
      )}
    </div>
  );
}

// 连接表单组件
function ConnectionFormModal({
  connection,
  onClose,
  onSave,
}: {
  connection?: any;
  onClose: () => void;
  onSave: (data: any) => void;
}) {
  const [formData, setFormData] = useState({
    type: connection?.type || "kingdee",
    name: connection?.name || "",
    api_url: connection?.api_url || "",
    app_key: connection?.app_key || "",
    app_secret: connection?.app_secret || "",
    sync_direction: connection?.sync_direction || "bidirectional",
    sync_mode: connection?.sync_mode || "manual",
    timeout: connection?.timeout || 30000,
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(formData);
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <Card className="w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <CardHeader>
          <CardTitle>{connection ? "编辑连接" : "新建连接"}</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* ERP类型 */}
            <div className="space-y-2">
              <label className="text-sm font-medium">ERP系统</label>
              <div className="grid grid-cols-3 gap-3">
                {Object.entries(ERP_TYPE_CONFIG).map(([key, config]) => (
                  <button
                    key={key}
                    type="button"
                    onClick={() => setFormData({ ...formData, type: key })}
                    className={`p-3 rounded-lg border-2 transition-colors ${
                      formData.type === key
                        ? "border-blue-500 bg-blue-50"
                        : "border-gray-200 hover:border-gray-300"
                    }`}
                  >
                    <div
                      className={`w-8 h-8 rounded ${config.color} flex items-center justify-center text-white font-bold mx-auto mb-1`}
                    >
                      {config.logo}
                    </div>
                    <p className="text-sm text-center">{config.name}</p>
                  </button>
                ))}
              </div>
            </div>

            {/* 连接名称 */}
            <div className="space-y-2">
              <label className="text-sm font-medium">连接名称</label>
              <Input
                value={formData.name}
                onChange={(e) =>
                  setFormData({ ...formData, name: e.target.value })
                }
                placeholder="例如：生产环境金蝶K3"
                required
              />
            </div>

            {/* API地址 */}
            <div className="space-y-2">
              <label className="text-sm font-medium">API地址</label>
              <Input
                value={formData.api_url}
                onChange={(e) =>
                  setFormData({ ...formData, api_url: e.target.value })
                }
                placeholder="https://api.example.com"
                required
              />
            </div>

            {/* App Key */}
            <div className="space-y-2">
              <label className="text-sm font-medium">App Key</label>
              <Input
                value={formData.app_key}
                onChange={(e) =>
                  setFormData({ ...formData, app_key: e.target.value })
                }
                placeholder="应用Key"
              />
            </div>

            {/* App Secret */}
            <div className="space-y-2">
              <label className="text-sm font-medium">App Secret</label>
              <Input
                type="password"
                value={formData.app_secret}
                onChange={(e) =>
                  setFormData({ ...formData, app_secret: e.target.value })
                }
                placeholder="应用密钥"
              />
            </div>

            {/* 同步方向 */}
            <div className="space-y-2">
              <label className="text-sm font-medium">同步方向</label>
              <select
                value={formData.sync_direction}
                onChange={(e) =>
                  setFormData({ ...formData, sync_direction: e.target.value })
                }
                className="w-full p-2 border rounded-lg"
              >
                <option value="import">导入（从外部ERP导入数据）</option>
                <option value="export">导出（推送数据到外部ERP）</option>
                <option value="bidirectional">双向同步</option>
              </select>
            </div>

            {/* 同步模式 */}
            <div className="space-y-2">
              <label className="text-sm font-medium">同步模式</label>
              <select
                value={formData.sync_mode}
                onChange={(e) =>
                  setFormData({ ...formData, sync_mode: e.target.value })
                }
                className="w-full p-2 border rounded-lg"
              >
                <option value="manual">手动同步</option>
                <option value="scheduled">定时同步</option>
                <option value="realtime">实时同步</option>
              </select>
            </div>

            {/* 按钮 */}
            <div className="flex items-center justify-end gap-3 pt-4">
              <Button type="button" variant="outline" onClick={onClose}>
                取消
              </Button>
              <Button type="submit">{connection ? "保存" : "创建"}</Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
