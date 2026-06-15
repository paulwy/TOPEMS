/**
 * AuditLogPage 重构后
 *
 * 重构要点：
 * 1. 使用 ListPageTemplate 替代手写的 Card + Table 布局
 * 2. 使用 ColumnDef 定义表格列
 * 3. 使用 FilterBar 定义筛选器
 * 4. 使用 PageHeader 统一页面头部
 * 5. 使用 mock 数据
 * 6. 主题色使用蓝色 (#3b82f6)
 */

import React, { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import {
  Box,
  Typography,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Chip,
  IconButton,
  TextField,
} from "@mui/material";
import {
  FileText,
  Search,
  RefreshCw,
  Download,
  ChevronLeft,
  Shield,
  User,
  Clock,
  MapPin,
  Eye,
} from "lucide-react";
import { ListPageTemplate, type ColumnDef, type RowAction } from "../components/mui";
import { FilterBar, type FilterConfig } from "../components/mui/FilterBar";
import { PageHeader } from "../components/layout";

// ============ Mock 数据 ============
const mockAuditLogs = [
  {
    id: "1",
    createdAt: "2024-01-15 10:30:00",
    operator: "系统管理员",
    action: "登录",
    module: "系统",
    ipAddress: "192.168.1.100",
    description: "用户登录系统",
    status: "success",
  },
  {
    id: "2",
    createdAt: "2024-01-15 10:25:00",
    operator: "张三",
    action: "创建",
    module: "用户管理",
    ipAddress: "192.168.1.101",
    description: "创建新用户李四",
    status: "success",
  },
  {
    id: "3",
    createdAt: "2024-01-15 09:45:00",
    operator: "李四",
    action: "编辑",
    module: "角色管理",
    ipAddress: "192.168.1.102",
    description: "修改角色权限",
    status: "success",
  },
  {
    id: "4",
    createdAt: "2024-01-15 09:30:00",
    operator: "王五",
    action: "删除",
    module: "字典管理",
    ipAddress: "192.168.1.103",
    description: "删除字典项",
    status: "failed",
  },
  {
    id: "5",
    createdAt: "2024-01-14 16:50:00",
    operator: "赵六",
    action: "导出",
    module: "报表",
    ipAddress: "192.168.1.104",
    description: "导出财务报表",
    status: "success",
  },
  {
    id: "6",
    createdAt: "2024-01-14 14:20:00",
    operator: "系统管理员",
    action: "配置",
    module: "系统配置",
    ipAddress: "192.168.1.100",
    description: "修改系统参数",
    status: "success",
  },
  {
    id: "7",
    createdAt: "2024-01-14 11:00:00",
    operator: "张三",
    action: "导入",
    module: "数据管理",
    ipAddress: "192.168.1.101",
    description: "批量导入数据",
    status: "success",
  },
];

const actionOptions = [
  { value: "all", label: "全部操作" },
  { value: "登录", label: "登录" },
  { value: "创建", label: "创建" },
  { value: "编辑", label: "编辑" },
  { value: "删除", label: "删除" },
  { value: "导出", label: "导出" },
  { value: "导入", label: "导入" },
  { value: "配置", label: "配置" },
];

const moduleOptions = [
  { value: "all", label: "全部模块" },
  { value: "系统", label: "系统" },
  { value: "用户管理", label: "用户管理" },
  { value: "角色管理", label: "角色管理" },
  { value: "权限管理", label: "权限管理" },
  { value: "字典管理", label: "字典管理" },
  { value: "系统配置", label: "系统配置" },
  { value: "报表", label: "报表" },
  { value: "数据管理", label: "数据管理" },
];

// ============ 类型定义 ============
interface AuditLog {
  id: string;
  createdAt: string;
  operator: string;
  action: string;
  module: string;
  ipAddress: string;
  description: string;
  status: "success" | "failed";
}

// ============ 状态徽章 ============
const StatusBadge: React.FC<{ status: string }> = ({ status }) => {
  const isSuccess = status === "success";
  return (
    <Chip
      size="small"
      label={isSuccess ? "成功" : "失败"}
      color={isSuccess ? "success" : "error"}
      variant="filled"
    />
  );
};

// ============ 操作类型徽章 ============
const ActionBadge: React.FC<{ action: string }> = ({ action }) => {
  const colorMap: Record<string, "primary" | "secondary" | "warning" | "error" | "info"> = {
    登录: "info",
    创建: "success",
    编辑: "primary",
    删除: "error",
    导出: "warning",
    导入: "warning",
    配置: "secondary",
  };
  return (
    <Chip
      size="small"
      label={action}
      color={colorMap[action] || "default"}
      variant="outlined"
    />
  );
};

// ============ 主组件 ============
export default function AuditLogPageRefactored() {
  const navigate = useNavigate();

  // 状态
  const [logs] = useState<AuditLog[]>(mockAuditLogs);
  const [loading, setLoading] = useState(false);
  const [searchValue, setSearchValue] = useState("");
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedLog, setSelectedLog] = useState<AuditLog | null>(null);

  // 筛选器配置
  const filters: FilterConfig[] = [
    {
      id: "action",
      label: "操作类型",
      type: "select",
      options: actionOptions,
    },
    {
      id: "module",
      label: "操作模块",
      type: "select",
      options: moduleOptions,
    },
  ];

  // 筛选后的数据
  const filteredData = useMemo(() => {
    return logs.filter((log) => {
      if (
        searchValue &&
        !log.operator.toLowerCase().includes(searchValue.toLowerCase()) &&
        !log.description.toLowerCase().includes(searchValue.toLowerCase()) &&
        !log.ipAddress.toLowerCase().includes(searchValue.toLowerCase())
      ) {
        return false;
      }
      return true;
    });
  }, [logs, searchValue]);

  // 表格列定义
  const columns: ColumnDef<AuditLog>[] = useMemo(
    () => [
      {
        id: "createdAt",
        label: "操作时间",
        minWidth: 180,
        render: (row: AuditLog) => (
          <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
            <Clock style={{ width: 14, height: 14, color: "#9ca3af" }} />
            <Typography variant="body2" color="text.secondary">
              {row.createdAt}
            </Typography>
          </Box>
        ),
      },
      {
        id: "operator",
        label: "操作人",
        minWidth: 120,
        render: (row: AuditLog) => (
          <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
            <User style={{ width: 14, height: 14, color: "#9ca3af" }} />
            <Typography variant="body2">{row.operator}</Typography>
          </Box>
        ),
      },
      {
        id: "action",
        label: "操作类型",
        minWidth: 100,
        render: (row: AuditLog) => <ActionBadge action={row.action} />,
      },
      {
        id: "module",
        label: "操作模块",
        minWidth: 120,
        render: (row: AuditLog) => (
          <Typography variant="body2">{row.module}</Typography>
        ),
      },
      {
        id: "ipAddress",
        label: "IP 地址",
        minWidth: 140,
        render: (row: AuditLog) => (
          <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
            <MapPin style={{ width: 14, height: 14, color: "#9ca3af" }} />
            <Typography variant="body2" color="text.secondary">
              {row.ipAddress}
            </Typography>
          </Box>
        ),
      },
      {
        id: "description",
        label: "操作描述",
        minWidth: 200,
        render: (row: AuditLog) => (
          <Typography variant="body2" color="text.secondary" sx={{
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
          }}>
            {row.description}
          </Typography>
        ),
      },
      {
        id: "status",
        label: "状态",
        minWidth: 80,
        render: (row: AuditLog) => <StatusBadge status={row.status} />,
      },
    ],
    [],
  );

  // 行操作定义
  const rowActions: RowAction<AuditLog>[] = useMemo(
    () => [
      {
        label: "查看详情",
        icon: <Eye style={{ width: 16, height: 16 }} />,
        onClick: (row: AuditLog) => {
          setSelectedLog(row);
          setShowDetailModal(true);
        },
      },
    ],
    [],
  );

  // 分页配置
  const pagination = {
    page: 0,
    pageSize: 10,
    total: filteredData.length,
    onPageChange: (page: number) => console.log("页码:", page),
    onPageSizeChange: (pageSize: number) => console.log("每页:", pageSize),
  };

  // 刷新数据
  const handleRefresh = () => {
    setLoading(true);
    setTimeout(() => setLoading(false), 500);
  };

  // 导出日志
  const handleExport = () => {
    console.log("导出日志");
  };

  return (
    <Box sx={{ minHeight: "100vh", bgcolor: "grey.50", p: 3 }}>
      <Box sx={{ maxWidth: 1280, mx: "auto" }}>
        {/* 页面头部 */}
        <PageHeader
          title="审计日志"
          subtitle="查看系统操作审计记录"
          backButton={{
            href: "/dashboard",
            tooltip: "返回首页",
          }}
          searchBox={{
            value: searchValue,
            onChange: setSearchValue,
            placeholder: "搜索操作人、描述、IP...",
          }}
          actions={[
            {
              label: "导出",
              icon: <Download style={{ width: 16, height: 16 }} />,
              onClick: handleExport,
              variant: "outlined",
            },
            {
              label: "刷新",
              icon: <RefreshCw style={{ width: 16, height: 16 }} />,
              onClick: handleRefresh,
              variant: "outlined",
            },
          ]}
        />

        {/* 筛选栏 */}
        <FilterBar
          filters={filters}
          onSearch={handleRefresh}
          onReset={() => console.log("重置筛选")}
        />

        {/* 审计日志列表 */}
        <ListPageTemplate
          title="审计日志列表"
          columns={columns}
          data={filteredData}
          loading={loading}
          pagination={pagination}
          rowActions={rowActions}
          getRowId={(row) => row.id}
          emptyMessage="暂无审计日志"
        />
      </Box>

      {/* 日志详情对话框 */}
      <Dialog
        open={showDetailModal}
        onClose={() => setShowDetailModal(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
            <FileText style={{ width: 20, height: 20, color: "#3b82f6" }} />
            审计日志详情
          </Box>
        </DialogTitle>
        {selectedLog && (
          <DialogContent>
            <Box sx={{ display: "flex", flexDirection: "column", gap: 2, pt: 1 }}>
              <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
                <Typography variant="body2" color="text.secondary" sx={{ width: 80 }}>
                  操作时间
                </Typography>
                <Typography variant="body2">{selectedLog.createdAt}</Typography>
              </Box>
              <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
                <Typography variant="body2" color="text.secondary" sx={{ width: 80 }}>
                  操作人
                </Typography>
                <Typography variant="body2">{selectedLog.operator}</Typography>
              </Box>
              <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
                <Typography variant="body2" color="text.secondary" sx={{ width: 80 }}>
                  操作类型
                </Typography>
                <ActionBadge action={selectedLog.action} />
              </Box>
              <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
                <Typography variant="body2" color="text.secondary" sx={{ width: 80 }}>
                  操作模块
                </Typography>
                <Typography variant="body2">{selectedLog.module}</Typography>
              </Box>
              <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
                <Typography variant="body2" color="text.secondary" sx={{ width: 80 }}>
                  IP 地址
                </Typography>
                <Typography variant="body2">{selectedLog.ipAddress}</Typography>
              </Box>
              <Box sx={{ display: "flex", alignItems: "flex-start", gap: 2 }}>
                <Typography variant="body2" color="text.secondary" sx={{ width: 80 }}>
                  操作描述
                </Typography>
                <Typography variant="body2">{selectedLog.description}</Typography>
              </Box>
              <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
                <Typography variant="body2" color="text.secondary" sx={{ width: 80 }}>
                  状态
                </Typography>
                <StatusBadge status={selectedLog.status} />
              </Box>
            </Box>
          </DialogContent>
        )}
        <DialogActions>
          <Button onClick={() => setShowDetailModal(false)}>关闭</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
