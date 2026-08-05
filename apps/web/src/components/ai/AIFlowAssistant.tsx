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
import { Workflow, RefreshCw, Lightbulb, ArrowRight, CheckCircle, Clock, User } from 'lucide-react';
import { assistantApi } from '../../api/ai/assistant';
import { useNotificationStore } from '@/store/notificationStore';
import { logger } from '@/utils/logger';

export interface AIFlowAssistantProps {
  initialQuery?: string;
  module?: string;
}

export const AIFlowAssistant: React.FC<AIFlowAssistantProps> = ({ initialQuery, module }) => {
  const [query, setQuery] = useState(initialQuery || '');
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const addNotification = useNotificationStore((state) => state.addNotification);

  const handleAnalyzeFlow = async () => {
    if (!query.trim()) {
      addNotification({ title: '警告', message: '请输入查询内容', type: 'warning' });
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
        setResult(response.data);
        addNotification({ title: '成功', message: '流程分析完成', type: 'success' });
      } else {
        setError(response.message || '流程分析失败');
      }
    } catch (err: unknown) {
      logger.error('流程助手调用失败:', err);
      setError('流程助手服务暂不可用');
      addNotification({ title: '错误', message: '流程助手服务暂不可用', type: 'error' });
    } finally {
      setIsLoading(false);
    }
  };

  const examples = [
    '如何创建采购订单',
    '销售订单审批流程',
    '库存盘点流程',
    '费用报销流程',
    '生产工单创建流程',
  ];

  const moduleOptions = [
    { value: 'erp', label: 'ERP' },
    { value: 'mes', label: 'MES' },
    { value: 'crm', label: 'CRM' },
    { value: 'srm', label: 'SRM' },
    { value: 'workflow', label: '工作流' },
  ];

  return (
    <Card>
      <CardHeader
        title='AI 流程助手'
        subheader='用自然语言描述您想要了解的流程，AI 将为您提供详细指导'
      />
      <CardContent>
        <Box sx={{ mb: 3 }}>
          <Typography
            variant='subtitle2'
            sx={{ mb: 2, color: 'text.secondary' }}
          >
            快速示例:
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
          label='输入流程需求'
          placeholder='例如：如何创建销售订单'
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
            选择模块（可选）:
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
          {isLoading ? '分析中...' : '分析流程'}
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
                  {result.steps.map((step: any, idx: number) => (
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
                            步骤 {idx + 1}: {step.name}
                          </Typography>
                        </Box>
                      </StepLabel>
                      <StepContent>
                        <Typography
                          variant='body2'
                          sx={{ mb: 2 }}
                        >
                          {step.description}
                        </Typography>
                        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2 }}>
                          {step.responsible && (
                            <Chip
                              size='small'
                              label={step.responsible}
                              icon={<User size={14} />}
                              sx={{ bgcolor: 'primary.100', color: 'primary.dark' }}
                            />
                          )}
                          {step.estimated_time && (
                            <Chip
                              size='small'
                              label={step.estimated_time}
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
                          优化建议
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
