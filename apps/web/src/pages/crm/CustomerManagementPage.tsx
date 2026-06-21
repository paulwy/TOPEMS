import React, { useState, useEffect, useMemo } from "react";
import {
  Button,
  TextField,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Chip,
  Box,
  Typography,
} from "@mui/material";
import type {
  Customer,
  CreateCustomerRequest,
  UpdateCustomerRequest,
} from "@/api/modules/crm/crm";
import { crmApi } from "@/api/modules/crm/crm";
import { useAppStore } from "@/store";
import { logger } from "@/utils/logger";
import { DataExport } from "@/components/common";
import { Plus, Edit, Trash2, Eye, Download, Upload } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { ListPageTemplate, type ColumnDef } from "@/components/templates";
import type { RowAction, FilterConfig } from "@/components/templates";

const customerColumns = [
  { key: "name", title: "客户名称" },
  { key: "code", title: "客户代码" },
  { key: "industry", title: "行业" },
  { key: "website", title: "网站" },
  { key: "email", title: "邮箱" },
  { key: "phone", title: "电话" },
  { key: "address", title: "地址" },
  { key: "status", title: "状态" },
  { key: "notes", title: "备注" },
  { key: "created_at", title: "创建时间" },
];

const CustomerManagementPage: React.FC = () => {
  const navigate = useNavigate();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("");
  const [showDialog, setShowDialog] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(
    null,
  );
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
  const [pagination, setPagination] = useState({
    page: 0,
    pageSize: 20,
    total: 0,
  });

  const { addNotification } = useAppStore();

  useEffect(() => {
    loadCustomers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchTerm, statusFilter, pagination.page, pagination.pageSize]);

  const loadCustomers = async () => {
    try {
      setLoading(true);
      const params: any = {
        page: pagination.page + 1,
        page_size: pagination.pageSize,
      };
      if (searchTerm) params.search = searchTerm;
      if (statusFilter) params.status = statusFilter;

      const response = await crmApi.customers.list(params);
      if (response.success && response.data) {
        setCustomers(response.data.items || []);
        setPagination((prev) => ({
          ...prev,
          total: response.data.total || 0,
        }));
      }
    } catch (error) {
      logger.error("加载客户列表失败:", error);
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
      logger.error("操作失败:", error);
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
      logger.error("删除失败:", error);
      addNotification({
        type: "error",
        title: "删除失败",
        message: "无法删除客户",
      });
    }
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

  const columns = useMemo<ColumnDef<Customer>[]>(
    () => [
      {
        id: "name",
        label: "客户名称",
        render: (row) => (
          <Typography variant="body2" sx={{ fontWeight: 500 }}>
            {row.name}
          </Typography>
        ),
      },
      {
        id: "code",
        label: "客户代码",
        render: (row) => row.code || "-",
      },
      {
        id: "industry",
        label: "行业",
        render: (row) => row.industry || "-",
      },
      {
        id: "phone",
        label: "电话",
        render: (row) => row.phone || "-",
      },
      {
        id: "email",
        label: "邮箱",
        render: (row) => row.email || "-",
      },
      {
        id: "status",
        label: "状态",
        render: (row) => getStatusChip(row.status),
      },
    ],
    [],
  );

  const rowActions = useMemo<RowAction<Customer>[]>(
    () => [
      {
        label: "查看",
        icon: <Eye size={16} />,
        onClick: (row) => handleViewDetail(row),
      },
      {
        label: "编辑",
        icon: <Edit size={16} />,
        onClick: (row) => handleEdit(row),
      },
      {
        label: "删除",
        icon: <Trash2 size={16} />,
        color: "error",
        onClick: (row) => handleDelete(row.id),
        confirm: true,
        confirmMessage: "确定要删除这个客户吗?",
      },
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );

  const filters = useMemo<FilterConfig[]>(
    () => [
      {
        id: "status",
        label: "状态",
        type: "select",
        options: [
          { value: "", label: "全部" },
          { value: "active", label: "活跃" },
          { value: "inactive", label: "非活跃" },
          { value: "prospect", label: "潜在" },
        ],
        value: statusFilter,
        onChange: (value) => {
          setStatusFilter(value as string);
        },
      },
    ],
    [statusFilter],
  );

  return (
    <>
      <ListPageTemplate<Customer>
        title="客户管理"
        subtitle="管理客户信息，包括客户基本信息、联系方式等"
        backButton={{
          href: "/dashboard",
        }}
        columns={columns}
        data={customers}
        loading={loading}
        searchable
        searchPlaceholder="搜索客户名称或代码..."
        searchValue={searchTerm}
        onSearch={(value) => {
          setSearchTerm(value);
        }}
        filters={filters}
        rowActions={rowActions}
        pagination={{
          page: pagination.page,
          pageSize: pagination.pageSize,
          total: pagination.total,
          onPageChange: (_, page) => {
            setPagination((prev) => ({ ...prev, page }));
          },
          onPageSizeChange: (_, pageSize) => {
            setPagination((prev) => ({ ...prev, pageSize, page: 0 }));
          },
        }}
        actions={[
          {
            label: "导入",
            icon: <Upload size={18} />,
            onClick: () => {},
            variant: "outlined",
          },
          {
            label: "导出",
            icon: <Download size={18} />,
            onClick: () => {},
            variant: "outlined",
          },
          {
            label: "新建客户",
            icon: <Plus size={18} />,
            onClick: () => {
              resetForm();
              setShowDialog(true);
            },
            variant: "contained",
          },
        ]}
        headerContent={
          <DataExport
            data={customers as unknown as Record<string, unknown>[]}
            fields={customerColumns}
            defaultFileName="客户数据"
            buttonText=""
          />
        }
      />

      <Dialog
        open={showDialog}
        onClose={() => setShowDialog(false)}
        maxWidth="md"
      >
        <DialogTitle>{selectedCustomer ? "编辑客户" : "新建客户"}</DialogTitle>
        <DialogContent>
          <Box component="form" onSubmit={handleSubmit} sx={{ mt: 2 }}>
            <TextField
              label="客户名称"
              value={formData.name}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, name: e.target.value }))
              }
              fullWidth
              margin="normal"
              required
            />
            <TextField
              label="客户代码"
              value={formData.code}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, code: e.target.value }))
              }
              fullWidth
              margin="normal"
            />
            <TextField
              label="行业"
              value={formData.industry}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, industry: e.target.value }))
              }
              fullWidth
              margin="normal"
            />
            <TextField
              label="网站"
              value={formData.website}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, website: e.target.value }))
              }
              fullWidth
              margin="normal"
            />
            <TextField
              label="邮箱"
              type="email"
              value={formData.email}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, email: e.target.value }))
              }
              fullWidth
              margin="normal"
            />
            <TextField
              label="电话"
              value={formData.phone}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, phone: e.target.value }))
              }
              fullWidth
              margin="normal"
            />
            <TextField
              label="地址"
              value={formData.address}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, address: e.target.value }))
              }
              fullWidth
              margin="normal"
            />
            <TextField
              label="备注"
              multiline
              rows={3}
              value={formData.notes}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, notes: e.target.value }))
              }
              fullWidth
              margin="normal"
            />
            <DialogActions>
              <Button onClick={() => setShowDialog(false)}>取消</Button>
              <Button type="submit" variant="contained">
                {selectedCustomer ? "保存修改" : "创建客户"}
              </Button>
            </DialogActions>
          </Box>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default CustomerManagementPage;
