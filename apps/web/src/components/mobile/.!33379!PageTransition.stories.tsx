import type { Meta, StoryObj } from '@storybook/react-vite';

import PageTransition from './PageTransition';

const meta = {
  title: 'Mobile/PageTransition',
  component: PageTransition,
  parameters: {
    layout: 'centered',
    docs: {
      description: {
        component:
          '页面过渡动画组件，包裹页面内容并控制切入方向与时长，适合移动端页面切换的动效场景。',
      },
    },
  },
  tags: ['autodocs'],
  argTypes: {
    direction: {
      description: '切入方向',
      control: 'select',
      options: ['left', 'right', 'up', 'down', 'fade'],
    },
