import { Button, Card, CardContent, CardHeader, Chip, Typography, TextField, Dialog, DialogTitle, DialogContent, DialogActions, FormControl, InputLabel, Select, MenuItem, Table, TableBody, TableCell, TableHead, TableRow, Checkbox, Box, TablePagination } from "@mui/material";
import React, { useState, useEffect } from "react";
import type {
  Interaction,
  CreateInteractionRequest,
  UpdateInteractionRequest,
} from "@/api/crm";
import { crmApi } from "@/api/crm";
import { useAppStore } from "@/store";
import { LoadingSpinner } from "@/components/LoadingSpinner";
import { EmptyState } from "@/components/EmptyState";
import { Search, Plus, Edit, Trash2, Eye } from "lucide-react";

const InteractionManagementPage: React.FC = () => {
  const [interactions, setInteractions] = useState<Interaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [total, setTotal] = useState(0);
  const [showDialog, setShowDialog] = useState(false);
  const [showDetailDialog, setShowDetailDialog] = useState(false);
  const [selectedInteraction, setSelectedInteraction] =
    useState<Interaction | null>(null);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [formData, setFormData] = useState<CreateInteractionRequest>({
    type: "call",
    subject: "",
    content: "",
    scheduled_at: "",
    notes: "",
  });

  const { addNotification } = useAppStore();

  useEffect(() => {
    loadInteractions();
  }, [currentPage, pageSize, searchTerm, statusFilter, typeFilter]);

  const loadInteractions = async () => {
    try {
      setLoading(true);
      const params: any = {
        page: currentPage,
        pageSize,
      };
      if (searchTerm) params.search = searchTerm;
      if (statusFilter !== "all") params.status = statusFilter;

      const response = await crmApi.interactions.list(params);
      if (response.success && response.data) {
        setInteractions(response.data.items || []);
        setTotal(response.data.total || 0);
      }
    } catch (error) {
      console.error("加载交互记录列表失败:", error);
      addNotification({
        type: "error",
        title: "加载失败",
        message: "无法加载交互记录列表",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (selectedInteraction) {
        await crmApi.interactions.update(
          selectedInteraction.id,
          formData as UpdateInteractionRequest,
        );
        addNotification({
          type: "success",
          title: "更新成功",
          message: "交互记录已更新",
        });
      } else {
        await crmApi.interactions.create(formData);
        addNotification({
          type: "success",
          title: "创建成功",
          message: "新交互记录已创建",
        });
      }
      setShowDialog(false);
      resetForm();
      loadInteractions();
    } catch (error) {
      console.error("操作失败:", error);
      addNotification({
        type: "error",
        title: "操作失败",
        message: selectedInteraction ? "更新交互记录失败" : "创建交互记录失败",
      });
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm("确定要删除这条交互记录吗?")) return;
    try {
      await crmApi.interactions.delete(id);
      addNotification({
        type: "success",
        title: "删除成功",
        message: "交互记录已删除",
      });
      loadInteractions();
    } catch (error) {
      console.error("删除失败:", error);
      addNotification({
        type: "error",
        title: "删除失败",
        message: "无法删除交互记录",
      });
    }
  };

  const handleBatchDelete = async () => {
    if (selectedIds.length === 0) return;
    if (!window.confirm(`确定要删除选中的 ${selectedIds.length} 条交互记录吗?`))
      return;
    try {
      await crmApi.interactions.batchDelete(selectedIds);
      addNotification({
        type: "success",
        title: "删除成功",
        message: `已删除 ${selectedIds.length} 条交互记录`,
      });
      setSelectedIds([]);
      loadInteractions();
    } catch (error) {
      console.error("批量删除失败:", error);
      addNotification({
        type: "error",
        title: "删除失败",
        message: "批量删除失败",
      });
    }
  };

  const handleEdit = (interaction: Interaction) => {
    setSelectedInteraction(interaction);
    setFormData({
      customer_id: interaction.customer_id,
      contact_id: interaction.contact_id,
      type: interaction.type,
      subject: interaction.subject || "",
      content: interaction.content || "",
      scheduled_at: interaction.scheduled_at || "",
      notes: "",
    });
    setShowDialog(true);
  };

  const handleViewDetail = (interaction: Interaction) => {
    setSelectedInteraction(interaction);
    setShowDetailDialog(true);
  };

  const resetForm = () => {
    setSelectedInteraction(null);
    setFormData({
      type: "call",
      subject: "",
      content: "",
      scheduled_at: "",
      notes: "",
    });
  };

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id],
    );
  };

  const toggleSelectAll = () => {
    if (selectedIds.length === interactions.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(interactions.map((i) => i.id));
    }
  };

  const getTypeBadge = (type: string) => {
    const typeMap: Record<
      string,
      {
        label: string;
        variant: "default" | "secondary" | "destructive" | "outline";
      }
    > = {
      call: { label: "电话", variant: "default" },
      email: { label: "邮件", variant: "secondary" },
      meeting: { label: "会议", variant: "outline" },
      visit: { label: "拜访", variant: "outline" },
      other: { label: "其他", variant: "outline" },
    };
    const t = typeMap[type] || { label: type, variant: "outline" };
    return <Chip size="small" variant={t.variant === "outline" ? "outlined" : "filled"} label={t.label} />;
  };

  const getStatusBadge = (status: string) => {
    const statusMap: Record<
      string,
      {
        label: string;
        variant: "default" | "secondary" | "destructive" | "outline";
      }
    > = {
      scheduled: { label: "已计划", variant: "outline" },
      completed: { label: "已完成", variant: "default" },
      cancelled: { label: "已取消", variant: "destructive" },
    };
    const s = statusMap[status] || { label: status, variant: "outline" };
    return <Chip size="small" variant={s.variant === "outline" ? "outlined" : "filled"} label={s.label} />;
  };

  const handleChangePage = (_: any, newPage: number) => {
    setCurrentPage(newPage);
  };

  if (loading) return <LoadingSpinner />;

  return (
    <Box sx={{ display: "flex", flexDirection: "column", gap: 3 }}>
      <Card>
        <CardHeader>
          <Typography variant="h6" sx={{ fontWeight: 600 }}>交互记录管理</Typography>
          <Typography variant="body2" sx={{ color: "grey.500" }}>
            管理客户交互记录,包括电话、邮件、会议、拜访等
          </Typography>
        </CardHeader>
        <CardContent>
          <Box sx={{ display: "flex", flexDirection: { xs: "column", sm: "row" }, gap: 2, mb: 3 }}>
            <Box sx={{ flex: 1 }}>
              <Box sx={{ position: "relative" }}>
                <Box sx={{ position: "absolute", left: 12, top: 14, display: "flex", alignItems: "center", zIndex: 1 }}>
                  <Search size={16} />
                </Box>
                <TextField
                  placeholder="搜索交互主题..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  size="small"
                  sx={{ pl: 4, width: "100%" }}
                />
              </Box>
            </Box>
            <FormControl size="small" sx={{ minWidth: 150 }}>
              <InputLabel>类型筛选</InputLabel>
              <Select
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value)}
                label="类型筛选"
              >
                <MenuItem value="all">全部类型</MenuItem>
                <MenuItem value="call">电话</MenuItem>
                <MenuItem value="email">邮件</MenuItem>
                <MenuItem value="meeting">会议</MenuItem>
                <MenuItem value="visit">拜访</MenuItem>
                <MenuItem value="other">其他</MenuItem>
              </Select>
            </FormControl>
            <FormControl size="small" sx={{ minWidth: 150 }}>
              <InputLabel>状态筛选</InputLabel>
              <Select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                label="状态筛选"
              >
                <MenuItem value="all">全部状态</MenuItem>
                <MenuItem value="scheduled">已计划</MenuItem>
                <MenuItem value="completed">已完成</MenuItem>
                <MenuItem value="cancelled">已取消</MenuItem>
              </Select>
            </FormControl>
            <Button
              variant="contained"
              onClick={() => {
                resetForm();
                setShowDialog(true);
              }}
            >
              <Plus style={{ marginRight: 4, width: 16, height: 16 }} />
              新增交互
            </Button>
          </Box>

          {selectedIds.length > 0 && (
            <Box sx={{ mb: 2, p: 1.5, bgcolor: "grey.100", borderRadius: 1, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <Typography variant="body2">
                已选择 {selectedIds.length} 条交互记录
              </Typography>
              <Button
                variant="contained"
                size="small"
                onClick={handleBatchDelete}
                color="error"
              >
                <Trash2 style={{ marginRight: 4, width: 16, height: 16 }} />
                批量删除
              </Button>
            </Box>
          )}

          <Table>
            <TableHead>
              <TableRow>
                <TableCell sx={{ width: 50 }}>
                  <Checkbox
                    checked={
                      selectedIds.length === interactions.length &&
                      interactions.length > 0
                    }
                    onChange={toggleSelectAll}
                  />
                </TableCell>
                <TableCell>主题</TableCell>
                <TableCell>类型</TableCell>
                <TableCell>计划时间</TableCell>
                <TableCell>完成时间</TableCell>
                <TableCell>状态</TableCell>
                <TableCell sx={{ textAlign: "right" }}>操作</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {interactions.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} sx={{ textAlign: "center" }}>
                    <EmptyState
                      title="暂无交互记录"
                      description="点击上方按钮添加第一条交互记录"
                    />
                  </TableCell>
                </TableRow>
              ) : (
                interactions.map((interaction) => (
                  <TableRow key={interaction.id}>
                    <TableCell>
                      <Checkbox
                        checked={selectedIds.includes(interaction.id)}
                        onChange={() => toggleSelect(interaction.id)}
                      />
                    </TableCell>
                    <TableCell sx={{ fontWeight: 500 }}>
                      {interaction.subject || "-"}
                    </TableCell>
                    <TableCell>{getTypeBadge(interaction.type)}</TableCell>
                    <TableCell>
                      {interaction.scheduled_at
                        ? new Date(interaction.scheduled_at).toLocaleString(
                            "zh-CN",
                          )
                        : "-"}
                    </TableCell>
                    <TableCell>
                      {interaction.completed_at
                        ? new Date(interaction.completed_at).toLocaleString(
                            "zh-CN",
                          )
                        : "-"}
                    </TableCell>
                    <TableCell>
                      {getStatusBadge(interaction.status)}
                    </TableCell>
                    <TableCell sx={{ textAlign: "right" }}>
                      <Button
                        variant="text"
                        size="small"
                        onClick={() => handleViewDetail(interaction)}
                      >
                        <Eye style={{ width: 18, height: 18 }} />
                      </Button>
                      <Button
                        variant="text"
                        size="small"
                        onClick={() => handleEdit(interaction)}
                      >
                        <Edit style={{ width: 18, height: 18 }} />
                      </Button>
                      <Button
                        variant="text"
                        size="small"
                        onClick={() => handleDelete(interaction.id)}
                        color="error"
                      >
                        <Trash2 style={{ width: 18, height: 18 }} />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>

          <Box sx={{ mt: 2, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <Typography variant="body2" color="text.secondary">
              共 {total} 条记录,第 {currentPage} /{" "}
              {Math.ceil(total / pageSize) || 1} 页
            </Typography>
            <TablePagination
              component="div"
              count={total}
              page={currentPage - 1}
              rowsPerPage={pageSize}
              onPageChange={handleChangePage}
              rowsPerPageOptions={[10, 20, 50]}
              labelRowsPerPage="每页"
            />
          </Box>
        </CardContent>
      </Card>

      {/* 新增/编辑对话框 */}
      <Dialog open={showDialog} onClose={() => setShowDialog(false)} maxWidth="md" fullWidth>
        <DialogTitle>
          {selectedInteraction ? "编辑交互记录" : "新增交互记录"}
        </DialogTitle>
        <DialogContent dividers>
          <form onSubmit={handleSubmit}>
            <Box sx={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 2, py: 1 }}>
              <FormControl fullWidth size="small">
                <InputLabel htmlFor="type">类型 *</InputLabel>
                <Select
                  value={formData.type}
                  onChange={(e) =>
                    setFormData({ ...formData, type: e.target.value })
                  }
                  label="类型 *"
                >
                  <MenuItem value="call">电话</MenuItem>
                  <MenuItem value="email">邮件</MenuItem>
                  <MenuItem value="meeting">会议</MenuItem>
                  <MenuItem value="visit">拜访</MenuItem>
                  <MenuItem value="other">其他</MenuItem>
                </Select>
              </FormControl>
              <TextField
                label="主题"
                size="small"
                value={formData.subject}
                onChange={(e) =>
                  setFormData({ ...formData, subject: e.target.value })
                }
              />
              <Box sx={{ gridColumn: "1 / -1" }}>
                <TextField
                  label="内容"
                  size="small"
                  multiline
                  rows={4}
                  fullWidth
                  value={formData.content}
                  onChange={(e) =>
                    setFormData({ ...formData, content: e.target.value })
                  }
                />
              </Box>
              <TextField
                label="计划时间"
                size="small"
                type="datetime-local"
                LabelProps={{ shrink: true }}
                value={formData.scheduled_at}
                onChange={(e) =>
                  setFormData({ ...formData, scheduled_at: e.target.value })
                }
              />
              {selectedInteraction && (
                <FormControl fullWidth size="small">
                  <InputLabel htmlFor="status">状态</InputLabel>
                  <Select
                    value={selectedInteraction.status}
                    onChange={(e) =>
                      setSelectedInteraction({
                        ...selectedInteraction,
                        status: e.target.value,
                      })
                    }
                    label="状态"
                  >
                    <MenuItem value="scheduled">已计划</MenuItem>
                    <MenuItem value="completed">已完成</MenuItem>
                    <MenuItem value="cancelled">已取消</MenuItem>
                  </Select>
                </FormControl>
              )}
              <Box sx={{ gridColumn: "1 / -1" }}>
                <TextField
                  label="备注"
                  size="small"
                  multiline
                  rows={3}
                  fullWidth
                  value={formData.notes}
                  onChange={(e) =>
                    setFormData({ ...formData, notes: e.target.value })
                  }
                />
              </Box>
            </Box>
          </form>
        </DialogContent>
        <DialogActions>
          <Button
            variant="outlined"
            onClick={() => setShowDialog(false)}
          >
            取消
          </Button>
          <Button variant="contained" onClick={handleSubmit}>保存</Button>
        </DialogActions>
      </Dialog>

      {/* 详情对话框 */}
      <Dialog open={showDetailDialog} onClose={() => setShowDetailDialog(false)} maxWidth="md" fullWidth>
        <DialogTitle>交互记录详情</DialogTitle>
        <DialogContent dividers>
          {selectedInteraction && (
            <Box sx={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 2 }}>
              <Box>
                <Typography variant="caption" color="text.secondary">类型</Typography>
                <Box>{getTypeBadge(selectedInteraction.type)}</Box>
              </Box>
              <Box>
                <Typography variant="caption" color="text.secondary">主题</Typography>
                <Typography sx={{ fontWeight: 500 }}>
                  {selectedInteraction.subject || "-"}
                </Typography>
              </Box>
              <Box sx={{ gridColumn: "1 / -1" }}>
                <Typography variant="caption" color="text.secondary">内容</Typography>
                <Typography>{selectedInteraction.content || "-"}</Typography>
              </Box>
              <Box>
                <Typography variant="caption" color="text.secondary">计划时间</Typography>
                <Typography>
                  {selectedInteraction.scheduled_at
                    ? new Date(
                        selectedInteraction.scheduled_at,
                      ).toLocaleString("zh-CN")
                    : "-"}
                </Typography>
              </Box>
              <Box>
                <Typography variant="caption" color="text.secondary">完成时间</Typography>
                <Typography>
                  {selectedInteraction.completed_at
                    ? new Date(
                        selectedInteraction.completed_at,
                      ).toLocaleString("zh-CN")
                    : "-"}
                </Typography>
              </Box>
              <Box>
                <Typography variant="caption" color="text.secondary">状态</Typography>
                <Box>{getStatusBadge(selectedInteraction.status)}</Box>
              </Box>
              <Box>
                <Typography variant="caption" color="text.secondary">创建时间</Typography>
                <Typography>
                  {new Date(selectedInteraction.created_at).toLocaleString(
                    "zh-CN",
                  )}
                </Typography>
              </Box>
              <Box>
                <Typography variant="caption" color="text.secondary">更新时间</Typography>
                <Typography>
                  {new Date(selectedInteraction.updated_at).toLocaleString(
                    "zh-CN",
                  )}
                </Typography>
              </Box>
            </Box>
          )}
        </DialogContent>
      </Dialog>
    </Box>
  );
};

export default InteractionManagementPage;
