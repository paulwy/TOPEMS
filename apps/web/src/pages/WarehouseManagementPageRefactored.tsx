/**
 * WarehouseManagementPage 重构后
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
  Warehouse,
  Plus,
  Eye,
  Edit,
  Trash2,
  MapPin,
  User,
  Phone,
  CheckCircle,
  Settings,
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
interface Warehouse {
  id: string;
  code: string;
  name: string;
  address: string;
  area: number;
  manager: string;
  phone: string;
  status: "active" | "inactive" | "maintenance";
  description?: string;
  created_at: string;
}

interface PaginatedResult<T> {
  items: T[];
  total: number;
  page: number;
  page_size: number;
}

// ============ Mock 数据 ============
const mockWarehouses: Warehouse[] = [
  { id: "1", code: "WH-001", name: "中心仓库", address: "北京市朝阳区A栋1层", area: 500, manager: "张经理", phone: "010-12345678", status: "active", description: "主要存储办公用品和设备", created_at: "2022-01-15" },
  { id: "2", code: "WH-002", name: "IT仓库", address: "北京市朝阳区B栋2层", area: 200, manager: "李工", phone: "010-23456789", status: "active", description: "专门存储IT设备和配件", created_at: "2022-03-20" },
  { id: "3", code: "WH-003", name: "后勤仓库", address: "北京市海淀区C栋1层", area: 300, manager: "王师傅", phone: "010-34567890", status: "active", description: "存储后勤保障物资", created_at: "2022-05-10" },
  { id: "4", code: "WH-004", name: "危险品仓库", address: "北京市大兴区D栋", area: 150, manager: "赵安全", phone: "010-45678901", status: "maintenance", description: "存储危险品，需特殊管理", created_at: "2021-11-08" },
  { id: "5", code: "WH-005", name: "档案仓库", address: "北京市朝阳区E栋3层", area: 100, manager: "孙管理员", phone: "010-56789012", status: "inactive", description: "存储重要档案文件", created_at: "2020-06-15" },
  { id: "6", code: "WH-006", name: "临时仓库", address: "北京市海淀区F栋", area: 80, manager: "刘师傅", phone: "010-67890123", status: "active", description: "临时存放物资", created_at: "2023-02-01" },
];

// ============ 列定义 ============
const getColumns = (
  getStatusBadge: (status: string) => JSX.Element,
): ColumnDef<Warehouse>[] => [
  {
    id: "code",
    header: "仓库编号",
    accessor: "code",
    minWidth: 100,
    render: (row: Warehouse) => (
      <Typography variant="body2" sx={{ fontWeight: 500 }}>
        {row.code}
      </Typography>
    ),
  },
  {
    id: "name",
    header: "仓库名称",
    accessor: "name",
    minWidth: 140,
    render: (row: Warehouse) => (
      <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
        <Warehouse sx={{ width: 16, height: 16, color: "primary.main" }} />
        <Typography variant="body2" sx={{ fontWeight: 500 }}>
          {row.name}
        </Typography>
      </Box>
    ),
  },
  {
    id: "address",
    header: "位置",
    accessor: "address",
    minWidth: 180,
    render: (row: Warehouse) => (
      <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
        <MapPin sx={{ width: 14, height: 14, color: "text.secondary" }} />
        <Typography variant="body2" sx={{ color: "text.secondary" }}>
          {row.address}
        </Typography>
      </Box>
    ),
  },
  {
    id: "area",
    header: "面积(m²)",
    accessor: "area",
    minWidth: 90,
    render: (row: Warehouse) => (
      <Typography variant="body2">{row.area}</Typography>
    ),
  },
  {
    id: "manager",
    header: "管理员",
    accessor: "manager",
    minWidth: 100,
    render: (row: Warehouse) => (
      <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
        <User sx={{ width: 14, height: 14, color: "text.secondary" }} />
        <Typography variant="body2">{row.manager}</Typography>
      </Box>
    ),
  },
  {
    id: "phone",
    header: "联系电话",
    accessor: "phone",
    minWidth: 130,
    render: (row: Warehouse) => (
      <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
        <Phone sx={{ width: 14, height: 14, color: "text.secondary" }} />
        <Typography variant="body2">{row.phone}</Typography>
      </Box>
    ),
  },
  {
    id: "status",
    header: "状态",
    accessor: "status",
    width: 100,
    render: (row: Warehouse) => getStatusBadge(row.status),
  },
];

// ============ 行操作 ============
const getRowActions = (
  onView: (warehouse: Warehouse) => void,
  onEdit: (warehouse: Warehouse) => void,
  onDelete: (warehouse: Warehouse) => void,
): RowAction<Warehouse>[] => [
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
    placeholder: "搜索仓库名称、编号...",
    width: 250,
  },
  {
    id: "status",
    label: "状态",
    type: "select",
    options: [
      { label: "全部状态", value: "all" },
      { label: "活跃", value: "active" },
      { label: "非活跃", value: "inactive" },
      { label: "维护中", value: "maintenance" },
    ],
  },
];

// ============ 组件 ============
const WarehouseManagementPageRefactored: React.FC = () => {
  const navigate = useNavigate();
  const addNotification = useAppStore((state) => state.addNotification);

  // 数据状态
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<PaginatedResult<Warehouse>>({
    items: mockWarehouses,
    total: mockWarehouses.length,
    page: 1,
    page_size: 10,
  });

  // 筛选状态
  const [searchText, setSearchText] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  // 模态框状态
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const [selectedWarehouse, setSelectedWarehouse] = useState<Warehouse | null>(null);

  // 表单数据
  const [formData, setFormData] = useState<Partial<Warehouse>>({});

  // 状态徽章
  const getStatusBadge = useCallback((status: string) => {
    const colors: Record<string, "success" | "default" | "warning"> = {
      active: "success",
      inactive: "default",
      maintenance: "warning",
    };
    const labels: Record<string, string> = {
      active: "活跃",
      inactive: "非活跃",
      maintenance: "维护中",
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
    let filtered = [...mockWarehouses];
    if (searchText) {
      filtered = filtered.filter(
        (w) =>
          w.name.includes(searchText) ||
          w.code.includes(searchText) ||
          w.address.includes(searchText)
      );
    }
    if (statusFilter && statusFilter !== "all") {
      filtered = filtered.filter((w) => w.status === statusFilter);
    }
    setData({
      items: filtered,
      total: filtered.length,
      page: 1,
      page_size: 10,
    });
  }, [searchText, statusFilter]);

  // 重置筛选
  const handleReset = useCallback(() => {
    setSearchText("");
    setStatusFilter("all");
    setData({
      items: mockWarehouses,
      total: mockWarehouses.length,
      page: 1,
      page_size: 10,
    });
  }, []);

  // 新增
  const handleAdd = useCallback(() => {
    setSelectedWarehouse(null);
    setFormData({
      code: "",
      name: "",
      address: "",
      area: 0,
      manager: "",
      phone: "",
      status: "active",
      description: "",
    });
    setShowCreateModal(true);
  }, []);

  // 编辑
  const handleEdit = useCallback((record: Warehouse) => {
    setSelectedWarehouse(record);
    setFormData(record);
    setShowEditModal(true);
  }, []);

  // 查看
  const handleView = useCallback((record: Warehouse) => {
    setSelectedWarehouse(record);
    setShowViewModal(true);
  }, []);

  // 删除
  const handleDelete = useCallback(
    async (warehouse: Warehouse) => {
      if (!confirm(`确定要删除仓库"${warehouse.name}"吗？`)) return;
      addNotification({
        title: "成功",
        message: "仓库删除成功",
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
        message: "仓库创建成功",
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
        message: "仓库更新成功",
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
  const warehouseStats = useMemo(() => {
    const allWarehouses = data.items;
    return {
      total: allWarehouses.length,
      active: allWarehouses.filter((w) => w.status === "active").length,
      inactive: allWarehouses.filter((w) => w.status === "inactive").length,
      maintenance: allWarehouses.filter((w) => w.status === "maintenance").length,
      totalArea: allWarehouses.reduce((sum, w) => sum + w.area, 0),
    };
  }, [data.items]);

  // 统计卡片
  const statCards = useMemo(
    () => [
      {
        id: "total",
        title: "仓库总数",
        value: warehouseStats.total,
        icon: <Warehouse style={{ width: 24, height: 24 }} />,
        color: "primary" as const,
      },
      {
        id: "active",
        title: "活跃",
        value: warehouseStats.active,
        icon: <CheckCircle style={{ width: 24, height: 24 }} />,
        color: "success" as const,
      },
      {
        id: "maintenance",
        title: "维护中",
        value: warehouseStats.maintenance,
        icon: <Settings style={{ width: 24, height: 24 }} />,
        color: "warning" as const,
      },
      {
        id: "area",
        title: "总面积(m²)",
        value: warehouseStats.totalArea,
        icon: <Warehouse style={{ width: 24, height: 24 }} />,
        color: "info" as const,
      },
    ],
    [warehouseStats],
  );

  const columns = useMemo(() => getColumns(getStatusBadge), [getStatusBadge]);
  const rowActions = useMemo(() => getRowActions(handleView, handleEdit, handleDelete), [handleView, handleEdit, handleDelete]);
  const filterConfigs = useMemo(() => getFilters(), []);

  // 筛选变化处理
  const handleFilterChange = useCallback(
    (filters: Record<string, any>) => {
      if (filters.search !== undefined) setSearchText(filters.search);
      if (filters.status !== undefined) setStatusFilter(filters.status);
    },
    [],
  );

  return (
    <Box sx={{ p: { xs: 2, md: 3 } }}>
      <PageHeader
        title="仓库管理"
        subtitle={`共 ${data.total} 个仓库`}
        showBack
        onBack={() => navigate(-1)}
        actions={
          <Button
            variant="contained"
            startIcon={<Plus style={{ width: 18, height: 18 }} />}
            onClick={handleAdd}
            sx={{ bgcolor: "#3b82f6" }}
          >
            新增仓库
          </Button>
        }
      />

      {/* 统计概览 */}
      <Paper sx={{ mb: 3, p: 3, borderRadius: 2 }}>
        <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 2 }}>
          仓库概览
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
          emptyMessage="暂无仓库数据"
        />
      </Paper>

      {/* 新增/编辑模态框 */}
      <WarehouseFormDialog
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
        <DialogTitle>仓库详情</DialogTitle>
        <DialogContent>
          {selectedWarehouse && (
            <Box sx={{ display: "grid", gridTemplateColumns: 2, gap: 2, pt: 1 }}>
              <Box>
                <Typography variant="caption" color="text.secondary">仓库编号</Typography>
                <Typography variant="body2" sx={{ fontWeight: 500 }}>{selectedWarehouse.code}</Typography>
              </Box>
              <Box>
                <Typography variant="caption" color="text.secondary">仓库名称</Typography>
                <Typography variant="body2" sx={{ fontWeight: 500 }}>{selectedWarehouse.name}</Typography>
              </Box>
              <Box sx={{ gridColumn: "1 / -1" }}>
                <Typography variant="caption" color="text.secondary">地址</Typography>
                <Typography variant="body2">{selectedWarehouse.address}</Typography>
              </Box>
              <Box>
                <Typography variant="caption" color="text.secondary">面积</Typography>
                <Typography variant="body2">{selectedWarehouse.area} m²</Typography>
              </Box>
              <Box>
                <Typography variant="caption" color="text.secondary">管理员</Typography>
                <Typography variant="body2">{selectedWarehouse.manager}</Typography>
              </Box>
              <Box>
                <Typography variant="caption" color="text.secondary">联系电话</Typography>
                <Typography variant="body2">{selectedWarehouse.phone}</Typography>
              </Box>
              <Box>
                <Typography variant="caption" color="text.secondary">状态</Typography>
                <Box sx={{ mt: 0.5 }}>{getStatusBadge(selectedWarehouse.status)}</Box>
              </Box>
              <Box>
                <Typography variant="caption" color="text.secondary">创建时间</Typography>
                <Typography variant="body2">{selectedWarehouse.created_at}</Typography>
              </Box>
              {selectedWarehouse.description && (
                <Box sx={{ gridColumn: "1 / -1" }}>
                  <Typography variant="caption" color="text.secondary">描述</Typography>
                  <Typography variant="body2">{selectedWarehouse.description}</Typography>
                </Box>
              )}
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowViewModal(false)}>关闭</Button>
          <Button
            variant="contained"
            onClick={() => {
              setShowViewModal(false);
              handleEdit(selectedWarehouse!);
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

// ============ 仓库表单模态框 ============
interface WarehouseFormDialogProps {
  open: boolean;
  onClose: () => void;
  mode: "create" | "edit";
  formData: Partial<Warehouse>;
  onChange: (field: string, value: any) => void;
  onSubmit: (e: React.FormEvent) => void;
}

const WarehouseFormDialog: React.FC<WarehouseFormDialogProps> = ({
  open,
  onClose,
  mode,
  formData,
  onChange,
  onSubmit,
}) => (
  <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
    <DialogTitle>{mode === "create" ? "新增仓库" : "编辑仓库"}</DialogTitle>
    <DialogContent>
      <Box component="form" onSubmit={onSubmit} sx={{ display: "grid", gap: 2, pt: 1 }}>
        <Box sx={{ display: "grid", gridTemplateColumns: 2, gap: 2 }}>
          <TextField
            label="仓库编号 *"
            size="small"
            value={formData.code || ""}
            onChange={(e) => onChange("code", e.target.value)}
            required
          />
          <TextField
            label="仓库名称 *"
            size="small"
            value={formData.name || ""}
            onChange={(e) => onChange("name", e.target.value)}
            required
          />
        </Box>

        <TextField
          label="地址"
          size="small"
          value={formData.address || ""}
          onChange={(e) => onChange("address", e.target.value)}
        />

        <Box sx={{ display: "grid", gridTemplateColumns: 2, gap: 2 }}>
          <TextField
            label="面积(m²)"
            type="number"
            size="small"
            value={formData.area || ""}
            onChange={(e) => onChange("area", Number(e.target.value))}
          />
          <FormControl size="small" fullWidth>
            <InputLabel>状态</InputLabel>
            <Select
              value={formData.status || "active"}
              label="状态"
              onChange={(e) => onChange("status", e.target.value)}
            >
              <MenuItem value="active">活跃</MenuItem>
              <MenuItem value="inactive">非活跃</MenuItem>
              <MenuItem value="maintenance">维护中</MenuItem>
            </Select>
          </FormControl>
        </Box>

        <Box sx={{ display: "grid", gridTemplateColumns: 2, gap: 2 }}>
          <TextField
            label="管理员"
            size="small"
            value={formData.manager || ""}
            onChange={(e) => onChange("manager", e.target.value)}
          />
          <TextField
            label="联系电话"
            size="small"
            value={formData.phone || ""}
            onChange={(e) => onChange("phone", e.target.value)}
          />
        </Box>

        <TextField
          label="描述"
          size="small"
          multiline
          rows={2}
          value={formData.description || ""}
          onChange={(e) => onChange("description", e.target.value)}
        />

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

export default WarehouseManagementPageRefactored;
