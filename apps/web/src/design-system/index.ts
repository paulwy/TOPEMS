/**
 * @deprecated V51 Design System 已被 MUI 主题 + @topems/shared-components 替代。
 * 禁止新代码使用该模块。现存内部面板（ai/* / devex / ops 等）将在后续迭代中迁移。
 * 业务组件请使用 @mui/material 或 @topems/shared-components。
 */
import { injectV51CSSVariables } from './tokens/v51-tokens';
import { themeManager } from './theme-manager';

export * from './tokens/v51-tokens';
export * from './components/index';
export * from './theme-manager';
export * from './design-lint';
export { V51DesignSystemPanel } from './DesignSystemPanel';

/** @deprecated 使用 MUI ThemeProvider 直接包裹 app root 即可，无需单独初始化。 */
export function initializeDesignSystem(options?: { autoInit?: boolean }): void {
  if (options?.autoInit !== false) {
    injectV51CSSVariables();
    themeManager.init();
  }
}

/** @deprecated 不要使用。主题请读取 useTheme()（MUI）或 @topems/tokens。 */
export const V51 = {
  initialize: initializeDesignSystem,
  tokens: themeManager.getTheme(),
};
