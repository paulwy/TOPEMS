/**
 * EhsHazardPage 重构版本 (危险源管理)
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
  FormControl,
  InputLabel,
  Select,
  MenuItem,
} from "@mui/material";
import {
  Plus,
  Edit,
  Trash2,
  Eye,
  Download,
  AlertTriangle,
  Shield,
} from "lucide-react";
import {
  ehsApi,
  type SafetyHazard,
  type CreateSafetyHazardRequest,
} from "../api/ehs";
import { useAppStore } from "../store";
import {
  ListPageTemplate,
  type ColumnDef,
  type RowAction,
} from "../components/templates";
import { PageHeader } from "../components/layout";
import { FilterBar, type FilterConfig } from "../components/mui";

// ============ 列定义 ============
const columns: ColumnDef<SafetyHazard>[] = [
  {
    id: "hazard_no",
    header: "危险源编号",
    accessor: "hazard_no",
    sortable: true,
    width: 150,
  },
  {
    id: "name",
    header: "危险源名称",
    accessor: "name",
    sortable: true,
    width: 200,
  },
  {
    id: "level",
    header: "风险等级",
    accessor: "level",
    render: (value) => {
      const levelColors: Record<string, { bg: string; color: string }> = {
        "高": { bg: "error.light", color: "error.dark" },
        "重大": { bg: "error.light", color: "error.dark" },
        "中": { bg: "warning.light", color: "warning.dark" },
        "低": { bg: "success.light", color: "success.dark" },
      };
      const colors = levelColors[value] || { bg: "grey.200", color: "grey.700" };
      return (
        <Chip
          label={value}
          size="small"
          sx={{ bgcolor: colors.bg, color: colors.color, fontWeight: 500 }}
        />
      );
    },
  },
  {
    id: "category",
    header: "类别",
    accessor: "category",
    render: (value) => value || "-",
  },
  {
    id: "status",
    header: "状态",
    accessor: "status",
    render: (value) => {
      const statusLabels: Record<string, string> = {
        identified: "已识别",
        controlled: "已控制",
        eliminated: "已消除",
        archived: "已归档",
      };
      const statusColors: Record<string, { bg: string; color: string }> = {
        identified: { bg: "warning.light", color: "warning.dark" },
        controlled: { bg: "info.light", color: "info.dark" },
        eliminated: { bg: "success.light", color: "success.dark" },
        archived: { bg: "grey.200", color: "grey.600" },
      };
      const label = statusLabels[value] || value;
      const colors = statusColors[value] || { bg: "grey.200", color: "grey.700" };
      return (
        <Chip
          label={label}
          size="small"
          sx={{ bgcolor: colors.bg, color: colors.color, fontWeight: 500 }}
        />
      );
    },
  },
  {
    id: "location",
    header: "位置",
    accessor: "location",
    render: (value) => value || "-",
  },
  {
    id: "created_at",
    header: "创建时间",
    accessor: "created_at",
    render: (value) => {
      if (!value) return "-";
      return new Date(value).toLocaleDateString("zh-CN");
    },
  },
];

// ============ 行操作 ============
const getRowActions = (
  onView: (hazard: SafetyHazard) => void,
  onEdit: (hazard: SafetyHazard) => void,
  onDelete: (hazard: SafetyHazard) => void,
): RowAction<SafetyHazard>[] => [
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
    id: "status",
    label: "状态",
    type: "select",
    options: [
      { value: "all", label: "全部" },
      { value: "identified", label: "已识别" },
      { value: "controlled", label: "已控制" },
      { value: "eliminated", label: "已消除" },
      { value: "archived", label: "已归档" },
    ],
    value: "all",
  },
  {
    id: "level",
    label: "风险等级",
    type: "select",
    options: [
      { value: "all", label: "全部" },
      { value: "高", label: "高" },
      { value: "重大", label: "重大" },
      { value: "中", label: "中" },
      { value: "低", label: "低" },
    ],
    value: "all",
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
const EhsHazardPageRefactored: React.FC = () => {
  const navigate = useNavigate();
  const addNotification = useAppStore((state) => state.addNotification);

  // 数据状态
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<{
    items: SafetyHazard[];
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
  const [levelFilter, setLevelFilter] = useState("all");

  // 模态框状态
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const [selectedHazard, setSelectedHazard] = useState<SafetyHazard | null>(null);

  // 行选择
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  // 表单数据
  const [formData, setFormData] = useState<Partial<CreateSafetyHazardRequest>>({});

  // 获取危险源列表
  const fetchHazards = useCallback(async () => {
    setLoading(true);
    try {
      const response = await ehsApi.listHazards({
        page: 1,
        page_size: 100,
        search: searchText !== "" ? searchText : undefined,
        status: statusFilter !== "all" ? statusFilter : undefined,
      });
      if (response.success && response.data) {
        const items = response.data.data || [];
        // 按风险等级筛选（前端筛选）
        const filteredItems = levelFilter !== "all"
          ? items.filter(item => item.level === levelFilter)
          : items;
        setData({
          items: filteredItems,
          total: filteredItems.length,
          page: 1,
          page_size: 10,
        });
      }
    } catch (error: any) {
      addNotification({
        type: "error",
        title: "加载失败",
        message: error.message || "获取危险源数据失败",
      });
    } finally {
      setLoading(false);
    }
  }, [addNotification, searchText, statusFilter, levelFilter]);

  // 处理筛选变化
  const handleFilterChange = useCallback(
    (filterId: string, value: any) => {
      if (filterId === "search") setSearchText(value);
      if (filterId === "status") setStatusFilter(value);
      if (filterId === "level") setLevelFilter(value);
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
  const handleView = useCallback((hazard: SafetyHazard) => {
    setSelectedHazard(hazard);
    setShowViewModal(true);
  }, []);

  // 处理编辑
  const handleEdit = useCallback((hazard: SafetyHazard) => {
    setSelectedHazard(hazard);
    setFormData({
      name: hazard.name,
      hazard_no: hazard.hazard_no,
      category: hazard.category,
      level: hazard.level,
      description: hazard.description || undefined,
      location: hazard.location || undefined,
      status: hazard.status,
      control_measures: [],
    });
    setShowEditModal(true);
  }, []);

  // 处理删除
  const handleDelete = useCallback(
    async (hazard: SafetyHazard) => {
      if (!window.confirm(`确定要删除危险源"${hazard.name}"吗?`)) return;
      try {
        await ehsApi.deleteHazard(hazard.id);
        addNotification({
          type: "success",
          title: "删除成功",
          message: "危险源已删除",
        });
        fetchHazards();
      } catch (error: any) {
        addNotification({
          type: "error",
          title: "删除失败",
          message: error.message || "无法删除危险源",
        });
      }
    },
    [addNotification, fetchHazards],
  );

  // 处理创建
  const handleCreate = useCallback(async () => {
    if (!formData.name?.trim()) {
      addNotification({
        type: "error",
        title: "验证失败",
        message: "请输入危险源名称",
      });
      return;
    }
    if (!formData.hazard_no?.trim()) {
      addNotification({
        type: "error",
        title: "验证失败",
        message: "请输入危险源编号",
      });
      return;
    }
    try {
      const createData: CreateSafetyHazardRequest = {
        name: formData.name,
        hazard_no: formData.hazard_no,
        category: formData.category || "",
        level: formData.level || "中",
        description: formData.description || null,
        location: formData.location || null,
        risk_assessment: null,
        control_measures: [],
        status: formData.status || "identified",
      };
      await ehsApi.createHazard(createData);
      addNotification({
        type: "success",
        title: "创建成功",
        message: "危险源已创建",
      });
      setShowCreateModal(false);
      setFormData({});
      fetchHazards();
    } catch (error: any) {
      addNotification({
        type: "error",
        title: "创建失败",
        message: error.message || "无法创建危险源",
      });
    }
  }, [formData, addNotification, fetchHazards]);

  // 处理更新
  const handleUpdate = useCallback(async () => {
    if (!selectedHazard) return;
    try {
      await ehsApi.updateHazard(selectedHazard.id, {
        name: formData.name,
        category: formData.category,
        level: formData.level,
        description: formData.description || null,
        location: formData.location || null,
        status: formData.status,
      });
      addNotification({
        type: "success",
        title: "更新成功",
        message: "危险源已更新",
      });
      setShowEditModal(false);
      setFormData({});
      fetchHazards();
    } catch (error: any) {
      addNotification({
        type: "error",
        title: "更新失败",
        message: error.message || "无法更新危险源",
      });
    }
  }, [selectedHazard, formData, addNotification, fetchHazards]);

  // 初始加载
  React.useEffect(() => {
    fetchHazards();
  }, [fetchHazards]);

  return (
    <>
      <PageHeader
        title="危险源管理"
        subtitle={`共 ${data.total} 条记录`}
        showBack
        onBack={() => navigate(-1)}
        icon={<Shield style={{ width: 24, height: 24 }} />}
        actions={
          <>
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
              sx={{ backgroundColor: "#ea580c", "&:hover": { backgroundColor: "#c2410c" } }}
            >
              新建危险源
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
        emptyMessage="暂无危险源数据"
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
        <DialogTitle sx={{ display: "flex", alignItems: "center", gap: 1 }}>
          <AlertTriangle style={{ width: 20, height: 20, color: "#ea580c" }} />
          危险源详情
        </DialogTitle>
        <DialogContent>
          {selectedHazard && (
            <Box sx={{ pt: 2, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 2 }}>
              <Box>
                <Box component="span" sx={{ color: "text.secondary", fontSize: "0.875rem" }}>
                  危险源编号
                </Box>
                <Box sx={{ fontWeight: 500 }}>{selectedHazard.hazard_no}</Box>
              </Box>
              <Box>
                <Box component="span" sx={{ color: "text.secondary", fontSize: "0.875rem" }}>
                  风险等级
                </Box>
                <Box>
                  <Chip
                    label={selectedHazard.level}
                    size="small"
                    sx={{
                      bgcolor: selectedHazard.level === "高" || selectedHazard.level === "重大"
                        ? "error.light"
                        : selectedHazard.level === "中"
                          ? "warning.light"
                          : "success.light",
                      color: selectedHazard.level === "高" || selectedHazard.level === "重大"
                        ? "error.dark"
                        : selectedHazard.level === "中"
                          ? "warning.dark"
                          : "success.dark",
                      fontWeight: 500,
                    }}
                  />
                </Box>
              </Box>
              <Box>
                <Box component="span" sx={{ color: "text.secondary", fontSize: "0.875rem" }}>
                  类别
                </Box>
                <Box>{selectedHazard.category || "-"}</Box>
              </Box>
              <Box>
                <Box component="span" sx={{ color: "text.secondary", fontSize: "0.875rem" }}>
                  状态
                </Box>
                <Box>
                  {selectedHazard.status === "identified" ? "已识别" :
                   selectedHazard.status === "controlled" ? "已控制" :
                   selectedHazard.status === "eliminated" ? "已消除" : "已归档"}
                </Box>
              </Box>
              <Box>
                <Box component="span" sx={{ color: "text.secondary", fontSize: "0.875rem" }}>
                  位置
                </Box>
                <Box>{selectedHazard.location || "-"}</Box>
              </Box>
              <Box>
                <Box component="span" sx={{ color: "text.secondary", fontSize: "0.875rem" }}>
                  创建时间
                </Box>
                <Box>
                  {selectedHazard.created_at
                    ? new Date(selectedHazard.created_at).toLocaleDateString("zh-CN")
                    : "-"}
                </Box>
              </Box>
              <Box sx={{ gridColumn: "1 / -1" }}>
                <Box component="span" sx={{ color: "text.secondary", fontSize: "0.875rem" }}>
                  危险源名称
                </Box>
                <Box sx={{ fontWeight: 500, fontSize: "1.1rem" }}>{selectedHazard.name}</Box>
              </Box>
              <Box sx={{ gridColumn: "1 / -1" }}>
                <Box component="span" sx={{ color: "text.secondary", fontSize: "0.875rem" }}>
                  描述
                </Box>
                <Box>{selectedHazard.description || "暂无描述"}</Box>
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
              if (selectedHazard) handleEdit(selectedHazard);
            }}
            sx={{ backgroundColor: "#ea580c", "&:hover": { backgroundColor: "#c2410c" } }}
          >
            编辑
          </Button>
        </DialogActions>
      </Dialog>

      {/* 创建模态框 */}
      <Dialog
        open={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>新建危险源</DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 2, display: "flex", flexDirection: "column", gap: 2 }}>
            <TextField
              fullWidth
              label="危险源名称 *"
              value={formData.name || ""}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="请输入危险源名称"
            />
            <TextField
              fullWidth
              label="危险源编号 *"
              value={formData.hazard_no || ""}
              onChange={(e) => setFormData({ ...formData, hazard_no: e.target.value })}
              placeholder="请输入危险源编号"
            />
            <FormControl fullWidth>
              <InputLabel>风险等级</InputLabel>
              <Select
                value={formData.level || "中"}
                label="风险等级"
                onChange={(e) => setFormData({ ...formData, level: e.target.value })}
              >
                <MenuItem value="高">高</MenuItem>
                <MenuItem value="重大">重大</MenuItem>
                <MenuItem value="中">中</MenuItem>
                <MenuItem value="低">低</MenuItem>
              </Select>
            </FormControl>
            <TextField
              fullWidth
              label="类别"
              value={formData.category || ""}
              onChange={(e) => setFormData({ ...formData, category: e.target.value })}
              placeholder="请输入类别"
            />
            <TextField
              fullWidth
              label="位置"
              value={formData.location || ""}
              onChange={(e) => setFormData({ ...formData, location: e.target.value })}
              placeholder="请输入位置"
            />
            <FormControl fullWidth>
              <InputLabel>状态</InputLabel>
              <Select
                value={formData.status || "identified"}
                label="状态"
                onChange={(e) => setFormData({ ...formData, status: e.target.value })}
              >
                <MenuItem value="identified">已识别</MenuItem>
                <MenuItem value="controlled">已控制</MenuItem>
                <MenuItem value="eliminated">已消除</MenuItem>
                <MenuItem value="archived">已归档</MenuItem>
              </Select>
            </FormControl>
            <TextField
              fullWidth
              label="描述"
              value={formData.description || ""}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="请输入描述"
              multiline
              rows={4}
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowCreateModal(false)}>取消</Button>
          <Button
            variant="contained"
            onClick={handleCreate}
            sx={{ backgroundColor: "#ea580c", "&:hover": { backgroundColor: "#c2410c" } }}
          >
            创建
          </Button>
        </DialogActions>
      </Dialog>

      {/* 编辑模态框 */}
      <Dialog
        open={showEditModal}
        onClose={() => setShowEditModal(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>编辑危险源</DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 2, display: "flex", flexDirection: "column", gap: 2 }}>
            <TextField
              fullWidth
              label="危险源名称 *"
              value={formData.name || ""}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="请输入危险源名称"
            />
            <TextField
              fullWidth
              label="类别"
              value={formData.category || ""}
              onChange={(e) => setFormData({ ...formData, category: e.target.value })}
              placeholder="请输入类别"
            />
            <FormControl fullWidth>
              <InputLabel>风险等级</InputLabel>
              <Select
                value={formData.level || "中"}
                label="风险等级"
                onChange={(e) => setFormData({ ...formData, level: e.target.value })}
              >
                <MenuItem value="高">高</MenuItem>
                <MenuItem value="重大">重大</MenuItem>
                <MenuItem value="中">中</MenuItem>
                <MenuItem value="低">低</MenuItem>
              </Select>
            </FormControl>
            <TextField
              fullWidth
              label="位置"
              value={formData.location || ""}
              onChange={(e) => setFormData({ ...formData, location: e.target.value })}
              placeholder="请输入位置"
            />
            <FormControl fullWidth>
              <InputLabel>状态</InputLabel>
              <Select
                value={formData.status || "identified"}
                label="状态"
                onChange={(e) => setFormData({ ...formData, status: e.target.value })}
              >
                <MenuItem value="identified">已识别</MenuItem>
                <MenuItem value="controlled">已控制</MenuItem>
                <MenuItem value="eliminated">已消除</MenuItem>
                <MenuItem value="archived">已归档</MenuItem>
              </Select>
            </FormControl>
            <TextField
              fullWidth
              label="描述"
              value={formData.description || ""}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="请输入描述"
              multiline
              rows={4}
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowEditModal(false)}>取消</Button>
          <Button
            variant="contained"
            onClick={handleUpdate}
            sx={{ backgroundColor: "#ea580c", "&:hover": { backgroundColor: "#c2410c" } }}
          >
            更新
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
};

export default EhsHazardPageRefactored;
