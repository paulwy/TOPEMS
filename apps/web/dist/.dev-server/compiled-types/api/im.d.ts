import type { ApiResponse } from "./client";
export interface ChatMessage {
    id: string;
    chat_id: string;
    sender_id: string;
    sender_name: string;
    message_type: string;
    content: string;
    file_url?: string;
    file_name?: string;
    created_at: string;
    is_read: boolean;
}
export interface CreateChatMessageRequest {
    chat_id: string;
    sender_id: string;
    sender_name: string;
    message_type: string;
    content: string;
    file_url?: string;
    file_name?: string;
}
export interface ChatRoom {
    id: string;
    name?: string;
    room_type: string;
    members: string[];
    created_by: string;
    last_message?: string;
    last_message_time?: string;
    is_muted?: boolean;
    is_pinned?: boolean;
    created_at: string;
    updated_at: string;
}
export interface CreateChatRoomRequest {
    name?: string;
    room_type: string;
    members: string[];
    created_by: string;
}
export interface ProjectGroup {
    id: string;
    name: string;
    description?: string;
    project_id?: string;
    members: string[];
    created_by: string;
    created_at: string;
    updated_at: string;
}
export interface CreateProjectGroupRequest {
    name: string;
    description?: string;
    project_id?: string;
    members: string[];
    created_by: string;
}
export interface Notification {
    id: string;
    user_id: string;
    title: string;
    content: string;
    notification_type: string;
    related_id?: string;
    related_type?: string;
    is_read: boolean;
    created_at: string;
}
export interface CreateNotificationRequest {
    user_id: string;
    title: string;
    content: string;
    notification_type: string;
    related_id?: string;
    related_type?: string;
}
export interface Friend {
    id: string;
    friend_id: string;
    friend_name: string;
    status: "pending" | "accepted";
    created_at: string;
    is_online?: boolean;
    last_seen?: string;
}
export interface CreateFriendRequest {
    friend_id: string;
    friend_name: string;
}
export interface ContactGroup {
    id: string;
    name: string;
    created_at: string;
    updated_at: string;
}
export interface CreateContactGroupRequest {
    name: string;
}
export declare const imApi: {
    listChatRooms: () => Promise<ApiResponse<any>>;
    createChatRoom: (data: CreateChatRoomRequest) => Promise<ApiResponse<ChatRoom>>;
    getChatRoom: (id: string) => Promise<ApiResponse<ChatRoom>>;
    deleteChatRoom: (id: string) => Promise<ApiResponse<any>>;
    listChatMessages: (chatId: string) => Promise<ApiResponse<any>>;
    createChatMessage: (data: CreateChatMessageRequest) => Promise<ApiResponse<ChatMessage>>;
    markMessageRead: (id: string) => Promise<ApiResponse<ChatMessage>>;
    updateChatMessage: (id: string, content: string) => Promise<ApiResponse<ChatMessage>>;
    deleteChatMessage: (id: string) => Promise<ApiResponse<any>>;
    getChatRoomMembers: (chatRoomId: string) => Promise<ApiResponse<any>>;
    addChatRoomMember: (chatRoomId: string, userId: string) => Promise<ApiResponse<ChatRoom>>;
    removeChatRoomMember: (chatRoomId: string, userId: string) => Promise<ApiResponse<ChatRoom>>;
    listProjectGroups: () => Promise<ApiResponse<any>>;
    createProjectGroup: (data: CreateProjectGroupRequest) => Promise<ApiResponse<ProjectGroup>>;
    listNotifications: (userId: string) => Promise<ApiResponse<any>>;
    createNotification: (data: CreateNotificationRequest) => Promise<ApiResponse<Notification>>;
    markNotificationRead: (id: string) => Promise<ApiResponse<Notification>>;
    markAllNotificationsRead: (userId: string) => Promise<ApiResponse<any>>;
    health: () => Promise<ApiResponse<string>>;
    uploadFile: (formData: FormData) => Promise<ApiResponse<any>>;
    getUserOnlineStatus: (userId: string) => Promise<ApiResponse<any>>;
    listFriends: (userId: string) => Promise<ApiResponse<any>>;
    sendFriendRequest: (userId: string, data: CreateFriendRequest) => Promise<ApiResponse<any>>;
    acceptFriendRequest: (userId: string, friendId: string) => Promise<ApiResponse<any>>;
    rejectFriendRequest: (userId: string, friendId: string) => Promise<ApiResponse<any>>;
    removeFriend: (userId: string, friendId: string) => Promise<ApiResponse<any>>;
    listContactGroups: (userId: string) => Promise<ApiResponse<any>>;
    createContactGroup: (userId: string, data: CreateContactGroupRequest) => Promise<ApiResponse<any>>;
    updateContactGroup: (userId: string, groupId: string, data: CreateContactGroupRequest) => Promise<ApiResponse<any>>;
    deleteContactGroup: (userId: string, groupId: string) => Promise<ApiResponse<any>>;
    addContactGroupMember: (userId: string, groupId: string, memberUserId: string) => Promise<ApiResponse<any>>;
    removeContactGroupMember: (userId: string, groupId: string, memberUserId: string) => Promise<ApiResponse<any>>;
    muteChatRoom: (chatId: string) => Promise<ApiResponse<any>>;
    unmuteChatRoom: (chatId: string) => Promise<ApiResponse<any>>;
    pinChatRoom: (chatId: string) => Promise<ApiResponse<any>>;
    unpinChatRoom: (chatId: string) => Promise<ApiResponse<any>>;
};
