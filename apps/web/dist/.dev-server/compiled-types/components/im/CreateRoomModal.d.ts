import React from "react";
interface CreateRoomModalProps {
    isOpen: boolean;
    onClose: () => void;
    onCreated: () => void;
    currentUserId?: string;
}
export declare const CreateRoomModal: React.FC<CreateRoomModalProps>;
export {};
