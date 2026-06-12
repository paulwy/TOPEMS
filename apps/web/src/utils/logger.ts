import config from "../config/runtime";

const LOG_LEVELS = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
};

const levelMap: Record<string, number> = {
  debug: LOG_LEVELS.debug,
  info: LOG_LEVELS.info,
  warn: LOG_LEVELS.warn,
  error: LOG_LEVELS.error,
};

const currentLevel = levelMap[config.logging.level] || LOG_LEVELS.info;

export interface Logger {
  debug: (...args: unknown[]) => void;
  info: (...args: unknown[]) => void;
  warn: (...args: unknown[]) => void;
  error: (...args: unknown[]) => void;
  group: (label: string) => void;
  groupEnd: () => void;
}

const createLogger = (namespace: string): Logger => {
  const prefix = `[${namespace}]`;

  const shouldLog = (level: number): boolean => {
    if (config.features.debugMode) return true;
    return level >= currentLevel;
  };

  return {
    debug: (...args: unknown[]) => {
      if (shouldLog(LOG_LEVELS.debug)) {
        console.debug(prefix, ...args);
      }
    },
    info: (...args: unknown[]) => {
      if (shouldLog(LOG_LEVELS.info)) {
        console.info(prefix, ...args);
      }
    },
    warn: (...args: unknown[]) => {
      if (shouldLog(LOG_LEVELS.warn)) {
        console.warn(prefix, ...args);
      }
    },
    error: (...args: unknown[]) => {
      if (shouldLog(LOG_LEVELS.error)) {
        console.error(prefix, ...args);
      }
    },
    group: (label: string) => {
      if (shouldLog(LOG_LEVELS.debug)) {
        console.group(`${prefix} ${label}`);
      }
    },
    groupEnd: () => {
      if (shouldLog(LOG_LEVELS.debug)) {
        console.groupEnd();
      }
    },
  };
};

export default createLogger;

export const globalLogger = createLogger("TOPEMS");
