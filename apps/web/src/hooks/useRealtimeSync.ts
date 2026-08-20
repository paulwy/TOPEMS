import { useState, useEffect, useCallback, useRef } from 'react';
import { webSocketService, type WebSocketMessage } from './useWebSocket';

export interface SyncOptions<T> {
  channel: string;
  initialData?: T;
  onDataChange?: (data: T) => void;
  onSyncError?: (error: string) => void;
  autoReconnect?: boolean;
  optimisticUpdate?: boolean;
}

export interface SyncState<T> {
  data: T;
  isSyncing: boolean;
  lastSyncTime: number | null;
  error: string | null;
}

export interface SyncActions<T> {
  update: (partial: Partial<T>) => Promise<void>;
  replace: (data: T) => Promise<void>;
  refresh: () => void;
  subscribe: () => void;
  unsubscribe: () => void;
}

function useRealtimeSync<T>(options: SyncOptions<T>): SyncState<T> & SyncActions<T> {
  const {
    channel,
    initialData,
    onDataChange,
    onSyncError,
    autoReconnect = true,
    optimisticUpdate = true,
  } = options;

  const [data, setData] = useState<T>(initialData as T);
  const [isSyncing, setIsSyncing] = useState(false);
  const [lastSyncTime, setLastSyncTime] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const pendingUpdates = useRef<Map<string, Partial<T>>>(new Map());

  const requestIdRef = useRef(0);
  const unsubscribeRef = useRef<(() => void) | null>(null);

  const generateRequestId = useCallback(() => {
    requestIdRef.current += 1;
    return `req-${Date.now()}-${requestIdRef.current}`;
  }, []);

  const handleMessage = useCallback(
    (message: WebSocketMessage) => {
      if (message.type !== channel) return;

      try {
        const payload = message.payload as Record<string, unknown>;
        const requestId = payload.request_id as string;

        if (requestId) {
          pendingUpdates.current.delete(requestId);
        }

        const newData = payload.data as T;
        if (newData) {
          setData(newData);
          setLastSyncTime(Date.now());
          setError(null);
          onDataChange?.(newData);
        }
      } catch (e) {
        const errorMsg = e instanceof Error ? e.message : 'Failed to parse sync message';
        setError(errorMsg);
        onSyncError?.(errorMsg);
      }
    },
    [channel, onDataChange, onSyncError]
  );

  const update = useCallback(
    async (partial: Partial<T>) => {
      const requestId = generateRequestId();

      if (optimisticUpdate) {
        setData((prev) => ({ ...prev, ...partial }));
        pendingUpdates.current.set(requestId, partial);
      }

      setIsSyncing(true);

      try {
        await webSocketService.send({
          type: channel,
          payload: {
            action: 'update',
            request_id: requestId,
            data: partial,
          },
        });
      } catch (e) {
        const errorMsg = e instanceof Error ? e.message : 'Failed to send update';
        setError(errorMsg);
        onSyncError?.(errorMsg);

        if (optimisticUpdate) {
          pendingUpdates.current.delete(requestId);
        }
      } finally {
        setTimeout(() => {
          setIsSyncing(false);
        }, 1000);
      }
    },
    [channel, generateRequestId, optimisticUpdate, onSyncError]
  );

  const replace = useCallback(
    async (newData: T) => {
      const requestId = generateRequestId();

      if (optimisticUpdate) {
        setData(newData);
      }

      setIsSyncing(true);

      try {
        await webSocketService.send({
          type: channel,
          payload: {
            action: 'replace',
            request_id: requestId,
            data: newData,
          },
        });
      } catch (e) {
        const errorMsg = e instanceof Error ? e.message : 'Failed to send replace';
        setError(errorMsg);
        onSyncError?.(errorMsg);
      } finally {
        setTimeout(() => {
          setIsSyncing(false);
        }, 1000);
      }
    },
    [channel, generateRequestId, optimisticUpdate, onSyncError]
  );

  const refresh = useCallback(() => {
    webSocketService.send({
      type: channel,
      payload: { action: 'refresh' },
    });
  }, [channel]);

  const subscribe = useCallback(() => {
    if (unsubscribeRef.current) return;

    unsubscribeRef.current = webSocketService.subscribe(channel, handleMessage);
    refresh();
  }, [channel, handleMessage, refresh]);

  const unsubscribe = useCallback(() => {
    if (unsubscribeRef.current) {
      unsubscribeRef.current();
      unsubscribeRef.current = null;
    }
  }, []);

  useEffect(() => {
    if (autoReconnect) {
      subscribe();
    }

    return () => {
      unsubscribe();
    };
  }, [autoReconnect, subscribe, unsubscribe]);

  useEffect(() => {
    const cleanupPending = setInterval(() => {
      const now = Date.now();
      let expiredCount = 0;

      pendingUpdates.current.forEach((_, requestId) => {
        const timestamp = parseInt(requestId.split('-')[1]) || 0;
        if (now - timestamp > 30000) {
          pendingUpdates.current.delete(requestId);
          expiredCount++;
        }
      });

      if (expiredCount > 0) {
        setError('Sync timeout, some updates may not have been applied');
      }
    }, 5000);

    return () => clearInterval(cleanupPending);
  }, []);

  return {
    data,
    isSyncing,
    lastSyncTime,
    error,
    update,
    replace,
    refresh,
    subscribe,
    unsubscribe,
  };
}

export interface ListSyncOptions<T> {
  channel: string;
  initialData?: T[];
  onDataChange?: (data: T[]) => void;
  onSyncError?: (error: string) => void;
  autoReconnect?: boolean;
  optimisticUpdate?: boolean;
  itemIdField?: string;
}

export interface ListSyncState<T> {
  data: T[];
  isSyncing: boolean;
  lastSyncTime: number | null;
  error: string | null;
}

export interface ListSyncActions<T> {
  add: (item: T) => Promise<void>;
  update: (id: string | number, partial: Partial<T>) => Promise<void>;
  remove: (id: string | number) => Promise<void>;
  replace: (data: T[]) => Promise<void>;
  refresh: () => void;
  subscribe: () => void;
  unsubscribe: () => void;
}

function useRealtimeListSync<T>(
  options: ListSyncOptions<T>
): ListSyncState<T> & ListSyncActions<T> {
  const {
    channel,
    initialData = [],
    onDataChange,
    onSyncError,
    autoReconnect = true,
    optimisticUpdate = true,
    itemIdField = 'id',
  } = options;

  const [data, setData] = useState<T[]>(initialData);
  const [isSyncing, setIsSyncing] = useState(false);
  const [lastSyncTime, setLastSyncTime] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  const requestIdRef = useRef(0);
  const unsubscribeRef = useRef<(() => void) | null>(null);

  const generateRequestId = useCallback(() => {
    requestIdRef.current += 1;
    return `req-${Date.now()}-${requestIdRef.current}`;
  }, []);

  const getItemId = useCallback(
    (item: T): string | number => {
      return (item as Record<string, unknown>)[itemIdField] as string | number;
    },
    [itemIdField]
  );

  const handleMessage = useCallback(
    (message: WebSocketMessage) => {
      if (message.type !== channel) return;

      try {
        const payload = message.payload as Record<string, unknown>;
        const action = payload.action as string;
        const itemData = payload.data as T;
        const itemsData = payload.items as T[];

        switch (action) {
          case 'init':
          case 'replace':
            if (itemsData) {
              setData(itemsData);
              setLastSyncTime(Date.now());
              onDataChange?.(itemsData);
            }
            break;
          case 'add':
            if (itemData) {
              setData((prev) => {
                const newList = [...prev, itemData];
                onDataChange?.(newList);
                return newList;
              });
              setLastSyncTime(Date.now());
            }
            break;
          case 'update':
            if (itemData) {
              setData((prev) => {
                const newList = prev.map((item) =>
                  getItemId(item) === getItemId(itemData) ? itemData : item
                );
                onDataChange?.(newList);
                return newList;
              });
              setLastSyncTime(Date.now());
            }
            break;
          case 'remove':
            const removeId = payload.id as string | number;
            setData((prev) => {
              const newList = prev.filter((item) => getItemId(item) !== removeId);
              onDataChange?.(newList);
              return newList;
            });
            setLastSyncTime(Date.now());
            break;
        }

        setError(null);
      } catch (e) {
        const errorMsg = e instanceof Error ? e.message : 'Failed to parse sync message';
        setError(errorMsg);
        onSyncError?.(errorMsg);
      }
    },
    [channel, getItemId, onDataChange, onSyncError]
  );

  const add = useCallback(
    async (item: T) => {
      const requestId = generateRequestId();

      if (optimisticUpdate) {
        setData((prev) => {
          const newList = [...prev, item];
          onDataChange?.(newList);
          return newList;
        });
      }

      setIsSyncing(true);

      try {
        await webSocketService.send({
          type: channel,
          payload: {
            action: 'add',
            request_id: requestId,
            data: item,
          },
        });
      } catch (e) {
        const errorMsg = e instanceof Error ? e.message : 'Failed to add item';
        setError(errorMsg);
        onSyncError?.(errorMsg);
      } finally {
        setTimeout(() => {
          setIsSyncing(false);
        }, 1000);
      }
    },
    [channel, generateRequestId, optimisticUpdate, onDataChange, onSyncError]
  );

  const update = useCallback(
    async (id: string | number, partial: Partial<T>) => {
      const requestId = generateRequestId();

      if (optimisticUpdate) {
        setData((prev) => {
          const newList = prev.map((item) =>
            getItemId(item) === id ? { ...item, ...partial } : item
          );
          onDataChange?.(newList);
          return newList;
        });
      }

      setIsSyncing(true);

      try {
        await webSocketService.send({
          type: channel,
          payload: {
            action: 'update',
            request_id: requestId,
            id,
            data: partial,
          },
        });
      } catch (e) {
        const errorMsg = e instanceof Error ? e.message : 'Failed to update item';
        setError(errorMsg);
        onSyncError?.(errorMsg);
      } finally {
        setTimeout(() => {
          setIsSyncing(false);
        }, 1000);
      }
    },
    [channel, generateRequestId, optimisticUpdate, getItemId, onDataChange, onSyncError]
  );

  const remove = useCallback(
    async (id: string | number) => {
      const requestId = generateRequestId();

      if (optimisticUpdate) {
        setData((prev) => {
          const newList = prev.filter((item) => getItemId(item) !== id);
          onDataChange?.(newList);
          return newList;
        });
      }

      setIsSyncing(true);

      try {
        await webSocketService.send({
          type: channel,
          payload: {
            action: 'remove',
            request_id: requestId,
            id,
          },
        });
      } catch (e) {
        const errorMsg = e instanceof Error ? e.message : 'Failed to remove item';
        setError(errorMsg);
        onSyncError?.(errorMsg);
      } finally {
        setTimeout(() => {
          setIsSyncing(false);
        }, 1000);
      }
    },
    [channel, generateRequestId, optimisticUpdate, getItemId, onDataChange, onSyncError]
  );

  const replace = useCallback(
    async (newData: T[]) => {
      const requestId = generateRequestId();

      if (optimisticUpdate) {
        setData(newData);
        onDataChange?.(newData);
      }

      setIsSyncing(true);

      try {
        await webSocketService.send({
          type: channel,
          payload: {
            action: 'replace',
            request_id: requestId,
            data: newData,
          },
        });
      } catch (e) {
        const errorMsg = e instanceof Error ? e.message : 'Failed to replace data';
        setError(errorMsg);
        onSyncError?.(errorMsg);
      } finally {
        setTimeout(() => {
          setIsSyncing(false);
        }, 1000);
      }
    },
    [channel, generateRequestId, optimisticUpdate, onDataChange, onSyncError]
  );

  const refresh = useCallback(() => {
    webSocketService.send({
      type: channel,
      payload: { action: 'refresh' },
    });
  }, [channel]);

  const subscribe = useCallback(() => {
    if (unsubscribeRef.current) return;

    unsubscribeRef.current = webSocketService.subscribe(channel, handleMessage);
    refresh();
  }, [channel, handleMessage, refresh]);

  const unsubscribe = useCallback(() => {
    if (unsubscribeRef.current) {
      unsubscribeRef.current();
      unsubscribeRef.current = null;
    }
  }, []);

  useEffect(() => {
    if (autoReconnect) {
      subscribe();
    }

    return () => {
      unsubscribe();
    };
  }, [autoReconnect, subscribe, unsubscribe]);

  return {
    data,
    isSyncing,
    lastSyncTime,
    error,
    add,
    update,
    remove,
    replace,
    refresh,
    subscribe,
    unsubscribe,
  };
}
