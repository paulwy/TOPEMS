import React from "react";
import type { ChatRoom } from "../../api/im";
interface ChatSettingsModalProps {
    isOpen: boolean;
    onClose: () => void;
    chatRoom: ChatRoom;
    onMute: () => void;
    onUnmute: () => void;
    onPin: () => void;
    onUnpin: () => void;
    onDelete: () => void;
}
export declare const ChatSettingsModal: React.FC<ChatSettingsModalProps>;
export {};
