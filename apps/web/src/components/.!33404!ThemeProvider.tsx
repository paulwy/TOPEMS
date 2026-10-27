'use client';

import * as React from 'react';
import { ThemeProvider as MuiThemeProvider, useColorScheme } from '@mui/material/styles';
import { CssBaseline } from '@mui/material';
import { useTranslation } from 'react-i18next';
import { useThemeStore } from '@/store';
import { createCustomTheme } from '@/theme';

/**
