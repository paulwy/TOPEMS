import React from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Stack,
  Avatar,
  Chip,
  Button,
  Grid,
} from '@mui/material';
import {
  Users,
  CalendarDays,
  UserCheck,
  DollarSign,
  Calendar,
  Car,
  ChevronRight,
  Package,
  Bell,
  FileText,
  Briefcase,
  CalendarCheck,
} from 'lucide-react';
import { PageContainer } from '@/components/common';

const STATUS_STYLES: Record<string, { bg: string; color: string; label: string }> = {
  pending: { bg: 'warning.light', color: 'warning.dark', label: '待审批' },
  approved: { bg: 'success.light', color: 'success.dark', label: '已批准' },
  rejected: { bg: 'error.light', color: 'error.dark', label: '已拒绝' },
  published: { bg: 'info.light', color: 'info.dark', label: '已发布' },
  draft: { bg: 'grey.200', color: 'grey.700', label: '草稿' },
  confirmed: { bg: 'success.light', color: 'success.dark', label: '已确认' },
  cancelled: { bg: 'grey.200', color: 'grey.700', label: '已取消' },
};

const StatusBadge: React.FC<{ status: string }> = ({ status }) => {
  const config = STATUS_STYLES[status] || {
    bg: 'grey.200',
    color: 'grey.700',
    label: status,
  };
  return (
    <Chip
      size='small'
      label={config.label}
      sx={{ bgcolor: config.bg, color: config.color, fontWeight: 500 }}
    />
  );
};

interface StatCardData {
  label: string;
  value: number;
  color: string;
  icon: React.ReactNode;
  bg: string;
}

interface Announcement {
  id: string;
  title: string;
  content: string;
  author: string;
  status: string;
  created_at: string;
}

interface MeetingBooking {
  id: string;
  title: string;
  room_name: string;
  organizer: string;
  start_time: string;
  end_time: string;
  status: string;
}

interface QuickAction {
  label: string;
  icon: React.ReactNode;
  color: string;
  bg: string;
  path: string;
}

const mockStats = {
  employees: 156,
  pendingLeaves: 8,
  todayAttendance: 142,
  pendingExpenses: 12,
  meetingRooms: 6,
  vehicles: 10,
};

const mockAnnouncements: Announcement[] = [
  {
    id: '1',
    title: '关于2026年端午节放假安排的通知',
    content:
      '根据国务院办公厅通知精神，结合公司实际情况，现将2026年端午节放假安排通知如下：6月19日至6月21日放假调休，共3天。6月22日（星期日）上班。',
    author: '人力资源部',
    status: 'published',
    created_at: '2026-06-15',
  },
  {
    id: '2',
    title: '办公区域消防安全检查通知',
    content:
      '为进一步加强办公区域消防安全管理，消除火灾隐患，公司定于本周五（6月20日）下午14:00-17:00进行消防安全专项检查，请各部门提前做好准备。',
    author: '行政部',
    status: 'published',
    created_at: '2026-06-16',
  },
  {
    id: '3',
    title: '新版OA系统上线试运行通知',
    content:
      '为提升办公效率，新版OA系统将于7月1日正式上线试运行。试运行期间新旧系统并行，请各部门员工积极使用并反馈问题。',
    author: '信息技术部',
    status: 'published',
    created_at: '2026-06-17',
  },
];

const today = new Date().toISOString().split('T')[0];
const mockMeetingBookings: MeetingBooking[] = [
  {
    id: '1',
    title: '产品需求评审会议',
    room_name: '会议室A',
    organizer: '张三',
    start_time: `${today} 09:00`,
    end_time: `${today} 10:30`,
    status: 'confirmed',
  },
  {
    id: '2',
    title: 'Q2季度工作总结会',
    room_name: '大会议室',
    organizer: '李四',
    start_time: `${today} 14:00`,
    end_time: `${today} 16:00`,
    status: 'confirmed',
  },
  {
    id: '3',
    title: '技术方案讨论',
    room_name: '会议室B',
    organizer: '王五',
    start_time: `${today} 16:30`,
    end_time: `${today} 17:30`,
    status: 'confirmed',
  },
];

const quickActions: QuickAction[] = [
  { label: '请假申请', icon: <CalendarDays />, color: 'orange', bg: '#ffedd5', path: '/oa/leave' },
  {
    label: '报销申请',
    icon: <DollarSign />,
    color: 'indigo',
    bg: 'secondary.light',
    path: '/oa/expense',
  },
  { label: '会议室预订', icon: <Calendar />, color: 'blue', bg: '#dbeafe', path: '/oa/meeting' },
  { label: '办公用品', icon: <Package />, color: 'teal', bg: '#ccfbf1', path: '/oa/supplies' },
  { label: '车辆预约', icon: <Car />, color: 'red', bg: 'error.lighter', path: '/oa/vehicle' },
  { label: '公告通知', icon: <Bell />, color: 'purple', bg: '#f3e8ff', path: '/oa/announcement' },
  { label: '考勤查询', icon: <UserCheck />, color: 'green', bg: '#dcfce7', path: '/oa/attendance' },
  { label: '证明开具', icon: <FileText />, color: 'amber', bg: '#fef3c7', path: '/oa/certificate' },
];

const statCards: StatCardData[] = [
  {
    label: '员工数量',
    value: mockStats.employees,
    color: 'purple',
    icon: <Users />,
    bg: '#f3e8ff',
  },
  {
    label: '待审批请假',
    value: mockStats.pendingLeaves,
    color: 'orange',
    icon: <CalendarDays />,
    bg: '#ffedd5',
  },
  {
    label: '今日考勤',
    value: mockStats.todayAttendance,
    color: 'teal',
    icon: <UserCheck />,
    bg: '#ccfbf1',
  },
  {
    label: '待审批报销',
    value: mockStats.pendingExpenses,
    color: 'indigo',
    icon: <DollarSign />,
    bg: 'secondary.light',
  },
  {
    label: '会议室',
    value: mockStats.meetingRooms,
    color: 'blue',
    icon: <Calendar />,
    bg: '#dbeafe',
  },
  {
    label: '车辆',
    value: mockStats.vehicles,
    color: 'red',
    icon: <Car />,
    bg: 'error.lighter',
  },
];

export const AdministrationDashboardPage: React.FC = () => {
  return (
    <PageContainer
      title='行政概览'
      headerProps={{
        pageIcon: <CalendarCheck style={{ width: 20, height: 20 }} />,
        pageGradient: 'linear-gradient(135deg, #06B6D4 0%, #0891B2 100%)',
      }}
    >
      <Stack spacing={3}>
        <Grid
          container
          spacing={2}
        >
          {statCards.map((stat) => (
            <Grid
              key={stat.label}
              size={{ xs: 6, sm: 4, md: 2 }}
            >
              <Card
                sx={{
                  boxShadow: 1,
                  p: 2.5,
                  borderRadius: 3,
                  transition: 'box-shadow 0.2s',
                  '&:hover': { boxShadow: 3 },
                }}
              >
                <Box
                  sx={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                  }}
                >
                  <Box>
                    <Typography
                      variant='body2'
                      color='text.secondary'
                      sx={{ mb: 0.5 }}
                    >
                      {stat.label}
                    </Typography>
                    <Typography
                      variant='h5'
                      component='div'
                      sx={{ fontWeight: 'bold' }}
                    >
                      {stat.value}
                    </Typography>
                  </Box>
                  <Avatar
                    sx={{
                      bgcolor: stat.bg,
                      color: `${stat.color}.600`,
                      width: 48,
                      height: 48,
                    }}
                  >
                    {stat.icon}
                  </Avatar>
                </Box>
              </Card>
            </Grid>
          ))}
        </Grid>

        <Card sx={{ boxShadow: 1, borderRadius: 3 }}>
          <CardContent>
            <Box
              sx={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                mb: 2,
              }}
            >
              <Typography
                variant='h6'
                component='div'
                sx={{ fontWeight: 'bold' }}
              >
                快捷入口
              </Typography>
            </Box>
            <Grid
              container
              spacing={2}
            >
              {quickActions.map((action) => (
                <Grid
                  key={action.label}
                  size={{ xs: 3, sm: 3, md: 3 }}
                >
                  <Box
                    sx={{
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      p: 2,
                      borderRadius: 3,
                      cursor: 'pointer',
                      transition: 'background-color 0.2s',
                      '&:hover': { bgcolor: 'grey.50' },
                    }}
                  >
                    <Avatar
                      sx={{
                        bgcolor: action.bg,
                        color: `${action.color}.600`,
                        width: 48,
                        height: 48,
                        mb: 1,
                      }}
                    >
                      {action.icon}
                    </Avatar>
                    <Typography
                      variant='body2'
                      color='text.primary'
                    >
                      {action.label}
                    </Typography>
                  </Box>
                </Grid>
              ))}
            </Grid>
          </CardContent>
        </Card>

        <Grid
          container
          spacing={3}
        >
          <Grid size={{ xs: 12, lg: 6 }}>
            <Card sx={{ boxShadow: 1, borderRadius: 3 }}>
              <CardContent>
                <Box
                  sx={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    mb: 2,
                  }}
                >
                  <Typography
                    variant='h6'
                    component='div'
                    sx={{ fontWeight: 'bold' }}
                  >
                    近期公告
                  </Typography>
                  <Button
                    size='small'
                    endIcon={<ChevronRight fontSize='small' />}
                    sx={{ color: 'primary.main' }}
                  >
                    查看全部
                  </Button>
                </Box>
                <Stack spacing={1.5}>
                  {mockAnnouncements.slice(0, 3).map((announcement) => (
                    <Box
                      key={announcement.id}
                      sx={{
                        p: 2,
                        bgcolor: 'grey.50',
                        borderRadius: 3,
                        cursor: 'pointer',
                        transition: 'background-color 0.2s',
                        '&:hover': { bgcolor: 'grey.100' },
                      }}
                    >
                      <Box
                        sx={{
                          display: 'flex',
                          alignItems: 'flex-start',
                          justifyContent: 'space-between',
                        }}
                      >
                        <Box sx={{ flex: 1 }}>
                          <Typography
                            variant='subtitle2'
                            component='div'
                            sx={{ mb: 0.5, fontWeight: 'medium' }}
                          >
                            {announcement.title}
                          </Typography>
                          <Typography
                            variant='body2'
                            color='text.secondary'
                            sx={{
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              display: '-webkit-box',
                              WebkitLineClamp: 2,
                              WebkitBoxOrient: 'vertical',
                            }}
                          >
                            {announcement.content}
                          </Typography>
                          <Stack
                            component='div'
                            direction='row'
                            spacing={1}
                            sx={{ alignItems: 'center', mt: 1 }}
                          >
                            <Briefcase sx={{ fontSize: 12, color: 'text.secondary' }} />
                            <Typography
                              variant='caption'
                              color='text.secondary'
                            >
                              {announcement.author}
                            </Typography>
                            <Typography
                              variant='caption'
                              color='text.secondary'
                            >
                              ·
                            </Typography>
                            <Typography
                              variant='caption'
                              color='text.secondary'
                            >
                              {announcement.created_at}
                            </Typography>
                          </Stack>
                        </Box>
                        <StatusBadge status={announcement.status} />
                      </Box>
                    </Box>
                  ))}
                </Stack>
              </CardContent>
            </Card>
          </Grid>

          <Grid size={{ xs: 12, lg: 6 }}>
            <Card sx={{ boxShadow: 1, borderRadius: 3 }}>
              <CardContent>
                <Box
                  sx={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    mb: 2,
                  }}
                >
                  <Typography
                    variant='h6'
                    component='div'
                    sx={{ fontWeight: 'bold' }}
                  >
                    今日会议
                  </Typography>
                  <Button
                    size='small'
                    endIcon={<ChevronRight fontSize='small' />}
                    sx={{ color: 'primary.main' }}
                  >
                    查看全部
                  </Button>
                </Box>
                <Stack spacing={1.5}>
                  {mockMeetingBookings.map((booking) => (
                    <Box
                      key={booking.id}
                      sx={{
                        p: 2,
                        bgcolor: 'grey.50',
                        borderRadius: 3,
                        cursor: 'pointer',
                        transition: 'background-color 0.2s',
                        '&:hover': { bgcolor: 'grey.100' },
                      }}
                    >
                      <Box
                        sx={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                        }}
                      >
                        <Box sx={{ flex: 1 }}>
                          <Typography
                            variant='subtitle2'
                            component='div'
                            sx={{ mb: 0.5, fontWeight: 'medium' }}
                          >
                            {booking.title}
                          </Typography>
                          <Typography
                            variant='body2'
                            color='text.secondary'
                          >
                            {booking.room_name} · {booking.organizer}
                          </Typography>
                        </Box>
                        <Box sx={{ textAlign: 'right' }}>
                          <Typography
                            variant='body2'
                            component='div'
                            sx={{ fontWeight: 'medium' }}
                          >
                            {booking.start_time.split(' ')[1]}
                          </Typography>
                          <Typography
                            variant='caption'
                            color='text.secondary'
                          >
                            至 {booking.end_time.split(' ')[1]}
                          </Typography>
                        </Box>
                      </Box>
                    </Box>
                  ))}
                </Stack>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      </Stack>
    </PageContainer>
  );
};

export default AdministrationDashboardPage;
