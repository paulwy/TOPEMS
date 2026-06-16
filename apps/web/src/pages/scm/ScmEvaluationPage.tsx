import {
  Button,
  Card,
  CardContent,
  CardHeader,
  Typography,
  TextField,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Box,
  TablePagination,
} from "@mui/material";
import React, { useState, useEffect } from "react";
import type {
  SupplierEvaluation,
  CreateSupplierEvaluationRequest,
} from "@/api/scm";
import { scmApi } from "@/api/scm";
import { useAppStore } from "@/store";
import { LoadingSpinner } from "@/components/LoadingSpinner";
import { EmptyState } from "@/components/EmptyState";
import { Plus } from "lucide-react";

const ScmEvaluationPage: React.FC = () => {
  const [evaluations, setEvaluations] = useState<SupplierEvaluation[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize] = useState(10);
  const [total, setTotal] = useState(0);
  const [showDialog, setShowDialog] = useState(false);
  const [formData, setFormData] = useState<CreateSupplierEvaluationRequest>({
    supplier_id: "",
    evaluation_date: "",
    quality_score: 0,
    delivery_score: 0,
    service_score: 0,
    price_score: 0,
    overall_score: 0,
    comments: "",
    evaluator: "",
  });

  const { addNotification } = useAppStore();

  useEffect(() => {
    loadEvaluations();
  }, [currentPage]);

  const loadEvaluations = async () => {
    try {
      setLoading(true);
      const response = await scmApi.evaluations.list({
        page: currentPage,
        pageSize: pageSize,
      });
      if (response.success && response.data) {
        setEvaluations(response.data.items || []);
        setTotal(response.data.total || 0);
      }
    } catch (error) {
      console.error("加载评估列表失败:", error);
      addNotification({
        type: "error",
        title: "加载失败",
        message: "无法加载供应商评估",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await scmApi.evaluations.create(formData);
      addNotification({
        type: "success",
        title: "创建成功",
        message: "新评估记录已创建",
      });
      setShowDialog(false);
      setFormData({
        supplier_id: "",
        evaluation_date: "",
        quality_score: 0,
        delivery_score: 0,
        service_score: 0,
        price_score: 0,
        overall_score: 0,
        comments: "",
        evaluator: "",
      });
      loadEvaluations();
    } catch (error) {
      console.error("操作失败:", error);
      addNotification({
        type: "error",
        title: "操作失败",
        message: "创建评估记录失败",
      });
    }
  };

  if (loading) return <LoadingSpinner />;

  return (
    <Box sx={{ display: "flex", flexDirection: "column", gap: 3 }}>
      <Card>
        <CardHeader>
          <Typography variant="h6" sx={{ fontWeight: 600 }}>
            供应商评估管理
          </Typography>
          <Typography variant="body2" sx={{ color: "grey.500" }}>
            供应商评估记录,包括质量、交期、服务、价格评分
          </Typography>
        </CardHeader>
        <CardContent>
          <Box sx={{ display: "flex", justifyContent: "flex-end", mb: 3 }}>
            <Button variant="contained" onClick={() => setShowDialog(true)}>
              <Plus style={{ marginRight: 4, width: 16, height: 16 }} />
              新增评估
            </Button>
          </Box>

          <Table>
            <TableHead>
              <TableRow>
                <TableCell>供应商ID</TableCell>
                <TableCell>评估日期</TableCell>
                <TableCell>质量</TableCell>
                <TableCell>交期</TableCell>
                <TableCell>服务</TableCell>
                <TableCell>价格</TableCell>
                <TableCell>综合</TableCell>
                <TableCell>评估人</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {evaluations.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} sx={{ textAlign: "center" }}>
                    <EmptyState
                      title="暂无评估数据"
                      description="点击上方按钮添加第一个评估记录"
                    />
                  </TableCell>
                </TableRow>
              ) : (
                evaluations.map((ev) => (
                  <TableRow key={ev.id}>
                    <TableCell>{ev.supplier_id}</TableCell>
                    <TableCell>
                      {new Date(ev.evaluation_date).toLocaleDateString("zh-CN")}
                    </TableCell>
                    <TableCell>{ev.quality_score || "-"}</TableCell>
                    <TableCell>{ev.delivery_score || "-"}</TableCell>
                    <TableCell>{ev.service_score || "-"}</TableCell>
                    <TableCell>{ev.price_score || "-"}</TableCell>
                    <TableCell sx={{ fontWeight: 500 }}>
                      {ev.overall_score || "-"}
                    </TableCell>
                    <TableCell>{ev.evaluator || "-"}</TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>

          <Box
            sx={{
              mt: 2,
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
            }}
          >
            <Typography variant="body2" sx={{ color: "text.secondary" }}>
              共 {total} 条记录,第 {currentPage} /{" "}
              {Math.ceil(total / pageSize) || 1} 页
            </Typography>
            <TablePagination
              component="div"
              count={total}
              page={currentPage - 1}
              rowsPerPage={pageSize}
              onPageChange={(_, newPage) => setCurrentPage(newPage + 1)}
              rowsPerPageOptions={[]}
            />
          </Box>
        </CardContent>
      </Card>

      <Dialog
        open={showDialog}
        onClose={() => setShowDialog(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>新增供应商评估</DialogTitle>
        <DialogContent>
          <form onSubmit={handleSubmit}>
            <Box
              sx={{
                display: "grid",
                gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr" },
                gap: 2,
                py: 2,
              }}
            >
              <TextField
                label="供应商ID *"
                value={formData.supplier_id}
                onChange={(e) =>
                  setFormData({ ...formData, supplier_id: e.target.value })
                }
                size="small"
                required
              />
              <TextField
                label="评估日期 *"
                type="date"
                value={formData.evaluation_date}
                onChange={(e) =>
                  setFormData({ ...formData, evaluation_date: e.target.value })
                }
                size="small"
                required
                slotProps={{ inputLabel: { shrink: true } }}
              />
              <TextField
                label="质量评分"
                type="number"
                value={formData.quality_score}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    quality_score: parseFloat(e.target.value),
                  })
                }
                size="small"
              />
              <TextField
                label="交期评分"
                type="number"
                value={formData.delivery_score}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    delivery_score: parseFloat(e.target.value),
                  })
                }
                size="small"
              />
              <TextField
                label="服务评分"
                type="number"
                value={formData.service_score}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    service_score: parseFloat(e.target.value),
                  })
                }
                size="small"
              />
              <TextField
                label="价格评分"
                type="number"
                value={formData.price_score}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    price_score: parseFloat(e.target.value),
                  })
                }
                size="small"
              />
              <TextField
                label="综合评分"
                type="number"
                value={formData.overall_score}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    overall_score: parseFloat(e.target.value),
                  })
                }
                size="small"
              />
              <TextField
                label="评估人"
                value={formData.evaluator}
                onChange={(e) =>
                  setFormData({ ...formData, evaluator: e.target.value })
                }
                size="small"
              />
            </Box>
            <TextField
              label="评论"
              multiline
              rows={2}
              value={formData.comments}
              onChange={(e) =>
                setFormData({ ...formData, comments: e.target.value })
              }
              fullWidth
              size="small"
              sx={{ mt: 2 }}
            />
            <DialogActions sx={{ mt: 2 }}>
              <Button variant="outlined" onClick={() => setShowDialog(false)}>
                取消
              </Button>
              <Button type="submit" variant="contained">
                保存
              </Button>
            </DialogActions>
          </form>
        </DialogContent>
      </Dialog>
    </Box>
  );
};

export default ScmEvaluationPage;
