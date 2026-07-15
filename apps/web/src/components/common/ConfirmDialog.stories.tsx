import type { Meta, StoryObj } from '@storybook/react-vite';
import { fn } from 'storybook/test';

import ConfirmDialog, {
  AlertDialog,
  InfoDialog,
  SuccessDialog,
  WarningDialog,
  ErrorDialog,
  ConfirmationDialog,
} from './ConfirmDialog';

const meta = {
  title: 'Common/ConfirmDialog',
  component: ConfirmDialog,
  parameters: {
    layout: 'centered',
    docs: {
      description: {
        component:
          '增强版确认对话框组件，支持多种类型（信息、成功、警告、错误）、自定义按钮、加载状态、拖拽等功能。',
      },
    },
  },
  tags: ['autodocs'],
  argTypes: {
    isOpen: {
      description: '是否打开',
      control: 'boolean',
    },
    title: {
      description: '标题',
      control: 'text',
    },
    message: {
      description: '消息内容',
      control: 'text',
    },
    type: {
      description: '对话框类型',
      control: 'select',
      options: ['alert', 'confirm', 'prompt', 'info', 'success', 'warning', 'error'],
    },
    danger: {
      description: '是否为危险操作',
      control: 'boolean',
    },
    confirmLabel: {
      description: '确认按钮文案',
      control: 'text',
    },
    cancelLabel: {
      description: '取消按钮文案',
      control: 'text',
    },
    confirmDisabled: {
      description: '确认按钮是否禁用',
      control: 'boolean',
    },
    showCloseButton: {
      description: '是否显示关闭按钮',
      control: 'boolean',
    },
    closable: {
      description: '是否可关闭',
      control: 'boolean',
    },
    size: {
      description: '尺寸',
      control: 'select',
      options: ['xs', 'sm', 'md', 'lg', 'xl'],
    },
  },
  args: {
    onClose: fn(),
    onConfirm: fn(),
    isOpen: true,
  },
} satisfies Meta<typeof ConfirmDialog>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    isOpen: true,
    title: '确认操作',
    message: '您确定要执行此操作吗？执行后将无法撤销。',
    type: 'info',
  },
};

export const Danger: Story = {
  args: {
    isOpen: true,
    title: '确认删除',
    message: '确定要删除这条记录吗？删除后将无法恢复，请谨慎操作。',
    type: 'confirm',
    danger: true,
    confirmLabel: '确认删除',
    cancelLabel: '取消',
  },
};

export const Warning: Story = {
  args: {
    isOpen: true,
    title: '警告',
    message: '当前操作可能会影响系统中的关联数据，建议在操作前做好备份。',
    type: 'warning',
    confirmLabel: '继续操作',
  },
};

export const Success: Story = {
  args: {
    isOpen: true,
    title: '操作成功',
    message: '数据已成功保存，所有更改已生效。',
    type: 'success',
    showSuccessIcon: true,
    confirmLabel: '知道了',
  },
};

export const Error: Story = {
  args: {
    isOpen: true,
    title: '操作失败',
    message: '数据保存失败，请检查网络连接后重试。错误代码：ERR_NETWORK_TIMEOUT',
    type: 'error',
    confirmLabel: '重试',
  },
};

export const Info: Story = {
  args: {
    isOpen: true,
    title: '系统通知',
    message: '系统将于今晚 22:00 进行维护升级，预计持续 2 小时。请提前保存您的工作。',
    type: 'info',
    showCloseButton: true,
    confirmLabel: '知道了',
  },
};

export const WithCustomContent: Story = {
  args: {
    isOpen: true,
    title: '导出数据',
    message: '请选择需要导出的数据范围和格式。',
    type: 'confirm',
    confirmLabel: '开始导出',
    children: (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginTop: 16 }}>
        <label style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <input
            type='checkbox'
            defaultChecked
          />
          导出基本信息
        </label>
        <label style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <input
            type='checkbox'
            defaultChecked
          />
          导出操作记录
        </label>
        <label style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <input type='checkbox' />
          导出附件文件
        </label>
      </div>
    ),
  },
};

export const WithCustomButtons: Story = {
  args: {
    isOpen: true,
    title: '请选择操作',
    message: '您可以对此记录执行以下操作：',
    type: 'info',
    buttons: [
      { label: '编辑', onClick: fn(), primary: true },
      { label: '复制', onClick: fn() },
      { label: '删除', onClick: fn(), type: 'error' },
      { label: '取消', onClick: fn() },
    ],
  },
};

export const SmallSize: Story = {
  args: {
    isOpen: true,
    title: '提示',
    message: '这是一个小尺寸的对话框。',
    size: 'sm',
    type: 'info',
    confirmLabel: '确定',
  },
};

export const LargeSize: Story = {
  args: {
    isOpen: true,
    title: '详情确认',
    message:
      '这是一个大尺寸的对话框，适合需要展示较多内容的场景。您可以在对话框中放置表单、列表或其他复杂组件。',
    size: 'lg',
    type: 'confirm',
    confirmLabel: '提交',
  },
};

// ============ Additional requested stories ============

export const Destructive: Story = {
  name: 'Destructive (Delete)',
  args: {
    isOpen: true,
    title: '删除确认',
    message: '确定要永久删除用户「张明」及其所有关联数据吗？此操作不可撤销。',
    type: 'confirm',
    danger: true,
    confirmLabel: '永久删除',
    cancelLabel: '取消',
  },
};

export const AsyncAction: Story = {
  name: 'Async Action (Loading)',
  args: {
    isOpen: true,
    title: '提交审核',
    message: '正在提交数据到服务器，请稍候...',
    type: 'confirm',
    confirmLabel: '提交',
    onConfirm: async () => {
      await new Promise((resolve) => setTimeout(resolve, 3000));
    },
  },
  play: async ({ canvas }) => {
    // Auto-trigger confirm to showcase loading state
    const confirmBtn = canvas.getByRole('button', { name: '提交' });
    confirmBtn.click();
  },
};

export const AlertDialog: Story = {
  args: {
    isOpen: true,
    title: '版本更新通知',
    message: '系统已升级到 v3.2.0，新增批量导入功能和性能优化。请查看更新日志了解详情。',
    type: 'alert',
    confirmLabel: '知道了',
    showCloseButton: true,
  },
};

export const ErrorDialog: Story = {
  args: {
    isOpen: true,
    title: '操作失败',
    message:
      '删除操作失败：该用户存在未处理的订单关联，请先解除关联后再删除。错误代码：ERR_CONSTRAINT_VIOLATION',
    type: 'error',
    confirmLabel: '知道了',
  },
};
