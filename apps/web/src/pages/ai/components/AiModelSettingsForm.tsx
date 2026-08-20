import React from 'react';
import {
  Box,
  Typography,
  Button,
  Paper,
  Divider,
  Slider,
  TextField,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Switch,
} from '@mui/material';
import { RefreshCw, Save, Server, Activity, Zap } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Grid } from '@/components/common';
import type { AIModel } from '../hooks/useAiModelSettings';

interface AiModelSettingsFormProps {
  selectedModel: AIModel;
  temperature: number;
  maxTokens: number;
  topP: number;
  systemPrompt: string;
  saving: boolean;
  onTemperatureChange: (value: number) => void;
  onMaxTokensChange: (value: number) => void;
  onTopPChange: (value: number) => void;
  onSystemPromptChange: (value: string) => void;
  onSaveConfig: () => void;
}

const AiModelSettingsForm: React.FC<AiModelSettingsFormProps> = ({
  selectedModel,
  temperature,
  maxTokens,
  topP,
  systemPrompt,
  saving,
  onTemperatureChange,
  onMaxTokensChange,
  onTopPChange,
  onSystemPromptChange,
  onSaveConfig,
}) => {
  const { t } = useTranslation();

  return (
    <Grid
      container
      spacing={3}
    >
      <Grid
        item
        xs={12}
        md={8}
      >
        <Paper
          variant='outlined'
          sx={{ p: 3, borderRadius: 3 }}
        >
          <Typography
            variant='h6'
            sx={{ fontWeight: 600, mb: 2 }}
          >
            {t('ai.model_settings.config.current_model', { name: selectedModel.name })}
          </Typography>
          <Divider sx={{ mb: 3 }} />

          <Box sx={{ mb: 3 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
              <Typography
                variant='body2'
                sx={{ fontWeight: 500 }}
              >
                {t('ai.model_settings.config.temperature')}
              </Typography>
              <Typography
                variant='body2'
                color='primary.main'
                sx={{ fontWeight: 600 }}
              >
                {temperature.toFixed(1)}
              </Typography>
            </Box>
            <Slider
              value={temperature}
              onChange={(_, v) => onTemperatureChange(v as number)}
              step={0.1}
              min={0}
              max={2}
              valueLabelDisplay='auto'
            />
            <Typography
              variant='caption'
              color='text.secondary'
            >
              {t('ai.model_settings.config.temperature_desc')}
            </Typography>
          </Box>

          <Box sx={{ mb: 3 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
              <Typography
                variant='body2'
                sx={{ fontWeight: 500 }}
              >
                {t('ai.model_settings.config.max_tokens_label')}
              </Typography>
              <Typography
                variant='body2'
                color='primary.main'
                sx={{ fontWeight: 600 }}
              >
                {maxTokens}
              </Typography>
            </Box>
            <Slider
              value={maxTokens}
              onChange={(_, v) => onMaxTokensChange(v as number)}
              step={128}
              min={256}
              max={selectedModel.max_tokens}
              valueLabelDisplay='auto'
            />
            <Typography
              variant='caption'
              color='text.secondary'
            >
              {t('ai.model_settings.config.max_tokens_desc')}
            </Typography>
          </Box>

          <Box sx={{ mb: 3 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
              <Typography
                variant='body2'
                sx={{ fontWeight: 500 }}
              >
                Top P
              </Typography>
              <Typography
                variant='body2'
                color='primary.main'
                sx={{ fontWeight: 600 }}
              >
                {topP.toFixed(1)}
              </Typography>
            </Box>
            <Slider
              value={topP}
              onChange={(_, v) => onTopPChange(v as number)}
              step={0.1}
              min={0}
              max={1}
              valueLabelDisplay='auto'
            />
            <Typography
              variant='caption'
              color='text.secondary'
            >
              {t('ai.model_settings.config.top_p_desc')}
            </Typography>
          </Box>

          <Box sx={{ mb: 3 }}>
            <Typography
              variant='body2'
              sx={{ fontWeight: 500, mb: 1 }}
            >
              {t('ai.model_settings.config.system_prompt_label')}
            </Typography>
            <TextField
              fullWidth
              multiline
              rows={4}
              value={systemPrompt}
              onChange={(e) => onSystemPromptChange(e.target.value)}
              placeholder={t('ai.model_settings.placeholder.system_prompt')}
            />
          </Box>

          <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 1 }}>
            <Button
              variant='outlined'
              startIcon={<RefreshCw size={16} />}
            >
              {t('ai.model_settings.action.reset_default')}
            </Button>
            <Button
              variant='contained'
              startIcon={
                saving ? (
                  <RefreshCw
                    size={16}
                    className='animate-spin'
                  />
                ) : (
                  <Save size={16} />
                )
              }
              onClick={onSaveConfig}
              disabled={saving}
            >
              {saving
                ? t('ai.model_settings.status.saving')
                : t('ai.model_settings.action.save_config')}
            </Button>
          </Box>
        </Paper>
      </Grid>

      <Grid
        item
        xs={12}
        md={4}
      >
        <Paper
          variant='outlined'
          sx={{ p: 3, borderRadius: 3 }}
        >
          <Typography
            variant='subtitle1'
            sx={{ fontWeight: 600, mb: 2 }}
          >
            {t('ai.model_settings.config.other_settings')}
          </Typography>
          <Divider sx={{ mb: 2 }} />

          <List disablePadding>
            <ListItem sx={{ px: 0 }}>
              <ListItemIcon sx={{ minWidth: 36 }}>
                <Server size={18} />
              </ListItemIcon>
              <ListItemText
                primary={t('ai.model_settings.config.streaming_output')}
                secondary={t('ai.model_settings.config.streaming_output_desc')}
              />
              <Switch defaultChecked />
            </ListItem>
            <ListItem sx={{ px: 0 }}>
              <ListItemIcon sx={{ minWidth: 36 }}>
                <Activity size={18} />
              </ListItemIcon>
              <ListItemText
                primary={t('ai.model_settings.config.use_history')}
                secondary={t('ai.model_settings.config.use_history_desc')}
              />
              <Switch defaultChecked />
            </ListItem>
            <ListItem sx={{ px: 0 }}>
              <ListItemIcon sx={{ minWidth: 36 }}>
                <Zap size={18} />
              </ListItemIcon>
              <ListItemText
                primary={t('ai.model_settings.config.auto_retry')}
                secondary={t('ai.model_settings.config.auto_retry_desc')}
              />
              <Switch defaultChecked />
            </ListItem>
          </List>
        </Paper>
      </Grid>
    </Grid>
  );
};
