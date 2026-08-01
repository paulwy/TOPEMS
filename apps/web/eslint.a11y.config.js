/**
 * TOPEMS Web 独立 a11y 检查配置
 *
 * 用途：聚焦无障碍规则的 ESLint flat config，便于在 CI 或本地
 *      单独运行 a11y 审计而不被其它规则干扰。
 *
 * 运行方式：
 *   pnpm exec eslint -c eslint.a11y.config.js src/
 *   # 或在 package.json 中添加脚本：
 *   # "lint:a11y": "eslint -c eslint.a11y.config.js src/"
 *
 * 与 eslint.config.js 的关系：
 *   - eslint.config.js 仍为默认配置，已包含 a11y 规则（warn 级别）
 *   - 本文件将 a11y 规则提升为 error 级别，并仅启用 jsx-a11y 插件，
 *     适用于周期性无障碍审计与 CI gate。
 *
 * 参考：
 *   - WCAG 2.2 AA: https://www.w3.org/TR/WCAG22/
 *   - 项目指南: src/docs/a11y-guide.md
 */
import jsxA11y from 'eslint-plugin-jsx-a11y';
import tsParser from '@typescript-eslint/parser';
import globals from 'globals';

export default [
  {
    ignores: [
      'node_modules/**',
      'dist/**',
      'build/**',
      'public/**',
      '.storybook/**',
      'scripts/**',
      'vite.config.ts',
      'vitest.config.ts',
      'playwright.config.ts',
      'src/**/*.stories.ts',
      'src/**/*.stories.tsx',
      'src/@types/**',
      'src/test/**',
      'src/**/__tests__/**',
      'src/**/*.test.ts',
      'src/**/*.test.tsx',
    ],
  },
  {
    files: ['src/**/*.{ts,tsx}'],
    languageOptions: {
      globals: {
        ...globals.browser,
        ...globals.node,
      },
      parser: tsParser,
      parserOptions: {
        ecmaFeatures: { jsx: true },
        ecmaVersion: 'latest',
        sourceType: 'module',
      },
    },
    plugins: {
      'jsx-a11y': jsxA11y,
    },
    rules: {
      // =========================================================================
      // 错误级别（error）—— 严重 a11y 问题，必须修复
      // =========================================================================
      'jsx-a11y/alt-text': 'error',
      'jsx-a11y/anchor-is-valid': 'error',
      'jsx-a11y/aria-props': 'error',
      'jsx-a11y/aria-proptypes': 'error',
      'jsx-a11y/aria-unsupported-elements': 'error',
      'jsx-a11y/role-has-required-aria-props': 'error',
      'jsx-a11y/role-supports-aria-props': 'error',
      'jsx-a11y/no-access-key': 'error',
      'jsx-a11y/no-distracting-elements': 'error',
      'jsx-a11y/no-interactive-element-to-noninteractive-role': 'error',
      'jsx-a11y/tabindex-no-positive': 'error',
      'jsx-a11y/heading-has-content': 'error',
      'jsx-a11y/html-has-lang': 'error',
      'jsx-a11y/img-redundant-alt': 'error',
      'jsx-a11y/label-has-associated-control': 'error',
      'jsx-a11y/no-redundant-roles': 'error',

      // =========================================================================
      // 警告级别（warn）—— 需要根据上下文判断的 a11y 问题
      // =========================================================================
      // MUI Dialog 使用 autoFocus，因此保持 off
      'jsx-a11y/no-autofocus': 'off',
      'jsx-a11y/no-noninteractive-element-interactions': ['warn', {
        handlers: ['onClick', 'onMouseDown', 'onMouseUp', 'onKeyPress', 'onKeyDown', 'onKeyUp'],
      }],
      'jsx-a11y/no-noninteractive-tabindex': ['warn', { tags: [] }],
      'jsx-a11y/no-static-element-interactions': ['warn', {
        handlers: ['onClick', 'onMouseDown', 'onMouseUp', 'onKeyPress', 'onKeyDown', 'onKeyUp'],
      }],
      'jsx-a11y/click-events-have-key-events': ['warn', {
        allowList: ['link', 'button', 'listbox', 'option', 'tab', 'tabpanel'],
      }],
    },
  },
];
