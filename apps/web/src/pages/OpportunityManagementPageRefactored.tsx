/**
 * OpportunityManagementPage 重构版本
 *
 * 重构要点：
 * 1. 使用 ListPageTemplate 替代手写的 Card + Table 布局
 * 2. 使用 ColumnDef 定义表格列
 * 3. 使用 FilterBar 定义筛选器
 * 4. 使用 PageHeader 统一页面头部
 */

import React, { useState, useCallback, useMemo } from "react";
import {
  Box,
  Button,
  Card,
  CardContent,
  CardHeader,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Chip,
  Typography,
} from "@mui/material";
import { Plus, Edit, Trash2, Eye, Download, TrendingUp } from "lucide-react";
import type {
  Opportunity,
  CreateOpportunityRequest,
  UpdateOpportunityRequest,
} from "@/api/crm";
import { crmApi } from "@/api/crm";
import { useAppStore } from "@/store";
import {
  ListPageTemplate,
  type ColumnDef,
  type RowAction,
} from "@/components/templates";
import { PageHeader } from "@/components/layout";
import { FilterBar, type FilterConfig } from "@/components/mui";

// ============ 列定义 ============
const columns: ColumnDef<Opportunity>[] = [
  {
    id: "name",
    header: "商机名称",
    accessor: "name",
    sortable: true,
    width: 200,
  },
  {
    id: "value",
    header: "金额",
    accessor: "value",
    sortable: true,
    width: 120,
    render: (value) => `¥${(value || 0).toLocaleString()}`,
  },
  {
    id: "stage",
    header: "阶段",
    accessor: "stage",
    render: (value) => {
      const stageMap: Record<string, { label: string; color: "default" | "primary" | "secondary" | "error" | "info" | "success" | "warning" }> = {
        lead: { label: "线索", color: "default" },
        qualified: { label: "合格", color: "info" },
        proposal: { label: "提案", color: "primary" },
        negotiation: { label: "谈判", color: "warning" },
        closed_won: { label: "赢单", color: "success" },
        closed_lost: { label: "输单", color: "error" },
      };
      const stage = stageMap[value] || { label: value, color: "default" as const };
      return <Chip size="small" color={stage.color} label={stage.label} />;
    },
  },
  {
    id: "probability",
    header: "概率",
    accessor: "probability",
    width: 80,
    render: (value) => (value ? `${value}%` : "-"),
  },
  {
    id: "close_date",
    header: "预计成交日期",
    accessor: "close_date",
    width: 140,
    render: (value) =>
      value ? new Date(value).toLocaleDateString("zh-CN") : "-",
  },
];

// ============ 行操作 ============
const getRowActions = (
  onView: (opportunity: Opportunity) => void,
  onEdit: (opportunity: Opportunity) => void,
  onDelete: (opportunity: Opportunity) => void,
): RowAction<Opportunity>[] => [
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
    placeholder: "搜索商机名称...",
  },
  {
    id: "stage",
    label: "阶段",
    type: "select",
    options: [
      { value: "all", label: "全部阶段" },
      { value: "lead", label: "线索" },
      { value: "qualified", label: "合格" },
      { value: "proposal", label: "提案" },
      { value: "negotiation", label: "谈判" },
      { value: "closed_won", label: "赢单" },
      { value: "closed_lost", label: "输单" },
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
const OpportunityManagementPage: React.FC = () => {
  const addNotification = useAppStore((state) => state.addNotification);

  // 数据状态
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<{
    items: Opportunity[];
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
  const [stageFilter, setStageFilter] = useState("all");

  // 模态框状态
  const [showDialog, setShowDialog] = useState(false);
  const [showDetailDialog, setShowDetailDialog] = useState(false);
  const [selectedOpportunity, setSelectedOpportunity] = useState<Opportunity | null>(null);

  // 行选择
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  // 表单数据
  const [formData, setFormData] = useState<
    CreateOpportunityRequest & { customer_id?: string }
  >({
    name: "",
    value: undefined,
    probability: undefined,
    close_date: "",
    notes: "",
  });

  // 获取商机列表
  const fetchOpportunities = useCallback(async () => {
    setLoading(true);
    try {
      const params: any = {
        page: data.page,
        pageSize: data.page_size,
      };
      if (searchText) params.search = searchText;
      if (stageFilter !== "all") params.stage = stageFilter;

      const response = await crmApi.opportunities.list(params);
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
        message: error.message || "获取商机数据失败",
      });
    } finally {
      setLoading(false);
    }
  }, [data.page, data.page_size, searchText, stageFilter, addNotification]);

  // 处理筛选变化
  const handleFilterChange = useCallback(
    (filterId: string, value: any) => {
      if (filterId === "search") setSearchText(value);
      if (filterId === "stage") setStageFilter(value);
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
  const handleView = useCallback((opportunity: Opportunity) => {
    setSelectedOpportunity(opportunity);
    setShowDetailDialog(true);
  }, []);

  // 处理编辑
  const handleEdit = useCallback((opportunity: Opportunity) => {
    setSelectedOpportunity(opportunity);
    setFormData({
      name: opportunity.name,
      customer_id: opportunity.customer_id,
      value: opportunity.value,
      probability: opportunity.probability,
      close_date: opportunity.close_date || "",
      notes: opportunity.notes || "",
    });
    setShowDialog(true);
  }, []);

  // 处理删除
  const handleDelete = useCallback(
    async (opportunity: Opportunity) => {
      if (!window.confirm(`确定要删除商机"${opportunity.name}"吗?`)) return;
      try {
        await crmApi.opportunities.delete(opportunity.id);
        addNotification({
          type: "success",
          title: "删除成功",
          message: "商机已删除",
        });
        fetchOpportunities();
      } catch (error: any) {
        addNotification({
          type: "error",
          title: "删除失败",
          message: error.message || "无法删除商机",
        });
      }
    },
    [addNotification, fetchOpportunities],
  );

  // 处理表单提交
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (selectedOpportunity) {
        await crmApi.opportunities.update(
          selectedOpportunity.id,
          formData as UpdateOpportunityRequest,
        );
        addNotification({
          type: "success",
          title: "更新成功",
          message: "商机信息已更新",
        });
      } else {
        await crmApi.opportunities.create(formData);
        addNotification({
          type: "success",
          title: "创建成功",
          message: "新商机已创建",
        });
      }
      setShowDialog(false);
      resetForm();
      fetchOpportunities();
    } catch (error: any) {
      addNotification({
        type: "error",
        title: "操作失败",
        message: selectedOpportunity ? "更新商机失败" : "创建商机失败",
      });
    }
  };

  // 处理批量删除
  const handleBatchDelete = useCallback(async () => {
    if (selectedIds.length === 0) return;
    if (!window.confirm(`确定要删除选中的 ${selectedIds.length} 个商机吗?`)) return;
    try {
      await crmApi.opportunities.batchDelete(selectedIds);
      addNotification({
        type: "success",
        title: "删除成功",
        message: `已删除 ${selectedIds.length} 个商机`,
      });
      setSelectedIds([]);
      fetchOpportunities();
    } catch (error: any) {
      addNotification({
        type: "error",
        title: "删除失败",
        message: error.message || "批量删除失败",
      });
    }
  }, [selectedIds, addNotification, fetchOpportunities]);

  // 重置表单
  const resetForm = () => {
    setSelectedOpportunity(null);
    setFormData({
      name: "",
      value: undefined,
      probability: undefined,
      close_date: "",
      notes: "",
    });
  };

  // 初始加载
  React.useEffect(() => {
    fetchOpportunities();
  }, [fetchOpportunities]);

  // 计算销售漏斗数据
  const funnelData = useMemo(() => {
    const stages = [
      { key: "lead", label: "线索", color: "#3b82f6" },
      { key: "qualified", label: "合格", color: "#8b5cf6" },
      { key: "proposal", label: "提案", color: "#f59e0b" },
      { key: "negotiation", label: "谈判", color: "#f97316" },
      { key: "closed_won", label: "赢单", color: "#10b981" },
      { key: "closed_lost", label: "输单", color: "#ef4444" },
    ];

    return stages.map(({ key, label, color }) => {
      const stageOpportunities = data.items.filter((o) => o.stage === key);
      const count = stageOpportunities.length;
      const value = stageOpportunities.reduce((sum, o) => sum + (o.value || 0), 0);
      return { stage: key, label, count, value, color };
    });
  }, [data.items]);

  const maxValue = useMemo(
    () => Math.max(...funnelData.map((f) => f.value), 1),
    [funnelData],
  );

  return (
    <>
      <PageHeader
        title="商机管理"
        subtitle={`共 ${data.total} 个商机`}
        actions={
          <>
            <Button
              variant="contained"
              startIcon={<Plus style={{ width: 18, height: 18 }} />}
              onClick={() => {
                resetForm();
                setShowDialog(true);
              }}
            >
              新增商机
            </Button>
          </>
        }
      />

      {/* 销售漏斗可视化 */}
      <Card sx={{ mb: 3 }}>
        <CardHeader>
          <Typography
            variant="h6"
            sx={{
              fontWeight: 600,
              display: "flex",
              alignItems: "center",
              gap: 1,
            }}
          >
            <TrendingUp style={{ width: 20, height: 20 }} />
            销售漏斗
          </Typography>
          <Typography variant="body2" sx={{ color: "grey.500" }}>
            各阶段商机数量与金额统计
          </Typography>
        </CardHeader>
        <CardContent>
          <Box
            sx={{
              display: "grid",
              gridTemplateColumns: {
                xs: "1fr",
                md: "repeat(3, 1fr)",
                lg: "repeat(6, 1fr)",
              },
              gap: 2,
            }}
          >
            {funnelData.map((item) => (
              <Card
                key={item.stage}
                sx={{ position: "relative", overflow: "hidden" }}
              >
                <Box
                  sx={{
                    position: "absolute",
                    bottom: 0,
                    left: 0,
                    right: 0,
                    bgcolor: item.color,
                    opacity: 0.1,
                    transition: "height 0.3s",
                    height: `${(item.value / maxValue) * 100}%`,
                  }}
                />
                <CardContent sx={{ position: "relative", p: 2 }}>
                  <Typography variant="body2" color="text.secondary">
                    {item.label}
                  </Typography>
                  <Typography variant="h5" sx={{ fontWeight: "bold" }}>
                    {item.count}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    ¥{item.value.toLocaleString()}
                  </Typography>
                </CardContent>
              </Card>
            ))}
          </Box>
        </CardContent>
      </Card>

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
        emptyMessage="暂无商机数据"
        selection={{
          selected: selectedIds,
          onChange: handleSelectionChange,
        }}
        batchActions={batchActions}
      />

      {/* 新增/编辑对话框 */}
      <Dialog
        open={showDialog}
        onClose={() => setShowDialog(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          {selectedOpportunity ? "编辑商机" : "新增商机"}
        </DialogTitle>
        <form onSubmit={handleSubmit}>
          <DialogContent>
            <Box
              sx={{
                display: "grid",
                gridTemplateColumns: "repeat(2, 1fr)",
                gap: 2,
                pt: 1,
              }}
            >
              <TextField
                label="商机名称 *"
                required
                value={formData.name}
                onChange={(e) =>
                  setFormData({ ...formData, name: e.target.value })
                }
                fullWidth
                sx={{ gridColumn: "span 2" }}
              />
              <TextField
                label="金额"
                type="number"
                value={formData.value || ""}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    value: e.target.value ? Number(e.target.value) : undefined,
                  })
                }
                fullWidth
              />
              <TextField
                label="成交概率 (%)"
                type="number"
                value={formData.probability || ""}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    probability: e.target.value
                      ? Number(e.target.value)
                      : undefined,
                  })
                }
                fullWidth
              />
              <TextField
                label="预计成交日期"
                type="date"
                value={formData.close_date}
                onChange={(e) =>
                  setFormData({ ...formData, close_date: e.target.value })
                }
                fullWidth
              />
              {selectedOpportunity && (
                <FormControl fullWidth>
                  <InputLabel>阶段</InputLabel>
                  <Select
                    value={selectedOpportunity.stage}
                    label="阶段"
                    onChange={(e) =>
                      setSelectedOpportunity({
                        ...selectedOpportunity,
                        stage: e.target.value,
                      })
                    }
                  >
                    <MenuItem value="lead">线索</MenuItem>
                    <MenuItem value="qualified">合格</MenuItem>
                    <MenuItem value="proposal">提案</MenuItem>
                    <MenuItem value="negotiation">谈判</MenuItem>
                    <MenuItem value="closed_won">赢单</MenuItem>
                    <MenuItem value="closed_lost">输单</MenuItem>
                  </Select>
                </FormControl>
              )}
              <TextField
                label="备注"
                multiline
                rows={3}
                value={formData.notes}
                onChange={(e) =>
                  setFormData({ ...formData, notes: e.target.value })
                }
                fullWidth
                sx={{ gridColumn: "span 2" }}
              />
            </Box>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setShowDialog(false)}>取消</Button>
            <Button type="submit" variant="contained">
              保存
            </Button>
          </DialogActions>
        </form>
      </Dialog>

      {/* 详情对话框 */}
      <Dialog
        open={showDetailDialog}
        onClose={() => setShowDetailDialog(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>商机详情</DialogTitle>
        {selectedOpportunity && (
          <DialogContent>
            <Box
              sx={{
                display: "grid",
                gridTemplateColumns: "repeat(2, 1fr)",
                gap: 2,
              }}
            >
              <Box sx={{ gridColumn: "span 2" }}>
                <Box component="span" sx={{ color: "text.secondary", fontSize: "0.875rem" }}>
                  商机名称
                </Box>
                <Box sx={{ fontWeight: "medium" }}>{selectedOpportunity.name}</Box>
              </Box>
              <Box>
                <Box component="span" sx={{ color: "text.secondary", fontSize: "0.875rem" }}>
                  金额
                </Box>
                <Box>¥{(selectedOpportunity.value || 0).toLocaleString()}</Box>
              </Box>
              <Box>
                <Box component="span" sx={{ color: "text.secondary", fontSize: "0.875rem" }}>
                  阶段
                </Box>
                <Box sx={{ mt: 0.5 }}>
                  {(() => {
                    const stageMap: Record<string, { label: string; color: "default" | "primary" | "secondary" | "error" | "info" | "success" | "warning" }> = {
                      lead: { label: "线索", color: "default" },
                      qualified: { label: "合格", color: "info" },
                      proposal: { label: "提案", color: "primary" },
                      negotiation: { label: "谈判", color: "warning" },
                      closed_won: { label: "赢单", color: "success" },
                      closed_lost: { label: "输单", color: "error" },
                    };
                    const stage = stageMap[selectedOpportunity.stage] || { label: selectedOpportunity.stage, color: "default" as const };
                    return <Chip size="small" color={stage.color} label={stage.label} />;
                  })()}
                </Box>
              </Box>
              <Box>
                <Box component="span" sx={{ color: "text.secondary", fontSize: "0.875rem" }}>
                  成交概率
                </Box>
                <Box>{selectedOpportunity.probability ? `${selectedOpportunity.probability}%` : "-"}</Box>
              </Box>
              <Box>
                <Box component="span" sx={{ color: "text.secondary", fontSize: "0.875rem" }}>
                  预计成交日期
                </Box>
                <Box>
                  {selectedOpportunity.close_date
                    ? new Date(selectedOpportunity.close_date).toLocaleDateString("zh-CN")
                    : "-"}
                </Box>
              </Box>
              <Box>
                <Box component="span" sx={{ color: "text.secondary", fontSize: "0.875rem" }}>
                  创建时间
                </Box>
                <Box>{new Date(selectedOpportunity.created_at).toLocaleString("zh-CN")}</Box>
              </Box>
              <Box>
                <Box component="span" sx={{ color: "text.secondary", fontSize: "0.875rem" }}>
                  更新时间
                </Box>
                <Box>{new Date(selectedOpportunity.updated_at).toLocaleString("zh-CN")}</Box>
              </Box>
              <Box sx={{ gridColumn: "span 2" }}>
                <Box component="span" sx={{ color: "text.secondary", fontSize: "0.875rem" }}>
                  备注
                </Box>
                <Box>{selectedOpportunity.notes || "-"}</Box>
              </Box>
            </Box>
          </DialogContent>
        )}
        <DialogActions>
          <Button onClick={() => setShowDetailDialog(false)}>关闭</Button>
          <Button
            variant="contained"
            onClick={() => {
              setShowDetailDialog(false);
              handleEdit(selectedOpportunity!);
            }}
          >
            编辑
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
};

export default OpportunityManagementPage;
