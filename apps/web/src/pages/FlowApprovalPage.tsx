import React, { useState, useEffect } from "react";
import {
  CheckCircle,
  XCircle,
  Clock,
  AlertCircle,
  User,
  Users,
  Search,
  Loader2,
  Eye,
  MessageSquare,
  ChevronRight,
  List,
  FileText,
  Play,
  CheckCircle2,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import type { Approval, WorkflowInstance } from "../api/flow";
import { flowApi, ApprovalRecord } from "../api/flow";
import { useAppStore } from "../store";
import {
  Button,
  TextField,
  Chip,
  Card,
  CardContent,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
  Box,
  Stack,
  Typography,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  FormLabel,
  IconButton,
  Tabs,
  Tab,
  Divider,
} from "@mui/material";

const FlowApprovalPage: React.FC = () => {
  const navigate = useNavigate();
  const addNotification = useAppStore((state) => state.addNotification);
  const [approvals, setApprovals] = useState<Approval[]>([]);
  const [instances, setInstances] = useState<WorkflowInstance[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("pending");
  const [activeTab, setActiveTab] = useState<"pending" | "history">("pending");
  const [selectedApproval, setSelectedApproval] = useState<Approval | null>(
    null,
  );
  const [showApprovalModal, setShowApprovalModal] = useState(false);
  const [approvalAction, setApprovalAction] = useState<"approve" | "reject">(
    "approve",
  );
  const [comment, setComment] = useState("");
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    loadData();
  }, [activeTab]);

  const loadData = async () => {
    try {
      setLoading(true);

      const approvalParams =
        activeTab === "pending" ? { status: "pending" } : {};

      const approvalResponse = await flowApi.listApprovals(approvalParams);
      if (approvalResponse.success && approvalResponse.data) {
        const data = approvalResponse.data as any;
        const approvalList = Array.isArray(data) ? data : data.items || [];
        setApprovals(approvalList);
      } else {
        setApprovals([]);
      }

      const instanceResponse = await flowApi.listInstances();
      if (instanceResponse.success && instanceResponse.data) {
        const data = instanceResponse.data as any;
        const instanceList = Array.isArray(data) ? data : data.items || [];
        setInstances(instanceList);
      } else {
        setInstances([]);
      }
    } catch (err) {
      console.error("加载数据失败:", err);
      addNotification({
        title: "错误",
        message: "加载数据失败",
        type: "error",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleProcessApproval = async () => {
    if (!selectedApproval) return;
    if (!comment.trim() && approvalAction === "reject") {
      addNotification({
        title: "提示",
        message: "请输入拒绝原因",
        type: "info",
      });
      return;
    }

    try {
      setProcessing(true);
      const response = await flowApi.processApproval(selectedApproval.id, {
        action: approvalAction,
        comment: comment || undefined,
        actor_id: "system-user-id",
        actor_name: "Current User",
      });

      if (response.success) {
        addNotification({
          title: "成功",
          message: `审批${approvalAction === "approve" ? "通过" : "拒绝"}成功`,
          type: "success",
        });
        setShowApprovalModal(false);
        setSelectedApproval(null);
        setComment("");
        loadData();
      } else {
        addNotification({
          title: "失败",
          message: response.message || "操作失败",
          type: "error",
        });
      }
    } catch (err) {
      addNotification({
        title: "错误",
        message: "处理审批失败",
        type: "error",
      });
      console.error("处理审批失败:", err);
    } finally {
      setProcessing(false);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "approved":
        return <CheckCircle size={20} style={{ color: "#16a34a" }} />;
      case "rejected":
        return <XCircle size={20} style={{ color: "#dc2626" }} />;
      case "pending":
        return <Clock size={20} style={{ color: "#ca8a04" }} />;
      default:
        return <AlertCircle size={20} style={{ color: "#4b5563" }} />;
    }
  };

  const getStatusText = (status: string) => {
    const statusMap: Record<string, string> = {
      approved: "已通过",
      rejected: "已拒绝",
      pending: "待审批",
    };
    return statusMap[status] || status;
  };

  const getStatusColor = (status: string): "success" | "error" | "warning" | "default" => {
    switch (status) {
      case "approved":
        return "success";
      case "rejected":
        return "error";
      case "pending":
        return "warning";
      default:
        return "default";
    }
  };

  const filteredApprovals = approvals.filter((a) => {
    const matchesSearch = a.task_name
      .toLowerCase()
      .includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === "all" || a.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const pendingCount = approvals.filter((a) => a.status === "pending").length;

  return (
    <Box sx={{ minHeight: "100vh", bgcolor: "grey.50", p: 3 }}>
      <Box sx={{ bgcolor: "white", borderRadius: 1, boxShadow: 1, p: 3, mb: 3 }}>
        <Stack direction="row" sx={{ alignItems: "center" }} spacing={2}>
          <Box sx={{ width: 48, height: 48, bgcolor: "primary.light", borderRadius: 1, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <CheckCircle size={24} style={{ color: "#6366f1" }} />
          </Box>
          <Box>
            <Typography variant="h5" sx={{ fontWeight: 700 }}>
              审批管理
            </Typography>
            <Typography variant="body2" sx={{ color: "grey.500" }}>
              {pendingCount > 0 ? (
                <Box component="span" sx={{ color: "primary.main", fontWeight: 500 }}>
                  {pendingCount} 项待审批
                </Box>
              ) : (
                "暂无待审批项"
              )}
            </Typography>
          </Box>
        </Stack>
      </Box>

      <Box sx={{ bgcolor: "white", borderRadius: 1, boxShadow: 1, mb: 3 }}>
        <Divider />
        <Tabs value={activeTab} onChange={(_, v) => setActiveTab(v)} sx={{ px: 3 }}>
          <Tab
            value="pending"
            label={
              <Stack direction="row" sx={{ alignItems: "center" }} spacing={1}>
                <Clock size={20} />
                <span>待我审批 ({pendingCount})</span>
              </Stack>
            }
          />
          <Tab
            value="history"
            label={
              <Stack direction="row" sx={{ alignItems: "center" }} spacing={1}>
                <List size={20} />
                <span>审批历史</span>
              </Stack>
            }
          />
        </Tabs>
      </Box>

      <Box sx={{ bgcolor: "white", borderRadius: 1, boxShadow: 1, p: 3, mb: 3 }}>
        <Stack direction="row" sx={{ alignItems: "center" }} spacing={2}>
          <TextField
            size="small"
            type="text"
            placeholder="搜索审批任务..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            slotProps={{
              input: {
                startAdornment: <Search size={20} style={{ marginRight: 8, color: "#9ca3af" }} />,
              },
            }}
            sx={{ flex: 1 }}
          />
          {activeTab === "pending" && (
            <FormControl size="small" sx={{ width: 128 }}>
              <InputLabel>状态</InputLabel>
              <Select
                value={statusFilter}
                label="状态"
                onChange={(e) => setStatusFilter(e.target.value)}
              >
                <MenuItem value="pending">待审批</MenuItem>
                <MenuItem value="all">全部</MenuItem>
              </Select>
            </FormControl>
          )}
          <IconButton onClick={loadData} title="刷新">
            <Loader2 size={20} sx={{ animation: loading ? "spin 1s linear infinite" : "none" }} />
          </IconButton>
        </Stack>
      </Box>

      <Card>
        <CardContent sx={{ p: 3 }}>
          {loading ? (
            <Box sx={{ display: "flex", alignItems: "center", justifyContent: "center", py: 6 }}>
              <Loader2 size={32} className="animate-spin" style={{ color: "#6366f1" }} />
            </Box>
          ) : filteredApprovals.length === 0 ? (
            <Box sx={{ textAlign: "center", py: 6 }}>
              <CheckCircle2 size={64} style={{ margin: "0 auto", color: "#9ca3af", marginBottom: 16 }} />
              <Typography sx={{ color: "grey.500" }}>
                {activeTab === "pending" ? "暂无待审批项" : "暂无审批记录"}
              </Typography>
            </Box>
          ) : (
            <Stack spacing={2}>
              {filteredApprovals.map((approval) => (
                <Box
                  key={approval.id}
                  sx={{ border: 1, borderColor: "divider", borderRadius: 1, p: 2, "&:hover": { borderColor: "primary.light" }, transition: "border-color 0.2s" }}
                >
                  <Stack direction="row" sx={{ alignItems: "flex-start", justifyContent: "space-between" }}>
                    <Box sx={{ flex: 1 }}>
                      <Stack direction="row" sx={{ alignItems: "center", mb: 1 }} spacing={1.5}>
                        <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
                          {approval.task_name}
                        </Typography>
                        <Chip
                          size="small"
                          icon={getStatusIcon(approval.status)}
                          label={getStatusText(approval.status)}
                          color={getStatusColor(approval.status)}
                        />
                      </Stack>
                      <Stack direction="row" sx={{ alignItems: "center", mb: 1 }} spacing={2}>
                        {approval.node_id && (
                          <Stack direction="row" sx={{ alignItems: "center" }} spacing={0.5}>
                            <FileText size={16} style={{ color: "#6b7280" }} />
                            <Typography variant="body2" sx={{ color: "grey.600" }}>
                              节点: {approval.node_id}
                            </Typography>
                          </Stack>
                        )}
                        {approval.approval_type && (
                          <Stack direction="row" sx={{ alignItems: "center" }} spacing={0.5}>
                            <Users size={16} style={{ color: "#6b7280" }} />
                            <Typography variant="body2" sx={{ color: "grey.600" }}>
                              {approval.approval_type === "single"
                                ? "单人审批"
                                : approval.approval_type === "counter"
                                  ? "会签审批"
                                  : "或签审批"}
                            </Typography>
                          </Stack>
                        )}
                      </Stack>
                      {approval.comment && (
                        <Typography variant="body2" sx={{ color: "grey.500", mb: 1 }}>
                          <MessageSquare size={16} style={{ display: "inline", marginRight: 4 }} />
                          {approval.comment}
                        </Typography>
                      )}
                      <Stack direction="row" sx={{ alignItems: "center" }} spacing={2}>
                        <Stack direction="row" sx={{ alignItems: "center" }} spacing={0.5}>
                          <Clock size={16} style={{ color: "#9ca3af" }} />
                          <Typography variant="caption" sx={{ color: "grey.500" }}>
                            创建于 {new Date(approval.created_at).toLocaleString()}
                          </Typography>
                        </Stack>
                        {approval.approved_at && (
                          <Stack direction="row" sx={{ alignItems: "center" }} spacing={0.5}>
                            <CheckCircle size={16} style={{ color: "#9ca3af" }} />
                            <Typography variant="caption" sx={{ color: "grey.500" }}>
                              处理于 {new Date(approval.approved_at).toLocaleString()}
                            </Typography>
                          </Stack>
                        )}
                      </Stack>
                    </Box>
                    <Stack direction="row" sx={{ alignItems: "center" }} spacing={1}>
                      {approval.status === "pending" && (
                        <>
                          <Button
                            variant="contained"
                            color="success"
                            onClick={() => {
                              setSelectedApproval(approval);
                              setApprovalAction("approve");
                              setComment("");
                              setShowApprovalModal(true);
                            }}
                            startIcon={<CheckCircle size={16} />}
                          >
                            通过
                          </Button>
                          <Button
                            variant="contained"
                            color="error"
                            onClick={() => {
                              setSelectedApproval(approval);
                              setApprovalAction("reject");
                              setComment("");
                              setShowApprovalModal(true);
                            }}
                            startIcon={<XCircle size={16} />}
                          >
                            拒绝
                          </Button>
                        </>
                      )}
                      <IconButton
                        size="small"
                        onClick={() =>
                          navigate(`/flow/approvals/${approval.id}`)
                        }
                        title="查看详情"
                      >
                        <Eye size={20} />
                      </IconButton>
                    </Stack>
                  </Stack>
                </Box>
              ))}
            </Stack>
          )}
        </CardContent>
      </Card>

      <Dialog open={showApprovalModal} onClose={() => setShowApprovalModal(false)}>
        <DialogTitle>
          {approvalAction === "approve" ? "通过审批" : "拒绝审批"}
        </DialogTitle>
        <DialogContent>
          <DialogContentText>
            {approvalAction === "approve"
              ? "确认通过该审批任务"
              : "确认拒绝该审批任务"}
          </DialogContentText>
          <Box sx={{ mt: 2 }}>
            {selectedApproval && (
              <>
                <Typography variant="body2" sx={{ color: "grey.600", mb: 1 }}>
                  任务: {selectedApproval.task_name}
                </Typography>
                {selectedApproval.node_id && (
                  <Typography variant="body2" sx={{ color: "grey.600", mb: 1 }}>
                    节点: {selectedApproval.node_id}
                  </Typography>
                )}
              </>
            )}
            <Box sx={{ mt: 2 }}>
              <FormLabel>
                {approvalAction === "reject" ? "拒绝原因 *" : "备注"}
              </FormLabel>
              <TextField
                size="small"
                fullWidth
                multiline
                rows={4}
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                placeholder={
                  approvalAction === "reject" ? "请输入拒绝原因" : "可选备注"
                }
                sx={{ mt: 1 }}
              />
            </Box>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button
            color="inherit"
            onClick={() => {
              setShowApprovalModal(false);
              setSelectedApproval(null);
            }}
          >
            取消
          </Button>
          <Button
            variant="contained"
            onClick={handleProcessApproval}
            disabled={
              processing || (approvalAction === "reject" && !comment.trim())
            }
            color={approvalAction === "approve" ? "success" : "error"}
            startIcon={processing ? <Loader2 size={16} sx={{ animation: "spin 1s linear infinite" }} /> : undefined}
          >
            {approvalAction === "approve" ? "确认通过" : "确认拒绝"}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default FlowApprovalPage;
