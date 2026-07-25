import type React from 'react';
import { useEffect, useCallback, useState } from 'react';

export interface ShortcutConfig {
  key: string;
  ctrl?: boolean;
  meta?: boolean;
  shift?: boolean;
  description: string;
  category: string;
}

export const GLOBAL_SHORTCUTS: Record<string, ShortcutConfig> = {
  OPEN_SEARCH: {
    key: 'k',
    ctrl: true,
    meta: true,
    description: '打开全局搜索',
    category: '搜索',
  },
  FOCUS_SEARCH: {
    key: '/',
    description: '聚焦搜索框',
    category: '搜索',
  },
  CLOSE_MODAL: {
    key: 'Escape',
    description: '关闭弹窗/模态框',
    category: '导航',
  },
  GO_BACK: {
    key: 'Backspace',
    ctrl: true,
    description: '返回上一页',
    category: '导航',
  },
  REFRESH: {
    key: 'r',
    ctrl: true,
    meta: true,
    description: '刷新页面',
    category: '操作',
  },
  SAVE: {
    key: 's',
    ctrl: true,
    meta: true,
    description: '保存当前内容',
    category: '操作',
  },
  UNDO: {
    key: 'z',
    ctrl: true,
    meta: true,
    description: '撤销',
    category: '编辑',
  },
  REDO: {
    key: 'z',
    ctrl: true,
    meta: true,
    shift: true,
    description: '重做',
    category: '编辑',
  },
  COPY: {
    key: 'c',
    ctrl: true,
    meta: true,
    description: '复制',
    category: '编辑',
  },
  PASTE: {
    key: 'v',
    ctrl: true,
    meta: true,
    description: '粘贴',
    category: '编辑',
  },
  CUT: {
    key: 'x',
    ctrl: true,
    meta: true,
    description: '剪切',
    category: '编辑',
  },
  SELECT_ALL: {
    key: 'a',
    ctrl: true,
    meta: true,
    description: '全选',
    category: '编辑',
  },
  DELETE: {
    key: 'Delete',
    description: '删除选中项',
    category: '编辑',
  },
  TOGGLE_SIDEBAR: {
    key: 'b',
    ctrl: true,
    meta: true,
    description: '切换侧边栏',
    category: '布局',
  },
  TOGGLE_FULLSCREEN: {
    key: 'f',
    ctrl: true,
    meta: true,
    shift: true,
    description: '切换全屏',
    category: '布局',
  },
  OPEN_HELP: {
    key: '?',
    ctrl: true,
    meta: true,
    description: '打开快捷键帮助',
    category: '帮助',
  },
};

export const SEARCH_SHORTCUTS: Record<string, ShortcutConfig> = {
  OPEN: {
    key: 'k',
    ctrl: true,
    meta: true,
    description: '打开搜索框',
    category: '搜索',
  },
  CLOSE: {
    key: 'Escape',
    description: '关闭搜索框',
    category: '搜索',
  },
  FOCUS_SEARCH: {
    key: '/',
    description: '聚焦搜索框',
    category: '搜索',
  },
  NAVIGATE_DOWN: {
    key: 'ArrowDown',
    description: '向下导航',
    category: '搜索',
  },
  NAVIGATE_UP: {
    key: 'ArrowUp',
    description: '向上导航',
    category: '搜索',
  },
  SELECT: {
    key: 'Enter',
    description: '选中结果',
    category: '搜索',
  },
  GO_TO_FIRST: {
    key: 'Home',
    description: '跳转到第一个结果',
    category: '搜索',
  },
  GO_TO_LAST: {
    key: 'End',
    description: '跳转到最后一个结果',
    category: '搜索',
  },
};

export function matchShortcut(
  event: React.KeyboardEvent | KeyboardEvent,
  config: ShortcutConfig
): boolean {
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

export interface ShortcutHandler {
  (event: KeyboardEvent): void;
}

export interface ShortcutBinding {
  key: string;
  handler: ShortcutHandler;
  config: ShortcutConfig;
}

export function useKeyboardShortcuts(bindings: ShortcutBinding[], enabled = true) {
  const handleKeyDown = useCallback(
    (event: KeyboardEvent) => {
      if (!enabled) return;

      const target = event.target as HTMLElement;
      const isInputField =
        target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable;

      for (const binding of bindings) {
        if (matchShortcut(event, binding.config)) {
          if (isInputField) {
            const isModifierKey =
              binding.config.ctrl || binding.config.meta || binding.config.shift;
            const isAllowedInInput = [
              'COPY',
              'PASTE',
              'CUT',
              'SELECT_ALL',
              'UNDO',
              'REDO',
            ].includes(binding.key);

            if (!isModifierKey && !isAllowedInInput) {
              continue;
            }
          }

          event.preventDefault();
          binding.handler(event);
          break;
        }
      }
    },
    [bindings, enabled]
  );

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [handleKeyDown]);
}

export function isMacOS(): boolean {
  if (typeof navigator !== 'undefined') {
    return /Mac|iPod|iPhone|iPad/.test(navigator.platform);
  }
  return false;
}

export function getShortcutKeyLabel(config: ShortcutConfig): string {
  const parts: string[] = [];
  const mac = isMacOS();

  if (config.ctrl && config.meta) {
    parts.push(mac ? '⌘' : 'Ctrl');
  } else if (config.ctrl) {
    parts.push(mac ? '⌃' : 'Ctrl');
  } else if (config.meta) {
    parts.push(mac ? '⌘' : 'Win');
  }
  if (config.shift) {
    parts.push(mac ? '⇧' : 'Shift');
  }
  parts.push(config.key.toUpperCase());

  return parts.join(mac ? '' : ' + ');
}

export function getShortcutsByCategory(
  shortcuts: Record<string, ShortcutConfig>
): Record<string, ShortcutConfig[]> {
  const grouped: Record<string, ShortcutConfig[]> = {};

  Object.values(shortcuts).forEach((shortcut) => {
    if (!grouped[shortcut.category]) {
      grouped[shortcut.category] = [];
    }
    grouped[shortcut.category].push(shortcut);
  });

  return grouped;
}

export function useShortcutsHelp() {
  const [isOpen, setIsOpen] = useState(false);

  const bindings: ShortcutBinding[] = [
    {
      key: 'OPEN_HELP',
      config: GLOBAL_SHORTCUTS.OPEN_HELP,
      handler: () => setIsOpen(true),
    },
    {
      key: 'CLOSE_MODAL',
      config: GLOBAL_SHORTCUTS.CLOSE_MODAL,
      handler: () => setIsOpen(false),
    },
  ];

  useKeyboardShortcuts(bindings);

  return { isOpen, setIsOpen };
}
