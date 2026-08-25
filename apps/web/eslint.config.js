import storybook from 'eslint-plugin-storybook';
import globals from 'globals';
import tsParser from '@typescript-eslint/parser';
import tsPlugin from '@typescript-eslint/eslint-plugin';
import prettierPlugin from 'eslint-plugin-prettier';
import reactPlugin from 'eslint-plugin-react';
import reactHooksPlugin from 'eslint-plugin-react-hooks';
import importPlugin from 'eslint-plugin-import';
import checkFile from 'eslint-plugin-check-file';
import jsxA11y from 'eslint-plugin-jsx-a11y';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import { createRequire } from 'module';

const __dirname = dirname(fileURLToPath(import.meta.url));
const require = createRequire(import.meta.url);

const topemsDesignPlugin = require('./scripts/eslint-plugin-topems-design.cjs');

export default [
  {
    ignores: [
      'setupTests.ts',
      'playwright.config.*.ts',
      'src/schemas/admin/tenantInvoice.tsx',
    ],
  },
  {
    files: ['**/*.{ts,tsx}'],
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
        project: join(__dirname, './tsconfig.json'),
      },
    },
    plugins: {
      '@typescript-eslint': tsPlugin,
      prettier: prettierPlugin,
      react: reactPlugin,
      'react-hooks': reactHooksPlugin,
      import: importPlugin,
      'check-file': checkFile,
      'jsx-a11y': jsxA11y,
      'topems-design': topemsDesignPlugin,
    },
    settings: {
      react: {
        version: 'detect',
      },
      'import/resolver': {
        typescript: {
          project: join(__dirname, './tsconfig.json'),
        },
      },
    },
    rules: {
      // jsx-a11y rules — WCAG AA compliance
      'jsx-a11y/anchor-is-valid': 'warn',
      'jsx-a11y/alt-text': 'warn',
      'jsx-a11y/aria-props': 'warn',
      'jsx-a11y/aria-proptypes': 'warn',
      'jsx-a11y/aria-unsupported-elements': 'warn',
      'jsx-a11y/heading-has-content': 'warn',
      'jsx-a11y/html-has-lang': 'warn',
      'jsx-a11y/img-redundant-alt': 'warn',
      'jsx-a11y/label-has-associated-control': 'warn',
      'jsx-a11y/no-access-key': 'error',
      'jsx-a11y/no-autofocus': 'off', // MUI Dialog uses autoFocus
      'jsx-a11y/no-distracting-elements': 'warn',
      'jsx-a11y/no-interactive-element-to-noninteractive-role': 'error',
      'jsx-a11y/no-noninteractive-element-interactions': ['warn', {
        handlers: ['onClick', 'onMouseDown', 'onMouseUp', 'onKeyPress', 'onKeyDown', 'onKeyUp'],
      }],
      'jsx-a11y/no-noninteractive-tabindex': ['warn', { tags: [] }],
      'jsx-a11y/no-redundant-roles': 'warn',
      'jsx-a11y/no-static-element-interactions': ['warn', {
        handlers: ['onClick', 'onMouseDown', 'onMouseUp', 'onKeyPress', 'onKeyDown', 'onKeyUp'],
      }],
      'jsx-a11y/role-has-required-aria-props': 'warn',
      'jsx-a11y/role-supports-aria-props': 'warn',
      'jsx-a11y/tabindex-no-positive': 'warn',
      'jsx-a11y/click-events-have-key-events': ['warn', { allowList: ['link', 'button', 'listbox', 'option', 'tab', 'tabpanel'] }],

      'prettier/prettier': 'error',
      'react-hooks/rules-of-hooks': 'error',
      'react-hooks/exhaustive-deps': 'warn',

      '@typescript-eslint/explicit-module-boundary-types': 'off',
      '@typescript-eslint/no-empty-function': 'off',
      '@typescript-eslint/no-namespace': 'off',
      '@typescript-eslint/consistent-type-imports': 'warn',
      '@typescript-eslint/no-misused-promises': 'off',
      '@typescript-eslint/restrict-template-expressions': 'off',
      '@typescript-eslint/no-unused-vars': ['warn', {
        argsIgnorePattern: '^_',
        varsIgnorePattern: '^_',
        caughtErrorsIgnorePattern: '^_',
        destructuredArrayIgnorePattern: '^_',
      }],
      '@typescript-eslint/no-explicit-any': 'warn',
      '@typescript-eslint/naming-convention': [
        'warn',
        {
          selector: 'variable',
          format: ['camelCase', 'UPPER_CASE', 'PascalCase'],
          leadingUnderscore: 'allow',
        },
        {
          selector: 'variable',
          types: ['function'],
          format: ['camelCase', 'PascalCase'],
          leadingUnderscore: 'allow',
        },
        {
          selector: 'function',
          format: ['camelCase', 'PascalCase'],
          leadingUnderscore: 'allow',
        },
        {
          selector: 'parameter',
          format: ['camelCase', 'snake_case', 'PascalCase'],
          leadingUnderscore: 'allow',
        },
        {
          selector: 'typeLike',
          format: ['PascalCase'],
        },
        {
          selector: 'interface',
          format: ['PascalCase'],
          leadingUnderscore: 'allow',
          custom: {
            regex: '^I[A-Z]',
            match: false,
          },
        },
        {
          selector: 'typeAlias',
          format: ['PascalCase'],
          leadingUnderscore: 'allow',
        },
        {
          selector: 'typeParameter',
          format: ['PascalCase'],
          leadingUnderscore: 'allow',
        },
        {
          selector: 'enum',
          format: ['PascalCase'],
        },
        {
          selector: 'enumMember',
          format: ['UPPER_CASE'],
        },
        {
          selector: 'class',
          format: ['PascalCase'],
        },
        {
          selector: 'method',
          format: ['camelCase'],
        },
        {
          selector: 'property',
          format: null,
        },
        {
          selector: 'objectLiteralProperty',
          format: null,
        },
        {
          selector: 'objectLiteralMethod',
          format: null,
        },
        {
          selector: 'typeProperty',
          format: ['camelCase', 'snake_case', 'UPPER_CASE'],
          leadingUnderscore: 'allow',
        },
        {
          selector: 'typeProperty',
          types: ['string', 'number'],
          format: null,
        },
        {
          selector: 'typeProperty',
          filter: '^[0-9]+$',
          format: null,
        },
      ],

      'no-console': [
        'warn',
        {
          allow: ['warn', 'error', 'info'],
        },
      ],
      'no-unused-vars': 'off',
      'prefer-const': [
        'warn',
        {
          destructuring: 'any',
          ignoreReadBeforeAssign: true,
        },
      ],
      'no-var': 'error',
      'eqeqeq': ['warn', 'smart'],
      'no-throw-literal': 'warn',
      'prefer-template': 'warn',
      'object-shorthand': 'warn',
      'array-callback-return': 'warn',

      'react/react-in-jsx-scope': 'off',
      'react/no-unescaped-entities': 'off',
      'react/prop-types': 'off',
      'react/display-name': 'off',

      'import/order': 'off',
      'import/no-unresolved': 'off',
      'import/no-duplicates': 'warn',
      'import/first': 'warn',
      'import/newline-after-import': 'warn',
      'import/no-cycle': ['warn', { maxDepth: 3 }],
      'import/no-self-import': 'warn',
      'import/no-useless-path-segments': 'warn',
      'import/no-relative-packages': 'warn',
      'import/no-relative-parent-imports': 'off',

      'check-file/filename-naming-convention': [
        'warn',
        {
          'src/components/**/*.{tsx,jsx}': 'PASCAL_CASE',
          'src/pages/**/*.{tsx,jsx}': 'PASCAL_CASE',
          'src/hooks/**/*.{ts,js}': 'CAMEL_CASE',
          'src/utils/**/*.{ts,js}': 'CAMEL_CASE',
          'src/lib/**/*.{ts,js}': 'CAMEL_CASE',
          'src/api/**/*.{ts,js}': 'CAMEL_CASE',
          'src/constants/**/*.{ts,js}': 'CAMEL_CASE',
          'src/store/**/*.{ts,js}': 'CAMEL_CASE',
          'src/services/**/*.{ts,js}': 'PASCAL_CASE',
        },
        {
          ignoreMiddleExtensions: true,
        },
      ],
      'check-file/folder-naming-convention': 'off',

      // TOPEMS Design System 规则 - 引导使用 design tokens
      'topems-design/no-hardcoded-colors': 'warn',
      'topems-design/no-hardcoded-spacing': 'warn',
    },
  },
  {
    files: ['**/*.js'],
    languageOptions: {
      globals: {
        ...globals.node,
      },
    },
    rules: {
      'no-console': 'off',
      '@typescript-eslint/naming-convention': 'off',
    },
  },
  {
    files: ['src/**/*.stories.{ts,tsx}'],
    rules: {
      'check-file/filename-naming-convention': 'off',
    },
  },
  {
    files: ['src/lib/navigation/NavigationRegistryV2.ts', 'src/pages/gis/index.tsx'],
    rules: {
      'check-file/filename-naming-convention': 'off',
    },
  },
  {
    files: ['**/index.{ts,tsx,js,jsx}'],
    rules: {
      'check-file/filename-naming-convention': 'off',
    },
  },
  {
    files: ['**/__tests__/**', '**/*.test.{ts,tsx}'],
    languageOptions: {
      parserOptions: {
        project: null,
      },
    },
    rules: {
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/naming-convention': 'off',
      '@typescript-eslint/consistent-type-imports': 'off',
      '@typescript-eslint/no-misused-promises': 'off',
      '@typescript-eslint/restrict-template-expressions': 'off',
      '@typescript-eslint/no-unused-vars': 'off',
      'check-file/filename-naming-convention': 'off',
    },
  },
  {
    ignores: [
      'node_modules/',
      'dist/',
      'build/',
      'public/',
      'temp.tsx',
      'e2e/**/*',
      'src/__tests__/**/*',
      'vite.config.ts',
      'vitest.config.ts',
      'playwright.config.ts',
      'tsconfig.json',
      'tsconfig.node.json',
      'scripts/**/*',
      '.storybook/**/*',
      'src/**/*.stories.ts',
      'src/**/*.stories.tsx',
      'src/@types/**/*',
      'src/test/**/*',
      'tests/**/*',
    ],
  },
  // ==========================================================================
  // Phase 7-4 — 硬编码值检测方案 (P2 优化)
  // ==========================================================================
  //
  // 目标: 检测 sx prop 中的硬编码颜色/间距值，引导使用 theme tokens。
  //
  // 方案说明:
  //   ESLint 的 no-restricted-syntax 使用 ESTree AST 选择器，但 JSX sx={{ }}
  //   内部的值结构较复杂，难以用简单的选择器精确匹配。
  //
  //   项目已有 eslint-plugin-topems-design (no-hardcoded-colors / no-hardcoded-spacing)
  //   插件，位于 scripts/eslint-plugin-topems-design.cjs，可覆盖大部分场景。
  //
  //   如需更精准的 sx prop 级别检测，建议:
  //   1. 扩展 eslint-plugin-topems-design，增加 sx prop AST 遍历逻辑
  //   2. 或运行独立扫描脚本:
  //      python scripts/scan-hardcoded-values.py apps/web/src/pages,apps/web/src/components
  //
  // =============================================================================

  ...storybook.configs['flat/recommended'],
];
