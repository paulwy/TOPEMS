/**
 * LimsSamplePage 重构版本 (样品管理)
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
} from "@mui/material";
import {
  Plus,
  Edit,
  Trash2,
  Eye,
  Download,
  Upload,
  FlaskConical,
} from "lucide-react";
import {
  limsApi,
  type Sample,
  type CreateSampleRequest,
} from "../api/lims";
import { useAppStore } from "../store";
import {
  ListPageTemplate,
  type ColumnDef,
  type RowAction,
} from "../components/templates";
import { PageHeader } from "../components/layout";
import { FilterBar, type FilterConfig } from "../components/mui";

// ============ 列定义 ============
const columns: ColumnDef<Sample>[] = [
  {
    id: "sample_no",
    header: "样品编号",
    accessor: "sample_no",
    sortable: true,
    width: 150,
    render: (value) => value || "-",
  },
  {
    id: "name",
    header: "样品名称",
    accessor: "name",
    sortable: true,
    width: 200,
  },
  {
    id: "description",
    header: "描述",
    accessor: "description",
    render: (value) => value || "-",
  },
  {
    id: "status",
    header: "状态",
    accessor: "status",
    render: (value) => {
      const statusColors: Record<string, { bg: string; color: string }> = {
        "待检": { bg: "warning.light", color: "warning.dark" },
        "检验中": { bg: "info.light", color: "info.dark" },
        "已完成": { bg: "success.light", color: "success.dark" },
        "已取消": { bg: "grey.200", color: "grey.700" },
      };
      const colors = statusColors[value] || { bg: "grey.200", color: "grey.700" };
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
    id: "location",
    header: "存放位置",
    accessor: "location",
    render: (value) => value || "-",
  },
  {
    id: "responsible_person",
    header: "负责人",
    accessor: "responsible_person",
    render: (value) => value || "-",
  },
  {
    id: "received_date",
    header: "接收日期",
    accessor: "received_date",
    render: (value) => {
      if (!value) return "-";
      return new Date(value).toLocaleDateString("zh-CN");
    },
  },
];

// ============ 行操作 ============
const getRowActions = (
  onView: (sample: Sample) => void,
  onEdit: (sample: Sample) => void,
  onDelete: (sample: Sample) => void,
): RowAction<Sample>[] => [
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
      { value: "待检", label: "待检" },
      { value: "检验中", label: "检验中" },
      { value: "已完成", label: "已完成" },
      { value: "已取消", label: "已取消" },
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
const LimsSamplePageRefactored: React.FC = () => {
  const navigate = useNavigate();
  const addNotification = useAppStore((state) => state.addNotification);

  // 数据状态
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<{
    items: Sample[];
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

  // 模态框状态
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const [selectedSample, setSelectedSample] = useState<Sample | null>(null);

  // 行选择
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  // 表单数据
  const [formData, setFormData] = useState<Partial<Sample>>({});

  // 获取样品列表
  const fetchSamples = useCallback(async () => {
    setLoading(true);
    try {
      const params: any = {
        page: data.page,
        page_size: data.page_size,
      };
      if (searchText) params.search = searchText;
      if (statusFilter !== "all") params.status = statusFilter;

      const response = await limsApi.listSamples(params);
      if (response.success && response.data) {
        const responseData = response.data as any;
        const items = Array.isArray(responseData)
          ? responseData
          : responseData.items || [];
        setData({
          items: items,
          total: responseData.total || items.length,
          page: responseData.page || 1,
          page_size: responseData.page_size || 10,
        });
      }
    } catch (error: any) {
      addNotification({
        type: "error",
        title: "加载失败",
        message: error.message || "获取样品数据失败",
      });
    } finally {
      setLoading(false);
    }
  }, [data.page, data.page_size, searchText, statusFilter, addNotification]);

  // 处理筛选变化
  const handleFilterChange = useCallback(
    (filterId: string, value: any) => {
      if (filterId === "search") setSearchText(value);
      if (filterId === "status") setStatusFilter(value);
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
  const handleView = useCallback((sample: Sample) => {
    setSelectedSample(sample);
    setShowViewModal(true);
  }, []);

  // 处理编辑
  const handleEdit = useCallback((sample: Sample) => {
    setSelectedSample(sample);
    setFormData(sample);
    setShowEditModal(true);
  }, []);

  // 处理删除
  const handleDelete = useCallback(
    async (sample: Sample) => {
      if (!window.confirm(`确定要删除样品"${sample.name}"吗?`)) return;
      try {
        await limsApi.deleteSample(sample.id);
        addNotification({
          type: "success",
          title: "删除成功",
          message: "样品已删除",
        });
        fetchSamples();
      } catch (error: any) {
        addNotification({
          type: "error",
          title: "删除失败",
          message: error.message || "无法删除样品",
        });
      }
    },
    [addNotification, fetchSamples],
  );

  // 处理创建
  const handleCreate = useCallback(async () => {
    try {
      const createData: CreateSampleRequest = {
        name: formData.name || "",
        description: formData.description || "",
        status: formData.status || "待检",
        project_id: formData.project_id,
        received_date: formData.received_date,
      };
      await limsApi.createSample(createData);
      addNotification({
        type: "success",
        title: "创建成功",
        message: "样品已创建",
      });
      setShowCreateModal(false);
      setFormData({});
      fetchSamples();
    } catch (error: any) {
      addNotification({
        type: "error",
        title: "创建失败",
        message: error.message || "无法创建样品",
      });
    }
  }, [formData, addNotification, fetchSamples]);

  // 处理更新
  const handleUpdate = useCallback(async () => {
    if (!selectedSample) return;
    try {
      await limsApi.updateSample(selectedSample.id, formData as CreateSampleRequest);
      addNotification({
        type: "success",
        title: "更新成功",
        message: "样品已更新",
      });
      setShowEditModal(false);
      setFormData({});
      fetchSamples();
    } catch (error: any) {
      addNotification({
        type: "error",
        title: "更新失败",
        message: error.message || "无法更新样品",
      });
    }
  }, [selectedSample, formData, addNotification, fetchSamples]);

  // 初始加载
  React.useEffect(() => {
    fetchSamples();
  }, [fetchSamples]);

  return (
    <>
      <PageHeader
        title="样品管理"
        subtitle={`共 ${data.total} 个样品`}
        showBack
        onBack={() => navigate(-1)}
        actions={
          <>
            <Button
              variant="outlined"
              startIcon={<Upload style={{ width: 18, height: 18 }} />}
              onClick={() => {
                // TODO: 导入功能
              }}
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
              新建样品
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
        emptyMessage="暂无样品数据"
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
        <DialogTitle>样品详情</DialogTitle>
        <DialogContent>
          {selectedSample && (
            <Box sx={{ pt: 2, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 2 }}>
              <Box>
                <Box component="span" sx={{ color: "text.secondary", fontSize: "0.875rem" }}>
                  样品编号
                </Box>
                <Box>{selectedSample.sample_no || "-"}</Box>
              </Box>
              <Box>
                <Box component="span" sx={{ color: "text.secondary", fontSize: "0.875rem" }}>
                  样品名称
                </Box>
                <Box>{selectedSample.name}</Box>
              </Box>
              <Box>
                <Box component="span" sx={{ color: "text.secondary", fontSize: "0.875rem" }}>
                  状态
                </Box>
                <Box>{selectedSample.status}</Box>
              </Box>
              <Box>
                <Box component="span" sx={{ color: "text.secondary", fontSize: "0.875rem" }}>
                  存放位置
                </Box>
                <Box>{selectedSample.location || "-"}</Box>
              </Box>
              <Box>
                <Box component="span" sx={{ color: "text.secondary", fontSize: "0.875rem" }}>
                  负责人
                </Box>
                <Box>{selectedSample.responsible_person || "-"}</Box>
              </Box>
              <Box>
                <Box component="span" sx={{ color: "text.secondary", fontSize: "0.875rem" }}>
                  接收日期
                </Box>
                <Box>
                  {selectedSample.received_date
                    ? new Date(selectedSample.received_date).toLocaleDateString("zh-CN")
                    : "-"}
                </Box>
              </Box>
              <Box sx={{ gridColumn: "1 / -1" }}>
                <Box component="span" sx={{ color: "text.secondary", fontSize: "0.875rem" }}>
                  描述
                </Box>
                <Box>{selectedSample.description || "-"}</Box>
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
              handleEdit(selectedSample!);
            }}
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
        <DialogTitle>新建样品</DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 2, display: "flex", flexDirection: "column", gap: 2 }}>
            <TextField
              fullWidth
              label="样品名称 *"
              value={formData.name || ""}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="请输入样品名称"
            />
            <TextField
              fullWidth
              label="样品编号"
              value={formData.sample_no || ""}
              onChange={(e) => setFormData({ ...formData, sample_no: e.target.value })}
              placeholder="请输入样品编号"
            />
            <TextField
              fullWidth
              select
              label="状态"
              value={formData.status || "待检"}
              onChange={(e) => setFormData({ ...formData, status: e.target.value })}
              SelectProps={{ native: true }}
            >
              <option value="待检">待检</option>
              <option value="检验中">检验中</option>
              <option value="已完成">已完成</option>
              <option value="已取消">已取消</option>
            </TextField>
            <TextField
              fullWidth
              label="存放位置"
              value={formData.location || ""}
              onChange={(e) => setFormData({ ...formData, location: e.target.value })}
              placeholder="请输入存放位置"
            />
            <TextField
              fullWidth
              label="负责人"
              value={formData.responsible_person || ""}
              onChange={(e) => setFormData({ ...formData, responsible_person: e.target.value })}
              placeholder="请输入负责人"
            />
            <TextField
              fullWidth
              type="date"
              label="接收日期"
              value={formData.received_date || ""}
              onChange={(e) => setFormData({ ...formData, received_date: e.target.value })}
              slotProps={{ inputLabel: { shrink: true } }}
            />
            <TextField
              fullWidth
              label="描述"
              value={formData.description || ""}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="请输入描述"
              multiline
              rows={3}
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowCreateModal(false)}>取消</Button>
          <Button variant="contained" onClick={handleCreate}>
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
        <DialogTitle>编辑样品</DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 2, display: "flex", flexDirection: "column", gap: 2 }}>
            <TextField
              fullWidth
              label="样品名称 *"
              value={formData.name || ""}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="请输入样品名称"
            />
            <TextField
              fullWidth
              label="样品编号"
              value={formData.sample_no || ""}
              onChange={(e) => setFormData({ ...formData, sample_no: e.target.value })}
              placeholder="请输入样品编号"
            />
            <TextField
              fullWidth
              select
              label="状态"
              value={formData.status || "待检"}
              onChange={(e) => setFormData({ ...formData, status: e.target.value })}
              SelectProps={{ native: true }}
            >
              <option value="待检">待检</option>
              <option value="检验中">检验中</option>
              <option value="已完成">已完成</option>
              <option value="已取消">已取消</option>
            </TextField>
            <TextField
              fullWidth
              label="存放位置"
              value={formData.location || ""}
              onChange={(e) => setFormData({ ...formData, location: e.target.value })}
              placeholder="请输入存放位置"
            />
            <TextField
              fullWidth
              label="负责人"
              value={formData.responsible_person || ""}
              onChange={(e) => setFormData({ ...formData, responsible_person: e.target.value })}
              placeholder="请输入负责人"
            />
            <TextField
              fullWidth
              label="描述"
              value={formData.description || ""}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="请输入描述"
              multiline
              rows={3}
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowEditModal(false)}>取消</Button>
          <Button variant="contained" onClick={handleUpdate}>
            更新
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
};

export default LimsSamplePageRefactored;
