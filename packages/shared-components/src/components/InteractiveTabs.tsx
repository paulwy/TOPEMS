import React, { useRef, useEffect, useState, useCallback } from 'react';
import type { SxProps, Theme } from '@mui/material';
import { Box, Tabs, Tab } from '@mui/material';
import { designTokens, semanticTokens } from '@topems/tokens';

export interface InteractiveTabItem {
  /** 唯一标识 */
  id: string;
  /** 显示文本 */
  label: React.ReactNode;
  /** 图标 */
  icon?: React.ReactNode;
  /** 是否禁用 */
  disabled?: boolean;
  /** 徽标数字 */
  badge?: number | string;
}

export interface InteractiveTabsProps {
  /** Tab 项列表 */
  tabs: InteractiveTabItem[];
  /** 当前激活项 ID */
  activeTab: string;
  /** 切换回调 */
  onChange: (tabId: string) => void;
  /** 是否启用滑动下划线动画 */
  animated?: boolean;
  /** 自定义样式 */
  sx?: SxProps<Theme>;
  /** 附加类名 */
  className?: string;
  /** ARIA 标签前缀 */
  ariaLabel?: string;
}

export const InteractiveTabs: React.FC<InteractiveTabsProps> = ({
  tabs,
  activeTab,
  onChange,
  animated = true,
  sx,
  className = '',
  ariaLabel = '导航标签',
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [indicatorStyle, setIndicatorStyle] = useState({ left: 0, width: 0, opacity: 0 });
  const [mounted, setMounted] = useState(false);

  const updateIndicator = useCallback(() => {
    if (!containerRef.current || !animated) return;

    const activeButton = containerRef.current.querySelector(
      `[data-tab-id="${activeTab}"]`
    ) as HTMLElement | null;

    if (activeButton) {
      const containerRect = containerRef.current.getBoundingClientRect();
      const tabRect = activeButton.getBoundingClientRect();
      setIndicatorStyle({
        left: tabRect.left - containerRect.left + containerRef.current.scrollLeft,
        width: tabRect.width,
        opacity: 1,
      });
    }
  }, [activeTab, animated]);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    updateIndicator();
  }, [updateIndicator, tabs]);

  useEffect(() => {
    const handleResize = () => updateIndicator();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [updateIndicator]);

  const handleChange = useCallback(
    (_event: React.SyntheticEvent, value: string) => {
      if (value !== activeTab) {
        onChange(value);
      }
    },
    [activeTab, onChange]
  );

  return (
    <Box
      ref={containerRef}
      className={`interactive-tabs ${className}`.trim()}
      sx={{
        position: 'relative',
        borderBottom: `1px solid ${designTokens.colors.border.default}`,
        ...sx,
      }}
      role="tablist"
      aria-label={ariaLabel}
    >
      <Tabs
        value={activeTab}
        onChange={handleChange}
        variant="scrollable"
        scrollButtons="auto"
        allowScrollButtonsMobile
        slotProps={{ indicator: { style: { display: 'none' } } }}
        sx={{
          minHeight: 44,
          '& .MuiTabs-flexContainer': {
            gap: 0.5,
          },
          '& .MuiTabs-scrollButtons': {
            width: 28,
          },
        }}
      >
        {tabs.map((tab) => (
          <Tab
            key={tab.id}
            data-tab-id={tab.id}
            value={tab.id}
            disabled={tab.disabled}
            label={
              <Box
                component="span"
                sx={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 0.75,
                  position: 'relative',
                }}
              >
                {tab.icon}
                <span>{tab.label}</span>
                {tab.badge !== undefined && (
                  <Box
                    component="span"
                    sx={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      minWidth: 18,
                      height: 18,
                      px: 0.75,
                      borderRadius: 999,
                      fontSize: designTokens.typography.fontSize.xs,
                      fontWeight: designTokens.typography.fontWeight.semibold,
                      bgcolor: designTokens.colors.error.main,
                      color: designTokens.colors.common.white,
                    }}
                  >
                    {tab.badge}
                  </Box>
                )}
              </Box>
            }
            className={`interactive-tab ${tab.id === activeTab ? 'active' : ''}`}
            sx={{
              textTransform: 'none',
              minHeight: 44,
              px: 2,
              py: 1,
              color: designTokens.colors.text.secondary,
              fontWeight: designTokens.typography.fontWeight.medium,
              fontSize: designTokens.typography.fontSize.sm,
              borderRadius: `${designTokens.borderRadius.sm}px ${designTokens.borderRadius.sm}px 0 0`,
              transition: `color ${designTokens.motion.duration.fast} ${designTokens.motion.easing.default}, background-color ${designTokens.motion.duration.fast} ${designTokens.motion.easing.default}`,
              '&:hover': {
                color: designTokens.colors.text.primary,
                backgroundColor: designTokens.colors.action.hover,
              },
              '&.Mui-selected': {
                color: designTokens.colors.primary.main,
                backgroundColor: `color-mix(in srgb, ${designTokens.colors.primary.main} 5%, transparent)`,
                fontWeight: designTokens.typography.fontWeight.semibold,
              },
              '&.Mui-disabled': {
                color: designTokens.colors.text.disabled,
              },
              '&:focus-visible': {
                outline: 'none',
                boxShadow: `inset 0 0 0 2px ${designTokens.colors.primary.light}`,
              },
            }}
            role="tab"
            aria-selected={tab.id === activeTab}
            aria-controls={`tabpanel-${tab.id}`}
          />
        ))}
      </Tabs>

      {animated && mounted && (
        <Box
          className="tab-underline"
          aria-hidden="true"
          sx={{
            position: 'absolute',
            bottom: 0,
            height: 2,
            borderRadius: '2px 2px 0 0',
            background: semanticTokens.brand.tabUnderline,
            boxShadow: semanticTokens.brand.activeTabGlow,
            transition: `left ${designTokens.motion.duration.slow} ${designTokens.motion.easing.default}, width ${designTokens.motion.duration.slow} ${designTokens.motion.easing.default}, opacity ${designTokens.motion.duration.fast} ${designTokens.motion.easing.default}`,
            ...indicatorStyle,
          }}
        />
      )}
    </Box>
  );
};

export default InteractiveTabs;
