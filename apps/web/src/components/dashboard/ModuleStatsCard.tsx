import React, { useState } from 'react';
import { Box, Typography, Paper } from '@mui/material';
import { CheckCircle2 } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { designTokens } from '@topems/tokens';
import i18n from '@/i18n';

interface ModuleStatsCardProps {
  title?: string;
  total?: number;
  active?: number;
  icon?: LucideIcon;
  iconBgColor?: string;
  iconColor?: string;
}

export const ModuleStatsCard: React.FC<ModuleStatsCardProps> = ({
  title = i18n.t('shared.module_stats_card.k0'),
  total = 8,
  active = 8,
  icon: Icon = CheckCircle2,
  iconBgColor = 'success.lighter',
  iconColor = 'success.dark',
}) => {
  const [isHovered, setIsHovered] = useState(false);

  return (
    <Paper
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      sx={{
        position: 'relative',
        backgroundColor: 'text.primary',
        borderRadius: 3,
        p: 5,
        transition: 'all 0.4s ease-out',
        cursor: 'pointer',
        border: `1px solid ${designTokens.colors.cyber.glass.bgLight}`,
        boxShadow: isHovered ? 20 : 10,
        transform: isHovered ? 'scale(1.02)' : 'scale(1)',
        borderColor: isHovered ? 'glass.topLight' : designTokens.colors.cyber.glass.bgLight,
        '&:hover .top-bar': {
          transform: 'scaleX(1)',
        },
        '&:hover .bottom-glow': {
          opacity: 0.1,
        },
      }}
    >
      <Box
        className='top-bar'
        sx={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: '100%',
          height: 4,
          transform: 'scaleX(0)',
          transition: 'transform 0.5s',
          transformOrigin: 'left',
          borderTopLeftRadius: 16,
          borderTopRightRadius: 16,
          background: `linear-gradient(90deg, ${iconColor}, transparent)`,
        }}
      />

      <Box
        sx={{
          display: 'flex',
          alignItems: 'flex-start',
          justifyContent: 'space-between',
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          <Box
            sx={{
              width: 48,
              height: 48,
              backgroundColor: iconBgColor,
              borderRadius: 3,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'all 0.4s',
              transform: isHovered ? 'scale(1.15)' : 'scale(1)',
            }}
          >
            <Icon
              size={24}
              color={iconColor}
            />
          </Box>
          <Box>
            <Typography
              sx={{
                fontSize: '0.875rem',
                color: 'grey.400',
                fontWeight: 500,
                mb: 1,
              }}
            >
              {title}
            </Typography>
            <Typography
              sx={{
                fontSize: '1.875rem',
                fontWeight: 700,
                color: 'common.white',
              }}
            >
              {total}
            </Typography>
          </Box>
        </Box>
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            gap: 1.5,
            px: 3,
            py: 1.5,
            backgroundColor: 'common.white',
            borderRadius: 30,
            transition: 'all 0.3s',
            transform: isHovered ? 'scale(1.05)' : 'scale(1)',
          }}
        >
          <CheckCircle2
            size={14}
            color='success.400'
          />
          <Typography
            sx={{
              fontSize: '0.875rem',
              fontWeight: 600,
              color: 'success.400',
            }}
          >
            {active} 活跃
          </Typography>
        </Box>
      </Box>

      <Box sx={{ mt: 4 }}>
        <Box
          sx={{
            height: 6,
            backgroundColor: 'action.disabledBackground',
            borderRadius: 30,
            overflow: 'hidden',
          }}
        >
          <Box
            sx={{
              height: '100%',
              borderRadius: 30,
              transition: 'all 0.7s ease-out',
              width: `${(active / total) * 100}%`,
              background: `linear-gradient(90deg, ${iconColor}, ${iconColor}80)`,
            }}
          />
        </Box>
        <Typography
          sx={{
            fontSize: '0.75rem',
            color: 'grey.600',
            mt: 1.5,
          }}
        >
          活跃率 {(active / total) * 100}%
        </Typography>
      </Box>

      <Box
        className='bottom-glow'
        sx={{
          position: 'absolute',
          bottom: 0,
          right: 0,
          width: 80,
          height: 80,
          opacity: 0,
          transition: 'opacity 0.3s',
          background: iconColor,
          borderRadius: '50%',
          filter: 'blur(30px)',
          transform: 'translate(10px, 10px)',
        }}
      />
    </Paper>
  );
};
