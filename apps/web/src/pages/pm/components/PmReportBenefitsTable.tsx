import React from 'react';
import { useTranslation } from 'react-i18next';
import { TrendingUp } from 'lucide-react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Badge,
} from '@mui/material';
import type { ProjectBenefit } from '@/api/pm';

export interface PmReportBenefitsTableProps {
  benefits: ProjectBenefit[];
}

const PmReportBenefitsTable: React.FC<PmReportBenefitsTableProps> = ({ benefits }) => {
  const { t } = useTranslation();

  return (
    <Box sx={{ mb: 3 }}>
      <Typography
        variant='h6'
        sx={{ fontWeight: 600, mb: 2 }}
      >
        {t('pm.pm_report_page.text_9d57d4')}
      </Typography>
      <Card>
        <CardContent>
          {benefits.length > 0 ? (
            <Box sx={{ overflowX: 'auto' }}>
              <Table size='small'>
                <TableHead>
                  <TableRow>
                    <TableCell sx={{ fontWeight: 'medium', color: 'grey.600' }}>
                      {t('pm.pm_report_page.text_2f4339')}
                    </TableCell>
                    <TableCell
                      align='right'
                      sx={{ fontWeight: 'medium', color: 'grey.600' }}
                    >
                      CPI
                    </TableCell>
                    <TableCell
                      align='right'
                      sx={{ fontWeight: 'medium', color: 'grey.600' }}
                    >
                      SPI
                    </TableCell>
                    <TableCell
                      align='right'
                      sx={{ fontWeight: 'medium', color: 'grey.600' }}
                    >
                      CV
                    </TableCell>
                    <TableCell
                      align='right'
                      sx={{ fontWeight: 'medium', color: 'grey.600' }}
                    >
                      SV
                    </TableCell>
                    <TableCell
                      align='right'
                      sx={{ fontWeight: 'medium', color: 'grey.600' }}
                    >
                      ROI
                    </TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {benefits.map((benefit, index) => (
                    <TableRow
                      key={benefit.id}
                      hover
                    >
                      <TableCell sx={{ color: 'grey.900' }}>第 {index + 1} 期</TableCell>
                      <TableCell align='right'>
                        <Badge
                          sx={{
                            bgcolor: benefit.cpi >= 1 ? 'green.100' : 'red.100',
                            color: benefit.cpi >= 1 ? 'green.800' : 'red.800',
                          }}
                        >
                          {benefit.cpi.toFixed(2)}
                        </Badge>
                      </TableCell>
                      <TableCell align='right'>
                        <Badge
                          sx={{
                            bgcolor: benefit.spi >= 1 ? 'green.100' : 'red.100',
                            color: benefit.spi >= 1 ? 'green.800' : 'red.800',
                          }}
                        >
                          {benefit.spi.toFixed(2)}
                        </Badge>
                      </TableCell>
                      <TableCell
                        align='right'
                        sx={{ color: 'grey.600' }}
                      >
                        {benefit.cv.toLocaleString()}
                      </TableCell>
                      <TableCell
                        align='right'
                        sx={{ color: 'grey.600' }}
                      >
                        {benefit.sv.toLocaleString()}
                      </TableCell>
                      <TableCell align='right'>
                        <Typography
                          component='span'
                          sx={{ color: benefit.roi >= 0 ? 'green.600' : 'red.600' }}
                        >
                          {(benefit.roi * 100).toFixed(2)}%
                        </Typography>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Box>
          ) : (
            <Box sx={{ textAlign: 'center', py: 4, color: 'grey.500' }}>
              <TrendingUp sx={{ width: 48, height: 48, mx: 'auto', mb: 2, color: 'grey.300' }} />
              <Typography>{t('pm.pm_report_page.text_8fe0ff')}</Typography>
            </Box>
          )}
        </CardContent>
      </Card>
    </Box>
  );
};

export default PmReportBenefitsTable;
