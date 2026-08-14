import React from 'react';
import { Box, Typography, Stack, Paper, Avatar, Chip } from '@mui/material';
import {
  User,
  FileText,
  CheckCircle2,
  Clock,
  MessageSquare,
  XCircle,
  PlayCircle,
  GitBranch,
} from 'lucide-react';
import i18n from '@/i18n';
import type { Approval, ApprovalRecord } from '@/api/workflow';
import type { TabConfig } from '@/components/templates/DetailPageTemplate';
import { designTokens } from '@/theme/tokens';
const ct= designTokens.colors;
interface WorkflowApprovalDetailTabsProps {
  approval: Approval | null;
  records: ApprovalRecord[];
}
export function WorkflowApprovalDetailTabs({
  approval,
  records,
}: WorkflowApprovalDetailTabsProps): TabConfig[] {
  const tabs: TabConfig[] = React.useMemo(() => {
    if (!approval) return [];
    return [
      {
        id: 'info',
        label: i18n.t('workflow.approval_detail.tab.approval_info'),
        content: (
          <Box>
            <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 2 }}>
              <Box>
                <Typography
                  variant='body2'
                  sx={{ color: 'grey.500', mb: 0.5 }}
                >
                  {i18n.t('workflow.approval_detail.field.approval_id')}
                </Typography>
                <Typography
                  variant='body2'
                  sx={{ fontFamily: 'monospace' }}
                >
                  {approval.id}
                </Typography>
              </Box>
              <Box>
                <Typography
                  variant='body2'
                  sx={{ color: 'grey.500', mb: 0.5 }}
                >
                  {i18n.t('workflow.approval_detail.field.task_name')}
                </Typography>
                <Typography variant='body2'>{approval.task_name}</Typography>
              </Box>
              <Box>
                <Typography
                  variant='body2'
                  sx={{ color: 'grey.500', mb: 0.5 }}
                >
                  {i18n.t('workflow.approval_detail.field.node_id')}
                </Typography>
                <Typography
                  variant='body2'
                  sx={{ fontFamily: 'monospace' }}
                >
                  {approval.node_id || 'N/A'}
                </Typography>
              </Box>
              <Box>
                <Typography
                  variant='body2'
                  sx={{ color: 'grey.500', mb: 0.5 }}
                >
                  {i18n.t('workflow.approval_detail.field.approval_type')}
                </Typography>
                <Typography variant='body2'>
                  {approval.approval_type === 'single'
                    ? i18n.t('workflow.approval_detail.type.single_approval')
                    : approval.approval_type === 'counter'
                      ? i18n.t('workflow.approval_detail.type.counter_approval')
                      : approval.approval_type === 'or'
                        ? i18n.t('workflow.approval_detail.type.or_approval')
                        : approval.approval_type || 'N/A'}
                </Typography>
              </Box>
              <Box>
                <Typography
                  variant='body2'
                  sx={{ color: 'grey.500', mb: 0.5 }}
                >
                  {i18n.t('workflow.approval_detail.field.approver')}
                </Typography>
                <Stack
                  direction='row'
                  spacing={0.5}
                  sx={{ alignItems: 'center' }}
                >
                  <User size={14} />
                  <Typography variant='body2'>{approval.assignee_id || 'N/A'}</Typography>
                </Stack>
              </Box>
              <Box>
                <Typography
                  variant='body2'
                  sx={{ color: 'grey.500', mb: 0.5 }}
                >
                  {i18n.t('workflow.approval_detail.field.created_at')}
                </Typography>
                <Typography variant='body2'>
                  {new Date(approval.created_at).toLocaleString()}
                </Typography>
              </Box>
              {approval.approved_by && (
                <>
                  <Box>
                    <Typography
                      variant='body2'
                      sx={{ color: 'grey.500', mb: 0.5 }}
                    >
                      {i18n.t('workflow.approval_detail.field.approver')}
                    </Typography>
                    <Typography variant='body2'>{approval.approved_by}</Typography>
                  </Box>
                  <Box>
                    <Typography
                      variant='body2'
                      sx={{ color: 'grey.500', mb: 0.5 }}
                    >
                      {i18n.t('workflow.approval_detail.field.approved_at')}
                    </Typography>
                    <Typography variant='body2'>
                      {approval.approved_at
                        ? new Date(approval.approved_at).toLocaleString()
                        : 'N/A'}
                    </Typography>
                  </Box>
                </>
              )}
              {approval.timeout_at && (
                <Box>
                  <Typography
                    variant='body2'
                    sx={{ color: 'grey.500', mb: 0.5 }}
                  >
                    {i18n.t('workflow.approval_detail.field.timeout_at')}
                  </Typography>
                  <Typography variant='body2'>
                    {new Date(approval.timeout_at).toLocaleString()}
                  </Typography>
                </Box>
              )}
            </Box>
            {approval.comment && (
              <Box sx={{ mt: 2 }}>
                <Typography
                  variant='body2'
                  sx={{ color: 'grey.500', mb: 1 }}
                >
                  {i18n.t('workflow.approval_detail.field.approval_comment')}
                </Typography>
                <Box sx={{ bgcolor: 'grey.50', p: 1.5, borderRadius: 1 }}>
                  <Stack
                    direction='row'
                    spacing={1}
                    sx={{ alignItems: 'flex-start' }}
                  >
                    <MessageSquare
                      size={16}
                      style={{ color: ct.grey[500], marginTop: 2 }}
                    />
                    <Typography variant='body2'>{approval.comment}</Typography>
                  </Stack>
                </Box>
              </Box>
            )}
          </Box>
        ),
      },
      {
        id: 'records',
        label: i18n.t('workflow.approval_detail.tab.approval_records'),
        badge: records.length,
        content: (
          <Box>
            {records.length === 0 ? (
              <Box sx={{ textAlign: 'center', py: 4 }}>
                <FileText
                  size={48}
                  style={{
                    color: ct.grey[400],
                    marginLeft: 'auto',
                    marginRight: 'auto',
                    marginBottom: 4,
                  }}
                />
                <Typography
                  variant='body2'
                  sx={{ color: 'grey.500' }}
                >
                  {i18n.t('workflow.approval_detail.label.no_records')}
                </Typography>
              </Box>
            ) : (
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
                          ? ` + ${i18n.t('workflow.approval_detail.label.approve')} + `
                          : i18n.t('workflow.approval_detail.label.reject')}
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
                        {i18n.t('workflow.approval_detail.label.status_change', {
                          from: record.previous_status,
                          to: record.new_status,
                        })}
                      </Typography>
                    )}
                  </Box>
                ))}
              </Stack>
            )}
          </Box>
        ),
      },
      {
        id: 'timeline',
        label: i18n.t('workflow.approval_detail.tab.process_timeline'),
        icon: <GitBranch size={16} />,
        content: (
          <Box>
            <Typography
              variant='body2'
              sx={{ color: 'grey.500', mb: 2 }}
            >
              {i18n.t('workflow.approval_detail.label.full_timeline_desc')}
            </Typography>
            {records.length === 0 ? (
              <Box sx={{ textAlign: 'center', py: 6 }}>
                <PlayCircle
                  size={48}
                  style={{
                    color: ct.grey[400],
                    marginLeft: 'auto',
                    marginRight: 'auto',
                    marginBottom: 8,
                  }}
                />
                <Typography sx={{ color: 'grey.500' }}>
                  {i18n.t('workflow.approval_detail.label.process_not_started')}
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
                    <Avatar sx={{ width: 40, height: 40, bgcolor: 'primary.main', zIndex: 1 }}>
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
                        {i18n.t('workflow.approval_detail.label.process_start')}
                      </Typography>
                      <Typography
                        variant='caption'
                        sx={{ color: 'grey.500' }}
                      >
                        {i18n.t(
                          `workflow.approval_detail.label.initiator${{
                            name:
                              approval?.assignee_id ||
                              ` + ${i18n.t('workflow.approval_detail.label.system')}`,
                          }}`
                        )}
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
                                ? i18n.t('workflow.approval_detail.label.approval_approved')
                                : i18n.t('workflow.approval_detail.label.approval_rejected')}
                            </Typography>
                            <Chip
                              size='small'
                              label={i18n.t('workflow.approval_detail.label.step', { num: index })}
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
                              style={{ color: ct.grey[500] }}
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
                              style={{ color: ct.grey[400] }}
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
                      <Avatar sx={{ width: 40, height: 40, bgcolor: 'warning.main', zIndex: 1 }}>
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
                          {i18n.t('workflow.approval_detail.label.current_pending')}
                        </Typography>
                        <Typography
                          variant='caption'
                          sx={{ color: 'grey.500' }}
                        >
                          {i18n.t('workflow.approval_detail.label.approver_with_val', {
                            name: approval.assignee_id || 'N/A',
                          })}
                        </Typography>
                        {approval.timeout_at && (
                          <Typography
                            variant='caption'
                            sx={{ display: 'block', color: 'warning.main', mt: 0.5 }}
                          >
                            {i18n.t('workflow.approval_detail.label.timeout_with_val', {
                              time: new Date(approval.timeout_at).toLocaleString(),
                            })}
                          </Typography>
                        )}
                      </Paper>
                    </Box>
                  )}
                </Stack>
              </Box>
            )}
          </Box>
        ),
      },
      {
        id: 'formData',
        label: i18n.t('workflow.approval_detail.tab.form_data'),
        icon: <FileText size={16} />,
        content: (
          <Box>
            <Typography
              variant='body2'
              sx={{ color: 'grey.500', mb: 2 }}
            >
              {i18n.t('workflow.approval_detail.label.form_data_desc')}
            </Typography>
            {(approval as unknown as Record<string, unknown>)?.form_data &&
            Object.keys(
              (approval as unknown as Record<string, unknown>).form_data as unknown as Record<
                string,
                unknown
              >
            ).length > 0 ? (
              <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 2 }}>
                {Object.entries(
                  (approval as unknown as Record<string, unknown>).form_data as unknown as Record<
                    string,
                    unknown
                  >
                ).map(([key, value]) => (
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
                    color: ct.grey[400],
                    marginLeft: 'auto',
                    marginRight: 'auto',
                    marginBottom: 8,
                  }}
                />
                <Typography sx={{ color: 'grey.500' }}>
                  {i18n.t('workflow.approval_detail.label.no_form_data')}
                </Typography>
                <Typography
                  variant='caption'
                  sx={{ color: 'grey.400', display: 'block', mt: 0.5 }}
                >
                  {i18n.t('workflow.approval_detail.label.form_data_auto_fill')}
                </Typography>
              </Box>
            )}
          </Box>
        ),
      },
    ];
  }, [approval, records, i18n.t]);
  return tabs;
}