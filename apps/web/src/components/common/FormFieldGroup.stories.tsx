import type { Meta, StoryObj } from '@storybook/react-vite';

import { FormFieldGroup } from './FormFieldGroup';
import { TextField, Box } from '@mui/material';

const meta = {
  title: 'Common/FormFieldGroup',
  component: FormFieldGroup,
  parameters: {
    layout: 'centered',
    docs: {
      description: {
        component: '表单字段分组组件，支持标题、描述、工具提示、可折叠、多列网格布局和必填标记。',
      },
    },
  },
  tags: ['autodocs'],
  argTypes: {
    title: {
      description: '分组标题',
      control: 'text',
    },
    description: {
      description: '描述说明',
      control: 'text',
    },
    tooltip: {
      description: '工具提示内容',
      control: 'text',
    },
    collapsible: {
      description: '是否可折叠',
      control: 'boolean',
    },
    defaultExpanded: {
      description: '默认展开状态',
      control: 'boolean',
    },
    columns: {
      description: '列数（网格布局）',
      control: 'select',
      options: [undefined, 1, 2, 3, 4],
    },
    required: {
      description: '是否显示必填标记',
      control: 'boolean',
    },
  },
} satisfies Meta<typeof FormFieldGroup>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: () => (
    <Box sx={{ width: 500 }}>
      <FormFieldGroup
        title='基本信息'
        description='请填写用户的基本信息'
      >
        <TextField
          label='姓名'
          size='small'
          fullWidth
        />
        <TextField
          label='邮箱'
          size='small'
          fullWidth
        />
        <TextField
          label='手机号'
          size='small'
          fullWidth
        />
      </FormFieldGroup>
    </Box>
  ),
};

export const Collapsible: Story = {
  render: () => (
    <Box sx={{ width: 500 }}>
      <FormFieldGroup
        title='高级设置'
        description='展开可配置高级选项'
        collapsible
        defaultExpanded={false}
      >
        <TextField
          label='超时时间（秒）'
          size='small'
          fullWidth
        />
        <TextField
          label='重试次数'
          size='small'
          fullWidth
        />
        <TextField
          label='回调地址'
          size='small'
          fullWidth
        />
      </FormFieldGroup>
    </Box>
  ),
};

export const MultiColumnGrid: Story = {
  render: () => (
    <Box sx={{ width: 700 }}>
      <FormFieldGroup
        title='联系信息'
        columns={3}
      >
        <TextField
          label='姓名'
          size='small'
          fullWidth
        />
        <TextField
          label='邮箱'
          size='small'
          fullWidth
        />
        <TextField
          label='手机号'
          size='small'
          fullWidth
        />
        <TextField
          label='座机'
          size='small'
          fullWidth
        />
        <TextField
          label='省/市'
          size='small'
          fullWidth
        />
        <TextField
          label='详细地址'
          size='small'
          fullWidth
        />
      </FormFieldGroup>
    </Box>
  ),
};

export const RequiredMarker: Story = {
  render: () => (
    <Box sx={{ width: 500 }}>
      <FormFieldGroup
        title='必填信息'
        required
      >
        <TextField
          label='姓名（必填）'
          size='small'
          fullWidth
          required
        />
        <TextField
          label='身份证号（必填）'
          size='small'
          fullWidth
          required
        />
      </FormFieldGroup>
    </Box>
  ),
};

export const WithTooltip: Story = {
  render: () => (
    <Box sx={{ width: 500 }}>
      <FormFieldGroup
        title='安全设置'
        tooltip='配置安全策略和访问控制规则，建议仅由管理员修改'
      >
        <TextField
          label='密码策略'
          size='small'
          fullWidth
        />
        <TextField
          label='会话超时'
          size='small'
          fullWidth
        />
      </FormFieldGroup>
    </Box>
  ),
};

export const MultipleGroups: Story = {
  render: () => (
    <Box sx={{ width: 500, display: 'flex', flexDirection: 'column', gap: 2 }}>
      <FormFieldGroup
        title='基本信息'
        required
        description='请填写基本资料'
      >
        <TextField
          label='姓名'
          size='small'
          fullWidth
        />
        <TextField
          label='工号'
          size='small'
          fullWidth
        />
      </FormFieldGroup>
      <FormFieldGroup
        title='联系方式'
        columns={2}
      >
        <TextField
          label='邮箱'
          size='small'
          fullWidth
        />
        <TextField
          label='手机号'
          size='small'
          fullWidth
        />
      </FormFieldGroup>
      <FormFieldGroup
        title='其他'
        collapsible
        defaultExpanded={false}
      >
        <TextField
          label='备注'
          size='small'
          fullWidth
          multiline
          rows={3}
        />
      </FormFieldGroup>
    </Box>
  ),
};

export const TwoColumnLayout: Story = {
  render: () => (
    <Box sx={{ width: 600 }}>
      <FormFieldGroup
        title='地址信息'
        columns={2}
      >
        <TextField
          label='省份'
          size='small'
          fullWidth
        />
        <TextField
          label='城市'
          size='small'
          fullWidth
        />
        <TextField
          label='区/县'
          size='small'
          fullWidth
        />
        <TextField
          label='街道'
          size='small'
          fullWidth
        />
      </FormFieldGroup>
    </Box>
  ),
};
