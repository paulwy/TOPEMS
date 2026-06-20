import React, { useState, useMemo } from "react";
import {
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControl,
  IconButton,
  InputLabel,
  MenuItem,
  Pagination,
  Select,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import { FileUpload } from "@/components/common";
import { DataExport } from "@/components/common";
import {
  Eye,
  Plus,
  Edit,
  Send,
  Ban,
  Search,
  GitBranch,
  Loader2,
  Upload,
} from "lucide-react";

interface FlowDefinition {
  id: string;
  name: string;
  type: string;
  version: string;
  status: "active" | "inactive" | "draft";
  creator: string;
  createdAt: string;
}

const mockFlowDefinitions: FlowDefinition[] = [
  {
    id: "1",
    name: "请假审批流程",
    type: "approval",
    version: "v1.2",
    status: "active",
    creator: "张三",
    createdAt: "2024-01-15 10:30",
  },
  {
    id: "2",
    name: "费用报销流程",
    type: "reimbursement",
    version: "v2.0",
    status: "active",
    creator: "李四",
    createdAt: "2024-02-20 14:20",
  },
  {
    id: "3",
    name: "合同审批流程",
    type: "contract",
    version: "v1.0",
    status: "draft",
    creator: "王五",
    createdAt: "2024-03-05 09:15",
  },
  {
    id: "4",
    name: "采购申请流程",
    type: "purchase",
    version: "v1.1",
    status: "active",
    creator: "赵六",
    createdAt: "2024-03-10 16:45",
  },
  {
    id: "5",
    name: "加班申请流程",
    type: "approval",
    version: "v1.0",
    status: "inactive",
    creator: "张三",
    createdAt: "2024-03-12 11:00",
  },
  {
    id: "6",
    name: "设备借用流程",
    type: "approval",
    version: "v1.0",
    status: "active",
    creator: "李四",
    createdAt: "2024-03-15 13:30",
  },
  {
    id: "7",
    name: "差旅申请流程",
    type: "travel",
    version: "v2.1",
    status: "active",
    creator: "王五",
    createdAt: "2024-03-18 08:00",
  },
  {
    id: "8",
    name: "入职审批流程",
    type: "approval",
    version: "v1.0",
    status: "draft",
    creator: "赵六",
    createdAt: "2024-03-20 10:15",
  },
];

const getStatusColor = (
  status: FlowDefinition["status"],
): "success" | "default" | "warning" => {
  switch (status) {
    case "active":
      return "success";
    case "inactive":
      return "default";
    case "draft":
      return "warning";
  }
};

const getStatusText = (status: FlowDefinition["status"]) => {
  switch (status) {
    case "active":
      return "已发布";
    case "inactive":
      return "已禁用";
    case "draft":
      return "草稿";
  }
};

const FlowDefinitionPage: React.FC = () => {
  const [data, setData] = useState<FlowDefinition[]>(mockFlowDefinitions);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [page, setPage] = useState(1);
  const [pageSize] = useState(10);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [selectedFlow, setSelectedFlow] = useState<FlowDefinition | null>(null);
  const [attachments, setAttachments] = useState<string[]>([]);

  const filteredData = data.filter((item) => {
    const matchesSearch = item.name
      .toLowerCase()
      .includes(searchTerm.toLowerCase());
    const matchesType = typeFilter === "all" || item.type === typeFilter;
    const matchesStatus =
      statusFilter === "all" || item.status === statusFilter;
    return matchesSearch && matchesType && matchesStatus;
  });

  const paginatedData = filteredData.slice(
    (page - 1) * pageSize,
    page * pageSize,
  );

  const totalPages = Math.ceil(filteredData.length / pageSize);

  const handleView = (flow: FlowDefinition) => {
    setSelectedFlow(flow);
    setShowDetailModal(true);
  };

  const handleEdit = (flow: FlowDefinition) => {
    console.log("编辑流程:", flow.id);
  };

  const handlePublish = (flow: FlowDefinition) => {
    setData((prev) =>
      prev.map((f) =>
        f.id === flow.id ? { ...f, status: "active" as const } : f,
      ),
    );
  };

  const handleDisable = (flow: FlowDefinition) => {
    setData((prev) =>
      prev.map((f) =>
        f.id === flow.id ? { ...f, status: "inactive" as const } : f,
      ),
    );
  };

  // 导出字段配置
  const exportFields = useMemo(
    () => [
      { key: "name", title: "流程名称" },
      { key: "type", title: "流程类型" },
      { key: "version", title: "版本" },
      { key: "status", title: "状态" },
      { key: "creator", title: "创建人" },
      { key: "createdAt", title: "创建时间" },
    ],
    [],
  );

  return (
    <Box sx={{ minHeight: "100vh", bgcolor: "grey.50", p: 3 }}>
      <Box
        sx={{ bgcolor: "white", borderRadius: 1, boxShadow: 1, p: 3, mb: 3 }}
      >
        <Stack direction="row" sx={{ alignItems: "center" }} spacing={2}>
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
            <GitBranch size={24} style={{ color: "#8b5cf6" }} />
          </Box>
          <Box>
            <Typography variant="h5" sx={{ fontWeight: 700 }}>
              流程定义
            </Typography>
            <Typography variant="body2" sx={{ color: "grey.500" }}>
              管理所有流程的定义和配置
            </Typography>
          </Box>
        </Stack>
      </Box>

      <Box
        sx={{ bgcolor: "white", borderRadius: 1, boxShadow: 1, p: 3, mb: 3 }}
      >
        <Stack direction="row" sx={{ alignItems: "center" }} spacing={2}>
          <TextField
            size="small"
            type="text"
            placeholder="搜索流程名称..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            slotProps={{
              input: {
                startAdornment: (
                  <Search
                    size={20}
                    style={{ marginRight: 8, color: "#9ca3af" }}
                  />
                ),
              },
            }}
            sx={{ flex: 1, maxWidth: 300 }}
          />
          <FormControl size="small" sx={{ minWidth: 150 }}>
            <InputLabel>流程类型</InputLabel>
            <Select
              value={typeFilter}
              label="流程类型"
              onChange={(e) => setTypeFilter(e.target.value)}
            >
              <MenuItem value="all">全部</MenuItem>
              <MenuItem value="approval">审批流程</MenuItem>
              <MenuItem value="reimbursement">报销流程</MenuItem>
              <MenuItem value="contract">合同流程</MenuItem>
              <MenuItem value="purchase">采购流程</MenuItem>
              <MenuItem value="travel">差旅流程</MenuItem>
            </Select>
          </FormControl>
          <FormControl size="small" sx={{ minWidth: 120 }}>
            <InputLabel>状态</InputLabel>
            <Select
              value={statusFilter}
              label="状态"
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <MenuItem value="all">全部</MenuItem>
              <MenuItem value="active">已发布</MenuItem>
              <MenuItem value="draft">草稿</MenuItem>
              <MenuItem value="inactive">已禁用</MenuItem>
            </Select>
          </FormControl>
          <DataExport
            data={data as unknown as Record<string, unknown>[]}
            fields={exportFields}
            defaultFileName="流程定义数据"
            buttonText="导出"
          />
          <Button
            variant="contained"
            startIcon={<Plus size={16} />}
            sx={{ bgcolor: "#8b5cf6", "&:hover": { bgcolor: "#7c3aed" } }}
          >
            新建流程
          </Button>
          <Button
            variant="outlined"
            startIcon={<Upload size={16} />}
            onClick={() => setShowUploadModal(true)}
          >
            上传
          </Button>
          <IconButton onClick={() => setLoading(true)} title="刷新">
            <Loader2
              size={20}
              sx={{
                animation: loading ? "spin 1s linear infinite" : "none",
              }}
            />
          </IconButton>
        </Stack>
      </Box>

      <Card>
        <CardContent sx={{ p: 0 }}>
          <Box sx={{ overflowX: "auto" }}>
            <Box
              component="table"
              sx={{ width: "100%", borderCollapse: "collapse" }}
            >
              <Box component="thead">
                <Box
                  component="tr"
                  sx={{
                    bgcolor: "grey.100",
                    "& th": {
                      px: 3,
                      py: 2,
                      textAlign: "left",
                      fontWeight: 600,
                      fontSize: 14,
                      color: "grey.700",
                    },
                  }}
                >
                  <th>流程名称</th>
                  <th>流程类型</th>
                  <th>版本</th>
                  <th>状态</th>
                  <th>创建人</th>
                  <th>创建时间</th>
                  <th>操作</th>
                </Box>
              </Box>
              <Box component="tbody">
                {paginatedData.map((flow, index) => (
                  <Box
                    component="tr"
                    key={flow.id}
                    sx={{
                      borderBottom: "1px solid",
                      borderColor: "divider",
                      bgcolor: index % 2 === 0 ? "white" : "grey.50",
                      "&:hover": { bgcolor: "primary.light" },
                      "& td": {
                        px: 3,
                        py: 2,
                        fontSize: 14,
                      },
                    }}
                  >
                    <td>{flow.name}</td>
                    <td>
                      {flow.type === "approval"
                        ? "审批流程"
                        : flow.type === "reimbursement"
                          ? "报销流程"
                          : flow.type === "contract"
                            ? "合同流程"
                            : flow.type === "purchase"
                              ? "采购流程"
                              : "差旅流程"}
                    </td>
                    <td>{flow.version}</td>
                    <td>
                      <Chip
                        size="small"
                        label={getStatusText(flow.status)}
                        color={getStatusColor(flow.status)}
                      />
                    </td>
                    <td>{flow.creator}</td>
                    <td>{flow.createdAt}</td>
                    <td>
                      <Stack direction="row" spacing={1}>
                        <IconButton
                          size="small"
                          onClick={() => handleView(flow)}
                          title="查看"
                        >
                          <Eye size={18} />
                        </IconButton>
                        <IconButton
                          size="small"
                          onClick={() => handleEdit(flow)}
                          title="编辑"
                        >
                          <Edit size={18} />
                        </IconButton>
                        {flow.status !== "active" && (
                          <IconButton
                            size="small"
                            onClick={() => handlePublish(flow)}
                            title="发布"
                          >
                            <Send size={18} />
                          </IconButton>
                        )}
                        {flow.status === "active" && (
                          <IconButton
                            size="small"
                            onClick={() => handleDisable(flow)}
                            title="禁用"
                          >
                            <Ban size={18} />
                          </IconButton>
                        )}
                      </Stack>
                    </td>
                  </Box>
                ))}
              </Box>
            </Box>
          </Box>
        </CardContent>
      </Card>

      {totalPages > 1 && (
        <Box sx={{ display: "flex", justifyContent: "center", mt: 3 }}>
          <Pagination
            count={totalPages}
            page={page}
            onChange={(_, newPage) => setPage(newPage)}
            color="primary"
          />
        </Box>
      )}

      <Dialog
        open={showDetailModal}
        onClose={() => setShowDetailModal(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>流程详情</DialogTitle>
        <DialogContent>
          {selectedFlow && (
            <Stack spacing={2} sx={{ mt: 2 }}>
              <Box>
                <Typography variant="body2" sx={{ color: "grey.500" }}>
                  流程名称
                </Typography>
                <Typography variant="body1">{selectedFlow.name}</Typography>
              </Box>
              <Box>
                <Typography variant="body2" sx={{ color: "grey.500" }}>
                  流程类型
                </Typography>
                <Typography variant="body1">{selectedFlow.type}</Typography>
              </Box>
              <Box>
                <Typography variant="body2" sx={{ color: "grey.500" }}>
                  版本
                </Typography>
                <Typography variant="body1">{selectedFlow.version}</Typography>
              </Box>
              <Box>
                <Typography variant="body2" sx={{ color: "grey.500" }}>
                  状态
                </Typography>
                <Chip
                  size="small"
                  label={getStatusText(selectedFlow.status)}
                  color={getStatusColor(selectedFlow.status)}
                />
              </Box>
              <Box>
                <Typography variant="body2" sx={{ color: "grey.500" }}>
                  创建人
                </Typography>
                <Typography variant="body1">{selectedFlow.creator}</Typography>
              </Box>
              <Box>
                <Typography variant="body2" sx={{ color: "grey.500" }}>
                  创建时间
                </Typography>
                <Typography variant="body1">
                  {selectedFlow.createdAt}
                </Typography>
              </Box>
            </Stack>
          )}
        </DialogContent>
      </Dialog>

      <Dialog
        open={showUploadModal}
        onClose={() => setShowUploadModal(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>上传流程文件</DialogTitle>
        <DialogContent>
          <Box sx={{ py: 2 }}>
            <FileUpload
              value={attachments}
              onChange={setAttachments}
              accept={["bpmn", "xml", "json"]}
              maxCount={5}
              maxSize={10}
              maxTotalSize={50}
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowUploadModal(false)}>关闭</Button>
          <Button
            variant="contained"
            sx={{ bgcolor: "#8b5cf6" }}
            onClick={() => {
              console.log("上传的流程文件:", attachments);
              setShowUploadModal(false);
            }}
          >
            完成上传
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default FlowDefinitionPage;
