import React, { useState, useEffect } from "react";
import {
  Plus,
  Edit2,
  Trash2,
  Copy,
  Search,
  Grid3X3,
  LayoutDashboard,
  FolderOpen,
  Check,
  X,
} from "lucide-react";
import {
  Box,
  Typography,
  Button,
  Card,
  CardContent,
  CardHeader,
  CardActions,
  Chip,
  Divider,
  TextField,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Menu,
  MenuItem,
  IconButton,
  Tooltip,
  Skeleton,
  FormControl,
  InputLabel,
  Select,
  Switch,
  FormControlLabel,
} from "@mui/material";
import {
  fetchDashboardTemplates,
  createDashboardTemplate,
  updateDashboardTemplate,
  deleteDashboardTemplate,
  createDashboardFromTemplate,
  type DashboardTemplate,
} from "@/api/bi";
import { logger } from "@/utils/logger";

export const DashboardTemplateManager: React.FC<{
  onDashboardCreated?: () => void;
}> = ({ onDashboardCreated }) => {
  const [templates, setTemplates] = useState<DashboardTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<DashboardTemplate | null>(null);
  const [newTemplate, setNewTemplate] = useState({
    name: "",
    description: "",
    category: "通用",
    tags: [] as string[],
    is_active: true,
  });

  const categories = ["all", "通用", "销售", "财务", "运营", "市场"];

  const loadTemplates = async () => {
    setLoading(true);
    try {
      const res = await fetchDashboardTemplates();
      if (res.success && res.data) {
        setTemplates(res.data.items || []);
      }
    } catch (error) {
      logger.error("Failed to load templates:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTemplates();
  }, []);

  const handleCreateTemplate = async () => {
    try {
      const res = await createDashboardTemplate(newTemplate);
      if (res.success) {
        loadTemplates();
        setShowCreateModal(false);
        setNewTemplate({
          name: "",
          description: "",
          category: "通用",
          tags: [],
          is_active: true,
        });
      }
    } catch (error) {
      logger.error("Failed to create template:", error);
    }
  };

  const handleUpdateTemplate = async () => {
    if (!editingTemplate) return;
    try {
      const res = await updateDashboardTemplate(editingTemplate.id, newTemplate);
      if (res.success) {
        loadTemplates();
        setShowEditModal(false);
        setEditingTemplate(null);
        setNewTemplate({
          name: "",
          description: "",
          category: "通用",
          tags: [],
          is_active: true,
        });
      }
    } catch (error) {
      logger.error("Failed to update template:", error);
    }
  };

  const handleDeleteTemplate = async (id: string) => {
    if (!confirm("确定要删除这个模板吗？")) return;
    try {
      const res = await deleteDashboardTemplate(id);
      if (res.success) {
        loadTemplates();
      }
    } catch (error) {
      logger.error("Failed to delete template:", error);
    }
  };

  const handleCreateDashboard = async (templateId: string) => {
    try {
      const template = templates.find((t) => t.id === templateId);
      const name = template ? `${template.name} - 副本` : "新仪表盘";
      const res = await createDashboardFromTemplate(templateId, { name, is_public: false });
      if (res.success) {
        onDashboardCreated?.();
      }
    } catch (error) {
      logger.error("Failed to create dashboard from template:", error);
    }
  };

  const handleOpenEditModal = (template: DashboardTemplate) => {
    setEditingTemplate(template);
    setNewTemplate({
      name: template.name,
      description: template.description || "",
      category: template.category || "通用",
      tags: template.tags || [],
      is_active: template.is_active || true,
    });
    setShowEditModal(true);
  };

  const addTag = (tag: string) => {
    if (tag && !newTemplate.tags.includes(tag)) {
      setNewTemplate((prev) => ({ ...prev, tags: [...prev.tags, tag] }));
    }
  };

  const removeTag = (tag: string) => {
    setNewTemplate((prev) => ({ ...prev, tags: prev.tags.filter((t) => t !== tag) }));
  };

  const filteredTemplates = templates.filter((t) => {
    const matchSearch =
      t.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      t.description?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchCategory = selectedCategory === "all" || t.category === selectedCategory;
    return matchSearch && matchCategory;
  });

  return (
    <Box>
      <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 4 }}>
        <Box sx={{ display: "flex", alignItems: "center", gap: 3 }}>
          <TextField
            placeholder="搜索模板..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            size="small"
            sx={{ width: 250 }}
          />
          <FormControl size="small" sx={{ minWidth: 120 }}>
            <InputLabel>分类</InputLabel>
            <Select
              value={selectedCategory}
              label="分类"
              onChange={(e) => setSelectedCategory(e.target.value)}
            >
              {categories.map((cat) => (
                <MenuItem key={cat} value={cat}>
                  {cat === "all" ? "全部" : cat}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </Box>
        <Button
          variant="contained"
          startIcon={<Plus />}
          onClick={() => setShowCreateModal(true)}
        >
          创建模板
        </Button>
      </Box>

      {loading ? (
        <Box sx={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 3 }}>
          {[1, 2, 3].map((i) => (
            <Card key={i}>
              <CardContent>
                <Skeleton sx={{ width: "60%", mb: 2 }} />
                <Skeleton sx={{ width: "100%", height: 120 }} />
              </CardContent>
            </Card>
          ))}
        </Box>
      ) : filteredTemplates.length === 0 ? (
        <Box
          sx={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            py: 12,
            color: "text.secondary",
          }}
        >
          <FolderOpen sx={{ width: 64, height: 64, mb: 3, opacity: 0.5 }} />
          <Typography variant="h6">暂无模板</Typography>
          <Typography variant="body2">点击上方按钮创建您的第一个模板</Typography>
          <Button
            variant="contained"
            startIcon={<Plus />}
            sx={{ mt: 3 }}
            onClick={() => setShowCreateModal(true)}
          >
            创建模板
          </Button>
        </Box>
      ) : (
        <Box sx={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 3 }}>
          {filteredTemplates.map((template) => (
            <Card
              key={template.id}
              sx={{
                position: "relative",
                transition: "all 0.3s",
                "&:hover": {
                  boxShadow: 3,
                  transform: "translateY(-2px)",
                },
              }}
            >
              {!template.is_active && (
                <Box
                  sx={{
                    position: "absolute",
                    top: 0,
                    left: 0,
                    right: 0,
                    height: 4,
                    backgroundColor: "#E5E7EB",
                  }}
                />
              )}
              <CardContent sx={{ pb: 2 }}>
                <Box sx={{ display: "flex", alignItems: "center", gap: 2, mb: 2 }}>
                  <Box
                    sx={{
                      width: 40,
                      height: 40,
                      borderRadius: 1,
                      backgroundColor: template.is_active ? "#EEF2FF" : "#F3F4F6",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <LayoutDashboard sx={{ color: template.is_active ? "#6366F1" : "#9CA3AF" }} />
                  </Box>
                  <Box sx={{ flex: 1, minWidth: 0 }}>
                    <Typography
                      variant="h6"
                      sx={{
                        fontWeight: 600,
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                        color: template.is_active ? "text.primary" : "text.disabled",
                      }}
                    >
                      {template.name}
                    </Typography>
                    <Typography
                      variant="caption"
                      sx={{ color: "text.secondary" }}
                    >
                      {new Date(template.created_at).toLocaleDateString()}
                    </Typography>
                  </Box>
                </Box>
                {template.description && (
                  <Typography
                    variant="body2"
                    sx={{
                      color: "text.secondary",
                      mb: 2,
                      display: "-webkit-box",
                      WebkitLineClamp: 2,
                      WebkitBoxOrient: "vertical",
                      overflow: "hidden",
                    }}
                  >
                    {template.description}
                  </Typography>
                )}
                <Box sx={{ display: "flex", alignItems: "center", gap: 1, flexWrap: "wrap", mb: 2 }}>
                  {template.category && (
                    <Chip
                      label={template.category}
                      size="small"
                      variant="outlined"
                      color="primary"
                    />
                  )}
                  {template.tags?.map((tag) => (
                    <Chip key={tag} label={tag} size="small" variant="outlined" />
                  ))}
                </Box>
                {!template.is_active && (
                  <Typography variant="caption" sx={{ color: "error" }}>
                    已禁用
                  </Typography>
                )}
              </CardContent>
              <CardActions sx={{ justifyContent: "flex-end", gap: 1 }}>
                <Tooltip title="从模板创建">
                  <IconButton
                    size="small"
                    onClick={() => handleCreateDashboard(template.id)}
                    disabled={!template.is_active}
                  >
                    <Copy sx={{ width: 18, height: 18 }} />
                  </IconButton>
                </Tooltip>
                <Tooltip title="编辑">
                  <IconButton
                    size="small"
                    onClick={() => handleOpenEditModal(template)}
                  >
                    <Edit2 sx={{ width: 18, height: 18 }} />
                  </IconButton>
                </Tooltip>
                <Tooltip title="删除">
                  <IconButton
                    size="small"
                    color="error"
                    onClick={() => handleDeleteTemplate(template.id)}
                  >
                    <Trash2 sx={{ width: 18, height: 18 }} />
                  </IconButton>
                </Tooltip>
              </CardActions>
            </Card>
          ))}
        </Box>
      )}

      <Dialog
        open={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>{editingTemplate ? "编辑模板" : "创建模板"}</DialogTitle>
        <DialogContent sx={{ mt: 2 }}>
          <TextField
            label="模板名称"
            fullWidth
            value={newTemplate.name}
            onChange={(e) => setNewTemplate((prev) => ({ ...prev, name: e.target.value }))}
            sx={{ mb: 3 }}
            autoFocus
          />
          <TextField
            label="描述"
            fullWidth
            multiline
            rows={3}
            value={newTemplate.description}
            onChange={(e) => setNewTemplate((prev) => ({ ...prev, description: e.target.value }))}
            sx={{ mb: 3 }}
          />
          <FormControl fullWidth sx={{ mb: 3 }}>
            <InputLabel>分类</InputLabel>
            <Select
              value={newTemplate.category}
              label="分类"
              onChange={(e) => setNewTemplate((prev) => ({ ...prev, category: e.target.value }))}
            >
              {categories.filter((c) => c !== "all").map((cat) => (
                <MenuItem key={cat} value={cat}>
                  {cat}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          <Box sx={{ mb: 3 }}>
            <Typography variant="body2" sx={{ fontWeight: 500, mb: 1.5 }}>
              标签
            </Typography>
            <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap", mb: 2 }}>
              {newTemplate.tags.map((tag) => (
                <Chip
                  key={tag}
                  label={tag}
                  size="small"
                  onDelete={() => removeTag(tag)}
                />
              ))}
            </Box>
            <TextField
              placeholder="输入标签后按回车"
              fullWidth
              size="small"
              onKeyDown={(e: React.KeyboardEvent<HTMLInputElement>) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  addTag(e.currentTarget.value.trim());
                  e.currentTarget.value = "";
                }
              }}
            />
          </Box>
          <FormControlLabel
            control={
              <Switch
                checked={newTemplate.is_active}
                onChange={(e) => setNewTemplate((prev) => ({ ...prev, is_active: e.target.checked }))}
              />
            }
            label="启用模板"
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => {
            setShowCreateModal(false);
            setShowEditModal(false);
            setEditingTemplate(null);
          }}>
            取消
          </Button>
          <Button
            variant="contained"
            onClick={editingTemplate ? handleUpdateTemplate : handleCreateTemplate}
            disabled={!newTemplate.name.trim()}
          >
            {editingTemplate ? "保存" : "创建"}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default DashboardTemplateManager;