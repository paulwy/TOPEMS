import type { Meta, StoryObj } from '@storybook/react-vite';
import { fn } from 'storybook/test';
import FormBuilder, { type FormBuilderConfig } from './FormBuilder';

interface UserForm {
  username: string;
  email: string;
  password: string;
  role: string;
  department: string;
  phone: string;
  joinDate: string;
  notifyEmail: boolean;
  bio: string;
}

const baseFields: FormBuilderConfig<UserForm>['fields'] = [
  { name: 'username', label: '用户名', type: 'text', required: true, placeholder: '请输入用户名', validation: [{ type: 'minLength', value: 3 }, { type: 'maxLength', value: 20 }] },
  { name: 'email', label: '邮箱', type: 'email', required: true, placeholder: 'user@example.com', validation: [{ type: 'email' }] },
  { name: 'password', label: '密码', type: 'password', required: true, placeholder: '至少 8 位', validation: [{ type: 'minLength', value: 8 }] },
  { name: 'role', label: '角色', type: 'select', required: true, options: [{ value: 'admin', label: '管理员' }, { value: 'user', label: '普通用户' }, { value: 'guest', label: '访客' }] },
  { name: 'department', label: '部门', type: 'autocomplete', required: false, options: [{ value: 'rd', label: '研发部' }, { value: 'mkt', label: '市场部' }, { value: 'hr', label: '人力资源' }, { value: 'fin', label: '财务部' }] },
  { name: 'phone', label: '手机号', type: 'text', required: false, placeholder: '11 位手机号' },
  { name: 'joinDate', label: '入职日期', type: 'date', required: true },
  { name: 'notifyEmail', label: '接收邮件通知', type: 'checkbox', defaultValue: true },
  { name: 'bio', label: '个人简介', type: 'textarea', colSpan: 2, placeholder: '简要描述一下自己...' },
];

const meta = {
  title: 'Common/FormBuilder',
  component: FormBuilder,
  parameters: {
    layout: 'padded',
    docs: {
      description: {
        component: 'Schema 驱动的表单构建器，支持 10+ 种字段类型、校验、条件显隐、分组等能力。',
      },
    },
  },
  tags: ['autodocs'],
} satisfies Meta<typeof FormBuilder>;

export default meta;
type Story = StoryObj<typeof meta>;

const CreateMode: Story = {
  args: {
    title: '创建用户',
    fields: baseFields,
    onSubmit: fn(async () => {
      await new Promise((r) => setTimeout(r, 500));
    }),
    submitLabel: '创建',
    resetLabel: '清空',
    colCount: 2,
  },
};

const EditMode: Story = {
  args: {
    title: '编辑用户',
    mode: 'edit',
    fields: baseFields,
    initialValues: {
      username: 'zhangsan',
      email: 'zhangsan@topems.com',
      role: 'admin',
      department: 'rd',
      phone: '13800138000',
      joinDate: '2022-03-15',
      notifyEmail: true,
      bio: '高级工程师，主要负责前端架构工作。',
    },
    onSubmit: fn(async () => {
      await new Promise((r) => setTimeout(r, 500));
    }),
    submitLabel: '保存',
    colCount: 2,
  },
};

export const ViewMode: Story = {
  args: {
    title: '用户详情',
    mode: 'view',
    fields: baseFields,
    initialValues: {
      username: 'zhangsan',
      email: 'zhangsan@topems.com',
      role: 'admin',
      department: 'rd',
      phone: '13800138000',
      joinDate: '2022-03-15',
      notifyEmail: true,
      bio: '高级工程师，主要负责前端架构工作。',
    },
    colCount: 2,
  },
};

const SingleColumn: Story = {
  args: {
    title: '单行表单',
    colCount: 1,
    fields: baseFields.slice(0, 5),
    onSubmit: fn(async () => {
      await new Promise((r) => setTimeout(r, 300));
    }),
  },
};

const AsyncAutocomplete: Story = {
  args: {
    title: '异步选项加载',
    colCount: 1,
    fields: [
      {
        name: 'city',
        label: '所在城市',
        type: 'autocomplete',
        required: true,
        optionsAsync: async (search) => {
          await new Promise((r) => setTimeout(r, 400));
          const cities = ['北京', '上海', '广州', '深圳', '杭州', '成都', '南京', '武汉'];
          return cities
            .filter((c) => c.includes(search))
            .map((c) => ({ value: c, label: c }));
        },
      },
      ...baseFields.slice(0, 2),
    ],
    onSubmit: fn(async () => {}),
  },
};

const FormSections: Story = {
  args: {
    title: '分组表单',
    colCount: 2,
    fields: baseFields,
    formSections: [
      { title: '基本信息', fields: ['username', 'email', 'password', 'role'] },
      { title: '联系方式', fields: ['department', 'phone', 'joinDate'] },
      { title: '其他', fields: ['notifyEmail', 'bio'] },
    ],
    onSubmit: fn(async () => {}),
  },
};
