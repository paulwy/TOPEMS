/**
 * PmContractListPage 重构示例
 *
 * 重构要点：
 * 1. 使用 ListPageTemplate 替代手写的 Card + Table 布局
 * 2. 使用 ColumnDef 定义表格列
 * 3. 使用 FilterBar 定义筛选器
 * 4. 使用 PageHeader 统一页面头部
 */

import React, { useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import {
  Box,
  Button,
  Chip,
  useTheme,
} from "@mui/material";
import {
  Plus,
  Eye,
  Download,
} from "lucide-react";
import {
  contractApi,
  type Contract,
} from "../api/pm";
import { useAppStore } from "../store";
import {
  ListPageTemplate,
  type ColumnDef,
  type RowAction,
} from "../components/templates";
import { PageHeader } from "../components/layout";
import { FilterBar, type FilterConfig } from "../components/mui";

// ============ 列定义 ============
const columns: ColumnDef<Contract>[] = [
  {
    id: "name",
    header: "合同名称",
    accessor: "name",
    sortable: true,
    width: 250,
  },
  {
    id: "code",
    header: "合同编号",
    accessor: "code",
    sortable: true,
    width: 150,
  },
  {
    id: "type",
    header: "合同类型",
    accessor: "type",
    render: (value) => {
      const typeMap: Record<string, string> = {
        project: "项目合同",
        purchase: "采购合同",
        service: "服务合同",
        labor: "劳务合同",
      };
      return typeMap[value] || value;
    },
  },
  {
    id: "amount",
    header: "合同金额",
    accessor: "amount",
    render: (value) => value ? `¥${Number(value).toLocaleString()}` : "-",
  },
  {
    id: "status",
    header: "状态",
    accessor: "status",
    render: (value) => {
      const statusMap: Record<string, { label: string; color: "success" | "warning" | "error" | "info" | "default" }> = {
        draft: { label: "草稿", color: "default" },
        pending: { label: "待审批", color: "info" },
        approved: { label: "已审批", color: "success" },
        signed: { label: "已签订", color: "warning" },
        terminated: { label: "已终止", color: "error" },
      };
      const status = statusMap[value] || { label: value, color: "default" as const };
      return <Chip label={status.label} color={status.color} size="small" />;
    },
  },
  {
    id: "sign_date",
    header: "签订日期",
    accessor: "sign_date",
    render: (value) => value || "-",
  },
  {
    id: "expire_date",
    header: "到期日期",
    accessor: "expire_date",
    render: (value) => {
      if (!value) return "-";
      const now = new Date();
      const expire = new Date(value);
      const days = Math.ceil((expire.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
      if (days < 0) {
        return <Chip label="已过期" color="error" size="small" />;
      }
      if (days <= 30) {
        return <Chip label={`${days}天后到期`} color="warning" size="small" />;
      }
      return value;
    },
  },
];

// ============ 行操作 ============
const getRowActions = (
  onView: (contract: Contract) => void,
): RowAction<Contract>[] => [
  {
    label: "查看",
    icon: <Eye style={{ width: 16, height: 16 }} />,
    onClick: onView,
  },
];

// ============ 筛选配置 ============
const filters: FilterConfig[] = [
  {
    id: "search",
    label: "搜索",
    type: "search",
    placeholder: "搜索合同名称/编号...",
  },
  {
    id: "type",
    label: "类型",
    type: "select",
    options: [
      { value: "all", label: "全部类型" },
      { value: "project", label: "项目合同" },
      { value: "purchase", label: "采购合同" },
      { value: "service", label: "服务合同" },
      { value: "labor", label: "劳务合同" },
    ],
  },
  {
    id: "status",
    label: "状态",
    type: "select",
    options: [
      { value: "all", label: "全部状态" },
      { value: "draft", label: "草稿" },
      { value: "pending", label: "待审批" },
      { value: "approved", label: "已审批" },
      { value: "signed", label: "已签订" },
      { value: "terminated", label: "已终止" },
    ],
  },
];

// ============ 组件 ============
const PmContractListPage: React.FC = () => {
  const navigate = useNavigate();
  const theme = useTheme();
  const addNotification = useAppStore((state) => state.addNotification);

  // 数据状态
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<{
    items: Contract[];
    total: number;
    page: number;
    page_size: number;
  }>({
    items: [],
    total: 0,
    page: 1,
    page_size: 10,
  });

  // 筛选状态
  const [searchText, setSearchText] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");

  // 处理筛选变化
  const handleFilterChange = useCallback(
    (filterId: string, value: any) => {
      if (filterId === "search") setSearchText(value);
      if (filterId === "type") setTypeFilter(value);
      if (filterId === "status") setStatusFilter(value);
    },
    [],
  );

  // 处理分页变化
  const handlePageChange = useCallback((page: number) => {
    setData((prev) => ({ ...prev, page }));
  }, []);

  // 处理查看
  const handleView = useCallback((contract: Contract) => {
    navigate(`/pm/contract/${contract.id}`);
  }, [navigate]);

  // 获取合同列表
  const fetchContracts = useCallback(async () => {
    setLoading(true);
    try {
      const params: any = {
        page: data.page,
        page_size: data.page_size,
      };
      if (searchText) params.search = searchText;
      if (typeFilter !== "all") params.type = typeFilter;
      if (statusFilter !== "all") params.status = statusFilter;

      const response = await contractApi.list(params);
      if (response.code === 200 && response.data) {
        setData({
          items: response.data.items || [],
          total: response.data.total || 0,
          page: response.data.page || 1,
          page_size: response.data.page_size || 10,
        });
      }
    } catch (error: any) {
      addNotification({
        type: "error",
        title: "加载失败",
        message: error.message || "获取合同数据失败",
      });
    } finally {
      setLoading(false);
    }
  }, [data.page, data.page_size, searchText, typeFilter, statusFilter, addNotification]);

  // 初始加载
  React.useEffect(() => {
    fetchContracts();
  }, [fetchContracts]);

  return (
    <>
      <PageHeader
        title="合同管理"
        subtitle={`共 ${data.total} 份合同`}
        showBack
        onBack={() => navigate(-1)}
        actions={
          <>
            <Button
              variant="outlined"
              startIcon={<Download style={{ width: 18, height: 18 }} />}
            >
              导出
            </Button>
            <Button
              variant="contained"
              startIcon={<Plus style={{ width: 18, height: 18 }} />}
              onClick={() => navigate("/pm/contract/create")}
            >
              新建合同
            </Button>
          </>
        }
      />

      <ListPageTemplate
        columns={columns}
        data={data.items}
        loading={loading}
        rowActions={getRowActions(handleView)}
        filters={filters}
        onFilterChange={handleFilterChange}
        pagination={{
          page: data.page,
          pageSize: data.page_size,
          total: data.total,
          onPageChange: handlePageChange,
        }}
        onRowClick={handleView}
        emptyMessage="暂无合同数据"
      />
    </>
  );
};

export default PmContractListPage;
