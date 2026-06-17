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
  FileText,
  Search,
  Users,
} from "lucide-react";
import { DataTable } from "@/components/DataTable";
import type { ColumnDef } from "@tanstack/react-table";
import { ehsApi } from "@/api/ehs";
import type { EmergencyPlan } from "@/api/ehs";
import { toast } from "react-toastify";

const EhsPlanPage: React.FC = () => {
  const navigate = useNavigate();
  const [plans, setPlans] = useState<EmergencyPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<EmergencyPlan | null>(null);
  const [formData, setFormData] = useState({
    plan_no: "",
    name: "",
    plan_type: "",
    scope: "",
    trigger_conditions: "",
    response_procedures: "",
    responsible_persons: "",
    contact_info: "",
  });

  useEffect(() => {
    loadPlans();
  }, []);

  const loadPlans = async () => {
    try {
      setLoading(true);
      const response = await ehsApi.listPlans();
      if (response.success && response.data) {
        const adapted = (response.data as any).data.map((item: any) => ({
          ...item,
          status: item.status === "active" ? "有效" : item.status === "inactive" ? "无效" : item.status,
        }));
        setPlans(adapted);
      } else {
        setPlans([]);
      }
    } catch (err) {
      console.error("加载应急预案数据失败:", err);
      setPlans([]);
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const statusMap: Record<string, { bg: string; color: string }> = {
      有效: { bg: "#dcfce7", color: "#16a34a" },
      无效: { bg: "#fee2e2", color: "#dc2626" },
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

  const columns: ColumnDef<EmergencyPlan>[] = [
    { accessorKey: "plan_no", header: "预案编号" },
    { accessorKey: "name", header: "预案名称" },
    { accessorKey: "plan_type", header: "预案类型" },
    { accessorKey: "scope", header: "适用范围" },
    {
      accessorKey: "responsible_persons",
      header: "负责人",
      cell: ({ row }) => {
        const persons = row.original.responsible_persons;
        const displayText = Array.isArray(persons) ? persons.join(", ") : persons;
        return (
          <span className="truncate max-w-[150px]" title={displayText}>
            {displayText || "-"}
          </span>
        );
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

  const filteredPlans = plans.filter((plan) => {
    const matchesSearch =
      plan.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      plan.plan_no.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesType =
      typeFilter === "all" || plan.plan_type === typeFilter;
    const matchesStatus =
      statusFilter === "all" || plan.status === statusFilter;
    return matchesSearch && matchesType && matchesStatus;
  });

  const handleView = (plan: EmergencyPlan) => {
    setSelectedPlan(plan);
    setShowDetailModal(true);
  };

  const handleCreate = () => {
    setFormData({
      plan_no: "",
      name: "",
      plan_type: "",
      scope: "",
      trigger_conditions: "",
      response_procedures: "",
      responsible_persons: "",
      contact_info: "",
    });
    setShowCreateModal(true);
  };

  const handleSave = async () => {
    try {
      await ehsApi.createPlan({
        plan_no: formData.plan_no,
        name: formData.name,
        plan_type: formData.plan_type,
        scope: formData.scope || null,
        trigger_conditions: formData.trigger_conditions || null,
        response_procedures: formData.response_procedures || null,
        responsible_persons: formData.responsible_persons.split(",").map((s) => s.trim()).filter((s) => s),
        contact_info: formData.contact_info || null,
        status: "active",
      });
      toast.success("应急预案创建成功");
      setShowCreateModal(false);
      loadPlans();
    } catch (err) {
      toast.error("创建失败");
      console.error("创建应急预案失败:", err);
    }
  };

  const stats = {
    total: plans.length,
    active: plans.filter((p) => p.status === "有效").length,
    inactive: plans.filter((p) => p.status === "无效").length,
  };

  if (loading) {
    return (
      <Box
        sx={{
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "linear-gradient(135deg, #f0fdf4 0%, #f8fafc 100%)",
        }}
      >
        <Box sx={{ textAlign: "center" }}>
          <Box
            sx={{
              width: 48,
              height: 48,
              border: 4,
              borderColor: "#22c55e",
              borderTopColor: "#16a34a",
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
        background: "linear-gradient(135deg, #f0fdf4 0%, #f8fafc 100%)",
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
                    "linear-gradient(135deg, #22c55e 0%, #16a34a 100%)",
                  borderRadius: 2,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <FileText sx={{ width: 24, height: 24, color: "white" }} />
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
                  应急预案
                </Typography>
                <Typography
                  variant="caption"
                  sx={{ color: "slate.500", fontSize: "0.75rem" }}
                >
                  Emergency Plan
                </Typography>
              </Box>
            </Box>
            <Button
              variant="contained"
              startIcon={<Plus style={{ width: 18, height: 18 }} />}
              onClick={handleCreate}
              sx={{ bgcolor: "#22c55e", "&:hover": { bgcolor: "#16a34a" } }}
            >
              新增预案
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
            gridTemplateColumns: { xs: 1, md: 3 },
            gap: 2,
            mb: 4,
          }}
        >
          <Card sx={{ bgcolor: "#f0fdf4" }}>
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
                  <FileText
                    sx={{ width: 20, height: 20, color: "#22c55e" }}
                  />
                </Box>
                <Box>
                  <Typography
                    variant="body2"
                    sx={{ color: "slate.600", fontSize: "0.875rem" }}
                  >
                    预案总数
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
                  <FileText
                    sx={{ width: 20, height: 20, color: "#16a34a" }}
                  />
                </Box>
                <Box>
                  <Typography
                    variant="body2"
                    sx={{ color: "slate.600", fontSize: "0.875rem" }}
                  >
                    有效预案
                  </Typography>
                  <Typography
                    variant="h5"
                    sx={{ fontWeight: 700, color: "slate.900" }}
                  >
                    {stats.active}
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
                  <FileText
                    sx={{ width: 20, height: 20, color: "#dc2626" }}
                  />
                </Box>
                <Box>
                  <Typography
                    variant="body2"
                    sx={{ color: "slate.600", fontSize: "0.875rem" }}
                  >
                    无效预案
                  </Typography>
                  <Typography
                    variant="h5"
                    sx={{ fontWeight: 700, color: "slate.900" }}
                  >
                    {stats.inactive}
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
              <FileText
                style={{ width: 20, height: 20, color: "#22c55e" }}
              />
              应急预案列表
            </Typography>
          </CardHeader>
          <CardContent>
            <Box sx={{ display: "flex", flexWrap: "wrap", gap: 2, mb: 3 }}>
              <TextField
                size="small"
                placeholder="搜索预案名称或编号..."
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
                label="预案类型"
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value)}
                sx={{ minWidth: 150 }}
              >
                <option value="all">全部</option>
                <option value="火灾预案">火灾预案</option>
                <option value="化学品泄漏">化学品泄漏</option>
                <option value="地震预案">地震预案</option>
                <option value="应急预案">应急预案</option>
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
                <option value="有效">有效</option>
                <option value="无效">无效</option>
              </TextField>
            </Box>
            <DataTable
              columns={columns}
              data={filteredPlans}
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
        <DialogTitle>新增应急预案</DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 1, display: "flex", flexDirection: "column", gap: 2 }}>
            <TextField
              fullWidth
              label="预案编号 *"
              value={formData.plan_no}
              onChange={(e) =>
                setFormData({ ...formData, plan_no: e.target.value })
              }
              placeholder="请输入预案编号"
            />
            <TextField
              fullWidth
              label="预案名称 *"
              value={formData.name}
              onChange={(e) =>
                setFormData({ ...formData, name: e.target.value })
              }
              placeholder="请输入预案名称"
            />
            <TextField
              fullWidth
              label="预案类型 *"
              value={formData.plan_type}
              onChange={(e) =>
                setFormData({ ...formData, plan_type: e.target.value })
              }
              placeholder="请输入预案类型"
            />
            <TextField
              fullWidth
              label="适用范围"
              value={formData.scope}
              onChange={(e) =>
                setFormData({ ...formData, scope: e.target.value })
              }
              placeholder="请输入适用范围"
              multiline
              rows={2}
            />
            <TextField
              fullWidth
              label="触发条件"
              value={formData.trigger_conditions}
              onChange={(e) =>
                setFormData({ ...formData, trigger_conditions: e.target.value })
              }
              placeholder="请输入触发条件"
              multiline
              rows={2}
            />
            <TextField
              fullWidth
              label="响应程序"
              value={formData.response_procedures}
              onChange={(e) =>
                setFormData({ ...formData, response_procedures: e.target.value })
              }
              placeholder="请输入响应程序"
              multiline
              rows={3}
            />
            <TextField
              fullWidth
              label="负责人"
              value={formData.responsible_persons}
              onChange={(e) =>
                setFormData({ ...formData, responsible_persons: e.target.value })
              }
              placeholder="多个负责人用逗号分隔"
            />
            <TextField
              fullWidth
              label="联系方式"
              value={formData.contact_info}
              onChange={(e) =>
                setFormData({ ...formData, contact_info: e.target.value })
              }
              placeholder="请输入联系方式"
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
            sx={{ bgcolor: "#22c55e" }}
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
        <DialogTitle>应急预案详情</DialogTitle>
        <DialogContent>
          {selectedPlan && (
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
                  预案编号
                </Box>
                <Box sx={{ fontWeight: 500 }}>{selectedPlan.plan_no}</Box>
              </Box>
              <Box>
                <Box
                  component="span"
                  sx={{ color: "text.secondary", fontSize: "0.875rem" }}
                >
                  预案名称
                </Box>
                <Box>{selectedPlan.name}</Box>
              </Box>
              <Box>
                <Box
                  component="span"
                  sx={{ color: "text.secondary", fontSize: "0.875rem" }}
                >
                  预案类型
                </Box>
                <Box>{selectedPlan.plan_type}</Box>
              </Box>
              <Box>
                <Box
                  component="span"
                  sx={{ color: "text.secondary", fontSize: "0.875rem" }}
                >
                  状态
                </Box>
                <Box sx={{ mt: 0.5 }}>
                  {getStatusBadge(selectedPlan.status)}
                </Box>
              </Box>
              <Box>
                <Box
                  component="span"
                  sx={{ color: "text.secondary", fontSize: "0.875rem" }}
                >
                  适用范围
                </Box>
                <Box>{selectedPlan.scope || "-"}</Box>
              </Box>
              <Box>
                <Box
                  component="span"
                  sx={{ color: "text.secondary", fontSize: "0.875rem" }}
                >
                  负责人
                </Box>
                <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
                  <Users style={{ width: 16, height: 16 }} />
                  {Array.isArray(selectedPlan.responsible_persons)
                    ? selectedPlan.responsible_persons.join(", ")
                    : selectedPlan.responsible_persons || "-"}
                </Box>
              </Box>
              <Box sx={{ gridColumn: "1 / -1" }}>
                <Box
                  component="span"
                  sx={{ color: "text.secondary", fontSize: "0.875rem" }}
                >
                  触发条件
                </Box>
                <Box>{selectedPlan.trigger_conditions || "-"}</Box>
              </Box>
              <Box sx={{ gridColumn: "1 / -1" }}>
                <Box
                  component="span"
                  sx={{ color: "text.secondary", fontSize: "0.875rem" }}
                >
                  响应程序
                </Box>
                <Box>{selectedPlan.response_procedures || "-"}</Box>
              </Box>
              <Box sx={{ gridColumn: "1 / -1" }}>
                <Box
                  component="span"
                  sx={{ color: "text.secondary", fontSize: "0.875rem" }}
                >
                  联系方式
                </Box>
                <Box>{selectedPlan.contact_info || "-"}</Box>
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

export default EhsPlanPage;