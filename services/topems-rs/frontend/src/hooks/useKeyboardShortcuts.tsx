import { useEffect, useCallback } from 'react';

export interface ShortcutConfig {
  key: string;
  ctrl?: boolean;
  shift?: boolean;
  alt?: boolean;
  description: string;
  action: () => void;
}

export const useKeyboardShortcuts = (shortcuts: ShortcutConfig[]) => {
  const handleKeyDown = useCallback((event: KeyboardEvent) => {
    shortcuts.forEach((shortcut) => {
      const ctrlMatch = shortcut.ctrl ? (event.ctrlKey || event.metaKey) : !event.ctrlKey && !event.metaKey;
      const shiftMatch = shortcut.shift ? event.shiftKey : !event.shiftKey;
      const altMatch = shortcut.alt ? event.altKey : !event.altKey;
      const keyMatch = event.key.toLowerCase() === shortcut.key.toLowerCase();

      if (ctrlMatch && shiftMatch && altMatch && keyMatch) {
        event.preventDefault();
        shortcut.action();
      }
    });
  }, [shortcuts]);

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);
};

export interface ShortcutsHelpProps {
  shortcuts: ShortcutConfig[];
  isOpen: boolean;
  onClose: () => void;
}

export const ShortcutsHelp: React.FC<ShortcutsHelpProps> = ({ shortcuts, isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md">
        <div className="p-5 border-b border-gray-100 flex items-center justify-between">
          <h3 className="text-lg font-semibold text-gray-900">键盘快捷键</h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <div className="p-5 max-h-80 overflow-y-auto">
          <div className="space-y-3">
            {shortcuts.map((shortcut, index) => (
              <div key={index} className="flex items-center justify-between">
                <span className="text-gray-600">{shortcut.description}</span>
                <div className="flex items-center space-x-1">
                  {shortcut.ctrl && (
                    <kbd className="px-2 py-1 bg-gray-100 rounded text-xs font-medium text-gray-700">
                      Ctrl
                    </kbd>
                  )}
                  {shortcut.shift && (
                    <kbd className="px-2 py-1 bg-gray-100 rounded text-xs font-medium text-gray-700">
                      Shift
                    </kbd>
                  )}
                  {shortcut.alt && (
                    <kbd className="px-2 py-1 bg-gray-100 rounded text-xs font-medium text-gray-700">
                      Alt
                    </kbd>
                  )}
                  {shortcut.ctrl || shortcut.shift || shortcut.alt ? (
                    <span className="text-gray-400">+</span>
                  ) : null}
                  <kbd className="px-2 py-1 bg-gray-100 rounded text-xs font-medium text-gray-700">
                    {shortcut.key.toUpperCase()}
                  </kbd>
                </div>
              </div>
            ))}
          </div>
        </div>
        <div className="p-4 border-t border-gray-100 bg-gray-50">
          <p className="text-sm text-gray-500 text-center">
            按 <kbd className="px-1 py-0.5 bg-gray-200 rounded text-xs">?</kbd> 显示此帮助
          </p>
        </div>
      </div>
    </div>
  );
};

export const defaultShortcuts: ShortcutConfig[] = [
  { key: 'n', ctrl: true, description: '新建', action: () => {} },
  { key: 's', ctrl: true, description: '保存', action: () => {} },
  { key: 'f', ctrl: true, description: '搜索', action: () => {} },
  { key: '/', ctrl: true, description: '聚焦搜索框', action: () => {} },
  { key: '?', description: '显示快捷键帮助', action: () => {} },
  { key: 'Escape', description: '关闭弹窗', action: () => {} },
  { key: 'Delete', description: '删除选中项', action: () => {} },
];
