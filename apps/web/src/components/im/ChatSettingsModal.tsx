import React from "react";
import { X, BellOff, Bell, Pin, PinOff, Trash2, Users } from "lucide-react";
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

export const ChatSettingsModal: React.FC<ChatSettingsModalProps> = ({
  isOpen,
  onClose,
  chatRoom,
  onMute,
  onUnmute,
  onPin,
  onUnpin,
  onDelete,
}) => {
  if (!isOpen) return null;

  return (
    <div style={{ position: "fixed", inset: 0, backgroundColor: "rgba(0, 0, 0, 0.5)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 50 }}>
      <div style={{ backgroundColor: "#ffffff", borderRadius: 12, boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.25)", width: "100%", maxWidth: 384, margin: "0 16px", overflow: "hidden" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 16px", borderBottom: "1px solid #e5e7eb" }}>
          <h3 style={{ fontWeight: 600, color: "#111827" }}>聊天设置</h3>
          <button
            onClick={onClose}
            style={{ padding: 4, borderRadius: "9999px", backgroundColor: "transparent", border: "none", cursor: "pointer" }}
          >
            <X style={{ width: 20, height: 20, color: "#6b7280" }} />
          </button>
        </div>

        <div style={{ padding: 16 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16, paddingBottom: 16, borderBottom: "1px solid #f3f4f6" }}>
            <div style={{ width: 48, height: 48, borderRadius: "9999px", backgroundColor: "#e0e7ff", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <Users style={{ width: 24, height: 24, color: "#4f46e5" }} />
            </div>
            <div>
              <div style={{ fontWeight: 500, color: "#111827" }}>
                {chatRoom.name || "未命名会话"}
              </div>
              <div style={{ fontSize: 14, color: "#6b7280" }}>
                {chatRoom.room_type === "direct" ? "私聊" : "群聊"} ·{" "}
                {chatRoom.members?.length || 0} 人
              </div>
            </div>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            <button
              onClick={chatRoom.is_muted ? onUnmute : onMute}
              style={{ width: "100%", display: "flex", alignItems: "center", gap: 12, padding: 12, borderRadius: 8, backgroundColor: "transparent", border: "none", cursor: "pointer", transition: "background-color 0.15s" }}
            >
              {chatRoom.is_muted ? (
                <>
                  <Bell style={{ width: 20, height: 20, color: "#9ca3af" }} />
                  <div style={{ flex: 1, textAlign: "left" }}>
                    <div style={{ fontSize: 14, fontWeight: 500, color: "#111827" }}>
                      取消免打扰
                    </div>
                    <div style={{ fontSize: 12, color: "#6b7280" }}>接收新消息通知</div>
                  </div>
                </>
              ) : (
                <>
                  <BellOff style={{ width: 20, height: 20, color: "#9ca3af" }} />
                  <div style={{ flex: 1, textAlign: "left" }}>
                    <div style={{ fontSize: 14, fontWeight: 500, color: "#111827" }}>
                      消息免打扰
                    </div>
                    <div style={{ fontSize: 12, color: "#6b7280" }}>
                      不再接收新消息通知
                    </div>
                  </div>
                </>
              )}
            </button>

            <button
              onClick={chatRoom.is_pinned ? onUnpin : onPin}
              style={{ width: "100%", display: "flex", alignItems: "center", gap: 12, padding: 12, borderRadius: 8, backgroundColor: "transparent", border: "none", cursor: "pointer", transition: "background-color 0.15s" }}
            >
              {chatRoom.is_pinned ? (
                <>
                  <PinOff style={{ width: 20, height: 20, color: "#9ca3af" }} />
                  <div style={{ flex: 1, textAlign: "left" }}>
                    <div style={{ fontSize: 14, fontWeight: 500, color: "#111827" }}>
                      取消置顶
                    </div>
                    <div style={{ fontSize: 12, color: "#6b7280" }}>从置顶列表移除</div>
                  </div>
                </>
              ) : (
                <>
                  <Pin style={{ width: 20, height: 20, color: "#9ca3af" }} />
                  <div style={{ flex: 1, textAlign: "left" }}>
                    <div style={{ fontSize: 14, fontWeight: 500, color: "#111827" }}>
                      置顶会话
                    </div>
                    <div style={{ fontSize: 12, color: "#6b7280" }}>
                      将此会话固定在列表顶部
                    </div>
                  </div>
                </>
              )}
            </button>

            <button
              onClick={onDelete}
              style={{ width: "100%", display: "flex", alignItems: "center", gap: 12, padding: 12, borderRadius: 8, backgroundColor: "transparent", border: "none", cursor: "pointer", transition: "background-color 0.15s" }}
            >
              <Trash2 style={{ width: 20, height: 20, color: "#ef4444" }} />
              <div style={{ flex: 1, textAlign: "left" }}>
                <div style={{ fontSize: 14, fontWeight: 500, color: "#dc2626" }}>删除会话</div>
                <div style={{ fontSize: 12, color: "#f87171" }}>删除后无法恢复</div>
              </div>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
