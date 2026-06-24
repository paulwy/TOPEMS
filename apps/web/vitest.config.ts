/// <reference types="vitest" />
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'path';
import fs from 'fs';

// Fix react-transition-group package.json to add exports field for ES module compatibility
const rtgPkgPath = path.resolve(__dirname, '../../node_modules/react-transition-group/package.json');
const rtgPkg = JSON.parse(fs.readFileSync(rtgPkgPath, 'utf-8'));

// Only patch if exports field doesn't exist
if (!rtgPkg.exports) {
  rtgPkg.exports = {
    '.': {
      import: './cjs/index.js',
      require: './cjs/index.js',
    },
    './TransitionGroupContext': {
      import: './cjs/TransitionGroupContext.js',
      require: './cjs/TransitionGroupContext.js',
    },
  };
  fs.writeFileSync(rtgPkgPath, JSON.stringify(rtgPkg, null, 2) + '\n');
}

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@topems/shared-types': path.resolve(__dirname, '../../packages/shared-types/src'),
      '@topems/shared-utils': path.resolve(__dirname, '../../packages/shared-utils/src'),
      '@topems/shared-components': path.resolve(__dirname, '../../packages/shared-components/src'),
    },
    mainFields: ['main', 'module'],
    extensions: ['.mjs', '.js', '.ts', '.jsx', '.tsx', '.json'],
  },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: [
      path.resolve(__dirname, './src/__tests__/setup-env-vitest.ts'),
      path.resolve(__dirname, './src/__tests__/setup.ts'),
    ],
    include: ['src/**/__tests__/**/*.{test,spec}.{ts,tsx}', 'src/__tests__/**/*.{test,spec}.{ts,tsx}'],
    exclude: ['src/__tests__/integration/**'],
    css: false,
    alias: [
      { find: 'react-transition-group/TransitionGroupContext', replacement: path.resolve(__dirname, '../../node_modules/react-transition-group/cjs/TransitionGroupContext.js') },
      { find: 'react-transition-group', replacement: path.resolve(__dirname, '../../node_modules/react-transition-group/cjs/index.js') },
    ],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html', 'lcov'],
      exclude: [
        '**/node_modules/**',
        '**/dist/**',
        '**/build/**',
        '**/*.config.{ts,js,mjs}',
        '**/*.stories.{ts,tsx}',
        '**/e2e/**',
        'src/main.tsx',
        'src/App.tsx',
        'src/sw.ts',
        'src/vite-env.d.ts',
        'src/**/index.ts',
        'src/store/**',
        'src/i18n/**',
        'src/theme/**',
        'src/routes/**',
      ],
      include: [
        'src/utils/**/*.ts',
        'src/lib/**/*.ts',
        'src/hooks/**/*.ts',
        'src/components/**/*.{ts,tsx}',
        'src/api/**/*.ts',
      ],
      thresholds: {
        lines: 70,
        functions: 70,
        branches: 60,
        statements: 70,
      },
    },
  },
});
