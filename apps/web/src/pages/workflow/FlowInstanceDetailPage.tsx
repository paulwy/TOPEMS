import {
  Button,
  Card,
  CardContent,
  Typography,
  Box,
  Stack,
  Chip,
  IconButton,
} from "@mui/material";
import React, { useState, useEffect } from "react";
import {
  GitBranch,
  CheckCircle,
  XCircle,
  Clock,
  AlertCircle,
  Loader2,
  ArrowLeft,
  User,
  Users,
  FileText,
  Play,
  CheckCircle2,
  MessageSquare,
  Eye,
} from "lucide-react";
import { useParams, useNavigate } from "react-router-dom";
import type { WorkflowInstance, Approval, ApprovalRecord } from "@/api/flow";
import { flowApi } from "@/api/flow";
import { useAppStore } from "../../store";
import { apiLogger } from "@/utils/logger";

interface InstanceDetails {
  instance: WorkflowInstance;
  approvals: Approval[];
  records: ApprovalRecord[];
}

const FlowInstanceDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const addNotification = useAppStore((state) => state.addNotification);
  const [details, setDetails] = useState<InstanceDetails | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (id) {
      loadInstanceDetails();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const loadInstanceDetails = async () => {
    if (!id) return;

    try {
      setLoading(true);
      const response = await flowApi.getInstanceDetails(id);
      if (response.success && response.data) {
        const data = response.data as any;
        setDetails(data);
      } else {
        addNotification({
          title: "错误",
          message: "加载实例详情失败",
          type: "error",
        });
      }
    } catch (err) {
      apiLogger.error("加载实例详情失败:", err);
      addNotification({
        title: "错误",
        message: "加载实例详情失败",
        type: "error",
      });
    } finally {
      setLoading(false);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "completed":
      case "approved":
        return <CheckCircle size={20} style={{ color: "#16a34a" }} />;
      case "rejected":
        return <XCircle size={20} style={{ color: "#dc2626" }} />;
      case "running":
        return <Play size={20} style={{ color: "#2563eb" }} />;
      case "pending":
        return <Clock size={20} style={{ color: "#ca8a04" }} />;
      default:
        return <AlertCircle size={20} style={{ color: "#4b5563" }} />;
    }
  };

  const getStatusText = (status: string) => {
    const statusMap: Record<string, string> = {
      completed: "已完成",
      rejected: "已拒绝",
      running: "进行中",
      pending: "待处理",
      approved: "已通过",
    };
    return statusMap[status] || status;
  };

  const getStatusColor = (
    status: string,
  ): "success" | "error" | "info" | "warning" | "default" => {
    switch (status) {
      case "completed":
      case "approved":
        return "success";
      case "rejected":
        return "error";
      case "running":
        return "info";
      case "pending":
        return "warning";
      default:
        return "default";
    }
  };

  if (loading) {
    return (
      <Box
        sx={{
          minHeight: "100vh",
          bgcolor: "grey.50",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <Loader2
          size={32}
          className="animate-spin"
          style={{ color: "#6366f1" }}
        />
      </Box>
    );
  }

  if (!details) {
    return (
      <Box sx={{ minHeight: "100vh", bgcolor: "grey.50", p: 3 }}>
        <Box sx={{ textAlign: "center", py: 12 }}>
          <AlertCircle
            size={64}
            style={{ color: "#d1d5db", margin: "0 auto", marginBottom: 16 }}
          />
          <Typography sx={{ color: "grey.500" }}>实例不存在</Typography>
          <Button onClick={() => navigate("/flow/instances")} sx={{ mt: 2 }}>
            返回列表
          </Button>
        </Box>
      </Box>
    );
  }

  const { instance, approvals, records } = details;

  return (
    <Box sx={{ minHeight: "100vh", bgcolor: "grey.50", p: 3 }}>
      {/* Header */}
      <Card sx={{ mb: 3 }}>
        <CardContent sx={{ p: 3 }}>
          <Stack
            direction="row"
            sx={{ alignItems: "center", justifyContent: "space-between" }}
          >
            <Stack direction="row" spacing={1.5} sx={{ alignItems: "center" }}>
              <IconButton onClick={() => navigate("/flow/instances")}>
                <ArrowLeft size={20} />
              </IconButton>
              <Box
                sx={{
                  width: 48,
                  height: 48,
                  bgcolor: "primary.light",
                  borderRadius: 1,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <GitBranch size={24} style={{ color: "#6366f1" }} />
              </Box>
              <Box>
                <Typography variant="h5" sx={{ fontWeight: 700 }}>
                  实例详情
                </Typography>
                <Typography variant="body2" sx={{ fontFamily: "monospace" }}>
                  {instance.id}
                </Typography>
              </Box>
            </Stack>
            <Chip
              icon={getStatusIcon(instance.status)}
              label={getStatusText(instance.status)}
              color={getStatusColor(instance.status)}
            />
          </Stack>
        </CardContent>
      </Card>

      <Box
        sx={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 3 }}
      >
        {/* Instance Info */}
        <Box sx={{ gridColumn: "span 2" }}>
          <Card sx={{ mb: 3 }}>
            <CardContent sx={{ p: 3 }}>
              <Typography variant="h6" sx={{ fontWeight: 600, mb: 2 }}>
                基本信息
              </Typography>
              <Box
                sx={{
                  display: "grid",
                  gridTemplateColumns: "repeat(2, 1fr)",
                  gap: 2,
                }}
              >
                <Box>
                  <Typography
                    variant="body2"
                    sx={{ color: "grey.500", mb: 0.5 }}
                  >
                    实例ID
                  </Typography>
                  <Typography variant="body2" sx={{ fontFamily: "monospace" }}>
                    {instance.id}
                  </Typography>
                </Box>
                <Box>
                  <Typography
                    variant="body2"
                    sx={{ color: "grey.500", mb: 0.5 }}
                  >
                    工作流ID
                  </Typography>
                  <Typography variant="body2" sx={{ fontFamily: "monospace" }}>
                    {instance.workflow_id || "N/A"}
                  </Typography>
                </Box>
                <Box>
                  <Typography
                    variant="body2"
                    sx={{ color: "grey.500", mb: 0.5 }}
                  >
                    当前节点
                  </Typography>
                  <Typography variant="body2">
                    {instance.current_node || "N/A"}
                  </Typography>
                </Box>
                <Box>
                  <Typography
                    variant="body2"
                    sx={{ color: "grey.500", mb: 0.5 }}
                  >
                    发起人
                  </Typography>
                  <Stack
                    direction="row"
                    spacing={0.5}
                    sx={{ alignItems: "center" }}
                  >
                    <User size={16} />
                    <Typography variant="body2">
                      {instance.initiator_id || "系统"}
                    </Typography>
                  </Stack>
                </Box>
                <Box>
                  <Typography
                    variant="body2"
                    sx={{ color: "grey.500", mb: 0.5 }}
                  >
                    创建时间
                  </Typography>
                  <Typography variant="body2">
                    {new Date(instance.created_at).toLocaleString()}
                  </Typography>
                </Box>
                <Box>
                  <Typography
                    variant="body2"
                    sx={{ color: "grey.500", mb: 0.5 }}
                  >
                    启动时间
                  </Typography>
                  <Typography variant="body2">
                    {instance.started_at
                      ? new Date(instance.started_at).toLocaleString()
                      : "N/A"}
                  </Typography>
                </Box>
                {instance.completed_at && (
                  <Box>
                    <Typography
                      variant="body2"
                      sx={{ color: "grey.500", mb: 0.5 }}
                    >
                      完成时间
                    </Typography>
                    <Typography variant="body2">
                      {new Date(instance.completed_at).toLocaleString()}
                    </Typography>
                  </Box>
                )}
              </Box>
              {instance.data && Object.keys(instance.data).length > 0 && (
                <Box sx={{ mt: 2 }}>
                  <Typography variant="body2" sx={{ color: "grey.500", mb: 1 }}>
                    实例数据
                  </Typography>
                  <Box
                    component="pre"
                    sx={{
                      bgcolor: "grey.50",
                      p: 1.5,
                      borderRadius: 1,
                      fontSize: 12,
                      overflow: "auto",
                    }}
                  >
                    {JSON.stringify(instance.data, null, 2)}
                  </Box>
                </Box>
              )}
            </CardContent>
          </Card>

          {/* Approval Timeline */}
          <Card>
            <CardContent sx={{ p: 3 }}>
              <Typography variant="h6" sx={{ fontWeight: 600, mb: 2 }}>
                审批节点
              </Typography>
              {approvals.length === 0 ? (
                <Box sx={{ textAlign: "center", py: 4 }}>
                  <Users
                    size={48}
                    style={{
                      color: "#d1d5db",
                      margin: "0 auto",
                      marginBottom: 8,
                    }}
                  />
                  <Typography sx={{ color: "grey.500" }}>
                    暂无审批节点
                  </Typography>
                </Box>
              ) : (
                <Stack spacing={2}>
                  {approvals.map((approval, index) => (
                    <Box
                      key={approval.id}
                      sx={{
                        border: 1,
                        borderColor: "divider",
                        borderRadius: 1,
                        p: 2,
                      }}
                    >
                      <Stack
                        direction="row"
                        sx={{
                          alignItems: "flex-start",
                          justifyContent: "space-between",
                        }}
                        spacing={2}
                      >
                        <Stack
                          direction="row"
                          spacing={1}
                          sx={{ alignItems: "center" }}
                        >
                          <Box
                            sx={{
                              width: 24,
                              height: 24,
                              bgcolor: "primary.light",
                              borderRadius: "50%",
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                            }}
                          >
                            <Typography
                              variant="caption"
                              sx={{ fontWeight: 700, color: "primary.main" }}
                            >
                              {index + 1}
                            </Typography>
                          </Box>
                          <Box>
                            <Typography sx={{ fontWeight: 500 }}>
                              {approval.task_name}
                            </Typography>
                            {approval.node_id && (
                              <Typography
                                variant="caption"
                                color="text.secondary"
                              >
                                节点: {approval.node_id}
                              </Typography>
                            )}
                          </Box>
                        </Stack>
                        <Chip
                          icon={getStatusIcon(approval.status)}
                          label={getStatusText(approval.status)}
                          color={getStatusColor(approval.status)}
                          size="small"
                        />
                      </Stack>
                      <Stack direction="row" spacing={2} sx={{ ml: 4, mt: 1 }}>
                        <Stack
                          direction="row"
                          spacing={0.5}
                          sx={{ alignItems: "center" }}
                        >
                          <User size={12} />
                          <Typography variant="caption" color="text.secondary">
                            审批人: {approval.assignee_id || "N/A"}
                          </Typography>
                        </Stack>
                        <Stack
                          direction="row"
                          spacing={0.5}
                          sx={{ alignItems: "center" }}
                        >
                          <Clock size={12} />
                          <Typography variant="caption" color="text.secondary">
                            创建:{" "}
                            {new Date(approval.created_at).toLocaleString()}
                          </Typography>
                        </Stack>
                        {approval.approved_at && (
                          <Stack
                            direction="row"
                            spacing={0.5}
                            sx={{ alignItems: "center" }}
                          >
                            <CheckCircle size={12} />
                            <Typography
                              variant="caption"
                              color="text.secondary"
                            >
                              处理:{" "}
                              {new Date(approval.approved_at).toLocaleString()}
                            </Typography>
                          </Stack>
                        )}
                      </Stack>
                      {approval.comment && (
                        <Stack
                          direction="row"
                          spacing={1}
                          sx={{ ml: 4, mt: 1, alignItems: "flex-start" }}
                        >
                          <MessageSquare
                            size={16}
                            style={{ color: "#6b7280", marginTop: 2 }}
                          />
                          <Typography variant="body2" color="text.secondary">
                            {approval.comment}
                          </Typography>
                        </Stack>
                      )}
                    </Box>
                  ))}
                </Stack>
              )}
            </CardContent>
          </Card>
        </Box>

        {/* Approval Records */}
        <Box>
          <Card>
            <CardContent sx={{ p: 3 }}>
              <Typography variant="h6" sx={{ fontWeight: 600, mb: 2 }}>
                审批记录
              </Typography>
              {records.length === 0 ? (
                <Box sx={{ textAlign: "center", py: 4 }}>
                  <FileText
                    size={48}
                    style={{
                      color: "#d1d5db",
                      margin: "0 auto",
                      marginBottom: 8,
                    }}
                  />
                  <Typography sx={{ color: "grey.500" }}>
                    暂无审批记录
                  </Typography>
                </Box>
              ) : (
                <Stack spacing={2}>
                  {records.map((record) => (
                    <Box
                      key={record.id}
                      sx={{ borderLeft: 2, borderColor: "grey.300", pl: 2 }}
                    >
                      <Stack
                        direction="row"
                        spacing={0.5}
                        sx={{ alignItems: "center" }}
                      >
                        {record.action === "approve" ? (
                          <CheckCircle2
                            size={16}
                            style={{ color: "#16a34a" }}
                          />
                        ) : (
                          <XCircle size={16} style={{ color: "#dc2626" }} />
                        )}
                        <Typography variant="body2" sx={{ fontWeight: 500 }}>
                          {record.action === "approve" ? "通过" : "拒绝"}
                        </Typography>
                      </Stack>
                      <Typography
                        variant="caption"
                        color="text.secondary"
                        sx={{ display: "block" }}
                      >
                        {record.actor_name || record.actor_id}
                      </Typography>
                      <Typography
                        variant="caption"
                        color="text.secondary"
                        sx={{ display: "block" }}
                      >
                        {new Date(record.created_at).toLocaleString()}
                      </Typography>
                      {record.comment && (
                        <Typography
                          variant="caption"
                          color="text.secondary"
                          sx={{ fontStyle: "italic", display: "block", mt: 1 }}
                        >
                          "{record.comment}"
                        </Typography>
                      )}
                    </Box>
                  ))}
                </Stack>
              )}
            </CardContent>
          </Card>
        </Box>
      </Box>
    </Box>
  );
};

export default FlowInstanceDetailPage;
