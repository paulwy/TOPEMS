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
import { designTokens } from '@topems/tokens';
import { zh } from '../i18n/zh';

const Settings = () => {
  const [notifications, setNotifications] = useState(true);
  const [emailNotifications, setEmailNotifications] = useState(true);
  const [theme, setTheme] = useState('light');
  const [language, setLanguage] = useState('zh');
  const [timezone, setTimezone] = useState('Asia/Shanghai');
  const [autoUpdate, setAutoUpdate] = useState(true);

  const handleSave = () => {
    alert(zh['settings.savedAlert']);
  };

  return (
    <Box sx={{ p: 3 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 4 }}>
        <Typography variant="h4" component="h1">
          {zh['settings.title']}
        </Typography>
        <Button variant="contained" startIcon={<Save size={18} />} onClick={handleSave}>
          {zh['settings.save']}
        </Button>
      </Box>

      <Box sx={{ display: 'flex', gap: 3 }}>
        <Box sx={{ flex: '1 1 600px', minWidth: '400px' }}>
          <Paper sx={{ p: 4 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 4 }}>
              <User size={24} color="#6366f1" />
              <Typography variant="h6">{zh['settings.accountSection']}</Typography>
            </Box>
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 3 }}>
              <TextField label={zh['settings.username']} fullWidth sx={{ flex: '1 1 200px' }} value="admin" disabled />
              <TextField label={zh['settings.email']} fullWidth sx={{ flex: '1 1 200px' }} value="admin@topems.com" disabled />
              <TextField label={zh['settings.name']} fullWidth sx={{ flex: '1 1 200px' }} value={zh['settings.adminName']} />
              <TextField label={zh['settings.phone']} fullWidth sx={{ flex: '1 1 200px' }} value="13800138000" />
            </Box>
          </Paper>

          <Paper sx={{ p: 4, mt: 3 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 4 }}>
              <Bell size={24} color={designTokens.colors.warning.main} />
              <Typography variant="h6">{zh['settings.notifySection']}</Typography>
            </Box>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              <FormControlLabel
                control={<Switch checked={notifications} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setNotifications(e.target.checked)} />}
                label={zh['settings.enableSystemNotify']}
              />
              <FormControlLabel
                control={<Switch checked={emailNotifications} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setEmailNotifications(e.target.checked)} />}
                label={zh['settings.enableEmailNotify']}
              />
            </Box>
          </Paper>

          <Paper sx={{ p: 4, mt: 3 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 4 }}>
              <Palette size={24} color={designTokens.colors.pink.main} />
              <Typography variant="h6">{zh['settings.appearanceSection']}</Typography>
            </Box>
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 3 }}>
              <FormControl fullWidth sx={{ flex: '1 1 200px' }}>
                <InputLabel>{zh['settings.theme']}</InputLabel>
                <Select value={theme} label={zh['settings.theme']} onChange={(e) => setTheme(e.target.value)}>
                  <MenuItem value="light">{zh['settings.themeLight']}</MenuItem>
                  <MenuItem value="dark">{zh['settings.themeDark']}</MenuItem>
                  <MenuItem value="system">{zh['settings.themeSystem']}</MenuItem>
                </Select>
              </FormControl>
              <FormControl fullWidth sx={{ flex: '1 1 200px' }}>
                <InputLabel>{zh['settings.language']}</InputLabel>
                <Select value={language} label={zh['settings.language']} onChange={(e) => setLanguage(e.target.value)}>
                  <MenuItem value="zh">{zh['settings.chinese']}</MenuItem>
                  <MenuItem value="en">English</MenuItem>
                </Select>
              </FormControl>
            </Box>
          </Paper>
        </Box>

        <Box sx={{ flex: '1 1 300px', minWidth: '300px' }}>
          <Paper sx={{ p: 4 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 4 }}>
              <Monitor size={24} color={designTokens.colors.success.main} />
              <Typography variant="h6">{zh['settings.title']}</Typography>
            </Box>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
              <FormControl fullWidth>
                <InputLabel>{zh['settings.timezone']}</InputLabel>
                <Select value={timezone} label={zh['settings.timezone']} onChange={(e) => setTimezone(e.target.value)}>
                  <MenuItem value="Asia/Shanghai">{zh['settings.tzShanghai']}</MenuItem>
                  <MenuItem value="Asia/Tokyo">{zh['settings.tzTokyo']}</MenuItem>
                  <MenuItem value="Europe/London">{zh['settings.tzLondon']}</MenuItem>
                  <MenuItem value="America/New_York">{zh['settings.tzNewYork']}</MenuItem>
                </Select>
              </FormControl>
              <FormControlLabel
                control={<Switch checked={autoUpdate} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setAutoUpdate(e.target.checked)} />}
                label={zh['settings.autoUpdate']}
              />
            </Box>
          </Paper>

          <Paper sx={{ p: 4, mt: 3 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 4 }}>
              <Shield size={24} color={designTokens.colors.cyan.main} />
              <Typography variant="h6">{zh['settings.securitySection']}</Typography>
            </Box>
            <Typography variant="body2" color="text.secondary">
              {zh['settings.currentVersion']}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {zh['settings.lastLogin']}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {zh['settings.currentIp']}
            </Typography>
          </Paper>
        </Box>
      </Box>
    </Box>
  );
};

export default Settings;