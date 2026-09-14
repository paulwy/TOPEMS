import React from 'react';
import { TopBar, type TopBarProps } from './TopBar';
import { SideRail, type SideRailProps } from './SideRail';

export interface AppShellProps extends TopBarProps, Omit<SideRailProps, 'title'> {
  children: React.ReactNode;
  fullWidth?: boolean;
}

export const AppShell: React.FC<AppShellProps> = ({
  children,
  fullWidth = false,
  items,
  activeId,
  onItemClick,
  footerItems,
  ...topBarProps
}) => {
  return (
    <div
      style={{
        minHeight: '100dvh',
        backgroundColor: 'var(--bg-primary)',
      }}
    >
      <TopBar {...topBarProps} />
      <SideRail
        items={items}
        activeId={activeId}
        onItemClick={onItemClick}
        footerItems={footerItems}
      />

      <main
        style={{
          marginLeft: 'var(--siderail-width)',
          marginTop: 'var(--topbar-height)',
          minHeight: 'calc(100vh - var(--topbar-height))',
          padding: 'var(--space-6)',
        }}
      >
        <div
          style={{
            width: '100%',
            maxWidth: fullWidth ? 'none' : '1920px',
            margin: '0 auto',
          }}
        >
          {children}
        </div>
      </main>
    </div>
  );
};
