import { useEffect, useRef, useCallback, useState } from 'react';
import type { Notification } from '../api/notification';
import useNotificationSettings from './useNotificationSettings';
import config from '../config/runtime';
import createLogger from '../utils/logger';

const logger = createLogger('WebSocket');

interface WsMessage {
  type: 'notification' | 'unread_count' | 'ping' | 'pong' | 'subscribe' | 'unsubscribe';
  payload?: any;
}

interface UseNotificationWebSocketOptions {
  userId: string;
  onNotification?: (notification: Notification) => void;
  onUnreadCountChange?: (count: number) => void;
  reconnectInterval?: number;
  maxReconnectAttempts?: number;
  autoConnect?: boolean;
}

export const useNotificationWebSocket = ({
  userId,
  onNotification,
  onUnreadCountChange,
  reconnectInterval = config.ws.reconnectInterval,
  maxReconnectAttempts = config.ws.maxReconnectAttempts,
  autoConnect = false,
}: UseNotificationWebSocketOptions) => {
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectAttemptsRef = useRef(0);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const pingIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const onNotificationRef = useRef(onNotification);
  const onUnreadCountChangeRef = useRef(onUnreadCountChange);
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { shouldShowNotification, shouldPlaySound, shouldShowDesktopNotification } = useNotificationSettings();

  // 更新 refs 中的回调，避免 connect 函数依赖变化
  useEffect(() => {
    onNotificationRef.current = onNotification;
    onUnreadCountChangeRef.current = onUnreadCountChange;
  }, [onNotification, onUnreadCountChange]);

  const showDesktopNotification = useCallback(
    (notification: Notification) => {
      if (!shouldShowDesktopNotification()) return;

      if (!('Notification' in window)) {
        return;
      }

      if (Notification.permission === 'granted') {
        new Notification(notification.title, {
          body: notification.content,
          icon: '/favicon.ico',
          tag: notification.id,
        });
      } else if (Notification.permission !== 'denied') {
        Notification.requestPermission().then((permission) => {
          if (permission === 'granted') {
            new Notification(notification.title, {
              body: notification.content,
              icon: '/favicon.ico',
              tag: notification.id,
            });
          }
        });
      }
    },
    [shouldShowDesktopNotification]
  );

  const playNotificationSound = useCallback(() => {
    if (!shouldPlaySound()) return;

    try {
      // 尝试使用 Web Audio API 生成简单提示音（避免依赖外部文件）
      const playBeep = () => {
        try {
          const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
          const oscillator = audioContext.createOscillator();
          const gainNode = audioContext.createGain();

          oscillator.connect(gainNode);
          gainNode.connect(audioContext.destination);

          oscillator.frequency.value = 800;
          oscillator.type = 'sine';

          gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
          gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.2);

          oscillator.start(audioContext.currentTime);
          oscillator.stop(audioContext.currentTime + 0.2);
        } catch (beepErr) {
          console.log('Web Audio API not available:', beepErr);
        }
      };

      // 先尝试播放文件，如果失败则用 Beep
      const audio = new Audio('/notification-sound.mp3');
      audio.volume = 0.5;
      audio.play().catch((err) => {
        console.log('Audio file not found, using fallback beep:', err);
        playBeep();
      });
    } catch (err) {
      console.log('Audio initialization failed:', err);
    }
  }, [shouldPlaySound]);

  const connect = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      return;
    }

    try {
      const notificationUrl = config.services.notification;
      const wsProtocol = notificationUrl.startsWith('https') ? 'wss' : 'ws';
      const wsHost = notificationUrl.replace(/^https?:\/\//, '');
      const wsUrl = `${wsProtocol}://${wsHost}/ws/notifications`;
      logger.info('Attempting to connect to notification service:', wsUrl);
      const ws = new WebSocket(wsUrl);

      ws.onopen = () => {
        logger.info('WebSocket connected');
        setIsConnected(true);
        setError(null);
        reconnectAttemptsRef.current = 0;

        ws.send(
          JSON.stringify({
            type: 'subscribe',
            payload: { user_id: userId },
          })
        );

        pingIntervalRef.current = setInterval(() => {
          if (ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify({ type: 'ping' }));
          }
        }, 30000);
      };

      ws.onmessage = (event) => {
        try {
          const message: WsMessage = JSON.parse(event.data);

          switch (message.type) {
            case 'notification':
              if (onNotificationRef.current && message.payload) {
                const notification = message.payload;
                if (shouldShowNotification(notification.notification_type)) {
                  onNotificationRef.current(notification);
                  showDesktopNotification(notification);
                  playNotificationSound();
                }
              }
              break;
            case 'unread_count':
              if (onUnreadCountChangeRef.current && message.payload !== undefined) {
                onUnreadCountChangeRef.current(message.payload);
              }
              break;
            case 'pong':
              break;
            default:
              break;
          }
        } catch (err) {
          logger.error('Failed to parse WebSocket message:', err);
        }
      };

      ws.onerror = (err) => {
        logger.error('WebSocket error:', err);
        setError('WebSocket connection error');
      };

      ws.onclose = () => {
        logger.info('WebSocket disconnected');
        setIsConnected(false);

        if (pingIntervalRef.current) {
          clearInterval(pingIntervalRef.current);
        }

        if (reconnectAttemptsRef.current < maxReconnectAttempts) {
          const timeout = reconnectInterval * Math.pow(2, reconnectAttemptsRef.current);
          reconnectTimeoutRef.current = setTimeout(() => {
            reconnectAttemptsRef.current += 1;
            logger.info(`Reconnecting... Attempt ${reconnectAttemptsRef.current}`);
            connect();
          }, timeout);
        }
      };

      wsRef.current = ws;
    } catch (err) {
      logger.error('Failed to create WebSocket:', err);
      setError('Failed to create WebSocket connection');
    }
  }, [
    userId,
    reconnectInterval,
    maxReconnectAttempts,
    shouldShowNotification,
    showDesktopNotification,
    playNotificationSound,
  ]);

  const disconnect = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
    }

    if (pingIntervalRef.current) {
      clearInterval(pingIntervalRef.current);
    }

    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
  }, []);

  const sendMessage = useCallback((message: WsMessage) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(message));
    }
  }, []);

  // Control auto-connect with option
  useEffect(() => {
    if (autoConnect) {
      connect();
    }

    return () => {
      disconnect();
    };
  }, [connect, disconnect, autoConnect]);

  return {
    isConnected,
    error,
    reconnect: connect,
    disconnect,
    sendMessage,
  };
};

export default useNotificationWebSocket;
