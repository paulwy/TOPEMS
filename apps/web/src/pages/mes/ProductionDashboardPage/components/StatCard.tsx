import React from 'react';
import { Box, Chip, CircularProgress, Paper, Typography, Stack } from '@mui/material';
import { ArrowUp, ArrowDown } from 'lucide-react';
import i18n from '@/i18n';

const StatCard: React.FC<{
  title: string;
  value: React.ReactNode;
  unit?: string;
  icon: React.ReactNode;
  color: string;
  delta?: number;
  hint?: string;
  loading?: boolean;
}> = ({ title, value, unit, icon, color, delta, hint, loading }) => {
  const hasDelta = typeof delta === 'number' && Number.isFinite(delta);
  return (
    <Paper
      elevation={0}
      sx={{
        p: 2.5,
        borderRadius: 3,
        border: '1px solid',
        borderColor: 'grey.200',
        backgroundColor: 'background.paper',
        height: '100%',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      <Stack
        direction='row'
        sx={{ justifyContent: 'space-between', alignItems: 'flex-start' }}
      >
        <Box>
          <Typography
            variant='body2'
            sx={{ color: 'text.secondary', mb: 1, fontWeight: 500 }}
          >
            {title}
          </Typography>
          {loading ? (
            <CircularProgress size={28} />
          ) : (
            <Stack
              direction='row'
              spacing={1}
              sx={{ alignItems: 'baseline' }}
            >
              <Typography
                variant='h4'
                sx={{ fontWeight: 700, color: 'text.primary', lineHeight: 1.1 }}
              >
                {value}
              </Typography>
              {unit && (
                <Typography
                  variant='body2'
                  sx={{ color: 'text.secondary' }}
                >
                  {unit}
                </Typography>
              )}
            </Stack>
          )}
          {hint && (
            <Typography
              variant='caption'
              sx={{ color: 'text.secondary', mt: 0.5, display: 'block' }}
            >
              {hint}
            </Typography>
          )}
        </Box>
        <Box
          sx={{
            width: 44,
            height: 44,
            borderRadius: 3,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: color,
            color: 'common.white',
          }}
        >
          {icon}
        </Box>
      </Stack>
      {hasDelta && (
        <Stack
          direction='row'
          spacing={0.5}
          sx={{ alignItems: 'center', mt: 1.5 }}
        >
          <Chip
            size='small'
            icon={(delta as number) >= 0 ? <ArrowUp size={12} /> : <ArrowDown size={12} />}
            label={`${Math.abs(delta as number).toFixed(1)}%`}
            color={(delta as number) >= 0 ? 'success' : 'error'}
            variant='outlined'
            sx={{ height: 22, fontSize: '0.7rem' }}
          />
          <Typography
            variant='caption'
            sx={{ color: 'text.secondary' }}
          >
            {i18n.t('pages.stat_card.k0')}
          </Typography>
        </Stack>
      )}
    </Paper>
  );
};

export default StatCard;
