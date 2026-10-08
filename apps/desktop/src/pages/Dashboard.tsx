import { useNotificationStore } from '../store/notificationStore';
import {
  Box,
  Paper,
  Typography,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Chip,
  Card,
  CardContent,
} from '@mui/material';
import {
  TrendingUp,
  Users,
  ShoppingCart,
  DollarSign,
  AlertCircle,
  CheckCircle,
  Clock,
} from 'lucide-react';
import { designTokens } from '@topems/tokens';
import { zh } from '../i18n/zh';

const Dashboard = () => {
  const { notifications, unreadCount } = useNotificationStore();
  const recentNotifications = notifications.slice(0, 5);

  const stats = [
    { title: zh['dashboard.statTotalRevenue'], value: '¥12,845,678', change: '+12.5%', icon: DollarSign },
    { title: zh['dashboard.statActiveUsers'], value: '2,847', change: '+8.3%', icon: Users },
    { title: zh['dashboard.statOrderCount'], value: '1,245', change: '-2.1%', icon: ShoppingCart },
    { title: zh['dashboard.statGrowthRate'], value: '15.8%', change: '+5.2%', icon: TrendingUp },
  ];

  const shortcuts = [
    { name: zh['dashboard.shortcutNewOrder'], icon: ShoppingCart },
    { name: zh['dashboard.shortcutAddCustomer'], icon: Users },
    { name: zh['dashboard.shortcutApprovalTask'], icon: AlertCircle },
    { name: zh['dashboard.shortcutViewReports'], icon: TrendingUp },
  ];

  return (
    <Box sx={{ flex: 1, p: 3 }}>
      <Typography variant="h4" component="h1" sx={{ mb: 4 }}>
        {zh['dashboard.title']}
      </Typography>

      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 3, mb: 4 }}>
        {stats.map((stat) => (
          <Box key={stat.title} sx={{ flex: '1 1 200px', minWidth: '200px', maxWidth: '300px' }}>
            <Card>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div>
                    <Typography variant="h6" component="p" sx={{ color: 'text.secondary' }}>
                      {stat.title}
                    </Typography>
                    <Typography variant="h4" component="p" sx={{ mt: 1 }}>
                      {stat.value}
                    </Typography>
                    <Chip
                      label={stat.change}
                      size="small"
                      sx={{ mt: 2 }}
                      color={stat.change.startsWith('+') ? 'success' : 'error'}
                    />
                  </div>
                  <stat.icon size={48} color="#6366f1" />
                </Box>
              </CardContent>
            </Card>
          </Box>
        ))}
      </Box>

      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 3 }}>
        <Box sx={{ flex: '1 1 500px', minWidth: '300px' }}>
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" component="h2" sx={{ mb: 3 }}>
              {zh['dashboard.shortcuts']}
            </Typography>
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2 }}>
              {shortcuts.map((shortcut) => (
                <Box key={shortcut.name} sx={{ flex: '1 1 100px', minWidth: '100px' }}>
                  <Paper
                    sx={{
                      p: 3,
                      textAlign: 'center',
                      cursor: 'pointer',
                      '&:hover': { backgroundColor: 'action.hover' },
                    }}
                  >
                    <Box sx={{ mx: 'auto', mb: 1 }}>
                      <shortcut.icon size={32} color="#6366f1" />
                    </Box>
                    <Typography variant="body1">{shortcut.name}</Typography>
                  </Paper>
                </Box>
              ))}
            </Box>
          </Paper>
        </Box>

        <Box sx={{ flex: '1 1 300px', minWidth: '300px' }}>
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" component="h2" sx={{ mb: 3 }}>
              {zh['dashboard.recentNotifications']} {unreadCount > 0 && `(${unreadCount})`}
            </Typography>
            {recentNotifications.length === 0 ? (
              <Typography variant="body2" color="text.secondary">
                {zh['dashboard.noNotifications']}
              </Typography>
            ) : (
              <List>
                {recentNotifications.map((notification) => (
                  <ListItem key={notification.id} sx={{ py: 2 }}>
                    <ListItemIcon>
                      {notification.read ? (
                        <CheckCircle size={20} color={designTokens.colors.text.muted} />
                      ) : (
                        <AlertCircle size={20} color={designTokens.colors.warning.main} />
                      )}
                    </ListItemIcon>
                    <ListItemText
                      primary={notification.title}
                      secondary={
                        <Box>
                          <Typography component="span" variant="body2">
                            {notification.message}
                          </Typography>
                          <Typography component="span" variant="caption" color="text.secondary" sx={{ ml: 1 }}>
                            <Clock size={12} /> {notification.createdAt}
                          </Typography>
                        </Box>
                      }
                    />
                  </ListItem>
                ))}
              </List>
            )}
          </Paper>
        </Box>
      </Box>
    </Box>
  );
};

export default Dashboard;