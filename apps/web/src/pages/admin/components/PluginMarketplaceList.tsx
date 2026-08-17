import React from 'react';
import {
  Box,
  Button,
  Chip,
  InputAdornment,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Stack,
  Tab,
  Tabs,
  TextField,
  Typography,
} from '@mui/material';
import i18n from '@/i18n';
import { Calendar, Download, Package, Search } from 'lucide-react';
import type { MarketplacePlugin } from '../hooks/usePluginManagement';

interface PluginMarketplaceListProps {
  search: string;
  onSearchChange: (value: string) => void;
  tab: number;
  onTabChange: (value: number) => void;
  plugins: MarketplacePlugin[];
  installedCodes: string[];
  onSelectPlugin: (plugin: MarketplacePlugin) => void;
}
const PluginMarketplaceList: React.FC<PluginMarketplaceListProps> = ({
  search,
  onSearchChange,
  tab,
  onTabChange,
  plugins,
  installedCodes,
  onSelectPlugin,
}) => {
  const visiblePlugins = plugins.filter((p) => {
    if (tab === 1) return p.category === 'Business';
    if (tab === 2) return p.category === 'Analytics';
    if (tab === 3) return p.category === 'System';
    return true;
  });
  return (
    <Box>
      <TextField
        fullWidth
        placeholder={i18n.t('admin.plugin_management_page.attr_d40b53')}
        value={search}
        onChange={(e) => onSearchChange(e.target.value)}
        sx={{ mb: 2 }}
        slotProps={{
          input: {
            startAdornment: (
              <InputAdornment position='start'>
                <Search size={18} />
              </InputAdornment>
            ),
          },
        }}
      />
      <Tabs
        value={tab}
        onChange={(_, v) => onTabChange(v)}
        sx={{ mb: 2 }}
      >
        <Tab label={i18n.t('admin.plugin_management.all_plugins')} />
        <Tab label={i18n.t('admin.plugin_management.business_plugin')} />
        <Tab label={i18n.t('admin.plugin_management.analytics_plugin')} />
        <Tab label={i18n.t('admin.plugin_management.system_plugin')} />
      </Tabs>
      <List>
        {visiblePlugins.map((plugin) => {
          const isInstalled = installedCodes.includes(plugin.code);
          return (
            <ListItem
              key={plugin.code}
              sx={{ border: 1, borderColor: 'divider', borderRadius: 1, mb: 1 }}
              secondaryAction={
                isInstalled ? (
                  <Chip
                    label={i18n.t('admin.plugin_management.installed')}
                    color='success'
                    size='small'
                  />
                ) : (
                  <Button
                    variant='outlined'
                    size='small'
                    startIcon={<Download size={14} />}
                    onClick={() => onSelectPlugin(plugin)}
                  >
                    {i18n.t('admin.plugin_management_page.text_e655a4')}
                  </Button>
                )
              }
            >
              <ListItemIcon>
                <Package size={24} />
              </ListItemIcon>
              <ListItemText
                primary={
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    {plugin.name}
                    <Chip
                      label={`v${plugin.latest_version}`}
                      size='small'
                      variant='outlined'
                    />
                  </Box>
                }
                secondary={
                  <Box>
                    <Typography
                      variant='caption'
                      color='text.secondary'
                    >
                      {plugin.description}
                    </Typography>
                    <Stack
                      direction='row'
                      spacing={2}
                      sx={{ mt: 0.5 }}
                    >
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                        <Download size={12} />
                        <Typography variant='caption'>{plugin.downloads}</Typography>
                      </Box>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                        <Calendar size={12} />
                        <Typography variant='caption'>{plugin.published_at}</Typography>
                      </Box>
                    </Stack>
                  </Box>
                }
                slotProps={{
                  secondary: {
                    component: 'div',
                  },
                }}
              />
            </ListItem>
          );
        })}
      </List>
    </Box>
  );
};
export default PluginMarketplaceList;
