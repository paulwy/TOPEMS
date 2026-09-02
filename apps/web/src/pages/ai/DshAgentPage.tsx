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
import { Grid } from '@/components/common';
import SmartToyIcon from '@mui/icons-material/SmartToy';
import BuildIcon from '@mui/icons-material/Build';
import SpeedIcon from '@mui/icons-material/Speed';
import MemoryIcon from '@mui/icons-material/Memory';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';

import { DshAgentChatPanel } from '@/components/ai/DshAgentChatPanel';
import { useDshAgent } from '@/hooks/features/ai/useDshAgent';
import { useTranslation } from 'react-i18next';

// ============================================================================
// 页面组件
// ============================================================================

const DshAgentPage: React.FC = () => {
  const { t } = useTranslation();

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
      title: t('ai.dsh_agent.feat.orchestration'),
      description: t('ai.dsh_agent.feat.orchestration_desc'),
    },
    {
      icon: <BuildIcon color="secondary" />,
      title: t('ai.dsh_agent.feat.mcp'),
      description: t('ai.dsh_agent.feat.mcp_desc'),
    },
    {
      icon: <SpeedIcon color="success" />,
      title: t('ai.dsh_agent.feat.streaming'),
      description: t('ai.dsh_agent.feat.streaming_desc'),
    },
    {
      icon: <MemoryIcon color="warning" />,
      title: t('ai.dsh_agent.feat.context'),
      description: t('ai.dsh_agent.feat.context_desc'),
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
            title={t('ai.dsh_agent.panel.title')}
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
                        label={t('ai.dsh_agent.more', { count: tools.length - 20 })}
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
                    <Typography variant="body2" sx={{ fontFamily: 'monospace' }}>
                      {sessionId ? `${sessionId.substring(0, 8)}...` : t('ai.dsh_agent.not_created')}
                    </Typography>
                  </Box>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                    <Typography variant="body2" color="text.secondary">
                      状态:
                    </Typography>
                    <Chip
                      label={isLoading ? t('ai.dsh_agent.processing') : t('ai.dsh_agent.idle')}
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
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                尝试输入以下问题：
              </Typography>
              <List dense disablePadding>
                <ListItem disableGutters>
                  <ListItemText primary={t('ai.dsh_agent.hint.search_customer')} />
                </ListItem>
                <ListItem disableGutters>
                  <ListItemText primary={t('ai.dsh_agent.hint.query_order')} />
                </ListItem>
                <ListItem disableGutters>
                  <ListItemText primary={t('ai.dsh_agent.hint.production')} />
                </ListItem>
                <ListItem disableGutters>
                  <ListItemText primary={t('ai.dsh_agent.hint.finance')} />
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
