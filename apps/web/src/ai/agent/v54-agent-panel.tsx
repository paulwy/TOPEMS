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
  Divider,
  Stack,
  Badge,
  LinearProgress,
  Alert,
  Tooltip,
  Tabs,
  Tab,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Card,
} from '@mui/material';
import i18n from '@/i18n';
import {
  X as XIcon,
  Bot,
  Send,
  Play,
  Square,
  Clock,
  Workflow as WorkflowIcon,
  GitBranch,
  Brain,
  Database,
  Plus,
  Trash2,
  CheckCircle2,
  XCircle,
  Loader2,
  Terminal,
  MessageSquare,
  HardDrive,
  Activity,
  FileText,
  Zap,
  Copy,
  PlayCircle,
  PauseCircle,
} from 'lucide-react';
import {
  autonomousAgent,
  type Task,
  type TaskStep,
  type ExecutionContext,
  type AgentEvent,
} from './autonomous-agent';
import {
  workflowEngine,
  type Workflow as WorkflowType,
  type WorkflowStep,
  type WorkflowTemplate,
  type WorkflowEvent,
  type StepType,
} from './workflow-engine';
import {
  contextEngine,
  type ConversationContext,
  type MemoryEntry,
  type Entity,
  type Intent,
  type Sentiment,
} from './context-engine';
import { designTokens } from '@topems/tokens';

type TabId = 'conversation' | 'tasks' | 'workflow' | 'context' | 'memory';

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: number;
}

const SAMPLE_TASKS = [
  i18n.t('ai.v54-agent-panel.k0'),
  i18n.t('ai.v54-agent-panel.k1'),
  i18n.t('ai.v54-agent-panel.api_2'),
  i18n.t('ai.v54-agent-panel.k3'),
  i18n.t('ai.v54-agent-panel.k4'),
];

const STEP_TYPE_LABELS: Record<StepType, string> = {
  action: i18n.t('ai.v54-agent-panel.k5'),
  condition: i18n.t('ai.v54-agent-panel.k6'),
  loop: i18n.t('ai.v54-agent-panel.k7'),
  parallel: i18n.t('ai.v54-agent-panel.k8'),
};

const INTENT_LABELS: Record<Intent, string> = {
  query: i18n.t('ai.v54-agent-panel.k9'),
  command: i18n.t('ai.v54-agent-panel.k10'),
  exploration: i18n.t('ai.v54-agent-panel.k11'),
  confirmation: i18n.t('ai.v54-agent-panel.k12'),
  correction: i18n.t('ai.v54-agent-panel.k13'),
  social: i18n.t('ai.v54-agent-panel.k14'),
  unclear: i18n.t('ai.v54-agent-panel.k15'),
};

const SENTIMENT_COLORS: Record<Sentiment, string> = {
  positive: designTokens.colors.success.dark,
  negative: designTokens.colors.error.main,
  neutral: 'colors.grey.500',
};

const V54AgentPanel: React.FC<{ onClose: () => void }> = ({ onClose }) => {
  const [activeTab, setActiveTab] = React.useState<TabId>('conversation');
  const [agentEvents, setAgentEvents] = React.useState<AgentEvent[]>([]);
  const [workflowEvents, setWorkflowEvents] = React.useState<WorkflowEvent[]>([]);
  const [tasks, setTasks] = React.useState<Task[]>([]);
  const [workflows, setWorkflows] = React.useState<WorkflowType[]>([]);
  const [context, setContext] = React.useState<ConversationContext | null>(null);
  const [memories, setMemories] = React.useState<MemoryEntry[]>([]);
  const [sessionId] = React.useState(`session-${Date.now()}`);

  React.useEffect(() => {
    const unsubAgent = autonomousAgent.on((event) => {
      setAgentEvents((prev) => [...prev.slice(-49), event]);
      setTasks([...autonomousAgent.listTasks()]);
    });

    const unsubWf = workflowEngine.on((event) => {
      setWorkflowEvents((prev) => [...prev.slice(-49), event]);
      setWorkflows([...workflowEngine.listWorkflows()]);
    });

    return () => {
      unsubAgent();
      unsubWf();
    };
  }, []);

  const refreshData = () => {
    setTasks(autonomousAgent.listTasks());
    setWorkflows(workflowEngine.listWorkflows());
    setMemories(contextEngine.getMemory());
    const ctx = contextEngine.getContext(sessionId);
    if (ctx) setContext(ctx);
  };
  void refreshData;

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
          boxShadow: designTokens.darkShadows['3xl'],
          display: 'flex',
          flexDirection: 'column',
          border: '1px solid rgba(16, 185, 129, 0.2)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <V54PanelHeader onClose={onClose} />
        <Box sx={{ px: 2, py: 1.5, borderBottom: 1, borderColor: 'divider' }}>
          <Tabs
            value={activeTab}
            onChange={(_, v) => setActiveTab(v as TabId)}
            variant='scrollable'
            scrollButtons='auto'
          >
            <Tab
              icon={<MessageSquare size={16} />}
              iconPosition='start'
              label={i18n.t('ai.v54-agent-panel.agent_0')}
              value='conversation'
            />
            <Tab
              icon={<Clock size={16} />}
              iconPosition='start'
              label={`${i18n.t('ai.v54-agent-panel.k1')}${tasks.length})`}
              value='tasks'
            />
            <Tab
              icon={<WorkflowIcon size={16} />}
              iconPosition='start'
              label={`${i18n.t('ai.v54-agent-panel.k2')}${workflows.length})`}
              value='workflow'
            />
            <Tab
              icon={<Brain size={16} />}
              iconPosition='start'
              label={i18n.t('ai.v54-agent-panel.k16')}
              value='context'
            />
            <Tab
              icon={<Database size={16} />}
              iconPosition='start'
              label={`${i18n.t('ai.v54-agent-panel.k3')}${memories.length})`}
              value='memory'
            />
          </Tabs>
        </Box>
        <Box sx={{ flex: 1, overflow: 'auto', bgcolor: 'grey.50' }}>
          {activeTab === 'conversation' && (
            <ConversationTab
              sessionId={sessionId}
              onContextUpdate={(ctx) => setContext(ctx)}
              onTaskUpdate={() => setTasks([...autonomousAgent.listTasks()])}
            />
          )}
          {activeTab === 'tasks' && (
            <TasksTab
              tasks={tasks}
              events={agentEvents}
              onCancel={(id) => {
                autonomousAgent.cancelTask(id);
                setTasks([...autonomousAgent.listTasks()]);
              }}
              onClear={() => {
                autonomousAgent.clearTasks();
                setTasks([]);
                setAgentEvents([]);
              }}
            />
          )}
          {activeTab === 'workflow' && (
            <WorkflowTab
              workflows={workflows}
              templates={workflowEngine.listTemplates()}
              events={workflowEvents}
              onExecute={(id) => {
                workflowEngine.executeWorkflow(id);
              }}
              onPause={(id) => {
                workflowEngine.pauseWorkflow(id);
                setWorkflows([...workflowEngine.listWorkflows()]);
              }}
              onResume={(id) => {
                workflowEngine.resumeWorkflow(id);
              }}
              onCancel={(id) => {
                workflowEngine.cancelWorkflow(id);
                setWorkflows([...workflowEngine.listWorkflows()]);
              }}
              onDelete={(id) => {
                workflowEngine.deleteWorkflow(id);
                setWorkflows([...workflowEngine.listWorkflows()]);
              }}
              onCreateFromTemplate={(tplId) => {
                const wf = workflowEngine.createFromTemplate(tplId);
                setWorkflows([...workflowEngine.listWorkflows()]);
                return wf;
              }}
              onCreate={(name, steps) => {
                workflowEngine.createWorkflow(name, steps);
                setWorkflows([...workflowEngine.listWorkflows()]);
              }}
            />
          )}
          {activeTab === 'context' && context && (
            <ContextTab
              context={context}
              onSummarize={() => contextEngine.summarizeContext(sessionId)}
            />
          )}
          {activeTab === 'memory' && (
            <MemoryTab
              memories={memories}
              onStore={(type, content, importance) => {
                contextEngine.storeMemory(type, content, importance);
                setMemories([...contextEngine.getMemory()]);
              }}
              onClear={() => {
                contextEngine.clearMemories();
                setMemories([]);
              }}
              onRefresh={() => setMemories([...contextEngine.getMemory()])}
            />
          )}
        </Box>
      </Box>
    </Box>
  );
};

const V54PanelHeader: React.FC<{ onClose: () => void }> = ({ onClose }) => (
  <Box
    sx={{
      p: 2,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      background: `linear-gradient(135deg, ${designTokens.colors.success.dark} 0%, ${designTokens.colors.success.dark} 50%, ${designTokens.colors.teal['600']} 100%)`,
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
        <Bot size={22} />
      </Box>
      <Box>
        <Typography
          variant='h6'
          sx={{ fontWeight: 700, fontSize: 18 }}
        >
          {i18n.t('ai.v54-agent-panel.k4')}
        </Typography>
        <Typography
          variant='caption'
          sx={{ opacity: 0.85, fontSize: 12 }}
        >
          {i18n.t('ai.v54-agent-panel.k5')}
        </Typography>
      </Box>
    </Box>
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
      <Badge
        badgeContent='V54'
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

const ConversationTab: React.FC<{
  sessionId: string;
  onContextUpdate: (ctx: ConversationContext) => void;
  onTaskUpdate: () => void;
}> = ({ sessionId, onContextUpdate, onTaskUpdate }) => {
  const [messages, setMessages] = React.useState<ChatMessage[]>([
    {
      id: 'welcome',
      role: 'assistant',
      content: i18n.t('ai.v54-agent-panel.k6'),
      timestamp: Date.now(),
    },
  ]);
  const [input, setInput] = React.useState('');
  const [isProcessing, setIsProcessing] = React.useState(false);
  const messagesEndRef = React.useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  React.useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const generateResponse = (_userMessage: string): string => {
    const ctx = contextEngine.getContext(sessionId);
    const intent = ctx?.intent ?? 'unclear';
    const entities = ctx?.entities ?? [];

    const intentLabel = INTENT_LABELS[intent] ?? i18n.t('ai.v54-agent-panel.k17');
    const entitySummary = entities
      .slice(0, 3)
      .map((e) => `${e.value}(${e.type})`)
      .join(', ');

    return [
      i18n.t('ai.v54-agent-panel.k7'),
      ``,
      i18n.t('ai.v54-agent-panel.k8'),
      `${i18n.t('ai.v54-agent-panel.k9')} ${intentLabel}`,
      `${i18n.t('ai.v54-agent-panel.k10')} ${ctx?.sentiment ?? 'neutral'}`,
      `${i18n.t('ai.v54-agent-panel.k11')} ${entitySummary || i18n.t('ai.v54-agent-panel.k18')}`,
      ``,
      `${i18n.t('ai.v54-agent-panel.k12')} ${ctx?.summary ?? i18n.t('ai.v54-agent-panel.k19')}`,
      ``,
      i18n.t('ai.v54-agent-panel.k13'),
      i18n.t('ai.v54-agent-panel.k14'),
      i18n.t('ai.v54-agent-panel.k15'),
      i18n.t('ai.v54-agent-panel.k16'),
    ].join('\n');
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
    setIsProcessing(true);

    const ctx = contextEngine.processInput(sessionId, input, 'user');
    onContextUpdate(ctx);

    contextEngine.storeMemory('user_query', input, 0.8);

    const execContext: ExecutionContext = {
      user: { id: 'user-001', name: 'Demo User', role: 'admin' },
      session: { id: sessionId, startedAt: Date.now() },
      memory: new Map(),
      environment: { version: 'V54.0' },
      tools: autonomousAgent.getTools(),
    };

    const taskKeywords = [
      i18n.t('ai.v54-agent-panel.k28'),
      i18n.t('ai.v54-agent-panel.k27'),
      i18n.t('ai.v54-agent-panel.k26'),
      i18n.t('ai.v54-agent-panel.k25'),
      i18n.t('ai.v54-agent-panel.k24'),
      i18n.t('ai.v54-agent-panel.k23'),
      i18n.t('ai.v54-agent-panel.k22'),
    ];
    const shouldExecuteTask = taskKeywords.some((kw) => input.includes(kw));

    if (shouldExecuteTask) {
      const taskPromise = autonomousAgent.executeTask(input, execContext);
      taskPromise.then(() => onTaskUpdate());
    }

    await new Promise((resolve) => setTimeout(resolve, 600));

    const response: ChatMessage = {
      id: `agent-${Date.now()}`,
      role: 'assistant',
      content: generateResponse(input),
      timestamp: Date.now(),
    };

    setMessages((prev) => [...prev, response]);
    setIsProcessing(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <Box
        sx={{ flex: 1, overflow: 'auto', p: 3, display: 'flex', flexDirection: 'column', gap: 2 }}
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
                bgcolor:
                  msg.role === 'user'
                    ? designTokens.colors.success.dark
                    : 'var(--color-primary-foreground, #ffffff)',
                color: msg.role === 'user' ? 'var(--color-primary-foreground, #ffffff)' : 'inherit',
                border:
                  msg.role === 'assistant'
                    ? `1px solid ${designTokens.colors.grey['200']}`
                    : 'none',
              }}
            >
              <Typography
                variant='body2'
                sx={{
                  whiteSpace: 'pre-wrap',
                  fontSize: 14,
                }}
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
              sx={{
                p: 2,
                borderRadius: 2,
                bgcolor: 'common.white',
                border: `1px solid ${designTokens.colors.grey['200']}`,
              }}
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
                  {i18n.t('ai.v54-agent-panel.agent_17')}
                </Typography>
              </Box>
            </Paper>
          </Box>
        )}
        <div ref={messagesEndRef} />
      </Box>
      <Box
        sx={{
          borderTop: 1,
          borderColor: 'divider',
          p: 2,
          bgcolor: 'common.white',
        }}
      >
        <Box sx={{ mb: 1, display: 'flex', gap: 1, flexWrap: 'wrap' }}>
          {SAMPLE_TASKS.map((task) => (
            <Chip
              key={task}
              label={task}
              size='small'
              onClick={() => setInput(task)}
              sx={{
                cursor: 'pointer',
                bgcolor: 'success.100',
                color: 'teal.900',
                fontSize: 11,
                '&:hover': { bgcolor: 'success.200' },
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
            placeholder={i18n.t('ai.v54-agent-panel.k18')}
            variant='outlined'
            size='small'
            sx={{
              '& .MuiOutlinedInput-root': {
                borderRadius: 2,
                '&:focus-within': { borderColor: 'teal.500' },
              },
            }}
          />
          <Button
            variant='contained'
            onClick={handleSend}
            disabled={!input.trim() || isProcessing}
            sx={{
              bgcolor: 'teal.500',
              minWidth: 50,
              height: 40,
              '&:hover': { bgcolor: 'teal.600' },
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

const TasksTab: React.FC<{
  tasks: Task[];
  events: AgentEvent[];
  onCancel: (id: string) => void;
  onClear: () => void;
}> = ({ tasks, events, onCancel, onClear }) => {
  const [expandedTask, setExpandedTask] = React.useState<string | null>(null);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return designTokens.colors.success.dark;
      case 'running':
        return designTokens.colors.primary.main;
      case 'failed':
        return designTokens.colors.error.main;
      case 'pending':
        return 'colors.grey.500';
      default:
        return 'colors.grey.500';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return (
          <CheckCircle2
            size={16}
            style={{ color: 'teal.500' }}
          />
        );
      case 'running':
        return (
          <Loader2
            size={16}
            style={{ color: 'primary.500' }}
            className='animate-spin'
          />
        );
      case 'failed':
        return (
          <XCircle
            size={16}
            style={{ color: 'error.500' }}
          />
        );
      default:
        return (
          <Clock
            size={16}
            style={{ color: 'grey.500' }}
          />
        );
    }
  };

  return (
    <Box sx={{ p: 3 }}>
      <Stack
        direction='row'
        spacing={2}
        sx={{ mb: 3, justifyContent: 'space-between' }}
      >
        <Stack
          direction='row'
          spacing={2}
        >
          <Typography
            variant='h6'
            sx={{ fontWeight: 600, display: 'flex', alignItems: 'center', gap: 1 }}
          >
            <Terminal size={20} />
            {i18n.t('ai.v54-agent-panel.k19')}
          </Typography>
          <Chip
            label={`${tasks.length} ${i18n.t('ai.v54-agent-panel.k20')}`}
            size='small'
            sx={{ bgcolor: 'success.100', color: 'teal.900', fontWeight: 600 }}
          />
          <Chip
            label={`${i18n.t('ai.v54-agent-panel.k21')} ${tasks.filter((t) => t.status === 'running').length}`}
            size='small'
            sx={{ bgcolor: 'primary.100', color: 'primary.800' }}
          />
          <Chip
            label={`${i18n.t('ai.v54-agent-panel.k22')} ${tasks.filter((t) => t.status === 'completed').length}`}
            size='small'
            sx={{ bgcolor: 'success.100', color: 'teal.900' }}
          />
          <Chip
            label={`${i18n.t('ai.v54-agent-panel.k23')} ${tasks.filter((t) => t.status === 'failed').length}`}
            size='small'
            sx={{ bgcolor: 'error.50', color: 'error.800' }}
          />
        </Stack>
        <Button
          variant='outlined'
          startIcon={<Trash2 size={14} />}
          onClick={onClear}
          size='small'
        >
          {i18n.t('ai.v54-agent-panel.k24')}
        </Button>
      </Stack>

      <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 3 }}>
        <Card
          variant='outlined'
          sx={{ p: 2 }}
        >
          <Typography
            variant='subtitle2'
            sx={{ fontWeight: 600, mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}
          >
            <Activity size={16} />
            {i18n.t('ai.v54-agent-panel.k25')}
          </Typography>
          {tasks.length === 0 && <Alert severity='info'>{i18n.t('ai.v54-agent-panel.k29')}</Alert>}
          {tasks.length > 0 && (
            <List sx={{ maxHeight: 500, overflow: 'auto' }}>
              {tasks.map((task) => (
                <Paper
                  key={task.id}
                  elevation={0}
                  sx={{
                    mb: 1,
                    border: '1px solid',
                    borderColor:
                      expandedTask === task.id ? designTokens.colors.success.dark : 'divider',
                    borderRadius: 1,
                    bgcolor:
                      expandedTask === task.id
                        ? 'colors.success.50'
                        : 'var(--color-primary-foreground, #ffffff)',
                    transition: 'all 0.2s',
                  }}
                >
                  <ListItem
                    sx={{ py: 1.5, cursor: 'pointer' }}
                    onClick={() => setExpandedTask(expandedTask === task.id ? null : task.id)}
                  >
                    <Box sx={{ width: '100%' }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                        {getStatusIcon(task.status)}
                        <Typography
                          variant='body2'
                          sx={{ fontWeight: 600, flex: 1 }}
                        >
                          {task.description}
                        </Typography>
                        <Chip
                          label={task.status}
                          size='small'
                          sx={{
                            fontSize: 10,
                            height: 20,
                            bgcolor: `${getStatusColor(task.status)}20`,
                            color: getStatusColor(task.status),
                            fontWeight: 600,
                          }}
                        />
                      </Box>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <LinearProgress
                          variant='determinate'
                          value={
                            task.steps.length > 0
                              ? (task.steps.filter((s) => s.status === 'completed').length /
                                  task.steps.length) *
                                100
                              : 0
                          }
                          sx={{ height: 4, borderRadius: 2, flex: 1 }}
                        />
                        <Typography
                          variant='caption'
                          color='text.secondary'
                          sx={{ fontSize: 11 }}
                        >
                          {task.steps.filter((s) => s.status === 'completed').length}/
                          {task.steps.length}
                        </Typography>
                        {task.status === 'running' && (
                          <Button
                            size='small'
                            startIcon={<Square size={12} />}
                            onClick={(e) => {
                              e.stopPropagation();
                              onCancel(task.id);
                            }}
                            sx={{ minWidth: 'auto', px: 1, py: 0.5, fontSize: 11 }}
                          >
                            {i18n.t('ai.v54-agent-panel.k26')}
                          </Button>
                        )}
                      </Box>
                    </Box>
                  </ListItem>
                  {expandedTask === task.id && (
                    <Box sx={{ px: 2, pb: 2 }}>
                      <Divider sx={{ mb: 1 }} />
                      <Typography
                        variant='caption'
                        color='text.secondary'
                        sx={{ display: 'block', mb: 1 }}
                      >
                        {i18n.t('ai:v54-agent-panel.k6', {
                          v0: task.id,
                          v1: new Date(task.createdAt).toLocaleTimeString(),
                        })}
                      </Typography>
                      <Typography
                        variant='subtitle2'
                        sx={{ fontWeight: 600, mb: 1, fontSize: 12 }}
                      >
                        [i18n.t('ai.v54-agent-panel.k27')]:
                      </Typography>
                      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                        {task.steps.map((step, idx) => (
                          <StepItem
                            key={step.id}
                            step={step}
                            index={idx}
                          />
                        ))}
                      </Box>
                    </Box>
                  )}
                </Paper>
              ))}
            </List>
          )}
        </Card>

        <Card
          variant='outlined'
          sx={{ p: 2 }}
        >
          <Typography
            variant='subtitle2'
            sx={{ fontWeight: 600, mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}
          >
            <FileText size={16} />
            {i18n.t('ai.v54-agent-panel.agent_28')}
          </Typography>
          <EventLog events={events} />
        </Card>
      </Box>
    </Box>
  );
};

const StepItem: React.FC<{ step: TaskStep; index: number }> = ({ step, index }) => {
  const getIcon = () => {
    switch (step.status) {
      case 'completed':
        return (
          <CheckCircle2
            size={14}
            style={{ color: 'teal.500' }}
          />
        );
      case 'running':
        return (
          <Loader2
            size={14}
            style={{ color: 'primary.500' }}
            className='animate-spin'
          />
        );
      case 'failed':
        return (
          <XCircle
            size={14}
            style={{ color: 'error.500' }}
          />
        );
      default:
        return (
          <Clock
            size={14}
            style={{ color: 'grey.400' }}
          />
        );
    }
  };

  return (
    <Paper
      elevation={0}
      sx={{
        p: 1,
        bgcolor:
          step.status === 'completed'
            ? 'colors.success.50'
            : step.status === 'failed'
              ? 'colors.error.50'
              : 'var(--color-grey-50, var(--color-grey-50, #f9fafb))',
        borderRadius: 1,
        border: '1px solid',
        borderColor:
          step.status === 'completed'
            ? 'var(--color-success-200, #bbf7d0)'
            : step.status === 'failed'
              ? designTokens.colors.error['200']
              : designTokens.colors.grey['200'],
      }}
    >
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        <Typography
          variant='caption'
          sx={{ fontWeight: 600, minWidth: 24 }}
        >
          {index + 1}.
        </Typography>
        {getIcon()}
        <Typography
          variant='body2'
          sx={{ flex: 1, fontSize: 13 }}
        >
          {step.description}
        </Typography>
        {step.error && (
          <Typography
            variant='caption'
            sx={{ color: 'error.800', fontSize: 10 }}
          >
            {step.error}
          </Typography>
        )}
      </Box>
    </Paper>
  );
};

const EventLog: React.FC<{ events: AgentEvent[] }> = ({ events }) => (
  <Box sx={{ maxHeight: 500, overflow: 'auto' }}>
    {events.length === 0 && <Alert severity='info'>{i18n.t('ai.v54-agent-panel.k30')}</Alert>}
    {events.length > 0 && (
      <TableContainer>
        <Table size='small'>
          <TableHead>
            <TableRow>
              <TableCell sx={{ fontWeight: 600, fontSize: 12 }}>
                {i18n.t('ai.v54-agent-panel.k31')}
              </TableCell>
              <TableCell sx={{ fontWeight: 600, fontSize: 12 }}>
                {i18n.t('ai.v54-agent-panel.k32')}
              </TableCell>
              <TableCell sx={{ fontWeight: 600, fontSize: 12 }}>
                {i18n.t('ai.v54-agent-panel.k33')}
              </TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {events.map((event, idx) => (
              <TableRow key={`${event.timestamp}-${idx}`}>
                <TableCell sx={{ fontSize: 11, color: 'text.secondary', whiteSpace: 'nowrap' }}>
                  {new Date(event.timestamp).toLocaleTimeString()}
                </TableCell>
                <TableCell>
                  <Chip
                    label={event.type.replace(/_/g, ' ')}
                    size='small'
                    sx={{
                      fontSize: 10,
                      height: 18,
                      bgcolor: event.type.includes('completed')
                        ? 'colors.success.100'
                        : event.type.includes('failed')
                          ? 'colors.error.50'
                          : event.type.includes('started')
                            ? 'colors.primary.100'
                            : 'colors.grey.100',
                      color: event.type.includes('completed')
                        ? 'colors.success.dark'
                        : event.type.includes('failed')
                          ? 'colors.error.800'
                          : event.type.includes('started')
                            ? designTokens.colors.primary['800']
                            : 'colors.grey.700',
                    }}
                  />
                </TableCell>
                <TableCell sx={{ fontSize: 12 }}>{event.message}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    )}
  </Box>
);

const WorkflowTab: React.FC<{
  workflows: WorkflowType[];
  templates: WorkflowTemplate[];
  events: WorkflowEvent[];
  onExecute: (id: string) => void;
  onPause: (id: string) => void;
  onResume: (id: string) => void;
  onCancel: (id: string) => void;
  onDelete: (id: string) => void;
  onCreateFromTemplate: (tplId: string) => WorkflowType;
  onCreate: (name: string, steps: Omit<WorkflowStep, 'status' | 'result' | 'error'>[]) => void;
}> = ({
  workflows,
  templates,
  events,
  onExecute,
  onPause,
  onResume,
  onCancel,
  onDelete,
  onCreateFromTemplate,
  onCreate,
}) => {
  const [selectedWorkflow, setSelectedWorkflow] = React.useState<WorkflowType | null>(null);
  const [showCreateDialog, setShowCreateDialog] = React.useState(false);
  const [newWfName, setNewWfName] = React.useState('');
  const [selectedTemplate, setSelectedTemplate] = React.useState<string>('');

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return designTokens.colors.success.dark;
      case 'running':
        return designTokens.colors.primary.main;
      case 'failed':
        return designTokens.colors.error.main;
      case 'paused':
        return designTokens.colors.warning.main;
      case 'cancelled':
        return 'colors.grey.500';
      default:
        return 'colors.grey.500';
    }
  };

  const handleCreateFromTemplate = () => {
    if (!selectedTemplate) return;
    const wf = onCreateFromTemplate(selectedTemplate);
    setSelectedWorkflow(wf);
    setShowCreateDialog(false);
    setSelectedTemplate('');
  };

  const handleCreateCustom = () => {
    if (!newWfName.trim()) return;
    onCreate(newWfName, [
      {
        id: `s1-${Date.now()}`,
        type: 'action',
        config: { description: i18n.t('ai.v54-agent-panel.k34'), action: 'start' },
      },
      {
        id: `s2-${Date.now()}`,
        type: 'action',
        config: { description: i18n.t('ai.v54-agent-panel.k35'), action: 'process' },
        depends_on: [`s1-${Date.now()}`],
      } as WorkflowStep,
      {
        id: `s3-${Date.now()}`,
        type: 'action',
        config: { description: i18n.t('ai.v54-agent-panel.k36'), action: 'complete' },
        depends_on: [`s2-${Date.now()}`],
      } as WorkflowStep,
    ]);
    setShowCreateDialog(false);
    setNewWfName('');
  };

  return (
    <Box sx={{ p: 3 }}>
      <Stack
        direction='row'
        spacing={2}
        sx={{ mb: 3, justifyContent: 'space-between' }}
      >
        <Typography
          variant='h6'
          sx={{ fontWeight: 600, display: 'flex', alignItems: 'center', gap: 1 }}
        >
          <GitBranch size={20} />
          {i18n.t('ai.v54-agent-panel.k29')}
        </Typography>
        <Stack
          direction='row'
          spacing={1}
        >
          <Button
            variant='contained'
            startIcon={<Plus size={14} />}
            onClick={() => setShowCreateDialog(true)}
            sx={{ bgcolor: 'teal.600', '&:hover': { bgcolor: 'teal.700' } }}
            size='small'
          >
            {i18n.t('ai.v54-agent-panel.k30')}
          </Button>
        </Stack>
      </Stack>

      <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 3 }}>
        <Card
          variant='outlined'
          sx={{ p: 2 }}
        >
          <Typography
            variant='subtitle2'
            sx={{ fontWeight: 600, mb: 2 }}
          >
            {i18n.t('ai:v54-agent-panel.v0_5', { v0: workflows.length })}
          </Typography>
          {workflows.length === 0 && (
            <Alert severity='info'>
              {i18n.t('ai:v54-agent-panel.v0v1_4', {
                v0: i18n.t('ai.v54-agent-panel.k37'),
                v1: i18n.t('ai.v54-agent-panel.k34'),
              })}
            </Alert>
          )}
          {workflows.length > 0 && (
            <List sx={{ maxHeight: 450, overflow: 'auto' }}>
              {workflows.map((wf) => (
                <Paper
                  key={wf.id}
                  elevation={0}
                  sx={{
                    mb: 1,
                    border: '1px solid',
                    borderColor:
                      selectedWorkflow?.id === wf.id ? designTokens.colors.success.dark : 'divider',
                    borderRadius: 1,
                    bgcolor:
                      selectedWorkflow?.id === wf.id
                        ? 'colors.success.50'
                        : 'var(--color-primary-foreground, #ffffff)',
                    cursor: 'pointer',
                  }}
                  onClick={() => setSelectedWorkflow(wf)}
                >
                  <ListItem sx={{ py: 1.5 }}>
                    <Box sx={{ width: '100%' }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                        <Typography
                          variant='body2'
                          sx={{ fontWeight: 600, flex: 1 }}
                        >
                          {wf.name}
                        </Typography>
                        <Chip
                          label={wf.status}
                          size='small'
                          sx={{
                            fontSize: 10,
                            height: 20,
                            bgcolor: `${getStatusColor(wf.status)}20`,
                            color: getStatusColor(wf.status),
                            fontWeight: 600,
                          }}
                        />
                      </Box>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <LinearProgress
                          variant='determinate'
                          value={wf.totalSteps > 0 ? (wf.completedSteps / wf.totalSteps) * 100 : 0}
                          sx={{ height: 4, borderRadius: 2, flex: 1 }}
                        />
                        <Typography
                          variant='caption'
                          sx={{ fontSize: 11 }}
                        >
                          {wf.completedSteps}/{wf.totalSteps}
                        </Typography>
                      </Box>
                    </Box>
                  </ListItem>
                </Paper>
              ))}
            </List>
          )}
        </Card>

        <Card
          variant='outlined'
          sx={{ p: 2 }}
        >
          <Typography
            variant='subtitle2'
            sx={{ fontWeight: 600, mb: 2 }}
          >
            {i18n.t('ai.v54-agent-panel.k33')}
          </Typography>
          {selectedWorkflow ? (
            <WorkflowDetail
              workflow={selectedWorkflow}
              onExecute={() => onExecute(selectedWorkflow.id)}
              onPause={() => onPause(selectedWorkflow.id)}
              onResume={() => onResume(selectedWorkflow.id)}
              onCancel={() => {
                onCancel(selectedWorkflow.id);
                setSelectedWorkflow(null);
              }}
              onDelete={() => {
                onDelete(selectedWorkflow.id);
                setSelectedWorkflow(null);
              }}
            />
          ) : (
            <Alert severity='info'>{i18n.t('ai.v54-agent-panel.k38')}</Alert>
          )}
        </Card>
      </Box>

      <Card
        variant='outlined'
        sx={{ p: 2, mt: 3 }}
      >
        <Typography
          variant='subtitle2'
          sx={{ fontWeight: 600, mb: 2 }}
        >
          {i18n.t('ai.v54-agent-panel.k34')}
        </Typography>
        <EventLog events={events as unknown as AgentEvent[]} />
      </Card>

      <Dialog
        open={showCreateDialog}
        onClose={() => setShowCreateDialog(false)}
        maxWidth='sm'
        fullWidth
      >
        <DialogTitle>{i18n.t('ai.v54-agent-panel.k39')}</DialogTitle>
        <DialogContent>
          <Box sx={{ mt: 2, display: 'flex', flexDirection: 'column', gap: 2 }}>
            <TextField
              label={i18n.t('ai.v54-agent-panel.k40')}
              value={newWfName}
              onChange={(e) => setNewWfName(e.target.value)}
              fullWidth
              size='small'
            />
            <FormControl size='small'>
              <InputLabel>{i18n.t('ai.v54-agent-panel.k41')}</InputLabel>
              <Select
                value={selectedTemplate}
                label={i18n.t('ai.v54-agent-panel.k42')}
                onChange={(e) => setSelectedTemplate(e.target.value)}
              >
                <MenuItem value=''>{i18n.t('ai:v54-agent-panel.k3')}</MenuItem>
                {templates.map((tpl) => (
                  <MenuItem
                    key={tpl.id}
                    value={tpl.id}
                  >
                    {tpl.name}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            {selectedTemplate && (
              <Alert severity='info'>
                {templates.find((t) => t.id === selectedTemplate)?.description}
              </Alert>
            )}
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowCreateDialog(false)}>
            {i18n.t('ai.v54-agent-panel.k43')}
          </Button>
          {selectedTemplate ? (
            <Button
              onClick={handleCreateFromTemplate}
              variant='contained'
              sx={{ bgcolor: 'teal.600' }}
            >
              {i18n.t('ai.v54-agent-panel.k35')}
            </Button>
          ) : (
            <Button
              onClick={handleCreateCustom}
              variant='contained'
              sx={{ bgcolor: 'teal.600' }}
              disabled={!newWfName.trim()}
            >
              {i18n.t('ai.v54-agent-panel.k36')}
            </Button>
          )}
        </DialogActions>
      </Dialog>
    </Box>
  );
};

const WorkflowDetail: React.FC<{
  workflow: WorkflowType;
  onExecute: () => void;
  onPause: () => void;
  onResume: () => void;
  onCancel: () => void;
  onDelete: () => void;
}> = ({ workflow, onExecute, onPause, onResume, onCancel, onDelete }) => {
  const getStepStatusColor = (status?: string) => {
    switch (status) {
      case 'completed':
        return designTokens.colors.success.dark;
      case 'running':
        return designTokens.colors.primary.main;
      case 'failed':
        return designTokens.colors.error.main;
      case 'skipped':
        return `${designTokens.colors.grey['400']}`;
      default:
        return 'colors.grey.500';
    }
  };

  return (
    <Box>
      <Stack
        direction='row'
        spacing={1}
        sx={{ mb: 2, flexWrap: 'wrap' }}
      >
        {workflow.status === 'draft' && (
          <Button
            size='small'
            variant='contained'
            startIcon={<Play size={12} />}
            onClick={onExecute}
            sx={{ bgcolor: 'teal.500' }}
          >
            {i18n.t('ai.v54-agent-panel.k37')}
          </Button>
        )}
        {workflow.status === 'running' && (
          <Button
            size='small'
            variant='contained'
            startIcon={<PauseCircle size={12} />}
            onClick={onPause}
            sx={{ bgcolor: 'warning.500' }}
          >
            {i18n.t('ai.v54-agent-panel.k38')}
          </Button>
        )}
        {workflow.status === 'paused' && (
          <Button
            size='small'
            variant='contained'
            startIcon={<PlayCircle size={12} />}
            onClick={onResume}
            sx={{ bgcolor: 'primary.500' }}
          >
            {i18n.t('ai.v54-agent-panel.k39')}
          </Button>
        )}
        {(workflow.status === 'running' || workflow.status === 'paused') && (
          <Button
            size='small'
            variant='outlined'
            color='error'
            onClick={onCancel}
          >
            {i18n.t('ai.v54-agent-panel.k40')}
          </Button>
        )}
        <Button
          size='small'
          variant='outlined'
          color='error'
          startIcon={<Trash2 size={12} />}
          onClick={onDelete}
        >
          {i18n.t('ai.v54-agent-panel.k41')}
        </Button>
      </Stack>

      <Box sx={{ mb: 2 }}>
        <Typography
          variant='caption'
          color='text.secondary'
          sx={{ display: 'block', mb: 0.5 }}
        >
          {i18n.t('ai:v54-agent-panel.idv0_2', { v0: workflow.id })}
        </Typography>
        <Typography
          variant='caption'
          color='text.secondary'
        >
          [i18n.t('ai.v54-agent-panel.k42')]: {workflow.completedSteps}/{workflow.totalSteps}{' '}
          {i18n.t('ai.v54-agent-panel.k43')}
        </Typography>
      </Box>

      <Typography
        variant='subtitle2'
        sx={{ fontWeight: 600, mb: 1, fontSize: 13 }}
      >
        [i18n.t('ai.v54-agent-panel.k44')]:
      </Typography>
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
        {workflow.steps.map((step, idx) => (
          <Paper
            key={step.id}
            elevation={0}
            sx={{ p: 1.5, border: '1px solid', borderColor: 'divider', borderRadius: 1 }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Typography
                variant='caption'
                sx={{ fontWeight: 600, minWidth: 24 }}
              >
                {idx + 1}.
              </Typography>
              <Chip
                label={STEP_TYPE_LABELS[step.type]}
                size='small'
                sx={{ fontSize: 10, height: 18 }}
              />
              <Typography
                variant='body2'
                sx={{ flex: 1, fontSize: 13 }}
              >
                {(step.config.description as string | undefined) ?? step.id}
              </Typography>
              {step.status && (
                <Chip
                  label={step.status}
                  size='small'
                  sx={{
                    fontSize: 10,
                    height: 18,
                    bgcolor: `${getStepStatusColor(step.status)}20`,
                    color: getStepStatusColor(step.status),
                  }}
                />
              )}
            </Box>
            {step.error && (
              <Typography
                variant='caption'
                sx={{ color: 'error.800', mt: 0.5, display: 'block' }}
              >
                [i18n.t('ai.v54-agent-panel.k45')]: {step.error}
              </Typography>
            )}
          </Paper>
        ))}
      </Box>
    </Box>
  );
};

const ContextTab: React.FC<{
  context: ConversationContext;
  onSummarize: () => void;
}> = ({ context, onSummarize }) => {
  const intentColor = (() => {
    const colors: Record<Intent, string> = {
      query: designTokens.colors.primary.main,
      command: designTokens.colors.success.dark,
      exploration: designTokens.colors.secondary.main,
      confirmation: designTokens.colors.warning.main,
      correction: designTokens.colors.error.main,
      social: designTokens.colors.pink.main,
      unclear: 'colors.grey.500',
    };
    return colors[context.intent] ?? 'colors.grey.500';
  })();

  return (
    <Box sx={{ p: 3 }}>
      <Stack
        direction='row'
        spacing={2}
        sx={{ mb: 3, justifyContent: 'space-between' }}
      >
        <Typography
          variant='h6'
          sx={{ fontWeight: 600, display: 'flex', alignItems: 'center', gap: 1 }}
        >
          <Brain size={20} />
          {i18n.t('ai.v54-agent-panel.k46')}
        </Typography>
        <Button
          variant='outlined'
          startIcon={<FileText size={14} />}
          onClick={onSummarize}
          size='small'
        >
          {i18n.t('ai.v54-agent-panel.k47')}
        </Button>
      </Stack>

      <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 3 }}>
        <Card
          variant='outlined'
          sx={{ p: 2 }}
        >
          <Typography
            variant='subtitle2'
            sx={{ fontWeight: 600, mb: 2 }}
          >
            {i18n.t('ai.v54-agent-panel.k48')}
          </Typography>
          <Stack
            direction='column'
            spacing={1.5}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <Typography
                variant='body2'
                color='text.secondary'
                sx={{ minWidth: 80 }}
              >
                [i18n.t('ai.v54-agent-panel.k49')]:
              </Typography>
              <Chip
                label={INTENT_LABELS[context.intent]}
                size='small'
                sx={{ bgcolor: `${intentColor}20`, color: intentColor, fontWeight: 600 }}
              />
            </Box>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <Typography
                variant='body2'
                color='text.secondary'
                sx={{ minWidth: 80 }}
              >
                [i18n.t('ai.v54-agent-panel.k50')]:
              </Typography>
              <Chip
                label={context.sentiment}
                size='small'
                sx={{
                  bgcolor: `${SENTIMENT_COLORS[context.sentiment]}20`,
                  color: SENTIMENT_COLORS[context.sentiment],
                  fontWeight: 600,
                }}
              />
            </Box>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <Typography
                variant='body2'
                color='text.secondary'
                sx={{ minWidth: 80 }}
              >
                [i18n.t('ai.v54-agent-panel.k51')]:
              </Typography>
              <Typography
                variant='body2'
                sx={{ fontWeight: 600 }}
              >
                {context.messages.length}
              </Typography>
            </Box>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <Typography
                variant='body2'
                color='text.secondary'
                sx={{ minWidth: 80 }}
              >
                [i18n.t('ai.v54-agent-panel.k52')]:
              </Typography>
              <Typography
                variant='body2'
                sx={{ fontWeight: 600 }}
              >
                {context.entities.length}
              </Typography>
            </Box>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <Typography
                variant='body2'
                color='text.secondary'
                sx={{ minWidth: 80 }}
              >
                [i18n.t('ai.v54-agent-panel.k53')]:
              </Typography>
              <Stack
                direction='row'
                spacing={0.5}
                sx={{ flexWrap: 'wrap', gap: 0.5 }}
              >
                {context.topics.map((topic) => (
                  <Chip
                    key={topic}
                    label={topic}
                    size='small'
                    sx={{ fontSize: 10 }}
                  />
                ))}
              </Stack>
            </Box>
          </Stack>
        </Card>

        <Card
          variant='outlined'
          sx={{ p: 2 }}
        >
          <Typography
            variant='subtitle2'
            sx={{ fontWeight: 600, mb: 2 }}
          >
            {i18n.t('ai:v54-agent-panel.v0_1', { v0: context.entities.length })}
          </Typography>
          {context.entities.length === 0 ? (
            <Alert severity='info'>{i18n.t('ai.v54-agent-panel.k44')}</Alert>
          ) : (
            <List sx={{ maxHeight: 300, overflow: 'auto' }}>
              {context.entities.map((entity, idx) => (
                <EntityItem
                  key={`${entity.name}-${idx}`}
                  entity={entity}
                />
              ))}
            </List>
          )}
        </Card>
      </Box>

      <Card
        variant='outlined'
        sx={{ p: 2, mt: 3 }}
      >
        <Typography
          variant='subtitle2'
          sx={{ fontWeight: 600, mb: 2 }}
        >
          {i18n.t('ai.v54-agent-panel.k54')}
        </Typography>
        <Box sx={{ maxHeight: 300, overflow: 'auto' }}>
          {context.messages.length === 0 ? (
            <Alert severity='info'>{i18n.t('ai.v54-agent-panel.k45')}</Alert>
          ) : (
            <TableContainer>
              <Table size='small'>
                <TableHead>
                  <TableRow>
                    <TableCell sx={{ fontWeight: 600, fontSize: 12 }}>
                      {i18n.t('ai.v54-agent-panel.k46')}
                    </TableCell>
                    <TableCell sx={{ fontWeight: 600, fontSize: 12 }}>
                      {i18n.t('ai.v54-agent-panel.k47')}
                    </TableCell>
                    <TableCell sx={{ fontWeight: 600, fontSize: 12 }}>
                      {i18n.t('ai.v54-agent-panel.k48')}
                    </TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {context.messages.map((msg) => (
                    <TableRow key={msg.id}>
                      <TableCell
                        sx={{ fontSize: 11, color: 'text.secondary', whiteSpace: 'nowrap' }}
                      >
                        {new Date(msg.timestamp).toLocaleTimeString()}
                      </TableCell>
                      <TableCell>
                        <Chip
                          label={msg.role}
                          size='small'
                          sx={{
                            fontSize: 10,
                            height: 18,
                            bgcolor:
                              msg.role === 'user'
                                ? 'colors.primary.100'
                                : msg.role === 'assistant'
                                  ? 'colors.success.100'
                                  : 'colors.grey.100',
                          }}
                        />
                      </TableCell>
                      <TableCell
                        sx={{
                          fontSize: 12,
                          maxWidth: 400,
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {msg.content}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </Box>
      </Card>

      {context.summary && (
        <Card
          variant='outlined'
          sx={{ p: 2, mt: 3 }}
        >
          <Typography
            variant='subtitle2'
            sx={{ fontWeight: 600, mb: 1, display: 'flex', alignItems: 'center', gap: 1 }}
          >
            <FileText size={14} />
            {i18n.t('ai.v54-agent-panel.k55')}
          </Typography>
          <Paper
            elevation={0}
            sx={{ p: 2, bgcolor: 'success.50', borderRadius: 1 }}
          >
            <Typography
              variant='body2'
              sx={{ fontSize: 13 }}
            >
              {context.summary}
            </Typography>
          </Paper>
        </Card>
      )}
    </Box>
  );
};

const EntityItem: React.FC<{ entity: Entity }> = ({ entity }) => {
  const typeColors: Record<string, string> = {
    person: designTokens.colors.primary.main,
    organization: designTokens.colors.secondary.main,
    location: designTokens.colors.success.dark,
    date: designTokens.colors.warning.main,
    number: designTokens.colors.error.main,
    product: designTokens.colors.pink.main,
    action: `${designTokens.colors.cyan['500']}`,
  };

  return (
    <Paper
      elevation={0}
      sx={{ mb: 0.5, p: 1, border: '1px solid', borderColor: 'divider', borderRadius: 1 }}
    >
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        <Chip
          label={entity.type}
          size='small'
          sx={{
            fontSize: 10,
            height: 18,
            bgcolor: `${typeColors[entity.type] ?? 'colors.grey.500'}20`,
            color: typeColors[entity.type] ?? 'colors.grey.500',
          }}
        />
        <Typography
          variant='body2'
          sx={{ flex: 1, fontSize: 13 }}
        >
          {entity.value}
        </Typography>
        <Typography
          variant='caption'
          color='text.secondary'
          sx={{ fontSize: 10 }}
        >
          {(entity.confidence * 100).toFixed(0)}%
        </Typography>
      </Box>
    </Paper>
  );
};

const MemoryTab: React.FC<{
  memories: MemoryEntry[];
  onStore: (
    type: 'user_query' | 'action_result' | 'system_event',
    content: string,
    importance?: number
  ) => void;
  onClear: () => void;
  onRefresh: () => void;
}> = ({ memories, onStore, onClear, onRefresh }) => {
  const [newType, setNewType] = React.useState<'user_query' | 'action_result' | 'system_event'>(
    'user_query'
  );
  const [newContent, setNewContent] = React.useState('');
  const [query, setQuery] = React.useState('');

  const filteredMemories = query
    ? memories.filter(
        (m) =>
          m.content.toLowerCase().includes(query.toLowerCase()) ||
          m.type.toLowerCase().includes(query.toLowerCase())
      )
    : memories;

  const handleStore = () => {
    if (!newContent.trim()) return;
    onStore(newType, newContent, 0.5);
    setNewContent('');
  };

  const stats = contextEngine.getMemoryStats();

  return (
    <Box sx={{ p: 3 }}>
      <Stack
        direction='row'
        spacing={2}
        sx={{ mb: 3, justifyContent: 'space-between' }}
      >
        <Typography
          variant='h6'
          sx={{ fontWeight: 600, display: 'flex', alignItems: 'center', gap: 1 }}
        >
          <HardDrive size={20} />
          {i18n.t('ai.v54-agent-panel.k56')}
        </Typography>
        <Stack
          direction='row'
          spacing={1}
        >
          <Button
            variant='outlined'
            startIcon={<RefreshCw size={14} />}
            onClick={onRefresh}
            size='small'
          >
            {i18n.t('ai.v54-agent-panel.k57')}
          </Button>
          <Button
            variant='outlined'
            color='error'
            startIcon={<Trash2 size={14} />}
            onClick={onClear}
            size='small'
          >
            {i18n.t('ai.v54-agent-panel.k58')}
          </Button>
        </Stack>
      </Stack>

      <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 3 }}>
        <Card
          variant='outlined'
          sx={{ p: 2 }}
        >
          <Typography
            variant='subtitle2'
            sx={{ fontWeight: 600, mb: 2 }}
          >
            {i18n.t('ai.v54-agent-panel.k59')}
          </Typography>
          <Stack
            direction='column'
            spacing={2}
          >
            <FormControl size='small'>
              <InputLabel>{i18n.t('ai.v54-agent-panel.k49')}</InputLabel>
              <Select
                value={newType}
                label={i18n.t('ai.v54-agent-panel.k50')}
                onChange={(e) =>
                  setNewType(e.target.value as 'user_query' | 'action_result' | 'system_event')
                }
              >
                <MenuItem value='user_query'>{i18n.t('ai.v54-agent-panel.k51')}</MenuItem>
                <MenuItem value='action_result'>{i18n.t('ai.v54-agent-panel.k52')}</MenuItem>
                <MenuItem value='system_event'>{i18n.t('ai.v54-agent-panel.k53')}</MenuItem>
              </Select>
            </FormControl>
            <TextField
              label={i18n.t('ai.v54-agent-panel.k54')}
              value={newContent}
              onChange={(e) => setNewContent(e.target.value)}
              fullWidth
              size='small'
              multiline
              rows={3}
              placeholder={i18n.t('ai.v54-agent-panel.k60')}
            />
            <Button
              variant='contained'
              startIcon={<Database size={14} />}
              onClick={handleStore}
              disabled={!newContent.trim()}
              sx={{ bgcolor: 'teal.500', '&:hover': { bgcolor: 'teal.600' } }}
              size='small'
            >
              {i18n.t('ai.v54-agent-panel.k61')}
            </Button>
          </Stack>

          <Divider sx={{ my: 2 }} />

          <Typography
            variant='subtitle2'
            sx={{ fontWeight: 600, mb: 1 }}
          >
            {i18n.t('ai.v54-agent-panel.k62')}
          </Typography>
          <Stack
            direction='column'
            spacing={1}
          >
            <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
              <Typography
                variant='body2'
                color='text.secondary'
              >
                {i18n.t('ai.v54-agent-panel.k63')}
              </Typography>
              <Typography
                variant='body2'
                sx={{ fontWeight: 600 }}
              >
                {stats.total}
              </Typography>
            </Box>
            <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
              <Typography
                variant='body2'
                color='text.secondary'
              >
                {i18n.t('ai.v54-agent-panel.k64')}
              </Typography>
              <Typography
                variant='body2'
                sx={{ fontWeight: 600 }}
              >
                {stats.byType.user_query}
              </Typography>
            </Box>
            <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
              <Typography
                variant='body2'
                color='text.secondary'
              >
                {i18n.t('ai.v54-agent-panel.k65')}
              </Typography>
              <Typography
                variant='body2'
                sx={{ fontWeight: 600 }}
              >
                {stats.byType.action_result}
              </Typography>
            </Box>
            <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
              <Typography
                variant='body2'
                color='text.secondary'
              >
                {i18n.t('ai.v54-agent-panel.k66')}
              </Typography>
              <Typography
                variant='body2'
                sx={{ fontWeight: 600 }}
              >
                {stats.byType.system_event}
              </Typography>
            </Box>
            <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
              <Typography
                variant='body2'
                color='text.secondary'
              >
                {i18n.t('ai.v54-agent-panel.k67')}
              </Typography>
              <Typography
                variant='body2'
                sx={{ fontWeight: 600 }}
              >
                {stats.avgImportance.toFixed(2)}
              </Typography>
            </Box>
          </Stack>
        </Card>

        <Card
          variant='outlined'
          sx={{ p: 2 }}
        >
          <Typography
            variant='subtitle2'
            sx={{ fontWeight: 600, mb: 2 }}
          >
            {i18n.t('ai:v54-agent-panel.v0_0', { v0: filteredMemories.length })}
          </Typography>
          <TextField
            size='small'
            placeholder={i18n.t('ai.v54-agent-panel.k68')}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            fullWidth
            sx={{ mb: 2 }}
          />
          {filteredMemories.length === 0 ? (
            <Alert severity='info'>{i18n.t('ai.v54-agent-panel.k55')}</Alert>
          ) : (
            <List sx={{ maxHeight: 450, overflow: 'auto' }}>
              {filteredMemories.map((memory) => (
                <MemoryItem
                  key={memory.id}
                  memory={memory}
                />
              ))}
            </List>
          )}
        </Card>
      </Box>
    </Box>
  );
};

const MemoryItem: React.FC<{ memory: MemoryEntry }> = ({ memory }) => {
  const typeColors: Record<string, string> = {
    user_query: designTokens.colors.primary.main,
    action_result: designTokens.colors.success.dark,
    system_event: 'colors.grey.500',
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard?.writeText(text);
  };

  return (
    <Paper
      elevation={0}
      sx={{ mb: 0.5, p: 1.5, border: '1px solid', borderColor: 'divider', borderRadius: 1 }}
    >
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
        <Chip
          label={memory.type.replace(/_/g, ' ')}
          size='small'
          sx={{
            fontSize: 10,
            height: 18,
            bgcolor: `${typeColors[memory.type] ?? 'colors.grey.500'}20`,
            color: typeColors[memory.type] ?? 'colors.grey.500',
            fontWeight: 600,
          }}
        />
        <Typography
          variant='caption'
          color='text.secondary'
          sx={{ fontSize: 10 }}
        >
          {new Date(memory.timestamp).toLocaleString()}
        </Typography>
        <Box sx={{ flex: 1 }} />
        <Tooltip title={i18n.t('ai.v54-agent-panel.k56')}>
          <IconButton
            size='small'
            onClick={() => copyToClipboard(memory.content)}
          >
            <Copy size={12} />
          </IconButton>
        </Tooltip>
      </Box>
      <Typography
        variant='body2'
        sx={{ fontSize: 13, whiteSpace: 'pre-wrap' }}
      >
        {memory.content}
      </Typography>
      <Box sx={{ mt: 0.5, display: 'flex', alignItems: 'center', gap: 1 }}>
        <LinearProgress
          variant='determinate'
          value={memory.importance * 100}
          sx={{ height: 3, borderRadius: 2, flex: 1 }}
        />
        <Typography
          variant='caption'
          color='text.secondary'
          sx={{ fontSize: 10 }}
        >
          [i18n.t('ai.v54-agent-panel.k69')]: {memory.importance.toFixed(1)}
        </Typography>
      </Box>
    </Paper>
  );
};

const RefreshCw: React.FC<{ size?: number }> = ({ size = 16 }) => (
  <svg
    width={size}
    height={size}
    viewBox='0 0 24 24'
    fill='none'
    stroke='currentColor'
    strokeWidth='2'
    strokeLinecap='round'
    strokeLinejoin='round'
  >
    <path d='M21 2v6h-6' />
    <path d='M3 12a9 9 0 0 1 15-6.7L21 8' />
    <path d='M3 22v-6h6' />
    <path d='M21 12a9 9 0 0 1-15 6.7L3 16' />
  </svg>
);

export { V54AgentPanel };
export default V54AgentPanel;
