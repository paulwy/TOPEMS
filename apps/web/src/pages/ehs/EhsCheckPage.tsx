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
import {
  Plus,
  Eye,
  ClipboardCheck,
  Search,
  User,
  MapPin,
} from "lucide-react";
import { DataTable } from "../../components/DataTable";
import type { ColumnDef } from "@tanstack/react-table";
import { ehsApi } from "../../api/ehs";
import type { SafetyCheck } from "../../api/ehs";
import { toast } from "react-toastify";

const EhsCheckPage: React.FC = () => {
  const navigate = useNavigate();
  const [checks, setChecks] = useState<SafetyCheck[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedCheck, setSelectedCheck] = useState<SafetyCheck | null>(null);
  const [formData, setFormData] = useState({
    check_no: "",
    check_type: "",
    inspector: "",
    location: "",
    result: "",
    issues: "",
  });

  useEffect(() => {
    loadChecks();
  }, []);

  const loadChecks = async () => {
    try {
      setLoading(true);
      const response = await ehsApi.listChecks();
      if (response.success && response.data) {
        const adapted = (response.data as any).data.map((item: any) => ({
          ...item,
          status: item.status === "completed" ? "已完成" : item.status === "in_progress" ? "进行中" : item.status === "pending" ? "待处理" : item.status,
        }));
        setChecks(adapted);
      } else {
        setChecks([]);
      }
    } catch (err) {
      console.error("加载安全检查数据失败:", err);
      setChecks([]);
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const statusMap: Record<string, { bg: string; color: string }> = {
      已完成: { bg: "#dcfce7", color: "#16a34a" },
      进行中: { bg: "#fef9c3", color: "#ca8a04" },
      待处理: { bg: "#fee2e2", color: "#dc2626" },
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

  const columns: ColumnDef<SafetyCheck>[] = [
    { accessorKey: "check_no", header: "检查编号" },
    { accessorKey: "check_type", header: "检查类型" },
    { accessorKey: "inspector", header: "检查人" },
    {
      accessorKey: "location",
      header: "位置",
      cell: ({ row }) => (
        <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
          <MapPin style={{ width: 14, height: 14 }} />
          {row.original.location || "-"}
        </Box>
      ),
    },
    { accessorKey: "result", header: "结果" },
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

  const filteredChecks = checks.filter((check) => {
    const matchesSearch =
      check.check_no.toLowerCase().includes(searchTerm.toLowerCase()) ||
      check.inspector.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesType =
      typeFilter === "all" || check.check_type === typeFilter;
    const matchesStatus =
      statusFilter === "all" || check.status === statusFilter;
    return matchesSearch && matchesType && matchesStatus;
  });

  const handleView = (check: SafetyCheck) => {
    setSelectedCheck(check);
    setShowDetailModal(true);
  };

  const handleCreate = () => {
    setFormData({
      check_no: "",
      check_type: "",
      inspector: "",
      location: "",
      result: "",
      issues: "",
    });
    setShowCreateModal(true);
  };

  const handleSave = async () => {
    try {
      await ehsApi.createCheck({
        check_no: formData.check_no,
        check_type: formData.check_type,
        inspector: formData.inspector,
        location: formData.location || null,
        result: formData.result,
        issues: formData.issues.split(",").map((s) => s.trim()).filter((s) => s),
        status: "in_progress",
      });
      toast.success("安全检查创建成功");
      setShowCreateModal(false);
      loadChecks();
    } catch (err) {
      toast.error("创建失败");
      console.error("创建安全检查失败:", err);
    }
  };

  const stats = {
    total: checks.length,
    completed: checks.filter((c) => c.status === "已完成").length,
    inProgress: checks.filter((c) => c.status === "进行中").length,
    pending: checks.filter((c) => c.status === "待处理").length,
  };

  if (loading) {
    return (
      <Box
        sx={{
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "linear-gradient(135deg, #eff6ff 0%, #f8fafc 100%)",
        }}
      >
        <Box sx={{ textAlign: "center" }}>
          <Box
            sx={{
              width: 48,
              height: 48,
              border: 4,
              borderColor: "#3b82f6",
              borderTopColor: "#2563eb",
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
        background: "linear-gradient(135deg, #eff6ff 0%, #f8fafc 100%)",
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
                    "linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)",
                  borderRadius: 2,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <ClipboardCheck sx={{ width: 24, height: 24, color: "white" }} />
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
                  安全检查
                </Typography>
                <Typography
                  variant="caption"
                  sx={{ color: "slate.500", fontSize: "0.75rem" }}
                >
                  Safety Inspection
                </Typography>
              </Box>
            </Box>
            <Button
              variant="contained"
              startIcon={<Plus style={{ width: 18, height: 18 }} />}
              onClick={handleCreate}
              sx={{ bgcolor: "#3b82f6", "&:hover": { bgcolor: "#2563eb" } }}
            >
              新增检查
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
            gridTemplateColumns: { xs: 1, md: 4 },
            gap: 2,
            mb: 4,
          }}
        >
          <Card sx={{ bgcolor: "#eff6ff" }}>
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
                  <ClipboardCheck
                    sx={{ width: 20, height: 20, color: "#3b82f6" }}
                  />
                </Box>
                <Box>
                  <Typography
                    variant="body2"
                    sx={{ color: "slate.600", fontSize: "0.875rem" }}
                  >
                    检查总数
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
                  <ClipboardCheck
                    sx={{ width: 20, height: 20, color: "#16a34a" }}
                  />
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
                    bgcolor: "#fef3c7",
                    borderRadius: 2,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <ClipboardCheck
                    sx={{ width: 20, height: 20, color: "#ca8a04" }}
                  />
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
          <Card>
            <CardContent sx={{ p: 2 }}>
              <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
                <Box
                  sx={{
                    width: 40,
                    height: 40,
                    bgcolor: "#fee2e2",
                    borderRadius: 2,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <ClipboardCheck
                    sx={{ width: 20, height: 20, color: "#dc2626" }}
                  />
                </Box>
                <Box>
                  <Typography
                    variant="body2"
                    sx={{ color: "slate.600", fontSize: "0.875rem" }}
                  >
                    待处理
                  </Typography>
                  <Typography
                    variant="h5"
                    sx={{ fontWeight: 700, color: "slate.900" }}
                  >
                    {stats.pending}
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
              <ClipboardCheck
                style={{ width: 20, height: 20, color: "#3b82f6" }}
              />
              安全检查记录
            </Typography>
          </CardHeader>
          <CardContent>
            <Box sx={{ display: "flex", flexWrap: "wrap", gap: 2, mb: 3 }}>
              <TextField
                size="small"
                placeholder="搜索检查编号或检查人..."
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
                label="检查类型"
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value)}
                sx={{ minWidth: 150 }}
              >
                <option value="all">全部</option>
                <option value="日常检查">日常检查</option>
                <option value="专项检查">专项检查</option>
                <option value="定期检查">定期检查</option>
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
                <option value="进行中">进行中</option>
                <option value="待处理">待处理</option>
              </TextField>
            </Box>
            <DataTable
              columns={columns}
              data={filteredChecks}
              enablePagination
            />
          </CardContent>
        </Card>
      </Box>

      <Dialog
        open={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>新增安全检查</DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 1, display: "flex", flexDirection: "column", gap: 2 }}>
            <TextField
              fullWidth
              label="检查编号 *"
              value={formData.check_no}
              onChange={(e) =>
                setFormData({ ...formData, check_no: e.target.value })
              }
              placeholder="请输入检查编号"
            />
            <TextField
              fullWidth
              label="检查类型 *"
              value={formData.check_type}
              onChange={(e) =>
                setFormData({ ...formData, check_type: e.target.value })
              }
              placeholder="请输入检查类型"
            />
            <TextField
              fullWidth
              label="检查人 *"
              value={formData.inspector}
              onChange={(e) =>
                setFormData({ ...formData, inspector: e.target.value })
              }
              placeholder="请输入检查人姓名"
            />
            <TextField
              fullWidth
              label="位置"
              value={formData.location}
              onChange={(e) =>
                setFormData({ ...formData, location: e.target.value })
              }
              placeholder="请输入检查位置"
            />
            <TextField
              fullWidth
              label="检查结果 *"
              value={formData.result}
              onChange={(e) =>
                setFormData({ ...formData, result: e.target.value })
              }
              placeholder="请输入检查结果"
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
              rows={3}
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
            sx={{ bgcolor: "#3b82f6" }}
          >
            保存
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog
        open={showDetailModal}
        onClose={() => setShowDetailModal(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>安全检查详情</DialogTitle>
        <DialogContent>
          {selectedCheck && (
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
                  检查编号
                </Box>
                <Box sx={{ fontWeight: 500 }}>{selectedCheck.check_no}</Box>
              </Box>
              <Box>
                <Box
                  component="span"
                  sx={{ color: "text.secondary", fontSize: "0.875rem" }}
                >
                  检查类型
                </Box>
                <Box>{selectedCheck.check_type}</Box>
              </Box>
              <Box>
                <Box
                  component="span"
                  sx={{ color: "text.secondary", fontSize: "0.875rem" }}
                >
                  检查人
                </Box>
                <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
                  <User style={{ width: 16, height: 16 }} />
                  {selectedCheck.inspector}
                </Box>
              </Box>
              <Box>
                <Box
                  component="span"
                  sx={{ color: "text.secondary", fontSize: "0.875rem" }}
                >
                  状态
                </Box>
                <Box sx={{ mt: 0.5 }}>
                  {getStatusBadge(selectedCheck.status)}
                </Box>
              </Box>
              <Box>
                <Box
                  component="span"
                  sx={{ color: "text.secondary", fontSize: "0.875rem" }}
                >
                  位置
                </Box>
                <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
                  <MapPin style={{ width: 16, height: 16 }} />
                  {selectedCheck.location || "-"}
                </Box>
              </Box>
              <Box>
                <Box
                  component="span"
                  sx={{ color: "text.secondary", fontSize: "0.875rem" }}
                >
                  检查结果
                </Box>
                <Box>{selectedCheck.result}</Box>
              </Box>
              <Box sx={{ gridColumn: "1 / -1" }}>
                <Box
                  component="span"
                  sx={{ color: "text.secondary", fontSize: "0.875rem" }}
                >
                  发现问题
                </Box>
                <Box>
                  {Array.isArray(selectedCheck.issues)
                    ? selectedCheck.issues.join(", ")
                    : selectedCheck.issues || "-"}
                </Box>
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

export default EhsCheckPage;