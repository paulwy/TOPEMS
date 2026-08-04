import React from 'react';
import { Box, Chip, CircularProgress, Divider, Paper, Typography, Stack } from '@mui/material';
import { Cpu, PlayCircle, Wrench, XCircle } from 'lucide-react';
import { PieChart } from '@/components/charts';
import type { EquipmentStatusBucket } from '../types';

const EquipmentStatusPanel: React.FC<{
  buckets: EquipmentStatusBucket[];
  total: number;
  loading?: boolean;
}> = ({ buckets, total, loading }) => {
  const running = buckets.find((b) => b.status === 'running' || b.status === 'in_use');
  const maintenance = buckets.find((b) => b.status === 'maintenance');
  const fault = buckets.find((b) => b.status === 'fault' || b.status === 'error');

  return (
    <Paper
      elevation={0}
      sx={{
        p: 2.5,
        borderRadius: 3,
        border: '1px solid',
        borderColor: 'grey.200',
        height: '100%',
      }}
    >
      <Stack
        direction='row'
        sx={{ alignItems: 'center', justifyContent: 'space-between', mb: 2 }}
      >
        <Stack
          direction='row'
          spacing={1}
          sx={{ alignItems: 'center' }}
        >
          <Cpu
            size={18}
            color='secondary.main'
          />
          <Typography
            variant='subtitle1'
            sx={{ fontWeight: 600 }}
          >
            设备运行状态
          </Typography>
        </Stack>
        <Typography
          variant='caption'
          sx={{ color: 'text.secondary' }}
        >
          合计 {total} 台
        </Typography>
      </Stack>
      <Divider sx={{ mb: 2 }} />
      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
          <CircularProgress size={24} />
        </Box>
      ) : (
        <>
          <Stack
            direction='row'
            spacing={1}
            sx={{ alignItems: 'center', mb: 2, flexWrap: 'wrap' }}
          >
            <Chip
              icon={<PlayCircle size={14} />}
              label={`运行 ${running?.count ?? 0}`}
              color='success'
              variant='outlined'
              size='small'
            />
            <Chip
              icon={<Wrench size={14} />}
              label={`维护 ${maintenance?.count ?? 0}`}
              color='warning'
              variant='outlined'
              size='small'
            />
            <Chip
              icon={<XCircle size={14} />}
              label={`故障 ${fault?.count ?? 0}`}
              color='error'
              variant='outlined'
              size='small'
            />
          </Stack>
          <Box sx={{ height: 220 }}>
            <PieChart
              data={buckets.map((b) => ({ name: b.label, value: b.count, color: b.color }))}
            />
          </Box>
        </>
      )}
    </Paper>
  );
};

export default EquipmentStatusPanel;
