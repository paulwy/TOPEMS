import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderWithProviders, screen, fireEvent, waitFor } from '@/__tests__/test-utils';

import PluginMarketplaceFilters from '../PluginMarketplaceFilters';
import PluginMarketplaceGrid, { PluginCard } from '../PluginMarketplaceGrid';
import PluginInstallProgress from '../PluginInstallProgress';
import PluginVersionsTab from '../PluginVersionsTab';
import PluginReviewsTab from '../PluginReviewsTab';
import type { Plugin, PluginReview, PluginVersion } from '@/api/plugin';

const mockInstallPlugin = vi.hoisted(() => vi.fn());
const mockIsPluginInstalled = vi.hoisted(() => vi.fn());
const mockAddNotification = vi.hoisted(() => vi.fn());

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, options?: Record<string, unknown>) => {
      if (!options) return key;
      return `${key}:${Object.values(options).join(',')}`;
    },
  }),
}));

vi.mock('lucide-react', async () => {
  const React = await import('react');
  const icon =
    (name: string) =>
    ({ sx: _sx, ...props }: Record<string, unknown>) => (
      <svg
        data-testid={`icon-${name}`}
        {...props}
      />
    );

  return {
    CheckCircle: icon('check-circle'),
    ChevronDown: icon('chevron-down'),
    ChevronUp: icon('chevron-up'),
    Clock: icon('clock'),
    Download: icon('download'),
    ExternalLink: icon('external-link'),
    Grid3X3: icon('grid'),
    HardDrive: icon('hard-drive'),
    List: icon('list'),
    Loader2: icon('loader'),
    Package: icon('package'),
    RefreshCw: icon('refresh'),
    Search: icon('search'),
    Send: icon('send'),
    Shield: icon('shield'),
    ShoppingCart: icon('shopping-cart'),
    Star: icon('star'),
    ThumbsUp: icon('thumbs-up'),
    TrendingUp: icon('trending-up'),
  };
});

vi.mock('@/api/plugin', async () => {
  const actual = await vi.importActual<typeof import('@/api/plugin')>('@/api/plugin');
  return {
    ...actual,
    SUITES: [
      { code: 'suite-erp', name: 'ERP 套件' },
      { code: 'suite-wms', name: 'WMS 套件' },
    ],
  };
});

vi.mock('@/store/pluginStore', () => ({
  usePluginStore: () => ({
    installPlugin: mockInstallPlugin,
    isPluginInstalled: mockIsPluginInstalled,
  }),
}));

vi.mock('@/store', () => ({
  useNotificationStore: (
    selector: (state: { addNotification: typeof mockAddNotification }) => unknown
  ) => selector({ addNotification: mockAddNotification }),
}));

const plugin: Plugin = {
  id: 'plugin-1',
  code: 'smart-wms',
  name: '智能仓储插件',
  description: '提供库存预测与仓储优化能力',
  version: '1.4.0',
  plugin_type: 'business',
  is_published: true,
  category: 'WMS',
  is_free: true,
  install_count: 1280,
  rating: 4.8,
  rating_count: 36,
  tags: ['库存', '预测', '仓储', '优化'],
  created_at: '2026-01-01T00:00:00Z',
};

const paidPlugin: Plugin = {
  ...plugin,
  id: 'plugin-2',
  code: 'finance-ai',
  name: '财务智能插件',
  description: '',
  is_free: false,
  price_cents: 1999,
  tags: undefined,
  install_count: undefined,
  rating: undefined,
  rating_count: undefined,
};

const versions: PluginVersion[] = [
  {
    id: 'version-2',
    plugin_id: 'plugin-1',
    version: '1.4.0',
    release_notes: '新增库存预测模型',
    is_latest: true,
    is_stable: true,
    filesize: 2048,
    min_app_version: '5.14.0',
    created_at: '2026-08-01T00:00:00Z',
  },
  {
    id: 'version-1',
    plugin_id: 'plugin-1',
    version: '1.3.0',
    created_at: '2026-07-01T00:00:00Z',
  },
];

const reviews: PluginReview[] = [
  {
    id: 'review-1',
    plugin_id: 'plugin-1',
    user_id: 'user-1',
    user_name: '张三',
    rating: 5,
    title: '效果明显',
    content: '上线后库存预警更准确。',
    is_verified_purchase: true,
    is_featured: true,
    helpful_count: 8,
    created_at: '2026-08-02T00:00:00Z',
  },
  {
    id: 'review-2',
    plugin_id: 'plugin-1',
    user_id: 'user-2',
    rating: 4,
    created_at: '2026-08-03T00:00:00Z',
  },
];

describe('Plugin marketplace filters', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders search, suite, sort and action controls with callbacks', () => {
    const onSearchChange = vi.fn();
    const onSuiteChange = vi.fn();
    const onSortChange = vi.fn();
    const onViewModeToggle = vi.fn();
    const onRefresh = vi.fn();

    renderWithProviders(
      <PluginMarketplaceFilters
        searchQuery='库存'
        selectedSuite='all'
        sortBy='popular'
        viewMode='grid'
        onSearchChange={onSearchChange}
        onSuiteChange={onSuiteChange}
        onSortChange={onSortChange}
        onViewModeToggle={onViewModeToggle}
        onRefresh={onRefresh}
      />
    );

    fireEvent.change(screen.getByPlaceholderText('plugin.marketplace_page.search_placeholder'), {
      target: { value: '财务' },
    });
    const [suiteSelect, sortSelect] = screen.getAllByRole('combobox');
    fireEvent.mouseDown(suiteSelect);
    fireEvent.click(screen.getByRole('option', { name: 'WMS 套件' }));
    fireEvent.mouseDown(sortSelect);
    fireEvent.click(screen.getByRole('option', { name: 'plugin.marketplace_page.sort.rating' }));
    fireEvent.click(screen.getByTestId('icon-list').closest('button') as HTMLButtonElement);
    fireEvent.click(screen.getByRole('button', { name: 'plugin.action.refresh' }));

    expect(onSearchChange).toHaveBeenCalledWith('财务');
    expect(onSuiteChange).toHaveBeenCalledWith('suite-wms');
    expect(onSortChange).toHaveBeenCalledWith('rating');
    expect(onViewModeToggle).toHaveBeenCalledTimes(1);
    expect(onRefresh).toHaveBeenCalledTimes(1);
  });
});

describe('Plugin marketplace grid and card', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockIsPluginInstalled.mockReturnValue(false);
    mockInstallPlugin.mockResolvedValue(true);
  });

  it('renders plugin cards with metadata and delegates detail selection', () => {
    const onViewDetails = vi.fn();

    renderWithProviders(
      <PluginMarketplaceGrid
        plugins={[plugin, paidPlugin]}
        healthStatus={{ 'smart-wms': { healthy: true }, 'finance-ai': { healthy: false } }}
        viewMode='grid'
        onViewDetails={onViewDetails}
      />
    );

    expect(screen.getByText('智能仓储插件')).toBeInTheDocument();
    expect(screen.getByText('财务智能插件')).toBeInTheDocument();
    expect(screen.getByText('提供库存预测与仓储优化能力')).toBeInTheDocument();
    expect(screen.getByText('plugin.common.no_description')).toBeInTheDocument();
    expect(screen.getByText('1,280')).toBeInTheDocument();
    expect(screen.getByText('库存')).toBeInTheDocument();
    expect(screen.queryByText('优化')).not.toBeInTheDocument();

    fireEvent.click(screen.getAllByRole('button', { name: 'plugin.common.details' })[0]);
    expect(onViewDetails).toHaveBeenCalledWith(plugin);
  });

  it('renders empty marketplace state when plugin list is empty', () => {
    renderWithProviders(
      <PluginMarketplaceGrid
        plugins={[]}
        healthStatus={{}}
        viewMode='list'
        onViewDetails={vi.fn()}
      />
    );

    expect(screen.getByText('plugin.marketplace_page.empty_title')).toBeInTheDocument();
    expect(screen.getByText('plugin.marketplace_page.empty_hint')).toBeInTheDocument();
  });

  it('renders a standalone card with fallback rating and install count', () => {
    renderWithProviders(<PluginCard plugin={paidPlugin} />);

    expect(screen.getByText('财务智能插件')).toBeInTheDocument();
    expect(screen.getAllByText('0').length).toBeGreaterThanOrEqual(2);
    expect(screen.getByRole('button', { name: 'plugin.common.purchase' })).toBeInTheDocument();
  });
});

describe('Plugin install progress', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockIsPluginInstalled.mockReturnValue(false);
  });

  it('installs a free plugin and reports success', async () => {
    const onSuccess = vi.fn();
    mockInstallPlugin.mockResolvedValue(true);

    renderWithProviders(
      <PluginInstallProgress
        plugin={plugin}
        onSuccess={onSuccess}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: 'plugin.common.free_install' }));

    await waitFor(() => {
      expect(mockInstallPlugin).toHaveBeenCalledWith('smart-wms');
    });
    expect(mockAddNotification).toHaveBeenCalledWith(
      expect.objectContaining({
        title: 'plugin.message.install_success',
        type: 'success',
      })
    );
    expect(onSuccess).toHaveBeenCalledTimes(1);
  });

  it('renders installed state and skips install action', () => {
    mockIsPluginInstalled.mockReturnValue(true);

    renderWithProviders(<PluginInstallProgress plugin={plugin} />);

    expect(screen.getByRole('button', { name: 'plugin.common.installed' })).toBeDisabled();
    expect(mockInstallPlugin).not.toHaveBeenCalled();
  });

  it('reports failed and thrown install errors', async () => {
    mockInstallPlugin.mockResolvedValueOnce(false).mockRejectedValueOnce(new Error('网络错误'));
    const { rerender } = renderWithProviders(<PluginInstallProgress plugin={plugin} />);

    fireEvent.click(screen.getByRole('button', { name: 'plugin.common.free_install' }));
    await waitFor(() => {
      expect(mockAddNotification).toHaveBeenCalledWith(
        expect.objectContaining({ title: 'plugin.message.install_failed', type: 'error' })
      );
    });

    rerender(<PluginInstallProgress plugin={plugin} />);
    fireEvent.click(screen.getByRole('button', { name: 'plugin.common.free_install' }));
    await waitFor(() => {
      expect(mockAddNotification).toHaveBeenCalledWith(
        expect.objectContaining({ message: '网络错误', type: 'error' })
      );
    });
  });
});

describe('Plugin versions tab', () => {
  it('renders version history and toggles expanded version', () => {
    const onToggleVersion = vi.fn();
    renderWithProviders(
      <PluginVersionsTab
        versions={versions}
        expandedVersion='version-2'
        onToggleVersion={onToggleVersion}
        formatFileSize={(bytes) => `${bytes ?? 0}B`}
      />
    );

    expect(screen.getByText('plugin.detail_page.section.version_history')).toBeInTheDocument();
    expect(screen.getByText('1.4.0')).toBeInTheDocument();
    expect(screen.getByText('plugin.common.latest')).toBeInTheDocument();
    expect(screen.getByText('plugin.common.stable')).toBeInTheDocument();
    expect(screen.getByText('新增库存预测模型')).toBeInTheDocument();
    expect(screen.getByText('plugin.detail_page.version.size_label:2048B')).toBeInTheDocument();
    expect(
      screen.getByText('plugin.detail_page.version.min_version_label:5.14.0')
    ).toBeInTheDocument();

    fireEvent.click(screen.getByText('1.4.0'));
    expect(onToggleVersion).toHaveBeenCalledWith('');
  });

  it('renders empty version information state', () => {
    renderWithProviders(
      <PluginVersionsTab
        versions={[]}
        expandedVersion={null}
        onToggleVersion={vi.fn()}
        formatFileSize={() => '0B'}
      />
    );

    expect(screen.getByText('plugin.common.no_version_info')).toBeInTheDocument();
  });
});

describe('Plugin reviews tab', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders review form, existing reviews and submits a new review', () => {
    const onRatingChange = vi.fn();
    const onReviewTitleChange = vi.fn();
    const onReviewContentChange = vi.fn();
    const onSubmitReview = vi.fn();

    renderWithProviders(
      <PluginReviewsTab
        reviews={reviews}
        averageRating={4.5}
        pluginRating={4.8}
        rating={4}
        onRatingChange={onRatingChange}
        reviewTitle='体验反馈'
        onReviewTitleChange={onReviewTitleChange}
        reviewContent='整体体验不错'
        onReviewContentChange={onReviewContentChange}
        onSubmitReview={onSubmitReview}
        isSubmitting={false}
      />
    );

    fireEvent.change(screen.getByLabelText('plugin.field.review_title'), {
      target: { value: '新的标题' },
    });
    fireEvent.change(screen.getByLabelText('plugin.field.review_content'), {
      target: { value: '新的内容' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'plugin.common.submit_review' }));

    expect(screen.getByText('plugin.detail_page.section.post_review')).toBeInTheDocument();
    expect(screen.getByText('plugin.detail_page.section.all_reviews:2')).toBeInTheDocument();
    expect(screen.getByText('张三')).toBeInTheDocument();
    expect(screen.getByText('效果明显')).toBeInTheDocument();
    expect(screen.getByText('上线后库存预警更准确。')).toBeInTheDocument();
    expect(screen.getByText('plugin.common.purchased')).toBeInTheDocument();
    expect(screen.getByText('plugin.common.featured')).toBeInTheDocument();
    expect(screen.getByText('8')).toBeInTheDocument();
    expect(screen.getByText('+ plugin.common.anonymous_user')).toBeInTheDocument();
    expect(onReviewTitleChange).toHaveBeenCalledWith('新的标题');
    expect(onReviewContentChange).toHaveBeenCalledWith('新的内容');
    expect(onSubmitReview).toHaveBeenCalledTimes(1);
  });

  it('disables submit without rating and renders empty review state', () => {
    renderWithProviders(
      <PluginReviewsTab
        reviews={[]}
        averageRating={0}
        pluginRating={0}
        rating={0}
        onRatingChange={vi.fn()}
        reviewTitle=''
        onReviewTitleChange={vi.fn()}
        reviewContent=''
        onReviewContentChange={vi.fn()}
        onSubmitReview={vi.fn()}
        isSubmitting={false}
      />
    );

    expect(screen.getByRole('button', { name: 'plugin.common.submit_review' })).toBeDisabled();
    expect(screen.getByText('plugin.common.no_reviews')).toBeInTheDocument();
    expect(screen.getByText('plugin.detail_page.review.first_reviewer')).toBeInTheDocument();
  });

  it('shows submitting state while review is being submitted', () => {
    renderWithProviders(
      <PluginReviewsTab
        reviews={[]}
        averageRating={0}
        pluginRating={0}
        rating={5}
        onRatingChange={vi.fn()}
        reviewTitle='标题'
        onReviewTitleChange={vi.fn()}
        reviewContent='内容'
        onReviewContentChange={vi.fn()}
        onSubmitReview={vi.fn()}
        isSubmitting
      />
    );

    expect(screen.getByRole('button', { name: '+ plugin.common.submitting +' })).toBeDisabled();
  });
});
