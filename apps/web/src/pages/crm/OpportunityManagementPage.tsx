import {
  Button,
  Card,
  CardContent,
  CardHeader,
  Chip,
  Typography,
  Box,
  TextField,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
} from "@mui/material";
import React, { useState, useEffect, useMemo } from "react";
import type {
  Opportunity,
  CreateOpportunityRequest,
  UpdateOpportunityRequest,
} from "@/api/modules/crm/crm";
import { crmApi } from "@/api/modules/crm/crm";
import { useAppStore } from "@/store";
import { logger } from "@/utils/logger";
import { DataExport } from "@/components/common";
import { Plus, Edit, Trash2, Eye, TrendingUp } from "lucide-react";
import { ListPageTemplate } from "@/components/templates";
import type {
  ColumnDef,
  RowAction,
  FilterConfig,
} from "@/components/templates";

const OpportunityManagementPage: React.FC = () => {
  const [opportunities, setOpportunities] = useState<Opportunity[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [stageFilter, setStageFilter] = useState<string>("");
  const [showDialog, setShowDialog] = useState(false);
  const [showDetailDialog, setShowDetailDialog] = useState(false);
  const [selectedOpportunity, setSelectedOpportunity] =
    useState<Opportunity | null>(null);
  const [formData, setFormData] = useState<
    CreateOpportunityRequest & { customer_id?: string }
  >({
    name: "",
    value: undefined,
    probability: undefined,
    close_date: "",
    notes: "",
  });
  const [pagination, setPagination] = useState({
    page: 0,
    pageSize: 20,
    total: 0,
  });

  const { addNotification } = useAppStore();

  useEffect(() => {
    loadOpportunities();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchTerm, stageFilter, pagination.page, pagination.pageSize]);

  const loadOpportunities = async () => {
    try {
      setLoading(true);
      const params: any = {
        page: pagination.page + 1,
        page_size: pagination.pageSize,
      };
      if (searchTerm) params.search = searchTerm;
      if (stageFilter) params.stage = stageFilter;

      const response = await crmApi.opportunities.list(params);
      if (response.success && response.data) {
        setOpportunities(response.data.items || []);
        setPagination((prev) => ({
          ...prev,
          total: response.data?.total || 0,
        }));
      }
    } catch (error) {
      logger.error("加载商机列表失败:", error);
      addNotification({
        type: "error",
        title: "加载失败",
        message: "无法加载商机列表",
      });
    } finally {
      setLoading(false);
    }
  };

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
      loadOpportunities();
    } catch (error) {
      logger.error("操作失败:", error);
      addNotification({
        type: "error",
        title: "操作失败",
        message: selectedOpportunity ? "更新商机失败" : "创建商机失败",
      });
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm("确定要删除这个商机吗?")) return;
    try {
      await crmApi.opportunities.delete(id);
      addNotification({
        type: "success",
        title: "删除成功",
        message: "商机已删除",
      });
      loadOpportunities();
    } catch (error) {
      logger.error("删除失败:", error);
      addNotification({
        type: "error",
        title: "删除失败",
        message: "无法删除商机",
      });
    }
  };

  const handleEdit = (opportunity: Opportunity) => {
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
  };

  const handleViewDetail = (opportunity: Opportunity) => {
    setSelectedOpportunity(opportunity);
    setShowDetailDialog(true);
  };

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

  const getStageBadge = (stage: string) => {
    const stageMap: Record<
      string,
      {
        label: string;
        color:
          | "default"
          | "primary"
          | "secondary"
          | "error"
          | "info"
          | "success"
          | "warning";
      }
    > = {
      lead: { label: "线索", color: "default" },
      qualified: { label: "合格", color: "info" },
      proposal: { label: "提案", color: "primary" },
      negotiation: { label: "谈判", color: "warning" },
      closed_won: { label: "赢单", color: "success" },
      closed_lost: { label: "输单", color: "error" },
    };
    const s = stageMap[stage] || { label: stage, color: "default" };
    return <Chip size="small" color={s.color} label={s.label} />;
  };

  const getFunnelData = () => {
    const stages = [
      "lead",
      "qualified",
      "proposal",
      "negotiation",
      "closed_won",
      "closed_lost",
    ];
    const stageLabels: Record<string, string> = {
      lead: "线索",
      qualified: "合格",
      proposal: "提案",
      negotiation: "谈判",
      closed_won: "赢单",
      closed_lost: "输单",
    };

    return stages.map((stage) => {
      const stageOpportunities = opportunities.filter((o) => o.stage === stage);
      const count = stageOpportunities.length;
      const value = stageOpportunities.reduce(
        (sum, o) => sum + (o.value || 0),
        0,
      );
      return {
        stage,
        label: stageLabels[stage],
        count,
        value,
      };
    });
  };

  const funnelData = getFunnelData();
  const maxValue = Math.max(...funnelData.map((f) => f.value), 1);

  const columns = useMemo<ColumnDef<Opportunity>[]>(
    () => [
      {
        id: "name",
        label: "商机名称",
        render: (row) => (
          <Typography variant="body2" sx={{ fontWeight: 500 }}>
            {row.name}
          </Typography>
        ),
      },
      {
        id: "value",
        label: "金额",
        render: (row) => `¥${(row.value || 0).toLocaleString()}`,
      },
      {
        id: "stage",
        label: "阶段",
        render: (row) => getStageBadge(row.stage),
      },
      {
        id: "probability",
        label: "概率",
        render: (row) => (row.probability ? `${row.probability}%` : "-"),
      },
      {
        id: "close_date",
        label: "预计成交日期",
        render: (row) =>
          row.close_date
            ? new Date(row.close_date).toLocaleDateString("zh-CN")
            : "-",
      },
    ],
    [],
  );

  const rowActions = useMemo<RowAction<Opportunity>[]>(
    () => [
      {
        label: "查看",
        icon: <Eye size={16} />,
        onClick: (row) => handleViewDetail(row),
      },
      {
        label: "编辑",
        icon: <Edit size={16} />,
        onClick: (row) => handleEdit(row),
      },
      {
        label: "删除",
        icon: <Trash2 size={16} />,
        color: "error",
        onClick: (row) => handleDelete(row.id),
        confirm: true,
        confirmMessage: "确定要删除这个商机吗?",
      },
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );

  const filters = useMemo<FilterConfig[]>(
    () => [
      {
        id: "stage",
        label: "阶段",
        type: "select",
        options: [
          { value: "", label: "全部" },
          { value: "lead", label: "线索" },
          { value: "qualified", label: "合格" },
          { value: "proposal", label: "提案" },
          { value: "negotiation", label: "谈判" },
          { value: "closed_won", label: "赢单" },
          { value: "closed_lost", label: "输单" },
        ],
        value: stageFilter,
        onChange: (value) => {
          setStageFilter(value as string);
        },
      },
    ],
    [stageFilter],
  );

  const exportFields = useMemo(
    () => [
      { key: "name", title: "商机名称" },
      { key: "customer_name", title: "客户名称" },
      { key: "stage", title: "商机阶段" },
      { key: "value", title: "商机金额" },
      { key: "probability", title: "概率" },
      { key: "expected_close_date", title: "预计关闭日期" },
      { key: "status", title: "状态" },
    ],
    [],
  );

  return (
    <>
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
                    bgcolor: "primary.main",
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

      <ListPageTemplate<Opportunity>
        title="商机管理"
        subtitle="管理商机信息，跟踪销售机会和成交进度"
        backButton={{
          href: "/dashboard",
        }}
        columns={columns}
        data={opportunities}
        loading={loading}
        searchable
        searchPlaceholder="搜索商机名称..."
        searchValue={searchTerm}
        onSearch={(value) => {
          setSearchTerm(value);
        }}
        filters={filters}
        rowActions={rowActions}
        pagination={{
          page: pagination.page,
          pageSize: pagination.pageSize,
          total: pagination.total,
          onPageChange: (page) => {
            setPagination((prev) => ({ ...prev, page }));
          },
          onPageSizeChange: (pageSize) => {
            setPagination((prev) => ({ ...prev, pageSize, page: 0 }));
          },
        }}
        actions={[
          {
            label: "导出",
            icon: <Eye size={18} />,
            onClick: () => {},
            variant: "outlined",
          },
          {
            label: "新增商机",
            icon: <Plus size={18} />,
            onClick: () => {
              resetForm();
              setShowDialog(true);
            },
            variant: "contained",
          },
        ]}
        headerContent={
          <DataExport
            data={opportunities as unknown as Record<string, unknown>[]}
            fields={exportFields}
            defaultFileName="商机数据"
            buttonText=""
          />
        }
      />

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
                sx={{ gridColumn: "span 2" }}
              />
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
              <Box>
                <Typography variant="caption" color="text.secondary">
                  商机名称
                </Typography>
                <Typography sx={{ fontWeight: "medium" }}>
                  {selectedOpportunity.name}
                </Typography>
              </Box>
              <Box>
                <Typography variant="caption" color="text.secondary">
                  金额
                </Typography>
                <Typography>
                  ¥{(selectedOpportunity.value || 0).toLocaleString()}
                </Typography>
              </Box>
              <Box>
                <Typography variant="caption" color="text.secondary">
                  阶段
                </Typography>
                <Box sx={{ mt: 0.5 }}>
                  {getStageBadge(selectedOpportunity.stage)}
                </Box>
              </Box>
              <Box>
                <Typography variant="caption" color="text.secondary">
                  成交概率
                </Typography>
                <Typography>
                  {selectedOpportunity.probability
                    ? `${selectedOpportunity.probability}%`
                    : "-"}
                </Typography>
              </Box>
              <Box>
                <Typography variant="caption" color="text.secondary">
                  预计成交日期
                </Typography>
                <Typography>
                  {selectedOpportunity.close_date
                    ? new Date(
                        selectedOpportunity.close_date,
                      ).toLocaleDateString("zh-CN")
                    : "-"}
                </Typography>
              </Box>
              <Box>
                <Typography variant="caption" color="text.secondary">
                  创建时间
                </Typography>
                <Typography>
                  {new Date(selectedOpportunity.created_at).toLocaleString(
                    "zh-CN",
                  )}
                </Typography>
              </Box>
              <Box sx={{ gridColumn: "span 2" }}>
                <Typography variant="caption" color="text.secondary">
                  备注
                </Typography>
                <Typography>{selectedOpportunity.notes || "-"}</Typography>
              </Box>
            </Box>
          </DialogContent>
        )}
      </Dialog>
    </>
  );
};

export default OpportunityManagementPage;
