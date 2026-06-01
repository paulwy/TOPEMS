import React, { useEffect, useState, useCallback, useMemo, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { 
  FileText, GitBranch, Bot, Brain,
  FlaskConical, ClipboardList, Shield, AlertCircle, Users, Package,
  LogOut, User, Activity, Clock,
  Database, X, Key,
  Building, Folder, BarChart3, Box,
  MapPin, Smartphone, MessageSquare, Receipt, TrendingUp,
  Briefcase, Calendar, DollarSign, BookOpen, HelpCircle, FileText as FileTemplate,
  Settings, CheckCircle, XCircle, ChevronRight, Bell
} from 'lucide-react';
import { authApi } from '../api/iam';
import { docApi } from '../api/doc';
import { aiApi } from '../api/ai';
import { flowApi } from '../api/flow';
import { erpApi } from '../api/erp';
import { hrmApi } from '../api/hrm';
import { mobileApi } from '../api/mobile';
import { notificationServiceApi } from '../api/notificationService';
import MobileNav from '../components/MobileNav';
import MobileHeader from '../components/MobileHeader';
import { usePermission } from '../hooks/usePermission';
import { useRole } from '../hooks/useRole';
import { useAuth } from '../hooks/useAuth';
import { NotificationBell } from '../components/notifications';
import { ModeToggle } from '../components/ModeToggle';
import { StatsChart } from '../components/StatsChart';
import { MetricCard } from '../components/MetricCard';
import { useAppStore } from '../store';

interface DashboardPageProps {
  onLogout?: () => void;
}

const DashboardPage: React.FC<DashboardPageProps> = ({ onLogout }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout: authLogout, isAuthenticated, hasPermission, permissions } = useAuth();
  const shortcuts = useAppStore((state) => state.shortcuts);
  const [loading, setLoading] = useState(true);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [stats, setStats] = useState({
    fileCount: 0,
    workflowCount: 0,
    docCount: 0,
    notificationCount: 0
  });
  const [moduleStats, setModuleStats] = useState({
    qms: { total: 25, active: 23 },
    ehs: { total: 20, active: 18 },
    srm: { total: 15, active: 14 },
    lims: { total: 20, active: 19 },
    rs: { total: 12, active: 10 }
  });
  const [chartData, setChartData] = useState({
    moduleDistribution: [] as { name: string; value: number; color: string }[],
    monthlyTrend: [] as { name: string; value: number }[]
  });
  const [serviceStatuses, setServiceStatuses] = useState<Record<string, boolean>>({
    iam: false,
    doc: false,
    ai: false,
    flow: false,
    erp: false,
    hrm: false,
    mobile: false,
    notification: false
  });
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [recentActivities, setRecentActivities] = useState<Array<{
    id: string;
    title: string;
    type: string;
    time: string;
    icon: React.ReactNode;
  }>>([]);
  
  const { getRoleName } = useRole();
  const initialized = useRef(false);

  // 稳定的函数引用
  const stableCanAccessModule = useCallback((module: string): boolean => {
    return hasPermission(`${module}:read`);
  }, [hasPermission]);

  const stableCanAdminModule = useCallback((module: string): boolean => {
    return hasPermission(`${module}:admin`);
  }, [hasPermission]);

  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/login');
      return;
    }

    if (initialized.current) {
      return;
    }
    initialized.current = true;

    const init = async () => {
      try {
        const serviceResults = await Promise.all([
          authApi.health().then(() => true).catch(() => false),
          docApi.health().then(() => true).catch(() => false),
          aiApi.health().then(() => true).catch(() => false),
          flowApi.health().then(() => true).catch(() => false),
          erpApi.health().then(() => true).catch(() => false),
          hrmApi.health().then(() => true).catch(() => false),
          mobileApi.health().then(() => true).catch(() => false),
          notificationServiceApi.health().then(() => true).catch(() => false)
        ]);

        setServiceStatuses({
          iam: serviceResults[0],
          doc: serviceResults[1],
          ai: serviceResults[2],
          flow: serviceResults[3],
          erp: serviceResults[4],
          hrm: serviceResults[5],
          mobile: serviceResults[6],
          notification: serviceResults[7]
        });
        
        await loadStats().catch((err) => {
          console.warn('加载统计数据失败:', err);
        });
        
        await loadRecentActivities().catch((err) => {
          console.warn('加载最近活动失败:', err);
        });
      } catch (err) {
        console.error('初始化失败:', err);
      } finally {
        setLoading(false);
      }
    };

    init();
  }, [navigate, isAuthenticated]);

  const loadStats = useCallback(async () => {
    try {
      const [docRes] = await Promise.allSettled([
        docApi.list()
      ]);

      const newStats = {
        fileCount: docRes.status === 'fulfilled' && docRes.value.success && docRes.value.data?.files?.length || 0,
        workflowCount: 0,
        docCount: 0,
        notificationCount: 5
      };

      setStats(newStats);
    } catch (err) {
      console.error('加载统计失败:', err);
    }
  }, []);

  const loadRecentActivities = useCallback(async () => {
    const activities = [
      { id: '1', title: '成功登录系统', type: '系统', time: '刚刚', icon: <User className="w-4 h-4" /> },
      { id: '2', title: '上传文档 "项目报告.pdf"', type: '文档', time: '5分钟前', icon: <FileText className="w-4 h-4" /> },
      { id: '3', title: '审批通过采购申请', type: '工作流', time: '15分钟前', icon: <GitBranch className="w-4 h-4" /> },
      { id: '4', title: '创建新文件夹 "研发资料"', type: '文档', time: '1小时前', icon: <Folder className="w-4 h-4" /> },
      { id: '5', title: '完成安全培训课程', type: '培训', time: '2小时前', icon: <BookOpen className="w-4 h-4" /> },
    ];
    setRecentActivities(activities);
  }, []);

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const handleLogout = useCallback(() => {
    authLogout();
    navigate('/login');
  }, [authLogout, navigate]);

  const handleQuickAccess = useCallback((path: string) => {
    navigate(path);
  }, [navigate]);

  // 暂时禁用模块过滤来调试
  const coreModules = useMemo(() => [
    {
      title: '文档管理',
      icon: FileText,
      description: '文件上传、下载、版本管理',
      path: '/documents',
      color: 'bg-blue-500',
      status: 'online' as const,
      permission: 'doc:read',
      module: 'doc'
    },
    {
      title: 'AI 知识库',
      icon: Bot,
      description: '智能问答、知识检索',
      path: '/ai',
      color: 'bg-purple-500',
      status: 'online' as const,
      permission: 'ai:read',
      module: 'ai'
    },
    {
      title: '工作流',
      icon: GitBranch,
      description: '流程审批、任务管理',
      path: '/workflows',
      color: 'bg-green-500',
      status: 'online' as const,
      permission: 'workflow:read',
      module: 'workflow'
    },
  ].filter(module => stableCanAccessModule(module.module)), [stableCanAccessModule]);

  const businessModules = useMemo(() => [
    {
      title: '用户管理',
      icon: Users,
      description: '用户账户、角色权限管理',
      path: '/users',
      color: 'bg-indigo-500',
      status: 'online' as const,
      permission: 'iam:admin',
      module: 'iam',
      adminOnly: true
    },
    {
      title: '角色管理',
      icon: Shield,
      description: '角色定义、权限分配管理',
      path: '/roles',
      color: 'bg-purple-500',
      status: 'online' as const,
      permission: 'iam:admin',
      module: 'iam',
      adminOnly: true
    },
    {
      title: '权限管理',
      icon: Key,
      description: '系统权限定义、查看管理',
      path: '/permissions',
      color: 'bg-amber-500',
      status: 'online' as const,
      permission: 'iam:admin',
      module: 'iam',
      adminOnly: true
    },
    {
      title: '公司管理',
      icon: Building,
      description: '企业信息、组织架构',
      path: '/companies',
      color: 'bg-blue-500',
      status: 'online' as const,
      permission: 'erp:admin',
      module: 'erp',
      adminOnly: true
    },
    {
      title: '部门管理',
      icon: Folder,
      description: '部门结构、层级关系',
      path: '/departments',
      color: 'bg-teal-500',
      status: 'online' as const,
      permission: 'erp:admin',
      module: 'erp',
      adminOnly: true
    },
    {
      title: '员工管理',
      icon: User,
      description: '员工信息、任职管理',
      path: '/employees',
      color: 'bg-emerald-500',
      status: 'online' as const,
      permission: 'erp:admin',
      module: 'erp',
      adminOnly: true
    },
    {
      title: '资产管理',
      icon: Box,
      description: '企业资产、设备台账、点巡检、维护维修',
      path: '/assets',
      color: 'bg-purple-500',
      status: 'online' as const,
      permission: 'erp:admin',
      module: 'erp',
      adminOnly: true
    },
    {
      title: '预算管理',
      icon: TrendingUp,
      description: '部门预算、使用进度、预警',
      path: '/budget',
      color: 'bg-green-500',
      status: 'online' as const,
      permission: 'erp:admin',
      module: 'erp',
      adminOnly: true
    },
    {
      title: '费用管理',
      icon: Receipt,
      description: '费用报销、预算、应收应付',
      path: '/finance',
      color: 'bg-indigo-500',
      status: 'online' as const,
      permission: 'erp:admin',
      module: 'erp',
      adminOnly: true
    },
    {
      title: '行政综合管理',
      icon: Briefcase,
      description: '公司、部门、员工、资产、会议室、车辆统一管理',
      path: '/administration',
      color: 'bg-sky-500',
      status: 'online' as const,
      permission: 'erp:admin',
      module: 'erp',
      adminOnly: true
    },
    {
      title: '安全审计',
      icon: AlertCircle,
      description: '访问日志、操作审计',
      path: '/audit',
      color: 'bg-red-500',
      status: 'online' as const,
      permission: 'iam:admin',
      module: 'iam',
      adminOnly: true
    },
    {
      title: '系统管理',
      icon: Settings,
      description: '字典管理、数据库结构管理',
      path: '/system',
      color: 'bg-slate-500',
      status: 'online' as const,
      permission: 'iam:admin',
      module: 'iam',
      adminOnly: true
    },
    {
      title: '报表中心',
      icon: BarChart3,
      description: 'RS/LIMS/QMS/EHS/SRM/PDM 各模块报表',
      path: '/reports',
      color: 'bg-emerald-500',
      status: 'online' as const,
      permission: 'iam:admin',
      module: 'iam',
      adminOnly: true
    },
    {
      title: '文档中心',
      icon: BookOpen,
      description: '企业文档管理、知识共享',
      path: '/document-center',
      color: 'bg-blue-500',
      status: 'online' as const,
      permission: 'doc:read',
      module: 'doc'
    },
    {
      title: '帮助中心',
      icon: HelpCircle,
      description: '使用指南、视频教程、常见问题',
      path: '/help',
      color: 'bg-amber-500',
      status: 'online' as const
    },
    {
      title: '模板管理',
      icon: FileTemplate,
      description: '文档模板、流程模板管理',
      path: '/templates',
      color: 'bg-violet-500',
      status: 'online' as const,
      permission: 'doc:admin',
      module: 'doc',
      adminOnly: true
    },
    {
      title: '科研研发',
      icon: FlaskConical,
      description: '项目管理、配方管理',
      path: '/rs',
      color: 'bg-orange-500',
      status: 'beta' as const,
      permission: 'rs:read',
      module: 'rs'
    },
    {
      title: '实验室管理',
      icon: ClipboardList,
      description: '样品管理、检测记录',
      path: '/lims',
      color: 'bg-cyan-500',
      status: 'beta' as const,
      permission: 'lims:read',
      module: 'lims'
    },
    {
      title: '质量管理',
      icon: Shield,
      description: '质量管控、合规管理',
      path: '/qms',
      color: 'bg-indigo-500',
      status: 'online' as const,
      permission: 'qms:read',
      module: 'qms'
    },
    {
      title: '环境健康安全',
      icon: AlertCircle,
      description: '安全风险、应急预案',
      path: '/ehs',
      color: 'bg-red-500',
      status: 'online' as const,
      permission: 'ehs:read',
      module: 'ehs'
    },
    {
      title: '供应商关系',
      icon: Users,
      description: '供应商管理、采购订单',
      path: '/srm',
      color: 'bg-purple-500',
      status: 'online' as const,
      permission: 'srm:read',
      module: 'srm'
    },
    {
      title: '生产数据管理',
      icon: Package,
      description: '生产工艺、配方批次',
      path: '/pdm',
      color: 'bg-amber-500',
      status: 'online' as const,
      permission: 'pdm:read',
      module: 'pdm'
    },
    {
      title: '厂区空间',
      icon: MapPin,
      description: '设备点位、管线、仓储管理',
      path: '/gis',
      color: 'bg-teal-500',
      status: 'new' as const,
      permission: 'gis:read',
      module: 'gis'
    },
    {
      title: '移动工作台',
      icon: Smartphone,
      description: '巡检打卡、扫码入库、移动任务',
      path: '/mobile-workstation',
      color: 'bg-indigo-500',
      status: 'new' as const,
      permission: null,
      module: 'mobile'
    },
    {
      title: '即时通讯',
      icon: MessageSquare,
      description: '聊天会话、项目群组、消息通知',
      path: '/im',
      color: 'bg-pink-500',
      status: 'new' as const,
      permission: 'im:read',
      module: 'im'
    },
    {
      title: '人力资源',
      icon: Briefcase,
      description: '员工管理、考勤、薪资、绩效、招聘',
      path: '/hrm/positions',
      color: 'bg-indigo-500',
      status: 'online' as const,
      permission: 'hrm:read',
      module: 'hrm'
    },
  ].filter(module => !module.permission || stableCanAccessModule(module.module) || stableCanAdminModule(module.module)), [stableCanAccessModule, stableCanAdminModule]);

  const quickActions = useMemo(() => [
    { label: '上传文件', icon: FileText, path: '/documents', color: 'text-blue-500' },
    { label: 'AI 问答', icon: Brain, path: '/ai', color: 'text-purple-500' },
    { label: '发起流程', icon: GitBranch, path: '/workflows', color: 'text-green-500' },
    { label: '我的待办', icon: Clock, path: '/workflows', color: 'text-orange-500' },
    { label: '通知中心', icon: Bell, path: '/notifications', color: 'text-yellow-500' },
    { label: '个人中心', icon: User, path: '/profile', color: 'text-indigo-500' },
  ], []);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-lg text-slate-600">加载中...</div>
      </div>
    );
  }

  const onlineServices = Object.values(serviceStatuses).filter(Boolean).length;
  const currentPage = location.pathname.replace('/', '') || 'dashboard';

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      <MobileHeader 
        title="TOPEMS" 
        onMenuClick={() => setMobileMenuOpen(!mobileMenuOpen)}
      />
      
      {mobileMenuOpen && (
        <div className="fixed inset-0 bg-black/50 z-40 mobile-only" onClick={() => setMobileMenuOpen(false)}>
          <div className="absolute top-14 left-0 right-0 bg-white max-h-[70vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="p-4">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-lg font-semibold">菜单</h2>
                <button onClick={() => setMobileMenuOpen(false)} className="p-2 hover:bg-slate-100 rounded-lg">
                  <X size={20} />
                </button>
              </div>
              <div className="space-y-2">
                {[
                  { id: 'dashboard', label: '首页', icon: Activity },
                  { id: 'documents', label: '文档管理', icon: FileText },
                  { id: 'ai', label: 'AI 知识库', icon: Bot },
                  { id: 'workflows', label: '工作流', icon: GitBranch },
                  { id: 'users', label: '用户管理', icon: Users, adminOnly: true },
                  { id: 'roles', label: '角色管理', icon: Shield, adminOnly: true },
                  { id: 'permissions', label: '权限管理', icon: Key, adminOnly: true },
                  { id: 'companies', label: '公司管理', icon: Building, adminOnly: true },
                  { id: 'departments', label: '部门管理', icon: Folder, adminOnly: true },
                  { id: 'employees', label: '员工管理', icon: User, adminOnly: true },
                  { id: 'assets', label: '资产管理', icon: Box, adminOnly: true },
                  { id: 'budget', label: '预算管理', icon: TrendingUp, adminOnly: true },
                  { id: 'finance', label: '费用管理', icon: Receipt, adminOnly: true },
                  { id: 'audit', label: '安全审计', icon: AlertCircle, adminOnly: true },
                  { id: 'reports', label: '报表中心', icon: BarChart3, adminOnly: true },
                  { id: 'rs', label: '科研研发', icon: FlaskConical },
                  { id: 'lims', label: '实验室管理', icon: ClipboardList },
                  { id: 'qms', label: '质量管理', icon: Shield },
                  { id: 'ehs', label: '环境健康安全', icon: AlertCircle },
                  { id: 'srm', label: '供应商关系', icon: Users },
                  { id: 'pdm', label: '生产数据管理', icon: Package },
                  { id: 'gis', label: '厂区空间', icon: MapPin },
                  { id: 'mobile-workstation', label: '移动工作台', icon: Smartphone },
                  { id: 'im', label: '即时通讯', icon: MessageSquare },
                  { id: 'hrm/positions', label: '人力资源', icon: Briefcase },
                ].map(item => {
                  const Icon = item.icon;
                  return (
                    <button
                      key={item.id}
                      onClick={() => {
                        navigate(`/${item.id}`);
                        setMobileMenuOpen(false);
                      }}
                      className={`w-full flex items-center space-x-3 p-3 rounded-lg transition-colors ${
                        currentPage === item.id ? 'bg-blue-50 text-blue-700' : 'hover:bg-slate-100 text-slate-700'
                      }`}
                    >
                      <Icon size={20} />
                      <span>{item.label}</span>
                    </button>
                  );
                })}
                <div className="border-t border-slate-200 pt-2 mt-2">
                  <button
                    onClick={handleLogout}
                    className="w-full flex items-center space-x-3 p-3 rounded-lg text-red-600 hover:bg-red-50 transition-colors"
                  >
                    <LogOut size={20} />
                    <span>退出登录</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <header className="bg-white shadow-sm border-b border-slate-200 sticky top-0 z-10 desktop-only">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-4">
              <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                TOPEMS
              </h1>
              <span className="text-sm text-slate-500 hidden md:inline">企业数字化平台</span>
            </div>
            <div className="flex items-center space-x-4">
              <div className="text-xs text-slate-500 hidden md:block">
                {currentTime.toLocaleString('zh-CN')}
              </div>
              <ModeToggle />
              <NotificationBell />
              <div className="flex items-center space-x-2 px-3 py-1.5 bg-slate-100 rounded-lg cursor-pointer hover:bg-slate-200 transition-colors" onClick={() => navigate('/profile')}>
                <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center">
                  <span className="text-white text-sm font-medium">
                    {(user?.full_name || user?.username)?.charAt(0).toUpperCase()}
                  </span>
                </div>
                <div className="hidden md:block">
                  <p className="text-sm font-medium text-slate-900">{user?.full_name || user?.username}</p>
                  <p className="text-xs text-slate-500 capitalize">{getRoleName()}</p>
                </div>
              </div>
              <button
                onClick={handleLogout}
                className="p-2 text-slate-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                title="退出登录"
              >
                <LogOut className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 desktop-only">
        <div className="mobile-content mobile-only">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-xl font-bold text-slate-900">
                👋 欢迎回来，{user?.full_name || user?.username || '用户'}！
              </h2>
              <p className="text-sm text-slate-600">{getGreeting()}</p>
            </div>
            <div className="w-10 h-10 bg-blue-500 rounded-full flex items-center justify-center">
              <span className="text-white text-sm font-medium">
                {(user?.full_name || user?.username)?.charAt(0).toUpperCase()}
              </span>
            </div>
          </div>

          <div className="mobile-grid mb-6">
            <StatCardMobile title="在线服务" value={String(onlineServices)} icon={Activity} color="green" />
            <StatCardMobile title="文件数量" value={String(stats.fileCount)} icon={FileText} color="blue" />
            <StatCardMobile title="工作流" value={String(stats.workflowCount)} icon={GitBranch} color="orange" />
            <StatCardMobile title="知识库" value={String(stats.docCount)} icon={Brain} color="purple" />
          </div>

          <h3 className="text-lg font-semibold text-slate-900 mb-3">核心功能</h3>
          <div className="mobile-grid mb-6">
            {coreModules.slice(0, 4).map((item) => (
              <div
                key={item.title}
                className="bg-white rounded-xl p-4 shadow-sm cursor-pointer"
                onClick={() => navigate(item.path)}
              >
                <div className={`w-12 h-12 ${item.color} rounded-lg flex items-center justify-center mb-3`}>
                  <item.icon className="w-6 h-6 text-white" />
                </div>
                <h4 className="font-semibold text-slate-900 text-sm">{item.title}</h4>
                <p className="text-xs text-slate-500 mt-1">{item.description}</p>
              </div>
            ))}
          </div>

          <h3 className="text-lg font-semibold text-slate-900 mb-3">业务模块</h3>
          <div className="grid grid-cols-2 gap-3 mb-6">
            {businessModules.map((item) => (
              <div
                key={item.title}
                className="bg-white rounded-lg p-3 cursor-pointer"
                onClick={() => navigate(item.path)}
              >
                <div className={`w-10 h-10 ${item.color} rounded-lg flex items-center justify-center mb-2`}>
                  <item.icon className="w-5 h-5 text-white" />
                </div>
                <h4 className="font-medium text-slate-900 text-sm">{item.title}</h4>
                <StatusBadgeMobile status={item.status} />
              </div>
            ))}
          </div>

          <h3 className="text-lg font-semibold text-slate-900 mb-3">快速操作</h3>
          <div className="grid grid-cols-4 gap-2 mb-6">
            {quickActions.map((action) => {
              const Icon = action.icon;
              return (
                <button
                  key={action.label}
                  onClick={() => handleQuickAccess(action.path)}
                  className="flex flex-col items-center p-2 bg-white rounded-lg"
                >
                  <Icon className="w-5 h-5 text-slate-600 mb-1" />
                  <span className="text-xs text-slate-700">{action.label}</span>
                </button>
              );
            })}
          </div>

          <h3 className="text-lg font-semibold text-slate-900 mb-3">服务状态</h3>
          <div className="bg-white rounded-xl p-4">
            {[
              { name: '身份认证', status: serviceStatuses.iam },
              { name: '文档管理', status: serviceStatuses.doc },
              { name: 'AI 服务', status: serviceStatuses.ai },
              { name: '流程引擎', status: serviceStatuses.flow },
              { name: '企业资源', status: serviceStatuses.erp },
              { name: '人力资源', status: serviceStatuses.hrm },
              { name: '移动服务', status: serviceStatuses.mobile },
              { name: '通知服务', status: serviceStatuses.notification },
            ].map((service) => (
              <div key={service.name} className="flex items-center justify-between py-2 border-b border-slate-100 last:border-0">
                <span className="text-sm text-slate-700">{service.name}</span>
                <div className={`w-2.5 h-2.5 rounded-full ${service.status ? 'bg-green-500' : 'bg-red-500'}`} />
              </div>
            ))}
          </div>
        </div>
        {/* Welcome Section */}
        <div className="mb-8">
          <h2 className="text-3xl font-bold text-slate-900 mb-2">
            👋 欢迎回来，{user?.full_name || user?.username || '用户'}！
          </h2>
          <p className="text-slate-600">
            {getGreeting()}，今天有 {quickActions.length} 个待处理事项
          </p>
        </div>

        {/* Quick Actions */}
        <div className="mb-8 bg-white rounded-xl shadow-sm p-6">
          <h3 className="text-lg font-semibold text-slate-900 mb-4">⚡ 快速操作</h3>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            {quickActions.map((action) => {
              const Icon = action.icon;
              return (
                <button
                  key={action.label}
                  onClick={() => handleQuickAccess(action.path)}
                  className="flex flex-col items-center space-y-2 p-4 bg-gradient-to-br from-slate-50 to-slate-100 hover:from-blue-50 hover:to-blue-100 rounded-xl transition-all group hover:shadow-md"
                >
                  <div className={`w-10 h-10 bg-white rounded-lg shadow-sm flex items-center justify-center ${action.color} group-hover:scale-110 transition-transform`}>
                    <Icon className="w-5 h-5" />
                  </div>
                  <span className="text-sm font-medium text-slate-700 group-hover:text-blue-700">
                    {action.label}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <MetricCard
            title="用户角色"
            value={getRoleName()}
            icon={<User className="w-6 h-6" />}
            color="blue"
          />
          <MetricCard
            title="在线服务"
            value={String(onlineServices)}
            icon={<Activity className="w-6 h-6" />}
            color="green"
            change={onlineServices > 5 ? 10 : -5}
          />
          <MetricCard
            title="文件数量"
            value={String(stats.fileCount)}
            icon={<FileText className="w-6 h-6" />}
            color="purple"
            change={8}
          />
          <MetricCard
            title="工作流"
            value={String(stats.workflowCount)}
            icon={<GitBranch className="w-6 h-6" />}
            color="orange"
            change={-3}
          />
        </div>

        {/* Module Statistics Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          <StatsChart
            type="pie"
            title="业务模块分布"
            data={chartData.moduleDistribution.length > 0 ? chartData.moduleDistribution : [
              { name: '质量管理', value: 25, color: '#6366f1' },
              { name: '安全管理', value: 20, color: '#8b5cf6' },
              { name: '供应商管理', value: 15, color: '#a855f7' },
              { name: '实验室管理', value: 20, color: '#d946ef' },
              { name: '研发管理', value: 20, color: '#ec4899' }
            ]}
            yKey="value"
          />
          <StatsChart
            type="line"
            title="月度趋势"
            data={chartData.monthlyTrend.length > 0 ? chartData.monthlyTrend : [
              { name: '1月', value: 65 },
              { name: '2月', value: 78 },
              { name: '3月', value: 85 },
              { name: '4月', value: 72 },
              { name: '5月', value: 90 },
              { name: '6月', value: 88 }
            ]}
            yKey="value"
          />
        </div>

        {/* Module Status Overview */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-8">
          <div className="bg-white rounded-xl shadow-sm p-4">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-indigo-100 rounded-lg flex items-center justify-center">
                <Shield className="w-5 h-5 text-indigo-600" />
              </div>
              <div>
                <p className="text-sm text-slate-600">质量管理</p>
                <p className="text-xl font-bold text-slate-900">{moduleStats.qms.total}</p>
              </div>
            </div>
            <div className="mt-2 flex items-center text-xs">
              <CheckCircle className="w-3 h-3 text-green-500 mr-1" />
              <span className="text-green-600">{moduleStats.qms.active} 活跃</span>
            </div>
          </div>
          <div className="bg-white rounded-xl shadow-sm p-4">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-red-100 rounded-lg flex items-center justify-center">
                <AlertCircle className="w-5 h-5 text-red-600" />
              </div>
              <div>
                <p className="text-sm text-slate-600">安全管理</p>
                <p className="text-xl font-bold text-slate-900">{moduleStats.ehs.total}</p>
              </div>
            </div>
            <div className="mt-2 flex items-center text-xs">
              <CheckCircle className="w-3 h-3 text-green-500 mr-1" />
              <span className="text-green-600">{moduleStats.ehs.active} 活跃</span>
            </div>
          </div>
          <div className="bg-white rounded-xl shadow-sm p-4">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                <Users className="w-5 h-5 text-purple-600" />
              </div>
              <div>
                <p className="text-sm text-slate-600">供应商</p>
                <p className="text-xl font-bold text-slate-900">{moduleStats.srm.total}</p>
              </div>
            </div>
            <div className="mt-2 flex items-center text-xs">
              <CheckCircle className="w-3 h-3 text-green-500 mr-1" />
              <span className="text-green-600">{moduleStats.srm.active} 活跃</span>
            </div>
          </div>
          <div className="bg-white rounded-xl shadow-sm p-4">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-cyan-100 rounded-lg flex items-center justify-center">
                <ClipboardList className="w-5 h-5 text-cyan-600" />
              </div>
              <div>
                <p className="text-sm text-slate-600">实验室</p>
                <p className="text-xl font-bold text-slate-900">{moduleStats.lims.total}</p>
              </div>
            </div>
            <div className="mt-2 flex items-center text-xs">
              <CheckCircle className="w-3 h-3 text-green-500 mr-1" />
              <span className="text-green-600">{moduleStats.lims.active} 活跃</span>
            </div>
          </div>
          <div className="bg-white rounded-xl shadow-sm p-4">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center">
                <FlaskConical className="w-5 h-5 text-orange-600" />
              </div>
              <div>
                <p className="text-sm text-slate-600">研发</p>
                <p className="text-xl font-bold text-slate-900">{moduleStats.rs.total}</p>
              </div>
            </div>
            <div className="mt-2 flex items-center text-xs">
              <CheckCircle className="w-3 h-3 text-green-500 mr-1" />
              <span className="text-green-600">{moduleStats.rs.active} 活跃</span>
            </div>
          </div>
        </div>

        {/* Core Modules */}
        <div className="mb-8">
          <h3 className="text-xl font-semibold text-slate-900 mb-4">🚀 核心功能</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {coreModules.map((item) => (
              <div
                key={item.title}
                className="bg-white rounded-xl shadow-sm hover:shadow-lg transition-all cursor-pointer group"
                onClick={() => navigate(item.path)}
              >
                <div className="p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div className={`w-14 h-14 ${item.color} rounded-xl flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform`}>
                      <item.icon className="w-7 h-7 text-white" />
                    </div>
                    <StatusBadge status={item.status} />
                  </div>
                  <h4 className="text-xl font-semibold text-slate-900 mb-2">
                    {item.title}
                  </h4>
                  <p className="text-slate-600 text-sm mb-4">
                    {item.description}
                  </p>
                  <div className="flex items-center text-blue-600 text-sm font-medium group-hover:text-blue-700">
                    立即体验 →
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Business Modules */}
        <div className="mb-8">
          <h3 className="text-xl font-semibold text-slate-900 mb-4">📊 业务模块</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {businessModules.map((item) => (
              <div
                key={item.title}
                className="bg-white rounded-xl shadow-sm hover:shadow-lg transition-all cursor-pointer group opacity-75 hover:opacity-100"
                onClick={() => navigate(item.path)}
              >
                <div className="p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div className={`w-12 h-12 ${item.color} rounded-lg flex items-center justify-center shadow-md group-hover:scale-105 transition-transform`}>
                      <item.icon className="w-6 h-6 text-white" />
                    </div>
                    <StatusBadge status={item.status} />
                  </div>
                  <h4 className="text-lg font-semibold text-slate-900 mb-2">
                    {item.title}
                  </h4>
                  <p className="text-slate-600 text-sm">
                    {item.description}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Service Status */}
        <div className="bg-white rounded-xl shadow-sm p-6">
          <h3 className="text-lg font-semibold text-slate-900 mb-4 flex items-center">
            <Activity className="w-5 h-5 mr-2 text-green-500" />
            服务状态监控
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-4">
            {[
              { name: '身份认证', service: 'IAM', port: 8002, key: 'iam', icon: Shield },
              { name: '文档管理', service: 'DOC', port: 8001, key: 'doc', icon: Database },
              { name: 'AI 服务', service: 'AI', port: 8003, key: 'ai', icon: Bot },
              { name: '流程引擎', service: 'FLOW', port: 8004, key: 'flow', icon: GitBranch },
              { name: '企业资源', service: 'ERP', port: 8009, key: 'erp', icon: Building },
              { name: '人力资源', service: 'HRM', port: 8010, key: 'hrm', icon: Users },
              { name: '移动服务', service: 'MOBILE', port: 8019, key: 'mobile', icon: Smartphone },
              { name: '通知服务', service: 'NOTIFICATION', port: 8023, key: 'notification', icon: MessageSquare },
            ].map((service) => (
              <ServiceStatusCard
                key={service.key}
                name={service.name}
                service={service.service}
                port={service.port}
                status={serviceStatuses[service.key]}
                icon={service.icon}
              />
            ))}
          </div>
        </div>

        {/* Recent Activities */}
        <div className="mt-8 bg-white rounded-xl shadow-sm p-6">
          <h3 className="text-lg font-semibold text-slate-900 mb-4 flex items-center justify-between">
            <span className="flex items-center">
              <Clock className="w-5 h-5 mr-2 text-blue-500" />
              最近活动
            </span>
            <button className="text-sm text-blue-600 hover:text-blue-700 flex items-center">
              查看全部 <ChevronRight className="w-4 h-4 ml-1" />
            </button>
          </h3>
          <div className="space-y-4">
            {recentActivities.map((activity) => (
              <div
                key={activity.id}
                className="flex items-center space-x-4 p-3 rounded-lg hover:bg-slate-50 transition-colors cursor-pointer"
              >
                <div className="w-10 h-10 bg-blue-50 rounded-lg flex items-center justify-center text-blue-600">
                  {activity.icon}
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium text-slate-900">{activity.title}</p>
                  <div className="flex items-center space-x-2 mt-1">
                    <span className="text-xs px-2 py-0.5 bg-slate-100 text-slate-600 rounded-full">
                      {activity.type}
                    </span>
                    <span className="text-xs text-slate-400">{activity.time}</span>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-slate-400" />
              </div>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div className="mt-8 text-center text-sm text-slate-500">
          <p>TOPEMS v2.0 | 化工新材料企业数字化平台</p>
          <p className="mt-1">© 2026 TOPEMS Team. All rights reserved.</p>
        </div>
      </main>

      <MobileNav currentPage={currentPage} onNavigate={navigate} />
    </div>
  );
};

interface StatCardProps {
  title: string;
  value: string;
  icon: any;
  color: string;
}

const StatCard: React.FC<StatCardProps> = ({ title, value, icon: Icon, color }) => {
  const colors = {
    blue: 'bg-blue-50 text-blue-600',
    green: 'bg-green-50 text-green-600',
    purple: 'bg-purple-50 text-purple-600',
    orange: 'bg-orange-50 text-orange-600',
  };

  return (
    <div className="bg-white rounded-xl shadow-sm p-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-slate-600 mb-1">{title}</p>
          <p className={`text-3xl font-bold ${colors[color as keyof typeof colors].split(' ')[1]}`}>
            {value}
          </p>
        </div>
        <div className={`w-12 h-12 ${colors[color as keyof typeof colors]} rounded-lg flex items-center justify-center`}>
          <Icon className="w-6 h-6" />
        </div>
      </div>
    </div>
  );
};

interface StatCardMobileProps {
  title: string;
  value: string;
  icon: any;
  color: string;
}

const StatCardMobile: React.FC<StatCardMobileProps> = ({ title, value, icon: Icon, color }) => {
  const colors = {
    blue: 'bg-blue-100 text-blue-600',
    green: 'bg-green-100 text-green-600',
    purple: 'bg-purple-100 text-purple-600',
    orange: 'bg-orange-100 text-orange-600',
  };

  return (
    <div className="bg-white rounded-xl p-3">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs text-slate-500 mb-0.5">{title}</p>
          <p className={`text-xl font-bold ${colors[color as keyof typeof colors].split(' ')[1]}`}>
            {value}
          </p>
        </div>
        <div className={`w-8 h-8 ${colors[color as keyof typeof colors]} rounded-lg flex items-center justify-center`}>
          <Icon className="w-4 h-4" />
        </div>
      </div>
    </div>
  );
};

interface StatusBadgeProps {
  status: 'online' | 'beta' | 'plan' | 'new';
}

const StatusBadge: React.FC<StatusBadgeProps> = ({ status }) => {
  const styles = {
    online: 'bg-green-100 text-green-700',
    beta: 'bg-yellow-100 text-yellow-700',
    plan: 'bg-slate-100 text-slate-700',
    new: 'bg-blue-100 text-blue-700',
  };

  const labels = {
    online: '✓ 在线',
    beta: 'β 测试',
    plan: '📋 规划',
    new: '✨ 新功能',
  };

  return (
    <span className={`px-2 py-1 rounded-full text-xs font-medium ${styles[status]}`}>
      {labels[status]}
    </span>
  );
};

const StatusBadgeMobile: React.FC<StatusBadgeProps> = ({ status }) => {
  const styles = {
    online: 'bg-green-100 text-green-700',
    beta: 'bg-yellow-100 text-yellow-700',
    plan: 'bg-slate-100 text-slate-700',
    new: 'bg-blue-100 text-blue-700',
  };

  const labels = {
    online: '在线',
    beta: '测试',
    plan: '规划',
    new: '新功能',
  };

  return (
    <span className={`px-1.5 py-0.5 rounded-full text-xs ${styles[status]}`}>
      {labels[status]}
    </span>
  );
};

interface ServiceStatusCardProps {
  name: string;
  service: string;
  port: number;
  status: boolean;
  icon: any;
}

const ServiceStatusCard: React.FC<ServiceStatusCardProps> = ({ name, service, port, status, icon: Icon }) => {
  const statusColor = status ? 'bg-green-500' : 'bg-red-500';

  return (
    <div className="bg-slate-50 rounded-lg p-4">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center space-x-2">
          <Icon className="w-4 h-4 text-slate-500" />
          <span className="font-medium text-slate-900">{name}</span>
        </div>
        <div className={`w-3 h-3 rounded-full ${statusColor}`} />
      </div>
      <div className="flex items-center justify-between text-xs text-slate-500">
        <span>{service}</span>
        <span>:{port}</span>
      </div>
    </div>
  );
};

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return '上午好';
  if (hour < 18) return '下午好';
  return '晚上好';
}

export default DashboardPage;
