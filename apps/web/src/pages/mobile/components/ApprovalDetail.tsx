import { designTokens } from '@topems/tokens';
/**
 * ApprovalDetail - Approval detail page component
 * @refactor-split Extracted from MobileApprovalPage.tsx
 */
import React from 'react';
import { Box, Typography, Chip, Paper, Avatar, TextField, useTheme } from '@mui/material';
import { Clock, User as UserIcon, Check, X } from 'lucide-react';
import { MobileButton } from '@/components/mobile';
import { sizeTokens } from '@/theme';
import type { ApprovalItem } from '../hooks/UseMobileApproval';
import {
  getTypeIcon,
  getTypeColor,
  getPriorityColor,
  getPriorityLabel,
} from '../hooks/UseMobileApproval';
import i18n from '@/i18n';

interface ApprovalDetailProps {
  approval: ApprovalItem;
  approvalComment: string;
  onCommentChange: (value: string) => void;
  processing: boolean;
  onApprove: () => void;
  onReject: () => void;
}
export const ApprovalDetail: React.FC<ApprovalDetailProps> = ({
  approval,
  approvalComment,
  onCommentChange,
  processing,
  onApprove,
  onReject,
}) => {
  const theme = useTheme();
  return (
    <Box sx={{ p: 2, pb: 3 }}>
      <Paper
        elevation={0}
        sx={{
          p: 2.5,
          borderRadius: 2,
          mb: 2,
          border: 1,
          borderColor: 'divider',
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
          <Box
            sx={{
              width: sizeTokens.inputHeightLg,
              height: sizeTokens.inputHeightLg,
              borderRadius: 1.5,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              bgcolor: `${getTypeColor(approval.type)}.lighter`,
              color: `${getTypeColor(approval.type)}.main`,
            }}
          >
            {getTypeIcon(approval.type)}
          </Box>
          <Box sx={{ flex: 1 }}>
            <Typography
              variant='h6'
              sx={{ fontWeight: 600, mb: 0.5 }}
            >
              {approval.title}
            </Typography>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Chip
                label={approval.id}
                size='small'
                variant='outlined'
                sx={{ height: 20, fontSize: designTokens.typography.fontSize.scale['0.7rem'] }}
              />
              <Chip
                label={getPriorityLabel(approval.priority, i18n.t)}
                size='small'
                color={
                  getPriorityColor(approval.priority) as React.ComponentProps<typeof Chip>['color']
                }
                sx={{ height: 20, fontSize: designTokens.typography.fontSize.scale['0.7rem'] }}
              />
            </Box>
          </Box>
        </Box>
        {approval.amount && (
          <Box
            sx={{
              py: 2,
              borderTop: 1,
              borderColor: 'divider',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            <Typography
              variant='body2'
              color='text.secondary'
            >
              {i18n.t('mobile.approval.detail.amount')}
            </Typography>
            <Typography
              variant='h5'
              sx={{ fontWeight: 700, color: 'primary.main' }}
            >
              {approval.amount}
            </Typography>
          </Box>
        )}
      </Paper>
      <Paper
        elevation={0}
        sx={{
          p: 2,
          borderRadius: 2,
          mb: 2,
          border: 1,
          borderColor: 'divider',
        }}
      >
        <Typography
          variant='subtitle2'
          sx={{ fontWeight: 600, mb: 2 }}
        >
          {i18n.t('mobile.approval.detail.applicant')}
        </Typography>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <Avatar sx={{ width: 44, height: 44 }}>
            <UserIcon style={{ width: 22, height: 22 }} />
          </Avatar>
          <Box>
            <Typography
              variant='body2'
              sx={{ fontWeight: 500 }}
            >
              {approval.applicant}
            </Typography>
            <Typography
              variant='caption'
              color='text.secondary'
            >
              {approval.department}
            </Typography>
          </Box>
        </Box>
        <Box sx={{ mt: 2, pt: 2, borderTop: 1, borderColor: 'divider' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
            <Clock style={{ width: 14, height: 14, color: theme.palette.text.secondary }} />
            <Typography
              variant='caption'
              color='text.secondary'
            >
              {i18n.t('mobile.approval.detail.submit_time')}：{approval.submitTime}
            </Typography>
          </Box>
        </Box>
      </Paper>
      <Paper
        elevation={0}
        sx={{
          p: 2,
          borderRadius: 2,
          mb: 2,
          border: 1,
          borderColor: 'divider',
        }}
      >
        <Typography
          variant='subtitle2'
          sx={{ fontWeight: 600, mb: 2 }}
        >
          {i18n.t('mobile.approval.detail.description')}
        </Typography>
        <Typography
          variant='body2'
          color='text.secondary'
        >
          {approval.description}
        </Typography>
      </Paper>
      <Paper
        elevation={0}
        sx={{
          p: 2,
          borderRadius: 2,
          mb: 2,
          border: 1,
          borderColor: 'divider',
        }}
      >
        <Typography
          variant='subtitle2'
          sx={{ fontWeight: 600, mb: 2 }}
        >
          {i18n.t('mobile.approval.detail.process')}
        </Typography>
        <Box sx={{ position: 'relative', pl: 2 }}>
          {approval.steps.map((step, index) => (
            <Box
              key={index}
              sx={{
                display: 'flex',
                gap: 2,
                pb: index < approval.steps.length - 1 ? 3 : 0,
              }}
            >
              <Box sx={{ position: 'relative' }}>
                <Box
                  sx={{
                    width: 24,
                    height: 24,
                    borderRadius: '50%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    bgcolor:
                      step.status === 'completed'
                        ? 'success.main'
                        : step.status === 'current'
                          ? 'primary.main'
                          : 'grey.300',
                    color: 'common.white',
                    flexShrink: 0,
                    zIndex: 1,
                  }}
                >
                  {step.status === 'completed' ? (
                    <Check style={{ width: 14, height: 14 }} />
                  ) : (
                    <Typography
                      variant='caption'
                      sx={{ fontWeight: 600 }}
                    >
                      {index + 1}
                    </Typography>
                  )}
                </Box>
                {index < approval.steps.length - 1 && (
                  <Box
                    sx={{
                      position: 'absolute',
                      top: 24,
                      left: '50%',
                      transform: 'translateX(-50%)',
                      width: 2,
                      height: 'calc(100% + 12px)',
                      bgcolor: step.status === 'completed' ? 'success.main' : 'grey.200',
                    }}
                  />
                )}
              </Box>
              <Box sx={{ flex: 1, pt: 0.5 }}>
                <Typography
                  variant='body2'
                  sx={{
                    fontWeight: step.status === 'current' ? 600 : 500,
                    color: step.status === 'pending' ? 'text.secondary' : 'text.primary',
                  }}
                >
                  {step.name}
                </Typography>
                {step.time && (
                  <Typography
                    variant='caption'
                    color='text.secondary'
                  >
                    {step.time}
                  </Typography>
                )}
                {step.status === 'current' && (
                  <Chip
                    label={i18n.t('mobile.approval.tab.pending')}
                    size='small'
                    color='primary'
                    sx={{
                      mt: 0.5,
                      height: 20,
                      fontSize: designTokens.typography.fontSize.scale['0.7rem'],
                    }}
                  />
                )}
              </Box>
            </Box>
          ))}
        </Box>
      </Paper>
      <Paper
        elevation={0}
        sx={{
          p: 2,
          borderRadius: 2,
          mb: 3,
          border: 1,
          borderColor: 'divider',
        }}
      >
        <Typography
          variant='subtitle2'
          sx={{ fontWeight: 600, mb: 2 }}
        >
          {i18n.t('mobile.approval.detail.opinion')}
        </Typography>
        <TextField
          fullWidth
          multiline
          rows={3}
          placeholder={i18n.t('mobile.approval.detail.opinion_placeholder')}
          value={approvalComment}
          onChange={(e) => onCommentChange(e.target.value)}
          sx={{
            '& .MuiOutlinedInput-root': {
              borderRadius: 2,
            },
          }}
        />
      </Paper>
      <Box sx={{ display: 'flex', gap: 2 }}>
        <MobileButton
          fullWidth
          variant='outlined'
          color='error'
          startIcon={processing ? null : <X style={{ width: 20, height: 20 }} />}
          onClick={onReject}
          disabled={processing}
        >
          {processing
            ? i18n.t('mobile.approval.status.loading')
            : i18n.t('mobile.approval.action.reject')}
        </MobileButton>
        <MobileButton
          fullWidth
          variant='contained'
          color='success'
          startIcon={processing ? null : <Check style={{ width: 20, height: 20 }} />}
          onClick={onApprove}
          disabled={processing}
        >
          {processing
            ? i18n.t('mobile.approval.status.loading')
            : i18n.t('mobile.approval.action.approve')}
        </MobileButton>
      </Box>
    </Box>
  );
};
