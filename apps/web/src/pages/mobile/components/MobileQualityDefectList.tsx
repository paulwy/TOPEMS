import { designTokens } from '@topems/tokens';
/**
 * MobileQuality defect record list component
 * @refactor-split Extracted from MobileQualityPage.tsx
 */
import React from 'react';
import { Box, Typography, Paper, Chip, List, Divider, useTheme } from '@mui/material';
import { AlertTriangle } from 'lucide-react';
import type { DefectRecord } from '@/api/mobile';
import type { ChipColor, SeverityChipColor } from '../hooks/useMobileQuality';
import i18n from '@/i18n';

interface MobileQualityDefectListProps {
  defectRecords: DefectRecord[];
  getSeverityLabel: (severity: string) => string;
  getSeverityColor: (severity: string) => SeverityChipColor;
  getStatusLabel: (status: string) => string;
  getStatusColor: (status: string) => ChipColor;
}
export const MobileQualityDefectList: React.FC<MobileQualityDefectListProps> = ({
  defectRecords,
  getSeverityLabel,
  getSeverityColor,
  getStatusLabel,
  getStatusColor,
}) => {
  const theme = useTheme();
  return (
    <List disablePadding>
      {defectRecords.map((defect, index) => (
        <React.Fragment key={defect.id}>
          <Paper
            elevation={0}
            sx={{
              mx: 2,
              my: 1,
              p: 2,
              borderRadius: 2,
              border: 1,
              borderColor: 'divider',
            }}
          >
            <Box
              sx={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                mb: 1.5,
              }}
            >
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <AlertTriangle
                  style={{
                    width: 18,
                    height: 18,
                    color:
                      defect.severity === 'critical'
                        ? theme.palette.error.main
                        : defect.severity === 'major'
                          ? theme.palette.warning.main
                          : theme.palette.info.main,
                  }}
                />
                <Typography
                  variant='subtitle2'
                  sx={{ fontWeight: 600 }}
                >
                  {defect.defect_type}
                </Typography>
              </Box>
              <Chip
                label={getSeverityLabel(defect.severity)}
                size='small'
                color={
                  getSeverityColor(defect.severity) as React.ComponentProps<typeof Chip>['color']
                }
                sx={{ height: 20, fontSize: designTokens.typography.fontSize.scale['0.7rem'] }}
              />
            </Box>
            <Typography
              variant='body2'
              sx={{ mb: 1 }}
            >
              {defect.product_name}
            </Typography>
            <Box sx={{ display: 'flex', gap: 2, mb: 1 }}>
              <Typography
                variant='caption'
                color='text.secondary'
              >
                {i18n.t('mobile.quality.label.batch_value', { batchNo: defect.batch_no })}
              </Typography>
              <Typography
                variant='caption'
                color='text.secondary'
              >
                {i18n.t('mobile.quality.label.quantity_value', { count: defect.quantity })}
              </Typography>
            </Box>
            <Typography
              variant='body2'
              color='text.secondary'
              sx={{ fontSize: designTokens.typography.fontSize.scale['0.85rem'], mb: 1.5 }}
            >
              {defect.description}
            </Typography>
            <Box
              sx={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                pt: 1,
                borderTop: 1,
                borderColor: 'divider',
              }}
            >
              <Typography
                variant='caption'
                color='text.secondary'
              >
                {defect.reporter} · {new Date(defect.reported_at).toLocaleDateString('zh-CN')}
              </Typography>
              <Chip
                label={getStatusLabel(defect.status)}
                size='small'
                color={getStatusColor(defect.status) as React.ComponentProps<typeof Chip>['color']}
                sx={{ height: 20, fontSize: designTokens.typography.fontSize.scale['0.7rem'] }}
              />
            </Box>
          </Paper>
          {index < defectRecords.length - 1 && <Divider sx={{ mx: 2 }} />}
        </React.Fragment>
      ))}
    </List>
  );
};
