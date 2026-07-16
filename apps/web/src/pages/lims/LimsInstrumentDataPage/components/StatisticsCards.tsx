import React from 'react';
import type { LucideIcon } from 'lucide-react';
import { Database, Activity, Play, Settings } from 'lucide-react';
import { Card, CardContent, Stack, Box, Typography } from '@mui/material';
import { Grid } from '@/components';
import type { InstrumentDataStatistics } from '@/api/lims';

const StatCard = ({
  title,
  value,
  icon: Icon,
  color,
}: {
  title: string;
  value: number | string;
  icon: LucideIcon;
  color: string;
}) => (
  <Card sx={{ height: '100%' }}>
    <CardContent>
      <Stack
        direction='row'
        spacing={2}
        sx={{ alignItems: 'center' }}
      >
        <Box
          sx={{
            width: 48,
            height: 48,
            borderRadius: 3,
            bgcolor: `${color}.lighter`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Icon
            color={color}
            size={24}
          />
        </Box>
        <Box>
          <Typography
            variant='h4'
            sx={{ fontWeight: 'bold' }}
          >
            {value}
          </Typography>
          <Typography
            variant='body2'
            color='text.secondary'
          >
            {title}
          </Typography>
        </Box>
      </Stack>
    </CardContent>
  </Card>
);

interface StatisticsCardsProps {
  statistics: InstrumentDataStatistics;
}

const StatisticsCards: React.FC<StatisticsCardsProps> = ({ statistics }) => {
  return (
    <Grid
      container
      spacing={3}
      sx={{ mb: 3 }}
    >
      <Grid
        item
        xs={12}
        sm={6}
        md={3}
      >
        <StatCard
          title='数据总条数'
          value={statistics.total_data_count}
          icon={Database}
          color='primary'
        />
      </Grid>
      <Grid
        item
        xs={12}
        sm={6}
        md={3}
      >
        <StatCard
          title='今日采集'
          value={statistics.today_count}
          icon={Activity}
          color='success'
        />
      </Grid>
      <Grid
        item
        xs={12}
        sm={6}
        md={3}
      >
        <StatCard
          title='采集任务'
          value={statistics.total_tasks}
          icon={Play}
          color='info'
        />
      </Grid>
      <Grid
        item
        xs={12}
        sm={6}
        md={3}
      >
        <StatCard
          title='解析规则'
          value={statistics.total_rules}
          icon={Settings}
          color='warning'
        />
      </Grid>
    </Grid>
  );
};

export default StatisticsCards;
