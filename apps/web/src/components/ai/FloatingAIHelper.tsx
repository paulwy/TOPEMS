import React, { useState, useCallback } from 'react';
import {
  Box,
  IconButton,
  Paper,
  Typography,
  TextField,
  Fab,
  Popover,
  Divider,
  Chip,
  InputAdornment,
  useTheme,
  useMediaQuery,
  Fade,
  Zoom,
  Button,
} from '@mui/material';
import {
  Sparkles,
  MessageSquare,
  FileText,
  BarChart3,
  Wand2,
  X,
  Minus,
  Send,
  Search,
  Calculator,
  Calendar,
  Code,
  FileJson,
  Shield,
  ChevronRight,
  Lightbulb,
  Zap,
  UserPlus,
  FileCheck,
  TrendingUp,
  Target,
  AlertTriangle,
  Wallet,
  FileEdit,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAIContext } from '../../hooks';
import { AIToolsPanel } from './AIToolsPanel';
import { WORKFLOW_PATHS } from '@/modules/workflow/config';
import { BI_PATHS } from '@/modules/bi/config';
import { DOC_PATHS } from '@/modules/doc/config';
import { NOTIFICATION_PATHS } from '@/modules/notification/config';
import { AI_PATHS } from '@/modules/ai/config';
import { HRM_PATHS } from '@/modules/hrm/config';
import { CRM_PATHS } from '@/modules/crm/config';

interface QuickCommand {
  id: string;
  command: string;
  label: string;
  description: string;
  icon: React.ReactNode;
  action: () => void;
}

interface Tool {
  id: string;
  label: string;
  icon: React.ReactNode;
  description: string;
  action: () => void;
}

const iconMap: Record<string, React.ReactNode> = {
  'user-plus': <UserPlus style={{ width: 16, height: 16 }} />,
  'file-text': <FileText style={{ width: 16, height: 16 }} />,
  'calendar-check': <Calendar style={{ width: 16, height: 16 }} />,
  'trending-up': <TrendingUp style={{ width: 16, height: 16 }} />,
  star: <Lightbulb style={{ width: 16, height: 16 }} />,
  'message-square': <MessageSquare style={{ width: 16, height: 16 }} />,
  'bar-chart': <BarChart3 style={{ width: 16, height: 16 }} />,
  target: <Target style={{ width: 16, height: 16 }} />,
  briefcase: <FileText style={{ width: 16, height: 16 }} />,
  'alert-triangle': <AlertTriangle style={{ width: 16, height: 16 }} />,
  'file-check': <FileCheck style={{ width: 16, height: 16 }} />,
  'bar-chart-2': <BarChart3 style={{ width: 16, height: 16 }} />,
  'alert-circle': <AlertTriangle style={{ width: 16, height: 16 }} />,
  wallet: <Wallet style={{ width: 16, height: 16 }} />,
  'pie-chart': <BarChart3 style={{ width: 16, height: 16 }} />,
  'file-edit': <FileEdit style={{ width: 16, height: 16 }} />,
  search: <Search style={{ width: 16, height: 16 }} />,
  code: <Code style={{ width: 16, height: 16 }} />,
  'message-circle': <MessageSquare style={{ width: 16, height: 16 }} />,
};

export const FloatingAIHelper: React.FC = () => {
  const navigate = useNavigate();
  const theme = useTheme();
  const _isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const _isTablet = useMediaQuery(theme.breakpoints.down('md'));
  const { recommendations, quickCommands: _contextQuickCommands } = useAIContext();

  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<'chat' | 'tools' | 'help'>('chat');
  const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null);
  const [activeTool, setActiveTool] = useState<string | null>(null);

  // 快捷命令（合并默认命令和上下文感知命令）
  const quickCommands: QuickCommand[] = [
    {
      id: 'approval',
      command: '/审批',
      label: '查看审批',
      description: '查看待我审批的事项',
      icon: <FileText style={{ width: 18, height: 18 }} />,
      action: () => navigate(WORKFLOW_PATHS.approvals),
    },
    {
      id: 'attendance',
      command: '/考勤',
      label: '查考勤',
      description: '查看本月考勤情况',
      icon: <Calendar style={{ width: 18, height: 18 }} />,
      action: () => navigate(HRM_PATHS.attendance),
    },
    {
      id: 'customer',
      command: '/客户',
      label: '找客户',
      description: '查找最近未联系的客户',
      icon: <Search style={{ width: 18, height: 18 }} />,
      action: () => navigate(CRM_PATHS.customers),
    },
    {
      id: 'report',
      command: '/报表',
      label: '生成报表',
      description: '生成本月销售汇总',
      icon: <BarChart3 style={{ width: 18, height: 18 }} />,
      action: () => navigate(BI_PATHS.report),
    },
    {
      id: 'calculator',
      command: '/计算',
      label: '日期计算',
      description: '日期间隔和工作日计算',
      icon: <Calculator style={{ width: 18, height: 18 }} />,
      action: () => {},
    },
  ];

  // 实用工具
  const tools: Tool[] = [
    {
      id: 'json',
      label: 'JSON格式化',
      icon: <FileJson style={{ width: 18, height: 18 }} />,
      description: '格式化、压缩、校验JSON',
      action: () => setActiveTool('json'),
    },
    {
      id: 'date',
      label: '日期计算器',
      icon: <Calendar style={{ width: 18, height: 18 }} />,
      description: '日期间隔、工作日计算',
      action: () => setActiveTool('date'),
    },
    {
      id: 'unit',
      label: '单位换算',
      icon: <Calculator style={{ width: 18, height: 18 }} />,
      description: '化工原料计量换算',
      action: () => setActiveTool('unit'),
    },
    {
      id: 'code',
      label: '编码生成',
      icon: <Code style={{ width: 18, height: 18 }} />,
      description: '批量生成编号',
      action: () => navigate(AI_PATHS.chat),
    },
    {
      id: 'mask',
      label: '数据脱敏',
      icon: <Shield style={{ width: 18, height: 18 }} />,
      description: '隐私数据处理',
      action: () => setActiveTool('mask'),
    },
  ];

  const handleCommandClick = useCallback((command: QuickCommand) => {
    command.action();
    setIsOpen(false);
  }, []);

  const handleToolClick = useCallback((tool: Tool) => {
    tool.action();
  }, []);

  const handleSearch = useCallback(() => {
    if (searchQuery.trim()) {
      navigate(`${AI_PATHS.root}?query=${encodeURIComponent(searchQuery)}`);
      setIsOpen(false);
      setSearchQuery('');
    }
  }, [searchQuery, navigate]);

  const handleFabClick = useCallback((event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
    setIsOpen(true);
  }, []);

  const handleClose = useCallback(() => {
    setAnchorEl(null);
    setIsOpen(false);
    setIsMinimized(false);
    setActiveTool(null);
  }, []);

  const handleMinimize = useCallback(() => {
    setIsMinimized(true);
    setActiveTool(null);
  }, []);

  const handleMaximize = useCallback(() => {
    setIsMinimized(false);
  }, []);

  const handleBackToMain = useCallback(() => {
    setActiveTool(null);
  }, []);

  return (
    <>
      {/* 浮动按钮 */}
      <Zoom in>
        <Fab
          color='primary'
          aria-label='AI助手'
          className='ai-helper-fab'
          sx={{
            position: 'fixed',
            bottom: 24,
            right: 24,
            background: 'linear-gradient(135deg, primary.main 0%, secondary.main 100%)',
            '&:hover': {
              background: 'linear-gradient(135deg, primary.dark 0%, secondary.dark 100%)',
            },
            boxShadow: '0 4px 14px rgba(59, 130, 246, 0.4)',
          }}
          onClick={handleFabClick}
        >
          <Sparkles style={{ width: 24, height: 24, color: 'white' }} />
        </Fab>
      </Zoom>

      {/* AI助手面板 */}
      <Popover
        open={isOpen && Boolean(anchorEl)}
        anchorEl={anchorEl}
        onClose={handleClose}
        anchorOrigin={{
          vertical: 'top',
          horizontal: 'left',
        }}
        transformOrigin={{
          vertical: 'bottom',
          horizontal: 'right',
        }}
        slotProps={{
          paper: {
            className: 'ai-helper-panel',
            sx: {
              width: isMinimized
                ? { xs: 280, sm: 320 }
                : { xs: 'calc(100vw - 32px)', sm: 400, md: 420 },
              height: isMinimized ? 60 : { xs: '70vh', sm: '75vh', md: 520 },
              borderRadius: 2,
              overflow: 'hidden',
              transition: 'all 0.3s ease',
              maxWidth: '100%',
            },
          },
        }}
      >
        <Fade in={!isMinimized}>
          <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
            {/* 头部 */}
            <Box
              sx={{
                p: 2,
                background: 'linear-gradient(135deg, primary.main 0%, secondary.main 100%)',
                color: 'white',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}
            >
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                <Sparkles style={{ width: 20, height: 20 }} />
                <Typography
                  variant='subtitle1'
                  sx={{ fontWeight: 600 }}
                >
                  TOPEMS AI 助手
                </Typography>
              </Box>
              <Box sx={{ display: 'flex', gap: 0.5 }}>
                <IconButton
                  size='small'
                  onClick={handleMinimize}
                  sx={{ color: 'white' }}
                >
                  <Minus style={{ width: 16, height: 16 }} />
                </IconButton>
                <IconButton
                  size='small'
                  onClick={handleClose}
                  sx={{ color: 'white' }}
                >
                  <X style={{ width: 16, height: 16 }} />
                </IconButton>
              </Box>
            </Box>

            {/* 搜索框 */}
            <Box sx={{ p: 2, borderBottom: 1, borderColor: 'divider' }}>
              <TextField
                fullWidth
                size='small'
                placeholder='搜索或提问... (按回车发送)'
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                slotProps={{
                  input: {
                    startAdornment: (
                      <InputAdornment position='start'>
                        <Search sx={{ width: 18, height: 18, color: 'text.secondary' }} />
                      </InputAdornment>
                    ),
                    endAdornment: (
                      <InputAdornment position='end'>
                        <IconButton
                          size='small'
                          onClick={handleSearch}
                        >
                          <Send style={{ width: 16, height: 16 }} />
                        </IconButton>
                      </InputAdornment>
                    ),
                  },
                }}
              />
            </Box>

            {/* Tab切换 */}
            <Box sx={{ px: 2, pt: 1.5, display: 'flex', gap: 1 }}>
              {activeTool ? (
                <>
                  <Chip
                    icon={<ChevronRight style={{ width: 14, height: 14 }} />}
                    label='返回'
                    size='small'
                    variant='outlined'
                    onClick={handleBackToMain}
                  />
                  <Chip
                    label={tools.find((t) => t.id === activeTool)?.label || '工具'}
                    size='small'
                    color='primary'
                  />
                </>
              ) : (
                <>
                  <Chip
                    icon={<MessageSquare style={{ width: 14, height: 14 }} />}
                    label='对话'
                    size='small'
                    variant={activeTab === 'chat' ? 'filled' : 'outlined'}
                    onClick={() => setActiveTab('chat')}
                    color='primary'
                  />
                  <Chip
                    icon={<Zap style={{ width: 14, height: 14 }} />}
                    label='快捷命令'
                    size='small'
                    variant={activeTab === 'tools' ? 'filled' : 'outlined'}
                    onClick={() => setActiveTab('tools')}
                  />
                  <Chip
                    icon={<Lightbulb style={{ width: 14, height: 14 }} />}
                    label='使用帮助'
                    size='small'
                    variant={activeTab === 'help' ? 'filled' : 'outlined'}
                    onClick={() => setActiveTab('help')}
                  />
                </>
              )}
            </Box>

            {/* 内容区 */}
            <Box sx={{ flex: 1, overflow: 'auto', p: 2 }}>
              {activeTool ? (
                <AIToolsPanel
                  defaultTool={activeTool}
                  onClose={handleClose}
                />
              ) : activeTab === 'chat' ? (
                <Box>
                  <Typography
                    variant='caption'
                    color='text.secondary'
                    sx={{ mb: 1.5, display: 'block' }}
                  >
                    💡 上下文推荐
                  </Typography>
                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                    {recommendations.map((item) => (
                      <Box
                        key={item.id}
                        sx={{
                          p: 1.5,
                          borderRadius: 1,
                          border: 1,
                          borderColor: 'divider',
                          cursor: 'pointer',
                          '&:hover': {
                            backgroundColor: 'action.hover',
                            borderColor: 'primary.main',
                          },
                        }}
                        onClick={() => navigate(item.action)}
                      >
                        <Box
                          sx={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: 1.5,
                          }}
                        >
                          <Box
                            sx={{
                              width: 28,
                              height: 28,
                              borderRadius: 0.5,
                              backgroundColor: 'primary.light',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              color: 'primary.main',
                            }}
                          >
                            {iconMap[item.icon || 'star'] || (
                              <Lightbulb style={{ width: 14, height: 14 }} />
                            )}
                          </Box>
                          <Box>
                            <Typography
                              variant='body2'
                              sx={{ fontWeight: 500, mb: 0.5 }}
                            >
                              {item.label}
                            </Typography>
                            <Typography
                              variant='caption'
                              color='text.secondary'
                            >
                              {item.description}
                            </Typography>
                          </Box>
                        </Box>
                      </Box>
                    ))}
                  </Box>

                  <Divider sx={{ my: 2 }} />

                  <Typography
                    variant='caption'
                    color='text.secondary'
                    sx={{ mb: 1.5, display: 'block' }}
                  >
                    🎯 常用功能
                  </Typography>
                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                    <Chip
                      icon={<Wand2 style={{ width: 14, height: 14 }} />}
                      label='文档生成'
                      size='small'
                      onClick={() => navigate(DOC_PATHS.documents)}
                    />
                    <Chip
                      icon={<BarChart3 style={{ width: 14, height: 14 }} />}
                      label='文本分析'
                      size='small'
                      onClick={() => navigate(AI_PATHS.root)}
                    />
                    <Chip
                      icon={<FileText style={{ width: 14, height: 14 }} />}
                      label='数据补全'
                      size='small'
                      onClick={() => navigate(AI_PATHS.chat)}
                    />
                  </Box>
                </Box>
              ) : activeTab === 'tools' ? (
                <Box>
                  <Typography
                    variant='caption'
                    color='text.secondary'
                    sx={{ mb: 1.5, display: 'block' }}
                  >
                    ⚡ 快捷命令
                  </Typography>
                  <Box
                    sx={{
                      display: 'flex',
                      flexDirection: 'column',
                      gap: 1,
                      mb: 2,
                    }}
                  >
                    {quickCommands.map((cmd) => (
                      <Box
                        key={cmd.id}
                        sx={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: 1.5,
                          p: 1.5,
                          borderRadius: 1,
                          border: 1,
                          borderColor: 'divider',
                          cursor: 'pointer',
                          '&:hover': {
                            backgroundColor: 'action.hover',
                            borderColor: 'primary.main',
                          },
                        }}
                        onClick={() => handleCommandClick(cmd)}
                      >
                        <Box
                          sx={{
                            width: 32,
                            height: 32,
                            borderRadius: 1,
                            backgroundColor: 'primary.light',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: 'primary.main',
                          }}
                        >
                          {cmd.icon}
                        </Box>
                        <Box sx={{ flex: 1 }}>
                          <Typography
                            variant='body2'
                            sx={{ fontWeight: 500 }}
                          >
                            {cmd.label}
                          </Typography>
                          <Typography
                            variant='caption'
                            color='text.secondary'
                          >
                            {cmd.description}
                          </Typography>
                        </Box>
                        <Chip
                          label={cmd.command}
                          size='small'
                          variant='outlined'
                          sx={{ fontFamily: 'monospace', fontSize: 11 }}
                        />
                      </Box>
                    ))}
                  </Box>

                  <Typography
                    variant='caption'
                    color='text.secondary'
                    sx={{ mb: 1.5, display: 'block' }}
                  >
                    🔧 实用工具
                  </Typography>
                  <Box
                    sx={{
                      display: 'grid',
                      gridTemplateColumns: '1fr 1fr',
                      gap: 1,
                    }}
                  >
                    {tools.map((tool) => (
                      <Box
                        key={tool.id}
                        sx={{
                          p: 1.5,
                          borderRadius: 1,
                          border: 1,
                          borderColor: 'divider',
                          cursor: 'pointer',
                          textAlign: 'center',
                          '&:hover': {
                            backgroundColor: 'action.hover',
                            borderColor: 'primary.main',
                          },
                        }}
                        onClick={() => handleToolClick(tool)}
                      >
                        <Box
                          sx={{
                            width: 36,
                            height: 36,
                            borderRadius: 1,
                            backgroundColor: 'secondary.light',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            mx: 'auto',
                            mb: 1,
                            color: 'secondary.main',
                          }}
                        >
                          {tool.icon}
                        </Box>
                        <Typography
                          variant='caption'
                          sx={{ fontWeight: 500, display: 'block' }}
                        >
                          {tool.label}
                        </Typography>
                      </Box>
                    ))}
                  </Box>
                </Box>
              ) : activeTab === 'help' ? (
                <Box>
                  <Typography
                    variant='caption'
                    color='text.secondary'
                    sx={{ mb: 1.5, display: 'block' }}
                  >
                    📖 使用指南
                  </Typography>
                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                    <Box
                      sx={{
                        p: 1.5,
                        borderRadius: 1,
                        backgroundColor: 'grey.100',
                      }}
                    >
                      <Typography
                        variant='caption'
                        sx={{ fontWeight: 600, display: 'block', mb: 0.5 }}
                      >
                        如何使用快捷命令？
                      </Typography>
                      <Typography
                        variant='caption'
                        color='text.secondary'
                      >
                        在输入框中输入 /审批、/考勤 等命令，快速跳转到对应功能。
                      </Typography>
                    </Box>
                    <Box
                      sx={{
                        p: 1.5,
                        borderRadius: 1,
                        backgroundColor: 'grey.100',
                      }}
                    >
                      <Typography
                        variant='caption'
                        sx={{ fontWeight: 600, display: 'block', mb: 0.5 }}
                      >
                        AI能做什么？
                      </Typography>
                      <Typography
                        variant='caption'
                        color='text.secondary'
                      >
                        AI助手可以生成文档、分析文本、补全数据、解答问题。
                      </Typography>
                    </Box>
                    <Box
                      sx={{
                        p: 1.5,
                        borderRadius: 1,
                        backgroundColor: 'grey.100',
                      }}
                    >
                      <Typography
                        variant='caption'
                        sx={{ fontWeight: 600, display: 'block', mb: 0.5 }}
                      >
                        如何打开AI聊天？
                      </Typography>
                      <Typography
                        variant='caption'
                        color='text.secondary'
                      >
                        点击右上角"AI聊天"Tab，或在任意页面使用浮动按钮。
                      </Typography>
                    </Box>
                  </Box>
                </Box>
              ) : null}
            </Box>

            {/* 底部 */}
            <Box
              sx={{
                p: 1.5,
                borderTop: 1,
                borderColor: 'divider',
                display: 'flex',
                justifyContent: 'center',
              }}
            >
              <Button
                size='small'
                endIcon={<ChevronRight style={{ width: 16, height: 16 }} />}
                onClick={() => navigate(AI_PATHS.root)}
              >
                打开完整AI助手
              </Button>
            </Box>
          </Box>
        </Fade>

        {/* 最小化状态 */}
        <Fade in={isMinimized}>
          <Box
            sx={{
              height: '100%',
              display: isMinimized ? 'flex' : 'none',
              alignItems: 'center',
              justifyContent: 'space-between',
              px: 2,
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Sparkles style={{ width: 18, height: 18, color: theme.palette.primary.main }} />
              <Typography
                variant='body2'
                sx={{ fontWeight: 500 }}
              >
                AI 助手
              </Typography>
            </Box>
            <IconButton
              size='small'
              onClick={handleMaximize}
            >
              <ChevronRight style={{ width: 16, height: 16 }} />
            </IconButton>
          </Box>
        </Fade>
      </Popover>
    </>
  );
};

export default FloatingAIHelper;
