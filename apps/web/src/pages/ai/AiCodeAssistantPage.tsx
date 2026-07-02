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
import { PageContainer, Grid } from '@/components/common';
import { useAppStore } from '@/store';
import { logger } from '@/utils/logger';

type CodeTab = 'generate' | 'explain' | 'fix' | 'optimize' | 'review';

const codeTemplates = [
  { id: '1', name: 'React组件', language: 'tsx', description: '生成React函数组件' },
  { id: '2', name: 'API接口', language: 'typescript', description: '生成REST API接口' },
  { id: '3', name: '数据库查询', language: 'sql', description: '生成SQL查询语句' },
  { id: '4', name: '工具函数', language: 'typescript', description: '生成常用工具函数' },
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

const reviewIssues = [
  {
    severity: 'warning' as const,
    line: 2,
    description: '缺少类型定义',
    suggestion: '应为 items 参数和返回值添加 TypeScript 类型定义',
  },
  {
    severity: 'info' as const,
    line: 3,
    description: '可以使用更函数式的写法',
    suggestion: '考虑使用 Array.reduce() 方法替代 for 循环，代码更简洁',
  },
  {
    severity: 'warning' as const,
    line: 4,
    description: '缺少空值检查',
    suggestion: '应检查 items 是否为数组，防止运行时错误',
  },
];

export const AiCodeAssistantPage: React.FC = () => {
  const addNotification = useAppStore((state) => state.addNotification);
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
    { id: 'generate' as CodeTab, label: '代码生成', icon: <Code2 size={18} /> },
    { id: 'explain' as CodeTab, label: '代码解释', icon: <Lightbulb size={18} /> },
    { id: 'fix' as CodeTab, label: 'Bug修复', icon: <Bug size={18} /> },
    { id: 'optimize' as CodeTab, label: '代码优化', icon: <Zap size={18} /> },
    { id: 'review' as CodeTab, label: '代码审查', icon: <FileCode size={18} /> },
  ];

  const handleGenerate = useCallback(() => {
    if (!prompt.trim()) {
      addNotification({
        title: '提示',
        message: '请输入代码需求描述',
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
        title: '生成完成',
        message: '代码已生成',
        type: 'success',
      });
    }, 2000);
  }, [prompt, addNotification]);

  const handleExplain = useCallback(() => {
    if (!codeInput.trim()) {
      addNotification({
        title: '提示',
        message: '请输入要解释的代码',
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
  }, [codeInput, addNotification]);

  const handleFixBug = useCallback(() => {
    if (!codeInput.trim()) {
      addNotification({
        title: '提示',
        message: '请输入包含Bug的代码',
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
  }, [codeInput, addNotification]);

  const handleOptimize = useCallback(() => {
    if (!codeInput.trim()) {
      addNotification({
        title: '提示',
        message: '请输入要优化的代码',
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
  }, [codeInput, addNotification]);

  const handleReview = useCallback(() => {
    if (!codeInput.trim()) {
      addNotification({
        title: '提示',
        message: '请输入要审查的代码',
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
  }, [codeInput, addNotification]);

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    addNotification({
      title: '已复制',
      message: '代码已复制到剪贴板',
      type: 'success',
    });
  };

  const getSeverityIcon = (severity: 'critical' | 'warning' | 'info') => {
    switch (severity) {
      case 'critical':
        return (
          <AlertTriangle
            size={16}
            style={{ color: '#ef4444' }}
          />
        );
      case 'warning':
        return (
          <AlertTriangle
            size={16}
            style={{ color: '#f59e0b' }}
          />
        );
      default:
        return (
          <Info
            size={16}
            style={{ color: '#3b82f6' }}
          />
        );
    }
  };

  return (
    <PageContainer
      title='代码助手'
      subtitle='代码生成、解释、优化、审查'
      padding={false}
      maxWidth={false}
      headerProps={{
        pageIcon: <Code2 style={{ width: 20, height: 20 }} />,
        pageGradient: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
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
                      描述需求
                    </Typography>

                    <Box sx={{ display: 'flex', gap: 2, mb: 2 }}>
                      <FormControl
                        size='small'
                        sx={{ flex: 1 }}
                      >
                        <InputLabel>编程语言</InputLabel>
                        <Select
                          value={language}
                          label='编程语言'
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
                        <InputLabel>框架</InputLabel>
                        <Select
                          value={framework}
                          label='框架'
                          onChange={(e) => setFramework(e.target.value)}
                        >
                          <MenuItem value='react'>React</MenuItem>
                          <MenuItem value='vue'>Vue</MenuItem>
                          <MenuItem value='nodejs'>Node.js</MenuItem>
                          <MenuItem value='spring'>Spring Boot</MenuItem>
                          <MenuItem value='none'>无框架</MenuItem>
                        </Select>
                      </FormControl>
                    </Box>

                    <TextField
                      fullWidth
                      multiline
                      rows={8}
                      placeholder='描述你想要生成的代码，例如：创建一个带加减按钮的计数器组件'
                      value={prompt}
                      onChange={(e) => setPrompt(e.target.value)}
                      sx={{ mb: 2 }}
                    />

                    <Typography
                      variant='body2'
                      color='text.secondary'
                      sx={{ mb: 1 }}
                    >
                      快速模板：
                    </Typography>
                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mb: 2 }}>
                      {codeTemplates.map((tpl) => (
                        <Chip
                          key={tpl.id}
                          label={tpl.name}
                          size='small'
                          variant='outlined'
                          onClick={() => setPrompt(tpl.description)}
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
                      {generating ? '生成中...' : '生成代码'}
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
                      {activeTab === 'explain' && '输入要解释的代码'}
                      {activeTab === 'fix' && '输入包含Bug的代码'}
                      {activeTab === 'optimize' && '输入要优化的代码'}
                      {activeTab === 'review' && '输入要审查的代码'}
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
                        ? '处理中...'
                        : activeTab === 'explain'
                          ? '解释代码'
                          : activeTab === 'fix'
                            ? '修复Bug'
                            : activeTab === 'optimize'
                              ? '优化代码'
                              : '开始审查'}
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
                    {activeTab === 'review' ? '审查结果' : '生成结果'}
                  </Typography>
                  {result && (
                    <Box sx={{ display: 'flex', gap: 1 }}>
                      <IconButton
                        size='small'
                        onClick={() => handleCopy(result)}
                        title='复制'
                      >
                        <Copy size={16} />
                      </IconButton>
                      <IconButton
                        size='small'
                        title='下载'
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
                        代码质量评分
                      </Typography>
                    </Paper>

                    <Typography
                      variant='subtitle2'
                      sx={{ fontWeight: 600, mb: 1 }}
                    >
                      发现的问题 ({reviewIssues.length})
                    </Typography>
                    <List disablePadding>
                      {reviewIssues.map((issue, index) => (
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
                                第 {issue.line} 行：{issue.description}
                              </Typography>
                            </Box>
                          </AccordionSummary>
                          <AccordionDetails>
                            <Typography
                              variant='body2'
                              color='text.secondary'
                            >
                              建议：{issue.suggestion}
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
                      style={{ color: '#cbd5e1', marginBottom: 12 }}
                    />
                    <Typography
                      variant='body2'
                      color='text.secondary'
                    >
                      结果将在这里显示
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
                      style={{ color: '#6366f1', marginBottom: 12 }}
                    />
                    <Typography variant='body1'>AI 正在处理...</Typography>
                    <Typography
                      variant='body2'
                      color='text.secondary'
                    >
                      请稍候
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
