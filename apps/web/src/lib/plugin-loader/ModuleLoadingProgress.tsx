/**
 * ModuleLoadingProgress - Progress display component for module loading
 */
import React, { useEffect, useState } from 'react';
import { Box, Typography, useTheme } from '@mui/material';
import { useModuleLoadingStore } from '@/store/moduleLoadingStore';
import i18n from '@/i18n';

interface ModuleLoadingProgressProps {
  moduleId?: string;
  showEstimatedTime?: boolean;
  size?: number;
  strokeWidth?: number;
}
const calculateEstimatedTime = (progress: number, startTime: number | undefined): string | null => {
  if (!startTime || progress <= 0 || progress >= 100) return null;
  const elapsed = Date.now() - startTime;
  const estimatedTotal = (elapsed / progress) * 100;
  const remaining = estimatedTotal - elapsed;
  if (remaining <= 0) return null;
  if (remaining < 1000) return i18n.t('shared.module_loading_progress.1_0');
  if (remaining < 60000)
    return `${i18n.t('shared.module_loading_progress.k1')}${Math.ceil(remaining / 1000)}${i18n.t('shared.module_loading_progress.k2')}`;
  return `${i18n.t('shared.module_loading_progress.k3')}${Math.ceil(remaining / 60000)}${i18n.t('shared.module_loading_progress.k4')}`;
};
export const ModuleLoadingProgress: React.FC<ModuleLoadingProgressProps> = ({
  moduleId,
  showEstimatedTime = true,
  size = 80,
  strokeWidth = 6,
}) => {
  const theme = useTheme();
  const [estimatedTime, setEstimatedTime] = useState<string | null>(null);
  const modules = useModuleLoadingStore((state) => state.modules);
  const totalProgress = useModuleLoadingStore((state) => state.totalProgress);
  const targetModule = moduleId ? modules[moduleId] : null;
  const isOverall = !moduleId;
  const progress = isOverall ? totalProgress : (targetModule?.progress ?? 0);
  const startTime = targetModule?.startTime;
  const moduleName = targetModule ? moduleId : i18n.t('shared.module_loading_progress.k5');
  useEffect(() => {
    if (!showEstimatedTime) return;
    const interval = setInterval(() => {
      setEstimatedTime(calculateEstimatedTime(progress, startTime));
    }, 500);
    setEstimatedTime(calculateEstimatedTime(progress, startTime));
    return () => clearInterval(interval);
  }, [progress, startTime, showEstimatedTime]);
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (progress / 100) * circumference;
  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 1.5,
      }}
    >
      <Box
        sx={{
          position: 'relative',
          width: size,
          height: size,
        }}
      >
        <svg
          width={size}
          height={size}
          style={{ transform: 'rotate(-90deg)' }}
        >
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill='none'
            stroke={theme.palette.action.hover}
            strokeWidth={strokeWidth}
          />
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill='none'
            stroke={theme.palette.primary.main}
            strokeWidth={strokeWidth}
            strokeLinecap='round'
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            style={{
              transition: 'stroke-dashoffset 0.3s ease',
            }}
          />
        </svg>
        <Box
          sx={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Typography
            variant='body2'
            sx={{
              fontWeight: 600,
              fontSize: size * 0.2,
            }}
          >
            {Math.round(progress)}%
          </Typography>
        </Box>
      </Box>

      <Box sx={{ textAlign: 'center' }}>
        <Typography
          variant='body2'
          color='text.secondary'
        >
          {i18n.t('lib.pluginLoader.k10')}
          {moduleName}{i18n.t('lib.pluginLoader.k21')}
        </Typography>
        {showEstimatedTime && estimatedTime && (
          <Typography
            variant='caption'
            color='text.disabled'
            sx={{ mt: 0.5, display: 'block' }}
          >
            [i18n.t('lib.module_loading_progress.k0')]: {estimatedTime}
          </Typography>
        )}
      </Box>
    </Box>
  );
};
/**
 * Full screen loading overlay with progress
 */
export const ModuleLoadingOverlay: React.FC<{
  moduleId?: string;
}> = ({ moduleId }) => (
  <Box
    sx={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: 'background.paper',
      zIndex: (theme) =>
        (
          theme.zIndex as {
            modal: number;
          }
        ).modal + 1,
    }}
  >
    <ModuleLoadingProgress moduleId={moduleId} />
  </Box>
);
