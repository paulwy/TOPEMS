export interface ModuleVisit {
  moduleId: string;
  path: string;
  startTime: number;
  endTime?: number;
  duration?: number;
  actions: ModuleAction[];
}

export interface ModuleAction {
  type: string;
  timestamp: number;
  moduleId: string;
  path?: string;
}

export interface ModuleVisitStats {
  moduleId: string;
  visitCount: number;
  totalDuration: number;
  averageDuration: number;
  actionCount: number;
  actionsByType: Record<string, number>;
  firstVisit: number;
  lastVisit: number;
}

export interface NavigationPath {
  path: string[];
  count: number;
}

const STORAGE_KEY = 'microfrontend_behavior_analytics';
const MAX_VISITS = 500;
const MAX_NAVIGATION_PATHS = 100;
const MAX_PATH_LENGTH = 10;

class UserBehaviorAnalytics {
  private visits: ModuleVisit[] = [];
  private activeVisits: Map<string, ModuleVisit> = new Map();
  private navigationPaths: string[] = [];
  private pathCounts: Map<string, number> = new Map();

  trackModuleVisit(moduleId: string, path: string): void {
    const visit: ModuleVisit = {
      moduleId,
      path,
      startTime: Date.now(),
      actions: [],
    };

    this.activeVisits.set(moduleId, visit);
    this.visits.push(visit);
    this.trimVisits();

    this.navigationPaths.push(moduleId);
    if (this.navigationPaths.length > MAX_PATH_LENGTH) {
      this.navigationPaths.shift();
    }

    const pathKey = this.navigationPaths.join(' -> ');
    const currentCount = this.pathCounts.get(pathKey) || 0;
    this.pathCounts.set(pathKey, currentCount + 1);
    this.trimNavigationPaths();

    this.persistToStorage();
  }

  trackModuleAction(moduleId: string, actionType: string, path?: string): void {
    const action: ModuleAction = {
      type: actionType,
      timestamp: Date.now(),
      moduleId,
      path,
    };

    const activeVisit = this.activeVisits.get(moduleId);
    if (activeVisit) {
      activeVisit.actions.push(action);
    }

    this.persistToStorage();
  }

  endModuleVisit(moduleId: string): void {
    const visit = this.activeVisits.get(moduleId);
    if (!visit) return;

    visit.endTime = Date.now();
    visit.duration = visit.endTime - visit.startTime;

    this.activeVisits.delete(moduleId);
    this.persistToStorage();
  }

  getModuleVisitStats(moduleId?: string): ModuleVisitStats | ModuleVisitStats[] {
    if (moduleId) {
      return this.calculateModuleStats(moduleId);
    }

    const moduleIds = new Set(this.visits.map((v) => v.moduleId));
    const stats: ModuleVisitStats[] = [];

    moduleIds.forEach((id) => {
      stats.push(this.calculateModuleStats(id));
    });

    return stats.sort((a, b) => b.visitCount - a.visitCount);
  }

  getTopModules(limit = 10): ModuleVisitStats[] {
    const allStats = this.getModuleVisitStats() as ModuleVisitStats[];
    return allStats.slice(0, limit);
  }

  getNavigationPaths(limit = 20): NavigationPath[] {
    const paths: NavigationPath[] = [];
    this.pathCounts.forEach((count, pathKey) => {
      paths.push({
        path: pathKey.split(' -> '),
        count,
      });
    });

    return paths.sort((a, b) => b.count - a.count).slice(0, limit);
  }

  clearBehaviorData(): void {
    this.visits = [];
    this.activeVisits.clear();
    this.navigationPaths = [];
    this.pathCounts.clear();
    this.persistToStorage();
  }

  private calculateModuleStats(moduleId: string): ModuleVisitStats {
    const moduleVisits = this.visits.filter((v) => v.moduleId === moduleId);
    const completedVisits = moduleVisits.filter((v) => v.duration !== undefined);

    const totalDuration = completedVisits.reduce((sum, v) => sum + (v.duration || 0), 0);
    const averageDuration = completedVisits.length > 0 ? totalDuration / completedVisits.length : 0;

    const allActions = moduleVisits.flatMap((v) => v.actions);
    const actionCount = allActions.length;
    const actionsByType: Record<string, number> = {};

    allActions.forEach((action) => {
      actionsByType[action.type] = (actionsByType[action.type] || 0) + 1;
    });

    const firstVisit =
      moduleVisits.length > 0 ? Math.min(...moduleVisits.map((v) => v.startTime)) : 0;
    const lastVisit =
      moduleVisits.length > 0 ? Math.max(...moduleVisits.map((v) => v.endTime || v.startTime)) : 0;

    return {
      moduleId,
      visitCount: moduleVisits.length,
      totalDuration,
      averageDuration,
      actionCount,
      actionsByType,
      firstVisit,
      lastVisit,
    };
  }

  private trimVisits(): void {
    if (this.visits.length <= MAX_VISITS) return;

    const activeVisitIds = new Set(this.activeVisits.keys());
    const inactiveVisits = this.visits.filter((v) => !activeVisitIds.has(v.moduleId));

    if (inactiveVisits.length > 0) {
      const toRemove = inactiveVisits.length - (MAX_VISITS - this.activeVisits.size);
      if (toRemove > 0) {
        const toRemoveSet = new Set(inactiveVisits.slice(0, toRemove));
        this.visits = this.visits.filter((v) => !toRemoveSet.has(v));
      }
    }
  }

  private trimNavigationPaths(): void {
    if (this.pathCounts.size <= MAX_NAVIGATION_PATHS) return;

    const sorted = Array.from(this.pathCounts.entries()).sort((a, b) => a[1] - b[1]);
    const toRemove = sorted.slice(0, sorted.length - MAX_NAVIGATION_PATHS);
    toRemove.forEach(([key]) => this.pathCounts.delete(key));
  }

  private persistToStorage(): void {
    if (typeof localStorage === 'undefined') return;

    try {
      const data = {
        visits: this.visits,
        pathCounts: Array.from(this.pathCounts.entries()),
      };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    } catch {
      // ignore
    }
  }

  loadFromStorage(): void {
    if (typeof localStorage === 'undefined') return;

    try {
      const data = localStorage.getItem(STORAGE_KEY);
      if (data) {
        const parsed = JSON.parse(data);
        if (parsed.visits) {
          this.visits = parsed.visits;
        }
        if (parsed.pathCounts) {
          this.pathCounts = new Map(parsed.pathCounts);
        }
      }
    } catch {
      // ignore
    }
  }
}

export const userBehaviorAnalytics = new UserBehaviorAnalytics();

export default userBehaviorAnalytics;
