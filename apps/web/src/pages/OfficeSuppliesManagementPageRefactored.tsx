/**
 * OfficeSuppliesManagementPage 重构后
 *
 * 重构要点：
 * 1. 使用 ListPageTemplate 替代手写的 Card + Table 布局
 * 2. 使用 ColumnDef 定义表格列
 * 3. 使用 FilterBar 定义筛选器
 * 4. 使用 PageHeader 统一页面头部
 * 5. 使用 mock 数据
 * 6. 主题色使用蓝色 (#3b82f6)
 */

import React, { useState, useCallback, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import {
  Box,
  Chip,
  Paper,
  Typography,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
} from "@mui/material";
import {
  Package,
  Plus,
  Eye,
  Edit,
  Trash2,
  DollarSign,
  MapPin,
  AlertTriangle,
  RefreshCw,
} from "lucide-react";
import { useAppStore } from "../store";
import {
  ListPageTemplate,
  StatCardGroup,
  type ColumnDef,
  type RowAction,
} from "../components/mui";
import { FilterBar, type FilterConfig } from "../components/mui/FilterBar";
import { PageHeader } from "../components/layout";

// ============ 类型定义 ============
interface OfficeSupply {
  id: string;
  supply_number: string;
  name: string;
  category: string;
  specification: string;
  unit: string;
  stock: number;
  min_stock: number;
  price: number;
  location: string;
  status: "normal" | "low_stock" | "out_of_stock";
}

interface PaginatedResult<T> {
  items: T[];
  total: number;
  page: number;
  page_size: number;
}

// ============ Mock 数据 ============
const mockSupplies: OfficeSupply[] = [
  { id: "1", supply_number: "YP-2024-001", name: "A4打印纸", category: "文具", specification: "70g/500张/箱", unit: "箱", stock: 50, min_stock: 20, price: 35, location: "行政仓库", status: "normal" },
  { id: "2", supply_number: "YP-2024-002", name: "黑色墨盒", category: "耗材", specification: "HP 12A", unit: "个", stock: 8, min_stock: 10, price: 280, location: "IT仓库", status: "low_stock" },
  { id: "3", supply_number: "YP-2024-003", name: "中性笔", category: "文具", specification: "0.5mm/黑色", unit: "支", stock: 100, min_stock: 50, price: 2, location: "前台", status: "normal" },
  { id: "4", supply_number: "YP-2024-004", name: "订书机", category: "文具", specification: "得力No.003", unit: "个", stock: 25, min_stock: 10, price: 15, location: "前台", status: "normal" },
  { id: "5", supply_number: "YP-2024-005", name: "笔记本", category: "文具", specification: "A5/横线", unit: "本", stock: 5, min_stock: 20, price: 8, location: "前台", status: "low_stock" },
  { id: "6", supply_number: "YP-2024-006", name: "彩色墨盒", category: "耗材", specification: "EPSON T664", unit: "套", stock: 0, min_stock: 5, price: 180, location: "IT仓库", status: "out_of_stock" },
  { id: "7", supply_number: "YP-2024-007", name: "回形针", category: "文具", specification: "标准型", unit: "盒", stock: 30, min_stock: 10, price: 3, location: "前台", status: "normal" },
  { id: "8", supply_number: "YP-2024-008", name: "文件夹", category: "文具", specification: "A4/塑料", unit: "个", stock: 45, min_stock: 20, price: 5, location: "前台", status: "normal" },
];

// ============ 列定义 ============
const getColumns = (
  getStatusBadge: (status: string) => React.ReactNode,
): ColumnDef<OfficeSupply>[] => [
  {
    id: "supply_number",
    header: "用品编号",
    accessor: "supply_number",
    minWidth: 120,
    render: (row: OfficeSupply) => (
      <Typography variant="body2" sx={{ fontWeight: 500 }}>
        {row.supply_number}
      </Typography>
    ),
  },
  {
    id: "name",
    header: "用品名称",
    accessor: "name",
    minWidth: 150,
    render: (row: OfficeSupply) => (
      <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
        <Package sx={{ width: 16, height: 16, color: "text.secondary" }} />
        <Typography variant="body2">{row.name}</Typography>
      </Box>
    ),
  },
  {
    id: "category",
    header: "类别",
    accessor: "category",
    minWidth: 100,
    render: (row: OfficeSupply) => (
      <Chip label={row.category} size="small" variant="outlined" />
    ),
  },
  {
    id: "specification",
    header: "规格",
    accessor: "specification",
    minWidth: 120,
    render: (row: OfficeSupply) => (
      <Typography variant="body2" sx={{ color: "text.secondary" }}>
        {row.specification}
      </Typography>
    ),
  },
  {
    id: "unit",
    header: "单位",
    accessor: "unit",
    width: 60,
    render: (row: OfficeSupply) => (
      <Typography variant="body2">{row.unit}</Typography>
    ),
  },
  {
    id: "stock",
    header: "库存",
    accessor: "stock",
    minWidth: 80,
    render: (row: OfficeSupply) => (
      <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
        <Typography variant="body2" sx={{ fontWeight: 500, color: row.status === "normal" ? "text.primary" : "error.main" }}>
          {row.stock}
        </Typography>
        {row.status !== "normal" && (
          <AlertTriangle style={{ width: 14, height: 14, color: row.status === "out_of_stock" ? "error.main" : "warning.main" }} />
        )}
      </Box>
    ),
  },
  {
    id: "price",
    header: "单价",
    accessor: "price",
    minWidth: 80,
    render: (row: OfficeSupply) => (
      <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
        <DollarSign sx={{ width: 14, height: 14, color: "success.main" }} />
        <Typography variant="body2">¥{row.price.toFixed(2)}</Typography>
      </Box>
    ),
  },
  {
    id: "location",
    header: "存放位置",
    accessor: "location",
    minWidth: 100,
    render: (row: OfficeSupply) => (
      <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
        <MapPin sx={{ width: 14, height: 14, color: "text.secondary" }} />
        <Typography variant="body2" sx={{ color: "text.secondary" }}>
          {row.location}
        </Typography>
      </Box>
    ),
  },
  {
    id: "status",
    header: "状态",
    accessor: "status",
    width: 100,
    render: (row: OfficeSupply) => getStatusBadge(row.status),
  },
];

// ============ 行操作 ============
const getRowActions = (
  onView: (supply: OfficeSupply) => void,
  onEdit: (supply: OfficeSupply) => void,
  onDelete: (supply: OfficeSupply) => void,
): RowAction<OfficeSupply>[] => [
  {
    label: "查看详情",
    icon: <Eye style={{ width: 16, height: 16 }} />,
    onClick: onView,
  },
  {
    label: "编辑",
    icon: <Edit style={{ width: 16, height: 16 }} />,
    onClick: onEdit,
    color: "primary",
  },
  {
    label: "删除",
    icon: <Trash2 style={{ width: 16, height: 16 }} />,
    onClick: (row) => onDelete(row),
    color: "error",
    divider: true,
  },
];

// ============ 筛选配置 ============
const getFilters = (): FilterConfig[] => [
  {
    id: "search",
    label: "搜索",
    type: "text",
    placeholder: "搜索用品名称、编号...",
    width: 250,
  },
  {
    id: "category",
    label: "用品类别",
    type: "select",
    options: [
      { label: "全部类别", value: "all" },
      { label: "文具", value: "文具" },
      { label: "耗材", value: "耗材" },
      { label: "办公用品", value: "办公用品" },
    ],
  },
  {
    id: "status",
    label: "状态",
    type: "select",
    options: [
      { label: "全部状态", value: "all" },
      { label: "正常", value: "normal" },
      { label: "库存不足", value: "low_stock" },
      { label: "缺货", value: "out_of_stock" },
    ],
  },
];

// ============ 组件 ============
const OfficeSuppliesManagementPageRefactored: React.FC = () => {
  const navigate = useNavigate();
  const addNotification = useAppStore((state) => state.addNotification);

  // 数据状态
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<PaginatedResult<OfficeSupply>>({
    items: mockSupplies,
    total: mockSupplies.length,
    page: 1,
    page_size: 10,
  });

  // 筛选状态
  const [searchText, setSearchText] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");

  // 模态框状态
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const [selectedSupply, setSelectedSupply] = useState<OfficeSupply | null>(null);

  // 表单数据
  const [formData, setFormData] = useState<Partial<OfficeSupply>>({});

  // 状态徽章
  const getStatusBadge = useCallback((status: string) => {
    const colors: Record<string, "success" | "warning" | "error"> = {
      normal: "success",
      low_stock: "warning",
      out_of_stock: "error",
    };
    const labels: Record<string, string> = {
      normal: "正常",
      low_stock: "库存不足",
      out_of_stock: "缺货",
    };
    return (
      <Chip
        size="small"
        color={colors[status] || "default"}
        label={labels[status] || status}
        variant="outlined"
      />
    );
  }, []);

  // 搜索处理
  const handleSearch = useCallback(() => {
    let filtered = [...mockSupplies];
    if (searchText) {
      filtered = filtered.filter(
        (s) =>
          s.name.includes(searchText) ||
          s.supply_number.includes(searchText)
      );
    }
    if (categoryFilter && categoryFilter !== "all") {
      filtered = filtered.filter((s) => s.category === categoryFilter);
    }
    if (statusFilter && statusFilter !== "all") {
      filtered = filtered.filter((s) => s.status === statusFilter);
    }
    setData({
      items: filtered,
      total: filtered.length,
      page: 1,
      page_size: 10,
    });
  }, [searchText, categoryFilter, statusFilter]);

  // 重置筛选
  const handleReset = useCallback(() => {
    setSearchText("");
    setCategoryFilter("all");
    setStatusFilter("all");
    setData({
      items: mockSupplies,
      total: mockSupplies.length,
      page: 1,
      page_size: 10,
    });
  }, []);

  // 新增
  const handleAdd = useCallback(() => {
    setSelectedSupply(null);
    setFormData({
      supply_number: "",
      name: "",
      category: "",
      specification: "",
      unit: "",
      stock: 0,
      min_stock: 0,
      price: 0,
      location: "",
      status: "normal",
    });
    setShowCreateModal(true);
  }, []);

  // 编辑
  const handleEdit = useCallback((record: OfficeSupply) => {
    setSelectedSupply(record);
    setFormData(record);
    setShowEditModal(true);
  }, []);

  // 查看
  const handleView = useCallback((record: OfficeSupply) => {
    setSelectedSupply(record);
    setShowViewModal(true);
  }, []);

  // 删除
  const handleDelete = useCallback(
    async (supply: OfficeSupply) => {
      if (!confirm(`确定要删除用品"${supply.name}"吗？`)) return;
      addNotification({
        title: "成功",
        message: "用品删除成功",
        type: "success",
      });
      handleSearch();
    },
    [addNotification, handleSearch],
  );

  // 创建
  const handleCreate = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      addNotification({
        title: "成功",
        message: "用品创建成功",
        type: "success",
      });
      setShowCreateModal(false);
      handleSearch();
    },
    [addNotification, handleSearch],
  );

  // 更新
  const handleUpdate = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      addNotification({
        title: "成功",
        message: "用品更新成功",
        type: "success",
      });
      setShowEditModal(false);
      handleSearch();
    },
    [addNotification, handleSearch],
  );

  // 输入变化
  const handleInputChange = useCallback((field: string, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  }, []);

  // 统计卡片数据
  const supplyStats = useMemo(() => {
    const allSupplies = data.items;
    return {
      total: allSupplies.length,
      normal: allSupplies.filter((s) => s.status === "normal").length,
      lowStock: allSupplies.filter((s) => s.status === "low_stock").length,
      outOfStock: allSupplies.filter((s) => s.status === "out_of_stock").length,
    };
  }, [data.items]);

  // 统计卡片
  const statCards = useMemo(
    () => [
      {
        id: "total",
        title: "用品总数",
        value: supplyStats.total,
        icon: <Package style={{ width: 24, height: 24 }} />,
        color: "primary" as const,
      },
      {
        id: "normal",
        title: "库存正常",
        value: supplyStats.normal,
        icon: <Package style={{ width: 24, height: 24 }} />,
        color: "success" as const,
      },
      {
        id: "low_stock",
        title: "库存不足",
        value: supplyStats.lowStock,
        icon: <AlertTriangle style={{ width: 24, height: 24 }} />,
        color: "warning" as const,
      },
      {
        id: "out_of_stock",
        title: "缺货",
        value: supplyStats.outOfStock,
        icon: <AlertTriangle style={{ width: 24, height: 24 }} />,
        color: "error" as const,
      },
    ],
    [supplyStats],
  );

  const columns = useMemo(() => getColumns(getStatusBadge), [getStatusBadge]);
  const rowActions = useMemo(() => getRowActions(handleView, handleEdit, handleDelete), [handleView, handleEdit, handleDelete]);
  const filterConfigs = useMemo(() => getFilters(), []);

  // 筛选变化处理
  const handleFilterChange = useCallback(
    (filters: Record<string, any>) => {
      if (filters.search !== undefined) setSearchText(filters.search);
      if (filters.category !== undefined) setCategoryFilter(filters.category);
      if (filters.status !== undefined) setStatusFilter(filters.status);
    },
    [],
  );

  return (
    <Box sx={{ p: { xs: 2, md: 3 } }}>
      <PageHeader
        title="办公用品管理"
        subtitle={`共 ${data.total} 种用品`}
        showBack
        onBack={() => navigate(-1)}
        createButton={{
          label: "新增用品",
          onClick: handleAdd,
        }}
      />

      {/* 统计概览 */}
      <Paper sx={{ mb: 3, p: 3, borderRadius: 2 }}>
        <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 2 }}>
          库存概览
        </Typography>
        <StatCardGroup stats={statCards} columns={4} />
      </Paper>

      {/* 筛选栏 */}
      <FilterBar
        filters={filterConfigs}
        onFilterChange={handleFilterChange}
        onReset={handleReset}
        onSearch={handleSearch}
      />

      {/* 列表 */}
      <Paper sx={{ borderRadius: 2 }}>
        <ListPageTemplate
          title="办公用品列表"
          columns={columns}
          data={data.items}
          loading={loading}
          pagination={{
            page: data.page - 1,
            pageSize: data.page_size,
            total: data.total,
            onPageChange: (page) => setData((prev) => ({ ...prev, page: page + 1 })),
            onPageSizeChange: (pageSize) => setData((prev) => ({ ...prev, page_size: pageSize })),
          }}
          rowActions={rowActions}
          onRowClick={handleView}
          emptyMessage="暂无用品数据"
        />
      </Paper>

      {/* 新增/编辑模态框 */}
      <SupplyFormDialog
        open={showCreateModal || showEditModal}
        onClose={() => {
          setShowCreateModal(false);
          setShowEditModal(false);
        }}
        mode={showCreateModal ? "create" : "edit"}
        formData={formData}
        onChange={handleInputChange}
        onSubmit={showCreateModal ? handleCreate : handleUpdate}
      />

      {/* 查看详情模态框 */}
      <Dialog open={showViewModal} onClose={() => setShowViewModal(false)} maxWidth="sm" fullWidth>
        <DialogTitle>用品详情</DialogTitle>
        <DialogContent>
          {selectedSupply && (
            <Box sx={{ display: "grid", gridTemplateColumns: 2, gap: 2, pt: 1 }}>
              <Box>
                <Typography variant="caption" color="text.secondary">用品编号</Typography>
                <Typography variant="body2" sx={{ fontWeight: 500 }}>{selectedSupply.supply_number}</Typography>
              </Box>
              <Box>
                <Typography variant="caption" color="text.secondary">用品名称</Typography>
                <Typography variant="body2" sx={{ fontWeight: 500 }}>{selectedSupply.name}</Typography>
              </Box>
              <Box>
                <Typography variant="caption" color="text.secondary">类别</Typography>
                <Typography variant="body2">{selectedSupply.category}</Typography>
              </Box>
              <Box>
                <Typography variant="caption" color="text.secondary">规格</Typography>
                <Typography variant="body2">{selectedSupply.specification}</Typography>
              </Box>
              <Box>
                <Typography variant="caption" color="text.secondary">单位</Typography>
                <Typography variant="body2">{selectedSupply.unit}</Typography>
              </Box>
              <Box>
                <Typography variant="caption" color="text.secondary">库存</Typography>
                <Typography variant="body2" sx={{ fontWeight: 500, color: selectedSupply.status === "normal" ? "text.primary" : "error.main" }}>
                  {selectedSupply.stock} {selectedSupply.unit}
                </Typography>
              </Box>
              <Box>
                <Typography variant="caption" color="text.secondary">最低库存</Typography>
                <Typography variant="body2">{selectedSupply.min_stock} {selectedSupply.unit}</Typography>
              </Box>
              <Box>
                <Typography variant="caption" color="text.secondary">单价</Typography>
                <Typography variant="body2">¥{selectedSupply.price.toFixed(2)}</Typography>
              </Box>
              <Box>
                <Typography variant="caption" color="text.secondary">存放位置</Typography>
                <Typography variant="body2">{selectedSupply.location}</Typography>
              </Box>
              <Box>
                <Typography variant="caption" color="text.secondary">状态</Typography>
                <Box sx={{ mt: 0.5 }}>{getStatusBadge(selectedSupply.status)}</Box>
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
              handleEdit(selectedSupply!);
            }}
            sx={{ bgcolor: "primary.main" }}
          >
            编辑
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

// ============ 用品表单模态框 ============
interface SupplyFormDialogProps {
  open: boolean;
  onClose: () => void;
  mode: "create" | "edit";
  formData: Partial<OfficeSupply>;
  onChange: (field: string, value: any) => void;
  onSubmit: (e: React.FormEvent) => void;
}

const SupplyFormDialog: React.FC<SupplyFormDialogProps> = ({
  open,
  onClose,
  mode,
  formData,
  onChange,
  onSubmit,
}) => (
  <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
    <DialogTitle>{mode === "create" ? "新增用品" : "编辑用品"}</DialogTitle>
    <DialogContent>
      <Box component="form" onSubmit={onSubmit} sx={{ display: "grid", gap: 2, pt: 1 }}>
        <Box sx={{ display: "grid", gridTemplateColumns: 2, gap: 2 }}>
          <TextField
            label="用品编号 *"
            size="small"
            value={formData.supply_number || ""}
            onChange={(e) => onChange("supply_number", e.target.value)}
            required
          />
          <TextField
            label="用品名称 *"
            size="small"
            value={formData.name || ""}
            onChange={(e) => onChange("name", e.target.value)}
            required
          />
        </Box>

        <Box sx={{ display: "grid", gridTemplateColumns: 3, gap: 2 }}>
          <FormControl size="small" fullWidth>
            <InputLabel>类别</InputLabel>
            <Select
              value={formData.category || ""}
              label="类别"
              onChange={(e) => onChange("category", e.target.value)}
            >
              <MenuItem value="文具">文具</MenuItem>
              <MenuItem value="耗材">耗材</MenuItem>
              <MenuItem value="办公用品">办公用品</MenuItem>
            </Select>
          </FormControl>
          <TextField
            label="规格"
            size="small"
            value={formData.specification || ""}
            onChange={(e) => onChange("specification", e.target.value)}
          />
          <TextField
            label="单位"
            size="small"
            value={formData.unit || ""}
            onChange={(e) => onChange("unit", e.target.value)}
          />
        </Box>

        <Box sx={{ display: "grid", gridTemplateColumns: 3, gap: 2 }}>
          <TextField
            label="库存"
            type="number"
            size="small"
            value={formData.stock || ""}
            onChange={(e) => onChange("stock", Number(e.target.value))}
          />
          <TextField
            label="最低库存"
            type="number"
            size="small"
            value={formData.min_stock || ""}
            onChange={(e) => onChange("min_stock", Number(e.target.value))}
          />
          <TextField
            label="单价"
            type="number"
            size="small"
            value={formData.price || ""}
            onChange={(e) => onChange("price", Number(e.target.value))}
          />
        </Box>

        <Box sx={{ display: "grid", gridTemplateColumns: 2, gap: 2 }}>
          <TextField
            label="存放位置"
            size="small"
            value={formData.location || ""}
            onChange={(e) => onChange("location", e.target.value)}
          />
          <FormControl size="small" fullWidth>
            <InputLabel>状态</InputLabel>
            <Select
              value={formData.status || "normal"}
              label="状态"
              onChange={(e) => onChange("status", e.target.value)}
            >
              <MenuItem value="normal">正常</MenuItem>
              <MenuItem value="low_stock">库存不足</MenuItem>
              <MenuItem value="out_of_stock">缺货</MenuItem>
            </Select>
          </FormControl>
        </Box>

        <DialogActions sx={{ p: 0, pt: 2, justifyContent: "flex-end" }}>
          <Button onClick={onClose} variant="outlined">取消</Button>
          <Button type="submit" variant="contained" sx={{ bgcolor: "primary.main" }}>
            {mode === "create" ? "创建" : "保存"}
          </Button>
        </DialogActions>
      </Box>
    </DialogContent>
  </Dialog>
);

export default OfficeSuppliesManagementPageRefactored;
