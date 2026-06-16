/**
 * ContactManagementPage 重构版本
 *
 * 重构要点：
 * 1. 使用 ListPageTemplate 替代手写的 Card + Table 布局
 * 2. 使用 ColumnDef 定义表格列
 * 3. 使用 FilterBar 定义筛选器
 * 4. 使用 PageHeader 统一页面头部
 */

import React, { useState, useCallback } from "react";
import {
  Box,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Chip,
} from "@mui/material";
import { Plus, Edit, Trash2, Eye } from "lucide-react";
import type {
  Contact,
  CreateContactRequest,
  UpdateContactRequest,
} from "@/api/crm";
import { crmApi } from "@/api/crm";
import { useAppStore } from "@/store";
import {
  ListPageTemplate,
  type ColumnDef,
  type RowAction,
  type FilterConfig,
} from "@/components/templates";
import { PageHeader } from "@/components/layout";

// ============ 列定义 ============
const columns: ColumnDef<Contact>[] = [
  {
    id: "name",
    label: "姓名",
    sortable: true,
    width: 150,
    render: (row: Contact) => `${row.first_name} ${row.last_name || ""}`.trim() || "-",
  },
  {
    id: "email",
    label: "邮箱",
    render: (row: Contact) => row.email || "-",
  },
  {
    id: "phone",
    label: "电话",
    render: (row: Contact) => row.phone || "-",
  },
  {
    id: "position",
    label: "职位",
    render: (row: Contact) => row.position || "-",
  },
  {
    id: "status",
    label: "状态",
    render: (row: Contact) => (
      <Chip
        label={row.status === "active" ? "活跃" : "非活跃"}
        color={row.status === "active" ? "success" : "default"}
        size="small"
      />
    ),
  },
];

// ============ 行操作 ============
const getRowActions = (
  onView: (contact: Contact) => void,
  onEdit: (contact: Contact) => void,
  onDelete: (contact: Contact) => void,
): RowAction<Contact>[] => [
  {
    label: "查看",
    icon: <Eye style={{ width: 16, height: 16 }} />,
    onClick: onView,
  },
  {
    label: "编辑",
    icon: <Edit style={{ width: 16, height: 16 }} />,
    onClick: onEdit,
  },
  {
    label: "删除",
    icon: <Trash2 style={{ width: 16, height: 16 }} />,
    onClick: onDelete,
    color: "error",
  },
];

// ============ 筛选配置 ============
const filters: FilterConfig[] = [
  {
    id: "search",
    label: "搜索",
    type: "text",
  },
  {
    id: "status",
    label: "状态",
    type: "select",
    options: [
      { value: "all", label: "全部状态" },
      { value: "active", label: "活跃" },
      { value: "inactive", label: "非活跃" },
    ],
  },
];

// ============ 组件 ============
const ContactManagementPage: React.FC = () => {
  const addNotification = useAppStore((state) => state.addNotification);

  // 数据状态
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<{
    items: Contact[];
    total: number;
    page: number;
    pageSize: number;
  }>({
    items: [],
    total: 0,
    page: 1,
    pageSize: 10,
  });

  // 筛选状态
  const [searchText, setSearchText] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  // 模态框状态
  const [showDialog, setShowDialog] = useState(false);
  const [showDetailDialog, setShowDetailDialog] = useState(false);
  const [selectedContact, setSelectedContact] = useState<Contact | null>(null);

  // 行选择
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  // 表单数据
  const [formData, setFormData] = useState<
    CreateContactRequest & { customer_id?: string }
  >({
    first_name: "",
    last_name: "",
    email: "",
    phone: "",
    position: "",
    notes: "",
  });

  // 获取联系人列表
  const fetchContacts = useCallback(async () => {
    setLoading(true);
    try {
      const params: any = {
        page: data.page,
        pageSize: data.pageSize,
      };
      if (searchText) params.search = searchText;
      if (statusFilter !== "all") params.status = statusFilter;

      const response = await crmApi.contacts.list(params);
      if (response.success && response.data) {
        setData({
          items: response.data.items || [],
          total: response.data.total || 0,
          page: response.data.page || 1,
          pageSize: response.data.pageSize || 10,
        });
      }
    } catch (error: any) {
      addNotification({
        type: "error",
        title: "加载失败",
        message: error.message || "获取联系人数据失败",
      });
    } finally {
      setLoading(false);
    }
  }, [data.page, data.pageSize, searchText, statusFilter, addNotification]);

  // 处理分页变化
  const handlePageChange = useCallback((page: number) => {
    setData((prev) => ({ ...prev, page }));
  }, []);

  // 处理行选择
  const handleSelectionChange = useCallback((ids: string[]) => {
    setSelectedIds(ids);
  }, []);

  // 处理查看
  const handleView = useCallback((contact: Contact) => {
    setSelectedContact(contact);
    setShowDetailDialog(true);
  }, []);

  // 处理编辑
  const handleEdit = useCallback((contact: Contact) => {
    setSelectedContact(contact);
    setFormData({
      customer_id: contact.customer_id,
      first_name: contact.first_name,
      last_name: contact.last_name || "",
      email: contact.email || "",
      phone: contact.phone || "",
      position: contact.position || "",
      notes: contact.notes || "",
    });
    setShowDialog(true);
  }, []);

  // 处理删除
  const handleDelete = useCallback(
    async (contact: Contact) => {
      if (!window.confirm(`确定要删除联系人"${contact.first_name} ${contact.last_name}"吗?`)) return;
      try {
        await crmApi.contacts.delete(contact.id);
        addNotification({
          type: "success",
          title: "删除成功",
          message: "联系人已删除",
        });
        fetchContacts();
      } catch (error: any) {
        addNotification({
          type: "error",
          title: "删除失败",
          message: error.message || "无法删除联系人",
        });
      }
    },
    [addNotification, fetchContacts],
  );

  // 处理表单提交
  const handleSubmit = async (e: { preventDefault: () => void }) => {
    e.preventDefault();
    try {
      if (selectedContact) {
        await crmApi.contacts.update(
          selectedContact.id,
          formData as UpdateContactRequest,
        );
        addNotification({
          type: "success",
          title: "更新成功",
          message: "联系人信息已更新",
        });
      } else {
        await crmApi.contacts.create(formData);
        addNotification({
          type: "success",
          title: "创建成功",
          message: "新联系人已创建",
        });
      }
      setShowDialog(false);
      resetForm();
      fetchContacts();
    } catch (error: any) {
      addNotification({
        type: "error",
        title: "操作失败",
        message: selectedContact ? "更新联系人失败" : "创建联系人失败",
      });
    }
  };

  // 重置表单
  const resetForm = () => {
    setSelectedContact(null);
    setFormData({
      first_name: "",
      last_name: "",
      email: "",
      phone: "",
      position: "",
      notes: "",
    });
  };

  // 初始加载
  React.useEffect(() => {
    fetchContacts();
  }, [fetchContacts]);

  return (
    <>
      <PageHeader
        title="联系人管理"
        subtitle={`共 ${data.total} 个联系人`}
        actions={[{
          label: "新增联系人",
          icon: <Plus style={{ width: 18, height: 18 }} />,
          onClick: () => {
            resetForm();
            setShowDialog(true);
          },
          variant: "contained",
        }]}
      />

      <ListPageTemplate
        title="联系人列表"
        columns={columns as any}
        data={data.items}
        loading={loading}
        rowActions={getRowActions(handleView, handleEdit, handleDelete) as any}
        filters={filters as any}
        onFilterChange={(filters: Record<string, any>) => {
          if (filters.search !== undefined) setSearchText(filters.search);
          if (filters.status !== undefined) setStatusFilter(filters.status);
        }}
        pagination={{
          page: data.page,
          pageSize: data.pageSize,
          total: data.total,
          onPageChange: handlePageChange,
          onPageSizeChange: (pageSize: number) => setData((prev) => ({ ...prev, pageSize })),
        }}
        onRowClick={handleView as any}
        emptyMessage="暂无联系人数据"
        selectable
        selectedIds={selectedIds}
        onSelectionChange={handleSelectionChange as (ids: (string | number)[]) => void}
      />

      {/* 新增/编辑对话框 */}
      <Dialog
        open={showDialog}
        onClose={() => setShowDialog(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          {selectedContact ? "编辑联系人" : "新增联系人"}
        </DialogTitle>
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
                label="名 *"
                required
                value={formData.first_name}
                onChange={(e) =>
                  setFormData({ ...formData, first_name: e.target.value })
                }
                fullWidth
              />
              <TextField
                label="姓"
                value={formData.last_name}
                onChange={(e) =>
                  setFormData({ ...formData, last_name: e.target.value })
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
                label="职位"
                value={formData.position}
                onChange={(e) =>
                  setFormData({ ...formData, position: e.target.value })
                }
                fullWidth
                sx={{ gridColumn: "span 2" }}
              />
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
        <DialogTitle>联系人详情</DialogTitle>
        {selectedContact && (
          <DialogContent>
            <Box
              sx={{
                display: "grid",
                gridTemplateColumns: "repeat(2, 1fr)",
                gap: 2,
              }}
            >
              <Box>
                <Box component="span" sx={{ color: "text.secondary", fontSize: "0.875rem" }}>
                  名
                </Box>
                <Box>{selectedContact.first_name}</Box>
              </Box>
              <Box>
                <Box component="span" sx={{ color: "text.secondary", fontSize: "0.875rem" }}>
                  姓
                </Box>
                <Box>{selectedContact.last_name || "-"}</Box>
              </Box>
              <Box>
                <Box component="span" sx={{ color: "text.secondary", fontSize: "0.875rem" }}>
                  邮箱
                </Box>
                <Box>{selectedContact.email || "-"}</Box>
              </Box>
              <Box>
                <Box component="span" sx={{ color: "text.secondary", fontSize: "0.875rem" }}>
                  电话
                </Box>
                <Box>{selectedContact.phone || "-"}</Box>
              </Box>
              <Box>
                <Box component="span" sx={{ color: "text.secondary", fontSize: "0.875rem" }}>
                  职位
                </Box>
                <Box>{selectedContact.position || "-"}</Box>
              </Box>
              <Box>
                <Box component="span" sx={{ color: "text.secondary", fontSize: "0.875rem" }}>
                  状态
                </Box>
                <Box sx={{ mt: 0.5 }}>
                  <Chip
                    label={selectedContact.status === "active" ? "活跃" : "非活跃"}
                    color={selectedContact.status === "active" ? "success" : "default"}
                    size="small"
                  />
                </Box>
              </Box>
              <Box>
                <Box component="span" sx={{ color: "text.secondary", fontSize: "0.875rem" }}>
                  创建时间
                </Box>
                <Box>{new Date(selectedContact.created_at).toLocaleString("zh-CN")}</Box>
              </Box>
              <Box>
                <Box component="span" sx={{ color: "text.secondary", fontSize: "0.875rem" }}>
                  更新时间
                </Box>
                <Box>{new Date(selectedContact.updated_at).toLocaleString("zh-CN")}</Box>
              </Box>
              <Box sx={{ gridColumn: "span 2" }}>
                <Box component="span" sx={{ color: "text.secondary", fontSize: "0.875rem" }}>
                  备注
                </Box>
                <Box>{selectedContact.notes || "-"}</Box>
              </Box>
            </Box>
          </DialogContent>
        )}
        <DialogActions>
          <Button onClick={() => setShowDetailDialog(false)}>关闭</Button>
          <Button
            variant="contained"
            onClick={() => {
              setShowDetailDialog(false);
              handleEdit(selectedContact!);
            }}
          >
            编辑
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
};

export default ContactManagementPage;
