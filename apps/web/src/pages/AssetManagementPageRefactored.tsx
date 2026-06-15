/**
 * AssetManagementPage 重构后
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
  IconButton,
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
  useTheme,
} from "@mui/material";
import {
  Package,
  Plus,
  Eye,
  Edit,
  Trash2,
  DollarSign,
  User,
  Settings,
  RefreshCw,
  ArrowLeft,
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
interface Asset {
  id: string;
  asset_number: string;
  name: string;
  category: string;
  brand: string;
  model: string;
  purchase_date: string;
  purchase_amount: number;
  location: string;
  responsible_id: string;
  status: "idle" | "in_use" | "maintenance" | "scrapped";
  serial_number?: string;
  manufacturer?: string;
  department?: string;
}

interface PaginatedResult<T> {
  items: T[];
  total: number;
  page: number;
  page_size: number;
}

// ============ Mock 数据 ============
const mockAssets: Asset[] = [
  { id: "1", asset_number: "ZC-2024-001", name: "联想ThinkPad X1笔记本", category: "电子产品", brand: "联想", model: "X1 Carbon", purchase_date: "2024-01-15", purchase_amount: 12000, location: "IT部", responsible_id: "1", status: "in_use", department: "IT部" },
  { id: "2", asset_number: "ZC-2024-002", name: "戴尔UltraSharp显示器", category: "电子产品", brand: "戴尔", model: "U2720Q", purchase_date: "2024-01-14", purchase_amount: 4500, location: "IT部", responsible_id: "1", status: "in_use", department: "IT部" },
  { id: "3", asset_number: "ZC-2024-003", name: "华为MateBook 14", category: "电子产品", brand: "华为", model: "MateBook 14", purchase_date: "2024-01-13", purchase_amount: 6500, location: "市场部", responsible_id: "2", status: "idle", department: "市场部" },
  { id: "4", asset_number: "ZC-2024-004", name: "iPhone 15 Pro手机", category: "电子产品", brand: "苹果", model: "iPhone 15 Pro", purchase_date: "2024-01-12", purchase_amount: 8999, location: "销售部", responsible_id: "3", status: "maintenance", department: "销售部" },
  { id: "5", asset_number: "ZC-2024-005", name: "罗技MX Master 3鼠标", category: "配件", brand: "罗技", model: "MX Master 3", purchase_date: "2024-01-11", purchase_amount: 699, location: "IT部", responsible_id: "1", status: "in_use", department: "IT部" },
  { id: "6", asset_number: "ZC-2024-006", name: "索尼WH-1000XM4耳机", category: "配件", brand: "索尼", model: "WH-1000XM4", purchase_date: "2024-01-10", purchase_amount: 2299, location: "财务部", responsible_id: "4", status: "in_use", department: "财务部" },
  { id: "7", asset_number: "ZC-2024-007", name: "戴尔Precision 7560工作站", category: "电子产品", brand: "戴尔", model: "Precision 7560", purchase_date: "2024-01-09", purchase_amount: 25000, location: "研发部", responsible_id: "5", status: "in_use", department: "研发部" },
  { id: "8", asset_number: "ZC-2024-008", name: "惠普LaserJet Pro打印机", category: "办公设备", brand: "惠普", model: "LaserJet Pro", purchase_date: "2024-01-08", purchase_amount: 3200, location: "行政部", responsible_id: "6", status: "scrapped", department: "行政部" },
];

const mockDepartments = [
  { id: "IT部", name: "IT部" },
  { id: "市场部", name: "市场部" },
  { id: "销售部", name: "销售部" },
  { id: "财务部", name: "财务部" },
  { id: "研发部", name: "研发部" },
  { id: "行政部", name: "行政部" },
];

const mockEmployees = [
  { id: "1", name: "张三" },
  { id: "2", name: "李四" },
  { id: "3", name: "王五" },
  { id: "4", name: "赵六" },
  { id: "5", name: "钱七" },
  { id: "6", name: "孙八" },
];

// ============ 列定义 ============
const getColumns = (
  getStatusBadge: (status: string) => JSX.Element,
  getEmployeeName: (id: string) => string,
): ColumnDef<Asset>[] => [
  {
    id: "asset_number",
    header: "资产编号",
    accessor: "asset_number",
    minWidth: 140,
    render: (row: Asset) => (
      <Typography variant="body2" sx={{ fontWeight: 500, color: "text.primary" }}>
        {row.asset_number}
      </Typography>
    ),
  },
  {
    id: "name",
    header: "资产名称",
    accessor: "name",
    minWidth: 180,
    render: (row: Asset) => (
      <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
        <Package sx={{ width: 16, height: 16, color: "text.secondary" }} />
        <Typography variant="body2">{row.name}</Typography>
      </Box>
    ),
  },
  {
    id: "category",
    header: "资产类别",
    accessor: "category",
    minWidth: 100,
    render: (row: Asset) => (
      <Typography variant="body2" sx={{ color: "text.secondary" }}>
        {row.category || "-"}
      </Typography>
    ),
  },
  {
    id: "department",
    header: "使用部门",
    accessor: "department",
    minWidth: 100,
    render: (row: Asset) => (
      <Typography variant="body2" sx={{ color: "text.secondary" }}>
        {row.department || "-"}
      </Typography>
    ),
  },
  {
    id: "responsible_id",
    header: "使用人",
    accessor: "responsible_id",
    minWidth: 100,
    render: (row: Asset) => (
      <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
        <User sx={{ width: 14, height: 14, color: "text.secondary" }} />
        <Typography variant="body2">{getEmployeeName(row.responsible_id)}</Typography>
      </Box>
    ),
  },
  {
    id: "purchase_amount",
    header: "采购金额",
    accessor: "purchase_amount",
    minWidth: 120,
    render: (row: Asset) => (
      <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
        <DollarSign sx={{ width: 14, height: 14, color: "success.main" }} />
        <Typography variant="body2">
          {row.purchase_amount ? `¥${row.purchase_amount.toLocaleString()}` : "-"}
        </Typography>
      </Box>
    ),
  },
  {
    id: "status",
    header: "状态",
    accessor: "status",
    width: 100,
    render: (row: Asset) => getStatusBadge(row.status),
  },
];

// ============ 行操作 ============
const getRowActions = (
  onView: (asset: Asset) => void,
  onEdit: (asset: Asset) => void,
  onDelete: (asset: Asset) => void,
): RowAction<Asset>[] => [
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
    placeholder: "搜索资产名称、编号...",
    width: 250,
  },
  {
    id: "category",
    label: "资产类别",
    type: "select",
    options: [
      { label: "全部类别", value: "all" },
      { label: "电子产品", value: "电子产品" },
      { label: "办公设备", value: "办公设备" },
      { label: "配件", value: "配件" },
    ],
  },
  {
    id: "department",
    label: "使用部门",
    type: "select",
    options: [
      { label: "全部部门", value: "all" },
      ...mockDepartments.map((d) => ({ label: d.name, value: d.name })),
    ],
  },
  {
    id: "status",
    label: "状态",
    type: "select",
    options: [
      { label: "全部状态", value: "all" },
      { label: "使用中", value: "in_use" },
      { label: "闲置", value: "idle" },
      { label: "维护中", value: "maintenance" },
      { label: "报废", value: "scrapped" },
    ],
  },
];

// ============ 组件 ============
const AssetManagementPageRefactored: React.FC = () => {
  const navigate = useNavigate();
  const theme = useTheme();
  const addNotification = useAppStore((state) => state.addNotification);

  // 数据状态
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<PaginatedResult<Asset>>({
    items: mockAssets,
    total: mockAssets.length,
    page: 1,
    page_size: 10,
  });

  // 筛选状态
  const [searchText, setSearchText] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [departmentFilter, setDepartmentFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");

  // 模态框状态
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const [selectedAsset, setSelectedAsset] = useState<Asset | null>(null);

  // 表单数据
  const [formData, setFormData] = useState<Partial<Asset>>({});

  // 状态徽章
  const getStatusBadge = useCallback((status: string) => {
    const colors: Record<string, "success" | "info" | "warning" | "error"> = {
      in_use: "success",
      idle: "info",
      maintenance: "warning",
      scrapped: "error",
    };
    const labels: Record<string, string> = {
      in_use: "使用中",
      idle: "闲置",
      maintenance: "维护中",
      scrapped: "报废",
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

  // 获取员工姓名
  const getEmployeeName = useCallback((id: string) => {
    const emp = mockEmployees.find((e) => e.id === id);
    return emp ? emp.name : "-";
  }, []);

  // 模拟加载数据
  const fetchAssets = useCallback(async () => {
    setLoading(true);
    await new Promise((resolve) => setTimeout(resolve, 500));
    
    let filtered = [...mockAssets];
    if (searchText) {
      filtered = filtered.filter(
        (a) =>
          a.name.includes(searchText) ||
          a.asset_number.includes(searchText)
      );
    }
    if (categoryFilter && categoryFilter !== "all") {
      filtered = filtered.filter((a) => a.category === categoryFilter);
    }
    if (departmentFilter && departmentFilter !== "all") {
      filtered = filtered.filter((a) => a.department === departmentFilter);
    }
    if (statusFilter && statusFilter !== "all") {
      filtered = filtered.filter((a) => a.status === statusFilter);
    }
    
    setData({
      items: filtered,
      total: filtered.length,
      page: 1,
      page_size: 10,
    });
    setLoading(false);
  }, [searchText, categoryFilter, departmentFilter, statusFilter]);

  // 搜索处理
  const handleSearch = useCallback(() => {
    fetchAssets();
  }, [fetchAssets]);

  // 重置筛选
  const handleReset = useCallback(() => {
    setSearchText("");
    setCategoryFilter("all");
    setDepartmentFilter("all");
    setStatusFilter("all");
    setData({
      items: mockAssets,
      total: mockAssets.length,
      page: 1,
      page_size: 10,
    });
  }, []);

  // 新增
  const handleAdd = useCallback(() => {
    setSelectedAsset(null);
    setFormData({
      asset_number: "",
      name: "",
      category: "",
      brand: "",
      model: "",
      purchase_date: "",
      purchase_amount: 0,
      location: "",
      responsible_id: "",
      status: "idle",
      department: "",
    });
    setShowCreateModal(true);
  }, []);

  // 编辑
  const handleEdit = useCallback((record: Asset) => {
    setSelectedAsset(record);
    setFormData(record);
    setShowEditModal(true);
  }, []);

  // 查看
  const handleView = useCallback((record: Asset) => {
    setSelectedAsset(record);
    setShowViewModal(true);
  }, []);

  // 删除
  const handleDelete = useCallback(
    async (asset: Asset) => {
      if (!confirm(`确定要删除资产"${asset.name}"吗？`)) return;
      addNotification({
        title: "成功",
        message: "资产删除成功",
        type: "success",
      });
      fetchAssets();
    },
    [addNotification, fetchAssets],
  );

  // 创建
  const handleCreate = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      addNotification({
        title: "成功",
        message: "资产创建成功",
        type: "success",
      });
      setShowCreateModal(false);
      fetchAssets();
    },
    [addNotification, fetchAssets],
  );

  // 更新
  const handleUpdate = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      if (!selectedAsset) return;
      addNotification({
        title: "成功",
        message: "资产更新成功",
        type: "success",
      });
      setShowEditModal(false);
      fetchAssets();
    },
    [addNotification, selectedAsset, fetchAssets],
  );

  // 输入变化
  const handleInputChange = useCallback((field: string, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  }, []);

  // 统计卡片数据
  const assetStats = useMemo(() => {
    const allAssets = data.items;
    return {
      total: allAssets.length,
      inUse: allAssets.filter((a) => a.status === "in_use").length,
      idle: allAssets.filter((a) => a.status === "idle").length,
      maintenance: allAssets.filter((a) => a.status === "maintenance").length,
    };
  }, [data.items]);

  // 统计卡片
  const statCards = useMemo(
    () => [
      {
        id: "total",
        title: "资产总数",
        value: assetStats.total,
        icon: <Package style={{ width: 24, height: 24 }} />,
        color: "primary" as const,
      },
      {
        id: "in_use",
        title: "使用中",
        value: assetStats.inUse,
        icon: <Package style={{ width: 24, height: 24 }} />,
        color: "success" as const,
      },
      {
        id: "idle",
        title: "闲置",
        value: assetStats.idle,
        icon: <Package style={{ width: 24, height: 24 }} />,
        color: "info" as const,
      },
      {
        id: "maintenance",
        title: "维护中",
        value: assetStats.maintenance,
        icon: <Settings style={{ width: 24, height: 24 }} />,
        color: "warning" as const,
      },
    ],
    [assetStats],
  );

  const columns = useMemo(() => getColumns(getStatusBadge, getEmployeeName), [getStatusBadge, getEmployeeName]);
  const rowActions = useMemo(() => getRowActions(handleView, handleEdit, handleDelete), [handleView, handleEdit, handleDelete]);
  const filterConfigs = useMemo(() => getFilters(), []);

  // 筛选变化处理
  const handleFilterChange = useCallback(
    (filters: Record<string, any>) => {
      if (filters.search !== undefined) setSearchText(filters.search);
      if (filters.category !== undefined) setCategoryFilter(filters.category);
      if (filters.department !== undefined) setDepartmentFilter(filters.department);
      if (filters.status !== undefined) setStatusFilter(filters.status);
    },
    [],
  );

  return (
    <Box sx={{ p: { xs: 2, md: 3 } }}>
      <PageHeader
        title="资产管理"
        subtitle={`共 ${data.total} 项资产`}
        showBack
        onBack={() => navigate(-1)}
        actions={
          <Button
            variant="contained"
            startIcon={<Plus style={{ width: 18, height: 18 }} />}
            onClick={handleAdd}
            sx={{ bgcolor: "#3b82f6" }}
          >
            新增资产
          </Button>
        }
      />

      {/* 统计概览 */}
      <Paper sx={{ mb: 3, p: 3, borderRadius: 2 }}>
        <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 2 }}>
          资产概览
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
          emptyMessage="暂无资产数据"
        />
      </Paper>

      {/* 新增/编辑模态框 */}
      <AssetFormDialog
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
        <DialogTitle>资产详情</DialogTitle>
        <DialogContent>
          {selectedAsset && (
            <Box sx={{ display: "grid", gridTemplateColumns: 2, gap: 2, pt: 1 }}>
              <Box>
                <Typography variant="caption" color="text.secondary">资产编号</Typography>
                <Typography variant="body2" sx={{ fontWeight: 500 }}>{selectedAsset.asset_number}</Typography>
              </Box>
              <Box>
                <Typography variant="caption" color="text.secondary">资产名称</Typography>
                <Typography variant="body2" sx={{ fontWeight: 500 }}>{selectedAsset.name}</Typography>
              </Box>
              <Box>
                <Typography variant="caption" color="text.secondary">资产类别</Typography>
                <Typography variant="body2">{selectedAsset.category || "-"}</Typography>
              </Box>
              <Box>
                <Typography variant="caption" color="text.secondary">品牌/型号</Typography>
                <Typography variant="body2">{selectedAsset.brand} / {selectedAsset.model}</Typography>
              </Box>
              <Box>
                <Typography variant="caption" color="text.secondary">使用部门</Typography>
                <Typography variant="body2">{selectedAsset.department || "-"}</Typography>
              </Box>
              <Box>
                <Typography variant="caption" color="text.secondary">使用人</Typography>
                <Typography variant="body2">{getEmployeeName(selectedAsset.responsible_id)}</Typography>
              </Box>
              <Box>
                <Typography variant="caption" color="text.secondary">采购日期</Typography>
                <Typography variant="body2">{selectedAsset.purchase_date || "-"}</Typography>
              </Box>
              <Box>
                <Typography variant="caption" color="text.secondary">采购金额</Typography>
                <Typography variant="body2">¥{selectedAsset.purchase_amount?.toLocaleString() || "-"}</Typography>
              </Box>
              <Box>
                <Typography variant="caption" color="text.secondary">存放位置</Typography>
                <Typography variant="body2">{selectedAsset.location || "-"}</Typography>
              </Box>
              <Box>
                <Typography variant="caption" color="text.secondary">状态</Typography>
                <Box sx={{ mt: 0.5 }}>{getStatusBadge(selectedAsset.status)}</Box>
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
              handleEdit(selectedAsset!);
            }}
            sx={{ bgcolor: "#3b82f6" }}
          >
            编辑
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

// ============ 资产表单模态框 ============
interface AssetFormDialogProps {
  open: boolean;
  onClose: () => void;
  mode: "create" | "edit";
  formData: Partial<Asset>;
  onChange: (field: string, value: any) => void;
  onSubmit: (e: React.FormEvent) => void;
}

const AssetFormDialog: React.FC<AssetFormDialogProps> = ({
  open,
  onClose,
  mode,
  formData,
  onChange,
  onSubmit,
}) => (
  <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
    <DialogTitle>{mode === "create" ? "新增资产" : "编辑资产"}</DialogTitle>
    <DialogContent>
      <Box component="form" onSubmit={onSubmit} sx={{ display: "grid", gap: 2, pt: 1 }}>
        <Box sx={{ display: "grid", gridTemplateColumns: 2, gap: 2 }}>
          <TextField
            label="资产编号 *"
            size="small"
            value={formData.asset_number || ""}
            onChange={(e) => onChange("asset_number", e.target.value)}
            required
          />
          <TextField
            label="资产名称 *"
            size="small"
            value={formData.name || ""}
            onChange={(e) => onChange("name", e.target.value)}
            required
          />
        </Box>

        <Box sx={{ display: "grid", gridTemplateColumns: 3, gap: 2 }}>
          <FormControl size="small" fullWidth>
            <InputLabel>资产类别</InputLabel>
            <Select
              value={formData.category || ""}
              label="资产类别"
              onChange={(e) => onChange("category", e.target.value)}
            >
              <MenuItem value="电子产品">电子产品</MenuItem>
              <MenuItem value="办公设备">办公设备</MenuItem>
              <MenuItem value="配件">配件</MenuItem>
            </Select>
          </FormControl>
          <TextField
            label="品牌"
            size="small"
            value={formData.brand || ""}
            onChange={(e) => onChange("brand", e.target.value)}
          />
          <TextField
            label="型号"
            size="small"
            value={formData.model || ""}
            onChange={(e) => onChange("model", e.target.value)}
          />
        </Box>

        <Box sx={{ display: "grid", gridTemplateColumns: 2, gap: 2 }}>
          <FormControl size="small" fullWidth>
            <InputLabel>使用部门</InputLabel>
            <Select
              value={formData.department || ""}
              label="使用部门"
              onChange={(e) => onChange("department", e.target.value)}
            >
              {mockDepartments.map((d) => (
                <MenuItem key={d.id} value={d.name}>{d.name}</MenuItem>
              ))}
            </Select>
          </FormControl>
          <FormControl size="small" fullWidth>
            <InputLabel>使用人</InputLabel>
            <Select
              value={formData.responsible_id || ""}
              label="使用人"
              onChange={(e) => onChange("responsible_id", e.target.value)}
            >
              {mockEmployees.map((emp) => (
                <MenuItem key={emp.id} value={emp.id}>{emp.name}</MenuItem>
              ))}
            </Select>
          </FormControl>
        </Box>

        <Box sx={{ display: "grid", gridTemplateColumns: 2, gap: 2 }}>
          <TextField
            label="采购日期"
            type="date"
            size="small"
            value={formData.purchase_date || ""}
            onChange={(e) => onChange("purchase_date", e.target.value)}
            slotProps={{ inputLabel: { shrink: true } }}
          />
          <TextField
            label="采购金额"
            type="number"
            size="small"
            value={formData.purchase_amount || ""}
            onChange={(e) => onChange("purchase_amount", Number(e.target.value))}
          />
        </Box>

        <TextField
          label="存放位置"
          size="small"
          value={formData.location || ""}
          onChange={(e) => onChange("location", e.target.value)}
        />

        <FormControl size="small" fullWidth>
          <InputLabel>状态</InputLabel>
          <Select
            value={formData.status || "idle"}
            label="状态"
            onChange={(e) => onChange("status", e.target.value)}
          >
            <MenuItem value="idle">闲置</MenuItem>
            <MenuItem value="in_use">使用中</MenuItem>
            <MenuItem value="maintenance">维护中</MenuItem>
            <MenuItem value="scrapped">报废</MenuItem>
          </Select>
        </FormControl>

        <DialogActions sx={{ p: 0, pt: 2, justifyContent: "flex-end" }}>
          <Button onClick={onClose} variant="outlined">取消</Button>
          <Button type="submit" variant="contained" sx={{ bgcolor: "#3b82f6" }}>
            {mode === "create" ? "创建" : "保存"}
          </Button>
        </DialogActions>
      </Box>
    </DialogContent>
  </Dialog>
);

export default AssetManagementPageRefactored;
