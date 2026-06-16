/**
 * 消息中心页面
 * 管理系统消息通知，支持消息发送、查看、标记已读
 */

import React, { useState } from "react";
import {
  Box,
  Typography,
  Card,
  CardContent,
  CardHeader,
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
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TablePagination,
  Paper,
  Checkbox,
  Tooltip,
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
  Search,
  RefreshCw,
  MailOpen,
  Settings,
} from "lucide-react";
import { useNavigate } from "react-router-dom";

// ============ Mock 数据 ============
const mockMessages = [
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
      return <Settings style={{ width: 16, height: 16 }} />;
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

const getTypeColor = (type: string) => {
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
  const [messages, setMessages] = useState(mockMessages);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterType, setFilterType] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterReadStatus, setFilterReadStatus] = useState("all");
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [showDetailDialog, setShowDetailDialog] = useState(false);
  const [showSendDialog, setShowSendDialog] = useState(false);
  const [selectedMessage, setSelectedMessage] = useState<any>(null);

  // 筛选后的消息
  const filteredMessages = messages.filter((msg) => {
    if (searchQuery && !msg.title.toLowerCase().includes(searchQuery.toLowerCase())) {
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

  // 分页
  const paginatedMessages = filteredMessages.slice(
    page * rowsPerPage,
    page * rowsPerPage + rowsPerPage,
  );

  // 处理选择
  const handleSelectAll = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.checked) {
      setSelectedIds(paginatedMessages.map((msg) => msg.id));
    } else {
      setSelectedIds([]);
    }
  };

  const handleSelectOne = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id],
    );
  };

  // 标记已读
  const handleMarkAsRead = (ids: string[]) => {
    setMessages((prev) =>
      prev.map((msg) =>
        ids.includes(msg.id) ? { ...msg, readStatus: "read" } : msg,
      ),
    );
  };

  // 标记全部已读
  const handleMarkAllAsRead = () => {
    setMessages((prev) =>
      prev.map((msg) => ({ ...msg, readStatus: "read" })),
    );
  };

  // 删除消息
  const handleDelete = (ids: string[]) => {
    setMessages((prev) => prev.filter((msg) => !ids.includes(msg.id)));
    setSelectedIds([]);
  };

  // 查看详情
  const handleViewDetail = (message: any) => {
    setSelectedMessage(message);
    if (message.readStatus === "unread") {
      handleMarkAsRead([message.id]);
    }
    setShowDetailDialog(true);
  };

  // 刷新
  const handleRefresh = () => {
    setLoading(true);
    setTimeout(() => setLoading(false), 500);
  };

  return (
    <Box sx={{ minHeight: "100vh", bgcolor: "grey.50", p: 3 }}>
      <Box sx={{ maxWidth: 1280, mx: "auto" }}>
        {/* 页面头部 */}
        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            mb: 3,
          }}
        >
          <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
            <IconButton onClick={() => navigate("/dashboard")}>
              <ChevronLeft />
            </IconButton>
            <Box>
              <Typography variant="h4" sx={{ fontWeight: "bold" }}>
                消息中心
              </Typography>
              <Typography variant="body2" color="text.secondary">
                管理系统消息通知
              </Typography>
            </Box>
          </Box>
          <Box sx={{ display: "flex", gap: 1 }}>
            <Button
              variant="outlined"
              size="small"
              startIcon={<RefreshCw style={{ width: 16, height: 16 }} />}
              onClick={handleRefresh}
            >
              刷新
            </Button>
            <Button
              variant="outlined"
              size="small"
              startIcon={<MailOpen style={{ width: 16, height: 16 }} />}
              onClick={handleMarkAllAsRead}
            >
              全部已读
            </Button>
            <Button
              variant="contained"
              size="small"
              startIcon={<Send style={{ width: 16, height: 16 }} />}
              onClick={() => setShowSendDialog(true)}
            >
              发送消息
            </Button>
          </Box>
        </Box>

        {/* 筛选栏 */}
        <Card sx={{ mb: 2 }}>
          <CardContent sx={{ py: 2 }}>
            <Box
              sx={{
                display: "flex",
                alignItems: "center",
                gap: 2,
                flexWrap: "wrap",
              }}
            >
              <TextField
                size="small"
                placeholder="搜索消息标题..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                slotProps={{
                  input: {
                    startAdornment: (
                      <Search
                        style={{
                          width: 18,
                          height: 18,
                          marginRight: 8,
                          color: "grey.400",
                        }}
                      />
                    ),
                  },
                }}
                sx={{ minWidth: 200 }}
              />
              <FormControl size="small" sx={{ minWidth: 140 }}>
                <Select
                  value={filterType}
                  onChange={(e) => setFilterType(e.target.value)}
                  displayEmpty
                >
                  {messageTypeOptions.map((option) => (
                    <MenuItem key={option.value} value={option.value}>
                      {option.label}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
              <FormControl size="small" sx={{ minWidth: 120 }}>
                <Select
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value)}
                  displayEmpty
                >
                  {statusOptions.map((option) => (
                    <MenuItem key={option.value} value={option.value}>
                      {option.label}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
              <FormControl size="small" sx={{ minWidth: 100 }}>
                <Select
                  value={filterReadStatus}
                  onChange={(e) => setFilterReadStatus(e.target.value)}
                  displayEmpty
                >
                  {readStatusOptions.map((option) => (
                    <MenuItem key={option.value} value={option.value}>
                      {option.label}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Box>
          </CardContent>
        </Card>

        {/* 批量操作 */}
        {selectedIds.length > 0 && (
          <Card
            sx={{
              mb: 2,
              bgcolor: "primary.light",
              border: 1,
              borderColor: "primary.main",
            }}
          >
            <CardContent sx={{ py: 1.5 }}>
              <Box
                sx={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                }}
              >
                <Typography variant="body2" sx={{ fontWeight: 500 }}>
                  已选择 {selectedIds.length} 条消息
                </Typography>
                <Box sx={{ display: "flex", gap: 1 }}>
                  <Button
                    size="small"
                    variant="outlined"
                    onClick={() => handleMarkAsRead(selectedIds)}
                  >
                    标记已读
                  </Button>
                  <Button
                    size="small"
                    variant="contained"
                    color="error"
                    onClick={() => handleDelete(selectedIds)}
                  >
                    删除
                  </Button>
                  <Button
                    size="small"
                    variant="text"
                    onClick={() => setSelectedIds([])}
                  >
                    取消选择
                  </Button>
                </Box>
              </Box>
            </CardContent>
          </Card>
        )}

        {/* 消息列表 */}
        <Card>
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell padding="checkbox" sx={{ width: 48 }}>
                    <Checkbox
                      checked={
                        paginatedMessages.length > 0 &&
                        selectedIds.length === paginatedMessages.length
                      }
                      indeterminate={
                        selectedIds.length > 0 &&
                        selectedIds.length < paginatedMessages.length
                      }
                      onChange={handleSelectAll}
                    />
                  </TableCell>
                  <TableCell sx={{ width: 48 }}></TableCell>
                  <TableCell>消息标题</TableCell>
                  <TableCell sx={{ width: 100 }}>类型</TableCell>
                  <TableCell sx={{ width: 180 }}>发送时间</TableCell>
                  <TableCell sx={{ width: 80 }}>状态</TableCell>
                  <TableCell sx={{ width: 100 }}>阅读状态</TableCell>
                  <TableCell align="right" sx={{ width: 120 }}>
                    操作
                  </TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {paginatedMessages.map((message) => (
                  <TableRow
                    key={message.id}
                    hover
                    sx={{
                      bgcolor:
                        message.readStatus === "unread"
                          ? "action.hover"
                          : "transparent",
                    }}
                  >
                    <TableCell padding="checkbox">
                      <Checkbox
                        checked={selectedIds.includes(message.id)}
                        onChange={() => handleSelectOne(message.id)}
                      />
                    </TableCell>
                    <TableCell>
                      {message.readStatus === "unread" && (
                        <Box
                          sx={{
                            width: 8,
                            height: 8,
                            borderRadius: "50%",
                            bgcolor: "primary.main",
                          }}
                        />
                      )}
                    </TableCell>
                    <TableCell>
                      <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                        <Typography
                          variant="body2"
                          sx={{
                            fontWeight:
                              message.readStatus === "unread" ? 600 : 400,
                          }}
                        >
                          {message.title}
                        </Typography>
                      </Box>
                    </TableCell>
                    <TableCell>
                      <Chip
                        size="small"
                        icon={getTypeIcon(message.type)}
                        label={getTypeLabel(message.type)}
                        color={getTypeColor(message.type)}
                        variant="outlined"
                      />
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" color="text.secondary">
                        {message.createdAt}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Chip
                        size="small"
                        label={
                          message.status === "sent" ? "已发送" : "发送失败"
                        }
                        color={message.status === "sent" ? "success" : "error"}
                        variant="filled"
                      />
                    </TableCell>
                    <TableCell>
                      <Typography
                        variant="body2"
                        color={
                          message.readStatus === "read"
                            ? "text.secondary"
                            : "primary.main"
                        }
                        sx={{ fontWeight: 500 }}
                      >
                        {message.readStatus === "read" ? "已读" : "未读"}
                      </Typography>
                    </TableCell>
                    <TableCell align="right">
                      <Tooltip title="查看">
                        <IconButton
                          size="small"
                          onClick={() => handleViewDetail(message)}
                        >
                          <Eye style={{ width: 16, height: 16 }} />
                        </IconButton>
                      </Tooltip>
                      {message.readStatus === "unread" && (
                        <Tooltip title="标记已读">
                          <IconButton
                            size="small"
                            onClick={() => handleMarkAsRead([message.id])}
                          >
                            <CheckCircle
                              style={{ width: 16, height: 16 }}
                            />
                          </IconButton>
                        </Tooltip>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
                {paginatedMessages.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={8} align="center" sx={{ py: 8 }}>
                      <Box
                        sx={{
                          display: "flex",
                          flexDirection: "column",
                          alignItems: "center",
                          gap: 1,
                        }}
                      >
                        <Bell style={{ width: 48, height: 48, color: "grey.300" }} />
                        <Typography color="text.secondary">
                          暂无消息
                        </Typography>
                      </Box>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </TableContainer>
          <TablePagination
            component="div"
            count={filteredMessages.length}
            page={page}
            onPageChange={(_, newPage) => setPage(newPage)}
            rowsPerPage={rowsPerPage}
            onRowsPerPageChange={(e) => {
              setRowsPerPage(parseInt(e.target.value, 10));
              setPage(0);
            }}
            rowsPerPageOptions={[10, 20, 50]}
            labelRowsPerPage="每页行数"
          />
        </Card>
      </Box>

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
              icon={getTypeIcon(selectedMessage?.type)}
              label={getTypeLabel(selectedMessage?.type)}
              color={getTypeColor(selectedMessage?.type)}
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
            <TextField
              label="消息标题"
              fullWidth
              size="small"
              required
            />
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
            <TextField
              label="消息内容"
              fullWidth
              multiline
              rows={4}
              required
            />
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
