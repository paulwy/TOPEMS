/**
 * 模块主题配置 - 定义各业务模块的图标、渐变色、主题色
 *
 * NOTE: 当前未被任何组件直接导入。保留作为基础设施配置，
 * 未来可在模块概览页、侧边栏、主题切换等功能中使用。
 * 可通过 `import { moduleThemes, getModuleTheme } from '@/lib/moduleThemes'` 使用。
 */
import type React from 'react';
import {
  Shield,
  Users,
  Building2,
  Package,
  Factory,
  LineChart,
  FileText,
  Wallet,
  Truck,
  Handshake,
  FolderKanban,
  CalendarCheck,
  FlaskConical,
  ClipboardCheck,
  Settings,
  BarChart3,
  Workflow,
  BookOpen,
  Activity,
  Bell,
  Database,
  Layers,
  Zap,
  Globe,
  Puzzle,
  FileBarChart,
  Code2,
  Map,
  Plug,
  FileSpreadsheet,
  MessageSquare,
  UserCog,
} from 'lucide-react';

export interface ModuleTheme {
  code: string;
  name: string;
  icon: React.ComponentType<{ size?: number; className?: string }>;
  gradient: string;
  color: string;
}

export const moduleThemes: Record<string, ModuleTheme> = {
  iam: {
    code: 'iam',
    name: '系统管理',
    icon: Shield,
    gradient: 'linear-gradient(135deg, #6366F1 0%, #8B5CF6 100%)',
    color: '#6366F1',
  },
  crm: {
    code: 'crm',
    name: '客户关系管理',
    icon: Users,
    gradient: 'linear-gradient(135deg, #0EA5E9 0%, #0284C7 100%)',
    color: '#0EA5E9',
  },
  erp: {
    code: 'erp',
    name: '企业资源规划',
    icon: Building2,
    gradient: 'linear-gradient(135deg, #F97316 0%, #EA580C 100%)',
    color: '#F97316',
  },
  wms: {
    code: 'wms',
    name: '仓储管理',
    icon: Package,
    gradient: 'linear-gradient(135deg, #0EA5E9 0%, #0284C7 100%)',
    color: '#0EA5E9',
  },
  mes: {
    code: 'mes',
    name: '制造执行系统',
    icon: Factory,
    gradient: 'linear-gradient(135deg, #EF4444 0%, #B91C1C 100%)',
    color: '#EF4444',
  },
  qms: {
    code: 'qms',
    name: '质量管理系统',
    icon: ClipboardCheck,
    gradient: 'linear-gradient(135deg, #06B6D4 0%, #0891B2 100%)',
    color: '#06B6D4',
  },
  hrm: {
    code: 'hrm',
    name: '人力资源管理',
    icon: Users,
    gradient: 'linear-gradient(135deg, #22C55E 0%, #15803D 100%)',
    color: '#22C55E',
  },
  finance: {
    code: 'finance',
    name: '财务管理',
    icon: Wallet,
    gradient: 'linear-gradient(135deg, #10B981 0%, #059669 100%)',
    color: '#10B981',
  },
  scm: {
    code: 'scm',
    name: '供应链管理',
    icon: Truck,
    gradient: 'linear-gradient(135deg, #F59E0B 0%, #D97706 100%)',
    color: '#F59E0B',
  },
  srm: {
    code: 'srm',
    name: '供应商关系管理',
    icon: Handshake,
    gradient: 'linear-gradient(135deg, #14B8A6 0%, #0D9488 100%)',
    color: '#14B8A6',
  },
  pm: {
    code: 'pm',
    name: '项目管理',
    icon: FolderKanban,
    gradient: 'linear-gradient(135deg, #F59E0B 0%, #D97706 100%)',
    color: '#F59E0B',
  },
  oa: {
    code: 'oa',
    name: '办公自动化',
    icon: CalendarCheck,
    gradient: 'linear-gradient(135deg, #06B6D4 0%, #0891B2 100%)',
    color: '#06B6D4',
  },
  ehs: {
    code: 'ehs',
    name: '安全环保健康',
    icon: Activity,
    gradient: 'linear-gradient(135deg, #22C55E 0%, #16A34A 100%)',
    color: '#22C55E',
  },
  lims: {
    code: 'lims',
    name: '实验室信息管理',
    icon: FlaskConical,
    gradient: 'linear-gradient(135deg, #14B8A6 0%, #0D9488 100%)',
    color: '#14B8A6',
  },
  bi: {
    code: 'bi',
    name: '商业智能',
    icon: BarChart3,
    gradient: 'linear-gradient(135deg, #8B5CF6 0%, #7C3AED 100%)',
    color: '#8B5CF6',
  },
  workflow: {
    code: 'workflow',
    name: '工作流',
    icon: Workflow,
    gradient: 'linear-gradient(135deg, #0EA5E9 0%, #0284C7 100%)',
    color: '#0EA5E9',
  },
  docs: {
    code: 'docs',
    name: '文档管理',
    icon: BookOpen,
    gradient: 'linear-gradient(135deg, #F59E0B 0%, #D97706 100%)',
    color: '#F59E0B',
  },
  monitor: {
    code: 'monitor',
    name: '系统监控',
    icon: Activity,
    gradient: 'linear-gradient(135deg, #EF4444 0%, #DC2626 100%)',
    color: '#EF4444',
  },
  notification: {
    code: 'notification',
    name: '通知中心',
    icon: Bell,
    gradient: 'linear-gradient(135deg, #F59E0B 0%, #D97706 100%)',
    color: '#F59E0B',
  },
  integration: {
    code: 'integration',
    name: '系统集成',
    icon: Plug,
    gradient: 'linear-gradient(135deg, #64748B 0%, #475569 100%)',
    color: '#64748B',
  },
  gis: {
    code: 'gis',
    name: '地理信息系统',
    icon: Map,
    gradient: 'linear-gradient(135deg, #10B981 0%, #059669 100%)',
    color: '#10B981',
  },
  pdm: {
    code: 'pdm',
    name: '产品数据管理',
    icon: Database,
    gradient: 'linear-gradient(135deg, #06B6D4 0%, #0891B2 100%)',
    color: '#06B6D4',
  },
  rs: {
    code: 'rs',
    name: '研发管理',
    icon: Code2,
    gradient: 'linear-gradient(135deg, #D946EF 0%, #C026D3 100%)',
    color: '#D946EF',
  },
  report: {
    code: 'report',
    name: '报表管理',
    icon: FileBarChart,
    gradient: 'linear-gradient(135deg, #3B82F6 0%, #1D4ED8 100%)',
    color: '#3B82F6',
  },
  plugin: {
    code: 'plugin',
    name: '插件市场',
    icon: Puzzle,
    gradient: 'linear-gradient(135deg, #F59E0B 0%, #D97706 100%)',
    color: '#F59E0B',
  },
  ai: {
    code: 'ai',
    name: 'AI 助手',
    icon: Zap,
    gradient: 'linear-gradient(135deg, #3B82F6 0%, #1D4ED8 100%)',
    color: '#3B82F6',
  },
  admin: {
    code: 'admin',
    name: '管理后台',
    icon: Settings,
    gradient: 'linear-gradient(135deg, #6B7280 0%, #4B5563 100%)',
    color: '#6B7280',
  },
  asset: {
    code: 'asset',
    name: '资产管理',
    icon: Layers,
    gradient: 'linear-gradient(135deg, #14B8A6 0%, #0D9488 100%)',
    color: '#14B8A6',
  },
  im: {
    code: 'im',
    name: '即时通讯',
    icon: MessageSquare,
    gradient: 'linear-gradient(135deg, #10B981 0%, #059669 100%)',
    color: '#10B981',
  },
};

export function getModuleTheme(moduleCode: string): ModuleTheme | undefined {
  return moduleThemes[moduleCode.toLowerCase()];
}

export function getModuleThemeFromPath(pathname: string): ModuleTheme | undefined {
  const pathParts = pathname.split('/').filter(Boolean);
  if (pathParts.length === 0) return undefined;
  return getModuleTheme(pathParts[0]);
}
