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
  FormControlLabel,
  Switch,
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
} from '@mui/material';
import {
  Bell,
  BellOff,
  MessageSquare,
  Mail,
  Smartphone,
  Clock,
  CheckCircle,
  AlertCircle,
  RefreshCw,
} from 'lucide-react';

interface NotificationType {
  id: string;
  name: string;
  description: string;
  enabled: boolean;
  pushEnabled: boolean;
  emailEnabled: boolean;
  icon: React.ReactNode;
}

interface NotificationHistory {
  id: string;
  title: string;
  type: string;
  recipient: string;
  status: 'sent' | 'delivered' | 'failed' | 'read';
  sentAt: string;
  deliveryTime?: string;
}

export const NotificationSettingsPage: React.FC = () => {
  const [notificationTypes, setNotificationTypes] = useState<NotificationType[]>([
    {
      id: 'task-assignment',
      name: '任务分配',
      description: '新任务分配通知',
      enabled: true,
      pushEnabled: true,
      emailEnabled: false,
      icon: <MessageSquare size={20} />,
    },
    {
      id: 'task-update',
      name: '任务更新',
      description: '任务状态变更通知',
      enabled: true,
      pushEnabled: true,
      emailEnabled: false,
      icon: <RefreshCw size={20} />,
    },
    {
      id: 'approval',
      name: '审批通知',
      description: '审批流程相关通知',
      enabled: true,
      pushEnabled: true,
      emailEnabled: true,
      icon: <Bell size={20} />,
    },
    {
      id: 'alert',
      name: '告警通知',
      description: '系统告警和异常通知',
      enabled: true,
      pushEnabled: true,
      emailEnabled: true,
      icon: <AlertCircle size={20} />,
    },
    {
      id: 'news',
      name: '系统公告',
      description: '系统更新和公告通知',
      enabled: false,
      pushEnabled: false,
      emailEnabled: false,
      icon: <Mail size={20} />,
    },
  ]);

  const [priority, setPriority] = useState('high');

  const notificationHistory: NotificationHistory[] = [
    {
      id: '1',
      title: '新任务分配：巡检任务 #20240115',
      type: '任务分配',
      recipient: '张三',
      status: 'delivered',
      sentAt: '2024-01-15 10:30:00',
      deliveryTime: '2秒',
    },
    {
      id: '2',
      title: '审批通过：采购申请 #PR20240012',
      type: '审批通知',
      recipient: '李四',
      status: 'read',
      sentAt: '2024-01-15 10:25:00',
      deliveryTime: '1秒',
    },
    {
      id: '3',
      title: '系统告警：设备 #003 异常',
      type: '告警通知',
      recipient: '王五',
      status: 'sent',
      sentAt: '2024-01-15 10:20:00',
    },
    {
      id: '4',
      title: '任务完成：质检任务 #QC20240056',
      type: '任务更新',
      recipient: '赵六',
      status: 'failed',
      sentAt: '2024-01-15 10:15:00',
    },
  ];

  const toggleNotificationType = (
    id: string,
    field: 'enabled' | 'pushEnabled' | 'emailEnabled'
  ) => {
    setNotificationTypes((prev) =>
      prev.map((type) => (type.id === id ? { ...type, [field]: !type[field] } : type))
    );
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'delivered':
        return 'success';
      case 'read':
        return 'primary';
      case 'sent':
        return 'warning';
      case 'failed':
        return 'error';
      default:
        return 'default';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'delivered':
        return '已送达';
      case 'read':
        return '已阅读';
      case 'sent':
        return '已发送';
      case 'failed':
        return '发送失败';
      default:
        return status;
    }
  };

  const stats = [
    {
      label: '今日发送',
      value: '128',
      icon: <Bell size={20} />,
      color: 'primary',
    },
    {
      label: '已送达',
      value: '115',
      icon: <CheckCircle size={20} />,
      color: 'success',
    },
    {
      label: '已阅读',
      value: '89',
      icon: <Smartphone size={20} />,
      color: 'primary',
    },
    {
      label: '发送失败',
      value: '3',
      icon: <AlertCircle size={20} />,
      color: 'error',
    },
  ];

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
            通知推送设置
          </Typography>
          <Typography
            variant='body2'
            color='text.secondary'
          >
            管理移动端推送通知类型和发送策略
          </Typography>
        </div>
        <Button
          variant='contained'
          startIcon={<RefreshCw />}
        >
          测试推送
        </Button>
      </Box>

      <Grid
        container
        spacing={3}
        sx={{ mb: 4 }}
      >
        {stats.map((stat) => (
          <Grid
            item
            xs={6}
            sm={3}
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
        <Grid
          item
          xs={12}
          lg={5}
        >
          <Card>
            <CardHeader title='通知类型配置' />
            <CardContent>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                {notificationTypes.map((type) => (
                  <Box
                    key={type.id}
                    sx={{
                      p: 2,
                      borderRadius: 1,
                      backgroundColor: type.enabled ? 'primary.50' : 'grey.50',
                    }}
                  >
                    <Box
                      sx={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        mb: 2,
                      }}
                    >
                      <Box
                        sx={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: 2,
                        }}
                      >
                        {type.icon}
                        <div>
                          <Typography
                            variant='body1'
                            sx={{ fontWeight: 500 }}
                          >
                            {type.name}
                          </Typography>
                          <Typography
                            variant='caption'
                            color='text.secondary'
                          >
                            {type.description}
                          </Typography>
                        </div>
                      </Box>
                      <Switch
                        checked={type.enabled}
                        onChange={() => toggleNotificationType(type.id, 'enabled')}
                      />
                    </Box>
                    {type.enabled && (
                      <Box
                        sx={{
                          display: 'flex',
                          gap: 4,
                          pl: 3,
                        }}
                      >
                        <Box
                          sx={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: 1,
                          }}
                        >
                          <Smartphone size={14} />
                          <FormControlLabel
                            control={
                              <Switch
                                checked={type.pushEnabled}
                                onChange={() => toggleNotificationType(type.id, 'pushEnabled')}
                                size='small'
                              />
                            }
                            label='推送'
                          />
                        </Box>
                        <Box
                          sx={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: 1,
                          }}
                        >
                          <Mail size={14} />
                          <FormControlLabel
                            control={
                              <Switch
                                checked={type.emailEnabled}
                                onChange={() => toggleNotificationType(type.id, 'emailEnabled')}
                                size='small'
                              />
                            }
                            label='邮件'
                          />
                        </Box>
                      </Box>
                    )}
                  </Box>
                ))}
              </Box>
            </CardContent>
          </Card>

          <Card sx={{ mt: 3 }}>
            <CardHeader title='推送优先级' />
            <CardContent>
              <FormControl fullWidth>
                <InputLabel>默认优先级</InputLabel>
                <Select
                  value={priority}
                  label='默认优先级'
                  onChange={(e) => setPriority(e.target.value)}
                >
                  <MenuItem value='high'>高优先级</MenuItem>
                  <MenuItem value='normal'>正常优先级</MenuItem>
                  <MenuItem value='low'>低优先级</MenuItem>
                </Select>
              </FormControl>
            </CardContent>
          </Card>
        </Grid>

        <Grid
          item
          xs={12}
          lg={7}
        >
          <Card>
            <CardHeader
              title='推送历史'
              subheader='最近的推送记录'
            />
            <CardContent>
              <TableContainer>
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell>标题</TableCell>
                      <TableCell>类型</TableCell>
                      <TableCell>接收人</TableCell>
                      <TableCell>状态</TableCell>
                      <TableCell>发送时间</TableCell>
                      <TableCell>送达耗时</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {notificationHistory.map((record) => (
                      <TableRow key={record.id}>
                        <TableCell>{record.title}</TableCell>
                        <TableCell>
                          <Chip
                            size='small'
                            label={record.type}
                          />
                        </TableCell>
                        <TableCell>{record.recipient}</TableCell>
                        <TableCell>
                          <Chip
                            size='small'
                            label={getStatusLabel(record.status)}
                            color={getStatusColor(record.status)}
                            icon={
                              record.status === 'delivered' || record.status === 'read' ? (
                                <CheckCircle size={14} />
                              ) : record.status === 'failed' ? (
                                <AlertCircle size={14} />
                              ) : null
                            }
                          />
                        </TableCell>
                        <TableCell>{record.sentAt}</TableCell>
                        <TableCell>{record.deliveryTime || '-'}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
};

export default NotificationSettingsPage;
