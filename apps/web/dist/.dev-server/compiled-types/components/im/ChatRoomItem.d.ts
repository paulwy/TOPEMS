import React from "react";
import type { ChatRoom } from "../../api/im";
interface ChatRoomItemProps {
    chatRoom: ChatRoom;
    isActive: boolean;
    onClick: () => void;
    onSettings?: (e: React.MouseEvent) => void;
}
export declare const ChatRoomItem: React.FC<ChatRoomItemProps>;
export {};
