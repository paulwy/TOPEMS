import type { StorybookConfig } from '@storybook/react-vite';

const config: StorybookConfig = {
  // 扫描 src 下全部故事文件（现有 51 个 *.stories.tsx）
  stories: ['../src/**/*.stories.@(js|jsx|mjs|ts|tsx)'],
    // autodocs 文档页（故事文件普遍带 tags: ['autodocs']）
  addons: ['@storybook/addon-docs'],
  framework: {
    name: '@storybook/react-vite',
    options: {},
  },
};

export default config;
