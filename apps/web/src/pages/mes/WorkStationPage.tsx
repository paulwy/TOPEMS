import { Chip, Dialog, DialogTitle, DialogContent, DialogActions, TextField, Box,  } from "@mui/material";
import { Button } from "@/components/ui/Button";
import React, { useState, useEffect, useMemo } from "react";
import type {
  WorkStation,
  CreateWorkStationRequest,
  UpdateWorkStationRequest,
} from "@/api/professional/mes/mes";
import { mesApi } from "@/api/professional/mes/mes";
import { useAppStore } from "@/store";
import { LoadingSpinner } from "@/components/LoadingSpinner";
import {
  ListPageTemplate,
  type ColumnDef,
  type RowAction,
} from "@/components/templates";
import { Plus, Edit } from "lucide-react";
import { apiLogger } from "@/utils/logger";

const WorkStationPage: React.FC = () => {
  const [workstations, setWorkstations] = useState<WorkStation[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize] = useState(10);
  const [total, setTotal] = useState(0);
  const [showDialog, setShowDialog] = useState(false);
  const [selectedWorkStation, setSelectedWorkStation] =
    useState<WorkStation | null>(null);
  const [formData, setFormData] = useState<CreateWorkStationRequest>({
    name: "",
    code: "",
    location: "",
    capacity: 0,
    supervisor: "",
  });

  const { addNotification } = useAppStore();

  useEffect(() => {
    loadWorkStations();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentPage]);

  const loadWorkStations = async () => {
    try {
      setLoading(true);
      const response = await mesApi.workstations.list({
        page: currentPage,
        page_size: pageSize,
      });
      if (response.success && response.data) {
        setWorkstations(response.data.workstations || []);
        setTotal(response.data.total || 0);
      }
    } catch (error) {
      apiLogger.error("加载工作站列表失败:", error);
      addNotification({
        type: "error",
        title: "加载失败",
        message: "无法加载工作站列表",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (selectedWorkStation) {
        await mesApi.workstations.update(
          selectedWorkStation.id,
          formData as UpdateWorkStationRequest,
        );
        addNotification({
          type: "success",
          title: "更新成功",
          message: "工作站信息已更新",
        });
      } else {
        await mesApi.workstations.create(formData);
        addNotification({
          type: "success",
          title: "创建成功",
          message: "新工作站已创建",
        });
      }
      setShowDialog(false);
      resetForm();
      loadWorkStations();
    } catch (error) {
      apiLogger.error("操作失败:", error);
      addNotification({
        type: "error",
        title: "操作失败",
        message: selectedWorkStation ? "更新工作站失败" : "创建工作站失败",
      });
    }
  };

  const handleEdit = (station: WorkStation) => {
    setSelectedWorkStation(station);
    setFormData({
      name: station.name,
      code: station.code || "",
      location: station.location || "",
      capacity: station.capacity || 0,
      supervisor: station.supervisor || "",
    });
    setShowDialog(true);
  };

  const resetForm = () => {
    setSelectedWorkStation(null);
    setFormData({
      name: "",
      code: "",
      location: "",
      capacity: 0,
      supervisor: "",
    });
  };

  const columns: ColumnDef<WorkStation>[] = useMemo(
    () => [
      { id: "name", label: "工作站名称", sortable: true },
      { id: "code", label: "编码", sortable: true },
      { id: "location", label: "位置" },
      { id: "capacity", label: "容量" },
      { id: "supervisor", label: "负责人" },
      {
        id: "status",
        label: "状态",
        render: (row) => (
          <Chip size="small" label={row.status} variant="outlined" />
        ),
      },
    ],
    [],
  );

  const rowActions: RowAction<WorkStation>[] = useMemo(
    () => [
      {
        label: "编辑",
        icon: <Edit size={16} />,
        onClick: handleEdit,
      },
    ],
    [],
  );

  const handleOpenCreate = () => {
    resetForm();
    setShowDialog(true);
  };

  if (loading) return <LoadingSpinner />;

  return (
    <>
      <ListPageTemplate
        title="工作站管理"
        subtitle="管理生产工作站,包括工作站名称、编码、位置、容量等"
        columns={columns}
        data={workstations}
        loading={loading}
        pagination={{
          page: currentPage,
          pageSize,
          total,
          onPageChange: setCurrentPage,
        }}
        actions={[
          {
            label: "新增工作站",
            icon: <Plus size={16} />,
            onClick: handleOpenCreate,
          },
        ]}
        rowActions={rowActions}
        emptyMessage="暂无工作站数据"
        getRowId={(row) => row.id}
      />

      <Dialog
        open={showDialog}
        onClose={() => setShowDialog(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          {selectedWorkStation ? "编辑工作站" : "新增工作站"}
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
                label="工作站名称 *"
                value={formData.name}
                onChange={(e) =>
                  setFormData({ ...formData, name: e.target.value })
                }
                size="small"
                required
              />
              <TextField
                label="编码 *"
                value={formData.code}
                onChange={(e) =>
                  setFormData({ ...formData, code: e.target.value })
                }
                size="small"
                required
              />
              <TextField
                label="位置"
                value={formData.location}
                onChange={(e) =>
                  setFormData({ ...formData, location: e.target.value })
                }
                size="small"
              />
              <TextField
                label="容量"
                type="number"
                value={formData.capacity}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    capacity: parseInt(e.target.value),
                  })
                }
                size="small"
              />
              <TextField
                label="负责人"
                value={formData.supervisor}
                onChange={(e) =>
                  setFormData({ ...formData, supervisor: e.target.value })
                }
                size="small"
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

export default WorkStationPage;
