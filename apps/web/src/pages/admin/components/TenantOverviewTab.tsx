import React from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Avatar,
  List,
  ListItem,
  ListItemAvatar,
  ListItemText,
  ListItemSecondaryAction,
  Divider,
} from '@mui/material';
import i18n from '@/i18n';
import { Users, Activity, HardDrive, BarChart3 } from 'lucide-react';
import type { Tenant, TenantStats } from '@/api/tenant/types';
interface TenantOverviewTabProps {
  tenant: Tenant;
  stats: TenantStats;
}
const TenantOverviewTab: React.FC<TenantOverviewTabProps> = ({ tenant, stats }) => {
  const statCards = [
    {
      label: i18n.t('admin.tenant_detail.total_users'),
      value: stats.total_users,
      icon: Users,
      color: 'primary',
    },
    {
      label: i18n.t('admin.tenant_detail.active_users'),
      value: stats.active_users,
      icon: Activity,
      color: 'success',
    },
    {
      label: i18n.t('admin.tenant_detail.storage_usage'),
      value: `${stats.storage_used_gb}/${tenant.settings.max_storage_gb}GB`,
      icon: HardDrive,
      color: 'warning',
    },
    {
      label: i18n.t('admin.tenant_detail_page.label_6d6418'),
      value: stats.last_30d_logins,
      icon: BarChart3,
      color: 'secondary',
    },
  ];
  return (
    <Box>
      <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 2, mb: 3 }}>
        {statCards.map((stat, index) => (
          <Card
            variant='outlined'
            key={index}
          >
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <Box
                  sx={{
                    width: 48,
                    height: 48,
                    borderRadius: 3,
                    bgcolor: `${stat.color}.main10`,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <stat.icon size={24} />
                </Box>
                <Box>
                  <Typography
                    variant='h4'
                    sx={{ fontWeight: 700 }}
                  >
                    {stat.value}
                  </Typography>
                  <Typography
                    variant='body2'
                    color='text.secondary'
                  >
                    {stat.label}
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        ))}
      </Box>
      <Card variant='outlined'>
        <CardContent>
          <Typography
            variant='h6'
            sx={{ fontWeight: 600, mb: 2 }}
          >
            {i18n.t('admin.tenant_detail_page.text_207914')}
          </Typography>
          <List disablePadding>
            <ListItem sx={{ px: 0 }}>
              <ListItemAvatar>
                <Avatar sx={{ bgcolor: 'primary.main10' }}>
                  <Users size={20} />
                </Avatar>
              </ListItemAvatar>
              <ListItemText
                primary={i18n.t('admin.tenant_detail.user_quota')}
                secondary={i18n.t('admin.tenant_detail_page.text_82d3a8', {
                  var0: stats.total_users,
                  var1: tenant.settings.max_users,
                })}
              />
              <ListItemSecondaryAction>
                <Typography
                  variant='body2'
                  color='text.secondary'
                >
                  {Math.round((stats.total_users / tenant.settings.max_users) * 100)}%
                </Typography>
              </ListItemSecondaryAction>
            </ListItem>
            <Divider component='li' />
            <ListItem sx={{ px: 0 }}>
              <ListItemAvatar>
                <Avatar sx={{ bgcolor: 'success.main10' }}>
                  <HardDrive size={20} />
                </Avatar>
              </ListItemAvatar>
              <ListItemText
                primary={i18n.t('admin.tenant_detail.storage_space')}
                secondary={i18n.t('admin.tenant_detail_page.text_e7bb98', {
                  var0: stats.storage_used_gb,
                  var1: tenant.settings.max_storage_gb,
                })}
              />
              <ListItemSecondaryAction>
                <Typography
                  variant='body2'
                  color='text.secondary'
                >
                  {Math.round((stats.storage_used_gb / tenant.settings.max_storage_gb) * 100)}%
                </Typography>
              </ListItemSecondaryAction>
            </ListItem>
            <Divider component='li' />
            <ListItem sx={{ px: 0 }}>
              <ListItemAvatar>
                <Avatar sx={{ bgcolor: 'warning.main10' }}>
                  <Activity size={20} />
                </Avatar>
              </ListItemAvatar>
              <ListItemText
                primary={i18n.t('admin.tenant_detail_page.attr_66e1a1')}
                secondary={i18n.t('admin.tenant_detail_page.text_bbac12', {
                  var0: stats.api_requests_today.toLocaleString(),
                  var1: tenant.settings.max_api_requests_per_day.toLocaleString(),
                })}
              />
              <ListItemSecondaryAction>
                <Typography
                  variant='body2'
                  color='text.secondary'
                >
                  {Math.round(
                    (stats.api_requests_today / tenant.settings.max_api_requests_per_day) * 100
                  )}
                  %
                </Typography>
              </ListItemSecondaryAction>
            </ListItem>
          </List>
        </CardContent>
      </Card>
    </Box>
  );
};
export default TenantOverviewTab;