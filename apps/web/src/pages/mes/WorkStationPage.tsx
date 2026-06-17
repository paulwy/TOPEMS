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
  WorkStation,
  CreateWorkStationRequest,
  UpdateWorkStationRequest,
} from "@/api/professional/mes/mes";
import { mesApi } from "@/api/professional/mes/mes";
import { useAppStore } from "@/store";
import { LoadingSpinner } from "@/components/LoadingSpinner";
import { EmptyState } from "@/components/EmptyState";
import { Plus, Edit } from "lucide-react";

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
      console.error("加载工作站列表失败:", error);
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
      console.error("操作失败:", error);
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

  if (loading) return <LoadingSpinner />;

  return (
    <Box sx={{ display: "flex", flexDirection: "column", gap: 3 }}>
      <Card>
        <CardHeader>
          <Typography variant="h6" sx={{ fontWeight: 600 }}>
            工作站管理
          </Typography>
          <Typography variant="body2" sx={{ color: "grey.500" }}>
            管理生产工作站,包括工作站名称、编码、位置、容量等
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
              新增工作站
            </Button>
          </Box>

          <Table>
            <TableHead>
              <TableRow>
                <TableCell>工作站名称</TableCell>
                <TableCell>编码</TableCell>
                <TableCell>位置</TableCell>
                <TableCell>容量</TableCell>
                <TableCell>负责人</TableCell>
                <TableCell>状态</TableCell>
                <TableCell sx={{ textAlign: "right" }}>操作</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {workstations.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} sx={{ textAlign: "center" }}>
                    <EmptyState
                      title="暂无工作站数据"
                      description="点击上方按钮添加第一个工作站"
                    />
                  </TableCell>
                </TableRow>
              ) : (
                workstations.map((station) => (
                  <TableRow key={station.id}>
                    <TableCell sx={{ fontWeight: 500 }}>
                      {station.name}
                    </TableCell>
                    <TableCell>{station.code || "-"}</TableCell>
                    <TableCell>{station.location || "-"}</TableCell>
                    <TableCell>{station.capacity || "-"}</TableCell>
                    <TableCell>{station.supervisor || "-"}</TableCell>
                    <TableCell>
                      <Chip
                        size="small"
                        label={station.status}
                        variant="outlined"
                      />
                    </TableCell>
                    <TableCell sx={{ textAlign: "right" }}>
                      <Button size="small" onClick={() => handleEdit(station)}>
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
    </Box>
  );
};

export default WorkStationPage;
