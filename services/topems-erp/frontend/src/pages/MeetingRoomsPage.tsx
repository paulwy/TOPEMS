import React, { useEffect, useState } from 'react';
import { meetingRoomApi, bookingApi, type MeetingRoom, type Booking } from '../api/erp';

const MeetingRoomsPage: React.FC = () => {
  const [rooms, setRooms] = useState<MeetingRoom[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showRoomModal, setShowRoomModal] = useState(false);
  const [showBookingModal, setShowBookingModal] = useState(false);
  const [editingRoom, setEditingRoom] = useState<MeetingRoom | null>(null);
  const [selectedRoom, setSelectedRoom] = useState<MeetingRoom | null>(null);
  const [roomFormData, setRoomFormData] = useState<Partial<MeetingRoom>>({
    name: '',
    location: '',
    capacity: 10,
    status: 'available',
  });
  const [bookingFormData, setBookingFormData] = useState<Partial<Booking>>({
    start_time: '',
    end_time: '',
    purpose: '',
  });

  useEffect(() => {
    fetchRooms();
    fetchBookings();
  }, []);

  const fetchRooms = async () => {
    try {
      const response = await meetingRoomApi.list();
      if (response.success && response.data) {
        setRooms(response.data.items || []);
      }
    } catch (err) {
      setError('获取会议室列表失败');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const fetchBookings = async () => {
    try {
      const response = await bookingApi.list();
      if (response.success && response.data) {
        setBookings(response.data.items || []);
      }
    } catch (err) {
      console.error('获取预订列表失败', err);
    }
  };

  const handleRoomSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingRoom) {
        await meetingRoomApi.update(editingRoom.id, roomFormData);
      } else {
        await meetingRoomApi.create(roomFormData);
      }
      setShowRoomModal(false);
      setEditingRoom(null);
      fetchRooms();
    } catch (err) {
      console.error('操作失败', err);
    }
  };

  const handleBookingSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedRoom) return;
    try {
      await bookingApi.create({
        ...bookingFormData,
        meeting_room_id: selectedRoom.id,
      });
      setShowBookingModal(false);
      setSelectedRoom(null);
      fetchBookings();
    } catch (err) {
      console.error('预订失败', err);
    }
  };

  const handleDeleteRoom = async (id: string) => {
    if (!confirm('确定要删除这个会议室吗？')) return;
    try {
      await meetingRoomApi.delete(id);
      fetchRooms();
    } catch (err) {
      console.error('删除失败', err);
    }
  };

  const handleCancelBooking = async (id: string) => {
    if (!confirm('确定要取消这个预订吗？')) return;
    try {
      await bookingApi.update(id, { status: 'cancelled' });
      fetchBookings();
    } catch (err) {
      console.error('取消失败', err);
    }
  };

  const getRoomStatusBadge = (status: string) => {
    const colors: Record<string, string> = {
      available: 'bg-green-100 text-green-800',
      occupied: 'bg-red-100 text-red-800',
      maintenance: 'bg-yellow-100 text-yellow-800',
    };
    const labels: Record<string, string> = {
      available: '可用',
      occupied: '已占用',
      maintenance: '维护中',
    };
    return (
      <span className={`px-2 py-1 text-xs font-medium rounded-full ${colors[status] || 'bg-gray-100 text-gray-800'}`}>
        {labels[status] || status}
      </span>
    );
  };

  const getBookingStatusBadge = (status: string) => {
    const colors: Record<string, string> = {
      pending: 'bg-yellow-100 text-yellow-800',
      confirmed: 'bg-green-100 text-green-800',
      cancelled: 'bg-gray-100 text-gray-800',
      completed: 'bg-blue-100 text-blue-800',
    };
    const labels: Record<string, string> = {
      pending: '待确认',
      confirmed: '已确认',
      cancelled: '已取消',
      completed: '已完成',
    };
    return (
      <span className={`px-2 py-1 text-xs font-medium rounded-full ${colors[status] || 'bg-gray-100 text-gray-800'}`}>
        {labels[status] || status}
      </span>
    );
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="text-gray-500">加载中...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="text-red-500">{error}</div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-900">会议室管理</h1>
        <button
          onClick={() => {
            setEditingRoom(null);
            setRoomFormData({
              name: '',
              location: '',
              capacity: 10,
              status: 'available',
            });
            setShowRoomModal(true);
          }}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
        >
          添加会议室
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div>
          <h2 className="text-xl font-semibold mb-4">会议室列表</h2>
          <div className="bg-white shadow-md rounded-lg overflow-hidden">
            {rooms.map((room) => (
              <div key={room.id} className="p-4 border-b border-gray-200">
                <div className="flex justify-between items-start mb-2">
                <div>
                  <h3 className="text-lg font-medium text-gray-900">{room.name}</h3>
                  <p className="text-sm text-gray-500">{room.location}</p>
                </div>
                {getRoomStatusBadge(room.status)}
              </div>
              <p className="text-sm text-gray-600 mb-3">容量：{room.capacity} 人</p>
              {room.facilities && Array.isArray(room.facilities) && (
                <div className="flex flex-wrap gap-1 mb-3">
                  {room.facilities.map((facility, index) => (
                    <span key={index} className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded">
                      {String(facility)}
                    </span>
                  ))}
                </div>
              )}
                <div className="flex justify-end space-x-2">
                  <button
                    onClick={() => {
                      setSelectedRoom(room);
                      setBookingFormData({
                        start_time: '',
                        end_time: '',
                        purpose: '',
                      });
                      setShowBookingModal(true);
                    }}
                    className="text-green-600 hover:text-green-900 text-sm"
                  >
                    预订
                  </button>
                  <button
                    onClick={() => {
                      setEditingRoom(room);
                      setRoomFormData(room);
                      setShowRoomModal(true);
                    }}
                    className="text-blue-600 hover:text-blue-900 text-sm"
                  >
                    编辑
                  </button>
                  <button
                    onClick={() => handleDeleteRoom(room.id)}
                    className="text-red-600 hover:text-red-900 text-sm"
                  >
                    删除
                  </button>
                </div>
              </div>
            ))}
            {rooms.length === 0 && (
              <div className="text-center py-12">
                <p className="text-gray-500">暂无会议室数据</p>
              </div>
            )}
          </div>
        </div>

        <div>
          <h2 className="text-xl font-semibold mb-4">预订记录</h2>
          <div className="bg-white shadow-md rounded-lg overflow-hidden">
            {bookings.map((booking) => {
              const room = rooms.find(r => r.id === booking.meeting_room_id);
              return (
                <div key={booking.id} className="p-4 border-b border-gray-200">
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <h3 className="text-lg font-medium text-gray-900">{room?.name || '未知会议室'}</h3>
                      <p className="text-sm text-gray-600">{booking.purpose}</p>
                    </div>
                    {getBookingStatusBadge(booking.status)}
                  </div>
                  <p className="text-sm text-gray-500">
                    {new Date(booking.start_time).toLocaleString()} - {new Date(booking.end_time).toLocaleString()}
                  </p>
                  <p className="text-sm text-gray-500">预订人：{booking.booked_by || '未知'}</p>
                  {booking.status === 'pending' || booking.status === 'confirmed' ? (
                    <div className="flex justify-end mt-2">
                      <button
                        onClick={() => handleCancelBooking(booking.id)}
                        className="text-red-600 hover:text-red-900 text-sm"
                      >
                        取消预订
                      </button>
                    </div>
                  ) : null}
                </div>
              );
            })}
            {bookings.length === 0 && (
              <div className="text-center py-12">
                <p className="text-gray-500">暂无预订记录</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {showRoomModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h2 className="text-xl font-bold mb-4">{editingRoom ? '编辑会议室' : '添加会议室'}</h2>
            <form onSubmit={handleRoomSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">名称 *</label>
                <input
                  type="text"
                  required
                  value={roomFormData.name || ''}
                  onChange={(e) => setRoomFormData({ ...roomFormData, name: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">位置</label>
                <input
                  type="text"
                  value={roomFormData.location || ''}
                  onChange={(e) => setRoomFormData({ ...roomFormData, location: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">容量</label>
                <input
                  type="number"
                  value={roomFormData.capacity || 10}
                  onChange={(e) => setRoomFormData({ ...roomFormData, capacity: Number(e.target.value) })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">状态</label>
                <select
                    value={roomFormData.status || 'available'}
                    onChange={(e) => setRoomFormData({ ...roomFormData, status: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  >
                  <option value="available">可用</option>
                  <option value="occupied">已占用</option>
                  <option value="maintenance">维护中</option>
                </select>
              </div>
              <div className="flex justify-end space-x-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowRoomModal(false)}
                  className="px-4 py-2 text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200"
                >
                  取消
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-white bg-blue-600 rounded-md hover:bg-blue-700"
                >
                  保存
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showBookingModal && selectedRoom && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h2 className="text-xl font-bold mb-4">预订 {selectedRoom.name}</h2>
            <form onSubmit={handleBookingSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">开始时间 *</label>
                <input
                  type="datetime-local"
                  required
                  value={bookingFormData.start_time?.slice(0, 16) || ''}
                  onChange={(e) => setBookingFormData({ ...bookingFormData, start_time: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">结束时间 *</label>
                <input
                  type="datetime-local"
                  required
                  value={bookingFormData.end_time?.slice(0, 16) || ''}
                  onChange={(e) => setBookingFormData({ ...bookingFormData, end_time: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">预订用途 *</label>
                <textarea
                  required
                  value={bookingFormData.purpose || ''}
                  onChange={(e) => setBookingFormData({ ...bookingFormData, purpose: e.target.value })}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                />
              </div>
              <div className="flex justify-end space-x-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowBookingModal(false)}
                  className="px-4 py-2 text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200"
                >
                  取消
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-white bg-green-600 rounded-md hover:bg-green-700"
                >
                  预订
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default MeetingRoomsPage;
