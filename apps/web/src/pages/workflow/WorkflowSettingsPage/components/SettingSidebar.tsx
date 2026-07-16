import { Box, Typography, Stack } from '@mui/material';
import React from 'react';
import { SettingGroup } from '../types';

interface SettingSidebarProps {
  groups: SettingGroup[];
  activeGroup: string;
  onGroupChange: (groupId: string) => void;
}

export const SettingSidebar: React.FC<SettingSidebarProps> = ({
  groups,
  activeGroup,
  onGroupChange,
}) => {
  return (
    <Box
      sx={{
        borderRight: 1,
        borderColor: 'divider',
        bgcolor: 'grey.50',
        p: 2,
      }}
    >
      <Stack spacing={0.5}>
        {groups.map((group) => (
          <Box
            key={group.id}
            onClick={() => onGroupChange(group.id)}
            sx={{
              p: 2,
              borderRadius: 1,
              cursor: 'pointer',
              transition: 'all 0.15s',
              bgcolor: activeGroup === group.id ? 'primary.50' : 'transparent',
              borderLeft: activeGroup === group.id ? '3px solid' : '3px solid transparent',
              borderLeftColor: 'primary.main',
              '&:hover': {
                bgcolor: activeGroup === group.id ? 'primary.50' : 'action.hover',
              },
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
              <Box
                sx={{
                  width: 28,
                  height: 28,
                  borderRadius: 1,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: activeGroup === group.id ? 'primary.main' : 'text.secondary',
                }}
              >
                {group.icon}
              </Box>
              <Box>
                <Typography
                  variant='body2'
                  sx={{
                    fontWeight: activeGroup === group.id ? 600 : 400,
                    color: activeGroup === group.id ? 'primary.main' : 'text.primary',
                  }}
                >
                  {group.label}
                </Typography>
                <Typography
                  variant='caption'
                  color='text.secondary'
                  sx={{ display: 'block' }}
                >
                  {group.description}
                </Typography>
              </Box>
            </Box>
          </Box>
        ))}
      </Stack>
    </Box>
  );
};
