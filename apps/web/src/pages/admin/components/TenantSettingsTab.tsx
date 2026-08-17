import React from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  List,
  ListItem,
  ListItemText,
  Divider,
  Switch,
} from '@mui/material';
import i18n from '@/i18n';
import { Palette, Shield, Settings, CheckCircle, XCircle } from 'lucide-react';
import type { Tenant } from '@/api/tenant/types';

interface TenantSettingsTabProps {
  tenant: Tenant;
}
const TenantSettingsTab: React.FC<TenantSettingsTabProps> = ({ tenant }) => {
  return (
    <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 3 }}>
      <Card variant='outlined'>
        <CardContent>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
            <Palette size={20} />
            <Typography
              variant='h6'
              sx={{ fontWeight: 600 }}
            >
              {i18n.t('admin.tenant_detail_page.text_74070e')}
            </Typography>
          </Box>
          <List disablePadding>
            <ListItem sx={{ px: 0 }}>
              <ListItemText
                primary={i18n.t('admin.tenant_detail.primary_color')}
                secondary={tenant.settings.branding.primary_color}
              />
              <Box
                sx={{
                  width: 32,
                  height: 32,
                  borderRadius: 1,
                  bgcolor: tenant.settings.branding.primary_color,
                }}
              />
            </ListItem>
            <Divider component='li' />
            <ListItem sx={{ px: 0 }}>
              <ListItemText
                secondary={tenant.settings.branding.secondary_color}
                primary={i18n.t('admin.tenant_detail.secondary_color')}
              />
              <Box
                sx={{
                  width: 32,
                  height: 32,
                  borderRadius: 1,
                  bgcolor: tenant.settings.branding.secondary_color,
                }}
              />
            </ListItem>
            <Divider component='li' />
            <ListItem sx={{ px: 0 }}>
              <ListItemText
                primary={i18n.t('admin.tenant_detail.custom_domain')}
                secondary={
                  tenant.settings.branding.custom_domain || i18n.t('admin.tenant_detail.not_set')
                }
              />
            </ListItem>
          </List>
        </CardContent>
      </Card>
      <Card variant='outlined'>
        <CardContent>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
            <Shield size={20} />
            <Typography
              variant='h6'
              sx={{ fontWeight: 600 }}
            >
              {i18n.t('admin.tenant_detail_page.text_c8bf34')}
            </Typography>
          </Box>
          <List disablePadding>
            <ListItem sx={{ px: 0 }}>
              <ListItemText primary={i18n.t('admin.tenant_detail_page.attr_b885be')} />
              <Switch
                checked={tenant.settings.security.sso_enabled}
                disabled
              />
            </ListItem>
            <Divider component='li' />
            <ListItem sx={{ px: 0 }}>
              <ListItemText
                primary={i18n.t('admin.tenant_detail.enforce_two_factor_authentication')}
              />
              <Switch
                checked={tenant.settings.security.two_factor_required}
                disabled
              />
            </ListItem>
            <Divider component='li' />
            <ListItem sx={{ px: 0 }}>
              <ListItemText primary={i18n.t('admin.tenant_detail_page.attr_10f18c')} />
              <Switch
                checked={tenant.settings.security.ip_whitelist_enabled}
                disabled
              />
            </ListItem>
            <Divider component='li' />
            <ListItem sx={{ px: 0 }}>
              <ListItemText
                primary={i18n.t('admin.tenant_detail.session_timeout')}
                secondary={i18n.t('admin.tenant_detail_page.text_3a17b7', {
                  tenant_settings_security_session_timeout_minutes:
                    tenant.settings.security.session_timeout_minutes,
                })}
              />
            </ListItem>
          </List>
        </CardContent>
      </Card>
      <Box sx={{ gridColumn: '1 / -1' }}>
        <Card variant='outlined'>
          <CardContent>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
              <Settings size={20} />
              <Typography
                variant='h6'
                sx={{ fontWeight: 600 }}
              >
                {i18n.t('admin.tenant_detail_page.text_b96130')}
              </Typography>
            </Box>
            <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 2 }}>
              {Object.entries(tenant.settings.features).map(([key, value]) => (
                <Card
                  variant='outlined'
                  sx={{ bgcolor: 'background.default' }}
                  key={key}
                >
                  <CardContent sx={{ py: 1.5 }}>
                    <Box
                      sx={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                      }}
                    >
                      <Typography variant='body2'>{key}</Typography>
                      {value ? (
                        <CheckCircle
                          size={18}
                          color='green'
                        />
                      ) : (
                        <XCircle
                          size={18}
                          color='gray'
                        />
                      )}
                    </Box>
                  </CardContent>
                </Card>
              ))}
            </Box>
          </CardContent>
        </Card>
      </Box>
    </Box>
  );
};
export default TenantSettingsTab;
