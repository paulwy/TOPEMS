import React, { useState, useEffect, useCallback } from 'react';
import {
  Box,
  Typography,
  IconButton,
  Button,
  Chip,
  Stack,
  Tabs,
  Tab,
  List,
  ListItem,
  ListItemText,
  LinearProgress,
  Switch,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Slider,
  Divider,
  Alert,
  Badge,
  Tooltip,
  Card,
  CardContent,
  Grid,
  TextField,
} from '@mui/material';
import {
  X as XIcon,
  Sparkles,
  Monitor,
  Heart,
  Settings,
  User,
  Activity,
  Zap,
  Eye,
  Touchpad,
  Palette,
  Accessibility,
  BarChart3,
  Brain,
  Lightbulb,
  ThumbsUp,
  ThumbsDown,
  RotateCcw,
  Play,
  Flame,
  Star,
  Layers,
  Gauge,
  Cpu,
  AlertCircle,
} from 'lucide-react';
import {
  smartRecommender,
  type Recommendation,
  type UserBehavior,
  type RecommendationStats,
} from './smart-recommender';
import {
  adaptiveInteraction,
  type InteractionProfile,
  type AdaptiveResponse,
  type ProficiencyLevel,
  type DeviceType,
} from './adaptive-interaction';
import {
  emotionalDesignEngine,
  type EmotionState,
  type DesignResponse,
  type EmotionType,
  type AnimationType,
} from './emotional-design';
import { designTokens, semanticTokens } from '@topems/tokens';

type PanelTab = 'recommendations' | 'adaptive' | 'emotion' | 'settings';

const SAMPLE_USER_ID = 'v58-demo-user';

const EMOTION_LABELS: Record<EmotionType, string> = {
  joy: '喜悦',
  trust: '信任',
  fear: '恐惧',
  surprise: '惊讶',
  sadness: '悲伤',
  disgust: '厌恶',
  anger: '愤怒',
  anticipation: '期待',
  frustration: '挫败',
  satisfaction: '满足',
  confusion: '困惑',
  boredom: '无聊',
  excitement: '兴奋',
  calm: '平静',
};

const ANIMATION_LABELS: Record<AnimationType, string> = {
  bounce: '弹跳',
  pulse: '脉冲',
  fade: '淡入淡出',
  slide: '滑动',
  shake: '抖动',
  glow: '发光',
  none: '无',
};

export const V58UXPanel: React.FC<{ onClose: () => void }> = ({ onClose }) => {
  const [activeTab, setActiveTab] = useState<PanelTab>('recommendations');
  const [userId] = useState(SAMPLE_USER_ID);

  const [recommendations, setRecommendations] = useState<Recommendation[]>([]);
  const [trending, setTrending] = useState<Recommendation[]>([]);
  const [recStats, setRecStats] = useState<RecommendationStats | null>(null);

  const [profile, setProfile] = useState<InteractionProfile | null>(null);
  const [adaptation, setAdaptation] = useState<AdaptiveResponse | null>(null);

  const [emotionState, setEmotionState] = useState<EmotionState | null>(null);
  const [designResponse, setDesignResponse] = useState<DesignResponse | null>(null);

  const [isSimulating, setIsSimulating] = useState(false);

  const loadRecommendations = useCallback(() => {
    const recs = smartRecommender.getRecommendations(userId, { source: 'v58-panel' }, 6);
    const trend = smartRecommender.getTrending(5);
    const stats = smartRecommender.getRecommendationStats();
    setRecommendations(recs);
    setTrending(trend);
    setRecStats(stats);
  }, [userId]);

  const loadAdaptation = useCallback(() => {
    const p = adaptiveInteraction.getInteractionProfile(userId);
    const adapted = adaptiveInteraction.adaptInterface(userId, { source: 'v58-panel' });
    setProfile(p);
    setAdaptation(adapted);
  }, [userId]);

  const loadEmotion = useCallback(() => {
    const state = emotionalDesignEngine.getEmotionalState(userId);
    if (state) {
      setEmotionState(state);
      const response = emotionalDesignEngine.getDesignResponse(state);
      setDesignResponse(response);
    } else {
      const initialState = emotionalDesignEngine.detectEmotion({
        success: 0.6,
        achievement: 0.4,
        focus_flow: 0.3,
      });
      const response = emotionalDesignEngine.respondToEmotion(initialState, userId);
      setEmotionState(initialState);
      setDesignResponse(response);
    }
  }, [userId]);

  const simulateBehavior = useCallback(() => {
    const actions = [
      { action: 'view', target: 'dashboard-main' },
      { action: 'view', target: 'crm-dashboard' },
      { action: 'click', target: 'deep-analyze' },
      { action: 'view', target: 'quality-report' },
      { action: 'click', target: 'ai-assistant' },
      { action: 'view', target: 'financial-report' },
      { action: 'click', target: 'quick-approve' },
    ];

    setIsSimulating(true);
    let delay = 0;

    actions.forEach((a, idx) => {
      setTimeout(() => {
        const behavior: UserBehavior = {
          userId,
          action: a.action,
          target: a.target,
          timestamp: Date.now() + idx * 1000,
          sessionId: `v58-sim-${Date.now()}`,
        };
        smartRecommender.recordBehavior(behavior);

        if (idx === actions.length - 1) {
          loadRecommendations();
          loadAdaptation();
          setIsSimulating(false);
        }
      }, delay);
      delay += 200;
    });
  }, [userId, loadRecommendations, loadAdaptation]);

  const simulateEmotion = useCallback(
    (signalKey: string, signalValue: number) => {
      const signals: Record<string, number> = { [signalKey]: signalValue };
      const state = emotionalDesignEngine.detectEmotion(signals, { trigger: 'manual' });
      const response = emotionalDesignEngine.respondToEmotion(state, userId);
      setEmotionState(state);
      setDesignResponse(response);
    },
    [userId]
  );

  useEffect(() => {
    loadRecommendations();
    loadAdaptation();
    loadEmotion();
  }, [loadRecommendations, loadAdaptation, loadEmotion]);

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
      }}
      onClick={onClose}
    >
      <Box
        sx={{
          width: '96%',
          maxWidth: 1500,
          maxHeight: '94vh',
          bgcolor: 'background.paper',
          borderRadius: 2,
          overflow: 'hidden',
          boxShadow: designTokens.darkShadows.xl,
          display: 'flex',
          flexDirection: 'column',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <Box
          sx={{
            p: 2,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            background: `linear-gradient(135deg, ${designTokens.colors.cyan['500']}, ${designTokens.colors.cyan['600']}, ${designTokens.colors.cyan['700']})`,
            bgcolor: `linear-gradient(135deg, ${designTokens.colors.cyan['500']}, ${designTokens.colors.cyan['600']}, ${designTokens.colors.cyan['700']})`,
            color: 'common.white',
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <Brain size={24} />
            <Typography
              variant='h6'
              sx={{ fontWeight: 600 }}
            >
              V58.0 AI UX — 智能推荐 · 自适应交互 · 情感化设计
            </Typography>
          </Box>
          <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
            <Button
              size='small'
              variant='outlined'
              sx={{ borderColor: 'common.white', color: 'common.white' }}
              onClick={simulateBehavior}
              disabled={isSimulating}
            >
              <Play
                size={14}
                style={{ marginRight: 4 }}
              />
              {isSimulating ? '模拟中...' : '模拟用户行为'}
            </Button>
            <IconButton
              size='small'
              onClick={onClose}
              sx={{ color: 'common.white' }}
            >
              <XIcon size={20} />
            </IconButton>
          </Box>
        </Box>

        <Box sx={{ borderBottom: 1, borderColor: 'divider', px: 2 }}>
          <Tabs
            value={activeTab}
            onChange={(_, v) => setActiveTab(v as PanelTab)}
            variant='scrollable'
            scrollButtons='auto'
          >
            <Tab
              icon={<Sparkles size={16} />}
              iconPosition='start'
              label='智能推荐'
              value='recommendations'
            />
            <Tab
              icon={<Layers size={16} />}
              iconPosition='start'
              label='自适应交互'
              value='adaptive'
            />
            <Tab
              icon={<Heart size={16} />}
              iconPosition='start'
              label='情感化设计'
              value='emotion'
            />
            <Tab
              icon={<Settings size={16} />}
              iconPosition='start'
              label='个性化设置'
              value='settings'
            />
          </Tabs>
        </Box>

        <Box sx={{ overflow: 'auto', flex: 1, p: 2 }}>
          {activeTab === 'recommendations' && (
            <RecommendationsTab
              recommendations={recommendations}
              trending={trending}
              stats={recStats}
              onAccept={(id) => {
                smartRecommender.markAccepted(id);
                loadRecommendations();
              }}
              onReject={(id) => {
                smartRecommender.markRejected(id);
                loadRecommendations();
              }}
            />
          )}

          {activeTab === 'adaptive' && profile && adaptation && (
            <AdaptiveTab
              profile={profile}
              adaptation={adaptation}
              onUpdate={(p) => {
                adaptiveInteraction.updateProfile(userId, p);
                loadAdaptation();
              }}
            />
          )}

          {activeTab === 'emotion' && emotionState && designResponse && (
            <EmotionTab
              state={emotionState}
              response={designResponse}
              onSimulate={simulateEmotion}
            />
          )}

          {activeTab === 'settings' && profile && (
            <SettingsTab
              profile={profile}
              onUpdate={(p) => {
                adaptiveInteraction.updateProfile(userId, p);
                loadAdaptation();
              }}
              onReset={() => {
                adaptiveInteraction.resetProfile(userId);
                loadAdaptation();
              }}
            />
          )}
        </Box>
      </Box>
    </Box>
  );
};

const RecommendationsTab: React.FC<{
  recommendations: Recommendation[];
  trending: Recommendation[];
  stats: RecommendationStats | null;
  onAccept: (id: string) => void;
  onReject: (id: string) => void;
}> = ({ recommendations, trending, stats, onAccept, onReject }) => (
  <Grid
    container
    spacing={2}
  >
    <Grid size={{ xs: 12, md: 8 }}>
      <Card variant='outlined'>
        <CardContent>
          <Stack
            direction='row'
            spacing={1}
            sx={{ mb: 2, alignItems: 'center' }}
          >
            <Sparkles
              size={18}
              color='colors.cyan.600'
            />
            <Typography
              variant='subtitle2'
              sx={{ fontWeight: 600 }}
            >
              个性化推荐
            </Typography>
            <Chip
              size='small'
              label={`${recommendations.length} 条`}
              color='primary'
              variant='outlined'
            />
          </Stack>

          {recommendations.length === 0 ? (
            <Alert
              severity='info'
              variant='outlined'
            >
              暂无推荐。点击"模拟用户行为"开始生成推荐。
            </Alert>
          ) : (
            <List dense>
              {recommendations.map((rec) => (
                <ListItem
                  key={rec.id}
                  sx={{
                    border: '1px solid',
                    borderColor: 'divider',
                    borderRadius: 1,
                    mb: 1,
                    alignItems: 'flex-start',
                  }}
                >
                  <Box sx={{ flex: 1 }}>
                    <Stack
                      direction='row'
                      spacing={1}
                      sx={{ alignItems: 'center', mb: 0.5 }}
                    >
                      <Chip
                        size='small'
                        label={rec.type}
                        color='primary'
                        sx={{ textTransform: 'capitalize', height: 20 }}
                      />
                      <Typography
                        variant='body2'
                        sx={{ fontWeight: 500 }}
                      >
                        {rec.id}
                      </Typography>
                      <Tooltip title={`置信度: ${(rec.confidence * 100).toFixed(1)}%`}>
                        <Gauge
                          size={14}
                          color={
                            rec.confidence > 0.7
                              ? designTokens.colors.success.dark
                              : rec.confidence > 0.4
                                ? designTokens.colors.warning.main
                                : designTokens.colors.error.main
                          }
                        />
                      </Tooltip>
                    </Stack>
                    <Typography
                      variant='body2'
                      sx={{ color: 'text.secondary' }}
                    >
                      {rec.reason}
                    </Typography>
                    <Box sx={{ mt: 0.5 }}>
                      <LinearProgress
                        variant='determinate'
                        value={rec.confidence * 100}
                        sx={{ height: 4, borderRadius: 2 }}
                      />
                    </Box>
                  </Box>
                  <Box sx={{ display: 'flex', gap: 0.5, ml: 1 }}>
                    <Tooltip title='采纳'>
                      <IconButton
                        size='small'
                        color='success'
                        onClick={() => onAccept(rec.id)}
                      >
                        <ThumbsUp size={14} />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title='忽略'>
                      <IconButton
                        size='small'
                        color='error'
                        onClick={() => onReject(rec.id)}
                      >
                        <ThumbsDown size={14} />
                      </IconButton>
                    </Tooltip>
                  </Box>
                </ListItem>
              ))}
            </List>
          )}
        </CardContent>
      </Card>
    </Grid>

    <Grid size={{ xs: 12, md: 4 }}>
      <Stack spacing={2}>
        <Card variant='outlined'>
          <CardContent>
            <Stack
              direction='row'
              spacing={1}
              sx={{ mb: 2, alignItems: 'center' }}
            >
              <Flame
                size={18}
                color={`${designTokens.colors.orange['500']}`}
              />
              <Typography
                variant='subtitle2'
                sx={{ fontWeight: 600 }}
              >
                热门趋势
              </Typography>
            </Stack>
            {trending.length === 0 ? (
              <Typography
                variant='body2'
                sx={{ color: 'text.secondary' }}
              >
                暂无趋势数据
              </Typography>
            ) : (
              <List dense>
                {trending.map((t) => (
                  <ListItem
                    key={t.id}
                    sx={{ py: 0.5 }}
                  >
                    <ListItemText
                      primary={
                        <Typography
                          variant='body2'
                          noWrap
                        >
                          {t.reason}
                        </Typography>
                      }
                      secondary={`置信度: ${(t.confidence * 100).toFixed(0)}%`}
                    />
                  </ListItem>
                ))}
              </List>
            )}
          </CardContent>
        </Card>

        {stats && (
          <Card variant='outlined'>
            <CardContent>
              <Stack
                direction='row'
                spacing={1}
                sx={{ mb: 2, alignItems: 'center' }}
              >
                <BarChart3
                  size={18}
                  color='colors.cyan.600'
                />
                <Typography
                  variant='subtitle2'
                  sx={{ fontWeight: 600 }}
                >
                  统计概况
                </Typography>
              </Stack>
              <Grid
                container
                spacing={1}
              >
                <Grid size={6}>
                  <StatItem
                    label='总行为'
                    value={stats.total_recommendations}
                  />
                </Grid>
                <Grid size={6}>
                  <StatItem
                    label='已采纳'
                    value={stats.accepted_count}
                    color={designTokens.colors.success.dark}
                  />
                </Grid>
                <Grid size={6}>
                  <StatItem
                    label='已忽略'
                    value={stats.rejected_count}
                    color={designTokens.colors.error.main}
                  />
                </Grid>
                <Grid size={6}>
                  <StatItem
                    label='平均置信度'
                    value={`${(stats.avg_confidence * 100).toFixed(0)}%`}
                    color='colors.cyan.600'
                  />
                </Grid>
              </Grid>
              {stats.top_categories.length > 0 && (
                <>
                  <Divider sx={{ my: 1 }} />
                  <Typography
                    variant='caption'
                    sx={{ color: 'text.secondary', mb: 0.5 }}
                  >
                    热门类别
                  </Typography>
                  <Stack
                    direction='row'
                    spacing={0.5}
                    sx={{ flexWrap: 'wrap' }}
                  >
                    {stats.top_categories.map((c) => (
                      <Chip
                        key={c.type}
                        size='small'
                        label={`${c.type} (${c.count})`}
                        variant='outlined'
                        sx={{ fontSize: 11 }}
                      />
                    ))}
                  </Stack>
                </>
              )}
            </CardContent>
          </Card>
        )}
      </Stack>
    </Grid>
  </Grid>
);

const StatItem: React.FC<{ label: string; value: string | number; color?: string }> = ({
  label,
  value,
  color = 'text.primary',
}) => (
  <Box sx={{ textAlign: 'center', py: 0.5 }}>
    <Typography
      variant='h6'
      sx={{ color, fontWeight: 600, lineHeight: 1.2 }}
    >
      {value}
    </Typography>
    <Typography
      variant='caption'
      sx={{ color: 'text.secondary' }}
    >
      {label}
    </Typography>
  </Box>
);

const AdaptiveTab: React.FC<{
  profile: InteractionProfile;
  adaptation: AdaptiveResponse;
  onUpdate: (profile: InteractionProfile) => void;
}> = ({ profile, adaptation, onUpdate }) => {
  const handleDensityChange = (density: 'compact' | 'normal' | 'relaxed') => {
    onUpdate({
      ...profile,
      preferences: { ...profile.preferences, density },
    });
  };

  const handleFontSizeChange = (_: Event, value: number | number[]) => {
    onUpdate({
      ...profile,
      preferences: { ...profile.preferences, fontSize: value as number },
    });
  };

  const handleDeviceTypeChange = (type: DeviceType) => {
    onUpdate({
      ...profile,
      device: { ...profile.device, type },
    });
  };

  const handleProficiencyChange = (level: ProficiencyLevel) => {
    onUpdate({
      ...profile,
      proficiency_level: level,
    });
  };

  return (
    <Grid
      container
      spacing={2}
    >
      <Grid size={{ xs: 12, md: 6 }}>
        <Card variant='outlined'>
          <CardContent>
            <Stack
              direction='row'
              spacing={1}
              sx={{ mb: 2, alignItems: 'center' }}
            >
              <User
                size={18}
                color='colors.cyan.600'
              />
              <Typography
                variant='subtitle2'
                sx={{ fontWeight: 600 }}
              >
                交互画像
              </Typography>
              <Chip
                size='small'
                label={profile.proficiency_level}
                color='primary'
                sx={{ ml: 'auto' }}
              />
            </Stack>

            <Stack spacing={2}>
              <Box>
                <Typography
                  variant='caption'
                  sx={{ color: 'text.secondary', mb: 0.5 }}
                >
                  <Touchpad
                    size={12}
                    style={{ marginRight: 4 }}
                  />{' '}
                  设备类型
                </Typography>
                <Stack
                  direction='row'
                  spacing={1}
                >
                  {(['mobile', 'tablet', 'desktop'] as DeviceType[]).map((t) => (
                    <Button
                      key={t}
                      size='small'
                      variant={profile.device.type === t ? 'contained' : 'outlined'}
                      onClick={() => handleDeviceTypeChange(t)}
                    >
                      {t}
                    </Button>
                  ))}
                </Stack>
              </Box>

              <Box>
                <Typography
                  variant='caption'
                  sx={{ color: 'text.secondary', mb: 0.5 }}
                >
                  <Cpu
                    size={12}
                    style={{ marginRight: 4 }}
                  />{' '}
                  熟练度
                </Typography>
                <Stack
                  direction='row'
                  spacing={1}
                >
                  {(['beginner', 'intermediate', 'expert'] as ProficiencyLevel[]).map((l) => (
                    <Button
                      key={l}
                      size='small'
                      variant={profile.proficiency_level === l ? 'contained' : 'outlined'}
                      onClick={() => handleProficiencyChange(l)}
                    >
                      {l}
                    </Button>
                  ))}
                </Stack>
              </Box>

              <Box>
                <Typography
                  variant='caption'
                  sx={{ color: 'text.secondary', mb: 0.5 }}
                >
                  布局密度
                </Typography>
                <Stack
                  direction='row'
                  spacing={1}
                >
                  {(['compact', 'normal', 'relaxed'] as const).map((d) => (
                    <Button
                      key={d}
                      size='small'
                      variant={profile.preferences.density === d ? 'contained' : 'outlined'}
                      onClick={() => handleDensityChange(d)}
                    >
                      {d}
                    </Button>
                  ))}
                </Stack>
              </Box>

              <Box>
                <Typography
                  variant='caption'
                  sx={{ color: 'text.secondary', mb: 0.5 }}
                >
                  字体大小: {profile.preferences.fontSize}px
                </Typography>
                <Slider
                  value={profile.preferences.fontSize}
                  min={12}
                  max={20}
                  step={1}
                  onChange={handleFontSizeChange}
                  size='small'
                />
              </Box>

              <Box>
                <Typography
                  variant='caption'
                  sx={{ color: 'text.secondary', mb: 0.5 }}
                >
                  <Accessibility
                    size={12}
                    style={{ marginRight: 4 }}
                  />{' '}
                  辅助功能
                </Typography>
                <Stack
                  direction='row'
                  spacing={2}
                >
                  <FormControl
                    size='small'
                    variant='standard'
                    sx={{ minWidth: 120 }}
                  >
                    <InputLabel>主题</InputLabel>
                    <Select
                      value={profile.preferences.theme}
                      label='主题'
                      onChange={(e) =>
                        onUpdate({
                          ...profile,
                          preferences: {
                            ...profile.preferences,
                            theme: e.target.value as 'light' | 'dark' | 'auto',
                          },
                        })
                      }
                    >
                      <MenuItem value='light'>浅色</MenuItem>
                      <MenuItem value='dark'>深色</MenuItem>
                      <MenuItem value='auto'>自动</MenuItem>
                    </Select>
                  </FormControl>
                  <FormControl
                    size='small'
                    variant='standard'
                    sx={{ minWidth: 120 }}
                  >
                    <InputLabel>语言</InputLabel>
                    <Select
                      value={profile.preferences.language}
                      label='语言'
                      onChange={(e) =>
                        onUpdate({
                          ...profile,
                          preferences: {
                            ...profile.preferences,
                            language: e.target.value as string,
                          },
                        })
                      }
                    >
                      <MenuItem value='zh'>中文</MenuItem>
                      <MenuItem value='en'>English</MenuItem>
                    </Select>
                  </FormControl>
                </Stack>
              </Box>

              <Stack
                direction='row'
                spacing={2}
              >
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                  <Typography variant='caption'>减少动画</Typography>
                  <Switch
                    size='small'
                    checked={profile.preferences.reducedMotion}
                    onChange={(e) =>
                      onUpdate({
                        ...profile,
                        preferences: { ...profile.preferences, reducedMotion: e.target.checked },
                      })
                    }
                  />
                </Box>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                  <Typography variant='caption'>高对比度</Typography>
                  <Switch
                    size='small'
                    checked={profile.preferences.highContrast}
                    onChange={(e) =>
                      onUpdate({
                        ...profile,
                        preferences: { ...profile.preferences, highContrast: e.target.checked },
                      })
                    }
                  />
                </Box>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                  <Typography variant='caption'>大字体</Typography>
                  <Switch
                    size='small'
                    checked={profile.preferences.largeText}
                    onChange={(e) =>
                      onUpdate({
                        ...profile,
                        preferences: { ...profile.preferences, largeText: e.target.checked },
                      })
                    }
                  />
                </Box>
              </Stack>
            </Stack>
          </CardContent>
        </Card>
      </Grid>

      <Grid size={{ xs: 12, md: 6 }}>
        <Card variant='outlined'>
          <CardContent>
            <Stack
              direction='row'
              spacing={1}
              sx={{ mb: 2, alignItems: 'center' }}
            >
              <Monitor
                size={18}
                color={designTokens.colors.success.dark}
              />
              <Typography
                variant='subtitle2'
                sx={{ fontWeight: 600 }}
              >
                自适应响应
              </Typography>
              <Chip
                size='small'
                label={`置信度: ${(adaptation.confidence * 100).toFixed(1)}%`}
                color='success'
                variant='outlined'
                sx={{ ml: 'auto' }}
              />
            </Stack>

            <Alert
              severity='info'
              variant='outlined'
              sx={{ mb: 2 }}
            >
              {adaptation.reason}
            </Alert>

            <Grid
              container
              spacing={1}
            >
              <Grid size={6}>
                <InfoBlock
                  title='组件变体'
                  value={adaptation.component.variant}
                />
              </Grid>
              <Grid size={6}>
                <InfoBlock
                  title='组件尺寸'
                  value={adaptation.component.size}
                />
              </Grid>
              <Grid size={6}>
                <InfoBlock
                  title='布局模板'
                  value={adaptation.layout.template}
                />
              </Grid>
              <Grid size={6}>
                <InfoBlock
                  title='内容宽度'
                  value={adaptation.layout.contentWidth}
                />
              </Grid>
              <Grid size={6}>
                <InfoBlock
                  title='间距'
                  value={adaptation.layout.spacing}
                />
              </Grid>
              <Grid size={6}>
                <InfoBlock
                  title='侧边栏'
                  value={adaptation.layout.sidebarCollapsed ? '已折叠' : '已展开'}
                />
              </Grid>
            </Grid>

            <Divider sx={{ my: 1.5 }} />

            <Typography
              variant='caption'
              sx={{ color: 'text.secondary', mb: 1 }}
            >
              内容调整
            </Typography>
            <Stack
              direction='row'
              spacing={1}
              sx={{ flexWrap: 'wrap', mb: 1.5 }}
            >
              {adaptation.content.simplified && (
                <Chip
                  size='small'
                  label='简化内容'
                  color='info'
                />
              )}
              {adaptation.content.showTooltips && (
                <Chip
                  size='small'
                  label='显示提示'
                  variant='outlined'
                />
              )}
              {adaptation.content.showShortcuts && (
                <Chip
                  size='small'
                  label='显示快捷键'
                  variant='outlined'
                />
              )}
              {adaptation.content.verboseLabels && (
                <Chip
                  size='small'
                  label='详细标签'
                  variant='outlined'
                />
              )}
              {adaptation.content.highlightPrimaryActions && (
                <Chip
                  size='small'
                  label='高亮主要操作'
                  color='warning'
                />
              )}
            </Stack>

            <Typography
              variant='caption'
              sx={{ color: 'text.secondary', mb: 1 }}
            >
              行为调整
            </Typography>
            <Stack
              direction='row'
              spacing={1}
              sx={{ flexWrap: 'wrap' }}
            >
              {adaptation.behavior.enableAnimations && (
                <Chip
                  size='small'
                  label='动画'
                  variant='outlined'
                />
              )}
              {adaptation.behavior.keyboardShortcuts && (
                <Chip
                  size='small'
                  label='键盘快捷键'
                  variant='outlined'
                />
              )}
              {adaptation.behavior.gestureSupport && (
                <Chip
                  size='small'
                  label='手势支持'
                  variant='outlined'
                />
              )}
              {adaptation.behavior.autoComplete && (
                <Chip
                  size='small'
                  label='自动完成'
                  variant='outlined'
                />
              )}
              {adaptation.behavior.autoSave && (
                <Chip
                  size='small'
                  label='自动保存'
                  color='success'
                />
              )}
              {adaptation.behavior.confirmDangerousActions && (
                <Chip
                  size='small'
                  label='危险确认'
                  color='warning'
                />
              )}
            </Stack>
          </CardContent>
        </Card>
      </Grid>
    </Grid>
  );
};

const InfoBlock: React.FC<{ title: string; value: string }> = ({ title, value }) => (
  <Box sx={{ py: 0.5 }}>
    <Typography
      variant='caption'
      sx={{ color: 'text.secondary', display: 'block' }}
    >
      {title}
    </Typography>
    <Typography
      variant='body2'
      sx={{ fontWeight: 500 }}
    >
      {value}
    </Typography>
  </Box>
);

const EmotionTab: React.FC<{
  state: EmotionState;
  response: DesignResponse;
  onSimulate: (signal: string, value: number) => void;
}> = ({ state, response, onSimulate }) => (
  <Grid
    container
    spacing={2}
  >
    <Grid size={{ xs: 12, md: 6 }}>
      <Card variant='outlined'>
        <CardContent>
          <Stack
            direction='row'
            spacing={1}
            sx={{ mb: 2, alignItems: 'center' }}
          >
            <Activity
              size={18}
              color={designTokens.colors.pink.main}
            />
            <Typography
              variant='subtitle2'
              sx={{ fontWeight: 600 }}
            >
              情感状态
            </Typography>
            <Chip
              size='small'
              label={`置信度: ${(state.confidence * 100).toFixed(1)}%`}
              color='primary'
              sx={{ ml: 'auto' }}
            />
          </Stack>

          <Box sx={{ textAlign: 'center', py: 2 }}>
            <Typography
              variant='h4'
              sx={{ fontWeight: 700, mb: 0.5 }}
            >
              {EMOTION_LABELS[state.primaryEmotion]}
            </Typography>
            <Stack
              direction='row'
              spacing={1}
              sx={{ justifyContent: 'center', mb: 1 }}
            >
              <Chip
                size='small'
                label={state.valence}
                color={
                  state.valence === 'positive'
                    ? 'success'
                    : state.valence === 'negative'
                      ? 'error'
                      : 'default'
                }
              />
              <Chip
                size='small'
                label={state.arousal}
                color={
                  state.arousal === 'high'
                    ? 'warning'
                    : state.arousal === 'medium'
                      ? 'info'
                      : 'default'
                }
              />
            </Stack>
            <Box sx={{ px: 3 }}>
              <LinearProgress
                variant='determinate'
                value={state.emotionIntensity * 100}
                sx={{ height: 8, borderRadius: 4 }}
              />
              <Typography
                variant='caption'
                sx={{ color: 'text.secondary' }}
              >
                情绪强度: {(state.emotionIntensity * 100).toFixed(0)}%
              </Typography>
            </Box>
          </Box>

          {state.secondary_emotion && (
            <Box sx={{ mt: 1 }}>
              <Typography
                variant='caption'
                sx={{ color: 'text.secondary' }}
              >
                次要情绪: {EMOTION_LABELS[state.secondary_emotion]}
              </Typography>
            </Box>
          )}

          {state.triggers.length > 0 && (
            <Box sx={{ mt: 1 }}>
              <Typography
                variant='caption'
                sx={{ color: 'text.secondary', display: 'block', mb: 0.5 }}
              >
                触发因素
              </Typography>
              <Stack
                direction='row'
                spacing={0.5}
                sx={{ flexWrap: 'wrap' }}
              >
                {state.triggers.map((t) => (
                  <Chip
                    key={t}
                    size='small'
                    label={t}
                    variant='outlined'
                  />
                ))}
              </Stack>
            </Box>
          )}

          <Divider sx={{ my: 2 }} />

          <Typography
            variant='caption'
            sx={{ color: 'text.secondary', mb: 1 }}
          >
            模拟情绪信号
          </Typography>
          <Grid
            container
            spacing={1}
          >
            <Grid size={4}>
              <Button
                size='small'
                fullWidth
                onClick={() => onSimulate('success', 0.8)}
              >
                <ThumbsUp
                  size={14}
                  style={{ marginRight: 4 }}
                />
                成功
              </Button>
            </Grid>
            <Grid size={4}>
              <Button
                size='small'
                fullWidth
                color='error'
                onClick={() => onSimulate('error', 0.7)}
              >
                <AlertCircle
                  size={14}
                  style={{ marginRight: 4 }}
                />
                错误
              </Button>
            </Grid>
            <Grid size={4}>
              <Button
                size='small'
                fullWidth
                color='warning'
                onClick={() => onSimulate('delay', 0.6)}
              >
                延迟
              </Button>
            </Grid>
            <Grid size={4}>
              <Button
                size='small'
                fullWidth
                color='success'
                onClick={() => onSimulate('achievement', 0.9)}
              >
                成就
              </Button>
            </Grid>
            <Grid size={4}>
              <Button
                size='small'
                fullWidth
                color='info'
                onClick={() => onSimulate('helpful_interaction', 0.7)}
              >
                帮助
              </Button>
            </Grid>
            <Grid size={4}>
              <Button
                size='small'
                fullWidth
                onClick={() => onSimulate('focus_flow', 0.6)}
              >
                专注
              </Button>
            </Grid>
          </Grid>
        </CardContent>
      </Card>
    </Grid>

    <Grid size={{ xs: 12, md: 6 }}>
      <Card variant='outlined'>
        <CardContent>
          <Stack
            direction='row'
            spacing={1}
            sx={{ mb: 2, alignItems: 'center' }}
          >
            <Palette
              size={18}
              color={designTokens.colors.secondary.main}
            />
            <Typography
              variant='subtitle2'
              sx={{ fontWeight: 600 }}
            >
              设计响应
            </Typography>
          </Stack>

          <Grid
            container
            spacing={1}
          >
            <Grid size={6}>
              <InfoBlock
                title='动画类型'
                value={ANIMATION_LABELS[response.animationType]}
              />
            </Grid>
            <Grid size={6}>
              <InfoBlock
                title='反馈样式'
                value={response.feedbackStyle}
              />
            </Grid>
            <Grid size={6}>
              <InfoBlock
                title='视觉色调'
                value={response.visualTone}
              />
            </Grid>
            <Grid size={6}>
              <InfoBlock
                title='声音'
                value={
                  response.soundDesign.enable_sound
                    ? `${response.soundDesign.soundType} (${Math.round(response.soundDesign.volume * 100)}%)`
                    : '静音'
                }
              />
            </Grid>
          </Grid>

          <Divider sx={{ my: 1.5 }} />

          <Typography
            variant='caption'
            sx={{ color: 'text.secondary', mb: 1 }}
          >
            色彩调整
          </Typography>
          <Grid
            container
            spacing={1}
          >
            <Grid size={3}>
              <ColorBar
                label='饱和度'
                value={response.colorAdjustments.saturation}
              />
            </Grid>
            <Grid size={3}>
              <ColorBar
                label='亮度'
                value={response.colorAdjustments.brightness}
              />
            </Grid>
            <Grid size={3}>
              <ColorBar
                label='对比度'
                value={response.colorAdjustments.contrast}
              />
            </Grid>
            <Grid size={3}>
              <ColorBar
                label='色温'
                value={0.5 + response.colorAdjustments.warmth}
              />
            </Grid>
          </Grid>

          <Divider sx={{ my: 1.5 }} />

          <Typography
            variant='caption'
            sx={{ color: 'text.secondary', mb: 1 }}
          >
            消息风格
          </Typography>
          <Stack
            direction='row'
            spacing={1}
            sx={{ mb: 1 }}
          >
            <Chip
              size='small'
              label={response.messaging.tone}
              color='primary'
              variant='outlined'
            />
            <Chip
              size='small'
              label={response.messaging.style}
              variant='outlined'
            />
          </Stack>
          {response.messaging.suggestions.length > 0 && (
            <Box>
              <Typography
                variant='caption'
                sx={{ color: 'text.secondary', display: 'block', mb: 0.5 }}
              >
                建议语
              </Typography>
              <Stack spacing={0.5}>
                {response.messaging.suggestions.map((s, i) => (
                  <Typography
                    key={i}
                    variant='body2'
                    sx={{ fontStyle: 'italic', color: 'text.secondary' }}
                  >
                    "{s}"
                  </Typography>
                ))}
              </Stack>
            </Box>
          )}
        </CardContent>
      </Card>
    </Grid>
  </Grid>
);

const ColorBar: React.FC<{ label: string; value: number }> = ({ label, value }) => (
  <Box sx={{ textAlign: 'center' }}>
    <LinearProgress
      variant='determinate'
      value={Math.min(100, value * 100)}
      sx={{
        height: 6,
        borderRadius: 3,
        bgcolor: 'grey.200',
        '& .MuiLinearProgress-bar': {
          bgcolor: value > 1 ? designTokens.colors.success.dark : value < 0.95 ? designTokens.colors.error.main : 'colors.cyan.600',
        },
      }}
    />
    <Typography
      variant='caption'
      sx={{ color: 'text.secondary' }}
    >
      {label}: {value.toFixed(2)}
    </Typography>
  </Box>
);

const SettingsTab: React.FC<{
  profile: InteractionProfile;
  onUpdate: (profile: InteractionProfile) => void;
  onReset: () => void;
}> = ({ profile, onUpdate, onReset }) => (
  <Grid
    container
    spacing={2}
  >
    <Grid size={{ xs: 12, md: 6 }}>
      <Card variant='outlined'>
        <CardContent>
          <Stack
            direction='row'
            spacing={1}
            sx={{ mb: 2, alignItems: 'center' }}
          >
            <Settings
              size={18}
              color='colors.cyan.600'
            />
            <Typography
              variant='subtitle2'
              sx={{ fontWeight: 600 }}
            >
              个性化偏好
            </Typography>
          </Stack>

          <Stack spacing={2}>
            <Box>
              <Typography
                variant='caption'
                sx={{ color: 'text.secondary', mb: 0.5 }}
              >
                用户 ID
              </Typography>
              <Typography
                variant='body2'
                sx={{ fontFamily: 'monospace' }}
              >
                {profile.userId}
              </Typography>
            </Box>

            <Box>
              <Typography
                variant='caption'
                sx={{ color: 'text.secondary', mb: 0.5 }}
              >
                <Zap
                  size={12}
                  style={{ marginRight: 4 }}
                />{' '}
                动画偏好
              </Typography>
              <Stack
                direction='row'
                spacing={1}
              >
                {(['no_preference', 'reduce', 'increase'] as const).map((m) => (
                  <Button
                    key={m}
                    size='small'
                    variant={profile.preferences.motion === m ? 'contained' : 'outlined'}
                    onClick={() =>
                      onUpdate({
                        ...profile,
                        preferences: { ...profile.preferences, motion: m },
                      })
                    }
                  >
                    {m === 'no_preference' ? '默认' : m === 'reduce' ? '减少' : '增强'}
                  </Button>
                ))}
              </Stack>
            </Box>

            <Box>
              <Typography
                variant='caption'
                sx={{ color: 'text.secondary', mb: 0.5 }}
              >
                <Eye
                  size={12}
                  style={{ marginRight: 4 }}
                />{' '}
                色盲模式
              </Typography>
              <FormControl
                size='small'
                fullWidth
              >
                <Select
                  value={profile.preferences.colorBlindMode}
                  onChange={(e) =>
                    onUpdate({
                      ...profile,
                      preferences: {
                        ...profile.preferences,
                        colorBlindMode: e.target.value as
                          'none' | 'protanopia' | 'deuteranopia' | 'tritanopia',
                      },
                    })
                  }
                >
                  <MenuItem value='none'>无</MenuItem>
                  <MenuItem value='protanopia'>红色盲</MenuItem>
                  <MenuItem value='deuteranopia'>绿色盲</MenuItem>
                  <MenuItem value='tritanopia'>蓝色盲</MenuItem>
                </Select>
              </FormControl>
            </Box>

            <Box>
              <Typography
                variant='caption'
                sx={{ color: 'text.secondary', mb: 0.5 }}
              >
                屏幕尺寸
              </Typography>
              <Grid
                container
                spacing={1}
              >
                <Grid size={6}>
                  <TextField
                    size='small'
                    type='number'
                    label='宽度'
                    value={profile.device.screenWidth}
                    onChange={(e) =>
                      onUpdate({
                        ...profile,
                        device: { ...profile.device, screenWidth: Number(e.target.value) },
                      })
                    }
                    fullWidth
                  />
                </Grid>
                <Grid size={6}>
                  <TextField
                    size='small'
                    type='number'
                    label='高度'
                    value={profile.device.screenHeight}
                    onChange={(e) =>
                      onUpdate({
                        ...profile,
                        device: { ...profile.device, screenHeight: Number(e.target.value) },
                      })
                    }
                    fullWidth
                  />
                </Grid>
              </Grid>
            </Box>

            <Box>
              <Typography
                variant='caption'
                sx={{ color: 'text.secondary', mb: 0.5 }}
              >
                网络质量
              </Typography>
              <Stack
                direction='row'
                spacing={1}
              >
                {(['poor', 'fair', 'good', 'excellent'] as const).map((q) => (
                  <Button
                    key={q}
                    size='small'
                    variant={profile.device.networkQuality === q ? 'contained' : 'outlined'}
                    onClick={() =>
                      onUpdate({
                        ...profile,
                        device: { ...profile.device, networkQuality: q },
                      })
                    }
                  >
                    {q}
                  </Button>
                ))}
              </Stack>
            </Box>

            <Button
              variant='outlined'
              color='warning'
              startIcon={<RotateCcw size={14} />}
              onClick={onReset}
              fullWidth
            >
              重置为默认设置
            </Button>
          </Stack>
        </CardContent>
      </Card>
    </Grid>

    <Grid size={{ xs: 12, md: 6 }}>
      <Stack spacing={2}>
        <Card variant='outlined'>
          <CardContent>
            <Stack
              direction='row'
              spacing={1}
              sx={{ mb: 2, alignItems: 'center' }}
            >
              <Lightbulb
                size={18}
                color={designTokens.colors.warning.main}
              />
              <Typography
                variant='subtitle2'
                sx={{ fontWeight: 600 }}
              >
                AI UX 引擎状态
              </Typography>
            </Stack>
            <Grid
              container
              spacing={1}
            >
              <Grid size={6}>
                <StatItem
                  label='推荐引擎'
                  value='活跃'
                  color={designTokens.colors.success.dark}
                />
              </Grid>
              <Grid size={6}>
                <StatItem
                  label='自适应引擎'
                  value='活跃'
                  color={designTokens.colors.success.dark}
                />
              </Grid>
              <Grid size={6}>
                <StatItem
                  label='情感引擎'
                  value='活跃'
                  color={designTokens.colors.success.dark}
                />
              </Grid>
              <Grid size={6}>
                <StatItem
                  label='行为记录'
                  value='运行中'
                  color='colors.cyan.600'
                />
              </Grid>
            </Grid>
          </CardContent>
        </Card>

        <Card variant='outlined'>
          <CardContent>
            <Stack
              direction='row'
              spacing={1}
              sx={{ mb: 2, alignItems: 'center' }}
            >
              <Star
                size={18}
                color='#eab308'
              />
              <Typography
                variant='subtitle2'
                sx={{ fontWeight: 600 }}
              >
                使用提示
              </Typography>
            </Stack>
            <Typography
              variant='body2'
              sx={{ color: 'text.secondary', lineHeight: 1.8 }}
            >
              1. 点击"模拟用户行为"来生成示例数据
              <br />
              2. 在"自适应交互"标签页调整设备和熟练度
              <br />
              3. 在"情感化设计"标签页模拟情绪信号
              <br />
              4. 所有设置会实时保存到用户画像中
              <br />
              5. 引擎会基于你的画像自动调整 UI 体验
            </Typography>
          </CardContent>
        </Card>
      </Stack>
    </Grid>
  </Grid>
);

export default V58UXPanel;
