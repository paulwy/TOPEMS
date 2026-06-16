/**
 * HrmCompanyPage 重构后
 *
 * 重构要点：
 * 1. 使用 ListPageTemplate 替代手写的 Card + Table 布局
 * 2. 使用 ColumnDef 定义表格列
 * 3. 使用 FilterBar 定义筛选器
 * 4. 使用 PageHeader 统一页面头部
 * 5. 保持业务逻辑不变
 * 6. 主题色使用蓝色 (#3b82f6)
 */

import React, { useState, useCallback, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import {
  Box,
  Chip,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Typography,
  Paper,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
} from "@mui/material";
import {
  Building,
  Phone,
  Mail,
  MapPin,
  Plus,
  Eye,
  Edit,
  Trash2,
} from "lucide-react";
import {
  companyApi,
  type Company,
  type PaginatedResult,
} from "../api/hrm";
import { useAppStore } from "../store";
import {
  ListPageTemplate,
  StatCardGroup,
  type ColumnDef,
  type RowAction,
} from "../components/mui";
import { FilterBar, type FilterConfig } from "../components/mui/FilterBar";
import { PageHeader } from "../components/layout";

// ============ 列定义 ============
const getColumns = (
  getStatusBadge: (status: string) => React.ReactElement,
): ColumnDef<Company>[] => [
  {
    id: "name",
    label: "公司名称",
    minWidth: 200,
    render: (row: Company) => (
      <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
        <Box
          sx={{
            width: 40,
            height: 40,
            borderRadius: 1,
            background: "linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Building sx={{ width: 20, height: 20, color: "white" }} />
        </Box>
        <Box>
          <Typography variant="body2" sx={{ fontWeight: 500 }}>
            {row.name || "-"}
          </Typography>
          {row.short_name && (
            <Typography variant="caption" color="text.secondary">
              {row.short_name}
            </Typography>
          )}
        </Box>
      </Box>
    ),
  },
  {
    id: "contact_phone",
    label: "联系电话",
    minWidth: 140,
    render: (row: Company) => (
      <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
        <Phone sx={{ width: 16, height: 16, color: "text.secondary" }} />
        <Typography variant="body2">{row.contact_phone || "-"}</Typography>
      </Box>
    ),
  },
  {
    id: "email",
    label: "邮箱",
    minWidth: 180,
    render: (row: Company) => (
      <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
        <Mail sx={{ width: 16, height: 16, color: "text.secondary" }} />
        <Typography variant="body2" sx={{ fontSize: "0.8125rem" }}>
          {row.email || "-"}
        </Typography>
      </Box>
    ),
  },
  {
    id: "address",
    label: "地址",
    minWidth: 200,
    render: (row: Company) => (
      <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
        <MapPin sx={{ width: 16, height: 16, color: "text.secondary" }} />
        <Typography
          variant="body2"
          sx={{
            maxWidth: 200,
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
          }}
        >
          {row.address || "-"}
        </Typography>
      </Box>
    ),
  },
  {
    id: "status",
    label: "状态",
    width: 100,
    render: (row: Company) => getStatusBadge(row.status),
  },
];

// ============ 行操作 ============
const getRowActions = (
  onView: (record: Company) => void,
  onEdit: (record: Company) => void,
  onDelete: (record: Company) => void,
): RowAction<Company>[] => [
  {
    label: "查看",
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
    placeholder: "搜索公司名称、编码或邮箱...",
    width: 250,
  },
  {
    id: "status",
    label: "状态",
    type: "select",
    options: [
      { label: "全部状态", value: "all" },
      { label: "启用", value: "active" },
      { label: "禁用", value: "inactive" },
      { label: "归档", value: "archived" },
    ],
  },
];

// ============ 组件 ============
const HrmCompanyPage: React.FC = () => {
  const navigate = useNavigate();
  const addNotification = useAppStore((state) => state.addNotification);

  // 数据状态
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<PaginatedResult<Company>>({
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
  const [selectedCompany, setSelectedCompany] = useState<Company | null>(null);

  // 表单数据
  const [formData, setFormData] = useState<Partial<Company>>({});

  // 状态徽章
  const getStatusBadge = useCallback((status: string) => {
    const config: Record<string, { color: "success" | "default" | "warning"; label: string }> = {
      active: { color: "success", label: "启用" },
      inactive: { color: "default", label: "禁用" },
      archived: { color: "warning", label: "归档" },
    };
    const c = config[status] || { color: "default", label: status };
    return (
      <Chip size="small" color={c.color} label={c.label} sx={{ fontWeight: 500 }} />
    );
  }, []);

  // 获取公司列表
  const fetchCompanies = useCallback(
    async (params?: any) => {
      setLoading(true);
      try {
        const response = await companyApi.list(params);
        if (response.code === 200 && response.data) {
          setData(response.data as PaginatedResult<Company>);
        }
      } catch (error: any) {
        addNotification({
          title: "失败",
          message: error.message || "获取公司数据失败",
          type: "error",
        });
      } finally {
        setLoading(false);
      }
    },
    [addNotification],
  );

  // 初始加载
  React.useEffect(() => {
    fetchCompanies();
  }, [fetchCompanies]);

  // 搜索处理
  const handleSearch = useCallback(() => {
    const params: any = {};
    if (searchText) params.search = searchText;
    if (statusFilter !== "all") params.status = statusFilter;
    fetchCompanies(params);
  }, [searchText, statusFilter, fetchCompanies]);

  // 重置筛选
  const handleReset = useCallback(() => {
    setSearchText("");
    setStatusFilter("all");
    fetchCompanies();
  }, [fetchCompanies]);

  // 新增
  const handleAdd = useCallback(() => {
    setSelectedCompany(null);
    setFormData({
      status: "active",
      organization_id: "00000000-0000-0000-0000-000000000001",
    });
    setShowCreateModal(true);
  }, []);

  // 编辑
  const handleEdit = useCallback((record: Company) => {
    setSelectedCompany(record);
    setFormData(record);
    setShowEditModal(true);
  }, []);

  // 查看
  const handleView = useCallback((record: Company) => {
    setSelectedCompany(record);
    setShowViewModal(true);
  }, []);

  // 删除
  const handleDelete = useCallback(
    async (record: Company) => {
      if (!confirm(`确定要删除公司"${record.name}"吗？`)) return;
      try {
        await companyApi.delete(record.id);
        addNotification({
          title: "成功",
          message: "删除成功",
          type: "success",
        });
        fetchCompanies();
      } catch (error: any) {
        addNotification({
          title: "失败",
          message: error.message || "删除失败",
          type: "error",
        });
      }
    },
    [addNotification, fetchCompanies],
  );

  // 创建
  const handleCreate = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      try {
        await companyApi.create(formData);
        addNotification({
          title: "成功",
          message: "创建成功",
          type: "success",
        });
        setShowCreateModal(false);
        setFormData({ status: "active" });
        fetchCompanies();
      } catch (error: any) {
        addNotification({
          title: "失败",
          message: error.message || "创建失败",
          type: "error",
        });
      }
    },
    [addNotification, formData, fetchCompanies],
  );

  // 更新
  const handleUpdate = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      if (!selectedCompany) return;
      try {
        await companyApi.update(selectedCompany.id, formData);
        addNotification({
          title: "成功",
          message: "更新成功",
          type: "success",
        });
        setShowEditModal(false);
        setSelectedCompany(null);
        fetchCompanies();
      } catch (error: any) {
        addNotification({
          title: "失败",
          message: error.message || "更新失败",
          type: "error",
        });
      }
    },
    [addNotification, selectedCompany, formData, fetchCompanies],
  );

  // 输入变化
  const handleInputChange = useCallback((field: string, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  }, []);

  // 统计卡片数据
  const stats = useMemo(() => {
    const items = data.items || [];
    return {
      total: items.length,
      active: items.filter((c) => c.status === "active").length,
      inactive: items.filter((c) => c.status === "inactive").length,
      archived: items.filter((c) => c.status === "archived").length,
    };
  }, [data.items]);

  const statCards = useMemo(
    () => [
      {
        id: "total",
        title: "公司总数",
        value: stats.total,
        icon: <Building style={{ width: 24, height: 24 }} />,
        color: "primary" as const,
      },
      {
        id: "active",
        title: "启用",
        value: stats.active,
        icon: <Building style={{ width: 24, height: 24 }} />,
        color: "success" as const,
      },
      {
        id: "inactive",
        title: "禁用",
        value: stats.inactive,
        icon: <Building style={{ width: 24, height: 24 }} />,
        color: "secondary" as const,
      },
      {
        id: "archived",
        title: "归档",
        value: stats.archived,
        icon: <Building style={{ width: 24, height: 24 }} />,
        color: "warning" as const,
      },
    ],
    [stats],
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
        title="公司管理"
        subtitle={`共 ${data.total} 家公司`}
        backButton={{ onClick: () => navigate(-1) }}
        actions={[
          {
            label: "新增公司",
            icon: <Plus style={{ width: 18, height: 18 }} />,
            onClick: handleAdd,
            variant: "contained",
          },
        ]}
      />

      {/* 统计概览 */}
      <Paper sx={{ mb: 3, borderRadius: 2, p: 2 }}>
        <StatCardGroup stats={statCards} columns={4} />
      </Paper>

      {/* 筛选栏 */}
      <FilterBar
        filters={filterConfigs}
        onFilterChange={handleFilterChange}
        onReset={handleReset}
        onSearch={handleSearch}
      />

      {/* 数据列表 */}
      <Paper sx={{ borderRadius: 2, mt: 3 }}>
        <ListPageTemplate
          title="公司列表"
          columns={columns}
          data={data.items}
          loading={loading}
          pagination={{
            page: data.page - 1,
            pageSize: data.page_size,
            total: data.total,
            onPageChange: (page) => fetchCompanies({ page: page + 1 }),
            onPageSizeChange: (pageSize) => fetchCompanies({ page_size: pageSize }),
          }}
          rowActions={rowActions}
          onRowClick={handleView}
          emptyMessage="暂无公司数据"
        />
      </Paper>

      {/* 查看详情模态框 */}
      <Dialog open={showViewModal} onClose={() => setShowViewModal(false)} maxWidth="md" fullWidth>
        <DialogTitle>公司详情</DialogTitle>
        <DialogContent>
          {selectedCompany && (
            <Box sx={{ display: "grid", gridTemplateColumns: 2, gap: 2, pt: 1 }}>
              <Box>
                <Typography variant="caption" color="text.secondary">公司名称</Typography>
                <Typography variant="body2" sx={{ fontWeight: 500 }}>{selectedCompany.name || "-"}</Typography>
              </Box>
              <Box>
                <Typography variant="caption" color="text.secondary">简称</Typography>
                <Typography variant="body2">{selectedCompany.short_name || "-"}</Typography>
              </Box>
              <Box>
                <Typography variant="caption" color="text.secondary">注册号</Typography>
                <Typography variant="body2">{selectedCompany.registration_number || "-"}</Typography>
              </Box>
              <Box>
                <Typography variant="caption" color="text.secondary">税号</Typography>
                <Typography variant="body2">{selectedCompany.tax_number || "-"}</Typography>
              </Box>
              <Box>
                <Typography variant="caption" color="text.secondary">联系电话</Typography>
                <Typography variant="body2">{selectedCompany.contact_phone || "-"}</Typography>
              </Box>
              <Box>
                <Typography variant="caption" color="text.secondary">邮箱</Typography>
                <Typography variant="body2">{selectedCompany.email || "-"}</Typography>
              </Box>
              <Box sx={{ gridColumn: "span 2" }}>
                <Typography variant="caption" color="text.secondary">地址</Typography>
                <Typography variant="body2">{selectedCompany.address || "-"}</Typography>
              </Box>
              <Box>
                <Typography variant="caption" color="text.secondary">状态</Typography>
                <Box sx={{ mt: 0.5 }}>{getStatusBadge(selectedCompany.status)}</Box>
              </Box>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowViewModal(false)}>关闭</Button>
          <Button variant="contained" onClick={() => { setShowViewModal(false); handleEdit(selectedCompany!); }} sx={{ bgcolor: "#3b82f6" }}>
            编辑
          </Button>
        </DialogActions>
      </Dialog>

      {/* 创建/编辑模态框 */}
      <Dialog open={showCreateModal || showEditModal} onClose={() => { setShowCreateModal(false); setShowEditModal(false); }} maxWidth="md" fullWidth>
        <DialogTitle>{showCreateModal ? "新增公司" : "编辑公司"}</DialogTitle>
        <DialogContent>
          <Box component="form" onSubmit={showCreateModal ? handleCreate : handleUpdate} sx={{ display: "grid", gap: 2, pt: 1 }}>
            <TextField
              label="公司名称"
              size="small"
              value={(formData as Company)?.name || ""}
              onChange={(e) => handleInputChange("name", e.target.value)}
              required
            />

            <TextField
              label="公司简称"
              size="small"
              value={(formData as Company)?.short_name || ""}
              onChange={(e) => handleInputChange("short_name", e.target.value)}
            />

            <Box sx={{ display: "grid", gridTemplateColumns: 2, gap: 2 }}>
              <TextField
                label="注册号"
                size="small"
                value={(formData as Company)?.registration_number || ""}
                onChange={(e) => handleInputChange("registration_number", e.target.value)}
              />
              <TextField
                label="税号"
                size="small"
                value={(formData as Company)?.tax_number || ""}
                onChange={(e) => handleInputChange("tax_number", e.target.value)}
              />
            </Box>

            <TextField
              label="地址"
              size="small"
              multiline
              rows={2}
              value={(formData as Company)?.address || ""}
              onChange={(e) => handleInputChange("address", e.target.value)}
            />

            <Box sx={{ display: "grid", gridTemplateColumns: 2, gap: 2 }}>
              <TextField
                label="联系电话"
                size="small"
                value={(formData as Company)?.contact_phone || ""}
                onChange={(e) => handleInputChange("contact_phone", e.target.value)}
              />
              <TextField
                label="邮箱"
                type="email"
                size="small"
                value={(formData as Company)?.email || ""}
                onChange={(e) => handleInputChange("email", e.target.value)}
              />
            </Box>

            <TextField
              label="网站"
              size="small"
              value={(formData as Company)?.website || ""}
              onChange={(e) => handleInputChange("website", e.target.value)}
            />

            <FormControl size="small" fullWidth>
              <InputLabel>状态</InputLabel>
              <Select
                value={(formData as Company)?.status || "active"}
                label="状态"
                onChange={(e) => handleInputChange("status", e.target.value)}
              >
                <MenuItem value="active">启用</MenuItem>
                <MenuItem value="inactive">禁用</MenuItem>
                <MenuItem value="archived">归档</MenuItem>
              </Select>
            </FormControl>

            <DialogActions sx={{ p: 0, pt: 2, justifyContent: "flex-end" }}>
              <Button onClick={() => { setShowCreateModal(false); setShowEditModal(false); }} variant="outlined">取消</Button>
              <Button type="submit" variant="contained" sx={{ bgcolor: "#3b82f6" }}>{showCreateModal ? "创建" : "保存"}</Button>
            </DialogActions>
          </Box>
        </DialogContent>
      </Dialog>
    </Box>
  );
};

export default HrmCompanyPage;