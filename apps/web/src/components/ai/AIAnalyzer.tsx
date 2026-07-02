import { useState, useEffect } from 'react';
import {
  Sparkles,
  RefreshCw,
  Copy,
  Check,
  ChevronDown,
  ChevronUp,
  TrendingUp,
  BarChart3,
  Users,
  Tag,
} from 'lucide-react';
import {Card, CardContent, Box, Typography, TextField, Chip, Button, useTheme} from '@mui/material';
import { AIGenerateModal } from './AIGenerateModal';
import { aiApi } from '../../api/ai';
import { logger } from '@/utils/logger';

export interface AIAnalyzerProps {
  isOpen: boolean;
  onClose: () => void;
  initialText?: string;
  onAnalysisComplete?: (_results: AnalysisResults) => void;
}

export interface AnalysisResults {
  sentiment?: SentimentResult;
  classification?: ClassificationResult;
  entities?: Entity[];
  keywords?: Keyword[];
}

export interface SentimentResult {
  sentiment: 'positive' | 'negative' | 'neutral';
  confidence: number;
  details?: {
    positive_words?: string[];
    negative_words?: string[];
    emotional_intensity?: number;
  };
}

export interface ClassificationResult {
  category: string;
  confidence: number;
  all_categories?: Array<{ category: string; score: number }>;
}

export interface Entity {
  text: string;
  entity_type: string;
  start_pos?: number;
  end_pos?: number;
  confidence: number;
}

export interface Keyword {
  text: string;
  score: number;
  frequency: number;
}

const sentimentColors: Record<string, { bg: string; text: string; label: string }> = {
  positive: { bg: 'success.lighter', text: 'success.700', label: '积极' },
  negative: { bg: 'error.lighter', text: 'error.dark', label: '消极' },
  neutral: { bg: 'grey.100', text: 'grey.700', label: '中性' },
};

export function AIAnalyzer({
  isOpen,
  onClose,
  initialText = '',
  onAnalysisComplete,
}: AIAnalyzerProps) {
  const theme = useTheme();
  const [text, setText] = useState(initialText);
  const [isLoading, setIsLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  const [sentimentResult, setSentimentResult] = useState<SentimentResult | null>(null);
  const [classificationResult, setClassificationResult] = useState<ClassificationResult | null>(
    null
  );
  const [entitiesResult, setEntitiesResult] = useState<Entity[]>([]);
  const [keywordsResult, setKeywordsResult] = useState<Keyword[]>([]);

  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    sentiment: true,
    classify: true,
    entities: true,
    keywords: true,
  });

  useEffect(() => {
    if (isOpen) {
      setText(initialText);
      clearResults();
      if (initialText.trim()) {
        runAllAnalysis();
      }
    }
  }, [isOpen, initialText]);

  const clearResults = () => {
    setSentimentResult(null);
    setClassificationResult(null);
    setEntitiesResult([]);
    setKeywordsResult([]);
  };

  const runAllAnalysis = async () => {
    if (!text.trim()) return;

    setIsLoading(true);

    try {
      await Promise.all([analyzeSentiment(), classifyText(), extractEntities(), extractKeywords()]);

      onAnalysisComplete?.({
        sentiment: sentimentResult || undefined,
        classification: classificationResult || undefined,
        entities: entitiesResult.length > 0 ? entitiesResult : undefined,
        keywords: keywordsResult.length > 0 ? keywordsResult : undefined,
      });
    } catch (error: unknown) {
      logger.error('分析失败:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const analyzeSentiment = async () => {
    try {
      const response = await aiApi.analyzeSentiment({ text });
      if (response.success && response.data) {
        setSentimentResult({
          sentiment: response.data.sentiment as 'positive' | 'negative' | 'neutral',
          confidence: response.data.confidence,
          details: response.data.details as any,
        });
      }
    } catch (error: unknown) {
      logger.error('情感分析失败:', error);
    }
  };

  const classifyText = async () => {
    try {
      const response = await aiApi.classifyText({ text });
      if (response.success && response.data) {
        setClassificationResult({
          category: response.data.category,
          confidence: response.data.confidence,
          all_categories: response.data.all_categories,
        });
      }
    } catch (error: unknown) {
      logger.error('文本分类失败:', error);
    }
  };

  const extractEntities = async () => {
    try {
      const response = await aiApi.extractEntities({ text });
      if (response.success && response.data) {
        setEntitiesResult(response.data.entities);
      }
    } catch (error: unknown) {
      logger.error('实体提取失败:', error);
    }
  };

  const extractKeywords = async () => {
    try {
      const response = await aiApi.extractKeywords({ text });
      if (response.success && response.data) {
        setKeywordsResult(response.data.keywords);
      }
    } catch (error: unknown) {
      logger.error('关键词提取失败:', error);
    }
  };

  const handleCopyResults = async () => {
    const results = {
      sentiment: sentimentResult,
      classification: classificationResult,
      entities: entitiesResult,
      keywords: keywordsResult,
    };
    try {
      await navigator.clipboard.writeText(JSON.stringify(results, null, 2));
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (error: unknown) {
      logger.error('复制失败:', error);
    }
  };

  const toggleSection = (section: string) => {
    setExpandedSections((prev) => ({
      ...prev,
      [section]: !prev[section],
    }));
  };

  const renderSpinner = () => (
    <RefreshCw
      style={{
        width: 16,
        height: 16,
        animation: 'spin 1s linear infinite',
        marginRight: 8,
      }}
    />
  );

  return (
    <AIGenerateModal
      isOpen={isOpen}
      onClose={onClose}
      title='AI 文本分析'
      description='分析文本的情感、分类、实体和关键词'
      isLoading={isLoading}
      onConfirm={undefined}
      confirmText=''
      extraActions={
        sentimentResult ||
        classificationResult ||
        entitiesResult.length > 0 ||
        keywordsResult.length > 0 ? (
          <Button
            variant='outlined'
            size='small'
            onClick={handleCopyResults}
            startIcon={
              copied ? (
                <Check style={{ width: 16, height: 16 }} />
              ) : (
                <Copy style={{ width: 16, height: 16 }} />
              )
            }
          >
            {copied ? '已复制' : '复制结果'}
          </Button>
        ) : null
      }
    >
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
        <TextField
          multiline
          rows={4}
          fullWidth
          label='输入文本'
          placeholder='请输入需要分析的文本...'
          value={text}
          onChange={(e) => setText(e.target.value)}
          size='small'
        />

        <Button
          onClick={runAllAnalysis}
          disabled={isLoading || !text.trim()}
          variant='contained'
          fullWidth
        >
          {isLoading ? (
            <>
              {renderSpinner()}
              分析中...
            </>
          ) : (
            <>
              <Sparkles style={{ width: 16, height: 16, marginRight: 8 }} />
              执行分析
            </>
          )}
        </Button>

        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          {/* 情感分析结果 */}
          {sentimentResult && (
            <Card>
              <CardContent sx={{ p: 2 }}>
                <Box
                  sx={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    cursor: 'pointer',
                  }}
                  onClick={() => toggleSection('sentiment')}
                >
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 3 }}>
                    <Box sx={{ p: 1.5, bgcolor: 'secondary.100', borderRadius: 1.5 }}>
                      <TrendingUp style={{ width: 20, height: 20, color: '#9333ea' }} />
                    </Box>
                    <Box>
                      <Typography
                        variant='h6'
                        component='h4'
                        sx={{ fontWeight: 500 }}
                      >
                        情感分析
                      </Typography>
                      <Box
                        sx={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: 1,
                          mt: 0.5,
                        }}
                      >
                        <Chip
                          size='small'
                          label={sentimentColors[sentimentResult.sentiment].label}
                          sx={{
                            bgcolor: sentimentColors[sentimentResult.sentiment].bg,
                            color: sentimentColors[sentimentResult.sentiment].text,
                          }}
                        />
                        <Typography
                          variant='caption'
                          sx={{ color: 'text.secondary' }}
                        >
                          置信度: {Math.round(sentimentResult.confidence * 100)}%
                        </Typography>
                      </Box>
                    </Box>
                  </Box>
                  {expandedSections.sentiment ? (
                    <ChevronUp style={{ width: 20, height: 20, color: theme.palette.text.disabled }} />
                  ) : (
                    <ChevronDown style={{ width: 20, height: 20, color: theme.palette.text.disabled }} />
                  )}
                </Box>
                {expandedSections.sentiment && sentimentResult.details && (
                  <Box
                    sx={{
                      mt: 3,
                      display: 'flex',
                      flexDirection: 'column',
                      gap: 2,
                    }}
                  >
                    {sentimentResult.details.positive_words &&
                      sentimentResult.details.positive_words.length > 0 && (
                        <Box>
                          <Typography
                            variant='caption'
                            sx={{
                              fontWeight: 500,
                              color: 'success.dark',
                              display: 'block',
                              mb: 0.5,
                            }}
                          >
                            积极词汇
                          </Typography>
                          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                            {sentimentResult.details.positive_words.map((word, idx) => (
                              <Chip
                                key={idx}
                                size='small'
                                variant='outlined'
                                label={word}
                                sx={{
                                  bgcolor: 'success.light',
                                  color: 'success.700',
                                  borderColor: 'success.light',
                                }}
                              />
                            ))}
                          </Box>
                        </Box>
                      )}
                    {sentimentResult.details.negative_words &&
                      sentimentResult.details.negative_words.length > 0 && (
                        <Box>
                          <Typography
                            variant='caption'
                            sx={{
                              fontWeight: 500,
                              color: 'error.dark',
                              display: 'block',
                              mb: 0.5,
                            }}
                          >
                            消极词汇
                          </Typography>
                          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                            {sentimentResult.details.negative_words.map((word, idx) => (
                              <Chip
                                key={idx}
                                size='small'
                                variant='outlined'
                                label={word}
                                sx={{
                                  bgcolor: 'error.light',
                                  color: 'error.darker',
                                  borderColor: 'error.light',
                                }}
                              />
                            ))}
                          </Box>
                        </Box>
                      )}
                    {sentimentResult.details.emotional_intensity !== undefined && (
                      <Box>
                        <Typography
                          variant='caption'
                          sx={{
                            fontWeight: 500,
                            color: 'text.secondary',
                            display: 'block',
                            mb: 0.5,
                          }}
                        >
                          情感强度
                        </Typography>
                        <Box
                          sx={{
                            width: '100%',
                            height: 8,
                            bgcolor: 'grey.200',
                            borderRadius: 4,
                          }}
                        >
                          <Box
                            sx={{
                              height: '100%',
                              bgcolor: '#a855f7',
                              borderRadius: 4,
                              width: `${sentimentResult.details.emotional_intensity * 100}%`,
                            }}
                          />
                        </Box>
                      </Box>
                    )}
                  </Box>
                )}
              </CardContent>
            </Card>
          )}

          {/* 文本分类结果 */}
          {classificationResult && (
            <Card>
              <CardContent sx={{ p: 2 }}>
                <Box
                  sx={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    cursor: 'pointer',
                  }}
                  onClick={() => toggleSection('classify')}
                >
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 3 }}>
                    <Box sx={{ p: 1.5, bgcolor: 'primary.100', borderRadius: 1.5 }}>
                      <BarChart3 style={{ width: 20, height: 20, color: theme.palette.primary.dark }} />
                    </Box>
                    <Box>
                      <Typography
                        variant='h6'
                        component='h4'
                        sx={{ fontWeight: 500 }}
                      >
                        文本分类
                      </Typography>
                      <Box
                        sx={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: 1,
                          mt: 0.5,
                        }}
                      >
                        <Chip
                          size='small'
                          label={classificationResult.category}
                          sx={{ bgcolor: 'primary.100', color: 'primary.dark' }}
                        />
                        <Typography
                          variant='caption'
                          sx={{ color: 'text.secondary' }}
                        >
                          置信度: {Math.round(classificationResult.confidence * 100)}%
                        </Typography>
                      </Box>
                    </Box>
                  </Box>
                  {expandedSections.classify ? (
                    <ChevronUp style={{ width: 20, height: 20, color: theme.palette.text.disabled }} />
                  ) : (
                    <ChevronDown style={{ width: 20, height: 20, color: theme.palette.text.disabled }} />
                  )}
                </Box>
                {expandedSections.classify &&
                  classificationResult.all_categories &&
                  classificationResult.all_categories.length > 0 && (
                    <Box sx={{ mt: 3 }}>
                      <Typography
                        variant='caption'
                        sx={{
                          fontWeight: 500,
                          color: 'text.secondary',
                          display: 'block',
                          mb: 1,
                        }}
                      >
                        各类别得分
                      </Typography>
                      <Box
                        sx={{
                          display: 'flex',
                          flexDirection: 'column',
                          gap: 1.5,
                        }}
                      >
                        {classificationResult.all_categories.map((item, idx) => (
                          <Box
                            key={idx}
                            sx={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: 2,
                            }}
                          >
                            <Typography
                              variant='body2'
                              sx={{
                                width: 80,
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                                whiteSpace: 'nowrap',
                              }}
                            >
                              {item.category}
                            </Typography>
                            <Box
                              sx={{
                                flex: 1,
                                height: 8,
                                bgcolor: 'grey.200',
                                borderRadius: 4,
                              }}
                            >
                              <Box
                                sx={{
                                  height: '100%',
                                  bgcolor: 'primary.main',
                                  borderRadius: 4,
                                  width: `${item.score * 100}%`,
                                }}
                              />
                            </Box>
                            <Typography
                              variant='caption'
                              sx={{ width: 48, textAlign: 'right' }}
                            >
                              {Math.round(item.score * 100)}%
                            </Typography>
                          </Box>
                        ))}
                      </Box>
                    </Box>
                  )}
              </CardContent>
            </Card>
          )}

          {/* 实体提取结果 */}
          {entitiesResult.length > 0 && (
            <Card>
              <CardContent sx={{ p: 2 }}>
                <Box
                  sx={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    cursor: 'pointer',
                  }}
                  onClick={() => toggleSection('entities')}
                >
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 3 }}>
                    <Box sx={{ p: 1.5, bgcolor: 'success.lighter', borderRadius: 1.5 }}>
                      <Users style={{ width: 20, height: 20, color: theme.palette.success.dark }} />
                    </Box>
                    <Box>
                      <Typography
                        variant='h6'
                        component='h4'
                        sx={{ fontWeight: 500 }}
                      >
                        实体提取
                      </Typography>
                      <Typography
                        variant='body2'
                        sx={{ color: 'text.secondary', mt: 0.5 }}
                      >
                        共识别到 {entitiesResult.length} 个实体
                      </Typography>
                    </Box>
                  </Box>
                  {expandedSections.entities ? (
                    <ChevronUp style={{ width: 20, height: 20, color: theme.palette.text.disabled }} />
                  ) : (
                    <ChevronDown style={{ width: 20, height: 20, color: theme.palette.text.disabled }} />
                  )}
                </Box>
                {expandedSections.entities && (
                  <Box
                    sx={{
                      mt: 3,
                      display: 'flex',
                      flexDirection: 'column',
                      gap: 1,
                    }}
                  >
                    {entitiesResult.map((entity, idx) => (
                      <Box
                        key={idx}
                        sx={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: 2,
                          p: 1.5,
                          bgcolor: 'grey.50',
                          borderRadius: 1,
                        }}
                      >
                        <Chip
                          size='small'
                          label={entity.entity_type}
                          sx={{ bgcolor: 'success.lighter', color: 'success.700' }}
                        />
                        <Typography
                          variant='body2'
                          sx={{ flex: 1, fontWeight: 500 }}
                        >
                          {entity.text}
                        </Typography>
                        <Typography
                          variant='caption'
                          sx={{ color: 'text.secondary' }}
                        >
                          {Math.round(entity.confidence * 100)}%
                        </Typography>
                      </Box>
                    ))}
                  </Box>
                )}
              </CardContent>
            </Card>
          )}

          {/* 关键词提取结果 */}
          {keywordsResult.length > 0 && (
            <Card>
              <CardContent sx={{ p: 2 }}>
                <Box
                  sx={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    cursor: 'pointer',
                  }}
                  onClick={() => toggleSection('keywords')}
                >
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 3 }}>
                    <Box sx={{ p: 1.5, bgcolor: '#ffedd5', borderRadius: 1.5 }}>
                      <Tag style={{ width: 20, height: 20, color: '#ea580c' }} />
                    </Box>
                    <Box>
                      <Typography
                        variant='h6'
                        component='h4'
                        sx={{ fontWeight: 500 }}
                      >
                        关键词提取
                      </Typography>
                      <Typography
                        variant='body2'
                        sx={{ color: 'text.secondary', mt: 0.5 }}
                      >
                        共提取到 {keywordsResult.length} 个关键词
                      </Typography>
                    </Box>
                  </Box>
                  {expandedSections.keywords ? (
                    <ChevronUp style={{ width: 20, height: 20, color: theme.palette.text.disabled }} />
                  ) : (
                    <ChevronDown style={{ width: 20, height: 20, color: theme.palette.text.disabled }} />
                  )}
                </Box>
                {expandedSections.keywords && (
                  <Box sx={{ mt: 3 }}>
                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                      {keywordsResult.map((keyword, idx) => (
                        <Chip
                          key={idx}
                          size='small'
                          label={
                            <Typography variant='caption'>
                              {keyword.text}
                              <Typography
                                component='span'
                                variant='caption'
                                sx={{ ml: 0.5, opacity: 0.7 }}
                              >
                                ({keyword.frequency})
                              </Typography>
                            </Typography>
                          }
                          sx={{ bgcolor: '#ffedd5', color: '#c2410c', px: 1.5 }}
                        />
                      ))}
                    </Box>
                    <Box
                      sx={{
                        mt: 3,
                        display: 'flex',
                        flexDirection: 'column',
                        gap: 1,
                      }}
                    >
                      {keywordsResult.slice(0, 5).map((keyword, idx) => (
                        <Box
                          key={idx}
                          sx={{ display: 'flex', alignItems: 'center', gap: 2 }}
                        >
                          <Typography
                            variant='body2'
                            sx={{
                              width: 96,
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              whiteSpace: 'nowrap',
                            }}
                          >
                            {keyword.text}
                          </Typography>
                          <Box
                            sx={{
                              flex: 1,
                              height: 8,
                              bgcolor: 'grey.200',
                              borderRadius: 4,
                            }}
                          >
                            <Box
                              sx={{
                                height: '100%',
                                bgcolor: '#f97316',
                                borderRadius: 4,
                                width: `${keyword.score * 100}%`,
                              }}
                            />
                          </Box>
                          <Typography
                            variant='caption'
                            sx={{ color: 'text.secondary' }}
                          >
                            频率: {keyword.frequency}
                          </Typography>
                        </Box>
                      ))}
                    </Box>
                  </Box>
                )}
              </CardContent>
            </Card>
          )}
        </Box>
      </Box>
    </AIGenerateModal>
  );
}
