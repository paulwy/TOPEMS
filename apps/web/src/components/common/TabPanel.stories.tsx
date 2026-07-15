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
        component: '标签页面板组件，配合 MUI Tabs 使用，支持加载骨架屏和空消息显示。',
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
          基本信息
        </Typography>
        <Typography color='text.secondary'>
          这是第一个标签页的内容区域。TabPanel 组件会根据 value 和 index 的匹配来决定是否渲染内容。
        </Typography>
      </Box>
    ),
  },
};

export const LoadingState: Story = {
  args: {
    value: 0,
    index: 0,
    loading: true,
  },
};

export const EmptyMessage: Story = {
  args: {
    value: 0,
    index: 0,
    emptyMessage: '暂无数据，请稍后再试',
  },
};

export const WithTabsIntegration: Story = {
  render: () => {
    const TabPanelWrapper = () => {
      const [value, setValue] = useState(0);

      return (
        <Box sx={{ width: 500 }}>
          <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
            <Tabs
              value={value}
              onChange={(_, newValue) => setValue(newValue)}
              aria-label='标签页集成示例'
            >
              <Tab label='基本信息' />
              <Tab label='操作记录' />
              <Tab label='系统设置' />
            </Tabs>
          </Box>
          <TabPanel
            value={value}
            index={0}
          >
            <Typography
              variant='h6'
              gutterBottom
            >
              基本信息
            </Typography>
            <Typography color='text.secondary'>
              这里展示用户或系统的基本配置信息，包括名称、描述、创建时间等。
            </Typography>
          </TabPanel>
          <TabPanel
            value={value}
            index={1}
          >
            <Typography
              variant='h6'
              gutterBottom
            >
              操作记录
            </Typography>
            <Typography color='text.secondary'>
              这里展示最近的操作日志，包括操作人、操作时间、操作内容等。
            </Typography>
          </TabPanel>
          <TabPanel
            value={value}
            index={2}
          >
            <Typography
              variant='h6'
              gutterBottom
            >
              系统设置
            </Typography>
            <Typography color='text.secondary'>
              这里展示系统级别的配置项，包括通知偏好、主题设置、语言选择等。
            </Typography>
          </TabPanel>
        </Box>
      );
    };

    return <TabPanelWrapper />;
  },
};

export const MixedStates: Story = {
  render: () => {
    const MixedWrapper = () => {
      const [value, setValue] = useState(0);

      return (
        <Box sx={{ width: 500 }}>
          <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
            <Tabs
              value={value}
              onChange={(_, newValue) => setValue(newValue)}
            >
              <Tab label='已加载' />
              <Tab label='加载中' />
              <Tab label='无数据' />
            </Tabs>
          </Box>
          <TabPanel
            value={value}
            index={0}
          >
            <Typography>这个标签页的内容已成功加载。</Typography>
          </TabPanel>
          <TabPanel
            value={value}
            index={1}
            loading
          >
            <Typography>此面板正在加载中...</Typography>
          </TabPanel>
          <TabPanel
            value={value}
            index={2}
            emptyMessage='当前标签页没有任何可显示的数据'
          />
        </Box>
      );
    };

    return <MixedWrapper />;
  },
};
