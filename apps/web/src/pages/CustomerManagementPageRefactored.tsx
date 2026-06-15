/**
 * CustomerManagementPage 重构示例
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
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Chip,
  useTheme,
} from "@mui/material";
import {
  Plus,
  Edit,
  Trash2,
  Eye,
  Download,
  Upload,
} from "lucide-react";
import {
  crmApi,
  type Customer,
} from "../api/crm";
import { useAppStore } from "../store";
import {
  ListPageTemplate,
  type ColumnDef,
  type RowAction,
} from "../components/templates";
import { PageHeader } from "../components/layout";
import { FilterBar, type FilterConfig } from "../components/mui";

// ============ 列定义 ============
const columns: ColumnDef<Customer>[] = [
  {
    id: "name",
    header: "客户名称",
    accessor: "name",
    sortable: true,
    width: 200,
  },
  {
    id: "code",
    header: "客户代码",
    accessor: "code",
    sortable: true,
    width: 120,
  },
  {
    id: "industry",
    header: "行业",
    accessor: "industry",
  },
  {
    id: "contact",
    header: "联系人",
    accessor: "contact_name",
    render: (value) => value || "-",
  },
  {
    id: "phone",
    header: "联系电话",
    accessor: "phone",
    render: (value) => value || "-",
  },
  {
    id: "status",
    header: "状态",
    accessor: "status",
    render: (value) => (
      <Chip
        label={value === "active" ? "活跃" : "停用"}
        color={value === "active" ? "success" : "default"}
        size="small"
      />
    ),
  },
];

// ============ 行操作 ============
const getRowActions = (
  onView: (customer: Customer) => void,
  onEdit: (customer: Customer) => void,
  onDelete: (customer: Customer) => void,
): RowAction<Customer>[] => [
  {
    label: "查看",
    icon: <Eye style={{ width: 16, height: 16 }} />,
    onClick: onView,
  },
  {
    label: "编辑",
    icon: <Edit style={{ width: 16, height: 16 }} />,
    onClick: onEdit,
  },
  {
    label: "删除",
    icon: <Trash2 style={{ width: 16, height: 16 }} />,
    onClick: onDelete,
    color: "error",
  },
];

// ============ 筛选配置 ============
const filters: FilterConfig[] = [
  {
    id: "search",
    label: "搜索",
    type: "search",
    placeholder: "搜索客户名称/代码...",
  },
  {
    id: "status",
    label: "状态",
    type: "select",
    options: [
      { value: "all", label: "全部" },
      { value: "active", label: "活跃" },
      { value: "inactive", label: "停用" },
    ],
  },
  {
    id: "industry",
    label: "行业",
    type: "select",
    options: [
      { value: "all", label: "全部行业" },
      { value: "IT", label: "IT/互联网" },
      { value: "Finance", label: "金融" },
      { value: "Manufacturing", label: "制造业" },
    ],
  },
];

// ============ 批量操作 ============
const batchActions = [
  {
    label: "批量删除",
    icon: <Trash2 style={{ width: 16, height: 16 }} />,
    color: "error" as const,
  },
  {
    label: "批量导出",
    icon: <Download style={{ width: 16, height: 16 }} />,
  },
];

// ============ 组件 ============
const CustomerManagementPage: React.FC = () => {
  const navigate = useNavigate();
  const theme = useTheme();
  const addNotification = useAppStore((state) => state.addNotification);

  // 数据状态
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<{
    items: Customer[];
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
  const [statusFilter, setStatusFilter] = useState("all");
  const [industryFilter, setIndustryFilter] = useState("all");

  // 模态框状态
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const [showImportExport, setShowImportExport] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);

  // 行选择
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  // 表单数据
  const [formData, setFormData] = useState<Partial<Customer>>({});

  // 获取客户列表
  const fetchCustomers = useCallback(async () => {
    setLoading(true);
    try {
      const params: any = {
        page: data.page,
        page_size: data.page_size,
      };
      if (searchText) params.search = searchText;
      if (statusFilter !== "all") params.status = statusFilter;
      if (industryFilter !== "all") params.industry = industryFilter;

      const response = await crmApi.customers.list(params);
      if (response.success && response.data) {
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
        message: error.message || "获取客户数据失败",
      });
    } finally {
      setLoading(false);
    }
  }, [data.page, data.page_size, searchText, statusFilter, industryFilter, addNotification]);

  // 处理筛选变化
  const handleFilterChange = useCallback(
    (filterId: string, value: any) => {
      if (filterId === "search") setSearchText(value);
      if (filterId === "status") setStatusFilter(value);
      if (filterId === "industry") setIndustryFilter(value);
    },
    [],
  );

  // 处理分页变化
  const handlePageChange = useCallback((page: number) => {
    setData((prev) => ({ ...prev, page }));
  }, []);

  // 处理行选择
  const handleSelectionChange = useCallback((ids: string[]) => {
    setSelectedIds(ids);
  }, []);

  // 处理查看
  const handleView = useCallback((customer: Customer) => {
    setSelectedCustomer(customer);
    setShowViewModal(true);
  }, []);

  // 处理编辑
  const handleEdit = useCallback((customer: Customer) => {
    setSelectedCustomer(customer);
    setFormData(customer);
    setShowEditModal(true);
  }, []);

  // 处理删除
  const handleDelete = useCallback(
    async (customer: Customer) => {
      if (!window.confirm(`确定要删除客户"${customer.name}"吗?`)) return;
      try {
        await crmApi.customers.delete(customer.id);
        addNotification({
          type: "success",
          title: "删除成功",
          message: "客户已删除",
        });
        fetchCustomers();
      } catch (error: any) {
        addNotification({
          type: "error",
          title: "删除失败",
          message: error.message || "无法删除客户",
        });
      }
    },
    [addNotification, fetchCustomers],
  );

  // 初始加载
  React.useEffect(() => {
    fetchCustomers();
  }, [fetchCustomers]);

  return (
    <>
      <PageHeader
        title="客户管理"
        subtitle={`共 ${data.total} 个客户`}
        showBack
        onBack={() => navigate(-1)}
        actions={
          <>
            <Button
              variant="outlined"
              startIcon={<Upload style={{ width: 18, height: 18 }} />}
              onClick={() => setShowImportExport(true)}
            >
              导入
            </Button>
            <Button
              variant="outlined"
              startIcon={<Download style={{ width: 18, height: 18 }} />}
              onClick={() => {
                // TODO: 导出功能
              }}
            >
              导出
            </Button>
            <Button
              variant="contained"
              startIcon={<Plus style={{ width: 18, height: 18 }} />}
              onClick={() => setShowCreateModal(true)}
            >
              新建客户
            </Button>
          </>
        }
      />

      <ListPageTemplate
        columns={columns}
        data={data.items}
        loading={loading}
        rowActions={getRowActions(handleView, handleEdit, handleDelete)}
        filters={filters}
        onFilterChange={handleFilterChange}
        pagination={{
          page: data.page,
          pageSize: data.page_size,
          total: data.total,
          onPageChange: handlePageChange,
        }}
        onRowClick={handleView}
        emptyMessage="暂无客户数据"
        selection={{
          selected: selectedIds,
          onChange: handleSelectionChange,
        }}
        batchActions={batchActions}
      />

      {/* 查看模态框 */}
      <Dialog
        open={showViewModal}
        onClose={() => setShowViewModal(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>客户详情</DialogTitle>
        <DialogContent>
          {selectedCustomer && (
            <Box sx={{ pt: 2, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 2 }}>
              <Box>
                <Box component="span" sx={{ color: "text.secondary", fontSize: "0.875rem" }}>
                  客户名称
                </Box>
                <Box>{selectedCustomer.name}</Box>
              </Box>
              <Box>
                <Box component="span" sx={{ color: "text.secondary", fontSize: "0.875rem" }}>
                  客户代码
                </Box>
                <Box>{selectedCustomer.code}</Box>
              </Box>
              <Box>
                <Box component="span" sx={{ color: "text.secondary", fontSize: "0.875rem" }}>
                  行业
                </Box>
                <Box>{selectedCustomer.industry || "-"}</Box>
              </Box>
              <Box>
                <Box component="span" sx={{ color: "text.secondary", fontSize: "0.875rem" }}>
                  联系电话
                </Box>
                <Box>{selectedCustomer.phone || "-"}</Box>
              </Box>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowViewModal(false)}>关闭</Button>
          <Button
            variant="contained"
            onClick={() => {
              setShowViewModal(false);
              handleEdit(selectedCustomer!);
            }}
          >
            编辑
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
};

export default CustomerManagementPage;
