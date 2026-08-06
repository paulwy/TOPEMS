import React from 'react';
import {
  Box,
  Typography,
  IconButton,
  Button,
  TextField,
  Paper,
  Chip,
  Stack,
  Tabs,
  Tab,
  List,
  ListItem,
  Divider,
  CircularProgress,
  Alert,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TableContainer,
  Badge,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  OutlinedInput,
  Grid,
} from '@mui/material';
import {
  X as XIcon,
  Code,
  Search,
  FileText,
  MessageSquare,
  History,
  Send,
  Plus,
  BookOpen,
  ClipboardList,
  Sparkles,
  MapPin,
  FileCode,
  FolderOpen,
  Lightbulb,
  Database,
  Trash2,
  Link as LinkIcon,
  GitBranch,
} from 'lucide-react';
import { V51Card } from '../../design-system/components';
import {
  codeNavigator,
  type SearchResult,
  type FileStructure,
  type SymbolInfo,
} from './code-navigator';
import { docGenerator, type ChangelogEntry } from './doc-generator';
import { sanitizeHtml } from '@/lib/security';
import { knowledgeQA, type QAEntry, type QAResult, type KnowledgeDocument } from './knowledge-qa';

type TabId = 'navigator' | 'generator' | 'qa' | 'activity';

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
}

const SAMPLE_FILES = [
  {
    path: 'src/App.tsx',
    content: `import React from 'react';
import { Button } from '@mui/material';
import { Dashboard } from './pages/Dashboard';

/**
 * Main application component
 * Renders the dashboard and handles routing
 */
export function App(): JSX.Element {
  const handleClick = (): void => {
    // Button click handler
  };

  return (
    <div>
      <Button onClick={handleClick}>Click Me</Button>
      <Dashboard />
    </div>
  );
}

export default App;`,
  },
  {
    path: 'src/pages/Dashboard.tsx',
    content: `import React from 'react';
import { Box, Typography } from '@mui/material';
import { App } from '../App';

/**
 * Dashboard page component
 * Displays user statistics and recent activity
 */
export interface DashboardProps {
  userId: string;
  title?: string;
}

/**
 * Renders the main dashboard with statistics
 * @param props Dashboard configuration
 * @returns Dashboard component
 */
export function Dashboard(props: DashboardProps): JSX.Element {
  return (
    <Box>
      <Typography variant="h1">{props.title || 'Dashboard'}</Typography>
    </Box>
  );
}`,
  },
  {
    path: 'src/utils/api.ts',
    content: `import axios from 'axios';
import type { User, Product } from '../types';

/**
 * API client module
 * Handles all HTTP requests to the backend
 */
const BASE_URL = '/api/v1';

/**
 * Fetches a user by ID
 * @param id The user ID
 * @returns User object or null
 */
export async function fetchUser(id: string): Promise<User | null> {
  try {
    const response = await axios.get<User>(\`\${BASE_URL}/users/\${id}\`);
    return response.data;
  } catch (error) {
    return null;
  }
}

/**
 * Fetches all products
 * @returns Array of products
 */
export async function fetchProducts(): Promise<Product[]> {
  const response = await axios.get<Product[]>(\`\${BASE_URL}/products\`);
  return response.data;
}`,
  },
];

const V55CopilotPanel: React.FC<{ onClose: () => void }> = ({ onClose }) => {
  const [activeTab, setActiveTab] = React.useState<TabId>('navigator');
  const [indexed, setIndexed] = React.useState(false);
  const [searchQuery, setSearchQuery] = React.useState('');
  const [searchResults, setSearchResults] = React.useState<SearchResult[]>([]);
  const [selectedFile, setSelectedFile] = React.useState<FileStructure | null>(null);
  const [symbolLookup, setSymbolLookup] = React.useState<SymbolInfo | null>(null);
  const [refs, setRefs] = React.useState<{ file: string; line: number }[]>([]);
  const [graphData, setGraphData] = React.useState<{
    dependencies: string[];
    dependents: string[];
  }>({
    dependencies: [],
    dependents: [],
  });

  const [genKind, setGenKind] = React.useState<
    'function' | 'class' | 'interface' | 'type' | 'method'
  >('function');
  const [genName, setGenName] = React.useState('');
  const [genDesc, setGenDesc] = React.useState('');
  const [genResult, setGenResult] = React.useState('');
  const [generatedDocs, setGeneratedDocs] = React.useState<
    Array<{ kind: string; name: string; content: string }>
  >([]);
  const [changelogVersion, setChangelogVersion] = React.useState('V55.0');
  const [changelogEntries, setChangelogEntries] = React.useState<ChangelogEntry[]>([]);
  const [readmeResult, setReadmeResult] = React.useState('');

  const [messages, setMessages] = React.useState<ChatMessage[]>([]);
  const [input, setInput] = React.useState('');
  const [qaHistory, setQaHistory] = React.useState<QAEntry[]>([]);
  const [qaStats, setQaStats] = React.useState<{
    totalQA: number;
    totalDocs: number;
    totalTags: number;
  }>({
    totalQA: 0,
    totalDocs: 0,
    totalTags: 0,
  });
  const [showAddDoc, setShowAddDoc] = React.useState(false);
  const [newDocTitle, setNewDocTitle] = React.useState('');
  const [newDocContent, setNewDocContent] = React.useState('');
  const [newDocTags, setNewDocTags] = React.useState('');
  const [isProcessing, setIsProcessing] = React.useState(false);

  const [recentActivity, setRecentActivity] = React.useState<
    Array<{ type: string; description: string; timestamp: number }>
  >([]);

  React.useEffect(() => {
    const stats = codeNavigator.buildIndex(SAMPLE_FILES);
    setIndexed(true);
    setRecentActivity((prev) => [
      {
        type: 'index',
        description: `代码索引进阶完成：${stats.totalFiles} 个文件，${stats.totalSymbols} 个符号`,
        timestamp: Date.now(),
      },
      ...prev,
    ]);

    knowledgeQA.addDocument({
      title: 'React Hooks 使用指南',
      content:
        'React Hooks 是 React 16.8 引入的新特性。useState 用于管理组件状态，useEffect 用于处理副作用，useContext 用于访问 Context，useReducer 用于复杂状态管理。自定义 Hooks 可以将组件逻辑提取为可复用函数。使用规则：只能在函数组件顶层调用，不能在条件或循环内调用。',
      source: 'React 官方文档',
      tags: ['react', 'hooks', 'frontend'],
    });

    knowledgeQA.addDocument({
      title: 'TypeScript 高级类型',
      content:
        'TypeScript 高级类型包括：条件类型（T extends U ? X : Y）、映射类型（{ [K in keyof T]: ... }）、模板字面量类型、推断类型（infer）。实用类型（Utility Types）包括 Partial、Required、Pick、Omit、Record、ReturnType 等。掌握这些类型工具可以编写类型安全的代码。',
      source: 'TypeScript Handbook',
      tags: ['typescript', 'types', 'programming'],
    });

    knowledgeQA.addDocument({
      title: 'MUI Material Design 组件库',
      content:
        'MUI（原 Material-UI）是基于 Material Design 规范的 React 组件库。核心组件包括：Layout（Box, Container, Grid, Stack）、Data Display（Typography, Avatar, Badge, Table）、Feedback（Dialog, Snackbar, Alert）、Input（TextField, Select, Checkbox）、Navigation（Tabs, Menu, Pagination）。使用 ThemeProvider 进行主题定制。',
      source: 'MUI Documentation',
      tags: ['mui', 'react', 'ui', 'components'],
    });

    const unsub = knowledgeQA.on((entry) => {
      setQaStats(knowledgeQA.getStats());
      setRecentActivity((prev) => [
        {
          type: 'qa',
          description: `问答: ${entry.question.substring(0, 30)}...`,
          timestamp: Date.now(),
        },
        ...prev,
      ]);
    });

    return () => {
      unsub();
    };
  }, []);

  const handleSearch = () => {
    if (!searchQuery.trim()) return;
    const results = codeNavigator.searchCode(searchQuery, 20);
    setSearchResults(results);

    const sym = codeNavigator.findSymbol(searchQuery);
    setSymbolLookup(sym);

    if (sym) {
      setRefs(codeNavigator.getReferences(searchQuery));
      const structure = codeNavigator.getFileStructure(sym.file);
      if (structure) {
        setSelectedFile(structure);
        setGraphData(codeNavigator.getImportGraph(sym.file));
      }
    }

    setRecentActivity((prev) => [
      {
        type: 'search',
        description: `搜索代码: "${searchQuery}" - ${results.length} 个结果`,
        timestamp: Date.now(),
      },
      ...prev,
    ]);
  };

  const handleFindDefinition = () => {
    if (!searchQuery.trim()) return;
    const def = codeNavigator.getDefinition(searchQuery);
    if (def) {
      const structure = codeNavigator.getFileStructure(def.file);
      if (structure) {
        setSelectedFile(structure);
        setGraphData(codeNavigator.getImportGraph(def.file));
      }
    }
  };

  const handleGenerateDoc = () => {
    if (!genName.trim()) return;
    const result = docGenerator.generateDoc(genKind, genName, {
      description: genDesc || `${genName} 的文档说明`,
      params:
        genKind === 'function' || genKind === 'method'
          ? [{ name: 'param1', type: 'string', description: '参数说明' }]
          : undefined,
      returns: genKind === 'function' || genKind === 'method' ? 'Promise<void>' : undefined,
      examples: [`const result = ${genName}();`],
    });
    setGenResult(result);
    setGeneratedDocs((prev) => [{ kind: genKind, name: genName, content: result }, ...prev]);

    setRecentActivity((prev) => [
      { type: 'doc', description: `生成文档: ${genKind} ${genName}`, timestamp: Date.now() },
      ...prev,
    ]);
  };

  const handleGenerateChangelog = () => {
    const result = docGenerator.generateChangelog(changelogVersion, changelogEntries);
    setReadmeResult(result);

    setRecentActivity((prev) => [
      {
        type: 'changelog',
        description: `生成 Changelog ${changelogVersion}`,
        timestamp: Date.now(),
      },
      ...prev,
    ]);
  };

  const handleGenerateReadme = () => {
    const result = docGenerator.generateReadme('ai-copilot', {
      description: 'AI Copilot 是 V55.0 前端智能助手，提供代码导航、文档生成和知识问答功能。',
      features: [
        '智能代码索引和搜索',
        '符号查找与引用导航',
        '自动 JSDoc/TSDoc 生成',
        'API 文档和 README 生成',
        '基于知识库的问答系统',
      ],
      installation: 'npm install',
      usage: `import { codeNavigator, docGenerator, knowledgeQA } from '@/ai/copilot';`,
      api: [
        {
          name: 'searchCode',
          description: '搜索代码库',
          signature: 'searchCode(query: string): SearchResult[]',
        },
        {
          name: 'findSymbol',
          description: '查找符号定义',
          signature: 'findSymbol(name: string): SymbolInfo | null',
        },
        {
          name: 'generateDoc',
          description: '生成文档注释',
          signature: 'generateDoc(kind, name, options): string',
        },
        { name: 'ask', description: '知识问答', signature: 'ask(question: string): QAResult' },
      ],
    });
    setReadmeResult(result);

    setRecentActivity((prev) => [
      { type: 'readme', description: '生成 README 文档', timestamp: Date.now() },
      ...prev,
    ]);
  };

  const handleSendMessage = async () => {
    if (!input.trim()) return;

    const userMsg: ChatMessage = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: input,
      timestamp: Date.now(),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInput('');
    setIsProcessing(true);

    await new Promise((resolve) => setTimeout(resolve, 400));

    const result: QAResult = knowledgeQA.ask(input);
    setQaHistory(knowledgeQA.getHistory());
    setQaStats(knowledgeQA.getStats());

    const assistantMsg: ChatMessage = {
      id: `assistant-${Date.now()}`,
      role: 'assistant',
      content: result.entry.answer,
      timestamp: Date.now(),
    };

    setMessages((prev) => [...prev, assistantMsg]);
    setIsProcessing(false);
  };

  const handleAddDocument = () => {
    if (!newDocTitle.trim() || !newDocContent.trim()) return;

    const tags = newDocTags
      .split(',')
      .map((t) => t.trim())
      .filter(Boolean);
    knowledgeQA.addDocument({
      title: newDocTitle,
      content: newDocContent,
      source: '用户上传',
      tags,
    });

    setShowAddDoc(false);
    setNewDocTitle('');
    setNewDocContent('');
    setNewDocTags('');
    setQaStats(knowledgeQA.getStats());

    setRecentActivity((prev) => [
      { type: 'doc', description: `添加文档: ${newDocTitle}`, timestamp: Date.now() },
      ...prev,
    ]);
  };

  const handleAddChangelogEntry = () => {
    const types: ChangelogEntry['type'][] = [
      'added',
      'changed',
      'fixed',
      'removed',
      'deprecated',
      'security',
    ];
    const type = types[Math.floor(Math.random() * types.length)];
    const descriptions: Record<string, string> = {
      added: '新增 AI 代码导航功能',
      changed: '优化文档生成模板',
      fixed: '修复知识问答匹配算法',
      removed: '移除废弃 API',
      deprecated: '标记旧接口为废弃',
      security: '修复安全漏洞',
    };

    setChangelogEntries((prev) => [
      ...prev,
      {
        version: changelogVersion,
        date: new Date().toISOString().split('T')[0],
        type,
        description: descriptions[type],
        author: '开发团队',
      },
    ]);
  };

  const clearHistory = () => {
    knowledgeQA.clearHistory();
    setQaHistory([]);
    setMessages([]);
    setQaStats(knowledgeQA.getStats());
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const formatTime = (ts: number): string => {
    return new Date(ts).toLocaleTimeString();
  };

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
          height: '94vh',
          bgcolor: 'background.paper',
          borderRadius: 3,
          overflow: 'hidden',
          boxShadow: '0 24px 80px rgba(0,0,0,0.4)',
          display: 'flex',
          flexDirection: 'column',
          border: '1px solid rgba(139, 92, 246, 0.2)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <V55PanelHeader
          onClose={onClose}
          indexed={indexed}
        />

        <Box sx={{ px: 2, py: 1.5, borderBottom: 1, borderColor: 'divider' }}>
          <Tabs
            value={activeTab}
            onChange={(_, v) => setActiveTab(v as TabId)}
            variant='scrollable'
            scrollButtons='auto'
          >
            <Tab
              icon={<Code size={16} />}
              iconPosition='start'
              label='代码导航'
              value='navigator'
            />
            <Tab
              icon={<FileText size={16} />}
              iconPosition='start'
              label='文档生成'
              value='generator'
            />
            <Tab
              icon={<MessageSquare size={16} />}
              iconPosition='start'
              label={`知识问答 (${qaHistory.length})`}
              value='qa'
            />
            <Tab
              icon={<History size={16} />}
              iconPosition='start'
              label={`最近活动 (${recentActivity.length})`}
              value='activity'
            />
          </Tabs>
        </Box>

        <Box sx={{ flex: 1, overflow: 'auto', bgcolor: 'grey.50' }}>
          {activeTab === 'navigator' && (
            <NavigatorTab
              searchQuery={searchQuery}
              onSearchQueryChange={setSearchQuery}
              onSearch={handleSearch}
              onFindDefinition={handleFindDefinition}
              searchResults={searchResults}
              symbolLookup={symbolLookup}
              refs={refs}
              selectedFile={selectedFile}
              graphData={graphData}
              indexed={indexed}
              stats={codeNavigator.getStats()}
              onSelectFile={(f) => {
                setSelectedFile(f);
                setGraphData(codeNavigator.getImportGraph(f.path));
              }}
            />
          )}

          {activeTab === 'generator' && (
            <GeneratorTab
              genKind={genKind}
              onGenKindChange={setGenKind}
              genName={genName}
              onGenNameChange={setGenName}
              genDesc={genDesc}
              onGenDescChange={setGenDesc}
              genResult={genResult}
              onGenerate={handleGenerateDoc}
              generatedDocs={generatedDocs}
              changelogVersion={changelogVersion}
              onChangelogVersionChange={setChangelogVersion}
              changelogEntries={changelogEntries}
              onAddChangelogEntry={handleAddChangelogEntry}
              onGenerateChangelog={handleGenerateChangelog}
              onGenerateReadme={handleGenerateReadme}
              readmeResult={readmeResult}
            />
          )}

          {activeTab === 'qa' && (
            <QATab
              messages={messages}
              input={input}
              onInputChange={setInput}
              onSend={handleSendMessage}
              onKeyDown={handleKeyDown}
              isProcessing={isProcessing}
              qaHistory={qaHistory}
              qaStats={qaStats}
              onClearHistory={clearHistory}
              showAddDoc={showAddDoc}
              onShowAddDocChange={setShowAddDoc}
              newDocTitle={newDocTitle}
              onNewDocTitleChange={setNewDocTitle}
              newDocContent={newDocContent}
              onNewDocContentChange={setNewDocContent}
              newDocTags={newDocTags}
              onNewDocTagsChange={setNewDocTags}
              onAddDocument={handleAddDocument}
              documents={knowledgeQA.getDocuments()}
            />
          )}

          {activeTab === 'activity' && <ActivityTab activity={recentActivity} />}
        </Box>
      </Box>
    </Box>
  );
};

const V55PanelHeader: React.FC<{ onClose: () => void; indexed: boolean }> = ({
  onClose,
  indexed,
}) => (
  <Box
    sx={{
      p: 2,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      background: 'linear-gradient(135deg, #8b5cf6 0%, #6366f1 50%, #3b82f6 100%)',
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
          V55.0 AI Copilot
        </Typography>
        <Typography
          variant='caption'
          sx={{ opacity: 0.85, fontSize: 12 }}
        >
          代码导航 · 文档生成 · 知识问答
        </Typography>
      </Box>
    </Box>
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
      <Badge
        badgeContent={indexed ? '✓' : '...'}
        color='secondary'
        sx={{
          '& .MuiBadge-badge': {
            bgcolor: indexed ? '#10b981' : '#f59e0b',
            color: 'text.primary',
            fontWeight: 700,
            fontSize: 10,
          },
        }}
      >
        <Database size={18} />
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

const NavigatorTab: React.FC<{
  searchQuery: string;
  onSearchQueryChange: (v: string) => void;
  onSearch: () => void;
  onFindDefinition: () => void;
  searchResults: SearchResult[];
  symbolLookup: SymbolInfo | null;
  refs: Array<{ file: string; line: number }>;
  selectedFile: FileStructure | null;
  graphData: { dependencies: string[]; dependents: string[] };
  indexed: boolean;
  stats: { totalFiles: number; totalSymbols: number; totalImports: number };
  onSelectFile: (f: FileStructure) => void;
}> = ({
  searchQuery,
  onSearchQueryChange,
  onSearch,
  onFindDefinition,
  searchResults,
  symbolLookup,
  refs,
  selectedFile,
  graphData,
  indexed,
  stats,
  onSelectFile,
}) => (
  <Box sx={{ p: 3, display: 'flex', flexDirection: 'column', gap: 3 }}>
    <Stack
      direction='row'
      spacing={2}
      sx={{ alignItems: 'center' }}
    >
      <Typography
        variant='h6'
        sx={{ fontWeight: 600, display: 'flex', alignItems: 'center', gap: 1 }}
      >
        <Search size={20} />
        代码导航
      </Typography>
      {indexed && (
        <Stack
          direction='row'
          spacing={1}
        >
          <Chip
            label={`${stats.totalFiles} 文件`}
            size='small'
            sx={{ fontSize: 10 }}
          />
          <Chip
            label={`${stats.totalSymbols} 符号`}
            size='small'
            sx={{ fontSize: 10 }}
          />
          <Chip
            label={`${stats.totalImports} 导入`}
            size='small'
            sx={{ fontSize: 10 }}
          />
        </Stack>
      )}
    </Stack>

    <Stack
      direction='row'
      spacing={1}
    >
      <TextField
        fullWidth
        size='small'
        value={searchQuery}
        onChange={(e) => onSearchQueryChange(e.target.value)}
        placeholder='搜索符号、函数、类、接口...'
        sx={{
          '& .MuiOutlinedInput-root': {
            borderRadius: 2,
            '&:focus-within': { borderColor: 'secondary.500' },
          },
        }}
        onKeyDown={(e) => {
          if (e.key === 'Enter') onSearch();
        }}
      />
      <Button
        variant='contained'
        startIcon={<Search size={14} />}
        onClick={onSearch}
        sx={{ bgcolor: 'secondary.500', '&:hover': { bgcolor: 'secondary.600' } }}
        size='small'
      >
        搜索
      </Button>
      <Button
        variant='outlined'
        startIcon={<MapPin size={14} />}
        onClick={onFindDefinition}
        size='small'
      >
        跳转到定义
      </Button>
    </Stack>

    <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 3 }}>
      <V51Card>
        <Typography
          variant='subtitle2'
          sx={{ fontWeight: 600, mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}
        >
          <FileCode size={16} />
          搜索结果 ({searchResults.length})
        </Typography>
        {searchResults.length === 0 && (
          <Alert severity='info'>
            输入关键词搜索代码符号，或使用示例文件进行测试。尝试搜索: <strong>App</strong>,{' '}
            <strong>Dashboard</strong>, <strong>fetchUser</strong>
          </Alert>
        )}
        {searchResults.length > 0 && (
          <List sx={{ maxHeight: 450, overflow: 'auto' }}>
            {searchResults.map((result, idx) => (
              <Paper
                key={`${result.file}-${idx}`}
                elevation={0}
                sx={{
                  mb: 1,
                  p: 1.5,
                  border: '1px solid',
                  borderColor: 'divider',
                  borderRadius: 1,
                  cursor: 'pointer',
                  '&:hover': { bgcolor: 'purple.100' },
                }}
                onClick={() => {
                  const structure = codeNavigator.getFileStructure(result.file);
                  if (structure) onSelectFile(structure);
                }}
              >
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                  <Typography
                    variant='body2'
                    sx={{ fontWeight: 600, flex: 1 }}
                  >
                    {result.match}
                  </Typography>
                  <Chip
                    label={`score: ${result.score.toFixed(1)}`}
                    size='small'
                    sx={{ fontSize: 10, height: 18, bgcolor: 'secondary.100', color: 'purple.800' }}
                  />
                </Box>
                <Typography
                  variant='caption'
                  color='text.secondary'
                  sx={{ fontSize: 11, fontFamily: 'monospace' }}
                >
                  {result.file}:{result.line}
                </Typography>
                <Typography
                  variant='caption'
                  color='text.secondary'
                  sx={{ fontSize: 11, display: 'block', mt: 0.5 }}
                >
                  {result.context}
                </Typography>
              </Paper>
            ))}
          </List>
        )}
      </V51Card>

      <V51Card>
        <Typography
          variant='subtitle2'
          sx={{ fontWeight: 600, mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}
        >
          <BookOpen size={16} />
          符号详情
        </Typography>

        {symbolLookup ? (
          <Box>
            <Paper
              elevation={0}
              sx={{ p: 2, bgcolor: 'purple.100', borderRadius: 1, mb: 2 }}
            >
              <Typography
                variant='subtitle2'
                sx={{ fontWeight: 700, color: 'purple.800' }}
              >
                {symbolLookup.name}
              </Typography>
              <Box sx={{ display: 'flex', gap: 1, mt: 0.5 }}>
                <Chip
                  label={symbolLookup.kind}
                  size='small'
                  sx={{ fontSize: 10 }}
                />
                {symbolLookup.exported && (
                  <Chip
                    label='exported'
                    size='small'
                    sx={{ fontSize: 10, bgcolor: 'success.100', color: 'teal.900' }}
                  />
                )}
              </Box>
              {symbolLookup.signature && (
                <Typography
                  variant='caption'
                  sx={{
                    mt: 1,
                    display: 'block',
                    fontFamily: 'monospace',
                    fontSize: 11,
                    bgcolor: 'common.white',
                    p: 1,
                    borderRadius: 1,
                  }}
                >
                  {symbolLookup.signature}
                </Typography>
              )}
              {symbolLookup.documentation && (
                <Typography
                  variant='caption'
                  sx={{ mt: 1, display: 'block', color: 'purple.800' }}
                >
                  {symbolLookup.documentation}
                </Typography>
              )}
              <Typography
                variant='caption'
                color='text.secondary'
                sx={{ mt: 0.5, display: 'block' }}
              >
                📍 {symbolLookup.file}:{symbolLookup.line}
              </Typography>
            </Paper>

            <Typography
              variant='subtitle2'
              sx={{ fontWeight: 600, mb: 1, fontSize: 12 }}
            >
              引用 ({refs.length})
            </Typography>
            <Box sx={{ maxHeight: 150, overflow: 'auto' }}>
              {refs.length === 0 ? (
                <Typography
                  variant='caption'
                  color='text.secondary'
                >
                  无引用
                </Typography>
              ) : (
                refs.slice(0, 10).map((ref, idx) => (
                  <Typography
                    key={idx}
                    variant='caption'
                    sx={{
                      display: 'block',
                      fontFamily: 'monospace',
                      fontSize: 11,
                      p: 0.5,
                      borderRadius: 0.5,
                      '&:hover': { bgcolor: 'grey.100' },
                    }}
                  >
                    <LinkIcon
                      size={10}
                      style={{ display: 'inline', verticalAlign: 'middle' }}
                    />{' '}
                    {ref.file}:{ref.line}
                  </Typography>
                ))
              )}
            </Box>
          </Box>
        ) : (
          <Alert severity='info'>搜索符号后，此处将显示符号详情和引用关系。</Alert>
        )}
      </V51Card>
    </Box>

    {selectedFile && (
      <V51Card>
        <Typography
          variant='subtitle2'
          sx={{ fontWeight: 600, mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}
        >
          <FolderOpen size={16} />
          文件结构: {selectedFile.path}
        </Typography>
        <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2 }}>
          <Box>
            <Typography
              variant='caption'
              sx={{ fontWeight: 600, display: 'block', mb: 1 }}
            >
              <GitBranch
                size={12}
                style={{ verticalAlign: 'middle' }}
              />{' '}
              依赖 ({graphData.dependencies.length})
            </Typography>
            <Box sx={{ maxHeight: 150, overflow: 'auto' }}>
              {graphData.dependencies.length === 0 ? (
                <Typography
                  variant='caption'
                  color='text.secondary'
                >
                  无依赖
                </Typography>
              ) : (
                graphData.dependencies.slice(0, 10).map((dep, idx) => (
                  <Typography
                    key={idx}
                    variant='caption'
                    sx={{ display: 'block', fontFamily: 'monospace', fontSize: 11 }}
                  >
                    ← {dep}
                  </Typography>
                ))
              )}
            </Box>
          </Box>
          <Box>
            <Typography
              variant='caption'
              sx={{ fontWeight: 600, display: 'block', mb: 1 }}
            >
              <GitBranch
                size={12}
                style={{ verticalAlign: 'middle' }}
              />{' '}
              被依赖 ({graphData.dependents.length})
            </Typography>
            <Box sx={{ maxHeight: 150, overflow: 'auto' }}>
              {graphData.dependents.length === 0 ? (
                <Typography
                  variant='caption'
                  color='text.secondary'
                >
                  无被依赖
                </Typography>
              ) : (
                graphData.dependents.slice(0, 10).map((dep, idx) => (
                  <Typography
                    key={idx}
                    variant='caption'
                    sx={{ display: 'block', fontFamily: 'monospace', fontSize: 11 }}
                  >
                    → {dep}
                  </Typography>
                ))
              )}
            </Box>
          </Box>
        </Box>

        <Divider sx={{ my: 1.5 }} />

        <Typography
          variant='caption'
          sx={{ fontWeight: 600, display: 'block', mb: 1 }}
        >
          文件符号 ({selectedFile.symbols.length})
        </Typography>
        <TableContainer>
          <Table size='small'>
            <TableHead>
              <TableRow>
                <TableCell sx={{ fontSize: 11, fontWeight: 600 }}>符号</TableCell>
                <TableCell sx={{ fontSize: 11, fontWeight: 600 }}>类型</TableCell>
                <TableCell sx={{ fontSize: 11, fontWeight: 600 }}>行号</TableCell>
                <TableCell sx={{ fontSize: 11, fontWeight: 600 }}>导出</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {selectedFile.symbols.map((sym, idx) => (
                <TableRow key={idx}>
                  <TableCell sx={{ fontSize: 12, fontFamily: 'monospace' }}>{sym.name}</TableCell>
                  <TableCell>
                    <Chip
                      label={sym.kind}
                      size='small'
                      sx={{ fontSize: 10, height: 18 }}
                    />
                  </TableCell>
                  <TableCell sx={{ fontSize: 11 }}>{sym.line}</TableCell>
                  <TableCell>
                    {sym.exported ? (
                      <Chip
                        label='✓'
                        size='small'
                        sx={{ fontSize: 10, height: 18, bgcolor: 'success.100', color: 'teal.900' }}
                      />
                    ) : (
                      <Typography
                        variant='caption'
                        color='text.secondary'
                      >
                        -
                      </Typography>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>

        <Divider sx={{ my: 1.5 }} />

        <Typography
          variant='caption'
          sx={{ fontWeight: 600, display: 'block', mb: 1 }}
        >
          导入 ({selectedFile.imports.length})
        </Typography>
        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
          {selectedFile.imports.map((imp, idx) => (
            <Chip
              key={idx}
              size='small'
              label={`${imp.name} ← ${imp.source}`}
              sx={{ fontSize: 10, height: 20, fontFamily: 'monospace' }}
            />
          ))}
        </Box>
      </V51Card>
    )}
  </Box>
);

const GeneratorTab: React.FC<{
  genKind: 'function' | 'class' | 'interface' | 'type' | 'method';
  onGenKindChange: (v: 'function' | 'class' | 'interface' | 'type' | 'method') => void;
  genName: string;
  onGenNameChange: (v: string) => void;
  genDesc: string;
  onGenDescChange: (v: string) => void;
  genResult: string;
  onGenerate: () => void;
  generatedDocs: Array<{ kind: string; name: string; content: string }>;
  changelogVersion: string;
  onChangelogVersionChange: (v: string) => void;
  changelogEntries: ChangelogEntry[];
  onAddChangelogEntry: () => void;
  onGenerateChangelog: () => void;
  onGenerateReadme: () => void;
  readmeResult: string;
}> = ({
  genKind,
  onGenKindChange,
  genName,
  onGenNameChange,
  genDesc,
  onGenDescChange,
  genResult,
  onGenerate,
  generatedDocs,
  changelogVersion,
  onChangelogVersionChange,
  changelogEntries,
  onAddChangelogEntry,
  onGenerateChangelog,
  onGenerateReadme,
  readmeResult,
}) => {
  const [activeSubTab, setActiveSubTab] = React.useState<'jsdoc' | 'changelog' | 'readme'>('jsdoc');

  return (
    <Box sx={{ p: 3, display: 'flex', flexDirection: 'column', gap: 3 }}>
      <Stack
        direction='row'
        spacing={2}
      >
        <Typography
          variant='h6'
          sx={{ fontWeight: 600, display: 'flex', alignItems: 'center', gap: 1 }}
        >
          <FileText size={20} />
          文档生成
        </Typography>
      </Stack>

      <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
        <Tabs
          value={activeSubTab}
          onChange={(_, v) => setActiveSubTab(v)}
        >
          <Tab
            label='JSDoc/TSDoc'
            value='jsdoc'
          />
          <Tab
            label='Changelog'
            value='changelog'
          />
          <Tab
            label='README'
            value='readme'
          />
        </Tabs>
      </Box>

      {activeSubTab === 'jsdoc' && (
        <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 3 }}>
          <V51Card>
            <Typography
              variant='subtitle2'
              sx={{ fontWeight: 600, mb: 2 }}
            >
              文档配置
            </Typography>
            <Stack
              direction='column'
              spacing={2}
            >
              <FormControl size='small'>
                <InputLabel>符号类型</InputLabel>
                <Select
                  value={genKind}
                  label='符号类型'
                  onChange={(e) => onGenKindChange(e.target.value as typeof genKind)}
                >
                  <MenuItem value='function'>函数 (function)</MenuItem>
                  <MenuItem value='class'>类 (class)</MenuItem>
                  <MenuItem value='interface'>接口 (interface)</MenuItem>
                  <MenuItem value='type'>类型 (type)</MenuItem>
                  <MenuItem value='method'>方法 (method)</MenuItem>
                </Select>
              </FormControl>

              <TextField
                size='small'
                label='符号名称'
                value={genName}
                onChange={(e) => onGenNameChange(e.target.value)}
                placeholder='例如: handleClick'
                fullWidth
              />

              <TextField
                size='small'
                label='描述'
                value={genDesc}
                onChange={(e) => onGenDescChange(e.target.value)}
                placeholder='函数的功能描述'
                fullWidth
                multiline
                rows={2}
              />

              <Button
                variant='contained'
                startIcon={<Sparkles size={14} />}
                onClick={onGenerate}
                disabled={!genName.trim()}
                sx={{ bgcolor: 'secondary.500', '&:hover': { bgcolor: 'secondary.600' } }}
                size='small'
              >
                生成文档
              </Button>
            </Stack>
          </V51Card>

          <V51Card>
            <Typography
              variant='subtitle2'
              sx={{ fontWeight: 600, mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}
            >
              <Code size={16} />
              生成结果
            </Typography>
            {genResult ? (
              <Paper
                elevation={0}
                sx={{
                  p: 2,
                  bgcolor: 'text.primary',
                  borderRadius: 1,
                  maxHeight: 400,
                  overflow: 'auto',
                  '& pre': {
                    margin: 0,
                    whiteSpace: 'pre-wrap',
                    fontFamily: 'monospace',
                    fontSize: 12,
                    color: 'divider',
                  },
                }}
              >
                <pre>{genResult}</pre>
              </Paper>
            ) : (
              <Alert severity='info'>填写左侧表单并点击"生成文档"查看结果</Alert>
            )}

            {generatedDocs.length > 0 && (
              <>
                <Divider sx={{ my: 2 }} />
                <Typography
                  variant='subtitle2'
                  sx={{ fontWeight: 600, mb: 1, fontSize: 12 }}
                >
                  生成历史
                </Typography>
                <Box sx={{ maxHeight: 100, overflow: 'auto' }}>
                  {generatedDocs.map((doc, idx) => (
                    <Chip
                      key={idx}
                      label={`${doc.kind}: ${doc.name}`}
                      size='small'
                      sx={{ fontSize: 10, m: 0.5 }}
                    />
                  ))}
                </Box>
              </>
            )}
          </V51Card>
        </Box>
      )}

      {activeSubTab === 'changelog' && (
        <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 3 }}>
          <V51Card>
            <Typography
              variant='subtitle2'
              sx={{ fontWeight: 600, mb: 2 }}
            >
              Changelog 配置
            </Typography>
            <Stack
              direction='column'
              spacing={2}
            >
              <TextField
                size='small'
                label='版本号'
                value={changelogVersion}
                onChange={(e) => onChangelogVersionChange(e.target.value)}
                fullWidth
              />
              <Button
                variant='outlined'
                startIcon={<Plus size={14} />}
                onClick={onAddChangelogEntry}
                size='small'
              >
                添加变更条目
              </Button>
              <Typography
                variant='subtitle2'
                sx={{ fontWeight: 600, fontSize: 12 }}
              >
                条目列表 ({changelogEntries.length})
              </Typography>
              <Box sx={{ maxHeight: 200, overflow: 'auto' }}>
                {changelogEntries.length === 0 ? (
                  <Alert severity='info'>暂无变更条目，点击上方按钮添加</Alert>
                ) : (
                  changelogEntries.map((entry, idx) => (
                    <Paper
                      key={idx}
                      elevation={0}
                      sx={{
                        p: 1,
                        mb: 1,
                        border: '1px solid',
                        borderColor: 'divider',
                        borderRadius: 1,
                      }}
                    >
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Chip
                          label={entry.type}
                          size='small'
                          sx={{ fontSize: 10 }}
                        />
                        <Typography
                          variant='body2'
                          sx={{ flex: 1, fontSize: 12 }}
                        >
                          {entry.description}
                        </Typography>
                      </Box>
                    </Paper>
                  ))
                )}
              </Box>
              <Button
                variant='contained'
                startIcon={<ClipboardList size={14} />}
                onClick={onGenerateChangelog}
                sx={{ bgcolor: 'teal.600', '&:hover': { bgcolor: 'teal.700' } }}
                size='small'
              >
                生成 Changelog
              </Button>
            </Stack>
          </V51Card>

          <V51Card>
            <Typography
              variant='subtitle2'
              sx={{ fontWeight: 600, mb: 2 }}
            >
              Changelog 预览
            </Typography>
            {readmeResult ? (
              <Paper
                elevation={0}
                sx={{
                  p: 2,
                  bgcolor: 'background.default',
                  borderRadius: 1,
                  maxHeight: 400,
                  overflow: 'auto',
                  '& pre': {
                    margin: 0,
                    whiteSpace: 'pre-wrap',
                    fontFamily: 'monospace',
                    fontSize: 12,
                  },
                }}
              >
                <pre>{readmeResult}</pre>
              </Paper>
            ) : (
              <Alert severity='info'>点击"生成 Changelog"查看结果</Alert>
            )}
          </V51Card>
        </Box>
      )}

      {activeSubTab === 'readme' && (
        <V51Card>
          <Typography
            variant='subtitle2'
            sx={{ fontWeight: 600, mb: 2 }}
          >
            README 生成
          </Typography>
          <Stack
            direction='row'
            spacing={1}
            sx={{ mb: 2 }}
          >
            <Button
              variant='contained'
              startIcon={<BookOpen size={14} />}
              onClick={onGenerateReadme}
              sx={{ bgcolor: 'secondary.500', '&:hover': { bgcolor: 'secondary.600' } }}
              size='small'
            >
              生成 README 模板
            </Button>
          </Stack>
          {readmeResult ? (
            <Paper
              elevation={0}
              sx={{
                p: 3,
                bgcolor: 'common.white',
                borderRadius: 1,
                border: '1px solid',
                borderColor: 'divider',
                maxHeight: 500,
                overflow: 'auto',
                '& h1, & h2, & h3': { fontWeight: 700 },
                '& pre': { bgcolor: 'grey.100', p: 1, borderRadius: 1, overflow: 'auto' },
              }}
              dangerouslySetInnerHTML={{
                __html: sanitizeHtml(
                  readmeResult
                    .replace(/^# (.*$)/gm, '<h1>$1</h1>')
                    .replace(/^## (.*$)/gm, '<h2>$1</h2>')
                    .replace(/^### (.*$)/gm, '<h3>$1</h3>')
                    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
                    .replace(/`([^`]+)`/g, '<code>$1</code>')
                    .replace(/\n/g, '<br/>')
                ),
              }}
            />
          ) : (
            <Alert severity='info'>点击按钮生成 README 模板</Alert>
          )}
        </V51Card>
      )}
    </Box>
  );
};

const QATab: React.FC<{
  messages: ChatMessage[];
  input: string;
  onInputChange: (v: string) => void;
  onSend: () => void;
  onKeyDown: (e: React.KeyboardEvent) => void;
  isProcessing: boolean;
  qaHistory: QAEntry[];
  qaStats: { totalQA: number; totalDocs: number; totalTags: number };
  onClearHistory: () => void;
  showAddDoc: boolean;
  onShowAddDocChange: (v: boolean) => void;
  newDocTitle: string;
  onNewDocTitleChange: (v: string) => void;
  newDocContent: string;
  onNewDocContentChange: (v: string) => void;
  newDocTags: string;
  onNewDocTagsChange: (v: string) => void;
  onAddDocument: () => void;
  documents: KnowledgeDocument[];
}> = ({
  messages,
  input,
  onInputChange,
  onSend,
  onKeyDown,
  isProcessing,
  qaHistory,
  qaStats,
  onClearHistory,
  showAddDoc,
  onShowAddDocChange,
  newDocTitle,
  onNewDocTitleChange,
  newDocContent,
  onNewDocContentChange,
  newDocTags,
  onNewDocTagsChange,
  onAddDocument,
  documents,
}) => {
  const messagesEndRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const quickQuestions = [
    'React Hooks 怎么使用？',
    'TypeScript 条件类型是什么？',
    'MUI 有哪些常用组件？',
  ];

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <Stack
        direction='row'
        spacing={2}
        sx={{ p: 2, borderBottom: 1, borderColor: 'divider', bgcolor: 'common.white' }}
      >
        <Typography
          variant='subtitle2'
          sx={{ fontWeight: 600, display: 'flex', alignItems: 'center', gap: 1 }}
        >
          <Database size={16} />
          知识库问答
        </Typography>
        <Chip
          label={`${qaStats.totalQA} 问答`}
          size='small'
          sx={{ fontSize: 10 }}
        />
        <Chip
          label={`${qaStats.totalDocs} 文档`}
          size='small'
          sx={{ fontSize: 10, bgcolor: 'success.100', color: 'teal.900' }}
        />
        <Chip
          label={`${qaStats.totalTags} 标签`}
          size='small'
          sx={{ fontSize: 10, bgcolor: 'warning.100', color: 'warning.800' }}
        />
        <Box sx={{ flex: 1 }} />
        <Button
          size='small'
          startIcon={<Plus size={12} />}
          onClick={() => onShowAddDocChange(!showAddDoc)}
        >
          添加文档
        </Button>
        <Button
          size='small'
          startIcon={<Trash2 size={12} />}
          onClick={onClearHistory}
          color='error'
        >
          清空历史
        </Button>
      </Stack>

      {showAddDoc && (
        <Paper
          elevation={0}
          sx={{ p: 2, bgcolor: 'info.50', borderBottom: '1px solid', borderColor: 'divider' }}
        >
          <Typography
            variant='subtitle2'
            sx={{ fontWeight: 600, mb: 1, fontSize: 12 }}
          >
            添加知识文档
          </Typography>
          <Stack
            direction='column'
            spacing={1}
          >
            <TextField
              size='small'
              label='文档标题'
              value={newDocTitle}
              onChange={(e) => onNewDocTitleChange(e.target.value)}
              fullWidth
            />
            <TextField
              size='small'
              label='文档内容'
              value={newDocContent}
              onChange={(e) => onNewDocContentChange(e.target.value)}
              fullWidth
              multiline
              rows={3}
            />
            <TextField
              size='small'
              label='标签 (逗号分隔)'
              value={newDocTags}
              onChange={(e) => onNewDocTagsChange(e.target.value)}
              fullWidth
              placeholder='react, typescript, frontend'
            />
            <Stack
              direction='row'
              spacing={1}
            >
              <Button
                variant='contained'
                size='small'
                startIcon={<Plus size={12} />}
                onClick={onAddDocument}
                disabled={!newDocTitle.trim() || !newDocContent.trim()}
                sx={{ bgcolor: 'teal.600', '&:hover': { bgcolor: 'teal.700' } }}
              >
                添加
              </Button>
              <Button
                size='small'
                onClick={() => onShowAddDocChange(false)}
              >
                取消
              </Button>
            </Stack>
          </Stack>
        </Paper>
      )}

      <Box
        sx={{
          flex: 1,
          overflow: 'auto',
          p: 3,
          display: 'flex',
          flexDirection: 'column',
          gap: 2,
          bgcolor: 'background.default',
        }}
      >
        {messages.length === 0 && (
          <Box sx={{ textAlign: 'center', py: 4 }}>
            <Lightbulb
              size={40}
              style={{ color: 'secondary.500', marginBottom: 8 }}
            />
            <Typography
              variant='body2'
              color='text.secondary'
            >
              AI Copilot 知识库已就绪，向它提问吧！
            </Typography>
            <Stack
              direction='row'
              spacing={1}
              sx={{ justifyContent: 'center', mt: 2, flexWrap: 'wrap' }}
            >
              {quickQuestions.map((q) => (
                <Chip
                  key={q}
                  label={q}
                  size='small'
                  onClick={() => onInputChange(q)}
                  sx={{
                    cursor: 'pointer',
                    bgcolor: 'secondary.100',
                    color: 'purple.800',
                    fontSize: 11,
                    '&:hover': { bgcolor: 'secondary.200' },
                  }}
                />
              ))}
            </Stack>
          </Box>
        )}

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
                bgcolor: msg.role === 'user' ? '#8b5cf6' : 'white',
                color: msg.role === 'user' ? 'white' : 'inherit',
                border: msg.role === 'assistant' ? '1px solid #e2e8f0' : 'none',
              }}
            >
              <Typography
                variant='body2'
                sx={{ whiteSpace: 'pre-wrap', fontSize: 14 }}
              >
                {msg.content}
              </Typography>
            </Paper>
          </Box>
        ))}

        {isProcessing && (
          <Box sx={{ display: 'flex', justifyContent: 'flex-start' }}>
            <Paper
              elevation={1}
              sx={{ p: 2, borderRadius: 2, bgcolor: 'common.white', border: '1px solid #e2e8f0' }}
            >
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <CircularProgress size={14} />
                <Typography
                  variant='body2'
                  color='text.secondary'
                >
                  AI Copilot 思考中...
                </Typography>
              </Box>
            </Paper>
          </Box>
        )}

        <div ref={messagesEndRef} />
      </Box>

      <Box sx={{ borderTop: 1, borderColor: 'divider', p: 2, bgcolor: 'common.white' }}>
        <Stack
          direction='row'
          spacing={1}
        >
          <TextField
            fullWidth
            multiline
            maxRows={3}
            value={input}
            onChange={(e) => onInputChange(e.target.value)}
            onKeyDown={onKeyDown}
            placeholder='向 AI Copilot 提问，Enter 发送，Shift+Enter 换行...'
            variant='outlined'
            size='small'
            sx={{
              '& .MuiOutlinedInput-root': {
                borderRadius: 2,
                '&:focus-within': { borderColor: 'secondary.500' },
              },
            }}
          />
          <Button
            variant='contained'
            onClick={onSend}
            disabled={!input.trim() || isProcessing}
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

        {qaHistory.length > 0 && (
          <Box sx={{ mt: 1 }}>
            <Typography
              variant='caption'
              color='text.secondary'
              sx={{ fontSize: 11 }}
            >
              最近问答:
            </Typography>
            <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
              {qaHistory.slice(-5).map((qa) => (
                <Chip
                  key={qa.id}
                  label={qa.question.substring(0, 25) + (qa.question.length > 25 ? '...' : '')}
                  size='small'
                  sx={{ fontSize: 10, height: 18 }}
                  onClick={() => onInputChange(qa.question)}
                />
              ))}
            </Box>
          </Box>
        )}
      </Box>
    </Box>
  );
};

const ActivityTab: React.FC<{
  activity: Array<{ type: string; description: string; timestamp: number }>;
}> = ({ activity }) => {
  const getTypeColor = (type: string): string => {
    switch (type) {
      case 'search':
        return '#8b5cf6';
      case 'doc':
        return '#059669';
      case 'qa':
        return '#3b82f6';
      case 'index':
        return '#f59e0b';
      case 'changelog':
        return '#ec4899';
      case 'readme':
        return '#0d9488';
      default:
        return '#6b7280';
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'search':
        return <Search size={14} />;
      case 'doc':
        return <FileText size={14} />;
      case 'qa':
        return <MessageSquare size={14} />;
      case 'index':
        return <Database size={14} />;
      case 'changelog':
        return <ClipboardList size={14} />;
      case 'readme':
        return <BookOpen size={14} />;
      default:
        return <History size={14} />;
    }
  };

  return (
    <Box sx={{ p: 3 }}>
      <Typography
        variant='h6'
        sx={{ fontWeight: 600, mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}
      >
        <History size={20} />
        最近活动
      </Typography>

      <V51Card>
        {activity.length === 0 ? (
          <Alert severity='info'>暂无活动记录</Alert>
        ) : (
          <List>
            {activity.map((item, idx) => (
              <ListItem
                key={idx}
                sx={{
                  borderBottom: idx < activity.length - 1 ? '1px solid' : 'none',
                  borderColor: 'divider',
                }}
              >
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, width: '100%' }}>
                  <Box
                    sx={{
                      width: 32,
                      height: 32,
                      borderRadius: '50%',
                      bgcolor: `${getTypeColor(item.type)}20`,
                      color: getTypeColor(item.type),
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    {getTypeIcon(item.type)}
                  </Box>
                  <Box sx={{ flex: 1 }}>
                    <Typography
                      variant='body2'
                      sx={{ fontSize: 13 }}
                    >
                      {item.description}
                    </Typography>
                    <Typography
                      variant='caption'
                      color='text.secondary'
                      sx={{ fontSize: 11 }}
                    >
                      {new Date(item.timestamp).toLocaleString()}
                    </Typography>
                  </Box>
                  <Chip
                    label={item.type}
                    size='small'
                    sx={{
                      fontSize: 10,
                      height: 18,
                      bgcolor: `${getTypeColor(item.type)}20`,
                      color: getTypeColor(item.type),
                    }}
                  />
                </Box>
              </ListItem>
            ))}
          </List>
        )}
      </V51Card>

      <Grid
        container
        spacing={2}
        sx={{ mt: 2 }}
      >
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <V51Card>
            <Typography
              variant='caption'
              color='text.secondary'
            >
              搜索次数
            </Typography>
            <Typography
              variant='h5'
              sx={{ fontWeight: 700, color: 'secondary.500' }}
            >
              {activity.filter((a) => a.type === 'search').length}
            </Typography>
          </V51Card>
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <V51Card>
            <Typography
              variant='caption'
              color='text.secondary'
            >
              文档生成
            </Typography>
            <Typography
              variant='h5'
              sx={{ fontWeight: 700, color: 'teal.600' }}
            >
              {activity.filter((a) => a.type === 'doc').length}
            </Typography>
          </V51Card>
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <V51Card>
            <Typography
              variant='caption'
              color='text.secondary'
            >
              知识问答
            </Typography>
            <Typography
              variant='h5'
              sx={{ fontWeight: 700, color: 'primary.500' }}
            >
              {activity.filter((a) => a.type === 'qa').length}
            </Typography>
          </V51Card>
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <V51Card>
            <Typography
              variant='caption'
              color='text.secondary'
            >
              文档索引
            </Typography>
            <Typography
              variant='h5'
              sx={{ fontWeight: 700, color: 'warning.500' }}
            >
              {activity.filter((a) => a.type === 'index').length}
            </Typography>
          </V51Card>
        </Grid>
      </Grid>
    </Box>
  );
};

export { V55CopilotPanel };
