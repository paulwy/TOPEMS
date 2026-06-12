import { useEffect, useRef, useCallback, useState } from "react";
import type { Notification } from "../api/notification";
import useNotificationSettings from "./useNotificationSettings";
import config from "../config/runtime";
import createLogger from "../utils/logger";

const logger = createLogger("WebSocket");

interface WsMessage {
  type:
    | "notification"
    | "unread_count"
    | "ping"
    | "pong"
    | "subscribe"
    | "unsubscribe";
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
  const connectionTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const onNotificationRef = useRef(onNotification);
  const onUnreadCountChangeRef = useRef(onUnreadCountChange);
  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [connectionStatus, setConnectionStatus] = useState<
    "disconnected" | "connecting" | "connected" | "error"
  >("disconnected");

  const {
    shouldShowNotification,
    shouldPlaySound,
    shouldShowDesktopNotification,
  } = useNotificationSettings();

  useEffect(() => {
    onNotificationRef.current = onNotification;
    onUnreadCountChangeRef.current = onUnreadCountChange;
  }, [onNotification, onUnreadCountChange]);

  const showDesktopNotification = useCallback(
    (notification: Notification) => {
      if (!shouldShowDesktopNotification()) return;

      if (!("Notification" in window)) {
        return;
      }

      if (Notification.permission === "granted") {
        new Notification(notification.title, {
          body: notification.content,
          icon: "/favicon.ico",
          tag: notification.id,
        });
      } else if (Notification.permission !== "denied") {
        Notification.requestPermission().then((permission) => {
          if (permission === "granted") {
            new Notification(notification.title, {
              body: notification.content,
              icon: "/favicon.ico",
              tag: notification.id,
            });
          }
        });
      }
    },
    [shouldShowDesktopNotification],
  );

  const playNotificationSound = useCallback(() => {
    if (!shouldPlaySound()) return;

    try {
      const playBeep = () => {
        try {
          const audioContext = new (
            window.AudioContext || (window as any).webkitAudioContext
          )();
          const oscillator = audioContext.createOscillator();
          const gainNode = audioContext.createGain();

          oscillator.connect(gainNode);
          gainNode.connect(audioContext.destination);

          oscillator.frequency.value = 800;
          oscillator.type = "sine";

          gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
          gainNode.gain.exponentialRampToValueAtTime(
            0.01,
            audioContext.currentTime + 0.2,
          );

          oscillator.start(audioContext.currentTime);
          oscillator.stop(audioContext.currentTime + 0.2);
        } catch (beepErr) {
          console.log("Web Audio API not available:", beepErr);
        }
      };

      const audio = new Audio("/notification-sound.mp3");
      audio.volume = 0.5;
      audio.play().catch((err) => {
        console.log("Audio file not found, using fallback beep:", err);
        playBeep();
      });
    } catch (err) {
      console.log("Audio initialization failed:", err);
    }
  }, [shouldPlaySound]);

  const resetState = useCallback(() => {
    if (pingIntervalRef.current) {
      clearInterval(pingIntervalRef.current);
      pingIntervalRef.current = null;
    }
    if (connectionTimeoutRef.current) {
      clearTimeout(connectionTimeoutRef.current);
      connectionTimeoutRef.current = null;
    }
    setIsConnected(false);
    setIsConnecting(false);
    setConnectionStatus("disconnected");
    wsRef.current = null;
  }, []);

  const connect = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      return;
    }

    if (isConnecting) {
      return;
    }

    resetState();

    try {
      const wsProtocol = window.location.protocol === "https:" ? "wss" : "ws";
      const notificationServiceUrl = config.services.notification;

      // 解析服务 URL，提取主机和端口
      let wsHost: string;
      let wsPath = "/ws/notifications";

      try {
        const url = new URL(notificationServiceUrl);
        // 从服务 URL 获取主机（包含端口）
        wsHost = url.host;
        // 如果服务 URL 有路径部分，保留路径
        if (url.pathname && url.pathname !== "/") {
          wsPath = `${url.pathname}${wsPath}`;
        }
      } catch {
        // 如果解析失败，回退到当前主机
        wsHost = window.location.host;
        logger.warn(
          "Failed to parse notification service URL, falling back to current host",
        );
      }

      const wsUrl = `${wsProtocol}://${wsHost}${wsPath}`;

      logger.info("Attempting to connect to notification service:", wsUrl);

      setIsConnecting(true);
      setConnectionStatus("connecting");
      setError(null);

      const ws = new WebSocket(wsUrl);

      connectionTimeoutRef.current = setTimeout(() => {
        if (ws.readyState === WebSocket.CONNECTING) {
          logger.warn("WebSocket connection timeout");
          try {
            if (
              ws.readyState === WebSocket.CONNECTING ||
              ws.readyState === WebSocket.OPEN
            ) {
              ws.close(1006, "Connection timeout");
            }
          } catch (e) {
            logger.error("Failed to close WebSocket on timeout:", e);
          }
        }
      }, 10000);

      ws.onopen = () => {
        if (connectionTimeoutRef.current) {
          clearTimeout(connectionTimeoutRef.current);
          connectionTimeoutRef.current = null;
        }

        logger.info("WebSocket connected");
        setIsConnected(true);
        setIsConnecting(false);
        setConnectionStatus("connected");
        setError(null);
        reconnectAttemptsRef.current = 0;

        ws.send(
          JSON.stringify({
            type: "subscribe",
            payload: { user_id: userId },
          }),
        );

        pingIntervalRef.current = setInterval(() => {
          if (ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify({ type: "ping" }));
          }
        }, 30000);
      };

      ws.onmessage = (event) => {
        try {
          const message: WsMessage = JSON.parse(event.data);

          switch (message.type) {
            case "notification":
              if (onNotificationRef.current && message.payload) {
                const notification = message.payload;
                if (shouldShowNotification(notification.notification_type)) {
                  onNotificationRef.current(notification);
                  showDesktopNotification(notification);
                  playNotificationSound();
                }
              }
              break;
            case "unread_count":
              if (
                onUnreadCountChangeRef.current &&
                message.payload !== undefined
              ) {
                onUnreadCountChangeRef.current(message.payload);
              }
              break;
            case "ping":
              ws.send(JSON.stringify({ type: "pong" }));
              break;
            case "pong":
              break;
            default:
              break;
          }
        } catch (err) {
          logger.error("Failed to parse WebSocket message:", err);
        }
      };

      ws.onerror = (err) => {
        logger.error("WebSocket error:", err);
        logger.error(
          "WebSocket error details:",
          JSON.stringify(err, Object.getOwnPropertyNames(err)),
        );

        if (ws.readyState === WebSocket.CONNECTING) {
          setConnectionStatus("error");
          setIsConnecting(false);
        }
      };

      ws.onclose = (event) => {
        logger.info(
          `WebSocket disconnected. Code: ${event.code}, Reason: ${event.reason}`,
        );

        resetState();

        if (event.code !== 1000 && event.code !== 1001) {
          if (reconnectAttemptsRef.current < maxReconnectAttempts) {
            const timeout =
              reconnectInterval * Math.pow(2, reconnectAttemptsRef.current);
            reconnectTimeoutRef.current = setTimeout(() => {
              reconnectAttemptsRef.current += 1;
              logger.info(
                `Reconnecting... Attempt ${reconnectAttemptsRef.current}`,
              );
              connect();
            }, timeout);
          } else {
            logger.warn(
              "Max reconnect attempts reached, stopping reconnection",
            );
            setError(
              "Notification service unavailable, please refresh the page",
            );
          }
        }
      };

      wsRef.current = ws;
    } catch (err) {
      logger.error("Failed to create WebSocket:", err);
      setError("Failed to create WebSocket connection");
      setIsConnecting(false);
      setConnectionStatus("error");
    }
  }, [
    userId,
    reconnectInterval,
    maxReconnectAttempts,
    shouldShowNotification,
    showDesktopNotification,
    playNotificationSound,
    resetState,
    isConnecting,
  ]);

  const disconnect = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
    }

    if (pingIntervalRef.current) {
      clearInterval(pingIntervalRef.current);
    }

    if (connectionTimeoutRef.current) {
      clearTimeout(connectionTimeoutRef.current);
    }

    if (wsRef.current) {
      wsRef.current.close(1000, "Client disconnect");
      wsRef.current = null;
    }

    setIsConnected(false);
    setIsConnecting(false);
    setConnectionStatus("disconnected");
  }, []);

  const sendMessage = useCallback((message: WsMessage) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(message));
    }
  }, []);

  useEffect(() => {
    if (autoConnect && userId) {
      const timer = setTimeout(() => {
        connect();
      }, 1000);

      return () => clearTimeout(timer);
    }

    return () => {
      disconnect();
    };
  }, [connect, disconnect, autoConnect, userId]);

  return {
    isConnected,
    isConnecting,
    connectionStatus,
    error,
    reconnect: connect,
    disconnect,
    sendMessage,
  };
};

export default useNotificationWebSocket;
