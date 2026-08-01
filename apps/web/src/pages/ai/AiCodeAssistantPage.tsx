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
  Divider,
  IconButton,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Accordion,
  AccordionSummary,
  AccordionDetails,
} from '@mui/material';
import {
  Code2,
  Bug,
  Sparkles,
  RefreshCw,
  Copy,
  Download,
  PlayCircle,
  CheckCircle2,
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
import { logger } from '@/utils/logger';
import { designTokens } from '@/theme/tokens';

const ct = designTokens.colors;

type CodeTab = 'generate' | 'explain' | 'fix' | 'optimize' | 'review';

const codeTemplateKeys = [
  { id: '1', nameKey: 'ai.code_assistant.template.react_component', language: 'tsx', descKey: 'ai.code_assistant.template.react_component_desc' },
  { id: '2', nameKey: 'ai.code_assistant.template.api', language: 'typescript', descKey: 'ai.code_assistant.template.api_desc' },
  { id: '3', nameKey: 'ai.code_assistant.template.database_query', language: 'sql', descKey: 'ai.code_assistant.template.database_query_desc' },
  { id: '4', nameKey: 'ai.code_assistant.template.util_function', language: 'typescript', descKey: 'ai.code_assistant.template.util_function_desc' },
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
        重置
      </Button>
    </Box>
  );
};

export default Counter;`;

const codeExplanation = `这段代码是一个 React 的计数器组件 Counter，主要功能说明如下：

1. **组件定义与 Props**
   - 接收 initialValue 初始值（默认为0）
   - 接收 onUpdate 回调函数，值变化时通知父组件

2. **状态管理**
   - 使用 useState 管理 count 状态
   - 所有操作函数都用 useCallback 包裹优化性能

3. **操作函数**
   - handleIncrement: 加1操作
   - handleDecrement: 减1操作
   - handleReset: 重置为初始值

4. **渲染结构**
   - 使用 Box 作为容器，flex 布局
   - 包含减少按钮、当前数值、增加按钮、重置按钮

这是一个结构清晰、功能完整的可复用计数器组件。`;

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
  const [copied, setCopied] = useState(false);
  const [reviewScore, setReviewScore] = useState(0);

  const tabConfig = [
    { id: 'generate' as CodeTab, label: t('ai.code_assistant.tab.generate'), icon: <Code2 size={18} /> },
    { id: 'explain' as CodeTab, label: t('ai.code_assistant.tab.explain'), icon: <Lightbulb size={18} /> },
    { id: 'fix' as CodeTab, label: t('ai.code_assistant.tab.fix'), icon: <Bug size={18} /> },
    { id: 'optimize' as CodeTab, label: t('ai.code_assistant.tab.optimize'), icon: <Zap size={18} /> },
    { id: 'review' as CodeTab, label: t('ai.code_assistant.tab.review'), icon: <FileCode size={18} /> },
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
        `// 修复后的代码\nfunction calculateTotal(items: Array<{ price: number; quantity: number }>): number {\n  if (!Array.isArray(items)) return 0;\n  return items.reduce((total, item) => {\n    return total + (item.price || 0) * (item.quantity || 0);\n  }, 0);\n}\n\n// 修复说明：\n// 1. 添加了 TypeScript 类型定义\n// 2. 添加了数组类型检查，防止运行时错误\n// 3. 使用 reduce 替代 for 循环，更函数式\n// 4. 添加了默认值，防止 undefined 导致 NaN`
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
        `// 优化后的代码\nfunction calculateTotal(items: Array<{ price: number; quantity: number }> = []): number {\n  return items.reduce((sum, { price = 0, quantity = 0 }) => sum + price * quantity, 0);\n}\n\n// 优化点：\n// 1. 使用 Array.reduce 替代 for 循环，更简洁\n// 2. 添加参数默认值，处理空值情况\n// 3. 使用解构赋值简化代码\n// 4. 添加类型定义，提升代码健壮性\n// 5. 函数式编程风格，易于维护`
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
                          <MenuItem value='none'>{t('ai.code_assistant.option.no_framework')}</MenuItem>
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
                      {generating ? t('ai.code_assistant.status.generating') : t('ai.code_assistant.action.generate_code')}
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
                    {activeTab === 'review' ? t('ai.code_assistant.label.review_result') : t('ai.code_assistant.label.generate_result')}
                  </Typography>
                  {result && (
                    <Box sx={{ display: 'flex', gap: 1 }}>
                      <IconButton
                        size='small'
                        onClick={() => handleCopy(result)}
                        title={t('ai.code_assistant.action.copy')}
                      >
                        <Copy size={16} />
                      </IconButton>
                      <IconButton
                        size='small'
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
                      {t('ai.code_assistant.review.issues_found', { count: reviewIssueKeys.length })}
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
                                {t('ai.code_assistant.review.line_issue', { line: issue.line })}：{t(issue.descKey)}
                              </Typography>
                            </Box>
                          </AccordionSummary>
                          <AccordionDetails>
                            <Typography
                              variant='body2'
                              color='text.secondary'
                            >
                              {t('ai.code_assistant.review.suggestion_label')}：{t(issue.suggestionKey)}
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
                    <Typography variant='body1'>{t('ai.code_assistant.status.ai_processing')}</Typography>
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
