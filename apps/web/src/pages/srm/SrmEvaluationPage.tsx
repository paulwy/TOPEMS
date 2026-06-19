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
import { Plus, Award, Search, Star } from "lucide-react";
import { DataTable } from "@/components/DataTable";
import type { ColumnDef } from "@tanstack/react-table";
import { srmApi } from "@/api/srm";
import type { SupplierEvaluation } from "@/api/srm";
import { toast } from "react-toastify";

const SrmEvaluationPage: React.FC = () => {
  const [evaluations, setEvaluations] = useState<SupplierEvaluation[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [formData, setFormData] = useState({
    supplier_id: "",
    supplier_name: "",
    score: "50",
    dimension_scores: "",
    comment: "",
    evaluator: "",
  });

  useEffect(() => {
    loadEvaluations();
  }, []);

  const loadEvaluations = async () => {
    try {
      setLoading(true);
      const response = await srmApi.listEvaluations();
      if (response.success && response.data) {
        const data = response.data as any;
        const items = Array.isArray(data) ? data : data.evaluations || [];
        const adapted = items.map((item: any) => ({
          ...item,
          evaluation_date: item.evaluation_date || item.created_at,
          overall_score: item.overall_score || 0,
        }));
        setEvaluations(adapted);
      } else {
        setEvaluations([]);
      }
    } catch (err) {
      console.error("加载评估数据失败:", err);
      setEvaluations([]);
    } finally {
      setLoading(false);
    }
  };

  const getScoreBadge = (score: number) => {
    if (score >= 80) return { bg: "#dcfce7", color: "#15803d", label: "优秀" };
    if (score >= 60) return { bg: "#fef3c7", color: "#b45309", label: "良好" };
    if (score >= 40) return { bg: "#fde68a", color: "#92400e", label: "一般" };
    return { bg: "#fee2e2", color: "#b91c1c", label: "较差" };
  };

  const ScoreChip: React.FC<{ score: number }> = ({ score }) => {
    const style = getScoreBadge(score);
    return (
      <Chip
        label={`${score}分 - ${style.label}`}
        size="small"
        sx={{ bgcolor: style.bg, color: style.color, fontWeight: 500 }}
      />
    );
  };

  const columns: ColumnDef<SupplierEvaluation>[] = [
    { accessorKey: "evaluation_no", header: "评估编号" },
    {
      accessorKey: "overall_score",
      header: "评分",
      cell: ({ row }) => <ScoreChip score={row.original.overall_score || 0} />,
    },
    {
      id: "star",
      header: "星级",
      cell: ({ row }) => {
        const score = row.original.overall_score || 0;
        const stars = Math.round(score / 20);
        return (
          <Box sx={{ display: "flex", gap: 0.5 }}>
            {[1, 2, 3, 4, 5].map((i) => (
              <Star
                key={i}
                style={{
                  width: 16,
                  height: 16,
                  color: i <= stars ? "#fbbf24" : "#e5e7eb",
                  fill: i <= stars ? "#fbbf24" : "none",
                }}
              />
            ))}
          </Box>
        );
      },
    },
    { accessorKey: "evaluator", header: "评估人" },
    {
      accessorKey: "evaluation_date",
      header: "评估日期",
      cell: ({ row }) => {
        const date = row.original.evaluation_date;
        return date ? new Date(date).toLocaleDateString("zh-CN") : "";
      },
    },
    { accessorKey: "comment", header: "备注", maxSize: 100 },
  ];

  const filteredEvaluations = evaluations.filter((e) => {
    return e.evaluator?.toLowerCase().includes(searchTerm.toLowerCase());
  });

  const handleCreate = () => {
    setFormData({
      supplier_id: "",
      supplier_name: "",
      score: "50",
      dimension_scores: "",
      comment: "",
      evaluator: "",
    });
    setShowCreateModal(true);
  };

  const handleSave = async () => {
    try {
      await srmApi.createEvaluation({
        supplier_id: formData.supplier_id,
        evaluation_no: `EVAL-${Date.now()}`,
        overall_score: parseFloat(formData.score),
        comments: formData.comment,
        evaluator: formData.evaluator,
        status: "completed",
      });
      toast.success("评估创建成功");
      setShowCreateModal(false);
      loadEvaluations();
    } catch (err) {
      toast.error("创建失败");
      console.error("创建评估失败:", err);
    }
  };

  const stats = {
    total: evaluations.length,
    avgScore:
      evaluations.length > 0
        ? (
            evaluations.reduce((sum, e) => sum + (e.overall_score || 0), 0) /
            evaluations.length
          ).toFixed(1)
        : "0",
    excellent: evaluations.filter((e) => (e.overall_score || 0) >= 80).length,
    poor: evaluations.filter((e) => (e.overall_score || 0) < 40).length,
  };

  if (loading) {
    return (
      <Box
        sx={{
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "linear-gradient(135deg, #faf5ff 0%, #f8fafc 100%)",
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
                <Award sx={{ width: 24, height: 24, color: "white" }} />
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
                  供应商评估
                </Typography>
                <Typography
                  variant="caption"
                  sx={{ color: "slate.500", fontSize: "0.75rem" }}
                >
                  Supplier Evaluation
                </Typography>
              </Box>
            </Box>
            <Button
              variant="contained"
              startIcon={<Plus style={{ width: 18, height: 18 }} />}
              onClick={handleCreate}
              sx={{ bgcolor: "#f59e0b", "&:hover": { bgcolor: "#d97706" } }}
            >
              新增评估
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
                  <Award sx={{ width: 20, height: 20, color: "#d97706" }} />
                </Box>
                <Box>
                  <Typography
                    variant="body2"
                    sx={{ color: "slate.600", fontSize: "0.875rem" }}
                  >
                    评估总数
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
                  <Star sx={{ width: 20, height: 20, color: "#16a34a" }} />
                </Box>
                <Box>
                  <Typography
                    variant="body2"
                    sx={{ color: "slate.600", fontSize: "0.875rem" }}
                  >
                    平均评分
                  </Typography>
                  <Typography
                    variant="h5"
                    sx={{ fontWeight: 700, color: "slate.900" }}
                  >
                    {stats.avgScore}
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
                  <Star sx={{ width: 20, height: 20, color: "#16a34a" }} />
                </Box>
                <Box>
                  <Typography
                    variant="body2"
                    sx={{ color: "slate.600", fontSize: "0.875rem" }}
                  >
                    优秀
                  </Typography>
                  <Typography
                    variant="h5"
                    sx={{ fontWeight: 700, color: "slate.900" }}
                  >
                    {stats.excellent}
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
                  <Star sx={{ width: 20, height: 20, color: "#dc2626" }} />
                </Box>
                <Box>
                  <Typography
                    variant="body2"
                    sx={{ color: "slate.600", fontSize: "0.875rem" }}
                  >
                    较差
                  </Typography>
                  <Typography
                    variant="h5"
                    sx={{ fontWeight: 700, color: "slate.900" }}
                  >
                    {stats.poor}
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
              <Award style={{ width: 20, height: 20, color: "#f59e0b" }} />
              评估列表
            </Typography>
          </CardHeader>
          <CardContent>
            <Box sx={{ display: "flex", flexWrap: "wrap", gap: 2, mb: 3 }}>
              <TextField
                size="small"
                placeholder="搜索供应商名称或评估人..."
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
              data={filteredEvaluations}
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
        <DialogTitle>新增评估</DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 1, display: "flex", flexDirection: "column", gap: 2 }}>
            <TextField
              fullWidth
              label="供应商名称 *"
              value={formData.supplier_name}
              onChange={(e) =>
                setFormData({ ...formData, supplier_name: e.target.value })
              }
              placeholder="请输入供应商名称"
            />
            <TextField
              fullWidth
              label="供应商ID"
              value={formData.supplier_id}
              onChange={(e) =>
                setFormData({ ...formData, supplier_id: e.target.value })
              }
              placeholder="请输入供应商ID"
            />
            <TextField
              fullWidth
              label="综合评分"
              type="number"
              value={formData.score}
              onChange={(e) =>
                setFormData({ ...formData, score: e.target.value })
              }
              placeholder="请输入评分(0-100)"
              slotProps={{ htmlInput: { min: 0, max: 100 } }}
            />
            <TextField
              fullWidth
              label="维度评分(JSON)"
              value={formData.dimension_scores}
              onChange={(e) =>
                setFormData({ ...formData, dimension_scores: e.target.value })
              }
              placeholder='{"quality": 80, "delivery": 70, "service": 90}'
              multiline
              rows={3}
            />
            <TextField
              fullWidth
              label="评估人"
              value={formData.evaluator}
              onChange={(e) =>
                setFormData({ ...formData, evaluator: e.target.value })
              }
              placeholder="请输入评估人"
            />
            <TextField
              fullWidth
              label="备注"
              value={formData.comment}
              onChange={(e) =>
                setFormData({ ...formData, comment: e.target.value })
              }
              placeholder="请输入备注"
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
    </Box>
  );
};

export default SrmEvaluationPage;
