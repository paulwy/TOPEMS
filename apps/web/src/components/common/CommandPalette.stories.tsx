import type { Meta, StoryObj } from '@storybook/react-vite';
import { fn } from 'storybook/test';
import { Search, FileText, Settings, Home, Users, LayoutDashboard, Zap } from 'lucide-react';
import { MemoryRouter } from 'react-router-dom';
import CommandPalette from './CommandPalette';

// ============ Decorator: MemoryRouter for react-router-dom dependency ============

const withMemoryRouter = (StoryFn: () => React.JSX.Element) => (
  <MemoryRouter>
    <StoryFn />
  </MemoryRouter>
);

// ============ Sample Commands ============

const sampleCommands = [
  {
    id: 'home',
    label: '返回首页',
    description: '导航到系统首页',
    href: '/',
    group: '页面',
    shortcut: 'H',
  },
  {
    id: 'dashboard',
    label: '数据概览',
    description: '查看仪表盘',
    href: '/dashboard',
    group: '页面',
    shortcut: 'D',
  },
  { id: 'users', label: '用户管理', description: '管理系统用户', href: '/users', group: '页面' },
  {
    id: 'settings',
    label: '系统设置',
    description: '打开设置面板',
    href: '/settings',
    group: '设置',
  },
  { id: 'theme', label: '主题切换', description: '切换深色/浅色主题', group: '设置', action: fn() },
  {
    id: 'search-users',
    label: '搜索用户',
    description: '按姓名或邮箱查找',
    group: '用户',
    action: fn(),
  },
  {
    id: 'create-user',
    label: '新建用户',
    description: '添加新用户到系统',
    group: '用户',
    action: fn(),
    shortcut: 'N',
  },
  {
    id: 'export-data',
    label: '导出数据',
    description: '导出当前列表数据',
    group: '操作',
    action: fn(),
    shortcut: 'E',
  },
];

const groupedCommandGroups = [
  {
    id: 'pages',
    label: '页面导航',
    items: [
      {
        id: 'home',
        label: '返回首页',
        description: '导航到系统首页',
        href: '/',
        group: '页面导航',
      },
      {
        id: 'dashboard',
        label: '数据概览',
        description: '查看仪表盘数据',
        href: '/dashboard',
        group: '页面导航',
      },
      {
        id: 'users',
        label: '用户管理',
        description: '管理系统中所有用户',
        href: '/users',
        group: '页面导航',
      },
    ],
  },
  {
    id: 'actions',
    label: '快捷操作',
    items: [
      {
        id: 'new-order',
        label: '创建订单',
        description: '快速新建一条订单',
        group: '快捷操作',
        action: fn(),
        shortcut: 'N',
      },
      {
        id: 'export',
        label: '导出报表',
        description: '导出当前页面数据',
        group: '快捷操作',
        action: fn(),
        shortcut: 'E',
      },
      {
        id: 'refresh',
        label: '刷新数据',
        description: '重新加载数据',
        group: '快捷操作',
        action: fn(),
        shortcut: 'R',
      },
    ],
  },
  {
    id: 'settings',
    label: '系统设置',
    items: [
      {
        id: 'profile',
        label: '个人资料',
        description: '编辑个人信息',
        href: '/profile',
        group: '系统设置',
      },
      {
        id: 'preferences',
        label: '偏好设置',
        description: '自定义系统配置',
        href: '/preferences',
        group: '系统设置',
      },
      {
        id: 'theme',
        label: '主题设置',
        description: '切换显示主题',
        group: '系统设置',
        action: fn(),
      },
    ],
  },
];

const commandsWithIcons = [
  {
    id: 'home',
    label: '返回首页',
    description: '导航到系统首页',
    href: '/',
    group: '页面',
    icon: <Home size={18} />,
  },
  {
    id: 'dashboard',
    label: '数据概览',
    description: '查看仪表盘',
    href: '/dashboard',
    group: '仪表盘',
    icon: <LayoutDashboard size={18} />,
  },
  {
    id: 'users',
    label: '用户管理',
    description: '管理系统用户',
    href: '/users',
    group: '用户',
    icon: <Users size={18} />,
  },
  {
    id: 'settings',
    label: '系统设置',
    description: '打开设置面板',
    href: '/settings',
    group: '设置',
    icon: <Settings size={18} />,
  },
  {
    id: 'new-doc',
    label: '新建文档',
    description: '创建一个新文档',
    group: '操作',
    icon: <FileText size={18} />,
    action: fn(),
    shortcut: 'N',
  },
  {
    id: 'quick-action',
    label: '快速执行',
    description: '执行常用操作',
    group: '操作',
    icon: <Zap size={18} />,
    action: fn(),
  },
];

// ============ Meta ============

const meta = {
  title: 'Common/CommandPalette',
  component: CommandPalette,
  parameters: {
    layout: 'fullscreen',
    docs: {
      description: {
        component:
          '命令面板组件，支持搜索命令、页面导航、键盘操作。支持按分组展示命令列表，支持自定义图标和快捷键。',
      },
    },
  },
  tags: ['autodocs'],
  decorators: [withMemoryRouter],
  argTypes: {
    open: { description: '是否打开', control: 'boolean' },
    placeholder: { description: '搜索占位符', control: 'text' },
    hotkey: { description: '快捷键提示', control: 'text' },
  },
  args: {
    open: true,
    onClose: fn(),
  },
} satisfies Meta<typeof CommandPalette>;

export default meta;
type Story = StoryObj<typeof meta>;

// ============ Stories ============

export const Default: Story = {
  args: {
    commands: sampleCommands,
  },
};

const WithGroups: Story = {
  args: {
    groups: groupedCommandGroups,
  },
};

const WithIcons: Story = {
  args: {
    commands: commandsWithIcons,
  },
};

export const Empty: Story = {
  args: {
    commands: [],
  },
};
