import type { Meta, StoryObj } from '@storybook/react-vite';
import { Box, Typography, Button, Paper, Chip, Stack, Divider } from '@mui/material';
import ThemePresetSwitcher from './ThemePresetSwitcher';
import { themePresets, type ThemePreset } from '@/theme/presets';
import { designTokens } from '@topems/tokens';

// ============ Meta ============

const meta = {
  title: 'Common/ThemePresetSwitcher',
  component: ThemePresetSwitcher,
  parameters: {
    layout: 'centered',
    docs: {
      description: {
        component:
          '多品牌主题预设切换器。支持 6 种预设配色方案，通过 CSS Variables 动态切换主色调，' +
          '选择会自动持久化到 localStorage。点击调色板图标即可展开预设面板进行切换。',
      },
    },
  },
  tags: ['autodocs'],
} satisfies Meta<typeof ThemePresetSwitcher>;

export default meta;
type Story = StoryObj<typeof meta>;

// ============ Preset Preview Card ============

function PresetShowcase({ preset }: { preset: ThemePreset }) {
  const p = preset.primary;
  return (
    <Paper
      variant='outlined'
      sx={{
        p: 2,
        borderRadius: 3,
        display: 'flex',
        flexDirection: 'column',
        gap: 1.5,
      }}
    >
      {/* Preset info */}
      <Box>
        <Typography
          variant='subtitle2'
          fontWeight={600}
        >
          {preset.nameZh}
        </Typography>
        <Typography
          variant='caption'
          color='text.secondary'
        >
          {preset.name} — {preset.description}
        </Typography>
      </Box>

      {/* Color swatches */}
      <Box sx={{ display: 'flex', gap: 0.5 }}>
        {[50, 100, 200, 300, 400, 500, 600, 700, 800, 900].map((shade) => (
          <Box
            key={shade}
            sx={{
              width: 28,
              height: 28,
              borderRadius: 1,
              backgroundColor: p?.[shade as keyof typeof p],
              border: '1px solid',
              borderColor: 'divider',
            }}
          />
        ))}
      </Box>

      {/* Color hex values */}
      <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
        {[50, 100, 300, 500, 700, 900].map((shade) => (
          <Chip
            key={shade}
            label={p?.[shade as keyof typeof p]}
            size='small'
            sx={{
              fontSize: 10,
              height: 20,
              backgroundColor: `${p?.[shade as keyof typeof p]}22`,
              borderColor: p?.[shade as keyof typeof p],
              color: p?.[700 as keyof typeof p],
            }}
            variant='outlined'
          />
        ))}
      </Box>

      {/* Simulated UI elements with preset colors */}
      <Divider />
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
        <Button
          variant='contained'
          size='small'
          sx={{
            backgroundColor: p?.main,
            color: p?.contrastText,
            '&:hover': { backgroundColor: p?.dark },
          }}
        >
          主要按钮
        </Button>
        <Button
          variant='outlined'
          size='small'
          sx={{
            borderColor: p?.main,
            color: p?.main,
            '&:hover': { borderColor: p?.dark, backgroundColor: `${p?.main}10` },
          }}
        >
          边框按钮
        </Button>
        <Chip
          label='标签'
          size='small'
          sx={{
            backgroundColor: p?.[50],
            color: p?.[700],
            borderColor: p?.[200],
          }}
          variant='outlined'
        />
      </Box>
    </Paper>
  );
}

// ============ Stories ============

export const Default: Story = {
  args: {},
  render: () => (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
      <Typography
        variant='body2'
        color='text.secondary'
      >
        点击右侧图标切换主题配色：
      </Typography>
      <ThemePresetSwitcher />
    </Box>
  ),
};

const AllPresets: Story = {
  parameters: {
    layout: 'fullscreen',
  },
  render: () => (
    <Box sx={{ p: 3, maxWidth: 900, mx: 'auto' }}>
      <Typography
        variant='h5'
        fontWeight={600}
        sx={{ mb: 0.5 }}
      >
        多品牌主题预设
      </Typography>
      <Typography
        variant='body2'
        color='text.secondary'
        sx={{ mb: 3 }}
      >
        系统提供 6 种品牌配色预设，每种预设定义了完整的 Primary 色阶（50-900）， 可通过
        ThemePresetSwitcher 组件一键切换。选择会持久化到 localStorage。
      </Typography>

      {/* Switcher demo */}
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          gap: 2,
          mb: 3,
          p: 2,
          borderRadius: 3,
          backgroundColor: 'grey.50',
          border: '1px solid',
          borderColor: 'divider',
        }}
      >
        <Typography
          variant='body2'
          fontWeight={500}
        >
          实时切换器：
        </Typography>
        <ThemePresetSwitcher />
      </Box>

      {/* All presets showcase */}
      <Stack spacing={2}>
        {themePresets.map((preset) => (
          <PresetShowcase
            key={preset.id}
            preset={preset}
          />
        ))}
      </Stack>
    </Box>
  ),
};

const SwitcherInContext: Story = {
  parameters: {
    layout: 'fullscreen',
  },
  render: () => (
    <Box sx={{ p: 3 }}>
      {/* Simulated header bar */}
      <Paper
        elevation={0}
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          px: 3,
          py: 1.5,
          borderRadius: 3,
          borderBottom: '1px solid',
          borderColor: 'divider',
          mb: 3,
        }}
      >
        <Typography
          variant='h6'
          fontWeight={600}
        >
          TOPEMS 管理系统
        </Typography>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <ThemePresetSwitcher />
        </Box>
      </Paper>

      {/* Simulated content */}
      <Paper sx={{ p: 3, borderRadius: 3 }}>
        <Typography
          variant='h6'
          sx={{ mb: 1 }}
        >
          仪表盘
        </Typography>
        <Typography
          variant='body2'
          color='text.secondary'
          sx={{ mb: 2 }}
        >
          切换上方主题配色后，页面中的主色调按钮、标签和强调元素将实时更新。 当前使用的是 MUI v9 CSS
          Variables 方案，预设切换通过修改 :root 上的 CSS 自定义属性实现。
        </Typography>
        <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
          {['新建订单', '导出报表', '系统设置', '审批中心'].map((label) => (
            <Button
              key={label}
              variant='contained'
              size='small'
            >
              {label}
            </Button>
          ))}
        </Box>
      </Paper>
    </Box>
  ),
};

const ColorPaletteGrid: Story = {
  parameters: {
    layout: 'fullscreen',
  },
  render: () => (
    <Box sx={{ p: 3, maxWidth: 1100, mx: 'auto' }}>
      <Typography
        variant='h5'
        fontWeight={600}
        sx={{ mb: 0.5 }}
      >
        配色方案一览
      </Typography>
      <Typography
        variant='body2'
        color='text.secondary'
        sx={{ mb: 3 }}
      >
        所有预设的主色阶对比。每行展示一个预设的 10 级色阶。
      </Typography>

      <Stack spacing={1}>
        {themePresets.map((preset) => (
          <Box
            key={preset.id}
            sx={{
              display: 'flex',
              alignItems: 'center',
              gap: 2,
              p: 1,
              borderRadius: 3,
              '&:hover': { backgroundColor: 'grey.50' },
            }}
          >
            <Typography
              variant='body2'
              fontWeight={500}
              sx={{ width: 80, flexShrink: 0 }}
            >
              {preset.nameZh}
            </Typography>
            <Box sx={{ display: 'flex', flex: 1, gap: 0.5 }}>
              {[50, 100, 200, 300, 400, 500, 600, 700, 800, 900].map((shade) => (
                <Box
                  key={shade}
                  sx={{
                    flex: 1,
                    height: 48,
                    borderRadius: 1,
                    backgroundColor: preset.primary?.[shade as keyof typeof preset.primary],
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    transition: 'transform 0.15s',
                    '&:hover': {
                      transform: 'scaleY(1.15)',
                      zIndex: 1,
                    },
                  }}
                >
                  <Typography
                    variant='caption'
                    sx={{
                      fontSize: 9,
                      fontWeight: 500,
                      color:
                        shade >= 500
                          ? designTokens.colors.cyber.metal.topLight
                          : designTokens.colors.cyber.glass.divider,
                      userSelect: 'none',
                    }}
                  >
                    {shade}
                  </Typography>
                </Box>
              ))}
            </Box>
            <Typography
              variant='caption'
              color='text.secondary'
              sx={{ width: 70, textAlign: 'right', flexShrink: 0 }}
            >
              main: {preset.primary?.main}
            </Typography>
          </Box>
        ))}
      </Stack>
    </Box>
  ),
};
