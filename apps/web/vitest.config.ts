/// <reference types="vitest" />
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
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
    resolve: {
      alias: {
        'react-transition-group/TransitionGroupContext': 'react-transition-group/cjs/TransitionGroupContext.js',
      },
    },
  },
});
