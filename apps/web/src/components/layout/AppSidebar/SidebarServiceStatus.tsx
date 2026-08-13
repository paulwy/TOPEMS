import React from 'react';
import { Box } from '@mui/material';
import { moduleToService } from './shared';

export interface SidebarServiceStatusProps {
  moduleCode: string;
  serviceStatuses: Record<string, boolean>;
  collapsed?: boolean;
}

export const SidebarServiceStatus: React.FC<SidebarServiceStatusProps> = ({
  moduleCode,
  serviceStatuses,
  collapsed = false,
}) => {
  const serviceKey = moduleToService[moduleCode];
  const isOffline = serviceKey ? !serviceStatuses[serviceKey] : false;

  if (!isOffline || collapsed) return null;

  return (
    <Box
      sx={{
        width: 8,
        height: 8,
        borderRadius: '50%',
        bgcolor: 'error.main',
        animation: 'pulse 2s infinite',
      }}
    />
  );
};

export default SidebarServiceStatus;
