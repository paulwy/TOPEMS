import React from 'react';
import { BottomNavigation, BottomNavigationAction, Paper, useTheme, Badge } from '@mui/material';
import { Home, ListTodo, ScanLine, CheckSquare, User } from 'lucide-react';
import { designTokens } from '@topems/tokens';
import i18n from '@/i18n';

export interface TabItem {
  id: string;
  label: string;
  icon: React.ReactNode;
  badge?: number;
}

interface BottomTabBarProps {
  tabs: TabItem[];
  activeTab: string;
  onChange?: (tabId: string) => void;
}

const defaultTabs: TabItem[] = [
  {
    id: 'home',
    label: i18n.t('shared.bottom_tab_bar.k0'),
    icon: <Home style={{ width: 22, height: 22 }} />,
  },
  {
    id: 'tasks',
    label: i18n.t('shared.bottom_tab_bar.k1'),
    icon: <ListTodo style={{ width: 22, height: 22 }} />,
  },
  {
    id: 'scan',
    label: i18n.t('shared.bottom_tab_bar.k2'),
    icon: <ScanLine style={{ width: 22, height: 22 }} />,
  },
  {
    id: 'approval',
    label: i18n.t('shared.bottom_tab_bar.k3'),
    icon: <CheckSquare style={{ width: 22, height: 22 }} />,
    badge: 3,
  },
  {
    id: 'profile',
    label: i18n.t('shared.bottom_tab_bar.k4'),
    icon: <User style={{ width: 22, height: 22 }} />,
  },
];

export const BottomTabBar: React.FC<BottomTabBarProps> = ({
  tabs = defaultTabs,
  activeTab,
  onChange,
}) => {
  const theme = useTheme();

  const handleChange = (_event: React.SyntheticEvent, newValue: string) => {
    onChange?.(newValue);
  };

  return (
    <Paper
      className='bottom-tab-bar'
      elevation={8}
      sx={{
        position: 'fixed',
        bottom: 0,
        left: 0,
        right: 0,
        zIndex: theme.zIndex.appBar,
        borderRadius: 0,
        borderTop: 1,
        borderColor: 'divider',
        paddingBottom: 'env(safe-area-inset-bottom, 0px)',
      }}
    >
      <BottomNavigation
        value={activeTab}
        onChange={handleChange}
        sx={{
          height: 56,
          '& .MuiBottomNavigationAction-root': {
            minWidth: 0,
            padding: `${designTokens.spacing.sm} 0`,
            minHeight: 56,
          },
          '& .MuiBottomNavigationAction-label': {
            fontSize: '0.7rem',
            mt: 0.5,
          },
        }}
      >
        {tabs.map((tab) => (
          <BottomNavigationAction
            key={tab.id}
            value={tab.id}
            label={tab.label}
            icon={
              tab.badge !== undefined && tab.badge > 0 ? (
                <Badge
                  badgeContent={tab.badge}
                  color='error'
                  sx={{
                    '& .MuiBadge-badge': {
                      fontSize: '0.6rem',
                      height: 16,
                      minWidth: 16,
                      padding: '0 4px',
                    },
                  }}
                >
                  {tab.icon}
                </Badge>
              ) : (
                tab.icon
              )
            }
          />
        ))}
      </BottomNavigation>
    </Paper>
  );
};

export default BottomTabBar;
