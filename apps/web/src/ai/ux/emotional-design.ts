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
