export type RequestPriority = 'critical' | 'high' | 'normal' | 'low' | 'background';

interface QueuedRequest {
  priority: RequestPriority;
  fn: () => Promise<any>;
  resolve: (value: any) => void;
  reject: (reason?: any) => void;
  createdAt: number;
}

class RequestPriorityQueue {
  private queue: QueuedRequest[] = [];
  private isProcessing = false;
  private isPageLoaded = false;
  private maxConcurrent = 3;
  private processingCount = 0;

  private priorityOrder: RequestPriority[] = ['critical', 'high', 'normal', 'low', 'background'];

  constructor() {
    this.init();
  }

  private init(): void {
    const checkLoaded = () => {
      if (document.readyState === 'complete') {
        this.isPageLoaded = true;
        this.processQueue();
      }
    };

    checkLoaded();
    window.addEventListener('load', checkLoaded);

    document.addEventListener('DOMContentLoaded', () => {
      setTimeout(() => {
        this.isPageLoaded = true;
        this.processQueue();
      }, 1000);
    });
  }

  private getPriorityWeight(priority: RequestPriority): number {
    return this.priorityOrder.indexOf(priority);
  }

  private sortQueue(): void {
    this.queue.sort((a, b) => {
      const weightDiff = this.getPriorityWeight(a.priority) - this.getPriorityWeight(b.priority);
      if (weightDiff !== 0) return weightDiff;
      return a.createdAt - b.createdAt;
    });
  }

  private canProcess(priority: RequestPriority): boolean {
    if (priority === 'critical') return true;
    if (priority === 'high') return true;
    return this.isPageLoaded;
  }

  private async processNext(): Promise<void> {
    if (this.processingCount >= this.maxConcurrent) return;

    this.sortQueue();

    const nextRequest = this.queue.find(req => this.canProcess(req.priority));
    
    if (!nextRequest) {
      this.isProcessing = false;
      return;
    }

    const index = this.queue.indexOf(nextRequest);
    if (index > -1) {
      this.queue.splice(index, 1);
    }

    this.processingCount++;
    this.isProcessing = true;

    try {
      const result = await nextRequest.fn();
      nextRequest.resolve(result);
    } catch (error) {
      nextRequest.reject(error);
    } finally {
      this.processingCount--;
      this.processNext();
    }
  }

  private processQueue(): void {
    if (this.isProcessing) return;
    while (this.processingCount < this.maxConcurrent) {
      this.processNext();
    }
  }

  public enqueue<T>(
    priority: RequestPriority,
    fn: () => Promise<T>
  ): Promise<T> {
    return new Promise((resolve, reject) => {
      const queuedRequest: QueuedRequest = {
        priority,
        fn: fn as () => Promise<any>,
        resolve,
        reject,
        createdAt: Date.now(),
      };

      this.queue.push(queuedRequest);

      if (priority === 'critical' || priority === 'high' || this.isPageLoaded) {
        this.processQueue();
      }
    });
  }

  public setPageLoaded(loaded: boolean = true): void {
    this.isPageLoaded = loaded;
    if (loaded) {
      this.processQueue();
    }
  }

  public getQueueSize(): number {
    return this.queue.length;
  }

  public getPendingByPriority(priority: RequestPriority): number {
    return this.queue.filter(req => req.priority === priority).length;
  }
}

export const requestPriorityQueue = new RequestPriorityQueue();

export const withPriority = <T>(
  priority: RequestPriority,
  fn: () => Promise<T>
): Promise<T> => {
  if (priority === 'critical' || priority === 'high') {
    return fn();
  }
  return requestPriorityQueue.enqueue(priority, fn);
};

export const setPageLoaded = (loaded: boolean = true): void => {
  requestPriorityQueue.setPageLoaded(loaded);
};

export const getQueueStats = () => ({
  total: requestPriorityQueue.getQueueSize(),
  critical: requestPriorityQueue.getPendingByPriority('critical'),
  high: requestPriorityQueue.getPendingByPriority('high'),
  normal: requestPriorityQueue.getPendingByPriority('normal'),
  low: requestPriorityQueue.getPendingByPriority('low'),
  background: requestPriorityQueue.getPendingByPriority('background'),
});