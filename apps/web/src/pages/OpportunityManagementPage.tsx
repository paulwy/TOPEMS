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
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Checkbox,
  Stack,
  Paper,
  IconButton,
  Pagination,
} from "@mui/material";
import React, { useState, useEffect } from "react";
import type {
  Opportunity,
  CreateOpportunityRequest,
  UpdateOpportunityRequest,
} from "@/api/crm";
import { crmApi } from "@/api/crm";
import { useAppStore } from "@/store";
import { LoadingSpinner } from "@/components/LoadingSpinner";
import { EmptyState } from "@/components/EmptyState";
import { Search, Plus, Edit, Trash2, Eye, TrendingUp } from "lucide-react";

const OpportunityManagementPage: React.FC = () => {
  const [opportunities, setOpportunities] = useState<Opportunity[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [stageFilter, setStageFilter] = useState<string>("all");
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [total, setTotal] = useState(0);
  const [showDialog, setShowDialog] = useState(false);
  const [showDetailDialog, setShowDetailDialog] = useState(false);
  const [selectedOpportunity, setSelectedOpportunity] =
    useState<Opportunity | null>(null);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [formData, setFormData] = useState<
    CreateOpportunityRequest & { customer_id?: string }
  >({
    name: "",
    value: undefined,
    probability: undefined,
    close_date: "",
    notes: "",
  });

  const { addNotification } = useAppStore();

  useEffect(() => {
    loadOpportunities();
  }, [currentPage, pageSize, searchTerm, stageFilter]);

  const loadOpportunities = async () => {
    try {
      setLoading(true);
      const params: any = {
        page: currentPage,
        pageSize,
      };
      if (searchTerm) params.search = searchTerm;
      if (stageFilter !== "all") params.stage = stageFilter;

      const response = await crmApi.opportunities.list(params);
      if (response.success && response.data) {
        setOpportunities(response.data.items || []);
        setTotal(response.data.total || 0);
      }
    } catch (error) {
      console.error("加载商机列表失败:", error);
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
      console.error("操作失败:", error);
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
      console.error("删除失败:", error);
      addNotification({
        type: "error",
        title: "删除失败",
        message: "无法删除商机",
      });
    }
  };

  const handleBatchDelete = async () => {
    if (selectedIds.length === 0) return;
    if (!window.confirm(`确定要删除选中的 ${selectedIds.length} 个商机吗?`))
      return;
    try {
      await crmApi.opportunities.batchDelete(selectedIds);
      addNotification({
        type: "success",
        title: "删除成功",
        message: `已删除 ${selectedIds.length} 个商机`,
      });
      setSelectedIds([]);
      loadOpportunities();
    } catch (error) {
      console.error("批量删除失败:", error);
      addNotification({
        type: "error",
        title: "删除失败",
        message: "批量删除失败",
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

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id],
    );
  };

  const toggleSelectAll = () => {
    if (selectedIds.length === opportunities.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(opportunities.map((o) => o.id));
    }
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

  // 计算销售漏斗数据
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

  const handlePageChange = (_: React.ChangeEvent<any>, page: number) => {
    setCurrentPage(page);
  };

  if (loading) return <LoadingSpinner />;

  return (
    <Box sx={{ mt: 3 }}>
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

      {/* 商机列表 */}
      <Card>
        <CardHeader>
          <Typography variant="h6" sx={{ fontWeight: 600 }}>
            商机管理
          </Typography>
          <Typography variant="body2" sx={{ color: "grey.500" }}>
            管理商机信息,跟踪销售机会和成交进度
          </Typography>
        </CardHeader>
        <CardContent>
          <Stack
            direction={{ xs: "column", sm: "row" }}
            spacing={2}
            sx={{ mb: 3 }}
          >
            <Box sx={{ flex: 1, position: "relative" }}>
              <Search
                style={{
                  position: "absolute",
                  left: 8,
                  top: "50%",
                  transform: "translateY(-50%)",
                  width: 16,
                  height: 16,
                  color: "gray",
                }}
              />
              <TextField
                size="small"
                placeholder="搜索商机名称..."
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                  setCurrentPage(1);
                }}
                sx={{ pl: 5, width: "100%" }}
              />
            </Box>
            <FormControl size="small" sx={{ minWidth: 150 }}>
              <InputLabel>阶段筛选</InputLabel>
              <Select
                value={stageFilter}
                label="阶段筛选"
                onChange={(e) => {
                  setStageFilter(e.target.value);
                  setCurrentPage(1);
                }}
              >
                <MenuItem value="all">全部阶段</MenuItem>
                <MenuItem value="lead">线索</MenuItem>
                <MenuItem value="qualified">合格</MenuItem>
                <MenuItem value="proposal">提案</MenuItem>
                <MenuItem value="negotiation">谈判</MenuItem>
                <MenuItem value="closed_won">赢单</MenuItem>
                <MenuItem value="closed_lost">输单</MenuItem>
              </Select>
            </FormControl>
            <Button
              variant="contained"
              onClick={() => {
                resetForm();
                setShowDialog(true);
              }}
              startIcon={<Plus style={{ width: 16, height: 16 }} />}
            >
              新增商机
            </Button>
          </Stack>

          {selectedIds.length > 0 && (
            <Paper sx={{ p: 1.5, mb: 2, bgcolor: "grey.100" }}>
              <Stack
                direction="row"
                sx={{ justifyContent: "space-between", alignItems: "center" }}
              >
                <Typography variant="body2">
                  已选择 {selectedIds.length} 个商机
                </Typography>
                <Button
                  variant="contained"
                  color="error"
                  size="small"
                  onClick={handleBatchDelete}
                  startIcon={<Trash2 style={{ width: 16, height: 16 }} />}
                >
                  批量删除
                </Button>
              </Stack>
            </Paper>
          )}

          <TableContainer component={Paper} variant="outlined">
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell padding="checkbox">
                    <Checkbox
                      checked={
                        selectedIds.length === opportunities.length &&
                        opportunities.length > 0
                      }
                      onChange={toggleSelectAll}
                    />
                  </TableCell>
                  <TableCell>商机名称</TableCell>
                  <TableCell>金额</TableCell>
                  <TableCell>阶段</TableCell>
                  <TableCell>概率</TableCell>
                  <TableCell>预计成交日期</TableCell>
                  <TableCell align="right">操作</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {opportunities.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} align="center">
                      <EmptyState
                        title="暂无商机数据"
                        description="点击上方按钮添加第一个商机"
                      />
                    </TableCell>
                  </TableRow>
                ) : (
                  opportunities.map((opportunity) => (
                    <TableRow key={opportunity.id}>
                      <TableCell padding="checkbox">
                        <Checkbox
                          checked={selectedIds.includes(opportunity.id)}
                          onChange={() => toggleSelect(opportunity.id)}
                        />
                      </TableCell>
                      <TableCell sx={{ fontWeight: "medium" }}>
                        {opportunity.name}
                      </TableCell>
                      <TableCell>
                        ¥{(opportunity.value || 0).toLocaleString()}
                      </TableCell>
                      <TableCell>{getStageBadge(opportunity.stage)}</TableCell>
                      <TableCell>
                        {opportunity.probability
                          ? `${opportunity.probability}%`
                          : "-"}
                      </TableCell>
                      <TableCell>
                        {opportunity.close_date
                          ? new Date(opportunity.close_date).toLocaleDateString(
                              "zh-CN",
                            )
                          : "-"}
                      </TableCell>
                      <TableCell align="right">
                        <Stack
                          direction="row"
                          spacing={0.5}
                          sx={{ justifyContent: "flex-end" }}
                        >
                          <IconButton
                            size="small"
                            onClick={() => handleViewDetail(opportunity)}
                          >
                            <Eye style={{ width: 16, height: 16 }} />
                          </IconButton>
                          <IconButton
                            size="small"
                            onClick={() => handleEdit(opportunity)}
                          >
                            <Edit style={{ width: 16, height: 16 }} />
                          </IconButton>
                          <IconButton
                            size="small"
                            color="error"
                            onClick={() => handleDelete(opportunity.id)}
                          >
                            <Trash2 style={{ width: 16, height: 16 }} />
                          </IconButton>
                        </Stack>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </TableContainer>

          <Stack
            direction="row"
            sx={{
              justifyContent: "space-between",
              alignItems: "center",
              mt: 2,
            }}
          >
            <Typography variant="body2" color="text.secondary">
              共 {total} 条记录,第 {currentPage} /{" "}
              {Math.ceil(total / pageSize) || 1} 页
            </Typography>
            <Pagination
              count={Math.ceil(total / pageSize) || 1}
              page={currentPage}
              onChange={handlePageChange}
              shape="rounded"
              size="small"
            />
          </Stack>
        </CardContent>
      </Card>

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
              <Box>
                <Typography variant="caption" color="text.secondary">
                  更新时间
                </Typography>
                <Typography>
                  {new Date(selectedOpportunity.updated_at).toLocaleString(
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
    </Box>
  );
};

export default OpportunityManagementPage;
