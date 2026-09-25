import type { Meta, StoryObj } from '@storybook/react-vite';

import { Grid } from './Grid';

const meta = {
  title: 'Common/Grid',
  component: Grid,
  parameters: {
    layout: 'centered',
    docs: {
      description: {
        component:
          '栅格布局组件，基于 MUI Box 封装，支持 12 列断点体系（xs/sm/md/lg/xl）与容器/项目两种角色，适合页面与表单的区域划分。',
      },
    },
  },
  tags: ['autodocs'],
  argTypes: {
    container: { description: '是否为容器（flex 布局）', control: 'boolean' },
    item: { description: '是否为项目（占据断点列宽）', control: 'boolean' },
    xs: { description: 'xs 断点列宽（0-12）', control: { type: 'number', min: 0, max: 12 } },
    sm: { description: 'sm 断点列宽（0-12）', control: { type: 'number', min: 0, max: 12 } },
    md: { description: 'md 断点列宽（0-12）', control: { type: 'number', min: 0, max: 12 } },
    lg: { description: 'lg 断点列宽（0-12）', control: { type: 'number', min: 0, max: 12 } },
    xl: { description: 'xl 断点列宽（0-12）', control: { type: 'number', min: 0, max: 12 } },
  },
} satisfies Meta<typeof Grid>;

export default meta;
type Story = StoryObj<typeof meta>;

export const BasicContainer: Story = {
  render: (args) => (
    <Grid
      container
      spacing={2}
      sx={{ width: 480 }}
    >
      <Grid
        item
        xs={6}
        sx={{ bgcolor: 'primary.light', p: 2, borderRadius: 1 }}
      >
        xs=6
      </Grid>
      <Grid
        item
        xs={6}
        sx={{ bgcolor: 'secondary.light', p: 2, borderRadius: 1 }}
      >
        xs=6
      </Grid>
      <Grid
        item
        xs={4}
        sx={{ bgcolor: 'success.light', p: 2, borderRadius: 1 }}
      >
        xs=4
      </Grid>
      <Grid
        item
        xs={4}
        sx={{ bgcolor: 'warning.light', p: 2, borderRadius: 1 }}
      >
        xs=4
      </Grid>
      <Grid
        item
        xs={4}
        sx={{ bgcolor: 'info.light', p: 2, borderRadius: 1 }}
      >
        xs=4
      </Grid>
    </Grid>
  ),
  args: { container: true },
};

export const ResponsiveBreakpoints: Story = {
  render: (args) => (
    <Grid
      container
      spacing={2}
      sx={{ width: 480 }}
    >
      <Grid
        item
        xs={12}
        md={6}
        lg={4}
        sx={{ bgcolor: 'primary.light', p: 2, borderRadius: 1 }}
      >
        xs=12 / md=6 / lg=4
      </Grid>
      <Grid
        item
        xs={12}
        md={6}
        lg={8}
        sx={{ bgcolor: 'secondary.light', p: 2, borderRadius: 1 }}
      >
        xs=12 / md=6 / lg=8
      </Grid>
    </Grid>
  ),
  args: { container: true },
};
