/**
 * LimsInstrumentMaintenancePage 重构版本 (仪器维护记录)
 *
 * 重构要点：
 * 1. 使用 ListPageTemplate 替代手写的 Card + Table 布局
 * 2. 使用 PageHeader 统一页面头部
 * 3. 使用 FilterBar 定义筛选器
 * 4. 使用 ColumnDef 定义表格列
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
} from "@mui/material";
import {
  Plus,
  Edit,
  Trash2,
  Eye,
  Wrench,
  Calendar,
  DollarSign,
  FileText,
} from "lucide-react";
import {
  ListPageTemplate,
  type ColumnDef,
  type RowAction,
} from "../../components/templates";
import { PageHeader } from "../../components/layout";
import { FilterBar, type FilterConfig } from "../../components/mui";

interface MaintenanceRecord {
  id: string;
  instrument_id: string;
  instrument_name: string;
  maintenance_type: string;
  description: string;
  performed_by: string;
  performed_at: string;
  next_maintenance_date: string;
  cost: number;
  status: string;
}

const mockMaintenanceRecords: MaintenanceRecord[] = [
  {
    id: "1",
    instrument_id: "INS001",
    instrument_name: "高效液相色谱仪",
    maintenance_type: "定期维护",
    description: "更换色谱柱，清洁检测器",
    performed_by: "张工程师",
    performed_at: "2024-01-15",
    next_maintenance_date: "2024-04-15",
    cost: 2500,
    status: "已完成",
  },
  {
    id: "2",
    instrument_id: "INS002",
    instrument_name: "气相色谱仪",
    maintenance_type: "故障维修",
    description: "更换点火装置，校准检测器",
    performed_by: "李工程师",
    performed_at: "2024-01-16",
    next_maintenance_date: "2024-07-16",
    cost: 3800,
    status: "已完成",
  },
  {
    id: "3",
    instrument_id: "INS003",
    instrument_name: "紫外可见分光光度计",
    maintenance_type: "校准",
    description: "波长校准，光度精度检查",
    performed_by: "王工程师",
    performed_at: "2024-01-17",
    next_maintenance_date: "2024-04-17",
    cost: 1200,
    status: "进行中",
  },
  {
    id: "4",
    instrument_id: "INS004",
    instrument_name: "原子吸收光谱仪",
    maintenance_type: "定期维护",
    description: "更换空心阴极灯，清洁燃烧头",
    performed_by: "赵工程师",
    performed_at: "2024-01-18",
    next_maintenance_date: "2024-04-18",
    cost: 2100,
    status: "已完成",
  },
  {
    id: "5",
    instrument_id: "INS005",
    instrument_name: "傅里叶红外光谱仪",
    maintenance_type: "升级改造",
    description: "软件升级，更新谱库",
    performed_by: "刘工程师",
    performed_at: "2024-01-19",
    next_maintenance_date: "2025-01-19",
    cost: 5000,
    status: "已完成",
  },
];

// ============ 列定义 ============
const columns: ColumnDef<MaintenanceRecord>[] = [
  {
    id: "instrument_name",
    header: "仪器名称",
    accessor: "instrument_name",
    sortable: true,
    width: 180,
  },
  {
    id: "maintenance_type",
    header: "维护类型",
    accessor: "maintenance_type",
    render: (value) => {
      const typeColors: Record<string, { bg: string; color: string }> = {
        "定期维护": { bg: "#dbeafe", color: "#2563eb" },
        "故障维修": { bg: "#fee2e2", color: "#dc2626" },
        "校准": { bg: "#fef9c3", color: "#ca8a04" },
        "升级改造": { bg: "#f3e8ff", color: "#7c3aed" },
      };
      const colors = typeColors[value] || { bg: "#f3f4f6", color: "#4b5563" };
      return (
        <Chip
          label={value}
          size="small"
          sx={{ backgroundColor: colors.bg, color: colors.color, fontWeight: 500 }}
        />
      );
    },
  },
  {
    id: "description",
    header: "维护描述",
    accessor: "description",
    render: (value) => value || "-",
  },
  {
    id: "performed_by",
    header: "维护人员",
    accessor: "performed_by",
    render: (value) => value || "-",
  },
  {
    id: "performed_at",
    header: "维护日期",
    accessor: "performed_at",
    render: (value) => value || "-",
  },
  {
    id: "cost",
    header: "费用 (元)",
    accessor: "cost",
    render: (value) => `¥${value?.toFixed(2) || "0.00"}`,
  },
  {
    id: "status",
    header: "状态",
    accessor: "status",
    render: (value) => {
      const statusColors: Record<string, { bg: string; color: string }> = {
        "已完成": { bg: "#dcfce7", color: "#16a34a" },
        "进行中": { bg: "#fef9c3", color: "#ca8a04" },
        "已取消": { bg: "#f3f4f6", color: "#4b5563" },
      };
      const colors = statusColors[value] || { bg: "#f3f4f6", color: "#4b5563" };
      return (
        <Chip
          label={value}
          size="small"
          sx={{ backgroundColor: colors.bg, color: colors.color, fontWeight: 500 }}
        />
      );
    },
  },
];

// ============ 行操作 ============
const getRowActions = (
  onView: (record: MaintenanceRecord) => void,
  onEdit: (record: MaintenanceRecord) => void,
  onDelete: (record: MaintenanceRecord) => void,
): RowAction<MaintenanceRecord>[] => [
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
    type: "text",
    value: "",
  },
  {
    id: "maintenance_type",
    label: "维护类型",
    type: "select",
    options: [
      { value: "all", label: "全部" },
      { value: "定期维护", label: "定期维护" },
      { value: "故障维修", label: "故障维修" },
      { value: "校准", label: "校准" },
      { value: "升级改造", label: "升级改造" },
    ],
    value: "all",
  },
  {
    id: "status",
    label: "状态",
    type: "select",
    options: [
      { value: "all", label: "全部" },
      { value: "已完成", label: "已完成" },
      { value: "进行中", label: "进行中" },
      { value: "已取消", label: "已取消" },
    ],
    value: "all",
  },
];

// ============ 组件 ============
const LimsInstrumentMaintenancePageRefactored: React.FC = () => {
  const navigate = useNavigate();

  // 数据状态
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<{
    items: MaintenanceRecord[];
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

  // 模态框状态
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState<MaintenanceRecord | null>(null);

  // 表单数据
  const [formData, setFormData] = useState<Partial<MaintenanceRecord>>({});

  // 获取维护记录列表
  const fetchMaintenanceRecords = useCallback(async () => {
    setLoading(true);
    setTimeout(() => {
      let filtered = mockMaintenanceRecords;

      if (searchText) {
        filtered = filtered.filter(
          (r) =>
            r.instrument_name.toLowerCase().includes(searchText.toLowerCase()) ||
            r.description?.toLowerCase().includes(searchText.toLowerCase()),
        );
      }

      if (typeFilter !== "all") {
        filtered = filtered.filter((r) => r.maintenance_type === typeFilter);
      }

      if (statusFilter !== "all") {
        filtered = filtered.filter((r) => r.status === statusFilter);
      }

      setData({
        items: filtered,
        total: filtered.length,
        page: 1,
        page_size: 10,
      });
      setLoading(false);
    }, 500);
  }, [searchText, typeFilter, statusFilter]);

  // 处理筛选变化
  const handleFilterChange = useCallback(
    (filterId: string, value: any) => {
      if (filterId === "search") setSearchText(value);
      if (filterId === "maintenance_type") setTypeFilter(value);
      if (filterId === "status") setStatusFilter(value);
    },
    [],
  );

  // 处理分页变化
  const handlePageChange = useCallback((page: number) => {
    setData((prev) => ({ ...prev, page }));
  }, []);

  // 处理查看
  const handleView = useCallback((record: MaintenanceRecord) => {
    setSelectedRecord(record);
    setShowViewModal(true);
  }, []);

  // 处理编辑
  const handleEdit = useCallback((record: MaintenanceRecord) => {
    setSelectedRecord(record);
    setFormData(record);
    setShowEditModal(true);
  }, []);

  // 处理删除
  const handleDelete = useCallback(
    async (record: MaintenanceRecord) => {
      if (!window.confirm(`确定要删除这条维护记录吗?`)) return;
      fetchMaintenanceRecords();
    },
    [fetchMaintenanceRecords],
  );

  // 处理创建
  const handleCreate = useCallback(async () => {
    const newRecord: MaintenanceRecord = {
      id: String(Date.now()),
      instrument_id: "",
      instrument_name: formData.instrument_name || "",
      maintenance_type: formData.maintenance_type || "定期维护",
      description: formData.description || "",
      performed_by: formData.performed_by || "",
      performed_at: formData.performed_at || new Date().toISOString().split("T")[0],
      next_maintenance_date: formData.next_maintenance_date || "",
      cost: parseFloat(formData.cost as any) || 0,
      status: "进行中",
    };
    setData((prev) => ({
      ...prev,
      items: [newRecord, ...prev.items],
      total: prev.total + 1,
    }));
    setShowCreateModal(false);
    setFormData({});
  }, [formData]);

  // 处理更新
  const handleUpdate = useCallback(async () => {
    if (!selectedRecord) return;
    setData((prev) => ({
      ...prev,
      items: prev.items.map((item) =>
        item.id === selectedRecord.id ? { ...item, ...formData } : item,
      ),
    }));
    setShowEditModal(false);
    setFormData({});
    setSelectedRecord(null);
  }, [selectedRecord, formData]);

  // 初始加载
  React.useEffect(() => {
    fetchMaintenanceRecords();
  }, [fetchMaintenanceRecords]);

  return (
    <>
      <PageHeader
        title="仪器维护记录"
        subtitle={`共 ${data.total} 条记录`}
        breadcrumbs={[
          { label: "LIMS", href: "/lims" },
          { label: "仪器维护记录" },
        ]}
        actions={
          <>
            <Button
              variant="contained"
              startIcon={<Plus style={{ width: 18, height: 18 }} />}
              onClick={() => {
                setFormData({});
                setShowCreateModal(true);
              }}
              sx={{ bgcolor: "#06b6d4" }}
            >
              添加维护记录
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
          onPageSizeChange: (size) => setData((prev) => ({ ...prev, page_size: size })),
        }}
        onRowClick={handleView}
        emptyMessage="暂无维护记录"
      />

      {/* 查看模态框 */}
      <Dialog
        open={showViewModal}
        onClose={() => setShowViewModal(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>维护记录详情</DialogTitle>
        <DialogContent>
          {selectedRecord && (
            <Box sx={{ pt: 2, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 2 }}>
              <Box>
                <Box component="span" sx={{ color: "text.secondary", fontSize: "0.875rem" }}>
                  仪器名称
                </Box>
                <Box sx={{ fontWeight: 500 }}>{selectedRecord.instrument_name}</Box>
              </Box>
              <Box>
                <Box component="span" sx={{ color: "text.secondary", fontSize: "0.875rem" }}>
                  维护类型
                </Box>
                <Box>{selectedRecord.maintenance_type}</Box>
              </Box>
              <Box>
                <Box component="span" sx={{ color: "text.secondary", fontSize: "0.875rem" }}>
                  维护人员
                </Box>
                <Box>{selectedRecord.performed_by}</Box>
              </Box>
              <Box>
                <Box component="span" sx={{ color: "text.secondary", fontSize: "0.875rem" }}>
                  维护日期
                </Box>
                <Box>{selectedRecord.performed_at}</Box>
              </Box>
              <Box>
                <Box component="span" sx={{ color: "text.secondary", fontSize: "0.875rem" }}>
                  下次维护日期
                </Box>
                <Box>{selectedRecord.next_maintenance_date || "-"}</Box>
              </Box>
              <Box>
                <Box component="span" sx={{ color: "text.secondary", fontSize: "0.875rem" }}>
                  费用
                </Box>
                <Box sx={{ fontWeight: 500, color: "#16a34a" }}>
                  ¥{selectedRecord.cost?.toFixed(2)}
                </Box>
              </Box>
              <Box sx={{ gridColumn: "1 / -1" }}>
                <Box component="span" sx={{ color: "text.secondary", fontSize: "0.875rem" }}>
                  维护描述
                </Box>
                <Box>{selectedRecord.description || "-"}</Box>
              </Box>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowViewModal(false)}>关闭</Button>
        </DialogActions>
      </Dialog>

      {/* 创建模态框 */}
      <Dialog open={showCreateModal} onClose={() => setShowCreateModal(false)} maxWidth="sm" fullWidth>
        <DialogTitle>添加维护记录</DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 2, display: "flex", flexDirection: "column", gap: 2 }}>
            <TextField
              fullWidth
              label="仪器名称 *"
              value={formData.instrument_name || ""}
              onChange={(e) => setFormData({ ...formData, instrument_name: e.target.value })}
              placeholder="请输入仪器名称"
            />
            <TextField
              fullWidth
              select
              label="维护类型"
              value={formData.maintenance_type || "定期维护"}
              onChange={(e) => setFormData({ ...formData, maintenance_type: e.target.value })}
            >
              <option value="定期维护">定期维护</option>
              <option value="故障维修">故障维修</option>
              <option value="校准">校准</option>
              <option value="升级改造">升级改造</option>
            </TextField>
            <TextField
              fullWidth
              label="维护人员"
              value={formData.performed_by || ""}
              onChange={(e) => setFormData({ ...formData, performed_by: e.target.value })}
              placeholder="请输入维护人员"
            />
            <TextField
              fullWidth
              type="date"
              label="维护日期"
              value={formData.performed_at || ""}
              onChange={(e) => setFormData({ ...formData, performed_at: e.target.value })}
              slotProps={{ inputLabel: { shrink: true } }}
            />
            <TextField
              fullWidth
              type="number"
              label="费用 (元)"
              value={formData.cost || ""}
              onChange={(e) => setFormData({ ...formData, cost: parseFloat(e.target.value) || 0 })}
              placeholder="0.00"
            />
            <TextField
              fullWidth
              label="维护描述"
              value={formData.description || ""}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="请输入维护描述"
              multiline
              rows={3}
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowCreateModal(false)}>取消</Button>
          <Button variant="contained" onClick={handleCreate} sx={{ bgcolor: "#06b6d4" }}>
            保存
          </Button>
        </DialogActions>
      </Dialog>

      {/* 编辑模态框 */}
      <Dialog open={showEditModal} onClose={() => setShowEditModal(false)} maxWidth="sm" fullWidth>
        <DialogTitle>编辑维护记录</DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 2, display: "flex", flexDirection: "column", gap: 2 }}>
            <TextField
              fullWidth
              label="仪器名称 *"
              value={formData.instrument_name || ""}
              onChange={(e) => setFormData({ ...formData, instrument_name: e.target.value })}
              placeholder="请输入仪器名称"
            />
            <TextField
              fullWidth
              select
              label="维护类型"
              value={formData.maintenance_type || "定期维护"}
              onChange={(e) => setFormData({ ...formData, maintenance_type: e.target.value })}
            >
              <option value="定期维护">定期维护</option>
              <option value="故障维修">故障维修</option>
              <option value="校准">校准</option>
              <option value="升级改造">升级改造</option>
            </TextField>
            <TextField
              fullWidth
              label="维护人员"
              value={formData.performed_by || ""}
              onChange={(e) => setFormData({ ...formData, performed_by: e.target.value })}
              placeholder="请输入维护人员"
            />
            <TextField
              fullWidth
              type="date"
              label="维护日期"
              value={formData.performed_at || ""}
              onChange={(e) => setFormData({ ...formData, performed_at: e.target.value })}
              slotProps={{ inputLabel: { shrink: true } }}
            />
            <TextField
              fullWidth
              type="number"
              label="费用 (元)"
              value={formData.cost || ""}
              onChange={(e) => setFormData({ ...formData, cost: parseFloat(e.target.value) || 0 })}
              placeholder="0.00"
            />
            <TextField
              fullWidth
              label="维护描述"
              value={formData.description || ""}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="请输入维护描述"
              multiline
              rows={3}
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowEditModal(false)}>取消</Button>
          <Button variant="contained" onClick={handleUpdate} sx={{ bgcolor: "#06b6d4" }}>
            保存
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
};

export default LimsInstrumentMaintenancePageRefactored;
