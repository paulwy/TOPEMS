import React from 'react';
import { Box, useTheme } from '@mui/material';
import { BottomTabBar, type TabItem } from './BottomTabBar';
import { MobileHeader, type MobileHeaderProps } from './MobileHeader';
import { PageTransition } from './PageTransition';

export interface MobileLayoutProps extends MobileHeaderProps {
  children: React.ReactNode;
  showTabBar?: boolean;
  activeTab?: string;
  tabs?: TabItem[];
  onTabChange?: (tabId: string) => void;
  bottomPadding?: boolean;
  enableTransition?: boolean;
}

export const MobileLayout: React.FC<MobileLayoutProps> = ({
  children,
  showTabBar = true,
  activeTab,
  tabs,
  onTabChange,
  bottomPadding = true,
  enableTransition = true,
  ...headerProps
}) => {
  const theme = useTheme();

  const content = enableTransition ? <PageTransition>{children}</PageTransition> : children;

  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        minHeight: '100vh',
        backgroundColor: theme.palette.background.default,
        maxWidth: '100%',
        overflow: 'hidden',
      }}
    >
      <MobileHeader {...headerProps} />

      <Box
        component='main'
        sx={{
          flex: 1,
          overflowY: 'auto',
          overflowX: 'hidden',
          pb: showTabBar && bottomPadding ? 7 : 0,
          WebkitOverflowScrolling: 'touch',
        }}
      >
        {content}
      </Box>

      {showTabBar && tabs && tabs.length > 0 && (
        <BottomTabBar
          tabs={tabs}
          activeTab={activeTab || ''}
          onChange={onTabChange}
        />
      )}
    </Box>
  );
};

export default MobileLayout;
