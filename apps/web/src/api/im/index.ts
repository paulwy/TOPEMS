import apiClient from '../client';
import type { ApiResponse } from '../client';
import config from '../../config/runtime';

import { imGroupApi } from './group';
import type {
  GroupRole,
  JoinMode,
  PermissionLevel,
  GroupMember,
  GroupSettings,
  CreateGroupSettingsRequest,
  GroupPermissions,
  UpdatePermissionsRequest,
  GroupEvent,
  InviteLink,
  PinnedMessage,
} from './group';

import { imCallApi } from './call';
import type {
  CallType,
  CallDirection,
  CallStatus,
  ParticipantRole,
  CallSession,
  CallParticipant,
  InitiateCallRequest,
  AnswerCallRequest,
  ConferenceCallRequest,
  CallRecording,
  CallHistoryRecord,
  CallStats,
} from './call';

import { imRoamingApi } from './roaming';
import type {
  SyncDirection,
  SyncStatus,
  DeviceType,
  SyncDevice,
  RegisterDeviceRequest,
  SyncResult,
  ConflictRecord,
  Conversation,
  UpdateConversationRequest,
  MessageSearchResult,
  ForwardMessageRequest,
} from './roaming';

import { imPushApi } from './push';
import type {
  PushPlatform,
  PushStatus,
  MessagePriority,
  PushToken,
  RegisterPushTokenRequest,
  PushDelivery,
  SendPushRequest,
  BroadcastRequest,
  PushTemplate,
  CreatePushTemplateRequest,
  PushPreferences,
  SilentPeriod,
  CreateSilentPeriodRequest,
  PushStats,
} from './push';

import { imReactionApi } from './reaction';
import type {
  ReactionType,
  MessageReaction,
  ReactionSummary,
  Mention,
  CreateMentionRequest,
  StarredMessage,
  PinMessageRequest,
} from './reaction';

import { imMessageStateApi } from './messageState';
import type {
  DeliveryStatus,
  ReadReceipt,
  DeliveryReceipt,
  TypingUser,
  ReplyMessage,
  EditHistoryEntry,
  MessageDraft,
  ThreadInfo,
} from './messageState';

import { imWebSocketApi } from './websocket';
import type {
  ConnectionStatus,
  MessageType,
  AckStatus,
  WebSocketConfig,
  ConnectionState,
  SubscribeRequest,
  UnsubscribeRequest,
  Subscription,
  WsMessage,
  BufferedMessage,
  AckRecord,
  HeartbeatResult,
} from './websocket';

import { imChannelApi } from './channel';
import type {
  ChannelType,
  ChannelVisibility,
  ChannelMemberRole,
  Channel,
  CreateChannelRequest,
  ChannelMember,
  AddChannelMemberRequest,
  ChannelInvite,
  BanRecord,
  ChannelStats,
  DiscoverChannel,
} from './channel';

import { imBotApi } from './bot';
import type {
  BotStatus,
  BotTriggerType,
  BotCommandType,
  Bot as BotConfig,
  CreateBotRequest,
  BotCommand,
  CreateBotCommandRequest,
  BotEvent,
  CreateBotEventRequest,
  BotSubscription,
  BotLog,
  BotStats,
} from './bot';

import { imWebhookApi } from './webhook';
import type {
  WebhookStatus,
  WebhookContentType,
  WebhookConfig,
  CreateWebhookRequest,
  WebhookDelivery,
  WebhookEvent,
  WebhookStats,
  TestWebhookRequest,
  TestWebhookResult,
} from './webhook';

import { imNotificationApi } from './inAppNotification';
import type {
  NotificationType,
  NotificationPriority,
  NotificationStatus,
  InAppNotification,
  CreateNotificationRequest as CreateInAppNotificationRequest,
  NotificationPreferences,
  NotificationSettings,
  NotificationStats,
} from './inAppNotification';

import { imBridgeApi } from './bridge';
import type {
  BridgeType,
  BridgeStatus,
  DirectionType,
  ForwardRuleAction,
  Bridge,
  CreateBridgeRequest,
  ForwardRule,
  CreateForwardRuleRequest,
  BridgeDelivery,
  CrossDomainChannel,
  CreateCrossDomainChannelRequest,
  BridgeTestResult,
} from './bridge';

import { imArchiveApi } from './archive';
import type {
  ArchiveStatus,
  ExportFormat,
  ExportStatus,
  ArchiveType,
  Archive,
  CreateArchiveRequest,
  ArchiveSchedule,
  CreateArchiveScheduleRequest,
  MessageExport,
  CreateExportRequest,
  ArchiveStats,
} from './archive';

import { imPresenceApi } from './presence';
import type {
  PresenceStatus,
  ActivityType,
  UserPresence,
  UpdatePresenceRequest,
  BatchPresenceResponse,
  PresenceSettings,
  PresenceSubscription,
  PresenceStats,
} from './presence';

import { imTypingApi } from './typing';
import type {
  TypingType,
  TypingEvent,
  ReadReceiptDetail,
  TypingSettings,
  ActiveTypingSession,
} from './typing';

import { imSearchApi } from './search';
import type {
  SearchScope,
  MessageTypeFilter,
  SortOrder,
  SearchResult,
  AdvancedSearchRequest,
  SearchSuggestion,
  SearchHistory,
  TrendingSearch,
  SavedSearch,
  IndexStatus,
  IndexStats,
} from './search';

import { imConferenceApi } from './conference';
import type {
  ConferenceStatus,
  ConferenceType,
  ParticipantRole as ConferenceParticipantRole,
  RecordingFormat,
  Conference,
  CreateConferenceRequest,
  ConferenceParticipant,
  ConferenceRecording,
  ConferenceCaption,
  ConferenceStats,
} from './conference';

import { imScreenShareApi } from './screenShare';
import type {
  ScreenShareStatus,
  ScreenShareType,
  ShareQuality,
  ControlRole,
  ScreenShare,
  ScreenSharePermissions,
  CreateScreenShareRequest,
  ScreenShareViewer,
  ScreenShareAnnotation,
  ScreenShareStats,
} from './screenShare';

import { imVoiceApi } from './voice';
import type {
  VoiceMessageStatus,
  VoiceCallStatus,
  VoiceCallDirection,
  VoiceCallQuality,
  VoiceMessage,
  CreateVoiceMessageRequest,
  VoiceCall,
  MakeVoiceCallRequest,
  VoiceCallHistoryRecord,
  VoiceStats,
} from './voice';

import { imAiApi } from './ai';
import type {
  AiTaskType,
  AiModelType,
  AiTone,
  SentimentType,
  TranslationResult,
  SummarizationResult,
  ReplySuggestionResult,
  GrammarCheckResult,
  SentimentResult,
  RewriteResult,
  AiModel,
  AiConfig,
  AiUsage,
} from './ai';

import { imIntegrationApi } from './integration';
import type {
  IntegrationTarget,
  IntegrationStatus,
  IntegrationRecord,
  CreateTicketFromMessageRequest,
  CreateTaskFromMessageRequest,
  IntegrationStats,
} from './integration';

import { imWhiteboardApi } from './whiteboard';
import type {
  WhiteboardToolType,
  Whiteboard,
  CreateWhiteboardRequest,
  WhiteboardSnapshot,
  WhiteboardStats,
  ExportFormat as WhiteboardExportFormat,
} from './whiteboard';

import { imTaskSyncApi } from './taskSync';
import type {
  TaskPriority,
  TaskStatus,
  SyncedTask,
  CreateTaskFromMessageRequest as CreateTaskSyncRequest,
  PersonalTodo,
  TaskReminder,
  KanbanBoard,
  TaskSyncStats,
} from './taskSync';

import { imScheduledApi } from './scheduled';
import type {
  ScheduledMessageStatus,
  ScheduledMessage,
  CreateScheduledMessageRequest,
  UpdateScheduledMessageRequest,
  ScheduledMessageQuery,
  ScheduledMessageStats,
} from './scheduled';

import { imInteractionApi } from './interaction';
import type {
  AnnouncementType,
  Announcement,
  CreateAnnouncementRequest,
  UpdateAnnouncementRequest,
  AnnouncementQuery,
  PollStatus,
  PollOption,
  Poll,
  CreatePollRequest,
  PollQuery,
  CheckInType,
  CheckIn,
  CreateCheckInRequest,
  CheckInQuery,
} from './interaction';

import { imDeviceApi } from './device';
import type {
  DeviceType as DeviceDeviceType,
  DeviceStatus,
  DevicePlatform,
  DeviceInfo,
  RegisterDeviceRequest as RegisterImDeviceRequest,
  UpdateDeviceRequest,
  DeviceLocation,
  DeviceStats,
} from './device';

import { imTranslationApi } from './translation';
import type {
  TranslationLanguage,
  TranslationStatus,
  Translation,
  TranslateMessageRequest,
  TranslateTextRequest,
  BatchTranslateRequest,
  TranslationPreferences,
  TranslationStats,
} from './translation';

import { imRichMediaApi } from './richMedia';
import type {
  RichMediaType,
  MediaStatus,
  MediaQuality,
  RichMedia,
  UploadMediaRequest,
  UploadMediaResponse,
  CreateMediaMessageRequest,
  MediaTransformation,
  MediaStats,
} from './richMedia';

import { imAssistantApi } from './assistant';
import type {
  AssistantTaskStatus,
  ConversationSummary,
  ActionItem,
  ReplySuggestion,
  ConversationSentiment,
  ConversationInsights,
  AssistantConfig,
  AssistantTask,
  SummarizeConversationRequest,
  ExtractActionItemsRequest,
  SuggestReplyRequest,
  AnalyzeSentimentRequest,
  UpdateAssistantConfigRequest,
} from './assistant';

import { imAutomationApi } from './automation';
import type {
  RuleStatus,
  RuleTriggerType,
  RuleActionType,
  ExecutionStatus,
  AutomationRule,
  CreateAutomationRuleRequest,
  UpdateAutomationRuleRequest,
  ExecutionHistory,
  AutomationStats,
  RuleTemplate,
} from './automation';

import { imDocMessageApi } from './docMessage';
import type {
  DocumentType,
  AnnotationType,
  ExportFormat as DocExportFormat,
  DocumentPermission as DocPermission,
  WatermarkPosition,
  DocumentPreview,
  DocumentPage,
  DocumentSearchResult,
  DocumentOutline,
  DocumentAnnotation,
  DocumentAnnotationReply,
  DocumentVersion,
  DocumentPermissionSet,
  DocumentMetadata,
  DocumentReadReceipt,
  DocumentActivity,
  WatermarkConfig,
  CreateAnnotationRequest,
  ExportDocumentRequest,
  SignDocumentRequest,
  ShareDocumentLinkRequest,
  UpdateDocumentPermissionsRequest,
  DocumentStats,
} from './docMessage';

import { imLocationApi } from './locationMessage';
import type {
  LocationType,
  MapProvider,
  GeofenceStatus,
  GeofenceEventType,
  GisLayerType,
  SpatialOperation,
  GeoCoordinate,
  LocationMessage,
  PlaceOfInterest,
  Geofence,
  GeofenceEvent,
  StaticMapOptions,
  Route,
  RouteStep,
  GisMapRef,
  GisLocationRef,
  GisDeviceTrack,
  SpatialQueryResult,
  LocationHistory,
  LocationShareLink,
  LocationStats,
  SendLocationRequest,
  CreateGeofenceRequest,
  UpdateGeofenceRequest,
  SearchPlaceRequest,
  CalculateRouteRequest,
  SpatialQueryRequest,
  UnifiedPoiResult,
  GeofenceSyncResult,
} from './locationMessage';

// ==================== 原有类型（保持向后兼容） ====================

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

interface CreateChatMessageRequest {
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
  status: 'pending' | 'accepted';
  created_at: string;
  is_online?: boolean;
  last_seen?: string;
}

interface CreateFriendRequest {
  friend_id: string;
  friend_name: string;
}

export interface ContactGroup {
  id: string;
  name: string;
  created_at: string;
  updated_at: string;
}

interface CreateContactGroupRequest {
  name: string;
}

interface UploadedFileInfo {
  file_path: string;
  file_name: string;
}

interface UploadFileResponseData {
  files: UploadedFileInfo[];
}

interface ListFriendsResponseData {
  friends: Friend[];
}

interface ListContactGroupsResponseData {
  groups: ContactGroup[];
}

// ==================== 聚合 API ====================

export const imApi = {
  // ==================== 核心聊天 ====================

  listChatRooms: async (): Promise<ApiResponse<unknown>> => {
    return apiClient.im.get<unknown>('/rooms');
  },
  createChatRoom: async (data: CreateChatRoomRequest): Promise<ApiResponse<ChatRoom>> => {
    return apiClient.im.post<ChatRoom>('/rooms', data);
  },
  getChatRoom: async (id: string): Promise<ApiResponse<ChatRoom>> => {
    return apiClient.im.get<ChatRoom>(`/rooms/${id}`);
  },
  deleteChatRoom: async (id: string): Promise<ApiResponse<unknown>> => {
    return apiClient.im.delete<unknown>(`/rooms/${id}`);
  },
  listChatMessages: async (chatId: string): Promise<ApiResponse<unknown>> => {
    return apiClient.im.get<unknown>(`/rooms/${chatId}/messages`);
  },
  createChatMessage: async (data: CreateChatMessageRequest): Promise<ApiResponse<ChatMessage>> => {
    return apiClient.im.post<ChatMessage>(`/rooms/${data.chat_id}/messages`, data);
  },
  markMessageRead: async (id: string): Promise<ApiResponse<ChatMessage>> => {
    return apiClient.im.put<ChatMessage>(`/messages/${id}/read`);
  },
  updateChatMessage: async (id: string, content: string): Promise<ApiResponse<ChatMessage>> => {
    return apiClient.im.put<ChatMessage>(`/messages/${id}`, {
      content,
    });
  },
  deleteChatMessage: async (id: string): Promise<ApiResponse<unknown>> => {
    return apiClient.im.delete<unknown>(`/messages/${id}`);
  },

  // ==================== 成员管理（兼容保留） ====================

  getChatRoomMembers: async (chatRoomId: string): Promise<ApiResponse<unknown>> => {
    return apiClient.im.get<unknown>(`/rooms/${chatRoomId}/members`);
  },
  addChatRoomMember: async (chatRoomId: string, userId: string): Promise<ApiResponse<ChatRoom>> => {
    return apiClient.im.post<ChatRoom>(`/rooms/${chatRoomId}/members`, {
      user_id: userId,
    });
  },
  removeChatRoomMember: async (
    chatRoomId: string,
    userId: string
  ): Promise<ApiResponse<ChatRoom>> => {
    return apiClient.im.delete<ChatRoom>(`/rooms/${chatRoomId}/members/${userId}`);
  },

  // ==================== 项目群组 ====================

  listProjectGroups: async (): Promise<ApiResponse<unknown>> => {
    return apiClient.im.get<unknown>('/project-groups');
  },
  createProjectGroup: async (
    data: CreateProjectGroupRequest
  ): Promise<ApiResponse<ProjectGroup>> => {
    return apiClient.im.post<ProjectGroup>('/project-groups', data);
  },

  // ==================== 通知 ====================

  listNotifications: async (userId: string): Promise<ApiResponse<unknown>> => {
    return apiClient.im.get<unknown>(`/notifications/${userId}`);
  },
  createNotification: async (
    data: CreateNotificationRequest
  ): Promise<ApiResponse<Notification>> => {
    return apiClient.im.post<Notification>('/notifications', data);
  },
  markNotificationRead: async (id: string): Promise<ApiResponse<Notification>> => {
    return apiClient.im.put<Notification>(`/notifications/${id}/read`);
  },
  markAllNotificationsRead: async (userId: string): Promise<ApiResponse<unknown>> => {
    return apiClient.im.put<unknown>(`/notifications/${userId}/read-all`);
  },

  // ==================== 在线状态 ====================

  health: async (): Promise<ApiResponse<string>> => {
    return apiClient.im.get<string>('/health');
  },

  uploadFile: async (formData: FormData): Promise<ApiResponse<UploadFileResponseData>> => {
    const baseURL = config.services.im;
    const response = await fetch(`${baseURL}/files/upload`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${localStorage.getItem('token')}`,
      },
      body: formData,
    });
    return response.json();
  },

  getUserOnlineStatus: async (userId: string): Promise<ApiResponse<unknown>> => {
    return apiClient.im.get<unknown>(`/online-status/${userId}`);
  },

  // ==================== 好友/联系人 ====================

  listFriends: async (userId: string): Promise<ApiResponse<ListFriendsResponseData>> => {
    return apiClient.im.get<ListFriendsResponseData>(`/contacts/${userId}`);
  },
  sendFriendRequest: async (
    userId: string,
    data: CreateFriendRequest
  ): Promise<ApiResponse<unknown>> => {
    return apiClient.im.post<unknown>(`/contacts/${userId}`, data);
  },
  acceptFriendRequest: async (userId: string, friendId: string): Promise<ApiResponse<unknown>> => {
    return apiClient.im.put<unknown>(`/contacts/${userId}/${friendId}/accept`);
  },
  rejectFriendRequest: async (userId: string, friendId: string): Promise<ApiResponse<unknown>> => {
    return apiClient.im.put<unknown>(`/contacts/${userId}/${friendId}/reject`);
  },
  removeFriend: async (userId: string, friendId: string): Promise<ApiResponse<unknown>> => {
    return apiClient.im.delete<unknown>(`/contacts/${userId}/${friendId}`);
  },

  // ==================== 联系人分组 ====================

  listContactGroups: async (
    userId: string
  ): Promise<ApiResponse<ListContactGroupsResponseData>> => {
    return apiClient.im.get<ListContactGroupsResponseData>(`/contact-groups/${userId}`);
  },
  createContactGroup: async (
    userId: string,
    data: CreateContactGroupRequest
  ): Promise<ApiResponse<unknown>> => {
    return apiClient.im.post<unknown>(`/contact-groups/${userId}`, data);
  },
  updateContactGroup: async (
    userId: string,
    groupId: string,
    data: CreateContactGroupRequest
  ): Promise<ApiResponse<unknown>> => {
    return apiClient.im.put<unknown>(`/contact-groups/${userId}/${groupId}`, data);
  },
  deleteContactGroup: async (userId: string, groupId: string): Promise<ApiResponse<unknown>> => {
    return apiClient.im.delete<unknown>(`/contact-groups/${userId}/${groupId}`);
  },
  addContactGroupMember: async (
    userId: string,
    groupId: string,
    memberUserId: string
  ): Promise<ApiResponse<unknown>> => {
    return apiClient.im.post<unknown>(`/contact-groups/${userId}/${groupId}/members`, {
      user_id: memberUserId,
    });
  },
  removeContactGroupMember: async (
    userId: string,
    groupId: string,
    memberUserId: string
  ): Promise<ApiResponse<unknown>> => {
    return apiClient.im.delete<unknown>(
      `/contact-groups/${userId}/${groupId}/members/${memberUserId}`
    );
  },

  // ==================== 聊天房间操作 ====================

  muteChatRoom: async (chatId: string): Promise<ApiResponse<unknown>> => {
    return apiClient.im.put<unknown>(`/rooms/${chatId}/mute`);
  },
  unmuteChatRoom: async (chatId: string): Promise<ApiResponse<unknown>> => {
    return apiClient.im.put<unknown>(`/rooms/${chatId}/unmute`);
  },
  pinChatRoom: async (chatId: string): Promise<ApiResponse<unknown>> => {
    return apiClient.im.put<unknown>(`/rooms/${chatId}/pin`);
  },
  unpinChatRoom: async (chatId: string): Promise<ApiResponse<unknown>> => {
    return apiClient.im.put<unknown>(`/rooms/${chatId}/unpin`);
  },

  // ==================== 子域：群组增强 ====================

  groups: imGroupApi,

  // ==================== 子域：通话 ====================

  calls: imCallApi,

  // ==================== 子域：消息漫游 ====================

  roaming: imRoamingApi,

  // ==================== 子域：离线推送 ====================

  push: imPushApi,

  // ==================== 子域：消息反应 ====================

  reactions: imReactionApi,

  // ==================== 子域：消息状态 ====================

  messageState: imMessageStateApi,

  // ==================== 子域：WebSocket 连接 ====================

  websocket: imWebSocketApi,

  // ==================== 子域：频道管理 ====================

  channels: imChannelApi,

  // ==================== 子域：机器人管理 ====================

  bots: imBotApi,

  // ==================== 子域：Webhook 集成 ====================

  webhooks: imWebhookApi,

  // ==================== 子域：应用内通知 ====================

  notifications: imNotificationApi,

  // ==================== 子域：跨域桥接 ====================

  bridges: imBridgeApi,

  // ==================== 子域：消息归档 ====================

  archives: imArchiveApi,

  // ==================== 子域：在线状态 ====================

  presence: imPresenceApi,

  // ==================== 子域：输入状态 ====================

  typing: imTypingApi,

  // ==================== 子域：消息搜索 ====================

  search: imSearchApi,

  // ==================== 子域：会议通话 ====================

  conference: imConferenceApi,

  // ==================== 子域：屏幕共享 ====================

  screenShare: imScreenShareApi,

  // ==================== 子域：语音消息与通话 ====================

  voice: imVoiceApi,

  // ==================== 子域：AI 智能助手 ====================

  ai: imAiApi,

  // ==================== 子域：消息集成中心 ====================

  integration: imIntegrationApi,

  // ==================== 子域：会议白板协同 ====================

  whiteboard: imWhiteboardApi,

  // ==================== 子域：消息任务联动 ====================

  taskSync: imTaskSyncApi,

  // ==================== 子域：定时消息 ====================

  scheduled: imScheduledApi,

  // ==================== 子域：互动增强 ====================

  interaction: imInteractionApi,

  // ==================== 子域：设备管理 ====================

  devices: imDeviceApi,

  // ==================== 子域：消息翻译 ====================

  translation: imTranslationApi,

  // ==================== 子域：富媒体 ====================

  media: imRichMediaApi,

  // ==================== 子域：会话内 AI 助手 ====================

  assistant: imAssistantApi,

  // ==================== 子域：聊天自动化 ====================

  automation: imAutomationApi,

  // ==================== 子域：文档消息增强 ====================

  docMessage: imDocMessageApi,

  // ==================== 子域：位置消息 ====================

  location: imLocationApi,

  // ==================== 顶层快捷方法（群组） ====================

  // 成员快捷方法
  listGroupMembers: imGroupApi.listMembers,
  addGroupMember: imGroupApi.addMember,
  removeGroupMember: imGroupApi.removeMember,
  setMemberRole: imGroupApi.updateMemberRole,
  muteGroupMember: imGroupApi.muteMember,
  batchAddMembers: imGroupApi.batchAddMembers,
  transferGroupOwnership: imGroupApi.transferOwnership,

  // 设置快捷方法
  getGroupSettings: imGroupApi.getSettings,
  updateGroupSettings: imGroupApi.updateSettings,
  getGroupPermissions: imGroupApi.getPermissions,
  updateGroupPermissions: imGroupApi.updatePermissions,

  // 操作快捷方法
  getInviteLink: imGroupApi.getInviteLink,
  createInviteLink: imGroupApi.createInviteLink,
  leaveGroup: imGroupApi.leaveGroup,
  archiveGroup: imGroupApi.archiveGroup,
  pinMessage: imGroupApi.pinMessage,
  searchGroups: imGroupApi.searchGroups,

  // ==================== 顶层快捷方法（通话） ====================

  // 发起/应答
  initiateCall: imCallApi.initiateCall,
  answerCall: imCallApi.answerCall,
  declineCall: imCallApi.declineCall,
  hangupCall: imCallApi.hangupCall,
  getActiveCall: imCallApi.getActiveCall,

  // 通话控制
  muteCall: imCallApi.muteCall,
  unmuteCall: imCallApi.unmuteCall,
  transferCall: imCallApi.transferCall,

  // 会议
  createConference: imCallApi.createConference,
  joinConference: imCallApi.joinConference,
  leaveConference: imCallApi.leaveConference,

  // 历史/统计
  listCallHistory: imCallApi.listCallHistory,
  startRecording: imCallApi.startRecording,
  getCallStats: imCallApi.getCallStats,

  // ==================== 顶层快捷方法（漫游） ====================

  // 会话
  listConversations: imRoamingApi.listConversations,
  getConversation: imRoamingApi.getConversation,
  updateConversation: imRoamingApi.updateConversation,
  deleteConversation: imRoamingApi.deleteConversation,
  getUnreadCount: imRoamingApi.getUnreadCount,
  markAllRead: imRoamingApi.markAllRead,

  // 设备
  listDevices: imRoamingApi.listDevices,
  registerDevice: imRoamingApi.registerDevice,
  unregisterDevice: imRoamingApi.unregisterDevice,
  updateDeviceSync: imRoamingApi.updateDeviceSync,
  getSyncStatus: imRoamingApi.getSyncStatus,

  // 同步
  pullMessages: imRoamingApi.pullMessages,
  pushMessages: imRoamingApi.pushMessages,
  getSyncChangelog: imRoamingApi.getSyncChangelog,
  resolveConflict: imRoamingApi.resolveConflict,

  // 搜索/转发
  searchMessages: imRoamingApi.searchMessages,
  listMessageHistory: imRoamingApi.listMessageHistory,
  forwardMessage: imRoamingApi.forwardMessage,
  batchForward: imRoamingApi.batchForward,

  // 批量操作
  batchMarkRead: imRoamingApi.batchMarkRead,
  batchDelete: imRoamingApi.batchDelete,

  // ==================== 顶层快捷方法（推送） ====================

  // Token
  registerPushToken: imPushApi.registerToken,
  updatePushToken: imPushApi.updateToken,
  deletePushToken: imPushApi.deleteToken,
  listMyPushTokens: imPushApi.listMyTokens,

  // 发送
  sendPush: imPushApi.sendPush,
  broadcastPush: imPushApi.broadcastPush,
  testPush: imPushApi.testPush,

  // 投递
  getDelivery: imPushApi.getDelivery,
  listDeliveries: imPushApi.listDeliveries,

  // 模板
  listPushTemplates: imPushApi.listTemplates,
  createPushTemplate: imPushApi.createTemplate,
  updatePushTemplate: imPushApi.updateTemplate,
  deletePushTemplate: imPushApi.deleteTemplate,

  // 偏好/静默
  getPushPreferences: imPushApi.getPreferences,
  updatePushPreferences: imPushApi.updatePreferences,
  listSilentPeriods: imPushApi.listSilentPeriods,
  createSilentPeriod: imPushApi.createSilentPeriod,
  updateSilentPeriod: imPushApi.updateSilentPeriod,
  deleteSilentPeriod: imPushApi.deleteSilentPeriod,

  // 统计/刷新
  getPushStats: imPushApi.getPushStats,
  refreshPushTokens: imPushApi.refreshTokens,

  // ==================== 顶层快捷方法（反应/收藏/置顶） ====================

  // 表情反应
  listReactions: imReactionApi.listReactions,
  addReaction: imReactionApi.addReaction,
  removeReaction: imReactionApi.removeReaction,
  getReactionSummary: imReactionApi.getReactionSummary,
  toggleReaction: imReactionApi.toggleReaction,

  // @提及
  listMentions: imReactionApi.listMentions,
  getUnreadMentionCount: imReactionApi.getUnreadMentionCount,
  markMentionsRead: imReactionApi.markMentionsRead,

  // 收藏/置顶
  listStarredMessages: imReactionApi.listStarredMessages,
  starMessage: imReactionApi.starMessage,
  unstarMessage: imReactionApi.unstarMessage,
  listPinnedMessages: imReactionApi.listPinnedMessages,
  pinReactionMessage: imReactionApi.pinMessage,
  unpinReactionMessage: imReactionApi.unpinMessage,

  // ==================== 顶层快捷方法（消息状态与交互） ====================

  // 已读回执
  getReadReceipts: imMessageStateApi.getReadReceipts,
  markMessageAsRead: imMessageStateApi.markMessageRead,
  getDeliveryStatus: imMessageStateApi.getDeliveryStatus,

  // 输入状态
  sendTyping: imMessageStateApi.sendTyping,
  getTypingUsers: imMessageStateApi.getTypingUsers,

  // 引用/回复
  getMessageReplies: imMessageStateApi.getMessageReplies,
  replyToMessage: imMessageStateApi.replyToMessage,

  // 编辑/历史
  editMessage: imMessageStateApi.editMessage,
  getEditHistory: imMessageStateApi.getEditHistory,
  restoreMessageVersion: imMessageStateApi.restoreMessageVersion,

  // 草稿
  getDraft: imMessageStateApi.getDraft,
  saveDraft: imMessageStateApi.saveDraft,
  deleteDraft: imMessageStateApi.deleteDraft,

  // 话题/线程
  getMessageThread: imMessageStateApi.getMessageThread,

  // ==================== 顶层快捷方法（WebSocket） ====================

  // 连接管理
  getWsConnectionConfig: imWebSocketApi.getConnectionConfig,
  updateWsConnectionConfig: imWebSocketApi.updateConnectionConfig,
  getWsConnectionState: imWebSocketApi.getConnectionState,
  wsConnect: imWebSocketApi.connect,
  wsDisconnect: imWebSocketApi.disconnect,
  wsReconnect: imWebSocketApi.reconnect,

  // 心跳
  sendHeartbeat: imWebSocketApi.sendHeartbeat,
  startHeartbeat: imWebSocketApi.startHeartbeat,
  stopHeartbeat: imWebSocketApi.stopHeartbeat,

  // 订阅
  wsSubscribe: imWebSocketApi.subscribe,
  wsUnsubscribe: imWebSocketApi.unsubscribe,
  listWsSubscriptions: imWebSocketApi.listSubscriptions,

  // 消息发送
  wsSendMessage: imWebSocketApi.sendMessage,
  wsBroadcast: imWebSocketApi.broadcastMessage,

  // 消息队列
  getBufferedMessages: imWebSocketApi.getBufferedMessages,
  flushMessageQueue: imWebSocketApi.flushMessageQueue,

  // ACK
  acknowledgeMessage: imWebSocketApi.acknowledgeMessage,
  getAckStatus: imWebSocketApi.getAckStatus,

  // 诊断
  runWsDiagnostics: imWebSocketApi.runDiagnostics,

  // ==================== 顶层快捷方法（频道） ====================

  // 频道 CRUD
  listChannels: imChannelApi.listChannels,
  createChannel: imChannelApi.createChannel,
  getChannel: imChannelApi.getChannel,
  updateChannel: imChannelApi.updateChannel,
  deleteChannel: imChannelApi.deleteChannel,

  // 成员
  listChannelMembers: imChannelApi.listChannelMembers,
  addChannelMember: imChannelApi.addChannelMember,
  removeChannelMember: imChannelApi.removeChannelMember,
  updateChannelMemberRole: imChannelApi.updateMemberRole,

  // 封禁
  banUser: imChannelApi.banUser,
  unbanUser: imChannelApi.unbanUser,

  // 邀请
  createInvite: imChannelApi.createInvite,
  revokeInvite: imChannelApi.revokeInvite,

  // 频道操作
  archiveChannel: imChannelApi.archiveChannel,
  unarchiveChannel: imChannelApi.unarchiveChannel,
  leaveChannel: imChannelApi.leaveChannel,

  // 发现/统计
  discoverChannels: imChannelApi.discoverChannels,
  getChannelStats: imChannelApi.getChannelStats,

  // ==================== 顶层快捷方法（机器人） ====================

  // 机器人 CRUD
  listBots: imBotApi.listBots,
  createBot: imBotApi.createBot,
  getBot: imBotApi.getBot,
  updateBot: imBotApi.updateBot,
  deleteBot: imBotApi.deleteBot,

  // 机器人操作
  enableBot: imBotApi.enableBot,
  disableBot: imBotApi.disableBot,
  testBot: imBotApi.testBot,
  cloneBot: imBotApi.cloneBot,

  // 命令/事件
  listBotCommands: imBotApi.listBotCommands,
  createBotCommand: imBotApi.createBotCommand,
  listBotEvents: imBotApi.listBotEvents,
  createBotEvent: imBotApi.createBotEvent,

  // 订阅
  addBotSubscription: imBotApi.addBotSubscription,
  removeBotSubscription: imBotApi.removeBotSubscription,

  // 日志/统计
  listBotLogs: imBotApi.listBotLogs,
  getBotStats: imBotApi.getBotStats,

  // ==================== 顶层快捷方法（Webhook） ====================

  // Webhook CRUD
  listWebhooks: imWebhookApi.listWebhooks,
  createWebhook: imWebhookApi.createWebhook,
  getWebhook: imWebhookApi.getWebhook,
  updateWebhook: imWebhookApi.updateWebhook,
  deleteWebhook: imWebhookApi.deleteWebhook,

  // Webhook 操作
  enableWebhook: imWebhookApi.enableWebhook,
  disableWebhook: imWebhookApi.disableWebhook,
  rotateWebhookSecret: imWebhookApi.rotateWebhookSecret,
  testWebhook: imWebhookApi.testWebhook,

  // 投递
  listWebhookDeliveries: imWebhookApi.listWebhookDeliveries,
  retryWebhookDelivery: imWebhookApi.retryDelivery,

  // 事件/统计
  listWebhookEvents: imWebhookApi.listWebhookEvents,
  getWebhookStats: imWebhookApi.getWebhookStats,

  // ==================== 顶层快捷方法（应用内通知） ====================

  // 通知 CRUD
  listInAppNotifications: imNotificationApi.listNotifications,
  getInAppNotification: imNotificationApi.getNotification,
  createInAppNotification: imNotificationApi.createNotification,
  deleteInAppNotification: imNotificationApi.deleteNotification,

  // 通知状态
  markInAppNotificationRead: imNotificationApi.markNotificationRead,
  markAllInAppNotificationsRead: imNotificationApi.markAllRead,
  getUnreadNotificationCount: imNotificationApi.getUnreadCount,

  // 偏好/设置
  getNotificationPreferences: imNotificationApi.getNotificationPreferences,
  updateNotificationPreferences: imNotificationApi.updateNotificationPreferences,
  getNotificationSettings: imNotificationApi.getNotificationSettings,
  updateNotificationSettings: imNotificationApi.updateNotificationSettings,

  // 广播/统计
  broadcastNotification: imNotificationApi.broadcastNotification,
  getNotificationStats: imNotificationApi.getNotificationStats,

  // ==================== 顶层快捷方法（跨域桥接） ====================

  // Bridge CRUD
  listBridges: imBridgeApi.listBridges,
  createBridge: imBridgeApi.createBridge,
  getBridge: imBridgeApi.getBridge,
  updateBridge: imBridgeApi.updateBridge,
  deleteBridge: imBridgeApi.deleteBridge,

  // Bridge 操作
  activateBridge: imBridgeApi.activateBridge,
  deactivateBridge: imBridgeApi.deactivateBridge,
  testBridge: imBridgeApi.testBridge,
  bridgeForwardMessage: imBridgeApi.forwardMessage,

  // 转发规则
  listForwardRules: imBridgeApi.listForwardRules,
  createForwardRule: imBridgeApi.createForwardRule,

  // 跨域频道
  listCrossDomainChannels: imBridgeApi.listCrossDomainChannels,
  createCrossDomainChannel: imBridgeApi.createCrossDomainChannel,

  // ==================== 顶层快捷方法（消息归档） ====================

  // 归档 CRUD
  listArchives: imArchiveApi.listArchives,
  createArchive: imArchiveApi.createArchive,
  getArchive: imArchiveApi.getArchive,
  deleteArchive: imArchiveApi.deleteArchive,

  // 归档操作
  restoreArchive: imArchiveApi.restoreArchive,
  bulkArchive: imArchiveApi.bulkArchive,

  // 归档计划
  listArchiveSchedules: imArchiveApi.listArchiveSchedules,
  createArchiveSchedule: imArchiveApi.createArchiveSchedule,
  runArchiveSchedule: imArchiveApi.runArchiveSchedule,

  // 消息导出
  listExports: imArchiveApi.listExports,
  createExport: imArchiveApi.createExport,
  getExport: imArchiveApi.getExport,
  downloadExport: imArchiveApi.downloadExport,
  cancelExport: imArchiveApi.cancelExport,

  // 统计
  getArchiveStats: imArchiveApi.getArchiveStats,

  // ==================== 顶层快捷方法（在线状态） ====================

  // 状态管理
  getMyPresence: imPresenceApi.getMyPresence,
  getUserPresence: imPresenceApi.getUserPresence,
  updateMyPresence: imPresenceApi.updateMyPresence,
  goOnline: imPresenceApi.goOnline,
  goOffline: imPresenceApi.goOffline,
  setBusy: imPresenceApi.setBusy,
  setAway: imPresenceApi.setAway,

  // 批量查询
  getBatchPresence: imPresenceApi.getBatchPresence,
  getContactsPresence: imPresenceApi.getContactsPresence,
  getChannelMembersPresence: imPresenceApi.getChannelMembersPresence,

  // 订阅/设置
  subscribePresence: imPresenceApi.subscribePresence,
  getPresenceSettings: imPresenceApi.getPresenceSettings,
  updatePresenceSettings: imPresenceApi.updatePresenceSettings,

  // ==================== 顶层快捷方法（输入状态） ====================

  // 输入指示
  startTyping: imTypingApi.startTyping,
  stopTyping: imTypingApi.stopTyping,
  getChannelTypingUsers: imTypingApi.getTypingUsers,

  // 已读回执
  sendReadReceipt: imTypingApi.sendReadReceipt,
  getReadReceipt: imTypingApi.getReadReceipt,
  batchMarkAsRead: imTypingApi.batchMarkAsRead,

  // 设置
  getTypingSettings: imTypingApi.getTypingSettings,
  updateTypingSettings: imTypingApi.updateTypingSettings,

  // ==================== 顶层快捷方法（消息搜索） ====================

  // 搜索
  searchMessagesGlobal: imSearchApi.searchMessages,
  advancedSearch: imSearchApi.advancedSearch,
  getSearchSuggestions: imSearchApi.getSearchSuggestions,

  // 历史/收藏
  getSearchHistory: imSearchApi.getSearchHistory,
  deleteSearchHistory: imSearchApi.deleteSearchHistory,
  listSavedSearches: imSearchApi.listSavedSearches,
  createSavedSearch: imSearchApi.createSavedSearch,

  // 索引
  getIndexStatus: imSearchApi.getIndexStatus,
  triggerReindex: imSearchApi.triggerReindex,
  getIndexStats: imSearchApi.getIndexStats,

  // ==================== 顶层快捷方法（会议通话） ====================

  // 会议 CRUD
  listConferences: imConferenceApi.listConferences,
  createIMConference: imConferenceApi.createConference,
  getConference: imConferenceApi.getConference,
  updateConference: imConferenceApi.updateConference,
  deleteConference: imConferenceApi.deleteConference,

  // 会议控制
  startIMConference: imConferenceApi.startConference,
  endConference: imConferenceApi.endConference,
  joinIMConference: imConferenceApi.joinConference,
  leaveIMConference: imConferenceApi.leaveConference,

  // 参与者
  listConferenceParticipants: imConferenceApi.listConferenceParticipants,
  inviteParticipant: imConferenceApi.inviteParticipant,
  updateParticipantRole: imConferenceApi.updateParticipantRole,
  removeParticipant: imConferenceApi.removeParticipant,

  // 录制/字幕
  startConferenceRecording: imConferenceApi.startRecording,
  stopConferenceRecording: imConferenceApi.stopRecording,
  getConferenceCaptions: imConferenceApi.getConferenceCaptions,

  // 统计
  getConferenceStats: imConferenceApi.getConferenceStats,

  // ==================== 顶层快捷方法（屏幕共享） ====================

  // 屏幕共享管理
  listScreenShares: imScreenShareApi.listScreenShares,
  startScreenShare: imScreenShareApi.startScreenShare,
  getScreenShare: imScreenShareApi.getScreenShare,
  stopScreenShare: imScreenShareApi.stopScreenShare,

  // 控制
  grantScreenShareControl: imScreenShareApi.grantControl,
  revokeScreenShareControl: imScreenShareApi.revokeControl,

  // 观众/标注
  listScreenShareViewers: imScreenShareApi.listScreenShareViewers,
  getScreenShareSnapshot: imScreenShareApi.getScreenShareSnapshot,
  addScreenShareAnnotation: imScreenShareApi.addScreenShareAnnotation,

  // 权限/统计
  getScreenSharePermissions: imScreenShareApi.getScreenSharePermissions,
  getScreenShareStats: imScreenShareApi.getScreenShareStats,

  // ==================== 顶层快捷方法（语音） ====================

  // 语音消息
  uploadVoiceMessage: imVoiceApi.uploadVoiceMessage,
  getVoiceMessage: imVoiceApi.getVoiceMessage,
  getVoiceMessagePlayUrl: imVoiceApi.getVoiceMessagePlayUrl,
  transcribeVoiceMessage: imVoiceApi.transcribeVoiceMessage,
  deleteVoiceMessage: imVoiceApi.deleteVoiceMessage,

  // 语音通话
  makeVoiceCall: imVoiceApi.makeVoiceCall,
  answerVoiceCall: imVoiceApi.answerVoiceCall,
  hangupVoiceCall: imVoiceApi.hangupVoiceCall,
  muteVoiceCall: imVoiceApi.muteVoiceCall,
  unmuteVoiceCall: imVoiceApi.unmuteVoiceCall,
  holdVoiceCall: imVoiceApi.holdVoiceCall,
  unholdVoiceCall: imVoiceApi.unholdVoiceCall,
  transferVoiceCall: imVoiceApi.transferVoiceCall,
  getVoiceCallStatus: imVoiceApi.getVoiceCallStatus,
  listVoiceCallHistory: imVoiceApi.listVoiceCallHistory,
  startVoiceCallRecording: imVoiceApi.startVoiceCallRecording,
  stopVoiceCallRecording: imVoiceApi.stopVoiceCallRecording,
  getVoiceStats: imVoiceApi.getVoiceStats,

  // ==================== 顶层快捷方法（AI） ====================

  // 翻译
  translateText: imAiApi.translate,
  batchTranslateText: imAiApi.batchTranslate,
  detectLanguage: imAiApi.detectLanguage,

  // 文本处理
  summarizeText: imAiApi.summarize,
  checkGrammar: imAiApi.checkGrammar,
  analyzeSentiment: imAiApi.analyzeSentiment,
  rewriteText: imAiApi.rewrite,

  // 智能回复
  suggestReply: imAiApi.suggestReply,

  // 模型/配置
  listAiModels: imAiApi.listAiModels,
  getAiConfig: imAiApi.getAiConfig,
  updateAiConfig: imAiApi.updateAiConfig,
  getAiUsage: imAiApi.getAiUsage,

  // ==================== 顶层快捷方法（集成） ====================

  // 消息转工单/任务/日程/审批
  createTicketFromMessage: imIntegrationApi.createTicketFromMessage,
  createTaskFromMessage: imIntegrationApi.createTaskFromMessage,
  createCalendarEventFromMessage: imIntegrationApi.createCalendarEventFromMessage,
  createApprovalFromMessage: imIntegrationApi.createApprovalFromMessage,
  triggerWebhookFromMessage: imIntegrationApi.triggerWebhookFromMessage,

  // 集成历史/统计
  listIntegrationHistory: imIntegrationApi.listIntegrationHistory,
  getIntegrationRecord: imIntegrationApi.getIntegrationRecord,
  deleteIntegrationRecord: imIntegrationApi.deleteIntegrationRecord,
  getIntegrationStats: imIntegrationApi.getIntegrationStats,

  // ==================== 顶层快捷方法（白板） ====================

  // 白板 CRUD
  listWhiteboards: imWhiteboardApi.listWhiteboards,
  createWhiteboard: imWhiteboardApi.createWhiteboard,
  getWhiteboard: imWhiteboardApi.getWhiteboard,
  updateWhiteboard: imWhiteboardApi.updateWhiteboard,
  deleteWhiteboard: imWhiteboardApi.deleteWhiteboard,

  // 快照
  createSnapshot: imWhiteboardApi.createSnapshot,
  listWhiteboardSnapshots: imWhiteboardApi.listWhiteboardSnapshots,
  getWhiteboardSnapshot: imWhiteboardApi.getWhiteboardSnapshot,
  restoreWhiteboardSnapshot: imWhiteboardApi.restoreWhiteboardSnapshot,

  // 协作/导出/统计
  listWhiteboardCollaborators: imWhiteboardApi.listWhiteboardCollaborators,
  shareWhiteboard: imWhiteboardApi.shareWhiteboard,
  exportWhiteboard: imWhiteboardApi.exportWhiteboard,
  getWhiteboardStats: imWhiteboardApi.getWhiteboardStats,

  // ==================== 顶层快捷方法（任务联动） ====================

  // 消息转任务
  createSyncedTask: imTaskSyncApi.createTaskFromMessage,
  batchCreateSyncedTasks: imTaskSyncApi.batchCreateTasksFromMessages,

  // 任务管理
  listSyncedTasks: imTaskSyncApi.listSyncedTasks,
  getSyncedTask: imTaskSyncApi.getSyncedTask,
  updateSyncedTask: imTaskSyncApi.updateSyncedTask,
  deleteSyncedTask: imTaskSyncApi.deleteSyncedTask,

  // 个人待办
  listMyTodos: imTaskSyncApi.listMyTodos,
  createMyTodo: imTaskSyncApi.createMyTodo,
  toggleTodoComplete: imTaskSyncApi.toggleTodoComplete,
  deleteMyTodo: imTaskSyncApi.deleteMyTodo,

  // 提醒/看板/统计
  listTaskReminders: imTaskSyncApi.listTaskReminders,
  createTaskReminder: imTaskSyncApi.createTaskReminder,
  updateTaskReminder: imTaskSyncApi.updateTaskReminder,
  deleteTaskReminder: imTaskSyncApi.deleteTaskReminder,
  listKanbanBoards: imTaskSyncApi.listKanbanBoards,
  createKanbanBoard: imTaskSyncApi.createKanbanBoard,
  getKanbanBoard: imTaskSyncApi.getKanbanBoard,
  getTaskSyncStats: imTaskSyncApi.getTaskSyncStats,

  // ==================== 顶层快捷方法（定时消息） ====================

  // 定时消息 CRUD
  createScheduledMessage: imScheduledApi.createScheduledMessage,
  listScheduledMessages: imScheduledApi.listScheduledMessages,
  getScheduledMessage: imScheduledApi.getScheduledMessage,
  updateScheduledMessage: imScheduledApi.updateScheduledMessage,
  deleteScheduledMessage: imScheduledApi.deleteScheduledMessage,

  // 定时控制
  sendScheduledMessageNow: imScheduledApi.sendScheduledMessageNow,
  cancelScheduledMessage: imScheduledApi.cancelScheduledMessage,

  // 批量操作/统计
  batchSendScheduledMessages: imScheduledApi.batchSendScheduledMessages,
  batchDeleteScheduledMessages: imScheduledApi.batchDeleteScheduledMessages,
  getScheduledMessageStats: imScheduledApi.getScheduledMessageStats,

  // ==================== 顶层快捷方法（互动增强） ====================

  // 群公告
  createAnnouncement: imInteractionApi.createAnnouncement,
  listAnnouncements: imInteractionApi.listAnnouncements,
  getAnnouncement: imInteractionApi.getAnnouncement,
  updateAnnouncement: imInteractionApi.updateAnnouncement,
  deleteAnnouncement: imInteractionApi.deleteAnnouncement,
  markAnnouncementRead: imInteractionApi.markAnnouncementRead,

  // 投票
  createPoll: imInteractionApi.createPoll,
  listPolls: imInteractionApi.listPolls,
  getPoll: imInteractionApi.getPoll,
  votePoll: imInteractionApi.votePoll,
  closePoll: imInteractionApi.closePoll,
  deletePoll: imInteractionApi.deletePoll,

  // 签到
  createCheckIn: imInteractionApi.createCheckIn,
  listCheckIns: imInteractionApi.listCheckIns,
  getCheckIn: imInteractionApi.getCheckIn,
  submitCheckIn: imInteractionApi.submitCheckIn,
  closeCheckIn: imInteractionApi.closeCheckIn,
  deleteCheckIn: imInteractionApi.deleteCheckIn,

  // ==================== 顶层快捷方法（设备管理） ====================

  registerImDevice: imDeviceApi.registerDevice,
  listMyDevices: imDeviceApi.listMyDevices,
  getDevice: imDeviceApi.getDevice,
  updateDevice: imDeviceApi.updateDevice,
  deleteDevice: imDeviceApi.deleteDevice,
  setPrimaryDevice: imDeviceApi.setPrimaryDevice,
  getDeviceLocation: imDeviceApi.getDeviceLocation,
  updateDeviceLocation: imDeviceApi.updateDeviceLocation,
  getDeviceStats: imDeviceApi.getDeviceStats,
  listUserDevices: imDeviceApi.listUserDevices,
  syncDeviceContacts: imDeviceApi.syncDeviceContacts,
  listDeviceSessions: imDeviceApi.listDeviceSessions,

  // ==================== 顶层快捷方法（消息翻译） ====================

  translateMessage: imTranslationApi.translateMessage,
  translateMessageText: imTranslationApi.translateText,
  batchTranslateMessages: imTranslationApi.batchTranslate,
  getTranslationRecord: imTranslationApi.getTranslation,
  listMessageTranslations: imTranslationApi.listMessageTranslations,
  deleteTranslation: imTranslationApi.deleteTranslation,
  getTranslationPreferences: imTranslationApi.getTranslationPreferences,
  updateTranslationPreferences: imTranslationApi.updateTranslationPreferences,
  detectTranslationLanguage: imTranslationApi.detectLanguage,
  getAvailableLanguages: imTranslationApi.getAvailableLanguages,
  getTranslationStats: imTranslationApi.getTranslationStats,

  // ==================== 顶层快捷方法（富媒体） ====================

  requestMediaUpload: imRichMediaApi.requestUpload,
  completeMediaUpload: imRichMediaApi.completeUpload,
  listRichMedia: imRichMediaApi.listMedia,
  getMedia: imRichMediaApi.getMedia,
  deleteMedia: imRichMediaApi.deleteMedia,
  downloadMedia: imRichMediaApi.downloadMedia,
  createMediaMessage: imRichMediaApi.createMediaMessage,
  transformMedia: imRichMediaApi.transformMedia,
  getMediaPreview: imRichMediaApi.getMediaPreview,
  batchDeleteMedia: imRichMediaApi.batchDeleteMedia,
  listChatMedia: imRichMediaApi.listChatMedia,
  getMediaStats: imRichMediaApi.getMediaStats,
  getMediaStorageInfo: imRichMediaApi.getStorageInfo,

  // ==================== 顶层快捷方法（会话内 AI 助手） ====================

  summarizeConversation: imAssistantApi.summarizeConversation,
  extractActionItems: imAssistantApi.extractActionItems,
  suggestConversationReply: imAssistantApi.suggestReply,
  analyzeConversationSentiment: imAssistantApi.analyzeConversationSentiment,
  getConversationInsights: imAssistantApi.getConversationInsights,
  getAssistantConfig: imAssistantApi.getAssistantConfig,
  updateAssistantConfig: imAssistantApi.updateAssistantConfig,
  getAssistantConversations: imAssistantApi.getAssistantConversations,
  getAssistantTasks: imAssistantApi.getAssistantTasks,

  // ==================== 顶层快捷方法（聊天自动化） ====================

  createAutomationRule: imAutomationApi.createAutomationRule,
  listAutomationRules: imAutomationApi.listAutomationRules,
  getAutomationRule: imAutomationApi.getAutomationRule,
  updateAutomationRule: imAutomationApi.updateAutomationRule,
  deleteAutomationRule: imAutomationApi.deleteAutomationRule,
  toggleRuleStatus: imAutomationApi.toggleRuleStatus,
  testRule: imAutomationApi.testRule,
  triggerWorkflow: imAutomationApi.triggerWorkflow,
  getAutomationHistory: imAutomationApi.getAutomationHistory,
  getAutomationStats: imAutomationApi.getAutomationStats,
  getRuleTemplates: imAutomationApi.getRuleTemplates,
  duplicateRule: imAutomationApi.duplicateRule,

  // ==================== 顶层快捷方法（文档消息增强） ====================

  getDocumentPreview: imDocMessageApi.getDocumentPreview,
  getDocumentPages: imDocMessageApi.getDocumentPages,
  renderDocumentPage: imDocMessageApi.renderDocumentPage,
  searchInDocument: imDocMessageApi.searchInDocument,
  getDocumentOutline: imDocMessageApi.getDocumentOutline,
  getDocumentThumbnails: imDocMessageApi.getDocumentThumbnails,
  listDocumentAnnotations: imDocMessageApi.listDocumentAnnotations,
  addDocumentAnnotation: imDocMessageApi.addDocumentAnnotation,
  resolveDocumentAnnotation: imDocMessageApi.resolveDocumentAnnotation,
  deleteDocumentAnnotation: imDocMessageApi.deleteDocumentAnnotation,
  getDocumentActivity: imDocMessageApi.getDocumentActivity,
  exportDocument: imDocMessageApi.exportDocument,
  printDocument: imDocMessageApi.printDocument,
  signDocument: imDocMessageApi.signDocument,
  shareDocumentLink: imDocMessageApi.shareDocumentLink,
  getDocumentVersion: imDocMessageApi.getDocumentVersion,
  getDocumentPermissions: imDocMessageApi.getDocumentPermissions,
  updateDocumentPermissions: imDocMessageApi.updateDocumentPermissions,
  getDocumentWatermark: imDocMessageApi.getDocumentWatermark,
  setDocumentWatermark: imDocMessageApi.setDocumentWatermark,
  checkDocumentSensitivity: imDocMessageApi.checkDocumentSensitivity,
  getDocumentMetadata: imDocMessageApi.getDocumentMetadata,
  updateDocumentMetadata: imDocMessageApi.updateDocumentMetadata,
  getDocumentReadReceipts: imDocMessageApi.getDocumentReadReceipts,
  getDocumentStats: imDocMessageApi.getDocumentStats,
  listDocumentVersions: imDocMessageApi.listDocumentVersions,

  // ==================== 顶层快捷方法（位置消息） ====================

  sendLocationMessage: imLocationApi.sendLocationMessage,
  getLocationMessage: imLocationApi.getLocationMessage,
  listLocationMessages: imLocationApi.listLocationMessages,
  getStaticMap: imLocationApi.getStaticMap,
  searchPlaces: imLocationApi.searchPlaces,
  getPlaceDetail: imLocationApi.getPlaceDetail,
  getPlaceSuggestions: imLocationApi.getPlaceSuggestions,
  listGeofences: imLocationApi.listGeofences,
  getGeofence: imLocationApi.getGeofence,
  createGeofence: imLocationApi.createGeofence,
  updateGeofence: imLocationApi.updateGeofence,
  deleteGeofence: imLocationApi.deleteGeofence,
  getGeofenceEvents: imLocationApi.getGeofenceEvents,
  shareLocation: imLocationApi.shareLocation,
  getShareLink: imLocationApi.getShareLink,
  revokeShareLink: imLocationApi.revokeShareLink,
  calculateRoute: imLocationApi.calculateRoute,
  getRouteHistory: imLocationApi.getRouteHistory,
  calculateDistance: imLocationApi.calculateDistance,
  getLocationHistory: imLocationApi.getLocationHistory,
  getLocationStats: imLocationApi.getLocationStats,
  getMapConfig: imLocationApi.getMapConfig,
  listGisMaps: imLocationApi.listGisMaps,
  getGisMap: imLocationApi.getGisMap,
  getGisMapLayers: imLocationApi.getGisMapLayers,
  getGisMapOverview: imLocationApi.getGisMapOverview,
  searchGisLocations: imLocationApi.searchGisLocations,
  getGisLocation: imLocationApi.getGisLocation,
  getNearbyGisLocations: imLocationApi.getNearbyGisLocations,
  getDeviceTrack: imLocationApi.getDeviceTrack,
  listDeviceTracks: imLocationApi.listDeviceTracks,
  spatialQuery: imLocationApi.spatialQuery,
  bufferAnalysis: imLocationApi.bufferAnalysis,
  calculateArea: imLocationApi.calculateArea,
  exportLocationData: imLocationApi.exportLocationData,
  searchPoiUnified: imLocationApi.searchPoiUnified,
  createGeofenceWithSync: imLocationApi.createGeofenceWithSync,
  updateGeofenceWithSync: imLocationApi.updateGeofenceWithSync,
  syncGeofenceToGis: imLocationApi.syncGeofenceToGis,
  searchGisPois: imLocationApi.searchGisPois,

  getDashboardSummary: async (): Promise<ApiResponse<unknown>> => {
    return apiClient.im.get('/dashboard/summary');
  },
};

// ==================== 类型导出 ====================

export type {
  GroupRole,
  JoinMode,
  PermissionLevel,
  GroupMember,
  GroupSettings,
  CreateGroupSettingsRequest,
  GroupPermissions,
  UpdatePermissionsRequest,
  GroupEvent,
  InviteLink,
  PinnedMessage,
  CallType,
  CallDirection,
  CallStatus,
  ParticipantRole,
  CallSession,
  CallParticipant,
  InitiateCallRequest,
  AnswerCallRequest,
  ConferenceCallRequest,
  CallRecording,
  CallHistoryRecord,
  CallStats,
  SyncDirection,
  SyncStatus,
  DeviceType,
  SyncDevice,
  RegisterDeviceRequest,
  SyncResult,
  ConflictRecord,
  Conversation,
  UpdateConversationRequest,
  MessageSearchResult,
  ForwardMessageRequest,
  PushPlatform,
  PushStatus,
  MessagePriority,
  PushToken,
  RegisterPushTokenRequest,
  PushDelivery,
  SendPushRequest,
  BroadcastRequest,
  PushTemplate,
  CreatePushTemplateRequest,
  PushPreferences,
  SilentPeriod,
  CreateSilentPeriodRequest,
  PushStats,
  ReactionType,
  MessageReaction,
  ReactionSummary,
  Mention,
  CreateMentionRequest,
  StarredMessage,
  PinMessageRequest,
  DeliveryStatus,
  ReadReceipt,
  DeliveryReceipt,
  TypingUser,
  ReplyMessage,
  EditHistoryEntry,
  MessageDraft,
  ThreadInfo,
  ConnectionStatus as WsConnectionStatus,
  MessageType as WsMessageType,
  AckStatus,
  WebSocketConfig,
  ConnectionState,
  SubscribeRequest,
  UnsubscribeRequest,
  Subscription,
  WsMessage,
  BufferedMessage,
  AckRecord,
  HeartbeatResult,
  ChannelType,
  ChannelVisibility,
  ChannelMemberRole,
  Channel,
  CreateChannelRequest,
  ChannelMember,
  AddChannelMemberRequest,
  ChannelInvite,
  BanRecord,
  ChannelStats,
  DiscoverChannel,
  BotStatus,
  BotTriggerType,
  BotCommandType,
  BotConfig,
  CreateBotRequest,
  BotCommand,
  CreateBotCommandRequest,
  BotEvent,
  CreateBotEventRequest,
  BotSubscription,
  BotLog,
  BotStats,
  WebhookStatus,
  WebhookContentType,
  WebhookConfig,
  CreateWebhookRequest,
  WebhookDelivery,
  WebhookEvent,
  WebhookStats,
  TestWebhookRequest,
  TestWebhookResult,
  NotificationType,
  NotificationPriority,
  NotificationStatus,
  InAppNotification,
  CreateInAppNotificationRequest,
  NotificationPreferences,
  NotificationSettings,
  NotificationStats,
  BridgeType,
  BridgeStatus,
  DirectionType,
  ForwardRuleAction,
  Bridge,
  CreateBridgeRequest,
  ForwardRule,
  CreateForwardRuleRequest,
  BridgeDelivery,
  CrossDomainChannel,
  CreateCrossDomainChannelRequest,
  BridgeTestResult,
  ArchiveStatus,
  ExportFormat,
  ExportStatus,
  ArchiveType,
  Archive,
  CreateArchiveRequest,
  ArchiveSchedule,
  CreateArchiveScheduleRequest,
  MessageExport,
  CreateExportRequest,
  ArchiveStats,
  PresenceStatus,
  ActivityType,
  UserPresence,
  UpdatePresenceRequest,
  BatchPresenceResponse,
  PresenceSettings,
  PresenceSubscription,
  PresenceStats,
  TypingType,
  TypingEvent,
  ReadReceiptDetail,
  TypingSettings,
  ActiveTypingSession,
  SearchScope,
  MessageTypeFilter,
  SortOrder,
  SearchResult,
  AdvancedSearchRequest,
  SearchSuggestion,
  SearchHistory,
  TrendingSearch,
  SavedSearch,
  IndexStatus,
  IndexStats,
  ConferenceStatus,
  ConferenceType,
  ConferenceParticipantRole,
  RecordingFormat,
  Conference,
  CreateConferenceRequest,
  ConferenceParticipant,
  ConferenceRecording,
  ConferenceCaption,
  ConferenceStats,
  ScreenShareStatus,
  ScreenShareType,
  ShareQuality,
  ControlRole,
  ScreenShare,
  ScreenSharePermissions,
  CreateScreenShareRequest,
  ScreenShareViewer,
  ScreenShareAnnotation,
  ScreenShareStats,
  VoiceMessageStatus,
  VoiceCallStatus,
  VoiceCallDirection,
  VoiceCallQuality,
  VoiceMessage,
  CreateVoiceMessageRequest,
  VoiceCall,
  MakeVoiceCallRequest,
  VoiceCallHistoryRecord,
  VoiceStats,
  AiTaskType,
  AiModelType,
  AiTone,
  SentimentType,
  TranslationResult,
  SummarizationResult,
  ReplySuggestionResult,
  GrammarCheckResult,
  SentimentResult,
  RewriteResult,
  AiModel,
  AiConfig,
  AiUsage,
  IntegrationTarget,
  IntegrationStatus,
  IntegrationRecord,
  CreateTicketFromMessageRequest,
  CreateTaskFromMessageRequest,
  IntegrationStats,
  WhiteboardToolType,
  Whiteboard,
  CreateWhiteboardRequest,
  WhiteboardSnapshot,
  WhiteboardStats,
  WhiteboardExportFormat,
  TaskPriority,
  TaskStatus,
  SyncedTask,
  CreateTaskSyncRequest,
  PersonalTodo,
  TaskReminder,
  KanbanBoard,
  TaskSyncStats,
  ScheduledMessageStatus,
  ScheduledMessage,
  CreateScheduledMessageRequest,
  UpdateScheduledMessageRequest,
  ScheduledMessageQuery,
  ScheduledMessageStats,
  AnnouncementType,
  Announcement,
  CreateAnnouncementRequest,
  UpdateAnnouncementRequest,
  AnnouncementQuery,
  PollStatus,
  PollOption,
  Poll,
  CreatePollRequest,
  PollQuery,
  CheckInType,
  CheckIn,
  CreateCheckInRequest,
  CheckInQuery,
  DeviceDeviceType,
  DeviceStatus,
  DevicePlatform,
  DeviceInfo,
  RegisterImDeviceRequest,
  UpdateDeviceRequest,
  DeviceLocation,
  DeviceStats,
  TranslationLanguage,
  TranslationStatus,
  Translation,
  TranslateMessageRequest,
  TranslateTextRequest,
  BatchTranslateRequest,
  TranslationPreferences,
  TranslationStats,
  RichMediaType,
  MediaStatus,
  MediaQuality,
  RichMedia,
  UploadMediaRequest,
  UploadMediaResponse,
  CreateMediaMessageRequest,
  MediaTransformation,
  MediaStats,
  AssistantTaskStatus,
  ConversationSummary,
  ActionItem,
  ReplySuggestion,
  ConversationSentiment,
  ConversationInsights,
  AssistantConfig,
  AssistantTask,
  SummarizeConversationRequest,
  ExtractActionItemsRequest,
  SuggestReplyRequest,
  AnalyzeSentimentRequest,
  UpdateAssistantConfigRequest,
  RuleStatus,
  RuleTriggerType,
  RuleActionType,
  ExecutionStatus,
  AutomationRule,
  CreateAutomationRuleRequest,
  UpdateAutomationRuleRequest,
  ExecutionHistory,
  AutomationStats,
  RuleTemplate,
  DocumentType,
  AnnotationType,
  DocExportFormat,
  DocPermission,
  WatermarkPosition,
  DocumentPreview,
  DocumentPage,
  DocumentSearchResult,
  DocumentOutline,
  DocumentAnnotation,
  DocumentAnnotationReply,
  DocumentVersion,
  DocumentPermissionSet,
  DocumentMetadata,
  DocumentReadReceipt,
  DocumentActivity,
  WatermarkConfig,
  CreateAnnotationRequest,
  ExportDocumentRequest,
  SignDocumentRequest,
  ShareDocumentLinkRequest,
  UpdateDocumentPermissionsRequest,
  DocumentStats,
  LocationType,
  MapProvider,
  GeofenceStatus,
  GeofenceEventType,
  GeoCoordinate,
  LocationMessage,
  PlaceOfInterest,
  Geofence,
  GeofenceEvent,
  StaticMapOptions,
  Route,
  RouteStep,
  LocationHistory,
  LocationShareLink,
  LocationStats,
  SendLocationRequest,
  CreateGeofenceRequest,
  UpdateGeofenceRequest,
  SearchPlaceRequest,
  CalculateRouteRequest,
  GisLayerType,
  SpatialOperation,
  GisMapRef,
  GisLocationRef,
  GisDeviceTrack,
  SpatialQueryResult,
  SpatialQueryRequest,
  UnifiedPoiResult,
  GeofenceSyncResult,
};

export default imApi;
