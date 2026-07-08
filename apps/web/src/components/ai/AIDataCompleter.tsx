import { Card, CardContent, Box, Typography, Button } from '@mui/material';
import { useState, useEffect } from 'react';
import { Sparkles, Check } from 'lucide-react';

import { AIGenerateModal } from './AIGenerateModal';
import { useAIHelper } from '../../hooks/useAIHelper';
import type { CompleteRequest, CompletionItem, CompleteResponse } from '@/types/ai';

export interface AIDataCompleterProps {
  isOpen: boolean;
  onClose: () => void;
  completeRequest: CompleteRequest;
  onApplyCompletion: (_completions: Record<string, CompletionItem>) => void;
}

const sourceColorMap: Record<string, string> = {
  inference: 'purple.100',
  history: 'blue.100',
  knowledge: 'green.100',
};

const sourceTextColorMap: Record<string, string> = {
  inference: 'purple.700',
  history: 'blue.700',
  knowledge: 'green.700',
};

const sourceLabelMap: Record<string, string> = {
  inference: '智能推断',
  history: '历史数据',
  knowledge: '知识库',
};

export function AIDataCompleter({
  isOpen,
  onClose,
  completeRequest,
  onApplyCompletion,
}: AIDataCompleterProps) {
  const [completions, setCompletions] = useState<Record<string, CompletionItem>>({});
  const [selectedFields, setSelectedFields] = useState<Set<string>>(new Set());

  const { isLoading, complete } = useAIHelper<CompleteResponse>({
    featureType: 'complete',
    onSuccess: (result) => {
      const data = result as CompleteResponse;
      if (data?.completions) {
        setCompletions(data.completions);
        setSelectedFields(new Set(Object.keys(data.completions)));
      }
    },
  });

  useEffect(() => {
    if (isOpen) {
      setCompletions({});
      setSelectedFields(new Set());
      handleComplete();
    }
  }, [isOpen]);

  const handleComplete = async () => {
    // 兼容 data 和 partialData 字段
    const request = {
      ...completeRequest,
      partialData: completeRequest.partialData || completeRequest.data,
    };
    await complete(request);
  };

  const toggleField = (field: string) => {
    const newSelected = new Set(selectedFields);
    if (newSelected.has(field)) {
      newSelected.delete(field);
    } else {
      newSelected.add(field);
    }
    setSelectedFields(newSelected);
  };

  const handleApply = () => {
    const selectedCompletions: Record<string, CompletionItem> = {};
    selectedFields.forEach((field) => {
      if (completions[field]) {
        selectedCompletions[field] = completions[field];
      }
    });
    onApplyCompletion(selectedCompletions);
    onClose();
  };

  const selectAll = () => {
    setSelectedFields(new Set(Object.keys(completions)));
  };

  const selectNone = () => {
    setSelectedFields(new Set());
  };

  const hasCompletions = Object.keys(completions).length > 0;

  return (
    <AIGenerateModal
      isOpen={isOpen}
      onClose={onClose}
      title='AI 智能补全'
      description='AI 根据已有信息推断并补全相关字段'
      isLoading={isLoading}
      onConfirm={hasCompletions && selectedFields.size > 0 ? handleApply : undefined}
      confirmText='应用所选'
    >
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <Typography
            variant='body2'
            sx={{ fontWeight: 500 }}
          >
            推荐补全的字段
          </Typography>
          {hasCompletions && (
            <Box sx={{ display: 'flex', gap: 1 }}>
              <Button
                variant='outlined'
                size='small'
                onClick={selectAll}
              >
                全选
              </Button>
              <Button
                variant='outlined'
                size='small'
                onClick={selectNone}
              >
                取消
              </Button>
            </Box>
          )}
        </Box>

        {hasCompletions ? (
          <Box
            sx={{
              display: 'flex',
              flexDirection: 'column',
              gap: 1,
              maxHeight: 320,
              overflowY: 'auto',
            }}
          >
            {Object.entries(completions).map(([field, item]) => (
              <Card
                key={field}
                sx={{
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                  borderColor: selectedFields.has(field) ? 'purple.500' : 'grey.300',
                  bgcolor: selectedFields.has(field) ? 'purple.50' : 'background.paper',
                  '&:hover': { borderColor: 'purple.200' },
                }}
                onClick={() => toggleField(field)}
              >
                <CardContent sx={{ p: 2 }}>
                  <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 2 }}>
                    <Box
                      sx={{
                        width: 20,
                        height: 20,
                        borderRadius: '50%',
                        border: 2,
                        borderColor: selectedFields.has(field) ? 'purple.600' : 'grey.300',
                        bgcolor: selectedFields.has(field) ? 'purple.600' : 'white',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        mt: 0.25,
                      }}
                    >
                      {selectedFields.has(field) && (
                        <Check
                          size={12}
                          color='white'
                        />
                      )}
                    </Box>
                    <Box sx={{ flex: 1 }}>
                      <Box
                        sx={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                        }}
                      >
                        <Typography
                          variant='body2'
                          sx={{ fontWeight: 500 }}
                        >
                          {field}
                        </Typography>
                        <Typography
                          variant='caption'
                          sx={{
                            px: 1,
                            py: 0.25,
                            borderRadius: 1,
                            bgcolor: sourceColorMap[item.source] || sourceColorMap.inference,
                            color: sourceTextColorMap[item.source] || sourceTextColorMap.inference,
                          }}
                        >
                          {sourceLabelMap[item.source] || item.source}
                        </Typography>
                      </Box>
                      <Box
                        sx={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: 1,
                          mt: 0.5,
                        }}
                      >
                        <Typography
                          variant='body2'
                          sx={{
                            fontFamily: 'monospace',
                            color: 'grey.700',
                            bgcolor: 'white',
                            px: 1,
                            py: 0.5,
                            borderRadius: 1,
                            border: '1px solid',
                            borderColor: 'grey.200',
                            flex: 1,
                          }}
                        >
                          {String(item.value)}
                        </Typography>
                        <Box
                          sx={{
                            display: 'flex',
                            alignItems: 'center',
                            fontSize: '0.75rem',
                            color: 'grey.500',
                          }}
                        >
                          <span>置信度:</span>
                          <Box
                            sx={{
                              ml: 0.5,
                              display: 'flex',
                              alignItems: 'center',
                              gap: 0.5,
                            }}
                          >
                            <Box
                              sx={{
                                width: 64,
                                height: 6,
                                bgcolor: 'grey.200',
                                borderRadius: 1,
                                overflow: 'hidden',
                              }}
                            >
                              <Box
                                sx={{
                                  height: '100%',
                                  bgcolor: 'purple.500',
                                  width: `${item.confidence * 100}%`,
                                }}
                              />
                            </Box>
                            <span>{Math.round(item.confidence * 100)}%</span>
                          </Box>
                        </Box>
                      </Box>
                    </Box>
                  </Box>
                </CardContent>
              </Card>
            ))}
          </Box>
        ) : (
          <Box sx={{ textAlign: 'center', py: 4, color: 'grey.500' }}>
            <Sparkles
              size={40}
              style={{ opacity: 0.5, margin: '0 auto 12px' }}
            />
            <Typography variant='body2'>正在分析数据...</Typography>
          </Box>
        )}
      </Box>
    </AIGenerateModal>
  );
}
