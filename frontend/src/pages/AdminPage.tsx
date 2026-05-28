import React, { useState } from 'react';
import { 
  Package, Calendar, FileText, Settings, ChevronLeft,
  Plus, Search, Edit, Trash2, Eye, Grid, List,
  ShoppingCart, ClipboardList, Building2, Users
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface OfficeSupply {
  id: string;
  name: string;
  category: string;
  quantity: number;
  unit: string;
  price: number;
  location: string;
  status: 'in_stock' | 'low_stock' | 'out_of_stock';
  created_at: string;
}

interface MeetingRoom {
  id: string;
  name: string;
  capacity: number;
  location: string;
  facilities: string[];
  status: 'available' | 'occupied';
}

interface MeetingBooking {
  id: string;
  room_name: string;
  title: string;
  organizer: string;
  start_time: string;
  end_time: string;
  status: 'confirmed' | 'cancelled';
}

const AdminPage: React.FC = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'supplies' | 'meetings' | 'booking'>('supplies');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

  const officeSupplies: OfficeSupply[] = [
    { id: '1', name: 'A4打印纸', category: '办公耗材', quantity: 500, unit: '包', price: 25, location: '仓库A区', status: 'in_stock', created_at: '2026-05-01' },
    { id: '2', name: '签字笔', category: '文具', quantity: 120, unit: '支', price: 2, location: '行政办公室', status: 'in_stock', created_at: '2026-05-10' },
    { id: '3', name: '文件夹', category: '办公用品', quantity: 30, unit: '个', price: 5, location: '仓库A区', status: 'low_stock', created_at: '2026-04-20' },
    { id: '4', name: '打印机墨盒', category: '办公耗材', quantity: 5, unit: '个', price: 150, location: 'IT办公室', status: 'low_stock', created_at: '2026-03-15' },
    { id: '5', name: '订书机', category: '文具', quantity: 15, unit: '个', price: 15, location: '行政办公室', status: 'in_stock', created_at: '2026-05-05' },
    { id: '6', name: '便签纸', category: '文具', quantity: 80, unit: '本', price: 3, location: '仓库A区', status: 'out_of_stock', created_at: '2026-02-28' },
  ];

  const meetingRooms: MeetingRoom[] = [
    { id: '1', name: '第一会议室', capacity: 20, location: 'A栋3层', facilities: ['投影仪', '白板', '视频会议'], status: 'available' },
    { id: '2', name: '第二会议室', capacity: 10, location: 'A栋3层', facilities: ['投影仪', '白板'], status: 'occupied' },
    { id: '3', name: '第三会议室', capacity: 8, location: 'B栋2层', facilities: ['白板'], status: 'available' },
    { id: '4', name: '大会议室', capacity: 50, location: 'A栋1层', facilities: ['投影仪', '音响', '视频会议', '白板'], status: 'occupied' },
  ];

  const meetingBookings: MeetingBooking[] = [
    { id: '1', room_name: '第二会议室', title: '产品需求评审', organizer: '张三', start_time: '2026-05-27 09:00', end_time: '2026-05-27 10:30', status: 'confirmed' },
    { id: '2', room_name: '大会议室', title: '季度总结大会', organizer: '李四', start_time: '2026-05-27 14:00', end_time: '2026-05-27 17:00', status: 'confirmed' },
    { id: '3', room_name: '第一会议室', title: '技术方案讨论', organizer: '王五', start_time: '2026-05-28 10:00', end_time: '2026-05-28 11:30', status: 'confirmed' },
  ];

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'in_stock':
        return <span className="px-2 py-1 bg-green-100 text-green-700 text-xs rounded-full">库存充足</span>;
      case 'low_stock':
        return <span className="px-2 py-1 bg-yellow-100 text-yellow-700 text-xs rounded-full">库存不足</span>;
      case 'out_of_stock':
        return <span className="px-2 py-1 bg-red-100 text-red-700 text-xs rounded-full">已售罄</span>;
      case 'available':
        return <span className="px-2 py-1 bg-green-100 text-green-700 text-xs rounded-full">可用</span>;
      case 'occupied':
        return <span className="px-2 py-1 bg-red-100 text-red-700 text-xs rounded-full">使用中</span>;
      case 'confirmed':
        return <span className="px-2 py-1 bg-green-100 text-green-700 text-xs rounded-full">已确认</span>;
      case 'cancelled':
        return <span className="px-2 py-1 bg-gray-100 text-gray-700 text-xs rounded-full">已取消</span>;
      default:
        return <span className="px-2 py-1 bg-gray-100 text-gray-700 text-xs rounded-full">未知状态</span>;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-4">
              <button
                onClick={() => navigate('/dashboard')}
                className="p-2 text-gray-500 hover:bg-gray-100 rounded-lg"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-indigo-500 rounded-lg flex items-center justify-center">
                  <Settings className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h1 className="text-xl font-bold text-gray-900">行政管理</h1>
                  <p className="text-xs text-gray-500">Administrative Management</p>
                </div>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="搜索..."
                  className="pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                />
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Tabs */}
        <div className="mb-6 bg-white rounded-lg shadow-sm p-1 flex space-x-1">
          <button
            onClick={() => setActiveTab('supplies')}
            className={`flex-1 px-4 py-2 rounded-lg font-medium transition-colors ${
              activeTab === 'supplies'
                ? 'bg-blue-600 text-white'
                : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            <div className="flex items-center justify-center space-x-2">
              <Package className="w-5 h-5" />
              <span>办公用品</span>
            </div>
          </button>
          <button
            onClick={() => setActiveTab('meetings')}
            className={`flex-1 px-4 py-2 rounded-lg font-medium transition-colors ${
              activeTab === 'meetings'
                ? 'bg-blue-600 text-white'
                : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            <div className="flex items-center justify-center space-x-2">
              <Building2 className="w-5 h-5" />
              <span>会议室</span>
            </div>
          </button>
          <button
            onClick={() => setActiveTab('booking')}
            className={`flex-1 px-4 py-2 rounded-lg font-medium transition-colors ${
              activeTab === 'booking'
                ? 'bg-blue-600 text-white'
                : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            <div className="flex items-center justify-center space-x-2">
              <Calendar className="w-5 h-5" />
              <span>会议预约</span>
            </div>
          </button>
        </div>

        {/* Office Supplies */}
        {activeTab === 'supplies' && (
          <div className="bg-white rounded-xl shadow-sm">
            <div className="p-6 border-b border-gray-200">
              <div className="flex justify-between items-center">
                <h2 className="text-lg font-semibold text-gray-900">办公用品管理</h2>
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => setViewMode('grid')}
                    className={`p-2 rounded-lg ${viewMode === 'grid' ? 'bg-blue-100 text-blue-600' : 'text-gray-500 hover:bg-gray-100'}`}
                  >
                    <Grid className="w-5 h-5" />
                  </button>
                  <button
                    onClick={() => setViewMode('list')}
                    className={`p-2 rounded-lg ${viewMode === 'list' ? 'bg-blue-100 text-blue-600' : 'text-gray-500 hover:bg-gray-100'}`}
                  >
                    <List className="w-5 h-5" />
                  </button>
                </div>
              </div>
            </div>
            <div className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {officeSupplies.map((supply) => (
                  <div key={supply.id} className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center space-x-3">
                        <div className="w-10 h-10 bg-blue-50 rounded-lg flex items-center justify-center">
                          <Package className="w-5 h-5 text-blue-600" />
                        </div>
                        <div>
                          <h3 className="font-semibold text-gray-900">{supply.name}</h3>
                          <p className="text-sm text-gray-500">{supply.category}</p>
                        </div>
                      </div>
                      {getStatusBadge(supply.status)}
                    </div>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-gray-500">数量:</span>
                        <span className="font-medium text-gray-900">{supply.quantity} {supply.unit}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-500">单价:</span>
                        <span className="font-medium text-gray-900">¥{supply.price}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-500">存放位置:</span>
                        <span className="font-medium text-gray-900">{supply.location}</span>
                      </div>
                    </div>
                    <div className="mt-4 flex space-x-2">
                      <button className="flex-1 px-3 py-2 text-sm text-blue-600 border border-blue-600 rounded-lg hover:bg-blue-50 transition-colors">
                        编辑
                      </button>
                      <button className="flex-1 px-3 py-2 text-sm text-red-600 border border-red-600 rounded-lg hover:bg-red-50 transition-colors">
                        删除
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Meeting Rooms */}
        {activeTab === 'meetings' && (
          <div className="bg-white rounded-xl shadow-sm">
            <div className="p-6 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900">会议室管理</h2>
            </div>
            <div className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {meetingRooms.map((room) => (
                  <div key={room.id} className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center space-x-3">
                        <div className="w-10 h-10 bg-indigo-50 rounded-lg flex items-center justify-center">
                          <Building2 className="w-5 h-5 text-indigo-600" />
                        </div>
                        <div>
                          <h3 className="font-semibold text-gray-900">{room.name}</h3>
                          <p className="text-sm text-gray-500">容量: {room.capacity}人</p>
                        </div>
                      </div>
                      {getStatusBadge(room.status)}
                    </div>
                    <div className="space-y-2 text-sm mb-4">
                      <div className="flex justify-between">
                        <span className="text-gray-500">位置:</span>
                        <span className="font-medium text-gray-900">{room.location}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-500">设施:</span>
                        <span className="font-medium text-gray-900">{room.facilities.join(', ')}</span>
                      </div>
                    </div>
                    <div className="flex space-x-2">
                      <button className="flex-1 px-3 py-2 text-sm text-blue-600 border border-blue-600 rounded-lg hover:bg-blue-50 transition-colors">
                        编辑
                      </button>
                      <button className="flex-1 px-3 py-2 text-sm text-indigo-600 border border-indigo-600 rounded-lg hover:bg-indigo-50 transition-colors">
                        预约
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Meeting Bookings */}
        {activeTab === 'booking' && (
          <div className="bg-white rounded-xl shadow-sm">
            <div className="p-6 border-b border-gray-200">
              <div className="flex justify-between items-center">
                <h2 className="text-lg font-semibold text-gray-900">会议预约记录</h2>
                <button className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center space-x-2">
                  <Plus className="w-4 h-4" />
                  <span>新建预约</span>
                </button>
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">会议室</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">会议主题</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">组织者</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">时间</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">状态</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">操作</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {meetingBookings.map((booking) => (
                    <tr key={booking.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{booking.room_name}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{booking.title}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{booking.organizer}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {booking.start_time} - {booking.end_time}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {getStatusBadge(booking.status)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        <div className="flex space-x-2">
                          <button className="text-blue-600 hover:text-blue-900">
                            <Eye className="w-4 h-4" />
                          </button>
                          <button className="text-indigo-600 hover:text-indigo-900">
                            <Edit className="w-4 h-4" />
                          </button>
                          <button className="text-red-600 hover:text-red-900">
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

export default AdminPage;