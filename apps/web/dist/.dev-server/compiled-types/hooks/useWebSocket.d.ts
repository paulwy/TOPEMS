export interface WsMessage {
    msg_type: string;
    chat_id?: string;
    sender_id: string;
    sender_name: string;
    content: string;
    timestamp: string;
}
export interface UseWebSocketOptions {
    onMessage?: (message: WsMessage) => void;
    onOpen?: () => void;
    onClose?: () => void;
    onError?: (error: Event) => void;
    reconnectAttempts?: number;
    reconnectInterval?: number;
}
export declare function useWebSocket(options?: UseWebSocketOptions): {
    isConnected: boolean;
    error: Event | null;
    connect: () => void;
    disconnect: () => void;
    send: (message: WsMessage) => void;
};
