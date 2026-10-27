import type { Meta, StoryObj } from '@storybook/react-vite';
import { fn } from 'storybook/test';

import { TabPanel } from './TabPanel';
import { useState } from 'react';
import { Box, Tabs, Tab, Typography } from '@mui/material';

const meta = {
  title: 'Common/TabPanel',
  component: TabPanel,
  parameters: {
    layout: 'centered',
    docs: {
      description: {
        component: '标签面板组件，按索引切换内容，支持加载态与空态占位，适合页签式内容布局。',
      },
    },
  },
  tags: ['autodocs'],
  argTypes: {
    value: {
      description: '当前激活的标签索引',
      control: 'number',
    },
    index: {
      description: '此面板对应的标签索引',
      control: 'number',
    },
    loading: {
      description: '是否显示加载状态',
      control: 'boolean',
    },
    emptyMessage: {
      description: '空状态提示文案',
      control: 'text',
    },
  },
} satisfies Meta<typeof TabPanel>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    value: 0,
    index: 0,
    children: (
      <Box>
        <Typography
          variant='h6'
          gutterBottom
        >
