import globals from 'globals';
import pluginJs from '@eslint/js';
import tsParser from '@typescript-eslint/parser';
import tsPlugin from '@typescript-eslint/eslint-plugin';
import prettierPlugin from 'eslint-plugin-prettier';
import eslintConfigPrettier from 'eslint-config-prettier';

export default [
  {
    languageOptions: {
      globals: {
        ...globals.browser,
        ...globals.node,
        ...globals.jest,
        ServiceWorkerGlobalScope: 'readonly',
        NodeJS: 'readonly',
      },
      parser: tsParser,
      parserOptions: {
        ecmaFeatures: { jsx: true },
        ecmaVersion: 'latest',
        sourceType: 'module',
        project: './tsconfig.json',
      },
    },
  },
  pluginJs.configs.recommended,
  tsPlugin.configs.recommended,
  {
    plugins: { '@typescript-eslint': tsPlugin },
    rules: {
      '@typescript-eslint/no-unused-vars': 'off',
      '@typescript-eslint/explicit-module-boundary-types': 'off',
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/no-empty-function': 'off',
      '@typescript-eslint/no-namespace': 'off',
    },
  },
  eslintConfigPrettier,
  {
    plugins: {
      prettier: prettierPlugin,
    },
    rules: {
      'prettier/prettier': 'error',
      'no-console': 'off',
    },
  },
  {
    ignores: [
      'node_modules/',
      'dist/',
      'build/',
      'public/',
      '*.config.ts',
      '*.config.js',
      '*.config.cjs',
      'temp.tsx',
      'e2e/**/*',
      'src/__tests__/**/*',
    ],
  },
];
