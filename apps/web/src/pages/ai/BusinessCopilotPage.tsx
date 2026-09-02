/**
 * 业务 Copilot 主页面
 *
 * 集成业务模块选择器、智能表单、文档智能和治理仪表盘，
 * 提供完整的业务 AI 助手体验。
 */

import React, { useState, useEffect } from 'react';
import {
  Box,
  Container,
  Typography,
  Paper,
  Tabs,
  Tab,
  Card,
  CardContent,
  Chip,
  Divider,
  Alert,
  Button,
  TextField,
  IconButton,
  CircularProgress,
  List,
  ListItem,
  ListItemText,
  Avatar,
  Stack,
} from '@mui/material';
import { Grid } from '@/components/common';
import SendIcon from '@mui/icons-material/Send';
import SmartToyIcon from '@mui/icons-material/SmartToy';
import PersonIcon from '@mui/icons-material/Person';
import RefreshIcon from '@mui/icons-material/Refresh';
import ClearIcon from '@mui/icons-material/Clear';
import BusinessIcon from '@mui/icons-material/Business';
import DescriptionIcon from '@mui/icons-material/Description';
import DashboardIcon from '@mui/icons-material/Dashboard';
import BuildIcon from '@mui/icons-material/Build';

import {
  BusinessModuleSelector,
  SmartFormRenderer,
  DocumentIntelligence,
  GovernanceDashboard,
} from '@/components/ai/business';
import { useBusinessCopilot } from '@/hooks/features/ai/useBusinessCopilot';
import { useTranslation } from 'react-i18next';
import type { BusinessModuleType } from '@/api/ai/business-copilot';
import type { FormDefinition, DocumentInfo, DocumentSummary } from '@/api/ai/business-intelligence';

// ============================================================================
// 标签页类型
// ============================================================================

type TabType = 'chat' | 'form' | 'document' | 'governance';

// ============================================================================
// 示例表单定义
// ============================================================================

const createSampleForm = (t: (k: string) => string): FormDefinition => ({
  form_id: 'purchase_request',
  name: t('ai.business_copilot.form.name'),
  description: t('ai.business_copilot.form.description'),
  category: 'erp',
  version: '1.0',
  enabled: true,
  fields: [
    {
      field_id: 'title',
      name: 'title',
      label: t('ai.business_copilot.fld_title.label'),
      field_type: 'text',
      placeholder: t('ai.business_copilot.fld_title.placeholder'),
      required: true,
      group: t('ai.business_copilot.group.basic'),
      order: 1,
    },
    {
      field_id: 'applicant',
      name: 'applicant',
      label: t('ai.business_copilot.fld_applicant.label'),
      field_type: 'text',
      required: true,
      group: t('ai.business_copilot.group.basic'),
      order: 2,
    },
    {
      field_id: 'department',
      name: 'department',
      label: t('ai.business_copilot.fld_dept.label'),
      field_type: 'select',
      required: true,
      options: [
        { value: 'it', label: t('ai.business_copilot.dept_it') },
        { value: 'finance', label: t('ai.business_copilot.dept_finance') },
        { value: 'hr', label: t('ai.business_copilot.dept_hr') },
        { value: 'operations', label: t('ai.business_copilot.dept_ops') },
      ],
      group: t('ai.business_copilot.group.basic'),
      order: 3,
    },
    {
      field_id: 'request_date',
      name: 'request_date',
      label: t('ai.business_copilot.fld_date.label'),
      field_type: 'date',
      required: true,
      group: t('ai.business_copilot.group.basic'),
      order: 4,
    },
    {
      field_id: 'item_name',
      name: 'item_name',
      label: t('ai.business_copilot.fld_item.label'),
      field_type: 'text',
      required: true,
      group: t('ai.business_copilot.group.details'),
      order: 5,
    },
    {
      field_id: 'quantity',
      name: 'quantity',
      label: t('ai.business_copilot.fld_qty.label'),
      field_type: 'integer',
      required: true,
      validation: { min_value: 1, error_message: t('ai.business_copilot.fld_qty.error') },
      group: t('ai.business_copilot.group.details'),
      order: 6,
    },
    {
      field_id: 'estimated_amount',
      name: 'estimated_amount',
      label: t('ai.business_copilot.fld_amount.label'),
      field_type: 'decimal',
      required: true,
      validation: { min_value: 0, error_message: t('ai.business_copilot.fld_amount.error') },
      group: t('ai.business_copilot.group.details'),
      order: 7,
    },
    {
      field_id: 'urgency',
      name: 'urgency',
      label: t('ai.business_copilot.fld_urgency.label'),
      field_type: 'radio',
      required: true,
      options: [
        { value: 'low', label: t('ai.business_copilot.urgency_low') },
        { value: 'medium', label: t('ai.business_copilot.urgency_medium') },
        { value: 'high', label: t('ai.business_copilot.urgency_high') },
      ],
      default_value: 'low',
      group: t('ai.business_copilot.group.details'),
      order: 8,
    },
    {
      field_id: 'reason',
      name: 'reason',
      label: t('ai.business_copilot.fld_reason.label'),
      field_type: 'textarea',
      placeholder: t('ai.business_copilot.fld_reason.placeholder'),
      required: true,
      validation: { min_length: 10, error_message: t('ai.business_copilot.fld_reason.error') },
      group: t('ai.business_copilot.group.other'),
      order: 9,
    },
    {
      field_id: 'remarks',
      name: 'remarks',
      label: t('ai.business_copilot.fld_remarks.label'),
      field_type: 'textarea',
      group: t('ai.business_copilot.group.other'),
      order: 10,
    },
  ],
});

// ============================================================================
// 示例文档
// ============================================================================

const createSampleDocument = (t: (k: string) => string): DocumentInfo => ({
  document_id: 'doc_001',
  name: t('ai.business_copilot.doc.name'),
  document_type: 'pdf',
  file_size: 2457600,
  content: t('ai.business_copilot.doc.content'),
  metadata: {
    author: t('ai.business_copilot.doc.author'),
    created_at: '2024-12-31',
    page_count: 45,
    word_count: 12500,
    language: 'zh-CN',
    title: t('ai.business_copilot.doc.title'),
  },
  uploaded_at: '2024-12-31T10:00:00Z',
  processing_status: 'completed',
});

const createSampleSummary = (t: (k: string) => string): DocumentSummary => ({
  document_id: 'doc_001',
  summary_type: 'standard',
  content: t('ai.business_copilot.summary.content'),
  length: 120,
  key_sentences: [
    t('ai.business_copilot.summary.s1'),
    t('ai.business_copilot.summary.s2'),
    t('ai.business_copilot.summary.s3'),
    t('ai.business_copilot.summary.s4'),
  ],
  keywords: [
    { keyword: t('ai.business_copilot.keyword.revenue'), weight: 0.95, frequency: 15 },
    { keyword: t('ai.business_copilot.keyword.profit'), weight: 0.88, frequency: 12 },
    { keyword: t('ai.business_copilot.keyword.finance'), weight: 0.75, frequency: 8 },
    { keyword: t('ai.business_copilot.keyword.growth'), weight: 0.70, frequency: 20 },
    { keyword: t('ai.business_copilot.keyword.fy2024'), weight: 0.65, frequency: 10 },
  ],
  generated_at: '2024-12-31T10:05:00Z',
});

// ============================================================================
// 页面组件
// ============================================================================

const BusinessCopilotPage: React.FC = () => {
  const { t } = useTranslation();
  const sampleForm = createSampleForm(t);
  const sampleDocument = createSampleDocument(t);
  const sampleSummary = createSampleSummary(t);

  // 状态
  const [activeTab, setActiveTab] = useState<TabType>('chat');
  const [inputValue, setInputValue] = useState('');

  // 使用业务 Copilot Hook
  const {
    session,
    messages,
    isSending,
    isLoading,
    error,
    currentModule,
    moduleConfig,
    createNewSession,
    send,
    switchModule,
    loadModuleConfig,
    clearSession,
    clearError,
  } = useBusinessCopilot('erp');

  // 初始化：创建会话并加载模块配置
  useEffect(() => {
    createNewSession('erp');
    loadModuleConfig('erp');
  }, [createNewSession, loadModuleConfig]);

  // 处理模块切换
  const handleModuleChange = async (module: BusinessModuleType) => {
    await switchModule(module);
    await loadModuleConfig(module);
  };

  // 处理发送消息
  const handleSend = async () => {
    if (!inputValue.trim() || isSending) return;
    const message = inputValue.trim();
    setInputValue('');
    await send(message);
  };

  // 处理按键（Enter 发送）
  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  // 处理表单提交
  const handleFormSubmit = (values: Record<string, unknown>) => {
    console.log('表单提交:', values);
    // 实际应用中调用 API 提交表单
  };

  // 处理表单草稿保存
  const handleFormSaveDraft = (values: Record<string, unknown>) => {
    console.log('保存草稿:', values);
    // 实际应用中调用 API 保存草稿
  };

  // 处理文档上传
  const handleDocumentUpload = (file: File) => {
    console.log('上传文档:', file.name);
    // 实际应用中调用 API 上传文档
  };

  // 处理文档摘要生成
  const handleGenerateSummary = (type: string) => {
    console.log('生成摘要:', type);
    // 实际应用中调用 API 生成摘要
  };

  // 处理文档解析
  const handleParseDocument = () => {
    console.log('解析文档');
    // 实际应用中调用 API 解析文档
  };

  // 渲染聊天消息
  const renderMessages = () => {
    if (messages.length === 0) {
      return (
        <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'text.secondary' }}>
          <SmartToyIcon sx={{ fontSize: 64, mb: 2, opacity: 0.3 }} />
          <Typography variant="h6" gutterBottom>
            欢迎使用业务 Copilot
          </Typography>
          <Typography variant="body2" color="text.secondary">
            选择业务模块，开始智能对话
          </Typography>
        </Box>
      );
    }

    return (
      <List sx={{ width: '100%' }}>
        {messages.map((msg) => (
          <ListItem key={msg.message_id} sx={{ alignItems: 'flex-start', mb: 2 }}>
            <Avatar sx={{ mr: 2, bgcolor: msg.role === 'user' ? 'primary.main' : 'secondary.main' }}>
              {msg.role === 'user' ? <PersonIcon /> : <SmartToyIcon />}
            </Avatar>
            <ListItemText
              primary={
                <Typography variant="subtitle2" color="text.secondary">
                  {msg.role === 'user' ? t('ai.business_copilot.me') : 'Copilot'}
                </Typography>
              }
              secondary={
                <Box>
                  <Typography variant="body1" sx={{ whiteSpace: 'pre-wrap' }}>
                    {msg.content}
                  </Typography>
                  {msg.tool_calls && msg.tool_calls.length > 0 && (
                    <Box sx={{ mt: 1 }}>
                      {msg.tool_calls.map((call) => (
                        <Chip
                          key={call.call_id}
                          label={`${call.tool_name}: ${call.status}`}
                          size="small"
                          variant="outlined"
                          sx={{ mr: 1, mb: 1 }}
                        />
                      ))}
                    </Box>
                  )}
                </Box>
              }
            />
          </ListItem>
        ))}
      </List>
    );
  };

  // 标签页配置
  const tabs = [
    { value: 'chat' as TabType, label: t('ai.business_copilot.tab.chat'), icon: <SmartToyIcon /> },
    { value: 'form' as TabType, label: t('ai.business_copilot.tab.form'), icon: <BuildIcon /> },
    { value: 'document' as TabType, label: t('ai.business_copilot.tab.document'), icon: <DescriptionIcon /> },
    { value: 'governance' as TabType, label: t('ai.business_copilot.tab.governance'), icon: <DashboardIcon /> },
  ];

  return (
    <Container maxWidth="xl" sx={{ py: 3 }}>
      {/* 页面标题 */}
      <Box sx={{ mb: 3 }}>
        <Typography variant="h4" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <BusinessIcon color="primary" sx={{ fontSize: 40 }} />
          业务 Copilot 智能助手
        </Typography>
        <Typography variant="body1" color="text.secondary">
          集成业务模块选择、智能表单、文档智能和治理仪表盘的一站式 AI 助手
        </Typography>
      </Box>

      {/* 错误提示 */}
      {error && (
        <Alert
          severity="error"
          sx={{ mb: 2 }}
          action={
            <IconButton size="small" onClick={clearError}>
              <ClearIcon fontSize="small" />
            </IconButton>
          }
        >
          {error}
        </Alert>
      )}

      {/* 业务模块选择器 */}
      <Paper sx={{ p: 2, mb: 3 }}>
        <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <BusinessIcon fontSize="small" />
          选择业务模块
        </Typography>
        <BusinessModuleSelector
          selectedModule={currentModule}
          onSelect={handleModuleChange}
        />
        {moduleConfig && (
          <Box sx={{ mt: 2 }}>
            <Divider sx={{ my: 1 }} />
            <Typography variant="body2" color="text.secondary">
              {moduleConfig.description}
            </Typography>
            <Box sx={{ mt: 1, display: 'flex', flexWrap: 'wrap', gap: 1 }}>
              {moduleConfig.supported_intents.map((intent) => (
                <Chip key={intent} label={intent} size="small" variant="outlined" />
              ))}
            </Box>
          </Box>
        )}
      </Paper>

      {/* 标签页 */}
      <Paper sx={{ mb: 3 }}>
        <Tabs
          value={activeTab}
          onChange={(_, newValue) => setActiveTab(newValue)}
          variant="scrollable"
          scrollButtons="auto"
        >
          {tabs.map((tab) => (
            <Tab
              key={tab.value}
              value={tab.value}
              label={tab.label}
              icon={tab.icon}
              iconPosition="start"
            />
          ))}
        </Tabs>
      </Paper>

      {/* 标签页内容 */}
      <Box>
        {/* 智能对话 */}
        {activeTab === 'chat' && (
          <Grid container spacing={3}>
            <Grid item xs={12} md={8}>
              <Paper sx={{ height: '600px', display: 'flex', flexDirection: 'column' }}>
                {/* 消息列表 */}
                <Box sx={{ flex: 1, overflow: 'auto', p: 2 }}>
                  {isLoading ? (
                    <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}>
                      <CircularProgress />
                    </Box>
                  ) : (
                    renderMessages()
                  )}
                </Box>

                {/* 输入区域 */}
                <Divider />
                <Box sx={{ p: 2 }}>
                  <Stack direction="row" spacing={1} sx={{ alignItems: 'flex-end' }}>
                    <TextField
                      fullWidth
                      multiline
                      maxRows={4}
                      placeholder={t('ai.business_copilot.input.placeholder')}
                      value={inputValue}
                      onChange={(e) => setInputValue(e.target.value)}
                      onKeyPress={handleKeyPress}
                      disabled={isSending}
                    />
                    <Button
                      variant="contained"
                      color="primary"
                      onClick={handleSend}
                      disabled={!inputValue.trim() || isSending}
                      startIcon={isSending ? <CircularProgress size={20} /> : <SendIcon />}
                    >
                      {isSending ? t('ai.business_copilot.sending') : t('ai.business_copilot.send')}
                    </Button>
                  </Stack>
                </Box>
              </Paper>
            </Grid>

            {/* 侧边栏：快捷操作和会话信息 */}
            <Grid item xs={12} md={4}>
              <Stack spacing={2}>
                {/* 会话信息 */}
                <Card>
                  <CardContent>
                    <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <SmartToyIcon fontSize="small" />
                      会话信息
                    </Typography>
                    {session ? (
                      <Box>
                        <Typography variant="body2" color="text.secondary">
                          会话 ID: {session.session_id.slice(0, 8)}...
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          消息数: {session.conversation_history.length}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          当前模块: {session.module}
                        </Typography>
                        <Button
                          size="small"
                          color="error"
                          startIcon={<ClearIcon />}
                          onClick={clearSession}
                          sx={{ mt: 1 }}
                        >
                          清除会话
                        </Button>
                      </Box>
                    ) : (
                      <Typography variant="body2" color="text.secondary">
                        暂无会话
                      </Typography>
                    )}
                  </CardContent>
                </Card>

                {/* 快捷操作 */}
                {moduleConfig && moduleConfig.quick_actions.length > 0 && (
                  <Card>
                    <CardContent>
                      <Typography variant="h6" gutterBottom>
                        快捷操作
                      </Typography>
                      <Stack spacing={1}>
                        {moduleConfig.quick_actions.slice(0, 5).map((action) => (
                          <Button
                            key={action.action_id}
                            variant="outlined"
                            size="small"
                            fullWidth
                            onClick={() => send(action.preset_prompt)}
                          >
                            {action.label}
                          </Button>
                        ))}
                      </Stack>
                    </CardContent>
                  </Card>
                )}
              </Stack>
            </Grid>
          </Grid>
        )}

        {/* 智能表单 */}
        {activeTab === 'form' && (
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 3 }}>
              <BuildIcon />
              智能表单 - {sampleForm.name}
            </Typography>
            <SmartFormRenderer
              form={sampleForm}
              onSubmit={handleFormSubmit}
              onSaveDraft={handleFormSaveDraft}
            />
          </Paper>
        )}

        {/* 文档智能 */}
        {activeTab === 'document' && (
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 3 }}>
              <DescriptionIcon />
              文档智能处理
            </Typography>
            <DocumentIntelligence
              document={sampleDocument}
              summary={sampleSummary}
              onUpload={handleDocumentUpload}
              onGenerateSummary={handleGenerateSummary}
              onParse={handleParseDocument}
            />
          </Paper>
        )}

        {/* 治理仪表盘 */}
        {activeTab === 'governance' && (
          <Paper sx={{ p: 3 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
              <Typography variant="h6" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <DashboardIcon />
                AI 治理仪表盘
              </Typography>
              <Button
                startIcon={<RefreshIcon />}
                onClick={() => window.location.reload()}
              >
                刷新
              </Button>
            </Box>
            <GovernanceDashboard data={{
              overall_score: 0,
              governance_level: 'N/A',
              key_metrics: {
                total_requests: 0,
                successful_requests: 0,
                failed_requests: 0,
                success_rate: 0,
                total_tokens: 0,
                average_response_ms: 0,
                p95_response_ms: 0,
                active_users: 0,
                active_agents: 0,
                total_tool_calls: 0,
                cache_hit_rate: 0,
              },
              risk_assessment: {
                overall_risk_level: 'low',
                risk_score: 0,
                high_risk_items: [],
              },
              compliance_status: {
                overall_compliance_rate: 0,
                total_checks: 0,
                passed_checks: 0,
                failed_checks: 0,
              },
              cost_analysis: {
                total_cost: 0,
                currency: 'USD',
                llm_cost: 0,
                tool_cost: 0,
                budget_usage: {
                  total_budget: 0,
                  used_amount: 0,
                  usage_percent: 0,
                  is_over_budget: false,
                },
              },
            }} />
          </Paper>
        )}
      </Box>
    </Container>
  );
};

export default BusinessCopilotPage;
