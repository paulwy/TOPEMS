import React, { useState, useEffect } from "react";
import {
  CheckCircle,
  XCircle,
  Clock,
  AlertCircle,
  User,
  Users,
  Search,
  Filter,
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
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

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
        return <CheckCircle className="w-5 h-5 text-green-600" />;
      case "rejected":
        return <XCircle className="w-5 h-5 text-red-600" />;
      case "pending":
        return <Clock className="w-5 h-5 text-yellow-600" />;
      default:
        return <AlertCircle className="w-5 h-5 text-gray-600" />;
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

  const getStatusColor = (status: string) => {
    switch (status) {
      case "approved":
        return "bg-green-100 text-green-700";
      case "rejected":
        return "bg-red-100 text-red-700";
      case "pending":
        return "bg-yellow-100 text-yellow-700";
      default:
        return "bg-gray-100 text-gray-700";
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
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-6">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6 mb-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-12 h-12 bg-indigo-100 dark:bg-indigo-900 rounded-lg flex items-center justify-center">
              <CheckCircle className="w-6 h-6 text-indigo-600 dark:text-indigo-400" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                审批管理
              </h1>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {pendingCount > 0 ? (
                  <span className="text-indigo-600 dark:text-indigo-400 font-medium">
                    {pendingCount} 项待审批
                  </span>
                ) : (
                  "暂无待审批项"
                )}
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm mb-6">
        <div className="border-b dark:border-gray-700">
          <nav className="flex space-x-8 px-6">
            <button
              onClick={() => setActiveTab("pending")}
              className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                activeTab === "pending"
                  ? "border-indigo-500 text-indigo-600 dark:text-indigo-400"
                  : "border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:border-gray-300"
              }`}
            >
              <div className="flex items-center">
                <Clock className="w-5 h-5 mr-2" />
                待我审批 ({pendingCount})
              </div>
            </button>
            <button
              onClick={() => setActiveTab("history")}
              className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                activeTab === "history"
                  ? "border-indigo-500 text-indigo-600 dark:text-indigo-400"
                  : "border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:border-gray-300"
              }`}
            >
              <div className="flex items-center">
                <List className="w-5 h-5 mr-2" />
                审批历史
              </div>
            </button>
          </nav>
        </div>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6 mb-6">
        <div className="flex items-center space-x-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
            <Input
              type="text"
              placeholder="搜索审批任务..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          {activeTab === "pending" && (
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-32">
                <SelectValue placeholder="状态" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="pending">待审批</SelectItem>
                <SelectItem value="all">全部</SelectItem>
              </SelectContent>
            </Select>
          )}
          <Button variant="secondary" onClick={loadData} title="刷新">
            <Loader2 className={`w-5 h-5 ${loading ? "animate-spin" : ""}`} />
          </Button>
        </div>
      </div>

      <Card>
        <CardContent className="p-6">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
            </div>
          ) : filteredApprovals.length === 0 ? (
            <div className="text-center py-12">
              <CheckCircle2 className="w-16 h-16 mx-auto text-gray-300 dark:text-gray-600 mb-4" />
              <p className="text-gray-500 dark:text-gray-400">
                {activeTab === "pending" ? "暂无待审批项" : "暂无审批记录"}
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredApprovals.map((approval) => (
                <div
                  key={approval.id}
                  className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 hover:border-indigo-300 dark:hover:border-indigo-600 transition-colors"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-3 mb-2">
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                          {approval.task_name}
                        </h3>
                        <Badge
                          variant={
                            approval.status === "approved"
                              ? "secondary"
                              : approval.status === "rejected"
                                ? "destructive"
                                : "outline"
                          }
                        >
                          {getStatusIcon(approval.status)}
                          <span className="ml-1">
                            {getStatusText(approval.status)}
                          </span>
                        </Badge>
                      </div>
                      <div className="flex items-center space-x-4 text-sm text-gray-600 dark:text-gray-400 mb-2">
                        {approval.node_id && (
                          <span className="flex items-center">
                            <FileText className="w-4 h-4 mr-1" />
                            节点: {approval.node_id}
                          </span>
                        )}
                        {approval.approval_type && (
                          <span className="flex items-center">
                            <Users className="w-4 h-4 mr-1" />
                            {approval.approval_type === "single"
                              ? "单人审批"
                              : approval.approval_type === "counter"
                                ? "会签审批"
                                : "或签审批"}
                          </span>
                        )}
                      </div>
                      {approval.comment && (
                        <p className="text-sm text-gray-500 dark:text-gray-400 mb-2">
                          <MessageSquare className="w-4 h-4 inline mr-1" />
                          {approval.comment}
                        </p>
                      )}
                      <div className="flex items-center space-x-4 text-xs text-gray-500 dark:text-gray-400">
                        <span className="flex items-center">
                          <Clock className="w-4 h-4 mr-1" />
                          创建于{" "}
                          {new Date(approval.created_at).toLocaleString()}
                        </span>
                        {approval.approved_at && (
                          <span className="flex items-center">
                            <CheckCircle className="w-4 h-4 mr-1" />
                            处理于{" "}
                            {new Date(approval.approved_at).toLocaleString()}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      {approval.status === "pending" && (
                        <>
                          <Button
                            onClick={() => {
                              setSelectedApproval(approval);
                              setApprovalAction("approve");
                              setComment("");
                              setShowApprovalModal(true);
                            }}
                            className="bg-green-600 hover:bg-green-700 text-white"
                          >
                            <CheckCircle className="w-4 h-4 mr-1" />
                            通过
                          </Button>
                          <Button
                            onClick={() => {
                              setSelectedApproval(approval);
                              setApprovalAction("reject");
                              setComment("");
                              setShowApprovalModal(true);
                            }}
                            className="bg-red-600 hover:bg-red-700 text-white"
                          >
                            <XCircle className="w-4 h-4 mr-1" />
                            拒绝
                          </Button>
                        </>
                      )}
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() =>
                          navigate(`/flow/approvals/${approval.id}`)
                        }
                        title="查看详情"
                      >
                        <Eye className="w-5 h-5" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={showApprovalModal} onOpenChange={setShowApprovalModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {approvalAction === "approve" ? "通过审批" : "拒绝审批"}
            </DialogTitle>
            <DialogDescription>
              {approvalAction === "approve"
                ? "确认通过该审批任务"
                : "确认拒绝该审批任务"}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            {selectedApproval && (
              <>
                <p className="text-gray-600 dark:text-gray-400">
                  任务: {selectedApproval.task_name}
                </p>
                {selectedApproval.node_id && (
                  <p className="text-gray-600 dark:text-gray-400">
                    节点: {selectedApproval.node_id}
                  </p>
                )}
              </>
            )}
            <div className="space-y-2">
              <Label htmlFor="comment">
                {approvalAction === "reject" ? "拒绝原因 *" : "备注"}
              </Label>
              <Textarea
                id="comment"
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                rows={4}
                placeholder={
                  approvalAction === "reject" ? "请输入拒绝原因" : "可选备注"
                }
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="secondary"
              onClick={() => {
                setShowApprovalModal(false);
                setSelectedApproval(null);
              }}
            >
              取消
            </Button>
            <Button
              onClick={handleProcessApproval}
              disabled={
                processing || (approvalAction === "reject" && !comment.trim())
              }
              className={
                approvalAction === "approve"
                  ? "bg-green-600 hover:bg-green-700"
                  : "bg-red-600 hover:bg-red-700"
              }
            >
              {processing && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              {approvalAction === "approve" ? "确认通过" : "确认拒绝"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default FlowApprovalPage;
