import React from 'react';
import { useTranslation } from 'react-i18next';
import { Box, Typography } from '@mui/material';
import { Table, Download } from 'lucide-react';

interface Stats {
  tableCount: number;
  backupCount: number;
}

interface DatabaseManagementStatsProps {
  stats: Stats;
}

export const DatabaseManagementStats: React.FC<DatabaseManagementStatsProps> = ({ stats }) => {
  const { t } = useTranslation();

  return (
    <Box
      sx={{
        display: 'grid',
        gridTemplateColumns: { xs: 2, md: 4 },
        gap: 2,
        mb: 3,
      }}
    >
      {[
        {
          label: t('erp.database.label.table_count'),
          value: stats.tableCount,
          icon: <Table size={20} />,
          color: 'primary',
          bg: 'primary.100',
        },
        {
          label: t('erp.database.label.available_backups'),
          value: stats.backupCount,
          icon: <Download size={20} />,
          color: 'info',
          bg: 'info.100',
        },
      ].map((stat) => (
        <Box
          key={stat.label}
          sx={{
            p: 2.5,
            bgcolor: 'background.paper',
            borderRadius: 3,
            boxShadow: 1,
            display: 'flex',
            alignItems: 'center',
            gap: 2,
          }}
        >
          <Box
            sx={{
              p: 1.5,
              borderRadius: 1.5,
              bgcolor: stat.bg,
              color: `${stat.color}.main`,
            }}
          >
            {stat.icon}
          </Box>
          <Box>
            <Typography
              variant='body2'
              sx={{ color: 'text.secondary' }}
            >
              {stat.label}
            </Typography>
            <Typography
              variant='h6'
              sx={{ fontWeight: 'bold' }}
            >
              {stat.value}
            </Typography>
          </Box>
        </Box>
      ))}
    </Box>
  );
};
