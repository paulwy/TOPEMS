import React from 'react';
import {
  Box,
  Typography,
  IconButton,
  Button,
  TextField,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Paper,
  Chip,
  List,
  ListItem,
  ListItemText,
  Divider,
  Alert,
  CircularProgress,
  Stack,
  Tooltip,
  Badge,
  LinearProgress,
  Tabs,
  Tab,
  Card,
} from '@mui/material';
import {
  X as XIcon,
  Sparkles,
  Code2,
  TestTube2,
  LayoutGrid,
  MessageCircle,
  Send,
  Copy,
  CheckCircle2,
  Loader2,
  Wand2,
  Zap,
  FileCode,
  Search,
} from 'lucide-react';
import {
  intelligentCodeCompletion,
  type CompletionContext,
  type CompletionItem,
  type CompletionKind,
} from './code-completion';
import {
  autoTestGenerator,
  type TestSuite,
  type TestMethod,
  type AnalysisResult,
  type TestFramework,
} from './test-generator';
import {
  uiComponentRecommender,
  type IntentContext,
  type IntentCategory,
  type ComponentRecommendation,
} from './ui-recommender';
import { designTokens, semanticTokens } from '@topems/tokens';

type TabId = 'completion' | 'test' | 'ui' | 'chat';

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: number;
}

const COMPLETION_KIND_LABELS: Record<CompletionKind, string> = {
  snippet: '代码片段',
  property: '属性',
  function: '函数',
  import: '导入',
  keyword: '关键字',
  variable: '变量',
  type: '类型',
  'snippet-placeholder': '占位符',
};

const CATEGORY_OPTIONS: Array<{ value: IntentCategory; label: string }> = [
  { value: 'action', label: '操作' },
  { value: 'navigation', label: '导航' },
  { value: 'form', label: '表单' },
  { value: 'display', label: '展示' },
  { value: 'feedback', label: '反馈' },
  { value: 'overlay', label: '浮层' },
  { value: 'data-entry', label: '数据输入' },
  { value: 'data-display', label: '数据展示' },
  { value: 'media', label: '媒体' },
  { value: 'loading', label: '加载' },
  { value: 'notification', label: '通知' },
];

const DEFAULT_SOURCE = `import React, { useState } from 'react';

interface UserCardProps {
  user: {
    id: string;
    name: string;
    email: string;
    avatar?: string;
  };
  onSelect?: (user: UserCardProps['user']) => void;
  variant?: 'default' | 'compact';
}

export function UserCard({ user, onSelect, variant = 'default' }: UserCardProps) {
  const [expanded, setExpanded] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleClick = () => {
    setExpanded(!expanded);
    onSelect?.(user);
  };

  const handleAvatarError = () => {
    console.error('Failed to load avatar:', user.avatar);
  };

  return (
    <div className={\`user-card \${variant}\`} onClick={handleClick}>
      <img
        src={user.avatar || '/default-avatar.png'}
        alt={user.name}
        onError={handleAvatarError}
      />
      <div className="user-info">
        <h3>{user.name}</h3>
        <p>{user.email}</p>
        {expanded && <span>ID: {user.id}</span>}
      </div>
    </div>
  );
}`;

const V53AIPanel: React.FC<{ onClose: () => void }> = ({ onClose }) => {
  const [activeTab, setActiveTab] = React.useState<TabId>('completion');

  return (
    <Box
      sx={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        bgcolor: 'action.active',
        zIndex: 10000,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backdropFilter: 'blur(8px)',
      }}
      onClick={onClose}
    >
      <Box
        sx={{
          width: '98%',
          maxWidth: 1500,
          height: '92vh',
          bgcolor: 'background.paper',
          borderRadius: 3,
          overflow: 'hidden',
          boxShadow: designTokens.darkShadows['3xl'],
          display: 'flex',
          flexDirection: 'column',
          border: '1px solid rgba(139, 92, 246, 0.2)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <V53PanelHeader onClose={onClose} />
        <Box sx={{ px: 2, py: 1.5, borderBottom: 1, borderColor: 'divider' }}>
          <Tabs
            value={activeTab}
            onChange={(_, id) => setActiveTab(id as TabId)}
            variant='fullWidth'
          >
            <Tab value='completion' label='代码补全' icon={<Code2 size={16} />} iconPosition='start' />
            <Tab value='test' label='测试生成' icon={<TestTube2 size={16} />} iconPosition='start' />
            <Tab value='ui' label='组件推荐' icon={<LayoutGrid size={16} />} iconPosition='start' />
            <Tab value='chat' label='AI 对话' icon={<MessageCircle size={16} />} iconPosition='start' />
          </Tabs>
        </Box>
        <Box sx={{ flex: 1, overflow: 'auto', bgcolor: 'grey.50' }}>
          {activeTab === 'completion' && <CodeCompletionTab />}
          {activeTab === 'test' && <TestGeneratorTab />}
          {activeTab === 'ui' && <UIRecommenderTab />}
          {activeTab === 'chat' && <AIChatTab />}
        </Box>
      </Box>
    </Box>
  );
};

const V53PanelHeader: React.FC<{ onClose: () => void }> = ({ onClose }) => (
  <Box
    sx={{
      p: 2,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      bgcolor: `linear-gradient(135deg, ${designTokens.colors.secondary.main} 0%, ${designTokens.colors.primary.dark} 50%, ${designTokens.colors.primary.main} 100%)`,
      color: 'common.white',
    }}
  >
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
      <Box
        sx={{
          width: 40,
          height: 40,
          borderRadius: 2,
          bgcolor: 'action.disabledBackground',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Sparkles size={22} />
      </Box>
      <Box>
        <Typography
          variant='h6'
          sx={{ fontWeight: 700, fontSize: 18 }}
        >
          V53.0 AI 增强面板
        </Typography>
        <Typography
          variant='caption'
          sx={{ opacity: 0.85, fontSize: 12 }}
        >
          智能代码补全 · 自动化测试 · UI 推荐 · AI 对话
        </Typography>
      </Box>
    </Box>
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
      <Badge
        badgeContent='V53'
        color='secondary'
        sx={{
          '& .MuiBadge-badge': {
            bgcolor: 'warning.400',
            color: 'text.primary',
            fontWeight: 700,
            fontSize: 10,
          },
        }}
      >
        <Zap size={18} />
      </Badge>
      <IconButton
        size='small'
        onClick={onClose}
        sx={{ color: 'common.white' }}
      >
        <XIcon size={20} />
      </IconButton>
    </Box>
  </Box>
);

const CodeCompletionTab: React.FC = () => {
  const [source, setSource] = React.useState(DEFAULT_SOURCE);
  const [completions, setCompletions] = React.useState<CompletionItem[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [context, setContext] = React.useState<CompletionContext>({
    file: 'UserCard.tsx',
    position: { line: 0, character: 0 },
    language: 'typescript',
    content: DEFAULT_SOURCE,
    cursor_word: '',
  });

  const handleAnalyze = async () => {
    setLoading(true);
    const words = source.split(/\s+/).filter((w) => w.length > 0);
    const cursorWord = words.length > 0 ? words[words.length - 1] : '';
    const newContext: CompletionContext = {
      ...context,
      content: source,
      cursor_word: cursorWord,
      position: { line: source.split('\n').length - 1, character: source.length },
    };
    setContext(newContext);
    try {
      const items = await intelligentCodeCompletion.getCompletions(newContext);
      setCompletions(items);
    } finally {
      setLoading(false);
    }
  };

  React.useEffect(() => {
    handleAnalyze();
  }, []);

  const copyToClipboard = (text: string) => {
    navigator.clipboard?.writeText(text);
  };

  const registerSampleData = () => {
    intelligentCodeCompletion.registerComponentProps('UserCard', [
      {
        name: 'user',
        type: '{ id: string; name: string; email: string; avatar?: string }',
        required: true,
        description: '用户信息对象',
      },
      {
        name: 'onSelect',
        type: '(user: User) => void',
        required: false,
        description: '用户选中回调',
      },
      {
        name: 'variant',
        type: "'default' | 'compact'",
        required: false,
        description: '卡片变体',
        default_value: 'default',
      },
    ]);

    intelligentCodeCompletion.registerAPIEndpoints('users', [
      { method: 'GET', path: '/api/users', description: '获取用户列表', response_type: 'User[]' },
      {
        method: 'POST',
        path: '/api/users',
        description: '创建用户',
        request_type: 'CreateUserDTO',
        response_type: 'User',
      },
      { method: 'GET', path: '/api/users/:id', description: '获取用户详情', response_type: 'User' },
    ]);

    intelligentCodeCompletion.registerProjectImport('react', [
      'useState',
      'useEffect',
      'useCallback',
      'useMemo',
      'useRef',
      'useContext',
    ]);

    intelligentCodeCompletion.registerProjectImport('@tanstack/react-query', [
      'useQuery',
      'useMutation',
      'useInfiniteQuery',
      'useQueryClient',
    ]);
  };

  const stats = intelligentCodeCompletion.getStats();

  return (
    <Box sx={{ p: 3 }}>
      <Stack
        direction='row'
        spacing={2}
        sx={{ mb: 3 }}
      >
        <Button
          variant='contained'
          startIcon={<Wand2 size={16} />}
          onClick={handleAnalyze}
          disabled={loading}
          sx={{ bgcolor: 'secondary.500', '&:hover': { bgcolor: 'secondary.600' } }}
        >
          {loading ? '分析中...' : '获取智能补全'}
        </Button>
        <Button
          variant='outlined'
          startIcon={<FileCode size={16} />}
          onClick={registerSampleData}
          sx={{ borderColor: 'secondary.500', color: 'secondary.500' }}
        >
          注册示例数据
        </Button>
        <Box sx={{ flex: 1 }} />
        <Chip
          label={`代码片段: ${stats.totalSnippets}`}
          size='small'
          sx={{ bgcolor: 'secondary.100', color: 'purple.800', fontWeight: 600 }}
        />
        <Chip
          label={`组件: ${stats.registeredComponents}`}
          size='small'
          sx={{ bgcolor: 'primary.100', color: 'primary.800', fontWeight: 600 }}
        />
        <Chip
          label={`API: ${stats.registeredAPIs}`}
          size='small'
          sx={{ bgcolor: 'success.100', color: 'teal.900', fontWeight: 600 }}
        />
      </Stack>

      <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 3 }}>
        <Card variant='outlined' sx={{ p: 2 }}>
          <Typography
            variant='subtitle2'
            sx={{ fontWeight: 600, mb: 1.5, display: 'flex', alignItems: 'center', gap: 1 }}
          >
            <FileCode size={16} />
            源代码编辑器
          </Typography>
          <Box sx={{ display: 'flex', gap: 1, mb: 1 }}>
            <FormControl
              size='small'
              sx={{ minWidth: 120 }}
            >
              <InputLabel>语言</InputLabel>
              <Select
                value={context.language}
                label='语言'
                onChange={(e) =>
                  setContext({
                    ...context,
                    language: e.target.value as 'typescript' | 'css' | 'json',
                  })
                }
              >
                <MenuItem value='typescript'>TypeScript</MenuItem>
                <MenuItem value='css'>CSS</MenuItem>
                <MenuItem value='json'>JSON</MenuItem>
              </Select>
            </FormControl>
            <TextField
              size='small'
              label='文件名'
              value={context.file}
              onChange={(e) => setContext({ ...context, file: e.target.value })}
              sx={{ flex: 1 }}
            />
          </Box>
          <TextField
            multiline
            fullWidth
            minRows={14}
            maxRows={18}
            value={source}
            onChange={(e) => setSource(e.target.value)}
            variant='outlined'
            size='small'
            sx={{
              fontFamily: 'monospace',
              fontSize: 12,
              '& .MuiInputBase-input': {
                fontFamily: 'monospace',
                fontSize: 12,
                bgcolor: 'text.primary',
                color: 'divider',
              },
            }}
          />
        </Card>

        <Card variant='outlined' sx={{ p: 2 }}>
          <Typography
            variant='subtitle2'
            sx={{ fontWeight: 600, mb: 1.5, display: 'flex', alignItems: 'center', gap: 1 }}
          >
            <Search size={16} />
            智能补全建议 ({completions.length})
          </Typography>
          {loading && (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
              <CircularProgress size={32} />
            </Box>
          )}
          {!loading && completions.length === 0 && (
            <Alert
              severity='info'
              sx={{ mb: 2 }}
            >
              暂无建议，请点击"获取智能补全"或注册示例数据
            </Alert>
          )}
          {!loading && completions.length > 0 && (
            <List
              sx={{
                maxHeight: 400,
                overflow: 'auto',
                bgcolor: 'background.default',
                borderRadius: 1,
              }}
            >
              {completions.slice(0, 30).map((item, index) => (
                <Paper
                  key={`${item.label}-${index}`}
                  elevation={0}
                  sx={{
                    mb: 0.5,
                    p: 1.5,
                    border: '1px solid',
                    borderColor: 'divider',
                    borderRadius: 1,
                    '&:hover': { bgcolor: 'secondary.100' },
                    cursor: 'pointer',
                    transition: 'background 0.2s',
                  }}
                  onClick={() => copyToClipboard(item.insert_text)}
                >
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Chip
                      label={COMPLETION_KIND_LABELS[item.kind] ?? item.kind}
                      size='small'
                      sx={{
                        fontSize: 10,
                        height: 20,
                        bgcolor: getKindColor(item.kind),
                        color: 'common.white',
                        fontWeight: 600,
                      }}
                    />
                    <Typography
                      variant='body2'
                      sx={{ fontWeight: 600, flex: 1 }}
                    >
                      {item.label}
                    </Typography>
                    <Tooltip title='复制'>
                      <IconButton
                        size='small'
                        onClick={(e) => {
                          e.stopPropagation();
                          copyToClipboard(item.insert_text);
                        }}
                      >
                        <Copy size={14} />
                      </IconButton>
                    </Tooltip>
                  </Box>
                  {item.detail && (
                    <Typography
                      variant='caption'
                      sx={{ color: 'text.secondary', display: 'block', mt: 0.5 }}
                    >
                      {item.detail}
                    </Typography>
                  )}
                  <Typography
                    variant='caption'
                    sx={{
                      display: 'block',
                      mt: 0.5,
                      fontFamily: 'monospace',
                      fontSize: 10,
                      color: 'secondary.500',
                      bgcolor: 'secondary.100',
                      px: 1,
                      py: 0.5,
                      borderRadius: 0.5,
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                    }}
                  >
                    {item.insert_text.slice(0, 100)}
                  </Typography>
                </Paper>
              ))}
            </List>
          )}
        </Card>
      </Box>
    </Box>
  );
};

const getKindColor = (kind: CompletionKind): string => {
  const colors: Record<CompletionKind, string> = {
    snippet: designTokens.colors.secondary.main,
    property: `${designTokens.colors.cyan['500']}`,
    function: designTokens.colors.success.dark,
    import: designTokens.colors.warning.main,
    keyword: designTokens.colors.error.main,
    variable: designTokens.colors.secondary.dark,
    type: designTokens.colors.primary.main,
    'snippet-placeholder': `${designTokens.colors.purple['500']}`,
  };
  return colors[kind] ?? `${designTokens.colors.grey['500']}`;
};

const TestGeneratorTab: React.FC = () => {
  const [source, setSource] = React.useState(DEFAULT_SOURCE);
  const [componentName, setComponentName] = React.useState('UserCard');
  const [framework, setFramework] = React.useState<TestFramework>('vitest');
  const [analysis, setAnalysis] = React.useState<AnalysisResult | null>(null);
  const [testSuite, setTestSuite] = React.useState<TestSuite | null>(null);
  const [generatedCode, setGeneratedCode] = React.useState('');
  const [loading, setLoading] = React.useState(false);

  const handleAnalyze = () => {
    setLoading(true);
    setTimeout(() => {
      const result = autoTestGenerator.analyzeComponent(source, componentName);
      setAnalysis(result);
      setTestSuite(autoTestGenerator.generateTestSuite(componentName, result));
      setGeneratedCode(autoTestGenerator.generateComponentTest(componentName));
      setLoading(false);
    }, 300);
  };

  const handleCopyCode = () => {
    navigator.clipboard?.writeText(generatedCode);
  };

  React.useEffect(() => {
    handleAnalyze();
  }, []);

  return (
    <Box sx={{ p: 3 }}>
      <Stack
        direction='row'
        spacing={2}
        sx={{ mb: 3 }}
      >
        <TextField
          size='small'
          label='组件名称'
          value={componentName}
          onChange={(e) => setComponentName(e.target.value)}
          sx={{ minWidth: 200 }}
        />
        <FormControl
          size='small'
          sx={{ minWidth: 120 }}
        >
          <InputLabel>测试框架</InputLabel>
          <Select
            value={framework}
            label='测试框架'
            onChange={(e) => {
              const fw = e.target.value as TestFramework;
              setFramework(fw);
              autoTestGenerator.setFramework(fw);
            }}
          >
            <MenuItem value='vitest'>Vitest</MenuItem>
            <MenuItem value='jest'>Jest</MenuItem>
          </Select>
        </FormControl>
        <Button
          variant='contained'
          startIcon={<TestTube2 size={16} />}
          onClick={handleAnalyze}
          disabled={loading}
          sx={{ bgcolor: 'teal.500', '&:hover': { bgcolor: 'teal.600' } }}
        >
          {loading ? (
            <CircularProgress
              size={16}
              sx={{ color: 'common.white' }}
            />
          ) : (
            '分析并生成测试'
          )}
        </Button>
        <Box sx={{ flex: 1 }} />
        {testSuite && (
          <Chip
            label={`${testSuite.tests.length} 个测试用例`}
            sx={{ bgcolor: 'success.100', color: 'teal.900', fontWeight: 600 }}
          />
        )}
      </Stack>

      <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 3 }}>
        <Card variant='outlined' sx={{ p: 2 }}>
          <Typography
            variant='subtitle2'
            sx={{ fontWeight: 600, mb: 1.5 }}
          >
            源代码
          </Typography>
          <TextField
            multiline
            fullWidth
            minRows={10}
            maxRows={14}
            value={source}
            onChange={(e) => setSource(e.target.value)}
            variant='outlined'
            size='small'
            sx={{
              fontFamily: 'monospace',
              fontSize: 12,
              '& .MuiInputBase-input': {
                fontFamily: 'monospace',
                fontSize: 12,
                bgcolor: 'text.primary',
                color: 'divider',
              },
            }}
          />
          {analysis && (
            <Box sx={{ mt: 2 }}>
              <Divider sx={{ mb: 1.5 }} />
              <Typography
                variant='subtitle2'
                sx={{ fontWeight: 600, mb: 1 }}
              >
                📊 分析结果
              </Typography>
              <Stack
                direction='row'
                spacing={1}
                sx={{ flexWrap: 'wrap', gap: 0.5, mb: 1 }}
              >
                {analysis.props.map((p) => (
                  <Chip
                    key={p.name}
                    label={`${p.name}${p.required ? ' *' : ''}: ${p.type}`}
                    size='small'
                    sx={{
                      bgcolor: p.required ? 'colors.error.50' : 'colors.info.50',
                      color: p.required ? 'colors.error.800' : 'colors.info.800',
                      fontSize: 11,
                      height: 22,
                    }}
                  />
                ))}
              </Stack>
              <Stack
                direction='row'
                spacing={1}
                sx={{ flexWrap: 'wrap', gap: 0.5, mb: 1 }}
              >
                <Chip
                  label={`useState: ${analysis.stateHooks.length}`}
                  size='small'
                  sx={{ bgcolor: 'warning.100', color: 'warning.800' }}
                />
                <Chip
                  label={`useEffect: ${analysis.effects.length}`}
                  size='small'
                  sx={{ bgcolor: 'primary.100', color: 'primary.800' }}
                />
                <Chip
                  label={`事件: ${analysis.eventHandlers.length}`}
                  size='small'
                  sx={{ bgcolor: 'success.100', color: 'teal.900' }}
                />
              </Stack>
              <Box sx={{ mt: 1.5 }}>
                <LinearProgress
                  variant='determinate'
                  value={Math.min(
                    100,
                    (analysis.coverage.branches +
                      analysis.coverage.statements +
                      analysis.coverage.functions) /
                      3
                  )}
                  sx={{ height: 6, borderRadius: 3 }}
                />
                <Typography
                  variant='caption'
                  sx={{ color: 'text.secondary', mt: 0.5, display: 'block' }}
                >
                  估算覆盖率: 分支 {analysis.coverage.branches} · 语句{' '}
                  {analysis.coverage.statements} · 函数 {analysis.coverage.functions}
                </Typography>
              </Box>
            </Box>
          )}
        </Card>

        <Card variant='outlined' sx={{ p: 2 }}>
          <Box
            sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1.5 }}
          >
            <Typography
              variant='subtitle2'
              sx={{ fontWeight: 600 }}
            >
              生成的测试代码
            </Typography>
            <Button
              size='small'
              startIcon={<Copy size={14} />}
              onClick={handleCopyCode}
              sx={{ textTransform: 'none' }}
            >
              复制
            </Button>
          </Box>
          {generatedCode && (
            <Box
              sx={{
                bgcolor: 'grey.900',
                borderRadius: 1,
                p: 2,
                fontFamily: 'monospace',
                fontSize: 11,
                color: 'divider',
                maxHeight: 250,
                overflow: 'auto',
                whiteSpace: 'pre',
                lineHeight: 1.6,
              }}
            >
              {generatedCode}
            </Box>
          )}
          {testSuite && testSuite.tests.length > 0 && (
            <Box sx={{ mt: 2 }}>
              <Divider sx={{ mb: 1 }} />
              <Typography
                variant='subtitle2'
                sx={{ fontWeight: 600, mb: 1 }}
              >
                测试用例列表
              </Typography>
              <List sx={{ maxHeight: 160, overflow: 'auto' }}>
                {testSuite.tests.map((test, idx) => (
                  <TestSuiteItem
                    key={idx}
                    test={test}
                  />
                ))}
              </List>
            </Box>
          )}
        </Card>
      </Box>
    </Box>
  );
};

const TestSuiteItem: React.FC<{ test: TestMethod }> = ({ test }) => {
  const [expanded, setExpanded] = React.useState(false);
  return (
    <Paper
      elevation={0}
      sx={{
        mb: 0.5,
        border: '1px solid',
        borderColor: 'divider',
        borderRadius: 1,
        bgcolor: 'background.default',
      }}
    >
      <ListItem
        sx={{ py: 0.5, cursor: 'pointer' }}
        onClick={() => setExpanded(!expanded)}
      >
        <CheckCircle2
          size={16}
          style={{ color: 'teal.500', marginRight: 8 }}
        />
        <ListItemText
          primary={
            <Typography
              variant='body2'
              sx={{ fontWeight: 600 }}
            >
              {test.name}
            </Typography>
          }
          secondary={expanded ? undefined : test.description}
        />
      </ListItem>
      {expanded && (
        <Box sx={{ px: 2, pb: 1.5 }}>
          <Typography
            variant='caption'
            sx={{ color: 'text.secondary', display: 'block' }}
          >
            <strong>Given:</strong> {test.given_when_then.given.join('; ')}
          </Typography>
          <Typography
            variant='caption'
            sx={{ color: 'text.secondary', display: 'block' }}
          >
            <strong>When:</strong> {test.given_when_then.when.join('; ')}
          </Typography>
          <Typography
            variant='caption'
            sx={{ color: 'text.secondary', display: 'block' }}
          >
            <strong>Then:</strong> {test.given_when_then.then.join('; ')}
          </Typography>
          <Box sx={{ mt: 0.5 }}>
            {test.assertions.map((a, idx) => (
              <Chip
                key={idx}
                label={a}
                size='small'
                sx={{ fontSize: 10, height: 18, mr: 0.5, mb: 0.5 }}
              />
            ))}
          </Box>
        </Box>
      )}
    </Paper>
  );
};

const UIRecommenderTab: React.FC = () => {
  const [description, setDescription] = React.useState('我需要一个显示用户信息的卡片组件');
  const [category, setCategory] = React.useState<IntentCategory | ''>('');
  const [keywords, setKeywords] = React.useState('用户, 卡片, 头像');
  const [responsive, setResponsive] = React.useState(true);
  const [recommendations, setRecommendations] = React.useState<ComponentRecommendation[]>([]);
  const [loading, setLoading] = React.useState(false);

  const handleRecommend = async () => {
    setLoading(true);
    const context: IntentContext = {
      description,
      category: category || undefined,
      keywords: keywords
        .split(/[,，]/)
        .map((k) => k.trim())
        .filter(Boolean),
      responsive,
      priority: 'consistency',
      themeMode: 'light',
    };
    const results = await uiComponentRecommender.recommend(context);
    setRecommendations(results);
    setLoading(false);
  };

  React.useEffect(() => {
    handleRecommend();
  }, []);

  const components = uiComponentRecommender.getAllComponents();

  return (
    <Box sx={{ p: 3 }}>
      <Stack
        direction='row'
        spacing={2}
        sx={{ mb: 3 }}
      >
        <TextField
          size='small'
          label='描述你的需求'
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          sx={{ flex: 2 }}
          placeholder='例如：我需要一个显示用户信息的卡片组件'
        />
        <FormControl
          size='small'
          sx={{ minWidth: 140 }}
        >
          <InputLabel>类别</InputLabel>
          <Select
            value={category}
            label='类别'
            onChange={(e) => setCategory(e.target.value as IntentCategory | '')}
          >
            <MenuItem value=''>自动检测</MenuItem>
            {CATEGORY_OPTIONS.map((opt) => (
              <MenuItem
                key={opt.value}
                value={opt.value}
              >
                {opt.label}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
        <Button
          variant='contained'
          startIcon={<Wand2 size={16} />}
          onClick={handleRecommend}
          disabled={loading}
          sx={{ bgcolor: 'warning.500', '&:hover': { bgcolor: 'warning.600' } }}
        >
          {loading ? '分析中...' : '智能推荐'}
        </Button>
      </Stack>

      <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 3 }}>
        <Card variant='outlined' sx={{ p: 2 }}>
          <Typography
            variant='subtitle2'
            sx={{ fontWeight: 600, mb: 1.5 }}
          >
            推荐结果
          </Typography>
          {loading && (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
              <CircularProgress size={32} />
            </Box>
          )}
          {!loading && recommendations.length === 0 && (
            <Alert severity='info'>暂无推荐，请点击"智能推荐"</Alert>
          )}
          {!loading &&
            recommendations.length > 0 &&
            recommendations.map((rec, idx) => (
              <Paper
                key={idx}
                elevation={2}
                sx={{
                  mb: 2,
                  p: 2,
                  borderRadius: 2,
                  border: '2px solid',
                  borderColor: idx === 0 ? designTokens.colors.secondary.main : 'divider',
                  background:
                    idx === 0 ? `linear-gradient(135deg, ${designTokens.colors.secondary['50']} 0%, ${designTokens.colors.secondary['100']} 100%)` : 'white',
                }}
              >
                {idx === 0 && (
                  <Chip
                    label='最佳匹配'
                    size='small'
                    sx={{
                      position: 'absolute',
                      top: -8,
                      right: 8,
                      bgcolor: 'secondary.500',
                      color: 'common.white',
                      fontWeight: 700,
                    }}
                  />
                )}
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                  <Typography
                    variant='h6'
                    sx={{ fontWeight: 700 }}
                  >
                    {rec.component}
                  </Typography>
                  {idx === 0 && (
                    <Sparkles
                      size={16}
                      color={designTokens.colors.secondary.main}
                    />
                  )}
                </Box>
                <Typography
                  variant='body2'
                  sx={{ color: 'text.secondary', mb: 1.5 }}
                >
                  {rec.reason}
                </Typography>

                {rec.a11y_notes.length > 0 && (
                  <Box sx={{ mb: 1.5 }}>
                    <Typography
                      variant='caption'
                      sx={{ fontWeight: 600, display: 'block', mb: 0.5 }}
                    >
                      ♿ 无障碍特性
                    </Typography>
                    <Stack
                      direction='row'
                      spacing={0.5}
                      sx={{ flexWrap: 'wrap', gap: 0.5 }}
                    >
                      {rec.a11y_notes.map((note, nIdx) => (
                        <Chip
                          key={nIdx}
                          label={note}
                          size='small'
                          sx={{
                            fontSize: 10,
                            height: 20,
                            bgcolor: note.includes('⚠️') ? 'colors.error.50' : 'colors.success.50',
                            color: note.includes('⚠️') ? 'colors.error.800' : '#166534',
                          }}
                        />
                      ))}
                    </Stack>
                  </Box>
                )}

                {rec.alternatives.length > 0 && (
                  <Box>
                    <Typography
                      variant='caption'
                      sx={{ fontWeight: 600, display: 'block', mb: 0.5 }}
                    >
                      🔄 替代方案
                    </Typography>
                    {rec.alternatives.map((alt, aIdx) => (
                      <Paper
                        key={aIdx}
                        elevation={0}
                        sx={{ p: 1, bgcolor: 'background.default', mb: 0.5, borderRadius: 1 }}
                      >
                        <Typography
                          variant='body2'
                          sx={{ fontWeight: 600 }}
                        >
                          {alt.name}
                        </Typography>
                        <Typography
                          variant='caption'
                          sx={{ color: 'text.secondary' }}
                        >
                          {alt.pros} · {alt.cons}
                        </Typography>
                      </Paper>
                    ))}
                  </Box>
                )}
              </Paper>
            ))}
        </Card>

        <Card variant='outlined' sx={{ p: 2 }}>
          <Typography
            variant='subtitle2'
            sx={{ fontWeight: 600, mb: 1.5 }}
          >
            📦 组件库 ({components.length})
          </Typography>
          <List sx={{ maxHeight: 450, overflow: 'auto' }}>
            {components.map((comp) => (
              <ListItem
                key={comp.name}
                sx={{ flexDirection: 'column', alignItems: 'stretch', py: 1.5 }}
              >
                <Paper
                  elevation={0}
                  sx={{
                    p: 1.5,
                    border: '1px solid',
                    borderColor: 'divider',
                    borderRadius: 1,
                    '&:hover': { bgcolor: 'background.default' },
                    cursor: 'pointer',
                  }}
                >
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                    <Typography
                      variant='subtitle2'
                      sx={{ fontWeight: 600 }}
                    >
                      {comp.name}
                    </Typography>
                    <Chip
                      label={
                        CATEGORY_OPTIONS.find((c) => c.value === comp.category)?.label ??
                        comp.category
                      }
                      size='small'
                      sx={{ fontSize: 10, height: 18 }}
                    />
                    <Box sx={{ flex: 1 }} />
                    <Badge
                      badgeContent={comp.usage_count}
                      color='primary'
                      sx={{ '& .MuiBadge-badge': { fontSize: 10, height: 18 } }}
                    >
                      <LayoutGrid size={14} />
                    </Badge>
                  </Box>
                  <Typography
                    variant='caption'
                    sx={{ color: 'text.secondary', display: 'block', mb: 0.5 }}
                  >
                    {comp.description}
                  </Typography>
                  <Stack
                    direction='row'
                    spacing={0.5}
                    sx={{ flexWrap: 'wrap', gap: 0.5 }}
                  >
                    <Chip
                      label={`响应式: ${comp.responsive_support === 'full' ? '✅' : comp.responsive_support === 'partial' ? '⚠️' : '❌'}`}
                      size='small'
                      sx={{ fontSize: 10, height: 18 }}
                    />
                    <Chip
                      label={`主题: ${comp.theme_support === 'full' ? '✅' : comp.theme_support === 'partial' ? '⚠️' : '❌'}`}
                      size='small'
                      sx={{ fontSize: 10, height: 18 }}
                    />
                    <Chip
                      label={`${comp.file_size_kb}KB`}
                      size='small'
                      sx={{ fontSize: 10, height: 18 }}
                    />
                  </Stack>
                </Paper>
              </ListItem>
            ))}
          </List>
        </Card>
      </Box>
    </Box>
  );
};

const AIChatTab: React.FC = () => {
  const [messages, setMessages] = React.useState<ChatMessage[]>([
    {
      id: 'welcome',
      role: 'assistant',
      content:
        '你好！我是 V53 AI 助手。我可以帮你：\n\n• 💡 生成代码片段和组件\n• 🐛 分析错误和调试建议\n• 📝 生成测试用例\n• 🎨 推荐 UI 组件\n• 🔧 代码重构建议\n\n请输入你的问题或需求。',
      timestamp: Date.now(),
    },
  ]);
  const [input, setInput] = React.useState('');
  const [isTyping, setIsTyping] = React.useState(false);
  const messagesEndRef = React.useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  React.useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const generateResponse = (userMessage: string): string => {
    const lower = userMessage.toLowerCase();

    if (lower.includes('test') || lower.includes('测试')) {
      return autoTestGenerator.generateComponentTest('MyComponent');
    }
    if (lower.includes('completion') || lower.includes('补全') || lower.includes('代码')) {
      return intelligentCodeCompletion.getStats()
        ? `智能补全系统状态：\n\n${JSON.stringify(intelligentCodeCompletion.getStats(), null, 2)}`
        : '请先注册示例数据以启用智能补全功能。';
    }
    if (lower.includes('ui') || lower.includes('组件') || lower.includes('界面')) {
      return '我可以根据你的需求推荐 UI 组件。请描述你想要实现的功能，例如："我需要一个用户信息卡片"。';
    }
    if (lower.includes('help') || lower.includes('帮助')) {
      return '可用命令：\n\n• /code - 获取代码补全建议\n• /test - 生成测试用例\n• /ui - 推荐 UI 组件\n• /stats - 查看系统状态\n\n或者直接描述你的需求，我会提供相应的建议。';
    }

    return `收到你的消息："${userMessage}"\n\n这是一个功能演示面板，AI 对话功能将在接入后端 LLM 服务后提供完整的智能对话能力。目前你可以：\n\n• 切换到其他标签页体验代码补全、测试生成和 UI 推荐\n• 使用 "/help" 查看可用命令\n• 在代码编辑器中尝试输入以体验智能补全`;
  };

  const handleSend = async () => {
    if (!input.trim()) return;

    const userMsg: ChatMessage = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: input,
      timestamp: Date.now(),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInput('');
    setIsTyping(true);

    await new Promise((resolve) => setTimeout(resolve, 600));

    const response: ChatMessage = {
      id: `ai-${Date.now()}`,
      role: 'assistant',
      content: generateResponse(input),
      timestamp: Date.now(),
    };

    setMessages((prev) => [...prev, response]);
    setIsTyping(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const quickPrompts = [
    '生成一个用户卡片组件',
    '如何测试 React Hooks?',
    '推荐一个表单输入组件',
    '分析这个组件的测试覆盖率',
  ];

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <Box
        sx={{
          flex: 1,
          overflow: 'auto',
          p: 3,
          display: 'flex',
          flexDirection: 'column',
          gap: 2,
        }}
      >
        {messages.map((msg) => (
          <Box
            key={msg.id}
            sx={{
              display: 'flex',
              justifyContent: msg.role === 'user' ? 'flex-end' : 'flex-start',
            }}
          >
            <Paper
              elevation={1}
              sx={{
                maxWidth: '80%',
                p: 2,
                borderRadius: 2,
                bgcolor: msg.role === 'user' ? designTokens.colors.secondary.dark : designTokens.colors.background.paper,
                color: msg.role === 'user' ? 'white' : 'inherit',
                border: msg.role === 'assistant' ? `1px solid ${designTokens.colors.grey['200']}` : 'none',
              }}
            >
              <Typography
                variant='body2'
                sx={{
                  whiteSpace: 'pre-wrap',
                  fontFamily: msg.content.includes('\n') ? 'monospace' : 'inherit',
                  fontSize: msg.content.includes('\n') ? 11 : 14,
                }}
              >
                {msg.content}
              </Typography>
            </Paper>
          </Box>
        ))}
        {isTyping && (
          <Box sx={{ display: 'flex', justifyContent: 'flex-start' }}>
            <Paper
              elevation={1}
              sx={{ p: 2, borderRadius: 2, bgcolor: 'common.white', border: `1px solid ${designTokens.colors.grey['200']}` }}
            >
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Loader2
                  size={14}
                  className='animate-spin'
                />
                <Typography
                  variant='body2'
                  color='text.secondary'
                >
                  AI 正在思考...
                </Typography>
              </Box>
            </Paper>
          </Box>
        )}
        <div ref={messagesEndRef} />
      </Box>

      <Box sx={{ borderTop: 1, borderColor: 'divider', p: 2, bgcolor: 'common.white' }}>
        <Box sx={{ mb: 1, display: 'flex', gap: 1, flexWrap: 'wrap' }}>
          {quickPrompts.map((prompt) => (
            <Chip
              key={prompt}
              label={prompt}
              size='small'
              onClick={() => setInput(prompt)}
              sx={{
                cursor: 'pointer',
                bgcolor: 'secondary.100',
                color: 'purple.800',
                fontSize: 11,
                '&:hover': { bgcolor: 'secondary.200' },
              }}
            />
          ))}
        </Box>
        <Stack
          direction='row'
          spacing={1}
        >
          <TextField
            fullWidth
            multiline
            maxRows={3}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder='输入消息，Enter 发送，Shift+Enter 换行...'
            variant='outlined'
            size='small'
            sx={{
              '& .MuiOutlinedInput-root': {
                borderRadius: 2,
                '&:focus-within': {
                  borderColor: 'secondary.500',
                },
              },
            }}
          />
          <Button
            variant='contained'
            onClick={handleSend}
            disabled={!input.trim() || isTyping}
            sx={{
              bgcolor: 'secondary.500',
              minWidth: 50,
              height: 40,
              '&:hover': { bgcolor: 'secondary.600' },
              '&.Mui-disabled': { bgcolor: 'divider', color: 'text.muted' },
            }}
          >
            <Send size={18} />
          </Button>
        </Stack>
      </Box>
    </Box>
  );
};

export { V53AIPanel };
export default V53AIPanel;
