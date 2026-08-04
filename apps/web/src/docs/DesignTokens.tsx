import React from 'react';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Paper from '@mui/material/Paper';
import Chip from '@mui/material/Chip';
import { designTokens } from '../theme/tokens';
import { gradients } from '../theme/gradients';

{
  /* DesignTokens.tsx — Reusable helper components for Design System Storybook docs */
}

// ─── Color Swatch ────────────────────────────────────────────────────────────

interface ColorSwatchProps {
  color: string;
  label: string;
  darkText?: boolean;
}

export function ColorSwatch({ color, label, darkText = false }: ColorSwatchProps) {
  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 0.5,
      }}
    >
      <Box
        sx={{
          width: 64,
          height: 64,
          borderRadius: 3,
          backgroundColor: color,
          border: '1px solid',
          borderColor: 'divider',
        }}
      />
      <Typography
        variant='caption'
        sx={{ fontWeight: 500, color: darkText ? '#fff' : 'text.primary' }}
      >
        {label}
      </Typography>
      <Typography
        variant='caption'
        sx={{
          color: darkText ? 'rgba(255,255,255,0.7)' : 'text.secondary',
          fontFamily: 'monospace',
          fontSize: '0.65rem',
        }}
      >
        {color}
      </Typography>
    </Box>
  );
}

// ─── Color Scale ─────────────────────────────────────────────────────────────

type ColorScaleValue = string;

interface ColorScaleProps {
  name: string;
  colors: Record<string, ColorScaleValue>;
  skipKeys?: string[];
}

export function ColorScale({ name, colors, skipKeys = [] }: ColorScaleProps) {
  const entries = Object.entries(colors).filter(([key]) => !skipKeys.includes(key));
  return (
    <Box sx={{ mb: 4 }}>
      <Typography
        variant='h6'
        sx={{ mb: 2 }}
      >
        {name}
      </Typography>
      <Box
        sx={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: 2,
        }}
      >
        {entries.map(([key, value]) => (
          <ColorSwatch
            key={key}
            color={value}
            label={key}
          />
        ))}
      </Box>
    </Box>
  );
}

// ─── Status Colors ────────────────────────────────────────────────────────────

interface StatusColorGroupProps {
  name: string;
  colors: {
    main: string;
    light: string;
    dark: string;
  };
}

export function StatusColorGroup({ name, colors }: StatusColorGroupProps) {
  return (
    <Box sx={{ display: 'flex', gap: 1.5, alignItems: 'flex-end', mb: 3 }}>
      <Box
        sx={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 0.5,
          width: 56,
        }}
      >
        <Box
          sx={{
            width: 48,
            height: 48,
            borderRadius: 3,
            backgroundColor: colors.light,
            border: '1px solid',
            borderColor: 'divider',
          }}
        />
        <Typography
          variant='caption'
          sx={{ fontFamily: 'monospace', fontSize: '0.6rem' }}
        >
          light
        </Typography>
        <Typography
          variant='caption'
          sx={{ fontFamily: 'monospace', fontSize: '0.6rem', color: 'text.secondary' }}
        >
          {colors.light}
        </Typography>
      </Box>
      <Box
        sx={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 0.5,
          width: 56,
        }}
      >
        <Box
          sx={{
            width: 56,
            height: 56,
            borderRadius: 3,
            backgroundColor: colors.main,
          }}
        />
        <Typography
          variant='caption'
          sx={{ fontFamily: 'monospace', fontSize: '0.6rem' }}
        >
          main
        </Typography>
        <Typography
          variant='caption'
          sx={{ fontFamily: 'monospace', fontSize: '0.6rem', color: 'text.secondary' }}
        >
          {colors.main}
        </Typography>
      </Box>
      <Box
        sx={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 0.5,
          width: 56,
        }}
      >
        <Box
          sx={{
            width: 48,
            height: 48,
            borderRadius: 3,
            backgroundColor: colors.dark,
            border: '1px solid',
            borderColor: 'divider',
          }}
        />
        <Typography
          variant='caption'
          sx={{ fontFamily: 'monospace', fontSize: '0.6rem' }}
        >
          dark
        </Typography>
        <Typography
          variant='caption'
          sx={{ fontFamily: 'monospace', fontSize: '0.6rem', color: 'text.secondary' }}
        >
          {colors.dark}
        </Typography>
      </Box>
      <Box sx={{ ml: 1, pb: 1 }}>
        <Typography variant='subtitle2'>{name}</Typography>
      </Box>
    </Box>
  );
}

// ─── Spacing Demo ─────────────────────────────────────────────────────────────

export function SpacingDemo() {
  const spacingEntries = Object.entries(designTokens.spacing);
  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
      {spacingEntries.map(([key, value]) => (
        <Box
          key={key}
          sx={{ display: 'flex', alignItems: 'center', gap: 2 }}
        >
          <Typography
            variant='caption'
            sx={{ width: 48, fontFamily: 'monospace', fontWeight: 500, flexShrink: 0 }}
          >
            {key}
          </Typography>
          <Typography
            variant='caption'
            sx={{ width: 36, fontFamily: 'monospace', color: 'text.secondary', flexShrink: 0 }}
          >
            {value as number}px
          </Typography>
          <Box
            sx={{
              width: value as number,
              height: 24,
              backgroundColor: 'primary.main',
              borderRadius: 1,
              minWidth: (value as number) > 0 ? 4 : 0,
              opacity: 0.8,
            }}
          />
        </Box>
      ))}
    </Box>
  );
}

// ─── Radius Demo ──────────────────────────────────────────────────────────────

export function RadiusDemo() {
  const radiusEntries = Object.entries(designTokens.borderRadius);
  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
      {radiusEntries.map(([key, value]) => (
        <Box
          key={key}
          sx={{ display: 'flex', alignItems: 'center', gap: 2 }}
        >
          <Typography
            variant='caption'
            sx={{ width: 48, fontFamily: 'monospace', fontWeight: 500, flexShrink: 0 }}
          >
            {key}
          </Typography>
          <Typography
            variant='caption'
            sx={{ width: 48, fontFamily: 'monospace', color: 'text.secondary', flexShrink: 0 }}
          >
            {(value as number) >= 9999 ? 'full' : `${value}px`}
          </Typography>
          <Box
            sx={{
              width: 56,
              height: 56,
              backgroundColor: 'primary.light',
              borderRadius: value as number,
              border: '2px solid',
              borderColor: 'primary.main',
              flexShrink: 0,
            }}
          />
        </Box>
      ))}
    </Box>
  );
}

// ─── Shadow Demo ──────────────────────────────────────────────────────────────

export function ShadowDemo() {
  const shadowEntries = Object.entries(designTokens.shadows);
  return (
    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 3 }}>
      {shadowEntries.map(([key, value]) => (
        <Box
          key={key}
          sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1 }}
        >
          <Paper
            elevation={0}
            sx={{
              width: 100,
              height: 80,
              borderRadius: 3,
              boxShadow: value as string,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: 'background.paper',
              border: '1px solid',
              borderColor: 'divider',
            }}
          >
            <Typography
              variant='caption'
              sx={{ color: 'text.secondary' }}
            >
              {key}
            </Typography>
          </Paper>
          <Typography
            variant='caption'
            sx={{ fontFamily: 'monospace', fontSize: '0.65rem', color: 'text.secondary' }}
          >
            {value as string}
          </Typography>
        </Box>
      ))}
    </Box>
  );
}

// ─── Typography Showcase ───────────────────────────────────────────────────────

export function TypographyShowcase() {
  const variants: Array<{ variant: string; label: string; props: Record<string, unknown> }> = [
    { variant: 'h1', label: 'Heading 1', props: designTokens.typography.h1 },
    { variant: 'h2', label: 'Heading 2', props: designTokens.typography.h2 },
    { variant: 'h3', label: 'Heading 3', props: designTokens.typography.h3 },
    { variant: 'h4', label: 'Heading 4', props: designTokens.typography.h4 },
    { variant: 'h5', label: 'Heading 5', props: designTokens.typography.h5 },
    { variant: 'h6', label: 'Heading 6', props: designTokens.typography.h6 },
    { variant: 'body1', label: 'Body 1', props: designTokens.typography.body1 },
    { variant: 'body2', label: 'Body 2', props: designTokens.typography.body2 },
    { variant: 'caption', label: 'Caption', props: designTokens.typography.caption },
    { variant: 'button', label: 'Button', props: designTokens.typography.button },
    { variant: 'overline', label: 'Overline', props: designTokens.typography.overline },
  ];

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
      {variants.map(({ variant, label, props }) => (
        <Box
          key={variant}
          sx={{
            display: 'flex',
            alignItems: 'baseline',
            gap: 3,
            pb: 1,
            borderBottom: '1px solid',
            borderColor: 'divider',
          }}
        >
          <Typography
            variant='caption'
            sx={{
              width: 80,
              flexShrink: 0,
              fontFamily: 'monospace',
              fontWeight: 600,
              color: 'primary.main',
            }}
          >
            {variant}
          </Typography>
          <Box sx={{ flex: 1 }}>
            <Typography
              variant={variant as unknown as React.ComponentProps<typeof Typography>['variant']}
              sx={{
                ...(props as unknown as Record<string, unknown>),
                textTransform:
                  ((props as unknown as Record<string, unknown>).textTransform as
                    string | undefined) ?? undefined,
              }}
            >
              {label} — The quick brown fox jumps over the lazy dog
            </Typography>
          </Box>
          <Box sx={{ flexShrink: 0, display: 'flex', gap: 1 }}>
            <Chip
              label={`${(props as unknown as Record<string, unknown>).fontSize}`}
              size='small'
              variant='outlined'
              sx={{ fontFamily: 'monospace', fontSize: '0.65rem' }}
            />
            <Chip
              label={`w${(props as unknown as Record<string, unknown>).fontWeight}`}
              size='small'
              variant='outlined'
              sx={{ fontFamily: 'monospace', fontSize: '0.65rem' }}
            />
            <Chip
              label={`lh${(props as unknown as Record<string, unknown>).lineHeight}`}
              size='small'
              variant='outlined'
              sx={{ fontFamily: 'monospace', fontSize: '0.65rem' }}
            />
          </Box>
        </Box>
      ))}
    </Box>
  );
}

// ─── Surface Hierarchy ───────────────────────────────────────────────────────

export function SurfaceHierarchy() {
  const surfaces = [
    {
      name: 'Background Default',
      color: designTokens.colors.background.default,
      token: 'background.default',
    },
    {
      name: 'Background Paper',
      color: designTokens.colors.background.paper,
      token: 'background.paper',
    },
    { name: 'Surface 50', color: designTokens.colors.surface[50], token: 'surface.50' },
    { name: 'Surface 100', color: designTokens.colors.surface[100], token: 'surface.100' },
    { name: 'Surface 200', color: designTokens.colors.surface[200], token: 'surface.200' },
    { name: 'Border Default', color: designTokens.colors.border.default, token: 'border.default' },
    { name: 'Border Light', color: designTokens.colors.border.light, token: 'border.light' },
    { name: 'Border Dark', color: designTokens.colors.border.dark, token: 'border.dark' },
    { name: 'Text Primary', color: designTokens.colors.text.primary, token: 'text.primary' },
    { name: 'Text Secondary', color: designTokens.colors.text.secondary, token: 'text.secondary' },
    { name: 'Text Muted', color: designTokens.colors.text.muted, token: 'text.muted' },
    { name: 'Text Disabled', color: designTokens.colors.text.disabled, token: 'text.disabled' },
  ];

  return (
    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2 }}>
      {surfaces.map((s) => (
        <Box
          key={s.token}
          sx={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: 0.5,
            width: 80,
          }}
        >
          <Box
            sx={{
              width: 64,
              height: 64,
              borderRadius: 3,
              backgroundColor: s.color,
              border: '1px solid',
              borderColor: 'divider',
            }}
          />
          <Typography
            variant='caption'
            sx={{ fontWeight: 500, textAlign: 'center', fontSize: '0.65rem' }}
          >
            {s.name}
          </Typography>
          <Typography
            variant='caption'
            sx={{ fontFamily: 'monospace', fontSize: '0.6rem', color: 'text.secondary' }}
          >
            {s.color}
          </Typography>
        </Box>
      ))}
    </Box>
  );
}

// ─── Module Gradients ─────────────────────────────────────────────────────────

export function ModuleGradients() {
  const modules = Object.entries(gradients.modules);
  return (
    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2 }}>
      {modules.map(([key, gradient]) => (
        <Box
          key={key}
          sx={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: 0.5,
            width: 100,
          }}
        >
          <Box
            sx={{
              width: 80,
              height: 56,
              borderRadius: 3,
              background: gradient as string,
              boxShadow: 1,
            }}
          />
          <Typography
            variant='caption'
            sx={{ fontWeight: 600, textTransform: 'uppercase', fontSize: '0.7rem' }}
          >
            {key}
          </Typography>
          <Typography
            variant='caption'
            sx={{
              fontFamily: 'monospace',
              fontSize: '0.55rem',
              color: 'text.secondary',
              textAlign: 'center',
              lineHeight: 1.2,
            }}
          >
            {gradient as string}
          </Typography>
        </Box>
      ))}
    </Box>
  );
}

// ─── Token Table ──────────────────────────────────────────────────────────────

interface TokenRowProps {
  name: string;
  value: string | number;
  type?: string;
}

export function TokenTable({ tokens }: { tokens: TokenRowProps[] }) {
  return (
    <Box
      component='table'
      sx={{
        width: '100%',
        borderCollapse: 'collapse',
        '& th, & td': {
          border: '1px solid',
          borderColor: 'divider',
          px: 2,
          py: 1,
          textAlign: 'left',
        },
        '& th': {
          backgroundColor: 'grey.50',
          fontWeight: 600,
          fontSize: '0.75rem',
          textTransform: 'uppercase',
          letterSpacing: '0.05em',
          color: 'text.secondary',
        },
        '& td': {
          fontSize: '0.875rem',
        },
        '& td:nth-of-type(2)': {
          fontFamily: 'monospace',
          fontSize: '0.8rem',
          color: 'primary.dark',
        },
      }}
    >
      <thead>
        <tr>
          <th>Token</th>
          <th>Value</th>
          {tokens[0]?.type && <th>Type</th>}
        </tr>
      </thead>
      <tbody>
        {tokens.map((t) => (
          <tr key={t.name}>
            <td>{t.name}</td>
            <td>{String(t.value)}</td>
            {t.type && <td>{t.type}</td>}
          </tr>
        ))}
      </tbody>
    </Box>
  );
}

// ─── Dark Mode Token Comparison ───────────────────────────────────────────────

export function DarkShadowComparison() {
  const lightEntries = Object.entries(designTokens.shadows).slice(1); // skip 'none'
  const darkEntries = Object.entries(designTokens.darkShadows).slice(1);

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
      <Box sx={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
        <Box sx={{ flex: 1, minWidth: 280 }}>
          <Typography
            variant='subtitle2'
            sx={{ mb: 2, textAlign: 'center' }}
          >
            Light Mode
          </Typography>
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2, justifyContent: 'center' }}>
            {lightEntries.map(([key, value]) => (
              <Box
                key={key}
                sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 0.5 }}
              >
                <Box
                  sx={{
                    width: 80,
                    height: 60,
                    borderRadius: 3,
                    boxShadow: value as string,
                    backgroundColor: 'primary.contrastText',
                    border: '1px solid',
                    borderColor: 'grey.200',
                  }}
                />
                <Typography
                  variant='caption'
                  sx={{ fontSize: '0.65rem', fontFamily: 'monospace' }}
                >
                  {key}
                </Typography>
              </Box>
            ))}
          </Box>
        </Box>
        <Box sx={{ flex: 1, minWidth: 280 }}>
          <Typography
            variant='subtitle2'
            sx={{ mb: 2, textAlign: 'center' }}
          >
            Dark Mode
          </Typography>
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2, justifyContent: 'center' }}>
            {darkEntries.map(([key, value]) => (
              <Box
                key={key}
                sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 0.5 }}
              >
                <Box
                  sx={{
                    width: 80,
                    height: 60,
                    borderRadius: 3,
                    boxShadow: value as string,
                    backgroundColor: 'grey.800',
                    border: '1px solid',
                    borderColor: 'grey.700',
                  }}
                />
                <Typography
                  variant='caption'
                  sx={{ fontSize: '0.65rem', fontFamily: 'monospace' }}
                >
                  {key}
                </Typography>
              </Box>
            ))}
          </Box>
        </Box>
      </Box>
    </Box>
  );
}
