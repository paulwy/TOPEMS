/// <reference types="vitest" />
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      // 解决 react-transition-group ES modules 问题
      'react-transition-group': path.resolve(__dirname, './node_modules/react-transition-group/cjs/index.js'),
      'react-transition-group/TransitionGroupContext': path.resolve(__dirname, './node_modules/react-transition-group/cjs/TransitionGroupContext.js'),
      // 解决 MUI ES modules 问题
      '@mui/material': path.resolve(__dirname, './node_modules/@mui/material'),
      '@mui/lab': path.resolve(__dirname, './node_modules/@mui/lab'),
    },
  },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: [
      path.resolve(__dirname, './src/__tests__/setup-env-vitest.ts'),
      path.resolve(__dirname, './src/__tests__/setup.ts'),
    ],
    include: ['src/**/__tests__/**/*.{test,spec}.{ts,tsx}'],
    css: false,
    deps: {
      optimizer: {
        web: {
          include: ['@mui/material', '@mui/lab', '@emotion/react', '@emotion/styled', 'react-transition-group'],
        },
      },
    },
  },
});
