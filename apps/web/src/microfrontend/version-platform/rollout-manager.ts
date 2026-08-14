import i18n from '@/i18n';
export type RolloutType = 'canary' | 'blue-green' | 'rolling';

export type RolloutStatus = 'pending' | 'running' | 'paused' | 'completed' | 'cancelled' | 'failed';

export interface RolloutStrategy {
  type: RolloutType;
  percentage?: number;
  allowedUserIds?: string[];
  allowedRoles?: string[];
  allowedRegions?: string[];
  steps?: number;
  stepInterval?: number;
}

export interface Rollout {
  id: string;
  moduleId: string;
  version: string;
  strategy: RolloutStrategy;
  status: RolloutStatus;
  percentage: number;
  startedAt?: number;
  pausedAt?: number;
  completedAt?: number;
  cancelledAt?: number;
  failedAt?: number;
  error?: string;
  currentStep?: number;
  totalSteps?: number;
  affectedUsers?: number;
  successRate?: number;
}

export interface CanaryContext {
  userId?: string;
  roles?: string[];
  region?: string;
}

const STORAGE_KEY = 'topems_mf_rollout_manager';

function readStorage<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function writeStorage<T>(key: string, value: T): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // ignore
  }
}

function hashUserId(userId: string): number {
  let hash = 2166136261;
  for (let i = 0; i < userId.length; i++) {
    hash ^= userId.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return Math.abs(hash) % 100;
}

function generateId(): string {
  return `rollout_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
}

export class RolloutManager {
  private static instance: RolloutManager;
  private rollouts: Map<string, Rollout> = new Map();
  private listeners: Set<(rollout: Rollout) => void> = new Set();

  private constructor() {
    this.loadFromStorage();
  }

  static getInstance(): RolloutManager {
    if (!RolloutManager.instance) {
      RolloutManager.instance = new RolloutManager();
    }
    return RolloutManager.instance;
  }

  private loadFromStorage(): void {
    const stored = readStorage<Record<string, Rollout>>(STORAGE_KEY, {});
    Object.values(stored).forEach((r) => {
      this.rollouts.set(r.id, r);
    });
  }

  private persist(): void {
    const data: Record<string, Rollout> = {};
    this.rollouts.forEach((r, key) => {
      data[key] = r;
    });
    writeStorage(STORAGE_KEY, data);
  }

  private notifyListeners(rollout: Rollout): void {
    this.listeners.forEach((l) => {
      try {
        l(rollout);
      } catch {
        // ignore
      }
    });
  }

  createRollout(moduleId: string, version: string, strategy: RolloutStrategy): Rollout {
    const existingActive = this.getActiveRollout(moduleId);
    if (existingActive) {
      throw new Error(`${i18n.t('microfrontend.rollout-manager.k0')}${moduleId}${i18n.t('microfrontend.rollout-manager.k1')}${existingActive.id}`);
    }

    const rollout: Rollout = {
      id: generateId(),
      moduleId,
      version,
      strategy,
      status: 'pending',
      percentage: strategy.percentage || 0,
      currentStep: 0,
      totalSteps: strategy.steps || 10,
    };

    this.rollouts.set(rollout.id, rollout);
    this.persist();

    return rollout;
  }

  startRollout(rolloutId: string): boolean {
    const rollout = this.rollouts.get(rolloutId);
    if (!rollout || rollout.status !== 'pending') return false;

    rollout.status = 'running';
    rollout.startedAt = Date.now();
    if (rollout.strategy.type === 'canary') {
      rollout.percentage = rollout.strategy.percentage || 10;
    } else {
      rollout.percentage = 100;
    }

    this.persist();
    this.notifyListeners(rollout);
    return true;
  }

  pauseRollout(moduleId: string): boolean {
    const rollout = this.getActiveRollout(moduleId);
    if (!rollout || rollout.status !== 'running') return false;

    rollout.status = 'paused';
    rollout.pausedAt = Date.now();

    this.persist();
    this.notifyListeners(rollout);
    return true;
  }

  resumeRollout(moduleId: string): boolean {
    const rollout = this.getActiveRollout(moduleId);
    if (!rollout || rollout.status !== 'paused') return false;

    rollout.status = 'running';
    rollout.pausedAt = undefined;

    this.persist();
    this.notifyListeners(rollout);
    return true;
  }

  cancelRollout(moduleId: string): boolean {
    const rollout = this.getActiveRollout(moduleId);
    if (!rollout) return false;

    rollout.status = 'cancelled';
    rollout.cancelledAt = Date.now();
    rollout.percentage = 0;

    this.persist();
    this.notifyListeners(rollout);
    return true;
  }

  completeRollout(rolloutId: string): boolean {
    const rollout = this.rollouts.get(rolloutId);
    if (!rollout || rollout.status !== 'running') return false;

    rollout.status = 'completed';
    rollout.completedAt = Date.now();
    rollout.percentage = 100;

    this.persist();
    this.notifyListeners(rollout);
    return true;
  }

  failRollout(rolloutId: string, error: string): boolean {
    const rollout = this.rollouts.get(rolloutId);
    if (!rollout) return false;

    rollout.status = 'failed';
    rollout.failedAt = Date.now();
    rollout.error = error;

    this.persist();
    this.notifyListeners(rollout);
    return true;
  }

  getRolloutStatus(moduleId: string): Rollout | null {
    return this.getActiveRollout(moduleId);
  }

  getActiveRollout(moduleId: string): Rollout | null {
    for (const rollout of this.rollouts.values()) {
      if (
        rollout.moduleId === moduleId &&
        (rollout.status === 'running' ||
          rollout.status === 'paused' ||
          rollout.status === 'pending')
      ) {
        return rollout;
      }
    }
    return null;
  }

  adjustRolloutPercentage(moduleId: string, percent: number): boolean {
    const rollout = this.getActiveRollout(moduleId);
    if (!rollout || rollout.strategy.type !== 'canary') return false;

    rollout.percentage = Math.max(0, Math.min(100, percent));

    if (rollout.percentage >= 100) {
      rollout.status = 'completed';
      rollout.completedAt = Date.now();
    }

    this.persist();
    this.notifyListeners(rollout);
    return true;
  }

  shouldUseCanaryVersion(moduleId: string, context: CanaryContext): boolean {
    const rollout = this.getActiveRollout(moduleId);
    if (!rollout || rollout.status !== 'running') return false;
    if (rollout.strategy.type !== 'canary') return false;

    const { userId = '', roles = [], region = '' } = context;
    const strategy = rollout.strategy;

    if (strategy.allowedUserIds?.length && strategy.allowedUserIds.includes(userId)) {
      return true;
    }

    if (strategy.allowedRoles?.length && roles.length > 0) {
      const hasMatchingRole = roles.some((role) => strategy.allowedRoles!.includes(role));
      if (hasMatchingRole) return true;
    }

    if (strategy.allowedRegions?.length && region && strategy.allowedRegions.includes(region)) {
      return true;
    }

    const percentage = rollout.percentage || 0;
    if (percentage <= 0) return false;
    if (percentage >= 100) return true;

    if (userId) {
      const hash = hashUserId(userId);
      return hash < percentage;
    }

    return false;
  }

  getRolloutById(rolloutId: string): Rollout | undefined {
    return this.rollouts.get(rolloutId);
  }

  getRolloutsByModule(moduleId: string): Rollout[] {
    return Array.from(this.rollouts.values())
      .filter((r) => r.moduleId === moduleId)
      .sort((a, b) => {
        const aTime = a.startedAt || 0;
        const bTime = b.startedAt || 0;
        return bTime - aTime;
      });
  }

  getAllRollouts(): Rollout[] {
    return Array.from(this.rollouts.values()).sort((a, b) => {
      const aTime = a.startedAt || 0;
      const bTime = b.startedAt || 0;
      return bTime - aTime;
    });
  }

  getActiveRollouts(): Rollout[] {
    return Array.from(this.rollouts.values()).filter(
      (r) => r.status === 'running' || r.status === 'paused' || r.status === 'pending'
    );
  }

  subscribe(callback: (rollout: Rollout) => void): () => void {
    this.listeners.add(callback);
    return () => this.listeners.delete(callback);
  }

  clear(): void {
    this.rollouts.clear();
    this.persist();
  }
}

export const rolloutManager = RolloutManager.getInstance();
export default rolloutManager;
