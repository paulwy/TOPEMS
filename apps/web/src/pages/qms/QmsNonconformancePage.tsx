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
  Edit,
  Trash2,
  AlertTriangle,
  Search,
  Filter,
} from "lucide-react";
import { DataTable } from "@/components/DataTable";
import type { ColumnDef } from "@tanstack/react-table";

interface Nonconformance {
  id: string;
  nonconformance_no: string;
  product_name: string;
  nonconformance_quantity: number;
  nonconformance_type: string;
  severity: string;
  handling_method: string;
  status: string;
}

const mockNonconformances: Nonconformance[] = [
  {
    id: "1",
    nonconformance_no: "NC2024001",
    product_name: "原材料A",
    nonconformance_quantity: 50,
    nonconformance_type: "外观缺陷",
    severity: "严重",
    handling_method: "退货处理",
    status: "处理中",
  },
  {
    id: "2",
    nonconformance_no: "NC2024002",
    product_name: "半成品B",
    nonconformance_quantity: 20,
    nonconformance_type: "尺寸偏差",
    severity: "一般",
    handling_method: "返工处理",
    status: "待评审",
  },
  {
    id: "3",
    nonconformance_no: "NC2024003",
    product_name: "成品C",
    nonconformance_quantity: 10,
    nonconformance_type: "性能不达标",
    severity: "严重",
    handling_method: "降级处理",
    status: "已关闭",
  },
  {
    id: "4",
    nonconformance_no: "NC2024004",
    product_name: "原材料D",
    nonconformance_quantity: 100,
    nonconformance_type: "包装破损",
    severity: "轻微",
    handling_method: "让步接收",
    status: "处理中",
  },
  {
    id: "5",
    nonconformance_no: "NC2024005",
    product_name: "半成品E",
    nonconformance_quantity: 30,
    nonconformance_type: "材料混用",
    severity: "严重",
    handling_method: "报废处理",
    status: "待评审",
  },
];

const QmsNonconformancePage: React.FC = () => {
  const navigate = useNavigate();
  const [nonconformances, setNonconformances] = useState<Nonconformance[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [severityFilter, setSeverityFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedNC, setSelectedNC] = useState<Nonconformance | null>(null);
  const [formData, setFormData] = useState({
    product_name: "",
    nonconformance_quantity: "",
    nonconformance_type: "外观缺陷",
    severity: "一般",
    handling_method: "退货处理",
  });

  useEffect(() => {
    loadNonconformances();
  }, []);

  const loadNonconformances = async () => {
    setLoading(true);
    setTimeout(() => {
      setNonconformances(mockNonconformances);
      setLoading(false);
    }, 500);
  };

  const getSeverityBadge = (severity: string) => {
    const severityMap: Record<string, { bg: string; color: string }> = {
      "严重": { bg: "#fee2e2", color: "#dc2626" },
      "一般": { bg: "#fef9c3", color: "#ca8a04" },
      "轻微": { bg: "#dcfce7", color: "#16a34a" },
    };
    const colors = severityMap[severity] || { bg: "#f3f4f6", color: "#4b5563" };
    return (
      <Chip
        label={severity}
        size="small"
        sx={{ backgroundColor: colors.bg, color: colors.color, fontWeight: 500 }}
      />
    );
  };

  const getStatusBadge = (status: string) => {
    const statusMap: Record<string, { bg: string; color: string }> = {
      "待评审": { bg: "#fef9c3", color: "#ca8a04" },
      "处理中": { bg: "#dbeafe", color: "#2563eb" },
      "已关闭": { bg: "#dcfce7", color: "#16a34a" },
    };
    const colors = statusMap[status] || { bg: "#f3f4f6", color: "#4b5563" };
    return (
      <Chip
        label={status}
        size="small"
        sx={{ backgroundColor: colors.bg, color: colors.color, fontWeight: 500 }}
      />
    );
  };

  const columns: ColumnDef<Nonconformance>[] = [
    { accessorKey: "nonconformance_no", header: "不合格单号" },
    { accessorKey: "product_name", header: "产品名称" },
    { accessorKey: "nonconformance_quantity", header: "不合格数量" },
    { accessorKey: "nonconformance_type", header: "不合格类型" },
    {
      accessorKey: "severity",
      header: "严重程度",
      cell: ({ row }) => getSeverityBadge(row.original.severity),
    },
    { accessorKey: "handling_method", header: "处理方式" },
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
          {row.original.status !== "已关闭" && (
            <Button
              size="small"
              onClick={() => handleClose(row.original)}
              sx={{ color: "#16a34a" }}
            >
              关闭
            </Button>
          )}
        </Box>
      ),
    },
  ];

  const filteredNCs = nonconformances.filter((nc) => {
    const matchesSearch =
      nc.product_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      nc.nonconformance_no.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesType = typeFilter === "all" || nc.nonconformance_type === typeFilter;
    const matchesSeverity = severityFilter === "all" || nc.severity === severityFilter;
    const matchesStatus = statusFilter === "all" || nc.status === statusFilter;
    return matchesSearch && matchesType && matchesSeverity && matchesStatus;
  });

  const handleView = (nc: Nonconformance) => {
    setSelectedNC(nc);
    setShowDetailModal(true);
  };

  const handleCreate = () => {
    setFormData({
      product_name: "",
      nonconformance_quantity: "",
      nonconformance_type: "外观缺陷",
      severity: "一般",
      handling_method: "退货处理",
    });
    setShowCreateModal(true);
  };

  const handleClose = (nc: Nonconformance) => {
    setNonconformances((prev) =>
      prev.map((n) => (n.id === nc.id ? { ...n, status: "已关闭" } : n)),
    );
  };

  const handleSave = () => {
    const newNC: Nonconformance = {
      id: String(Date.now()),
      nonconformance_no: `NC${Date.now()}`,
      product_name: formData.product_name,
      nonconformance_quantity: parseInt(formData.nonconformance_quantity) || 0,
      nonconformance_type: formData.nonconformance_type,
      severity: formData.severity,
      handling_method: formData.handling_method,
      status: "待评审",
    };
    setNonconformances((prev) => [newNC, ...prev]);
    setShowCreateModal(false);
  };

  const stats = {
    total: nonconformances.length,
    pending: nonconformances.filter((n) => n.status === "待评审").length,
    inProgress: nonconformances.filter((n) => n.status === "处理中").length,
    closed: nonconformances.filter((n) => n.status === "已关闭").length,
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
                  background: "linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)",
                  borderRadius: 2,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <AlertTriangle sx={{ width: 24, height: 24, color: "white" }} />
              </Box>
              <Box>
                <Typography
                  variant="h6"
                  sx={{ fontWeight: 700, color: "slate.900", fontSize: "1.25rem" }}
                >
                  不合格品管理
                </Typography>
                <Typography variant="caption" sx={{ color: "slate.500", fontSize: "0.75rem" }}>
                  Nonconformance Management
                </Typography>
              </Box>
            </Box>
            <Button
              variant="contained"
              startIcon={<Plus style={{ width: 18, height: 18 }} />}
              onClick={handleCreate}
              sx={{ bgcolor: "#3b82f6", "&:hover": { bgcolor: "#2563eb" } }}
            >
              新建不合格单
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
                    bgcolor: "#fee2e2",
                    borderRadius: 2,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <AlertTriangle sx={{ width: 20, height: 20, color: "#dc2626" }} />
                </Box>
                <Box>
                  <Typography variant="body2" sx={{ color: "slate.600", fontSize: "0.875rem" }}>
                    不合格品总数
                  </Typography>
                  <Typography variant="h5" sx={{ fontWeight: 700, color: "slate.900" }}>
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
                    bgcolor: "#fef3c7",
                    borderRadius: 2,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <Filter sx={{ width: 20, height: 20, color: "#ca8a04" }} />
                </Box>
                <Box>
                  <Typography variant="body2" sx={{ color: "slate.600", fontSize: "0.875rem" }}>
                    待评审
                  </Typography>
                  <Typography variant="h5" sx={{ fontWeight: 700, color: "slate.900" }}>
                    {stats.pending}
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
                  <AlertTriangle sx={{ width: 20, height: 20, color: "#2563eb" }} />
                </Box>
                <Box>
                  <Typography variant="body2" sx={{ color: "slate.600", fontSize: "0.875rem" }}>
                    处理中
                  </Typography>
                  <Typography variant="h5" sx={{ fontWeight: 700, color: "slate.900" }}>
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
                    bgcolor: "#dcfce7",
                    borderRadius: 2,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <AlertTriangle sx={{ width: 20, height: 20, color: "#16a34a" }} />
                </Box>
                <Box>
                  <Typography variant="body2" sx={{ color: "slate.600", fontSize: "0.875rem" }}>
                    已关闭
                  </Typography>
                  <Typography variant="h5" sx={{ fontWeight: 700, color: "slate.900" }}>
                    {stats.closed}
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
            <Typography variant="h6" sx={{ display: "flex", alignItems: "center", gap: 1 }}>
              <AlertTriangle style={{ width: 20, height: 20, color: "#3b82f6" }} />
              不合格品列表
            </Typography>
          </CardHeader>
          <CardContent>
            <Box sx={{ display: "flex", flexWrap: "wrap", gap: 2, mb: 3 }}>
              <TextField
                size="small"
                placeholder="搜索产品名称或单号..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                sx={{ minWidth: 250 }}
                slotProps={{
                  input: {
                    startAdornment: <Search style={{ width: 18, height: 18, marginRight: 8 }} />,
                  },
                }}
              />
              <TextField
                size="small"
                select
                label="不合格类型"
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value)}
                sx={{ minWidth: 150 }}
              >
                <option value="all">全部</option>
                <option value="外观缺陷">外观缺陷</option>
                <option value="尺寸偏差">尺寸偏差</option>
                <option value="性能不达标">性能不达标</option>
                <option value="包装破损">包装破损</option>
                <option value="材料混用">材料混用</option>
              </TextField>
              <TextField
                size="small"
                select
                label="严重程度"
                value={severityFilter}
                onChange={(e) => setSeverityFilter(e.target.value)}
                sx={{ minWidth: 150 }}
              >
                <option value="all">全部</option>
                <option value="严重">严重</option>
                <option value="一般">一般</option>
                <option value="轻微">轻微</option>
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
                <option value="待评审">待评审</option>
                <option value="处理中">处理中</option>
                <option value="已关闭">已关闭</option>
              </TextField>
            </Box>
            <DataTable columns={columns} data={filteredNCs} enablePagination />
          </CardContent>
        </Card>
      </Box>

      <Dialog open={showCreateModal} onClose={() => setShowCreateModal(false)} maxWidth="sm" fullWidth>
        <DialogTitle>新建不合格单</DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 1, display: "flex", flexDirection: "column", gap: 2 }}>
            <TextField
              fullWidth
              label="产品名称 *"
              value={formData.product_name}
              onChange={(e) => setFormData({ ...formData, product_name: e.target.value })}
              placeholder="请输入产品名称"
            />
            <TextField
              fullWidth
              type="number"
              label="不合格数量"
              value={formData.nonconformance_quantity}
              onChange={(e) => setFormData({ ...formData, nonconformance_quantity: e.target.value })}
              placeholder="请输入不合格数量"
            />
            <TextField
              fullWidth
              select
              label="不合格类型"
              value={formData.nonconformance_type}
              onChange={(e) => setFormData({ ...formData, nonconformance_type: e.target.value })}
            >
              <option value="外观缺陷">外观缺陷</option>
              <option value="尺寸偏差">尺寸偏差</option>
              <option value="性能不达标">性能不达标</option>
              <option value="包装破损">包装破损</option>
              <option value="材料混用">材料混用</option>
            </TextField>
            <TextField
              fullWidth
              select
              label="严重程度"
              value={formData.severity}
              onChange={(e) => setFormData({ ...formData, severity: e.target.value })}
            >
              <option value="严重">严重</option>
              <option value="一般">一般</option>
              <option value="轻微">轻微</option>
            </TextField>
            <TextField
              fullWidth
              select
              label="处理方式"
              value={formData.handling_method}
              onChange={(e) => setFormData({ ...formData, handling_method: e.target.value })}
            >
              <option value="退货处理">退货处理</option>
              <option value="返工处理">返工处理</option>
              <option value="降级处理">降级处理</option>
              <option value="让步接收">让步接收</option>
              <option value="报废处理">报废处理</option>
            </TextField>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button variant="outlined" onClick={() => setShowCreateModal(false)}>
            取消
          </Button>
          <Button variant="contained" onClick={handleSave} sx={{ bgcolor: "#3b82f6" }}>
            保存
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={showDetailModal} onClose={() => setShowDetailModal(false)} maxWidth="md" fullWidth>
        <DialogTitle>不合格品详情</DialogTitle>
        <DialogContent>
          {selectedNC && (
            <Box sx={{ pt: 2, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 2 }}>
              <Box>
                <Box component="span" sx={{ color: "text.secondary", fontSize: "0.875rem" }}>
                  不合格单号
                </Box>
                <Box sx={{ fontWeight: 500 }}>{selectedNC.nonconformance_no}</Box>
              </Box>
              <Box>
                <Box component="span" sx={{ color: "text.secondary", fontSize: "0.875rem" }}>
                  产品名称
                </Box>
                <Box sx={{ fontWeight: 500 }}>{selectedNC.product_name}</Box>
              </Box>
              <Box>
                <Box component="span" sx={{ color: "text.secondary", fontSize: "0.875rem" }}>
                  不合格数量
                </Box>
                <Box>{selectedNC.nonconformance_quantity}</Box>
              </Box>
              <Box>
                <Box component="span" sx={{ color: "text.secondary", fontSize: "0.875rem" }}>
                  不合格类型
                </Box>
                <Box>{selectedNC.nonconformance_type}</Box>
              </Box>
              <Box>
                <Box component="span" sx={{ color: "text.secondary", fontSize: "0.875rem" }}>
                  严重程度
                </Box>
                <Box sx={{ mt: 0.5 }}>{getSeverityBadge(selectedNC.severity)}</Box>
              </Box>
              <Box>
                <Box component="span" sx={{ color: "text.secondary", fontSize: "0.875rem" }}>
                  处理方式
                </Box>
                <Box>{selectedNC.handling_method}</Box>
              </Box>
              <Box>
                <Box component="span" sx={{ color: "text.secondary", fontSize: "0.875rem" }}>
                  状态
                </Box>
                <Box sx={{ mt: 0.5 }}>{getStatusBadge(selectedNC.status)}</Box>
              </Box>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowDetailModal(false)}>关闭</Button>
          {selectedNC && selectedNC.status !== "已关闭" && (
            <Button
              variant="contained"
              onClick={() => {
                handleClose(selectedNC);
                setShowDetailModal(false);
              }}
              sx={{ bgcolor: "#16a34a" }}
            >
              关闭
            </Button>
          )}
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default QmsNonconformancePage;
