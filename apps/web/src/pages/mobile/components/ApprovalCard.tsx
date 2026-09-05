import { designTokens } from '@topems/tokens';
/**
 * ApprovalCard - Approval list item card component
 * @refactor-split Extracted from MobileApprovalPage.tsx
 */
import React from 'react';
import { Box, Typography, Chip, ListItem, ListItemText, useTheme } from '@mui/material';
import { ChevronRight, Clock, User as UserIcon, Check, X } from 'lucide-react';
import { SwipeAction, type SwipeActionItem } from '@/components/mobile';
import type { ApprovalItem } from '../hooks/UseMobileApproval';
import {
  getTypeIcon,
  getTypeColor,
  getPriorityColor,
  getPriorityLabel,
} from '../hooks/UseMobileApproval';
import i18n from '@/i18n';

interface ApprovalCardProps {
  approval: ApprovalItem;
  onClick: () => void;
  onApprove?: () => void;
  onReject?: () => void;
}
export const ApprovalCard: React.FC<ApprovalCardProps> = ({
  approval,
  onClick,
  onApprove,
  onReject,
}) => {
  const theme = useTheme();
  const typeColor = getTypeColor(approval.type);
  const rightSwipeActions: SwipeActionItem[] = [
    {
      id: 'approve',
      icon: <Check style={{ width: 20, height: 20 }} />,
      label: i18n.t('mobile.approval.action.approve'),
      color: theme.palette.success.main,
      onClick: onApprove || (() => {}),
    },
    {
      id: 'reject',
      icon: <X style={{ width: 20, height: 20 }} />,
      label: i18n.t('mobile.approval.action.reject'),
      color: theme.palette.error.main,
      onClick: onReject || (() => {}),
    },
  ];
  return (
    <SwipeAction rightActions={rightSwipeActions}>
      <ListItem
        sx={{
          px: 2,
          py: 2,
          cursor: 'pointer',
          '&:hover': {
            bgcolor: 'action.hover',
          },
        }}
        onClick={onClick}
      >
        <ListItemText
          primary={
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
              <Box
                sx={{
                  width: 36,
                  height: 36,
                  borderRadius: 1.5,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  bgcolor: `${typeColor}.lighter`,
                  color: `${typeColor}.main`,
                  flexShrink: 0,
                }}
              >
                {getTypeIcon(approval.type)}
              </Box>
              <Box sx={{ flex: 1, minWidth: 0 }}>
                <Typography
                  variant='subtitle2'
                  sx={{
                    fontWeight: 500,
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {approval.title}
                </Typography>
                <Typography
                  variant='caption'
                  color='text.secondary'
                >
                  {approval.id}
                </Typography>
              </Box>
              <ChevronRight
                style={{
                  width: 18,
                  height: 18,
                  color: theme.palette.text.secondary,
                  flexShrink: 0,
                }}
              />
            </Box>
          }
          secondary={
            <Box sx={{ ml: 0, mt: 1 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                <Chip
                  label={getPriorityLabel(approval.priority, i18n.t)}
                  size='small'
                  color={
                    getPriorityColor(approval.priority) as React.ComponentProps<
                      typeof Chip
                    >['color']
                  }
                  sx={{ height: 20, fontSize: designTokens.typography.fontSize.scale['0.7rem'] }}
                />
                {approval.amount && (
                  <Chip
                    label={approval.amount}
                    size='small'
                    variant='outlined'
                    sx={{ height: 20, fontSize: designTokens.typography.fontSize.scale['0.7rem'] }}
                  />
                )}
              </Box>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                  <UserIcon
                    style={{
                      width: 14,
                      height: 14,
                      color: theme.palette.text.secondary,
                    }}
                  />
                  <Typography
                    variant='caption'
                    color='text.secondary'
                  >
                    {approval.applicant}
                  </Typography>
                </Box>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                  <Clock
                    style={{
                      width: 14,
                      height: 14,
                      color: theme.palette.text.secondary,
                    }}
                  />
                  <Typography
                    variant='caption'
                    color='text.secondary'
                  >
                    {approval.submitTime.split(' ')[0]}
                  </Typography>
                </Box>
              </Box>
            </Box>
          }
          slotProps={{ secondary: { component: 'div' } }}
          sx={{ pr: 2 }}
        />
      </ListItem>
    </SwipeAction>
  );
};
