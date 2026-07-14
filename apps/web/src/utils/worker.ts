export type WorkerMessage<T = unknown> = {
  id: string;
  type: 'execute' | 'result' | 'error';
  payload?: T;
  error?: string;
};

export type WorkerFn<T = unknown, R = unknown> = (data: T) => R;

export class TaskWorker {
  private worker: Worker;
  private taskId = 0;
  private callbacks: Map<string, { resolve: (value: unknown) => void; reject: (error: Error) => void }> = new Map<string, { resolve: (value: unknown) => void; reject: (error: Error) => void }>();

  constructor() {
    const workerCode = `
      self.onmessage = function(e) {
        const { id, type, payload } = e.data;
        if (type === 'execute') {
          try {
            const { fn, data } = payload;
            const result = (new Function('return ' + fn))()(data);
            self.postMessage({ id, type: 'result', payload: result });
          } catch (error) {
            self.postMessage({ id, type: 'error', error: error instanceof Error ? error.message : String(error) });
          }
        }
      };
    `;

    const blob = new Blob([workerCode], { type: 'application/javascript' });
    const url = URL.createObjectURL(blob);
    this.worker = new Worker(url);

    this.worker.onmessage = (e: MessageEvent<WorkerMessage>) => {
      const { id, type, payload, error } = e.data;
      const callback = this.callbacks.get(id);
      if (callback) {
        if (type === 'result') {
          callback.resolve(payload);
        } else if (type === 'error') {
          callback.reject(new Error(error));
        }
        this.callbacks.delete(id);
      }
    };

    this.worker.onerror = (e) => {
      console.error('[TaskWorker] Worker error:', e);
      e.preventDefault();
    };
  }

  async execute<T = unknown, R = unknown>(fn: WorkerFn<T, R>, data: T): Promise<R> {
    const id = `task-${++this.taskId}-${Date.now()}`;

    return new Promise((resolve, reject) => {
      this.callbacks.set(id, {
        resolve: (value: unknown) => resolve(value as R),
        reject,
      });
      this.worker.postMessage({
        id,
        type: 'execute',
        payload: {
          fn: fn.toString(),
          data,
        },
      });

      setTimeout(() => {
        const callback = this.callbacks.get(id);
        if (callback) {
          callback.reject(new Error('Worker task timeout'));
          this.callbacks.delete(id);
        }
      }, 30000);
    });
  }

  terminate() {
    this.worker.terminate();
    this.callbacks.clear();
  }
}

let globalWorker: TaskWorker | null = null;

export function getGlobalWorker(): TaskWorker {
  if (!globalWorker) {
    globalWorker = new TaskWorker();
  }
  return globalWorker;
}

export function runInWorker<T = unknown, R = unknown>(fn: WorkerFn<T, R>, data: T): Promise<R> {
  return getGlobalWorker().execute(fn, data);
}

export function fibonacci(n: number): number {
  if (n <= 1) return n;
  return fibonacci(n - 1) + fibonacci(n - 2);
}

export function factorial(n: number): number {
  if (n <= 1) return 1;
  return n * factorial(n - 1);
}

export function generateUUID(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

export function chunkArray<T>(array: T[], chunkSize: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < array.length; i += chunkSize) {
    chunks.push(array.slice(i, i + chunkSize));
  }
  return chunks;
}

export function debounce<T extends (...args: unknown[]) => unknown>(fn: T, delay: number): T {
  let timer: ReturnType<typeof setTimeout> | null = null;
  return ((...args: unknown[]) => {
    if (timer) clearTimeout(timer);
    timer = setTimeout(() => fn(...args), delay);
  }) as T;
}

export function throttle<T extends (...args: unknown[]) => unknown>(fn: T, limit: number): T {
  let inThrottle = false;
  return ((...args: unknown[]) => {
    if (!inThrottle) {
      fn(...args);
      inThrottle = true;
      setTimeout(() => (inThrottle = false), limit);
    }
  }) as T;
}

export function formatNumber(num: number, decimals = 2): string {
  return num.toLocaleString('zh-CN', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}

export function formatCurrency(amount: number, currency = 'CNY'): string {
  return new Intl.NumberFormat('zh-CN', {
    style: 'currency',
    currency,
  }).format(amount);
}

export function parseCSV(csv: string): string[][] {
  const lines = csv.split('\n');
  return lines.map((line) => {
    const result: string[] = [];
    let current = '';
    let inQuotes = false;

    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === ',' && !inQuotes) {
        result.push(current);
        current = '';
      } else {
        current += char;
      }
    }
    result.push(current);
    return result;
  });
}

export function validateEmail(email: string): boolean {
  const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return re.test(email);
}

export function validatePhone(phone: string): boolean {
  const re = /^1[3-9]\d{9}$/;
  return re.test(phone);
}

export function validateURL(url: string): boolean {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
}

export function generateRandomString(length: number): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

export function hashString(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return hash;
}

export function sortByKey<T>(array: T[], key: keyof T): T[] {
  return [...array].sort((a, b) => {
    const valA = a[key];
    const valB = b[key];
    if (typeof valA === 'string' && typeof valB === 'string') {
      return valA.localeCompare(valB);
    }
    if (typeof valA === 'number' && typeof valB === 'number') {
      return valA - valB;
    }
    return 0;
  });
}

export function groupByKey<T>(array: T[], key: keyof T): Map<T[keyof T], T[]> {
  const groups = new Map<T[keyof T], T[]>();
  for (const item of array) {
    const groupKey = item[key];
    if (!groups.has(groupKey)) {
      groups.set(groupKey, []);
    }
    groups.get(groupKey)!.push(item);
  }
  return groups;
}