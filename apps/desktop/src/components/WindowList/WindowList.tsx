import { useState, useEffect } from 'react';
import { Menu, MenuItem, IconButton, ListItemIcon, ListItemText, Box } from '@mui/material';
import { Monitor, X, Plus } from 'lucide-react';
import { windowApi } from '../../utils/tauri';
import { routes } from '../../routes';

interface WindowListProps {
  anchorEl: null | HTMLElement;
  onClose: () => void;
}

interface WindowItem {
  label: string;
  title: string;
}

const WindowList = ({ anchorEl, onClose }: WindowListProps) => {
  const [windows, setWindows] = useState<WindowItem[]>([]);

  const loadWindows = async () => {
    const result = await windowApi.getWindows();
    setWindows(result);
  };

  useEffect(() => {
    if (anchorEl) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      loadWindows();
    }
  }, [anchorEl]);

  const handleSwitchWindow = async (label: string) => {
    await windowApi.switch(label);
    onClose();
  };

  const handleCloseWindow = async (label: string) => {
    await windowApi.closeByLabel(label);
    await loadWindows();
  };

  const handleOpenNewWindow = async (route: typeof routes[0]) => {
    await windowApi.create(route.label, route.path);
    onClose();
  };

  const isMainWindow = (label: string) => label === 'main';

  return (
    <Menu
      anchorEl={anchorEl}
      open={Boolean(anchorEl)}
      onClose={onClose}
      sx={{
        '& .MuiMenu-paper': {
          minWidth: 280,
          maxHeight: 400,
          overflowY: 'auto',
        },
      }}
    >
      <Box sx={{ px: 2, py: 1, borderBottom: '1px solid #e0e0e0' }}>
        <ListItemText
          primary="Open new window"
          sx={{ fontSize: '12px', fontWeight: 'bold', color: '#666' }}
        />
      </Box>
      {routes.map((route) => (
        <MenuItem
          key={route.code}
          onClick={() => handleOpenNewWindow(route)}
          sx={{ py: 1 }}
        >
          <ListItemIcon sx={{ minWidth: 28 }}>
            <Plus size={16} />
          </ListItemIcon>
          <ListItemText primary={route.label} />
        </MenuItem>
      ))}

      {windows.length > 0 && (
        <>
          <Box sx={{ px: 2, py: 1, borderBottom: '1px solid #e0e0e0', mt: 1 }}>
            <ListItemText
              primary={`Current windows (${windows.length})`}
              sx={{ fontSize: '12px', fontWeight: 'bold', color: '#666' }}
            />
          </Box>
          {windows.map((window) => (
            <MenuItem
              key={window.label}
              onClick={() => handleSwitchWindow(window.label)}
              sx={{
                py: 1,
                justifyContent: 'space-between',
                backgroundColor: isMainWindow(window.label) ? '#f5f5f5' : 'transparent',
              }}
            >
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <ListItemIcon sx={{ minWidth: 28 }}>
                  <Monitor size={16} />
                </ListItemIcon>
                <ListItemText
                  primary={window.title}
                  secondary={isMainWindow(window.label) ? 'Main window' : ''}
                />
              </Box>
              <IconButton
                onClick={(e: React.MouseEvent<HTMLButtonElement>) => {
                  e.stopPropagation();
                  handleCloseWindow(window.label);
                }}
                sx={{ p: 0.5, ml: 1 }}
                size="small"
              >
                <X size={14} />
              </IconButton>
            </MenuItem>
          ))}
        </>
      )}
    </Menu>
  );
};

export default WindowList;
