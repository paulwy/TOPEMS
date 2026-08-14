/**
 * @done V80 split
 * Four stat cards summarizing BI permission counts.
 */
import React from 'react';
import { Box, Card, CardContent, Typography, Grid } from '@mui/material';
import { Shield, Database, CheckCircle2, Users } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { designTokens } from '@/theme/tokens';

const ct= designTokens.colors;

export interface BiPermissionStatsCardsProps {
  rowPermissionsCount: number;
  dataPermissionsCount: number;
  enabledRowPermissionsCount: number;
}

const BiPermissionStatsCards: React.FC<BiPermissionStatsCardsProps> = ({
  rowPermissionsCount,
  dataPermissionsCount,
  enabledRowPermissionsCount,
}) => {
  const { t } = useTranslation();

  return (
    <Grid
      container
      spacing={3}
      sx={{ mb: 4 }}
    >
      <Grid size={{ xs: 12, sm: 6, md: 3 }}>
        <Card>
          <CardContent>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <Box
                sx={{
                  width: 48,
                  height: 48,
                  borderRadius: 1,
                  backgroundColor: ct.error[50],
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Shield
                  sx={{ color: 'error.main' }}
                  size={24}
                />
              </Box>
              <Box>
                <Typography
                  variant='h5'
                  sx={{ fontWeight: 700 }}
                >
                  {rowPermissionsCount}
                </Typography>
                <Typography
                  variant='body2'
                  color='text.secondary'
                >
                  {t('bi.bi_permission_page.text_ae1917')}
                </Typography>
              </Box>
            </Box>
          </CardContent>
        </Card>
      </Grid>
      <Grid size={{ xs: 12, sm: 6, md: 3 }}>
        <Card>
          <CardContent>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <Box
                sx={{
                  width: 48,
                  height: 48,
                  borderRadius: 1,
                  backgroundColor: 'primary.50',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Database
                  sx={{ color: 'primary.main' }}
                  size={24}
                />
              </Box>
              <Box>
                <Typography
                  variant='h5'
                  sx={{ fontWeight: 700 }}
                >
                  {dataPermissionsCount}
                </Typography>
                <Typography
                  variant='body2'
                  color='text.secondary'
                >
                  {t('bi.bi_permission_page.text_9f56c8')}
                </Typography>
              </Box>
            </Box>
          </CardContent>
        </Card>
      </Grid>
      <Grid size={{ xs: 12, sm: 6, md: 3 }}>
        <Card>
          <CardContent>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <Box
                sx={{
                  width: 48,
                  height: 48,
                  borderRadius: 1,
                  backgroundColor: ct.success[100],
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <CheckCircle2
                  sx={{ color: 'success.main' }}
                  size={24}
                />
              </Box>
              <Box>
                <Typography
                  variant='h5'
                  sx={{ fontWeight: 700 }}
                >
                  {enabledRowPermissionsCount}
                </Typography>
                <Typography
                  variant='body2'
                  color='text.secondary'
                >
                  {t('bi.bi_permission_page.text_2f54ee')}
                </Typography>
              </Box>
            </Box>
          </CardContent>
        </Card>
      </Grid>
      <Grid size={{ xs: 12, sm: 6, md: 3 }}>
        <Card>
          <CardContent>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <Box
                sx={{
                  width: 48,
                  height: 48,
                  borderRadius: 1,
                  backgroundColor: 'warning.100',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Users
                  sx={{ color: 'warning.dark' }}
                  size={24}
                />
              </Box>
              <Box>
                <Typography
                  variant='h5'
                  sx={{ fontWeight: 700 }}
                >
                  8
                </Typography>
                <Typography
                  variant='body2'
                  color='text.secondary'
                >
                  {t('bi.bi_permission_page.text_c23dd1')}
                </Typography>
              </Box>
            </Box>
          </CardContent>
        </Card>
      </Grid>
    </Grid>
  );
};

export default BiPermissionStatsCards;
