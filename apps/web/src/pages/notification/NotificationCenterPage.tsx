/**
 * 消息中心页面
 * 管理系统消息通知，支持消息发送、查看、标记已读
 */

import React, { useState, useMemo, useEffect, useCallback } from "react";
import {
  Box,
  Typography,
  TextField,
  Button,
  Chip,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
} from "@mui/material";
import {
  Bell,
  ChevronLeft,
  Send,
  Eye,
  CheckCircle,
  Mail,
  MessageSquare,
  AlertCircle,
  Info,
  RefreshCw,
  MailOpen,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import {
  ListPageTemplate,
  type ColumnDef,
  type RowAction,
  type BatchAction,
  type FilterConfig,
} from "@/components/templates";

// ============ Mock 数据 ============
interface Message {
  id: string;
  title: string;
  content: string;
  type: string;
  status: string;
  readStatus: string;
  createdAt: string;
}

const mockMessages: Message[] = [
  {
    id: "1",
    title: "系统升级通知",
    content:
      "系统将于本周六凌晨2:00-6:00进行升级维护，届时部分功能将暂停使用。",
    type: "system",
    status: "sent",
    readStatus: "unread",
    createdAt: "2024-01-15 10:30:00",
  },
  {
    id: "2",
    title: "新的审批请求",
    content: "张经理提交了一份请假申请，请及时处理。",
    type: "approval",
    status: "sent",
    readStatus: "read",
    createdAt: "2024-01-15 09:15:00",
  },
  {
    id: "3",
    title: "任务完成提醒",
    content: "您负责的项目里程碑已按期完成。",
    type: "task",
    status: "sent",
    readStatus: "read",
    createdAt: "2024-01-14 16:45:00",
  },
  {
    id: "4",
    title: "系统告警",
    content: "服务器内存使用率超过80%，请关注。",
    type: "alert",
    status: "sent",
    readStatus: "unread",
    createdAt: "2024-01-14 14:20:00",
  },
  {
    id: "5",
    title: "会议提醒",
    content: "明天上午10:00有一场项目评审会议，请准时参加。",
    type: "meeting",
    status: "sent",
    readStatus: "unread",
    createdAt: "2024-01-14 11:00:00",
  },
];

const messageTypeOptions = [
  { value: "all", label: "全部类型" },
  { value: "system", label: "系统通知" },
  { value: "approval", label: "审批通知" },
  { value: "task", label: "任务通知" },
  { value: "alert", label: "告警通知" },
  { value: "meeting", label: "会议通知" },
];

const statusOptions = [
  { value: "all", label: "全部状态" },
  { value: "sent", label: "已发送" },
  { value: "failed", label: "发送失败" },
];

const readStatusOptions = [
  { value: "all", label: "全部" },
  { value: "unread", label: "未读" },
  { value: "read", label: "已读" },
];

const getTypeIcon = (type: string) => {
  switch (type) {
    case "system":
      return <Info style={{ width: 16, height: 16 }} />;
    case "approval":
      return <CheckCircle style={{ width: 16, height: 16 }} />;
    case "task":
      return <Mail style={{ width: 16, height: 16 }} />;
    case "alert":
      return <AlertCircle style={{ width: 16, height: 16 }} />;
    case "meeting":
      return <MessageSquare style={{ width: 16, height: 16 }} />;
    default:
      return <Info style={{ width: 16, height: 16 }} />;
  }
};

const getTypeColor = (
  type: string,
): "primary" | "success" | "info" | "warning" | "secondary" | "default" => {
  switch (type) {
    case "system":
      return "primary";
    case "approval":
      return "success";
    case "task":
      return "info";
    case "alert":
      return "warning";
    case "meeting":
      return "secondary";
    default:
      return "default";
  }
};

const getTypeLabel = (type: string) => {
  const option = messageTypeOptions.find((o) => o.value === type);
  return option?.label || type;
};

export default function NotificationCenterPage() {
  const navigate = useNavigate();

  // 状态
  const [messages, setMessages] = useState<Message[]>(mockMessages);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [filterType, setFilterType] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterReadStatus, setFilterReadStatus] = useState("all");
  const [currentPage, setCurrentPage] = useState(0);
  const [pageSize] = useState(10);
  const [selectedIds, setSelectedIds] = useState<(string | number)[]>([]);
  const [showDetailDialog, setShowDetailDialog] = useState(false);
  const [showSendDialog, setShowSendDialog] = useState(false);
  const [selectedMessage, setSelectedMessage] = useState<Message | null>(null);

  // 防抖搜索
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchQuery);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // 筛选后的消息
  const filteredMessages = useMemo(() => {
    return messages.filter((msg) => {
      if (
        debouncedSearch &&
        !msg.title.toLowerCase().includes(debouncedSearch.toLowerCase())
      ) {
        return false;
      }
      if (filterType !== "all" && msg.type !== filterType) {
        return false;
      }
      if (filterStatus !== "all" && msg.status !== filterStatus) {
        return false;
      }
      if (filterReadStatus !== "all" && msg.readStatus !== filterReadStatus) {
        return false;
      }
      return true;
    });
  }, [messages, debouncedSearch, filterType, filterStatus, filterReadStatus]);

  // 标记已读
  const handleMarkAsRead = useCallback((ids: string[]) => {
    setMessages((prev) =>
      prev.map((msg) =>
        ids.includes(msg.id) ? { ...msg, readStatus: "read" } : msg,
      ),
    );
  }, []);

  // 标记全部已读
  const handleMarkAllAsRead = useCallback(() => {
    setMessages((prev) => prev.map((msg) => ({ ...msg, readStatus: "read" })));
  }, []);

  // 删除消息
  const handleDelete = useCallback((ids: (string | number)[]) => {
    setMessages((prev) => prev.filter((msg) => !ids.includes(msg.id)));
    setSelectedIds((prev) => prev.filter((id) => !ids.includes(id)));
  }, []);

  // 查看详情
  const handleViewDetail = useCallback(
    (message: Message) => {
      setSelectedMessage(message);
      if (message.readStatus === "unread") {
        handleMarkAsRead([message.id]);
      }
      setShowDetailDialog(true);
    },
    [handleMarkAsRead],
  );

  // 刷新
  const handleRefresh = useCallback(() => {
    setLoading(true);
    setTimeout(() => setLoading(false), 500);
  }, []);

  // 筛选处理
  const handleFilterChange = useCallback((filters: Record<string, any>) => {
    if (filters.type !== undefined) {
      setFilterType(filters.type);
    }
    if (filters.status !== undefined) {
      setFilterStatus(filters.status);
    }
    if (filters.readStatus !== undefined) {
      setFilterReadStatus(filters.readStatus);
    }
    setCurrentPage(0);
  }, []);

  const columns: ColumnDef<Message>[] = useMemo(
    () => [
      {
        id: "title",
        label: "消息标题",
        render: (row) => (
          <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
            {row.readStatus === "unread" && (
              <Box
                sx={{
                  width: 8,
                  height: 8,
                  borderRadius: "50%",
                  bgcolor: "primary.main",
                }}
              />
            )}
            <Typography
              variant="body2"
              sx={{
                fontWeight: row.readStatus === "unread" ? 600 : 400,
              }}
            >
              {row.title}
            </Typography>
          </Box>
        ),
      },
      {
        id: "type",
        label: "类型",
        render: (row) => (
          <Chip
            size="small"
            icon={getTypeIcon(row.type)}
            label={getTypeLabel(row.type)}
            color={getTypeColor(row.type)}
            variant="outlined"
          />
        ),
      },
      {
        id: "createdAt",
        label: "发送时间",
        render: (row) => (
          <Typography variant="body2" color="text.secondary">
            {row.createdAt}
          </Typography>
        ),
      },
      {
        id: "status",
        label: "状态",
        render: (row) => (
          <Chip
            size="small"
            label={row.status === "sent" ? "已发送" : "发送失败"}
            color={row.status === "sent" ? "success" : "error"}
            variant="filled"
          />
        ),
      },
      {
        id: "readStatus",
        label: "阅读状态",
        render: (row) => (
          <Typography
            variant="body2"
            color={
              row.readStatus === "read" ? "text.secondary" : "primary.main"
            }
            sx={{ fontWeight: 500 }}
          >
            {row.readStatus === "read" ? "已读" : "未读"}
          </Typography>
        ),
      },
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );

  const rowActions: RowAction<Message>[] = useMemo(
    () => [
      {
        label: "查看",
        icon: <Eye style={{ width: 16, height: 16 }} />,
        onClick: handleViewDetail,
      },
      {
        label: "标记已读",
        icon: <CheckCircle style={{ width: 16, height: 16 }} />,
        onClick: (row) => handleMarkAsRead([row.id]),
        show: (row) => row.readStatus === "unread",
      },
    ],
    [handleViewDetail, handleMarkAsRead],
  );

  const batchActions: BatchAction[] = useMemo(
    () => [
      {
        label: "标记已读",
        icon: <CheckCircle size={16} />,
        onClick: () => handleMarkAsRead(selectedIds as string[]),
      },
      {
        label: "删除",
        icon: <Bell size={16} />,
        color: "error",
        onClick: () => handleDelete(selectedIds as string[]),
        confirm: true,
        confirmMessage: `确定要删除选中的 ${selectedIds.length} 条消息吗？`,
      },
    ],
    [selectedIds, handleMarkAsRead, handleDelete],
  );

  const filters: FilterConfig[] = useMemo(
    () => [
      {
        id: "type",
        label: "类型",
        type: "select",
        options: messageTypeOptions,
      },
      {
        id: "status",
        label: "状态",
        type: "select",
        options: statusOptions,
      },
      {
        id: "readStatus",
        label: "阅读状态",
        type: "select",
        options: readStatusOptions,
      },
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );

  return (
    <Box sx={{ minHeight: "100vh", bgcolor: "grey.50" }}>
      <ListPageTemplate
        title="消息中心"
        subtitle="管理系统消息通知"
        backButton={{
          onClick: () => navigate("/dashboard"),
        }}
        columns={columns}
        data={filteredMessages}
        loading={loading}
        getRowId={(row) => row.id}
        searchable
        searchPlaceholder="搜索消息标题..."
        searchValue={searchQuery}
        onSearch={setSearchQuery}
        filters={filters}
        filtersValue={{
          type: filterType,
          status: filterStatus,
          readStatus: filterReadStatus,
        }}
        onFilterChange={handleFilterChange}
        pagination={{
          page: currentPage,
          pageSize: pageSize,
          total: filteredMessages.length,
          onPageChange: setCurrentPage,
        }}
        selectable
        selection={{
          selected: selectedIds,
          onChange: setSelectedIds,
        }}
        rowActions={rowActions}
        batchActions={batchActions}
        onRefresh={handleRefresh}
        actions={[
          {
            label: "全部已读",
            icon: <MailOpen style={{ width: 16, height: 16 }} />,
            onClick: handleMarkAllAsRead,
            variant: "outlined",
          },
          {
            label: "发送消息",
            icon: <Send style={{ width: 16, height: 16 }} />,
            onClick: () => setShowSendDialog(true),
            variant: "contained",
          },
        ]}
        emptyIcon={<Bell style={{ width: 48, height: 48, color: "#9e9e9e" }} />}
        emptyMessage="暂无消息"
      />

      {/* 消息详情对话框 */}
      <Dialog
        open={showDetailDialog}
        onClose={() => setShowDetailDialog(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
            <Bell style={{ width: 20, height: 20, color: "#3b82f6" }} />
            {selectedMessage?.title}
          </Box>
        </DialogTitle>
        <DialogContent>
          <Box sx={{ mb: 2 }}>
            <Chip
              size="small"
              icon={getTypeIcon(selectedMessage?.type || "")}
              label={getTypeLabel(selectedMessage?.type || "")}
              color={getTypeColor(selectedMessage?.type || "")}
              variant="outlined"
              sx={{ mr: 1 }}
            />
            <Typography variant="caption" color="text.secondary">
              {selectedMessage?.createdAt}
            </Typography>
          </Box>
          <Typography variant="body1">{selectedMessage?.content}</Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowDetailDialog(false)}>关闭</Button>
        </DialogActions>
      </Dialog>

      {/* 发送消息对话框 */}
      <Dialog
        open={showSendDialog}
        onClose={() => setShowSendDialog(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
            <Send style={{ width: 20, height: 20, color: "#3b82f6" }} />
            发送消息
          </Box>
        </DialogTitle>
        <DialogContent>
          <Box sx={{ display: "flex", flexDirection: "column", gap: 2, pt: 1 }}>
            <TextField label="消息标题" fullWidth size="small" required />
            <FormControl fullWidth size="small">
              <InputLabel>消息类型</InputLabel>
              <Select label="消息类型" defaultValue="system">
                {messageTypeOptions
                  .filter((o) => o.value !== "all")
                  .map((option) => (
                    <MenuItem key={option.value} value={option.value}>
                      {option.label}
                    </MenuItem>
                  ))}
              </Select>
            </FormControl>
            <TextField label="消息内容" fullWidth multiline rows={4} required />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowSendDialog(false)}>取消</Button>
          <Button variant="contained" onClick={() => setShowSendDialog(false)}>
            发送
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
