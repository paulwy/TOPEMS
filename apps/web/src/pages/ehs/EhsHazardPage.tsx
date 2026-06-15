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
  AlertTriangle,
  Shield,
  MapPin,
  Search,
  Filter,
} from "lucide-react";
import { DataTable } from "../../components/DataTable";
import type { ColumnDef } from "@tanstack/react-table";

interface Hazard {
  id: string;
  hazard_no: string;
  name: string;
  risk_level: string;
  category: string;
  location: string;
  control_measures: string;
  status: string;
}

const mockHazards: Hazard[] = [
  {
    id: "1",
    hazard_no: "HZ2024001",
    name: "化学溶剂泄漏",
    risk_level: "高风险",
    category: "化学品",
    location: "A栋2层车间",
    control_measures: "防溢流措施、应急泄漏处理套装",
    status: "活动中",
  },
  {
    id: "2",
    hazard_no: "HZ2024002",
    name: "高温蒸汽烫伤",
    risk_level: "中风险",
    category: "物理危害",
    location: "B栋1层锅炉房",
    control_measures: "隔热防护、警示标识",
    status: "已控制",
  },
  {
    id: "3",
    hazard_no: "HZ2024003",
    name: "电气触电",
    risk_level: "高风险",
    category: "电气",
    location: "C栋配电室",
    control_measures: "绝缘防护、接地保护、定期检修",
    status: "活动中",
  },
  {
    id: "4",
    hazard_no: "HZ2024004",
    name: "机械伤害",
    risk_level: "中风险",
    category: "机械",
    location: "D栋生产车间",
    control_measures: "安全防护罩、紧急停止按钮",
    status: "活动中",
  },
  {
    id: "5",
    hazard_no: "HZ2024005",
    name: "高处坠落",
    risk_level: "高风险",
    category: "高处作业",
    location: "E栋维护通道",
    control_measures: "安全带、安全网、护栏",
    status: "已消除",
  },
];

const EhsHazardPage: React.FC = () => {
  const navigate = useNavigate();
  const [hazards, setHazards] = useState<Hazard[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [levelFilter, setLevelFilter] = useState("all");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedHazard, setSelectedHazard] = useState<Hazard | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    risk_level: "中风险",
    category: "化学品",
    location: "",
    control_measures: "",
  });

  useEffect(() => {
    loadHazards();
  }, []);

  const loadHazards = async () => {
    setLoading(true);
    setTimeout(() => {
      setHazards(mockHazards);
      setLoading(false);
    }, 500);
  };

  const getRiskLevelBadge = (level: string) => {
    const levelMap: Record<string, { bg: string; color: string }> = {
      "高风险": { bg: "#fee2e2", color: "#dc2626" },
      "中风险": { bg: "#fef9c3", color: "#ca8a04" },
      "低风险": { bg: "#dcfce7", color: "#16a34a" },
    };
    const colors = levelMap[level] || { bg: "#f3f4f6", color: "#4b5563" };
    return (
      <Chip
        label={level}
        size="small"
        sx={{ backgroundColor: colors.bg, color: colors.color, fontWeight: 500 }}
      />
    );
  };

  const getStatusBadge = (status: string) => {
    const statusMap: Record<string, { bg: string; color: string }> = {
      "活动中": { bg: "#fee2e2", color: "#dc2626" },
      "已控制": { bg: "#fef9c3", color: "#ca8a04" },
      "已消除": { bg: "#dcfce7", color: "#16a34a" },
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

  const columns: ColumnDef<Hazard>[] = [
    { accessorKey: "hazard_no", header: "危险源编号" },
    { accessorKey: "name", header: "名称" },
    {
      accessorKey: "risk_level",
      header: "风险等级",
      cell: ({ row }) => getRiskLevelBadge(row.original.risk_level),
    },
    { accessorKey: "category", header: "类别" },
    { accessorKey: "location", header: "位置" },
    { accessorKey: "control_measures", header: "管控措施" },
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

  const filteredHazards = hazards.filter((hazard) => {
    const matchesSearch =
      hazard.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      hazard.hazard_no.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesLevel = levelFilter === "all" || hazard.risk_level === levelFilter;
    const matchesCategory = categoryFilter === "all" || hazard.category === categoryFilter;
    const matchesStatus = statusFilter === "all" || hazard.status === statusFilter;
    return matchesSearch && matchesLevel && matchesCategory && matchesStatus;
  });

  const handleView = (hazard: Hazard) => {
    setSelectedHazard(hazard);
    setShowDetailModal(true);
  };

  const handleCreate = () => {
    setFormData({
      name: "",
      risk_level: "中风险",
      category: "化学品",
      location: "",
      control_measures: "",
    });
    setShowCreateModal(true);
  };

  const handleSave = () => {
    const newHazard: Hazard = {
      id: String(Date.now()),
      hazard_no: `HZ${Date.now()}`,
      name: formData.name,
      risk_level: formData.risk_level,
      category: formData.category,
      location: formData.location,
      control_measures: formData.control_measures,
      status: "活动中",
    };
    setHazards((prev) => [newHazard, ...prev]);
    setShowCreateModal(false);
  };

  const stats = {
    total: hazards.length,
    highRisk: hazards.filter((h) => h.risk_level === "高风险").length,
    controlled: hazards.filter((h) => h.status === "已控制").length,
    eliminated: hazards.filter((h) => h.status === "已消除").length,
  };

  if (loading) {
    return (
      <Box
        sx={{
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "linear-gradient(135deg, #fef2f2 0%, #f8fafc 100%)",
        }}
      >
        <Box sx={{ textAlign: "center" }}>
          <Box
            sx={{
              width: 48,
              height: 48,
              border: 4,
              borderColor: "#ef4444",
              borderTopColor: "#dc2626",
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
        background: "linear-gradient(135deg, #fef2f2 0%, #f8fafc 100%)",
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
                  background: "linear-gradient(135deg, #ef4444 0%, #dc2626 100%)",
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
                  危险源管理
                </Typography>
                <Typography variant="caption" sx={{ color: "slate.500", fontSize: "0.75rem" }}>
                  Hazard Source Management
                </Typography>
              </Box>
            </Box>
            <Button
              variant="contained"
              startIcon={<Plus style={{ width: 18, height: 18 }} />}
              onClick={handleCreate}
              sx={{ bgcolor: "#ef4444", "&:hover": { bgcolor: "#dc2626" } }}
            >
              新增危险源
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
          <Card sx={{ bgcolor: "#fef2f2" }}>
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
                  <AlertTriangle sx={{ width: 20, height: 20, color: "#ef4444" }} />
                </Box>
                <Box>
                  <Typography variant="body2" sx={{ color: "slate.600", fontSize: "0.875rem" }}>
                    危险源总数
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
                    bgcolor: "#fee2e2",
                    borderRadius: 2,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <Shield sx={{ width: 20, height: 20, color: "#dc2626" }} />
                </Box>
                <Box>
                  <Typography variant="body2" sx={{ color: "slate.600", fontSize: "0.875rem" }}>
                    高风险
                  </Typography>
                  <Typography variant="h5" sx={{ fontWeight: 700, color: "slate.900" }}>
                    {stats.highRisk}
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
                  <Shield sx={{ width: 20, height: 20, color: "#ca8a04" }} />
                </Box>
                <Box>
                  <Typography variant="body2" sx={{ color: "slate.600", fontSize: "0.875rem" }}>
                    已控制
                  </Typography>
                  <Typography variant="h5" sx={{ fontWeight: 700, color: "slate.900" }}>
                    {stats.controlled}
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
                  <Shield sx={{ width: 20, height: 20, color: "#16a34a" }} />
                </Box>
                <Box>
                  <Typography variant="body2" sx={{ color: "slate.600", fontSize: "0.875rem" }}>
                    已消除
                  </Typography>
                  <Typography variant="h5" sx={{ fontWeight: 700, color: "slate.900" }}>
                    {stats.eliminated}
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
              <AlertTriangle style={{ width: 20, height: 20, color: "#ef4444" }} />
              危险源列表
            </Typography>
          </CardHeader>
          <CardContent>
            <Box sx={{ display: "flex", flexWrap: "wrap", gap: 2, mb: 3 }}>
              <TextField
                size="small"
                placeholder="搜索危险源名称或编号..."
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
                label="风险等级"
                value={levelFilter}
                onChange={(e) => setLevelFilter(e.target.value)}
                sx={{ minWidth: 150 }}
              >
                <option value="all">全部</option>
                <option value="高风险">高风险</option>
                <option value="中风险">中风险</option>
                <option value="低风险">低风险</option>
              </TextField>
              <TextField
                size="small"
                select
                label="类别"
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                sx={{ minWidth: 150 }}
              >
                <option value="all">全部</option>
                <option value="化学品">化学品</option>
                <option value="物理危害">物理危害</option>
                <option value="电气">电气</option>
                <option value="机械">机械</option>
                <option value="高处作业">高处作业</option>
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
                <option value="活动中">活动中</option>
                <option value="已控制">已控制</option>
                <option value="已消除">已消除</option>
              </TextField>
            </Box>
            <DataTable columns={columns} data={filteredHazards} enablePagination />
          </CardContent>
        </Card>
      </Box>

      <Dialog open={showCreateModal} onClose={() => setShowCreateModal(false)} maxWidth="sm" fullWidth>
        <DialogTitle>新增危险源</DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 1, display: "flex", flexDirection: "column", gap: 2 }}>
            <TextField
              fullWidth
              label="危险源名称 *"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="请输入危险源名称"
            />
            <TextField
              fullWidth
              select
              label="风险等级"
              value={formData.risk_level}
              onChange={(e) => setFormData({ ...formData, risk_level: e.target.value })}
            >
              <option value="高风险">高风险</option>
              <option value="中风险">中风险</option>
              <option value="低风险">低风险</option>
            </TextField>
            <TextField
              fullWidth
              select
              label="类别"
              value={formData.category}
              onChange={(e) => setFormData({ ...formData, category: e.target.value })}
            >
              <option value="化学品">化学品</option>
              <option value="物理危害">物理危害</option>
              <option value="电气">电气</option>
              <option value="机械">机械</option>
              <option value="高处作业">高处作业</option>
            </TextField>
            <TextField
              fullWidth
              label="位置"
              value={formData.location}
              onChange={(e) => setFormData({ ...formData, location: e.target.value })}
              placeholder="请输入所在位置"
            />
            <TextField
              fullWidth
              label="管控措施"
              value={formData.control_measures}
              onChange={(e) => setFormData({ ...formData, control_measures: e.target.value })}
              placeholder="请输入管控措施"
              multiline
              rows={3}
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button variant="outlined" onClick={() => setShowCreateModal(false)}>
            取消
          </Button>
          <Button variant="contained" onClick={handleSave} sx={{ bgcolor: "#ef4444" }}>
            保存
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={showDetailModal} onClose={() => setShowDetailModal(false)} maxWidth="md" fullWidth>
        <DialogTitle>危险源详情</DialogTitle>
        <DialogContent>
          {selectedHazard && (
            <Box sx={{ pt: 2, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 2 }}>
              <Box>
                <Box component="span" sx={{ color: "text.secondary", fontSize: "0.875rem" }}>
                  危险源编号
                </Box>
                <Box sx={{ fontWeight: 500 }}>{selectedHazard.hazard_no}</Box>
              </Box>
              <Box>
                <Box component="span" sx={{ color: "text.secondary", fontSize: "0.875rem" }}>
                  名称
                </Box>
                <Box sx={{ fontWeight: 500 }}>{selectedHazard.name}</Box>
              </Box>
              <Box>
                <Box component="span" sx={{ color: "text.secondary", fontSize: "0.875rem" }}>
                  风险等级
                </Box>
                <Box sx={{ mt: 0.5 }}>{getRiskLevelBadge(selectedHazard.risk_level)}</Box>
              </Box>
              <Box>
                <Box component="span" sx={{ color: "text.secondary", fontSize: "0.875rem" }}>
                  类别
                </Box>
                <Box>{selectedHazard.category}</Box>
              </Box>
              <Box>
                <Box component="span" sx={{ color: "text.secondary", fontSize: "0.875rem" }}>
                  位置
                </Box>
                <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
                  <MapPin style={{ width: 16, height: 16 }} />
                  {selectedHazard.location}
                </Box>
              </Box>
              <Box>
                <Box component="span" sx={{ color: "text.secondary", fontSize: "0.875rem" }}>
                  状态
                </Box>
                <Box sx={{ mt: 0.5 }}>{getStatusBadge(selectedHazard.status)}</Box>
              </Box>
              <Box sx={{ gridColumn: "1 / -1" }}>
                <Box component="span" sx={{ color: "text.secondary", fontSize: "0.875rem" }}>
                  管控措施
                </Box>
                <Box>{selectedHazard.control_measures}</Box>
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

export default EhsHazardPage;
