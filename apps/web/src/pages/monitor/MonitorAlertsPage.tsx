import React, { useState } from 'react';
import {
  Box,
  Card,
  CardHeader,
  CardContent,
  Typography,
  Button,
  Grid,
  Chip,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  TextField,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Checkbox,
  FormGroup,
  FormControlLabel,
} from '@mui/material';
import {
  AlertTriangle,
  CheckCircle,
  Clock,
  Search,
  Filter,
  Bell,
  BellOff,
  Mail,
  Smartphone,
  Settings,
} from 'lucide-react';

interface AlertRule {
  id: string;
  name: string;
  metric: string;
  condition: string;
  threshold: string;
  severity: 'critical' | 'warning' | 'info';
  enabled: boolean;
  channels: string[];
}

interface AlertRecord {
  id: string;
  title: string;
  severity: 'critical' | 'warning' | 'info';
  source: string;
  time: string;
  status: 'open' | 'acknowledged' | 'resolved';
  rule: string;
}

export const MonitorAlertsPage: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [severityFilter, setSeverityFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [openDialog, setOpenDialog] = useState(false);

  const alertRules: AlertRule[] = [
    {
      id: 'R001',
      name: 'CPU 高使用率告警',
      metric: 'CPU',
      condition: '>',
      threshold: '85%',
      severity: 'critical',
      enabled: true,
      channels: ['推送', '邮件'],
    },
    {
      id: 'R002',
      name: '内存使用率告警',
      metric: '内存',
      condition: '>',
      threshold: '90%',
      severity: 'warning',
      enabled: true,
      channels: ['推送'],
    },
    {
      id: 'R003',
      name: '磁盘空间告警',
      metric: '磁盘',
      condition: '>',
      threshold: '80%',
      severity: 'critical',
      enabled: true,
      channels: ['推送', '邮件'],
    },
    {
      id: 'R004',
      name: 'API 响应时间告警',
      metric: 'API响应',
      condition: '>',
      threshold: '500ms',
      severity: 'warning',
      enabled: false,
      channels: ['邮件'],
    },
  ];

  const alertRecords: AlertRecord[] = [
    {
      id: 'A001',
      title: 'CPU 使用率超过 85%',
      severity: 'critical',
      source: '服务器 #01',
      time: '5分钟前',
      status: 'open',
      rule: 'CPU 高使用率告警',
    },
    {
      id: 'A002',
      title: '内存使用率超过 85%',
      severity: 'warning',
      source: '服务器 #02',
      time: '15分钟前',
      status: 'acknowledged',
      rule: '内存使用率告警',
    },
    {
      id: 'A003',
      title: '磁盘空间不足',
      severity: 'critical',
      source: '存储服务器',
      time: '30分钟前',
      status: 'open',
      rule: '磁盘空间告警',
    },
    {
      id: 'A004',
      title: 'API 响应时间超时',
      severity: 'warning',
      source: 'API 网关',
      time: '1小时前',
      status: 'resolved',
      rule: 'API 响应时间告警',
    },
    {
      id: 'A005',
      title: 'CPU 使用率超过 85%',
      severity: 'critical',
      source: '服务器 #03',
      time: '2小时前',
      status: 'resolved',
      rule: 'CPU 高使用率告警',
    },
    {
      id: 'A006',
      title: '磁盘空间接近阈值',
      severity: 'warning',
      source: '服务器 #01',
      time: '3小时前',
      status: 'resolved',
      rule: '磁盘空间告警',
    },
  ];

  const stats = [
    { label: '总告警数', value: '24', icon: <Bell size={20} />, color: 'primary' },
    { label: '严重告警', value: '3', icon: <AlertTriangle size={20} />, color: 'error' },
    { label: '待处理', value: '5', icon: <Clock size={20} />, color: 'warning' },
    { label: '已解决', value: '16', icon: <CheckCircle size={20} />, color: 'success' },
  ];

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical':
        return 'error';
      case 'warning':
        return 'warning';
      case 'info':
        return 'info';
      default:
        return 'default';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'open':
        return 'error';
      case 'acknowledged':
        return 'warning';
      case 'resolved':
        return 'success';
      default:
        return 'default';
    }
  };

  const filteredAlerts = alertRecords.filter((alert) => {
    const matchesSearch = alert.title.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesSeverity = severityFilter === 'all' || alert.severity === severityFilter;
    const matchesStatus = statusFilter === 'all' || alert.status === statusFilter;
    return matchesSearch && matchesSeverity && matchesStatus;
  });

  return (
    <Box sx={{ flex: 1 }}>
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          mb: 4,
        }}
      >
        <div>
          <Typography
            variant='h4'
            sx={{ fontWeight: 'bold', mb: 1 }}
          >
            告警通知管理
          </Typography>
          <Typography
            variant='body2'
            color='text.secondary'
          >
            管理告警规则和查看告警历史记录
          </Typography>
        </div>
        <Button
          variant='contained'
          startIcon={<Bell />}
        >
          发送测试告警
        </Button>
      </Box>

      <Grid
        container
        spacing={3}
        sx={{ mb: 4 }}
      >
        {stats.map((stat) => (
          <Grid
            size={{ xs: 6, sm: 3 }}
            key={stat.label}
          >
            <Card>
              <CardContent>
                <Box
                  sx={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 2,
                    mb: 2,
                  }}
                >
                  <Box sx={{ color: stat.color }}>{stat.icon}</Box>
                  <Typography
                    variant='caption'
                    color='text.secondary'
                  >
                    {stat.label}
                  </Typography>
                </Box>
                <Typography
                  variant='h5'
                  sx={{ fontWeight: 'bold' }}
                >
                  {stat.value}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      <Grid
        container
        spacing={3}
      >
        <Grid size={{ xs: 12, lg: 8 }}>
          <Card>
            <CardHeader
              title='告警历史'
              action={
                <Box sx={{ display: 'flex', gap: 2 }}>
                  <TextField
                    placeholder='搜索告警...'
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    size='small'
                    sx={{ width: 200 }}
                    slotProps={{
                      input: {
                        startAdornment: (
                          <Search
                            size={16}
                            sx={{ mr: 1 }}
                          />
                        ),
                      },
                    }}
                  />
                  <Box sx={{ display: 'flex', gap: 1 }}>
                    <FormControl
                      size='small'
                      sx={{ minWidth: 100 }}
                    >
                      <InputLabel>级别</InputLabel>
                      <Select
                        value={severityFilter}
                        label='级别'
                        onChange={(e) => setSeverityFilter(e.target.value)}
                      >
                        <MenuItem value='all'>全部</MenuItem>
                        <MenuItem value='critical'>严重</MenuItem>
                        <MenuItem value='warning'>警告</MenuItem>
                        <MenuItem value='info'>信息</MenuItem>
                      </Select>
                    </FormControl>
                    <FormControl
                      size='small'
                      sx={{ minWidth: 100 }}
                    >
                      <InputLabel>状态</InputLabel>
                      <Select
                        value={statusFilter}
                        label='状态'
                        onChange={(e) => setStatusFilter(e.target.value)}
                      >
                        <MenuItem value='all'>全部</MenuItem>
                        <MenuItem value='open'>未处理</MenuItem>
                        <MenuItem value='acknowledged'>已确认</MenuItem>
                        <MenuItem value='resolved'>已解决</MenuItem>
                      </Select>
                    </FormControl>
                  </Box>
                </Box>
              }
            />
            <CardContent>
              <TableContainer>
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell>告警标题</TableCell>
                      <TableCell>级别</TableCell>
                      <TableCell>来源</TableCell>
                      <TableCell>规则</TableCell>
                      <TableCell>时间</TableCell>
                      <TableCell>状态</TableCell>
                      <TableCell>操作</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {filteredAlerts.map((alert) => (
                      <TableRow key={alert.id}>
                        <TableCell>{alert.title}</TableCell>
                        <TableCell>
                          <Chip
                            size='small'
                            label={
                              alert.severity === 'critical'
                                ? '严重'
                                : alert.severity === 'warning'
                                  ? '警告'
                                  : '信息'
                            }
                            color={getSeverityColor(alert.severity)}
                          />
                        </TableCell>
                        <TableCell>{alert.source}</TableCell>
                        <TableCell>{alert.rule}</TableCell>
                        <TableCell>{alert.time}</TableCell>
                        <TableCell>
                          <Chip
                            size='small'
                            label={
                              alert.status === 'open'
                                ? '未处理'
                                : alert.status === 'acknowledged'
                                  ? '已确认'
                                  : '已解决'
                            }
                            color={getStatusColor(alert.status)}
                          />
                        </TableCell>
                        <TableCell>
                          <Box sx={{ display: 'flex', gap: 1 }}>
                            {alert.status === 'open' && <Button size='small'>确认</Button>}
                            {alert.status !== 'resolved' && (
                              <Button
                                size='small'
                                variant='contained'
                              >
                                解决
                              </Button>
                            )}
                          </Box>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </CardContent>
          </Card>
        </Grid>

        <Grid size={{ xs: 12, lg: 4 }}>
          <Card>
            <CardHeader
              title='告警规则'
              action={
                <Button
                  size='small'
                  onClick={() => setOpenDialog(true)}
                >
                  添加规则
                </Button>
              }
            />
            <CardContent>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                {alertRules.map((rule) => (
                  <Box
                    key={rule.id}
                    sx={{
                      p: 2,
                      borderRadius: 1,
                      backgroundColor: rule.enabled ? 'primary.50' : 'grey.50',
                    }}
                  >
                    <Box
                      sx={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        mb: 1,
                      }}
                    >
                      <Typography
                        variant='body1'
                        sx={{ fontWeight: 500 }}
                      >
                        {rule.name}
                      </Typography>
                      <Chip
                        size='small'
                        label={rule.enabled ? '启用' : '停用'}
                        color={rule.enabled ? 'success' : 'default'}
                        icon={rule.enabled ? <Bell size={14} /> : <BellOff size={14} />}
                      />
                    </Box>
                    <Typography
                      variant='caption'
                      color='text.secondary'
                    >
                      {rule.metric} {rule.condition} {rule.threshold}
                    </Typography>
                    <Box sx={{ display: 'flex', gap: 1, mt: 1 }}>
                      <Chip
                        size='small'
                        label={
                          rule.severity === 'critical'
                            ? '严重'
                            : rule.severity === 'warning'
                              ? '警告'
                              : '信息'
                        }
                        color={getSeverityColor(rule.severity)}
                      />
                      {rule.channels.map((channel) => (
                        <Chip
                          key={channel}
                          size='small'
                          label={channel}
                          variant='outlined'
                        />
                      ))}
                    </Box>
                  </Box>
                ))}
              </Box>
            </CardContent>
          </Card>

          <Card sx={{ mt: 3 }}>
            <CardHeader title='通知渠道配置' />
            <CardContent>
              <FormGroup>
                <FormControlLabel
                  control={<Checkbox defaultChecked />}
                  label={
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Smartphone size={14} />
                      移动端推送
                    </Box>
                  }
                />
                <FormControlLabel
                  control={<Checkbox defaultChecked />}
                  label={
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Mail size={14} />
                      邮件通知
                    </Box>
                  }
                />
                <FormControlLabel
                  control={<Checkbox />}
                  label={
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Bell size={14} />
                      系统通知
                    </Box>
                  }
                />
              </FormGroup>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      <Dialog
        open={openDialog}
        onClose={() => setOpenDialog(false)}
      >
        <DialogTitle>添加告警规则</DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3, mt: 2 }}>
            <TextField
              label='规则名称'
              placeholder='输入规则名称'
              fullWidth
            />
            <FormControl fullWidth>
              <InputLabel>监控指标</InputLabel>
              <Select
                defaultValue='cpu'
                label='监控指标'
              >
                <MenuItem value='cpu'>CPU</MenuItem>
                <MenuItem value='memory'>内存</MenuItem>
                <MenuItem value='disk'>磁盘</MenuItem>
                <MenuItem value='network'>网络</MenuItem>
                <MenuItem value='api'>API响应</MenuItem>
              </Select>
            </FormControl>
            <Grid
              container
              spacing={3}
            >
              <Grid size={{ xs: 4 }}>
                <FormControl fullWidth>
                  <InputLabel>条件</InputLabel>
                  <Select
                    defaultValue='gt'
                    label='条件'
                  >
                    <MenuItem value='gt'>&gt;</MenuItem>
                    <MenuItem value='lt'>&lt;</MenuItem>
                    <MenuItem value='eq'>=</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              <Grid size={{ xs: 8 }}>
                <TextField
                  label='阈值'
                  placeholder='输入阈值'
                  fullWidth
                />
              </Grid>
            </Grid>
            <FormControl fullWidth>
              <InputLabel>告警级别</InputLabel>
              <Select
                defaultValue='warning'
                label='告警级别'
              >
                <MenuItem value='critical'>严重</MenuItem>
                <MenuItem value='warning'>警告</MenuItem>
                <MenuItem value='info'>信息</MenuItem>
              </Select>
            </FormControl>
            <Typography
              variant='body2'
              sx={{ fontWeight: 500 }}
            >
              通知渠道
            </Typography>
            <FormGroup>
              <FormControlLabel
                control={<Checkbox defaultChecked />}
                label='移动端推送'
              />
              <FormControlLabel
                control={<Checkbox defaultChecked />}
                label='邮件通知'
              />
              <FormControlLabel
                control={<Checkbox />}
                label='系统通知'
              />
            </FormGroup>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenDialog(false)}>取消</Button>
          <Button variant='contained'>保存规则</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default MonitorAlertsPage;
