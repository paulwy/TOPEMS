// Storybook 专用主题配置
// Re-export the main theme for Storybook preview decorator
import { createCustomTheme } from './theme';

export { createCustomTheme } from './theme';

// Create a light theme instance for Storybook (default)
export const theme = createCustomTheme('light');

// Create a dark theme instance for Storybook dark mode stories
export const darkTheme = createCustomTheme('dark');
