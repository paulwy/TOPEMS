/**
 * RsDeployPage 重构版本
 *
 * 重构要点：
 * 1. 使用 PageHeader 统一页面头部
 * 2. 使用 FilterBar 定义筛选器
 * 3. 使用 ListPageTemplate 替代 Card + Table 布局
 * 4. 使用 ColumnDef 定义表格列
 * 5. RS 主题色使用蓝色 (#3b82f6)
 */

import React, { useState, useCallback, useEffect } from "react";
import {
  Box,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Typography,
  Chip,
  Stack,
  IconButton,
  Tooltip,
} from "@mui/material";
import {
  Plus,
  Rocket,
  RotateCcw,
  Eye,
  Play,
  Download,
  RefreshCw,
  Server,
} from "lucide-react";
import { ListPageTemplate, type ColumnDef } from "../../components/templates";
import { PageHeader } from "../../components/layout";
import { FilterBar, type FilterConfig } from "../../components/mui";

// ============ 类型定义 ============
interface Deploy {
  id: string;
  deploy_no: string;
  environment: string;
  app_name: string;
  version: string;
  status: string;
  deploy_time: string;
  operator: string;
}

interface FilterValues {
  search: string;
  env: string;
  app: string;
  status: string;
}

// ============ 列定义 ============
const columns: ColumnDef<Deploy>[] = [
  {
    id: "deploy_no",
    header: "部署编号",
    accessor: "deploy_no",
    sortable: true,
    render: (value) => (
      <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
        <Rocket size={16} color="#3b82f6" />
        {value}
      </Box>
    ),
  },
  {
    id: "environment",
    header: "环境",
    accessor: "environment",
    render: (value) => {
      const envConfig: Record<string, { label: string; color: "error" | "warning" | "success" | "default" }> = {
        production: { label: "生产环境", color: "error" },
        staging: { label: "预发布环境", color: "warning" },
        development: { label: "开发环境", color: "success" },
      };
      const config = envConfig[value] || { label: value, color: "default" as const };
      return <Chip label={config.label} size="small" color={config.color} />;
    },
  },
  {
    id: "app_name",
    header: "应用名称",
    accessor: "app_name",
    render: (value) => (
      <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
        <Server size={14} />
        {value}
      </Box>
    ),
  },
  {
    id: "version",
    header: "版本",
    accessor: "version",
  },
  {
    id: "status",
    header: "状态",
    accessor: "status",
    sortable: true,
    render: (value) => {
      const statusConfig: Record<string, { label: string; color: "success" | "error" | "primary" | "default" }> = {
        success: { label: "成功", color: "success" },
        failed: { label: "失败", color: "error" },
        running: { label: "部署中", color: "primary" },
        pending: { label: "等待中", color: "default" },
      };
      const config = statusConfig[value] || statusConfig.pending;
      return <Chip label={config.label} size="small" color={config.color} />;
    },
  },
  {
    id: "deploy_time",
    header: "部署时间",
    accessor: "deploy_time",
  },
  {
    id: "operator",
    header: "操作人",
    accessor: "operator",
  },
];

// ============ 筛选配置 ============
const filters: FilterConfig[] = [
  {
    id: "search",
    label: "搜索",
    type: "text",
  },
  {
    id: "env",
    label: "环境",
    type: "text",
  },
  {
    id: "app",
    label: "应用",
    type: "text",
  },
  {
    id: "status",
    label: "状态",
    type: "text",
  },
];

// ============ 组件 ============
const RsDeployPageRefactored: React.FC = () => {
  // 数据状态
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<Deploy[]>([]);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [total, setTotal] = useState(0);

  // 筛选状态
  const [filtersValue, setFiltersValue] = useState<FilterValues>({
    search: "",
    env: "",
    app: "",
    status: "",
  });

  // 模态框状态
  const [detailDialogOpen, setDetailDialogOpen] = useState(false);
  const [selectedDeploy, setSelectedDeploy] = useState<Deploy | null>(null);

  // 模拟数据
  useEffect(() => {
    const mockDeploys: Deploy[] = [
      {
        id: "1",
        deploy_no: "DEPLOY-20240615-001",
        environment: "production",
        app_name: "frontend-app",
        version: "v2.3.1",
        status: "success",
        deploy_time: "2024-06-15 14:30:00",
        operator: "张三",
      },
      {
        id: "2",
        deploy_no: "DEPLOY-20240615-002",
        environment: "staging",
        app_name: "backend-api",
        version: "v1.5.0",
        status: "running",
        deploy_time: "2024-06-15 14:25:00",
        operator: "李四",
      },
      {
        id: "3",
        deploy_no: "DEPLOY-20240614-003",
        environment: "production",
        app_name: "mobile-app",
        version: "v3.0.0",
        status: "failed",
        deploy_time: "2024-06-14 16:20:00",
        operator: "王五",
      },
      {
        id: "4",
        deploy_no: "DEPLOY-20240614-002",
        environment: "development",
        app_name: "data-service",
        version: "v0.9.5",
        status: "success",
        deploy_time: "2024-06-14 10:15:00",
        operator: "赵六",
      },
      {
        id: "5",
        deploy_no: "DEPLOY-20240614-001",
        environment: "staging",
        app_name: "shared-utils",
        version: "v1.2.0",
        status: "success",
        deploy_time: "2024-06-14 02:00:00",
        operator: "孙七",
      },
    ];

    setTimeout(() => {
      setData(mockDeploys);
      setTotal(mockDeploys.length);
      setLoading(false);
    }, 500);
  }, []);

  // 获取数据
  const fetchDeploys = useCallback(() => {
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
    }, 500);
  }, []);

  // 处理筛选变化
  const handleFilterChange = useCallback((filterId: string, value: any) => {
    setFiltersValue((prev) => ({ ...prev, [filterId]: value }));
  }, []);

  // 处理分页变化
  const handlePageChange = useCallback((newPage: number) => {
    setPage(newPage);
  }, []);

  const handlePageSizeChange = useCallback((newPageSize: number) => {
    setPageSize(newPageSize);
    setPage(1);
  }, []);

  // 处理查看详情
  const handleViewDetail = useCallback((deploy: Deploy) => {
    setSelectedDeploy(deploy);
    setDetailDialogOpen(true);
  }, []);

  // 处理回滚
  const handleRollback = useCallback((deployId: string) => {
    const deploy = data.find((d) => d.id === deployId);
    if (deploy) {
      const rollbackDeploy: Deploy = {
        id: String(Date.now()),
        deploy_no: `DEPLOY-${new Date().toISOString().slice(0, 10).replace(/-/g, "")}-${String(data.length + 1).padStart(3, "0")}`,
        environment: deploy.environment,
        app_name: deploy.app_name,
        version: "上一版本",
        status: "running",
        deploy_time: new Date().toLocaleString(),
        operator: "当前用户",
      };
      setData((prev) => [rollbackDeploy, ...prev]);
    }
  }, [data]);

  // 处理发起部署
  const handleNewDeploy = useCallback(() => {
    const newDeploy: Deploy = {
      id: String(Date.now()),
      deploy_no: `DEPLOY-${new Date().toISOString().slice(0, 10).replace(/-/g, "")}-${String(data.length + 1).padStart(3, "0")}`,
      environment: "staging",
      app_name: "new-app",
      version: "v1.0.0",
      status: "running",
      deploy_time: new Date().toLocaleString(),
      operator: "当前用户",
    };
    setData((prev) => [newDeploy, ...prev]);
  }, [data.length]);

  // 过滤数据
  const filteredData = data.filter((deploy) => {
    const matchesSearch =
      !filtersValue.search ||
      deploy.deploy_no.toLowerCase().includes(filtersValue.search.toLowerCase()) ||
      deploy.app_name.toLowerCase().includes(filtersValue.search.toLowerCase());
    const matchesEnv = !filtersValue.env || deploy.environment === filtersValue.env;
    const matchesApp = !filtersValue.app || deploy.app_name === filtersValue.app;
    const matchesStatus = !filtersValue.status || deploy.status === filtersValue.status;
    return matchesSearch && matchesEnv && matchesApp && matchesStatus;
  });

  // 处理导出
  const handleExport = useCallback(() => {
    // 导出功能开发中
  }, []);

  // 行操作
  const rowActions = [
    {
      label: "查看详情",
      icon: <Eye size={16} />,
      onClick: handleViewDetail,
      color: "primary" as const,
    },
    {
      label: "回滚",
      icon: <RotateCcw size={16} />,
      onClick: handleRollback,
      color: "warning" as const,
    },
  ];

  return (
    <>
      <PageHeader
        title="部署管理"
        subtitle="管理部署任务、查看部署记录"
        createButton={{
          label: "发起部署",
          onClick: handleNewDeploy,
        }}
        actions={[
          {
            label: "导出",
            icon: <Download size={18} />,
            onClick: handleExport,
            variant: "outlined",
          },
        ]}
        rightContent={
          <Tooltip title="刷新">
            <IconButton onClick={fetchDeploys}>
              <RefreshCw
                size={20}
                style={{ animation: loading ? "spin 1s linear infinite" : "none" }}
              />
            </IconButton>
          </Tooltip>
        }
      />

      <ListPageTemplate
        columns={columns}
        data={filteredData}
        loading={loading}
        filters={filters}
        onFilterChange={handleFilterChange}
        pagination={{
          page,
          pageSize,
          total: filteredData.length,
          onPageChange: handlePageChange,
          onPageSizeChange: handlePageSizeChange,
        }}
        onRowClick={handleViewDetail}
        rowActions={rowActions}
        emptyMessage="暂无部署数据"
        searchable
        searchPlaceholder="搜索部署编号、应用..."
      />

      {/* 部署详情对话框 */}
      <Dialog
        open={detailDialogOpen}
        onClose={() => setDetailDialogOpen(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>部署详情</DialogTitle>
        <DialogContent>
          {selectedDeploy && (
            <Box sx={{ py: 2 }}>
              <Typography variant="h6" fontWeight="bold">
                {selectedDeploy.deploy_no}
              </Typography>
              <Stack direction="row" spacing={2} sx={{ mt: 2 }}>
                <Chip
                  label={selectedDeploy.environment === "production" ? "生产环境" : selectedDeploy.environment === "staging" ? "预发布环境" : "开发环境"}
                  color={selectedDeploy.environment === "production" ? "error" : selectedDeploy.environment === "staging" ? "warning" : "success"}
                />
                <Chip
                  label={selectedDeploy.status === "success" ? "成功" : selectedDeploy.status === "failed" ? "失败" : selectedDeploy.status === "running" ? "部署中" : "等待中"}
                  color={selectedDeploy.status === "success" ? "success" : selectedDeploy.status === "failed" ? "error" : selectedDeploy.status === "running" ? "primary" : "default"}
                />
              </Stack>
              <Stack direction="row" spacing={4} sx={{ mt: 3 }}>
                <Box>
                  <Typography variant="caption" color="text.secondary">
                    应用名称
                  </Typography>
                  <Typography variant="body1" fontWeight="bold">
                    {selectedDeploy.app_name}
                  </Typography>
                </Box>
                <Box>
                  <Typography variant="caption" color="text.secondary">
                    版本
                  </Typography>
                  <Typography variant="body1" fontWeight="bold">
                    {selectedDeploy.version}
                  </Typography>
                </Box>
                <Box>
                  <Typography variant="caption" color="text.secondary">
                    操作人
                  </Typography>
                  <Typography variant="body1" fontWeight="bold">
                    {selectedDeploy.operator}
                  </Typography>
                </Box>
              </Stack>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDetailDialogOpen(false)}>关闭</Button>
        </DialogActions>
      </Dialog>
    </>
  );
};

export default RsDeployPageRefactored;
