import React, { useState, useEffect } from "react";
import {
  Box,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Chip,
  Card,
  CardContent,
  CardHeader,
  Typography,
} from "@mui/material";
import { Plus, Eye, Users, Search } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { DataTable } from "@/components/DataTable";
import type { ColumnDef } from "@tanstack/react-table";
import { srmApi } from "@/api/srm";
import type { Supplier } from "@/api/srm";
import { toast } from "react-toastify";

const SrmSupplierPage: React.FC = () => {
  const navigate = useNavigate();
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedSupplier, setSelectedSupplier] = useState<Supplier | null>(
    null,
  );
  const [formData, setFormData] = useState({
    supplier_no: "",
    name: "",
    contact_person: "",
    phone: "",
    email: "",
    address: "",
    category: "",
    risk_level: "medium",
    status: "active",
  });

  useEffect(() => {
    loadSuppliers();
  }, []);

  const loadSuppliers = async () => {
    try {
      setLoading(true);
      const response = await srmApi.listSuppliers();
      if (response.success && response.data) {
        const data = response.data as any;
        const items = Array.isArray(data) ? data : data.suppliers || [];
        const adapted = items.map((item: any) => ({
          ...item,
          supplier_no: item.supplier_no || item.supplierNo || "",
          contact_phone:
            item.phone || item.contactPhone || item.contact_phone || "",
          status:
            item.status === "active"
              ? "启用"
              : item.status === "inactive"
                ? "禁用"
                : item.status,
        }));
        setSuppliers(adapted);
      } else {
        setSuppliers([]);
      }
    } catch (err) {
      console.error("加载供应商数据失败:", err);
      setSuppliers([]);
    } finally {
      setLoading(false);
    }
  };

  const getRiskStyle = (level: string) => {
    if (level === "low")
      return { bgcolor: "#dcfce7", color: "#15803d", label: "低" };
    if (level === "medium")
      return { bgcolor: "#fef3c7", color: "#b45309", label: "中" };
    return { bgcolor: "#fee2e2", color: "#b91c1c", label: "高" };
  };

  const getStatusBadge = (status: string) => {
    const statusMap: Record<string, { bg: string; color: string }> = {
      启用: { bg: "#dcfce7", color: "#15803d" },
      禁用: { bg: "#fee2e2", color: "#b91c1c" },
    };
    const colors = statusMap[status] || { bg: "#f1f5f9", color: "#475569" };
    return (
      <Chip
        label={status}
        size="small"
        sx={{ bgcolor: colors.bg, color: colors.color, fontWeight: 500 }}
      />
    );
  };

  const RiskChip: React.FC<{ level: string }> = ({ level }) => {
    const style = getRiskStyle(level);
    return (
      <Chip
        label={style.label}
        size="small"
        sx={{ bgcolor: style.bgcolor, color: style.color, fontWeight: 500 }}
      />
    );
  };

  const columns: ColumnDef<Supplier>[] = [
    { accessorKey: "supplier_no", header: "编号" },
    { accessorKey: "name", header: "名称" },
    { accessorKey: "contact_person", header: "联系人" },
    { accessorKey: "contact_phone", header: "电话" },
    { accessorKey: "category", header: "类别" },
    {
      accessorKey: "risk_level",
      header: "风险等级",
      cell: ({ row }) => (
        <RiskChip level={row.original.risk_level || "medium"} />
      ),
    },
    {
      accessorKey: "status",
      header: "状态",
      cell: ({ row }) => getStatusBadge(row.original.status),
    },
    {
      id: "actions",
      header: "操作",
      cell: ({ row }) => (
        <Box sx={{ display: "flex", gap: 1 }}>
          <Button
            size="small"
            onClick={() => navigate(`/srm/suppliers/${row.original.id}`)}
            startIcon={<Eye style={{ width: 16, height: 16 }} />}
          >
            详情
          </Button>
        </Box>
      ),
    },
  ];

  const filteredSuppliers = suppliers.filter((s) => {
    return (
      s.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.supplier_no.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (s.contact_person &&
        s.contact_person.toLowerCase().includes(searchTerm.toLowerCase()))
    );
  });

  const handleView = (supplier: Supplier) => {
    setSelectedSupplier(supplier);
    setShowDetailModal(true);
  };

  const handleCreate = () => {
    setFormData({
      supplier_no: "",
      name: "",
      contact_person: "",
      phone: "",
      email: "",
      address: "",
      category: "",
      risk_level: "medium",
      status: "active",
    });
    setShowCreateModal(true);
  };

  const handleSave = async () => {
    try {
      await srmApi.createSupplier({
        supplier_no: formData.supplier_no,
        name: formData.name,
        contact_person: formData.contact_person,
        phone: formData.phone,
        email: formData.email,
        address: formData.address,
        category: formData.category,
        risk_level: formData.risk_level,
        status: formData.status,
        legal_name: formData.name,
      });
      toast.success("供应商创建成功");
      setShowCreateModal(false);
      loadSuppliers();
    } catch (err) {
      toast.error("创建失败");
      console.error("创建供应商失败:", err);
    }
  };

  const stats = {
    total: suppliers.length,
    active: suppliers.filter((s) => s.status === "启用").length,
    lowRisk: suppliers.filter((s) => s.risk_level === "low").length,
    highRisk: suppliers.filter((s) => s.risk_level === "high").length,
  };

  if (loading) {
    return (
      <Box
        sx={{
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "linear-gradient(135deg, #faf5ff 0%, #f8fafc 100%)",
        }}
      >
        <Box sx={{ textAlign: "center" }}>
          <Box
            sx={{
              width: 48,
              height: 48,
              border: 4,
              borderColor: "#a855f7",
              borderTopColor: "#6366f1",
              borderRadius: "50%",
              animation: "spin 1s linear infinite",
              mx: "auto",
              mb: 2,
            }}
          />
          <Typography sx={{ color: "slate.600" }}>加载中...</Typography>
        </Box>
      </Box>
    );
  }

  return (
    <Box
      sx={{
        minHeight: "100vh",
        background: "linear-gradient(135deg, #faf5ff 0%, #f8fafc 100%)",
      }}
    >
      <Box
        component="header"
        sx={{
          bgcolor: "background.paper",
          boxShadow: 1,
          borderBottom: 1,
          borderColor: "divider",
          position: "sticky",
          top: 0,
          zIndex: 10,
        }}
      >
        <Box sx={{ maxWidth: 1280, mx: "auto", px: { xs: 2, sm: 3, lg: 4 } }}>
          <Box
            sx={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              height: 64,
            }}
          >
            <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
              <Box
                sx={{
                  width: 40,
                  height: 40,
                  background:
                    "linear-gradient(135deg, #a855f7 0%, #6366f1 100%)",
                  borderRadius: 2,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Users sx={{ width: 24, height: 24, color: "white" }} />
              </Box>
              <Box>
                <Typography
                  variant="h6"
                  sx={{
                    fontWeight: 700,
                    color: "slate.900",
                    fontSize: "1.25rem",
                  }}
                >
                  供应商管理
                </Typography>
                <Typography
                  variant="caption"
                  sx={{ color: "slate.500", fontSize: "0.75rem" }}
                >
                  Supplier Management
                </Typography>
              </Box>
            </Box>
            <Button
              variant="contained"
              startIcon={<Plus style={{ width: 18, height: 18 }} />}
              onClick={handleCreate}
              sx={{ bgcolor: "#a855f7", "&:hover": { bgcolor: "#6366f1" } }}
            >
              新增供应商
            </Button>
          </Box>
        </Box>
      </Box>

      <Box
        component="main"
        sx={{ maxWidth: 1280, mx: "auto", px: { xs: 2, sm: 3, lg: 4 }, py: 4 }}
      >
        <Box
          sx={{
            display: "grid",
            gridTemplateColumns: { xs: "repeat(1, 1fr)", md: "repeat(4, 1fr)" },
            gap: 2,
            mb: 4,
          }}
        >
          <Card sx={{ bgcolor: "#faf5ff" }}>
            <CardContent sx={{ p: 2 }}>
              <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
                <Box
                  sx={{
                    width: 40,
                    height: 40,
                    bgcolor: "#ede9fe",
                    borderRadius: 2,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <Users sx={{ width: 20, height: 20, color: "#a855f7" }} />
                </Box>
                <Box>
                  <Typography
                    variant="body2"
                    sx={{ color: "slate.600", fontSize: "0.875rem" }}
                  >
                    供应商总数
                  </Typography>
                  <Typography
                    variant="h5"
                    sx={{ fontWeight: 700, color: "slate.900" }}
                  >
                    {stats.total}
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
          <Card>
            <CardContent sx={{ p: 2 }}>
              <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
                <Box
                  sx={{
                    width: 40,
                    height: 40,
                    bgcolor: "#dcfce7",
                    borderRadius: 2,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <Users sx={{ width: 20, height: 20, color: "#16a34a" }} />
                </Box>
                <Box>
                  <Typography
                    variant="body2"
                    sx={{ color: "slate.600", fontSize: "0.875rem" }}
                  >
                    已启用
                  </Typography>
                  <Typography
                    variant="h5"
                    sx={{ fontWeight: 700, color: "slate.900" }}
                  >
                    {stats.active}
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
          <Card>
            <CardContent sx={{ p: 2 }}>
              <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
                <Box
                  sx={{
                    width: 40,
                    height: 40,
                    bgcolor: "#dcfce7",
                    borderRadius: 2,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <Users sx={{ width: 20, height: 20, color: "#16a34a" }} />
                </Box>
                <Box>
                  <Typography
                    variant="body2"
                    sx={{ color: "slate.600", fontSize: "0.875rem" }}
                  >
                    低风险
                  </Typography>
                  <Typography
                    variant="h5"
                    sx={{ fontWeight: 700, color: "slate.900" }}
                  >
                    {stats.lowRisk}
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
          <Card>
            <CardContent sx={{ p: 2 }}>
              <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
                <Box
                  sx={{
                    width: 40,
                    height: 40,
                    bgcolor: "#fee2e2",
                    borderRadius: 2,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <Users sx={{ width: 20, height: 20, color: "#dc2626" }} />
                </Box>
                <Box>
                  <Typography
                    variant="body2"
                    sx={{ color: "slate.600", fontSize: "0.875rem" }}
                  >
                    高风险
                  </Typography>
                  <Typography
                    variant="h5"
                    sx={{ fontWeight: 700, color: "slate.900" }}
                  >
                    {stats.highRisk}
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Box>

        <Card>
          <CardHeader
            sx={{
              display: "flex",
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "space-between",
              pb: 0,
            }}
          >
            <Typography
              variant="h6"
              sx={{ display: "flex", alignItems: "center", gap: 1 }}
            >
              <Users style={{ width: 20, height: 20, color: "#a855f7" }} />
              供应商列表
            </Typography>
          </CardHeader>
          <CardContent>
            <Box sx={{ display: "flex", flexWrap: "wrap", gap: 2, mb: 3 }}>
              <TextField
                size="small"
                placeholder="搜索供应商名称或编号..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                sx={{ minWidth: 250 }}
                slotProps={{
                  input: {
                    startAdornment: (
                      <Search
                        style={{ width: 18, height: 18, marginRight: 8 }}
                      />
                    ),
                  },
                }}
              />
            </Box>
            <DataTable
              columns={columns}
              data={filteredSuppliers}
              enablePagination
            />
          </CardContent>
        </Card>
      </Box>

      <Dialog
        open={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>新增供应商</DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 1, display: "flex", flexDirection: "column", gap: 2 }}>
            <Box
              sx={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 2 }}
            >
              <TextField
                fullWidth
                label="编号 *"
                value={formData.supplier_no}
                onChange={(e) =>
                  setFormData({ ...formData, supplier_no: e.target.value })
                }
                placeholder="请输入供应商编号"
              />
              <TextField
                fullWidth
                label="名称 *"
                value={formData.name}
                onChange={(e) =>
                  setFormData({ ...formData, name: e.target.value })
                }
                placeholder="请输入供应商名称"
              />
              <TextField
                fullWidth
                label="联系人"
                value={formData.contact_person}
                onChange={(e) =>
                  setFormData({ ...formData, contact_person: e.target.value })
                }
                placeholder="请输入联系人"
              />
              <TextField
                fullWidth
                label="电话"
                value={formData.phone}
                onChange={(e) =>
                  setFormData({ ...formData, phone: e.target.value })
                }
                placeholder="请输入联系电话"
              />
              <TextField
                fullWidth
                label="邮箱"
                type="email"
                value={formData.email}
                onChange={(e) =>
                  setFormData({ ...formData, email: e.target.value })
                }
                placeholder="请输入邮箱"
              />
              <TextField
                fullWidth
                label="类别"
                value={formData.category}
                onChange={(e) =>
                  setFormData({ ...formData, category: e.target.value })
                }
                placeholder="请输入类别"
              />
              <TextField
                fullWidth
                select
                label="风险等级"
                value={formData.risk_level}
                onChange={(e) =>
                  setFormData({ ...formData, risk_level: e.target.value })
                }
              >
                <option value="low">低风险</option>
                <option value="medium">中风险</option>
                <option value="high">高风险</option>
              </TextField>
              <TextField
                fullWidth
                select
                label="状态"
                value={formData.status}
                onChange={(e) =>
                  setFormData({ ...formData, status: e.target.value })
                }
              >
                <option value="active">启用</option>
                <option value="inactive">禁用</option>
              </TextField>
            </Box>
            <TextField
              fullWidth
              label="地址"
              value={formData.address}
              onChange={(e) =>
                setFormData({ ...formData, address: e.target.value })
              }
              placeholder="请输入地址"
              multiline
              rows={2}
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button variant="outlined" onClick={() => setShowCreateModal(false)}>
            取消
          </Button>
          <Button
            variant="contained"
            onClick={handleSave}
            sx={{ bgcolor: "#a855f7" }}
          >
            保存
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default SrmSupplierPage;
