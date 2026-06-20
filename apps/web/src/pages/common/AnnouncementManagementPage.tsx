import React, { useState, useEffect, useMemo } from "react";
import {
  Button,
  Card,
  CardContent,
  CardHeader,
  Chip,
  Typography,
  Box,
  TextField,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Tooltip,
  IconButton,
} from "@mui/material";
import {
  Bell,
  Search,
  Plus,
  Edit,
  Trash2,
  ChevronLeft,
  AlertCircle,
  Calendar,
  User,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { announcementApi, type Announcement } from "@/api/erp";
import { useAppStore } from "../../store";
import type { ColumnDef } from "@tanstack/react-table";
import { DataTable } from "@/components/DataTable";

import { ModeToggle } from "@/components/ModeToggle";

interface AnnouncementManagementPageProps {
  onNavigate?: (page: string) => void;
}

const AnnouncementManagementPage: React.FC<AnnouncementManagementPageProps> = ({
  onNavigate,
}) => {
  const navigate = useNavigate();
  const addNotification = useAppStore((state) => state.addNotification);

  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedAnnouncement, setSelectedAnnouncement] =
    useState<Announcement | null>(null);

  const [newAnnouncement, setNewAnnouncement] = useState<Partial<Announcement>>(
    {
      title: "",
      content: "",
      author: "",
      status: "draft",
      priority: "normal",
    },
  );

  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await announcementApi.list();
      if (res.success && res.data) {
        setAnnouncements(res.data.items || []);
      }
    } catch (err: any) {
      setError(err.message || "加载数据失败");
      addNotification({
        title: "加载失败",
        message: "加载数据失败",
        type: "error",
      });
      setAnnouncements([]);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateAnnouncement = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await announcementApi.create(newAnnouncement);
      if (res.success) {
        addNotification({
          title: "成功",
          message: "公告创建成功",
          type: "success",
        });
        setShowCreateModal(false);
        setNewAnnouncement({
          title: "",
          content: "",
          author: "",
          status: "draft",
          priority: "normal",
        });
        loadData();
      } else {
        addNotification({
          title: "失败",
          message: res.message || "创建公告失败",
          type: "error",
        });
      }
    } catch (err: any) {
      addNotification({
        title: "失败",
        message: err.message || "创建公告失败",
        type: "error",
      });
    }
  };

  const handleDeleteAnnouncement = async (id: string) => {
    if (!confirm("确定要删除这条公告吗？")) return;
    try {
      const res = await announcementApi.delete(id);
      if (res.success) {
        addNotification({
          title: "成功",
          message: "公告删除成功",
          type: "success",
        });
        loadData();
      } else {
        addNotification({
          title: "失败",
          message: res.message || "删除公告失败",
          type: "error",
        });
      }
    } catch (err: any) {
      addNotification({
        title: "失败",
        message: err.message || "删除公告失败",
        type: "error",
      });
    }
  };

  const handleEditAnnouncement = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedAnnouncement) return;
    try {
      const res = await announcementApi.update(
        selectedAnnouncement.id,
        selectedAnnouncement,
      );
      if (res.success) {
        addNotification({
          title: "成功",
          message: "公告信息更新成功",
          type: "success",
        });
        setShowEditModal(false);
        setSelectedAnnouncement(null);
        loadData();
      } else {
        addNotification({
          title: "失败",
          message: res.message || "更新公告失败",
          type: "error",
        });
      }
    } catch (err: any) {
      addNotification({
        title: "失败",
        message: err.message || "更新公告失败",
        type: "error",
      });
    }
  };

  const handlePublish = async (id: string) => {
    try {
      const res = await announcementApi.publish(id);
      if (res.success) {
        addNotification({
          title: "成功",
          message: "公告发布成功",
          type: "success",
        });
        loadData();
      } else {
        addNotification({
          title: "失败",
          message: res.message || "发布公告失败",
          type: "error",
        });
      }
    } catch (err: any) {
      addNotification({
        title: "失败",
        message: err.message || "发布公告失败",
        type: "error",
      });
    }
  };

  const handleUnpublish = async (id: string) => {
    try {
      const res = await announcementApi.unpublish(id);
      if (res.success) {
        addNotification({
          title: "成功",
          message: "公告已下架",
          type: "success",
        });
        loadData();
      } else {
        addNotification({
          title: "失败",
          message: res.message || "下架公告失败",
          type: "error",
        });
      }
    } catch (err: any) {
      addNotification({
        title: "失败",
        message: err.message || "下架公告失败",
        type: "error",
      });
    }
  };

  const getStatusBadge = (status: string) => {
    const colors: Record<
      string,
      | "default"
      | "primary"
      | "secondary"
      | "error"
      | "info"
      | "success"
      | "warning"
    > = {
      draft: "default",
      published: "success",
      archived: "default",
    };
    const labels: Record<string, string> = {
      draft: "草稿",
      published: "已发布",
      archived: "已归档",
    };
    return (
      <Chip
        size="small"
        color={colors[status] || "default"}
        label={labels[status] || status}
      />
    );
  };

  const getPriorityBadge = (priority?: string) => {
    const colors: Record<
      string,
      | "default"
      | "primary"
      | "secondary"
      | "error"
      | "info"
      | "success"
      | "warning"
    > = {
      low: "default",
      normal: "info",
      high: "warning",
      urgent: "error",
    };
    const labels: Record<string, string> = {
      low: "低",
      normal: "普通",
      high: "高",
      urgent: "紧急",
    };
    return (
      <Chip
        size="small"
        color={colors[priority || "normal"] || "default"}
        label={labels[priority || "normal"] || priority}
      />
    );
  };

  const columns = useMemo<ColumnDef<Announcement>[]>(
    () => [
      {
        accessorKey: "title",
        header: "标题",
        cell: ({ row }) => (
          <Box sx={{ fontWeight: "medium", color: "text.primary" }}>
            {row.original.title}
          </Box>
        ),
      },
      {
        accessorKey: "author",
        header: "作者",
        cell: ({ row }) => (
          <Box
            sx={{ display: "flex", alignItems: "center", fontSize: "0.875rem" }}
          >
            <User size={12} style={{ marginRight: 4, color: "#1976d2" }} />
            {row.original.author}
          </Box>
        ),
      },
      {
        accessorKey: "priority",
        header: "优先级",
        cell: ({ row }) => getPriorityBadge(row.original.priority),
      },
      {
        accessorKey: "status",
        header: "状态",
        cell: ({ row }) => getStatusBadge(row.original.status),
      },
      {
        accessorKey: "publish_at",
        header: "发布时间",
        cell: ({ row }) => (
          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              fontSize: "0.875rem",
              color: "text.secondary",
            }}
          >
            <Calendar size={12} style={{ marginRight: 4 }} />
            {row.original.publish_at
              ? new Date(row.original.publish_at).toLocaleString()
              : "-"}
          </Box>
        ),
      },
      {
        accessorKey: "created_at",
        header: "创建时间",
        cell: ({ row }) => (
          <Box sx={{ fontSize: "0.875rem", color: "text.secondary" }}>
            {new Date(row.original.created_at).toLocaleDateString()}
          </Box>
        ),
      },
      {
        id: "actions",
        header: "操作",
        cell: ({ row }) => {
          const announcement = row.original;
          return (
            <Box sx={{ display: "flex", justifyContent: "flex-end", gap: 0.5 }}>
              {announcement.status === "draft" && (
                <Tooltip title="发布公告">
                  <Button
                    variant="text"
                    size="small"
                    sx={{ color: "success.main" }}
                    onClick={() => handlePublish(announcement.id)}
                  >
                    发布
                  </Button>
                </Tooltip>
              )}
              {announcement.status === "published" && (
                <Tooltip title="下架公告">
                  <Button
                    variant="text"
                    size="small"
                    sx={{ color: "warning.main" }}
                    onClick={() => handleUnpublish(announcement.id)}
                  >
                    下架
                  </Button>
                </Tooltip>
              )}
              <Tooltip title="编辑">
                <IconButton
                  size="small"
                  onClick={() => {
                    setSelectedAnnouncement(announcement);
                    setShowEditModal(true);
                  }}
                >
                  <Edit size={16} />
                </IconButton>
              </Tooltip>
              <Tooltip title="删除">
                <IconButton
                  size="small"
                  sx={{ color: "error.main" }}
                  onClick={() => handleDeleteAnnouncement(announcement.id)}
                >
                  <Trash2 size={16} />
                </IconButton>
              </Tooltip>
            </Box>
          );
        },
      },
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );

  return (
    <Box sx={{ minHeight: "100vh", bgcolor: "grey.100" }}>
      {/* 顶部导航 */}
      <Box
        sx={{
          bgcolor: "background.paper",
          borderBottom: 1,
          borderColor: "divider",
        }}
      >
        <Box sx={{ maxWidth: 1200, mx: "auto", px: 3, py: 3 }}>
          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
            }}
          >
            <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
              <IconButton onClick={() => navigate("/dashboard")}>
                <ChevronLeft />
              </IconButton>
              <Box>
                <Typography
                  variant="h5"
                  sx={{
                    fontWeight: "bold",
                    display: "flex",
                    alignItems: "center",
                    gap: 1,
                  }}
                >
                  <Bell size={28} color="#1976d2" />
                  公告管理
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  管理企业公告和通知
                </Typography>
              </Box>
            </Box>
            <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
              <ModeToggle />
              <Button
                variant="contained"
                onClick={() => setShowCreateModal(true)}
                startIcon={<Plus size={20} />}
              >
                新增公告
              </Button>
            </Box>
          </Box>
        </Box>
      </Box>

      <Box sx={{ maxWidth: 1200, mx: "auto", px: 3, py: 4 }}>
        <Card>
          <CardContent sx={{ p: 0 }}>
            {loading ? (
              <Box sx={{ p: 4, textAlign: "center" }}>
                <Box
                  sx={{
                    display: "inline-block",
                    width: 32,
                    height: 32,
                    border: 4,
                    borderColor: "primary.main",
                    borderTop: "transparent",
                    borderRadius: "50%",
                    animation: "spin 1s linear infinite",
                  }}
                />
                <Typography sx={{ mt: 2, color: "text.secondary" }}>
                  加载中...
                </Typography>
              </Box>
            ) : error ? (
              <Box sx={{ p: 4, textAlign: "center" }}>
                <AlertCircle size={48} color="#d32f2f" />
                <Typography sx={{ color: "error.main", mt: 2 }}>
                  {error}
                </Typography>
                <Button sx={{ mt: 2 }} onClick={loadData}>
                  重试
                </Button>
              </Box>
            ) : (
              <DataTable
                columns={columns}
                data={announcements}
                searchPlaceholder="搜索公告标题、作者..."
                searchKey="title"
              />
            )}
          </CardContent>
        </Card>
      </Box>

      {/* 创建公告对话框 */}
      <Dialog
        open={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>新增公告</DialogTitle>
        <form onSubmit={handleCreateAnnouncement}>
          <DialogContent>
            <Box
              sx={{
                display: "grid",
                gridTemplateColumns: "repeat(2, 1fr)",
                gap: 2,
                pt: 1,
              }}
            >
              <TextField
                label="标题 *"
                required
                value={newAnnouncement.title || ""}
                onChange={(e) =>
                  setNewAnnouncement({
                    ...newAnnouncement,
                    title: e.target.value,
                  })
                }
                fullWidth
              />
              <FormControl fullWidth>
                <InputLabel>优先级</InputLabel>
                <Select
                  value={newAnnouncement.priority || "normal"}
                  label="优先级"
                  onChange={(e) =>
                    setNewAnnouncement({
                      ...newAnnouncement,
                      priority: e.target.value,
                    })
                  }
                >
                  <MenuItem value="low">低</MenuItem>
                  <MenuItem value="normal">普通</MenuItem>
                  <MenuItem value="high">高</MenuItem>
                  <MenuItem value="urgent">紧急</MenuItem>
                </Select>
              </FormControl>
              <TextField
                label="作者 *"
                required
                value={newAnnouncement.author || ""}
                onChange={(e) =>
                  setNewAnnouncement({
                    ...newAnnouncement,
                    author: e.target.value,
                  })
                }
                fullWidth
              />
              <FormControl fullWidth>
                <InputLabel>状态</InputLabel>
                <Select
                  value={newAnnouncement.status || "draft"}
                  label="状态"
                  onChange={(e) =>
                    setNewAnnouncement({
                      ...newAnnouncement,
                      status: e.target.value,
                    })
                  }
                >
                  <MenuItem value="draft">草稿</MenuItem>
                  <MenuItem value="published">发布</MenuItem>
                  <MenuItem value="archived">归档</MenuItem>
                </Select>
              </FormControl>
              <TextField
                label="发布时间"
                type="datetime-local"
                value={newAnnouncement.publish_at || ""}
                onChange={(e) =>
                  setNewAnnouncement({
                    ...newAnnouncement,
                    publish_at: e.target.value,
                  })
                }
                fullWidth
              />
              <TextField
                label="过期时间"
                type="datetime-local"
                value={newAnnouncement.expire_at || ""}
                onChange={(e) =>
                  setNewAnnouncement({
                    ...newAnnouncement,
                    expire_at: e.target.value,
                  })
                }
                fullWidth
              />
              <TextField
                label="内容"
                multiline
                rows={6}
                value={newAnnouncement.content || ""}
                onChange={(e) =>
                  setNewAnnouncement({
                    ...newAnnouncement,
                    content: e.target.value,
                  })
                }
                fullWidth
                sx={{ gridColumn: "span 2" }}
              />
            </Box>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setShowCreateModal(false)}>取消</Button>
            <Button type="submit" variant="contained">
              创建
            </Button>
          </DialogActions>
        </form>
      </Dialog>

      {/* 编辑公告对话框 */}
      <Dialog
        open={showEditModal}
        onClose={() => setShowEditModal(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>编辑公告</DialogTitle>
        {selectedAnnouncement && (
          <form onSubmit={handleEditAnnouncement}>
            <DialogContent>
              <Box
                sx={{
                  display: "grid",
                  gridTemplateColumns: "repeat(2, 1fr)",
                  gap: 2,
                  pt: 1,
                }}
              >
                <TextField
                  label="标题 *"
                  required
                  value={selectedAnnouncement.title}
                  onChange={(e) =>
                    setSelectedAnnouncement({
                      ...selectedAnnouncement,
                      title: e.target.value,
                    })
                  }
                  fullWidth
                />
                <FormControl fullWidth>
                  <InputLabel>优先级</InputLabel>
                  <Select
                    value={selectedAnnouncement.priority || "normal"}
                    label="优先级"
                    onChange={(e) =>
                      setSelectedAnnouncement({
                        ...selectedAnnouncement,
                        priority: e.target.value,
                      })
                    }
                  >
                    <MenuItem value="low">低</MenuItem>
                    <MenuItem value="normal">普通</MenuItem>
                    <MenuItem value="high">高</MenuItem>
                    <MenuItem value="urgent">紧急</MenuItem>
                  </Select>
                </FormControl>
                <TextField
                  label="作者 *"
                  required
                  value={selectedAnnouncement.author}
                  onChange={(e) =>
                    setSelectedAnnouncement({
                      ...selectedAnnouncement,
                      author: e.target.value,
                    })
                  }
                  fullWidth
                />
                <FormControl fullWidth>
                  <InputLabel>状态</InputLabel>
                  <Select
                    value={selectedAnnouncement.status}
                    label="状态"
                    onChange={(e) =>
                      setSelectedAnnouncement({
                        ...selectedAnnouncement,
                        status: e.target.value,
                      })
                    }
                  >
                    <MenuItem value="draft">草稿</MenuItem>
                    <MenuItem value="published">发布</MenuItem>
                    <MenuItem value="archived">归档</MenuItem>
                  </Select>
                </FormControl>
                <TextField
                  label="发布时间"
                  type="datetime-local"
                  value={selectedAnnouncement.publish_at || ""}
                  onChange={(e) =>
                    setSelectedAnnouncement({
                      ...selectedAnnouncement,
                      publish_at: e.target.value,
                    })
                  }
                  fullWidth
                />
                <TextField
                  label="过期时间"
                  type="datetime-local"
                  value={selectedAnnouncement.expire_at || ""}
                  onChange={(e) =>
                    setSelectedAnnouncement({
                      ...selectedAnnouncement,
                      expire_at: e.target.value,
                    })
                  }
                  fullWidth
                />
                <TextField
                  label="内容"
                  multiline
                  rows={6}
                  value={selectedAnnouncement.content || ""}
                  onChange={(e) =>
                    setSelectedAnnouncement({
                      ...selectedAnnouncement,
                      content: e.target.value,
                    })
                  }
                  fullWidth
                  sx={{ gridColumn: "span 2" }}
                />
              </Box>
            </DialogContent>
            <DialogActions>
              <Button
                onClick={() => {
                  setShowEditModal(false);
                  setSelectedAnnouncement(null);
                }}
              >
                取消
              </Button>
              <Button type="submit" variant="contained">
                保存
              </Button>
            </DialogActions>
          </form>
        )}
      </Dialog>
    </Box>
  );
};

export default AnnouncementManagementPage;
