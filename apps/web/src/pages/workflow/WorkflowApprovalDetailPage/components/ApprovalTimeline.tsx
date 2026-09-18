import React from 'react';
import { Box, Typography, Stack, Paper, Avatar, Chip } from '@mui/material';
import type { Theme } from '@mui/material/styles';
import { FileText, CheckCircle2, XCircle, User, Clock, PlayCircle, GitBranch } from 'lucide-react';
import type { Approval, ApprovalRecord } from '@/api/workflow';
import { designTokens } from '@/theme/tokens';
import i18n from '@/i18n';

const ct = designTokens.colors;
interface ApprovalTimelineProps {
  approval: Approval | null;
  records: ApprovalRecord[];
  theme: Theme;
}
export const RecordsTabContent: React.FC<{ records: ApprovalRecord[]; theme: Theme }> = ({
  records,
  theme,
}) => {
  if (records.length === 0) {
    return (
      <Box sx={{ textAlign: 'center', py: 4 }}>
        <FileText
          size={48}
          style={{
            color: theme.palette.grey[300],
            marginLeft: 'auto',
            marginRight: 'auto',
            marginBottom: 4,
          }}
        />
        <Typography
          variant='body2'
          sx={{ color: 'grey.500' }}
        >
          {i18n.t('pages.approval_timeline.k0')}
        </Typography>
      </Box>
    );
  }
  return (
    <Stack spacing={2}>
      {records.map((record, index) => (
        <Box
          key={record.id}
          sx={{ borderLeft: 2, borderColor: 'primary.light', pl: 2 }}
        >
          <Stack
            direction='row'
            spacing={1}
            sx={{ mb: 0.5 }}
          >
            {record.action === 'approve' ? (
              <CheckCircle2
                size={16}
                style={{ color: ct.success[600] }}
              />
            ) : (
              <XCircle
                size={16}
                style={{ color: ct.error[600] }}
              />
            )}
            <Typography
              variant='body2'
              sx={{ fontWeight: 500 }}
            >
              {record.action === 'approve'
                ? i18n.t('workflow.approval_timeline.k1')
                : i18n.t('workflow.approval_timeline.k0')}
            </Typography>
          </Stack>
          <Stack
            direction='row'
            spacing={0.5}
            sx={{ mb: 0.5 }}
          >
            <User size={12} />
            <Typography
              variant='caption'
              sx={{ color: 'grey.500' }}
            >
              {record.actor_name || record.actor_id}
            </Typography>
          </Stack>
          <Stack
            direction='row'
            spacing={0.5}
          >
            <Clock size={12} />
            <Typography
              variant='caption'
              sx={{ color: 'grey.500' }}
            >
              {new Date(record.created_at).toLocaleString()}
            </Typography>
          </Stack>
          {record.comment && (
            <Typography
              variant='caption'
              sx={{ color: 'grey.600', fontStyle: 'italic', display: 'block', mt: 1 }}
            >
              "{record.comment}"
            </Typography>
          )}
          {index < records.length - 1 && (
            <Typography
              variant='caption'
              sx={{ color: 'grey.400', display: 'block', mt: 1 }}
            >
              {i18n.t('pages.approval_timeline.k1')}: {record.previous_status} → {record.new_status}
            </Typography>
          )}
        </Box>
      ))}
    </Stack>
  );
};
export const TimelineTabContent: React.FC<{
  approval: Approval | null;
  records: ApprovalRecord[];
  theme: Theme;
}> = ({ approval, records, theme }) => {
  return (
    <Box>
      <Typography
        variant='body2'
        sx={{ color: 'grey.500', mb: 2 }}
      >
        {i18n.t('pages.approval_timeline.k2')}
      </Typography>
      {records.length === 0 ? (
        <Box sx={{ textAlign: 'center', py: 6 }}>
          <PlayCircle
            size={48}
            style={{
              color: theme.palette.grey[300],
              marginLeft: 'auto',
              marginRight: 'auto',
              marginBottom: 8,
            }}
          />
          <Typography sx={{ color: 'grey.500' }}>
            {i18n.t('workflow.approval_timeline.k2')}
          </Typography>
        </Box>
      ) : (
        <Box sx={{ position: 'relative' }}>
          <Box
            sx={{
              position: 'absolute',
              left: 19,
              top: 0,
              bottom: 0,
              width: 2,
              bgcolor: 'grey.200',
            }}
          />
          <Stack spacing={3}>
            <Box sx={{ display: 'flex', gap: 2, position: 'relative' }}>
              <Avatar
                sx={{
                  width: 40,
                  height: 40,
                  bgcolor: 'primary.main',
                  zIndex: 1,
                }}
              >
                <PlayCircle size={20} />
              </Avatar>
              <Paper
                sx={{
                  flex: 1,
                  p: 2,
                  bgcolor: 'primary.50',
                  border: 1,
                  borderColor: 'primary.100',
                }}
              >
                <Typography
                  variant='body2'
                  sx={{ fontWeight: 600 }}
                >
                  {i18n.t('pages.approval_timeline.k3')}
                </Typography>
                <Typography
                  variant='caption'
                  sx={{ color: 'grey.500' }}
                >
                  {i18n.t('pages.approval_timeline.k4')}:{' '}
                  {approval?.assignee_id || i18n.t('workflow.approval_timeline.k3')}
                </Typography>
                <Typography
                  variant='caption'
                  sx={{ display: 'block', color: 'grey.400' }}
                >
                  {approval?.created_at ? new Date(approval.created_at).toLocaleString() : ''}
                </Typography>
              </Paper>
            </Box>
            {records.map((record, index) => {
              const isApproved = record.action === 'approve';
              return (
                <Box
                  key={record.id}
                  sx={{ display: 'flex', gap: 2, position: 'relative' }}
                >
                  <Avatar
                    sx={{
                      width: 40,
                      height: 40,
                      bgcolor: isApproved ? 'success.main' : 'error.main',
                      zIndex: 1,
                    }}
                  >
                    {isApproved ? <CheckCircle2 size={20} /> : <XCircle size={20} />}
                  </Avatar>
                  <Paper
                    sx={{
                      flex: 1,
                      p: 2,
                      bgcolor: isApproved ? 'success.50' : 'error.50',
                      border: 1,
                      borderColor: isApproved ? 'success.100' : 'error.100',
                    }}
                  >
                    <Stack
                      direction='row'
                      sx={{ alignItems: 'center', justifyContent: 'space-between', mb: 1 }}
                    >
                      <Typography
                        variant='body2'
                        sx={{ fontWeight: 600 }}
                      >
                        {isApproved
                          ? i18n.t('workflow.approval_timeline.k5')
                          : i18n.t('workflow.approval_timeline.k4')}
                      </Typography>
                      <Chip
                        size='small'
                        label={`${i18n.t('pages.approval_timeline.k0')}${index + 1}`}
                        color={isApproved ? 'success' : 'error'}
                        variant='outlined'
                      />
                    </Stack>
                    <Stack
                      direction='row'
                      spacing={0.5}
                      sx={{ alignItems: 'center', mb: 0.5 }}
                    >
                      <User
                        size={14}
                        style={{ color: theme.palette.grey[500] }}
                      />
                      <Typography
                        variant='caption'
                        sx={{ color: 'grey.600' }}
                      >
                        {record.actor_name || record.actor_id}
                      </Typography>
                    </Stack>
                    <Stack
                      direction='row'
                      spacing={0.5}
                      sx={{ alignItems: 'center', mb: 0.5 }}
                    >
                      <Clock
                        size={14}
                        style={{ color: theme.palette.grey[400] }}
                      />
                      <Typography
                        variant='caption'
                        sx={{ color: 'grey.500' }}
                      >
                        {new Date(record.created_at).toLocaleString()}
                      </Typography>
                    </Stack>
                    {record.comment && (
                      <Box
                        sx={{
                          mt: 1,
                          p: 1,
                          bgcolor: 'background.paper',
                          borderRadius: 1,
                          borderLeft: 2,
                          borderColor: isApproved ? 'success.main' : 'error.main',
                        }}
                      >
                        <Typography
                          variant='caption'
                          sx={{ color: 'grey.700', fontStyle: 'italic' }}
                        >
                          "{record.comment}"
                        </Typography>
                      </Box>
                    )}
                  </Paper>
                </Box>
              );
            })}
            {approval?.status === 'pending' && (
              <Box sx={{ display: 'flex', gap: 2, position: 'relative' }}>
                <Avatar
                  sx={{
                    width: 40,
                    height: 40,
                    bgcolor: 'warning.main',
                    zIndex: 1,
                  }}
                >
                  <Clock size={20} />
                </Avatar>
                <Paper
                  sx={{
                    flex: 1,
                    p: 2,
                    bgcolor: 'warning.50',
                    border: 1,
                    borderColor: 'warning.100',
                    borderStyle: 'dashed',
                  }}
                >
                  <Typography
                    variant='body2'
                    sx={{ fontWeight: 600 }}
                  >
                    {i18n.t('pages.approval_timeline.k5')}
                  </Typography>
                  <Typography
                    variant='caption'
                    sx={{ color: 'grey.500' }}
                  >
                    {i18n.t('pages.approval_timeline.k6')}: {approval.assignee_id || 'N/A'}
                  </Typography>
                  {approval.timeout_at && (
                    <Typography
                      variant='caption'
                      sx={{ display: 'block', color: 'warning.main', mt: 0.5 }}
                    >
                      {i18n.t('pages.approval_timeline.k7')}:{' '}
                      {new Date(approval.timeout_at).toLocaleString()}
                    </Typography>
                  )}
                </Paper>
              </Box>
            )}
          </Stack>
        </Box>
      )}
    </Box>
  );
};
export const FormDataTabContent: React.FC<{ approval: Approval | null; theme: Theme }> = ({
  approval,
  theme,
}) => {
  const formData = (approval as unknown as Record<string, unknown>)?.form_data as
    Record<string, unknown> | undefined;
  const hasFormData = formData && Object.keys(formData).length > 0;
  return (
    <Box>
      <Typography
        variant='body2'
        sx={{ color: 'grey.500', mb: 2 }}
      >
        {i18n.t('pages.approval_timeline.k8')}
      </Typography>
      {hasFormData ? (
        <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 2 }}>
          {Object.entries(formData!).map(([key, value]) => (
            <Box
              key={key}
              sx={{
                p: 2,
                bgcolor: 'grey.50',
                borderRadius: 1,
                border: 1,
                borderColor: 'divider',
              }}
            >
              <Typography
                variant='caption'
                sx={{ color: 'grey.500', fontWeight: 600, display: 'block', mb: 0.5 }}
              >
                {key}
              </Typography>
              <Typography variant='body2'>{String(value ?? '-')}</Typography>
            </Box>
          ))}
        </Box>
      ) : (
        <Box sx={{ textAlign: 'center', py: 6 }}>
          <FileText
            size={48}
            style={{
              color: theme.palette.grey[300],
              marginLeft: 'auto',
              marginRight: 'auto',
              marginBottom: 8,
            }}
          />
          <Typography sx={{ color: 'grey.500' }}>
            {i18n.t('workflow.approval_timeline.k6')}
          </Typography>
          <Typography
            variant='caption'
            sx={{ color: 'grey.400', display: 'block', mt: 0.5 }}
          >
            {i18n.t('pages.approval_timeline.k9')}
          </Typography>
        </Box>
      )}
    </Box>
  );
};
export { GitBranch };
const ApprovalTimeline: React.FC<ApprovalTimelineProps> = () => {
  return null;
};
export default ApprovalTimeline;
