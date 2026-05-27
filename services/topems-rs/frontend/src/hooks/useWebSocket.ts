import { useState, useEffect, useCallback, useRef } from 'react';

export interface WebSocketOptions {
  url: string;
  protocols?: string | string[];
  reconnectDelay?: number;
  maxReconnectAttempts?: number;
  onOpen?: () => void;
  onClose?: (code: number, reason: string) => void;
  onError?: (error: Event) => void;
}

export interface WebSocketMessage<T = unknown> {
  type: string;
  payload: T;
}

export const useWebSocket = <T = unknown>(options: WebSocketOptions) => {
  const {
    url,
    protocols,
    reconnectDelay = 3000,
    maxReconnectAttempts = 5,
    onOpen,
    onClose,
    onError,
  } = options;

  const [connected, setConnected] = useState(false);
  const [messages, setMessages] = useState<WebSocketMessage<T>[]>([]);
  const [reconnectAttempts, setReconnectAttempts] = useState(0);
  
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<number | null>(null);

  const connect = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      return;
    }

    const ws = new WebSocket(url, protocols);

    ws.onopen = () => {
      setConnected(true);
      setReconnectAttempts(0);
      onOpen?.();
    };

    ws.onmessage = (event) => {
      try {
        const message: WebSocketMessage<T> = JSON.parse(event.data);
        setMessages((prev) => [...prev, message]);
      } catch (error) {
        console.error('Failed to parse WebSocket message:', error);
      }
    };

    ws.onerror = (error) => {
      onError?.(error);
    };

    ws.onclose = (event) => {
      setConnected(false);
      onClose?.(event.code, event.reason);

      if (reconnectAttempts < maxReconnectAttempts) {
        reconnectTimeoutRef.current = window.setTimeout(() => {
          setReconnectAttempts((prev) => prev + 1);
          connect();
        }, reconnectDelay);
      }
    };

    wsRef.current = ws;
  }, [url, protocols, reconnectDelay, maxReconnectAttempts, reconnectAttempts, onOpen, onClose, onError]);

  useEffect(() => {
    connect();

    return () => {
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, [connect]);

  const send = useCallback((message: WebSocketMessage<T>) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(message));
      return true;
    }
    return false;
  }, []);

  const sendRaw = useCallback((data: string) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(data);
      return true;
    }
    return false;
  }, []);

  const close = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
    }
    if (wsRef.current) {
      wsRef.current.close();
    }
  }, []);

  const clearMessages = useCallback(() => {
    setMessages([]);
  }, []);

  return {
    connected,
    messages,
    send,
    sendRaw,
    close,
    clearMessages,
    reconnectAttempts,
  };
};

export interface Subscription {
  channel: string;
  callback: (data: unknown) => void;
}

export const useRealtime = <T = unknown>(
  url: string,
  subscriptions: Subscription[] = []
) => {
  const [subscribedChannels, setSubscribedChannels] = useState<string[]>([]);

  const handleMessage = useCallback(
    (message: WebSocketMessage<T>) => {
      const subscription = subscriptions.find((sub) => sub.channel === message.type);
      if (subscription) {
        subscription.callback(message.payload);
      }
    },
    [subscriptions]
  );

  const { connected, messages, send, close } = useWebSocket<T>({
    url,
    onOpen: () => {
      subscriptions.forEach((sub) => {
        send({ type: 'subscribe', payload: { channel: sub.channel } as unknown as T });
        setSubscribedChannels((prev) => [...prev, sub.channel]);
      });
    },
  });

  useEffect(() => {
    messages.forEach((message) => {
      handleMessage(message);
    });
  }, [messages, handleMessage]);

  const subscribe = useCallback(
    (channel: string, callback: (data: unknown) => void) => {
      const newSubscription: Subscription = { channel, callback };
      
      if (!subscriptions.find((sub) => sub.channel === channel)) {
        if (connected) {
          send({ type: 'subscribe', payload: { channel } as unknown as T });
        }
      }
      
      return () => {
        if (connected) {
          send({ type: 'unsubscribe', payload: { channel } as unknown as T });
        }
      };
    },
    [subscriptions, connected, send]
  );

  return {
    connected,
    subscribedChannels,
    subscribe,
    unsubscribe: close,
  };
};

export interface EventSourceMessage {
  id: string;
  event: string;
  data: string;
}

export const useEventSource = (url: string, eventNames: string[] = []) => {
  const [connected, setConnected] = useState(false);
  const [messages, setMessages] = useState<EventSourceMessage[]>([]);
  
  const esRef = useRef<EventSource | null>(null);

  useEffect(() => {
    const es = new EventSource(url);

    es.onopen = () => {
      setConnected(true);
    };

    es.onerror = () => {
      setConnected(false);
    };

    eventNames.forEach((eventName) => {
      es.addEventListener(eventName, (event: EventSourceEvent) => {
        const message: EventSourceMessage = {
          id: event.lastEventId,
          event: event.type,
          data: event.data,
        };
        setMessages((prev) => [...prev, message]);
      });
    });

    esRef.current = es;

    return () => {
      es.close();
    };
  }, [url, eventNames]);

  const close = useCallback(() => {
    esRef.current?.close();
  }, []);

  const clearMessages = useCallback(() => {
    setMessages([]);
  }, []);

  return {
    connected,
    messages,
    close,
    clearMessages,
  };
};

export default useWebSocket;
