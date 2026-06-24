import { Box, Typography, Paper } from '@mui/material';

const Reports = () => {
  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" component="h1" gutterBottom>
        报表分析
      </Typography>
      <Paper sx={{ p: 3, height: '400px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Typography color="text.secondary">报表分析界面</Typography>
      </Paper>
    </Box>
  );
};

export default Reports;