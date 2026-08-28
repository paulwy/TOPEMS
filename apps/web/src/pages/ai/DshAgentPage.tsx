/**
 * DSH Agent 演示页面
 *
 * 展示 DSH Agent 编排器的功能，包括：
 * - 聊天界面
 * - 流式响应
 * - 工具调用展示
 * - 会话管理
 */

import React, { useEffect } from 'react';
import {
  Box,
  Container,
  Typography,
  Paper,
  Grid,
  Card,
  CardContent,
  Chip,
  Divider,
  Alert,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
} from '@mui/material';
import SmartToyIcon from '@mui/icons-material/SmartToy';
import BuildIcon from '@mui/icons-material/Build';
import SpeedIcon from '@mui/icons-material/Speed';
import MemoryIcon from '@mui/icons-material/Memory';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';

import { DshAgentChatPanel } from '@/components/ai/DshAgentChatPanel';
import { useDshAgent } from '@/hooks/features/ai/useDshAgent';

// ============================================================================
// 页面组件
// ============================================================================

const DshAgentPage: React.FC = () => {
  // 使用 DSH Agent Hook
  const { tools, loadTools, sessionId, isLoading, error } = useDshAgent();

  // 加载工具列表
  useEffect(() => {
    loadTools();
  }, [loadTools]);

  // 功能特性列表
  const features = [
    {
      icon: <SmartToyIcon color="primary" />,
      title: '智能 Agent 编排',
      description: '基于 ReAct 模式的 Agent 编排，支持多轮对话和工具调用',
    },
    {
      icon: <BuildIcon color="secondary" />,
      title: 'MCP 工具集成',
      description: '集成 16 个业务系统的 MCP 工具，覆盖 CRM、ERP、MES 等',
    },
    {
      icon: <SpeedIcon color="success" />,
      title: '流式响应',
      description: '支持 SSE 流式响应，实时展示思考过程和工具调用',
    },
    {
      icon: <MemoryIcon color="warning" />,
      title: '上下文管理',
      description: '智能上下文窗口管理，支持多轮对话和上下文变量',
    },
  ];

  return (
    <Container maxWidth="xl" sx={{ py: 3 }}>
      {/* 页面标题 */}
      <Box sx={{ mb: 3 }}>
        <Typography variant="h4" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <SmartToyIcon color="primary" sx={{ fontSize: 40 }} />
          DSH Agent 智能助手
        </Typography>
        <Typography variant="body1" color="text.secondary">
          基于 DSH AI 中间层的智能 Agent，支持工具调用、流式响应和多轮对话
        </Typography>
      </Box>

      {/* 错误提示 */}
      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      <Grid container spacing={3}>
        {/* 左侧：聊天面板 */}
        <Grid item xs={12} md={8}>
          <DshAgentChatPanel
            title="DSH Agent 对话"
            maxHeight={700}
            sessionId={sessionId}
          />
        </Grid>

        {/* 右侧：信息面板 */}
        <Grid item xs={12} md={4}>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            {/* 功能特性 */}
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <CheckCircleIcon color="success" />
                  功能特性
                </Typography>
                <List dense>
                  {features.map((feature, index) => (
                    <ListItem key={index} disableGutters>
                      <ListItemIcon sx={{ minWidth: 36 }}>
                        {feature.icon}
                      </ListItemIcon>
                      <ListItemText
                        primary={feature.title}
                        secondary={feature.description}
                      />
                    </ListItem>
                  ))}
                </List>
              </CardContent>
            </Card>

            {/* 可用工具 */}
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <BuildIcon color="secondary" />
                  可用工具 ({tools.length})
                </Typography>
                {tools.length === 0 ? (
                  <Typography variant="body2" color="text.secondary">
                    加载中...
                  </Typography>
                ) : (
                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                    {tools.slice(0, 20).map((tool, index) => (
                      <Chip
                        key={index}
                        label={tool.name}
                        size="small"
                        variant="outlined"
                        title={tool.description}
                      />
                    ))}
                    {tools.length > 20 && (
                      <Chip
                        label={`+${tools.length - 20} 更多`}
                        size="small"
                        color="primary"
                      />
                    )}
                  </Box>
                )}
              </CardContent>
            </Card>

            {/* 会话状态 */}
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <MemoryIcon color="warning" />
                  会话状态
                </Typography>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                    <Typography variant="body2" color="text.secondary">
                      会话 ID:
                    </Typography>
                    <Typography variant="body2" fontFamily="monospace">
                      {sessionId ? `${sessionId.substring(0, 8)}...` : '未创建'}
                    </Typography>
                  </Box>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                    <Typography variant="body2" color="text.secondary">
                      状态:
                    </Typography>
                    <Chip
                      label={isLoading ? '处理中' : '空闲'}
                      size="small"
                      color={isLoading ? 'warning' : 'success'}
                      variant="outlined"
                    />
                  </Box>
                </Box>
              </CardContent>
            </Card>

            {/* 使用提示 */}
            <Paper variant="outlined" sx={{ p: 2, bgcolor: 'action.hover' }}>
              <Typography variant="subtitle2" gutterBottom>
                💡 使用提示
              </Typography>
              <Typography variant="body2" color="text.secondary" paragraph>
                尝试输入以下问题：
              </Typography>
              <List dense disablePadding>
                <ListItem disableGutters>
                  <ListItemText primary="• 搜索客户信息" />
                </ListItem>
                <ListItem disableGutters>
                  <ListItemText primary="• 查询销售订单" />
                </ListItem>
                <ListItem disableGutters>
                  <ListItemText primary="• 查看生产进度" />
                </ListItem>
                <ListItem disableGutters>
                  <ListItemText primary="• 分析财务数据" />
                </ListItem>
              </List>
            </Paper>
          </Box>
        </Grid>
      </Grid>

      {/* 底部信息 */}
      <Box sx={{ mt: 4, textAlign: 'center' }}>
        <Divider sx={{ mb: 2 }} />
        <Typography variant="caption" color="text.secondary">
          DSH AI 中间层 v1.0 | Agent 编排器 | MCP 工具注册中心 | LLM Provider 抽象
        </Typography>
      </Box>
    </Container>
  );
};

export default DshAgentPage;
