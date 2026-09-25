// Storybook 专用主题配置
// Re-export the main theme for Storybook preview decorator
import { createCustomTheme } from './theme';

export { createCustomTheme } from './theme';

// Create a single theme instance for Storybook (CSS Variables 模式下 light/dark 通过 class 切换，无需两个实例)
export const theme = createCustomTheme();

// Backward compatibility alias
