import { useState } from 'react';
import {
  Box,
  Typography,
  Paper,
  Button,
  TextField,
  Switch,
  FormControlLabel,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
} from '@mui/material';
import { Save, User, Bell, Monitor, Shield, Palette } from 'lucide-react';

const Settings = () => {
  const [notifications, setNotifications] = useState(true);
  const [emailNotifications, setEmailNotifications] = useState(true);
  const [theme, setTheme] = useState('light');
  const [language, setLanguage] = useState('zh');
  const [timezone, setTimezone] = useState('Asia/Shanghai');
  const [autoUpdate, setAutoUpdate] = useState(true);

  const handleSave = () => {
    alert('设置已保存');
  };

  return (
    <Box sx={{ p: 3 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 4 }}>
        <Typography variant="h4" component="h1">
          系统设置
        </Typography>
        <Button variant="contained" startIcon={<Save size={18} />} onClick={handleSave}>
          保存设置
        </Button>
      </Box>

      <Box sx={{ display: 'flex', gap: 3 }}>
        <Box sx={{ flex: '1 1 600px', minWidth: '400px' }}>
          <Paper sx={{ p: 4 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 4 }}>
              <User size={24} color="#6366f1" />
              <Typography variant="h6">账户设置</Typography>
            </Box>
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 3 }}>
              <TextField label="用户名" fullWidth sx={{ flex: '1 1 200px' }} value="admin" disabled />
              <TextField label="邮箱" fullWidth sx={{ flex: '1 1 200px' }} value="admin@topems.com" disabled />
              <TextField label="姓名" fullWidth sx={{ flex: '1 1 200px' }} value="管理员" />
              <TextField label="电话" fullWidth sx={{ flex: '1 1 200px' }} value="13800138000" />
            </Box>
          </Paper>

          <Paper sx={{ p: 4, mt: 3 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 4 }}>
              <Bell size={24} color="#f59e0b" />
              <Typography variant="h6">通知设置</Typography>
            </Box>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              <FormControlLabel
                control={<Switch checked={notifications} onChange={(e) => setNotifications(e.target.checked)} />}
                label="启用系统通知"
              />
              <FormControlLabel
                control={<Switch checked={emailNotifications} onChange={(e) => setEmailNotifications(e.target.checked)} />}
                label="启用邮件通知"
              />
            </Box>
          </Paper>

          <Paper sx={{ p: 4, mt: 3 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 4 }}>
              <Palette size={24} color="#ec4899" />
              <Typography variant="h6">外观设置</Typography>
            </Box>
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 3 }}>
              <FormControl fullWidth sx={{ flex: '1 1 200px' }}>
                <InputLabel>主题</InputLabel>
                <Select value={theme} label="主题" onChange={(e) => setTheme(e.target.value)}>
                  <MenuItem value="light">浅色模式</MenuItem>
                  <MenuItem value="dark">深色模式</MenuItem>
                  <MenuItem value="system">跟随系统</MenuItem>
                </Select>
              </FormControl>
              <FormControl fullWidth sx={{ flex: '1 1 200px' }}>
                <InputLabel>语言</InputLabel>
                <Select value={language} label="语言" onChange={(e) => setLanguage(e.target.value)}>
                  <MenuItem value="zh">中文</MenuItem>
                  <MenuItem value="en">English</MenuItem>
                </Select>
              </FormControl>
            </Box>
          </Paper>
        </Box>

        <Box sx={{ flex: '1 1 300px', minWidth: '300px' }}>
          <Paper sx={{ p: 4 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 4 }}>
              <Monitor size={24} color="#22c55e" />
              <Typography variant="h6">系统设置</Typography>
            </Box>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
              <FormControl fullWidth>
                <InputLabel>时区</InputLabel>
                <Select value={timezone} label="时区" onChange={(e) => setTimezone(e.target.value)}>
                  <MenuItem value="Asia/Shanghai">上海 (UTC+8)</MenuItem>
                  <MenuItem value="Asia/Tokyo">东京 (UTC+9)</MenuItem>
                  <MenuItem value="Europe/London">伦敦 (UTC)</MenuItem>
                  <MenuItem value="America/New_York">纽约 (UTC-5)</MenuItem>
                </Select>
              </FormControl>
              <FormControlLabel
                control={<Switch checked={autoUpdate} onChange={(e) => setAutoUpdate(e.target.checked)} />}
                label="自动检查更新"
              />
            </Box>
          </Paper>

          <Paper sx={{ p: 4, mt: 3 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 4 }}>
              <Shield size={24} color="#06b6d4" />
              <Typography variant="h6">安全信息</Typography>
            </Box>
            <Typography variant="body2" color="text.secondary">
              当前版本: 1.0.0
            </Typography>
            <Typography variant="body2" color="text.secondary">
              上次登录: 2024-01-15 09:30
            </Typography>
            <Typography variant="body2" color="text.secondary">
              当前IP: 192.168.1.100
            </Typography>
          </Paper>
        </Box>
      </Box>
    </Box>
  );
};

export default Settings;