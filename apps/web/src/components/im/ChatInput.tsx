import { Button, TextField } from "@mui/material";
import React, { useState, useRef } from "react";
import { Send, Paperclip, Image, FileText } from "lucide-react";
import { logger } from "@/utils/logger";

interface ChatInputProps {
  onSendMessage: (
    content: string,
    type: "text" | "image" | "file",
    fileUrl?: string,
    fileName?: string,
  ) => void;
  onUploadFile?: (file: File) => Promise<{ url: string; name: string } | null>;
  disabled?: boolean;
  placeholder?: string;
}

export const ChatInput: React.FC<ChatInputProps> = ({
  onSendMessage,
  onUploadFile,
  disabled = false,
  placeholder = "输入消息...",
}) => {
  const [message, setMessage] = useState("");
  const [showFileMenu, setShowFileMenu] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);

  const handleSend = () => {
    if (message.trim() && !disabled) {
      onSendMessage(message.trim(), "text");
      setMessage("");
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleFileUpload = async (
    e: React.ChangeEvent<HTMLInputElement>,
    type: "image" | "file",
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    try {
      if (type === "image") {
        const reader = new FileReader();
        reader.onload = () => {
          onSendMessage(
            reader.result as string,
            "image",
            reader.result as string,
            file.name,
          );
        };
        reader.readAsDataURL(file);
      } else if (onUploadFile) {
        const result = await onUploadFile(file);
        if (result) {
          onSendMessage(file.name, "file", result.url, result.name);
        }
      }
    } catch (error) {
      logger.error("Failed to upload file:", error);
    } finally {
      setUploading(false);
      setShowFileMenu(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
      if (imageInputRef.current) imageInputRef.current.value = "";
    }
  };

  return (
    <div
      style={{
        borderTop: "1px solid #e5e7eb",
        backgroundColor: "#ffffff",
        padding: 16,
      }}
    >
      <div style={{ display: "flex", alignItems: "flex-end", gap: 12 }}>
        <div style={{ position: "relative" }}>
          <Button
            variant="text"
            size="small"
            onClick={() => setShowFileMenu(!showFileMenu)}
            disabled={disabled || uploading}
            sx={{ p: 1 }}
          >
            <Paperclip sx={{ width: 20, height: 20, color: "#6b7280" }} />
          </Button>

          {showFileMenu && (
            <div
              style={{
                position: "absolute",
                bottom: "100%",
                left: 0,
                marginBottom: 8,
                width: 192,
                backgroundColor: "#ffffff",
                borderRadius: 8,
                boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.25)",
                border: "1px solid #e5e7eb",
                padding: 4,
                zIndex: 10,
              }}
            >
              <label
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  padding: 8,
                  cursor: "pointer",
                }}
              >
                <Image style={{ width: 16, height: 16, color: "#6b7280" }} />
                <span style={{ fontSize: 14, color: "#374151" }}>图片</span>
                <input
                  ref={imageInputRef}
                  type="file"
                  accept="image/*"
                  onChange={(e) => handleFileUpload(e, "image")}
                  className="hidden"
                  disabled={uploading}
                />
              </label>
              <label
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  padding: 8,
                  cursor: "pointer",
                }}
              >
                <FileText style={{ width: 16, height: 16, color: "#6b7280" }} />
                <span style={{ fontSize: 14, color: "#374151" }}>文件</span>
                <input
                  ref={fileInputRef}
                  type="file"
                  onChange={(e) => handleFileUpload(e, "file")}
                  className="hidden"
                  disabled={uploading}
                />
              </label>
            </div>
          )}
        </div>

        <div style={{ flex: 1 }}>
          <TextField
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder={placeholder}
            disabled={disabled || uploading}
            multiline
            minRows={1}
            maxRows={4}
            sx={{ width: "100%" }}
          />
        </div>

        <Button
          onClick={handleSend}
          disabled={!message.trim() || disabled || uploading}
          variant="contained"
          size="small"
          sx={{ p: 1 }}
        >
          <Send sx={{ width: 20, height: 20 }} />
        </Button>
      </div>

      {uploading && (
        <div
          style={{
            marginTop: 8,
            fontSize: 14,
            color: "#6b7280",
            display: "flex",
            alignItems: "center",
            gap: 8,
          }}
        >
          <div
            style={{
              width: 16,
              height: 16,
              borderRadius: "9999px",
              border: "2px solid #e5e7eb",
              borderTopColor: "#6366f1",
              animation: "spin 1s linear infinite",
            }}
          />
          上传中...
        </div>
      )}
    </div>
  );
};
