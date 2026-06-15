import {
  Box,
  Button,
  Card,
  CardContent,
  CircularProgress,
  Dialog,
  DialogContent,
  DialogActions,
  DialogTitle,
  InputAdornment,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import React, { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import WorkflowDesigner from "../components/WorkflowDesigner";
import { useAppStore } from "../store";
import type {
  Workflow,
  CreateWorkflowRequest,
  UpdateWorkflowRequest,
} from "../api/flow";
import { flowApi } from "../api/flow";
import { Save, ArrowLeft } from "lucide-react";

const WorkflowDesignerPage: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const workflowId = searchParams.get("id");

  const { addNotification } = useAppStore();
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [showSaveDialog, setShowSaveDialog] = useState(false);
  const [workflow, setWorkflow] = useState<Workflow | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    description: "",
  });
  const [nodes, setNodes] = useState<any[]>([]);
  const [edges, setEdges] = useState<any[]>([]);

  useEffect(() => {
    if (workflowId) {
      loadWorkflow(workflowId);
    }
  }, [workflowId]);

  const loadWorkflow = async (id: string) => {
    try {
      setLoading(true);
      const response = await flowApi.getWorkflow(id);
      if (response.success && response.data) {
        const wf = response.data;
        setWorkflow(wf);
        setFormData({
          name: wf.name,
          description: wf.description || "",
        });
        // Convert workflow definition to nodes and edges
        if (wf.definition && wf.definition.nodes) {
          const approvalNodes = wf.definition.nodes as any[];
          const startNode = approvalNodes.find(
            (n) => n.node_id === wf.definition.start_node,
          );
          const convertedNodes = approvalNodes.map((node, index) => ({
            id: node.node_id,
            type:
              index === 0
                ? "start"
                : node.approvers?.length > 1
                  ? "approval"
                  : "task",
            x: 100 + (index % 3) * 250,
            y: 100 + Math.floor(index / 3) * 150,
            label: node.name || node.node_id,
            description: node.name,
          }));
          const convertedEdges = approvalNodes.flatMap((node) =>
            (node.next_nodes || []).map((targetId: string) => ({
              id: `edge-${node.node_id}-${targetId}`,
              source: node.node_id,
              target: targetId,
            })),
          );
          setNodes(convertedNodes);
          setEdges(convertedEdges);
        }
      } else {
        addNotification({
          title: "加载失败",
          message: response.message || "无法加载工作流",
          type: "error",
        });
      }
    } catch (error) {
      console.error("加载工作流失败:", error);
      addNotification({
        title: "加载失败",
        message: "加载工作流失败",
        type: "error",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSave = (newNodes: any[], newEdges: any[]) => {
    setNodes(newNodes);
    setEdges(newEdges);
    setShowSaveDialog(true);
  };

  const convertToWorkflowDefinition = () => {
    // Convert nodes and edges to workflow definition format
    const approvalNodes = nodes
      .filter((n) => n.type === "approval" || n.type === "task")
      .map((node, _index) => ({
        node_id: node.id,
        name: node.label,
        approvers: ["system-user-id"], // TODO: Get from node data
        approval_type: node.type === "approval" ? "single" : "single",
        conditions: undefined,
        timeout_hours: 24,
        auto_action: undefined,
        notification_users: undefined,
        next_nodes: edges
          .filter((e) => e.source === node.id)
          .map((e) => e.target),
      }));

    const startNode = nodes.find((n) => n.type === "start");
    const endNodes = nodes.filter((n) => n.type === "end").map((n) => n.id);

    return {
      version: "1.0",
      nodes: approvalNodes,
      start_node: startNode?.id || "",
      end_nodes: endNodes,
      timeout_action: "reject",
    };
  };

  const handleSaveWorkflow = async () => {
    if (!formData.name.trim()) {
      addNotification({
        title: "提示",
        message: "请输入工作流名称",
        type: "info",
      });
      return;
    }

    try {
      setSaving(true);
      const definition = convertToWorkflowDefinition();

      if (workflow) {
        // Update existing workflow
        const updateData: UpdateWorkflowRequest = {
          name: formData.name,
          description: formData.description,
          definition,
        };
        const response = await flowApi.updateWorkflow(workflow.id, updateData);
        if (response.success) {
          addNotification({
            title: "保存成功",
            message: "工作流已更新",
            type: "success",
          });
          setShowSaveDialog(false);
        } else {
          addNotification({
            title: "保存失败",
            message: response.message || "更新工作流失败",
            type: "error",
          });
        }
      } else {
        // Create new workflow
        const createData: CreateWorkflowRequest = {
          name: formData.name,
          description: formData.description,
          definition,
          is_active: true,
        };
        const response = await flowApi.createWorkflow(createData);
        if (response.success && response.data) {
          addNotification({
            title: "保存成功",
            message: "工作流已创建",
            type: "success",
          });
          setShowSaveDialog(false);
          // Navigate to edit mode
          navigate(`/workflow-designer?id=${response.data.id}`);
        } else {
          addNotification({
            title: "保存失败",
            message: response.message || "创建工作流失败",
            type: "error",
          });
        }
      }
    } catch (error) {
      console.error("保存工作流失败:", error);
      addNotification({
        title: "保存失败",
        message: "保存工作流失败",
        type: "error",
      });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          height: "100vh",
        }}
      >
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ height: "100vh", display: "flex", flexDirection: "column" }}>
      {/* Header */}
      <Card
        sx={{
          borderRadius: 0,
          borderBottom: "1px solid",
          borderColor: "divider",
        }}
      >
        <CardContent sx={{ p: 2 }}>
          <Stack
            direction="row"
            sx={{ alignItems: "center", justifyContent: "space-between" }}
          >
            <Stack direction="row" spacing={2} sx={{ alignItems: "center" }}>
              <Button
                variant="text"
                onClick={() => navigate("/workflows")}
                startIcon={<ArrowLeft size={20} />}
              >
                返回
              </Button>
              <Box>
                <Typography variant="h6" sx={{ fontWeight: 700 }}>
                  {workflow ? `编辑: ${workflow.name}` : "新建工作流"}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  设计工作流审批流程
                </Typography>
              </Box>
            </Stack>
          </Stack>
        </CardContent>
      </Card>

      {/* Designer */}
      <Box sx={{ flex: 1 }}>
        <WorkflowDesigner
          initialNodes={nodes}
          initialEdges={edges}
          onSave={handleSave}
        />
      </Box>

      {/* Save Dialog */}
      <Dialog open={showSaveDialog} onClose={() => setShowSaveDialog(false)}>
        <DialogContent sx={{ maxWidth: 400 }}>
          <DialogTitle>保存工作流</DialogTitle>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            请输入工作流名称和描述
          </Typography>
          <Stack spacing={2}>
            <Box>
              <Typography variant="body2" sx={{ mb: 0.5, fontWeight: 500 }}>
                工作流名称 *
              </Typography>
              <TextField
                fullWidth
                size="small"
                value={formData.name}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  setFormData({ ...formData, name: e.target.value })
                }
                placeholder="请输入工作流名称"
              />
            </Box>
            <Box>
              <Typography variant="body2" sx={{ mb: 0.5, fontWeight: 500 }}>
                描述
              </Typography>
              <TextField
                fullWidth
                size="small"
                multiline
                rows={3}
                value={formData.description}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  setFormData({ ...formData, description: e.target.value })
                }
                placeholder="请输入工作流描述"
              />
            </Box>
          </Stack>
          <DialogActions>
            <Button variant="outlined" onClick={() => setShowSaveDialog(false)}>
              取消
            </Button>
            <Button
              onClick={handleSaveWorkflow}
              disabled={saving}
              variant="contained"
              startIcon={saving ? undefined : <Save size={16} />}
            >
              {saving ? "保存中..." : "保存"}
            </Button>
          </DialogActions>
        </DialogContent>
      </Dialog>
    </Box>
  );
};

export default WorkflowDesignerPage;
