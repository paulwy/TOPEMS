/// <reference types="vitest" />
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'path';

const rtkPath = path.resolve(__dirname, '../../node_modules/react-transition-group');

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
    mainFields: ['main', 'module'],
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
      inline: ['@mui/material', '@emotion/react', '@emotion/styled', 'react-transition-group'],
    },
  },
});
