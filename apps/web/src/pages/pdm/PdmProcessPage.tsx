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
import { Plus, Eye, Factory, Search, Clock } from "lucide-react";
import { DataTable } from "@/components/DataTable";
import type { ColumnDef } from "@tanstack/react-table";
import { pdmApi } from "@/api/pdm";
import type { ProductionProcess } from "@/api/pdm";
import { toast } from "react-toastify";

const PdmProcessPage: React.FC = () => {
  const [processes, setProcesses] = useState<ProductionProcess[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedProcess, setSelectedProcess] =
    useState<ProductionProcess | null>(null);
  const [formData, setFormData] = useState({
    process_no: "",
    name: "",
    description: "",
    version: "1.0",
  });

  useEffect(() => {
    loadProcesses();
  }, []);

  const loadProcesses = async () => {
    try {
      setLoading(true);
      const response = await pdmApi.listProcesses();
      if (response.success && response.data) {
        const adapted = (response.data as any).map((item: any) => ({
          ...item,
          status:
            item.status === "active"
              ? "启用"
              : item.status === "inactive"
                ? "禁用"
                : item.status,
        }));
        setProcesses(adapted);
      } else {
        setProcesses([]);
      }
    } catch (err) {
      console.error("加载生产工艺数据失败:", err);
      setProcesses([]);
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const statusMap: Record<string, { bg: string; color: string }> = {
      启用: { bg: "#dcfce7", color: "#16a34a" },
      禁用: { bg: "#fee2e2", color: "#dc2626" },
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

  const columns: ColumnDef<ProductionProcess>[] = [
    { accessorKey: "process_no", header: "工艺编号" },
    { accessorKey: "name", header: "工艺名称" },
    { accessorKey: "version", header: "版本" },
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

  const filteredProcesses = processes.filter((process) => {
    return (
      process.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      process.process_no.toLowerCase().includes(searchTerm.toLowerCase())
    );
  });

  const handleView = (process: ProductionProcess) => {
    setSelectedProcess(process);
    setShowDetailModal(true);
  };

  const handleCreate = () => {
    setFormData({
      process_no: "",
      name: "",
      description: "",
      version: "1.0",
    });
    setShowCreateModal(true);
  };

  const handleSave = async () => {
    try {
      await pdmApi.createProcess({
        process_no: formData.process_no,
        name: formData.name,
        description: formData.description || undefined,
        version: formData.version,
        status: "active",
      });
      toast.success("生产工艺创建成功");
      setShowCreateModal(false);
      loadProcesses();
    } catch (err) {
      toast.error("创建失败");
      console.error("创建生产工艺失败:", err);
    }
  };

  const stats = {
    total: processes.length,
    active: processes.filter((p) => p.status === "启用").length,
    inactive: processes.filter((p) => p.status === "禁用").length,
  };

  if (loading) {
    return (
      <Box
        sx={{
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "linear-gradient(135deg, #ecfeff 0%, #f8fafc 100%)",
        }}
      >
        <Box sx={{ textAlign: "center" }}>
          <Box
            sx={{
              width: 48,
              height: 48,
              border: 4,
              borderColor: "#06b6d4",
              borderTopColor: "#0891b2",
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
        background: "linear-gradient(135deg, #ecfeff 0%, #f8fafc 100%)",
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
                    "linear-gradient(135deg, #06b6d4 0%, #0891b2 100%)",
                  borderRadius: 2,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Factory sx={{ width: 24, height: 24, color: "white" }} />
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
                  生产工艺
                </Typography>
                <Typography
                  variant="caption"
                  sx={{ color: "slate.500", fontSize: "0.75rem" }}
                >
                  Production Process
                </Typography>
              </Box>
            </Box>
            <Button
              variant="contained"
              startIcon={<Plus style={{ width: 18, height: 18 }} />}
              onClick={handleCreate}
              sx={{ bgcolor: "#06b6d4", "&:hover": { bgcolor: "#0891b2" } }}
            >
              新增工艺
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
          <Card sx={{ bgcolor: "#ecfeff" }}>
            <CardContent sx={{ p: 2 }}>
              <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
                <Box
                  sx={{
                    width: 40,
                    height: 40,
                    bgcolor: "#cffafe",
                    borderRadius: 2,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <Factory sx={{ width: 20, height: 20, color: "#06b6d4" }} />
                </Box>
                <Box>
                  <Typography
                    variant="body2"
                    sx={{ color: "slate.600", fontSize: "0.875rem" }}
                  >
                    工艺总数
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
                  <Factory sx={{ width: 20, height: 20, color: "#16a34a" }} />
                </Box>
                <Box>
                  <Typography
                    variant="body2"
                    sx={{ color: "slate.600", fontSize: "0.875rem" }}
                  >
                    已启用
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
                  <Factory sx={{ width: 20, height: 20, color: "#dc2626" }} />
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
              <Factory style={{ width: 20, height: 20, color: "#06b6d4" }} />
              生产工艺列表
            </Typography>
          </CardHeader>
          <CardContent>
            <Box sx={{ display: "flex", flexWrap: "wrap", gap: 2, mb: 3 }}>
              <TextField
                size="small"
                placeholder="搜索工艺名称或编号..."
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
              data={filteredProcesses}
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
        <DialogTitle>新增生产工艺</DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 1, display: "flex", flexDirection: "column", gap: 2 }}>
            <TextField
              fullWidth
              label="工艺编号 *"
              value={formData.process_no}
              onChange={(e) =>
                setFormData({ ...formData, process_no: e.target.value })
              }
              placeholder="请输入工艺编号"
            />
            <TextField
              fullWidth
              label="工艺名称 *"
              value={formData.name}
              onChange={(e) =>
                setFormData({ ...formData, name: e.target.value })
              }
              placeholder="请输入工艺名称"
            />
            <TextField
              fullWidth
              label="版本"
              value={formData.version}
              onChange={(e) =>
                setFormData({ ...formData, version: e.target.value })
              }
              placeholder="请输入版本号"
            />
            <TextField
              fullWidth
              label="描述"
              value={formData.description}
              onChange={(e) =>
                setFormData({ ...formData, description: e.target.value })
              }
              placeholder="请输入工艺描述"
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
            sx={{ bgcolor: "#06b6d4" }}
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
        <DialogTitle>生产工艺详情</DialogTitle>
        <DialogContent>
          {selectedProcess && (
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
                  工艺编号
                </Box>
                <Box sx={{ fontWeight: 500 }}>{selectedProcess.process_no}</Box>
              </Box>
              <Box>
                <Box
                  component="span"
                  sx={{ color: "text.secondary", fontSize: "0.875rem" }}
                >
                  工艺名称
                </Box>
                <Box>{selectedProcess.name}</Box>
              </Box>
              <Box>
                <Box
                  component="span"
                  sx={{ color: "text.secondary", fontSize: "0.875rem" }}
                >
                  版本
                </Box>
                <Box>{selectedProcess.version}</Box>
              </Box>
              <Box>
                <Box
                  component="span"
                  sx={{ color: "text.secondary", fontSize: "0.875rem" }}
                >
                  状态
                </Box>
                <Box sx={{ mt: 0.5 }}>
                  {getStatusBadge(selectedProcess.status)}
                </Box>
              </Box>
              <Box sx={{ gridColumn: "1 / -1" }}>
                <Box
                  component="span"
                  sx={{ color: "text.secondary", fontSize: "0.875rem" }}
                >
                  描述
                </Box>
                <Box>{selectedProcess.description || "-"}</Box>
              </Box>
              <Box>
                <Box
                  component="span"
                  sx={{ color: "text.secondary", fontSize: "0.875rem" }}
                >
                  创建时间
                </Box>
                <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
                  <Clock style={{ width: 16, height: 16 }} />
                  {selectedProcess.created_at || "-"}
                </Box>
              </Box>
              <Box>
                <Box
                  component="span"
                  sx={{ color: "text.secondary", fontSize: "0.875rem" }}
                >
                  更新时间
                </Box>
                <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
                  <Clock style={{ width: 16, height: 16 }} />
                  {selectedProcess.updated_at || "-"}
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

export default PdmProcessPage;
