import React from 'react';
import { FileText, Save, AlertCircle } from 'lucide-react';
import {
  Box,
  Typography,
  Button,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Switch,
  FormControlLabel,
  Card,
  CardContent,
  CardHeader,
  Chip,
} from '@mui/material';
import { Grid } from '@/components/common';

interface LogConfigType {
  level: 'trace' | 'debug' | 'info' | 'warn' | 'error' | 'fatal';
  format: 'json' | 'text';
  output: 'console' | 'file' | 'both';
  file_path: string;
  max_file_size_mb: number;
  max_files: number;
  log_to_db: boolean;
  console_enabled: boolean;
  remote_logging_enabled: boolean;
  remote_logging_url: string;
}

interface LogConfigPanelProps {
  logConfig: LogConfigType;
  setLogConfig: React.Dispatch<React.SetStateAction<LogConfigType>>;
  onSave: () => void;
  isSaving: boolean;
}

const LogConfigPanel: React.FC<LogConfigPanelProps> = ({
  logConfig,
  setLogConfig,
  onSave,
  isSaving,
}) => {
  return (
    <Box sx={{ mt: 2 }}>
      <Card sx={{ mb: 3 }}>
        <CardHeader
          title={
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
              <Box
                sx={{
                  width: 36,
                  height: 36,
                  borderRadius: 1,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  bgcolor: 'primary.light',
                  color: 'primary.main',
                }}
              >
                <FileText size={20} />
              </Box>
              <Box>
                <Typography
                  variant='subtitle1'
                  sx={{ fontWeight: 600 }}
                >
                  日志级别和格式
                </Typography>
                <Typography
                  variant='caption'
                  color='text.secondary'
                >
                  控制日志输出级别和格式
                </Typography>
              </Box>
            </Box>
          }
        />
        <CardContent>
          <Grid
            container
            spacing={3}
          >
            <Grid
              xs={12}
              sm={6}
            >
              <FormControl fullWidth>
                <InputLabel>日志级别</InputLabel>
                <Select
                  value={logConfig.level}
                  label='日志级别'
                  onChange={(e) =>
                    setLogConfig((prev) => ({
                      ...prev,
                      level: e.target.value as typeof logConfig.level,
                    }))
                  }
                >
                  <MenuItem value='trace'>Trace</MenuItem>
                  <MenuItem value='debug'>Debug</MenuItem>
                  <MenuItem value='info'>Info</MenuItem>
                  <MenuItem value='warn'>Warn</MenuItem>
                  <MenuItem value='error'>Error</MenuItem>
                  <MenuItem value='fatal'>Fatal</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid
              xs={12}
              sm={6}
            >
              <FormControl fullWidth>
                <InputLabel>日志格式</InputLabel>
                <Select
                  value={logConfig.format}
                  label='日志格式'
                  onChange={(e) =>
                    setLogConfig((prev) => ({
                      ...prev,
                      format: e.target.value as typeof logConfig.format,
                    }))
                  }
                >
                  <MenuItem value='json'>JSON</MenuItem>
                  <MenuItem value='text'>文本</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid
              xs={12}
              sm={6}
            >
              <FormControl fullWidth>
                <InputLabel>输出方式</InputLabel>
                <Select
                  value={logConfig.output}
                  label='输出方式'
                  onChange={(e) =>
                    setLogConfig((prev) => ({
                      ...prev,
                      output: e.target.value as typeof logConfig.output,
                    }))
                  }
                >
                  <MenuItem value='console'>仅控制台</MenuItem>
                  <MenuItem value='file'>仅文件</MenuItem>
                  <MenuItem value='both'>控制台和文件</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid
              xs={12}
              sm={6}
            >
              <FormControlLabel
                control={
                  <Switch
                    checked={logConfig.log_to_db}
                    onChange={(e) =>
                      setLogConfig((prev) => ({
                        ...prev,
                        log_to_db: e.target.checked,
                      }))
                    }
                  />
                }
                label='记录到数据库'
              />
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      <Card sx={{ mb: 3 }}>
        <CardHeader
          title={
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
              <Box
                sx={{
                  width: 36,
                  height: 36,
                  borderRadius: 1,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  bgcolor: 'warning.light',
                  color: 'warning.main',
                }}
              >
                <FileText size={20} />
              </Box>
              <Box>
                <Typography
                  variant='subtitle1'
                  sx={{ fontWeight: 600 }}
                >
                  文件输出配置
                </Typography>
                <Typography
                  variant='caption'
                  color='text.secondary'
                >
                  日志文件存储路径和滚动策略
                </Typography>
              </Box>
            </Box>
          }
        />
        <CardContent>
          <Grid
            container
            spacing={3}
          >
            <Grid xs={12}>
              <FormControlLabel
                control={
                  <Switch
                    checked={logConfig.output !== 'console'}
                    disabled
                  />
                }
                label={
                  <span>
                    文件输出
                    <Chip
                      label={logConfig.output === 'console' ? '已禁用' : '已启用'}
                      size='small'
                      sx={{ ml: 2 }}
                      color={logConfig.output === 'console' ? 'default' : 'success'}
                    />
                  </span>
                }
              />
            </Grid>
            <Grid
              xs={12}
              sm={6}
            >
              <TextField
                fullWidth
                label='日志文件路径'
                value={logConfig.file_path}
                onChange={(e) =>
                  setLogConfig((prev) => ({
                    ...prev,
                    file_path: e.target.value,
                  }))
                }
                placeholder='/var/log/topems/app.log'
                disabled={logConfig.output === 'console'}
              />
            </Grid>
            <Grid
              xs={12}
              sm={6}
            >
              <TextField
                fullWidth
                label='单文件最大大小(MB)'
                type='number'
                value={logConfig.max_file_size_mb}
                onChange={(e) =>
                  setLogConfig((prev) => ({
                    ...prev,
                    max_file_size_mb: parseInt(e.target.value) || 100,
                  }))
                }
                disabled={logConfig.output === 'console'}
              />
            </Grid>
            <Grid
              xs={12}
              sm={6}
            >
              <TextField
                fullWidth
                label='保留文件数量'
                type='number'
                value={logConfig.max_files}
                onChange={(e) =>
                  setLogConfig((prev) => ({
                    ...prev,
                    max_files: parseInt(e.target.value) || 10,
                  }))
                }
                disabled={logConfig.output === 'console'}
              />
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      <Card sx={{ mb: 3 }}>
        <CardHeader
          title={
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
              <Box
                sx={{
                  width: 36,
                  height: 36,
                  borderRadius: 1,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  bgcolor: 'error.light',
                  color: 'error.main',
                }}
              >
                <AlertCircle size={20} />
              </Box>
              <Box>
                <Typography
                  variant='subtitle1'
                  sx={{ fontWeight: 600 }}
                >
                  高级配置
                </Typography>
                <Typography
                  variant='caption'
                  color='text.secondary'
                >
                  控制台和远程日志配置
                </Typography>
              </Box>
            </Box>
          }
        />
        <CardContent>
          <Grid
            container
            spacing={3}
          >
            <Grid
              xs={12}
              sm={6}
            >
              <FormControlLabel
                control={
                  <Switch
                    checked={logConfig.console_enabled}
                    onChange={(e) =>
                      setLogConfig((prev) => ({
                        ...prev,
                        console_enabled: e.target.checked,
                      }))
                    }
                  />
                }
                label='控制台输出'
              />
            </Grid>
            <Grid
              xs={12}
              sm={6}
            >
              <FormControlLabel
                control={
                  <Switch
                    checked={logConfig.remote_logging_enabled}
                    onChange={(e) =>
                      setLogConfig((prev) => ({
                        ...prev,
                        remote_logging_enabled: e.target.checked,
                      }))
                    }
                  />
                }
                label='远程日志'
              />
            </Grid>
            <Grid xs={12}>
              <TextField
                fullWidth
                label='远程日志URL'
                value={logConfig.remote_logging_url}
                onChange={(e) =>
                  setLogConfig((prev) => ({
                    ...prev,
                    remote_logging_url: e.target.value,
                  }))
                }
                placeholder='https://logs.example.com/api'
                disabled={!logConfig.remote_logging_enabled}
              />
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 2 }}>
        <Button
          variant='contained'
          startIcon={<Save size={16} />}
          onClick={onSave}
          disabled={isSaving}
        >
          {isSaving ? '保存中...' : '保存配置'}
        </Button>
      </Box>
    </Box>
  );
};

export default LogConfigPanel;
