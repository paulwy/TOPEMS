let cloneMap = new WeakMap<object, unknown>();

export const deepClone = <T>(obj: T): T => {
  if (obj === null || typeof obj !== 'object') return obj;

  if (cloneMap.has(obj)) {
    return cloneMap.get(obj) as T;
  }

  if (Array.isArray(obj)) {
    const clone: unknown[] = [];
    cloneMap.set(obj, clone);
    for (let i = 0; i < obj.length; i++) {
      clone[i] = deepClone(obj[i]);
    }
    return clone as unknown as T;
  }

  if (obj instanceof Date) {
    return new Date(obj.getTime()) as unknown as T;
  }

  if (obj instanceof RegExp) {
    return new RegExp(obj.source, obj.flags) as unknown as T;
  }

  const clone: Record<string, unknown> = {};
  cloneMap.set(obj, clone);

  for (const key in obj) {
    if (Object.prototype.hasOwnProperty.call(obj, key)) {
      clone[key] = deepClone((obj as Record<string, unknown>)[key]);
    }
  }

  return clone as T;
};

export const clearCloneCache = (): void => {
  cloneMap = new WeakMap<object, unknown>();
};
