/**
 * ApprovalList - Approval list component (empty state / skeleton / list rendering)
 * @refactor-split Extracted from MobileApprovalPage.tsx
 */
import React from 'react';
import { Box, Typography, List, Divider, useTheme } from '@mui/material';
import { CheckSquare } from 'lucide-react';
import { PullToRefresh, MobileSkeleton } from '@/components/mobile';
import type { ApprovalItem } from '../hooks/useMobileApproval';
import { ApprovalCard } from './ApprovalCard';
import i18n from '@/i18n';
interface ApprovalListProps {
  loading: boolean;
  filteredApprovals: ApprovalItem[];
  searchQuery: string;
  onRefresh: () => Promise<void>;
  onApprovalClick: (approval: ApprovalItem) => void;
  onApprove?: (approval: ApprovalItem) => void;
  onReject?: (approval: ApprovalItem) => void;
}
export const ApprovalList: React.FC<ApprovalListProps> = ({
  loading,
  filteredApprovals,
  searchQuery,
  onRefresh,
  onApprovalClick,
  onApprove,
  onReject,
}) => {
  const theme = useTheme();
  return (
    <PullToRefresh onRefresh={onRefresh}>
      {loading ? (
        <MobileSkeleton
          type='list'
          count={6}
        />
      ) : filteredApprovals.length === 0 ? (
        <Box
          sx={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            py: 10,
            px: 4,
          }}
        >
          <Box
            sx={{
              width: 64,
              height: 64,
              borderRadius: '50%',
              bgcolor: 'grey.100',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              mb: 2,
            }}
          >
            <CheckSquare style={{ width: 32, height: 32, color: theme.palette.text.secondary }} />
          </Box>
          <Typography
            variant='subtitle1'
            sx={{ mb: 1, fontWeight: 500 }}
          >
            {i18n.t('mobile.approval.status.empty')}
          </Typography>
          <Typography
            variant='body2'
            color='text.secondary'
            sx={{ textAlign: 'center' }}
          >
            {searchQuery
              ? ` + ${i18n.t('mobile.approval.status.no_match')} + `
              : i18n.t('mobile.approval.status.empty_desc')}
          </Typography>
        </Box>
      ) : (
        <List disablePadding>
          {filteredApprovals.map((approval, index) => (
            <React.Fragment key={approval.id}>
              <ApprovalCard
                approval={approval}
                onClick={() => onApprovalClick(approval)}
                onApprove={onApprove ? () => onApprove(approval) : undefined}
                onReject={onReject ? () => onReject(approval) : undefined}
              />
              {index < filteredApprovals.length - 1 && <Divider component='li' />}
            </React.Fragment>
          ))}
        </List>
      )}
    </PullToRefresh>
  );
};