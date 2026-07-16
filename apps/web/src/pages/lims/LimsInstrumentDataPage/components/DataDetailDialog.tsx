import React from 'react';
import { RefreshCw } from 'lucide-react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Stack,
  Typography,
  Chip,
  Divider,
  Box,
  Paper,
  Button,
} from '@mui/material';
import { Grid } from '@/components';
import type { InstrumentData } from '@/api/lims';
import { getStatusColor, getStatusLabel, formatJson } from '../utils';
import type { ChipColor } from '../utils';

interface DataDetailDialogProps {
  open: boolean;
  selectedData: InstrumentData | null;
  onClose: () => void;
  onParse: (id: string) => void;
}

const DataDetailDialog: React.FC<DataDetailDialogProps> = ({
  open,
  selectedData,
  onClose,
  onParse,
}) => {
  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth='md'
      fullWidth
    >
      <DialogTitle>数据详情</DialogTitle>
      <DialogContent dividers>
        {selectedData && (
          <Stack spacing={3}>
            <Grid
              container
              spacing={2}
            >
              <Grid
                item
                xs={6}
              >
                <Typography
                  variant='subtitle2'
                  color='text.secondary'
                >
                  数据编号
                </Typography>
                <Typography>{selectedData.data_no}</Typography>
              </Grid>
              <Grid
                item
                xs={6}
              >
                <Typography
                  variant='subtitle2'
                  color='text.secondary'
                >
                  批次号
                </Typography>
                <Typography>{selectedData.batch_no}</Typography>
              </Grid>
              <Grid
                item
                xs={6}
              >
                <Typography
                  variant='subtitle2'
                  color='text.secondary'
                >
                  仪器
                </Typography>
                <Typography>{selectedData.instrument_name || '-'}</Typography>
              </Grid>
              <Grid
                item
                xs={6}
              >
                <Typography
                  variant='subtitle2'
                  color='text.secondary'
                >
                  协议
                </Typography>
                <Chip
                  label={selectedData.protocol}
                  size='small'
                />
              </Grid>
              <Grid
                item
                xs={6}
              >
                <Typography
                  variant='subtitle2'
                  color='text.secondary'
                >
                  状态
                </Typography>
                <Chip
                  label={getStatusLabel(selectedData.status)}
                  size='small'
                  color={getStatusColor(selectedData.status) as ChipColor}
                />
              </Grid>
              <Grid
                item
                xs={6}
              >
                <Typography
                  variant='subtitle2'
                  color='text.secondary'
                >
                  质量分
                </Typography>
                <Typography>
                  {selectedData.quality_score !== undefined && selectedData.quality_score !== null
                    ? `${selectedData.quality_score}%`
                    : '-'}
                </Typography>
              </Grid>
            </Grid>

            <Divider />

            <Box>
              <Typography
                variant='subtitle2'
                color='text.secondary'
                sx={{ mb: 1 }}
              >
                原始数据
              </Typography>
              <Paper
                variant='outlined'
                sx={{ p: 2, maxHeight: 200, overflow: 'auto' }}
              >
                <Typography
                  component='pre'
                  variant='body2'
                  sx={{ fontFamily: 'monospace' }}
                >
                  {formatJson(selectedData.raw_data)}
                </Typography>
              </Paper>
            </Box>

            {selectedData.parsed_data && (
              <Box>
                <Typography
                  variant='subtitle2'
                  color='text.secondary'
                  sx={{ mb: 1 }}
                >
                  解析结果
                </Typography>
                <Paper
                  variant='outlined'
                  sx={{ p: 2, maxHeight: 200, overflow: 'auto' }}
                >
                  <Typography
                    component='pre'
                    variant='body2'
                    sx={{ fontFamily: 'monospace' }}
                  >
                    {formatJson(selectedData.parsed_data)}
                  </Typography>
                </Paper>
              </Box>
            )}

            {selectedData.error_msg && (
              <Box>
                <Typography
                  variant='subtitle2'
                  color='text.secondary'
                  sx={{ mb: 1 }}
                >
                  错误信息
                </Typography>
                <Paper
                  variant='outlined'
                  sx={{ p: 2, bgcolor: 'error.lighter' }}
                >
                  <Typography color='error'>{selectedData.error_msg}</Typography>
                </Paper>
              </Box>
            )}
          </Stack>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>关闭</Button>
        {(selectedData?.status === 'pending' || selectedData?.status === 'failed') && (
          <Button
            variant='contained'
            startIcon={<RefreshCw size={18} />}
            onClick={() => {
              if (selectedData) {
                onParse(selectedData.id);
                onClose();
              }
            }}
          >
            重新解析
          </Button>
        )}
      </DialogActions>
    </Dialog>
  );
};

export default DataDetailDialog;
