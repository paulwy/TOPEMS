import type { Meta, StoryObj } from '@storybook/react-vite';

import AmountDisplay from './AmountDisplay';

const meta = {
  title: 'Common/AmountDisplay',
  component: AmountDisplay,
  parameters: {
    layout: 'centered',
    docs: {
      description: {
        component:
          '金额显示组件，支持货币符号、千分位、小数位与前后缀配置，适合财务、订单等金额展示场景。',
      },
    },
  },
  tags: ['autodocs'],
  argTypes: {
    amount: { description: '金额数值', control: 'number' },
    currency: { description: '货币符号（如 ¥/$）', control: 'text' },
    showUnit: { description: '是否显示货币符号', control: 'boolean' },
    thousandSeparator: { description: '是否启用千分位', control: 'boolean' },
    decimalPlaces: { description: '小数位数', control: { type: 'number', min: 0, max: 4 } },
    bold: { description: '是否加粗', control: 'boolean' },
    prefix: { description: '前缀文本', control: 'text' },
    suffix: { description: '后缀文本', control: 'text' },
    color: { description: '文字颜色', control: 'color' },
    fontSize: { description: '字号（px）', control: 'number' },
  },
} satisfies Meta<typeof AmountDisplay>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    amount: 1234567.89,
    currency: '¥',
    showUnit: true,
    thousandSeparator: true,
    decimalPlaces: 2,
  },
};

export const NoUnitNoSeparator: Story = {
  args: { amount: 1234567.89, showUnit: false, thousandSeparator: false, decimalPlaces: 2 },
};

export const CustomStyled: Story = {
  args: {
    amount: 99800,
    currency: '￥',
    showUnit: true,
    thousandSeparator: true,
    decimalPlaces: 0,
    bold: true,
    fontSize: 20,
    color: '#d32f2f',
    prefix: '合计: ',
    suffix: ' 元',
  },
};
