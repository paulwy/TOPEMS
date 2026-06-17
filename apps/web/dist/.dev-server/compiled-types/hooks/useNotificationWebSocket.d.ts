import type { Notification } from "@/api/notification";
interface WsMessage {
    type: "notification" | "unread_count" | "ping" | "pong" | "subscribe" | "unsubscribe";
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
export declare const useNotificationWebSocket: ({ userId, onNotification, onUnreadCountChange, reconnectInterval, maxReconnectAttempts, autoConnect, }: UseNotificationWebSocketOptions) => {
    isConnected: boolean;
    isConnecting: boolean;
    connectionStatus: "error" | "disconnected" | "connecting" | "connected";
    error: string | null;
    reconnect: () => void;
    disconnect: () => void;
    sendMessage: (message: WsMessage) => void;
};
export default useNotificationWebSocket;
