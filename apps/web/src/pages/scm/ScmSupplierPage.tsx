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
  CircularProgress,
} from "@mui/material";
import { Plus, Eye, Users, Search } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { DataTable } from "@/components/DataTable";
import type { ColumnDef } from "@tanstack/react-table";
import { scmApi } from "@/api/scm";
import type { Supplier } from "@/api/scm";
import { toast } from "react-toastify";

const ScmSupplierPage: React.FC = () => {
  const navigate = useNavigate();
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [total, setTotal] = useState(0);
  const [searchTerm, setSearchTerm] = useState("");
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedSupplier, setSelectedSupplier] = useState<Supplier | null>(
    null,
  );
  const [formData, setFormData] = useState({
    name: "",
    short_name: "",
    contact_name: "",
    contact_phone: "",
    email: "",
    address: "",
    bank_account: "",
    tax_number: "",
    status: "active",
  });

  useEffect(() => {
    loadSuppliers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentPage, pageSize, searchTerm]);

  const loadSuppliers = async () => {
    try {
      setLoading(true);
      const response = await scmApi.suppliers.list({
        page: currentPage,
        pageSize: pageSize,
      });
      if (response.success && response.data) {
        setSuppliers(response.data.items || []);
        setTotal(response.data.total || 0);
      }
    } catch (error) {
      toast.error("加载供应商失败");
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async () => {
    try {
      const response = await scmApi.suppliers.create(formData);
      if (response.success) {
        toast.success("创建成功");
        setShowCreateModal(false);
        loadSuppliers();
      }
    } catch (error) {
      toast.error("创建失败");
    }
  };

  const handleViewDetail = (supplier: Supplier) => {
    setSelectedSupplier(supplier);
    setShowDetailModal(true);
  };

  const columns: ColumnDef<Supplier>[] = [
    {
      accessorKey: "id",
      header: "ID",
    },
    {
      accessorKey: "name",
      header: "供应商名称",
    },
    {
      accessorKey: "short_name",
      header: "简称",
    },
    {
      accessorKey: "contact_name",
      header: "联系人",
    },
    {
      accessorKey: "contact_phone",
      header: "联系电话",
    },
    {
      accessorKey: "email",
      header: "邮箱",
    },
    {
      accessorKey: "status",
      header: "状态",
      cell: ({ getValue }) => (
        <Chip
          label={getValue<string>() === "active" ? "活跃" : "禁用"}
          color={getValue<string>() === "active" ? "success" : "error"}
          size="small"
        />
      ),
    },
    {
      id: "actions",
      header: "操作",
      cell: ({ row }) => (
        <Box sx={{ display: "flex", gap: 1 }}>
          <Button
            size="small"
            onClick={() => handleViewDetail(row.original)}
            startIcon={<Eye size={14} />}
          >
            查看
          </Button>
          <Button
            size="small"
            onClick={() => navigate(`/scm/suppliers/${row.original.id}`)}
          >
            详情
          </Button>
        </Box>
      ),
    },
  ];

  return (
    <Box sx={{ p: 4 }}>
      <Card>
        <CardHeader
          title={
            <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
              <Users sx={{ width: 24, height: 24 }} />
              <Typography variant="h5">供应商管理</Typography>
            </Box>
          }
          action={
            <Button
              variant="contained"
              onClick={() => setShowCreateModal(true)}
              startIcon={<Plus size={18} />}
            >
              新增供应商
            </Button>
          }
        />
        <CardContent>
          {loading ? (
            <Box sx={{ display: "flex", justifyContent: "center", py: 8 }}>
              <CircularProgress />
            </Box>
          ) : (
            <DataTable
              columns={columns}
              data={suppliers}
              totalItems={total}
              currentPage={currentPage}
              pageSize={pageSize}
              onPageChange={setCurrentPage}
              onPageSizeChange={setPageSize}
            />
          )}
        </CardContent>
      </Card>

      <Dialog
        open={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>新增供应商</DialogTitle>
        <DialogContent>
          <Box
            sx={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: 2,
              mt: 2,
            }}
          >
            <TextField
              label="供应商名称"
              value={formData.name}
              onChange={(e) =>
                setFormData({ ...formData, name: e.target.value })
              }
              fullWidth
              required
            />
            <TextField
              label="简称"
              value={formData.short_name}
              onChange={(e) =>
                setFormData({ ...formData, short_name: e.target.value })
              }
              fullWidth
            />
            <TextField
              label="联系人"
              value={formData.contact_name}
              onChange={(e) =>
                setFormData({ ...formData, contact_name: e.target.value })
              }
              fullWidth
            />
            <TextField
              label="联系电话"
              value={formData.contact_phone}
              onChange={(e) =>
                setFormData({ ...formData, contact_phone: e.target.value })
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
              label="银行账户"
              value={formData.bank_account}
              onChange={(e) =>
                setFormData({ ...formData, bank_account: e.target.value })
              }
              fullWidth
            />
            <TextField
              label="税号"
              value={formData.tax_number}
              onChange={(e) =>
                setFormData({ ...formData, tax_number: e.target.value })
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
              multiline
              rows={2}
              sx={{ gridColumn: "1 / -1" }}
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowCreateModal(false)}>取消</Button>
          <Button variant="contained" onClick={handleCreate}>
            创建
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog
        open={showDetailModal}
        onClose={() => setShowDetailModal(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>供应商详情</DialogTitle>
        <DialogContent>
          {selectedSupplier && (
            <Box sx={{ mt: 2 }}>
              <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
                供应商名称
              </Typography>
              <Typography>{selectedSupplier.name}</Typography>
              <Typography variant="subtitle1" sx={{ fontWeight: 600, mt: 2 }}>
                简称
              </Typography>
              <Typography>{selectedSupplier.short_name || "-"}</Typography>
              <Typography variant="subtitle1" sx={{ fontWeight: 600, mt: 2 }}>
                联系人
              </Typography>
              <Typography>{selectedSupplier.contact_name || "-"}</Typography>
              <Typography variant="subtitle1" sx={{ fontWeight: 600, mt: 2 }}>
                联系电话
              </Typography>
              <Typography>{selectedSupplier.contact_phone || "-"}</Typography>
              <Typography variant="subtitle1" sx={{ fontWeight: 600, mt: 2 }}>
                邮箱
              </Typography>
              <Typography>{selectedSupplier.email || "-"}</Typography>
              <Typography variant="subtitle1" sx={{ fontWeight: 600, mt: 2 }}>
                地址
              </Typography>
              <Typography>{selectedSupplier.address || "-"}</Typography>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowDetailModal(false)}>关闭</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default ScmSupplierPage;
