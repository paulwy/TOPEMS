import React, { useState } from 'react';
import {
  Box,
  Button,
  Card,
  CardContent,
  CardHeader,
  Chip,
  TextField,
  Typography,
  Alert,
  Stepper,
  Step,
  StepLabel,
  StepContent,
} from '@mui/material';
import i18n from '@/i18n';
import { Workflow, RefreshCw, Lightbulb, ArrowRight, CheckCircle, Clock, User } from 'lucide-react';
import { assistantApi } from '../../api/ai/assistant';
import { useNotificationStore } from '@/store/notificationStore';
import { logger } from '@/utils/logger';

export interface AIFlowAssistantProps {
  initialQuery?: string;
  module?: string;
}

interface FlowResult {
  title: string;
  description: string;
  steps: Record<string, unknown>[];
  suggestions?: string[];
}

export const AIFlowAssistant: React.FC<AIFlowAssistantProps> = ({ initialQuery, module }) => {
  const [query, setQuery] = useState(initialQuery || '');
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<FlowResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const addNotification = useNotificationStore((state) => state.addNotification);

  const handleAnalyzeFlow = async () => {
    if (!query.trim()) {
      addNotification({
        title: i18n.t('components.ai_flow_assistant.k1'),
        message: i18n.t('components.ai_flow_assistant.k0'),
        type: 'warning',
      });
      return;
    }

    setIsLoading(true);
    setError(null);
    setResult(null);

    try {
      const response = await assistantApi.flowAssistant({
        query: query.trim(),
        module,
      });

      if (response.success && response.data) {
        setResult({
          title: response.data.title,
          description: response.data.description ?? '',
          steps: response.data.steps as unknown as Record<string, unknown>[],
          suggestions: response.data.suggestions,
        });
        addNotification({
          title: i18n.t('components.ai_flow_assistant.k3'),
          message: i18n.t('components.ai_flow_assistant.k2'),
          type: 'success',
        });
      } else {
        setError(response.message || i18n.t('components.ai_flow_assistant.k4'));
      }
    } catch (err: unknown) {
      logger.error(i18n.t('components.ai_flow_assistant.k0'), err);
      setError(i18n.t('components.ai_flow_assistant.k5'));
      addNotification({
        title: i18n.t('components.ai_flow_assistant.k7'),
        message: i18n.t('components.ai_flow_assistant.k6'),
        type: 'error',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const examples = [
    i18n.t('components.ai_flow_assistant.k8'),
    i18n.t('components.ai_flow_assistant.k9'),
    i18n.t('components.ai_flow_assistant.k10'),
    i18n.t('components.ai_flow_assistant.k11'),
    i18n.t('components.ai_flow_assistant.k12'),
  ];

  const moduleOptions = [
    { value: 'erp', label: 'ERP' },
    { value: 'mes', label: 'MES' },
    { value: 'crm', label: 'CRM' },
    { value: 'srm', label: 'SRM' },
    { value: 'workflow', label: i18n.t('components.ai_flow_assistant.k13') },
  ];

  return (
    <Card>
      <CardHeader
        title={i18n.t('components.ai_flow_assistant.ai_1')}
        subheader={i18n.t('components.ai_flow_assistant.k14')}
      />
      <CardContent>
        <Box sx={{ mb: 3 }}>
          <Typography
            variant='subtitle2'
            sx={{ mb: 2, color: 'text.secondary' }}
          >
            [i18n.t('components.ai_flow_assistant.k2')]:
          </Typography>
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1.5 }}>
            {examples.map((example, idx) => (
              <Chip
                key={idx}
                label={example}
                size='small'
                onClick={() => setQuery(example)}
                sx={{ cursor: 'pointer', bgcolor: 'grey.100', '&:hover': { bgcolor: 'grey.200' } }}
              />
            ))}
          </Box>
        </Box>

        <TextField
          fullWidth
          label={i18n.t('components.ai_flow_assistant.k15')}
          placeholder={i18n.t('components.ai_flow_assistant.k16')}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          size='small'
          sx={{ mb: 3 }}
        />

        <Box sx={{ mb: 3 }}>
          <Typography
            variant='subtitle2'
            sx={{ mb: 1.5, color: 'text.secondary' }}
          >
            {i18n.t('components.ai_flow_assistant.k3')}
          </Typography>
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1.5 }}>
            {moduleOptions.map((option) => (
              <Chip
                key={option.value}
                label={option.label}
                size='small'
                onClick={() => setQuery(`${option.label}: ${query}`)}
                sx={{ cursor: 'pointer', bgcolor: 'grey.100', '&:hover': { bgcolor: 'grey.200' } }}
              />
            ))}
          </Box>
        </Box>

        <Button
          variant='contained'
          onClick={handleAnalyzeFlow}
          disabled={isLoading || !query.trim()}
          startIcon={
            isLoading ? (
              <RefreshCw
                size={18}
                sx={{ animation: 'spin 1s linear infinite' }}
              />
            ) : (
              <Workflow size={18} />
            )
          }
          fullWidth
        >
          {isLoading
            ? i18n.t('components.ai_flow_assistant.k4')
            : i18n.t('components.ai_flow_assistant.k17')}
        </Button>

        {error && (
          <Alert
            severity='error'
            sx={{ mt: 3 }}
          >
            {error}
          </Alert>
        )}

        {result && (
          <Box sx={{ mt: 4 }}>
            <Card>
              <CardHeader
                title={result.title}
                subheader={result.description}
              />
              <CardContent>
                <Stepper
                  activeStep={result.steps.length - 1}
                  orientation='vertical'
                  sx={{ mb: 4 }}
                >
                  {result.steps.map((step: Record<string, unknown>, idx: number) => (
                    <Step key={idx}>
                      <StepLabel
                        icon={
                          <CheckCircle
                            size={20}
                            sx={{ color: 'success.500' }}
                          />
                        }
                      >
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                          <Typography
                            variant='subtitle1'
                            sx={{ fontWeight: 600 }}
                          >
                            {i18n.t('components.ai_flow_assistant.k0')} {idx + 1}:{' '}
                            {step.name as string}
                          </Typography>
                        </Box>
                      </StepLabel>
                      <StepContent>
                        <Typography
                          variant='body2'
                          sx={{ mb: 2 }}
                        >
                          {step.description as string}
                        </Typography>
                        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2 }}>
                          {(step.responsible as string | undefined) && (
                            <Chip
                              size='small'
                              label={step.responsible as string}
                              icon={<User size={14} />}
                              sx={{ bgcolor: 'primary.100', color: 'primary.dark' }}
                            />
                          )}
                          {(step.estimated_time as string | undefined) && (
                            <Chip
                              size='small'
                              label={step.estimated_time as string}
                              icon={<Clock size={14} />}
                              sx={{ bgcolor: 'grey.100' }}
                            />
                          )}
                        </Box>
                      </StepContent>
                    </Step>
                  ))}
                </Stepper>

                {result.suggestions && result.suggestions.length > 0 && (
                  <Card sx={{ mt: 4 }}>
                    <CardContent>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
                        <Lightbulb
                          size={20}
                          sx={{ color: 'warning.500' }}
                        />
                        <Typography
                          variant='subtitle1'
                          sx={{ fontWeight: 600 }}
                        >
                          {i18n.t('components.ai_flow_assistant.k5')}
                        </Typography>
                      </Box>
                      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                        {result.suggestions.map((suggestion: string, idx: number) => (
                          <Box
                            key={idx}
                            sx={{ display: 'flex', alignItems: 'flex-start', gap: 2 }}
                          >
                            <ArrowRight
                              size={16}
                              sx={{ color: 'warning.500', mt: 0.5, flexShrink: 0 }}
                            />
                            <Typography variant='body2'>{suggestion}</Typography>
                          </Box>
                        ))}
                      </Box>
                    </CardContent>
                  </Card>
                )}
              </CardContent>
            </Card>
          </Box>
        )}
      </CardContent>
    </Card>
  );
};
