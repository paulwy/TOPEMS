import { injectV51CSSVariables } from './tokens/v51-tokens';
import { themeManager } from './theme-manager';

export * from './tokens/v51-tokens';
export * from './components/index';
export * from './theme-manager';
export * from './design-lint';
export { V51DesignSystemPanel } from './DesignSystemPanel';

export function initializeDesignSystem(options?: { autoInit?: boolean }): void {
  if (options?.autoInit !== false) {
    injectV51CSSVariables();
    themeManager.init();
  }
}

export const V51 = {
  initialize: initializeDesignSystem,
  tokens: themeManager.getTheme(),
};
