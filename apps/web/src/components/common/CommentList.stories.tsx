import type { Meta, StoryObj } from '@storybook/react-vite';
import { fn } from 'storybook/test';

import { CommentList } from './CommentList';
import type { Comment } from './CommentList';

const sampleComments: Comment[] = [
  {
    id: '1',
    content: '这个功能做得非常棒，用户体验很好！',
    author: { id: '1', name: '张三' },
    createdAt: '2024-06-15 10:30',
    likes: 5,
    liked: true,
    replies: [
      {
        id: '1-1',
        content: '谢谢认可，我们会继续优化！',
        author: { id: '2', name: '李四' },
        createdAt: '2024-06-15 11:00',
        likes: 2,
      },
    ],
  },
  {
    id: '2',
    content: '建议增加批量操作功能，可以提升工作效率。',
    author: { id: '3', name: '王五' },
    createdAt: '2024-06-14 16:20',
    likes: 3,
    replies: [
      {
        id: '2-1',
        content: '好建议，已记录到需求池中。',
        author: { id: '4', name: '赵六' },
        createdAt: '2024-06-14 17:00',
        likes: 1,
      },
      {
        id: '2-2',
        content: '期待这个功能上线！',
        author: { id: '5', name: '孙七' },
        createdAt: '2024-06-14 18:30',
      },
    ],
  },
  {
    id: '3',
    content: '考勤模块有个小问题，周末排班时间显示不正确。',
    author: { id: '6', name: '周八' },
    createdAt: '2024-06-13 09:15',
    likes: 1,
  },
];

const meta = {
  title: 'Common/CommentList',
  component: CommentList,
  parameters: {
    layout: 'centered',
    docs: {
      description: {
        component: '评论列表组件，支持添加评论、回复、点赞和嵌套显示。',
      },
    },
  },
  tags: ['autodocs'],
  argTypes: {
    allowReply: {
      description: '是否允许回复',
      control: 'boolean',
    },
    allowLike: {
      description: '是否允许点赞',
      control: 'boolean',
    },
    allowAdd: {
      description: '是否允许添加评论',
      control: 'boolean',
    },
  },
  args: {
    comments: sampleComments,
    onAddComment: fn(),
    onLike: fn(),
    onReply: fn(),
  },
} satisfies Meta<typeof CommentList>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    comments: sampleComments,
    onAddComment: fn(),
    onLike: fn(),
    onReply: fn(),
  },
};

export const EmptyComments: Story = {
  args: {
    comments: [],
    onAddComment: fn(),
    onLike: fn(),
    onReply: fn(),
  },
};

export const NoReply: Story = {
  args: {
    comments: sampleComments,
    allowReply: false,
    onAddComment: fn(),
    onLike: fn(),
  },
};

export const NoLike: Story = {
  args: {
    comments: sampleComments,
    allowLike: false,
    onAddComment: fn(),
    onReply: fn(),
  },
};

export const ReadOnly: Story = {
  args: {
    comments: sampleComments,
    allowAdd: false,
    allowReply: false,
    allowLike: false,
  },
};

export const SingleComment: Story = {
  args: {
    comments: [
      {
        id: '1',
        content: '这是一条评论示例，展示单条评论的样式效果。',
        author: { id: '1', name: '测试用户' },
        createdAt: '2024-06-15 10:30',
        likes: 10,
        liked: true,
      },
    ],
    onAddComment: fn(),
    onLike: fn(),
    onReply: fn(),
  },
};
