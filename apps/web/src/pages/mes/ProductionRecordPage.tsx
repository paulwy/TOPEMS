import { TextField, Dialog, DialogTitle, DialogContent, DialogActions, Box, Chip,  } from "@mui/material";
import { Button } from "@/components/ui/Button";
import React, { useState, useEffect } from "react";
import type {
  ProductionRecord,
  CreateProductionRecordRequest,
} from "@/api/professional/mes/mes";
import { mesApi } from "@/api/professional/mes/mes";
import { useAppStore } from "@/store";
import { LoadingSpinner } from "@/components/LoadingSpinner";
import { ListPageTemplate, type ColumnDef } from "@/components/templates";
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

  const columns: ColumnDef<ProductionRecord>[] = [
    { id: "order_id", label: "订单ID" },
    { id: "process_id", label: "工序", render: (row) => row.process_id || "-" },
    {
      id: "work_station_id",
      label: "工作站",
      render: (row) => row.work_station_id || "-",
    },
    { id: "operator", label: "操作员" },
    { id: "quantity_completed", label: "完成数量" },
    {
      id: "quantity_rejected",
      label: "不良数量",
      render: (row) => row.quantity_rejected || 0,
    },
    {
      id: "start_time",
      label: "开始时间",
      render: (row) => new Date(row.start_time).toLocaleString("zh-CN"),
    },
    {
      id: "status",
      label: "状态",
      render: (row) => (
        <Chip size="small" label={row.status} variant="outlined" />
      ),
    },
  ];

  if (loading) return <LoadingSpinner />;

  return (
    <>
      <ListPageTemplate
        title="生产记录管理"
        subtitle="管理生产记录,包括订单ID、工序、操作员、完成数量等"
        columns={columns}
        data={records}
        loading={loading}
        pagination={{
          page: currentPage - 1,
          pageSize,
          total,
          onPageChange: (page) => setCurrentPage(page + 1),
        }}
        actions={[
          {
            label: "新增生产记录",
            icon: <Plus style={{ width: 16, height: 16 }} />,
            onClick: () => setShowDialog(true),
          },
        ]}
        emptyMessage="暂无生产记录数据"
      />

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
    </>
  );
};

export default ProductionRecordPage;
