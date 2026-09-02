import React from 'react';
import { Box, Typography, Card, CardContent, Avatar, Divider, Chip } from '@mui/material';
import { Cpu, Layers, CheckCircle2, Clock, AlertCircle } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Grid } from '@/components/common';
import type { AIModel } from '../hooks/useAiModelSettings';
import { getMockModels, getStatusConfig } from '../hooks/useAiModelSettings';

interface AiModelSettingsListProps {
  selectedModel: AIModel;
  onSelectModel: (model: AIModel) => void;
}

export const AiModelSettingsList: React.FC<AiModelSettingsListProps> = ({
  selectedModel,
  onSelectModel,
}) => {
  const { t } = useTranslation();
  const mockModels = getMockModels(t);

  const renderStatusIcon = (iconName: string) => {
    switch (iconName) {
      case 'CheckCircle2':
        return <CheckCircle2 size={14} />;
      case 'Clock':
        return <Clock size={14} />;
      case 'AlertCircle':
        return <AlertCircle size={14} />;
      default:
        return;
    }
  };

  return (
    <Box>
      <Grid
        container
        spacing={2}
      >
        {mockModels.map((model) => (
          <Grid
            item
            xs={12}
            md={6}
            lg={4}
            key={model.id}
          >
            <Card
              variant='outlined'
              sx={{
                borderRadius: 3,
                borderColor: selectedModel.id === model.id ? 'primary.main' : 'divider',
                cursor: 'pointer',
                transition: 'all 0.2s',
                '&:hover': {
                  boxShadow: 2,
                },
              }}
              onClick={() => onSelectModel(model)}
            >
              <CardContent sx={{ p: 2.5, '&:last-child': { pb: 2.5 } }}>
                <Box
                  sx={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'flex-start',
                    mb: 2,
                  }}
                >
                  <Avatar
                    sx={{
                      width: 48,
                      height: 48,
                      bgcolor: model.type === 'chat' ? 'primary.50' : 'success.50',
                      color: model.type === 'chat' ? 'primary.main' : 'success.main',
                    }}
                  >
                    {model.type === 'chat' ? <Cpu size={24} /> : <Layers size={24} />}
                  </Avatar>
                  <Chip
                    icon={renderStatusIcon(getStatusConfig(model.status).icon)}
                    label={getStatusConfig(model.status).label}
                    size='small'
                    color={getStatusConfig(model.status).color}
                    sx={{ height: 24 }}
                  />
                </Box>

                <Box sx={{ mb: 1 }}>
                  <Typography
                    variant='subtitle1'
                    sx={{ fontWeight: 600 }}
                  >
                    {model.name}
                    {model.is_default && (
                      <Chip
                        label={t('ai.model_settings.field.default')}
                        size='small'
                        color='primary'
                        sx={{ ml: 1, height: 20 }}
                      />
                    )}
                  </Typography>
                  <Typography
                    variant='caption'
                    color='text.secondary'
                  >
                    {model.provider}
                  </Typography>
                </Box>

                <Typography
                  variant='body2'
                  color='text.secondary'
                  sx={{ mb: 2, minHeight: 40 }}
                >
                  {model.description}
                </Typography>

                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, mb: 2 }}>
                  {model.capabilities.map((cap) => (
                    <Chip
                      key={cap}
                      label={cap}
                      size='small'
                      variant='outlined'
                      sx={{ fontSize: 11 }}
                    />
                  ))}
                </Box>

                <Divider sx={{ mb: 1.5 }} />

                <Grid
                  container
                  spacing={1}
                >
                  <Grid
                    item
                    xs={6}
                  >
                    <Typography
                      variant='caption'
                      color='text.secondary'
                    >
                      {t('ai.model_settings.field.max_tokens')}
                    </Typography>
                    <Typography
                      variant='body2'
                      sx={{ fontWeight: 500 }}
                    >
                      {model.max_tokens.toLocaleString()}
                    </Typography>
                  </Grid>
                  <Grid
                    item
                    xs={6}
                  >
                    <Typography
                      variant='caption'
                      color='text.secondary'
                    >
                      {t('ai.model_settings.field.input_price')}
                    </Typography>
                    <Typography
                      variant='body2'
                      sx={{ fontWeight: 500 }}
                    >
                      ${model.pricing.input_per_1k}/1K
                    </Typography>
                  </Grid>
                </Grid>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>
    </Box>
  );
};
