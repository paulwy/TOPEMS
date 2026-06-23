import React, { useState, useEffect } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Input,
  Badge,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
  Tooltip,
  useToast,
} from "@/components/ui";
import {
  Plus,
  Search,
  Edit,
  Trash2,
  AlertTriangle,
  Package,
  BarChart3,
} from "lucide-react";
import {
  listInventory,
  createInventory,
  updateInventory,
  deleteInventory,
  listLowStockInventory,
  listInventoryByWarehouse,
  InventoryItem,
  CreateInventoryItemRequest,
  UpdateInventoryItemRequest,
} from "@/api/wms";
import { listWarehouses, Warehouse } from "@/api/wms";

const statusConfig = {
  qualified: { label: "合格", className: "bg-green-100 text-green-800" },
  unqualified: { label: "不合格", className: "bg-red-100 text-red-800" },
  pending: { label: "待检验", className: "bg-yellow-100 text-yellow-800" },
};

export default function InventoryPage() {
  const toast = useToast();
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [warehouseFilter, setWarehouseFilter] = useState("");
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [selectedItem, setSelectedItem] = useState<InventoryItem | null>(null);
  const [newItem, setNewItem] = useState<CreateInventoryItemRequest>({
    warehouse_id: "",
    location_id: "00000000-0000-0000-0000-000000000001",
    sku: "",
    name: "",
    specification: "",
    quantity: 0,
    unit: "",
    min_quantity: 0,
    max_quantity: 0,
  });
  const [editItem, setEditItem] = useState<UpdateInventoryItemRequest>({});
  const [lowStockItems, setLowStockItems] = useState<InventoryItem[]>([]);

  useEffect(() => {
    fetchInventory();
    fetchWarehouses();
    fetchLowStock();
  }, [searchTerm, statusFilter, warehouseFilter]);

  async function fetchInventory() {
    setLoading(true);
    try {
      const params: any = {
        page: 1,
        page_size: 100,
      };
      if (searchTerm) params.search = searchTerm;
      if (statusFilter) params.status = statusFilter;
      if (warehouseFilter) params.warehouse_id = warehouseFilter;

      const response = await listInventory(params);
      if (response.code === 200 && response.data) {
        setInventory(response.data.items || []);
      }
    } catch (error) {
      toast({ title: "获取库存列表失败", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }

  async function fetchWarehouses() {
    try {
      const response = await listWarehouses({ page: 1, page_size: 100 });
      if (response.code === 200 && response.data) {
        setWarehouses(response.data.items || []);
      }
    } catch (error) {
      toast({ title: "获取仓库列表失败", variant: "destructive" });
    }
  }

  async function fetchLowStock() {
    try {
      const response = await listLowStockInventory();
      if (response.code === 200 && response.data) {
        setLowStockItems(response.data.items || []);
      }
    } catch (error) {
      toast({ title: "获取低库存列表失败", variant: "destructive" });
    }
  }

  async function handleCreateInventory() {
    if (!newItem.sku || !newItem.name || !newItem.warehouse_id) {
      toast({ title: "请填写必要信息", variant: "destructive" });
      return;
    }

    try {
      const response = await createInventory(newItem);
      if (response.code === 200) {
        toast({ title: "库存创建成功", variant: "default" });
        setShowCreateDialog(false);
        setNewItem({
          warehouse_id: "",
          location_id: "00000000-0000-0000-0000-000000000001",
          sku: "",
          name: "",
          specification: "",
          quantity: 0,
          unit: "",
          min_quantity: 0,
          max_quantity: 0,
        });
        fetchInventory();
        fetchLowStock();
      }
    } catch (error) {
      toast({ title: "创建库存失败", variant: "destructive" });
    }
  }

  async function handleOpenEdit(item: InventoryItem) {
    setSelectedItem(item);
    setEditItem({
      sku: item.sku,
      name: item.name,
      specification: item.specification,
      quantity: item.quantity,
      unit: item.unit,
      min_quantity: item.min_quantity,
      max_quantity: item.max_quantity,
      status: item.status,
    });
    setShowEditDialog(true);
  }

  async function handleUpdateInventory() {
    if (!selectedItem) return;

    try {
      const response = await updateInventory(selectedItem.id, editItem);
      if (response.code === 200) {
        toast({ title: "库存更新成功", variant: "default" });
        setShowEditDialog(false);
        fetchInventory();
        fetchLowStock();
      }
    } catch (error) {
      toast({ title: "更新库存失败", variant: "destructive" });
    }
  }

  async function handleDeleteInventory(id: string) {
    if (!confirm("确定要删除此库存吗？")) return;

    try {
      const response = await deleteInventory(id);
      if (response.code === 200) {
        toast({ title: "库存删除成功", variant: "default" });
        fetchInventory();
        fetchLowStock();
      }
    } catch (error) {
      toast({ title: "删除库存失败", variant: "destructive" });
    }
  }

  const totalQuantity = inventory.reduce((sum, item) => sum + item.quantity, 0);
  const totalValue = inventory.reduce(
    (sum, item) => sum + (item.total_value || 0),
    0,
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">库存管理</h1>
          <p className="text-gray-500 mt-1">
            管理仓库库存，查看库存状态和低库存预警
          </p>
        </div>
        <Button onClick={() => setShowCreateDialog(true)}>
          <Plus className="mr-2 h-4 w-4" />
          新增库存
        </Button>
      </div>

      <div className="grid grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">总库存数量</p>
                <p className="text-2xl font-bold">{totalQuantity}</p>
              </div>
              <Package className="h-10 w-10 text-gray-400" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">库存总价值</p>
                <p className="text-2xl font-bold">
                  ¥{totalValue.toLocaleString()}
                </p>
              </div>
              <BarChart3 className="h-10 w-10 text-gray-400" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">物料种类</p>
                <p className="text-2xl font-bold">{inventory.length}</p>
              </div>
              <Package className="h-10 w-10 text-gray-400" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">低库存预警</p>
                <p className="text-2xl font-bold text-red-600">
                  {lowStockItems.length}
                </p>
              </div>
              <AlertTriangle className="h-10 w-10 text-red-400" />
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="list">
        <TabsList>
          <TabsTrigger value="list">库存列表</TabsTrigger>
          <TabsTrigger value="low-stock">低库存预警</TabsTrigger>
        </TabsList>

        <TabsContent value="list">
          <Card>
            <CardContent className="space-y-4">
              <div className="flex gap-4">
                <div className="flex-1">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <Input
                      placeholder="搜索物料名称或编码..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-9"
                    />
                  </div>
                </div>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-36">
                    <SelectValue placeholder="状态" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">全部</SelectItem>
                    <SelectItem value="qualified">合格</SelectItem>
                    <SelectItem value="unqualified">不合格</SelectItem>
                    <SelectItem value="pending">待检验</SelectItem>
                  </SelectContent>
                </Select>
                <Select
                  value={warehouseFilter}
                  onValueChange={setWarehouseFilter}
                >
                  <SelectTrigger className="w-48">
                    <SelectValue placeholder="选择仓库" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">全部仓库</SelectItem>
                    {warehouses.map((w) => (
                      <SelectItem key={w.id} value={w.id}>
                        {w.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>物料编码</TableHead>
                    <TableHead>物料名称</TableHead>
                    <TableHead>规格</TableHead>
                    <TableHead>单位</TableHead>
                    <TableHead>数量</TableHead>
                    <TableHead>可用数量</TableHead>
                    <TableHead>仓库</TableHead>
                    <TableHead>状态</TableHead>
                    <TableHead>批次</TableHead>
                    <TableHead>有效期</TableHead>
                    <TableHead>操作</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading ? (
                    <TableRow>
                      <TableCell colSpan={11} className="text-center">
                        加载中...
                      </TableCell>
                    </TableRow>
                  ) : inventory.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={11} className="text-center">
                        暂无库存记录
                      </TableCell>
                    </TableRow>
                  ) : (
                    inventory.map((item) => (
                      <TableRow key={item.id}>
                        <TableCell className="font-medium">
                          {item.sku}
                        </TableCell>
                        <TableCell>{item.name}</TableCell>
                        <TableCell>{item.specification || "-"}</TableCell>
                        <TableCell>{item.unit || "-"}</TableCell>
                        <TableCell>{item.quantity}</TableCell>
                        <TableCell>{item.available_quantity}</TableCell>
                        <TableCell>
                          {warehouses.find((w) => w.id === item.warehouse_id)
                            ?.name || item.warehouse_id}
                        </TableCell>
                        <TableCell>
                          <Badge
                            className={
                              statusConfig[
                                item.status as keyof typeof statusConfig
                              ]?.className
                            }
                          >
                            {
                              statusConfig[
                                item.status as keyof typeof statusConfig
                              ]?.label
                            }
                          </Badge>
                        </TableCell>
                        <TableCell>{item.batch_number || "-"}</TableCell>
                        <TableCell>
                          {item.expiry_date
                            ? new Date(item.expiry_date).toLocaleDateString()
                            : "-"}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Tooltip content="编辑">
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleOpenEdit(item)}
                              >
                                <Edit className="h-4 w-4" />
                              </Button>
                            </Tooltip>
                            <Tooltip content="删除">
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleDeleteInventory(item.id)}
                              >
                                <Trash2 className="h-4 w-4 text-red-600" />
                              </Button>
                            </Tooltip>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="low-stock">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-red-500" />
                低库存预警
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>物料编码</TableHead>
                    <TableHead>物料名称</TableHead>
                    <TableHead>规格</TableHead>
                    <TableHead>当前数量</TableHead>
                    <TableHead>最低库存</TableHead>
                    <TableHead>再订货点</TableHead>
                    <TableHead>仓库</TableHead>
                    <TableHead>批次</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {lowStockItems.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={8} className="text-center">
                        暂无低库存预警
                      </TableCell>
                    </TableRow>
                  ) : (
                    lowStockItems.map((item) => (
                      <TableRow key={item.id} className="bg-red-50">
                        <TableCell className="font-medium">
                          {item.sku}
                        </TableCell>
                        <TableCell>{item.name}</TableCell>
                        <TableCell>{item.specification || "-"}</TableCell>
                        <TableCell className="text-red-600 font-medium">
                          {item.quantity}
                        </TableCell>
                        <TableCell>{item.min_quantity || "-"}</TableCell>
                        <TableCell>{item.reorder_point || "-"}</TableCell>
                        <TableCell>
                          {warehouses.find((w) => w.id === item.warehouse_id)
                            ?.name || item.warehouse_id}
                        </TableCell>
                        <TableCell>{item.batch_number || "-"}</TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>新增库存</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium">物料编码 *</label>
                <Input
                  value={newItem.sku}
                  onChange={(e) =>
                    setNewItem({ ...newItem, sku: e.target.value })
                  }
                  placeholder="输入物料编码"
                />
              </div>
              <div>
                <label className="text-sm font-medium">物料名称 *</label>
                <Input
                  value={newItem.name}
                  onChange={(e) =>
                    setNewItem({ ...newItem, name: e.target.value })
                  }
                  placeholder="输入物料名称"
                />
              </div>
              <div>
                <label className="text-sm font-medium">规格</label>
                <Input
                  value={newItem.specification}
                  onChange={(e) =>
                    setNewItem({ ...newItem, specification: e.target.value })
                  }
                  placeholder="输入规格"
                />
              </div>
              <div>
                <label className="text-sm font-medium">单位 *</label>
                <Input
                  value={newItem.unit}
                  onChange={(e) =>
                    setNewItem({ ...newItem, unit: e.target.value })
                  }
                  placeholder="输入单位"
                />
              </div>
              <div>
                <label className="text-sm font-medium">数量 *</label>
                <Input
                  type="number"
                  value={newItem.quantity}
                  onChange={(e) =>
                    setNewItem({
                      ...newItem,
                      quantity: parseFloat(e.target.value) || 0,
                    })
                  }
                  placeholder="输入数量"
                />
              </div>
              <div>
                <label className="text-sm font-medium">仓库 *</label>
                <Select
                  value={newItem.warehouse_id}
                  onValueChange={(v) =>
                    setNewItem({ ...newItem, warehouse_id: v })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="选择仓库" />
                  </SelectTrigger>
                  <SelectContent>
                    {warehouses.map((w) => (
                      <SelectItem key={w.id} value={w.id}>
                        {w.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-sm font-medium">最低库存</label>
                <Input
                  type="number"
                  value={newItem.min_quantity}
                  onChange={(e) =>
                    setNewItem({
                      ...newItem,
                      min_quantity: parseFloat(e.target.value) || 0,
                    })
                  }
                  placeholder="输入最低库存"
                />
              </div>
              <div>
                <label className="text-sm font-medium">最高库存</label>
                <Input
                  type="number"
                  value={newItem.max_quantity}
                  onChange={(e) =>
                    setNewItem({
                      ...newItem,
                      max_quantity: parseFloat(e.target.value) || 0,
                    })
                  }
                  placeholder="输入最高库存"
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowCreateDialog(false)}
            >
              取消
            </Button>
            <Button onClick={handleCreateInventory}>创建</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>编辑库存</DialogTitle>
          </DialogHeader>
          {selectedItem && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium">物料编码</label>
                  <Input
                    value={editItem.sku || ""}
                    onChange={(e) =>
                      setEditItem({ ...editItem, sku: e.target.value })
                    }
                    placeholder="输入物料编码"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">物料名称</label>
                  <Input
                    value={editItem.name || ""}
                    onChange={(e) =>
                      setEditItem({ ...editItem, name: e.target.value })
                    }
                    placeholder="输入物料名称"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">规格</label>
                  <Input
                    value={editItem.specification || ""}
                    onChange={(e) =>
                      setEditItem({
                        ...editItem,
                        specification: e.target.value,
                      })
                    }
                    placeholder="输入规格"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">单位</label>
                  <Input
                    value={editItem.unit || ""}
                    onChange={(e) =>
                      setEditItem({ ...editItem, unit: e.target.value })
                    }
                    placeholder="输入单位"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">数量</label>
                  <Input
                    type="number"
                    value={editItem.quantity || ""}
                    onChange={(e) =>
                      setEditItem({
                        ...editItem,
                        quantity: parseFloat(e.target.value) || 0,
                      })
                    }
                    placeholder="输入数量"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">状态</label>
                  <Select
                    value={editItem.status || ""}
                    onValueChange={(v) =>
                      setEditItem({ ...editItem, status: v })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="选择状态" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="qualified">合格</SelectItem>
                      <SelectItem value="unqualified">不合格</SelectItem>
                      <SelectItem value="pending">待检验</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="text-sm font-medium">最低库存</label>
                  <Input
                    type="number"
                    value={editItem.min_quantity || ""}
                    onChange={(e) =>
                      setEditItem({
                        ...editItem,
                        min_quantity: parseFloat(e.target.value) || 0,
                      })
                    }
                    placeholder="输入最低库存"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">最高库存</label>
                  <Input
                    type="number"
                    value={editItem.max_quantity || ""}
                    onChange={(e) =>
                      setEditItem({
                        ...editItem,
                        max_quantity: parseFloat(e.target.value) || 0,
                      })
                    }
                    placeholder="输入最高库存"
                  />
                </div>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowEditDialog(false)}>
              取消
            </Button>
            <Button onClick={handleUpdateInventory}>保存</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
