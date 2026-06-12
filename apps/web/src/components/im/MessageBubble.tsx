import React, { useState } from "react";
import {
  User,
  FileText,
  Image,
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
    <div className={`flex ${isSent ? "justify-end" : "justify-start"} mb-4`}>
      <div
        className={`flex ${isSent ? "flex-row-reverse" : "flex-row"} items-end max-w-[70%]`}
      >
        <div
          className={`w-8 h-8 rounded-full flex items-center justify-center ${
            isSent ? "ml-2 bg-indigo-600" : "mr-2 bg-gray-300"
          }`}
        >
          <User
            className={`w-4 h-4 ${isSent ? "text-white" : "text-gray-600"}`}
          />
        </div>
        <div
          className={`relative rounded-lg p-3 ${isSent ? "bg-indigo-600 text-white" : "bg-gray-100 text-gray-900"}`}
        >
          {isSent && (
            <div
              className="absolute -top-1 -right-1 opacity-0 hover:opacity-100 transition-opacity cursor-pointer"
              onClick={() => setShowMenu(!showMenu)}
            >
              <MoreVertical className="w-4 h-4 text-gray-400 bg-white rounded-full p-0.5" />
            </div>
          )}

          {showMenu && isSent && (
            <div className="absolute -top-16 -right-1 bg-white rounded-lg shadow-xl border border-gray-200 py-1 z-10">
              <button
                onClick={handleEdit}
                className="flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 w-full"
              >
                <Edit3 className="w-4 h-4 mr-2" />
                编辑
              </button>
              <button
                onClick={handleDelete}
                className="flex items-center px-4 py-2 text-sm text-red-600 hover:bg-red-50 w-full"
              >
                <Trash2 className="w-4 h-4 mr-2" />
                删除
              </button>
            </div>
          )}

          {!isSent && (
            <div className="text-xs font-medium mb-1 opacity-70">
              {message.sender_name}
            </div>
          )}

          {isEditing ? (
            <div className="flex flex-col gap-2">
              <textarea
                value={editContent}
                onChange={(e) => setEditContent(e.target.value)}
                className={`p-2 rounded border text-sm resize-none ${
                  isSent
                    ? "bg-indigo-700 text-white border-indigo-500"
                    : "bg-white text-gray-900 border-gray-300"
                }`}
                rows={3}
                autoFocus
              />
              <div className="flex gap-2 justify-end">
                <button
                  onClick={handleCancelEdit}
                  className={`text-xs px-3 py-1 rounded ${
                    isSent
                      ? "bg-indigo-500 hover:bg-indigo-400"
                      : "bg-gray-200 hover:bg-gray-300"
                  }`}
                >
                  取消
                </button>
                <button
                  onClick={handleSaveEdit}
                  className={`text-xs px-3 py-1 rounded ${
                    isSent
                      ? "bg-white text-indigo-600 hover:bg-indigo-50"
                      : "bg-indigo-600 text-white hover:bg-indigo-700"
                  }`}
                >
                  保存
                </button>
              </div>
            </div>
          ) : isImage && message.content ? (
            <img
              src={message.content}
              alt="Shared image"
              className="rounded max-w-full cursor-pointer"
              style={{ maxHeight: "300px" }}
              onClick={() => window.open(message.content, "_blank")}
            />
          ) : isFile ? (
            <div className="flex items-center gap-2">
              <FileText className="w-5 h-5" />
              <a
                href={message.file_url}
                target="_blank"
                rel="noopener noreferrer"
                className={`underline ${isSent ? "text-white" : "text-indigo-600"}`}
              >
                {message.file_name || message.content}
              </a>
            </div>
          ) : (
            <div className="whitespace-pre-wrap break-words">
              {message.content}
            </div>
          )}

          {!isEditing && (
            <div
              className={`flex items-center justify-end gap-1 mt-1 text-xs ${isSent ? "text-indigo-200" : "text-gray-500"}`}
            >
              <span>{formatTime(message.created_at)}</span>
              {showStatus &&
                isSent &&
                (message.is_read ? (
                  <CheckCheck className="w-3 h-3" />
                ) : (
                  <Check className="w-3 h-3" />
                ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
