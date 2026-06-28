import type { Meta, StoryObj } from '@storybook/react-vite';

import { RadarChart } from './RadarChart';

const meta = {
  title: 'Charts/RadarChart',
  component: RadarChart,
  parameters: {
    layout: 'padded',
    docs: {
      description: {
        component: '雷达图组件，支持多系列数据对比，适合展示多维度的能力评估和对比分析。',
      },
    },
  },
  tags: ['autodocs'],
  argTypes: {
    dataKey: {
      description: '维度名称字段',
      control: 'text',
    },
    height: {
      description: '图表高度',
      control: { type: 'number', min: 200, max: 600 },
    },
    showLegend: {
      description: '是否显示图例',
      control: 'boolean',
    },
    animate: {
      description: '是否启用动画',
      control: 'boolean',
    },
  },
} satisfies Meta<typeof RadarChart>;

export default meta;
type Story = StoryObj<typeof meta>;

const skillAssessmentData = [
  { subject: '前端开发', teamA: 90, teamB: 75 },
  { subject: '后端开发', teamA: 70, teamB: 85 },
  { subject: '数据分析', teamA: 80, teamB: 65 },
  { subject: '产品设计', teamA: 60, teamB: 90 },
  { subject: '项目管理', teamA: 85, teamB: 70 },
  { subject: '测试质量', teamA: 75, teamB: 80 },
];

const employeeCapabilityData = [
  { subject: '专业技能', score: 88 },
  { subject: '沟通能力', score: 75 },
  { subject: '团队协作', score: 82 },
  { subject: '创新思维', score: 70 },
  { subject: '执行力', score: 90 },
  { subject: '学习能力', score: 85 },
];

const productComparisonData = [
  { dimension: '性能', productA: 85, productB: 90, productC: 70 },
  { dimension: '易用性', productA: 90, productB: 75, productC: 85 },
  { dimension: '稳定性', productA: 80, productB: 88, productC: 78 },
  { dimension: '扩展性', productA: 75, productB: 80, productC: 92 },
  { dimension: '文档', productA: 88, productB: 65, productC: 80 },
];

export const Default: Story = {
  args: {
    data: skillAssessmentData,
    dataKey: 'subject',
    yKeys: [
      { key: 'teamA', name: 'A 团队', color: '#5B8FF9' },
      { key: 'teamB', name: 'B 团队', color: '#E86452' },
    ],
    height: 350,
  },
};

export const SingleSeries: Story = {
  args: {
    data: employeeCapabilityData,
    dataKey: 'subject',
    yKeys: [{ key: 'score', name: '综合评分', color: '#5B8FF9' }],
    height: 350,
  },
};

export const MultiSeries: Story = {
  args: {
    data: productComparisonData,
    dataKey: 'dimension',
    yKeys: [
      { key: 'productA', name: '产品 A', color: '#5B8FF9' },
      { key: 'productB', name: '产品 B', color: '#5AD8A6' },
      { key: 'productC', name: '产品 C', color: '#F6BD16' },
    ],
    height: 350,
  },
};

export const NoLegend: Story = {
  args: {
    data: employeeCapabilityData,
    dataKey: 'subject',
    yKeys: [{ key: 'score', name: '评分', color: '#6DC8EC' }],
    height: 300,
    showLegend: false,
  },
};
