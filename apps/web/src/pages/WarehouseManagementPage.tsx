import { Button, Card, CardContent, CardHeader, Chip, Typography } from "@mui/material";
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
} from "@/api/wms";
import { wmsApi } from "@/api/wms";
import { useAppStore } from "@/store";
import { LoadingSpinner } from "@/components/LoadingSpinner";
import { EmptyState } from "@/components/EmptyState";
import { Search, Plus, Edit, Trash2, Eye } from "lucide-react";

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
      console.error("加载仓库列表失败:", error);
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
      console.error("操作失败:", error);
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
      console.error("删除失败:", error);
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
    const statusMap: Record<string, "success" | "info" | "warning" | "error"> = {
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
    <div className="space-y-6">
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
          <div className="flex flex-col sm:flex-row gap-4 mb-6">
            <div className="flex-1">
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
                      <Search className="mr-2 h-4 w-4 text-muted-foreground" />
                    ),
                  },
                }}
              />
            </div>
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
              <Plus className="mr-2 h-4 w-4" />
              新增仓库
            </Button>
          </div>

          {selectedIds.length > 0 && (
            <div className="mb-4 p-3 bg-grey-100 rounded-lg flex items-center justify-between">
              <span className="text-sm">
                已选择 {selectedIds.length} 个仓库
              </span>
              <Button
                variant="outlined"
                size="small"
                onClick={() => setSelectedIds([])}
              >
                清除选择
              </Button>
            </div>
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
                        <Eye className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="text"
                        size="small"
                        onClick={() => handleEdit(warehouse)}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="text"
                        size="small"
                        color="error"
                        onClick={() => handleDelete(warehouse.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>

          <div className="mt-4 flex items-center justify-between">
            <div className="text-sm text-gray-500">
              共 {total} 条记录,第 {currentPage} /{" "}
              {Math.ceil(total / pageSize) || 1} 页
            </div>
            <div className="flex gap-2">
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
                disabled={
                  currentPage >= Math.ceil(total / pageSize)
                }
                onClick={() =>
                  setCurrentPage(
                    Math.min(Math.ceil(total / pageSize), currentPage + 1),
                  )
                }
              >
                下一页
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 新增/编辑对话框 */}
      <Dialog
        open={showDialog}
        onClose={() => setShowDialog(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          {selectedWarehouse ? "编辑仓库" : "新增仓库"}
        </DialogTitle>
        <DialogContent>
          <form onSubmit={handleSubmit}>
            <div className="grid grid-cols-2 gap-4 py-4">
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
            </div>
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
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Typography variant="caption" color="text.secondary">
                    仓库名称
                  </Typography>
                  <Typography sx={{ fontWeight: 500 }}>
                    {selectedWarehouse.name}
                  </Typography>
                </div>
                <div>
                  <Typography variant="caption" color="text.secondary">
                    仓库编码
                  </Typography>
                  <Typography>{selectedWarehouse.code || "-"}</Typography>
                </div>
                <div className="col-span-2">
                  <Typography variant="caption" color="text.secondary">
                    地址
                  </Typography>
                  <Typography>{selectedWarehouse.address || "-"}</Typography>
                </div>
                <div>
                  <Typography variant="caption" color="text.secondary">
                    负责人
                  </Typography>
                  <Typography>{selectedWarehouse.manager || "-"}</Typography>
                </div>
                <div>
                  <Typography variant="caption" color="text.secondary">
                    联系电话
                  </Typography>
                  <Typography>{selectedWarehouse.phone || "-"}</Typography>
                </div>
                <div>
                  <Typography variant="caption" color="text.secondary">
                    状态
                  </Typography>
                  <div>{getStatusBadge(selectedWarehouse.status)}</div>
                </div>
                <div>
                  <Typography variant="caption" color="text.secondary">
                    创建时间
                  </Typography>
                  <Typography>
                    {new Date(selectedWarehouse.created_at).toLocaleString(
                      "zh-CN",
                    )}
                  </Typography>
                </div>
                <div>
                  <Typography variant="caption" color="text.secondary">
                    更新时间
                  </Typography>
                  <Typography>
                    {new Date(selectedWarehouse.updated_at).toLocaleString(
                      "zh-CN",
                    )}
                  </Typography>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default WarehouseManagementPage;
