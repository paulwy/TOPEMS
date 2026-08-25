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
