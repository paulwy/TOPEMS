import React, { useState } from 'react';
import {
  Box,
  Typography,
  Button,
  Paper,
  Tabs,
  Tab,
  Card,
  CardContent,
  Avatar,
  Divider,
  Chip,
  IconButton,
  Switch,
  Slider,
  TextField,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
} from '@mui/material';
import {
  Settings,
  BarChart3,
  Cpu,
  CheckCircle2,
  AlertCircle,
  Clock,
  Zap,
  DollarSign,
  Database,
  RefreshCw,
  Edit3,
  Save,
  TrendingUp,
  Activity,
  Layers,
  Server,
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { PageContainer, Grid } from '@/components/common';
import { useNotificationStore } from '@/store';
import { designTokens } from '@/theme/tokens';
import { LazyChart } from '@/components/charts';
import i18n from '@/i18n';

const ct= designTokens.colors;

type SettingsTab = 'models' | 'config' | 'usage' | 'api';

interface AIModel {
  id: string;
  name: string;
  provider: string;
  type: 'chat' | 'embedding' | 'image' | 'audio';
  description: string;
  status: 'active' | 'inactive' | 'maintenance';
  max_tokens: number;
  capabilities: string[];
  pricing: {
    input_per_1k: number;
    output_per_1k: number;
  };
  is_default: boolean;
}

const mockModels: AIModel[] = [
  {
    id: 'gpt-4',
    name: 'GPT-4',
    provider: 'OpenAI',
    type: 'chat',
    description: i18n.t('ai.ai_model_settings_page.k0'),
    status: 'active',
    max_tokens: 8192,
    capabilities: [i18n.t('ai.ai_model_settings_page.k4'), i18n.t('ai.ai_model_settings_page.k3'), i18n.t('ai.ai_model_settings_page.k2'), i18n.t('ai.ai_model_settings_page.k1')],
    pricing: { input_per_1k: 0.03, output_per_1k: 0.06 },
    is_default: true,
  },
  {
    id: 'gpt-3.5-turbo',
    name: 'GPT-3.5 Turbo',
    provider: 'OpenAI',
    type: 'chat',
    description: i18n.t('ai.ai_model_settings_page.k5'),
    status: 'active',
    max_tokens: 16384,
    capabilities: [i18n.t('ai.ai_model_settings_page.k8'), i18n.t('ai.ai_model_settings_page.k7'), i18n.t('ai.ai_model_settings_page.k6')],
    pricing: { input_per_1k: 0.0015, output_per_1k: 0.002 },
    is_default: false,
  },
  {
    id: 'claude-3-opus',
    name: 'Claude 3 Opus',
    provider: 'Anthropic',
    type: 'chat',
    description: i18n.t('pages.ai_model_settings_page.k0'),
    status: 'active',
    max_tokens: 200000,
    capabilities: [i18n.t('ai.ai_model_settings_page.k12'), i18n.t('ai.ai_model_settings_page.k11'), i18n.t('ai.ai_model_settings_page.k10'), i18n.t('ai.ai_model_settings_page.k9')],
    pricing: { input_per_1k: 0.015, output_per_1k: 0.075 },
    is_default: false,
  },
  {
    id: 'ernie-4.0',
    name: i18n.t('pages.ai_model_settings_page.40_1'),
    provider: i18n.t('ai.ai_model_settings_page.k13'),
    type: 'chat',
    description: i18n.t('ai.ai_model_settings_page.k14'),
    status: 'active',
    max_tokens: 8192,
    capabilities: [i18n.t('ai.ai_model_settings_page.k17'), i18n.t('ai.ai_model_settings_page.k16'), i18n.t('ai.ai_model_settings_page.k15')],
    pricing: { input_per_1k: 0.008, output_per_1k: 0.008 },
    is_default: false,
  },
  {
    id: 'qwen-max',
    name: i18n.t('ai.ai_model_settings_page.max_18'),
    provider: i18n.t('ai.ai_model_settings_page.k19'),
    type: 'chat',
    description: i18n.t('ai.ai_model_settings_page.k20'),
    status: 'active',
    max_tokens: 32768,
    capabilities: [i18n.t('ai.ai_model_settings_page.k23'), i18n.t('ai.ai_model_settings_page.k22'), i18n.t('ai.ai_model_settings_page.k21')],
    pricing: { input_per_1k: 0.004, output_per_1k: 0.008 },
    is_default: false,
  },
  {
    id: 'text-embedding-3-large',
    name: 'Text Embedding 3 Large',
    provider: 'OpenAI',
    type: 'embedding',
    description: i18n.t('ai.ai_model_settings_page.k24'),
    status: 'active',
    max_tokens: 8192,
    capabilities: [i18n.t('ai.ai_model_settings_page.k26'), i18n.t('ai.ai_model_settings_page.k25')],
    pricing: { input_per_1k: 0.00013, output_per_1k: 0 },
    is_default: false,
  },
];

const usageData = [
  { date: '06-15', tokens: 45000, cost: 2.5, requests: 320 },
  { date: '06-16', tokens: 58000, cost: 3.2, requests: 410 },
  { date: '06-17', tokens: 52000, cost: 2.9, requests: 380 },
  { date: '06-18', tokens: 67000, cost: 3.8, requests: 450 },
  { date: '06-19', tokens: 72000, cost: 4.1, requests: 520 },
  { date: '06-20', tokens: 61000, cost: 3.5, requests: 430 },
  { date: '06-21', tokens: 80000, cost: 4.6, requests: 580 },
];

const modelUsageData = [
  { name: 'GPT-4', value: 35 },
  { name: 'GPT-3.5', value: 40 },
  { name: 'Claude', value: 15 },
  { name: i18n.t('ai.ai_model_settings_page.k27'), value: 6 },
  { name: i18n.t('ai.ai_model_settings_page.k28'), value: 4 },
];

const getStatusConfig = (status: AIModel['status'], t: (key: string) => string) => {
  const configs = {
    active: {
      label: i18n.t('ai.model_settings.status.active'),
      color: 'success' as const,
      icon: <CheckCircle2 size={14} />,
    },
    inactive: {
      label: i18n.t('ai.model_settings.status.inactive'),
      color: 'default' as const,
      icon: <Clock size={14} />,
    },
    maintenance: {
      label: i18n.t('ai.model_settings.status.maintenance'),
      color: 'warning' as const,
      icon: <AlertCircle size={14} />,
    },
  };
  return configs[status];
};

export const AiModelSettingsPage: React.FC = () => {
  const addNotification = useNotificationStore((state) => state.addNotification);
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState<SettingsTab>('models');
  const [selectedModel, setSelectedModel] = useState<AIModel>(mockModels[0]);
  const [temperature, setTemperature] = useState(0.7);
  const [maxTokens, setMaxTokens] = useState(2048);
  const [topP, setTopP] = useState(1);
  const [systemPrompt, setSystemPrompt] = useState(
    i18n.t('ai.ai_model_settings_page.k29')
  );
  const [saving, setSaving] = useState(false);

  const handleSaveConfig = () => {
    setSaving(true);
    setTimeout(() => {
      setSaving(false);
      addNotification({
        title: i18n.t('ai.model_settings.message.save_success_title'),
        message: i18n.t('ai.model_settings.message.save_success_body'),
        type: 'success',
      });
    }, 1000);
  };

  const totalUsage = {
    tokens: usageData.reduce((sum, d) => sum + d.tokens, 0),
    cost: usageData.reduce((sum, d) => sum + d.cost, 0),
    requests: usageData.reduce((sum, d) => sum + d.requests, 0),
  };

  const tabConfig = [
    {
      id: 'models' as SettingsTab,
      label: i18n.t('ai.model_settings.tab.models'),
      icon: <Cpu size={18} />,
    },
    {
      id: 'config' as SettingsTab,
      label: i18n.t('ai.model_settings.tab.config'),
      icon: <Settings size={18} />,
    },
    {
      id: 'usage' as SettingsTab,
      label: i18n.t('ai.model_settings.tab.usage'),
      icon: <BarChart3 size={18} />,
    },
    {
      id: 'api' as SettingsTab,
      label: i18n.t('ai.model_settings.tab.api'),
      icon: <Database size={18} />,
    },
  ];

  return (
    <PageContainer
      title={i18n.t('ai.model_settings.title')}
      subtitle={i18n.t('ai.model_settings.subtitle')}
      padding={false}
      maxWidth={false}
      headerProps={{
        pageIcon: <Settings style={{ width: 20, height: 20 }} />,
        pageGradient: `linear-gradient(135deg, ${ct.pink[300]} 0%, ${ct.pink[100]} 100%)`,
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
            {/* 模型列表 */}
            {activeTab === 'models' && (
              <Box>
                <Grid
                  container
                  spacing={2}
                >
                  {mockModels.map((model) => (
                    <Grid
                      item
                      xs={12}
                      md={6}
                      lg={4}
                      key={model.id}
                    >
                      <Card
                        variant='outlined'
                        sx={{
                          borderRadius: 3,
                          borderColor: selectedModel.id === model.id ? 'primary.main' : 'divider',
                          cursor: 'pointer',
                          transition: 'all 0.2s',
                          '&:hover': {
                            boxShadow: 2,
                          },
                        }}
                        onClick={() => setSelectedModel(model)}
                      >
                        <CardContent sx={{ p: 2.5, '&:last-child': { pb: 2.5 } }}>
                          <Box
                            sx={{
                              display: 'flex',
                              justifyContent: 'space-between',
                              alignItems: 'flex-start',
                              mb: 2,
                            }}
                          >
                            <Avatar
                              sx={{
                                width: 48,
                                height: 48,
                                bgcolor: model.type === 'chat' ? 'primary.50' : 'success.50',
                                color: model.type === 'chat' ? 'primary.main' : 'success.main',
                              }}
                            >
                              {model.type === 'chat' ? <Cpu size={24} /> : <Layers size={24} />}
                            </Avatar>
                            <Chip
                              icon={getStatusConfig(model.status, t).icon}
                              label={getStatusConfig(model.status, t).label}
                              size='small'
                              color={getStatusConfig(model.status, t).color}
                              sx={{ height: 24 }}
                            />
                          </Box>

                          <Box sx={{ mb: 1 }}>
                            <Typography
                              variant='subtitle1'
                              sx={{ fontWeight: 600 }}
                            >
                              {model.name}
                              {model.is_default && (
                                <Chip
                                  label={i18n.t('ai.model_settings.label.default')}
                                  size='small'
                                  color='primary'
                                  sx={{ ml: 1, height: 20 }}
                                />
                              )}
                            </Typography>
                            <Typography
                              variant='caption'
                              color='text.secondary'
                            >
                              {model.provider}
                            </Typography>
                          </Box>

                          <Typography
                            variant='body2'
                            color='text.secondary'
                            sx={{ mb: 2, minHeight: 40 }}
                          >
                            {model.description}
                          </Typography>

                          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, mb: 2 }}>
                            {model.capabilities.map((cap) => (
                              <Chip
                                key={cap}
                                label={cap}
                                size='small'
                                variant='outlined'
                                sx={{ fontSize: 11 }}
                              />
                            ))}
                          </Box>

                          <Divider sx={{ mb: 1.5 }} />

                          <Grid
                            container
                            spacing={1}
                          >
                            <Grid
                              item
                              xs={6}
                            >
                              <Typography
                                variant='caption'
                                color='text.secondary'
                              >
                                {i18n.t('ai.model_settings.label.max_token')}
                              </Typography>
                              <Typography
                                variant='body2'
                                sx={{ fontWeight: 500 }}
                              >
                                {model.max_tokens.toLocaleString()}
                              </Typography>
                            </Grid>
                            <Grid
                              item
                              xs={6}
                            >
                              <Typography
                                variant='caption'
                                color='text.secondary'
                              >
                                {i18n.t('ai.model_settings.label.input_price')}
                              </Typography>
                              <Typography
                                variant='body2'
                                sx={{ fontWeight: 500 }}
                              >
                                ${model.pricing.input_per_1k}/1K
                              </Typography>
                            </Grid>
                          </Grid>
                        </CardContent>
                      </Card>
                    </Grid>
                  ))}
                </Grid>
              </Box>
            )}

            {/* 参数配置 */}
            {activeTab === 'config' && (
              <Grid
                container
                spacing={3}
              >
                <Grid
                  item
                  xs={12}
                  md={8}
                >
                  <Paper
                    variant='outlined'
                    sx={{ p: 3, borderRadius: 3 }}
                  >
                    <Typography
                      variant='h6'
                      sx={{ fontWeight: 600, mb: 2 }}
                    >
                      {i18n.t('ai.model_settings.label.current_model')}
                      {selectedModel.name}
                    </Typography>
                    <Divider sx={{ mb: 3 }} />

                    <Box sx={{ mb: 3 }}>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                        <Typography
                          variant='body2'
                          sx={{ fontWeight: 500 }}
                        >
                          {i18n.t('ai.model_settings.param.temperature')}
                        </Typography>
                        <Typography
                          variant='body2'
                          color='primary.main'
                          sx={{ fontWeight: 600 }}
                        >
                          {temperature.toFixed(1)}
                        </Typography>
                      </Box>
                      <Slider
                        value={temperature}
                        onChange={(_, v) => setTemperature(v as number)}
                        step={0.1}
                        min={0}
                        max={2}
                        valueLabelDisplay='auto'
                      />
                      <Typography
                        variant='caption'
                        color='text.secondary'
                      >
                        {i18n.t('ai.model_settings.param.temperature_desc')}
                      </Typography>
                    </Box>

                    <Box sx={{ mb: 3 }}>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                        <Typography
                          variant='body2'
                          sx={{ fontWeight: 500 }}
                        >
                          {i18n.t('ai.model_settings.param.max_tokens')}
                        </Typography>
                        <Typography
                          variant='body2'
                          color='primary.main'
                          sx={{ fontWeight: 600 }}
                        >
                          {maxTokens}
                        </Typography>
                      </Box>
                      <Slider
                        value={maxTokens}
                        onChange={(_, v) => setMaxTokens(v as number)}
                        step={128}
                        min={256}
                        max={selectedModel.max_tokens}
                        valueLabelDisplay='auto'
                      />
                      <Typography
                        variant='caption'
                        color='text.secondary'
                      >
                        {i18n.t('ai.model_settings.param.max_tokens_desc')}
                      </Typography>
                    </Box>

                    <Box sx={{ mb: 3 }}>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                        <Typography
                          variant='body2'
                          sx={{ fontWeight: 500 }}
                        >
                          {i18n.t('ai.model_settings.param.top_p')}
                        </Typography>
                        <Typography
                          variant='body2'
                          color='primary.main'
                          sx={{ fontWeight: 600 }}
                        >
                          {topP.toFixed(1)}
                        </Typography>
                      </Box>
                      <Slider
                        value={topP}
                        onChange={(_, v) => setTopP(v as number)}
                        step={0.1}
                        min={0}
                        max={1}
                        valueLabelDisplay='auto'
                      />
                      <Typography
                        variant='caption'
                        color='text.secondary'
                      >
                        {i18n.t('ai.model_settings.param.top_p_desc')}
                      </Typography>
                    </Box>

                    <Box sx={{ mb: 3 }}>
                      <Typography
                        variant='body2'
                        sx={{ fontWeight: 500, mb: 1 }}
                      >
                        {i18n.t('ai.model_settings.param.system_prompt')}
                      </Typography>
                      <TextField
                        fullWidth
                        multiline
                        rows={4}
                        value={systemPrompt}
                        onChange={(e) => setSystemPrompt(e.target.value)}
                        placeholder={i18n.t('ai.model_settings.placeholder.system_prompt')}
                      />
                    </Box>

                    <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 1 }}>
                      <Button
                        variant='outlined'
                        startIcon={<RefreshCw size={16} />}
                      >
                        {i18n.t('ai.model_settings.action.reset_default')}
                      </Button>
                      <Button
                        variant='contained'
                        startIcon={
                          saving ? (
                            <RefreshCw
                              size={16}
                              className='animate-spin'
                            />
                          ) : (
                            <Save size={16} />
                          )
                        }
                        onClick={handleSaveConfig}
                        disabled={saving}
                      >
                        {saving
                          ? i18n.t('ai.model_settings.status.saving')
                          : i18n.t('ai.model_settings.action.save_config')}
                      </Button>
                    </Box>
                  </Paper>
                </Grid>

                <Grid
                  item
                  xs={12}
                  md={4}
                >
                  <Paper
                    variant='outlined'
                    sx={{ p: 3, borderRadius: 3 }}
                  >
                    <Typography
                      variant='subtitle1'
                      sx={{ fontWeight: 600, mb: 2 }}
                    >
                      {i18n.t('ai.model_settings.label.other_settings')}
                    </Typography>
                    <Divider sx={{ mb: 2 }} />

                    <List disablePadding>
                      <ListItem sx={{ px: 0 }}>
                        <ListItemIcon sx={{ minWidth: 36 }}>
                          <Server size={18} />
                        </ListItemIcon>
                        <ListItemText
                          primary={i18n.t('ai.model_settings.setting.stream')}
                          secondary={i18n.t('ai.model_settings.setting.stream_desc')}
                        />
                        <Switch defaultChecked />
                      </ListItem>
                      <ListItem sx={{ px: 0 }}>
                        <ListItemIcon sx={{ minWidth: 36 }}>
                          <Activity size={18} />
                        </ListItemIcon>
                        <ListItemText
                          primary={i18n.t('ai.model_settings.setting.history')}
                          secondary={i18n.t('ai.model_settings.setting.history_desc')}
                        />
                        <Switch defaultChecked />
                      </ListItem>
                      <ListItem sx={{ px: 0 }}>
                        <ListItemIcon sx={{ minWidth: 36 }}>
                          <Zap size={18} />
                        </ListItemIcon>
                        <ListItemText
                          primary={i18n.t('ai.model_settings.setting.retry')}
                          secondary={i18n.t('ai.model_settings.setting.retry_desc')}
                        />
                        <Switch defaultChecked />
                      </ListItem>
                    </List>
                  </Paper>
                </Grid>
              </Grid>
            )}

            {/* 用量统计 */}
            {activeTab === 'usage' && (
              <Box>
                {/* 统计卡片 */}
                <Grid
                  container
                  spacing={2}
                  sx={{ mb: 3 }}
                >
                  <Grid
                    item
                    xs={12}
                    sm={4}
                  >
                    <Paper sx={{ p: 2.5, borderRadius: 3 }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                        <Avatar sx={{ bgcolor: 'primary.50', color: 'primary.main' }}>
                          <Zap size={22} />
                        </Avatar>
                        <Box>
                          <Typography
                            variant='h5'
                            sx={{ fontWeight: 700 }}
                          >
                            {Math.round(totalUsage.tokens / 1000)}K
                          </Typography>
                          <Typography
                            variant='body2'
                            color='text.secondary'
                          >
                            {i18n.t('ai.model_settings.usage.total_tokens')}
                          </Typography>
                        </Box>
                      </Box>
                    </Paper>
                  </Grid>
                  <Grid
                    item
                    xs={12}
                    sm={4}
                  >
                    <Paper sx={{ p: 2.5, borderRadius: 3 }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                        <Avatar sx={{ bgcolor: 'success.50', color: 'success.main' }}>
                          <TrendingUp size={22} />
                        </Avatar>
                        <Box>
                          <Typography
                            variant='h5'
                            sx={{ fontWeight: 700 }}
                          >
                            {totalUsage.requests}
                          </Typography>
                          <Typography
                            variant='body2'
                            color='text.secondary'
                          >
                            {i18n.t('ai.model_settings.usage.total_requests')}
                          </Typography>
                        </Box>
                      </Box>
                    </Paper>
                  </Grid>
                  <Grid
                    item
                    xs={12}
                    sm={4}
                  >
                    <Paper sx={{ p: 2.5, borderRadius: 3 }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                        <Avatar sx={{ bgcolor: 'warning.50', color: 'warning.main' }}>
                          <DollarSign size={22} />
                        </Avatar>
                        <Box>
                          <Typography
                            variant='h5'
                            sx={{ fontWeight: 700 }}
                          >
                            ${totalUsage.cost.toFixed(2)}
                          </Typography>
                          <Typography
                            variant='body2'
                            color='text.secondary'
                          >
                            {i18n.t('ai.model_settings.usage.total_cost')}
                          </Typography>
                        </Box>
                      </Box>
                    </Paper>
                  </Grid>
                </Grid>

                <Grid
                  container
                  spacing={3}
                >
                  <Grid
                    item
                    xs={12}
                    md={8}
                  >
                    <Paper
                      variant='outlined'
                      sx={{ p: 3, borderRadius: 3 }}
                    >
                      <Typography
                        variant='subtitle1'
                        sx={{ fontWeight: 600, mb: 2 }}
                      >
                        {i18n.t('ai.model_settings.usage.trend_7days')}
                      </Typography>
                      <Box sx={{ height: 300 }}>
                        <LazyChart type='line'
                          data={usageData}
                          xKey='date'
                          yKey='tokens'
                        />
                      </Box>
                    </Paper>
                  </Grid>
                  <Grid
                    item
                    xs={12}
                    md={4}
                  >
                    <Paper
                      variant='outlined'
                      sx={{ p: 3, borderRadius: 3 }}
                    >
                      <Typography
                        variant='subtitle1'
                        sx={{ fontWeight: 600, mb: 2 }}
                      >
                        {i18n.t('ai.model_settings.usage.model_ratio')}
                      </Typography>
                      <Box sx={{ height: 300 }}>
                        <LazyChart type='pie' data={modelUsageData} />
                      </Box>
                    </Paper>
                  </Grid>
                </Grid>

                <Box sx={{ mt: 3 }}>
                  <Paper
                    variant='outlined'
                    sx={{ borderRadius: 3, overflow: 'hidden' }}
                  >
                    <Box sx={{ p: 2, borderBottom: 1, borderColor: 'divider' }}>
                      <Typography
                        variant='subtitle1'
                        sx={{ fontWeight: 600 }}
                      >
                        {i18n.t('ai.model_settings.usage.daily_detail')}
                      </Typography>
                    </Box>
                    <TableContainer>
                      <Table size='small'>
                        <TableHead>
                          <TableRow>
                            <TableCell>{i18n.t('ai.model_settings.table.date')}</TableCell>
                            <TableCell align='right'>
                              {i18n.t('ai.model_settings.table.requests')}
                            </TableCell>
                            <TableCell align='right'>
                              {i18n.t('ai.model_settings.table.tokens')}
                            </TableCell>
                            <TableCell align='right'>{i18n.t('ai.model_settings.table.cost')}</TableCell>
                          </TableRow>
                        </TableHead>
                        <TableBody>
                          {usageData.map((row) => (
                            <TableRow key={row.date}>
                              <TableCell>{row.date}</TableCell>
                              <TableCell align='right'>{row.requests}</TableCell>
                              <TableCell align='right'>{row.tokens.toLocaleString()}</TableCell>
                              <TableCell align='right'>${row.cost.toFixed(2)}</TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </TableContainer>
                  </Paper>
                </Box>
              </Box>
            )}

            {/* API密钥 */}
            {activeTab === 'api' && (
              <Box>
                <Paper
                  variant='outlined'
                  sx={{ p: 3, borderRadius: 3, mb: 3 }}
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
                      {i18n.t('ai.model_settings.api.key_management')}
                    </Typography>
                    <Button
                      variant='contained'
                      startIcon={<Edit3 size={16} />}
                      size='small'
                    >
                      {i18n.t('ai.model_settings.api.add_key')}
                    </Button>
                  </Box>
                  <Divider sx={{ mb: 2 }} />

                  <TableContainer>
                    <Table size='small'>
                      <TableHead>
                        <TableRow>
                          <TableCell>{i18n.t('ai.model_settings.api.table.name')}</TableCell>
                          <TableCell>{i18n.t('ai.model_settings.api.table.key')}</TableCell>
                          <TableCell>{i18n.t('ai.model_settings.api.table.provider')}</TableCell>
                          <TableCell>{i18n.t('ai.model_settings.api.table.status')}</TableCell>
                          <TableCell>{i18n.t('ai.model_settings.api.table.created')}</TableCell>
                          <TableCell align='right'>
                            {i18n.t('ai.model_settings.api.table.actions')}
                          </TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        <TableRow>
                          <TableCell sx={{ fontWeight: 500 }}>
                            {i18n.t('ai.model_settings.api.key_production')}
                          </TableCell>
                          <TableCell>
                            <code>sk-****************************</code>
                          </TableCell>
                          <TableCell>OpenAI</TableCell>
                          <TableCell>
                            <Chip
                              label={i18n.t('ai.model_settings.api.status_enabled')}
                              size='small'
                              color='success'
                              sx={{ height: 22 }}
                            />
                          </TableCell>
                          <TableCell>2024-01-15</TableCell>
                          <TableCell align='right'>
                            <IconButton
                              size='small'
                              aria-label={i18n.t('ai.model_settings.api.action.edit')}
                            >
                              <Edit3 size={16} />
                            </IconButton>
                          </TableCell>
                        </TableRow>
                        <TableRow>
                          <TableCell sx={{ fontWeight: 500 }}>
                            {i18n.t('ai.model_settings.api.key_backup')}
                          </TableCell>
                          <TableCell>
                            <code>sk-****************************</code>
                          </TableCell>
                          <TableCell>OpenAI</TableCell>
                          <TableCell>
                            <Chip
                              label={i18n.t('ai.model_settings.api.status_enabled')}
                              size='small'
                              color='success'
                              sx={{ height: 22 }}
                            />
                          </TableCell>
                          <TableCell>2024-03-20</TableCell>
                          <TableCell align='right'>
                            <IconButton
                              size='small'
                              aria-label={i18n.t('ai.model_settings.api.action.edit')}
                            >
                              <Edit3 size={16} />
                            </IconButton>
                          </TableCell>
                        </TableRow>
                        <TableRow>
                          <TableCell sx={{ fontWeight: 500 }}>
                            {i18n.t('ai.model_settings.api.key_ernie')}
                          </TableCell>
                          <TableCell>
                            <code>xx-****************************</code>
                          </TableCell>
                          <TableCell>{i18n.t('ai.model_settings.provider.baidu')}</TableCell>
                          <TableCell>
                            <Chip
                              label={i18n.t('ai.model_settings.api.status_enabled')}
                              size='small'
                              color='success'
                              sx={{ height: 22 }}
                            />
                          </TableCell>
                          <TableCell>2024-02-10</TableCell>
                          <TableCell align='right'>
                            <IconButton
                              size='small'
                              aria-label={i18n.t('ai.model_settings.api.action.edit')}
                            >
                              <Edit3 size={16} />
                            </IconButton>
                          </TableCell>
                        </TableRow>
                      </TableBody>
                    </Table>
                  </TableContainer>
                </Paper>

                <Paper
                  variant='outlined'
                  sx={{ p: 3, borderRadius: 3 }}
                >
                  <Typography
                    variant='subtitle1'
                    sx={{ fontWeight: 600, mb: 2 }}
                  >
                    {i18n.t('ai.model_settings.api.usage_tips')}
                  </Typography>
                  <List disablePadding>
                    <ListItem sx={{ px: 0, py: 1 }}>
                      <ListItemIcon sx={{ minWidth: 32 }}>
                        <AlertCircle
                          size={16}
                          style={{ color: ct.warning.main }}
                        />
                      </ListItemIcon>
                      <ListItemText
                        primary={
                          <Typography variant='body2'>
                            {i18n.t('ai.model_settings.api.tip_keep_safe')}
                          </Typography>
                        }
                      />
                    </ListItem>
                    <ListItem sx={{ px: 0, py: 1 }}>
                      <ListItemIcon sx={{ minWidth: 32 }}>
                        <AlertCircle
                          size={16}
                          style={{ color: ct.warning.main }}
                        />
                      </ListItemIcon>
                      <ListItemText
                        primary={
                          <Typography variant='body2'>
                            {i18n.t('ai.model_settings.api.tip_rotate_keys')}
                          </Typography>
                        }
                      />
                    </ListItem>
                    <ListItem sx={{ px: 0, py: 1 }}>
                      <ListItemIcon sx={{ minWidth: 32 }}>
                        <AlertCircle
                          size={16}
                          style={{ color: ct.warning.main }}
                        />
                      </ListItemIcon>
                      <ListItemText
                        primary={
                          <Typography variant='body2'>
                            {i18n.t('ai.model_settings.api.tip_multi_env')}
                          </Typography>
                        }
                      />
                    </ListItem>
                  </List>
                </Paper>
              </Box>
            )}
          </Box>
        </Paper>
      </Box>
    </PageContainer>
  );
};

export default AiModelSettingsPage;
