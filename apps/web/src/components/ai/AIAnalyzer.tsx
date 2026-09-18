import { useState, useEffect, useRef, useCallback } from 'react';
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
import i18n from '@/i18n';
import {
  Card,
  CardContent,
  Box,
  Typography,
  TextField,
  Chip,
  Button,
  useTheme,
} from '@mui/material';
import { AIGenerateModal } from './AIGenerateModal';
import { aiApi } from '../../api/ai';
import { logger } from '@/utils/logger';

interface AIAnalyzerProps {
  isOpen: boolean;
  onClose: () => void;
  initialText?: string;
  onAnalysisComplete?: (_results: AnalysisResults) => void;
}

interface AnalysisResults {
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
  positive: {
    bg: 'success.lighter',
    text: 'success.700',
    label: i18n.t('components.ai_analyzer.k0'),
  },
  negative: { bg: 'error.lighter', text: 'error.dark', label: i18n.t('components.ai_analyzer.k1') },
  neutral: { bg: 'grey.100', text: 'grey.700', label: i18n.t('components.ai_analyzer.k2') },
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

  const clearResults = useCallback(() => {
    setSentimentResult(null);
    setClassificationResult(null);
    setEntitiesResult([]);
    setKeywordsResult([]);
  }, []);

  useEffect(() => {
    if (isOpen) {
      setText(initialText);
      clearResults();
      if (initialText.trim()) {
        runAllAnalysisRef.current();
      }
    }
  }, [isOpen, initialText, clearResults]);

  const analyzeSentiment = useCallback(async () => {
    try {
      const response = await aiApi.analyzeSentiment({ text });
      if (response.success && response.data) {
        setSentimentResult({
          sentiment: response.data.sentiment as 'positive' | 'negative' | 'neutral',
          confidence: response.data.confidence,
          details: response.data.details as SentimentResult['details'],
        });
      }
    } catch (error: unknown) {
      logger.error(i18n.t('components.ai_analyzer.k1'), error);
    }
  }, [text]);

  const classifyText = useCallback(async () => {
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
      logger.error(i18n.t('components.ai_analyzer.k2'), error);
    }
  }, [text]);

  const extractEntities = useCallback(async () => {
    try {
      const response = await aiApi.extractEntities({ text });
      if (response.success && response.data) {
        setEntitiesResult(response.data.entities);
      }
    } catch (error: unknown) {
      logger.error(i18n.t('components.ai_analyzer.k3'), error);
    }
  }, [text]);

  const extractKeywords = useCallback(async () => {
    try {
      const response = await aiApi.extractKeywords({ text });
      if (response.success && response.data) {
        setKeywordsResult(response.data.keywords);
      }
    } catch (error: unknown) {
      logger.error(i18n.t('components.ai_analyzer.k4'), error);
    }
  }, [text]);

  const runAllAnalysis = useCallback(async () => {
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
      logger.error(i18n.t('components.ai_analyzer.k0'), error);
    } finally {
      setIsLoading(false);
    }
  }, [
    text,
    onAnalysisComplete,
    sentimentResult,
    classificationResult,
    entitiesResult,
    keywordsResult,
    analyzeSentiment,
    classifyText,
    extractEntities,
    extractKeywords,
  ]);

  const runAllAnalysisRef = useRef<() => Promise<void>>(async () => {});

  useEffect(() => {
    runAllAnalysisRef.current = runAllAnalysis;
  }, [runAllAnalysis]);
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
      logger.error(i18n.t('components.ai_analyzer.k5'), error);
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
      title={i18n.t('components.ai_analyzer.ai_6')}
      description={i18n.t('components.ai_analyzer.k3')}
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
            {copied ? i18n.t('components.ai_analyzer.k5') : i18n.t('components.ai_analyzer.k4')}
          </Button>
        ) : null
      }
    >
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
        <TextField
          multiline
          rows={4}
          fullWidth
          label={i18n.t('components.ai_analyzer.k6')}
          placeholder={i18n.t('components.ai_analyzer.k7')}
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
              {i18n.t('components.ai_analyzer.k8')}
            </>
          ) : (
            <>
              <Sparkles style={{ width: 16, height: 16, marginRight: 8 }} />
              {i18n.t('components.ai_analyzer.k9')}
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
                      <TrendingUp style={{ width: 20, height: 20, color: 'purple.600' }} />
                    </Box>
                    <Box>
                      <Typography
                        variant='h6'
                        component='h4'
                        sx={{ fontWeight: 500 }}
                      >
                        {i18n.t('components.ai_analyzer.k10')}
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
                          {i18n.t('components.ai_analyzer.k11')}:{' '}
                          {Math.round(sentimentResult.confidence * 100)}%
                        </Typography>
                      </Box>
                    </Box>
                  </Box>
                  {expandedSections.sentiment ? (
                    <ChevronUp
                      style={{ width: 20, height: 20, color: theme.palette.text.disabled }}
                    />
                  ) : (
                    <ChevronDown
                      style={{ width: 20, height: 20, color: theme.palette.text.disabled }}
                    />
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
                            {i18n.t('components.ai_analyzer.k12')}
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
                            {i18n.t('components.ai_analyzer.k13')}
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
                          {i18n.t('components.ai_analyzer.k14')}
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
                              bgcolor: 'purple.500',
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
                      <BarChart3
                        style={{ width: 20, height: 20, color: theme.palette.primary.dark }}
                      />
                    </Box>
                    <Box>
                      <Typography
                        variant='h6'
                        component='h4'
                        sx={{ fontWeight: 500 }}
                      >
                        {i18n.t('components.ai_analyzer.k15')}
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
                          {i18n.t('components.ai_analyzer.k16')}:{' '}
                          {Math.round(classificationResult.confidence * 100)}%
                        </Typography>
                      </Box>
                    </Box>
                  </Box>
                  {expandedSections.classify ? (
                    <ChevronUp
                      style={{ width: 20, height: 20, color: theme.palette.text.disabled }}
                    />
                  ) : (
                    <ChevronDown
                      style={{ width: 20, height: 20, color: theme.palette.text.disabled }}
                    />
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
                        {i18n.t('components.ai_analyzer.k17')}
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
                        {i18n.t('components.ai_analyzer.k18')}
                      </Typography>
                      <Typography
                        variant='body2'
                        sx={{ color: 'text.secondary', mt: 0.5 }}
                      >
                        {i18n.t('components.ai_analyzer.k0')} {entitiesResult.length}{' '}
                        {i18n.t('components.ai_analyzer.k1')}
                      </Typography>
                    </Box>
                  </Box>
                  {expandedSections.entities ? (
                    <ChevronUp
                      style={{ width: 20, height: 20, color: theme.palette.text.disabled }}
                    />
                  ) : (
                    <ChevronDown
                      style={{ width: 20, height: 20, color: theme.palette.text.disabled }}
                    />
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
                    <Box sx={{ p: 1.5, bgcolor: 'orange.100', borderRadius: 1.5 }}>
                      <Tag style={{ width: 20, height: 20, color: 'orange.600' }} />
                    </Box>
                    <Box>
                      <Typography
                        variant='h6'
                        component='h4'
                        sx={{ fontWeight: 500 }}
                      >
                        {i18n.t('components.ai_analyzer.k19')}
                      </Typography>
                      <Typography
                        variant='body2'
                        sx={{ color: 'text.secondary', mt: 0.5 }}
                      >
                        {i18n.t('components.ai_analyzer.k2')} {keywordsResult.length}{' '}
                        {i18n.t('components.ai_analyzer.k3')}
                      </Typography>
                    </Box>
                  </Box>
                  {expandedSections.keywords ? (
                    <ChevronUp
                      style={{ width: 20, height: 20, color: theme.palette.text.disabled }}
                    />
                  ) : (
                    <ChevronDown
                      style={{ width: 20, height: 20, color: theme.palette.text.disabled }}
                    />
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
                          sx={{ bgcolor: 'orange.100', color: 'orange.700', px: 1.5 }}
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
                                bgcolor: 'orange.main',
                                borderRadius: 4,
                                width: `${keyword.score * 100}%`,
                              }}
                            />
                          </Box>
                          <Typography
                            variant='caption'
                            sx={{ color: 'text.secondary' }}
                          >
                            {i18n.t('components.ai_analyzer.k20')}: {keyword.frequency}
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
