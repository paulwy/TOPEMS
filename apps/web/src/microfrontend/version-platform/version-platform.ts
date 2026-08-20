import i18n from '@/i18n';

export type VersionStatus = 'active' | 'canary' | 'deprecated' | 'rollback';

export type VersioningStrategy = 'semver' | 'date' | 'hash';

export interface ModuleVersion {
  version: string;
  entryUrl: string;
  releaseNotes?: string;
  releaseDate: number;
  status: VersionStatus;
  sizeKB?: number;
  compatibility?: string[];
  breakingChanges?: string[];
}

export interface VersionComparison {
  version1: string;
  version2: string;
  isNewer: boolean;
  isOlder: boolean;
  isSame: boolean;
  level: 'major' | 'minor' | 'patch' | 'unknown';
}

const STORAGE_KEY = 'topems_mf_version_platform';

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

function compareSemver(
  v1: string,
  v2: string
): { result: number; level: 'major' | 'minor' | 'patch' | 'unknown' } {
  const parseSemver = (v: string): { major: number; minor: number; patch: number } | null => {
    const match = v.match(/^(\d+)\.(\d+)\.(\d+)/);
    if (!match) return null;
    return {
      major: parseInt(match[1], 10),
      minor: parseInt(match[2], 10),
      patch: parseInt(match[3], 10),
    };
  };

  const p1 = parseSemver(v1);
  const p2 = parseSemver(v2);

  if (!p1 || !p2) {
    return { result: v1.localeCompare(v2), level: 'unknown' };
  }

  if (p1.major !== p2.major) {
    return { result: p1.major > p2.major ? 1 : -1, level: 'major' };
  }
  if (p1.minor !== p2.minor) {
    return { result: p1.minor > p2.minor ? 1 : -1, level: 'minor' };
  }
  if (p1.patch !== p2.patch) {
    return { result: p1.patch > p2.patch ? 1 : -1, level: 'patch' };
  }

  return { result: 0, level: 'patch' };
}

class VersionPlatform {
  private static instance: VersionPlatform;
  private moduleVersions: Map<string, ModuleVersion[]> = new Map();
  private activeVersions: Map<string, string> = new Map();
  private previousVersions: Map<string, string> = new Map();
  private listeners: Set<(moduleId: string, versions: ModuleVersion[]) => void> = new Set();

  private constructor() {
    this.loadFromStorage();
  }

  static getInstance(): VersionPlatform {
    if (!VersionPlatform.instance) {
      VersionPlatform.instance = new VersionPlatform();
    }
    return VersionPlatform.instance;
  }

  private loadFromStorage(): void {
    try {
      const stored = readStorage<{
        moduleVersions: Record<string, ModuleVersion[]>;
        activeVersions: Record<string, string>;
        previousVersions: Record<string, string>;
      }>(STORAGE_KEY, { moduleVersions: {}, activeVersions: {}, previousVersions: {} });

      Object.entries(stored.moduleVersions || {}).forEach(([moduleId, versions]) => {
        this.moduleVersions.set(moduleId, versions);
      });
      Object.entries(stored.activeVersions || {}).forEach(([moduleId, version]) => {
        this.activeVersions.set(moduleId, version);
      });
      Object.entries(stored.previousVersions || {}).forEach(([moduleId, version]) => {
        this.previousVersions.set(moduleId, version);
      });
    } catch {
      // ignore
    }
  }

  private persist(): void {
    const data: {
      moduleVersions: Record<string, ModuleVersion[]>;
      activeVersions: Record<string, string>;
      previousVersions: Record<string, string>;
    } = {
      moduleVersions: {},
      activeVersions: {},
      previousVersions: {},
    };

    this.moduleVersions.forEach((versions, key) => {
      data.moduleVersions[key] = versions;
    });
    this.activeVersions.forEach((version, key) => {
      data.activeVersions[key] = version;
    });
    this.previousVersions.forEach((version, key) => {
      data.previousVersions[key] = version;
    });

    writeStorage(STORAGE_KEY, data);
  }

  private notifyListeners(moduleId: string): void {
    const versions = this.getVersions(moduleId);
    this.listeners.forEach((l) => {
      try {
        l(moduleId, versions);
      } catch {
        // ignore
      }
    });
  }

  registerVersion(
    moduleId: string,
    versionInfo: Omit<ModuleVersion, 'releaseDate'> & { releaseDate?: number }
  ): ModuleVersion {
    const versions = this.moduleVersions.get(moduleId) || [];

    if (versions.some((v) => v.version === versionInfo.version)) {
      throw new Error(
        `${i18n.t('microfrontend.version-platform.k0')}${moduleId}${i18n.t('microfrontend.version-platform.k1')}${versionInfo.version}${i18n.t('microfrontend.version-platform.k2')}`
      );
    }

    const version: ModuleVersion = {
      ...versionInfo,
      releaseDate: versionInfo.releaseDate || Date.now(),
    };

    versions.push(version);
    versions.sort((a, b) => {
      const cmp = compareSemver(b.version, a.version);
      return cmp.result;
    });

    this.moduleVersions.set(moduleId, versions);
    this.persist();
    this.notifyListeners(moduleId);

    return version;
  }

  unregisterVersion(moduleId: string, version: string): boolean {
    const versions = this.moduleVersions.get(moduleId) || [];
    const idx = versions.findIndex((v) => v.version === version);

    if (idx === -1) return false;

    const wasActive = this.activeVersions.get(moduleId) === version;
    versions.splice(idx, 1);
    this.moduleVersions.set(moduleId, versions);

    if (wasActive && versions.length > 0) {
      this.activeVersions.set(moduleId, versions[0].version);
    } else if (wasActive) {
      this.activeVersions.delete(moduleId);
    }

    this.persist();
    this.notifyListeners(moduleId);

    return true;
  }

  getVersions(moduleId: string): ModuleVersion[] {
    return this.moduleVersions.get(moduleId) || [];
  }

  getActiveVersion(moduleId: string): ModuleVersion | undefined {
    const activeVersion = this.activeVersions.get(moduleId);
    if (!activeVersion) return undefined;

    const versions = this.getVersions(moduleId);
    return versions.find((v) => v.version === activeVersion);
  }

  setActiveVersion(moduleId: string, version: string): boolean {
    const versions = this.getVersions(moduleId);
    const targetVersion = versions.some((v) => v.version === version);

    if (!targetVersion) {
      return false;
    }

    const currentActive = this.activeVersions.get(moduleId);
    if (currentActive) {
      this.previousVersions.set(moduleId, currentActive);
    }

    this.activeVersions.set(moduleId, version);
    this.persist();
    this.notifyListeners(moduleId);

    return true;
  }

  rollbackVersion(moduleId: string): boolean {
    const previous = this.previousVersions.get(moduleId);
    if (!previous) return false;

    const current = this.activeVersions.get(moduleId);
    if (current) {
      this.activeVersions.set(moduleId, previous);
      this.previousVersions.set(moduleId, current);

      const versions = this.getVersions(moduleId);
      const prevVersion = versions.find((v) => v.version === previous);
      if (prevVersion) {
        prevVersion.status = 'rollback';
      }

      this.persist();
      this.notifyListeners(moduleId);
      return true;
    }

    return false;
  }

  getVersionHistory(moduleId: string, limit?: number): ModuleVersion[] {
    const versions = this.getVersions(moduleId);
    return limit ? versions.slice(0, limit) : versions;
  }

  compareVersions(_moduleId: string, v1: string, v2: string): VersionComparison {
    const cmp = compareSemver(v1, v2);

    return {
      version1: v1,
      version2: v2,
      isNewer: cmp.result > 0,
      isOlder: cmp.result < 0,
      isSame: cmp.result === 0,
      level: cmp.level,
    };
  }

  promoteVersion(moduleId: string, version: string, targetStatus: VersionStatus): boolean {
    const versions = this.getVersions(moduleId);
    const target = versions.find((v) => v.version === version);

    if (!target) return false;

    target.status = targetStatus;
    this.persist();
    this.notifyListeners(moduleId);

    return true;
  }

  demoteVersion(moduleId: string, version: string, reason?: string): boolean {
    const versions = this.getVersions(moduleId);
    const target = versions.find((v) => v.version === version);

    if (!target) return false;

    target.status = 'deprecated';
    if (reason && target.releaseNotes) {
      target.releaseNotes = `${target.releaseNotes}${i18n.t('microfrontend.version-platform.nn_3')}${reason}`;
    } else if (reason) {
      target.releaseNotes = `${i18n.t('microfrontend.version-platform.k4')}${reason}`;
    }

    this.persist();
    this.notifyListeners(moduleId);

    return true;
  }

  subscribe(callback: (moduleId: string, versions: ModuleVersion[]) => void): () => void {
    this.listeners.add(callback);
    return () => this.listeners.delete(callback);
  }

  clear(): void {
    this.moduleVersions.clear();
    this.activeVersions.clear();
    this.previousVersions.clear();
    this.persist();
  }
}

export const versionPlatform = VersionPlatform.getInstance();
export default versionPlatform;
