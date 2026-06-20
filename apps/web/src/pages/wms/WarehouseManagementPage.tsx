import {
  Button,
  Card,
  CardContent,
  CardHeader,
  Chip,
  Typography,
  Box,
} from "@mui/material";
import React, { useState, useEffect } from "react";
import {
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
  Checkbox,
  TextField,
} from "@mui/material";
import type {
  Warehouse,
  CreateWarehouseRequest,
  UpdateWarehouseRequest,
} from "@/api/shared/wms";
import { wmsApi } from "@/api/shared/wms";
import { useAppStore } from "@/store";
import { LoadingSpinner } from "@/components/LoadingSpinner";
import { EmptyState } from "@/components/EmptyState";
import { Search, Plus, Edit, Trash2, Eye } from "lucide-react";
import { apiLogger } from "@/utils/logger";

const WarehouseManagementPage: React.FC = () => {
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize] = useState(10);
  const [total, setTotal] = useState(0);
  const [showDialog, setShowDialog] = useState(false);
  const [showDetailDialog, setShowDetailDialog] = useState(false);
  const [selectedWarehouse, setSelectedWarehouse] = useState<Warehouse | null>(
    null,
  );
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [formData, setFormData] = useState<CreateWarehouseRequest>({
    name: "",
    code: "",
    address: "",
    manager: "",
    phone: "",
  });

  const { addNotification } = useAppStore();

  useEffect(() => {
    loadWarehouses();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentPage, pageSize, searchTerm, statusFilter]);

  const loadWarehouses = async () => {
    try {
      setLoading(true);
      const params: any = {
        page: currentPage,
        page_size: pageSize,
      };
      if (searchTerm) params.search = searchTerm;
      if (statusFilter !== "all") params.status = statusFilter;

      const response = await wmsApi.warehouses.list(params);
      if (response.success && response.data) {
        setWarehouses(response.data.items || []);
        setTotal(response.data.total || 0);
      }
    } catch (error) {
      apiLogger.error("加载仓库列表失败:", error);
      addNotification({
        type: "error",
        title: "加载失败",
        message: "无法加载仓库列表",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (selectedWarehouse) {
        await wmsApi.warehouses.update(
          selectedWarehouse.id,
          formData as UpdateWarehouseRequest,
        );
        addNotification({
          type: "success",
          title: "更新成功",
          message: "仓库信息已更新",
        });
      } else {
        await wmsApi.warehouses.create(formData);
        addNotification({
          type: "success",
          title: "创建成功",
          message: "新仓库已创建",
        });
      }
      setShowDialog(false);
      resetForm();
      loadWarehouses();
    } catch (error) {
      apiLogger.error("操作失败:", error);
      addNotification({
        type: "error",
        title: "操作失败",
        message: selectedWarehouse ? "更新仓库失败" : "创建仓库失败",
      });
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm("确定要删除这个仓库吗?")) return;
    try {
      await wmsApi.warehouses.delete(id);
      addNotification({
        type: "success",
        title: "删除成功",
        message: "仓库已删除",
      });
      loadWarehouses();
    } catch (error) {
      apiLogger.error("删除失败:", error);
      addNotification({
        type: "error",
        title: "删除失败",
        message: "无法删除仓库",
      });
    }
  };

  const handleEdit = (warehouse: Warehouse) => {
    setSelectedWarehouse(warehouse);
    setFormData({
      name: warehouse.name,
      code: warehouse.code || "",
      address: warehouse.address || "",
      manager: warehouse.manager || "",
      phone: warehouse.phone || "",
    });
    setShowDialog(true);
  };

  const handleViewDetail = (warehouse: Warehouse) => {
    setSelectedWarehouse(warehouse);
    setShowDetailDialog(true);
  };

  const resetForm = () => {
    setSelectedWarehouse(null);
    setFormData({
      name: "",
      code: "",
      address: "",
      manager: "",
      phone: "",
    });
  };

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id],
    );
  };

  const toggleSelectAll = () => {
    if (selectedIds.length === warehouses.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(warehouses.map((w) => w.id));
    }
  };

  const getStatusBadge = (status: string) => {
    const statusMap: Record<string, "success" | "info" | "warning" | "error"> =
      {
        active: "success",
        inactive: "info",
        maintenance: "warning",
      };
    const labels: Record<string, string> = {
      active: "活跃",
      inactive: "非活跃",
      maintenance: "维护中",
    };
    return (
      <Chip
        size="small"
        color={statusMap[status] || "default"}
        label={labels[status] || status}
        variant="outlined"
      />
    );
  };

  if (loading) return <LoadingSpinner />;

  return (
    <Box sx={{ display: "flex", flexDirection: "column", gap: 3 }}>
      <Card>
        <CardHeader>
          <Typography variant="h6" sx={{ fontWeight: 600 }}>
            仓库管理
          </Typography>
          <Typography variant="body2" sx={{ color: "grey.500" }}>
            管理仓库信息,包括仓库名称、编码、地址、负责人等
          </Typography>
        </CardHeader>
        <CardContent>
          <Box
            sx={{
              display: "flex",
              flexDirection: { xs: "column", sm: "row" },
              gap: 2,
              mb: 3,
            }}
          >
            <Box sx={{ flex: 1 }}>
              <TextField
                placeholder="搜索仓库名称或编码..."
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                  setCurrentPage(1);
                }}
                fullWidth
                size="small"
                slotProps={{
                  input: {
                    startAdornment: (
                      <Search
                        sx={{
                          mr: 1,
                          width: 16,
                          height: 16,
                          color: "text.secondary",
                        }}
                      />
                    ),
                  },
                }}
              />
            </Box>
            <FormControl size="small" sx={{ minWidth: 150 }}>
              <InputLabel>状态筛选</InputLabel>
              <Select
                value={statusFilter}
                label="状态筛选"
                onChange={(e) => {
                  setStatusFilter(e.target.value);
                  setCurrentPage(1);
                }}
              >
                <MenuItem value="all">全部状态</MenuItem>
                <MenuItem value="active">活跃</MenuItem>
                <MenuItem value="inactive">非活跃</MenuItem>
                <MenuItem value="maintenance">维护中</MenuItem>
              </Select>
            </FormControl>
            <Button
              variant="contained"
              onClick={() => {
                resetForm();
                setShowDialog(true);
              }}
            >
              <Plus sx={{ mr: 1, width: 16, height: 16 }} />
              新增仓库
            </Button>
          </Box>

          {selectedIds.length > 0 && (
            <Box
              sx={{
                mb: 2,
                p: 1.5,
                bgcolor: "grey.100",
                borderRadius: 1,
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
              }}
            >
              <Typography variant="body2">
                已选择 {selectedIds.length} 个仓库
              </Typography>
              <Button
                variant="outlined"
                size="small"
                onClick={() => setSelectedIds([])}
              >
                清除选择
              </Button>
            </Box>
          )}

          <Table>
            <TableHead>
              <TableRow>
                <TableCell padding="checkbox">
                  <Checkbox
                    checked={
                      selectedIds.length === warehouses.length &&
                      warehouses.length > 0
                    }
                    onChange={toggleSelectAll}
                  />
                </TableCell>
                <TableHead>仓库名称</TableHead>
                <TableHead>仓库编码</TableHead>
                <TableHead>地址</TableHead>
                <TableHead>负责人</TableHead>
                <TableHead>联系电话</TableHead>
                <TableHead>状态</TableHead>
                <TableCell align="right">操作</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {warehouses.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} align="center">
                    <EmptyState
                      title="暂无仓库数据"
                      description="点击上方按钮添加第一个仓库"
                    />
                  </TableCell>
                </TableRow>
              ) : (
                warehouses.map((warehouse) => (
                  <TableRow key={warehouse.id}>
                    <TableCell padding="checkbox">
                      <Checkbox
                        checked={selectedIds.includes(warehouse.id)}
                        onChange={() => toggleSelect(warehouse.id)}
                      />
                    </TableCell>
                    <TableCell sx={{ fontWeight: 500 }}>
                      {warehouse.name}
                    </TableCell>
                    <TableCell>{warehouse.code || "-"}</TableCell>
                    <TableCell>{warehouse.address || "-"}</TableCell>
                    <TableCell>{warehouse.manager || "-"}</TableCell>
                    <TableCell>{warehouse.phone || "-"}</TableCell>
                    <TableCell>{getStatusBadge(warehouse.status)}</TableCell>
                    <TableCell align="right">
                      <Button
                        variant="text"
                        size="small"
                        onClick={() => handleViewDetail(warehouse)}
                      >
                        <Eye sx={{ width: 16, height: 16 }} />
                      </Button>
                      <Button
                        variant="text"
                        size="small"
                        onClick={() => handleEdit(warehouse)}
                      >
                        <Edit sx={{ width: 16, height: 16 }} />
                      </Button>
                      <Button
                        variant="text"
                        size="small"
                        color="error"
                        onClick={() => handleDelete(warehouse.id)}
                      >
                        <Trash2 sx={{ width: 16, height: 16 }} />
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
            <Typography variant="body2" sx={{ color: "grey.500" }}>
              共 {total} 条记录,第 {currentPage} /{" "}
              {Math.ceil(total / pageSize) || 1} 页
            </Typography>
            <Box sx={{ display: "flex", gap: 1 }}>
              <Button
                size="small"
                disabled={currentPage === 1}
                onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
              >
                上一页
              </Button>
              {Array.from(
                { length: Math.min(5, Math.ceil(total / pageSize)) },
                (_, i) => {
                  const page = i + 1;
                  return (
                    <Button
                      key={page}
                      size="small"
                      variant={currentPage === page ? "contained" : "outlined"}
                      onClick={() => setCurrentPage(page)}
                    >
                      {page}
                    </Button>
                  );
                },
              )}
              <Button
                size="small"
                disabled={currentPage >= Math.ceil(total / pageSize)}
                onClick={() =>
                  setCurrentPage(
                    Math.min(Math.ceil(total / pageSize), currentPage + 1),
                  )
                }
              >
                下一页
              </Button>
            </Box>
          </Box>
        </CardContent>
      </Card>

      {/* 新增/编辑对话框 */}
      <Dialog
        open={showDialog}
        onClose={() => setShowDialog(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>{selectedWarehouse ? "编辑仓库" : "新增仓库"}</DialogTitle>
        <DialogContent>
          <form onSubmit={handleSubmit}>
            <Box
              sx={{
                display: "grid",
                gridTemplateColumns: {
                  xs: "repeat(1, 1fr)",
                  md: "repeat(2, 1fr)",
                },
                gap: 2,
                py: 2,
              }}
            >
              <TextField
                label="仓库名称 *"
                value={formData.name}
                onChange={(e) =>
                  setFormData({ ...formData, name: e.target.value })
                }
                fullWidth
                required
              />
              <TextField
                label="仓库编码"
                value={formData.code}
                onChange={(e) =>
                  setFormData({ ...formData, code: e.target.value })
                }
                fullWidth
              />
              <TextField
                label="地址"
                value={formData.address}
                onChange={(e) =>
                  setFormData({ ...formData, address: e.target.value })
                }
                fullWidth
              />
              <TextField
                label="负责人"
                value={formData.manager}
                onChange={(e) =>
                  setFormData({ ...formData, manager: e.target.value })
                }
                fullWidth
              />
              <TextField
                label="联系电话"
                value={formData.phone}
                onChange={(e) =>
                  setFormData({ ...formData, phone: e.target.value })
                }
                fullWidth
              />
            </Box>
            <DialogActions>
              <Button variant="outlined" onClick={() => setShowDialog(false)}>
                取消
              </Button>
              <Button variant="contained" type="submit">
                保存
              </Button>
            </DialogActions>
          </form>
        </DialogContent>
      </Dialog>

      {/* 详情对话框 */}
      <Dialog
        open={showDetailDialog}
        onClose={() => setShowDetailDialog(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>仓库详情</DialogTitle>
        <DialogContent>
          {selectedWarehouse && (
            <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
              <Box
                sx={{
                  display: "grid",
                  gridTemplateColumns: {
                    xs: "repeat(1, 1fr)",
                    md: "repeat(2, 1fr)",
                  },
                  gap: 2,
                }}
              >
                <Box>
                  <Typography variant="caption" color="text.secondary">
                    仓库名称
                  </Typography>
                  <Typography sx={{ fontWeight: 500 }}>
                    {selectedWarehouse.name}
                  </Typography>
                </Box>
                <Box>
                  <Typography variant="caption" color="text.secondary">
                    仓库编码
                  </Typography>
                  <Typography>{selectedWarehouse.code || "-"}</Typography>
                </Box>
                <Box sx={{ gridColumn: { xs: 1, md: 2 } }}>
                  <Typography variant="caption" color="text.secondary">
                    地址
                  </Typography>
                  <Typography>{selectedWarehouse.address || "-"}</Typography>
                </Box>
                <Box>
                  <Typography variant="caption" color="text.secondary">
                    负责人
                  </Typography>
                  <Typography>{selectedWarehouse.manager || "-"}</Typography>
                </Box>
                <Box>
                  <Typography variant="caption" color="text.secondary">
                    联系电话
                  </Typography>
                  <Typography>{selectedWarehouse.phone || "-"}</Typography>
                </Box>
                <Box>
                  <Typography variant="caption" color="text.secondary">
                    状态
                  </Typography>
                  <Box>{getStatusBadge(selectedWarehouse.status)}</Box>
                </Box>
                <Box>
                  <Typography variant="caption" color="text.secondary">
                    创建时间
                  </Typography>
                  <Typography>
                    {new Date(selectedWarehouse.created_at).toLocaleString(
                      "zh-CN",
                    )}
                  </Typography>
                </Box>
                <Box>
                  <Typography variant="caption" color="text.secondary">
                    更新时间
                  </Typography>
                  <Typography>
                    {new Date(selectedWarehouse.updated_at).toLocaleString(
                      "zh-CN",
                    )}
                  </Typography>
                </Box>
              </Box>
            </Box>
          )}
        </DialogContent>
      </Dialog>
    </Box>
  );
};

export default WarehouseManagementPage;
