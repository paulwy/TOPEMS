import React, { useState, useEffect, useMemo } from 'react';
import {
  Package, Calendar, FileText, Settings, ChevronLeft,
  Plus, Search, Edit, Trash2, Eye, Grid, List,
  ShoppingCart, ClipboardList, Building2, Users,
  CheckCircle, XCircle, Clock, Filter, Download, Upload,
  Users2, Car, BriefcaseBusiness, HardHat,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAppStore } from '../store';
import {
  companyApi, departmentApi, employeeApi,
  type Company, type Department, type Employee,
} from '../api/erp';

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

interface Vehicle {
  id: string;
  plate_number: string;
  brand: string;
  model: string;
  type: string;
  status: 'available' | 'in_use' | 'maintenance';
  driver: string;
  last_service: string;
}

interface AssetManagementPageProps {
  onNavigate?: (page: string) => void;
}

const AdministrationPage: React.FC<AssetManagementPageProps> = ({ onNavigate }) => {
  const navigate = useNavigate();
  const addNotification = useAppStore((state) => state.addNotification);

  const [activeTab, setActiveTab] = useState<
    'overview' | 'company' | 'department' | 'employee' | 'supplies' | 'meetings' | 'vehicles'
  >('overview');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);

  const [companies, setCompanies] = useState<Company[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);

  const [showModal, setShowModal] = useState(false);
  const [currentModalType, setCurrentModalType] = useState<'create' | 'edit' | 'view'>('create');
  const [selectedItem, setSelectedItem] = useState<any>(null);

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

  const vehicles: Vehicle[] = [
    { id: '1', plate_number: '京A12345', brand: '奔驰', model: 'E300L', type: '轿车', status: 'in_use', driver: '张师傅', last_service: '2026-04-15' },
    { id: '2', plate_number: '京B67890', brand: '别克', model: 'GL8', type: '商务车', status: 'available', driver: '李师傅', last_service: '2026-05-10' },
    { id: '3', plate_number: '京C11111', brand: '丰田', model: '考斯特', type: '中巴', status: 'maintenance', driver: '王师傅', last_service: '2026-03-20' },
  ];

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const promises = [
        companyApi.list(),
        departmentApi.list(),
        employeeApi.list(),
      ];

      const results = await Promise.allSettled(promises);

      // 处理公司数据
      if (results[0].status === 'fulfilled' && results[0].value.success && results[0].value.data) {
        setCompanies((results[0].value.data as any).items || []);
      } else {
        console.warn('加载公司数据失败，将使用默认数据');
      }

      // 处理部门数据
      if (results[1].status === 'fulfilled' && results[1].value.success && results[1].value.data) {
        setDepartments((results[1].value.data as any).items || []);
      } else {
        console.warn('加载部门数据失败，将使用默认数据');
      }

      // 处理员工数据
      if (results[2].status === 'fulfilled' && results[2].value.success && results[2].value.data) {
        setEmployees((results[2].value.data as any).items || []);
      } else {
        console.warn('加载员工数据失败，将使用默认数据');
      }
    } catch (err: any) {
      console.error('加载数据失败:', err);
      if (err.response?.status === 401) {
        addNotification({ 
          title: '认证失败', 
          message: '请先登录后再访问行政管理系统', 
          type: 'error' 
        });
        navigate('/login');
      } else {
        addNotification({ 
          title: '数据加载失败', 
          message: '无法连接到服务器，请检查网络连接', 
          type: 'warning' 
        });
      }
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const badges: Record<string, { variant: string; label: string }> = {
      in_stock: { variant: 'bg-green-100 text-green-700', label: '库存充足' },
      low_stock: { variant: 'bg-yellow-100 text-yellow-700', label: '库存不足' },
      out_of_stock: { variant: 'bg-red-100 text-red-700', label: '已售罄' },
      available: { variant: 'bg-green-100 text-green-700', label: '可用' },
      occupied: { variant: 'bg-red-100 text-red-700', label: '使用中' },
      confirmed: { variant: 'bg-green-100 text-green-700', label: '已确认' },
      cancelled: { variant: 'bg-gray-100 text-gray-700', label: '已取消' },
      in_use: { variant: 'bg-blue-100 text-blue-700', label: '使用中' },
      maintenance: { variant: 'bg-orange-100 text-orange-700', label: '维护中' },
      active: { variant: 'bg-green-100 text-green-700', label: '活跃' },
      inactive: { variant: 'bg-gray-100 text-gray-700', label: '停用' },
    };
    const config = badges[status] || { variant: 'bg-gray-100 text-gray-700', label: status };
    return (
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${config.variant}`}>
        {config.label}
      </span>
    );
  };

  const stats = useMemo(() => {
    return {
      companies: companies.length,
      departments: departments.length,
      employees: employees.length,
      vehicles: vehicles.length,
      meetingRooms: meetingRooms.length,
      officeSupplies: officeSupplies.length,
    };
  }, [companies, departments, employees]);

  const renderOverview = () => (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <div className="bg-white rounded-lg shadow-sm p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">公司数量</p>
              <p className="text-2xl font-bold text-gray-900">{stats.companies}</p>
            </div>
            <Building2 className="w-12 h-12 text-blue-600" />
          </div>
        </div>
        <div className="bg-white rounded-lg shadow-sm p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">部门数量</p>
              <p className="text-2xl font-bold text-gray-900">{stats.departments}</p>
            </div>
            <Users2 className="w-12 h-12 text-green-600" />
          </div>
        </div>
        <div className="bg-white rounded-lg shadow-sm p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">员工数量</p>
              <p className="text-2xl font-bold text-gray-900">{stats.employees}</p>
            </div>
            <Users className="w-12 h-12 text-purple-600" />
          </div>
        </div>
        <div className="bg-white rounded-lg shadow-sm p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">车辆数量</p>
              <p className="text-2xl font-bold text-gray-900">{stats.vehicles}</p>
            </div>
            <Car className="w-12 h-12 text-orange-600" />
          </div>
        </div>
        <div className="bg-white rounded-lg shadow-sm p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">会议室数量</p>
              <p className="text-2xl font-bold text-gray-900">{stats.meetingRooms}</p>
            </div>
            <Calendar className="w-12 h-12 text-indigo-600" />
          </div>
        </div>
        <div className="bg-white rounded-lg shadow-sm p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">办公用品种类</p>
              <p className="text-2xl font-bold text-gray-900">{stats.officeSupplies}</p>
            </div>
            <Package className="w-12 h-12 text-teal-600" />
          </div>
        </div>
      </div>
    </div>
  );

  const renderCompany = () => (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-bold text-gray-900">公司管理</h2>
        <button className="flex items-center space-x-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700">
          <Plus className="w-5 h-5" />
          <span>新增公司</span>
        </button>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {companies.length > 0 ? (
          companies.map((company) => (
            <div key={company.id} className="bg-white rounded-lg shadow-sm p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900">{company.name}</h3>
                {getStatusBadge(company.status)}
              </div>
              <div className="space-y-2 text-sm text-gray-600">
                {company.short_name && (
                  <div className="flex justify-between">
                    <span className="text-gray-500">简称:</span>
                    <span>{company.short_name}</span>
                  </div>
                )}
                {company.registration_number && (
                  <div className="flex justify-between">
                    <span className="text-gray-500">注册号:</span>
                    <span>{company.registration_number}</span>
                  </div>
                )}
                {company.contact_phone && (
                  <div className="flex justify-between">
                    <span className="text-gray-500">电话:</span>
                    <span>{company.contact_phone}</span>
                  </div>
                )}
              </div>
            </div>
          ))
        ) : (
          <div className="col-span-full text-center py-12 text-gray-500">
            暂无公司数据
          </div>
        )}
      </div>
    </div>
  );

  const renderDepartment = () => (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-bold text-gray-900">部门管理</h2>
        <button className="flex items-center space-x-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700">
          <Plus className="w-5 h-5" />
          <span>新增部门</span>
        </button>
      </div>
      <div className="bg-white rounded-lg shadow-sm overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">部门名称</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">部门代码</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">状态</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">操作</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {departments.length > 0 ? (
              departments.map((dept) => (
                <tr key={dept.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{dept.name}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{dept.code || '-'}</td>
                  <td className="px-6 py-4 whitespace-nowrap">{getStatusBadge(dept.status)}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    <button className="text-blue-600 hover:text-blue-800 mr-3">
                      <Edit className="w-4 h-4" />
                    </button>
                    <button className="text-red-600 hover:text-red-800">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={4} className="px-6 py-12 text-center text-gray-500">暂无部门数据</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );

  const renderEmployee = () => (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-bold text-gray-900">员工管理</h2>
        <button className="flex items-center space-x-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700">
          <Plus className="w-5 h-5" />
          <span>新增员工</span>
        </button>
      </div>
      <div className="bg-white rounded-lg shadow-sm overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">工号</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">姓名</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">部门</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">职位</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">状态</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">操作</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {employees.length > 0 ? (
              employees.map((emp) => (
                <tr key={emp.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{emp.employee_number}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{emp.name}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{emp.department_id || '-'}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{emp.position || '-'}</td>
                  <td className="px-6 py-4 whitespace-nowrap">{getStatusBadge(emp.status)}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    <button className="text-blue-600 hover:text-blue-800 mr-3">
                      <Eye className="w-4 h-4" />
                    </button>
                    <button className="text-blue-600 hover:text-blue-800 mr-3">
                      <Edit className="w-4 h-4" />
                    </button>
                    <button className="text-red-600 hover:text-red-800">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={6} className="px-6 py-12 text-center text-gray-500">暂无员工数据</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );

  const renderSupplies = () => (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-bold text-gray-900">办公用品管理</h2>
        <button className="flex items-center space-x-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700">
          <Plus className="w-5 h-5" />
          <span>新增用品</span>
        </button>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {officeSupplies.map((supply) => (
          <div key={supply.id} className="bg-white rounded-lg shadow-sm p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">{supply.name}</h3>
              {getStatusBadge(supply.status)}
            </div>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-500">分类:</span>
                <span className="font-medium text-gray-900">{supply.category}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">库存:</span>
                <span className="font-bold text-blue-600">{supply.quantity} {supply.unit}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">单价:</span>
                <span className="text-gray-900">¥{supply.price}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">位置:</span>
                <span className="text-gray-900">{supply.location}</span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  const renderMeetings = () => (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-bold text-gray-900">会议室管理</h2>
        <button className="flex items-center space-x-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700">
          <Plus className="w-5 h-5" />
          <span>预约会议室</span>
        </button>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {meetingRooms.map((room) => (
          <div key={room.id} className="bg-white rounded-lg shadow-sm p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">{room.name}</h3>
              {getStatusBadge(room.status)}
            </div>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-500">容量:</span>
                <span className="font-medium text-gray-900">{room.capacity}人</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">位置:</span>
                <span className="text-gray-900">{room.location}</span>
              </div>
              <div className="flex flex-wrap gap-1 mt-2">
                {room.facilities.map((facility, idx) => (
                  <span key={idx} className="px-2 py-1 bg-gray-100 text-gray-700 rounded text-xs">
                    {facility}
                  </span>
                ))}
              </div>
            </div>
          </div>
        ))}
      </div>
      <div className="bg-white rounded-lg shadow-sm p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">今日会议预约</h3>
        <div className="space-y-3">
          {meetingBookings.map((booking) => (
            <div key={booking.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
              <div>
                <p className="font-medium text-gray-900">{booking.title}</p>
                <p className="text-sm text-gray-500">{booking.room_name} · {booking.organizer}</p>
              </div>
              <div className="text-right">
                <p className="text-sm font-medium text-gray-900">{booking.start_time}</p>
                <p className="text-xs text-gray-500">{booking.end_time}</p>
              </div>
              {getStatusBadge(booking.status)}
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  const renderVehicles = () => (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-bold text-gray-900">车辆管理</h2>
        <button className="flex items-center space-x-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700">
          <Plus className="w-5 h-5" />
          <span>新增车辆</span>
        </button>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {vehicles.map((vehicle) => (
          <div key={vehicle.id} className="bg-white rounded-lg shadow-sm p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">{vehicle.plate_number}</h3>
              {getStatusBadge(vehicle.status)}
            </div>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-500">品牌型号:</span>
                <span className="font-medium text-gray-900">{vehicle.brand} {vehicle.model}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">类型:</span>
                <span className="font-medium text-gray-900">{vehicle.type}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">驾驶员:</span>
                <span className="font-medium text-gray-900">{vehicle.driver}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">上次保养:</span>
                <span className="text-gray-900">{vehicle.last_service}</span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white shadow-sm border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-4">
              <button
                onClick={() => navigate('/dashboard')}
                className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-lg flex items-center justify-center">
                  <Settings className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h1 className="text-xl font-bold text-gray-900">行政综合管理</h1>
                  <p className="text-xs text-gray-500">企业行政管理一体化平台</p>
                </div>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="搜索..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="mb-6 bg-white rounded-lg shadow-sm p-1 flex flex-wrap gap-1">
          <button
            onClick={() => setActiveTab('overview')}
            className={`flex-1 min-w-[100px] px-4 py-2 rounded-lg font-medium transition-colors ${
              activeTab === 'overview' ? 'bg-blue-600 text-white' : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            <div className="flex items-center justify-center space-x-2">
              <BriefcaseBusiness className="w-5 h-5" />
              <span>概览</span>
            </div>
          </button>
          <button
            onClick={() => setActiveTab('company')}
            className={`flex-1 min-w-[100px] px-4 py-2 rounded-lg font-medium transition-colors ${
              activeTab === 'company' ? 'bg-blue-600 text-white' : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            <div className="flex items-center justify-center space-x-2">
              <Building2 className="w-5 h-5" />
              <span>公司</span>
            </div>
          </button>
          <button
            onClick={() => setActiveTab('department')}
            className={`flex-1 min-w-[100px] px-4 py-2 rounded-lg font-medium transition-colors ${
              activeTab === 'department' ? 'bg-blue-600 text-white' : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            <div className="flex items-center justify-center space-x-2">
              <Users2 className="w-5 h-5" />
              <span>部门</span>
            </div>
          </button>
          <button
            onClick={() => setActiveTab('employee')}
            className={`flex-1 min-w-[100px] px-4 py-2 rounded-lg font-medium transition-colors ${
              activeTab === 'employee' ? 'bg-blue-600 text-white' : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            <div className="flex items-center justify-center space-x-2">
              <Users className="w-5 h-5" />
              <span>员工</span>
            </div>
          </button>
          <button
            onClick={() => setActiveTab('supplies')}
            className={`flex-1 min-w-[100px] px-4 py-2 rounded-lg font-medium transition-colors ${
              activeTab === 'supplies' ? 'bg-blue-600 text-white' : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            <div className="flex items-center justify-center space-x-2">
              <Package className="w-5 h-5" />
              <span>办公用品</span>
            </div>
          </button>
          <button
            onClick={() => setActiveTab('meetings')}
            className={`flex-1 min-w-[100px] px-4 py-2 rounded-lg font-medium transition-colors ${
              activeTab === 'meetings' ? 'bg-blue-600 text-white' : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            <div className="flex items-center justify-center space-x-2">
              <Calendar className="w-5 h-5" />
              <span>会议室</span>
            </div>
          </button>
          <button
            onClick={() => setActiveTab('vehicles')}
            className={`flex-1 min-w-[100px] px-4 py-2 rounded-lg font-medium transition-colors ${
              activeTab === 'vehicles' ? 'bg-blue-600 text-white' : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            <div className="flex items-center justify-center space-x-2">
              <Car className="w-5 h-5" />
              <span>车辆</span>
            </div>
          </button>
        </div>

        {loading ? (
          <div className="bg-white rounded-xl shadow-sm p-12 text-center">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-blue-600 border-t-transparent"></div>
            <p className="mt-2 text-gray-500">加载中...</p>
          </div>
        ) : (
          <>
            {activeTab === 'overview' && renderOverview()}
            {activeTab === 'company' && renderCompany()}
            {activeTab === 'department' && renderDepartment()}
            {activeTab === 'employee' && renderEmployee()}
            {activeTab === 'supplies' && renderSupplies()}
            {activeTab === 'meetings' && renderMeetings()}
            {activeTab === 'vehicles' && renderVehicles()}
          </>
        )}
      </div>
    </div>
  );
};

export default AdministrationPage;
