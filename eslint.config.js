import js from '@eslint/js';
import ts from 'typescript-eslint';
import jsxA11y from 'eslint-plugin-jsx-a11y';
import reactHooks from 'eslint-plugin-react-hooks';
import reactRefresh from 'eslint-plugin-react-refresh';
import prettier from 'eslint-plugin-prettier';
import prettierConfig from 'eslint-config-prettier';
import globals from 'globals';

export default ts.config(
  {
    ignores: [
      '**/dist/**',
      '**/node_modules/**',
      '.trae-cn/**',
      '.uploads/**',
      '**/*.cjs',
      '**/*.js',
      '**/generated/**',
      '**/setupTests.ts',
      '**/playwright.config.*.ts',
      'apps/web/src/api/ai/generated/**',
      'apps/web/src/components/bff/**',
      'apps/web/src/components/ai/knowledge-graph/**',
      'apps/web/src/components/ai/multi-agent/**',
      'apps/web/src/components/ai/rag/**',
      'apps/web/src/design-system/**',
      'apps/web/src/hooks/bff/**',
      'apps/web/src/modules/_archive/**',
      'apps/web/src/api/erp/index.ts',
    ],
  },
  js.configs.recommended,
  ...ts.configs.recommended,
  {
    files: ['**/*.{ts,tsx}'],
    languageOptions: {
      parserOptions: {
        projectService: false,
        project: false,
      },
    },
  },
  {
    files: ['**/*.test.{ts,tsx}', '**/*.spec.{ts,tsx}'],
    languageOptions: {
      globals: {
        ...globals.vitest,
        ...globals.jest,
      },
    },
  },
  {
    // Node ESM 测试文件（node --test，如 packages/*/tests/*.test.mjs）
    files: ['**/*.test.mjs', '**/*.spec.mjs'],
    languageOptions: {
      globals: {
        ...globals.node,
      },
    },
  },
  {
    files: ['**/*.{ts,tsx}'],
    plugins: {
      'react-hooks': reactHooks,
      'react-refresh': reactRefresh,
      prettier,
    },
    settings: {
      react: { version: 'detect' },
    },
    rules: {
      ...reactHooks.configs.recommended.rules,
      'react-hooks/set-state-in-effect': 'off',
      'react-refresh/only-export-components': ['warn', { allowConstantExport: true }],
      '@typescript-eslint/no-unused-vars': ['warn', { argsIgnorePattern: '^_' }],
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/no-empty-object-type': 'off',
    },
  },
  {
    files: ['**/*.{ts,tsx}'],
    plugins: {
      'jsx-a11y': jsxA11y,
    },
    rules: {
      // Enable recommended rules with some relaxed settings
      'jsx-a11y/anchor-is-valid': 'warn',
      'jsx-a11y/alt-text': 'warn',
      'jsx-a11y/aria-props': 'warn',
      'jsx-a11y/heading-has-content': 'off', // Too noisy for dashboard pages
      'jsx-a11y/img-redundant-alt': 'warn',
      'jsx-a11y/no-onchange': 'off', // MUI Select uses onchange
      'jsx-a11y/click-events-have-key-events': 'warn',
      'jsx-a11y/no-static-element-interactions': 'warn',
    },
  },
  prettierConfig,
);
