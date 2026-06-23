import { useState, useEffect } from "react";
import {
  Plus,
  Edit2,
  Trash2,
  Copy,
  Eye,
  EyeOff,
  Grid3X3,
  LayoutDashboard,
  FolderOpen,
  Search,
  Filter,
  SortDesc,
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
  Tabs,
  Tab,
} from "@mui/material";
import {
  fetchDashboards,
  createDashboard,
  deleteDashboard,
  cloneDashboard,
  updateDashboard,
  fetchDashboardTemplates,
  createDashboardFromTemplate,
  type Dashboard,
  type DashboardTemplate,
} from "@/api/bi";
import { DashboardEditor } from "@/components/bi/DashboardEditor";
import { DashboardTemplateManager } from "@/components/bi/DashboardTemplateManager";
import { DashboardTemplate as DashboardLayout } from "@/components/templates";
import { logger } from "@/utils/logger";

type ViewMode = "list" | "editor";
type TabType = "dashboards" | "templates";

interface CreateDialogState {
  open: boolean;
  useTemplate: boolean;
  selectedTemplateId: string | null;
  name: string;
  description: string;
}

const BIDashboardPage = () => {
  const [viewMode, setViewMode] = useState<ViewMode>("list");
  const [activeTab, setActiveTab] = useState<TabType>("dashboards");
  const [dashboards, setDashboards] = useState<Dashboard[]>([]);
  const [templates, setTemplates] = useState<DashboardTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedDashboard, setSelectedDashboard] = useState<Dashboard | null>(
    null,
  );
  const [createDialog, setCreateDialog] = useState<CreateDialogState>({
    open: false,
    useTemplate: false,
    selectedTemplateId: null,
    name: "",
    description: "",
  });
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [contextDashboard, setContextDashboard] = useState<Dashboard | null>(
    null,
  );

  const loadDashboards = async () => {
    setLoading(true);
    try {
      const res = await fetchDashboards();
      if (res.success && res.data) {
        setDashboards(res.data.items || []);
      }
    } catch (error) {
      logger.error("Failed to load dashboards:", error);
    } finally {
      setLoading(false);
    }
  };

  const loadTemplates = async () => {
    try {
      const res = await fetchDashboardTemplates();
      if (res.success && res.data) {
        setTemplates(res.data.items || []);
      }
    } catch (error) {
      logger.error("Failed to load templates:", error);
    }
  };

  useEffect(() => {
    loadDashboards();
    loadTemplates();
  }, []);

  const handleCreateDashboard = async () => {
    try {
      const data: Partial<Dashboard> = {
        name: createDialog.name || "未命名仪表盘",
        description: createDialog.description,
        owner_id: "current-user",
        is_public: false,
      };

      let result;
      if (createDialog.useTemplate && createDialog.selectedTemplateId) {
        result = await createDashboardFromTemplate(
          createDialog.selectedTemplateId,
          data,
        );
      } else {
        result = await createDashboard(data);
      }

      if (result.success) {
        loadDashboards();
        setCreateDialog({
          open: false,
          useTemplate: false,
          selectedTemplateId: null,
          name: "",
          description: "",
        });
      }
    } catch (error) {
      logger.error("Failed to create dashboard:", error);
    }
  };

  const handleDeleteDashboard = async (id: string) => {
    if (!confirm("确定要删除这个仪表盘吗？")) return;
    try {
      const res = await deleteDashboard(id);
      if (res.success) {
        loadDashboards();
      }
    } catch (error) {
      logger.error("Failed to delete dashboard:", error);
    }
  };

  const handleCloneDashboard = async (id: string) => {
    try {
      const res = await cloneDashboard(id);
      if (res.success) {
        loadDashboards();
      }
    } catch (error) {
      logger.error("Failed to clone dashboard:", error);
    }
  };

  const handleTogglePublic = async (dashboard: Dashboard) => {
    try {
      const res = await updateDashboard(dashboard.id, {
        is_public: !dashboard.is_public,
      });
      if (res.success) {
        loadDashboards();
      }
    } catch (error) {
      logger.error("Failed to update dashboard:", error);
    }
  };

  const handleOpenEditor = (dashboard?: Dashboard) => {
    setSelectedDashboard(dashboard || null);
    setViewMode("editor");
  };

  const handleSaveDashboard = async (config: any) => {
    try {
      const data: Partial<Dashboard> = {
        name: config.name,
        description: config.description,
        layout: { widgets: config.widgets },
      };

      if (selectedDashboard) {
        await updateDashboard(selectedDashboard.id, data);
      } else {
        await createDashboard({
          ...data,
          owner_id: "current-user",
          is_public: false,
        });
      }
      setViewMode("list");
      loadDashboards();
    } catch (error) {
      logger.error("Failed to save dashboard:", error);
    }
  };

  const filteredDashboards = dashboards.filter(
    (d) =>
      d.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      d.description?.toLowerCase().includes(searchTerm.toLowerCase()),
  );

  const handleContextMenu = (
    event: React.MouseEvent<HTMLElement>,
    dashboard: Dashboard,
  ) => {
    event.preventDefault();
    setAnchorEl(event.currentTarget);
    setContextDashboard(dashboard);
  };

  const handleCloseMenu = () => {
    setAnchorEl(null);
    setContextDashboard(null);
  };

  if (viewMode === "editor") {
    return (
      <DashboardEditor
        initialConfig={
          selectedDashboard?.layout
            ? {
                id: selectedDashboard.id,
                name: selectedDashboard.name,
                description: selectedDashboard.description || "",
                widgets: selectedDashboard.layout?.widgets || [],
              }
            : undefined
        }
        onSave={handleSaveDashboard}
        onCancel={() => {
          setViewMode("list");
          setSelectedDashboard(null);
        }}
      />
    );
  }

  return (
    <DashboardLayout
      title="自定义仪表盘"
      subtitle="管理和创建您的个性化数据仪表盘"
      breadcrumbs={[
        { label: "首页", href: "/dashboard" },
        { label: "BI" },
        { label: "自定义仪表盘" },
      ]}
    >
      <Box sx={{ p: 3 }}>
        <Box
          sx={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            mb: 4,
          }}
        >
          <Box sx={{ display: "flex", alignItems: "center", gap: 3 }}>
            <Tabs
              value={activeTab}
              onChange={(_, newValue) => setActiveTab(newValue)}
              sx={{ minWidth: 200 }}
            >
              <Tab
                value="dashboards"
                label="仪表盘"
                icon={<LayoutDashboard size={18} />}
                iconPosition="start"
              />
              <Tab
                value="templates"
                label="模板"
                icon={<FolderOpen size={18} />}
                iconPosition="start"
              />
            </Tabs>
          </Box>
          {activeTab === "dashboards" && (
            <Button
              variant="contained"
              startIcon={<Plus />}
              onClick={() => setCreateDialog({ ...createDialog, open: true })}
            >
              创建仪表盘
            </Button>
          )}
        </Box>

        {activeTab === "templates" ? (
          <DashboardTemplateManager
            onDashboardCreated={() => {
              setActiveTab("dashboards");
              loadDashboards();
            }}
          />
        ) : (
          <>
            <Box
              sx={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                mb: 4,
              }}
            >
              <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
                <TextField
                  placeholder="搜索仪表盘..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  size="small"
                  sx={{ width: 300 }}
                />
                <Button variant="outlined" size="small" startIcon={<Filter />}>
                  筛选
                </Button>
                <Button
                  variant="outlined"
                  size="small"
                  startIcon={<SortDesc />}
                >
                  排序
                </Button>
              </Box>
            </Box>

            {loading ? (
              <Box
                sx={{
                  display: "grid",
                  gridTemplateColumns: "repeat(3, 1fr)",
                  gap: 3,
                }}
              >
                {[1, 2, 3].map((i) => (
                  <Card key={i}>
                    <CardContent>
                      <Skeleton sx={{ width: "60%", mb: 2 }} />
                      <Skeleton sx={{ width: "100%", height: 120 }} />
                    </CardContent>
                  </Card>
                ))}
              </Box>
            ) : filteredDashboards.length === 0 ? (
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
                <Grid3X3 sx={{ width: 64, height: 64, mb: 3, opacity: 0.5 }} />
                <Typography variant="h6">暂无仪表盘</Typography>
                <Typography variant="body2">
                  点击上方按钮创建您的第一个仪表盘
                </Typography>
                <Button
                  variant="contained"
                  startIcon={<Plus />}
                  sx={{ mt: 3 }}
                  onClick={() =>
                    setCreateDialog({ ...createDialog, open: true })
                  }
                >
                  创建仪表盘
                </Button>
              </Box>
            ) : (
              <Box
                sx={{
                  display: "grid",
                  gridTemplateColumns: "repeat(3, 1fr)",
                  gap: 3,
                }}
              >
                {filteredDashboards.map((dashboard) => (
                  <Card
                    key={dashboard.id}
                    sx={{
                      position: "relative",
                      cursor: "pointer",
                      transition: "all 0.3s",
                      "&:hover": {
                        boxShadow: 3,
                        transform: "translateY(-2px)",
                      },
                    }}
                    onClick={() => handleOpenEditor(dashboard)}
                    onContextMenu={(e) => handleContextMenu(e, dashboard)}
                  >
                    {dashboard.is_public && (
                      <Chip
                        label="公开"
                        size="small"
                        color="primary"
                        sx={{ position: "absolute", top: 8, right: 8 }}
                      />
                    )}
                    <CardContent sx={{ pb: 2 }}>
                      <Box
                        sx={{
                          display: "flex",
                          alignItems: "center",
                          gap: 2,
                          mb: 2,
                        }}
                      >
                        <Box
                          sx={{
                            width: 40,
                            height: 40,
                            borderRadius: 1,
                            backgroundColor: "#EEF2FF",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                          }}
                        >
                          <LayoutDashboard sx={{ color: "#6366F1" }} />
                        </Box>
                        <Box sx={{ flex: 1, minWidth: 0 }}>
                          <Typography
                            variant="h6"
                            sx={{
                              fontWeight: 600,
                              overflow: "hidden",
                              textOverflow: "ellipsis",
                              whiteSpace: "nowrap",
                            }}
                          >
                            {dashboard.name}
                          </Typography>
                          <Typography
                            variant="caption"
                            sx={{ color: "text.secondary" }}
                          >
                            {new Date(
                              dashboard.created_at,
                            ).toLocaleDateString()}
                          </Typography>
                        </Box>
                      </Box>
                      {dashboard.description && (
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
                          {dashboard.description}
                        </Typography>
                      )}
                      <Box
                        sx={{ display: "flex", alignItems: "center", gap: 1 }}
                      >
                        <Chip label="图表" size="small" variant="outlined" />
                        <Chip label="指标" size="small" variant="outlined" />
                      </Box>
                    </CardContent>
                    <CardActions sx={{ justifyContent: "flex-end", gap: 1 }}>
                      <Tooltip title="编辑">
                        <IconButton
                          size="small"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleOpenEditor(dashboard);
                          }}
                        >
                          <Edit2 sx={{ width: 18, height: 18 }} />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="克隆">
                        <IconButton
                          size="small"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleCloneDashboard(dashboard.id);
                          }}
                        >
                          <Copy sx={{ width: 18, height: 18 }} />
                        </IconButton>
                      </Tooltip>
                      <Tooltip
                        title={dashboard.is_public ? "设为私有" : "设为公开"}
                      >
                        <IconButton
                          size="small"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleTogglePublic(dashboard);
                          }}
                        >
                          {dashboard.is_public ? (
                            <Eye sx={{ width: 18, height: 18 }} />
                          ) : (
                            <EyeOff sx={{ width: 18, height: 18 }} />
                          )}
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="删除">
                        <IconButton
                          size="small"
                          color="error"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteDashboard(dashboard.id);
                          }}
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
              open={createDialog.open}
              onClose={() => setCreateDialog({ ...createDialog, open: false })}
              maxWidth="sm"
              fullWidth
            >
              <DialogTitle>创建仪表盘</DialogTitle>
              <DialogContent sx={{ mt: 2 }}>
                <TextField
                  label="仪表盘名称"
                  fullWidth
                  value={createDialog.name}
                  onChange={(e) =>
                    setCreateDialog({ ...createDialog, name: e.target.value })
                  }
                  sx={{ mb: 3 }}
                />
                <TextField
                  label="描述"
                  multiline
                  rows={2}
                  fullWidth
                  value={createDialog.description}
                  onChange={(e) =>
                    setCreateDialog({
                      ...createDialog,
                      description: e.target.value,
                    })
                  }
                  sx={{ mb: 3 }}
                />
                <Box
                  sx={{ display: "flex", alignItems: "center", gap: 2, mb: 3 }}
                >
                  <input
                    type="checkbox"
                    checked={createDialog.useTemplate}
                    onChange={(e) =>
                      setCreateDialog({
                        ...createDialog,
                        useTemplate: e.target.checked,
                        selectedTemplateId: null,
                      })
                    }
                  />
                  <Typography variant="body1">从模板创建</Typography>
                </Box>
                {createDialog.useTemplate && templates.length > 0 && (
                  <Box
                    sx={{
                      border: "1px solid rgba(0,0,0,0.1)",
                      borderRadius: 1,
                      p: 2,
                    }}
                  >
                    <Typography variant="body2" sx={{ mb: 2, fontWeight: 500 }}>
                      选择模板
                    </Typography>
                    <Box
                      sx={{ display: "flex", flexDirection: "column", gap: 2 }}
                    >
                      {templates.map((template) => (
                        <Box
                          key={template.id}
                          sx={{
                            display: "flex",
                            alignItems: "center",
                            gap: 2,
                            p: 2,
                            borderRadius: 1,
                            cursor: "pointer",
                            backgroundColor:
                              createDialog.selectedTemplateId === template.id
                                ? "#EEF2FF"
                                : "transparent",
                            "&:hover": { backgroundColor: "#F5F5F5" },
                          }}
                          onClick={() =>
                            setCreateDialog({
                              ...createDialog,
                              selectedTemplateId: template.id,
                            })
                          }
                        >
                          <input
                            type="radio"
                            checked={
                              createDialog.selectedTemplateId === template.id
                            }
                            onChange={() =>
                              setCreateDialog({
                                ...createDialog,
                                selectedTemplateId: template.id,
                              })
                            }
                          />
                          <FolderOpen sx={{ color: "#6366F1" }} />
                          <div>
                            <Typography
                              variant="body1"
                              sx={{ fontWeight: 500 }}
                            >
                              {template.name}
                            </Typography>
                            {template.description && (
                              <Typography
                                variant="caption"
                                sx={{ color: "text.secondary" }}
                              >
                                {template.description}
                              </Typography>
                            )}
                          </div>
                        </Box>
                      ))}
                    </Box>
                  </Box>
                )}
              </DialogContent>
              <DialogActions>
                <Button
                  onClick={() =>
                    setCreateDialog({ ...createDialog, open: false })
                  }
                >
                  取消
                </Button>
                <Button
                  variant="contained"
                  onClick={handleCreateDashboard}
                  disabled={
                    !createDialog.name ||
                    (createDialog.useTemplate &&
                      !createDialog.selectedTemplateId)
                  }
                >
                  创建
                </Button>
              </DialogActions>
            </Dialog>

            <Menu
              anchorEl={anchorEl}
              open={Boolean(anchorEl)}
              onClose={handleCloseMenu}
            >
              {contextDashboard && (
                <>
                  <MenuItem
                    onClick={() => {
                      handleOpenEditor(contextDashboard);
                      handleCloseMenu();
                    }}
                  >
                    <Edit2 sx={{ mr: 2 }} />
                    编辑
                  </MenuItem>
                  <MenuItem
                    onClick={() => {
                      handleCloneDashboard(contextDashboard.id);
                      handleCloseMenu();
                    }}
                  >
                    <Copy sx={{ mr: 2 }} />
                    克隆
                  </MenuItem>
                  <MenuItem
                    onClick={() => {
                      handleTogglePublic(contextDashboard);
                      handleCloseMenu();
                    }}
                  >
                    {contextDashboard.is_public ? (
                      <EyeOff sx={{ mr: 2 }} />
                    ) : (
                      <Eye sx={{ mr: 2 }} />
                    )}
                    {contextDashboard.is_public ? "设为私有" : "设为公开"}
                  </MenuItem>
                  <Divider />
                  <MenuItem
                    onClick={() => {
                      handleDeleteDashboard(contextDashboard.id);
                      handleCloseMenu();
                    }}
                    sx={{ color: "error.main" }}
                  >
                    <Trash2 sx={{ mr: 2 }} />
                    删除
                  </MenuItem>
                </>
              )}
            </Menu>
          </>
        )}
      </Box>
    </DashboardLayout>
  );
};

export default BIDashboardPage;
