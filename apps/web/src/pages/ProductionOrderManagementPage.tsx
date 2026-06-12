import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import type {
  ProductionOrder,
  CreateProductionOrderRequest,
  UpdateProductionOrderRequest,
} from "@/api/mes";
import { mesApi } from "@/api/mes";
import { useAppStore } from "@/store";
import { LoadingSpinner } from "@/components/LoadingSpinner";
import { EmptyState } from "@/components/EmptyState";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import { Search, Plus, Edit, Trash2, Eye } from "lucide-react";

const ProductionOrderManagementPage: React.FC = () => {
  const [orders, setOrders] = useState<ProductionOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize] = useState(10);
  const [total, setTotal] = useState(0);
  const [showDialog, setShowDialog] = useState(false);
  const [showDetailDialog, setShowDetailDialog] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<ProductionOrder | null>(
    null,
  );
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [formData, setFormData] = useState<CreateProductionOrderRequest>({
    order_number: "",
    product_name: "",
    quantity: 0,
    scheduled_start_date: "",
    scheduled_end_date: "",
  });

  const { addNotification } = useAppStore();

  useEffect(() => {
    loadOrders();
  }, [currentPage, pageSize, searchTerm, statusFilter]);

  const loadOrders = async () => {
    try {
      setLoading(true);
      const params: any = {
        page: currentPage,
        page_size: pageSize,
      };
      if (searchTerm) params.search = searchTerm;
      if (statusFilter !== "all") params.status = statusFilter;

      const response = await mesApi.orders.list(params);
      if (response.success && response.data) {
        setOrders(response.data.orders || []);
        setTotal(response.data.total || 0);
      }
    } catch (error) {
      console.error("加载生产订单列表失败:", error);
      addNotification({
        type: "error",
        title: "加载失败",
        message: "无法加载生产订单列表",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (selectedOrder) {
        await mesApi.orders.update(
          selectedOrder.id,
          formData as UpdateProductionOrderRequest,
        );
        addNotification({
          type: "success",
          title: "更新成功",
          message: "生产订单信息已更新",
        });
      } else {
        await mesApi.orders.create(formData);
        addNotification({
          type: "success",
          title: "创建成功",
          message: "新生产订单已创建",
        });
      }
      setShowDialog(false);
      resetForm();
      loadOrders();
    } catch (error) {
      console.error("操作失败:", error);
      addNotification({
        type: "error",
        title: "操作失败",
        message: selectedOrder ? "更新生产订单失败" : "创建生产订单失败",
      });
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm("确定要删除这个生产订单吗?")) return;
    try {
      await mesApi.orders.delete(id);
      addNotification({
        type: "success",
        title: "删除成功",
        message: "生产订单已删除",
      });
      loadOrders();
    } catch (error) {
      console.error("删除失败:", error);
      addNotification({
        type: "error",
        title: "删除失败",
        message: "无法删除生产订单",
      });
    }
  };

  const handleEdit = (order: ProductionOrder) => {
    setSelectedOrder(order);
    setFormData({
      order_number: order.order_number,
      product_name: order.product_name,
      quantity: order.quantity,
      scheduled_start_date: order.scheduled_start_date,
      scheduled_end_date: order.scheduled_end_date,
    });
    setShowDialog(true);
  };

  const handleViewDetail = (order: ProductionOrder) => {
    setSelectedOrder(order);
    setShowDetailDialog(true);
  };

  const resetForm = () => {
    setSelectedOrder(null);
    setFormData({
      order_number: "",
      product_name: "",
      quantity: 0,
      scheduled_start_date: "",
      scheduled_end_date: "",
    });
  };

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id],
    );
  };

  const toggleSelectAll = () => {
    if (selectedIds.length === orders.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(orders.map((o) => o.id));
    }
  };

  const getStatusBadge = (status: string) => {
    const statusMap: Record<
      string,
      {
        label: string;
        variant: "default" | "secondary" | "destructive" | "outline";
      }
    > = {
      pending: { label: "待处理", variant: "outline" },
      in_progress: { label: "进行中", variant: "default" },
      completed: { label: "已完成", variant: "secondary" },
      cancelled: { label: "已取消", variant: "destructive" },
    };
    const s = statusMap[status] || { label: status, variant: "outline" };
    return <Badge variant={s.variant}>{s.label}</Badge>;
  };

  if (loading) return <LoadingSpinner />;

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>生产订单管理</CardTitle>
          <CardDescription>
            管理生产订单信息,包括订单号、产品名称、数量、计划时间等
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row gap-4 mb-6">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="搜索订单号或产品名称..."
                  value={searchTerm}
                  onChange={(e) => {
                    setSearchTerm(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="pl-8"
                />
              </div>
            </div>
            <Select
              value={statusFilter}
              onValueChange={(value) => {
                setStatusFilter(value);
                setCurrentPage(1);
              }}
            >
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="状态筛选" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">全部状态</SelectItem>
                <SelectItem value="pending">待处理</SelectItem>
                <SelectItem value="in_progress">进行中</SelectItem>
                <SelectItem value="completed">已完成</SelectItem>
                <SelectItem value="cancelled">已取消</SelectItem>
              </SelectContent>
            </Select>
            <Button
              onClick={() => {
                resetForm();
                setShowDialog(true);
              }}
            >
              <Plus className="mr-2 h-4 w-4" />
              新增订单
            </Button>
          </div>

          {selectedIds.length > 0 && (
            <div className="mb-4 p-3 bg-muted rounded-lg flex items-center justify-between">
              <span className="text-sm">
                已选择 {selectedIds.length} 个订单
              </span>
              <Button
                variant="destructive"
                size="sm"
                onClick={() => setSelectedIds([])}
              >
                清除选择
              </Button>
            </div>
          )}

          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[50px]">
                    <Checkbox
                      checked={
                        selectedIds.length === orders.length &&
                        orders.length > 0
                      }
                      onCheckedChange={toggleSelectAll}
                    />
                  </TableHead>
                  <TableHead>订单号</TableHead>
                  <TableHead>产品名称</TableHead>
                  <TableHead>数量</TableHead>
                  <TableHead>计划开始时间</TableHead>
                  <TableHead>计划结束时间</TableHead>
                  <TableHead>状态</TableHead>
                  <TableHead className="text-right">操作</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {orders.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center">
                      <EmptyState
                        title="暂无生产订单数据"
                        description="点击上方按钮添加第一个生产订单"
                      />
                    </TableCell>
                  </TableRow>
                ) : (
                  orders.map((order) => (
                    <TableRow key={order.id}>
                      <TableCell>
                        <Checkbox
                          checked={selectedIds.includes(order.id)}
                          onCheckedChange={() => toggleSelect(order.id)}
                        />
                      </TableCell>
                      <TableCell className="font-medium">
                        {order.order_number}
                      </TableCell>
                      <TableCell>{order.product_name}</TableCell>
                      <TableCell>{order.quantity}</TableCell>
                      <TableCell>
                        {new Date(
                          order.scheduled_start_date || "",
                        ).toLocaleDateString("zh-CN")}
                      </TableCell>
                      <TableCell>
                        {new Date(
                          order.scheduled_end_date || "",
                        ).toLocaleDateString("zh-CN")}
                      </TableCell>
                      <TableCell>{getStatusBadge(order.status)}</TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleViewDetail(order)}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleEdit(order)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDelete(order.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>

          <div className="mt-4 flex items-center justify-between">
            <div className="text-sm text-muted-foreground">
              共 {total} 条记录,第 {currentPage} /{" "}
              {Math.ceil(total / pageSize) || 1} 页
            </div>
            <Pagination>
              <PaginationContent>
                <PaginationItem>
                  <PaginationPrevious
                    onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                    className={
                      currentPage === 1
                        ? "pointer-events-none opacity-50"
                        : "cursor-pointer"
                    }
                  />
                </PaginationItem>
                {Array.from(
                  { length: Math.min(5, Math.ceil(total / pageSize)) },
                  (_, i) => {
                    const page = i + 1;
                    return (
                      <PaginationItem key={page}>
                        <PaginationLink
                          onClick={() => setCurrentPage(page)}
                          isActive={currentPage === page}
                          className="cursor-pointer"
                        >
                          {page}
                        </PaginationLink>
                      </PaginationItem>
                    );
                  },
                )}
                <PaginationItem>
                  <PaginationNext
                    onClick={() =>
                      setCurrentPage(
                        Math.min(Math.ceil(total / pageSize), currentPage + 1),
                      )
                    }
                    className={
                      currentPage >= Math.ceil(total / pageSize)
                        ? "pointer-events-none opacity-50"
                        : "cursor-pointer"
                    }
                  />
                </PaginationItem>
              </PaginationContent>
            </Pagination>
          </div>
        </CardContent>
      </Card>

      {/* 新增/编辑对话框 */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {selectedOrder ? "编辑生产订单" : "新增生产订单"}
            </DialogTitle>
            <DialogDescription>
              {selectedOrder ? "修改生产订单信息" : "填写新生产订单信息"}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit}>
            <div className="grid grid-cols-2 gap-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="order_number">订单号 *</Label>
                <Input
                  id="order_number"
                  required
                  value={formData.order_number}
                  onChange={(e) =>
                    setFormData({ ...formData, order_number: e.target.value })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="product_name">产品名称 *</Label>
                <Input
                  id="product_name"
                  required
                  value={formData.product_name}
                  onChange={(e) =>
                    setFormData({ ...formData, product_name: e.target.value })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="quantity">数量 *</Label>
                <Input
                  id="quantity"
                  type="number"
                  required
                  value={formData.quantity}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      quantity: parseFloat(e.target.value),
                    })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="scheduled_start_date">计划开始时间 *</Label>
                <Input
                  id="scheduled_start_date"
                  type="datetime-local"
                  required
                  value={formData.scheduled_start_date}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      scheduled_start_date: e.target.value,
                    })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="scheduled_end_date">计划结束时间 *</Label>
                <Input
                  id="scheduled_end_date"
                  type="datetime-local"
                  required
                  value={formData.scheduled_end_date}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      scheduled_end_date: e.target.value,
                    })
                  }
                />
              </div>
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowDialog(false)}
              >
                取消
              </Button>
              <Button type="submit">保存</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* 详情对话框 */}
      <Dialog open={showDetailDialog} onOpenChange={setShowDetailDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>生产订单详情</DialogTitle>
          </DialogHeader>
          {selectedOrder && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-muted-foreground">订单号</Label>
                  <p className="font-medium">{selectedOrder.order_number}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">产品名称</Label>
                  <p>{selectedOrder.product_name}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">数量</Label>
                  <p>{selectedOrder.quantity}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">状态</Label>
                  <div>{getStatusBadge(selectedOrder.status)}</div>
                </div>
                <div>
                  <Label className="text-muted-foreground">计划开始时间</Label>
                  <p>
                    {new Date(
                      selectedOrder.scheduled_start_date || "",
                    ).toLocaleString("zh-CN")}
                  </p>
                </div>
                <div>
                  <Label className="text-muted-foreground">计划结束时间</Label>
                  <p>
                    {new Date(
                      selectedOrder.scheduled_end_date || "",
                    ).toLocaleString("zh-CN")}
                  </p>
                </div>
                <div>
                  <Label className="text-muted-foreground">创建时间</Label>
                  <p>
                    {new Date(selectedOrder.created_at).toLocaleString("zh-CN")}
                  </p>
                </div>
                <div>
                  <Label className="text-muted-foreground">更新时间</Label>
                  <p>
                    {new Date(selectedOrder.updated_at).toLocaleString("zh-CN")}
                  </p>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ProductionOrderManagementPage;
