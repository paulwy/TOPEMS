import React from 'react';
import { Play, CheckCircle2, AlertCircle } from 'lucide-react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Stack,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Box,
  Typography,
  TextareaAutosize,
  Paper,
  Button,
  Chip,
  TableContainer,
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
} from '@mui/material';
import { Grid } from '@/components';
import type { ParseDataRequest, ParseResult } from '@/api/lims';
import { formatJson, parseJsonInput } from '../utils';
import { designTokens } from '@/theme/tokens';

const ct= designTokens.colors;

interface ParseTestDialogProps {
  open: boolean;
  parseTestData: ParseDataRequest;
  parseTestResult: ParseResult | null;
  submitting: boolean;
  onClose: () => void;
  onParseTestDataChange: (data: ParseDataRequest) => void;
  onTestParse: () => void;
}

const ParseTestDialog: React.FC<ParseTestDialogProps> = ({
  open,
  parseTestData,
  parseTestResult,
  submitting,
  onClose,
  onParseTestDataChange,
  onTestParse,
}) => {
  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth='lg'
      fullWidth
    >
      <DialogTitle>解析测试</DialogTitle>
      <DialogContent dividers>
        <Grid
          container
          spacing={3}
          sx={{ mt: 1 }}
        >
          <Grid
            item
            xs={6}
          >
            <Stack spacing={2}>
              <FormControl fullWidth>
                <InputLabel>协议类型</InputLabel>
                <Select
                  value={parseTestData.protocol}
                  label='协议类型'
                  onChange={(e) =>
                    onParseTestDataChange({ ...parseTestData, protocol: e.target.value })
                  }
                >
                  <MenuItem value='JSON'>JSON</MenuItem>
                  <MenuItem value='HL7'>HL7</MenuItem>
                  <MenuItem value='ASTM'>ASTM</MenuItem>
                </Select>
              </FormControl>
              <Box>
                <Typography
                  variant='subtitle2'
                  color='text.secondary'
                  sx={{ mb: 1 }}
                >
                  输入数据 (JSON)
                </Typography>
                <TextareaAutosize
                  minRows={20}
                  style={{
                    width: '100%',
                    padding: 2,
                    fontFamily: 'monospace',
                    fontSize: '12px',
                    border: `1px solid ${ct.grey[300]}`,
                    borderRadius: 'xs',
                  }}
                  value={formatJson(parseTestData.raw_data)}
                  onChange={(e) =>
                    onParseTestDataChange({
                      ...parseTestData,
                      raw_data: parseJsonInput(e.target.value),
                    })
                  }
                />
              </Box>
              <Button
                variant='contained'
                startIcon={<Play size={18} />}
                onClick={onTestParse}
                disabled={submitting}
              >
                {submitting ? '解析中...' : '开始解析'}
              </Button>
            </Stack>
          </Grid>
          <Grid
            item
            xs={6}
          >
            <Stack spacing={2}>
              <Typography
                variant='subtitle2'
                color='text.secondary'
              >
                解析结果
              </Typography>
              <Paper
                variant='outlined'
                sx={{ p: 2, minHeight: 400, maxHeight: 500, overflow: 'auto' }}
              >
                {parseTestResult ? (
                  <Stack spacing={2}>
                    <Stack
                      direction='row'
                      spacing={1}
                      sx={{ alignItems: 'center' }}
                    >
                      {parseTestResult.success ? (
                        <CheckCircle2
                          color='success'
                          size={20}
                        />
                      ) : (
                        <AlertCircle
                          color='error'
                          size={20}
                        />
                      )}
                      <Typography sx={{ fontWeight: 'bold' }}>
                        {parseTestResult.success ? '解析成功' : '解析失败'}
                      </Typography>
                      {parseTestResult.quality_score !== undefined && (
                        <Chip
                          label={`质量分: ${parseTestResult.quality_score}%`}
                          size='small'
                          color='primary'
                        />
                      )}
                    </Stack>
                    {parseTestResult.error_msg && (
                      <Paper sx={{ p: 2, bgcolor: 'error.lighter' }}>
                        <Typography color='error'>{parseTestResult.error_msg}</Typography>
                      </Paper>
                    )}
                    {parseTestResult.parsed_data && (
                      <Box>
                        <Typography
                          variant='subtitle2'
                          sx={{ mb: 1 }}
                        >
                          解析数据
                        </Typography>
                        <Paper
                          variant='outlined'
                          sx={{ p: 2 }}
                        >
                          <Typography
                            component='pre'
                            variant='body2'
                            sx={{ fontFamily: 'monospace' }}
                          >
                            {formatJson(parseTestResult.parsed_data)}
                          </Typography>
                        </Paper>
                      </Box>
                    )}
                    {parseTestResult.testitems && parseTestResult.testitems.length > 0 && (
                      <Box>
                        <Typography
                          variant='subtitle2'
                          sx={{ mb: 1 }}
                        >
                          检测项目 ({parseTestResult.testitems.length})
                        </Typography>
                        <TableContainer
                          component={Paper}
                          variant='outlined'
                        >
                          <Table size='small'>
                            <TableHead>
                              <TableRow>
                                <TableCell>项目</TableCell>
                                <TableCell>结果</TableCell>
                                <TableCell>单位</TableCell>
                                <TableCell>状态</TableCell>
                              </TableRow>
                            </TableHead>
                            <TableBody>
                              {parseTestResult.testitems.map((item, idx) => (
                                <TableRow key={idx}>
                                  <TableCell>{item.testitem_name || item.testitem}</TableCell>
                                  <TableCell>{item.result || item.numeric_result || '-'}</TableCell>
                                  <TableCell>{item.unit || '-'}</TableCell>
                                  <TableCell>
                                    <Chip
                                      label={item.status || '-'}
                                      size='small'
                                      color={item.abnormal_flag ? 'warning' : 'default'}
                                    />
                                  </TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        </TableContainer>
                      </Box>
                    )}
                  </Stack>
                ) : (
                  <Box
                    sx={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      height: 300,
                    }}
                  >
                    <Typography color='text.secondary'>点击"开始解析"查看结果</Typography>
                  </Box>
                )}
              </Paper>
            </Stack>
          </Grid>
        </Grid>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>关闭</Button>
      </DialogActions>
    </Dialog>
  );
};

export default ParseTestDialog;
