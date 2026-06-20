import React, { useState, useEffect } from "react";
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
import { apiLogger } from "@/utils/logger";
import {
  Plus,
  Eye,
  ClipboardList,
  Search,
  Clock,
  ListOrdered,
} from "lucide-react";
import { DataTable } from "@/components/DataTable";
import type { ColumnDef } from "@tanstack/react-table";
import { pdmApi } from "@/api/pdm";
import type { ProductionStep } from "@/api/pdm";
import { toast } from "react-toastify";

const PdmStepPage: React.FC = () => {
  const [steps, setSteps] = useState<ProductionStep[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedStep, setSelectedStep] = useState<ProductionStep | null>(null);
  const [formData, setFormData] = useState({
    step_no: "",
    name: "",
    description: "",
    process_id: "",
    sort_order: 1,
    duration_hours: "",
    equipment_required: "",
  });

  useEffect(() => {
    loadSteps();
  }, []);

  const loadSteps = async () => {
    try {
      setLoading(true);
      const response = await pdmApi.listSteps();
      if (response.success && response.data) {
        const adapted = (response.data as any).map((item: any) => ({
          ...item,
          sort_order: item.sort_order || item.order || 0,
          duration: item.duration_hours || item.duration || 0,
          status:
            item.status === "active"
              ? "启用"
              : item.status === "inactive"
                ? "禁用"
                : item.status || "正常",
        }));
        setSteps(adapted);
      } else {
        setSteps([]);
      }
    } catch (err) {
      apiLogger.error("加载工序步骤数据失败:", err);
      setSteps([]);
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const statusMap: Record<string, { bg: string; color: string }> = {
      启用: { bg: "#dcfce7", color: "#16a34a" },
      禁用: { bg: "#fee2e2", color: "#dc2626" },
      正常: { bg: "#dbeafe", color: "#3b82f6" },
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

  const columns: ColumnDef<ProductionStep>[] = [
    {
      accessorKey: "sort_order",
      header: "序号",
      cell: ({ row }) => (
        <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
          <ListOrdered sx={{ width: 14, height: 14 }} />
          {row.original.sort_order}
        </Box>
      ),
    },
    { accessorKey: "step_no", header: "步骤编号" },
    { accessorKey: "name", header: "步骤名称" },
    {
      accessorKey: "duration",
      header: "耗时(小时)",
      cell: ({ row }) => (
        <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
          <Clock sx={{ width: 14, height: 14 }} />
          {row.original.duration || "-"}
        </Box>
      ),
    },
    {
      accessorKey: "status",
      header: "状态",
      cell: ({ row }) => getStatusBadge(row.original.status || ""),
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

  const filteredSteps = steps.filter((step) => {
    return (
      step.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      step.step_no.toLowerCase().includes(searchTerm.toLowerCase())
    );
  });

  const handleView = (step: ProductionStep) => {
    setSelectedStep(step);
    setShowDetailModal(true);
  };

  const handleCreate = () => {
    setFormData({
      step_no: "",
      name: "",
      description: "",
      process_id: "",
      sort_order: 1,
      duration_hours: "",
      equipment_required: "",
    });
    setShowCreateModal(true);
  };

  const handleSave = async () => {
    try {
      await pdmApi.createStep({
        step_no: formData.step_no,
        name: formData.name,
        description: formData.description || undefined,
        process_id: formData.process_id || "",
        sort_order: formData.sort_order,
        duration_hours: formData.duration_hours
          ? parseFloat(formData.duration_hours)
          : undefined,
        equipment_required: formData.equipment_required || undefined,
      });
      toast.success("工序步骤创建成功");
      setShowCreateModal(false);
      loadSteps();
    } catch (err) {
      toast.error("创建失败");
      apiLogger.error("创建工序步骤失败:", err);
    }
  };

  const stats = {
    total: steps.length,
    active: steps.filter((s) => s.status === "启用" || s.status === "正常")
      .length,
    inactive: steps.filter((s) => s.status === "禁用").length,
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
                <ClipboardList sx={{ width: 24, height: 24, color: "white" }} />
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
                  工序步骤
                </Typography>
                <Typography
                  variant="caption"
                  sx={{ color: "slate.500", fontSize: "0.75rem" }}
                >
                  Production Steps
                </Typography>
              </Box>
            </Box>
            <Button
              variant="contained"
              startIcon={<Plus style={{ width: 18, height: 18 }} />}
              onClick={handleCreate}
              sx={{ bgcolor: "#22c55e", "&:hover": { bgcolor: "#16a34a" } }}
            >
              新增步骤
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
            gridTemplateColumns: { xs: "repeat(1, 1fr)", md: "repeat(3, 1fr)" },
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
                  <ClipboardList
                    sx={{ width: 20, height: 20, color: "#22c55e" }}
                  />
                </Box>
                <Box>
                  <Typography
                    variant="body2"
                    sx={{ color: "slate.600", fontSize: "0.875rem" }}
                  >
                    步骤总数
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
                  <ClipboardList
                    sx={{ width: 20, height: 20, color: "#16a34a" }}
                  />
                </Box>
                <Box>
                  <Typography
                    variant="body2"
                    sx={{ color: "slate.600", fontSize: "0.875rem" }}
                  >
                    正常使用
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
                  <ClipboardList
                    sx={{ width: 20, height: 20, color: "#dc2626" }}
                  />
                </Box>
                <Box>
                  <Typography
                    variant="body2"
                    sx={{ color: "slate.600", fontSize: "0.875rem" }}
                  >
                    已禁用
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
              <ClipboardList
                style={{ width: 20, height: 20, color: "#22c55e" }}
              />
              工序步骤列表
            </Typography>
          </CardHeader>
          <CardContent>
            <Box sx={{ display: "flex", flexWrap: "wrap", gap: 2, mb: 3 }}>
              <TextField
                size="small"
                placeholder="搜索步骤名称或编号..."
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
            </Box>
            <DataTable
              columns={columns}
              data={filteredSteps}
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
        <DialogTitle>新增工序步骤</DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 1, display: "flex", flexDirection: "column", gap: 2 }}>
            <TextField
              fullWidth
              label="步骤编号 *"
              value={formData.step_no}
              onChange={(e) =>
                setFormData({ ...formData, step_no: e.target.value })
              }
              placeholder="请输入步骤编号"
            />
            <TextField
              fullWidth
              label="步骤名称 *"
              value={formData.name}
              onChange={(e) =>
                setFormData({ ...formData, name: e.target.value })
              }
              placeholder="请输入步骤名称"
            />
            <TextField
              fullWidth
              label="所属工艺"
              value={formData.process_id}
              onChange={(e) =>
                setFormData({ ...formData, process_id: e.target.value })
              }
              placeholder="请输入工艺ID"
            />
            <TextField
              fullWidth
              label="排序序号"
              type="number"
              value={formData.sort_order}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  sort_order: parseInt(e.target.value) || 1,
                })
              }
            />
            <TextField
              fullWidth
              label="耗时(小时)"
              type="number"
              value={formData.duration_hours}
              onChange={(e) =>
                setFormData({ ...formData, duration_hours: e.target.value })
              }
              placeholder="请输入耗时"
            />
            <TextField
              fullWidth
              label="所需设备"
              value={formData.equipment_required}
              onChange={(e) =>
                setFormData({ ...formData, equipment_required: e.target.value })
              }
              placeholder="请输入所需设备"
            />
            <TextField
              fullWidth
              label="描述"
              value={formData.description}
              onChange={(e) =>
                setFormData({ ...formData, description: e.target.value })
              }
              placeholder="请输入步骤描述"
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
            sx={{ bgcolor: "#22c55e" }}
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
        <DialogTitle>工序步骤详情</DialogTitle>
        <DialogContent>
          {selectedStep && (
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
                  步骤编号
                </Box>
                <Box sx={{ fontWeight: 500 }}>{selectedStep.step_no}</Box>
              </Box>
              <Box>
                <Box
                  component="span"
                  sx={{ color: "text.secondary", fontSize: "0.875rem" }}
                >
                  步骤名称
                </Box>
                <Box>{selectedStep.name}</Box>
              </Box>
              <Box>
                <Box
                  component="span"
                  sx={{ color: "text.secondary", fontSize: "0.875rem" }}
                >
                  排序序号
                </Box>
                <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
                  <ListOrdered style={{ width: 16, height: 16 }} />
                  {selectedStep.sort_order}
                </Box>
              </Box>
              <Box>
                <Box
                  component="span"
                  sx={{ color: "text.secondary", fontSize: "0.875rem" }}
                >
                  耗时(小时)
                </Box>
                <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
                  <Clock style={{ width: 16, height: 16 }} />
                  {selectedStep.duration_hours || selectedStep.duration || "-"}
                </Box>
              </Box>
              <Box>
                <Box
                  component="span"
                  sx={{ color: "text.secondary", fontSize: "0.875rem" }}
                >
                  所需设备
                </Box>
                <Box>{selectedStep.equipment_required || "-"}</Box>
              </Box>
              <Box>
                <Box
                  component="span"
                  sx={{ color: "text.secondary", fontSize: "0.875rem" }}
                >
                  状态
                </Box>
                <Box sx={{ mt: 0.5 }}>
                  {getStatusBadge(selectedStep.status || "正常")}
                </Box>
              </Box>
              <Box sx={{ gridColumn: "1 / -1" }}>
                <Box
                  component="span"
                  sx={{ color: "text.secondary", fontSize: "0.875rem" }}
                >
                  描述
                </Box>
                <Box>{selectedStep.description || "-"}</Box>
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

export default PdmStepPage;
