import {
  Button,
  Card,
  CardContent,
  CardHeader,
  Chip,
  Typography,
  Box,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  IconButton,
} from "@mui/material";
import React, { useState, useEffect } from "react";
import {
  Clock,
  Search,
  ChevronLeft,
  AlertCircle,
  Shield,
  User,
  Activity,
  FileText,
  FlaskConical,
  Filter,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import type { AuditLog as LimsAuditLog } from "@/api/lims";
import { auditLimsApi } from "@/api/lims";
import type { AuditLog as RsAuditLog } from "@/api/rs";
import { auditRsApi } from "@/api/rs";
import { useAppStore } from "../../store";

import { ModeToggle } from "@/components/ModeToggle";

interface AuditLogPageProps {
  onNavigate?: (page: string) => void;
}

type AuditLogSource = "lims" | "rs";
type AuditLog = LimsAuditLog | RsAuditLog;

const AuditLogPage: React.FC<AuditLogPageProps> = ({ onNavigate }) => {
  const navigate = useNavigate();
  const addNotification = useAppStore((state) => state.addNotification);

  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [filterAction, setFilterAction] = useState<string>("all");
  const [filterEntityType, setFilterEntityType] = useState<string>("all");
  const [source, setSource] = useState<AuditLogSource>("lims");
  const [currentPage, setCurrentPage] = useState(1);
  const [total, setTotal] = useState(0);
  const pageSize = 20;

  const loadLogs = async () => {
    setLoading(true);
    try {
      const api = source === "lims" ? auditLimsApi : auditRsApi;
      const params: any = {
        page: currentPage,
        page_size: pageSize,
      };
      if (filterStatus !== "all") {
        params.status = filterStatus;
      }
      if (filterAction !== "all") {
        params.action = filterAction;
      }
      if (filterEntityType !== "all") {
        params.entity_type = filterEntityType;
      }
      const response = await api.listAuditLogs(params);
      if (response.success && response.data) {
        setLogs(response.data.audit_logs);
        setTotal(response.data.total);
      } else {
        setLogs([]);
        setTotal(0);
      }
    } catch (error: any) {
      console.error("加载审计日志失败:", error);
      setLogs([]);
      addNotification({
        title: "加载失败",
        message: error.message || "加载审计日志失败",
        type: "error",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadLogs();
  }, [source, currentPage, filterStatus, filterAction, filterEntityType]);

  const getStatusBadge = (status: string) => {
    const badges: Record<
      string,
      {
        color:
          | "default"
          | "primary"
          | "secondary"
          | "error"
          | "info"
          | "success"
          | "warning";
        label: string;
      }
    > = {
      success: { color: "success", label: "成功" },
      partial: { color: "warning", label: "部分成功" },
      error: { color: "error", label: "失败" },
    };
    const config = badges[status] || {
      color: "default",
      label: status,
    };
    return <Chip size="small" color={config.color} label={config.label} />;
  };

  const formatAction = (action: string) => {
    const map: Record<string, string> = {
      batch_create: "批量创建",
      batch_delete: "批量删除",
      export: "导出",
      import: "导入",
      create: "创建",
      update: "更新",
      delete: "删除",
      read: "读取",
    };
    return map[action] || action;
  };

  const filteredLogs = logs.filter((log) => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      (log.user_name?.toLowerCase() || "").includes(query) ||
      (log.user_id?.toLowerCase() || "").includes(query) ||
      (log.action?.toLowerCase() || "").includes(query) ||
      (log.entity_type?.toLowerCase() || "").includes(query) ||
      (log.ip_address?.toLowerCase() || "").includes(query)
    );
  });

  const uniqueActions = Array.from(
    new Set(logs.map((log) => log.action)),
  ).sort();
  const uniqueEntityTypes = Array.from(
    new Set(logs.map((log) => log.entity_type)),
  ).sort();

  return (
    <Box sx={{ minHeight: "100vh", bgcolor: "grey.100" }}>
      {/* 顶部导航 */}
      <Box
        sx={{
          bgcolor: "background.paper",
          borderBottom: 1,
          borderColor: "divider",
        }}
      >
        <Box sx={{ maxWidth: 1200, mx: "auto", px: 3, py: 3 }}>
          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
            }}
          >
            <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
              <IconButton onClick={() => navigate("/dashboard")}>
                <ChevronLeft />
              </IconButton>
              <Box>
                <Typography
                  variant="h5"
                  sx={{
                    fontWeight: "bold",
                    display: "flex",
                    alignItems: "center",
                    gap: 1,
                  }}
                >
                  <Shield size={28} color="#1976d2" />
                  安全审计
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  访问日志、操作审计
                </Typography>
              </Box>
            </Box>
            <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
              <ModeToggle />
              <Box
                sx={{
                  display: "flex",
                  bgcolor: "grey.100",
                  borderRadius: 2,
                  p: 0.5,
                }}
              >
                <Button
                  size="small"
                  variant={source === "lims" ? "contained" : "text"}
                  onClick={() => setSource("lims")}
                  startIcon={<FileText size={16} />}
                >
                  LIMS
                </Button>
                <Button
                  size="small"
                  variant={source === "rs" ? "contained" : "text"}
                  onClick={() => setSource("rs")}
                  startIcon={<FlaskConical size={16} />}
                >
                  RS
                </Button>
              </Box>
              <Button
                variant="contained"
                onClick={loadLogs}
                startIcon={<Activity size={16} />}
              >
                刷新
              </Button>
            </Box>
          </Box>
        </Box>
      </Box>

      <Box sx={{ maxWidth: 1200, mx: "auto", px: 3, py: 4 }}>
        {/* 搜索和筛选 */}
        <Card sx={{ mb: 3 }}>
          <CardContent>
            <Box
              sx={{
                display: "flex",
                flexWrap: "wrap",
                alignItems: "center",
                gap: 2,
              }}
            >
              <Box sx={{ flex: 1, minWidth: 200, position: "relative" }}>
                <Search
                  style={{
                    position: "absolute",
                    left: 12,
                    top: "50%",
                    transform: "translateY(-50%)",
                    width: 20,
                    height: 20,
                    color: "#9e9e9e",
                  }}
                />
                <TextField
                  size="small"
                  placeholder="搜索用户名、操作、实体类型、IP..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  sx={{ width: "100%", pl: 5 }}
                />
              </Box>
              <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                <Filter size={16} color="#9e9e9e" />
                <FormControl size="small" sx={{ minWidth: 140 }}>
                  <InputLabel>全部状态</InputLabel>
                  <Select
                    value={filterStatus}
                    label="全部状态"
                    onChange={(e) => setFilterStatus(e.target.value)}
                  >
                    <MenuItem value="all">全部状态</MenuItem>
                    <MenuItem value="success">成功</MenuItem>
                    <MenuItem value="partial">部分成功</MenuItem>
                    <MenuItem value="error">失败</MenuItem>
                  </Select>
                </FormControl>
                <FormControl size="small" sx={{ minWidth: 140 }}>
                  <InputLabel>全部操作</InputLabel>
                  <Select
                    value={filterAction}
                    label="全部操作"
                    onChange={(e) => setFilterAction(e.target.value)}
                  >
                    <MenuItem value="all">全部操作</MenuItem>
                    {uniqueActions.map((action) => (
                      <MenuItem key={action} value={action}>
                        {formatAction(action)}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
                <FormControl size="small" sx={{ minWidth: 140 }}>
                  <InputLabel>全部实体</InputLabel>
                  <Select
                    value={filterEntityType}
                    label="全部实体"
                    onChange={(e) => setFilterEntityType(e.target.value)}
                  >
                    <MenuItem value="all">全部实体</MenuItem>
                    {uniqueEntityTypes.map((type) => (
                      <MenuItem key={type} value={type}>
                        {type}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Box>
            </Box>
          </CardContent>
        </Card>

        {/* 日志列表 */}
        <Card>
          <CardContent sx={{ p: 0 }}>
            {loading ? (
              <Box sx={{ p: 4, textAlign: "center" }}>
                <Box
                  sx={{
                    display: "inline-block",
                    width: 32,
                    height: 32,
                    border: 4,
                    borderColor: "primary.main",
                    borderTop: "transparent",
                    borderRadius: "50%",
                    animation: "spin 1s linear infinite",
                  }}
                />
                <Typography sx={{ mt: 2, color: "text.secondary" }}>
                  加载中...
                </Typography>
              </Box>
            ) : filteredLogs.length === 0 ? (
              <Box sx={{ p: 4, textAlign: "center" }}>
                <Clock size={48} color="#9e9e9e" />
                <Typography sx={{ color: "text.secondary", mt: 2 }}>
                  暂无审计日志
                </Typography>
              </Box>
            ) : (
              <>
                <Box sx={{ overflowX: "auto" }}>
                  <Box
                    component="table"
                    sx={{ width: "100%", borderCollapse: "collapse" }}
                  >
                    <Box component="thead" sx={{ bgcolor: "grey.100" }}>
                      <Box component="tr">
                        <Box
                          component="th"
                          sx={{
                            px: 3,
                            py: 2,
                            textAlign: "left",
                            fontSize: "0.75rem",
                            fontWeight: 500,
                            color: "text.secondary",
                            textTransform: "uppercase",
                          }}
                        >
                          时间
                        </Box>
                        <Box
                          component="th"
                          sx={{
                            px: 3,
                            py: 2,
                            textAlign: "left",
                            fontSize: "0.75rem",
                            fontWeight: 500,
                            color: "text.secondary",
                            textTransform: "uppercase",
                          }}
                        >
                          用户
                        </Box>
                        <Box
                          component="th"
                          sx={{
                            px: 3,
                            py: 2,
                            textAlign: "left",
                            fontSize: "0.75rem",
                            fontWeight: 500,
                            color: "text.secondary",
                            textTransform: "uppercase",
                          }}
                        >
                          操作
                        </Box>
                        <Box
                          component="th"
                          sx={{
                            px: 3,
                            py: 2,
                            textAlign: "left",
                            fontSize: "0.75rem",
                            fontWeight: 500,
                            color: "text.secondary",
                            textTransform: "uppercase",
                          }}
                        >
                          实体类型
                        </Box>
                        <Box
                          component="th"
                          sx={{
                            px: 3,
                            py: 2,
                            textAlign: "left",
                            fontSize: "0.75rem",
                            fontWeight: 500,
                            color: "text.secondary",
                            textTransform: "uppercase",
                          }}
                        >
                          IP地址
                        </Box>
                        <Box
                          component="th"
                          sx={{
                            px: 3,
                            py: 2,
                            textAlign: "left",
                            fontSize: "0.75rem",
                            fontWeight: 500,
                            color: "text.secondary",
                            textTransform: "uppercase",
                          }}
                        >
                          状态
                        </Box>
                        <Box
                          component="th"
                          sx={{
                            px: 3,
                            py: 2,
                            textAlign: "left",
                            fontSize: "0.75rem",
                            fontWeight: 500,
                            color: "text.secondary",
                            textTransform: "uppercase",
                          }}
                        >
                          详情
                        </Box>
                      </Box>
                    </Box>
                    <Box component="tbody">
                      {filteredLogs.map((log) => (
                        <Box
                          component="tr"
                          key={log.id}
                          sx={{ "&:hover": { bgcolor: "grey.50" } }}
                        >
                          <Box
                            component="td"
                            sx={{
                              px: 3,
                              py: 2,
                              fontSize: "0.875rem",
                              color: "text.secondary",
                              whiteSpace: "nowrap",
                            }}
                          >
                            {new Date(log.created_at).toLocaleString("zh-CN")}
                          </Box>
                          <Box component="td" sx={{ px: 3, py: 2 }}>
                            <Box
                              sx={{
                                display: "flex",
                                alignItems: "center",
                                gap: 1,
                              }}
                            >
                              <Box
                                sx={{
                                  width: 32,
                                  height: 32,
                                  borderRadius: "50%",
                                  bgcolor: "primary.light",
                                  display: "flex",
                                  alignItems: "center",
                                  justifyContent: "center",
                                }}
                              >
                                <User size={16} color="#1976d2" />
                              </Box>
                              <Box
                                sx={{ fontSize: "0.875rem", fontWeight: 500 }}
                              >
                                {log.user_name || log.user_id || "-"}
                              </Box>
                            </Box>
                          </Box>
                          <Box
                            component="td"
                            sx={{ px: 3, py: 2, fontSize: "0.875rem" }}
                          >
                            {formatAction(log.action)}
                          </Box>
                          <Box
                            component="td"
                            sx={{
                              px: 3,
                              py: 2,
                              fontSize: "0.875rem",
                              color: "text.secondary",
                            }}
                          >
                            {log.entity_type}
                          </Box>
                          <Box
                            component="td"
                            sx={{
                              px: 3,
                              py: 2,
                              fontSize: "0.875rem",
                              color: "text.secondary",
                            }}
                          >
                            {log.ip_address || "-"}
                          </Box>
                          <Box component="td" sx={{ px: 3, py: 2 }}>
                            {getStatusBadge(log.status)}
                          </Box>
                          <Box
                            component="td"
                            sx={{
                              px: 3,
                              py: 2,
                              fontSize: "0.875rem",
                              color: "text.secondary",
                              maxWidth: 200,
                            }}
                          >
                            {log.error_message && (
                              <Typography
                                sx={{
                                  fontSize: "0.75rem",
                                  color: "error.main",
                                }}
                              >
                                {log.error_message}
                              </Typography>
                            )}
                            {!log.error_message && log.request_details && (
                              <Typography
                                sx={{
                                  fontSize: "0.75rem",
                                  overflow: "hidden",
                                  textOverflow: "ellipsis",
                                  whiteSpace: "nowrap",
                                }}
                              >
                                {JSON.stringify(log.request_details)}
                              </Typography>
                            )}
                            {!log.error_message && !log.request_details && "-"}
                          </Box>
                        </Box>
                      ))}
                    </Box>
                  </Box>
                </Box>

                {total > pageSize && (
                  <Box
                    sx={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      px: 3,
                      py: 2,
                      borderTop: 1,
                      borderColor: "divider",
                      bgcolor: "grey.50",
                    }}
                  >
                    <Typography variant="body2" color="text.secondary">
                      显示第 {(currentPage - 1) * pageSize + 1} -{" "}
                      {Math.min(currentPage * pageSize, total)} 条，共 {total}{" "}
                      条
                    </Typography>
                    <Box sx={{ display: "flex", gap: 1 }}>
                      <Button
                        variant="outlined"
                        size="small"
                        onClick={() =>
                          setCurrentPage((prev) => Math.max(1, prev - 1))
                        }
                        disabled={currentPage === 1}
                      >
                        上一页
                      </Button>
                      <Button
                        variant="outlined"
                        size="small"
                        onClick={() => setCurrentPage((prev) => prev + 1)}
                        disabled={currentPage * pageSize >= total}
                      >
                        下一页
                      </Button>
                    </Box>
                  </Box>
                )}
              </>
            )}
          </CardContent>
        </Card>
      </Box>
    </Box>
  );
};

export default AuditLogPage;
