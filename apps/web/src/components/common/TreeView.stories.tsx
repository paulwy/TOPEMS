import type { Meta, StoryObj } from '@storybook/react-vite';
import { fn } from 'storybook/test';

import TreeView from './TreeView';
import type { TreeNode } from './TreeView';

const sampleData: TreeNode[] = [
  {
    id: '1',
    label: '根节点 A',
    children: [
      {
        id: '1-1',
        label: '子节点 A-1',
        children: [
          { id: '1-1-1', label: '叶子节点 A-1-1' },
          { id: '1-1-2', label: '叶子节点 A-1-2' },
        ],
      },
      { id: '1-2', label: '子节点 A-2' },
    ],
  },
  {
    id: '2',
    label: '根节点 B',
    badge: 5,
    children: [
      { id: '2-1', label: '子节点 B-1' },
      { id: '2-2', label: '子节点 B-2' },
      { id: '2-3', label: '子节点 B-3' },
    ],
  },
  { id: '3', label: '根节点 C', disabled: true },
];

const fileSystemData: TreeNode[] = [
  {
    id: 'src',
    label: 'src',
    children: [
      {
        id: 'components',
        label: 'components',
        children: [
          { id: 'common', label: 'common' },
          { id: 'layout', label: 'layout' },
          { id: 'pages', label: 'pages' },
        ],
      },
      { id: 'hooks', label: 'hooks' },
      { id: 'utils', label: 'utils' },
      { id: 'App.tsx', label: 'App.tsx' },
      { id: 'index.ts', label: 'index.ts' },
    ],
  },
  { id: 'package.json', label: 'package.json' },
  { id: 'tsconfig.json', label: 'tsconfig.json' },
];

const meta = {
  title: 'Common/TreeView',
  component: TreeView,
  parameters: {
    layout: 'centered',
    docs: {
      description: {
        component: '树形视图组件，支持展开/折叠、选择、徽章标记和多种密度。',
      },
    },
  },
  tags: ['autodocs'],
  argTypes: {
    density: {
      description: '密度',
      control: 'select',
      options: ['compact', 'normal', 'comfortable'],
    },
  },
  args: {
    data: sampleData,
    onSelect: fn(),
    onExpand: fn(),
  },
} satisfies Meta<typeof TreeView>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    data: sampleData,
    expanded: ['1', '2'],
  },
};

export const WithSelection: Story = {
  args: {
    data: sampleData,
    selected: '1-1',
    expanded: ['1', '1-1'],
  },
};

export const Compact: Story = {
  args: {
    data: sampleData,
    density: 'compact',
    expanded: ['1', '2'],
  },
};

const Comfortable: Story = {
  args: {
    data: sampleData,
    density: 'comfortable',
    expanded: ['1', '2'],
  },
};

const FileSystem: Story = {
  args: {
    data: fileSystemData,
    expanded: ['src', 'components'],
    selected: 'common',
  },
  render: (args) => (
    <div style={{ width: 300, border: '1px solid #e0e0e0', borderRadius: 8, padding: 8 }}>
      <TreeView {...args} />
    </div>
  ),
};

const WithDisabledNode: Story = {
  args: {
    data: [
      { id: '1', label: '可操作节点' },
      { id: '2', label: '禁用节点', disabled: true },
      { id: '3', label: '另一个可操作节点', badge: 'New' },
    ],
    selected: '1',
  },
};

const FlatList: Story = {
  args: {
    data: [
      { id: '1', label: '项目文档' },
      { id: '2', label: '技术方案' },
      { id: '3', label: '会议纪要', badge: 3 },
      { id: '4', label: '设计稿' },
    ],
    selected: '2',
  },
};
