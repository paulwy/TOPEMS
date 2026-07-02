import type { ComponentCategory, ComponentDefinition } from './types';

export const formComponentCategories: ComponentCategory[] = [
  {
    id: 'basic',
    name: '基础组件',
    icon: 'Square',
    components: [
      {
        type: 'input',
        name: '输入框',
        icon: 'Type',
        category: 'basic',
        description: '单行文本输入框',
        defaultProps: {
          label: '输入框',
          placeholder: '请输入',
          required: false,
          disabled: false,
        },
        propSchema: [
          { name: 'label', label: '标签', type: 'string', defaultValue: '输入框' },
          { name: 'name', label: '字段名', type: 'string', defaultValue: '' },
          { name: 'placeholder', label: '占位符', type: 'string', defaultValue: '请输入' },
          { name: 'required', label: '是否必填', type: 'boolean', defaultValue: false },
          { name: 'disabled', label: '是否禁用', type: 'boolean', defaultValue: false },
          { name: 'defaultValue', label: '默认值', type: 'string', defaultValue: '' },
        ],
      },
      {
        type: 'textarea',
        name: '文本域',
        icon: 'AlignLeft',
        category: 'basic',
        description: '多行文本输入框',
        defaultProps: {
          label: '文本域',
          placeholder: '请输入',
          rows: 4,
          required: false,
        },
        propSchema: [
          { name: 'label', label: '标签', type: 'string', defaultValue: '文本域' },
          { name: 'name', label: '字段名', type: 'string', defaultValue: '' },
          { name: 'placeholder', label: '占位符', type: 'string', defaultValue: '请输入' },
          { name: 'rows', label: '行数', type: 'number', defaultValue: 4 },
          { name: 'required', label: '是否必填', type: 'boolean', defaultValue: false },
        ],
      },
      {
        type: 'number',
        name: '数字输入',
        icon: 'Hash',
        category: 'basic',
        description: '数字输入框',
        defaultProps: {
          label: '数字输入',
          placeholder: '请输入数字',
          min: 0,
          max: 100,
          step: 1,
          required: false,
        },
        propSchema: [
          { name: 'label', label: '标签', type: 'string', defaultValue: '数字输入' },
          { name: 'name', label: '字段名', type: 'string', defaultValue: '' },
          { name: 'min', label: '最小值', type: 'number', defaultValue: 0 },
          { name: 'max', label: '最大值', type: 'number', defaultValue: 100 },
          { name: 'step', label: '步长', type: 'number', defaultValue: 1 },
          { name: 'required', label: '是否必填', type: 'boolean', defaultValue: false },
        ],
      },
      {
        type: 'password',
        name: '密码框',
        icon: 'Lock',
        category: 'basic',
        description: '密码输入框',
        defaultProps: {
          label: '密码',
          placeholder: '请输入密码',
          required: false,
        },
        propSchema: [
          { name: 'label', label: '标签', type: 'string', defaultValue: '密码' },
          { name: 'name', label: '字段名', type: 'string', defaultValue: '' },
          { name: 'placeholder', label: '占位符', type: 'string', defaultValue: '请输入密码' },
          { name: 'required', label: '是否必填', type: 'boolean', defaultValue: false },
        ],
      },
    ],
  },
  {
    id: 'select',
    name: '选择组件',
    icon: 'ChevronDown',
    components: [
      {
        type: 'select',
        name: '下拉选择',
        icon: 'ChevronDown',
        category: 'select',
        description: '下拉选择框',
        defaultProps: {
          label: '下拉选择',
          placeholder: '请选择',
          required: false,
          options: [
            { label: '选项1', value: 'option1' },
            { label: '选项2', value: 'option2' },
          ],
        },
        propSchema: [
          { name: 'label', label: '标签', type: 'string', defaultValue: '下拉选择' },
          { name: 'name', label: '字段名', type: 'string', defaultValue: '' },
          { name: 'placeholder', label: '占位符', type: 'string', defaultValue: '请选择' },
          { name: 'required', label: '是否必填', type: 'boolean', defaultValue: false },
          { name: 'multiple', label: '是否多选', type: 'boolean', defaultValue: false },
        ],
      },
      {
        type: 'radio',
        name: '单选框组',
        icon: 'CircleDot',
        category: 'select',
        description: '单选框组',
        defaultProps: {
          label: '单选框组',
          required: false,
          options: [
            { label: '选项1', value: 'option1' },
            { label: '选项2', value: 'option2' },
          ],
        },
        propSchema: [
          { name: 'label', label: '标签', type: 'string', defaultValue: '单选框组' },
          { name: 'name', label: '字段名', type: 'string', defaultValue: '' },
          { name: 'required', label: '是否必填', type: 'boolean', defaultValue: false },
          {
            name: 'direction',
            label: '排列方向',
            type: 'select',
            defaultValue: 'horizontal',
            options: [
              { label: '水平', value: 'horizontal' },
              { label: '垂直', value: 'vertical' },
            ],
          },
        ],
      },
      {
        type: 'checkbox',
        name: '多选框组',
        icon: 'CheckSquare',
        category: 'select',
        description: '多选框组',
        defaultProps: {
          label: '多选框组',
          required: false,
          options: [
            { label: '选项1', value: 'option1' },
            { label: '选项2', value: 'option2' },
          ],
        },
        propSchema: [
          { name: 'label', label: '标签', type: 'string', defaultValue: '多选框组' },
          { name: 'name', label: '字段名', type: 'string', defaultValue: '' },
          { name: 'required', label: '是否必填', type: 'boolean', defaultValue: false },
          {
            name: 'direction',
            label: '排列方向',
            type: 'select',
            defaultValue: 'horizontal',
            options: [
              { label: '水平', value: 'horizontal' },
              { label: '垂直', value: 'vertical' },
            ],
          },
        ],
      },
      {
        type: 'switch',
        name: '开关',
        icon: 'ToggleLeft',
        category: 'select',
        description: '开关组件',
        defaultProps: {
          label: '开关',
          defaultValue: false,
        },
        propSchema: [
          { name: 'label', label: '标签', type: 'string', defaultValue: '开关' },
          { name: 'name', label: '字段名', type: 'string', defaultValue: '' },
          { name: 'defaultValue', label: '默认值', type: 'boolean', defaultValue: false },
        ],
      },
      {
        type: 'date-picker',
        name: '日期选择',
        icon: 'Calendar',
        category: 'select',
        description: '日期选择器',
        defaultProps: {
          label: '日期选择',
          placeholder: '请选择日期',
          required: false,
        },
        propSchema: [
          { name: 'label', label: '标签', type: 'string', defaultValue: '日期选择' },
          { name: 'name', label: '字段名', type: 'string', defaultValue: '' },
          { name: 'placeholder', label: '占位符', type: 'string', defaultValue: '请选择日期' },
          { name: 'required', label: '是否必填', type: 'boolean', defaultValue: false },
        ],
      },
      {
        type: 'time-picker',
        name: '时间选择',
        icon: 'Clock',
        category: 'select',
        description: '时间选择器',
        defaultProps: {
          label: '时间选择',
          placeholder: '请选择时间',
          required: false,
        },
        propSchema: [
          { name: 'label', label: '标签', type: 'string', defaultValue: '时间选择' },
          { name: 'name', label: '字段名', type: 'string', defaultValue: '' },
          { name: 'placeholder', label: '占位符', type: 'string', defaultValue: '请选择时间' },
          { name: 'required', label: '是否必填', type: 'boolean', defaultValue: false },
        ],
      },
    ],
  },
  {
    id: 'layout',
    name: '布局组件',
    icon: 'LayoutGrid',
    components: [
      {
        type: 'grid',
        name: '栅格',
        icon: 'LayoutGrid',
        category: 'layout',
        description: '栅格布局',
        isContainer: true,
        defaultProps: {
          columns: 2,
          gap: 16,
        },
        propSchema: [
          { name: 'columns', label: '列数', type: 'number', defaultValue: 2 },
          { name: 'gap', label: '间距', type: 'number', defaultValue: 16 },
        ],
      },
      {
        type: 'tabs',
        name: '标签页',
        icon: 'Folder',
        category: 'layout',
        description: '标签页组件',
        isContainer: true,
        defaultProps: {
          tabs: [
            { key: 'tab1', label: '标签1' },
            { key: 'tab2', label: '标签2' },
          ],
        },
        propSchema: [{ name: 'name', label: '组件名', type: 'string', defaultValue: '标签页' }],
      },
      {
        type: 'group',
        name: '分组',
        icon: 'Layers',
        category: 'layout',
        description: '分组容器',
        isContainer: true,
        defaultProps: {
          title: '分组标题',
        },
        propSchema: [{ name: 'title', label: '标题', type: 'string', defaultValue: '分组标题' }],
      },
      {
        type: 'divider',
        name: '分割线',
        icon: 'Minus',
        category: 'layout',
        description: '分割线',
        defaultProps: {
          text: '',
        },
        propSchema: [
          { name: 'text', label: '文字', type: 'string', defaultValue: '' },
          {
            name: 'orientation',
            label: '方向',
            type: 'select',
            defaultValue: 'horizontal',
            options: [
              { label: '水平', value: 'horizontal' },
              { label: '垂直', value: 'vertical' },
            ],
          },
        ],
      },
    ],
  },
  {
    id: 'other',
    name: '其他组件',
    icon: 'MoreHorizontal',
    components: [
      {
        type: 'button',
        name: '按钮',
        icon: 'MousePointerClick',
        category: 'other',
        description: '按钮组件',
        defaultProps: {
          text: '按钮',
          variant: 'primary',
        },
        propSchema: [
          { name: 'text', label: '文字', type: 'string', defaultValue: '按钮' },
          {
            name: 'variant',
            label: '样式',
            type: 'select',
            defaultValue: 'primary',
            options: [
              { label: '主要', value: 'primary' },
              { label: '次要', value: 'secondary' },
              { label: '文本', value: 'text' },
              { label: '危险', value: 'danger' },
            ],
          },
          {
            name: 'size',
            label: '大小',
            type: 'select',
            defaultValue: 'medium',
            options: [
              { label: '小', value: 'small' },
              { label: '中', value: 'medium' },
              { label: '大', value: 'large' },
            ],
          },
        ],
      },
      {
        type: 'image-upload',
        name: '图片上传',
        icon: 'Image',
        category: 'other',
        description: '图片上传组件',
        defaultProps: {
          label: '图片上传',
          accept: 'image/*',
          multiple: false,
          maxCount: 1,
        },
        propSchema: [
          { name: 'label', label: '标签', type: 'string', defaultValue: '图片上传' },
          { name: 'name', label: '字段名', type: 'string', defaultValue: '' },
          { name: 'maxCount', label: '最大数量', type: 'number', defaultValue: 1 },
          { name: 'required', label: '是否必填', type: 'boolean', defaultValue: false },
        ],
      },
      {
        type: 'rich-text',
        name: '富文本',
        icon: 'FileText',
        category: 'other',
        description: '富文本编辑器',
        defaultProps: {
          label: '富文本',
          placeholder: '请输入内容',
          required: false,
        },
        propSchema: [
          { name: 'label', label: '标签', type: 'string', defaultValue: '富文本' },
          { name: 'name', label: '字段名', type: 'string', defaultValue: '' },
          { name: 'placeholder', label: '占位符', type: 'string', defaultValue: '请输入内容' },
          { name: 'required', label: '是否必填', type: 'boolean', defaultValue: false },
        ],
      },
      {
        type: 'rating',
        name: '评分',
        icon: 'Star',
        category: 'other',
        description: '评分组件',
        defaultProps: {
          label: '评分',
          max: 5,
          defaultValue: 0,
        },
        propSchema: [
          { name: 'label', label: '标签', type: 'string', defaultValue: '评分' },
          { name: 'name', label: '字段名', type: 'string', defaultValue: '' },
          { name: 'max', label: '最大分数', type: 'number', defaultValue: 5 },
          { name: 'defaultValue', label: '默认值', type: 'number', defaultValue: 0 },
        ],
      },
    ],
  },
];

export const pageComponentCategories: ComponentCategory[] = [
  {
    id: 'container',
    name: '容器组件',
    icon: 'Layout',
    components: [
      {
        type: 'container',
        name: '容器',
        icon: 'Layout',
        category: 'container',
        description: '通用容器',
        isContainer: true,
        defaultProps: {
          padding: 16,
          background: 'transparent',
        },
        propSchema: [
          { name: 'padding', label: '内边距', type: 'number', defaultValue: 16 },
          { name: 'background', label: '背景色', type: 'color', defaultValue: '#ffffff' },
        ],
      },
      {
        type: 'card',
        name: '卡片',
        icon: 'Square',
        category: 'container',
        description: '卡片容器',
        isContainer: true,
        defaultProps: {
          title: '卡片标题',
          shadow: true,
        },
        propSchema: [
          { name: 'title', label: '标题', type: 'string', defaultValue: '卡片标题' },
          { name: 'shadow', label: '阴影', type: 'boolean', defaultValue: true },
        ],
      },
      {
        type: 'tabs',
        name: '标签页',
        icon: 'Folder',
        category: 'container',
        description: '标签页组件',
        isContainer: true,
        defaultProps: {
          tabs: [
            { key: 'tab1', label: '标签1' },
            { key: 'tab2', label: '标签2' },
          ],
        },
        propSchema: [],
      },
    ],
  },
  {
    id: 'data',
    name: '数据展示',
    icon: 'BarChart2',
    components: [
      {
        type: 'table',
        name: '表格',
        icon: 'Table',
        category: 'data',
        description: '数据表格',
        defaultProps: {
          columns: [
            { key: 'name', title: '名称' },
            { key: 'value', title: '数值' },
          ],
          height: 400,
        },
        propSchema: [{ name: 'height', label: '高度', type: 'number', defaultValue: 400 }],
      },
      {
        type: 'chart',
        name: '图表',
        icon: 'BarChart2',
        category: 'data',
        description: '图表组件',
        defaultProps: {
          chartType: 'bar',
          height: 300,
          title: '',
        },
        propSchema: [
          {
            name: 'chartType',
            label: '图表类型',
            type: 'select',
            defaultValue: 'bar',
            options: [
              { label: '柱状图', value: 'bar' },
              { label: '折线图', value: 'line' },
              { label: '饼图', value: 'pie' },
              { label: '雷达图', value: 'radar' },
            ],
          },
          { name: 'height', label: '高度', type: 'number', defaultValue: 300 },
          { name: 'title', label: '标题', type: 'string', defaultValue: '' },
        ],
      },
      {
        type: 'list',
        name: '列表',
        icon: 'List',
        category: 'data',
        description: '列表组件',
        defaultProps: {
          itemKey: 'id',
        },
        propSchema: [{ name: 'itemKey', label: '唯一键', type: 'string', defaultValue: 'id' }],
      },
    ],
  },
  {
    id: 'form',
    name: '表单组件',
    icon: 'FileText',
    components: [
      {
        type: 'form',
        name: '表单',
        icon: 'FileText',
        category: 'form',
        description: '表单组件',
        isContainer: true,
        defaultProps: {
          layout: 'vertical',
          labelWidth: 100,
        },
        propSchema: [
          {
            name: 'layout',
            label: '布局',
            type: 'select',
            defaultValue: 'vertical',
            options: [
              { label: '垂直', value: 'vertical' },
              { label: '水平', value: 'horizontal' },
              { label: '行内', value: 'inline' },
            ],
          },
          { name: 'labelWidth', label: '标签宽度', type: 'number', defaultValue: 100 },
        ],
      },
    ],
  },
  {
    id: 'basic',
    name: '基础组件',
    icon: 'Type',
    components: [
      {
        type: 'button-group',
        name: '按钮组',
        icon: 'MousePointerClick',
        category: 'basic',
        description: '按钮组组件',
        defaultProps: {
          buttons: [
            { text: '按钮1', variant: 'primary' },
            { text: '按钮2', variant: 'secondary' },
          ],
        },
        propSchema: [],
      },
      {
        type: 'image',
        name: '图片',
        icon: 'Image',
        category: 'basic',
        description: '图片组件',
        defaultProps: {
          src: '',
          alt: '图片',
          width: '100%',
          height: 'auto',
          fit: 'cover',
        },
        propSchema: [
          { name: 'src', label: '图片地址', type: 'string', defaultValue: '' },
          { name: 'alt', label: '替代文本', type: 'string', defaultValue: '图片' },
          { name: 'width', label: '宽度', type: 'string', defaultValue: '100%' },
          { name: 'height', label: '高度', type: 'string', defaultValue: 'auto' },
        ],
      },
      {
        type: 'text',
        name: '文本',
        icon: 'Type',
        category: 'basic',
        description: '文本组件',
        defaultProps: {
          content: '这是一段文本',
          variant: 'body1',
          align: 'left',
        },
        propSchema: [
          { name: 'content', label: '内容', type: 'string', defaultValue: '这是一段文本' },
          {
            name: 'variant',
            label: '样式',
            type: 'select',
            defaultValue: 'body1',
            options: [
              { label: '标题1', value: 'h1' },
              { label: '标题2', value: 'h2' },
              { label: '标题3', value: 'h3' },
              { label: '正文', value: 'body1' },
              { label: '正文2', value: 'body2' },
              { label: '副标题', value: 'subtitle1' },
            ],
          },
          {
            name: 'align',
            label: '对齐',
            type: 'select',
            defaultValue: 'left',
            options: [
              { label: '左对齐', value: 'left' },
              { label: '居中', value: 'center' },
              { label: '右对齐', value: 'right' },
            ],
          },
        ],
      },
    ],
  },
];

export const componentApi = {
  async getFormComponents(): Promise<ComponentCategory[]> {
    return new Promise((resolve) => {
      setTimeout(() => resolve(formComponentCategories), 200);
    });
  },

  async getPageComponents(): Promise<ComponentCategory[]> {
    return new Promise((resolve) => {
      setTimeout(() => resolve(pageComponentCategories), 200);
    });
  },

  async getComponentByType(type: string, isPage = false): Promise<ComponentDefinition | null> {
    const categories = isPage ? pageComponentCategories : formComponentCategories;
    for (const category of categories) {
      const comp = category.components.find((c) => c.type === type);
      if (comp) return comp;
    }
    return null;
  },
};
