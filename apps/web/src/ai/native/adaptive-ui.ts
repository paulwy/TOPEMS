import i18n from '@/i18n';

export type DeviceType = 'mobile' | 'tablet' | 'desktop';
export type LayoutDensity = 'compact' | 'normal' | 'relaxed';
export type ThemeMode = 'light' | 'dark' | 'auto';
export type ContentPriority = 'high' | 'medium' | 'low';

export interface UserPreferences {
  theme: ThemeMode;
  density: LayoutDensity;
  primary_language: string;
  secondary_languages: string[];
  notifications_enabled: boolean;
  auto_save: boolean;
  compact_mode: boolean;
  show_favorites: boolean;
  sidebar_collapsed: boolean;
  fontSize: number;
  accentColor: string;
  layout: 'grid' | 'list' | 'mixed';
}

export interface BehaviorPattern {
  action: string;
  frequency: number;
  avg_duration_ms: number;
  peak_hours: number[];
  common_paths: string[];
  last_seen: number;
}

export interface UserContext {
  device: DeviceType;
  screen_size: { width: number; height: number };
  network_type: 'wifi' | '4g' | '5g' | 'slow';
  connection_quality: number;
  locale: string;
  timezone: string;
  is_online: boolean;
  battery_level?: number;
}

export interface UserProfile {
  id: string;
  name: string;
  role: string;
  department?: string;
  preferences: UserPreferences;
  behavior_patterns: BehaviorPattern[];
  device: DeviceType;
  context: UserContext;
  segments: string[];
  lastActiveAt: number;
  createdAt: number;
  updatedAt: number;
}

export interface AdaptedLayout {
  layout: 'grid' | 'list' | 'mixed';
  density: LayoutDensity;
  theme: ThemeMode;
  font_scale: number;
  sidebar_state: 'expanded' | 'collapsed' | 'auto';
  recommended_modules: Array<{
    module: string;
    priority: ContentPriority;
    reason: string;
  }>;
  hidden_elements: string[];
  layout_confidence: number;
}

export interface ContentRecommendation {
  id: string;
  title: string;
  type: 'module' | 'report' | 'dashboard' | 'action';
  priority: ContentPriority;
  reason: string;
  confidence: number;
  estimated_engagement: number;
}

export interface AdaptationStats {
  total_adaptations: number;
  layout_changes: number;
  content_recommendations: number;
  avg_layout_confidence: number;
  user_satisfaction_score: number;
  segment_distribution: Record<string, number>;
  adaptation_latency_ms: number;
  by_device: Record<DeviceType, number>;
  by_segment: Record<string, number>;
}

const DEFAULT_PREFERENCES: UserPreferences = {
  theme: 'light',
  density: 'normal',
  primary_language: 'zh',
  secondary_languages: ['en'],
  notifications_enabled: true,
  auto_save: true,
  compact_mode: false,
  show_favorites: true,
  sidebar_collapsed: false,
  fontSize: 14,
  accentColor: 'secondary.500',
  layout: 'grid',
};

const BEHAVIOR_THRESHOLDS = {
  high_frequency: 10,
  medium_frequency: 3,
  engagement_decay: 0.95,
  min_confidence: 0.5,
};

class AdaptiveUIEngineImpl {
  private profiles: Map<string, UserProfile>;
  private currentUserId: string | null;
  private adaptationCount: number;
  private layoutChangeCount: number;
  private contentRecommendationCount: number;
  private confidenceSum: number;
  private satisfactionScore: number;
  private segmentDistribution: Map<string, number>;
  private deviceDistribution: Map<DeviceType, number>;
  private totalAdaptationLatency: number;

  constructor() {
    this.profiles = new Map();
    this.currentUserId = null;
    this.adaptationCount = 0;
    this.layoutChangeCount = 0;
    this.contentRecommendationCount = 0;
    this.confidenceSum = 0;
    this.satisfactionScore = 0.8;
    this.segmentDistribution = new Map();
    this.deviceDistribution = new Map();
    this.totalAdaptationLatency = 0;
  }

  createProfile(profile: Omit<UserProfile, 'createdAt' | 'updatedAt'>): UserProfile {
    const now = Date.now();
    const fullProfile: UserProfile = {
      ...profile,
      createdAt: now,
      updatedAt: now,
    };
    this.profiles.set(profile.id, fullProfile);
    return fullProfile;
  }

  getProfile(userId: string): UserProfile | undefined {
    return this.profiles.get(userId);
  }

  getCurrentProfile(): UserProfile | undefined {
    if (!this.currentUserId) return undefined;
    return this.profiles.get(this.currentUserId);
  }

  setCurrentUser(userId: string): void {
    this.currentUserId = userId;
  }

  updatePreferences(userId: string, updates: Partial<UserPreferences>): boolean {
    const profile = this.profiles.get(userId);
    if (!profile) return false;
    profile.preferences = { ...profile.preferences, ...updates };
    profile.updatedAt = Date.now();
    return true;
  }

  updateContext(userId: string, context: Partial<UserContext>): boolean {
    const profile = this.profiles.get(userId);
    if (!profile) return false;
    profile.context = { ...profile.context, ...context };
    profile.device = context.device ?? profile.device;
    profile.updatedAt = Date.now();
    return true;
  }

  recordBehavior(userId: string, behavior: Omit<BehaviorPattern, 'last_seen'>): boolean {
    const profile = this.profiles.get(userId);
    if (!profile) return false;

    const existing = profile.behavior_patterns.find((b) => b.action === behavior.action);
    if (existing) {
      existing.frequency += behavior.frequency;
      existing.avg_duration_ms =
        (existing.avg_duration_ms * (existing.frequency - behavior.frequency) +
          behavior.avg_duration_ms * behavior.frequency) /
        existing.frequency;
      existing.last_seen = Date.now();
    } else {
      profile.behavior_patterns.push({ ...behavior, last_seen: Date.now() });
    }
    profile.updatedAt = Date.now();
    return true;
  }

  adaptLayout(userId: string, context?: Partial<UserContext>): AdaptedLayout {
    const startTime = performance.now();
    const profile = this.profiles.get(userId);

    if (!profile) {
      return this.getDefaultLayout();
    }

    if (context) {
      this.updateContext(userId, context);
    }

    this.adaptationCount++;

    const behaviorScore = this.computeBehaviorScore(profile);
    const deviceScore = this.computeDeviceScore(profile);
    const contextScore = this.computeContextScore(profile);

    const layoutConfidence = (behaviorScore + deviceScore + contextScore) / 3;
    this.confidenceSum += layoutConfidence;

    const adapted = this.computeAdaptedLayout(profile, layoutConfidence);
    this.layoutChangeCount++;
    this.totalAdaptationLatency += performance.now() - startTime;

    this.deviceDistribution.set(
      profile.device,
      (this.deviceDistribution.get(profile.device) ?? 0) + 1
    );

    for (const segment of profile.segments) {
      this.segmentDistribution.set(segment, (this.segmentDistribution.get(segment) ?? 0) + 1);
    }

    return adapted;
  }

  private getDefaultLayout(): AdaptedLayout {
    return {
      layout: 'grid',
      density: 'normal',
      theme: 'light',
      font_scale: 1,
      sidebar_state: 'expanded',
      recommended_modules: [],
      hidden_elements: [],
      layout_confidence: 0.5,
    };
  }

  private computeBehaviorScore(profile: UserProfile): number {
    const patterns = profile.behavior_patterns;
    if (patterns.length === 0) return 0.3;

    const highFreqActions = patterns.filter(
      (p) => p.frequency >= BEHAVIOR_THRESHOLDS.high_frequency
    );
    const mediumFreqActions = patterns.filter(
      (p) => p.frequency >= BEHAVIOR_THRESHOLDS.medium_frequency
    );

    return Math.min(1, 0.3 + (highFreqActions.length * 0.15 + mediumFreqActions.length * 0.05));
  }

  private computeDeviceScore(profile: UserProfile): number {
    const scores: Record<DeviceType, number> = {
      mobile: 0.7,
      tablet: 0.85,
      desktop: 0.95,
    };
    return scores[profile.device];
  }

  private computeContextScore(profile: UserProfile): number {
    let score = 0.6;
    if (profile.context.connection_quality > 0.8) score += 0.15;
    if (profile.context.is_online) score += 0.1;
    if (profile.context.screen_size.width >= 1440) score += 0.1;
    return Math.min(1, score);
  }

  private computeAdaptedLayout(profile: UserProfile, confidence: number): AdaptedLayout {
    const prefs = profile.preferences;
    const behavior = profile.behavior_patterns;

    const recommendedModules = this.recommendModules(profile);
    const hiddenElements = this.computeHiddenElements(profile);

    let layout: 'grid' | 'list' | 'mixed' = prefs.layout;
    if (profile.device === 'mobile') {
      layout = 'list';
    } else if (behavior.some((b) => b.action.includes('table') || b.action.includes('list'))) {
      layout = 'list';
    } else if (behavior.some((b) => b.action.includes('dashboard') || b.action.includes('chart'))) {
      layout = 'grid';
    }

    let density: LayoutDensity = prefs.density;
    if (profile.device === 'mobile') density = 'compact';
    else if (profile.preferences.compact_mode) density = 'compact';

    return {
      layout,
      density,
      theme: prefs.theme,
      font_scale: prefs.fontSize / 14,
      sidebar_state:
        profile.device === 'mobile'
          ? 'collapsed'
          : prefs.sidebar_collapsed
            ? 'collapsed'
            : 'expanded',
      recommended_modules: recommendedModules,
      hidden_elements: hiddenElements,
      layout_confidence: confidence,
    };
  }

  private recommendModules(profile: UserProfile): AdaptedLayout['recommended_modules'] {
    const modules: AdaptedLayout['recommended_modules'] = [];
    const behavior = profile.behavior_patterns;

    const moduleMap: Record<
      string,
      { keywords: string[]; name: string; priority: ContentPriority }
    > = {
      dashboard: {
        keywords: ['dashboard', 'overview', 'home'],
        name: i18n.t('ai.adaptive-ui.k0'),
        priority: 'high',
      },
      analytics: {
        keywords: ['analytics', 'report', 'bi', 'chart'],
        name: i18n.t('ai.adaptive-ui.k1'),
        priority: 'high',
      },
      customer: {
        keywords: ['customer', 'crm', 'contact'],
        name: i18n.t('ai.adaptive-ui.k2'),
        priority: 'medium',
      },
      order: {
        keywords: ['order', 'purchase', 'scm'],
        name: i18n.t('ai.adaptive-ui.k3'),
        priority: 'medium',
      },
      product: {
        keywords: ['product', 'bom', 'pdm'],
        name: i18n.t('ai.adaptive-ui.k4'),
        priority: 'medium',
      },
      employee: {
        keywords: ['employee', 'hrm', 'attendance'],
        name: i18n.t('ai.adaptive-ui.k5'),
        priority: 'medium',
      },
      finance: {
        keywords: ['finance', 'accounting', 'voucher'],
        name: i18n.t('ai.adaptive-ui.k6'),
        priority: 'high',
      },
      inventory: {
        keywords: ['inventory', 'stock', 'wms'],
        name: i18n.t('ai.adaptive-ui.k7'),
        priority: 'medium',
      },
      quality: {
        keywords: ['quality', 'qms', 'audit'],
        name: i18n.t('ai.adaptive-ui.k8'),
        priority: 'medium',
      },
      workflow: {
        keywords: ['workflow', 'approval', 'task'],
        name: i18n.t('ai.adaptive-ui.k9'),
        priority: 'medium',
      },
      ai: {
        keywords: ['ai', 'chat', 'assistant'],
        name: i18n.t('ai.adaptive-ui.ai_0'),
        priority: 'high',
      },
    };

    const totalFreq = behavior.reduce((sum, b) => sum + b.frequency, 0);
    if (totalFreq === 0) {
      return [
        { module: 'dashboard', priority: 'high', reason: i18n.t('ai.adaptive-ui.k10') },
        { module: 'analytics', priority: 'medium', reason: i18n.t('ai.adaptive-ui.k11') },
        { module: 'ai', priority: 'medium', reason: i18n.t('ai.adaptive-ui.ai_1') },
      ];
    }

    for (const [key, config] of Object.entries(moduleMap)) {
      const relatedBehavior = behavior.filter((b) =>
        config.keywords.some((kw) => b.action.toLowerCase().includes(kw))
      );
      if (relatedBehavior.length > 0) {
        const freqScore = relatedBehavior.reduce((sum, b) => sum + b.frequency, 0) / totalFreq;
        const priority: ContentPriority =
          freqScore > 0.3 ? 'high' : freqScore > 0.1 ? 'medium' : 'low';
        modules.push({
          module: config.name,
          priority,
          reason: `${i18n.t('ai.adaptive-ui.k2')}${relatedBehavior.length}${i18n.t('ai.adaptive-ui.k3')}`,
        });
      }
    }

    return modules.slice(0, 5);
  }

  private computeHiddenElements(profile: UserProfile): string[] {
    const hidden: string[] = [];
    const behavior = profile.behavior_patterns;
    const decayThreshold = Date.now() - 30 * 24 * 60 * 60 * 1000;

    for (const b of behavior) {
      if (b.last_seen < decayThreshold && b.frequency < BEHAVIOR_THRESHOLDS.medium_frequency) {
        hidden.push(b.action);
      }
    }

    return hidden.slice(0, 10);
  }

  personalizeContent(
    userId: string,
    items: Array<{ id: string; type: string; tags: string[] }>
  ): ContentRecommendation[] {
    const profile = this.profiles.get(userId);
    if (!profile || items.length === 0) {
      return items.map((item) => ({
        id: item.id,
        title: item.id,
        type: item.type as ContentRecommendation['type'],
        priority: 'medium',
        reason: i18n.t('ai.adaptive-ui.k12'),
        confidence: 0.5,
        estimated_engagement: 0.5,
      }));
    }

    const behaviorTags = new Set<string>();
    for (const b of profile.behavior_patterns) {
      behaviorTags.add(b.action);
    }

    const recommendations: ContentRecommendation[] = items.map((item) => {
      const matchingTags = item.tags.filter(
        (t) => behaviorTags.has(t) || behaviorTags.has(t.toLowerCase())
      );
      const confidence = Math.min(0.99, 0.3 + matchingTags.length * 0.15);
      const priority: ContentPriority =
        confidence > 0.7 ? 'high' : confidence > 0.5 ? 'medium' : 'low';

      return {
        id: item.id,
        title: item.id,
        type: item.type as ContentRecommendation['type'],
        priority,
        reason:
          matchingTags.length > 0
            ? `${i18n.t('ai.adaptive-ui.k4')}${matchingTags.join(', ')}`
            : i18n.t('ai.adaptive-ui.k13'),
        confidence,
        estimated_engagement: confidence * 0.8,
      };
    });

    recommendations.sort((a, b) => b.confidence - a.confidence);
    this.contentRecommendationCount += recommendations.length;

    return recommendations;
  }

  getAdaptationStats(): AdaptationStats {
    const segments = new Set<string>();
    for (const profile of this.profiles.values()) {
      for (const s of profile.segments) {
        segments.add(s);
      }
    }

    const segmentDist: Record<string, number> = {};
    for (const segment of segments) {
      segmentDist[segment] = this.segmentDistribution.get(segment) ?? 0;
    }

    const byDevice: Record<DeviceType, number> = {
      mobile: this.deviceDistribution.get('mobile') ?? 0,
      tablet: this.deviceDistribution.get('tablet') ?? 0,
      desktop: this.deviceDistribution.get('desktop') ?? 0,
    };

    return {
      total_adaptations: this.adaptationCount,
      layout_changes: this.layoutChangeCount,
      content_recommendations: this.contentRecommendationCount,
      avg_layout_confidence:
        this.adaptationCount > 0 ? this.confidenceSum / this.adaptationCount : 0,
      user_satisfaction_score: this.satisfactionScore,
      segment_distribution: segmentDist,
      adaptation_latency_ms:
        this.adaptationCount > 0
          ? Math.round(this.totalAdaptationLatency / this.adaptationCount)
          : 0,
      by_device: byDevice,
      by_segment: segmentDist,
    };
  }

  optimizeLayout(userId: string): { improvements: string[]; score: number } {
    const profile = this.profiles.get(userId);
    if (!profile) {
      return { improvements: [i18n.t('ai.adaptive-ui.k14')], score: 0 };
    }

    const improvements: string[] = [];
    let score = 0.5;

    if (profile.behavior_patterns.length < 3) {
      improvements.push(i18n.t('ai.adaptive-ui.k15'));
    } else {
      score += 0.2;
    }

    if (profile.device === 'mobile' && profile.preferences.layout === 'grid') {
      improvements.push(i18n.t('ai.adaptive-ui.k16'));
      score += 0.1;
    }

    if (profile.context.connection_quality < 0.5) {
      improvements.push(i18n.t('ai.adaptive-ui.k17'));
    } else {
      score += 0.1;
    }

    if (
      profile.preferences.density === 'normal' &&
      profile.behavior_patterns.some((b) => b.frequency > 20)
    ) {
      improvements.push(i18n.t('ai.adaptive-ui.k18'));
      score += 0.05;
    }

    return { improvements, score: Math.min(1, score) };
  }

  setSatisfactionScore(score: number): void {
    this.satisfactionScore = Math.max(0, Math.min(1, score));
  }

  reset(): void {
    this.profiles.clear();
    this.currentUserId = null;
    this.adaptationCount = 0;
    this.layoutChangeCount = 0;
    this.contentRecommendationCount = 0;
    this.confidenceSum = 0;
    this.satisfactionScore = 0.8;
    this.segmentDistribution.clear();
    this.deviceDistribution.clear();
    this.totalAdaptationLatency = 0;
  }
}

export const adaptiveUIEngine = new AdaptiveUIEngineImpl();
export const AdaptiveUIEngine = AdaptiveUIEngineImpl;

export default adaptiveUIEngine;
