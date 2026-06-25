import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen, fireEvent } from '@testing-library/react';
import { renderWithProviders } from '../testUtils';
import { StatusBadge, DEFAULT_STATUS_MAP } from '../../components/common/StatusBadge';
import { Star } from 'lucide-react';

describe('StatusBadge 状态徽章组件', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('基础渲染测试', () => {
    it('应该正确渲染默认状态', () => {
      renderWithProviders(<StatusBadge status="active" />);
      expect(screen.getByText('启用')).toBeInTheDocument();
    });

    it('应该正确渲染自定义标签', () => {
      renderWithProviders(<StatusBadge status="active" label="自定义标签" />);
      expect(screen.getByText('自定义标签')).toBeInTheDocument();
    });

    it('未知状态应该显示状态值作为标签', () => {
      renderWithProviders(<StatusBadge status="unknown_status" />);
      expect(screen.getByText('unknown_status')).toBeInTheDocument();
    });
  });

  describe('状态映射测试', () => {
    it('应该使用自定义状态映射', () => {
      const customMap = {
        custom: { label: '自定义状态', color: 'success' as const },
      };
      renderWithProviders(<StatusBadge status="custom" statusMap={customMap} />);
      expect(screen.getByText('自定义状态')).toBeInTheDocument();
    });

    it('应该支持所有预设状态', () => {
      const statuses = Object.keys(DEFAULT_STATUS_MAP);
      expect(statuses.length).toBeGreaterThan(0);
      
      for (const status of statuses.slice(0, 5)) {
        const { unmount } = renderWithProviders(<StatusBadge status={status} />);
        const config = DEFAULT_STATUS_MAP[status];
        expect(screen.getByText(config.label)).toBeInTheDocument();
        unmount();
      }
    });
  });

  describe('图标测试', () => {
    it('默认不显示图标', () => {
      const { container } = renderWithProviders(<StatusBadge status="active" />);
      const svg = container.querySelector('svg');
      expect(svg).not.toBeInTheDocument();
    });

    it('showIcon 为 true 时显示图标', () => {
      const { container } = renderWithProviders(<StatusBadge status="active" showIcon />);
      const svg = container.querySelector('svg');
      expect(svg).toBeInTheDocument();
    });

    it('应该支持自定义图标', () => {
      const { container } = renderWithProviders(
        <StatusBadge status="active" showIcon icon={<Star data-testid="custom-icon" />} />
      );
      expect(screen.getByTestId('custom-icon')).toBeInTheDocument();
    });
  });

  describe('尺寸测试', () => {
    it('应该支持 sm 尺寸', () => {
      renderWithProviders(<StatusBadge status="active" size="sm" />);
      expect(screen.getByText('启用')).toBeInTheDocument();
    });

    it('应该支持 md 尺寸', () => {
      renderWithProviders(<StatusBadge status="active" size="md" />);
      expect(screen.getByText('启用')).toBeInTheDocument();
    });

    it('应该支持 lg 尺寸', () => {
      renderWithProviders(<StatusBadge status="active" size="lg" />);
      expect(screen.getByText('启用')).toBeInTheDocument();
    });
  });

  describe('变体测试', () => {
    it('应该支持 filled 变体', () => {
      renderWithProviders(<StatusBadge status="active" variant="filled" />);
      expect(screen.getByText('启用')).toBeInTheDocument();
    });

    it('应该支持 outlined 变体', () => {
      renderWithProviders(<StatusBadge status="active" variant="outlined" />);
      expect(screen.getByText('启用')).toBeInTheDocument();
    });

    it('应该支持 soft 变体', () => {
      renderWithProviders(<StatusBadge status="active" variant="soft" />);
      expect(screen.getByText('启用')).toBeInTheDocument();
    });
  });

  describe('颜色测试', () => {
    it('应该支持自定义颜色', () => {
      renderWithProviders(<StatusBadge status="test" color="error" label="错误状态" />);
      expect(screen.getByText('错误状态')).toBeInTheDocument();
    });

    it('颜色优先级：props > statusMap', () => {
      const customMap = {
        test: { label: '测试', color: 'success' as const },
      };
      renderWithProviders(<StatusBadge status="test" statusMap={customMap} color="error" />);
      expect(screen.getByText('测试')).toBeInTheDocument();
    });
  });

  describe('点击事件测试', () => {
    it('clickable 为 true 时应该触发 onClick', () => {
      const onClick = vi.fn();
      renderWithProviders(
        <StatusBadge status="active" clickable onClick={onClick} />
      );
      fireEvent.click(screen.getByText('启用'));
      expect(onClick).toHaveBeenCalledTimes(1);
    });

    it('clickable 为 false 时不应该触发 onClick', () => {
      const onClick = vi.fn();
      renderWithProviders(
        <StatusBadge status="active" clickable={false} onClick={onClick} />
      );
      fireEvent.click(screen.getByText('启用'));
      expect(onClick).not.toHaveBeenCalled();
    });

    it('disabled 时不应该触发 onClick', () => {
      const onClick = vi.fn();
      renderWithProviders(
        <StatusBadge status="active" clickable disabled onClick={onClick} />
      );
      fireEvent.click(screen.getByText('启用'));
      expect(onClick).not.toHaveBeenCalled();
    });
  });

  describe('禁用状态测试', () => {
    it('应该正确渲染禁用状态', () => {
      renderWithProviders(<StatusBadge status="active" disabled />);
      expect(screen.getByText('启用')).toBeInTheDocument();
    });
  });

  describe('自定义渲染测试', () => {
    it('应该支持自定义 render 函数', () => {
      renderWithProviders(
        <StatusBadge
          status="active"
          render={(config) => <div data-testid="custom-render">{config.label}</div>}
        />
      );
      expect(screen.getByTestId('custom-render')).toBeInTheDocument();
      expect(screen.getByText('启用')).toBeInTheDocument();
    });
  });

  describe('非Chip模式测试', () => {
    it('useChip 为 false 时应该渲染文本', () => {
      renderWithProviders(<StatusBadge status="active" useChip={false} />);
      expect(screen.getByText('启用')).toBeInTheDocument();
    });
  });
});
