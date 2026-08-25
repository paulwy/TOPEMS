import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import { designTokens } from '../theme/tokens';

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
        sx={{
          fontWeight: 500,
          color: darkText ? designTokens.colors.background.paper : 'text.primary',
        }}
      >
        {label}
      </Typography>
      <Typography
        variant='caption'
        sx={{
          color: darkText ? 'glass.topLight' : 'text.secondary',
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

// ─── Status Colors ────────────────────────────────────────────────────────────

// ─── Spacing Demo ─────────────────────────────────────────────────────────────

// ─── Radius Demo ──────────────────────────────────────────────────────────────

// ─── Shadow Demo ──────────────────────────────────────────────────────────────

// ─── Typography Showcase ───────────────────────────────────────────────────────

// ─── Surface Hierarchy ───────────────────────────────────────────────────────

// ─── Module Gradients ─────────────────────────────────────────────────────────

// ─── Token Table ──────────────────────────────────────────────────────────────

// ─── Dark Mode Token Comparison ───────────────────────────────────────────────
