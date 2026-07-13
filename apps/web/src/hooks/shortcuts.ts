import React from 'react';

export interface ShortcutConfig {
  key: string;
  ctrl?: boolean;
  meta?: boolean;
  shift?: boolean;
  description: string;
}

export const SEARCH_SHORTCUTS: Record<string, ShortcutConfig> = {
  OPEN: {
    key: 'k',
    ctrl: true,
    meta: true,
    description: '打开搜索框',
  },
  CLOSE: {
    key: 'Escape',
    description: '关闭搜索框',
  },
  NAVIGATE_DOWN: {
    key: 'ArrowDown',
    description: '向下导航',
  },
  NAVIGATE_UP: {
    key: 'ArrowUp',
    description: '向上导航',
  },
  SELECT: {
    key: 'Enter',
    description: '选中结果',
  },
  GO_TO_FIRST: {
    key: 'Home',
    description: '跳转到第一个结果',
  },
  GO_TO_LAST: {
    key: 'End',
    description: '跳转到最后一个结果',
  },
  FOCUS_SEARCH: {
    key: '/',
    description: '聚焦搜索框',
  },
};

export function matchShortcut(event: React.KeyboardEvent | KeyboardEvent, config: ShortcutConfig): boolean {
  if (event.key.toLowerCase() !== config.key.toLowerCase()) {
    return false;
  }

  const hasModifiers = config.ctrl || config.meta || config.shift;
  const hasCtrlOrMeta = event.ctrlKey || event.metaKey;

  if (config.ctrl && config.meta) {
    if (!hasCtrlOrMeta) {
      return false;
    }
  } else if (config.ctrl && !event.ctrlKey) {
    return false;
  } else if (config.meta && !event.metaKey) {
    return false;
  }

  if (config.shift && !event.shiftKey) {
    return false;
  }

  if (!hasModifiers && hasCtrlOrMeta) {
    return false;
  }

  return true;
}
