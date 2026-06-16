import {
  Button,
  Card,
  CardContent,
  CardHeader,
  Chip,
  Typography,
  TextField,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
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
  ProductionProcess,
  CreateProductionProcessRequest,
  UpdateProductionProcessRequest,
} from "@/api/mes";
import { mesApi } from "@/api/mes";
import { useAppStore } from "@/store";
import { LoadingSpinner } from "@/components/LoadingSpinner";
import { EmptyState } from "@/components/EmptyState";
import { Plus, Edit } from "lucide-react";

const ProductionProcessPage: React.FC = () => {
  const [processes, setProcesses] = useState<ProductionProcess[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize] = useState(10);
  const [total, setTotal] = useState(0);
  const [showDialog, setShowDialog] = useState(false);
  const [selectedProcess, setSelectedProcess] = useState<ProductionProcess | null>(
    null,
  );
  const [formData, setFormData] = useState<CreateProductionProcessRequest>({
    name: "",
    code: "",
    description: "",
    sequence: 0,
    standard_time: 0,
    work_station_id: "",
  });

  const { addNotification } = useAppStore();

  useEffect(() => {
    loadProcesses();
  }, [currentPage]);

  const loadProcesses = async () => {
    try {
      setLoading(true);
      const response = await mesApi.processes.list({
        page: currentPage,
        page_size: pageSize,
      });
      if (response.success && response.data) {
        setProcesses(response.data.processes || []);
        setTotal(response.data.total || 0);
      }
    } catch (error) {
      console.error("加载工序列表失败:", error);
      addNotification({
        type: "error",
        title: "加载失败",
        message: "无法加载工序列表",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (selectedProcess) {
        await mesApi.processes.update(
          selectedProcess.id,
          formData as UpdateProductionProcessRequest,
        );
        addNotification({
          type: "success",
          title: "更新成功",
          message: "工序信息已更新",
        });
      } else {
        await mesApi.processes.create(formData);
        addNotification({
          type: "success",
          title: "创建成功",
          message: "新工序已创建",
        });
      }
      setShowDialog(false);
      resetForm();
      loadProcesses();
    } catch (error) {
      console.error("操作失败:", error);
      addNotification({
        type: "error",
        title: "操作失败",
        message: selectedProcess ? "更新工序失败" : "创建工序失败",
      });
    }
  };

  const handleEdit = (process: ProductionProcess) => {
    setSelectedProcess(process);
    setFormData({
      name: process.name,
      code: process.code || "",
      description: process.description || "",
      sequence: process.sequence,
      standard_time: process.standard_time || 0,
      work_station_id: process.work_station_id || "",
    });
    setShowDialog(true);
  };

  const resetForm = () => {
    setSelectedProcess(null);
    setFormData({
      name: "",
      code: "",
      description: "",
      sequence: 0,
      standard_time: 0,
      work_station_id: "",
    });
  };

  if (loading) return <LoadingSpinner />;

  return (
    <Box sx={{ display: "flex", flexDirection: "column", gap: 3 }}>
      <Card>
        <CardHeader>
          <Typography variant="h6" sx={{ fontWeight: 600 }}>
            生产工序管理
          </Typography>
          <Typography variant="body2" sx={{ color: "grey.500" }}>
            管理生产工序,包括工序名称、编码、顺序、标准工时等
          </Typography>
        </CardHeader>
        <CardContent>
          <Box sx={{ display: "flex", justifyContent: "flex-end", mb: 3 }}>
            <Button
              variant="contained"
              onClick={() => {
                resetForm();
                setShowDialog(true);
              }}
            >
              <Plus style={{ marginRight: 4, width: 16, height: 16 }} />
              新增工序
            </Button>
          </Box>

          <Table>
            <TableHead>
              <TableRow>
                <TableCell>工序名称</TableCell>
                <TableCell>工序编码</TableCell>
                <TableCell>顺序</TableCell>
                <TableCell>标准工时(小时)</TableCell>
                <TableCell>工作站</TableCell>
                <TableCell>状态</TableCell>
                <TableCell sx={{ textAlign: "right" }}>操作</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {processes.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} sx={{ textAlign: "center" }}>
                    <EmptyState
                      title="暂无工序数据"
                      description="点击上方按钮添加第一个工序"
                    />
                  </TableCell>
                </TableRow>
              ) : (
                processes.map((process) => (
                  <TableRow key={process.id}>
                    <TableCell sx={{ fontWeight: 500 }}>
                      {process.name}
                    </TableCell>
                    <TableCell>{process.code || "-"}</TableCell>
                    <TableCell>{process.sequence}</TableCell>
                    <TableCell>
                      {process.standard_time
                        ? `${process.standard_time}`
                        : "-"}
                    </TableCell>
                    <TableCell>{process.work_station_id || "-"}</TableCell>
                    <TableCell>
                      <Chip
                        size="small"
                        label={process.status || "active"}
                        variant="outlined"
                      />
                    </TableCell>
                    <TableCell sx={{ textAlign: "right" }}>
                      <Button
                        size="small"
                        onClick={() => handleEdit(process)}
                      >
                        <Edit style={{ width: 16, height: 16 }} />
                      </Button>
                    </TableCell>
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
        <DialogTitle>
          {selectedProcess ? "编辑工序" : "新增工序"}
        </DialogTitle>
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
                label="工序名称 *"
                value={formData.name}
                onChange={(e) =>
                  setFormData({ ...formData, name: e.target.value })
                }
                size="small"
                required
              />
              <TextField
                label="工序编码"
                value={formData.code}
                onChange={(e) =>
                  setFormData({ ...formData, code: e.target.value })
                }
                size="small"
              />
              <TextField
                label="顺序 *"
                type="number"
                value={formData.sequence}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    sequence: parseInt(e.target.value),
                  })
                }
                size="small"
                required
              />
              <TextField
                label="标准工时(小时)"
                type="number"
                value={formData.standard_time}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    standard_time: parseFloat(e.target.value),
                  })
                }
                size="small"
              />
              <TextField
                label="工作站ID"
                value={formData.work_station_id}
                onChange={(e) =>
                  setFormData({ ...formData, work_station_id: e.target.value })
                }
                size="small"
              />
            </Box>
            <TextField
              label="描述"
              multiline
              rows={2}
              value={formData.description}
              onChange={(e) =>
                setFormData({ ...formData, description: e.target.value })
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

export default ProductionProcessPage;
