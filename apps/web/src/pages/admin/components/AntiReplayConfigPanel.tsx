import React from 'react';
import {
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  Divider,
  Grid,
  Switch,
  TextField,
  Typography,
} from '@mui/material';
import i18n from '@/i18n';
import { AlertCircle, Save } from 'lucide-react';
import { designTokens } from '@/theme/tokens';
import type { AntiReplayConfig } from '../hooks/useRateLimitConfig';
const ct= designTokens.colors;
interface AntiReplayConfigPanelProps {
  antiReplay: AntiReplayConfig;
  setAntiReplay: React.Dispatch<React.SetStateAction<AntiReplayConfig>>;
  newEnforcePath: string;
  setNewEnforcePath: React.Dispatch<React.SetStateAction<string>>;
  onAddEnforcePath: () => void;
  onRemoveEnforcePath: (path: string) => void;
  onSave: () => void;
  isSaving: boolean;
}
export const AntiReplayConfigPanel: React.FC<AntiReplayConfigPanelProps> = ({
  antiReplay,
  setAntiReplay,
  newEnforcePath,
  setNewEnforcePath,
  onAddEnforcePath,
  onRemoveEnforcePath,
  onSave,
  isSaving,
}) => {
  return (
    <Grid size={{ xs: 12, md: 6 }}>
      <Card>
        <CardContent>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
            <AlertCircle
              size={20}
              color={ct.warning.dark}
            />
            <Typography
              variant='subtitle1'
              sx={{ fontWeight: 600 }}
            >
              {i18n.t('admin.rate_limit_config_page.text_209207')}
            </Typography>
            <Box sx={{ flex: 1 }} />
            <Switch
              checked={antiReplay.enabled}
              onChange={() => setAntiReplay((prev) => ({ ...prev, enabled: !prev.enabled }))}
            />
          </Box>
          <Grid
            container
            spacing={2}
          >
            <Grid size={{ xs: 6 }}>
              <TextField
                label={i18n.t('admin.rate_limit_config_page.attr_3d3dbd')}
                type='number'
                fullWidth
                size='small'
                value={antiReplay.tolerance_secs}
                onChange={(e) =>
                  setAntiReplay((prev) => ({
                    ...prev,
                    tolerance_secs: Number(e.target.value) || 0,
                  }))
                }
              />
            </Grid>
            <Grid size={{ xs: 6 }}>
              <TextField
                label={i18n.t('admin.rate_limit_config_page.attr_cbecae')}
                type='number'
                fullWidth
                size='small'
                value={antiReplay.nonce_cache_secs}
                onChange={(e) =>
                  setAntiReplay((prev) => ({
                    ...prev,
                    nonce_cache_secs: Number(e.target.value) || 0,
                  }))
                }
              />
            </Grid>
            <Grid size={{ xs: 6 }}>
              <TextField
                label={i18n.t('admin.rate_limit_config_page.attr_bfe154')}
                fullWidth
                size='small'
                value={antiReplay.timestamp_header}
                onChange={(e) =>
                  setAntiReplay((prev) => ({
                    ...prev,
                    timestamp_header: e.target.value,
                  }))
                }
              />
            </Grid>
            <Grid size={{ xs: 6 }}>
              <TextField
                label='nonce Header'
                fullWidth
                size='small'
                value={antiReplay.nonce_header}
                onChange={(e) =>
                  setAntiReplay((prev) => ({
                    ...prev,
                    nonce_header: e.target.value,
                  }))
                }
              />
            </Grid>
            <Grid size={{ xs: 12 }}>
              <Divider sx={{ my: 1 }} />
              <Typography
                variant='body2'
                sx={{ mb: 1, fontWeight: 500 }}
              >
                {i18n.t('admin.rate_limit_config_page.text_778582')}
              </Typography>
              <Box sx={{ display: 'flex', gap: 1, mb: 1 }}>
                <TextField
                  size='small'
                  fullWidth
                  value={newEnforcePath}
                  onChange={(e) => setNewEnforcePath(e.target.value)}
                  placeholder='/api/core/finance'
                />
                <Button
                  variant='outlined'
                  onClick={onAddEnforcePath}
                >
                  {i18n.t('admin.rate_limit_config_page.text_b58c75')}
                </Button>
              </Box>
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                {antiReplay.enforce_paths.map((path) => (
                  <Chip
                    key={path}
                    label={path}
                    onDelete={() => onRemoveEnforcePath(path)}
                    size='small'
                  />
                ))}
              </Box>
            </Grid>
            <Grid size={{ xs: 12 }}>
              <Button
                variant='outlined'
                startIcon={<Save size={16} />}
                onClick={onSave}
                disabled={isSaving}
              >
                {i18n.t('admin.rate_limit_config_page.text_f699f0')}
              </Button>
            </Grid>
          </Grid>
        </CardContent>
      </Card>
    </Grid>
  );
};
export default AntiReplayConfigPanel;