import React from "react";
import type { ChatMessage } from "../../api/im";
interface MessageBubbleProps {
    message: ChatMessage;
    isSent: boolean;
    showStatus?: boolean;
    onEdit?: (message: ChatMessage) => void;
    onDelete?: (messageId: string) => void;
}
export declare const MessageBubble: React.FC<MessageBubbleProps>;
export {};
