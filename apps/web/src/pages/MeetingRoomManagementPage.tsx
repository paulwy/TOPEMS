import {
  Button,
  Card,
  CardContent,
  CardHeader,
  Chip,
  Typography,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Tooltip,
  Box,
  TextField,
  Stack,
} from "@mui/material";
import React, { useState, useEffect, useMemo } from "react";
import {
  Calendar,
  Search,
  Plus,
  Edit,
  Trash2,
  ChevronLeft,
  AlertCircle,
  Users,
  MapPin,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import {
  meetingRoomApi,
  meetingBookingApi,
  type MeetingRoom,
  type MeetingBooking,
} from "../api/erp";
import { useAppStore } from "../store";
import type { ColumnDef } from "@tanstack/react-table";
import { DataTable } from "@/components/DataTable";

import { ModeToggle } from "@/components/ModeToggle";

interface MeetingRoomManagementPageProps {
  onNavigate?: (page: string) => void;
}

const MeetingRoomManagementPage: React.FC<MeetingRoomManagementPageProps> = ({
  onNavigate,
}) => {
  const navigate = useNavigate();
  const addNotification = useAppStore((state) => state.addNotification);

  const [rooms, setRooms] = useState<MeetingRoom[]>([]);
  const [bookings, setBookings] = useState<MeetingBooking[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showBookingModal, setShowBookingModal] = useState(false);
  const [selectedRoom, setSelectedRoom] = useState<MeetingRoom | null>(null);
  const [selectedBooking, setSelectedBooking] = useState<
    Partial<MeetingBooking>
  >({});

  const [newRoom, setNewRoom] = useState<Partial<MeetingRoom>>({
    name: "",
    capacity: 0,
    location: "",
    facilities: [],
    status: "active",
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [roomsRes, bookingsRes] = await Promise.all([
        meetingRoomApi.list(),
        meetingBookingApi.list(),
      ]);

      if (roomsRes.success && roomsRes.data) {
        setRooms(roomsRes.data.items || []);
      }

      if (bookingsRes.success && bookingsRes.data) {
        setBookings(bookingsRes.data.items || []);
      }
    } catch (err: any) {
      setError(err.message || "加载数据失败");
      addNotification({
        title: "加载失败",
        message: "加载数据失败",
        type: "error",
      });
      setRooms([]);
      setBookings([]);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateRoom = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await meetingRoomApi.create(newRoom);
      if (res.success) {
        addNotification({
          title: "成功",
          message: "会议室创建成功",
          type: "success",
        });
        setShowCreateModal(false);
        setNewRoom({
          name: "",
          capacity: 0,
          location: "",
          facilities: [],
          status: "active",
        });
        loadData();
      } else {
        addNotification({
          title: "失败",
          message: res.message || "创建会议室失败",
          type: "error",
        });
      }
    } catch (err: any) {
      addNotification({
        title: "失败",
        message: err.message || "创建会议室失败",
        type: "error",
      });
    }
  };

  const handleDeleteRoom = async (id: string) => {
    if (!confirm("确定要删除这个会议室吗？")) return;
    try {
      const res = await meetingRoomApi.delete(id);
      if (res.success) {
        addNotification({
          title: "成功",
          message: "会议室删除成功",
          type: "success",
        });
        loadData();
      } else {
        addNotification({
          title: "失败",
          message: res.message || "删除会议室失败",
          type: "error",
        });
      }
    } catch (err: any) {
      addNotification({
        title: "失败",
        message: err.message || "删除会议室失败",
        type: "error",
      });
    }
  };

  const handleEditRoom = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedRoom) return;
    try {
      const res = await meetingRoomApi.update(selectedRoom.id, selectedRoom);
      if (res.success) {
        addNotification({
          title: "成功",
          message: "会议室信息更新成功",
          type: "success",
        });
        setShowEditModal(false);
        setSelectedRoom(null);
        loadData();
      } else {
        addNotification({
          title: "失败",
          message: res.message || "更新会议室失败",
          type: "error",
        });
      }
    } catch (err: any) {
      addNotification({
        title: "失败",
        message: err.message || "更新会议室失败",
        type: "error",
      });
    }
  };

  const handleCreateBooking = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await meetingBookingApi.create(selectedBooking);
      if (res.success) {
        addNotification({
          title: "成功",
          message: "预约成功",
          type: "success",
        });
        setShowBookingModal(false);
        setSelectedBooking({});
        loadData();
      } else {
        addNotification({
          title: "失败",
          message: res.message || "预约失败",
          type: "error",
        });
      }
    } catch (err: any) {
      addNotification({
        title: "失败",
        message: err.message || "预约失败",
        type: "error",
      });
    }
  };

  const getStatusBadge = (status: string) => {
    const colors: Record<
      string,
      "default" | "secondary" | "destructive" | "outline"
    > = {
      active: "default",
      inactive: "secondary",
      confirmed: "default",
      pending: "outline",
      cancelled: "destructive",
    };
    const labels: Record<string, string> = {
      active: "可用",
      inactive: "停用",
      confirmed: "已确认",
      pending: "待确认",
      cancelled: "已取消",
    };
    return (
      <Chip
        size="small"
        variant={(colors[status] || "outlined") as "filled" | "outlined"}
        label={labels[status] || status}
      />
    );
  };

  const roomsColumns = useMemo<ColumnDef<MeetingRoom>[]>(
    () => [
      {
        accessorKey: "name",
        header: "会议室名称",
        cell: ({ row }) => (
          <Typography variant="body2" sx={{ fontWeight: 500, color: "grey.900" }}>
            {row.original.name}
          </Typography>
        ),
      },
      {
        accessorKey: "capacity",
        header: "容量",
        cell: ({ row }) => (
          <Box sx={{ display: "flex", alignItems: "center", fontSize: "0.875rem", color: "grey.900" }}>
            <Users sx={{ width: 12, height: 12, mr: 0.5, color: "primary.main" }} />
            {row.original.capacity} 人
          </Box>
        ),
      },
      {
        accessorKey: "location",
        header: "位置",
        cell: ({ row }) => (
          <Box sx={{ display: "flex", alignItems: "center", fontSize: "0.875rem", color: "grey.500" }}>
            <MapPin sx={{ width: 12, height: 12, mr: 0.5, color: "primary.main" }} />
            {row.original.location || "-"}
          </Box>
        ),
      },
      {
        accessorKey: "facilities",
        header: "设施",
        cell: ({ row }) => (
          <Typography variant="body2" sx={{ fontSize: "0.875rem", color: "grey.500" }}>
            {row.original.facilities?.join(", ") || "-"}
          </Typography>
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
        cell: ({ row }) => {
          const room = row.original;
          return (
            <Box sx={{ display: "flex", justifyContent: "flex-end", gap: 0.5 }}>
              <Tooltip title="预约">
                <Button
                  variant="text"
                  size="small"
                  onClick={() => {
                    setSelectedBooking({
                      room_id: room.id,
                      room_name: room.name,
                      status: "confirmed",
                    });
                    setShowBookingModal(true);
                  }}
                >
                  <Calendar sx={{ width: 16, height: 16 }} />
                </Button>
              </Tooltip>

              <Tooltip title="编辑">
                <Button
                  variant="text"
                  size="small"
                  onClick={() => {
                    setSelectedRoom(room);
                    setShowEditModal(true);
                  }}
                >
                  <Edit sx={{ width: 16, height: 16 }} />
                </Button>
              </Tooltip>

              <Tooltip title="删除">
                <Button
                  variant="text"
                  size="small"
                  sx={{ color: "error.main" }}
                  onClick={() => handleDeleteRoom(room.id)}
                >
                  <Trash2 sx={{ width: 16, height: 16 }} />
                </Button>
              </Tooltip>
            </Box>
          );
        },
      },
    ],
    [],
  );

  const bookingsColumns = useMemo<ColumnDef<MeetingBooking>[]>(
    () => [
      {
        accessorKey: "room_name",
        header: "会议室",
        cell: ({ row }) => (
          <Typography variant="body2" sx={{ fontWeight: 500, color: "grey.900" }}>
            {row.original.room_name}
          </Typography>
        ),
      },
      {
        accessorKey: "title",
        header: "会议主题",
        cell: ({ row }) => (
          <Typography variant="body2" sx={{ fontSize: "0.875rem", color: "grey.500" }}>
            {row.original.title}
          </Typography>
        ),
      },
      {
        accessorKey: "organizer",
        header: "组织者",
        cell: ({ row }) => (
          <Typography variant="body2" sx={{ fontSize: "0.875rem", color: "grey.500" }}>
            {row.original.organizer}
          </Typography>
        ),
      },
      {
        accessorKey: "start_time",
        header: "开始时间",
        cell: ({ row }) => (
          <Typography variant="body2" sx={{ fontSize: "0.875rem", color: "grey.500" }}>
            {new Date(row.original.start_time).toLocaleString()}
          </Typography>
        ),
      },
      {
        accessorKey: "end_time",
        header: "结束时间",
        cell: ({ row }) => (
          <Typography variant="body2" sx={{ fontSize: "0.875rem", color: "grey.500" }}>
            {new Date(row.original.end_time).toLocaleString()}
          </Typography>
        ),
      },
      {
        accessorKey: "status",
        header: "状态",
        cell: ({ row }) => getStatusBadge(row.original.status),
      },
    ],
    [],
  );

  return (
    <Box sx={{ minHeight: "100vh", bgcolor: "grey.100" }}>
      <Box
        sx={{
          bgcolor: "background.paper",
          boxShadow: 1,
          borderBottom: 1,
          borderColor: "divider",
        }}
      >
        <Box sx={{ maxWidth: 1280, mx: "auto", px: 3, py: 3 }}>
          <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
              <Button variant="text" onClick={() => navigate("/dashboard")}>
                <ChevronLeft sx={{ width: 20, height: 20 }} />
              </Button>
              <Box>
                <Typography
                  variant="h5"
                  sx={{ fontWeight: 700, color: "grey.900", display: "flex", alignItems: "center" }}
                >
                  <Calendar sx={{ width: 28, height: 28, mr: 1.5, color: "secondary.main" }} />
                  会议室管理
                </Typography>
                <Typography variant="body2" sx={{ mt: 0.5, color: "grey.500" }}>
                  管理会议室信息和预约安排
                </Typography>
              </Box>
            </Box>
            <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
              <ModeToggle />
              <Button onClick={() => setShowCreateModal(true)}>
                <Plus sx={{ width: 20, height: 20, mr: 1 }} />
                新增会议室
              </Button>
            </Box>
          </Box>
        </Box>
      </Box>

      <Box sx={{ maxWidth: 1280, mx: "auto", px: 3, py: 4 }}>
        <Stack spacing={4}>
          <Card>
            <CardHeader>
              <Typography variant="h6" sx={{ fontWeight: 600 }}>
                会议室列表
              </Typography>
            </CardHeader>
            <CardContent sx={{ p: 0 }}>
              {loading ? (
                <Box sx={{ p: 4, textAlign: "center" }}>
                  <Box
                    sx={{
                      display: "inline-block",
                      width: 32,
                      height: 32,
                      border: 4,
                      borderColor: "secondary.main",
                      borderTopColor: "transparent",
                      borderRadius: "50%",
                      animation: "spin 1s linear infinite",
                      "@keyframes spin": {
                        "0%": { transform: "rotate(0deg)" },
                        "100%": { transform: "rotate(360deg)" },
                      },
                    }}
                  />
                  <Typography sx={{ mt: 1, color: "grey.500" }}>
                    加载中...
                  </Typography>
                </Box>
              ) : error ? (
                <Box sx={{ p: 4, textAlign: "center" }}>
                  <AlertCircle sx={{ width: 48, height: 48, color: "error.main", mx: "auto", mb: 1.5 }} />
                  <Typography sx={{ color: "error.main" }}>{error}</Typography>
                  <Button sx={{ mt: 2 }} onClick={loadData}>
                    重试
                  </Button>
                </Box>
              ) : (
                <DataTable
                  columns={roomsColumns}
                  data={rooms}
                  searchPlaceholder="搜索会议室名称、位置..."
                  searchKey="name"
                />
              )}
            </CardContent>
          </Card>

          {bookings.length > 0 && (
            <Card>
              <CardHeader>
                <Typography variant="h6" sx={{ fontWeight: 600 }}>
                  预约记录
                </Typography>
              </CardHeader>
              <CardContent sx={{ p: 0 }}>
                <DataTable
                  columns={bookingsColumns}
                  data={bookings}
                  searchPlaceholder="搜索预约记录..."
                  searchKey="title"
                />
              </CardContent>
            </Card>
          )}
        </Stack>
      </Box>

      <Dialog
        open={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        maxWidth="xl"
      >
        <DialogTitle>新增会议室</DialogTitle>
        <DialogContent sx={{ maxWidth: 540, overflowY: "auto" }}>
          <form onSubmit={handleCreateRoom}>
            <Box
              sx={{ display: "flex", flexDirection: "column", gap: 2.5, pt: 1 }}
            >
              <TextField
                label="会议室名称 *"
                value={newRoom.name || ""}
                onChange={(e) =>
                  setNewRoom({ ...newRoom, name: e.target.value })
                }
                placeholder="请输入会议室名称"
                size="small"
                fullWidth
              />

              <Box sx={{ display: "flex", gap: 2 }}>
                <TextField
                  label="容量 *"
                  type="number"
                  value={newRoom.capacity || ""}
                  onChange={(e) =>
                    setNewRoom({
                      ...newRoom,
                      capacity: Number(e.target.value),
                    })
                  }
                  placeholder="请输入容量"
                  size="small"
                  fullWidth
                />
                <TextField
                  label="位置"
                  value={newRoom.location || ""}
                  onChange={(e) =>
                    setNewRoom({ ...newRoom, location: e.target.value })
                  }
                  placeholder="请输入位置"
                  size="small"
                  fullWidth
                />
              </Box>

              <TextField
                label="设施（用逗号分隔）"
                value={(newRoom.facilities || []).join(", ")}
                onChange={(e) =>
                  setNewRoom({
                    ...newRoom,
                    facilities: e.target.value
                      .split(",")
                      .map((s) => s.trim())
                      .filter((s) => s),
                  })
                }
                placeholder="如：投影仪, 麦克风, 白板"
                size="small"
                fullWidth
              />

              <FormControl size="small" fullWidth>
                <InputLabel>状态</InputLabel>
                <Select
                  value={newRoom.status || "active"}
                  label="状态"
                  onChange={(e) =>
                    setNewRoom({ ...newRoom, status: e.target.value })
                  }
                >
                  <MenuItem value="active">可用</MenuItem>
                  <MenuItem value="inactive">停用</MenuItem>
                </Select>
              </FormControl>
            </Box>

            <DialogActions sx={{ mt: 3 }}>
              <Button
                type="button"
                variant="contained"
                onClick={() => setShowCreateModal(false)}
              >
                取消
              </Button>
              <Button type="submit">创建</Button>
            </DialogActions>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog
        open={showEditModal}
        onClose={() => setShowEditModal(false)}
        maxWidth="xl"
      >
        <DialogTitle>编辑会议室</DialogTitle>
        <DialogContent sx={{ maxWidth: 540, overflowY: "auto" }}>
          {selectedRoom && (
            <form onSubmit={handleEditRoom}>
              <Box
                sx={{
                  display: "flex",
                  flexDirection: "column",
                  gap: 2.5,
                  pt: 1,
                }}
              >
                <TextField
                  label="会议室名称 *"
                  value={selectedRoom.name}
                  onChange={(e) =>
                    setSelectedRoom({ ...selectedRoom, name: e.target.value })
                  }
                  size="small"
                  fullWidth
                />

                <Box sx={{ display: "flex", gap: 2 }}>
                  <TextField
                    label="容量 *"
                    type="number"
                    value={selectedRoom.capacity}
                    onChange={(e) =>
                      setSelectedRoom({
                        ...selectedRoom,
                        capacity: Number(e.target.value),
                      })
                    }
                    size="small"
                    fullWidth
                  />
                  <TextField
                    label="位置"
                    value={selectedRoom.location || ""}
                    onChange={(e) =>
                      setSelectedRoom({
                        ...selectedRoom,
                        location: e.target.value,
                      })
                    }
                    size="small"
                    fullWidth
                  />
                </Box>

                <TextField
                  label="设施（用逗号分隔）"
                  value={(selectedRoom.facilities || []).join(", ")}
                  onChange={(e) =>
                    setSelectedRoom({
                      ...selectedRoom,
                      facilities: e.target.value
                        .split(",")
                        .map((s) => s.trim())
                        .filter((s) => s),
                    })
                  }
                  size="small"
                  fullWidth
                />

                <FormControl size="small" fullWidth>
                  <InputLabel>状态</InputLabel>
                  <Select
                    value={selectedRoom.status}
                    label="状态"
                    onChange={(e) =>
                      setSelectedRoom({
                        ...selectedRoom,
                        status: e.target.value,
                      })
                    }
                  >
                    <MenuItem value="active">可用</MenuItem>
                    <MenuItem value="inactive">停用</MenuItem>
                  </Select>
                </FormControl>
              </Box>

              <DialogActions sx={{ mt: 3 }}>
                <Button
                  type="button"
                  variant="contained"
                  onClick={() => {
                    setShowEditModal(false);
                    setSelectedRoom(null);
                  }}
                >
                  取消
                </Button>
                <Button type="submit">保存</Button>
              </DialogActions>
            </form>
          )}
        </DialogContent>
      </Dialog>

      <Dialog
        open={showBookingModal}
        onClose={() => setShowBookingModal(false)}
        maxWidth="xl"
      >
        <DialogTitle>预约会议室</DialogTitle>
        <DialogContent sx={{ maxWidth: 540, overflowY: "auto" }}>
          <form onSubmit={handleCreateBooking}>
            <Box
              sx={{ display: "flex", flexDirection: "column", gap: 2.5, pt: 1 }}
            >
              <TextField
                label="会议室"
                value={selectedBooking.room_name || ""}
                disabled
                size="small"
                fullWidth
              />

              <TextField
                label="会议主题 *"
                value={selectedBooking.title || ""}
                onChange={(e) =>
                  setSelectedBooking({
                    ...selectedBooking,
                    title: e.target.value,
                  })
                }
                placeholder="请输入会议主题"
                size="small"
                fullWidth
              />

              <TextField
                label="组织者 *"
                value={selectedBooking.organizer || ""}
                onChange={(e) =>
                  setSelectedBooking({
                    ...selectedBooking,
                    organizer: e.target.value,
                  })
                }
                placeholder="请输入组织者"
                size="small"
                fullWidth
              />

              <Box sx={{ display: "flex", gap: 2 }}>
                <TextField
                  label="开始时间 *"
                  type="datetime-local"
                  value={
                    selectedBooking.start_time
                      ? new Date(selectedBooking.start_time)
                          .toISOString()
                          .slice(0, 16)
                      : ""
                  }
                  onChange={(e) =>
                    setSelectedBooking({
                      ...selectedBooking,
                      start_time: e.target.value,
                    })
                  }
                  size="small"
                  fullWidth
                  slotProps={{ inputLabel: { shrink: true } }}
                />
                <TextField
                  label="结束时间 *"
                  type="datetime-local"
                  value={
                    selectedBooking.end_time
                      ? new Date(selectedBooking.end_time)
                          .toISOString()
                          .slice(0, 16)
                      : ""
                  }
                  onChange={(e) =>
                    setSelectedBooking({
                      ...selectedBooking,
                      end_time: e.target.value,
                    })
                  }
                  size="small"
                  fullWidth
                  slotProps={{ inputLabel: { shrink: true } }}
                />
              </Box>
            </Box>

            <DialogActions sx={{ mt: 3 }}>
              <Button
                type="button"
                variant="contained"
                onClick={() => {
                  setShowBookingModal(false);
                  setSelectedBooking({});
                }}
              >
                取消
              </Button>
              <Button type="submit">预约</Button>
            </DialogActions>
          </form>
        </DialogContent>
      </Dialog>
    </Box>
  );
};

export default MeetingRoomManagementPage;
