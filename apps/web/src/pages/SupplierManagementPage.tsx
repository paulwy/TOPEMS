import { Button, Card, CardContent, CardHeader, Chip, Typography, Dialog, DialogTitle, DialogContent, DialogActions, FormControl, InputLabel, Select, MenuItem, Table, TableBody, TableCell, TableHead, TableRow, Checkbox, Box, TextField } from "@mui/material";
import React, { useState, useEffect } from "react";
import type {
  Supplier,
  CreateSupplierRequest,
  UpdateSupplierRequest,
} from "@/api/scm";
import { scmApi } from "@/api/scm";
import { useAppStore } from "@/store";
import { LoadingSpinner } from "@/components/LoadingSpinner";
import { EmptyState } from "@/components/EmptyState";
import { Search, Plus, Edit, Trash2, Eye } from "lucide-react";

const SupplierManagementPage: React.FC = () => {
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize] = useState(10);
  const [total, setTotal] = useState(0);
  const [showDialog, setShowDialog] = useState(false);
  const [showDetailDialog, setShowDetailDialog] = useState(false);
  const [selectedSupplier, setSelectedSupplier] = useState<Supplier | null>(
    null,
  );
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [formData, setFormData] = useState<CreateSupplierRequest>({
    name: "",
    short_name: "",
    contact_name: "",
    contact_phone: "",
    email: "",
    address: "",
    bank_account: "",
    tax_number: "",
  });

  const { addNotification } = useAppStore();

  useEffect(() => {
    loadSuppliers();
  }, [currentPage, pageSize, searchTerm, statusFilter]);

  const loadSuppliers = async () => {
    try {
      setLoading(true);
      const params: any = {
        page: currentPage,
        page_size: pageSize,
      };
      if (searchTerm) params.search = searchTerm;
      if (statusFilter !== "all") params.status = statusFilter;

      const response = await scmApi.suppliers.list(params);
      if (response.success && response.data) {
        setSuppliers(response.data.items || []);
        setTotal(response.data.total || 0);
      }
    } catch (error) {
      console.error("加载供应商列表失败:", error);
      addNotification({
        type: "error",
        title: "加载失败",
        message: "无法加载供应商列表",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (selectedSupplier) {
        await scmApi.suppliers.update(
          selectedSupplier.id,
          formData as UpdateSupplierRequest,
        );
        addNotification({
          type: "success",
          title: "更新成功",
          message: "供应商信息已更新",
        });
      } else {
        await scmApi.suppliers.create(formData);
        addNotification({
          type: "success",
          title: "创建成功",
          message: "新供应商已创建",
        });
      }
      setShowDialog(false);
      resetForm();
      loadSuppliers();
    } catch (error) {
      console.error("操作失败:", error);
      addNotification({
        type: "error",
        title: "操作失败",
        message: selectedSupplier ? "更新供应商失败" : "创建供应商失败",
      });
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm("确定要删除这个供应商吗?")) return;
    try {
      await scmApi.suppliers.delete(id);
      addNotification({
        type: "success",
        title: "删除成功",
        message: "供应商已删除",
      });
      loadSuppliers();
    } catch (error) {
      console.error("删除失败:", error);
      addNotification({
        type: "error",
        title: "删除失败",
        message: "无法删除供应商",
      });
    }
  };

  const handleEdit = (supplier: Supplier) => {
    setSelectedSupplier(supplier);
    setFormData({
      name: supplier.name,
      short_name: supplier.short_name || "",
      contact_name: supplier.contact_name || "",
      contact_phone: supplier.contact_phone || "",
      email: supplier.email || "",
      address: supplier.address || "",
      bank_account: supplier.bank_account || "",
      tax_number: supplier.tax_number || "",
    });
    setShowDialog(true);
  };

  const handleViewDetail = (supplier: Supplier) => {
    setSelectedSupplier(supplier);
    setShowDetailDialog(true);
  };

  const resetForm = () => {
    setSelectedSupplier(null);
    setFormData({
      name: "",
      short_name: "",
      contact_name: "",
      contact_phone: "",
      email: "",
      address: "",
      bank_account: "",
      tax_number: "",
    });
  };

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id],
    );
  };

  const toggleSelectAll = () => {
    if (selectedIds.length === suppliers.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(suppliers.map((s) => s.id));
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
      active: { label: "活跃", variant: "default" },
      inactive: { label: "非活跃", variant: "secondary" },
      blocked: { label: "已冻结", variant: "destructive" },
    };
    const s = statusMap[status] || { label: status, variant: "outline" };
    return <Chip size="small" variant={s.variant === "outline" ? "outlined" : "filled"} label={s.label} />;
  };

  if (loading) return <LoadingSpinner />;

  return (
    <Box sx={{ display: "flex", flexDirection: "column", gap: 3 }}>
      <Card>
        <CardHeader>
          <Typography variant="h6" sx={{ fontWeight: 600 }}>供应商管理</Typography>
          <Typography variant="body2" sx={{ color: "grey.500" }}>
            管理供应商信息,包括基本信息、联系方式、银行账户等
          </Typography>
        </CardHeader>
        <CardContent>
          <Box sx={{ display: 'flex', flexDirection: { xs: 'column', sm: 'row' }, gap: 2, mb: 3 }}>
            <Box sx={{ flex: 1, position: 'relative' }}>
              <Box sx={{ position: 'absolute', left: 1, top: '50%', transform: 'translateY(-50%)', zIndex: 1 }}>
                <Search sx={{ width: 16, height: 16 }} />
              </Box>
              <TextField
                placeholder="搜索供应商名称或联系人..."
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                  setCurrentPage(1);
                }}
                size="small"
                fullWidth
                sx={{ pl: 4 }}
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
                <MenuItem value="blocked">已冻结</MenuItem>
              </Select>
            </FormControl>
            <Button
              onClick={() => {
                resetForm();
                setShowDialog(true);
              }}
            >
              <Plus sx={{ mr: 1, width: 16, height: 16 }} />
              新增供应商
            </Button>
          </Box>

          {selectedIds.length > 0 && (
            <Box sx={{ mb: 2, p: 1.5, bgcolor: 'action.hover', borderRadius: 1, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <Typography variant="body2">
                已选择 {selectedIds.length} 个供应商
              </Typography>
              <Button
                variant="contained"
                size="small"
                onClick={() => setSelectedIds([])}
              >
                清除选择
              </Button>
            </Box>
          )}

          <Box sx={{ borderRadius: 1, border: 1, borderColor: 'divider' }}>
            <Table>
              <TableHead>
                <TableRow>
                  <TableHead sx={{ width: 50 }}>
                    <Checkbox
                      checked={
                        selectedIds.length === suppliers.length &&
                        suppliers.length > 0
                      }
                      onChange={toggleSelectAll}
                    />
                  </TableHead>
                  <TableHead>供应商名称</TableHead>
                  <TableHead>简称</TableHead>
                  <TableHead>联系人</TableHead>
                  <TableHead>联系电话</TableHead>
                  <TableHead>邮箱</TableHead>
                  <TableHead>状态</TableHead>
                  <TableHead sx={{ textAlign: 'right' }}>操作</TableHead>
                </TableRow>
              </TableHead>
              <TableBody>
                {suppliers.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} sx={{ textAlign: 'center' }}>
                      <EmptyState
                        title="暂无供应商数据"
                        description="点击上方按钮添加第一个供应商"
                      />
                    </TableCell>
                  </TableRow>
                ) : (
                  suppliers.map((supplier) => (
                    <TableRow key={supplier.id}>
                      <TableCell>
                        <Checkbox
                          checked={selectedIds.includes(supplier.id)}
                          onChange={() => toggleSelect(supplier.id)}
                        />
                      </TableCell>
                      <TableCell sx={{ fontWeight: 500 }}>
                        {supplier.name}
                      </TableCell>
                      <TableCell>{supplier.short_name || "-"}</TableCell>
                      <TableCell>{supplier.contact_name || "-"}</TableCell>
                      <TableCell>{supplier.contact_phone || "-"}</TableCell>
                      <TableCell>{supplier.email || "-"}</TableCell>
                      <TableCell>{getStatusBadge(supplier.status)}</TableCell>
                      <TableCell sx={{ textAlign: 'right' }}>
                        <Button
                          variant="text"
                          size="small"
                          onClick={() => handleViewDetail(supplier)}
                        >
                          <Eye sx={{ width: 16, height: 16 }} />
                        </Button>
                        <Button
                          variant="text"
                          size="small"
                          onClick={() => handleEdit(supplier)}
                        >
                          <Edit sx={{ width: 16, height: 16 }} />
                        </Button>
                        <Button
                          variant="text"
                          size="small"
                          onClick={() => handleDelete(supplier.id)}
                        >
                          <Trash2 sx={{ width: 16, height: 16 }} />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </Box>

          <Box sx={{ mt: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Typography variant="body2" sx={{ color: 'text.secondary' }}>
              共 {total} 条记录,第 {currentPage} /{" "}
              {Math.ceil(total / pageSize) || 1} 页
            </Typography>
            <Box sx={{ display: 'flex', gap: 0.5 }}>
              <Button
                size="small"
                onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                disabled={currentPage === 1}
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
                onClick={() =>
                  setCurrentPage(
                    Math.min(Math.ceil(total / pageSize), currentPage + 1),
                  )
                }
                disabled={currentPage >= Math.ceil(total / pageSize)}
              >
                下一页
              </Button>
            </Box>
          </Box>
        </CardContent>
      </Card>

      {/* 新增/编辑对话框 */}
      <Dialog open={showDialog} onClose={() => setShowDialog(false)} maxWidth="md">
        <DialogTitle>
          {selectedSupplier ? "编辑供应商" : "新增供应商"}
        </DialogTitle>
        <DialogContent>
          <Typography variant="body2" sx={{ color: 'text.secondary', mb: 2 }}>
            {selectedSupplier ? "修改供应商信息" : "填写新供应商信息"}
          </Typography>
          <form onSubmit={handleSubmit}>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
              <Box sx={{ display: 'flex', gap: 2 }}>
                <TextField
                  label="供应商名称 *"
                  value={formData.name}
                  onChange={(e) =>
                    setFormData({ ...formData, name: e.target.value })
                  }
                  size="small"
                  fullWidth
                />
                <TextField
                  label="简称"
                  value={formData.short_name}
                  onChange={(e) =>
                    setFormData({ ...formData, short_name: e.target.value })
                  }
                  size="small"
                  fullWidth
                />
              </Box>
              <Box sx={{ display: 'flex', gap: 2 }}>
                <TextField
                  label="联系人"
                  value={formData.contact_name}
                  onChange={(e) =>
                    setFormData({ ...formData, contact_name: e.target.value })
                  }
                  size="small"
                  fullWidth
                />
                <TextField
                  label="联系电话"
                  value={formData.contact_phone}
                  onChange={(e) =>
                    setFormData({ ...formData, contact_phone: e.target.value })
                  }
                  size="small"
                  fullWidth
                />
              </Box>
              <Box sx={{ display: 'flex', gap: 2 }}>
                <TextField
                  label="邮箱"
                  type="email"
                  value={formData.email}
                  onChange={(e) =>
                    setFormData({ ...formData, email: e.target.value })
                  }
                  size="small"
                  fullWidth
                />
                <TextField
                  label="银行账户"
                  value={formData.bank_account}
                  onChange={(e) =>
                    setFormData({ ...formData, bank_account: e.target.value })
                  }
                  size="small"
                  fullWidth
                />
              </Box>
              <TextField
                label="地址"
                value={formData.address}
                onChange={(e) =>
                  setFormData({ ...formData, address: e.target.value })
                }
                size="small"
                fullWidth
              />
              <TextField
                label="税号"
                value={formData.tax_number}
                onChange={(e) =>
                  setFormData({ ...formData, tax_number: e.target.value })
                }
                size="small"
                fullWidth
              />
            </Box>
            <DialogActions sx={{ mt: 3 }}>
              <Button
                type="button"
                variant="outlined"
                onClick={() => setShowDialog(false)}
              >
                取消
              </Button>
              <Button type="submit">保存</Button>
            </DialogActions>
          </form>
        </DialogContent>
      </Dialog>

      {/* 详情对话框 */}
      <Dialog open={showDetailDialog} onClose={() => setShowDetailDialog(false)} maxWidth="md">
        <DialogTitle>供应商详情</DialogTitle>
        <DialogContent>
          {selectedSupplier && (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2 }}>
                <Box>
                  <Typography variant="caption" sx={{ color: 'text.secondary' }}>供应商名称</Typography>
                  <Typography sx={{ fontWeight: 500 }}>{selectedSupplier.name}</Typography>
                </Box>
                <Box>
                  <Typography variant="caption" sx={{ color: 'text.secondary' }}>简称</Typography>
                  <Typography>{selectedSupplier.short_name || "-"}</Typography>
                </Box>
                <Box>
                  <Typography variant="caption" sx={{ color: 'text.secondary' }}>联系人</Typography>
                  <Typography>{selectedSupplier.contact_name || "-"}</Typography>
                </Box>
                <Box>
                  <Typography variant="caption" sx={{ color: 'text.secondary' }}>联系电话</Typography>
                  <Typography>{selectedSupplier.contact_phone || "-"}</Typography>
                </Box>
                <Box>
                  <Typography variant="caption" sx={{ color: 'text.secondary' }}>邮箱</Typography>
                  <Typography>{selectedSupplier.email || "-"}</Typography>
                </Box>
                <Box>
                  <Typography variant="caption" sx={{ color: 'text.secondary' }}>银行账户</Typography>
                  <Typography>{selectedSupplier.bank_account || "-"}</Typography>
                </Box>
                <Box sx={{ gridColumn: '1 / -1' }}>
                  <Typography variant="caption" sx={{ color: 'text.secondary' }}>地址</Typography>
                  <Typography>{selectedSupplier.address || "-"}</Typography>
                </Box>
                <Box>
                  <Typography variant="caption" sx={{ color: 'text.secondary' }}>税号</Typography>
                  <Typography>{selectedSupplier.tax_number || "-"}</Typography>
                </Box>
                <Box>
                  <Typography variant="caption" sx={{ color: 'text.secondary' }}>状态</Typography>
                  <Box sx={{ mt: 0.5 }}>{getStatusBadge(selectedSupplier.status)}</Box>
                </Box>
                <Box>
                  <Typography variant="caption" sx={{ color: 'text.secondary' }}>创建时间</Typography>
                  <Typography>
                    {new Date(selectedSupplier.created_at).toLocaleString(
                      "zh-CN",
                    )}
                  </Typography>
                </Box>
                <Box>
                  <Typography variant="caption" sx={{ color: 'text.secondary' }}>更新时间</Typography>
                  <Typography>
                    {new Date(selectedSupplier.updated_at).toLocaleString(
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

export default SupplierManagementPage;
