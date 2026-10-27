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
