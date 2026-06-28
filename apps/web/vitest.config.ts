/// <reference types="vitest" />
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@topems/shared-types': path.resolve(__dirname, '../../packages/shared-types/src'),
      '@topems/shared-utils': path.resolve(__dirname, '../../packages/shared-utils/src'),
      '@topems/shared-components': path.resolve(__dirname, '../../packages/shared-components/src'),
      '@topems/shared-hooks': path.resolve(__dirname, '../../packages/shared-hooks/src'),
      'react-transition-group': path.resolve(__dirname, '../../node_modules/react-transition-group'),
      'react-transition-group/cjs': path.resolve(__dirname, '../../node_modules/react-transition-group/cjs'),
      'react-transition-group/TransitionGroupContext': path.resolve(__dirname, '../../node_modules/react-transition-group/cjs/TransitionGroupContext.js'),
      'react-transition-group/CSSTransition': path.resolve(__dirname, '../../node_modules/react-transition-group/cjs/CSSTransition.js'),
      'react-transition-group/Transition': path.resolve(__dirname, '../../node_modules/react-transition-group/cjs/Transition.js'),
      'react-transition-group/TransitionGroup': path.resolve(__dirname, '../../node_modules/react-transition-group/cjs/TransitionGroup.js'),
    },
    mainFields: ['module', 'main'],
    dedupe: ['react', 'react-dom', 'scheduler'],
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
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html', 'json-summary', 'json'],
      include: ['src/components/**/*.{ts,tsx}', 'src/pages/**/*.{ts,tsx}'],
      exclude: [
        'src/components/**/*.stories.tsx',
        'src/components/**/__tests__/**',
        'src/components/**/index.ts',
        'src/components/**/types.ts',
        'src/**/types.ts',
        'src/**/types/**',
        'src/components/gis/modules/Map3DModule/**',
      ],
      thresholds: {
        statements: 60,
        branches: 50,
        functions: 60,
        lines: 60,
      },
    },
    resolveSnapshotPath: (testPath, snapshotExtension) => {
      return testPath.replace(/\.test\.([tj]sx?)$/, `${snapshotExtension}`);
    },
  },
});
