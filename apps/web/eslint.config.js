import storybook from 'eslint-plugin-storybook';
import globals from 'globals';
import tsParser from '@typescript-eslint/parser';
import tsPlugin from '@typescript-eslint/eslint-plugin';
import prettierPlugin from 'eslint-plugin-prettier';
import reactPlugin from 'eslint-plugin-react';
import reactHooksPlugin from 'eslint-plugin-react-hooks';
import importPlugin from 'eslint-plugin-import';
import unicorn from 'eslint-plugin-unicorn';
import checkFile from 'eslint-plugin-check-file';
import jsxA11y from 'eslint-plugin-jsx-a11y';
import topemsDesign from './scripts/eslint-plugin-topems-design.cjs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

export default [
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
      unicorn,
      'check-file': checkFile,
      'jsx-a11y': jsxA11y,
      'topems-design': topemsDesign,
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

      'topems-design/no-hardcoded-colors': 'warn',
      'topems-design/no-hardcoded-spacing': 'off',
      'prettier/prettier': 'error',
      'react-hooks/rules-of-hooks': 'error',
      'react-hooks/exhaustive-deps': 'off',

      '@typescript-eslint/explicit-module-boundary-types': 'off',
      '@typescript-eslint/no-empty-function': 'off',
      '@typescript-eslint/no-namespace': 'off',
      '@typescript-eslint/consistent-type-imports': 'warn',
      '@typescript-eslint/no-misused-promises': 'off',
      '@typescript-eslint/restrict-template-expressions': 'off',
      '@typescript-eslint/no-unused-vars': 'off',
      '@typescript-eslint/no-explicit-any': 'off',
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

      'unicorn/prefer-node-protocol': 'off',
      'unicorn/filename-case': 'off',
      'unicorn/no-abusive-eslint-disable': 'warn',
      'unicorn/custom-error-definition': 'warn',
      'unicorn/error-message': 'warn',
      'unicorn/escape-case': 'warn',
      'unicorn/no-array-for-each': 'off',
      'unicorn/no-array-callback-reference': 'off',
      'unicorn/no-for-loop': 'off',
      'unicorn/no-lonely-if': 'warn',
      'unicorn/no-null': 'off',
      'unicorn/no-unreadable-array-destructuring': 'warn',
      'unicorn/no-useless-undefined': 'warn',
      'unicorn/prefer-array-find': 'warn',
      'unicorn/prefer-array-flat-map': 'warn',
      'unicorn/prefer-array-index-of': 'warn',
      'unicorn/prefer-array-some': 'warn',
      'unicorn/prefer-date-now': 'warn',
      'unicorn/prefer-includes': 'warn',
      'unicorn/prefer-string-starts-ends-with': 'warn',
      'unicorn/prefer-ternary': 'off',
      'unicorn/prefer-type-error': 'warn',

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
          ignorePatterns: ['**/index.{ts,tsx,js,jsx}'],
        },
      ],
      'check-file/folder-naming-convention': 'off',
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
    ],
  },
  ...storybook.configs['flat/recommended'],
];
