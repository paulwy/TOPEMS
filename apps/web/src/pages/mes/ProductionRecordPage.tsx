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
  ProductionRecord,
  CreateProductionRecordRequest,
  UpdateProductionRecordRequest,
} from "@/api/professional/mes/mes";
import { mesApi } from "@/api/professional/mes/mes";
import { useAppStore } from "@/store";
import { LoadingSpinner } from "@/components/LoadingSpinner";
import { EmptyState } from "@/components/EmptyState";
import { Plus } from "lucide-react";
import { apiLogger } from "@/utils/logger";

const ProductionRecordPage: React.FC = () => {
  const [records, setRecords] = useState<ProductionRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize] = useState(10);
  const [total, setTotal] = useState(0);
  const [showDialog, setShowDialog] = useState(false);
  const [formData, setFormData] = useState<CreateProductionRecordRequest>({
    order_id: "",
    process_id: "",
    work_station_id: "",
    operator: "",
    quantity_completed: 0,
    start_time: "",
  });

  const { addNotification } = useAppStore();

  useEffect(() => {
    loadRecords();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentPage]);

  const loadRecords = async () => {
    try {
      setLoading(true);
      const response = await mesApi.records.list({
        page: currentPage,
        page_size: pageSize,
      });
      if (response.success && response.data) {
        setRecords(response.data.records || []);
        setTotal(response.data.total || 0);
      }
    } catch (error) {
      apiLogger.error("加载生产记录失败:", error);
      addNotification({
        type: "error",
        title: "加载失败",
        message: "无法加载生产记录",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await mesApi.records.create(formData);
      addNotification({
        type: "success",
        title: "创建成功",
        message: "新生产记录已创建",
      });
      setShowDialog(false);
      setFormData({
        order_id: "",
        process_id: "",
        work_station_id: "",
        operator: "",
        quantity_completed: 0,
        start_time: "",
      });
      loadRecords();
    } catch (error) {
      apiLogger.error("操作失败:", error);
      addNotification({
        type: "error",
        title: "操作失败",
        message: "创建生产记录失败",
      });
    }
  };

  if (loading) return <LoadingSpinner />;

  return (
    <Box sx={{ display: "flex", flexDirection: "column", gap: 3 }}>
      <Card>
        <CardHeader>
          <Typography variant="h6" sx={{ fontWeight: 600 }}>
            生产记录管理
          </Typography>
          <Typography variant="body2" sx={{ color: "grey.500" }}>
            管理生产记录,包括订单ID、工序、操作员、完成数量等
          </Typography>
        </CardHeader>
        <CardContent>
          <Box sx={{ display: "flex", justifyContent: "flex-end", mb: 3 }}>
            <Button variant="contained" onClick={() => setShowDialog(true)}>
              <Plus style={{ marginRight: 4, width: 16, height: 16 }} />
              新增生产记录
            </Button>
          </Box>

          <Table>
            <TableHead>
              <TableRow>
                <TableCell>订单ID</TableCell>
                <TableCell>工序</TableCell>
                <TableCell>工作站</TableCell>
                <TableCell>操作员</TableCell>
                <TableCell>完成数量</TableCell>
                <TableCell>不良数量</TableCell>
                <TableCell>开始时间</TableCell>
                <TableCell>状态</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {records.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} sx={{ textAlign: "center" }}>
                    <EmptyState
                      title="暂无生产记录数据"
                      description="点击上方按钮添加第一个生产记录"
                    />
                  </TableCell>
                </TableRow>
              ) : (
                records.map((record) => (
                  <TableRow key={record.id}>
                    <TableCell>{record.order_id}</TableCell>
                    <TableCell>{record.process_id || "-"}</TableCell>
                    <TableCell>{record.work_station_id || "-"}</TableCell>
                    <TableCell>{record.operator}</TableCell>
                    <TableCell>{record.quantity_completed}</TableCell>
                    <TableCell>{record.quantity_rejected || 0}</TableCell>
                    <TableCell>
                      {new Date(record.start_time).toLocaleString("zh-CN")}
                    </TableCell>
                    <TableCell>
                      <Chip
                        size="small"
                        label={record.status}
                        variant="outlined"
                      />
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
        <DialogTitle>新增生产记录</DialogTitle>
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
                label="订单ID *"
                value={formData.order_id}
                onChange={(e) =>
                  setFormData({ ...formData, order_id: e.target.value })
                }
                size="small"
                required
              />
              <TextField
                label="工序ID"
                value={formData.process_id}
                onChange={(e) =>
                  setFormData({ ...formData, process_id: e.target.value })
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
              <TextField
                label="操作员 *"
                value={formData.operator}
                onChange={(e) =>
                  setFormData({ ...formData, operator: e.target.value })
                }
                size="small"
                required
              />
              <TextField
                label="完成数量 *"
                type="number"
                value={formData.quantity_completed}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    quantity_completed: parseInt(e.target.value),
                  })
                }
                size="small"
                required
              />
              <TextField
                label="开始时间 *"
                type="datetime-local"
                value={formData.start_time}
                onChange={(e) =>
                  setFormData({ ...formData, start_time: e.target.value })
                }
                size="small"
                required
                slotProps={{ inputLabel: { shrink: true } }}
              />
            </Box>
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

export default ProductionRecordPage;
