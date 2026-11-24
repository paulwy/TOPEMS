import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Box, Button, Chip, LinearProgress, Paper, Typography } from '@mui/material';
import { CheckCircle2, Circle, Loader2 } from 'lucide-react';
import { hrmSetupApi, type InitProgressResponse } from '@/api/hrm/hrmSetup';
import { buildChecklistRows } from './initChecklistRows';

/** 空态 CTA：初始化未完成时展示步骤清单与前往向导的入口。 */
const InitChecklistPanel: React.FC<{ data: InitProgressResponse | null }> = ({ data }) => {
  const { t } = useTranslation('hrm');
  const navigate = useNavigate();
  const rows = buildChecklistRows(data);
  const done = rows.filter((r) => r.state === 'completed').length;
  const total = rows.length;
  const percent = Math.round((done / total) * 100);

  return (
    <Paper
      sx={{
        borderRadius: 3,
        p: 3,
        mb: 3,
        border: (theme) => `1px solid ${theme.palette.warning.light}`,
      }}
    >
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: 1,
          mb: 1,
        }}
      >
        <Typography
          variant='h6'
          sx={{ fontWeight: 600 }}
        >
          {t('hrm.setup_wizard.checklist.title')}
        </Typography>
        <Chip
          size='small'
          color='warning'
          label={t('hrm.setup_wizard.checklist.progress', { done, total })}
        />
      </Box>
      <Typography
        variant='body2'
        color='text.secondary'
        sx={{ mb: 2 }}
      >
        {t('hrm.setup_wizard.checklist.subtitle')}
      </Typography>

      <LinearProgress
        variant='determinate'
        value={percent}
        sx={{ height: 6, borderRadius: 3, mb: 2 }}
      />

      <Box
        component='ul'
        sx={{ listStyle: 'none', m: 0, p: 0 }}
      >
        {rows.map((row) => (
          <Box
            component='li'
            key={row.name}
            sx={{ display: 'flex', alignItems: 'center', gap: 1.5, py: 1 }}
          >
            {row.state === 'completed' && (
              <CheckCircle2
                size={20}
                color='success.main'
              />
            )}
            {row.state === 'current' && (
              <Loader2
                size={20}
                className='animate-spin'
                color='primary.main'
              />
            )}
            {row.state === 'pending' && (
              <Circle
                size={20}
                color='divider'
              />
            )}
            <Typography
              variant='body2'
              sx={{
                textDecoration: row.state === 'completed' ? 'line-through' : 'none',
                color: row.state === 'pending' ? 'text.secondary' : 'text.primary',
              }}
            >
              {t(`hrm.setup_wizard.checklist.step.${row.name}`)}
            </Typography>
            {row.state === 'current' && (
              <Chip
                size='small'
                label={t('hrm.setup_wizard.reminder.action')}
                color='primary'
                variant='outlined'
              />
            )}
          </Box>
        ))}
      </Box>

      <Button
        variant='contained'
        sx={{ mt: 2, textTransform: 'none' }}
        onClick={() => navigate('/hrm/setup')}
      >
        {t('hrm.setup_wizard.checklist.start')}
      </Button>
    </Paper>
  );
};

/**
 * 门控：GET /setup/progress 返回未完成时渲染初始化清单，否则渲染 children。
 * 查询中/失败/无权限（403）时不拦截，直接渲染 children，避免阻塞普通用户。
 */
export const InitGate: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [incomplete, setIncomplete] = useState<InitProgressResponse | null>(null);
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    let cancelled = false;
    hrmSetupApi
      .getInitProgress()
      .then((res) => {
        if (!cancelled && res.success && res.data && !res.data.is_completed) {
          setIncomplete(res.data);
        }
      })
      .catch(() => {
        // 未登录/无权限/接口暂缺：静默回退到默认内容
      })
      .finally(() => {
        if (!cancelled) setChecked(true);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  if (!checked) return <>{children}</>;
  if (incomplete) {
    return (
      <>
        <InitChecklistPanel data={incomplete} />
        {children}
      </>
    );
  }
  return <>{children}</>;
};

export default InitChecklistPanel;
