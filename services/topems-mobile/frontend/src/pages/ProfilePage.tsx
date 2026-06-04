import React from 'react';
import { 
  User, 
  Settings, 
  Bell, 
  HelpCircle, 
  LogOut, 
  Shield, 
  ChevronRight,
  Moon,
  Palette,
  BellOff
} from 'lucide-react';

const ProfilePage: React.FC = () => {
  const userInfo = {
    name: '张三',
    avatar: null,
    role: '运维工程师',
    department: '运维部',
    email: 'zhangsan@topems.com',
    phone: '138****8888',
  };

  const menuItems = [
    { icon: Bell, label: '消息通知', badge: 3 },
    { icon: Shield, label: '账户安全' },
    { icon: Moon, label: '深色模式', toggle: true, value: false },
    { icon: Palette, label: '主题设置' },
    { icon: HelpCircle, label: '帮助与反馈' },
    { icon: Settings, label: '系统设置' },
  ];

  const handleLogout = () => {
    if (confirm('确定要退出登录吗？')) {
      localStorage.removeItem('token');
      window.location.href = '/login';
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white p-6 pt-12">
        <div className="flex items-center space-x-4">
          <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center">
            <User size={32} />
          </div>
          <div>
            <h1 className="text-2xl font-bold">{userInfo.name}</h1>
            <p className="text-blue-100">{userInfo.role} · {userInfo.department}</p>
          </div>
        </div>
      </div>

      <div className="bg-white mx-4 -mt-4 rounded-2xl shadow-lg p-4 relative z-10">
        <div className="grid grid-cols-3 gap-4 text-center">
          <div>
            <p className="text-2xl font-bold text-blue-600">28</p>
            <p className="text-sm text-gray-500">本月巡逻</p>
          </div>
          <div>
            <p className="text-2xl font-bold text-green-600">156</p>
            <p className="text-sm text-gray-500">扫码次数</p>
          </div>
          <div>
            <p className="text-2xl font-bold text-purple-600">98%</p>
            <p className="text-sm text-gray-500">任务完成率</p>
          </div>
        </div>
      </div>

      <div className="bg-white mx-4 mt-4 rounded-2xl shadow-sm overflow-hidden">
        {menuItems.map((item, index) => {
          const Icon = item.icon;
          return (
            <button
              key={index}
              className="w-full flex items-center justify-between p-4 hover:bg-gray-50 transition-colors border-b border-gray-100 last:border-b-0"
            >
              <div className="flex items-center space-x-3">
                <Icon size={20} className="text-gray-600" />
                <span className="text-gray-900 font-medium">{item.label}</span>
              </div>
              <div className="flex items-center space-x-2">
                {item.badge && (
                  <span className="bg-red-500 text-white text-xs px-2 py-0.5 rounded-full">
                    {item.badge}
                  </span>
                )}
                {item.toggle ? (
                  <div className={`w-10 h-6 rounded-full transition-colors ${item.value ? 'bg-blue-600' : 'bg-gray-300'}`}>
                    <div className={`w-5 h-5 bg-white rounded-full shadow transition-transform ${item.value ? 'translate-x-5' : 'translate-x-0.5'}`} />
                  </div>
                ) : (
                  <ChevronRight size={18} className="text-gray-400" />
                )}
              </div>
            </button>
          );
        })}
      </div>

      <div className="bg-white mx-4 mt-4 rounded-2xl shadow-sm overflow-hidden">
        <div className="p-4 border-b border-gray-100">
          <div className="flex items-center space-x-3">
            <Shield size={20} className="text-gray-600" />
            <span className="text-gray-900 font-medium">快捷设置</span>
          </div>
        </div>
        <button className="w-full flex items-center justify-between p-4 hover:bg-gray-50 transition-colors">
          <div className="flex items-center space-x-3">
            <BellOff size={20} className="text-gray-600" />
            <span className="text-gray-700">离线模式</span>
          </div>
          <div className="w-10 h-6 rounded-full bg-gray-300">
            <div className="w-5 h-5 bg-white rounded-full shadow translate-x-0.5" />
          </div>
        </button>
      </div>

      <button
        onClick={handleLogout}
        className="w-full mx-4 mt-4 bg-red-50 text-red-600 rounded-2xl p-4 font-medium hover:bg-red-100 transition-colors flex items-center justify-center space-x-2"
      >
        <LogOut size={20} />
        <span>退出登录</span>
      </button>

      <div className="text-center text-gray-400 text-sm mt-8">
        TOPEMS Mobile v1.0.0
      </div>
    </div>
  );
};

export default ProfilePage;