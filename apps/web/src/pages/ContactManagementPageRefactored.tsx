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
import { Plus, Edit, Trash2, Eye, Download } from "lucide-react";
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
} from "@/components/templates";
import { PageHeader } from "@/components/layout";
import { FilterBar, type FilterConfig } from "@/components/mui";

// ============ 列定义 ============
const columns: ColumnDef<Contact>[] = [
  {
    id: "name",
    header: "姓名",
    accessor: "first_name",
    sortable: true,
    width: 150,
    render: (_, row) => `${row.first_name} ${row.last_name || ""}`.trim() || "-",
  },
  {
    id: "email",
    header: "邮箱",
    accessor: "email",
    render: (value) => value || "-",
  },
  {
    id: "phone",
    header: "电话",
    accessor: "phone",
    render: (value) => value || "-",
  },
  {
    id: "position",
    header: "职位",
    accessor: "position",
    render: (value) => value || "-",
  },
  {
    id: "status",
    header: "状态",
    accessor: "status",
    render: (value) => (
      <Chip
        label={value === "active" ? "活跃" : "非活跃"}
        color={value === "active" ? "success" : "default"}
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
    type: "search",
    placeholder: "搜索联系人姓名或邮箱...",
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

// ============ 批量操作 ============
const batchActions = [
  {
    label: "批量删除",
    icon: <Trash2 style={{ width: 16, height: 16 }} />,
    color: "error" as const,
  },
  {
    label: "批量导出",
    icon: <Download style={{ width: 16, height: 16 }} />,
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
    page_size: number;
  }>({
    items: [],
    total: 0,
    page: 1,
    page_size: 10,
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
        pageSize: data.page_size,
      };
      if (searchText) params.search = searchText;
      if (statusFilter !== "all") params.status = statusFilter;

      const response = await crmApi.contacts.list(params);
      if (response.success && response.data) {
        setData({
          items: response.data.items || [],
          total: response.data.total || 0,
          page: response.data.page || 1,
          page_size: response.data.page_size || 10,
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
  }, [data.page, data.page_size, searchText, statusFilter, addNotification]);

  // 处理筛选变化
  const handleFilterChange = useCallback(
    (filterId: string, value: any) => {
      if (filterId === "search") setSearchText(value);
      if (filterId === "status") setStatusFilter(value);
    },
    [],
  );

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
  const handleSubmit = async (e: React.FormEvent) => {
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

  // 处理批量删除
  const handleBatchDelete = useCallback(async () => {
    if (selectedIds.length === 0) return;
    if (!window.confirm(`确定要删除选中的 ${selectedIds.length} 个联系人吗?`)) return;
    try {
      await crmApi.contacts.batchDelete(selectedIds);
      addNotification({
        type: "success",
        title: "删除成功",
        message: `已删除 ${selectedIds.length} 个联系人`,
      });
      setSelectedIds([]);
      fetchContacts();
    } catch (error: any) {
      addNotification({
        type: "error",
        title: "删除失败",
        message: error.message || "批量删除失败",
      });
    }
  }, [selectedIds, addNotification, fetchContacts]);

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
        actions={
          <>
            <Button
              variant="contained"
              startIcon={<Plus style={{ width: 18, height: 18 }} />}
              onClick={() => {
                resetForm();
                setShowDialog(true);
              }}
            >
              新增联系人
            </Button>
          </>
        }
      />

      <ListPageTemplate
        columns={columns}
        data={data.items}
        loading={loading}
        rowActions={getRowActions(handleView, handleEdit, handleDelete)}
        filters={filters}
        onFilterChange={handleFilterChange}
        pagination={{
          page: data.page,
          pageSize: data.page_size,
          total: data.total,
          onPageChange: handlePageChange,
        }}
        onRowClick={handleView}
        emptyMessage="暂无联系人数据"
        selection={{
          selected: selectedIds,
          onChange: handleSelectionChange,
        }}
        batchActions={batchActions}
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
