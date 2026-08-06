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

const DEFAULT_PROFILE: InteractionProfile = {
  userId: 'default',
  preferences: {
    density: 'normal',
    fontSize: 14,
    motion: 'no_preference',
    highContrast: false,
    reducedMotion: false,
    largeText: false,
    screenReader: false,
    colorBlindMode: 'none',
    language: 'zh',
    theme: 'auto',
  },
  device: {
    type: 'desktop',
    screenWidth: 1920,
    screenHeight: 1080,
    touchSupport: false,
    keyboardOnly: false,
    networkQuality: 'good',
    cpuCores: 4,
    memoryGB: 8,
  },
  accessibility: {
    needs: [],
    accommodations: [],
    lastAssessment: 0,
  },
  proficiency_level: 'intermediate',
  updatedAt: Date.now(),
};

export class AdaptiveInteraction {
  private profiles: Map<string, InteractionProfile> = new Map();
  private adaptationHistory: AdaptationRecord[] = [];

  getInstance(): AdaptiveInteraction {
    return this;
  }

  adaptInterface(userId: string, context: Record<string, unknown> = {}): AdaptiveResponse {
    const profile = this.getInteractionProfile(userId);
    const signals = this.collectSignals(profile, context);

    const response: AdaptiveResponse = {
      component: {
        variant: this.determineComponentVariant(profile, signals),
        size: this.determineComponentSize(profile),
        density: profile.preferences.density,
      },
      layout: {
        template: this.determineLayoutTemplate(profile, signals),
        sidebarCollapsed: profile.device.type === 'mobile',
        contentWidth: this.determineContentWidth(profile),
        spacing: this.determineSpacing(profile),
      },
      content: {
        simplified: profile.proficiency_level === 'beginner',
        showTooltips: profile.proficiency_level !== 'expert',
        showShortcuts: profile.proficiency_level === 'expert',
        verboseLabels:
          profile.accessibility.needs.includes('large_text') || profile.preferences.largeText,
        highlightPrimaryActions: profile.proficiency_level === 'beginner',
      },
      behavior: {
        autoSave: true,
        confirmDangerousActions: profile.proficiency_level !== 'expert',
        enableAnimations:
          !profile.preferences.reducedMotion && profile.preferences.motion !== 'reduce',
        keyboardShortcuts: profile.proficiency_level === 'expert' || profile.device.keyboardOnly,
        gestureSupport: profile.device.touchSupport,
        autoComplete: profile.proficiency_level !== 'beginner',
      },
      confidence: this.computeConfidence(profile, signals),
      reason: this.buildReason(profile, signals),
    };

    this.recordAdaptation(userId, profile, response);

    return response;
  }

  getInteractionProfile(userId: string): InteractionProfile {
    return this.profiles.get(userId) || { ...DEFAULT_PROFILE, userId };
  }

  updateProfile(userId: string, updates: Partial<InteractionProfile>): InteractionProfile {
    const current = this.getInteractionProfile(userId);
    const updated: InteractionProfile = {
      ...current,
      ...updates,
      preferences: {
        ...current.preferences,
        ...(updates.preferences || {}),
      },
      device: {
        ...current.device,
        ...(updates.device || {}),
      } as InteractionProfile['device'],
      accessibility: {
        ...current.accessibility,
        ...(updates.accessibility || {}),
      },
      updatedAt: Date.now(),
    };

    this.profiles.set(userId, updated);
    return updated;
  }

  getAccessibilitySettings(userId: string): InteractionProfile['preferences'] {
    const profile = this.getInteractionProfile(userId);
    return { ...profile.preferences };
  }

  optimizeForDevice(
    userId: string,
    deviceInfo: Partial<InteractionProfile['device']>
  ): AdaptiveResponse {
    const profile = this.updateProfile(userId, {
      device: deviceInfo,
    } as Partial<InteractionProfile>);
    return this.adaptInterface(userId, { trigger: 'device_change' });
  }

  getAdaptationHistory(userId?: string): AdaptationRecord[] {
    if (!userId) {
      return [...this.adaptationHistory].sort((a, b) => b.timestamp - a.timestamp).slice(0, 50);
    }
    return this.adaptationHistory
      .filter((r) => r.id.startsWith(userId))
      .sort((a, b) => b.timestamp - a.timestamp)
      .slice(0, 20);
  }

  resetProfile(userId: string): InteractionProfile {
    const reset: InteractionProfile = {
      ...DEFAULT_PROFILE,
      userId,
      updatedAt: Date.now(),
    };
    this.profiles.set(userId, reset);
    return reset;
  }

  setProficiency(userId: string, level: ProficiencyLevel): InteractionProfile {
    return this.updateProfile(userId, { proficiency_level: level });
  }

  private collectSignals(
    profile: InteractionProfile,
    context: Record<string, unknown>
  ): Map<string, number> {
    const signals = new Map<string, number>();

    signals.set('mobile', profile.device.type === 'mobile' ? 1 : 0);
    signals.set('tablet', profile.device.type === 'tablet' ? 1 : 0);
    signals.set('touch', profile.device.touchSupport ? 1 : 0);
    signals.set('keyboard_only', profile.device.keyboardOnly ? 1 : 0);
    signals.set('low_vision', profile.accessibility.needs.includes('low_vision') ? 1 : 0);
    signals.set('beginner', profile.proficiency_level === 'beginner' ? 1 : 0);
    signals.set('expert', profile.proficiency_level === 'expert' ? 1 : 0);
    signals.set('poor_network', profile.device.networkQuality === 'poor' ? 1 : 0);

    if (context.trigger) {
      signals.set(`trigger_${String(context.trigger)}`, 1);
    }

    return signals;
  }

  private determineComponentVariant(
    _profile: InteractionProfile,
    signals: Map<string, number>
  ): string {
    if (signals.get('low_vision')) return 'accessible';
    if (signals.get('mobile')) return 'compact';
    if (signals.get('beginner')) return 'guided';
    if (signals.get('expert')) return 'dense';
    return 'standard';
  }

  private determineComponentSize(profile: InteractionProfile): 'small' | 'medium' | 'large' {
    if (profile.preferences.largeText || profile.accessibility.needs.includes('large_text')) {
      return 'large';
    }
    if (profile.device.type === 'mobile' || profile.preferences.density === 'compact') {
      return 'small';
    }
    return 'medium';
  }

  private determineLayoutTemplate(
    profile: InteractionProfile,
    signals: Map<string, number>
  ): AdaptiveResponse['layout']['template'] {
    if (signals.get('mobile')) return 'single-column';
    if (signals.get('expert') && profile.device.type === 'desktop') return 'dashboard-grid';
    if (profile.proficiency_level === 'beginner') return 'tabbed';
    return 'split-view';
  }

  private determineContentWidth(
    profile: InteractionProfile
  ): 'narrow' | 'medium' | 'wide' | 'full' {
    if (profile.device.type === 'mobile') return 'full';
    if (profile.device.screenWidth < 1024) return 'narrow';
    if (profile.device.screenWidth < 1440) return 'medium';
    return 'wide';
  }

  private determineSpacing(profile: InteractionProfile): 'tight' | 'normal' | 'spacious' {
    if (profile.preferences.density === 'compact') return 'tight';
    if (profile.preferences.density === 'relaxed') return 'spacious';
    if (profile.accessibility.needs.includes('large_text')) return 'spacious';
    return 'normal';
  }

  private computeConfidence(profile: InteractionProfile, signals: Map<string, number>): number {
    let score = 0.5;
    const signalCount = signals.size;
    const strongSignals = Array.from(signals.values()).filter((v) => v > 0).length;
    score += (strongSignals / Math.max(signalCount, 1)) * 0.3;
    score += profile.accessibility.needs.length > 0 ? 0.1 : 0;
    score += profile.updatedAt > 0 ? 0.1 : 0;
    return Math.min(0.98, score);
  }

  private buildReason(profile: InteractionProfile, signals: Map<string, number>): string {
    const reasons: string[] = [];

    if (signals.get('mobile')) reasons.push('检测到移动端设备');
    if (signals.get('touch')) reasons.push('支持触控交互');
    if (signals.get('low_vision')) reasons.push('已适配低视力模式');
    if (signals.get('beginner')) reasons.push('初学者模式：简化操作流程');
    if (signals.get('expert')) reasons.push('专家模式：显示高级选项');
    if (signals.get('poor_network')) reasons.push('网络较差：优化加载策略');
    if (profile.preferences.largeText) reasons.push('已启用大字体');
    if (profile.preferences.reducedMotion) reasons.push('已减少动画效果');

    return reasons.length > 0 ? reasons.join('；') : '使用默认适配配置';
  }

  private recordAdaptation(
    userId: string,
    _profile: InteractionProfile,
    response: AdaptiveResponse
  ): void {
    const record: AdaptationRecord = {
      id: `${userId}-${Date.now()}`,
      timestamp: Date.now(),
      trigger: 'auto',
      fromState: JSON.stringify({ density: 'normal', layout: 'split-view' }),
      toState: JSON.stringify({
        density: response.component.density,
        layout: response.layout.template,
        simplified: response.content.simplified,
      }),
      confidence: response.confidence,
    };

    this.adaptationHistory.push(record);

    if (this.adaptationHistory.length > 1000) {
      this.adaptationHistory.splice(0, this.adaptationHistory.length - 1000);
    }
  }
}

export const adaptiveInteraction = new AdaptiveInteraction();
