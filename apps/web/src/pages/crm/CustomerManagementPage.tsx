import React, { useState, useEffect } from "react";
import {
  Button,
  TextField,
  Card,
  CardContent,
  CardHeader,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Chip,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Checkbox,
  Box,
  Typography,
  Stack,
  Paper,
} from "@mui/material";
import type {
  Customer,
  CreateCustomerRequest,
  UpdateCustomerRequest,
} from "@/api/modules/crm/crm";
import { crmApi } from "@/api/modules/crm/crm";
import { useAppStore } from "@/store";
import { LoadingSpinner } from "@/components/LoadingSpinner";
import { EmptyState } from "@/components/EmptyState";
import { ImportExportModal } from "@/components/ImportExportModal";
import { DataExport, ImageUpload } from "@/components/common";
import { Search, Plus, Edit, Trash2, Eye, Download } from "lucide-react";
import { useNavigate } from "react-router-dom";
import type { ExportColumn } from "@/utils/importExport";

const customerColumns: ExportColumn<Customer>[] = [
  { key: "name", label: "客户名称" },
  { key: "code", label: "客户代码" },
  { key: "industry", label: "行业" },
  { key: "website", label: "网站" },
  { key: "email", label: "邮箱" },
  { key: "phone", label: "电话" },
  { key: "address", label: "地址" },
  { key: "status", label: "状态" },
  { key: "notes", label: "备注" },
  { key: "created_at", label: "创建时间" },
];

const CustomerManagementPage: React.FC = () => {
  const navigate = useNavigate();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize] = useState(10);
  const [total, setTotal] = useState(0);
  const [showDialog, setShowDialog] = useState(false);
  const [showDetailDialog, setShowDetailDialog] = useState(false);
  const [showImportExport, setShowImportExport] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(
    null,
  );
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [formData, setFormData] = useState<CreateCustomerRequest>({
    name: "",
    code: "",
    industry: "",
    website: "",
    email: "",
    phone: "",
    address: "",
    notes: "",
  });

  const { addNotification } = useAppStore();

  useEffect(() => {
    loadCustomers();
  }, [currentPage, pageSize, searchTerm, statusFilter]);

  const loadCustomers = async () => {
    try {
      setLoading(true);
      const params: any = {
        page: currentPage,
        pageSize,
      };
      if (searchTerm) params.search = searchTerm;
      if (statusFilter !== "all") params.status = statusFilter;

      const response = await crmApi.customers.list(params);
      if (response.success && response.data) {
        setCustomers(response.data.items || []);
        setTotal(response.data.total || 0);
      }
    } catch (error) {
      console.error("加载客户列表失败:", error);
      addNotification({
        type: "error",
        title: "加载失败",
        message: "无法加载客户列表",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (selectedCustomer) {
        await crmApi.customers.update(
          selectedCustomer.id,
          formData as UpdateCustomerRequest,
        );
        addNotification({
          type: "success",
          title: "更新成功",
          message: "客户信息已更新",
        });
      } else {
        await crmApi.customers.create(formData);
        addNotification({
          type: "success",
          title: "创建成功",
          message: "新客户已创建",
        });
      }
      setShowDialog(false);
      resetForm();
      loadCustomers();
    } catch (error) {
      console.error("操作失败:", error);
      addNotification({
        type: "error",
        title: "操作失败",
        message: selectedCustomer ? "更新客户失败" : "创建客户失败",
      });
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm("确定要删除这个客户吗?")) return;
    try {
      await crmApi.customers.delete(id);
      addNotification({
        type: "success",
        title: "删除成功",
        message: "客户已删除",
      });
      loadCustomers();
    } catch (error) {
      console.error("删除失败:", error);
      addNotification({
        type: "error",
        title: "删除失败",
        message: "无法删除客户",
      });
    }
  };

  const handleBatchDelete = async () => {
    if (selectedIds.length === 0) return;
    if (!window.confirm(`确定要删除选中的 ${selectedIds.length} 个客户吗?`))
      return;
    try {
      await crmApi.customers.batchDelete(selectedIds);
      addNotification({
        type: "success",
        title: "删除成功",
        message: `已删除 ${selectedIds.length} 个客户`,
      });
      setSelectedIds([]);
      loadCustomers();
    } catch (error) {
      console.error("批量删除失败:", error);
      addNotification({
        type: "error",
        title: "删除失败",
        message: "批量删除失败",
      });
    }
  };

  const handleImportSuccess = async (data: Customer[]) => {
    for (const item of data) {
      try {
        await crmApi.customers.create({
          name: item.name,
          code: item.code,
          industry: item.industry,
          website: item.website,
          email: item.email,
          phone: item.phone,
          address: item.address,
          notes: item.notes,
        });
      } catch (error) {
        console.error("导入单个客户失败:", error);
      }
    }
    addNotification({
      type: "success",
      title: "导入完成",
      message: `成功导入 ${data.length} 条客户数据`,
    });
    loadCustomers();
  };

  const handleEdit = (customer: Customer) => {
    setSelectedCustomer(customer);
    setFormData({
      name: customer.name,
      code: customer.code || "",
      industry: customer.industry || "",
      website: customer.website || "",
      email: customer.email || "",
      phone: customer.phone || "",
      address: customer.address || "",
      notes: customer.notes || "",
    });
    setShowDialog(true);
  };

  const handleViewDetail = (customer: Customer) => {
    navigate(`/crm/customers/${customer.id}`);
  };

  const resetForm = () => {
    setSelectedCustomer(null);
    setFormData({
      name: "",
      code: "",
      industry: "",
      website: "",
      email: "",
      phone: "",
      address: "",
      notes: "",
    });
  };

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id],
    );
  };

  const toggleSelectAll = () => {
    if (selectedIds.length === customers.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(customers.map((c) => c.id));
    }
  };

  const getStatusChip = (status: string) => {
    const statusMap: Record<
      string,
      {
        label: string;
        color:
          | "default"
          | "primary"
          | "secondary"
          | "error"
          | "info"
          | "success"
          | "warning";
      }
    > = {
      active: { label: "活跃", color: "success" },
      inactive: { label: "非活跃", color: "default" },
      prospect: { label: "潜在", color: "info" },
    };
    const s = statusMap[status] || { label: status, color: "default" };
    return <Chip label={s.label} color={s.color} size="small" />;
  };

  if (loading) return <LoadingSpinner />;

  return (
    <Box sx={{ mt: 3 }}>
      <Card>
        <CardHeader
          title="客户管理"
          subheader="管理客户信息,包括客户基本信息、联系方式等"
        />
        <CardContent>
          <Stack
            direction={{ xs: "column", sm: "row" }}
            spacing={2}
            sx={{ mb: 3 }}
          >
            <Box sx={{ flex: 1, position: "relative" }}>
              <Search
                sx={{
                  position: "absolute",
                  left: 8,
                  top: "50%",
                  transform: "translateY(-50%)",
                  width: 16,
                  height: 16,
                  color: "gray",
                }}
              />
              <TextField
                size="small"
                placeholder="搜索客户名称或代码..."
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                  setCurrentPage(1);
                }}
                sx={{ pl: 2, width: "100%" }}
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
                <MenuItem value="prospect">潜在</MenuItem>
              </Select>
            </FormControl>
            <Button
              variant="contained"
              onClick={() => {
                resetForm();
                setShowDialog(true);
              }}
              startIcon={<Plus sx={{ width: 16, height: 16 }} />}
            >
              新增客户
            </Button>
            <Button
              variant="outlined"
              onClick={() => setShowImportExport(true)}
              startIcon={<Download sx={{ width: 16, height: 16 }} />}
            >
              导入导出
            </Button>
            <DataExport
              data={customers as unknown as Record<string, unknown>[]}
              fields={[
                { key: "name", title: "客户名称" },
                { key: "code", title: "客户代码" },
                { key: "industry", title: "行业" },
                { key: "website", title: "网站" },
                { key: "email", title: "邮箱" },
                { key: "phone", title: "电话" },
                { key: "address", title: "地址" },
                { key: "status", title: "状态" },
                { key: "notes", title: "备注" },
              ]}
              defaultFileName="客户数据"
              buttonText="导出"
            />
          </Stack>

          {selectedIds.length > 0 && (
            <Paper sx={{ p: 1.5, mb: 2, bgcolor: "grey.100" }}>
              <Stack
                direction="row"
                sx={{ justifyContent: "space-between", alignItems: "center" }}
              >
                <Typography variant="body2">
                  已选择 {selectedIds.length} 个客户
                </Typography>
                <Button
                  variant="contained"
                  color="error"
                  size="small"
                  onClick={handleBatchDelete}
                  startIcon={<Trash2 sx={{ width: 16, height: 16 }} />}
                >
                  批量删除
                </Button>
              </Stack>
            </Paper>
          )}

          <TableContainer component={Paper} variant="outlined">
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell padding="checkbox">
                    <Checkbox
                      checked={
                        selectedIds.length === customers.length &&
                        customers.length > 0
                      }
                      onChange={toggleSelectAll}
                    />
                  </TableCell>
                  <TableCell>客户名称</TableCell>
                  <TableCell>客户代码</TableCell>
                  <TableCell>行业</TableCell>
                  <TableCell>邮箱</TableCell>
                  <TableCell>电话</TableCell>
                  <TableCell>状态</TableCell>
                  <TableCell align="right">操作</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {customers.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} align="center">
                      <EmptyState
                        title="暂无客户数据"
                        description="点击上方按钮添加第一个客户"
                      />
                    </TableCell>
                  </TableRow>
                ) : (
                  customers.map((customer) => (
                    <TableRow key={customer.id}>
                      <TableCell padding="checkbox">
                        <Checkbox
                          checked={selectedIds.includes(customer.id)}
                          onChange={() => toggleSelect(customer.id)}
                        />
                      </TableCell>
                      <TableCell sx={{ fontWeight: "medium" }}>
                        {customer.name}
                      </TableCell>
                      <TableCell>{customer.code || "-"}</TableCell>
                      <TableCell>{customer.industry || "-"}</TableCell>
                      <TableCell>{customer.email || "-"}</TableCell>
                      <TableCell>{customer.phone || "-"}</TableCell>
                      <TableCell>{getStatusChip(customer.status)}</TableCell>
                      <TableCell align="right">
                        <Stack
                          direction="row"
                          spacing={1}
                          sx={{ justifyContent: "flex-end" }}
                        >
                          <Button
                            size="small"
                            onClick={() => handleViewDetail(customer)}
                          >
                            <Eye sx={{ width: 16, height: 16 }} />
                          </Button>
                          <Button
                            size="small"
                            onClick={() => handleEdit(customer)}
                          >
                            <Edit sx={{ width: 16, height: 16 }} />
                          </Button>
                          <Button
                            size="small"
                            color="error"
                            onClick={() => handleDelete(customer.id)}
                          >
                            <Trash2 sx={{ width: 16, height: 16 }} />
                          </Button>
                        </Stack>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </TableContainer>

          <Stack
            direction="row"
            sx={{
              justifyContent: "space-between",
              alignItems: "center",
              mt: 2,
            }}
          >
            <Typography variant="body2" color="text.secondary">
              共 {total} 条记录,第 {currentPage} /{" "}
              {Math.ceil(total / pageSize) || 1} 页
            </Typography>
            <Stack direction="row" spacing={1}>
              <Button
                size="small"
                disabled={currentPage === 1}
                onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
              >
                上一页
              </Button>
              {Array.from(
                { length: Math.min(5, Math.ceil(total / pageSize)) },
                (_, i) => i + 1,
              ).map((page) => (
                <Button
                  key={page}
                  size="small"
                  variant={currentPage === page ? "contained" : "outlined"}
                  onClick={() => setCurrentPage(page)}
                >
                  {page}
                </Button>
              ))}
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
            </Stack>
          </Stack>
        </CardContent>
      </Card>

      {/* 导入导出对话框 */}
      <ImportExportModal
        open={showImportExport}
        onOpenChange={setShowImportExport}
        data={customers}
        columns={customerColumns}
        fileName="customers"
        onImportSuccess={handleImportSuccess}
      />

      {/* 新增/编辑对话框 */}
      <Dialog
        open={showDialog}
        onClose={() => setShowDialog(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>{selectedCustomer ? "编辑客户" : "新增客户"}</DialogTitle>
        <form onSubmit={handleSubmit}>
          <DialogContent>
            <Box
              sx={{
                display: "grid",
                gridTemplateColumns: "repeat(2, 1fr)",
                gap: 2,
                pt: 1,
              }}
            >
              <TextField
                label="客户名称 *"
                required
                value={formData.name}
                onChange={(e) =>
                  setFormData({ ...formData, name: e.target.value })
                }
                fullWidth
              />
              <TextField
                label="客户代码"
                value={formData.code}
                onChange={(e) =>
                  setFormData({ ...formData, code: e.target.value })
                }
                fullWidth
              />
              <TextField
                label="行业"
                value={formData.industry}
                onChange={(e) =>
                  setFormData({ ...formData, industry: e.target.value })
                }
                fullWidth
              />
              <TextField
                label="网站"
                type="url"
                value={formData.website}
                onChange={(e) =>
                  setFormData({ ...formData, website: e.target.value })
                }
                fullWidth
              />
              <TextField
                label="邮箱"
                type="email"
                value={formData.email}
                onChange={(e) =>
                  setFormData({ ...formData, email: e.target.value })
                }
                fullWidth
              />
              <TextField
                label="电话"
                value={formData.phone}
                onChange={(e) =>
                  setFormData({ ...formData, phone: e.target.value })
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
                sx={{ gridColumn: "span 2" }}
              />
              <Box sx={{ gridColumn: "span 2" }}>
                <Typography variant="caption" color="text.secondary" sx={{ mb: 1, display: "block" }}>
                  客户图片
                </Typography>
                <ImageUpload
                  value={formData.images || []}
                  onChange={(files) => setFormData({ ...formData, images: files })}
                  maxCount={9}
                  accept="image/*"
                  cropEnabled
                  height={150}
                />
              </Box>
              <TextField
                label="备注"
                multiline
                rows={3}
                value={formData.notes}
                onChange={(e) =>
                  setFormData({ ...formData, notes: e.target.value })
                }
                fullWidth
                sx={{ gridColumn: "span 2" }}
              />
            </Box>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setShowDialog(false)}>取消</Button>
            <Button type="submit" variant="contained">
              保存
            </Button>
          </DialogActions>
        </form>
      </Dialog>

      {/* 详情对话框 */}
      <Dialog
        open={showDetailDialog}
        onClose={() => setShowDetailDialog(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>客户详情</DialogTitle>
        {selectedCustomer && (
          <DialogContent>
            <Box
              sx={{
                display: "grid",
                gridTemplateColumns: "repeat(2, 1fr)",
                gap: 2,
              }}
            >
              <Box>
                <Typography variant="caption" color="text.secondary">
                  客户名称
                </Typography>
                <Typography sx={{ fontWeight: "medium" }}>
                  {selectedCustomer.name}
                </Typography>
              </Box>
              <Box>
                <Typography variant="caption" color="text.secondary">
                  客户代码
                </Typography>
                <Typography>{selectedCustomer.code || "-"}</Typography>
              </Box>
              <Box>
                <Typography variant="caption" color="text.secondary">
                  行业
                </Typography>
                <Typography>{selectedCustomer.industry || "-"}</Typography>
              </Box>
              <Box>
                <Typography variant="caption" color="text.secondary">
                  网站
                </Typography>
                <Typography>{selectedCustomer.website || "-"}</Typography>
              </Box>
              <Box>
                <Typography variant="caption" color="text.secondary">
                  邮箱
                </Typography>
                <Typography>{selectedCustomer.email || "-"}</Typography>
              </Box>
              <Box>
                <Typography variant="caption" color="text.secondary">
                  电话
                </Typography>
                <Typography>{selectedCustomer.phone || "-"}</Typography>
              </Box>
              <Box sx={{ gridColumn: "span 2" }}>
                <Typography variant="caption" color="text.secondary">
                  地址
                </Typography>
                <Typography>{selectedCustomer.address || "-"}</Typography>
              </Box>
              <Box>
                <Typography variant="caption" color="text.secondary">
                  状态
                </Typography>
                <Box>{getStatusChip(selectedCustomer.status)}</Box>
              </Box>
              <Box>
                <Typography variant="caption" color="text.secondary">
                  创建时间
                </Typography>
                <Typography>
                  {new Date(selectedCustomer.created_at).toLocaleString(
                    "zh-CN",
                  )}
                </Typography>
              </Box>
              <Box sx={{ gridColumn: "span 2" }}>
                <Typography variant="caption" color="text.secondary">
                  备注
                </Typography>
                <Typography>{selectedCustomer.notes || "-"}</Typography>
              </Box>
            </Box>
          </DialogContent>
        )}
      </Dialog>
    </Box>
  );
};

export default CustomerManagementPage;
