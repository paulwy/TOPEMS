import React, { useState, useEffect } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Button,
  Card,
  CardContent,
  CardHeader,
  Dialog,
  DialogContent,
  DialogTitle,
  DialogActions,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Tabs,
  Tab,
  Tooltip,
  TextField,
  Badge,
  Box,
  Typography,
} from "@mui/material";
import {
  Plus,
  Search,
  Edit,
  Trash2,
  Play,
  CheckCircle2,
  FileText,
  RefreshCw,
  AlertTriangle,
  Package,
} from "lucide-react";
import {
  listStockTakes,
  createStockTake,
  deleteStockTake,
  getStockTake,
  startStockTake,
  countStockTake,
  completeStockTake,
  adjustStockTake,
  listStockTakeItems,
  StockTake,
  StockTakeItem,
  CreateStockTakeRequest,
  CountItemRequest,
} from "@/api/wms";
import { listWarehouses, Warehouse } from "@/api/wms";
import { toast } from "react-toastify";

const statusConfig = {
  planned: { label: "计划中", className: "bg-yellow-100 text-yellow-800" },
  in_progress: { label: "进行中", className: "bg-blue-100 text-blue-800" },
  completed: { label: "已完成", className: "bg-green-100 text-green-800" },
};

const discrepancyTypeConfig = {
  over: { label: "盘盈", className: "bg-green-100 text-green-800" },
  under: { label: "盘亏", className: "bg-red-100 text-red-800" },
  none: { label: "无差异", className: "bg-gray-100 text-gray-800" },
};

export default function StockTakePage() {
  const [stockTakes, setStockTakes] = useState<StockTake[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [warehouseFilter, setWarehouseFilter] = useState("");
  const [selectedStockTake, setSelectedStockTake] = useState<StockTake | null>(
    null,
  );
  const [stockTakeItems, setStockTakeItems] = useState<StockTakeItem[]>([]);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showDetailDialog, setShowDetailDialog] = useState(false);
  const [showCountDialog, setShowCountDialog] = useState(false);
  const [newStockTake, setNewStockTake] = useState<CreateStockTakeRequest>({
    stock_take_number: "",
    warehouse_id: "",
    remarks: "",
  });
  const [countValues, setCountValues] = useState<Record<string, number>>({});
  const [activeTab, setActiveTab] = useState("items");

  useEffect(() => {
    fetchStockTakes();
    fetchWarehouses();
  }, []);

  const fetchStockTakes = async () => {
    setLoading(true);
    try {
      const data = await listStockTakes({
        search: searchTerm,
        status: statusFilter,
        warehouse_id: warehouseFilter,
      });
      setStockTakes(data);
    } catch (error) {
      toast.error("获取盘点单失败");
    } finally {
      setLoading(false);
    }
  };

  const fetchWarehouses = async () => {
    try {
      const data = await listWarehouses();
      setWarehouses(data);
    } catch (error) {
      toast.error("获取仓库列表失败");
    }
  };

  const handleCreateStockTake = async () => {
    if (!newStockTake.stock_take_number || !newStockTake.warehouse_id) {
      toast.warning("请填写完整信息");
      return;
    }
    try {
      await createStockTake(newStockTake);
      toast.success("盘点单创建成功");
      setShowCreateDialog(false);
      setNewStockTake({ stock_take_number: "", warehouse_id: "", remarks: "" });
      fetchStockTakes();
    } catch (error) {
      toast.error("创建盘点单失败");
    }
  };

  const handleDeleteStockTake = async (id: string) => {
    if (!window.confirm("确定要删除这个盘点单吗？")) return;
    try {
      await deleteStockTake(id);
      toast.success("盘点单删除成功");
      fetchStockTakes();
    } catch (error) {
      toast.error("删除盘点单失败");
    }
  };

  const handleStartStockTake = async (id: string) => {
    try {
      await startStockTake(id);
      toast.success("盘点单已开始");
      fetchStockTakes();
    } catch (error) {
      toast.error("开始盘点失败");
    }
  };

  const handleCompleteStockTake = async () => {
    if (!selectedStockTake) return;
    try {
      await completeStockTake(selectedStockTake.id);
      toast.success("盘点单已完成");
      setShowDetailDialog(false);
      fetchStockTakes();
    } catch (error) {
      toast.error("完成盘点失败");
    }
  };

  const handleAdjustStockTake = async () => {
    if (!selectedStockTake) return;
    try {
      await adjustStockTake(selectedStockTake.id);
      toast.success("库存已调整");
      setShowDetailDialog(false);
      fetchStockTakes();
    } catch (error) {
      toast.error("调整库存失败");
    }
  };

  const handleViewDetail = async (stockTake: StockTake) => {
    setSelectedStockTake(stockTake);
    try {
      const items = await listStockTakeItems(stockTake.id);
      setStockTakeItems(items);
    } catch (error) {
      toast.error("获取盘点明细失败");
    }
    setShowDetailDialog(true);
  };

  const handleCountItems = async () => {
    if (!selectedStockTake) return;
    const items: CountItemRequest[] = stockTakeItems.map((item) => ({
      item_id: item.id,
      counted_quantity: countValues[item.id] || item.counted_quantity || 0,
      discrepancy_reason: item.discrepancy_reason || "",
    }));
    try {
      await countStockTake(selectedStockTake.id, items);
      toast.success("盘点数量已更新");
      setShowCountDialog(false);
      handleViewDetail(selectedStockTake);
    } catch (error) {
      toast.error("更新盘点数量失败");
    }
  };

  const filteredStockTakes = stockTakes.filter((stockTake) => {
    const matchesSearch =
      !searchTerm ||
      stockTake.stock_take_number
        .toLowerCase()
        .includes(searchTerm.toLowerCase());
    const matchesStatus = !statusFilter || stockTake.status === statusFilter;
    const matchesWarehouse =
      !warehouseFilter || stockTake.warehouse_id === warehouseFilter;
    return matchesSearch && matchesStatus && matchesWarehouse;
  });

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <h1 className="text-2xl font-bold">盘点管理</h1>
        </div>
        <Button
          variant="contained"
          startIcon={<Plus className="h-5 w-5" />}
          onClick={() => setShowCreateDialog(true)}
        >
          创建盘点单
        </Button>
      </div>

      <Card>
        <CardContent>
          <div className="flex flex-wrap gap-4 mb-6">
            <div className="flex-1 min-w-[200px]">
              <TextField
                fullWidth
                label="搜索盘点单号"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="输入盘点单号"
                InputProps={{
                  startAdornment: <Search className="h-5 w-5 mr-2" />,
                }}
              />
            </div>
            <div className="w-[200px]">
              <FormControl fullWidth>
                <InputLabel>状态</InputLabel>
                <Select
                  value={statusFilter}
                  label="状态"
                  onChange={(e) => setStatusFilter(e.target.value)}
                >
                  <MenuItem value="">全部</MenuItem>
                  <MenuItem value="planned">计划中</MenuItem>
                  <MenuItem value="in_progress">进行中</MenuItem>
                  <MenuItem value="completed">已完成</MenuItem>
                </Select>
              </FormControl>
            </div>
            <div className="w-[200px]">
              <FormControl fullWidth>
                <InputLabel>仓库</InputLabel>
                <Select
                  value={warehouseFilter}
                  label="仓库"
                  onChange={(e) => setWarehouseFilter(e.target.value)}
                >
                  <MenuItem value="">全部</MenuItem>
                  {warehouses.map((warehouse) => (
                    <MenuItem key={warehouse.id} value={warehouse.id}>
                      {warehouse.name}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </div>
            <Button
              variant="outlined"
              startIcon={<RefreshCw className="h-5 w-5" />}
              onClick={fetchStockTakes}
            >
              刷新
            </Button>
          </div>

          <Table>
            <TableHead>
              <TableRow>
                <TableCell>盘点单号</TableCell>
                <TableCell>仓库</TableCell>
                <TableCell>状态</TableCell>
                <TableCell>准确率</TableCell>
                <TableCell>创建时间</TableCell>
                <TableCell>操作</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center">
                    加载中...
                  </TableCell>
                </TableRow>
              ) : filteredStockTakes.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center">
                    暂无盘点单
                  </TableCell>
                </TableRow>
              ) : (
                filteredStockTakes.map((stockTake) => (
                  <TableRow key={stockTake.id}>
                    <TableCell>{stockTake.stock_take_number}</TableCell>
                    <TableCell>{stockTake.warehouse_name}</TableCell>
                    <TableCell>
                      <Badge
                        className={
                          statusConfig[
                            stockTake.status as keyof typeof statusConfig
                          ]?.className
                        }
                      >
                        {
                          statusConfig[
                            stockTake.status as keyof typeof statusConfig
                          ]?.label
                        }
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {stockTake.accuracy_rate
                        ? `${stockTake.accuracy_rate.toFixed(1)}%`
                        : "-"}
                    </TableCell>
                    <TableCell>{stockTake.created_at}</TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        <Tooltip title="查看详情">
                          <Button
                            size="small"
                            startIcon={<FileText className="h-4 w-4" />}
                            onClick={() => handleViewDetail(stockTake)}
                          >
                            详情
                          </Button>
                        </Tooltip>
                        {stockTake.status === "planned" && (
                          <Tooltip title="开始盘点">
                            <Button
                              size="small"
                              color="primary"
                              startIcon={<Play className="h-4 w-4" />}
                              onClick={() => handleStartStockTake(stockTake.id)}
                            >
                              开始
                            </Button>
                          </Tooltip>
                        )}
                        {stockTake.status === "completed" &&
                          !stockTake.stock_adjusted && (
                            <Tooltip title="调整库存">
                              <Button
                                size="small"
                                color="warning"
                                startIcon={<Edit className="h-4 w-4" />}
                                onClick={() => handleAdjustStockTake()}
                              >
                                调整库存
                              </Button>
                            </Tooltip>
                          )}
                        {stockTake.status === "planned" && (
                          <Tooltip title="删除">
                            <Button
                              size="small"
                              color="error"
                              startIcon={<Trash2 className="h-4 w-4" />}
                              onClick={() =>
                                handleDeleteStockTake(stockTake.id)
                              }
                            >
                              删除
                            </Button>
                          </Tooltip>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog
        open={showCreateDialog}
        onClose={() => setShowCreateDialog(false)}
      >
        <DialogTitle>创建盘点单</DialogTitle>
        <DialogContent>
          <div className="grid grid-cols-2 gap-4 mt-4">
            <div>
              <Typography variant="subtitle1" className="mb-1">
                盘点单号 *
              </Typography>
              <TextField
                fullWidth
                value={newStockTake.stock_take_number}
                onChange={(e) =>
                  setNewStockTake({
                    ...newStockTake,
                    stock_take_number: e.target.value,
                  })
                }
                placeholder="输入盘点单号"
              />
            </div>
            <div>
              <Typography variant="subtitle1" className="mb-1">
                仓库 *
              </Typography>
              <FormControl fullWidth>
                <InputLabel>仓库</InputLabel>
                <Select
                  value={newStockTake.warehouse_id}
                  label="仓库"
                  onChange={(e) =>
                    setNewStockTake({
                      ...newStockTake,
                      warehouse_id: e.target.value,
                    })
                  }
                >
                  {warehouses.map((w) => (
                    <MenuItem key={w.id} value={w.id}>
                      {w.name}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </div>
            <div className="col-span-2">
              <Typography variant="subtitle1" className="mb-1">
                备注
              </Typography>
              <TextField
                fullWidth
                multiline
                rows={3}
                value={newStockTake.remarks}
                onChange={(e) =>
                  setNewStockTake({ ...newStockTake, remarks: e.target.value })
                }
                placeholder="输入备注信息"
              />
            </div>
          </div>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowCreateDialog(false)}>取消</Button>
          <Button onClick={handleCreateStockTake}>创建</Button>
        </DialogActions>
      </Dialog>

      <Dialog
        open={showDetailDialog}
        onClose={() => setShowDetailDialog(false)}
        maxWidth="lg"
      >
        <DialogTitle className="flex items-center gap-2">
          <Package className="h-5 w-5" />
          {selectedStockTake?.stock_take_number}
        </DialogTitle>
        <DialogContent className="max-h-[90vh] overflow-y-auto">
          {selectedStockTake && (
            <div className="space-y-6">
              <div className="grid grid-cols-4 gap-4">
                <Card>
                  <CardContent className="p-4">
                    <Typography variant="body2" color="textSecondary">
                      仓库
                    </Typography>
                    <Typography variant="h6">
                      {selectedStockTake.warehouse_name}
                    </Typography>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4">
                    <Typography variant="body2" color="textSecondary">
                      状态
                    </Typography>
                    <Badge
                      className={
                        statusConfig[
                          selectedStockTake.status as keyof typeof statusConfig
                        ]?.className
                      }
                    >
                      {
                        statusConfig[
                          selectedStockTake.status as keyof typeof statusConfig
                        ]?.label
                      }
                    </Badge>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4">
                    <Typography variant="body2" color="textSecondary">
                      准确率
                    </Typography>
                    <Typography variant="h6">
                      {selectedStockTake.accuracy_rate
                        ? `${selectedStockTake.accuracy_rate.toFixed(1)}%`
                        : "-"}
                    </Typography>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4">
                    <Typography variant="body2" color="textSecondary">
                      差异数量
                    </Typography>
                    <Typography
                      variant="h6"
                      className={
                        selectedStockTake.discrepancy_quantity !== undefined &&
                        selectedStockTake.discrepancy_quantity !== 0
                          ? selectedStockTake.discrepancy_quantity! > 0
                            ? "text-green-600"
                            : "text-red-600"
                          : ""
                      }
                    >
                      {selectedStockTake.discrepancy_quantity || 0}
                    </Typography>
                  </CardContent>
                </Card>
              </div>

              <Tabs
                value={activeTab}
                onChange={(_, newValue) => setActiveTab(newValue)}
              >
                <Tab label="盘点明细" value="items" />
                <Tab label="盘点汇总" value="summary" />
              </Tabs>

              {activeTab === "items" && (
                <Box className="mt-4">
                  <div className="flex justify-end mb-4">
                    {selectedStockTake.status === "in_progress" && (
                      <Button onClick={() => setShowCountDialog(true)}>
                        <Edit className="mr-2 h-4 w-4" />
                        录入盘点数量
                      </Button>
                    )}
                  </div>

                  <Table>
                    <TableHead>
                      <TableRow>
                        <TableCell>序号</TableCell>
                        <TableCell>物料编码</TableCell>
                        <TableCell>物料名称</TableCell>
                        <TableCell>规格</TableCell>
                        <TableCell>批次</TableCell>
                        <TableCell>系统数量</TableCell>
                        <TableCell>盘点数量</TableCell>
                        <TableCell>差异</TableCell>
                        <TableCell>差异类型</TableCell>
                        <TableCell>差异原因</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {stockTakeItems.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={10} className="text-center">
                            暂无盘点明细
                          </TableCell>
                        </TableRow>
                      ) : (
                        stockTakeItems.map((item) => (
                          <TableRow key={item.id}>
                            <TableCell>{item.line_number}</TableCell>
                            <TableCell>{item.material_code}</TableCell>
                            <TableCell>{item.material_name}</TableCell>
                            <TableCell>{item.specification || "-"}</TableCell>
                            <TableCell>{item.batch_number || "-"}</TableCell>
                            <TableCell>{item.system_quantity}</TableCell>
                            <TableCell>
                              {item.counted_quantity || "-"}
                            </TableCell>
                            <TableCell>
                              {item.discrepancy_quantity !== undefined ? (
                                <span
                                  className={
                                    item.discrepancy_quantity > 0
                                      ? "text-green-600"
                                      : item.discrepancy_quantity < 0
                                        ? "text-red-600"
                                        : "text-gray-600"
                                  }
                                >
                                  {item.discrepancy_quantity}
                                </span>
                              ) : (
                                "-"
                              )}
                            </TableCell>
                            <TableCell>
                              {item.discrepancy_type ? (
                                <Badge
                                  className={
                                    discrepancyTypeConfig[
                                      item.discrepancy_type as keyof typeof discrepancyTypeConfig
                                    ]?.className
                                  }
                                >
                                  {
                                    discrepancyTypeConfig[
                                      item.discrepancy_type as keyof typeof discrepancyTypeConfig
                                    ]?.label
                                  }
                                </Badge>
                              ) : (
                                "-"
                              )}
                            </TableCell>
                            <TableCell>
                              {item.discrepancy_reason || "-"}
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </Box>
              )}

              {activeTab === "summary" && (
                <Box className="mt-4">
                  <Card>
                    <CardHeader title="盘点统计" />
                    <CardContent className="grid grid-cols-3 gap-4">
                      <div>
                        <Typography variant="body2" color="textSecondary">
                          总物料数
                        </Typography>
                        <Typography variant="h4" fontWeight="bold">
                          {selectedStockTake.total_items || 0}
                        </Typography>
                      </div>
                      <div>
                        <Typography variant="body2" color="textSecondary">
                          已盘点数
                        </Typography>
                        <Typography variant="h4" fontWeight="bold">
                          {selectedStockTake.counted_items || 0}
                        </Typography>
                      </div>
                      <div>
                        <Typography variant="body2" color="textSecondary">
                          差异数
                        </Typography>
                        <Typography variant="h4" fontWeight="bold">
                          {selectedStockTake.discrepancy_items || 0}
                        </Typography>
                      </div>
                      <div>
                        <Typography variant="body2" color="textSecondary">
                          系统总数量
                        </Typography>
                        <Typography variant="h4" fontWeight="bold">
                          {selectedStockTake.total_quantity || 0}
                        </Typography>
                      </div>
                      <div>
                        <Typography variant="body2" color="textSecondary">
                          盘点总数量
                        </Typography>
                        <Typography variant="h4" fontWeight="bold">
                          {selectedStockTake.counted_quantity || 0}
                        </Typography>
                      </div>
                      <div>
                        <Typography variant="body2" color="textSecondary">
                          差异总量
                        </Typography>
                        <Typography
                          variant="h4"
                          fontWeight="bold"
                          className={
                            selectedStockTake.discrepancy_quantity !==
                              undefined &&
                            selectedStockTake.discrepancy_quantity !== 0
                              ? selectedStockTake.discrepancy_quantity! > 0
                                ? "text-green-600"
                                : "text-red-600"
                              : ""
                          }
                        >
                          {selectedStockTake.discrepancy_quantity || 0}
                        </Typography>
                      </div>
                    </CardContent>
                  </Card>
                </Box>
              )}

              <div className="flex justify-end gap-2">
                {selectedStockTake.status === "in_progress" && (
                  <Button onClick={handleCompleteStockTake}>
                    <CheckCircle2 className="mr-2 h-4 w-4" />
                    完成盘点
                  </Button>
                )}
                {selectedStockTake.status === "completed" &&
                  !selectedStockTake.stock_adjusted && (
                    <Button color="warning" onClick={handleAdjustStockTake}>
                      <Edit className="mr-2 h-4 w-4" />
                      调整库存
                    </Button>
                  )}
                {selectedStockTake.status === "completed" &&
                  selectedStockTake.stock_adjusted && (
                    <Badge className="bg-green-100 text-green-800 px-3 py-1.5">
                      库存已调整
                    </Badge>
                  )}
                <Button
                  variant="outlined"
                  onClick={() => setShowDetailDialog(false)}
                >
                  关闭
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Dialog
        open={showCountDialog}
        onClose={() => setShowCountDialog(false)}
        maxWidth="lg"
      >
        <DialogTitle>录入盘点数量</DialogTitle>
        <DialogContent className="max-h-[80vh] overflow-y-auto">
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>物料编码</TableCell>
                <TableCell>物料名称</TableCell>
                <TableCell>规格</TableCell>
                <TableCell>系统数量</TableCell>
                <TableCell>盘点数量</TableCell>
                <TableCell>差异原因</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {stockTakeItems.map((item) => (
                <TableRow key={item.id}>
                  <TableCell>{item.material_code}</TableCell>
                  <TableCell>{item.material_name}</TableCell>
                  <TableCell>{item.specification || "-"}</TableCell>
                  <TableCell>{item.system_quantity}</TableCell>
                  <TableCell>
                    <TextField
                      type="number"
                      defaultValue={item.counted_quantity || ""}
                      onChange={(e) =>
                        setCountValues({
                          ...countValues,
                          [item.id]: parseFloat(e.target.value) || 0,
                        })
                      }
                      placeholder="输入盘点数量"
                    />
                  </TableCell>
                  <TableCell>
                    <FormControl fullWidth>
                      <Select
                        value={item.discrepancy_reason || ""}
                        onChange={(e) => {
                          const newItems = stockTakeItems.map((i) =>
                            i.id === item.id
                              ? { ...i, discrepancy_reason: e.target.value }
                              : i,
                          );
                          setStockTakeItems(newItems);
                        }}
                      >
                        <MenuItem value="">无</MenuItem>
                        <MenuItem value="damaged">损坏</MenuItem>
                        <MenuItem value="lost">丢失</MenuItem>
                        <MenuItem value="miscount">计数错误</MenuItem>
                        <MenuItem value="other">其他</MenuItem>
                      </Select>
                    </FormControl>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </DialogContent>
        <DialogActions>
          <Button variant="outlined" onClick={() => setShowCountDialog(false)}>
            取消
          </Button>
          <Button onClick={handleCountItems}>
            <CheckCircle2 className="mr-2 h-4 w-4" />
            确认盘点
          </Button>
        </DialogActions>
      </Dialog>
    </div>
  );
}
