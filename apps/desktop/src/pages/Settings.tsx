import { Box, Typography, Paper, Switch, FormControlLabel } from '@mui/material';
import { useState } from 'react';

const Settings = () => {
  const [notifications, setNotifications] = useState(true);
  const [autoUpdate, setAutoUpdate] = useState(true);
  const [darkMode, setDarkMode] = useState(false);

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" component="h1" gutterBottom>
        系统设置
      </Typography>
      <Paper sx={{ p: 3 }}>
        <Typography variant="h6" gutterBottom>
          通用设置
        </Typography>
        <FormControlLabel
          control={
            <Switch
              checked={notifications}
              onChange={(e) => setNotifications(e.target.checked)}
            />
          }
          label="启用通知"
        />
        <FormControlLabel
          control={
            <Switch
              checked={autoUpdate}
              onChange={(e) => setAutoUpdate(e.target.checked)}
            />
          }
          label="自动更新"
        />
        <FormControlLabel
          control={
            <Switch
              checked={darkMode}
              onChange={(e) => setDarkMode(e.target.checked)}
            />
          }
          label="深色模式"
        />
      </Paper>
    </Box>
  );
};

export default Settings;