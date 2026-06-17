import React, { useState } from "react";
import {
  Box,
  Button,
  Card,
  CardContent,
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
import {
  Eye,
  Edit,
  Copy,
  Trash2,
  Plus,
  Search,
  FileText,
  Loader2,
} from "lucide-react";

interface FlowTemplate {
  id: string;
  name: string;
  type: string;
  scope: string;
  usageCount: number;
  creator: string;
  createdAt: string;
}

const mockTemplates: FlowTemplate[] = [
  {
    id: "TPL-001",
    name: "标准请假流程",
    type: "approval",
    scope: "全公司",
    usageCount: 156,
    creator: "张三",
    createdAt: "2024-01-10",
  },
  {
    id: "TPL-002",
    name: "差旅报销流程",
    type: "reimbursement",
    scope: "全公司",
    usageCount: 89,
    creator: "李四",
    createdAt: "2024-01-15",
  },
  {
    id: "TPL-003",
    name: "采购审批流程",
    type: "purchase",
    scope: "采购部",
    usageCount: 45,
    creator: "王五",
    createdAt: "2024-02-01",
  },
  {
    id: "TPL-004",
    name: "合同审批流程",
    type: "contract",
    scope: "法务部",
    usageCount: 23,
    creator: "赵六",
    createdAt: "2024-02-10",
  },
  {
    id: "TPL-005",
    name: "加班申请流程",
    type: "approval",
    scope: "全公司",
    usageCount: 234,
    creator: "张三",
    createdAt: "2024-02-15",
  },
  {
    id: "TPL-006",
    name: "设备借用流程",
    type: "approval",
    scope: "行政部",
    usageCount: 67,
    creator: "李四",
    createdAt: "2024-02-20",
  },
  {
    id: "TPL-007",
    name: "入职审批流程",
    type: "approval",
    scope: "人力资源部",
    usageCount: 12,
    creator: "孙七",
    createdAt: "2024-03-01",
  },
  {
    id: "TPL-008",
    name: "离职审批流程",
    type: "approval",
    scope: "人力资源部",
    usageCount: 8,
    creator: "孙七",
    createdAt: "2024-03-05",
  },
];

const getTypeText = (type: string) => {
  switch (type) {
    case "approval":
      return "审批流程";
    case "reimbursement":
      return "报销流程";
    case "purchase":
      return "采购流程";
    case "contract":
      return "合同流程";
    default:
      return type;
  }
};

const FlowTemplatePage: React.FC = () => {
  const [data, setData] = useState<FlowTemplate[]>(mockTemplates);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [page, setPage] = useState(1);
  const [pageSize] = useState(10);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<FlowTemplate | null>(
    null,
  );

  const filteredData = data.filter((item) => {
    const matchesSearch = item.name
      .toLowerCase()
      .includes(searchTerm.toLowerCase());
    const matchesType = typeFilter === "all" || item.type === typeFilter;
    return matchesSearch && matchesType;
  });

  const paginatedData = filteredData.slice(
    (page - 1) * pageSize,
    page * pageSize,
  );

  const totalPages = Math.ceil(filteredData.length / pageSize);

  const handleView = (template: FlowTemplate) => {
    console.log("查看模板:", template.id);
  };

  const handleEdit = (template: FlowTemplate) => {
    console.log("编辑模板:", template.id);
  };

  const handleCopy = (template: FlowTemplate) => {
    const newTemplate: FlowTemplate = {
      ...template,
      id: `TPL-${String(data.length + 1).padStart(3, "0")}`,
      name: `${template.name} (副本)`,
      usageCount: 0,
      createdAt: new Date().toISOString().split("T")[0],
    };
    setData((prev) => [...prev, newTemplate]);
  };

  const handleDelete = (template: FlowTemplate) => {
    setSelectedTemplate(template);
    setShowDeleteDialog(true);
  };

  const confirmDelete = () => {
    if (selectedTemplate) {
      setData((prev) => prev.filter((t) => t.id !== selectedTemplate.id));
      setShowDeleteDialog(false);
      setSelectedTemplate(null);
    }
  };

  const handleNewTemplate = () => {
    console.log("新建模板");
  };

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
            <FileText size={24} style={{ color: "#8b5cf6" }} />
          </Box>
          <Box>
            <Typography variant="h5" sx={{ fontWeight: 700 }}>
              流程模板
            </Typography>
            <Typography variant="body2" sx={{ color: "grey.500" }}>
              管理和使用流程模板
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
            placeholder="搜索模板名称..."
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
            <InputLabel>模板类型</InputLabel>
            <Select
              value={typeFilter}
              label="模板类型"
              onChange={(e) => setTypeFilter(e.target.value)}
            >
              <MenuItem value="all">全部</MenuItem>
              <MenuItem value="approval">审批流程</MenuItem>
              <MenuItem value="reimbursement">报销流程</MenuItem>
              <MenuItem value="purchase">采购流程</MenuItem>
              <MenuItem value="contract">合同流程</MenuItem>
            </Select>
          </FormControl>
          <Button
            variant="contained"
            startIcon={<Plus size={16} />}
            onClick={handleNewTemplate}
            sx={{ bgcolor: "#8b5cf6", "&:hover": { bgcolor: "#7c3aed" } }}
          >
            新建模板
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
                  <th>模板名称</th>
                  <th>模板类型</th>
                  <th>适用范围</th>
                  <th>使用次数</th>
                  <th>创建人</th>
                  <th>创建时间</th>
                  <th>操作</th>
                </Box>
              </Box>
              <Box component="tbody">
                {paginatedData.map((template, index) => (
                  <Box
                    component="tr"
                    key={template.id}
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
                    <td>{template.name}</td>
                    <td>{getTypeText(template.type)}</td>
                    <td>{template.scope}</td>
                    <td>{template.usageCount}</td>
                    <td>{template.creator}</td>
                    <td>{template.createdAt}</td>
                    <td>
                      <Stack direction="row" spacing={1}>
                        <IconButton
                          size="small"
                          onClick={() => handleView(template)}
                          title="查看"
                        >
                          <Eye size={18} />
                        </IconButton>
                        <IconButton
                          size="small"
                          onClick={() => handleEdit(template)}
                          title="编辑"
                        >
                          <Edit size={18} />
                        </IconButton>
                        <IconButton
                          size="small"
                          onClick={() => handleCopy(template)}
                          title="复制"
                        >
                          <Copy size={18} />
                        </IconButton>
                        <IconButton
                          size="small"
                          onClick={() => handleDelete(template)}
                          title="删除"
                          sx={{ color: "error.main" }}
                        >
                          <Trash2 size={18} />
                        </IconButton>
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
        open={showDeleteDialog}
        onClose={() => setShowDeleteDialog(false)}
      >
        <DialogTitle>删除模板</DialogTitle>
        <DialogContent>
          <Typography>
            确定要删除模板 <strong>{selectedTemplate?.name}</strong> 吗？
          </Typography>
          <Typography variant="body2" sx={{ color: "grey.500", mt: 1 }}>
            删除后无法恢复
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button color="inherit" onClick={() => setShowDeleteDialog(false)}>
            取消
          </Button>
          <Button variant="contained" color="error" onClick={confirmDelete}>
            确认删除
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default FlowTemplatePage;
