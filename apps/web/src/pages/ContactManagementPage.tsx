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
  IconButton,
  Pagination,
} from "@mui/material";
import type {
  Contact,
  CreateContactRequest,
  UpdateContactRequest,
} from "@/api/crm";
import { crmApi } from "@/api/crm";
import { useAppStore } from "@/store";
import { LoadingSpinner } from "@/components/LoadingSpinner";
import { EmptyState } from "@/components/EmptyState";
import { Search, Plus, Edit, Trash2, Eye } from "lucide-react";

const ContactManagementPage: React.FC = () => {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [total, setTotal] = useState(0);
  const [showDialog, setShowDialog] = useState(false);
  const [showDetailDialog, setShowDetailDialog] = useState(false);
  const [selectedContact, setSelectedContact] = useState<Contact | null>(null);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
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

  const { addNotification } = useAppStore();

  useEffect(() => {
    loadContacts();
  }, [currentPage, pageSize, searchTerm, statusFilter]);

  const loadContacts = async () => {
    try {
      setLoading(true);
      const params: any = {
        page: currentPage,
        pageSize,
      };
      if (searchTerm) params.search = searchTerm;
      if (statusFilter !== "all") params.status = statusFilter;

      const response = await crmApi.contacts.list(params);
      if (response.success && response.data) {
        setContacts(response.data.items || []);
        setTotal(response.data.total || 0);
      }
    } catch (error) {
      console.error("加载联系人列表失败:", error);
      addNotification({
        type: "error",
        title: "加载失败",
        message: "无法加载联系人列表",
      });
    } finally {
      setLoading(false);
    }
  };

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
      loadContacts();
    } catch (error) {
      console.error("操作失败:", error);
      addNotification({
        type: "error",
        title: "操作失败",
        message: selectedContact ? "更新联系人失败" : "创建联系人失败",
      });
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm("确定要删除这个联系人吗?")) return;
    try {
      await crmApi.contacts.delete(id);
      addNotification({
        type: "success",
        title: "删除成功",
        message: "联系人已删除",
      });
      loadContacts();
    } catch (error) {
      console.error("删除失败:", error);
      addNotification({
        type: "error",
        title: "删除失败",
        message: "无法删除联系人",
      });
    }
  };

  const handleBatchDelete = async () => {
    if (selectedIds.length === 0) return;
    if (!window.confirm(`确定要删除选中的 ${selectedIds.length} 个联系人吗?`))
      return;
    try {
      await crmApi.contacts.batchDelete(selectedIds);
      addNotification({
        type: "success",
        title: "删除成功",
        message: `已删除 ${selectedIds.length} 个联系人`,
      });
      setSelectedIds([]);
      loadContacts();
    } catch (error) {
      console.error("批量删除失败:", error);
      addNotification({
        type: "error",
        title: "删除失败",
        message: "批量删除失败",
      });
    }
  };

  const handleEdit = (contact: Contact) => {
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
  };

  const handleViewDetail = (contact: Contact) => {
    setSelectedContact(contact);
    setShowDetailDialog(true);
  };

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

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id],
    );
  };

  const toggleSelectAll = () => {
    if (selectedIds.length === contacts.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(contacts.map((c) => c.id));
    }
  };

  const getStatusBadge = (status: string) => {
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
    };
    const s = statusMap[status] || { label: status, color: "default" };
    return <Chip size="small" color={s.color} label={s.label} />;
  };

  const handlePageChange = (_: React.ChangeEvent<any>, page: number) => {
    setCurrentPage(page);
  };

  if (loading) return <LoadingSpinner />;

  return (
    <Box sx={{ mt: 3 }}>
      <Card>
        <CardHeader>
          <Typography variant="h6" sx={{ fontWeight: 600 }}>
            联系人管理
          </Typography>
          <Typography variant="body2" sx={{ color: "grey.500" }}>
            管理联系人信息,包括姓名、联系方式、职位等
          </Typography>
        </CardHeader>
        <CardContent>
          <Stack
            direction={{ xs: "column", sm: "row" }}
            spacing={2}
            sx={{ mb: 3 }}
          >
            <Box sx={{ flex: 1, position: "relative" }}>
              <Search
                className="absolute left-2 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground"
                style={{
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
                placeholder="搜索联系人姓名或邮箱..."
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                  setCurrentPage(1);
                }}
                sx={{ pl: 5, width: "100%" }}
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
              </Select>
            </FormControl>
            <Button
              variant="contained"
              onClick={() => {
                resetForm();
                setShowDialog(true);
              }}
              startIcon={<Plus style={{ width: 16, height: 16 }} />}
            >
              新增联系人
            </Button>
          </Stack>

          {selectedIds.length > 0 && (
            <Paper sx={{ p: 1.5, mb: 2, bgcolor: "grey.100" }}>
              <Stack
                direction="row"
                sx={{ justifyContent: "space-between", alignItems: "center" }}
              >
                <Typography variant="body2">
                  已选择 {selectedIds.length} 个联系人
                </Typography>
                <Button
                  variant="contained"
                  color="error"
                  size="small"
                  onClick={handleBatchDelete}
                  startIcon={<Trash2 style={{ width: 16, height: 16 }} />}
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
                        selectedIds.length === contacts.length &&
                        contacts.length > 0
                      }
                      onChange={toggleSelectAll}
                    />
                  </TableCell>
                  <TableCell>姓名</TableCell>
                  <TableCell>邮箱</TableCell>
                  <TableCell>电话</TableCell>
                  <TableCell>职位</TableCell>
                  <TableCell>状态</TableCell>
                  <TableCell align="right">操作</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {contacts.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} align="center">
                      <EmptyState
                        title="暂无联系人数据"
                        description="点击上方按钮添加第一个联系人"
                      />
                    </TableCell>
                  </TableRow>
                ) : (
                  contacts.map((contact) => (
                    <TableRow key={contact.id}>
                      <TableCell padding="checkbox">
                        <Checkbox
                          checked={selectedIds.includes(contact.id)}
                          onChange={() => toggleSelect(contact.id)}
                        />
                      </TableCell>
                      <TableCell sx={{ fontWeight: "medium" }}>
                        {contact.first_name} {contact.last_name || ""}
                      </TableCell>
                      <TableCell>{contact.email || "-"}</TableCell>
                      <TableCell>{contact.phone || "-"}</TableCell>
                      <TableCell>{contact.position || "-"}</TableCell>
                      <TableCell>{getStatusBadge(contact.status)}</TableCell>
                      <TableCell align="right">
                        <Stack
                          direction="row"
                          spacing={0.5}
                          sx={{ justifyContent: "flex-end" }}
                        >
                          <IconButton
                            size="small"
                            onClick={() => handleViewDetail(contact)}
                          >
                            <Eye style={{ width: 16, height: 16 }} />
                          </IconButton>
                          <IconButton
                            size="small"
                            onClick={() => handleEdit(contact)}
                          >
                            <Edit style={{ width: 16, height: 16 }} />
                          </IconButton>
                          <IconButton
                            size="small"
                            color="error"
                            onClick={() => handleDelete(contact.id)}
                          >
                            <Trash2 style={{ width: 16, height: 16 }} />
                          </IconButton>
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
            <Pagination
              count={Math.ceil(total / pageSize) || 1}
              page={currentPage}
              onChange={handlePageChange}
              shape="rounded"
              size="small"
            />
          </Stack>
        </CardContent>
      </Card>

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
                <Typography variant="caption" color="text.secondary">
                  名
                </Typography>
                <Typography sx={{ fontWeight: "medium" }}>
                  {selectedContact.first_name}
                </Typography>
              </Box>
              <Box>
                <Typography variant="caption" color="text.secondary">
                  姓
                </Typography>
                <Typography>{selectedContact.last_name || "-"}</Typography>
              </Box>
              <Box>
                <Typography variant="caption" color="text.secondary">
                  邮箱
                </Typography>
                <Typography>{selectedContact.email || "-"}</Typography>
              </Box>
              <Box>
                <Typography variant="caption" color="text.secondary">
                  电话
                </Typography>
                <Typography>{selectedContact.phone || "-"}</Typography>
              </Box>
              <Box>
                <Typography variant="caption" color="text.secondary">
                  职位
                </Typography>
                <Typography>{selectedContact.position || "-"}</Typography>
              </Box>
              <Box>
                <Typography variant="caption" color="text.secondary">
                  状态
                </Typography>
                <Box sx={{ mt: 0.5 }}>
                  {getStatusBadge(selectedContact.status)}
                </Box>
              </Box>
              <Box>
                <Typography variant="caption" color="text.secondary">
                  创建时间
                </Typography>
                <Typography>
                  {new Date(selectedContact.created_at).toLocaleString("zh-CN")}
                </Typography>
              </Box>
              <Box>
                <Typography variant="caption" color="text.secondary">
                  更新时间
                </Typography>
                <Typography>
                  {new Date(selectedContact.updated_at).toLocaleString("zh-CN")}
                </Typography>
              </Box>
              <Box sx={{ gridColumn: "span 2" }}>
                <Typography variant="caption" color="text.secondary">
                  备注
                </Typography>
                <Typography>{selectedContact.notes || "-"}</Typography>
              </Box>
            </Box>
          </DialogContent>
        )}
      </Dialog>
    </Box>
  );
};

export default ContactManagementPage;
