export type DeviceType = 'mobile' | 'tablet' | 'desktop';
export type LayoutDensity = 'compact' | 'normal' | 'relaxed';
export type ThemeMode = 'light' | 'dark' | 'auto';

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
