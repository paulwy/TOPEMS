import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import React from 'react';
import { renderWithProviders } from '@/__tests__/test-utils';
import { ShortcutsHelpPanel } from '../ShortcutsHelpPanel';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

describe('ShortcutsHelpPanel', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders dialog when isOpen is true', () => {
    renderWithProviders(
      <ShortcutsHelpPanel
        isOpen
        onClose={vi.fn()}
      />
    );
    expect(screen.getByRole('dialog')).toBeInTheDocument();
  });

  it('does not render dialog when isOpen is false', () => {
    renderWithProviders(
      <ShortcutsHelpPanel
        isOpen={false}
        onClose={vi.fn()}
      />
    );
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('renders shortcut categories from GLOBAL_SHORTCUTS', () => {
    renderWithProviders(
      <ShortcutsHelpPanel
        isOpen
        onClose={vi.fn()}
      />
    );
    // GLOBAL_SHORTCUTS 包含以下类别：搜索、导航、操作、编辑、布局、帮助
    expect(screen.getByText('搜索')).toBeInTheDocument();
    expect(screen.getByText('导航')).toBeInTheDocument();
    expect(screen.getByText('编辑')).toBeInTheDocument();
    expect(screen.getByText('帮助')).toBeInTheDocument();
  });

  it('renders shortcut descriptions', () => {
    renderWithProviders(
      <ShortcutsHelpPanel
        isOpen
        onClose={vi.fn()}
      />
    );
    // 来自 GLOBAL_SHORTCUTS 的描述文本
    expect(screen.getByText('打开全局搜索')).toBeInTheDocument();
    expect(screen.getByText('关闭弹窗/模态框')).toBeInTheDocument();
    expect(screen.getByText('打开快捷键帮助')).toBeInTheDocument();
  });

  it('calls onClose when dialog requests close', () => {
    const handleClose = vi.fn();
    renderWithProviders(
      <ShortcutsHelpPanel
        isOpen
        onClose={handleClose}
      />
    );
    // Dialog 的 onClose 由 backdrop click 和 Escape 触发
    // 在 dialog 元素上按下 Escape 键触发关闭
    const dialog = screen.getByRole('dialog');
    fireEvent.keyDown(dialog, { key: 'Escape' });
    expect(handleClose).toHaveBeenCalled();
  });

  it('renders Ctrl + ? chip hint', () => {
    renderWithProviders(
      <ShortcutsHelpPanel
        isOpen
        onClose={vi.fn()}
      />
    );
    expect(screen.getByText('Ctrl + ?')).toBeInTheDocument();
  });

  it('renders keyboard icon in header', () => {
    renderWithProviders(
      <ShortcutsHelpPanel
        isOpen
        onClose={vi.fn()}
      />
    );
    // MUI Dialog 通过 Portal 渲染到 document.body，需从 body 查询
    const svgs = document.body.querySelectorAll('svg');
    expect(svgs.length).toBeGreaterThan(0);
  });

  it('renders shortcut key chips for each shortcut', () => {
    renderWithProviders(
      <ShortcutsHelpPanel
        isOpen
        onClose={vi.fn()}
      />
    );
    // 快捷键按键以 Chip 形式渲染，如 'K'、'ESC'、'/' 等
    // 至少应存在多个 Chip 元素
    const chips = screen.queryAllByText(/^[A-Z/]+$/);
    expect(chips.length).toBeGreaterThan(0);
  });
});
