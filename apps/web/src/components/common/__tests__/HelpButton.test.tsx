import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import React from 'react';
import { renderWithProviders } from '@/__tests__/test-utils';
import { HelpButton } from '../HelpButton';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

describe('HelpButton', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders the help button with default icon', () => {
    renderWithProviders(<HelpButton content='帮助说明' />);
    const button = screen.getByRole('button');
    expect(button).toBeInTheDocument();
    // 默认应渲染一个 svg 图标（HelpCircle）
    expect(button.querySelector('svg')).not.toBeNull();
  });

  it('does not open dialog on initial render', () => {
    renderWithProviders(
      <HelpButton
        content='初始内容'
        title='帮助标题'
      />
    );
    // 对话框初始关闭，标题不应出现在文档中
    expect(screen.queryByText('帮助标题')).not.toBeInTheDocument();
  });

  it('opens dialog when button is clicked', () => {
    renderWithProviders(
      <HelpButton
        content='帮助内容文本'
        title='帮助标题'
      />
    );
    const button = screen.getByRole('button');
    fireEvent.click(button);
    // 对话框打开后应显示标题和内容
    expect(screen.getByText('帮助标题')).toBeInTheDocument();
    expect(screen.getByText('帮助内容文本')).toBeInTheDocument();
  });

  it('does not open dialog when disabled', () => {
    renderWithProviders(
      <HelpButton
        content='禁用内容'
        title='禁用标题'
        disabled
      />
    );
    const button = screen.getByRole('button');
    expect(button).toBeDisabled();
    fireEvent.click(button);
    // 禁用时点击不应打开对话框
    expect(screen.queryByText('禁用标题')).not.toBeInTheDocument();
  });

  it('renders custom icon when provided', () => {
    renderWithProviders(
      <HelpButton
        content='内容'
        icon={<span data-testid='custom-icon'>?</span>}
      />
    );
    expect(screen.getByTestId('custom-icon')).toBeInTheDocument();
  });

  it('renders string content as typography in dialog', () => {
    renderWithProviders(
      <HelpButton
        content='这是字符串内容'
        title='标题'
      />
    );
    fireEvent.click(screen.getByRole('button'));
    expect(screen.getByText('这是字符串内容')).toBeInTheDocument();
  });

  it('renders react node content in dialog', () => {
    renderWithProviders(
      <HelpButton
        content={<div data-testid='node-content'>节点内容</div>}
        title='标题'
      />
    );
    fireEvent.click(screen.getByRole('button'));
    expect(screen.getByTestId('node-content')).toBeInTheDocument();
  });
});
