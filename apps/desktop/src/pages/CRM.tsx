import { Box, Typography, Paper } from '@mui/material';

const CRM = () => {
  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" component="h1" gutterBottom>
        客户关系管理
      </Typography>
      <Paper sx={{ p: 3, height: '400px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Typography color="text.secondary">客户管理界面</Typography>
      </Paper>
    </Box>
  );
};

export default CRM;