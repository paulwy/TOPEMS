import { Box, Typography, Paper } from '@mui/material';

const ERP = () => {
  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" component="h1" gutterBottom>
        企业资源计划
      </Typography>
      <Paper sx={{ p: 3, height: '400px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Typography color="text.secondary">ERP 管理界面</Typography>
      </Paper>
    </Box>
  );
};

export default ERP;