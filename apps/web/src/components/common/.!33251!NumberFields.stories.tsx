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
