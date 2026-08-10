/**
 * @done V80 split
 * Flow assistant + Anomaly prediction tab: forms, steps, anomaly table.
 */
import React from 'react';
import {
  Box,
  Typography,
  TextField,
  Button,
  Paper,
  Chip,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Grid,
  CircularProgress,
  Divider,
  Alert,
} from '@mui/material';
import { Send } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import type { FlowAssistantResponse, AnomalyPredictResponse } from '@/api/ai';
import MetricCard from './AiAssistantMetricCard';

const getSeverityColor = (severity: string) => {
  switch (severity) {
    case 'high':
      return 'error';
    case 'medium':
      return 'warning';
    case 'low':
      return 'info';
    default:
      return 'default';
  }
};

const FlowResultView: React.FC<{ result: FlowAssistantResponse }> = ({ result }) => {
  const { t } = useTranslation();
  return (
    <Box sx={{ mt: 3 }}>
      <Typography
        variant='h6'
        sx={{ mb: 1 }}
      >
        {result.title}
      </Typography>
      {result.description && (
        <Typography
          variant='body2'
          color='text.secondary'
          sx={{ mb: 2 }}
        >
          {result.description}
        </Typography>
      )}
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        {result.steps.map((step) => (
          <Paper
            key={step.step}
            sx={{ p: 2, borderLeft: 4, borderColor: 'primary.main' }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
              <Chip
                label={t('ai.assistant.flow.step_label')}
                size='small'
                color='primary'
              />
              <Typography
                variant='subtitle1'
                sx={{ fontWeight: 600 }}
              >
                {step.name}
              </Typography>
            </Box>
            <Typography
              variant='body2'
              sx={{ mb: 0.5 }}
            >
              {step.description}
            </Typography>
            <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
              {step.responsible && (
                <Chip
                  label={t('ai.assistant.flow.responsible', { person: step.responsible })}
                  size='small'
                  variant='outlined'
                />
              )}
              {step.estimated_time && (
                <Chip
                  label={t('ai.assistant.flow.estimated_time', { time: step.estimated_time })}
                  size='small'
                  variant='outlined'
                />
              )}
            </Box>
          </Paper>
        ))}
      </Box>
      {result.suggestions && result.suggestions.length > 0 && (
        <Box sx={{ mt: 2 }}>
          <Typography
            variant='subtitle2'
            sx={{ mb: 1 }}
          >
            {t('ai.assistant.flow.optimization_suggestion')}
          </Typography>
          {result.suggestions.map((suggestion, index) => (
            <Alert
              key={index}
              severity='info'
              sx={{ mb: 1 }}
            >
              {suggestion}
            </Alert>
          ))}
        </Box>
      )}
    </Box>
  );
};

const AnomalyResultView: React.FC<{ result: AnomalyPredictResponse }> = ({ result }) => {
  const { t } = useTranslation();
  const getSeverityLabel = (severity: string) => {
    switch (severity) {
      case 'high':
        return t('ai.assistant.severity.high');
      case 'medium':
        return t('ai.assistant.severity.medium');
      case 'low':
        return t('ai.assistant.severity.low');
      default:
        return severity;
    }
  };
  return (
    <Box sx={{ mt: 3 }}>
      <Typography
        variant='h6'
        sx={{ mb: 1 }}
      >
        {t('ai.assistant.anomaly.result_title')}：{result.metric}
      </Typography>
      <Typography
        variant='body2'
        color='text.secondary'
        sx={{ mb: 2 }}
      >
        {result.summary}
      </Typography>
      <Grid
        container
        spacing={2}
        sx={{ mb: 2 }}
      >
        <Grid size={{ xs: 12, sm: 6 }}>
          <MetricCard
            label={t('ai.assistant.anomaly.count')}
            value={result.anomaly_count}
          />
        </Grid>
      </Grid>
      {result.anomalies.length > 0 && (
        <TableContainer component={Paper}>
          <Table size='small'>
            <TableHead>
              <TableRow>
                <TableCell>{t('ai.assistant.anomaly.time')}</TableCell>
                <TableCell>{t('ai.assistant.anomaly.actual')}</TableCell>
                <TableCell>{t('ai.assistant.anomaly.expected')}</TableCell>
                <TableCell>{t('ai.assistant.anomaly.severity')}</TableCell>
                <TableCell>{t('ai.assistant.anomaly.reason')}</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {result.anomalies.map((anomaly, index) => (
                <TableRow key={index}>
                  <TableCell>{anomaly.timestamp}</TableCell>
                  <TableCell>{anomaly.value}</TableCell>
                  <TableCell>{anomaly.expected ?? '-'}</TableCell>
                  <TableCell>
                    <Chip
                      label={getSeverityLabel(anomaly.severity)}
                      color={
                        getSeverityColor(anomaly.severity) as
                          'error' | 'warning' | 'info' | 'default'
                      }
                      size='small'
                    />
                  </TableCell>
                  <TableCell>{anomaly.reason ?? '-'}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}
      {result.suggestions && result.suggestions.length > 0 && (
        <Box sx={{ mt: 2 }}>
          {result.suggestions.map((suggestion, index) => (
            <Alert
              key={index}
              severity='warning'
              sx={{ mb: 1 }}
            >
              {suggestion}
            </Alert>
          ))}
        </Box>
      )}
    </Box>
  );
};

export interface AiAssistantFlowTabProps {
  flowQuery: string;
  setFlowQuery: (v: string) => void;
  flowModule: string;
  setFlowModule: (v: string) => void;
  flowResult: FlowAssistantResponse | null;
  onFlowSubmit: () => void;

  anomalyMetric: string;
  setAnomalyMetric: (v: string) => void;
  anomalyTimeRange: string;
  setAnomalyTimeRange: (v: string) => void;
  anomalyResult: AnomalyPredictResponse | null;
  onAnomalySubmit: () => void;

  loading: boolean;
}

const AiAssistantFlowTab: React.FC<AiAssistantFlowTabProps> = ({
  flowQuery,
  setFlowQuery,
  flowModule,
  setFlowModule,
  flowResult,
  onFlowSubmit,
  anomalyMetric,
  setAnomalyMetric,
  anomalyTimeRange,
  setAnomalyTimeRange,
  anomalyResult,
  onAnomalySubmit,
  loading,
}) => {
  const { t } = useTranslation();

  return (
    <Box>
      <Paper sx={{ p: 3, mb: 3 }}>
        <Typography
          variant='h6'
          sx={{ mb: 2 }}
        >
          {t('ai.assistant.flow.title')}
        </Typography>
        <Typography
          variant='body2'
          color='text.secondary'
          sx={{ mb: 2 }}
        >
          {t('ai.assistant.flow.desc')}
        </Typography>
        <TextField
          fullWidth
          label={t('ai.assistant.flow.label.query')}
          placeholder={t('ai.assistant.flow.placeholder.query')}
          value={flowQuery}
          onChange={(e) => setFlowQuery(e.target.value)}
          sx={{ mb: 2 }}
        />
        <TextField
          fullWidth
          label={t('ai.assistant.flow.label.module')}
          placeholder={t('ai.assistant.flow.placeholder.module')}
          value={flowModule}
          onChange={(e) => setFlowModule(e.target.value)}
          sx={{ mb: 2 }}
        />
        <Button
          variant='contained'
          startIcon={
            loading ? (
              <CircularProgress
                size={18}
                color='inherit'
              />
            ) : (
              <Send size={18} />
            )
          }
          onClick={onFlowSubmit}
          disabled={loading || !flowQuery.trim()}
        >
          {t('ai.assistant.flow.button.analyze')}
        </Button>
      </Paper>
      {flowResult && <FlowResultView result={flowResult} />}

      <Divider sx={{ my: 3 }} />

      <Paper sx={{ p: 3 }}>
        <Typography
          variant='h6'
          sx={{ mb: 2 }}
        >
          {t('ai.assistant.anomaly.section_title')}
        </Typography>
        <Typography
          variant='body2'
          color='text.secondary'
          sx={{ mb: 2 }}
        >
          {t('ai.assistant.anomaly.desc')}
        </Typography>
        <TextField
          fullWidth
          label={t('ai.assistant.anomaly.label.metric')}
          placeholder={t('ai.assistant.anomaly.placeholder.metric')}
          value={anomalyMetric}
          onChange={(e) => setAnomalyMetric(e.target.value)}
          sx={{ mb: 2 }}
        />
        <TextField
          fullWidth
          label={t('ai.assistant.anomaly.label.time_range')}
          placeholder={t('ai.assistant.anomaly.placeholder.time_range')}
          value={anomalyTimeRange}
          onChange={(e) => setAnomalyTimeRange(e.target.value)}
          sx={{ mb: 2 }}
        />
        <Button
          variant='outlined'
          startIcon={
            loading ? (
              <CircularProgress
                size={18}
                color='inherit'
              />
            ) : (
              <Send size={18} />
            )
          }
          onClick={onAnomalySubmit}
          disabled={loading || !anomalyMetric.trim()}
        >
          {t('ai.assistant.anomaly.button.predict')}
        </Button>
      </Paper>
      {anomalyResult && <AnomalyResultView result={anomalyResult} />}
    </Box>
  );
};

export default AiAssistantFlowTab;
