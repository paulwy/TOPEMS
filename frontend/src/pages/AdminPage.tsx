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
        return <span className="