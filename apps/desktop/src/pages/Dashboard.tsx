import { Box, Card, CardContent, Typography, Paper } from '@mui/material';


const Dashboard = () => {
  const stats = [
    { title: '总收入', value: '¥1,234,567', icon: AttachMoney, color: '#1976d2' },
    { title: '用户数量', value: '12,345', icon: People, color: '#dc004e' },
    { title: '订单数量', value: '8,901', icon: ShoppingCart, color: '#4caf50' },
    { title: '增长率', value: '+12.5%', icon: TrendingUp, color: '#ff9800' },
  ];

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" component="h1" gutterBottom>
        仪表盘
      </Typography>
      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr', md: 'repeat(4, 1fr)' }, gap: 3 }}>
        {stats.map((stat, index) => (
          <Card key={index}>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Box>
                  <Typography variant="body2" color="text.secondary">
                    {stat.title}
                  </Typography>
                  <Typography variant="h4" component="div">
                    {stat.value}
                  </Typography>
                </Box>
                <stat.icon sx={{ fontSize: 40, color: stat.color }} />
              </Box>
            </CardContent>
          </Card>
        ))}
      </Box>
      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '3fr 1fr' }, gap: 3, mt: 3 }}>
        <Paper sx={{ p: 3 }}>
          <Typography variant="h6" gutterBottom>
            销售趋势
          </Typography>
          <Box sx={{ height: 300, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Typography color="text.secondary">图表区域</Typography>
          </Box>
        </Paper>
        <Paper sx={{ p: 3 }}>
          <Typography variant="h6" gutterBottom>
            最近活动
          </Typography>
          <Box sx={{ height: 300, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Typography color="text.secondary">活动列表</Typography>
          </Box>
        </Paper>
      </Box>
    </Box>
  );
};

export default Dashboard;