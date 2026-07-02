import React, { useState, useEffect } from 'react';
import { Box, Typography } from '@mui/material';
import {
  ChevronRight,
  FileText,
  Clock,
  AlertTriangle,
  Users,
  CheckCircle2,
  AlertCircle,
} from 'lucide-react';

export interface ActivityItem {
  id: string;
  title: string;
  type: string;
  time: string;
  icon: React.ReactNode;
}

interface RecentActivitiesProps {
  activities?: ActivityItem[];
}

const typeColors: Record<string, { bg: string; text: string; bar: string; iconBg: string }> = {
  系统: { bg: 'primary.light', text: 'primary.dark', bar: 'primary.main', iconBg: 'primary.100' },
  文档: {
    bg: 'secondary.light',
    text: 'secondary.dark',
    bar: 'secondary.main',
    iconBg: 'secondary.light',
  },
  工作流: {
    bg: 'success.light',
    text: 'success.dark',
    bar: 'success.dark',
    iconBg: 'success.lighter',
  },
  培训: { bg: 'warning.lighter', text: '#ca8a04', bar: 'warning.main', iconBg: 'warning.100' },
  默认: { bg: 'grey.50', text: 'grey.600', bar: 'grey.400', iconBg: 'grey.100' },
};

const generateMockActivities = (): ActivityItem[] => [
  {
    id: '1',
    title: '审批请求: 采购订单 #PO-2024-001 需要审批',
    type: '工作流',
    time: '2分钟前',
    icon: (
      <AlertCircle
        size={20}
        color='success.dark'
      />
    ),
  },
  {
    id: '2',
    title: '文档更新: 产品规格书 v2.0 已发布',
    type: '文档',
    time: '15分钟前',
    icon: (
      <FileText
        size={20}
        color='secondary.main'
      />
    ),
  },
  {
    id: '3',
    title: '系统通知: 数据库备份已完成',
    type: '系统',
    time: '1小时前',
    icon: (
      <CheckCircle2
        size={20}
        color='primary.main'
      />
    ),
  },
  {
    id: '4',
    title: '培训提醒: 新员工入职培训明天开始',
    type: '培训',
    time: '2小时前',
    icon: (
      <Users
        size={20}
        color='warning.main'
      />
    ),
  },
  {
    id: '5',
    title: '告警: CRM服务响应时间超过阈值',
    type: '系统',
    time: '3小时前',
    icon: (
      <AlertTriangle
        size={20}
        color='error.main'
      />
    ),
  },
  {
    id: '6',
    title: '审批请求: 请假申请 #LV-2024-015 需要审批',
    type: '工作流',
    time: '5小时前',
    icon: (
      <Clock
        size={20}
        color='success.dark'
      />
    ),
  },
];

export const RecentActivities: React.FC<RecentActivitiesProps> = ({
  activities: externalActivities,
}) => {
  const [internalActivities, setInternalActivities] = useState<ActivityItem[]>([]);

  const hasExternalActivities = externalActivities && externalActivities.length > 0;
  const currentActivities = hasExternalActivities ? externalActivities : internalActivities;

  useEffect(() => {
    if (!hasExternalActivities) {
      setInternalActivities(generateMockActivities());
    }
  }, [hasExternalActivities]);

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
      {currentActivities.map((activity, index) => {
        const colors = typeColors[activity.type] || typeColors['默认'];
        const progressWidth = `${((currentActivities.length - index) / currentActivities.length) * 100}%`;

        return (
          <Box
            key={activity.id}
            sx={{
              display: 'flex',
              alignItems: 'flex-start',
              padding: 2,
              borderRadius: 3,
              '&:hover': { backgroundColor: 'grey.50' },
              transition: 'backgroundColor 0.2s ease',
              cursor: 'pointer',
            }}
          >
            <Box
              sx={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                marginRight: 2,
              }}
            >
              <Box
                sx={{
                  width: 40,
                  height: 40,
                  borderRadius: 3,
                  backgroundColor: colors.iconBg,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
                }}
              >
                {activity.icon}
              </Box>
              {index < currentActivities.length - 1 && (
                <Box
                  sx={{
                    position: 'relative',
                    width: 4,
                    height: 32,
                    backgroundColor: 'border.default',
                    borderRadius: 3,
                    marginTop: 1,
                  }}
                >
                  <Box
                    sx={{
                      position: 'absolute',
                      top: 0,
                      left: 0,
                      width: '100%',
                      backgroundColor: colors.bar,
                      borderRadius: 3,
                      transition: 'height 0.7s ease',
                    }}
                    style={{ height: progressWidth }}
                  />
                </Box>
              )}
            </Box>
            <Box sx={{ flex: 1 }}>
              <Typography
                sx={{
                  fontSize: 14,
                  fontWeight: 500,
                  color: '#1e293b',
                  marginBottom: 0.5,
                }}
              >
                {activity.title}
              </Typography>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                <Box
                  sx={{
                    paddingX: 1.5,
                    paddingY: 0.5,
                    borderRadius: 1,
                    backgroundColor: colors.bg,
                  }}
                >
                  <Typography sx={{ fontSize: 11, fontWeight: 500, color: colors.text }}>
                    {activity.type}
                  </Typography>
                </Box>
                <Typography sx={{ fontSize: 12, color: 'grey.400' }}>{activity.time}</Typography>
              </Box>
            </Box>
            <ChevronRight sx={{ width: 16, height: 16, color: 'grey.400', marginLeft: 1 }} />
          </Box>
        );
      })}
    </Box>
  );
};
