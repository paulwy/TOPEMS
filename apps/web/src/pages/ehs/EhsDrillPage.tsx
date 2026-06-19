import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  Box,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Chip,
  Card,
  CardContent,
  CardHeader,
  Typography,
} from "@mui/material";
import { Plus, Eye, Clock, Search, Users, Calendar } from "lucide-react";
import { DataTable } from "@/components/DataTable";
import type { ColumnDef } from "@tanstack/react-table";
import { ehsApi } from "@/api/ehs";
import type { DrillRecord } from "@/api/ehs";
import { toast } from "react-toastify";

const EhsDrillPage: React.FC = () => {
  const navigate = useNavigate();
  const [drills, setDrills] = useState<DrillRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedDrill, setSelectedDrill] = useState<DrillRecord | null>(null);
  const [formData, setFormData] = useState({
    drill_no: "",
    name: "",
    drill_type: "",
    date: "",
    participants: "",
    location: "",
    duration: "",
    evaluation: "",
    issues: "",
  });

  useEffect(() => {
    loadDrills();
  }, []);

  const loadDrills = async () => {
    try {
      setLoading(true);
      const response = await ehsApi.listDrills();
      if (response.success && response.data) {
        const adapted = (response.data as any).data.map((item: any) => ({
          ...item,
          status:
            item.status === "completed"
              ? "已完成"
              : item.status === "scheduled"
                ? "已计划"
                : item.status === "in_progress"
                  ? "进行中"
                  : item.status,
        }));
        setDrills(adapted);
      } else {
        setDrills([]);
      }
    } catch (err) {
      console.error("加载演练记录数据失败:", err);
      setDrills([]);
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const statusMap: Record<string, { bg: string; color: string }> = {
      已完成: { bg: "#dcfce7", color: "#16a34a" },
      已计划: { bg: "#dbeafe", color: "#3b82f6" },
      进行中: { bg: "#fef9c3", color: "#ca8a04" },
    };
    const colors = statusMap[status] || { bg: "#f3f4f6", color: "#4b5563" };
    return (
      <Chip
        label={status}
        size="small"
        sx={{
          backgroundColor: colors.bg,
          color: colors.color,
          fontWeight: 500,
        }}
      />
    );
  };

  const columns: ColumnDef<DrillRecord>[] = [
    { accessorKey: "drill_no", header: "演练编号" },
    { accessorKey: "drill_name", header: "演练名称" },
    { accessorKey: "drill_date", header: "演练日期" },
    {
      accessorKey: "location",
      header: "地点",
      cell: ({ row }) => (
        <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
          <Calendar style={{ width: 14, height: 14 }} />
          {row.original.location || "-"}
        </Box>
      ),
    },
    {
      accessorKey: "participants",
      header: "参与人数",
      cell: ({ row }) => {
        const count = row.original.participants;
        if (Array.isArray(count)) return count.length;
        return count || "-";
      },
    },
    {
      accessorKey: "status",
      header: "状态",
      cell: ({ row }) => getStatusBadge(row.original.status),
    },
    {
      id: "actions",
      header: "操作",
      cell: ({ row }) => (
        <Box sx={{ display: "flex", gap: 1 }}>
          <Button
            size="small"
            onClick={() => handleView(row.original)}
            startIcon={<Eye style={{ width: 16, height: 16 }} />}
          >
            详情
          </Button>
        </Box>
      ),
    },
  ];

  const filteredDrills = drills.filter((drill) => {
    const matchesSearch =
      drill.drill_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      drill.drill_no.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus =
      statusFilter === "all" || drill.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const handleView = (drill: DrillRecord) => {
    setSelectedDrill(drill);
    setShowDetailModal(true);
  };

  const handleCreate = () => {
    setFormData({
      drill_no: "",
      name: "",
      drill_type: "",
      date: "",
      participants: "",
      location: "",
      duration: "",
      evaluation: "",
      issues: "",
    });
    setShowCreateModal(true);
  };

  const handleSave = async () => {
    try {
      await ehsApi.createDrill({
        drill_no: formData.drill_no,
        drill_name: formData.name,
        drill_date: formData.date || null,
        participants: formData.participants
          .split(",")
          .map((s) => s.trim())
          .filter((s) => s),
        location: formData.location || null,
        duration_hours: parseInt(formData.duration) || 0,
        summary: formData.evaluation || null,
        issues_found: formData.issues || null,
      });
      toast.success("演练记录创建成功");
      setShowCreateModal(false);
      loadDrills();
    } catch (err) {
      toast.error("创建失败");
      console.error("创建演练记录失败:", err);
    }
  };

  const stats = {
    total: drills.length,
    completed: drills.filter((d) => d.status === "已完成").length,
    scheduled: drills.filter((d) => d.status === "已计划").length,
    inProgress: drills.filter((d) => d.status === "进行中").length,
  };

  if (loading) {
    return (
      <Box
        sx={{
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "linear-gradient(135deg, #fef3c7 0%, #f8fafc 100%)",
        }}
      >
        <Box sx={{ textAlign: "center" }}>
          <Box
            sx={{
              width: 48,
              height: 48,
              border: 4,
              borderColor: "#f59e0b",
              borderTopColor: "#d97706",
              borderRadius: "50%",
              animation: "spin 1s linear infinite",
              mx: "auto",
              mb: 2,
            }}
          />
          <Typography sx={{ color: "slate.600" }}>加载中...</Typography>
        </Box>
      </Box>
    );
  }

  return (
    <Box
      sx={{
        minHeight: "100vh",
        background: "linear-gradient(135deg, #fef3c7 0%, #f8fafc 100%)",
      }}
    >
      <Box
        component="header"
        sx={{
          bgcolor: "background.paper",
          boxShadow: 1,
          borderBottom: 1,
          borderColor: "divider",
          position: "sticky",
          top: 0,
          zIndex: 10,
        }}
      >
        <Box sx={{ maxWidth: 1280, mx: "auto", px: { xs: 2, sm: 3, lg: 4 } }}>
          <Box
            sx={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              height: 64,
            }}
          >
            <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
              <Box
                sx={{
                  width: 40,
                  height: 40,
                  background:
                    "linear-gradient(135deg, #f59e0b 0%, #d97706 100%)",
                  borderRadius: 2,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Clock sx={{ width: 24, height: 24, color: "white" }} />
              </Box>
              <Box>
                <Typography
                  variant="h6"
                  sx={{
                    fontWeight: 700,
                    color: "slate.900",
                    fontSize: "1.25rem",
                  }}
                >
                  演练记录
                </Typography>
                <Typography
                  variant="caption"
                  sx={{ color: "slate.500", fontSize: "0.75rem" }}
                >
                  Drill Records
                </Typography>
              </Box>
            </Box>
            <Button
              variant="contained"
              startIcon={<Plus style={{ width: 18, height: 18 }} />}
              onClick={handleCreate}
              sx={{ bgcolor: "#f59e0b", "&:hover": { bgcolor: "#d97706" } }}
            >
              新增演练
            </Button>
          </Box>
        </Box>
      </Box>

      <Box
        component="main"
        sx={{ maxWidth: 1280, mx: "auto", px: { xs: 2, sm: 3, lg: 4 }, py: 4 }}
      >
        <Box
          sx={{
            display: "grid",
            gridTemplateColumns: { xs: "repeat(1, 1fr)", md: "repeat(4, 1fr)" },
            gap: 2,
            mb: 4,
          }}
        >
          <Card sx={{ bgcolor: "#fef3c7" }}>
            <CardContent sx={{ p: 2 }}>
              <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
                <Box
                  sx={{
                    width: 40,
                    height: 40,
                    bgcolor: "#fde68a",
                    borderRadius: 2,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <Clock sx={{ width: 20, height: 20, color: "#f59e0b" }} />
                </Box>
                <Box>
                  <Typography
                    variant="body2"
                    sx={{ color: "slate.600", fontSize: "0.875rem" }}
                  >
                    演练总数
                  </Typography>
                  <Typography
                    variant="h5"
                    sx={{ fontWeight: 700, color: "slate.900" }}
                  >
                    {stats.total}
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
          <Card>
            <CardContent sx={{ p: 2 }}>
              <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
                <Box
                  sx={{
                    width: 40,
                    height: 40,
                    bgcolor: "#dcfce7",
                    borderRadius: 2,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <Clock sx={{ width: 20, height: 20, color: "#16a34a" }} />
                </Box>
                <Box>
                  <Typography
                    variant="body2"
                    sx={{ color: "slate.600", fontSize: "0.875rem" }}
                  >
                    已完成
                  </Typography>
                  <Typography
                    variant="h5"
                    sx={{ fontWeight: 700, color: "slate.900" }}
                  >
                    {stats.completed}
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
          <Card>
            <CardContent sx={{ p: 2 }}>
              <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
                <Box
                  sx={{
                    width: 40,
                    height: 40,
                    bgcolor: "#dbeafe",
                    borderRadius: 2,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <Clock sx={{ width: 20, height: 20, color: "#3b82f6" }} />
                </Box>
                <Box>
                  <Typography
                    variant="body2"
                    sx={{ color: "slate.600", fontSize: "0.875rem" }}
                  >
                    已计划
                  </Typography>
                  <Typography
                    variant="h5"
                    sx={{ fontWeight: 700, color: "slate.900" }}
                  >
                    {stats.scheduled}
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
          <Card>
            <CardContent sx={{ p: 2 }}>
              <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
                <Box
                  sx={{
                    width: 40,
                    height: 40,
                    bgcolor: "#fef9c3",
                    borderRadius: 2,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <Clock sx={{ width: 20, height: 20, color: "#ca8a04" }} />
                </Box>
                <Box>
                  <Typography
                    variant="body2"
                    sx={{ color: "slate.600", fontSize: "0.875rem" }}
                  >
                    进行中
                  </Typography>
                  <Typography
                    variant="h5"
                    sx={{ fontWeight: 700, color: "slate.900" }}
                  >
                    {stats.inProgress}
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Box>

        <Card>
          <CardHeader
            sx={{
              display: "flex",
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "space-between",
              pb: 0,
            }}
          >
            <Typography
              variant="h6"
              sx={{ display: "flex", alignItems: "center", gap: 1 }}
            >
              <Clock style={{ width: 20, height: 20, color: "#f59e0b" }} />
              演练记录列表
            </Typography>
          </CardHeader>
          <CardContent>
            <Box sx={{ display: "flex", flexWrap: "wrap", gap: 2, mb: 3 }}>
              <TextField
                size="small"
                placeholder="搜索演练名称或编号..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                sx={{ minWidth: 250 }}
                slotProps={{
                  input: {
                    startAdornment: (
                      <Search
                        style={{ width: 18, height: 18, marginRight: 8 }}
                      />
                    ),
                  },
                }}
              />
              <TextField
                size="small"
                select
                label="演练类型"
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value)}
                sx={{ minWidth: 150 }}
              >
                <option value="all">全部</option>
                <option value="火灾演练">火灾演练</option>
                <option value="应急演练">应急演练</option>
                <option value="疏散演练">疏散演练</option>
              </TextField>
              <TextField
                size="small"
                select
                label="状态"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                sx={{ minWidth: 150 }}
              >
                <option value="all">全部</option>
                <option value="已完成">已完成</option>
                <option value="已计划">已计划</option>
                <option value="进行中">进行中</option>
              </TextField>
            </Box>
            <DataTable
              columns={columns}
              data={filteredDrills}
              enablePagination
            />
          </CardContent>
        </Card>
      </Box>

      <Dialog
        open={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>新增演练记录</DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 1, display: "flex", flexDirection: "column", gap: 2 }}>
            <TextField
              fullWidth
              label="演练编号 *"
              value={formData.drill_no}
              onChange={(e) =>
                setFormData({ ...formData, drill_no: e.target.value })
              }
              placeholder="请输入演练编号"
            />
            <TextField
              fullWidth
              label="演练名称 *"
              value={formData.name}
              onChange={(e) =>
                setFormData({ ...formData, name: e.target.value })
              }
              placeholder="请输入演练名称"
            />
            <TextField
              fullWidth
              label="演练类型 *"
              value={formData.drill_type}
              onChange={(e) =>
                setFormData({ ...formData, drill_type: e.target.value })
              }
              placeholder="请输入演练类型"
            />
            <TextField
              fullWidth
              label="演练日期"
              type="date"
              value={formData.date}
              onChange={(e) =>
                setFormData({ ...formData, date: e.target.value })
              }
            />
            <TextField
              fullWidth
              label="参与人员"
              value={formData.participants}
              onChange={(e) =>
                setFormData({ ...formData, participants: e.target.value })
              }
              placeholder="多个人员用逗号分隔"
            />
            <TextField
              fullWidth
              label="演练地点"
              value={formData.location}
              onChange={(e) =>
                setFormData({ ...formData, location: e.target.value })
              }
              placeholder="请输入演练地点"
            />
            <TextField
              fullWidth
              label="演练时长"
              value={formData.duration}
              onChange={(e) =>
                setFormData({ ...formData, duration: e.target.value })
              }
              placeholder="如：2小时"
            />
            <TextField
              fullWidth
              label="演练评估"
              value={formData.evaluation}
              onChange={(e) =>
                setFormData({ ...formData, evaluation: e.target.value })
              }
              placeholder="请输入演练评估"
              multiline
              rows={2}
            />
            <TextField
              fullWidth
              label="发现问题"
              value={formData.issues}
              onChange={(e) =>
                setFormData({ ...formData, issues: e.target.value })
              }
              placeholder="多个问题用逗号分隔"
              multiline
              rows={2}
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button variant="outlined" onClick={() => setShowCreateModal(false)}>
            取消
          </Button>
          <Button
            variant="contained"
            onClick={handleSave}
            sx={{ bgcolor: "#f59e0b" }}
          >
            保存
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog
        open={showDetailModal}
        onClose={() => setShowDetailModal(false)}
        maxWidth="lg"
        fullWidth
      >
        <DialogTitle>演练记录详情</DialogTitle>
        <DialogContent>
          {selectedDrill && (
            <Box
              sx={{
                pt: 2,
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: 2,
              }}
            >
              <Box>
                <Box
                  component="span"
                  sx={{ color: "text.secondary", fontSize: "0.875rem" }}
                >
                  演练编号
                </Box>
                <Box sx={{ fontWeight: 500 }}>{selectedDrill.drill_no}</Box>
              </Box>
              <Box>
                <Box
                  component="span"
                  sx={{ color: "text.secondary", fontSize: "0.875rem" }}
                >
                  演练名称
                </Box>
                <Box>{selectedDrill.drill_name}</Box>
              </Box>
              <Box>
                <Box
                  component="span"
                  sx={{ color: "text.secondary", fontSize: "0.875rem" }}
                >
                  状态
                </Box>
                <Box sx={{ mt: 0.5 }}>
                  {getStatusBadge(selectedDrill.status)}
                </Box>
              </Box>
              <Box>
                <Box
                  component="span"
                  sx={{ color: "text.secondary", fontSize: "0.875rem" }}
                >
                  演练日期
                </Box>
                <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
                  <Calendar style={{ width: 16, height: 16 }} />
                  {selectedDrill.drill_date || "-"}
                </Box>
              </Box>
              <Box>
                <Box
                  component="span"
                  sx={{ color: "text.secondary", fontSize: "0.875rem" }}
                >
                  参与人员
                </Box>
                <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
                  <Users style={{ width: 16, height: 16 }} />
                  {Array.isArray(selectedDrill.participants)
                    ? selectedDrill.participants.join(", ")
                    : selectedDrill.participants || "-"}
                </Box>
              </Box>
              <Box>
                <Box
                  component="span"
                  sx={{ color: "text.secondary", fontSize: "0.875rem" }}
                >
                  演练地点
                </Box>
                <Box>{selectedDrill.location || "-"}</Box>
              </Box>
              <Box>
                <Box
                  component="span"
                  sx={{ color: "text.secondary", fontSize: "0.875rem" }}
                >
                  演练时长
                </Box>
                <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
                  <Clock style={{ width: 16, height: 16 }} />
                  {selectedDrill.duration_hours || "-"}小时
                </Box>
              </Box>
              <Box sx={{ gridColumn: "1 / -1" }}>
                <Box
                  component="span"
                  sx={{ color: "text.secondary", fontSize: "0.875rem" }}
                >
                  演练评估
                </Box>
                <Box>{selectedDrill.summary || "-"}</Box>
              </Box>
              <Box sx={{ gridColumn: "1 / -1" }}>
                <Box
                  component="span"
                  sx={{ color: "text.secondary", fontSize: "0.875rem" }}
                >
                  发现问题
                </Box>
                <Box>{selectedDrill.issues_found || "-"}</Box>
              </Box>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowDetailModal(false)}>关闭</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default EhsDrillPage;
