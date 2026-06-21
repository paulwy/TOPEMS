import {
  Button,
  Card,
  CardContent,
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
import React, { useState, useEffect, useMemo } from "react";
import {
  Clock,
  Search,
  ChevronLeft,
  Shield,
  User,
  Activity,
  FileText,
  FlaskConical,
  Filter,
  RefreshCw,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import type { AuditLog as LimsAuditLog } from "@/api/lims";
import { auditLimsApi } from "@/api/lims";
import type { AuditLog as RsAuditLog } from "@/api/rs";
import { auditRsApi } from "@/api/rs";
import { useAppStore } from "../../store";
import { apiLogger } from "@/utils/logger";
import { ListPageTemplate, type ColumnDef, type FilterConfig } from "@/components/templates";

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
      apiLogger.error("加载审计日志失败:", error);
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
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

  const columns: ColumnDef<AuditLog>[] = useMemo(
    () => [
      {
        id: "created_at",
        label: "时间",
        render: (row) => (
          <Typography variant="body2" color="text.secondary">
            {new Date(row.created_at).toLocaleString("zh-CN")}
          </Typography>
        ),
      },
      {
        id: "user",
        label: "用户",
        render: (row) => (
          <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
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
            <Typography variant="body2" sx={{ fontWeight: 500 }}>
              {row.user_name || row.user_id || "-"}
            </Typography>
          </Box>
        ),
      },
      {
        id: "action",
        label: "操作",
        render: (row) => (
          <Typography variant="body2">{formatAction(row.action)}</Typography>
        ),
      },
      {
        id: "entity_type",
        label: "实体类型",
        render: (row) => (
          <Typography variant="body2" color="text.secondary">
            {row.entity_type}
          </Typography>
        ),
      },
      {
        id: "ip_address",
        label: "IP地址",
        render: (row) => (
          <Typography variant="body2" color="text.secondary">
            {row.ip_address || "-"}
          </Typography>
        ),
      },
      {
        id: "status",
        label: "状态",
        render: (row) => getStatusBadge(row.status),
      },
      {
        id: "details",
        label: "详情",
        render: (row) => (
          <Box sx={{ maxWidth: 200 }}>
            {row.error_message && (
              <Typography
                variant="body2"
                sx={{ fontSize: "0.75rem", color: "error.main" }}
              >
                {row.error_message}
              </Typography>
            )}
            {!row.error_message && row.request_details && (
              <Typography
                variant="body2"
                sx={{
                  fontSize: "0.75rem",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                }}
              >
                {JSON.stringify(row.request_details)}
              </Typography>
            )}
            {!row.error_message && !row.request_details && "-"}
          </Box>
        ),
      },
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );

  const filters: FilterConfig[] = useMemo(
    () => [
      {
        id: "status",
        label: "状态",
        options: [
          { value: "all", label: "全部状态" },
          { value: "success", label: "成功" },
          { value: "partial", label: "部分成功" },
          { value: "error", label: "失败" },
        ],
      },
      {
        id: "action",
        label: "操作",
        options: [
          { value: "all", label: "全部操作" },
          ...uniqueActions.map((action) => ({
            value: action,
            label: formatAction(action),
          })),
        ],
      },
      {
        id: "entity_type",
        label: "实体",
        options: [
          { value: "all", label: "全部实体" },
          ...uniqueEntityTypes.map((type) => ({ value: type, label: type })),
        ],
      },
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [uniqueActions, uniqueEntityTypes],
  );

  const handleFilterChange = (filterId: string, value: string) => {
    if (filterId === "status") {
      setFilterStatus(value);
    } else if (filterId === "action") {
      setFilterAction(value);
    } else if (filterId === "entity_type") {
      setFilterEntityType(value);
    }
    setCurrentPage(1);
  };

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
                startIcon={<RefreshCw size={16} />}
              >
                刷新
              </Button>
            </Box>
          </Box>
        </Box>
      </Box>

      <Box sx={{ maxWidth: 1200, mx: "auto", px: 3, py: 4 }}>
        <Card>
          <CardContent sx={{ p: 0 }}>
            <ListPageTemplate
              title="审计日志"
              subtitle={`共 ${total} 条记录`}
              data={filteredLogs}
              columns={columns}
              loading={loading}
              searchPlaceholder="搜索用户名、操作、实体类型、IP..."
              searchValue={searchQuery}
              onSearchChange={setSearchQuery}
              filters={filters}
              filterValues={{
                status: filterStatus,
                action: filterAction,
                entity_type: filterEntityType,
              }}
              onFilterChange={handleFilterChange}
              pagination={{
                page: currentPage,
                pageSize: pageSize,
                total: total,
                onPageChange: setCurrentPage,
              }}
              emptyIcon={<Clock size={48} color="#9e9e9e" />}
              emptyMessage="暂无审计日志"
            />
          </CardContent>
        </Card>
      </Box>
    </Box>
  );
};
