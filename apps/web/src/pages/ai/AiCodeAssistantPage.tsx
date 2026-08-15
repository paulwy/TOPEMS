import React, { useState, useCallback } from 'react';
import {
  Box,
  Typography,
  Button,
  Paper,
  Tabs,
  Tab,
  TextField,
  Chip,
  IconButton,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  List,
  Accordion,
  AccordionSummary,
  AccordionDetails,
} from '@mui/material';
import i18n from '@/i18n';
import {
  Code2,
  Bug,
  Sparkles,
  RefreshCw,
  Copy,
  Download,
  PlayCircle,
  AlertTriangle,
  Info,
  Lightbulb,
  Zap,
  ChevronDown,
  FileCode,
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { PageContainer, Grid } from '@/components/common';
import { useNotificationStore } from '@/store';
import { designTokens } from '@/theme/tokens';

const ct= designTokens.colors;

type CodeTab = 'generate' | 'explain' | 'fix' | 'optimize' | 'review';

const codeTemplateKeys = [
  {
    id: '1',
    nameKey: 'ai.code_assistant.template.react_component',
    language: 'tsx',
    descKey: 'ai.code_assistant.template.react_component_desc',
  },
  {
    id: '2',
    nameKey: 'ai.code_assistant.template.api',
    language: 'typescript',
    descKey: 'ai.code_assistant.template.api_desc',
  },
  {
    id: '3',
    nameKey: 'ai.code_assistant.template.database_query',
    language: 'sql',
    descKey: 'ai.code_assistant.template.database_query_desc',
  },
  {
    id: '4',
    nameKey: 'ai.code_assistant.template.util_function',
    language: 'typescript',
    descKey: 'ai.code_assistant.template.util_function_desc',
  },
];

const sampleCode = `function calculateTotal(items) {
  let total = 0;
  for (let i = 0; i < items.length; i++) {
    total = total + items[i].price * items[i].quantity;
  }
  return total;
}`;

const generatedCode = `import React, { useState, useCallback } from 'react';
import { Button, Box, Typography } from '@mui/material';

interface CounterProps {
  initialValue?: number;
  onUpdate?: (value: number) => void;
}

export const Counter: React.FC<CounterProps> = ({
  initialValue = 0,
  onUpdate,
}) => {
  const [count, setCount] = useState(initialValue);

  const handleIncrement = useCallback(() => {
    setCount((prev) => {
      const newValue = prev + 1;
      onUpdate?.(newValue);
      return newValue;
    });
  }, [onUpdate]);

  const handleDecrement = useCallback(() => {
    setCount((prev) => {
      const newValue = prev - 1;
      onUpdate?.(newValue);
      return newValue;
    });
  }, [onUpdate]);

  const handleReset = useCallback(() => {
    setCount(initialValue);
    onUpdate?.(initialValue);
  }, [initialValue, onUpdate]);

  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, p: 2 }}>
      <Button
        variant="contained"
        onClick={handleDecrement}
      >
        -
      </Button>
      <Typography variant="h5" sx={{ minWidth: 60, textAlign: 'center' }}>
        {count}
      </Typography>
      <Button
        variant="contained"
        onClick={handleIncrement}
      >
        +
      </Button>
      <Button
        variant="outlined"
        onClick={handleReset}
      >
        {i18n.t('pages.ai_code_assistant_page.k0')}
      </Button>
    </Box>
  );
};

export default Counter;`;

const codeExplanation = `{i18n.t('pages.ai_code_assistant_page.k0')}

{i18n.t('pages.ai_code_assistant_page.1props_1')}
   {i18n.t('pages.ai_code_assistant_page.k2')}
   {i18n.t('pages.ai_code_assistant_page.k3')}

{i18n.t('pages.ai_code_assistant_page.2_4')}
   {i18n.t('pages.ai_code_assistant_page.k5')}
   {i18n.t('pages.ai_code_assistant_page.k6')}

{i18n.t('pages.ai_code_assistant_page.3_7')}
   {i18n.t('pages.ai_code_assistant_page.k8')}
   {i18n.t('pages.ai_code_assistant_page.k9')}
   {i18n.t('pages.ai_code_assistant_page.k10')}

{i18n.t('pages.ai_code_assistant_page.4_11')}
   {i18n.t('pages.ai_code_assistant_page.k12')}
   {i18n.t('pages.ai_code_assistant_page.k13')}

{i18n.t('pages.ai_code_assistant_page.k14')}`;

const reviewIssueKeys = [
  {
    severity: 'warning' as const,
    line: 2,
    descKey: 'ai.code_assistant.review.issue_1_desc',
    suggestionKey: 'ai.code_assistant.review.issue_1_suggestion',
  },
  {
    severity: 'info' as const,
    line: 3,
    descKey: 'ai.code_assistant.review.issue_2_desc',
    suggestionKey: 'ai.code_assistant.review.issue_2_suggestion',
  },
  {
    severity: 'warning' as const,
    line: 4,
    descKey: 'ai.code_assistant.review.issue_3_desc',
    suggestionKey: 'ai.code_assistant.review.issue_3_suggestion',
  },
];

export const AiCodeAssistantPage: React.FC = () => {
  const addNotification = useNotificationStore((state) => state.addNotification);
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState<CodeTab>('generate');
  const [prompt, setPrompt] = useState('');
  const [language, setLanguage] = useState('typescript');
  const [framework, setFramework] = useState('react');
  const [codeInput, setCodeInput] = useState(sampleCode);
  const [generating, setGenerating] = useState(false);
  const [result, setResult] = useState('');
  const [reviewScore, setReviewScore] = useState(0);
  const [, setCopied] = useState(false);

  const tabConfig = [
    {
      id: 'generate' as CodeTab,
      label: t('ai.code_assistant.tab.generate'),
      icon: <Code2 size={18} />,
    },
    {
      id: 'explain' as CodeTab,
      label: t('ai.code_assistant.tab.explain'),
      icon: <Lightbulb size={18} />,
    },
    { id: 'fix' as CodeTab, label: t('ai.code_assistant.tab.fix'), icon: <Bug size={18} /> },
    {
      id: 'optimize' as CodeTab,
      label: t('ai.code_assistant.tab.optimize'),
      icon: <Zap size={18} />,
    },
    {
      id: 'review' as CodeTab,
      label: t('ai.code_assistant.tab.review'),
      icon: <FileCode size={18} />,
    },
  ];

  const handleGenerate = useCallback(() => {
    if (!prompt.trim()) {
      addNotification({
        title: t('ai.code_assistant.message.notice_title'),
        message: t('ai.code_assistant.message.input_prompt'),
        type: 'warning',
      });
      return;
    }

    setGenerating(true);
    setResult('');

    setTimeout(() => {
      setResult(generatedCode);
      setGenerating(false);
      addNotification({
        title: t('ai.code_assistant.message.generate_complete'),
        message: t('ai.code_assistant.message.code_generated'),
        type: 'success',
      });
    }, 2000);
  }, [prompt, addNotification, t]);

  const handleExplain = useCallback(() => {
    if (!codeInput.trim()) {
      addNotification({
        title: t('ai.code_assistant.message.notice_title'),
        message: t('ai.code_assistant.message.input_explain_code'),
        type: 'warning',
      });
      return;
    }

    setGenerating(true);
    setResult('');

    setTimeout(() => {
      setResult(codeExplanation);
      setGenerating(false);
    }, 1500);
  }, [codeInput, addNotification, t]);

  const handleFixBug = useCallback(() => {
    if (!codeInput.trim()) {
      addNotification({
        title: t('ai.code_assistant.message.notice_title'),
        message: t('ai.code_assistant.message.input_bug_code'),
        type: 'warning',
      });
      return;
    }

    setGenerating(true);
    setResult('');

    setTimeout(() => {
      setResult(
        i18n.t('pages.ai_code_assistant_page.k0')
      );
      setGenerating(false);
    }, 2000);
  }, [codeInput, addNotification, t]);

  const handleOptimize = useCallback(() => {
    if (!codeInput.trim()) {
      addNotification({
        title: t('ai.code_assistant.message.notice_title'),
        message: t('ai.code_assistant.message.input_optimize_code'),
        type: 'warning',
      });
      return;
    }

    setGenerating(true);
    setResult('');

    setTimeout(() => {
      setResult(
        i18n.t('pages.ai_code_assistant_page.k1')
      );
      setGenerating(false);
    }, 1800);
  }, [codeInput, addNotification, t]);

  const handleReview = useCallback(() => {
    if (!codeInput.trim()) {
      addNotification({
        title: t('ai.code_assistant.message.notice_title'),
        message: t('ai.code_assistant.message.input_review_code'),
        type: 'warning',
      });
      return;
    }

    setGenerating(true);
    setReviewScore(0);

    setTimeout(() => {
      setReviewScore(75);
      setGenerating(false);
    }, 1500);
  }, [codeInput, addNotification, t]);

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    addNotification({
      title: t('ai.code_assistant.message.copied_title'),
      message: t('ai.code_assistant.message.code_copied'),
      type: 'success',
    });
  };

  const getSeverityIcon = (severity: 'critical' | 'warning' | 'info') => {
    switch (severity) {
      case 'critical':
        return (
          <AlertTriangle
            size={16}
            style={{ color: ct.error.main }}
          />
        );
      case 'warning':
        return (
          <AlertTriangle
            size={16}
            style={{ color: ct.warning.main }}
          />
        );
      default:
        return (
          <Info
            size={16}
            style={{ color: ct.primary.main }}
          />
        );
    }
  };

  return (
    <PageContainer
      title={t('ai.code_assistant.title')}
      subtitle={t('ai.code_assistant.subtitle')}
      padding={false}
      maxWidth={false}
      headerProps={{
        pageIcon: <Code2 style={{ width: 20, height: 20 }} />,
        pageGradient: `linear-gradient(135deg, ${ct.pink[300]} 0%, ${ct.pink[500]} 100%)`,
      }}
    >
      <Box sx={{ p: 3 }}>
        <Paper sx={{ borderRadius: 3, overflow: 'hidden' }}>
          {/* 标签页 */}
          <Box
            sx={{
              borderBottom: 1,
              borderColor: 'divider',
              px: 2,
            }}
          >
            <Tabs
              value={activeTab}
              onChange={(_, v) => setActiveTab(v)}
              sx={{ minHeight: 48 }}
            >
              {tabConfig.map((tab) => (
                <Tab
                  key={tab.id}
                  label={
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      {tab.icon}
                      {tab.label}
                    </Box>
                  }
                  value={tab.id}
                  sx={{ minHeight: 48, textTransform: 'none' }}
                />
              ))}
            </Tabs>
          </Box>

          <Box sx={{ p: 3 }}>
            <Grid
              container
              spacing={3}
            >
              {/* 左侧：输入区域 */}
              <Grid
                item
                xs={12}
                md={6}
              >
                {/* 代码生成 - 输入 */}
                {activeTab === 'generate' && (
                  <Box>
                    <Typography
                      variant='subtitle1'
                      sx={{ fontWeight: 600, mb: 2 }}
                    >
                      {t('ai.code_assistant.label.describe_requirement')}
                    </Typography>

                    <Box sx={{ display: 'flex', gap: 2, mb: 2 }}>
                      <FormControl
                        size='small'
                        sx={{ flex: 1 }}
                      >
                        <InputLabel>{t('ai.code_assistant.field.language')}</InputLabel>
                        <Select
                          value={language}
                          label={t('ai.code_assistant.field.language')}
                          onChange={(e) => setLanguage(e.target.value)}
                        >
                          <MenuItem value='typescript'>TypeScript</MenuItem>
                          <MenuItem value='javascript'>JavaScript</MenuItem>
                          <MenuItem value='python'>Python</MenuItem>
                          <MenuItem value='java'>Java</MenuItem>
                          <MenuItem value='go'>Go</MenuItem>
                          <MenuItem value='sql'>SQL</MenuItem>
                        </Select>
                      </FormControl>
                      <FormControl
                        size='small'
                        sx={{ flex: 1 }}
                      >
                        <InputLabel>{t('ai.code_assistant.field.framework')}</InputLabel>
                        <Select
                          value={framework}
                          label={t('ai.code_assistant.field.framework')}
                          onChange={(e) => setFramework(e.target.value)}
                        >
                          <MenuItem value='react'>React</MenuItem>
                          <MenuItem value='vue'>Vue</MenuItem>
                          <MenuItem value='nodejs'>Node.js</MenuItem>
                          <MenuItem value='spring'>Spring Boot</MenuItem>
                          <MenuItem value='none'>
                            {t('ai.code_assistant.option.no_framework')}
                          </MenuItem>
                        </Select>
                      </FormControl>
                    </Box>

                    <TextField
                      fullWidth
                      multiline
                      rows={8}
                      placeholder={t('ai.code_assistant.placeholder.describe_code')}
                      value={prompt}
                      onChange={(e) => setPrompt(e.target.value)}
                      sx={{ mb: 2 }}
                    />

                    <Typography
                      variant='body2'
                      color='text.secondary'
                      sx={{ mb: 1 }}
                    >
                      {t('ai.code_assistant.label.quick_template')}
                    </Typography>
                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mb: 2 }}>
                      {codeTemplateKeys.map((tpl) => (
                        <Chip
                          key={tpl.id}
                          label={t(tpl.nameKey)}
                          size='small'
                          variant='outlined'
                          onClick={() => setPrompt(t(tpl.descKey))}
                          sx={{ cursor: 'pointer' }}
                        />
                      ))}
                    </Box>

                    <Button
                      fullWidth
                      variant='contained'
                      startIcon={
                        generating ? (
                          <RefreshCw
                            size={18}
                            className='animate-spin'
                          />
                        ) : (
                          <Sparkles size={18} />
                        )
                      }
                      onClick={handleGenerate}
                      disabled={generating || !prompt.trim()}
                    >
                      {generating
                        ? t('ai.code_assistant.status.generating')
                        : t('ai.code_assistant.action.generate_code')}
                    </Button>
                  </Box>
                )}

                {/* 其他功能 - 代码输入 */}
                {['explain', 'fix', 'optimize', 'review'].includes(activeTab) && (
                  <Box>
                    <Typography
                      variant='subtitle1'
                      sx={{ fontWeight: 600, mb: 2 }}
                    >
                      {activeTab === 'explain' && t('ai.code_assistant.label.input_explain')}
                      {activeTab === 'fix' && t('ai.code_assistant.label.input_fix')}
                      {activeTab === 'optimize' && t('ai.code_assistant.label.input_optimize')}
                      {activeTab === 'review' && t('ai.code_assistant.label.input_review')}
                    </Typography>
                    <TextField
                      fullWidth
                      multiline
                      rows={14}
                      value={codeInput}
                      onChange={(e) => setCodeInput(e.target.value)}
                      sx={{
                        mb: 2,
                        '& .MuiInputBase-input': {
                          fontFamily: 'monospace',
                          fontSize: 13,
                        },
                      }}
                    />
                    <Button
                      fullWidth
                      variant='contained'
                      startIcon={
                        generating ? (
                          <RefreshCw
                            size={18}
                            className='animate-spin'
                          />
                        ) : (
                          <PlayCircle size={18} />
                        )
                      }
                      onClick={() => {
                        if (activeTab === 'explain') handleExplain();
                        if (activeTab === 'fix') handleFixBug();
                        if (activeTab === 'optimize') handleOptimize();
                        if (activeTab === 'review') handleReview();
                      }}
                      disabled={generating || !codeInput.trim()}
                    >
                      {generating
                        ? t('ai.code_assistant.status.processing')
                        : activeTab === 'explain'
                          ? t('ai.code_assistant.action.explain_code')
                          : activeTab === 'fix'
                            ? t('ai.code_assistant.action.fix_bug')
                            : activeTab === 'optimize'
                              ? t('ai.code_assistant.action.optimize_code')
                              : t('ai.code_assistant.action.start_review')}
                    </Button>
                  </Box>
                )}
              </Grid>

              {/* 右侧：结果区域 */}
              <Grid
                item
                xs={12}
                md={6}
              >
                <Box
                  sx={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    mb: 2,
                  }}
                >
                  <Typography
                    variant='subtitle1'
                    sx={{ fontWeight: 600 }}
                  >
                    {activeTab === 'review'
                      ? t('ai.code_assistant.label.review_result')
                      : t('ai.code_assistant.label.generate_result')}
                  </Typography>
                  {result && (
                    <Box sx={{ display: 'flex', gap: 1 }}>
                      <IconButton
                        size='small'
                        onClick={() => handleCopy(result)}
                        aria-label={t('ai.code_assistant.action.copy')}
                        title={t('ai.code_assistant.action.copy')}
                      >
                        <Copy size={16} />
                      </IconButton>
                      <IconButton
                        size='small'
                        aria-label={t('ai.code_assistant.action.download')}
                        title={t('ai.code_assistant.action.download')}
                      >
                        <Download size={16} />
                      </IconButton>
                    </Box>
                  )}
                </Box>

                {/* 代码审查结果 */}
                {activeTab === 'review' && reviewScore > 0 && (
                  <Box sx={{ mb: 2 }}>
                    <Paper
                      variant='outlined'
                      sx={{ p: 3, borderRadius: 3, mb: 2, textAlign: 'center' }}
                    >
                      <Typography
                        variant='h3'
                        sx={{
                          fontWeight: 700,
                          color:
                            reviewScore >= 80
                              ? 'success.main'
                              : reviewScore >= 60
                                ? 'warning.main'
                                : 'error.main',
                        }}
                      >
                        {reviewScore}
                      </Typography>
                      <Typography
                        variant='body2'
                        color='text.secondary'
                      >
                        {t('ai.code_assistant.review.quality_score')}
                      </Typography>
                    </Paper>

                    <Typography
                      variant='subtitle2'
                      sx={{ fontWeight: 600, mb: 1 }}
                    >
                      {t('ai.code_assistant.review.issues_found', {
                        count: reviewIssueKeys.length,
                      })}
                    </Typography>
                    <List disablePadding>
                      {reviewIssueKeys.map((issue, index) => (
                        <Accordion
                          key={index}
                          disableGutters
                        >
                          <AccordionSummary expandIcon={<ChevronDown size={16} />}>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                              {getSeverityIcon(issue.severity)}
                              <Typography
                                variant='body2'
                                sx={{ fontWeight: 500 }}
                              >
                                {t('ai.code_assistant.review.line_issue', { line: issue.line })}：
                                {t(issue.descKey)}
                              </Typography>
                            </Box>
                          </AccordionSummary>
                          <AccordionDetails>
                            <Typography
                              variant='body2'
                              color='text.secondary'
                            >
                              {t('ai.code_assistant.review.suggestion_label')}：
                              {t(issue.suggestionKey)}
                            </Typography>
                          </AccordionDetails>
                        </Accordion>
                      ))}
                    </List>
                  </Box>
                )}

                {/* 代码/文本结果 */}
                {result && activeTab !== 'review' && (
                  <Paper
                    variant='outlined'
                    sx={{
                      p: 2,
                      borderRadius: 3,
                      maxHeight: 500,
                      overflow: 'auto',
                      bgcolor: 'grey.50',
                    }}
                  >
                    <pre
                      style={{
                        margin: 0,
                        fontFamily: 'monospace',
                        fontSize: 13,
                        lineHeight: 1.6,
                        whiteSpace: 'pre-wrap',
                        wordBreak: 'break-word',
                      }}
                    >
                      {result}
                    </pre>
                  </Paper>
                )}

                {/* 空状态 */}
                {!result && activeTab !== 'review' && !generating && (
                  <Box
                    sx={{
                      height: 400,
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      justifyContent: 'center',
                      border: '1px dashed',
                      borderColor: 'divider',
                      borderRadius: 3,
                    }}
                  >
                    <Code2
                      size={48}
                      style={{ color: ct.text.disabled, marginBottom: 12 }}
                    />
                    <Typography
                      variant='body2'
                      color='text.secondary'
                    >
                      {t('ai.code_assistant.empty.result_placeholder')}
                    </Typography>
                  </Box>
                )}

                {/* 加载中 */}
                {generating && (
                  <Box
                    sx={{
                      height: 400,
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      justifyContent: 'center',
                      border: '1px dashed',
                      borderColor: 'divider',
                      borderRadius: 3,
                    }}
                  >
                    <RefreshCw
                      size={32}
                      className='animate-spin'
                      style={{ color: ct.secondary[400], marginBottom: 12 }}
                    />
                    <Typography variant='body1'>
                      {t('ai.code_assistant.status.ai_processing')}
                    </Typography>
                    <Typography
                      variant='body2'
                      color='text.secondary'
                    >
                      {t('ai.code_assistant.status.please_wait')}
                    </Typography>
                  </Box>
                )}
              </Grid>
            </Grid>
          </Box>
        </Paper>
      </Box>
    </PageContainer>
  );
};

export default AiCodeAssistantPage;
