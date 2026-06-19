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
  Edit,
  Trash2,
  Eye,
  Download,
  Upload,
  FlaskConical,
  Search,
  Filter,
} from "lucide-react";
import { DataTable } from "@/components/DataTable";
import type { ColumnDef } from "@tanstack/react-table";
import { PageHeader } from "@/components/templates";

interface Sample {
  id: string;
  sample_no: string;
  name: string;
  test_items: string;
  status: string;
  received_date: string;
  test_result: string;
}

const mockSamples: Sample[] = [
  {
    id: "1",
    sample_no: "S202401001",
    name: "水质样品A",
    test_items: "pH值、溶解氧",
    status: "已完成",
    received_date: "2024-01-15",
    test_result: "合格",
  },
  {
    id: "2",
    sample_no: "S202401002",
    name: "土壤样品B",
    test_items: "重金属含量",
    status: "检测中",
    received_date: "2024-01-16",
    test_result: "-",
  },
  {
    id: "3",
    sample_no: "S202401003",
    name: "空气样品C",
    test_items: "PM2.5、PM10",
    status: "待检测",
    received_date: "2024-01-17",
    test_result: "-",
  },
  {
    id: "4",
    sample_no: "S202401004",
    name: "食品样品D",
    test_items: "添加剂、农药残留",
    status: "已完成",
    received_date: "2024-01-18",
    test_result: "合格",
  },
  {
    id: "5",
    sample_no: "S202401005",
    name: "药品样品E",
    test_items: "有效成分含量",
    status: "待接收",
    received_date: "2024-01-19",
    test_result: "-",
  },
];

const LimsSamplePage: React.FC = () => {
  const navigate = useNavigate();
  const [samples, setSamples] = useState<Sample[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedSample, setSelectedSample] = useState<Sample | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    test_items: "",
    status: "待接收",
  });

  useEffect(() => {
    loadSamples();
  }, []);

  const loadSamples = async () => {
    setLoading(true);
    setTimeout(() => {
      setSamples(mockSamples);
      setLoading(false);
    }, 500);
  };

  const getStatusBadge = (status: string) => {
    const statusMap: Record<string, { bg: string; color: string }> = {
      待接收: { bg: "#f3f4f6", color: "#4b5563" },
      待检测: { bg: "#fef9c3", color: "#ca8a04" },
      检测中: { bg: "#dbeafe", color: "#2563eb" },
      已完成: { bg: "#dcfce7", color: "#16a34a" },
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

  const columns: ColumnDef<Sample>[] = [
    { accessorKey: "sample_no", header: "样品编号" },
    { accessorKey: "name", header: "样品名称" },
    { accessorKey: "test_items", header: "检测项目" },
    {
      accessorKey: "status",
      header: "状态",
      cell: ({ row }) => getStatusBadge(row.original.status),
    },
    { accessorKey: "received_date", header: "接收日期" },
    { accessorKey: "test_result", header: "检测结果" },
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
            查看
          </Button>
          <Button
            size="small"
            onClick={() => handleEdit(row.original)}
            startIcon={<Edit style={{ width: 16, height: 16 }} />}
          >
            编辑
          </Button>
        </Box>
      ),
    },
  ];

  const filteredSamples = samples.filter((sample) => {
    const matchesSearch =
      sample.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      sample.sample_no.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus =
      statusFilter === "all" || sample.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const handleView = (sample: Sample) => {
    setSelectedSample(sample);
    setShowDetailModal(true);
  };

  const handleEdit = (sample: Sample) => {
    setSelectedSample(sample);
    setFormData({
      name: sample.name,
      test_items: sample.test_items,
      status: sample.status,
    });
    setShowCreateModal(true);
  };

  const handleCreate = () => {
    setSelectedSample(null);
    setFormData({ name: "", test_items: "", status: "待接收" });
    setShowCreateModal(true);
  };

  const handleSave = () => {
    if (selectedSample) {
      setSamples((prev) =>
        prev.map((s) =>
          s.id === selectedSample.id
            ? {
                ...s,
                name: formData.name,
                test_items: formData.test_items,
                status: formData.status,
              }
            : s,
        ),
      );
    } else {
      const newSample: Sample = {
        id: String(Date.now()),
        sample_no: `S${Date.now()}`,
        name: formData.name,
        test_items: formData.test_items,
        status: formData.status,
        received_date: new Date().toISOString().split("T")[0],
        test_result: "-",
      };
      setSamples((prev) => [newSample, ...prev]);
    }
    setShowCreateModal(false);
  };

  const stats = {
    total: samples.length,
    pending: samples.filter(
      (s) => s.status === "待接收" || s.status === "待检测",
    ).length,
    inProgress: samples.filter((s) => s.status === "检测中").length,
    completed: samples.filter((s) => s.status === "已完成").length,
  };

  if (loading) {
    return (
      <Box
        sx={{
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "linear-gradient(135deg, #f0fdfa 0%, #f8fafc 100%)",
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
        background: "linear-gradient(135deg, #f0fdfa 0%, #f8fafc 100%)",
      }}
    >
      <PageHeader
        title="样品管理"
        subtitle="Sample Management"
        breadcrumbs={[
          { label: "首页", href: "/dashboard" },
          { label: "LIMS" },
          { label: "样品管理" },
        ]}
        backButton={{ onClick: () => navigate("/dashboard") }}
        actions={[
          {
            label: "导入",
            icon: <Upload style={{ width: 18, height: 18 }} />,
            variant: "outlined",
          },
          {
            label: "导出",
            icon: <Download style={{ width: 18, height: 18 }} />,
            variant: "outlined",
          },
          {
            label: "样品登记",
            icon: <Plus style={{ width: 18, height: 18 }} />,
            onClick: handleCreate,
            variant: "contained",
          },
        ]}
      />

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
          <Card sx={{ bgcolor: "#f0fdfa" }}>
            <CardContent sx={{ p: 2 }}>
              <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
                <Box
                  sx={{
                    width: 40,
                    height: 40,
                    bgcolor: "#d1fae5",
                    borderRadius: 2,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <FlaskConical
                    sx={{ width: 20, height: 20, color: "#06b6d4" }}
                  />
                </Box>
                <Box>
                  <Typography
                    variant="body2"
                    sx={{ color: "slate.600", fontSize: "0.875rem" }}
                  >
                    样品总数
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
                  <Search sx={{ width: 20, height: 20, color: "#2563eb" }} />
                </Box>
                <Box>
                  <Typography
                    variant="body2"
                    sx={{ color: "slate.600", fontSize: "0.875rem" }}
                  >
                    检测中
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
                    bgcolor: "#dcfce7",
                    borderRadius: 2,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <FlaskConical
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
              <FlaskConical
                style={{ width: 20, height: 20, color: "#06b6d4" }}
              />
              样品列表
            </Typography>
          </CardHeader>
          <CardContent>
            <Box sx={{ display: "flex", flexWrap: "wrap", gap: 2, mb: 3 }}>
              <TextField
                size="small"
                placeholder="搜索样品编号或名称..."
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
                label="状态"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                sx={{ minWidth: 150 }}
                slotProps={{
                  input: {
                    startAdornment: (
                      <Filter
                        style={{ width: 18, height: 18, marginRight: 8 }}
                      />
                    ),
                  },
                }}
              >
                <option value="all">全部</option>
                <option value="待接收">待接收</option>
                <option value="待检测">待检测</option>
                <option value="检测中">检测中</option>
                <option value="已完成">已完成</option>
              </TextField>
            </Box>
            <DataTable
              columns={columns}
              data={filteredSamples}
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
        <DialogTitle>{selectedSample ? "编辑样品" : "样品登记"}</DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 1, display: "flex", flexDirection: "column", gap: 2 }}>
            <TextField
              fullWidth
              label="样品名称 *"
              value={formData.name}
              onChange={(e) =>
                setFormData({ ...formData, name: e.target.value })
              }
              placeholder="请输入样品名称"
            />
            <TextField
              fullWidth
              label="检测项目"
              value={formData.test_items}
              onChange={(e) =>
                setFormData({ ...formData, test_items: e.target.value })
              }
              placeholder="请输入检测项目，多个用逗号分隔"
            />
            <TextField
              fullWidth
              select
              label="状态"
              value={formData.status}
              onChange={(e) =>
                setFormData({ ...formData, status: e.target.value })
              }
            >
              <option value="待接收">待接收</option>
              <option value="待检测">待检测</option>
              <option value="检测中">检测中</option>
              <option value="已完成">已完成</option>
            </TextField>
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
        <DialogTitle>样品详情</DialogTitle>
        <DialogContent>
          {selectedSample && (
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
                  样品编号
                </Box>
                <Box sx={{ fontWeight: 500 }}>{selectedSample.sample_no}</Box>
              </Box>
              <Box>
                <Box
                  component="span"
                  sx={{ color: "text.secondary", fontSize: "0.875rem" }}
                >
                  样品名称
                </Box>
                <Box sx={{ fontWeight: 500 }}>{selectedSample.name}</Box>
              </Box>
              <Box>
                <Box
                  component="span"
                  sx={{ color: "text.secondary", fontSize: "0.875rem" }}
                >
                  检测项目
                </Box>
                <Box>{selectedSample.test_items}</Box>
              </Box>
              <Box>
                <Box
                  component="span"
                  sx={{ color: "text.secondary", fontSize: "0.875rem" }}
                >
                  状态
                </Box>
                <Box sx={{ mt: 0.5 }}>
                  {getStatusBadge(selectedSample.status)}
                </Box>
              </Box>
              <Box>
                <Box
                  component="span"
                  sx={{ color: "text.secondary", fontSize: "0.875rem" }}
                >
                  接收日期
                </Box>
                <Box>{selectedSample.received_date}</Box>
              </Box>
              <Box>
                <Box
                  component="span"
                  sx={{ color: "text.secondary", fontSize: "0.875rem" }}
                >
                  检测结果
                </Box>
                <Box>{selectedSample.test_result}</Box>
              </Box>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowDetailModal(false)}>关闭</Button>
          <Button
            variant="contained"
            onClick={() => {
              setShowDetailModal(false);
              handleEdit(selectedSample!);
            }}
            sx={{ bgcolor: "#06b6d4" }}
          >
            编辑
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default LimsSamplePage;
