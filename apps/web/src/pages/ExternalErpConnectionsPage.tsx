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
import Button from "@mui/material/Button";
import { Card as MuiCard, CardContent, CardHeader, Box } from "@mui/material";
import Typography from "@mui/material/Typography";
import TextField from "@mui/material/TextField";
import Chip from "@mui/material/Chip";
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
    color: "blue.500",
  },
  yonyou: {
    name: "用友U8",
    logo: "Y",
    color: "orange.500",
  },
  sap: {
    name: "SAP S/4",
    logo: "S",
    color: "green.500",
  },
};

// 状态配置
const STATUS_CONFIG = {
  connected: {
    label: "已连接",
    color: "success.light",
    icon: CheckCircle,
  },
  disconnected: {
    label: "未连接",
    color: "grey.100",
    icon: XCircle,
  },
  error: {
    label: "连接错误",
    color: "error.light",
    icon: AlertCircle,
  },
  syncing: {
    label: "同步中",
    color: "info.light",
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
    <Box
      sx={{
        maxWidth: 1280,
        mx: "auto",
        py: 3,
        display: "flex",
        flexDirection: "column",
        gap: 3,
      }}
    >
      {/* 页面标题 */}
      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <Box>
          <Typography variant="h4" sx={{ fontWeight: 700, fontSize: "1.5rem" }}>
            外部ERP连接管理
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
            管理金蝶、用友、SAP等外部ERP系统的连接配置
          </Typography>
        </Box>
        <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
          <Button variant="outlined" onClick={() => refetch()}>
            <RefreshCw size={16} style={{ marginRight: 8 }} />
            刷新
          </Button>
          <Button variant="contained" onClick={() => setShowCreateModal(true)}>
            <Plus size={16} style={{ marginRight: 8 }} />
            新建连接
          </Button>
        </Box>
      </Box>

      {/* 搜索栏 */}
      <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
        <TextField
          placeholder="搜索连接名称..."
          value={searchKeyword}
          onChange={(e) => setSearchKeyword(e.target.value)}
          size="small"
          sx={{ maxWidth: 320 }}
        />
      </Box>

      {/* 连接列表 */}
      {isLoading ? (
        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            py: 6,
          }}
        >
          <RefreshCw
            size={32}
            color="#9ca3af"
            style={{ animation: "spin 1s linear infinite" }}
          />
        </Box>
      ) : filteredConnections.length === 0 ? (
        <MuiCard>
          <CardContent
            sx={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              py: 6,
            }}
          >
            <Settings size={48} color="#9ca3af" />
            <Typography color="text.secondary" sx={{ mt: 2 }}>
              暂无外部ERP连接
            </Typography>
            <Button
              variant="outlined"
              sx={{ mt: 2 }}
              onClick={() => setShowCreateModal(true)}
            >
              创建第一个连接
            </Button>
          </CardContent>
        </MuiCard>
      ) : (
        <Box
          sx={{
            display: "grid",
            gridTemplateColumns: {
              xs: "1fr",
              md: "repeat(2, 1fr)",
              lg: "repeat(3, 1fr)",
            },
            gap: 3,
          }}
        >
          {filteredConnections.map((connection: any) => {
            const typeConfig = ERP_TYPE_CONFIG[
              connection.type as keyof typeof ERP_TYPE_CONFIG
            ] || {
              name: connection.type,
              logo: "?",
              color: "grey.500",
            };
            const statusConfig =
              STATUS_CONFIG[connection.status as keyof typeof STATUS_CONFIG] ||
              STATUS_CONFIG.disconnected;
            const StatusIcon = statusConfig.icon;

            return (
              <MuiCard
                key={connection.id}
                sx={{ position: "relative", overflow: "hidden" }}
              >
                {/* 顶部颜色条 */}
                <Box
                  sx={{
                    position: "absolute",
                    top: 0,
                    left: 0,
                    right: 0,
                    height: 4,
                    bgcolor: typeConfig.color,
                  }}
                />

                <CardHeader sx={{ pb: 1 }}>
                  <Box
                    sx={{
                      display: "flex",
                      alignItems: "flex-start",
                      justifyContent: "space-between",
                    }}
                  >
                    <Box
                      sx={{ display: "flex", alignItems: "center", gap: 1.5 }}
                    >
                      {/* Logo */}
                      <Box
                        sx={{
                          width: 40,
                          height: 40,
                          borderRadius: 1,
                          bgcolor: typeConfig.color,
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          color: "common.white",
                          fontWeight: 700,
                          fontSize: "1.125rem",
                        }}
                      >
                        {typeConfig.logo}
                      </Box>
                      <Box>
                        <Typography variant="h6" sx={{ fontSize: "1.125rem" }}>
                          {connection.name}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          {typeConfig.name}
                        </Typography>
                      </Box>
                    </Box>

                    {/* 状态徽章 */}
                    <Chip
                      icon={<StatusIcon size={12} style={{ marginRight: 4 }} />}
                      label={statusConfig.label}
                      sx={{ bgcolor: statusConfig.color }}
                      size="small"
                    />
                  </Box>
                </CardHeader>

                <CardContent
                  sx={{ display: "flex", flexDirection: "column", gap: 2 }}
                >
                  {/* 连接信息 */}
                  <Box
                    sx={{
                      display: "flex",
                      flexDirection: "column",
                      gap: 1,
                      fontSize: "0.875rem",
                    }}
                  >
                    <Box
                      sx={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                      }}
                    >
                      <Typography
                        component="span"
                        variant="body2"
                        color="text.secondary"
                      >
                        API地址
                      </Typography>
                      <Typography
                        component="span"
                        sx={{
                          fontFamily: "monospace",
                          fontSize: "0.75rem",
                          whiteSpace: "nowrap",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          maxWidth: 200,
                        }}
                        title={connection.api_url}
                      >
                        {connection.api_url}
                      </Typography>
                    </Box>
                    <Box
                      sx={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                      }}
                    >
                      <Typography
                        component="span"
                        variant="body2"
                        color="text.secondary"
                      >
                        同步方向
                      </Typography>
                      <Typography component="span" variant="body2">
                        {connection.sync_direction === "bidirectional"
                          ? "双向同步"
                          : connection.sync_direction === "import"
                            ? "导入"
                            : "导出"}
                      </Typography>
                    </Box>
                    <Box
                      sx={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                      }}
                    >
                      <Typography
                        component="span"
                        variant="body2"
                        color="text.secondary"
                      >
                        同步模式
                      </Typography>
                      <Typography component="span" variant="body2">
                        {connection.sync_mode === "realtime"
                          ? "实时"
                          : connection.sync_mode === "scheduled"
                            ? "定时"
                            : "手动"}
                      </Typography>
                    </Box>
                    <Box
                      sx={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                      }}
                    >
                      <Typography
                        component="span"
                        variant="body2"
                        color="text.secondary"
                      >
                        最后同步
                      </Typography>
                      <Typography
                        component="span"
                        variant="body2"
                        sx={{ fontSize: "0.75rem" }}
                      >
                        {connection.last_sync_at
                          ? new Date(connection.last_sync_at).toLocaleString()
                          : "从未同步"}
                      </Typography>
                    </Box>
                  </Box>

                  {/* 操作按钮 */}
                  <Box
                    sx={{
                      display: "flex",
                      alignItems: "center",
                      gap: 1,
                      pt: 1,
                      borderTop: 1,
                      borderColor: "divider",
                    }}
                  >
                    <Button
                      size="small"
                      sx={{ flex: 1 }}
                      onClick={() => setEditingConnection(connection)}
                    >
                      <Edit size={16} style={{ marginRight: 4 }} />
                      编辑
                    </Button>
                    <Button
                      size="small"
                      sx={{ flex: 1 }}
                      onClick={() => handleTestConnection(connection)}
                      disabled={testConnection.isPending}
                    >
                      <TestTube size={16} style={{ marginRight: 4 }} />
                      测试
                    </Button>
                    <Button
                      size="small"
                      onClick={() => handleToggle(connection)}
                      disabled={toggleConnection.isPending}
                    >
                      <Power size={16} />
                    </Button>
                    <Button
                      size="small"
                      onClick={() => handleDelete(connection.id)}
                      disabled={deleteConnection.isPending}
                      color="error"
                    >
                      <Trash2 size={16} />
                    </Button>
                  </Box>

                  {/* 映射管理入口 */}
                  <Button
                    variant="outlined"
                    size="small"
                    sx={{ width: "100%" }}
                    onClick={() =>
                      navigate(
                        `/integration/external-erp/${connection.id}/mappings`,
                      )
                    }
                  >
                    <Settings size={16} style={{ marginRight: 8 }} />
                    映射管理
                  </Button>
                </CardContent>
              </MuiCard>
            );
          })}
        </Box>
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
    </Box>
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
    <Box
      sx={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        bgcolor: "rgba(0,0,0,0.5)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 1300,
      }}
    >
      <MuiCard
        sx={{
          width: "100%",
          maxWidth: 512,
          maxHeight: "90vh",
          overflowY: "auto",
        }}
      >
        <CardHeader>
          <Typography variant="h6">
            {connection ? "编辑连接" : "新建连接"}
          </Typography>
        </CardHeader>
        <CardContent>
          <form
            onSubmit={handleSubmit}
            style={{ display: "flex", flexDirection: "column", gap: 16 }}
          >
            {/* ERP类型 */}
            <Box sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
              <Typography
                component="label"
                variant="body2"
                sx={{ fontWeight: 500 }}
              >
                ERP系统
              </Typography>
              <Box
                sx={{
                  display: "grid",
                  gridTemplateColumns: "repeat(3, 1fr)",
                  gap: 1.5,
                }}
              >
                {Object.entries(ERP_TYPE_CONFIG).map(([key, config]) => (
                  <Box
                    component="button"
                    type="button"
                    key={key}
                    onClick={() => setFormData({ ...formData, type: key })}
                    sx={{
                      p: 1.5,
                      borderRadius: 1,
                      border: 2,
                      borderColor:
                        formData.type === key ? "primary.main" : "grey.200",
                      bgcolor:
                        formData.type === key ? "blue.50" : "transparent",
                      cursor: "pointer",
                      transition: "border-color 0.2s",
                      "&:hover": {
                        borderColor:
                          formData.type === key ? "primary.main" : "grey.300",
                      },
                    }}
                  >
                    <Box
                      sx={{
                        width: 32,
                        height: 32,
                        borderRadius: 0.5,
                        bgcolor: config.color,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        color: "common.white",
                        fontWeight: 700,
                        mx: "auto",
                        mb: 0.5,
                      }}
                    >
                      {config.logo}
                    </Box>
                    <Typography
                      component="p"
                      variant="body2"
                      sx={{ textAlign: "center" }}
                    >
                      {config.name}
                    </Typography>
                  </Box>
                ))}
              </Box>
            </Box>

            {/* 连接名称 */}
            <Box sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
              <Typography
                component="label"
                variant="body2"
                sx={{ fontWeight: 500 }}
              >
                连接名称
              </Typography>
              <TextField
                value={formData.name}
                onChange={(e) =>
                  setFormData({ ...formData, name: e.target.value })
                }
                placeholder="例如：生产环境金蝶K3"
                size="small"
                fullWidth
                required
              />
            </Box>

            {/* API地址 */}
            <Box sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
              <Typography
                component="label"
                variant="body2"
                sx={{ fontWeight: 500 }}
              >
                API地址
              </Typography>
              <TextField
                value={formData.api_url}
                onChange={(e) =>
                  setFormData({ ...formData, api_url: e.target.value })
                }
                placeholder="https://api.example.com"
                size="small"
                fullWidth
                required
              />
            </Box>

            {/* App Key */}
            <Box sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
              <Typography
                component="label"
                variant="body2"
                sx={{ fontWeight: 500 }}
              >
                App Key
              </Typography>
              <TextField
                value={formData.app_key}
                onChange={(e) =>
                  setFormData({ ...formData, app_key: e.target.value })
                }
                placeholder="应用Key"
                size="small"
                fullWidth
              />
            </Box>

            {/* App Secret */}
            <Box sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
              <Typography
                component="label"
                variant="body2"
                sx={{ fontWeight: 500 }}
              >
                App Secret
              </Typography>
              <TextField
                type="password"
                value={formData.app_secret}
                onChange={(e) =>
                  setFormData({ ...formData, app_secret: e.target.value })
                }
                placeholder="应用密钥"
                size="small"
                fullWidth
              />
            </Box>

            {/* 同步方向 */}
            <Box sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
              <Typography
                component="label"
                variant="body2"
                sx={{ fontWeight: 500 }}
              >
                同步方向
              </Typography>
              <select
                value={formData.sync_direction}
                onChange={(e) =>
                  setFormData({ ...formData, sync_direction: e.target.value })
                }
                style={{
                  width: "100%",
                  padding: 8,
                  border: "1px solid",
                  borderColor: "divider",
                  borderRadius: 8,
                }}
              >
                <option value="import">导入（从外部ERP导入数据）</option>
                <option value="export">导出（推送数据到外部ERP）</option>
                <option value="bidirectional">双向同步</option>
              </select>
            </Box>

            {/* 同步模式 */}
            <Box sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
              <Typography
                component="label"
                variant="body2"
                sx={{ fontWeight: 500 }}
              >
                同步模式
              </Typography>
              <select
                value={formData.sync_mode}
                onChange={(e) =>
                  setFormData({ ...formData, sync_mode: e.target.value })
                }
                style={{
                  width: "100%",
                  padding: 8,
                  border: "1px solid",
                  borderColor: "divider",
                  borderRadius: 8,
                }}
              >
                <option value="manual">手动同步</option>
                <option value="scheduled">定时同步</option>
                <option value="realtime">实时同步</option>
              </select>
            </Box>

            {/* 按钮 */}
            <Box
              sx={{
                display: "flex",
                alignItems: "center",
                justifyContent: "flex-end",
                gap: 1.5,
                pt: 2,
              }}
            >
              <Button type="button" variant="outlined" onClick={onClose}>
                取消
              </Button>
              <Button type="submit" variant="contained">
                {connection ? "保存" : "创建"}
              </Button>
            </Box>
          </form>
        </CardContent>
      </MuiCard>
    </Box>
  );
}
