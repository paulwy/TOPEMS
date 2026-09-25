import type { StorybookConfig } from '@storybook/react-vite';

const config: StorybookConfig = {
  // 扫描 src 下全部故事文件（现有 51 个 *.stories.tsx）
  stories: ['../src/**/*.stories.@(js|jsx|mjs|ts|tsx)'],
  // 最小配置：不启用额外 addon（已清理未配置的 addon-a11y/docs/mcp/vitest）
  addons: [],
  framework: {
    name: '@storybook/react-vite',
    options: {},
  },
};

export default config;
