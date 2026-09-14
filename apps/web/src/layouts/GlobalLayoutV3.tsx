import React, { useMemo } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { AppShell } from '../components/redesign/layout/AppShell';
import type { NavItem } from '../components/redesign/layout/SideRail';
import {
  Home,
  Factory,
  Layers,
  Truck,
  Users,
  ShieldCheck,
  Box,
  BarChart3,
  Map,
  FileText,
  MessageSquare,
  ClipboardList,
  Settings,
  User,
} from 'lucide-react';

/**
 * GlobalLayoutV3 — Industrial OS 全局布局
 *
 * 使用 AppShell（TopBar + SideRail）替换旧的 GlobalLayout / SmartLayout。
 * 通过 VITE_UI_V3_ENABLED 开关控制，开启时走新布局，关闭时回退旧布局。
 *
 * 特性：
 * - 统一的 Industrial OS 视觉语言
 * - 响应式侧边栏导航
 * - 顶部栏集成用户菜单、通知、设置
 * - 命令面板入口（后续接入）
 */
export interface GlobalLayoutV3Props {
  children: React.ReactNode;
  fullWidth?: boolean;
}

// 导航项配置（与旧版 navigationRegistryV2 对齐，后续可从 registry 动态生成）
const navItems: NavItem[] = [
  { id: 'dashboard', label: '首页', icon: Home },
  { id: 'mes', label: '制造执行', icon: Factory },
  { id: 'erp', label: '企业资源', icon: Layers },
  { id: 'scm', label: '供应链', icon: Truck },
  { id: 'crm', label: '客户管理', icon: Users },
  { id: 'qms', label: '质量管理', icon: ShieldCheck },
  { id: 'wms', label: '仓储物流', icon: Box },
  { id: 'bi', label: '数据决策', icon: BarChart3 },
  { id: 'gis', label: '地理信息', icon: Map },
  { id: 'doc', label: '文档协同', icon: FileText },
  { id: 'im', label: '消息中心', icon: MessageSquare, badge: 3 },
  { id: 'tasks', label: '任务审批', icon: ClipboardList },
];

const footerItems: NavItem[] = [
  { id: 'settings', label: '系统设置', icon: Settings },
  { id: 'profile', label: '个人中心', icon: User },
];

// 路径到导航项 ID 的映射
const pathToNavId: Record<string, string> = {
  '/dashboard': 'dashboard',
  '/core/dashboard': 'dashboard',
  '/mes': 'mes',
  '/core/mes': 'mes',
  '/erp': 'erp',
  '/core/erp': 'erp',
  '/scm': 'scm',
  '/core/scm': 'scm',
  '/crm': 'crm',
  '/core/crm': 'crm',
  '/qms': 'qms',
  '/core/qms': 'qms',
  '/wms': 'wms',
  '/core/wms': 'wms',
  '/bi': 'bi',
  '/core/bi': 'bi',
  '/gis': 'gis',
  '/core/gis': 'gis',
  '/doc': 'doc',
  '/core/doc': 'doc',
  '/im': 'im',
  '/core/im': 'im',
  '/tasks': 'tasks',
  '/core/tasks': 'tasks',
  '/settings': 'settings',
  '/core/settings': 'settings',
  '/profile': 'profile',
  '/core/profile': 'profile',
};

export const GlobalLayoutV3: React.FC<GlobalLayoutV3Props> = ({
  children,
  fullWidth = false,
}) => {
  const location = useLocation();
  const navigate = useNavigate();

  // 根据当前路径计算激活的导航项
  const activeId = useMemo(() => {
    // 精确匹配
    if (pathToNavId[location.pathname]) {
      return pathToNavId[location.pathname];
    }
    // 前缀匹配
    for (const [path, id] of Object.entries(pathToNavId)) {
      if (location.pathname.startsWith(path + '/')) {
        return id;
      }
    }
    return 'dashboard';
  }, [location.pathname]);

  const handleItemClick = (id: string) => {
    // 导航项 ID 到路径的映射
    const idToPath: Record<string, string> = {
      dashboard: '/dashboard',
      mes: '/mes',
      erp: '/erp',
      scm: '/scm',
      crm: '/crm',
      qms: '/qms',
      wms: '/wms',
      bi: '/bi',
      gis: '/gis',
      doc: '/doc',
      im: '/im',
      tasks: '/tasks',
      settings: '/settings',
      profile: '/profile',
    };
    const path = idToPath[id] || '/dashboard';
    navigate(path);
  };

  return (
    <AppShell
      title="TOPEMS"
      items={navItems}
      activeId={activeId}
      onItemClick={handleItemClick}
      footerItems={footerItems}
      fullWidth={fullWidth}
    >
      {children}
    </AppShell>
  );
};

export default GlobalLayoutV3;
