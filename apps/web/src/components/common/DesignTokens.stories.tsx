import type { Meta, StoryObj } from '@storybook/react-vite';
import {
  Box,
  Typography,
  Paper,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Tooltip,
  Chip,
  Divider,
} from '@mui/material';
import { designTokens, semanticTokens } from '@topems/tokens';

// ============================================================
// 色板色块组件
// ============================================================
const getContrastColor = (hex: string): string => {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return luminance > 0.55 ? '#1e293b' : '#ffffff';
};

const ColorSwatch = ({
  name,
  hex,
  onClick,
}: {
  name: string;
  hex: string;
  onClick?: (hex: string) => void;
}) => (
  <Tooltip
    title={`${name}: ${hex}（点击复制）`}
    arrow
    placement='top'
  >
    <Box
      sx={{
        backgroundColor: hex,
        color: getContrastColor(hex),
        borderRadius: '8px',
        p: 1.5,
        minHeight: 64,
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'flex-end',
        cursor: 'pointer',
        transition: 'transform 0.15s ease, box-shadow 0.15s ease',
        '&:hover': {
          transform: 'translateY(-2px)',
          boxShadow: 3,
        },
        fontSize: '0.75rem',
        fontFamily: 'monospace',
      }}
      onClick={() => onClick?.(hex)}
    >
      <Box sx={{ fontWeight: 600, opacity: 0.9 }}>{name}</Box>
      <Box sx={{ opacity: 0.7, fontSize: '0.625rem' }}>{hex}</Box>
    </Box>
  </Tooltip>
);

const ColorFamilyGrid = ({
  title,
  tokenKey,
}: {
  title: string;
  tokenKey: keyof typeof designTokens.colors;
}) => {
  const colorData={designTokens.colors}[tokenKey] as Record<string, string>;
  const shades = ['50', '100', '200', '300', '400', '500', '600', '700', '800', '900'];
  const semanticKeys = ['main', 'light', 'dark', 'contrastText'].filter(
    (k) => colorData[k] !== undefined
  );

  return (
    <Box sx={{ mb: 3 }}>
      <Typography
        variant='h6'
        sx={{ mb: 1, textTransform: 'capitalize' }}
      >
        {title}
      </Typography>
      <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(10, 1fr)', gap: 1 }}>
        {shades.map(
          (shade) =>
            colorData[shade] && (
              <ColorSwatch
                key={shade}
                name={`${tokenKey}.${shade}`}
                hex={colorData[shade]}
              />
            )
        )}
      </Box>
      {semanticKeys.length > 0 && (
        <Box
          sx={{
            mt: 1,
            display: 'grid',
            gridTemplateColumns: `repeat(${semanticKeys.length}, 1fr)`,
            gap: 1,
          }}
        >
          {semanticKeys.map((key) => (
            <ColorSwatch
              key={key}
              name={`${tokenKey}.${key}`}
              hex={colorData[key]}
            />
          ))}
        </Box>
      )}
    </Box>
  );
};

// ============================================================
// 颜色 Story
// ============================================================
const ColorsComponent = () => (
  <Box sx={{ maxWidth: 1200 }}>
    <Typography
      variant='h4'
      sx={{ mb: 1 }}
    >
      色彩系统
    </Typography>
    <Typography
      variant='body2'
      color='text.secondary'
      sx={{ mb: 3 }}
    >
      点击色块复制色值。所有颜色源自 <code>@topems/tokens</code>。
    </Typography>

    <ColorFamilyGrid
      title='Primary 主色'
      tokenKey='primary'
    />
    <ColorFamilyGrid
      title='Secondary 辅助色'
      tokenKey='secondary'
    />
    <ColorFamilyGrid
      title='Success 成功色'
      tokenKey='success'
    />
    <ColorFamilyGrid
      title='Warning 警告色'
      tokenKey='warning'
    />
    <ColorFamilyGrid
      title='Error 错误色'
      tokenKey='error'
    />
    <ColorFamilyGrid
      title='Info 信息色'
      tokenKey='info'
    />

    {/* 灰色 — 含 950 */}
    <Box sx={{ mb: 3 }}>
      <Typography
        variant='h6'
        sx={{ mb: 1 }}
      >
        Grey 灰色
      </Typography>
      <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(11, 1fr)', gap: 1 }}>
        {['50', '100', '200', '300', '400', '500', '600', '700', '800', '900', '950'].map(
          (shade) =>
            designTokens.colors.grey[shade as keyof typeof designTokens.colors.grey] && (
              <ColorSwatch
                key={shade}
                name={`grey.${shade}`}
                hex={designTokens.colors.grey[shade as keyof typeof designTokens.colors.grey]}
              />
            )
        )}
      </Box>
    </Box>

    <Divider sx={{ my: 3 }} />

    {/* 功能色 */}
    <Typography
      variant='h5'
      sx={{ mb: 2 }}
    >
      功能色
    </Typography>
    {(['text', 'border', 'background', 'action', 'surface'] as const).map((groupKey) => {
      const data={designTokens.colors}[groupKey] as Record<string, string>;
      const entries = Object.entries(data).filter(([, v]) => typeof v === 'string');
      return (
        <Box
          key={groupKey}
          sx={{ mb: 3 }}
        >
          <Typography
            variant='subtitle2'
            sx={{ mb: 1, textTransform: 'capitalize' }}
          >
            {groupKey}
          </Typography>
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
            {entries.map(([name, hex]) => (
              <Box
                key={name}
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 1,
                  border: '1px solid',
                  borderColor: 'divider',
                  borderRadius: '8px',
                  p: 1,
                }}
              >
                <Box
                  sx={{
                    width: 20,
                    height: 20,
                    borderRadius: '4px',
                    backgroundColor: hex,
                    border: hex === '#ffffff' || hex === '#f8fafc' ? '1px solid #e2e8f0' : 'none',
                  }}
                />
                <Box>
                  <Typography
                    variant='caption'
                    fontWeight='bold'
                  >
                    {name}
                  </Typography>
                  <Typography
                    variant='caption'
                    sx={{ fontFamily: 'monospace', color: 'text.secondary', display: 'block' }}
                  >
                    {hex}
                  </Typography>
                </Box>
              </Box>
            ))}
          </Box>
        </Box>
      );
    })}
  </Box>
);

// ============================================================
// 排版 Story
// ============================================================
const TypographyComponent = () => {
  const headingVariants = ['h1', 'h2', 'h3', 'h4', 'h5', 'h6'] as const;
  const bodyVariants = ['body1', 'body2', 'caption', 'button', 'overline'] as const;

  return (
    <Box sx={{ maxWidth: 900 }}>
      <Typography
        variant='h4'
        sx={{ mb: 1 }}
      >
        排版系统
      </Typography>
      <Typography
        variant='body2'
        color='text.secondary'
        sx={{ mb: 3 }}
      >
        字体族：<code>{designTokens.typography.fontFamily}</code>
      </Typography>

      <Typography
        variant='h5'
        sx={{ mb: 2 }}
      >
        标题层级
      </Typography>
      {headingVariants.map((variant) => {
        const token={designTokens.typography}[variant];
        return (
          <Paper
            key={variant}
            sx={{ p: 2, mb: 1.5, display: 'flex', alignItems: 'center', gap: 2, flexWrap: 'wrap' }}
          >
            <Box sx={{ flex: '1 1 200px' }}>
              <Typography variant={variant}>
                {variant === 'h1'
                  ? '页面主标题'
                  : variant === 'h2'
                    ? '区域标题'
                    : variant === 'h3'
                      ? '卡片标题'
                      : variant === 'h4'
                        ? '子区块标题'
                        : variant === 'h5'
                          ? '小节标题'
                          : '标签/分类标题'}
              </Typography>
            </Box>
            <Stack
              direction='row'
              spacing={0.5}
              flexWrap='wrap'
              useFlexGap
            >
              <Chip
                label={`${token.fontSize}`}
                size='small'
                variant='outlined'
              />
              <Chip
                label={`weight ${token.fontWeight}`}
                size='small'
                variant='outlined'
              />
              <Chip
                label={`lh ${token.lineHeight}`}
                size='small'
                variant='outlined'
              />
              {token.letterSpacing && (
                <Chip
                  label={`ls ${token.letterSpacing}`}
                  size='small'
                  variant='outlined'
                />
              )}
            </Stack>
          </Paper>
        );
      })}

      <Divider sx={{ my: 3 }} />

      <Typography
        variant='h5'
        sx={{ mb: 2 }}
      >
        正文样式
      </Typography>
      {bodyVariants.map((variant) => {
        const token={designTokens.typography}[variant];
        const samples: Record<string, string> = {
          body1: '默认正文 — 用于页面主要内容的文本展示。',
          body2: '次要正文 — 用于表格、列表项和辅助说明。',
          caption: '辅助说明 — 用于标签、时间戳和脚注。',
          button: '按钮文本 — 用于各类按钮和操作项。',
          overline: '大号标签 — 用于分类标记。',
        };
        return (
          <Paper
            key={variant}
            sx={{
              p: 2,
              mb: 1.5,
              display: 'flex',
              alignItems: 'flex-start',
              gap: 2,
              flexWrap: 'wrap',
            }}
          >
            <Box sx={{ flex: '1 1 200px' }}>
              <Typography
                variant='caption'
                color='text.secondary'
                sx={{ display: 'block', mb: 0.5, fontWeight: 600 }}
              >
                {variant}
              </Typography>
              <Typography variant={variant}>{samples[variant]}</Typography>
            </Box>
            <Stack
              direction='row'
              spacing={0.5}
              flexWrap='wrap'
              useFlexGap
            >
              <Chip
                label={`${token.fontSize}`}
                size='small'
                variant='outlined'
              />
              <Chip
                label={`weight ${token.fontWeight}`}
                size='small'
                variant='outlined'
              />
              <Chip
                label={`lh ${token.lineHeight}`}
                size='small'
                variant='outlined'
              />
              {token.letterSpacing && (
                <Chip
                  label={`ls ${token.letterSpacing}`}
                  size='small'
                  variant='outlined'
                />
              )}
            </Stack>
          </Paper>
        );
      })}

      <Divider sx={{ my: 3 }} />

      <Typography
        variant='h5'
        sx={{ mb: 2 }}
      >
        字号梯度
      </Typography>
      <TableContainer>
        <Table size='small'>
          <TableHead>
            <TableRow>
              <TableCell>Token</TableCell>
              <TableCell>值</TableCell>
              <TableCell>等效 px</TableCell>
              <TableCell>预览</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {Object.entries(designTokens.typography.fontSize).map(([key, value]) => (
              <TableRow key={key}>
                <TableCell sx={{ fontFamily: 'monospace' }}>fontSize.{key}</TableCell>
                <TableCell sx={{ fontFamily: 'monospace' }}>{value}</TableCell>
                <TableCell>{parseFloat(value) * 16}px</TableCell>
                <TableCell>
                  <Typography sx={{ fontSize: value }}>Aa 示例</Typography>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      <Divider sx={{ my: 3 }} />

      <Typography
        variant='h5'
        sx={{ mb: 2 }}
      >
        字重梯度
      </Typography>
      <Stack spacing={1}>
        {Object.entries(designTokens.typography.fontWeight).map(([key, value]) => (
          <Box
            key={key}
            sx={{ display: 'flex', alignItems: 'center', gap: 2 }}
          >
            <Chip
              label={`fontWeight.${key}`}
              size='small'
              sx={{ minWidth: 120 }}
            />
            <Typography sx={{ fontWeight: value, fontSize: '1rem', flex: 1 }}>
              TOPEMS 设计系统 (weight: {value})
            </Typography>
          </Box>
        ))}
      </Stack>
    </Box>
  );
};

// ============================================================
// 间距 Story
// ============================================================
const SpacingComponent = () => (
  <Box sx={{ maxWidth: 800 }}>
    <Typography
      variant='h4'
      sx={{ mb: 1 }}
    >
      间距系统
    </Typography>
    <Typography
      variant='body2'
      color='text.secondary'
      sx={{ mb: 3 }}
    >
      MUI spacing 系数：1 单位 = 8px
    </Typography>

    {Object.entries(designTokens.spacing).map(([key, value]) => (
      <Box
        key={key}
        sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 1.5 }}
      >
        <Chip
          label={`spacing.${key}`}
          size='small'
          color='primary'
          sx={{ minWidth: 80 }}
        />
        <Box
          sx={{
            height: 32,
            width: `${Math.max(value as number, 8)}px`,
            maxWidth: '100%',
            backgroundColor: 'primary.main',
            borderRadius: '6px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'primary.contrastText',
            fontSize: '0.75rem',
            fontFamily: 'monospace',
            fontWeight: 600,
          }}
        >
          {value}px
        </Box>
        <Typography
          variant='caption'
          sx={{ fontFamily: 'monospace', color: 'text.secondary' }}
        >
          = {(value as number) / 8}u
        </Typography>
      </Box>
    ))}

    <Divider sx={{ my: 3 }} />

    <Typography
      variant='h5'
      sx={{ mb: 2 }}
    >
      语义化间距
    </Typography>
    <TableContainer>
      <Table size='small'>
        <TableHead>
          <TableRow>
            <TableCell>Token</TableCell>
            <TableCell>值</TableCell>
            <TableCell>说明</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {Object.entries(semanticTokens.space).flatMap(([group, entries]) =>
            Object.entries(entries as Record<string, string>).map(([key, value]) => (
              <TableRow key={`${group}.${key}`}>
                <TableCell sx={{ fontFamily: 'monospace', fontSize: '0.75rem' }}>
                  space.{group}.{key}
                </TableCell>
                <TableCell sx={{ fontFamily: 'monospace' }}>{value}</TableCell>
                <TableCell></TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </TableContainer>
  </Box>
);

// ============================================================
// 阴影 Story
// ============================================================
const ShadowsComponent = () => (
  <Box sx={{ maxWidth: 1000 }}>
    <Typography
      variant='h4'
      sx={{ mb: 1 }}
    >
      阴影系统
    </Typography>
    <Typography
      variant='body2'
      color='text.secondary'
      sx={{ mb: 3 }}
    >
      亮/暗色模式阴影对比
    </Typography>

    <Typography
      variant='h6'
      sx={{ mb: 2 }}
    >
      亮色模式
    </Typography>
    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 3, mb: 4 }}>
      {Object.entries(designTokens.shadows).map(([key, value]) => (
        <Box
          key={key}
          sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1 }}
        >
          <Box
            sx={{
              width: 80,
              height: 56,
              borderRadius: '12px',
              boxShadow: value,
              backgroundColor: '#ffffff',
              border: '1px solid #f1f5f9',
            }}
          />
          <Typography
            variant='caption'
            fontWeight='bold'
          >
            {key}
          </Typography>
        </Box>
      ))}
    </Box>

    <Typography
      variant='h6'
      sx={{ mb: 2 }}
    >
      暗色模式
    </Typography>
    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 3, mb: 4 }}>
      {Object.entries(designTokens.darkShadows).map(([key, value]) => (
        <Box
          key={key}
          sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1 }}
        >
          <Box
            sx={{
              width: 80,
              height: 56,
              borderRadius: '12px',
              boxShadow: value,
              backgroundColor: designTokens.colors.grey[800],
              border: '1px solid #374151',
            }}
          />
          <Typography
            variant='caption'
            fontWeight='bold'
          >
            {key}
          </Typography>
        </Box>
      ))}
    </Box>

    <Divider sx={{ my: 3 }} />

    <Typography
      variant='h6'
      sx={{ mb: 2 }}
    >
      语义化阴影映射
    </Typography>
    <TableContainer>
      <Table size='small'>
        <TableHead>
          <TableRow>
            <TableCell>组件层级</TableCell>
            <TableCell>语义 Token</TableCell>
            <TableCell>阴影</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {Object.entries(semanticTokens.elevation).map(([key, value]) => (
            <TableRow key={key}>
              <TableCell sx={{ textTransform: 'capitalize' }}>{key}</TableCell>
              <TableCell sx={{ fontFamily: 'monospace' }}>elevation.{key}</TableCell>
              <TableCell sx={{ fontFamily: 'monospace' }}>{value}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  </Box>
);

// ============================================================
// 圆角 Story
// ============================================================
const BorderRadiusComponent = () => (
  <Box sx={{ maxWidth: 800 }}>
    <Typography
      variant='h4'
      sx={{ mb: 1 }}
    >
      圆角系统
    </Typography>
    <Typography
      variant='body2'
      color='text.secondary'
      sx={{ mb: 3 }}
    >
      所有圆角值源自 <code>designTokens.borderRadius</code>
    </Typography>

    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 3, mb: 4 }}>
      {Object.entries(designTokens.borderRadius).map(([key, value]) => (
        <Box
          key={key}
          sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1 }}
        >
          <Box
            sx={{
              width: 72,
              height: 72,
              borderRadius: (value as number) === 9999 ? '50%' : `${value}px`,
              border: `2px solid ${designTokens.colors.primary.main}`,
              backgroundColor: designTokens.colors.primary[50],
            }}
          />
          <Typography
            variant='caption'
            fontWeight='bold'
          >
            {key}
          </Typography>
          <Typography
            variant='caption'
            sx={{ fontFamily: 'monospace', color: 'text.secondary' }}
          >
            {(value as number) === 9999 ? '9999px' : `${value}px`}
          </Typography>
        </Box>
      ))}
    </Box>

    <Divider sx={{ my: 3 }} />

    <Typography
      variant='h6'
      sx={{ mb: 2 }}
    >
      语义化圆角
    </Typography>
    <TableContainer>
      <Table size='small'>
        <TableHead>
          <TableRow>
            <TableCell>用途</TableCell>
            <TableCell>Token</TableCell>
            <TableCell>值</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {Object.entries(semanticTokens.radius).map(([key, value]) => (
            <TableRow key={key}>
              <TableCell sx={{ textTransform: 'capitalize' }}>{key}</TableCell>
              <TableCell sx={{ fontFamily: 'monospace' }}>radius.{key}</TableCell>
              <TableCell>{value}px</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  </Box>
);

// ============================================================
// Meta 与 Stories 导出
// ============================================================
const meta = {
  title: 'Design Tokens',
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component:
          'TOPEMS 设计令牌可视化。展示色彩、排版、间距、阴影、圆角等所有设计基础值，所有数据源自 `@topems/tokens`。',
      },
    },
  },
} satisfies Meta;

export default meta;

type Story = StoryObj;

export const Colors: Story = {
  name: '色彩系统',
  render: () => <ColorsComponent />,
};

export const TypographyDemo: Story = {
  name: '排版系统',
  render: () => <TypographyComponent />,
};

export const Spacing: Story = {
  name: '间距系统',
  render: () => <SpacingComponent />,
};

export const Shadows: Story = {
  name: '阴影系统',
  render: () => <ShadowsComponent />,
};

export const BorderRadius: Story = {
  name: '圆角系统',
  render: () => <BorderRadiusComponent />,
};
