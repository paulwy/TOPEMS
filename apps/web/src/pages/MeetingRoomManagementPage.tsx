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

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { ModeToggle } from "@/components/ModeToggle";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

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
      <Badge variant={colors[status] || "outline"}>
        {labels[status] || status}
      </Badge>
    );
  };

  const roomsColumns = useMemo<ColumnDef<MeetingRoom>[]>(
    () => [
      {
        accessorKey: "name",
        header: "会议室名称",
        cell: ({ row }) => (
          <div className="font-medium text-slate-900 dark:text-slate-100">
            {row.original.name}
          </div>
        ),
      },
      {
        accessorKey: "capacity",
        header: "容量",
        cell: ({ row }) => (
          <div className="flex items-center text-sm text-slate-900 dark:text-slate-100">
            <Users className="w-3 h-3 mr-1 text-blue-600" />
            {row.original.capacity} 人
          </div>
        ),
      },
      {
        accessorKey: "location",
        header: "位置",
        cell: ({ row }) => (
          <div className="flex items-center text-sm text-slate-500 dark:text-slate-400">
            <MapPin className="w-3 h-3 mr-1 text-blue-600" />
            {row.original.location || "-"}
          </div>
        ),
      },
      {
        accessorKey: "facilities",
        header: "设施",
        cell: ({ row }) => (
          <span className="text-sm text-slate-500 dark:text-slate-400">
            {row.original.facilities?.join(", ") || "-"}
          </span>
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
            <div className="flex items-center justify-end space-x-2">
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setSelectedBooking({
                          room_id: room.id,
                          room_name: room.name,
                          status: "confirmed",
                        });
                        setShowBookingModal(true);
                      }}
                    >
                      <Calendar className="w-4 h-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>预约</TooltipContent>
                </Tooltip>
              </TooltipProvider>

              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setSelectedRoom(room);
                        setShowEditModal(true);
                      }}
                    >
                      <Edit className="w-4 h-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>编辑</TooltipContent>
                </Tooltip>
              </TooltipProvider>

              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-red-600 hover:text-red-700 dark:text-red-400"
                      onClick={() => handleDeleteRoom(room.id)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>删除</TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
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
          <div className="font-medium text-slate-900 dark:text-slate-100">
            {row.original.room_name}
          </div>
        ),
      },
      {
        accessorKey: "title",
        header: "会议主题",
        cell: ({ row }) => (
          <span className="text-sm text-slate-500 dark:text-slate-400">
            {row.original.title}
          </span>
        ),
      },
      {
        accessorKey: "organizer",
        header: "组织者",
        cell: ({ row }) => (
          <span className="text-sm text-slate-500 dark:text-slate-400">
            {row.original.organizer}
          </span>
        ),
      },
      {
        accessorKey: "start_time",
        header: "开始时间",
        cell: ({ row }) => (
          <span className="text-sm text-slate-500 dark:text-slate-400">
            {new Date(row.original.start_time).toLocaleString()}
          </span>
        ),
      },
      {
        accessorKey: "end_time",
        header: "结束时间",
        cell: ({ row }) => (
          <span className="text-sm text-slate-500 dark:text-slate-400">
            {new Date(row.original.end_time).toLocaleString()}
          </span>
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
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900">
      <div className="bg-white dark:bg-slate-800 shadow-sm border-b border-slate-200 dark:border-slate-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <Button variant="ghost" onClick={() => navigate("/dashboard")}>
                <ChevronLeft className="w-5 h-5" />
              </Button>
              <div>
                <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100 flex items-center">
                  <Calendar className="w-7 h-7 mr-3 text-purple-600" />
                  会议室管理
                </h1>
                <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                  管理会议室信息和预约安排
                </p>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <ModeToggle />
              <Button onClick={() => setShowCreateModal(true)}>
                <Plus className="w-5 h-5 mr-2" />
                新增会议室
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        <Card>
          <CardHeader>
            <CardTitle>会议室列表</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {loading ? (
              <div className="p-8 text-center">
                <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-purple-600 border-t-transparent" />
                <p className="mt-2 text-slate-500 dark:text-slate-400">
                  加载中...
                </p>
              </div>
            ) : error ? (
              <div className="p-8 text-center">
                <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-3" />
                <p className="text-red-600 dark:text-red-400">{error}</p>
                <Button className="mt-4" onClick={loadData}>
                  重试
                </Button>
              </div>
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
              <CardTitle>预约记录</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <DataTable
                columns={bookingsColumns}
                data={bookings}
                searchPlaceholder="搜索预约记录..."
                searchKey="title"
              />
            </CardContent>
          </Card>
        )}
      </div>

      <Dialog open={showCreateModal} onOpenChange={setShowCreateModal}>
        <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>新增会议室</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleCreateRoom}>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">会议室名称 *</Label>
                <Input
                  id="name"
                  type="text"
                  required
                  value={newRoom.name || ""}
                  onChange={(e) =>
                    setNewRoom({ ...newRoom, name: e.target.value })
                  }
                  placeholder="请输入会议室名称"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="capacity">容量 *</Label>
                  <Input
                    id="capacity"
                    type="number"
                    required
                    value={newRoom.capacity || ""}
                    onChange={(e) =>
                      setNewRoom({
                        ...newRoom,
                        capacity: Number(e.target.value),
                      })
                    }
                    placeholder="请输入容量"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="location">位置</Label>
                  <Input
                    id="location"
                    type="text"
                    value={newRoom.location || ""}
                    onChange={(e) =>
                      setNewRoom({ ...newRoom, location: e.target.value })
                    }
                    placeholder="请输入位置"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="facilities">设施（用逗号分隔）</Label>
                <Input
                  id="facilities"
                  type="text"
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
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="status">状态</Label>
                <Select
                  value={newRoom.status || "active"}
                  onValueChange={(value) =>
                    setNewRoom({ ...newRoom, status: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="请选择状态" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">可用</SelectItem>
                    <SelectItem value="inactive">停用</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <DialogFooter className="mt-6">
              <Button
                type="button"
                variant="secondary"
                onClick={() => setShowCreateModal(false)}
              >
                取消
              </Button>
              <Button type="submit">创建</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={showEditModal} onOpenChange={setShowEditModal}>
        <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>编辑会议室</DialogTitle>
          </DialogHeader>
          {selectedRoom && (
            <form onSubmit={handleEditRoom}>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="edit_name">会议室名称 *</Label>
                  <Input
                    id="edit_name"
                    type="text"
                    required
                    value={selectedRoom.name}
                    onChange={(e) =>
                      setSelectedRoom({ ...selectedRoom, name: e.target.value })
                    }
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="edit_capacity">容量 *</Label>
                    <Input
                      id="edit_capacity"
                      type="number"
                      required
                      value={selectedRoom.capacity}
                      onChange={(e) =>
                        setSelectedRoom({
                          ...selectedRoom,
                          capacity: Number(e.target.value),
                        })
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="edit_location">位置</Label>
                    <Input
                      id="edit_location"
                      type="text"
                      value={selectedRoom.location || ""}
                      onChange={(e) =>
                        setSelectedRoom({
                          ...selectedRoom,
                          location: e.target.value,
                        })
                      }
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="edit_facilities">设施（用逗号分隔）</Label>
                  <Input
                    id="edit_facilities"
                    type="text"
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
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="edit_status">状态</Label>
                  <Select
                    value={selectedRoom.status}
                    onValueChange={(value) =>
                      setSelectedRoom({ ...selectedRoom, status: value })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="请选择状态" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="active">可用</SelectItem>
                      <SelectItem value="inactive">停用</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <DialogFooter className="mt-6">
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => {
                    setShowEditModal(false);
                    setSelectedRoom(null);
                  }}
                >
                  取消
                </Button>
                <Button type="submit">保存</Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={showBookingModal} onOpenChange={setShowBookingModal}>
        <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>预约会议室</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleCreateBooking}>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="booking_room">会议室</Label>
                <Input
                  id="booking_room"
                  type="text"
                  disabled
                  value={selectedBooking.room_name || ""}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="booking_title">会议主题 *</Label>
                <Input
                  id="booking_title"
                  type="text"
                  required
                  value={selectedBooking.title || ""}
                  onChange={(e) =>
                    setSelectedBooking({
                      ...selectedBooking,
                      title: e.target.value,
                    })
                  }
                  placeholder="请输入会议主题"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="booking_organizer">组织者 *</Label>
                <Input
                  id="booking_organizer"
                  type="text"
                  required
                  value={selectedBooking.organizer || ""}
                  onChange={(e) =>
                    setSelectedBooking({
                      ...selectedBooking,
                      organizer: e.target.value,
                    })
                  }
                  placeholder="请输入组织者"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="booking_start">开始时间 *</Label>
                  <Input
                    id="booking_start"
                    type="datetime-local"
                    required
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
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="booking_end">结束时间 *</Label>
                  <Input
                    id="booking_end"
                    type="datetime-local"
                    required
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
                  />
                </div>
              </div>
            </div>

            <DialogFooter className="mt-6">
              <Button
                type="button"
                variant="secondary"
                onClick={() => {
                  setShowBookingModal(false);
                  setSelectedBooking({});
                }}
              >
                取消
              </Button>
              <Button type="submit">预约</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default MeetingRoomManagementPage;
