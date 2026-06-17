import React from "react";
interface ChatInputProps {
    onSendMessage: (content: string, type: "text" | "image" | "file", fileUrl?: string, fileName?: string) => void;
    onUploadFile?: (file: File) => Promise<{
        url: string;
        name: string;
    } | null>;
    disabled?: boolean;
    placeholder?: string;
}
export declare const ChatInput: React.FC<ChatInputProps>;
export {};
