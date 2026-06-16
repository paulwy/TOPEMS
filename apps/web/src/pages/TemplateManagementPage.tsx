import React, { useState, useEffect } from "react";
import {
  FileText,
  Plus,
  Edit,
  Trash2,
  Copy,
  Eye,
  ChevronLeft,
  Search,
  Grid,
  List,
  Loader2,
  ToggleLeft,
  ToggleRight,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import {
  templateApi,
  type Template,
  type TemplateCategory,
  type CreateTemplateRequest,
} from "../api/template";
import { useNotification } from "../hooks/useNotification";
import { NotificationContainer } from "../components/NotificationContainer";
import {
  Box,
  Button,
  Typography,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Card,
  CardContent,
  IconButton,
  Tabs,
  Tab,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Chip,
} from "@mui/material";

const TemplateManagementPage: React.FC = () => {
  const navigate = useNavigate();
  const { success, error, notifications, hideNotification } = useNotification();

  const [templates, setTemplates] = useState<Template[]>([]);
  const [categories, setCategories] = useState<TemplateCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("");
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showPreviewModal, setShowPreviewModal] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<Template | null>(
    null,
  );

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      // Use real API
      const [templatesRes, categoriesRes] = await Promise.all([
        templateApi.list({ search: searchQuery, category: selectedCategory }),
        templateApi.listCategories(),
      ]);

      if (templatesRes.success && templatesRes.data) {
        setTemplates(templatesRes.data.items || []);
      }
      if (categoriesRes.success && categoriesRes.data) {
        setCategories(categoriesRes.data);
      }
    } catch (err: any) {
      console.error("Error loading templates:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateTemplate = async (data: CreateTemplateRequest) => {
    try {
      const res = await templateApi.create(data);
      if (res.success) {
        success("模板创建成功");
        setShowCreateModal(false);
        loadData();
      } else {
        error(res.message || "创建失败");
      }
    } catch (err: any) {
      error(err.message || "创建失败");
    }
  };

  const handleUpdateTemplate = async (
    id: string,
    data: Partial<CreateTemplateRequest>,
  ) => {
    try {
      const res = await templateApi.update(id, data);
      if (res.success) {
        success("模板更新成功");
        setShowEditModal(false);
        setSelectedTemplate(null);
        loadData();
      } else {
        error(res.message || "更新失败");
      }
    } catch (err: any) {
      error(err.message || "更新失败");
    }
  };

  const handleDeleteTemplate = async (id: string) => {
    if (!confirm("确定要删除这个模板吗？")) return;

    try {
      const res = await templateApi.delete(id);
      if (res.success) {
        success("模板删除成功");
        loadData();
      } else {
        error(res.message || "删除失败");
      }
    } catch (err: any) {
      error(err.message || "删除失败");
    }
  };

  const handleDuplicateTemplate = async (id: string) => {
    try {
      const res = await templateApi.duplicate(id);
      if (res.success) {
        success("模板复制成功");
        loadData();
      } else {
        error(res.message || "复制失败");
      }
    } catch (err: any) {
      error(err.message || "复制失败");
    }
  };

  const handleToggleStatus = async (id: string) => {
    try {
      const res = await templateApi.toggleStatus(id);
      if (res.success) {
        success("状态更新成功");
        loadData();
      } else {
        error(res.message || "更新失败");
      }
    } catch (err: any) {
      error(err.message || "更新失败");
    }
  };

  const filteredTemplates = templates.filter(
    (t) =>
      t.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.description?.toLowerCase().includes(searchQuery.toLowerCase()),
  );

  return (
    <Box sx={{ minHeight: "100vh", bgcolor: "grey.50" }}>
      <NotificationContainer
        notifications={notifications}
        onClose={hideNotification}
      />

      {/* Header */}
      <Box
        sx={{
          bgcolor: "background.paper",
          borderBottom: 1,
          borderColor: "divider",
        }}
      >
        <Box sx={{ maxWidth: "xl", mx: "auto", px: 3, py: 3 }}>
          <Box
            sx={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
              <IconButton onClick={() => navigate("/dashboard")}>
                <ChevronLeft sx={{ width: 20, height: 20 }} />
              </IconButton>
              <Box>
                <Typography
                  variant="h5"
                  sx={{ fontWeight: "bold", display: "flex", alignItems: "center" }}
                >
                  <FileText sx={{ width: 28, height: 28, mr: 1, color: "blue.600" }} />
                  模板管理
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                  管理和配置系统中的各类模板
                </Typography>
              </Box>
            </Box>
            <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
              <Button
                variant="contained"
                onClick={() => setShowCreateModal(true)}
              >
                <Plus sx={{ width: 20, height: 20, mr: 1 }} />
                新增模板
              </Button>
            </Box>
          </Box>
        </Box>
      </Box>

      {/* Filters */}
      <Box sx={{ maxWidth: "xl", mx: "auto", px: 3, py: 3 }}>
        <Card sx={{ p: 2, mb: 3 }}>
          <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
            <Box sx={{ position: "relative", flex: 1 }}>
              <Search
                sx={{
                  position: "absolute",
                  left: 12,
                  top: "50%",
                  transform: "translateY(-50%)",
                  width: 20,
                  height: 20,
                  color: "grey.400",
                }}
              />
              <TextField
                placeholder="搜索模板名称、编码..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                sx={{ pl: 5, width: "100%" }}
                size="small"
              />
            </Box>

            <FormControl size="small" sx={{ minWidth: 150 }}>
              <InputLabel>全部分类</InputLabel>
              <Select
                value={selectedCategory}
                label="全部分类"
                onChange={(e) => setSelectedCategory(e.target.value)}
              >
                <MenuItem value="">全部分类</MenuItem>
                {categories.map((cat) => (
                  <MenuItem key={cat.id} value={cat.code}>
                    {cat.name}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            <Box sx={{ display: "flex", border: 1, borderColor: "divider" }}>
              <Button
                variant={viewMode === "grid" ? "contained" : "text"}
                onClick={() => setViewMode("grid")}
                sx={{ borderRadius: 0 }}
              >
                <Grid sx={{ width: 20, height: 20 }} />
              </Button>
              <Button
                variant={viewMode === "list" ? "contained" : "text"}
                onClick={() => setViewMode("list")}
                sx={{ borderRadius: 0 }}
              >
                <List sx={{ width: 20, height: 20 }} />
              </Button>
            </Box>

            <Button variant="outlined" onClick={loadData}>
              刷新
            </Button>
          </Box>
        </Card>

        {/* Content */}
        <Card>
          {loading ? (
            <Box sx={{ p: 4, textAlign: "center" }}>
              <Loader2
                sx={{
                  width: 48,
                  height: 48,
                  color: "primary.main",
                  animation: "spin 1s linear infinite",
                  "@keyframes spin": {
                    "0%": { transform: "rotate(0deg)" },
                    "100%": { transform: "rotate(360deg)" },
                  },
                }}
              />
              <Typography color="text.secondary" sx={{ mt: 2 }}>
                加载中...
              </Typography>
            </Box>
          ) : filteredTemplates.length === 0 ? (
            <Box sx={{ p: 4, textAlign: "center" }}>
              <FileText sx={{ width: 48, height: 48, color: "grey.400", mb: 1.5 }} />
              <Typography color="text.secondary">暂无模板数据</Typography>
            </Box>
          ) : viewMode === "grid" ? (
            <Box
              sx={{
                display: "grid",
                gridTemplateColumns: {
                  xs: "1fr",
                  md: "repeat(2, 1fr)",
                  lg: "repeat(3, 1fr)",
                },
                gap: 3,
                p: 3,
              }}
            >
              {filteredTemplates.map((template) => (
                <Card
                  key={template.id}
                  sx={{
                    bgcolor: "grey.50",
                    "&:hover": { boxShadow: 3 },
                  }}
                >
                  <CardContent>
                    <Box
                      sx={{
                        display: "flex",
                        alignItems: "flex-start",
                        justifyContent: "space-between",
                        mb: 2,
                      }}
                    >
                      <Box
                        sx={{
                          width: 48,
                          height: 48,
                          bgcolor: "primary.100",
                          borderRadius: 1,
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                        }}
                      >
                        <FileText sx={{ width: 24, height: 24, color: "primary.main" }} />
                      </Box>
                      <IconButton
                        onClick={() => handleToggleStatus(template.id)}
                        sx={{
                          color: template.is_active ? "success.main" : "grey.400",
                          "&:hover": {
                            bgcolor: template.is_active ? "success.light" : "grey.200",
                          },
                        }}
                        title={template.is_active ? "已启用" : "已禁用"}
                      >
                        {template.is_active ? (
                          <ToggleRight sx={{ width: 20, height: 20 }} />
                        ) : (
                          <ToggleLeft sx={{ width: 20, height: 20 }} />
                        )}
                      </IconButton>
                    </Box>

                    <Typography variant="h6" sx={{ fontWeight: 600, mb: 0.5 }}>
                      {template.name}
                    </Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                      {template.code}
                    </Typography>

                    <Box sx={{ display: "flex", flexDirection: "column", gap: 0.5, mb: 2 }}>
                      <Typography variant="body2" color="text.secondary">
                        分类：
                        {categories.find((c) => c.id === template.category_id)
                          ?.name ||
                          template.category_name ||
                          "未分类"}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        模块：{template.module}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        变量数：{template.variables?.length || 0}
                      </Typography>
                    </Box>

                    <Box
                      sx={{
                        display: "flex",
                        justifyContent: "flex-end",
                        gap: 0.5,
                        pt: 2,
                        borderTop: 1,
                        borderColor: "divider",
                      }}
                    >
                      <IconButton
                        onClick={() => {
                          setSelectedTemplate(template);
                          setShowPreviewModal(true);
                        }}
                        sx={{ color: "primary.main" }}
                        title="预览"
                      >
                        <Eye sx={{ width: 16, height: 16 }} />
                      </IconButton>
                      <IconButton
                        onClick={() => handleDuplicateTemplate(template.id)}
                        sx={{ color: "success.main" }}
                        title="复制"
                      >
                        <Copy sx={{ width: 16, height: 16 }} />
                      </IconButton>
                      <IconButton
                        onClick={() => {
                          setSelectedTemplate(template);
                          setShowEditModal(true);
                        }}
                        sx={{ color: "primary.main" }}
                        title="编辑"
                      >
                        <Edit sx={{ width: 16, height: 16 }} />
                      </IconButton>
                      <IconButton
                        onClick={() => handleDeleteTemplate(template.id)}
                        sx={{ color: "error.main" }}
                        title="删除"
                      >
                        <Trash2 sx={{ width: 16, height: 16 }} />
                      </IconButton>
                    </Box>
                  </CardContent>
                </Card>
              ))}
            </Box>
          ) : (
            <Box>
              {filteredTemplates.map((template, index) => (
                <Box
                  key={template.id}
                  sx={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    p: 2,
                    borderBottom:
                      index < filteredTemplates.length - 1 ? 1 : 0,
                    borderColor: "divider",
                    "&:hover": { bgcolor: "grey.50" },
                  }}
                >
                  <Box sx={{ display: "flex", alignItems: "center", gap: 2, flex: 1 }}>
                    <Box
                      sx={{
                        width: 40,
                        height: 40,
                        bgcolor: "primary.100",
                        borderRadius: 1,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                    >
                      <FileText sx={{ width: 20, height: 20, color: "primary.main" }} />
                    </Box>
                    <Box sx={{ flex: 1 }}>
                      <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                        <Typography sx={{ fontWeight: 500 }}>
                          {template.name}
                        </Typography>
                        <Chip
                          label={template.is_active ? "已启用" : "已禁用"}
                          size="small"
                          sx={{
                            bgcolor: template.is_active ? "success.100" : "grey.100",
                            color: template.is_active ? "success.700" : "grey.700",
                          }}
                        />
                      </Box>
                      <Typography variant="body2" color="text.secondary">
                        {template.code} ·{" "}
                        {categories.find((c) => c.id === template.category_id)
                          ?.name ||
                          template.category_name ||
                          "未分类"}
                      </Typography>
                    </Box>
                  </Box>
                  <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
                    <IconButton
                      onClick={() => handleToggleStatus(template.id)}
                      sx={{
                        color: template.is_active ? "success.main" : "grey.400",
                      }}
                    >
                      {template.is_active ? (
                        <ToggleRight sx={{ width: 20, height: 20 }} />
                      ) : (
                        <ToggleLeft sx={{ width: 20, height: 20 }} />
                      )}
                    </IconButton>
                    <IconButton
                      onClick={() => {
                        setSelectedTemplate(template);
                        setShowPreviewModal(true);
                      }}
                      sx={{ color: "primary.main" }}
                    >
                      <Eye sx={{ width: 16, height: 16 }} />
                    </IconButton>
                    <IconButton
                      onClick={() => handleDuplicateTemplate(template.id)}
                      sx={{ color: "success.main" }}
                    >
                      <Copy sx={{ width: 16, height: 16 }} />
                    </IconButton>
                    <IconButton
                      onClick={() => {
                        setSelectedTemplate(template);
                        setShowEditModal(true);
                      }}
                      sx={{ color: "primary.main" }}
                    >
                      <Edit sx={{ width: 16, height: 16 }} />
                    </IconButton>
                    <IconButton
                      onClick={() => handleDeleteTemplate(template.id)}
                      sx={{ color: "error.main" }}
                    >
                      <Trash2 sx={{ width: 16, height: 16 }} />
                    </IconButton>
                  </Box>
                </Box>
              ))}
            </Box>
          )}
        </Card>
      </Box>

      {/* Create/Edit Modal */}
      {showCreateModal && (
        <TemplateFormModal
          onClose={() => setShowCreateModal(false)}
          onSubmit={handleCreateTemplate}
          categories={categories}
        />
      )}

      {showEditModal && selectedTemplate && (
        <TemplateFormModal
          template={selectedTemplate}
          onClose={() => {
            setShowEditModal(false);
            setSelectedTemplate(null);
          }}
          onSubmit={(data) => handleUpdateTemplate(selectedTemplate.id, data)}
          categories={categories}
        />
      )}

      {/* Preview Modal */}
      {showPreviewModal && selectedTemplate && (
        <TemplatePreviewModal
          template={selectedTemplate}
          onClose={() => {
            setShowPreviewModal(false);
            setSelectedTemplate(null);
          }}
        />
      )}
    </Box>
  );
};

// Template Form Modal Component
interface TemplateFormModalProps {
  template?: Template;
  onClose: () => void;
  onSubmit: (data: CreateTemplateRequest) => void;
  categories: TemplateCategory[];
}

const TemplateFormModal: React.FC<TemplateFormModalProps> = ({
  template,
  onClose,
  onSubmit,
  categories,
}) => {
  const [formData, setFormData] = useState<CreateTemplateRequest>({
    name: template?.name || "",
    code: template?.code || "",
    category_id: template?.category_id,
    module: template?.module || "",
    description: template?.description || "",
    content: template?.content || "",
    variables: template?.variables || [],
    is_active: template?.is_active ?? true,
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(formData);
  };

  return (
    <Dialog
      open
      onClose={onClose}
      maxWidth="md"
      fullWidth
      PaperProps={{
        sx: { maxHeight: "90vh" },
      }}
    >
      <DialogTitle>{template ? "编辑模板" : "新增模板"}</DialogTitle>
      <DialogContent sx={{ overflowY: "auto" }}>
        <Box
          component="form"
          onSubmit={handleSubmit}
          sx={{ display: "flex", flexDirection: "column", gap: 2, pt: 1 }}
        >
          <Box sx={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 2 }}>
            <TextField
              label="模板名称 *"
              value={formData.name}
              onChange={(e) =>
                setFormData({ ...formData, name: e.target.value })
              }
              required
              placeholder="请输入模板名称"
              size="small"
            />
            <TextField
              label="模板编码 *"
              value={formData.code}
              onChange={(e) =>
                setFormData({ ...formData, code: e.target.value })
              }
              required
              placeholder="请输入模板编码"
              size="small"
            />
          </Box>

          <Box sx={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 2 }}>
            <FormControl size="small" required>
              <InputLabel>分类 *</InputLabel>
              <Select
                value={formData.category_id || ""}
                label="分类 *"
                onChange={(e) =>
                  setFormData({ ...formData, category_id: e.target.value })
                }
              >
                <MenuItem value="">请选择分类</MenuItem>
                {categories.map((cat) => (
                  <MenuItem key={cat.id} value={cat.id}>
                    {cat.name}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            <FormControl size="small" required>
              <InputLabel>所属模块 *</InputLabel>
              <Select
                value={formData.module}
                label="所属模块 *"
                onChange={(e) =>
                  setFormData({ ...formData, module: e.target.value })
                }
              >
                <MenuItem value="">请选择模块</MenuItem>
                <MenuItem value="ERP">ERP</MenuItem>
                <MenuItem value="HRM">HRM</MenuItem>
                <MenuItem value="CRM">CRM</MenuItem>
                <MenuItem value="QMS">QMS</MenuItem>
                <MenuItem value="LIMS">LIMS</MenuItem>
                <MenuItem value="其他">其他</MenuItem>
              </Select>
            </FormControl>
          </Box>

          <TextField
            label="描述"
            value={formData.description || ""}
            onChange={(e) =>
              setFormData({ ...formData, description: e.target.value })
            }
            multiline
            rows={2}
            placeholder="请输入模板描述"
            size="small"
          />

          <TextField
            label="模板内容 *"
            value={formData.content}
            onChange={(e) =>
              setFormData({ ...formData, content: e.target.value })
            }
            required
            multiline
            rows={10}
            placeholder="请输入模板内容，使用 {{variable_name}} 格式定义变量"
            size="small"
            sx={{ fontFamily: "monospace" }}
          />
          <Typography variant="caption" color="text.secondary">
            使用 {"{{variable_name}}"} 格式定义变量
          </Typography>
        </Box>
      </DialogContent>
      <DialogActions sx={{ p: 2 }}>
        <Button variant="outlined" onClick={onClose}>
          取消
        </Button>
        <Button variant="contained" onClick={handleSubmit}>
          {template ? "保存" : "创建"}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

// Template Preview Modal Component
interface TemplatePreviewModalProps {
  template: Template;
  onClose: () => void;
}

const TemplatePreviewModal: React.FC<TemplatePreviewModalProps> = ({
  template,
  onClose,
}) => {
  return (
    <Dialog
      open
      onClose={onClose}
      maxWidth="lg"
      fullWidth
      PaperProps={{
        sx: { maxHeight: "90vh" },
      }}
    >
      <DialogTitle>模板预览</DialogTitle>
      <DialogContent sx={{ overflowY: "auto" }}>
        <Box sx={{ mb: 3 }}>
          <Typography variant="h6" sx={{ fontWeight: "bold", mb: 1 }}>
            {template.name}
          </Typography>
          <Box sx={{ display: "flex", gap: 3, color: "text.secondary", fontSize: "0.875rem" }}>
            <Typography variant="body2">编码：{template.code}</Typography>
            <Typography variant="body2">分类：{template.category_name || "未分类"}</Typography>
            <Typography variant="body2">模块：{template.module}</Typography>
          </Box>
          {template.description && (
            <Typography color="text.secondary" sx={{ mt: 1 }}>
              {template.description}
            </Typography>
          )}
        </Box>

        <Card sx={{ bgcolor: "grey.50", p: 2, mb: 3 }}>
          <Typography sx={{ fontWeight: "semibold", mb: 1 }}>模板内容：</Typography>
          <Box
            component="pre"
            sx={{
              whiteSpace: "pre-wrap",
              fontFamily: "monospace",
              fontSize: "0.875rem",
              color: "text.secondary",
            }}
          >
            {template.content}
          </Box>
        </Card>

        {template.variables && template.variables.length > 0 && (
          <Box sx={{ mt: 2 }}>
            <Typography sx={{ fontWeight: "semibold", mb: 1 }}>变量定义：</Typography>
            <Box sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
              {template.variables.map((variable, idx) => (
                <Box
                  key={idx}
                  sx={{
                    display: "flex",
                    alignItems: "center",
                    gap: 2,
                    p: 1.5,
                    bgcolor: "grey.50",
                    borderRadius: 1,
                  }}
                >
                  <Typography
                    sx={{
                      fontFamily: "monospace",
                      color: "primary.main",
                    }}
                  >
                    {"{{"}
                    {variable.key}
                    {"}}"}
                  </Typography>
                  <Typography color="text.secondary">
                    {variable.label}
                  </Typography>
                  <Chip label={variable.type} size="small" sx={{ fontSize: "0.75rem" }} />
                  {variable.required && (
                    <Typography sx={{ color: "error.main", fontSize: "0.75rem" }}>
                      必填
                    </Typography>
                  )}
                </Box>
              ))}
            </Box>
          </Box>
        )}
      </DialogContent>
      <DialogActions sx={{ p: 2 }}>
        <Button variant="outlined" onClick={onClose}>
          关闭
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default TemplateManagementPage;
