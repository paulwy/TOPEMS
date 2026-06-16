import React, { useState } from "react";
import {
  User,
  FileText,
  Check,
  CheckCheck,
  MoreVertical,
  Trash2,
  Edit3,
} from "lucide-react";
import type { ChatMessage } from "../../api/im";

interface MessageBubbleProps {
  message: ChatMessage;
  isSent: boolean;
  showStatus?: boolean;
  onEdit?: (message: ChatMessage) => void;
  onDelete?: (messageId: string) => void;
}

export const MessageBubble: React.FC<MessageBubbleProps> = ({
  message,
  isSent,
  showStatus = true,
  onEdit,
  onDelete,
}) => {
  const [showMenu, setShowMenu] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState(message.content);

  const isImage = message.message_type === "image";
  const isFile = message.message_type === "file";

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString("zh-CN", {
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const handleEdit = () => {
    setIsEditing(true);
    setShowMenu(false);
  };

  const handleSaveEdit = async () => {
    if (editContent.trim() && onEdit) {
      const updatedMessage = { ...message, content: editContent };
      onEdit(updatedMessage);
    }
    setIsEditing(false);
  };

  const handleCancelEdit = () => {
    setEditContent(message.content);
    setIsEditing(false);
  };

  const handleDelete = () => {
    if (onDelete) {
      onDelete(message.id);
    }
    setShowMenu(false);
  };

  return (
    <div style={{ display: "flex", justifyContent: isSent ? "flex-end" : "flex-start", marginBottom: 16 }}>
      <div
        style={{ display: "flex", alignItems: "flex-end", maxWidth: "70%", flexDirection: isSent ? "row-reverse" : "row" }}
      >
        <div
          style={{
            width: 32,
            height: 32,
            borderRadius: "9999px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            backgroundColor: isSent ? "#4f46e5" : "#d1d5db",
            marginLeft: isSent ? 8 : 0,
            marginRight: isSent ? 0 : 8,
          }}
        >
          <User
            style={{ width: 16, height: 16, color: isSent ? "#ffffff" : "#4b5563" }}
          />
        </div>
        <div
          style={{
            position: "relative",
            borderRadius: 8,
            padding: 12,
            backgroundColor: isSent ? "#4f46e5" : "#f3f4f6",
            color: isSent ? "#ffffff" : "#111827",
          }}
        >
          {isSent && (
            <div
              style={{ position: "absolute", top: -4, right: -4, opacity: 0, transition: "opacity 0.15s", cursor: "pointer" }}
              onClick={() => setShowMenu(!showMenu)}
            >
              <MoreVertical style={{ width: 16, height: 16, color: "#9ca3af", backgroundColor: "#ffffff", borderRadius: "9999px", padding: 2 }} />
            </div>
          )}

          {showMenu && isSent && (
            <div style={{ position: "absolute", top: -64, right: -4, backgroundColor: "#ffffff", borderRadius: 8, boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.25)", border: "1px solid #e5e7eb", padding: 4, zIndex: 10 }}>
              <button
                onClick={handleEdit}
                style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 16px", fontSize: 14, color: "#374151", backgroundColor: "transparent", border: "none", cursor: "pointer", width: "100%" }}
              >
                <Edit3 style={{ width: 16, height: 16 }} />
                编辑
              </button>
              <button
                onClick={handleDelete}
                style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 16px", fontSize: 14, color: "#dc2626", backgroundColor: "transparent", border: "none", cursor: "pointer", width: "100%" }}
              >
                <Trash2 style={{ width: 16, height: 16 }} />
                删除
              </button>
            </div>
          )}

          {!isSent && (
            <div style={{ fontSize: 12, fontWeight: 500, marginBottom: 4, opacity: 0.7 }}>
              {message.sender_name}
            </div>
          )}

          {isEditing ? (
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              <textarea
                value={editContent}
                onChange={(e) => setEditContent(e.target.value)}
                style={{
                  padding: 8,
                  borderRadius: 4,
                  fontSize: 14,
                  resize: "none",
                  backgroundColor: isSent ? "#4338ca" : "#ffffff",
                  color: isSent ? "#ffffff" : "#111827",
                  border: `1px solid ${isSent ? "#6366f1" : "#d1d5db"}`,
                }}
                rows={3}
                autoFocus
              />
              <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
                <button
                  onClick={handleCancelEdit}
                  style={{
                    fontSize: 12,
                    padding: "4px 12px",
                    borderRadius: 4,
                    backgroundColor: isSent ? "#6366f1" : "#e5e7eb",
                    color: isSent ? "#ffffff" : "#374151",
                    border: "none",
                    cursor: "pointer",
                  }}
                >
                  取消
                </button>
                <button
                  onClick={handleSaveEdit}
                  style={{
                    fontSize: 12,
                    padding: "4px 12px",
                    borderRadius: 4,
                    backgroundColor: isSent ? "#ffffff" : "#4f46e5",
                    color: isSent ? "#4f46e5" : "#ffffff",
                    border: "none",
                    cursor: "pointer",
                  }}
                >
                  保存
                </button>
              </div>
            </div>
          ) : isImage && message.content ? (
            <img
              src={message.content}
              alt="Shared image"
              style={{ borderRadius: 8, maxWidth: "100%", cursor: "pointer", maxHeight: 300 }}
              onClick={() => window.open(message.content, "_blank")}
            />
          ) : isFile ? (
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <FileText style={{ width: 20, height: 20 }} />
              <a
                href={message.file_url}
                target="_blank"
                rel="noopener noreferrer"
                style={{ textDecoration: "underline", color: isSent ? "#ffffff" : "#4f46e5" }}
              >
                {message.file_name || message.content}
              </a>
            </div>
          ) : (
            <div style={{ whiteSpace: "pre-wrap", wordBreak: "break-word" }}>
              {message.content}
            </div>
          )}

          {!isEditing && (
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "flex-end",
                gap: 4,
                marginTop: 4,
                fontSize: 12,
                color: isSent ? "#c7d2fe" : "#6b7280",
              }}
            >
              <span>{formatTime(message.created_at)}</span>
              {showStatus &&
                isSent &&
                (message.is_read ? (
                  <CheckCheck style={{ width: 12, height: 12 }} />
                ) : (
                  <Check style={{ width: 12, height: 12 }} />
                ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
