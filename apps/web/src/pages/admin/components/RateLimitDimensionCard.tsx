import React from 'react';
import { Box, Card, CardContent, Grid, InputAdornment, TextField, Typography } from '@mui/material';
import type { RateLimitRule } from '../hooks/useRateLimitConfig';
import i18n from '@/i18n';

interface RateLimitDimensionCardProps {
  dimKey: 'tenant_default' | 'user_default' | 'ip_default' | 'global_default';
  title: string;
  icon: React.ReactNode;
  color: string;
  description: string;
  rule: RateLimitRule;
  onUpdateRule: (
    key: RateLimitDimensionCardProps['dimKey'],
    field: keyof RateLimitRule,
    value: number
  ) => void;
}
const RateLimitDimensionCard: React.FC<RateLimitDimensionCardProps> = ({
  dimKey,
  title,
  icon,
  color,
  description,
  rule,
  onUpdateRule,
}) => {
  return (
    <Grid size={{ xs: 12, md: 6 }}>
      <Card>
        <CardContent>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 2 }}>
            <Box
              sx={{
                width: 36,
                height: 36,
                borderRadius: 1,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                bgcolor: `${color}15`,
                color,
              }}
            >
              {icon}
            </Box>
            <Box>
              <Typography
                variant='subtitle1'
                sx={{ fontWeight: 600 }}
              >
                {title}
              </Typography>
              <Typography
                variant='caption'
                color='text.secondary'
              >
                {description}
              </Typography>
            </Box>
          </Box>
          <Grid
            container
            spacing={2}
          >
            <Grid size={{ xs: 6 }}>
              <TextField
                label={i18n.t('admin.rate_limit_config.allowed_requests')}
                type='number'
                fullWidth
                value={rule.requests}
                onChange={(e) => onUpdateRule(dimKey, 'requests', Number(e.target.value) || 0)}
                slotProps={{
                  input: {
                    endAdornment: (
                      <InputAdornment position='end'>
                        {i18n.t('admin.rate_limit_config.times')}
                      </InputAdornment>
                    ),
                  },
                }}
              />
            </Grid>
            <Grid size={{ xs: 6 }}>
              <TextField
                label={i18n.t('admin.rate_limit_config.time_window')}
                type='number'
                fullWidth
                value={rule.window_secs}
                onChange={(e) => onUpdateRule(dimKey, 'window_secs', Number(e.target.value) || 1)}
                slotProps={{
                  input: {
                    endAdornment: (
                      <InputAdornment position='end'>
                        {i18n.t('admin.rate_limit_config.seconds')}
                      </InputAdornment>
                    ),
                  },
                }}
              />
            </Grid>
            <Grid size={{ xs: 12 }}>
              <TextField
                label={i18n.t('admin.rate_limit_config.priority')}
                type='number'
                fullWidth
                value={rule.priority}
                onChange={(e) => onUpdateRule(dimKey, 'priority', Number(e.target.value) || 0)}
                helperText={i18n.t('admin.rate_limit_config.higher_value_means_higher_priority')}
              />
            </Grid>
          </Grid>
        </CardContent>
      </Card>
    </Grid>
  );
};
export default RateLimitDimensionCard;
