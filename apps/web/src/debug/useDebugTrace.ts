/**
 * @done V80-5 远程 tracing 开关
 *
 * 通过 localStorage 'topems_debug_trace' 启用/禁用
 * 用于生产环境临时开启 tracing，无需重新部署
 *
 * 浏览器控制台使用示例：
 *   localStorage.setItem('topems_debug_trace', JSON.stringify({ enabled: true, level: 'debug' }))
 *   location.reload()
 *   localStorage.removeItem('topems_debug_trace')
 *
 * React 组件内使用：
 *   const { config, setEnabled } = useDebugTrace();
 *   if (config.enabled && config.level === 'debug') { ... }
 */

const STORAGE_KEY = 'topems_debug_trace';

type DebugLevel = 'error' | 'warn' | 'info' | 'debug';

interface DebugTraceConfig {
  enabled: boolean;
  level: DebugLevel;
  namespaces: string[];
}

const DEFAULT: DebugTraceConfig = {
  enabled: false,
  level: 'info',
  namespaces: [],
};

function isDebugTraceConfig(value: unknown): value is Partial<DebugTraceConfig> {
  if (typeof value !== 'object' || value === null) return false;
  const v = value as Record<string, unknown>;
  if ('enabled' in v && typeof v.enabled !== 'boolean') return false;
  if ('level' in v && typeof v.level !== 'string') return false;
  if ('namespaces' in v && !Array.isArray(v.namespaces)) return false;
  return true;
}

export function getDebugTrace(): DebugTraceConfig {
  try {
    if (typeof localStorage === 'undefined') return DEFAULT;
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT;
    const parsed: unknown = JSON.parse(raw);
    if (!isDebugTraceConfig(parsed)) return DEFAULT;
    return { ...DEFAULT, ...parsed };
  } catch {
    return DEFAULT;
  }
}

function setDebugTrace(config: Partial<DebugTraceConfig>): void {
  if (typeof localStorage === 'undefined') return;
  const current = getDebugTrace();
  const next: DebugTraceConfig = { ...current, ...config };
  localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
}

function clearDebugTrace(): void {
  if (typeof localStorage === 'undefined') return;
  localStorage.removeItem(STORAGE_KEY);
}

interface UseDebugTraceReturn {
  config: DebugTraceConfig;
  setEnabled: (enabled: boolean) => void;
  setLevel: (level: DebugLevel) => void;
  addNamespace: (ns: string) => void;
  removeNamespace: (ns: string) => void;
  clear: () => void;
}

export function useDebugTrace(): UseDebugTraceReturn {
  return {
    config: getDebugTrace(),
    setEnabled: (enabled: boolean) => setDebugTrace({ enabled }),
    setLevel: (level: DebugLevel) => setDebugTrace({ level }),
    addNamespace: (ns: string) => {
      const c = getDebugTrace();
      if (!c.namespaces.includes(ns)) {
        setDebugTrace({ namespaces: [...c.namespaces, ns] });
      }
    },
    removeNamespace: (ns: string) => {
      const c = getDebugTrace();
      if (c.namespaces.includes(ns)) {
        setDebugTrace({ namespaces: c.namespaces.filter((n) => n !== ns) });
      }
    },
    clear: clearDebugTrace,
  };
}

export default useDebugTrace;
