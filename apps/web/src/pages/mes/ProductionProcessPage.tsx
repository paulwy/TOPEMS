import { TextField, Dialog, DialogTitle, DialogContent, DialogActions, Box, Chip,  } from "@mui/material";
import { Button } from "@/components/ui/Button";
import React, { useState, useEffect } from "react";
import type {
  ProductionProcess,
  CreateProductionProcessRequest,
  UpdateProductionProcessRequest,
} from "@/api/professional/mes/mes";
import { mesApi } from "@/api/professional/mes/mes";
import { useAppStore } from "@/store";
import { LoadingSpinner } from "@/components/LoadingSpinner";
import { ListPageTemplate, type ColumnDef } from "@/components/templates";
import { Plus, Edit } from "lucide-react";
import { apiLogger } from "@/utils/logger";

const ProductionProcessPage: React.FC = () => {
  const [processes, setProcesses] = useState<ProductionProcess[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize] = useState(10);
  const [total, setTotal] = useState(0);
  const [showDialog, setShowDialog] = useState(false);
  const [selectedProcess, setSelectedProcess] =
    useState<ProductionProcess | null>(null);
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
      apiLogger.error("加载工序列表失败:", error);
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
      apiLogger.error("操作失败:", error);
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

  const columns: ColumnDef<ProductionProcess>[] = [
    {
      id: "name",
      label: "工序名称",
      render: (row) => <Box sx={{ fontWeight: 500 }}>{row.name}</Box>,
    },
    { id: "code", label: "工序编码", render: (row) => row.code || "-" },
    { id: "sequence", label: "顺序" },
    {
      id: "standard_time",
      label: "标准工时(小时)",
      render: (row) => (row.standard_time ? `${row.standard_time}` : "-"),
    },
    {
      id: "work_station_id",
      label: "工作站",
      render: (row) => row.work_station_id || "-",
    },
    {
      id: "status",
      label: "状态",
      render: (row) => (
        <Chip size="small" label={row.status || "active"} variant="outlined" />
      ),
    },
  ];

  const rowActions = [
    {
      label: "编辑",
      icon: <Edit style={{ width: 16, height: 16 }} />,
      onClick: handleEdit,
    },
  ];

  if (loading) return <LoadingSpinner />;

  return (
    <>
      <ListPageTemplate
        title="生产工序管理"
        subtitle="管理生产工序,包括工序名称、编码、顺序、标准工时等"
        columns={columns}
        data={processes}
        loading={loading}
        pagination={{
          page: currentPage - 1,
          pageSize,
          total,
          onPageChange: (page) => setCurrentPage(page + 1),
        }}
        actions={[
          {
            label: "新增工序",
            icon: <Plus style={{ width: 16, height: 16 }} />,
            onClick: () => {
              resetForm();
              setShowDialog(true);
            },
          },
        ]}
        rowActions={rowActions}
        emptyMessage="暂无工序数据"
      />

      <Dialog
        open={showDialog}
        onClose={() => setShowDialog(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>{selectedProcess ? "编辑工序" : "新增工序"}</DialogTitle>
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
    </>
  );
};

export default ProductionProcessPage;
