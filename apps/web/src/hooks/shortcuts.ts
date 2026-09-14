import type React from 'react';
import i18n from '@/i18n';

interface ShortcutConfig {
  key: string;
  ctrl?: boolean;
  meta?: boolean;
  shift?: boolean;
  description: string;
  category: string;
  /** 组合键序列（如 "G → H"），提供时优先于单键渲染 */
  sequence?: string;
}

export const GLOBAL_SHORTCUTS: Record<string, ShortcutConfig> = {
  OPEN_SEARCH: {
    key: 'k',
    ctrl: true,
    meta: true,
    description: i18n.t('shared.shortcuts.k0'),
    category: i18n.t('shared.shortcuts.k1'),
  },
  FOCUS_SEARCH: {
    key: '/',
    description: i18n.t('shared.shortcuts.k2'),
    category: i18n.t('shared.shortcuts.k3'),
  },
  CLOSE_MODAL: {
    key: 'Escape',
    description: i18n.t('shared.shortcuts.k4'),
    category: i18n.t('shared.shortcuts.k5'),
  },
  GO_BACK: {
    key: 'Backspace',
    ctrl: true,
    description: i18n.t('shared.shortcuts.k6'),
    category: i18n.t('shared.shortcuts.k7'),
  },
  REFRESH: {
    key: 'r',
    ctrl: true,
    meta: true,
    description: i18n.t('shared.shortcuts.k8'),
    category: i18n.t('shared.shortcuts.k9'),
  },
  SAVE: {
    key: 's',
    ctrl: true,
    meta: true,
    description: i18n.t('shared.shortcuts.k10'),
    category: i18n.t('shared.shortcuts.k11'),
  },
  UNDO: {
    key: 'z',
    ctrl: true,
    meta: true,
    description: i18n.t('shared.shortcuts.k12'),
    category: i18n.t('shared.shortcuts.k13'),
  },
  REDO: {
    key: 'z',
    ctrl: true,
    meta: true,
    shift: true,
    description: i18n.t('shared.shortcuts.k14'),
    category: i18n.t('shared.shortcuts.k15'),
  },
  COPY: {
    key: 'c',
    ctrl: true,
    meta: true,
    description: i18n.t('shared.shortcuts.k16'),
    category: i18n.t('shared.shortcuts.k17'),
  },
  PASTE: {
    key: 'v',
    ctrl: true,
    meta: true,
    description: i18n.t('shared.shortcuts.k18'),
    category: i18n.t('shared.shortcuts.k19'),
  },
  CUT: {
    key: 'x',
    ctrl: true,
    meta: true,
    description: i18n.t('shared.shortcuts.k20'),
    category: i18n.t('shared.shortcuts.k21'),
  },
  SELECT_ALL: {
    key: 'a',
    ctrl: true,
    meta: true,
    description: i18n.t('shared.shortcuts.k22'),
    category: i18n.t('shared.shortcuts.k23'),
  },
  DELETE: {
    key: 'Delete',
    description: i18n.t('shared.shortcuts.k24'),
    category: i18n.t('shared.shortcuts.k25'),
  },
  TOGGLE_SIDEBAR: {
    key: 'b',
    ctrl: true,
    meta: true,
    description: i18n.t('shared.shortcuts.k26'),
    category: i18n.t('shared.shortcuts.k27'),
  },
  TOGGLE_FULLSCREEN: {
    key: 'f',
    ctrl: true,
    meta: true,
    shift: true,
    description: i18n.t('shared.shortcuts.k28'),
    category: i18n.t('shared.shortcuts.k29'),
  },
  OPEN_HELP: {
    key: '/',
    ctrl: true,
    meta: true,
    description: i18n.t('shared.shortcuts.k30'),
    category: i18n.t('shared.shortcuts.k31'),
  },
  GO_HOME: {
    key: 'g',
    sequence: 'G → H',
    description: i18n.t('shared.shortcuts.k48'),
    category: i18n.t('shared.shortcuts.k49'),
  },
};

export const SEARCH_SHORTCUTS: Record<string, ShortcutConfig> = {
  OPEN: {
    key: 'k',
    ctrl: true,
    meta: true,
    description: i18n.t('shared.shortcuts.k32'),
    category: i18n.t('shared.shortcuts.k33'),
  },
  CLOSE: {
    key: 'Escape',
    description: i18n.t('shared.shortcuts.k34'),
    category: i18n.t('shared.shortcuts.k35'),
  },
  FOCUS_SEARCH: {
    key: '/',
    description: i18n.t('shared.shortcuts.k36'),
    category: i18n.t('shared.shortcuts.k37'),
  },
  NAVIGATE_DOWN: {
    key: 'ArrowDown',
    description: i18n.t('shared.shortcuts.k38'),
    category: i18n.t('shared.shortcuts.k39'),
  },
  NAVIGATE_UP: {
    key: 'ArrowUp',
    description: i18n.t('shared.shortcuts.k40'),
    category: i18n.t('shared.shortcuts.k41'),
  },
  SELECT: {
    key: 'Enter',
    description: i18n.t('shared.shortcuts.k42'),
    category: i18n.t('shared.shortcuts.k43'),
  },
  GO_TO_FIRST: {
    key: 'Home',
    description: i18n.t('shared.shortcuts.k44'),
    category: i18n.t('shared.shortcuts.k45'),
  },
  GO_TO_LAST: {
    key: 'End',
    description: i18n.t('shared.shortcuts.k46'),
    category: i18n.t('shared.shortcuts.k47'),
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

function isMacOS(): boolean {
  if (typeof navigator !== 'undefined') {
    return /Mac|iPod|iPhone|iPad/.test(navigator.platform);
  }
  return false;
}

export function getShortcutKeyLabel(config: ShortcutConfig): string {
  if (config.sequence) {
    return config.sequence;
  }
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
