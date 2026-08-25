export type DeviceType = 'mobile' | 'tablet' | 'desktop';
export type ProficiencyLevel = 'beginner' | 'intermediate' | 'expert';
export type LayoutDensity = 'compact' | 'normal' | 'relaxed';
export type MotionPreference = 'no_preference' | 'reduce' | 'increase';

export interface InteractionProfile {
  userId: string;
  preferences: {
    density: LayoutDensity;
    fontSize: number;
    motion: MotionPreference;
    highContrast: boolean;
    reducedMotion: boolean;
    largeText: boolean;
    screenReader: boolean;
    colorBlindMode: 'none' | 'protanopia' | 'deuteranopia' | 'tritanopia';
    language: string;
    theme: 'light' | 'dark' | 'auto';
  };
  device: {
    type: DeviceType;
    screenWidth: number;
    screenHeight: number;
    touchSupport: boolean;
    keyboardOnly: boolean;
    networkQuality: 'poor' | 'fair' | 'good' | 'excellent';
    cpuCores: number;
    memoryGB: number;
  };
  accessibility: {
    needs: string[];
    accommodations: string[];
    lastAssessment: number;
  };
  proficiency_level: ProficiencyLevel;
  updatedAt: number;
}

export interface AdaptiveResponse {
  component: {
    variant: string;
    size: 'small' | 'medium' | 'large';
    density: LayoutDensity;
  };
  layout: {
    template: 'single-column' | 'split-view' | 'tabbed' | 'dashboard-grid';
    sidebarCollapsed: boolean;
    contentWidth: 'narrow' | 'medium' | 'wide' | 'full';
    spacing: 'tight' | 'normal' | 'spacious';
  };
  content: {
    simplified: boolean;
    showTooltips: boolean;
    showShortcuts: boolean;
    verboseLabels: boolean;
    highlightPrimaryActions: boolean;
  };
  behavior: {
    autoSave: boolean;
    confirmDangerousActions: boolean;
    enableAnimations: boolean;
    keyboardShortcuts: boolean;
    gestureSupport: boolean;
    autoComplete: boolean;
  };
  confidence: number;
  reason: string;
}

export interface AdaptationRecord {
  id: string;
  timestamp: number;
  trigger: string;
  fromState: string;
  toState: string;
  confidence: number;
}
