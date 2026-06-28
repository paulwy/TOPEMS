import { Toolbar, IconButton, Typography, Box } from '@mui/material';

import { useState } from 'react';

interface HeaderProps {
  onMenuClick: () => void;
}

const Header = ({ onMenuClick }: HeaderProps) => {
  const [searchValue, setSearchValue] = useState('');

  return (
    <Toolbar sx={{ justifyContent: 'space-between' }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
        <IconButton edge="start" onClick={onMenuClick}>
          <Menu />
        </IconButton>
        <Typography variant="h6" component="h1">
          欢迎使用 TOPEMS
        </Typography>
      </Box>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
        <Box sx={{ position: 'relative' }}>
          <Search sx={{ position: 'absolute', left: 8, top: '50%', transform: 'translateY(-50%)' }} />
          <input
            type="text"
            placeholder="搜索..."
            value={searchValue}
            onChange={(e) => setSearchValue(e.target.value)}
            style={{
              padding: '8px 12px 8px 36px',
              borderRadius: '8px',
              border: '1px solid #e0e0e0',
              fontSize: '14px',
              width: '200px',
            }}
          />
        </Box>
        <IconButton>
          <HelpOutlined />
        </IconButton>
        <IconButton>
          <Notifications />
        </IconButton>
      </Box>
    </Toolbar>
  );
};

export default Header;