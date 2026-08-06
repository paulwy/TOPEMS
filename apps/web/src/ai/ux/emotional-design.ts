export type Valence = 'positive' | 'neutral' | 'negative';
export type Arousal = 'low' | 'medium' | 'high';
export type EmotionType =
  | 'joy'
  | 'trust'
  | 'fear'
  | 'surprise'
  | 'sadness'
  | 'disgust'
  | 'anger'
  | 'anticipation'
  | 'frustration'
  | 'satisfaction'
  | 'confusion'
  | 'boredom'
  | 'excitement'
  | 'calm';

export type AnimationType = 'bounce' | 'pulse' | 'fade' | 'slide' | 'shake' | 'glow' | 'none';
export type FeedbackStyle = 'toast' | 'dialog' | 'inline' | 'sound' | 'haptic' | 'silent';
export type VisualTone = 'warm' | 'cool' | 'neutral' | 'vibrant' | 'subtle' | 'dramatic';

export interface EmotionState {
  valence: Valence;
  arousal: Arousal;
  confidence: number;
  primaryEmotion: EmotionType;
  secondary_emotion?: EmotionType;
  emotionIntensity: number;
  detected_at: number;
  triggers: string[];
}

export interface DesignResponse {
  emotion: EmotionState;
  animationType: AnimationType;
  feedbackStyle: FeedbackStyle;
  visualTone: VisualTone;
  colorAdjustments: {
    saturation: number;
    brightness: number;
    contrast: number;
    warmth: number;
  };
  messaging: {
    tone: 'encouraging' | 'neutral' | 'empathetic' | 'professional';
    style: 'formal' | 'casual' | 'playful' | 'direct' | 'professional';
    suggestions: string[];
  };
  soundDesign: {
    enable_sound: boolean;
    soundType: 'pleasant' | 'neutral' | 'attention' | 'warning' | 'none';
    volume: number;
  };
}

export interface EmotionProfile {
  userId: string;
  emotionHistory: EmotionState[];
  dominantEmotion: EmotionType;
  avgValence: number;
  avgArousal: number;
  lastDetected: number;
}

export interface EmotionEvent {
  id: string;
  timestamp: number;
  trigger: string;
  emotion: EmotionState;
  response: DesignResponse;
  userFeedback?: 'accepted' | 'rejected' | 'ignored';
}

const EMOTION_VALENCE_MAP: Record<EmotionType, Valence> = {
  joy: 'positive',
  trust: 'positive',
  fear: 'negative',
  surprise: 'neutral',
  sadness: 'negative',
  disgust: 'negative',
  anger: 'negative',
  anticipation: 'neutral',
  frustration: 'negative',
  satisfaction: 'positive',
  confusion: 'negative',
  boredom: 'negative',
  excitement: 'positive',
  calm: 'positive',
};

const EMOTION_AROUSAL_MAP: Record<EmotionType, Arousal> = {
  joy: 'high',
  trust: 'medium',
  fear: 'high',
  surprise: 'high',
  sadness: 'low',
  disgust: 'medium',
  anger: 'high',
  anticipation: 'medium',
  frustration: 'high',
  satisfaction: 'medium',
  confusion: 'medium',
  boredom: 'low',
  excitement: 'high',
  calm: 'low',
};

export class EmotionalDesignEngine {
  private emotionProfiles: Map<string, EmotionProfile> = new Map();
  private emotionHistory: EmotionEvent[] = [];
  private currentStates: Map<string, EmotionState> = new Map();

  detectEmotion(
    signals: Record<string, number>,
    context: Record<string, unknown> = {}
  ): EmotionState {
    const score = this.computeEmotionScores(signals);
    const primaryEmotion = this.determinePrimaryEmotion(score);
    const secondaryEmotion = this.determineSecondaryEmotion(score, primaryEmotion);

    const state: EmotionState = {
      valence: EMOTION_VALENCE_MAP[primaryEmotion],
      arousal: EMOTION_AROUSAL_MAP[primaryEmotion],
      confidence: this.computeConfidence(score),
      primaryEmotion,
      secondary_emotion: secondaryEmotion,
      emotionIntensity: this.computeIntensity(score, primaryEmotion),
      detected_at: Date.now(),
      triggers: this.extractTriggers(signals, context),
    };

    return state;
  }

  respondToEmotion(emotion: EmotionState, userId?: string): DesignResponse {
    const response = this.computeDesignResponse(emotion);

    if (userId) {
      const currentState = this.currentStates.get(userId);
      if (currentState) {
        this.updateEmotionProfile(userId, emotion);
      } else {
        this.initializeEmotionProfile(userId, emotion);
      }
      this.currentStates.set(userId, emotion);

      this.emotionHistory.push({
        id: `emotion-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        timestamp: Date.now(),
        trigger: emotion.triggers.join(', '),
        emotion,
        response,
      });

      if (this.emotionHistory.length > 500) {
        this.emotionHistory.splice(0, this.emotionHistory.length - 500);
      }
    }

    return response;
  }

  getEmotionalState(userId: string): EmotionState | null {
    return this.currentStates.get(userId) || null;
  }

  getDesignResponse(emotion: EmotionState): DesignResponse {
    return this.computeDesignResponse(emotion);
  }

  updateEmotionProfile(userId: string, emotion: EmotionState): EmotionProfile {
    const profile =
      this.emotionProfiles.get(userId) || this.initializeEmotionProfile(userId, emotion);

    profile.emotionHistory.push(emotion);
    if (profile.emotionHistory.length > 200) {
      profile.emotionHistory.splice(0, profile.emotionHistory.length - 200);
    }

    const valences = profile.emotionHistory.map((e) =>
      e.valence === 'positive' ? 1 : e.valence === 'neutral' ? 0 : -1
    );
    const arousals = profile.emotionHistory.map((e) =>
      e.arousal === 'high' ? 1 : e.arousal === 'medium' ? 0.5 : 0
    );

    profile.avgValence = valences.reduce<number>((a, b) => a + b, 0) / Math.max(valences.length, 1);
    profile.avgArousal = arousals.reduce<number>((a, b) => a + b, 0) / Math.max(arousals.length, 1);
    profile.dominantEmotion = this.findDominantEmotion(profile.emotionHistory);
    profile.lastDetected = Date.now();

    this.emotionProfiles.set(userId, profile);
    return profile;
  }

  getEmotionHistory(userId?: string, limit: number = 50): EmotionEvent[] {
    if (!userId) {
      return [...this.emotionHistory].sort((a, b) => b.timestamp - a.timestamp).slice(0, limit);
    }
    return this.emotionHistory
      .filter((e) => e.id.startsWith(userId))
      .sort((a, b) => b.timestamp - a.timestamp)
      .slice(0, limit);
  }

  clearEmotionHistory(userId: string): void {
    const profile = this.emotionProfiles.get(userId);
    if (profile) {
      profile.emotionHistory = [];
      profile.avgValence = 0;
      profile.avgArousal = 0;
    }
    this.currentStates.delete(userId);
    this.emotionHistory = this.emotionHistory.filter((e) => !e.id.startsWith(userId));
  }

  private computeEmotionScores(signals: Record<string, number>): Record<EmotionType, number> {
    const scores: Record<EmotionType, number> = {
      joy: 0,
      trust: 0,
      fear: 0,
      surprise: 0,
      sadness: 0,
      disgust: 0,
      anger: 0,
      anticipation: 0,
      frustration: 0,
      satisfaction: 0,
      confusion: 0,
      boredom: 0,
      excitement: 0,
      calm: 0,
    };

    for (const [key, value] of Object.entries(signals)) {
      if (value <= 0) continue;

      switch (key) {
        case 'success':
        case 'completion':
          scores.satisfaction += value * 0.8;
          scores.joy += value * 0.6;
          break;
        case 'error':
        case 'failure':
          scores.frustration += value * 0.9;
          scores.anger += value * 0.5;
          scores.sadness += value * 0.3;
          break;
        case 'delay':
        case 'loading_slow':
          scores.frustration += value * 0.7;
          scores.boredom += value * 0.5;
          break;
        case 'achievement':
        case 'milestone':
          scores.excitement += value * 0.8;
          scores.joy += value * 0.7;
          scores.satisfaction += value * 0.6;
          break;
        case 'reward':
          scores.joy += value * 0.9;
          scores.trust += value * 0.5;
          break;
        case 'ambiguity':
        case 'unknown':
          scores.confusion += value * 0.8;
          scores.anticipation += value * 0.4;
          break;
        case 'repetition':
          scores.boredom += value * 0.9;
          scores.frustration += value * 0.3;
          break;
        case 'threat':
        case 'security_warning':
          scores.fear += value * 0.9;
          scores.anger += value * 0.4;
          break;
        case 'surprise_positive':
          scores.surprise += value * 0.9;
          scores.joy += value * 0.5;
          break;
        case 'surprise_negative':
          scores.surprise += value * 0.7;
          scores.disgust += value * 0.5;
          break;
        case 'helpful_interaction':
          scores.trust += value * 0.8;
          scores.calm += value * 0.5;
          break;
        case 'social_positive':
          scores.joy += value * 0.6;
          scores.trust += value * 0.4;
          break;
        case 'focus_flow':
          scores.calm += value * 0.7;
          scores.anticipation += value * 0.5;
          scores.excitement += value * 0.3;
          break;
        case 'beginner_success':
          scores.satisfaction += value * 0.9;
          scores.trust += value * 0.6;
          scores.joy += value * 0.4;
          break;
        case 'expert_challenge':
          scores.anticipation += value * 0.7;
          scores.excitement += value * 0.5;
          scores.frustration += value * 0.2;
          break;
        default:
          scores.anticipation += value * 0.1;
      }
    }

    return scores;
  }

  private determinePrimaryEmotion(scores: Record<EmotionType, number>): EmotionType {
    let maxScore = -Infinity;
    let dominant: EmotionType = 'calm';

    for (const [emotion, score] of Object.entries(scores)) {
      if (score > maxScore) {
        maxScore = score;
        dominant = emotion as EmotionType;
      }
    }

    return maxScore <= 0 ? 'calm' : dominant;
  }

  private determineSecondaryEmotion(
    scores: Record<EmotionType, number>,
    primary: EmotionType
  ): EmotionType | undefined {
    const primaryScore = scores[primary];
    const threshold = primaryScore * 0.4;

    let secondary: EmotionType | undefined;
    for (const [emotion, score] of Object.entries(scores)) {
      if (emotion === primary) continue;
      if (score >= threshold && (!secondary || score > scores[secondary])) {
        secondary = emotion as EmotionType;
      }
    }

    return secondary;
  }

  private computeConfidence(scores: Record<EmotionType, number>): number {
    const values = Object.values(scores);
    const max = Math.max(...values);
    if (max <= 0) return 0.5;

    const total = values.reduce((a, b) => a + b, 0);
    const dominance = max / Math.max(total, 0.01);
    return Math.min(0.98, 0.5 + dominance * 0.48);
  }

  private computeIntensity(scores: Record<EmotionType, number>, primary: EmotionType): number {
    const rawScore = scores[primary];
    if (rawScore <= 0) return 0.3;
    return Math.min(1, 0.3 + rawScore * 0.7);
  }

  private extractTriggers(
    signals: Record<string, number>,
    context: Record<string, unknown>
  ): string[] {
    const triggers: string[] = [];
    for (const [key, value] of Object.entries(signals)) {
      if (value > 0) {
        triggers.push(key);
      }
    }
    if (context.action) {
      triggers.push(String(context.action));
    }
    return triggers;
  }

  private computeDesignResponse(emotion: EmotionState): DesignResponse {
    const { primaryEmotion, valence, arousal, emotionIntensity } = emotion;

    const animationType = this.selectAnimation(primaryEmotion, arousal);
    const feedbackStyle = this.selectFeedbackStyle(valence, emotionIntensity);
    const visualTone = this.selectVisualTone(valence, arousal, primaryEmotion);
    const colorAdjustments = this.computeColorAdjustments(valence, emotionIntensity);
    const messaging = this.computeMessaging(valence, primaryEmotion);
    const soundDesign = this.computeSoundDesign(valence, arousal, emotionIntensity);

    return {
      emotion,
      animationType,
      feedbackStyle,
      visualTone,
      colorAdjustments,
      messaging,
      soundDesign,
    };
  }

  private selectAnimation(emotion: EmotionType, arousal: Arousal): AnimationType {
    if (arousal === 'low') return 'fade';
    if (arousal === 'high') {
      switch (emotion) {
        case 'joy':
        case 'excitement':
        case 'satisfaction':
          return 'bounce';
        case 'frustration':
        case 'anger':
        case 'fear':
          return 'shake';
        case 'surprise':
          return 'pulse';
        default:
          return 'pulse';
      }
    }
    switch (emotion) {
      case 'joy':
      case 'satisfaction':
        return 'bounce';
      case 'calm':
      case 'trust':
        return 'fade';
      case 'confusion':
      case 'anticipation':
        return 'glow';
      default:
        return 'slide';
    }
  }

  private selectFeedbackStyle(valence: Valence, intensity: number): FeedbackStyle {
    if (valence === 'negative' && intensity > 0.7) return 'dialog';
    if (valence === 'positive' && intensity > 0.6) return 'toast';
    if (intensity > 0.5) return 'inline';
    return 'silent';
  }

  private selectVisualTone(valence: Valence, arousal: Arousal, emotion: EmotionType): VisualTone {
    if (valence === 'positive' && arousal === 'high') return 'vibrant';
    if (valence === 'negative' && arousal === 'high') return 'dramatic';
    if (valence === 'positive') return 'warm';
    if (valence === 'negative') return 'cool';
    if (emotion === 'calm' || emotion === 'trust') return 'subtle';
    return 'neutral';
  }

  private computeColorAdjustments(
    valence: Valence,
    intensity: number
  ): DesignResponse['colorAdjustments'] {
    if (valence === 'positive') {
      return {
        saturation: Math.min(1.2, 1 + intensity * 0.2),
        brightness: Math.min(1.1, 1 + intensity * 0.1),
        contrast: 1,
        warmth: 0.1 + intensity * 0.1,
      };
    }
    if (valence === 'negative') {
      return {
        saturation: Math.max(0.7, 1 - intensity * 0.3),
        brightness: Math.max(0.9, 1 - intensity * 0.1),
        contrast: 1 + intensity * 0.1,
        warmth: -0.1 - intensity * 0.05,
      };
    }
    return {
      saturation: 1,
      brightness: 1,
      contrast: 1,
      warmth: 0,
    };
  }

  private computeMessaging(valence: Valence, emotion: EmotionType): DesignResponse['messaging'] {
    let tone: DesignResponse['messaging']['tone'] = 'neutral';
    let style: DesignResponse['messaging']['style'] = 'professional';
    const suggestions: string[] = [];

    if (valence === 'positive') {
      tone = 'encouraging';
      style = 'casual';
      if (emotion === 'satisfaction') suggestions.push('继续保持！');
      if (emotion === 'joy') suggestions.push('太棒了！');
      if (emotion === 'excitement') suggestions.push('很高兴看到你的热情！');
    } else if (valence === 'negative') {
      tone = 'empathetic';
      style = 'professional';
      if (emotion === 'frustration') suggestions.push('我理解这可能令人沮丧。让我们一起解决。');
      if (emotion === 'confusion') suggestions.push('这部分确实复杂，我来帮你梳理。');
      if (emotion === 'boredom') suggestions.push('让我们让这个过程更有趣一些。');
      if (emotion === 'anger') suggestions.push('深呼吸，我们来分析问题。');
    } else {
      tone = 'neutral';
      style = 'professional';
      if (emotion === 'anticipation') suggestions.push('让我们看看接下来会发生什么。');
      if (emotion === 'surprise') suggestions.push('这是一个有趣的变化！');
    }

    return { tone, style, suggestions };
  }

  private computeSoundDesign(
    valence: Valence,
    arousal: Arousal,
    intensity: number
  ): DesignResponse['soundDesign'] {
    const enable = intensity > 0.5;
    let soundType: DesignResponse['soundDesign']['soundType'] = 'neutral';

    if (valence === 'positive') soundType = 'pleasant';
    else if (valence === 'negative' && arousal === 'high') soundType = 'warning';
    else if (arousal === 'high') soundType = 'attention';

    return {
      enable_sound: enable,
      soundType,
      volume: intensity * 0.3,
    };
  }

  private initializeEmotionProfile(userId: string, emotion: EmotionState): EmotionProfile {
    const profile: EmotionProfile = {
      userId,
      emotionHistory: [emotion],
      dominantEmotion: emotion.primaryEmotion,
      avgValence: emotion.valence === 'positive' ? 1 : emotion.valence === 'neutral' ? 0 : -1,
      avgArousal: emotion.arousal === 'high' ? 1 : emotion.arousal === 'medium' ? 0.5 : 0,
      lastDetected: Date.now(),
    };
    this.emotionProfiles.set(userId, profile);
    return profile;
  }

  private findDominantEmotion(history: EmotionState[]): EmotionType {
    const counts: Record<string, number> = {};
    for (const e of history) {
      counts[e.primaryEmotion] = (counts[e.primaryEmotion] || 0) + 1;
    }

    let maxCount = 0;
    let dominant: EmotionType = 'calm';
    for (const [emotion, count] of Object.entries(counts)) {
      if (count > maxCount) {
        maxCount = count;
        dominant = emotion as EmotionType;
      }
    }
    return dominant;
  }
}

export const emotionalDesignEngine = new EmotionalDesignEngine();
