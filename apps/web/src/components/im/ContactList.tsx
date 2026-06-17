import React, { useState, useEffect } from "react";
import {
  User,
  Search,
  Plus,
  Users,
  ChevronRight,
  MoreVertical,
  Check,
  X,
} from "lucide-react";
import type { Friend, ContactGroup } from "../../api/im";
import { imApi } from "../../api/im";
import { useAppStore } from "../../store";

interface ContactListProps {
  onSelectContact?: (friend: Friend) => void;
}

export const ContactList: React.FC<ContactListProps> = ({
  onSelectContact,
}) => {
  const addNotification = useAppStore((state) => state.addNotification);
  const [friends, setFriends] = useState<Friend[]>([]);
  const [groups, setGroups] = useState<ContactGroup[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState<"all" | "friends" | "groups">(
    "all",
  );
  const [showAddModal, setShowAddModal] = useState(false);
  const [newGroupName, setNewGroupName] = useState("");
  const [selectedFriend, setSelectedFriend] = useState<Friend | null>(null);
  const [showFriendMenu, setShowFriendMenu] = useState(false);

  useEffect(() => {
    loadFriends();
    loadGroups();
  }, []);

  const loadFriends = async () => {
    try {
      const userId = "current-user";
      const response = await imApi.listFriends(userId);
      if (response.success && response.data) {
        setFriends(response.data.friends || []);
      }
    } catch (error) {
      console.error("Failed to load friends:", error);
    }
  };

  const loadGroups = async () => {
    try {
      const userId = "current-user";
      const response = await imApi.listContactGroups(userId);
      if (response.success && response.data) {
        setGroups(response.data.groups || []);
      }
    } catch (error) {
      console.error("Failed to load groups:", error);
    }
  };

  const handleCreateGroup = async () => {
    if (!newGroupName.trim()) return;

    try {
      const userId = "current-user";
      const response = await imApi.createContactGroup(userId, {
        name: newGroupName,
      });
      if (response.success) {
        addNotification({
          title: "成功",
          message: "分组创建成功",
          type: "success",
        });
        setNewGroupName("");
        setShowAddModal(false);
        loadGroups();
      }
    } catch (error) {
      console.error("Failed to create group:", error);
      addNotification({
        title: "失败",
        message: "分组创建失败",
        type: "error",
      });
    }
  };

  const handleAcceptFriend = async (friend: Friend) => {
    try {
      const userId = "current-user";
      const response = await imApi.acceptFriendRequest(
        userId,
        friend.friend_id,
      );
      if (response.success) {
        addNotification({
          title: "成功",
          message: "已接受好友请求",
          type: "success",
        });
        loadFriends();
      }
    } catch (error) {
      console.error("Failed to accept friend:", error);
    }
  };

  const handleRejectFriend = async (friend: Friend) => {
    try {
      const userId = "current-user";
      const response = await imApi.rejectFriendRequest(
        userId,
        friend.friend_id,
      );
      if (response.success) {
        addNotification({
          title: "成功",
          message: "已拒绝好友请求",
          type: "success",
        });
        loadFriends();
      }
    } catch (error) {
      console.error("Failed to reject friend:", error);
    }
  };

  const handleRemoveFriend = async (friendId: string) => {
    if (!confirm("确定要删除这个好友吗？")) return;

    try {
      const userId = "current-user";
      const response = await imApi.removeFriend(userId, friendId);
      if (response.success) {
        addNotification({
          title: "成功",
          message: "好友已删除",
          type: "success",
        });
        setShowFriendMenu(false);
        setSelectedFriend(null);
        loadFriends();
      }
    } catch (error) {
      console.error("Failed to remove friend:", error);
    }
  };

  const filteredFriends = friends.filter((friend) => {
    const matchesSearch = friend.friend_name
      .toLowerCase()
      .includes(searchQuery.toLowerCase());
    if (activeTab === "friends") {
      return matchesSearch && friend.status === "accepted";
    }
    if (activeTab === "groups") {
      return false;
    }
    return matchesSearch;
  });

  const pendingRequests = friends.filter((f) => f.status === "pending");
  const acceptedFriends = friends.filter((f) => f.status === "accepted");

  return (
    <div style={{ flex: 1, display: "flex", flexDirection: "column" }}>
      <div style={{ padding: 12, borderBottom: "1px solid #e5e7eb" }}>
        <div style={{ position: "relative" }}>
          <Search style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", width: 16, height: 16, color: "#9ca3af" }} />
          <input
            type="text"
            placeholder="搜索联系人..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{ width: "100%", paddingLeft: 40, paddingRight: 16, paddingTop: 8, paddingBottom: 8, backgroundColor: "#f3f4f6", border: "none", borderRadius: 8, fontSize: 14, outline: "none" }}
          />
        </div>
      </div>

      <div style={{ display: "flex", borderBottom: "1px solid #e5e7eb" }}>
        <button
          onClick={() => setActiveTab("all")}
          style={{
            flex: 1,
            paddingTop: 8,
            paddingBottom: 8,
            fontSize: 14,
            fontWeight: 500,
            transition: "all 0.15s",
            backgroundColor: "transparent",
            border: "none",
            cursor: "pointer",
            color: activeTab === "all" ? "#4f46e5" : "#6b7280",
            borderBottom: activeTab === "all" ? "2px solid #4f46e5" : "2px solid transparent",
          }}
        >
          全部 ({friends.length})
        </button>
        <button
          onClick={() => setActiveTab("friends")}
          style={{
            flex: 1,
            paddingTop: 8,
            paddingBottom: 8,
            fontSize: 14,
            fontWeight: 500,
            transition: "all 0.15s",
            backgroundColor: "transparent",
            border: "none",
            cursor: "pointer",
            color: activeTab === "friends" ? "#4f46e5" : "#6b7280",
            borderBottom: activeTab === "friends" ? "2px solid #4f46e5" : "2px solid transparent",
          }}
        >
          好友 ({acceptedFriends.length})
        </button>
        <button
          onClick={() => setActiveTab("groups")}
          style={{
            flex: 1,
            paddingTop: 8,
            paddingBottom: 8,
            fontSize: 14,
            fontWeight: 500,
            transition: "all 0.15s",
            backgroundColor: "transparent",
            border: "none",
            cursor: "pointer",
            color: activeTab === "groups" ? "#4f46e5" : "#6b7280",
            borderBottom: activeTab === "groups" ? "2px solid #4f46e5" : "2px solid transparent",
          }}
        >
          分组 ({groups.length})
        </button>
      </div>

      <div style={{ flex: 1, overflowY: "auto" }}>
        {activeTab !== "groups" && pendingRequests.length > 0 && (
          <div style={{ padding: 8 }}>
            <div style={{ fontSize: 12, color: "#6b7280", padding: "4px 8px" }}>待处理请求</div>
            {pendingRequests.map((friend) => (
              <div
                key={friend.id}
                style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: 8, borderRadius: 8, margin: "0 4px" }}
              >
                <div
                  style={{ display: "flex", alignItems: "center", gap: 12 }}
                  onClick={() => onSelectContact?.(friend)}
                >
                  <div style={{ width: 40, height: 40, borderRadius: "9999px", backgroundColor: "#e0e7ff", display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <User style={{ width: 20, height: 20, color: "#4f46e5" }} />
                  </div>
                  <div>
                    <div style={{ fontSize: 14, fontWeight: 500, color: "#111827" }}>
                      {friend.friend_name}
                    </div>
                    <div style={{ fontSize: 12, color: "#6b7280" }}>等待通过</div>
                  </div>
                </div>
                <div style={{ display: "flex", gap: 4 }}>
                  <button
                    onClick={() => handleAcceptFriend(friend)}
                    style={{ padding: 6, borderRadius: "9999px", backgroundColor: "#dcfce7", color: "#16a34a", border: "none", cursor: "pointer" }}
                    title="接受"
                  >
                    <Check style={{ width: 16, height: 16 }} />
                  </button>
                  <button
                    onClick={() => handleRejectFriend(friend)}
                    style={{ padding: 6, borderRadius: "9999px", backgroundColor: "#fee2e2", color: "#dc2626", border: "none", cursor: "pointer" }}
                    title="拒绝"
                  >
                    <X style={{ width: 16, height: 16 }} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {activeTab !== "groups" && filteredFriends.length > 0 && (
          <div style={{ padding: 8 }}>
            <div style={{ fontSize: 12, color: "#6b7280", padding: "4px 8px" }}>好友</div>
            {filteredFriends
              .filter((f) => f.status === "accepted")
              .map((friend) => (
                <div
                  key={friend.id}
                  style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: 8, borderRadius: 8, margin: "0 4px", cursor: "pointer", position: "relative" }}
                >
                  <div
                    style={{ display: "flex", alignItems: "center", gap: 12 }}
                    onClick={() => onSelectContact?.(friend)}
                  >
                    <div style={{ position: "relative" }}>
                      <div style={{ width: 40, height: 40, borderRadius: "9999px", backgroundColor: "#e0e7ff", display: "flex", alignItems: "center", justifyContent: "center" }}>
                        <User style={{ width: 20, height: 20, color: "#4f46e5" }} />
                      </div>
                      {friend.is_online && (
                        <span style={{ position: "absolute", bottom: 0, right: 0, width: 12, height: 12, backgroundColor: "#22c55e", borderRadius: "9999px", border: "2px solid #ffffff" }}></span>
                      )}
                    </div>
                    <div>
                      <div style={{ fontSize: 14, fontWeight: 500, color: "#111827" }}>
                        {friend.friend_name}
                      </div>
                      <div style={{ fontSize: 12, color: "#6b7280" }}>
                        {friend.is_online
                          ? "在线"
                          : friend.last_seen
                            ? `最后活跃: ${new Date(friend.last_seen).toLocaleString()}`
                            : "离线"}
                      </div>
                    </div>
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedFriend(friend);
                      setShowFriendMenu(!showFriendMenu);
                    }}
                    style={{ padding: 6, borderRadius: "9999px", backgroundColor: "transparent", border: "none", cursor: "pointer" }}
                  >
                    <MoreVertical style={{ width: 16, height: 16, color: "#9ca3af" }} />
                  </button>
                  {showFriendMenu && selectedFriend?.id === friend.id && (
                    <div style={{ position: "absolute", right: 0, top: "100%", marginTop: 4, backgroundColor: "#ffffff", borderRadius: 8, boxShadow: "0 10px 15px -3px rgba(0, 0, 0, 0.1)", border: "1px solid #e5e7eb", padding: 4, zIndex: 10, minWidth: 120 }}>
                      <button
                        onClick={() => handleRemoveFriend(friend.friend_id)}
                        style={{ width: "100%", padding: "8px 16px", textAlign: "left", fontSize: 14, color: "#dc2626", backgroundColor: "transparent", border: "none", cursor: "pointer" }}
                      >
                        删除好友
                      </button>
                    </div>
                  )}
                </div>
              ))}
          </div>
        )}

        {activeTab === "groups" && (
          <div style={{ padding: 8 }}>
            {groups.length === 0 ? (
              <div style={{ textAlign: "center", padding: 32, color: "#6b7280" }}>
                <Users style={{ width: 48, height: 48, margin: "0 auto", marginBottom: 8, color: "#d1d5db" }} />
                <p style={{ fontSize: 14 }}>暂无分组</p>
                <button
                  onClick={() => setShowAddModal(true)}
                  style={{ marginTop: 8, color: "#4f46e5", fontSize: 14, backgroundColor: "transparent", border: "none", cursor: "pointer" }}
                >
                  创建分组
                </button>
              </div>
            ) : (
              groups.map((group) => (
                <div
                  key={group.id}
                  style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: 12, borderRadius: 8, margin: "0 4px", cursor: "pointer" }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                    <div style={{ width: 40, height: 40, borderRadius: "9999px", backgroundColor: "#f3f4f6", display: "flex", alignItems: "center", justifyContent: "center" }}>
                      <Users style={{ width: 20, height: 20, color: "#4b5563" }} />
                    </div>
                    <div>
                      <div style={{ fontSize: 14, fontWeight: 500, color: "#111827" }}>
                        {group.name}
                      </div>
                      <div style={{ fontSize: 12, color: "#6b7280" }}>0 位联系人</div>
                    </div>
                  </div>
                  <ChevronRight style={{ width: 16, height: 16, color: "#9ca3af" }} />
                </div>
              ))
            )}
          </div>
        )}

        {activeTab !== "groups" &&
          filteredFriends.length === 0 &&
          pendingRequests.length === 0 && (
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: "100%", color: "#6b7280" }}>
              <User style={{ width: 64, height: 64, color: "#d1d5db", marginBottom: 16 }} />
              <p style={{ fontSize: 14 }}>暂无联系人</p>
            </div>
          )}
      </div>

      {activeTab === "groups" && (
        <div style={{ padding: 12, borderTop: "1px solid #e5e7eb" }}>
          <button
            onClick={() => setShowAddModal(true)}
            style={{ width: "100%", display: "flex", alignItems: "center", justifyContent: "center", gap: 8, paddingTop: 8, paddingBottom: 8, backgroundColor: "#4f46e5", color: "#ffffff", borderRadius: 8, border: "none", cursor: "pointer" }}
          >
            <Plus style={{ width: 16, height: 16 }} />
            <span style={{ fontSize: 14, fontWeight: 500 }}>创建分组</span>
          </button>
        </div>
      )}

      {showAddModal && (
        <div style={{ position: "fixed", inset: 0, backgroundColor: "rgba(0, 0, 0, 0.5)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 50 }}>
          <div style={{ backgroundColor: "#ffffff", borderRadius: 8, padding: 16, width: "100%", maxWidth: 320, margin: "0 16px" }}>
            <h3 style={{ fontWeight: 500, color: "#111827", marginBottom: 16 }}>创建分组</h3>
            <input
              type="text"
              placeholder="分组名称"
              value={newGroupName}
              onChange={(e) => setNewGroupName(e.target.value)}
              style={{ width: "100%", padding: "8px 12px", border: "1px solid #d1d5db", borderRadius: 4, fontSize: 14, outline: "none" }}
            />
            <div style={{ display: "flex", gap: 8, marginTop: 16 }}>
              <button
                onClick={() => setShowAddModal(false)}
                style={{ flex: 1, paddingTop: 8, paddingBottom: 8, border: "1px solid #d1d5db", borderRadius: 4, fontSize: 14, backgroundColor: "transparent", cursor: "pointer" }}
              >
                取消
              </button>
              <button
                onClick={handleCreateGroup}
                style={{ flex: 1, paddingTop: 8, paddingBottom: 8, backgroundColor: "#4f46e5", color: "#ffffff", borderRadius: 4, fontSize: 14, border: "none", cursor: "pointer" }}
              >
                创建
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
