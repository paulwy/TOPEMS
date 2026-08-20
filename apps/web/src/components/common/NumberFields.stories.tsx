import type { Meta, StoryObj } from '@storybook/react-vite';
import { fn } from 'storybook/test';
import { Box, Typography } from '@mui/material';

import { NumberField, CurrencyField, PercentField } from './NumberFields';

const meta = {
  title: 'Common/NumberFields',
  component: NumberField,
  parameters: {
    layout: 'centered',
    docs: {
      description: {
        component:
          '数字输入字段集合，包含 NumberField、CurrencyField 和 PercentField，从 @topems/shared-components 重新导出。',
      },
    },
  },
  tags: ['autodocs'],
} satisfies Meta<typeof NumberField>;

export default meta;
type Story = StoryObj<typeof meta>;

const NumberFieldDefault: Story = {
  render: () => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16, width: 300 }}>
      <Typography variant='subtitle2'>NumberField - 数字输入</Typography>
      <NumberField
        label='数量'
        value={100}
        onChange={fn()}
      />
    </div>
  ),
};

const CurrencyFieldDefault: Story = {
  render: () => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16, width: 300 }}>
      <Typography variant='subtitle2'>CurrencyField - 货币输入</Typography>
      <CurrencyField
        label='金额'
        value={9999.99}
        onChange={fn()}
      />
    </div>
  ),
};

const PercentFieldDefault: Story = {
  render: () => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16, width: 300 }}>
      <Typography variant='subtitle2'>PercentField - 百分比输入</Typography>
      <PercentField
        label='完成率'
        value={85.5}
        onChange={fn()}
      />
    </div>
  ),
};

const AllFields: Story = {
  render: () => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24, width: 350 }}>
      <Box>
        <Typography
          variant='subtitle2'
          gutterBottom
        >
          数量
        </Typography>
        <NumberField
          label='库存数量'
          value={1200}
          onChange={fn()}
        />
      </Box>
      <Box>
        <Typography
          variant='subtitle2'
          gutterBottom
        >
          金额
        </Typography>
        <CurrencyField
          label='单价'
          value={158.5}
          onChange={fn()}
        />
      </Box>
      <Box>
        <Typography
          variant='subtitle2'
          gutterBottom
        >
          百分比
        </Typography>
        <PercentField
          label='折扣'
          value={15}
          onChange={fn()}
        />
      </Box>
    </div>
  ),
};
