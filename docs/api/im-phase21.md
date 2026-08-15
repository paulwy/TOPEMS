# IM 模块 Phase 21 技术文档：消息集成、白板协同与任务联动

> **版本**: V1.0  
> **更新日期**: 2026-08-13  
> **所属模块**: IM (Instant Messaging)  
> **子域数量**: 3 个（integration / whiteboard / taskSync）  
> **API 函数总数**: 43 个  
> **文件路径**:  
> - `apps/web/src/api/im/integration.ts`  
> - `apps/web/src/api/im/whiteboard.ts`  
> - `apps/web/src/api/im/taskSync.ts`

---

## 目录

- [1. 概述](#1-概述)
- [2. 消息集成中心 (integration)](#2-消息集成中心-integration)
  - [2.1 核心类型定义](#21-核心类型定义)
  - [2.2 API 接口列表](#22-api-接口列表)
  - [2.3 接口详细说明](#23-接口详细说明)
- [3. 会议白板协同 (whiteboard)](#3-会议白板协同-whiteboard)
  - [3.1 核心类型定义](#31-核心类型定义)
  - [3.2 API 接口列表](#32-api-接口列表)
  - [3.3 接口详细说明](#33-接口详细说明)
- [4. 消息任务联动 (taskSync)](#4-消息任务联动-tasksync)
  - [4.1 核心类型定义](#41-核心类型定义)
  - [4.2 API 接口列表](#42-api-接口列表)
  - [4.3 接口详细说明](#43-接口详细说明)
- [5. 聚合索引与快捷方法](#5-聚合索引与快捷方法)
- [6. 使用示例](#6-使用示例)

---

## 1. 概述

Phase 21 扩展了 IM 模块的 **横向集成能力**，实现了从单纯的通讯工具向「消息-任务-文档」一体化协作平台的跨越。

### 核心能力

| 子域 | 核心能力 | API 数量 |
|------|----------|----------|
| **integration** | 消息 → 工单/任务/日程/审批/Webhook 一键转换 | 9 |
| **whiteboard** | 会议白板 CRUD + 快照 + 协作 + 导出 | 16 |
| **taskSync** | 消息转任务 + 待办 + 提醒 + 看板 | 18 |
| **合计** | | **43** |

### 业务价值

1. **消息即入口**：用户在 IM 对话中可直接将消息转为工单、任务、日程、审批等业务对象
2. **协同白板**：会议中实时白板协作，支持快照回放、多人协同、多格式导出
3. **任务闭环**：消息 → 任务 → 待办 → 提醒 → 看板，形成完整的个人生产力闭环

---

## 2. 消息集成中心 (integration)

### 2.1 核心类型定义

#### IntegrationTarget
```typescript
type IntegrationTarget = 'ticket' | 'task' | 'calendar' | 'approval' | 'webhook';
```

#### IntegrationStatus
```typescript
type IntegrationStatus = 'pending' | 'success' | 'failed' | 'cancelled';
```

#### WebhookTriggerType
```typescript
type WebhookTriggerType = 'message_received' | 'message_mention' | 'reaction_added' | 'file_shared' | 'custom';
```

#### IntegrationRecord
```typescript
interface IntegrationRecord {
  id: string;                              // 集成记录 ID
  source_message_id: string;               // 源消息 ID
  source_chat_id: string;                  // 源会话 ID
  source_sender_id: string;                // 源发送者 ID
  source_sender_name: string;              // 源发送者名称
  target_type: IntegrationTarget;         // 目标类型
  target_id: string;                       // 目标对象 ID
  target_url?: string;                     // 目标对象 URL
  status: IntegrationStatus;              // 集成状态
  action: string;                          // 执行动作
  payload: Record<string, unknown>;       // 请求载荷
  result?: Record<string, unknown>;       // 执行结果
  created_at: string;                      // 创建时间
  completed_at?: string;                   // 完成时间
  error_message?: string;                  // 错误信息
}
```

#### CreateTicketFromMessageRequest
```typescript
interface CreateTicketFromMessageRequest {
  message_id: string;                      // 源消息 ID (必填)
  title?: string;                          // 工单标题 (可选，默认取消息摘要)
  description?: string;                    // 工单描述
  priority?: 'low' | 'medium' | 'high' | 'urgent';  // 优先级
  category?: string;                       // 工单分类
  assignee_id?: string;                    // 负责人 ID
  due_date?: string;                       // 截止日期 (ISO 8601)
  labels?: string[];                       // 标签列表
  attachments?: Array<{                   // 附件列表
    name: string;
    url: string;
    type: string;
  }>;
}
```

#### CreateTaskFromMessageRequest
```typescript
interface CreateTaskFromMessageRequest {
  message_id: string;                      // 源消息 ID (必填)
  title: string;                           // 任务标题 (必填)
  description?: string;                    // 任务描述
  assignee_id?: string;                    // 负责人 ID
  due_date?: string;                       // 截止日期
  priority?: 'low' | 'medium' | 'high';    // 优先级
  project_id?: string;                     // 项目 ID
  parent_task_id?: string;                 // 父任务 ID
  tags?: string[];                         // 标签列表
}
```

#### CreateCalendarEventFromMessageRequest
```typescript
interface CreateCalendarEventFromMessageRequest {
  message_id: string;                      // 源消息 ID (必填)
  title: string;                           // 事件标题 (必填)
  description?: string;                    // 事件描述
  start_time: string;                      // 开始时间 (ISO 8601, 必填)
  end_time?: string;                       // 结束时间
  location?: string;                       // 地点
  attendees?: string[];                    // 参与者 ID 列表
  is_all_day?: boolean;                    // 是否全天事件
  reminder_minutes?: number;               // 提前提醒分钟数
  calendar_id?: string;                    // 日历 ID
}
```

#### CreateApprovalFromMessageRequest
```typescript
interface CreateApprovalFromMessageRequest {
  message_id: string;                      // 源消息 ID (必填)
  approval_type: string;                   // 审批类型 (必填)
  title: string;                           // 审批标题 (必填)
  description?: string;                    // 审批描述
  approver_id: string;                     // 审批人 ID (必填)
  due_date?: string;                       // 截止日期
  priority?: 'normal' | 'urgent';          // 优先级
  attachment_ids?: string[];               // 附件 ID 列表
  form_data?: Record<string, unknown>;      // 表单数据
}
```

#### TriggerWebhookRequest
```typescript
interface TriggerWebhookRequest {
  message_id: string;                      // 源消息 ID (必填)
  trigger_type: WebhookTriggerType;        // 触发类型 (必填)
  webhook_id: string;                      // Webhook ID (必填)
  custom_payload?: Record<string, unknown>; // 自定义载荷
}
```

#### IntegrationHistoryQuery
```typescript
interface IntegrationHistoryQuery {
  target_type?: IntegrationTarget;         // 按目标类型筛选
  status?: IntegrationStatus;              // 按状态筛选
  from_date?: string;                      // 开始日期
  to_date?: string;                        // 结束日期
  user_id?: string;                        // 用户 ID
  page?: number;                           // 页码
  pagesize?: number;                       // 每页数量
}
```

#### IntegrationStats
```typescript
interface IntegrationStats {
  total_integrations_today: number;        // 今日集成总数
  total_integrations_week: number;         // 本周集成总数
  by_target: Record<IntegrationTarget, number>;  // 按目标类型分布
  by_status: Record<IntegrationStatus, number>;  // 按状态分布
  success_rate: number;                    // 成功率 (0-1)
  avg_processing_time_ms: number;          // 平均处理时长 (毫秒)
  top_integrators: Array<{                 // 高频使用者
    user_id: string;
    user_name: string;
    count: number;
  }>;
}
```

### 2.2 API 接口列表

| 函数名 | HTTP 方法 | 路径 | 功能描述 |
|--------|-----------|------|----------|
| `createTicketFromMessage` | POST | `/integrations/ticket` | 消息转工单 |
| `createTaskFromMessage` | POST | `/integrations/task` | 消息转任务 |
| `createCalendarEventFromMessage` | POST | `/integrations/calendar` | 消息转日程 |
| `createApprovalFromMessage` | POST | `/integrations/approval` | 消息转审批 |
| `triggerWebhookFromMessage` | POST | `/integrations/webhooks/trigger` | 触发 Webhook |
| `listIntegrationHistory` | GET | `/integrations/history` | 查询集成历史列表 |
| `getIntegrationRecord` | GET | `/integrations/history/{id}` | 获取单个集成记录 |
| `deleteIntegrationRecord` | DELETE | `/integrations/history/{id}` | 删除集成记录 |
| `getIntegrationStats` | GET | `/integrations/stats` | 获取集成统计 |

### 2.3 接口详细说明

#### 2.3.1 消息转工单

将指定消息转为工单，自动继承消息内容作为工单描述。

```typescript
// 函数签名
createTicketFromMessage(data: CreateTicketFromMessageRequest): Promise<ApiResponse<IntegrationRecord>>

// 调用示例
const result = await imIntegrationApi.createTicketFromMessage({
  message_id: 'msg_12345',
  title: '用户反馈：登录异常',
  priority: 'high',
  assignee_id: 'user_001',
  labels: ['bug', 'urgent']
});
```

**请求参数**:

| 参数 | 类型 | 必填 | 描述 |
|------|------|------|------|
| `message_id` | `string` | ✅ | 源消息 ID |
| `title` | `string` | ❌ | 工单标题，默认取消息前 50 字符 |
| `description` | `string` | ❌ | 工单描述，默认取消息全文 |
| `priority` | `'low'\|'medium'\|'high'\|'urgent'` | ❌ | 优先级，默认 `medium` |
| `category` | `string` | ❌ | 工单分类 |
| `assignee_id` | `string` | ❌ | 负责人 ID |
| `due_date` | `string` | ❌ | 截止日期 (ISO 8601) |
| `labels` | `string[]` | ❌ | 标签列表 |
| `attachments` | `Array<{name,url,type}>` | ❌ | 附件列表 |

**返回值**: `ApiResponse<IntegrationRecord>` - 集成记录，其中 `target_id` 为创建的工单 ID

---

#### 2.3.2 消息转任务

将指定消息转为任务，可设置负责人、优先级、截止日期等。

```typescript
// 函数签名
createTaskFromMessage(data: CreateTaskFromMessageRequest): Promise<ApiResponse<IntegrationRecord>>

// 调用示例
const result = await imIntegrationApi.createTaskFromMessage({
  message_id: 'msg_12345',
  title: '完成季度报告',
  priority: 'high',
  assignee_id: 'user_001',
  due_date: '2026-08-20T18:00:00Z'
});
```

---

#### 2.3.3 消息转日程

将指定消息转为日程事件，可设置时间、地点、参与者等。

```typescript
// 函数签名
createCalendarEventFromMessage(data: CreateCalendarEventFromMessageRequest): Promise<ApiResponse<IntegrationRecord>>

// 调用示例
const result = await imIntegrationApi.createCalendarEventFromMessage({
  message_id: 'msg_12345',
  title: '产品评审会议',
  start_time: '2026-08-15T10:00:00Z',
  end_time: '2026-08-15T11:30:00Z',
  location: '会议室 A',
  attendees: ['user_001', 'user_002']
});
```

---

#### 2.3.4 消息转审批

将指定消息转为审批流程，指定审批类型和审批人。

```typescript
// 函数签名
createApprovalFromMessage(data: CreateApprovalFromMessageRequest): Promise<ApiResponse<IntegrationRecord>>

// 调用示例
const result = await imIntegrationApi.createApprovalFromMessage({
  message_id: 'msg_12345',
  approval_type: 'leave_request',
  title: '请假申请',
  approver_id: 'manager_001',
  priority: 'urgent'
});
```

---

#### 2.3.5 触发 Webhook

根据消息触发指定的 Webhook，实现第三方系统集成。

```typescript
// 函数签名
triggerWebhookFromMessage(data: TriggerWebhookRequest): Promise<ApiResponse<IntegrationRecord>>

// 调用示例
const result = await imIntegrationApi.triggerWebhookFromMessage({
  message_id: 'msg_12345',
  trigger_type: 'message_received',
  webhook_id: 'wh_001',
  custom_payload: { source: 'im_chat' }
});
```

---

#### 2.3.6 查询集成历史

分页查询集成操作历史，支持多条件筛选。

```typescript
// 函数签名
listIntegrationHistory(params?: IntegrationHistoryQuery): Promise<ApiResponse<PaginatedResponse<IntegrationRecord>>>

// 调用示例
const result = await imIntegrationApi.listIntegrationHistory({
  target_type: 'ticket',
  status: 'success',
  from_date: '2026-08-01',
  page: 1,
  pagesize: 20
});
```

---

#### 2.3.7 获取集成统计

获取集成功能的使用统计数据。

```typescript
// 函数签名
getIntegrationStats(): Promise<ApiResponse<IntegrationStats>>

// 调用示例
const stats = await imIntegrationApi.getIntegrationStats();
// 返回示例
// {
//   total_integrations_today: 47,
//   success_rate: 0.98,
//   by_target: { ticket: 12, task: 20, calendar: 8, approval: 5, webhook: 2 },
//   avg_processing_time_ms: 230,
//   top_integrators: [...]
// }
```

---

## 3. 会议白板协同 (whiteboard)

### 3.1 核心类型定义

#### WhiteboardToolType
```typescript
type WhiteboardToolType = 'pen' | 'highlight' | 'rectangle' | 'ellipse' | 'line' | 'arrow' | 'text' | 'sticky_note' | 'eraser' | 'shapes';
```

#### WhiteboardStatus
```typescript
type WhiteboardStatus = 'active' | 'archived' | 'deleted';
```

#### WhiteboardPermission
```typescript
type WhiteboardPermission = 'view' | 'edit' | 'admin' | 'owner';
```

#### ExportFormat
```typescript
type ExportFormat = 'png' | 'pdf' | 'svg' | 'jpeg';
```

#### Whiteboard
```typescript
interface Whiteboard {
  id: string;                               // 白板 ID
  conference_id: string;                    // 关联会议 ID
  conference_title: string;                 // 关联会议标题
  title: string;                            // 白板标题
  description?: string;                     // 白板描述
  status: WhiteboardStatus;                 // 白板状态
  created_by: string;                       // 创建者 ID
  created_by_name: string;                  // 创建者姓名
  created_by_avatar?: string;               // 创建者头像
  width: number;                            // 画布宽度
  height: number;                           // 画布高度
  current_snapshot_id?: string;             // 当前快照 ID
  snapshot_count: number;                   // 快照数量
  collaborator_count: number;               // 协作者数量
  view_count: number;                       // 查看次数
  last_edited_at?: string;                  // 最后编辑时间
  created_at: string;                       // 创建时间
  updated_at: string;                       // 更新时间
}
```

#### CreateWhiteboardRequest
```typescript
interface CreateWhiteboardRequest {
  conference_id: string;                    // 关联会议 ID (必填)
  title: string;                            // 白板标题 (必填)
  description?: string;                     // 白板描述
  width?: number;                           // 画布宽度，默认 1920
  height?: number;                          // 画布高度，默认 1080
  collaborator_ids?: string[];              // 初始协作者 ID 列表
  is_private?: boolean;                     // 是否私有
}
```

#### WhiteboardSnapshot
```typescript
interface WhiteboardSnapshot {
  id: string;                               // 快照 ID
  whiteboard_id: string;                    // 白板 ID
  whiteboard_title: string;                 // 白板标题
  name: string;                             // 快照名称
  description?: string;                     // 快照描述
  created_by: string;                       // 创建者 ID
  created_by_name: string;                  // 创建者姓名
  tool_used_count: number;                  // 使用工具次数
  object_count: number;                     // 对象数量
  file_size_bytes: number;                  // 文件大小 (字节)
  thumbnail_url?: string;                   // 缩略图 URL
  created_at: string;                       // 创建时间
}
```

#### WhiteboardCollaborator
```typescript
interface WhiteboardCollaborator {
  user_id: string;                          // 用户 ID
  user_name: string;                        // 用户姓名
  user_avatar?: string;                     // 用户头像
  permission: WhiteboardPermission;         // 权限级别
  is_active: boolean;                       // 是否活跃
  cursor_position?: { x: number; y: number }; // 光标位置
  last_active_at?: string;                  // 最后活跃时间
  joined_at: string;                        // 加入时间
}
```

#### ExportWhiteboardRequest
```typescript
interface ExportWhiteboardRequest {
  format: ExportFormat;                     // 导出格式 (必填)
  width?: number;                           // 导出宽度
  height?: number;                          // 导出高度
  include_grid?: boolean;                   // 是否包含网格
  include_background?: boolean;             // 是否包含背景
  scale?: number;                           // 缩放比例
}
```

#### WhiteboardStats
```typescript
interface WhiteboardStats {
  total_whiteboards_today: number;          // 今日新建白板数
  total_whiteboards_active: number;         // 活跃白板数
  total_snapshots_today: number;            // 今日快照数
  total_collaborations_today: number;       // 今日协作次数
  by_tool_type: Record<WhiteboardToolType, number>;  // 按工具类型统计
  avg_session_duration_minutes: number;     // 平均会话时长 (分钟)
}
```

### 3.2 API 接口列表

| 分类 | 函数名 | HTTP 方法 | 路径 | 功能描述 |
|------|--------|-----------|------|----------|
| **白板 CRUD** | `listWhiteboards` | GET | `/whiteboards` | 查询白板列表 |
| | `createWhiteboard` | POST | `/whiteboards` | 创建白板 |
| | `getWhiteboard` | GET | `/whiteboards/{id}` | 获取白板详情 |
| | `updateWhiteboard` | PUT | `/whiteboards/{id}` | 更新白板信息 |
| | `deleteWhiteboard` | DELETE | `/whiteboards/{id}` | 删除白板 |
| **快照管理** | `createSnapshot` | POST | `/whiteboards/{id}/snapshot` | 创建快照 |
| | `listWhiteboardSnapshots` | GET | `/whiteboards/{id}/snapshots` | 查询快照列表 |
| | `getWhiteboardSnapshot` | GET | `/whiteboards/{id}/snapshots/{sid}` | 获取快照详情 |
| | `restoreWhiteboardSnapshot` | POST | `/whiteboards/{id}/snapshots/{sid}/restore` | 恢复快照 |
| **协作共享** | `listWhiteboardCollaborators` | GET | `/whiteboards/{id}/collaborators` | 查询协作者列表 |
| | `shareWhiteboard` | POST | `/whiteboards/{id}/share` | 分享白板 |
| | `removeWhiteboardCollaborator` | DELETE | `/whiteboards/{id}/collaborators/{uid}` | 移除协作者 |
| **导出统计** | `exportWhiteboard` | POST | `/whiteboards/{id}/export` | 导出白板 |
| | `getWhiteboardStats` | GET | `/whiteboards/stats` | 获取统计数据 |

### 3.3 接口详细说明

#### 3.3.1 创建白板

为指定会议创建一块白板，可设置初始协作者。

```typescript
// 函数签名
createWhiteboard(data: CreateWhiteboardRequest): Promise<ApiResponse<Whiteboard>>

// 调用示例
const whiteboard = await imWhiteboardApi.createWhiteboard({
  conference_id: 'conf_456',
  title: '产品架构讨论',
  collaborator_ids: ['user_001', 'user_002'],
  width: 1920,
  height: 1080
});
```

**请求参数**:

| 参数 | 类型 | 必填 | 描述 |
|------|------|------|------|
| `conference_id` | `string` | ✅ | 关联会议 ID |
| `title` | `string` | ✅ | 白板标题 |
| `description` | `string` | ❌ | 白板描述 |
| `width` | `number` | ❌ | 画布宽度 |
| `height` | `number` | ❌ | 画布高度 |
| `collaborator_ids` | `string[]` | ❌ | 初始协作者 ID 列表 |
| `is_private` | `boolean` | ❌ | 是否私有，默认 `false` |

---

#### 3.3.2 创建快照

为当前白板状态创建一个快照，支持快照回放和恢复。

```typescript
// 函数签名
createSnapshot(whiteboardId: string, data?: CreateSnapshotRequest): Promise<ApiResponse<WhiteboardSnapshot>>

// 调用示例
const snapshot = await imWhiteboardApi.createSnapshot('wb_789', {
  name: '方案初稿',
  description: '第一版架构方案',
  auto_save: false
});
```

---

#### 3.3.3 恢复快照

将白板恢复到指定快照的状态。

```typescript
// 函数签名
restoreWhiteboardSnapshot(whiteboardId: string, snapshotId: string): Promise<ApiResponse<Whiteboard>>

// 调用示例
const whiteboard = await imWhiteboardApi.restoreWhiteboardSnapshot('wb_789', 'snap_001');
```

---

#### 3.3.4 分享白板

将白板分享给指定用户，可设置权限级别。

```typescript
// 函数签名
shareWhiteboard(whiteboardId: string, data: ShareWhiteboardRequest): Promise<ApiResponse<WhiteboardCollaborator[]>>

// 调用示例
const collaborators = await imWhiteboardApi.shareWhiteboard('wb_789', {
  user_ids: ['user_003', 'user_004'],
  permission: 'edit',
  message: '请查看白板并反馈',
  send_notification: true
});
```

**ShareWhiteboardRequest 参数**:

| 参数 | 类型 | 必填 | 描述 |
|------|------|------|------|
| `user_ids` | `string[]` | ✅ | 分享目标用户 ID 列表 |
| `permission` | `WhiteboardPermission` | ✅ | 权限级别 (`view` / `edit` / `admin`) |
| `message` | `string` | ❌ | 附带消息 |
| `send_notification` | `boolean` | ❌ | 是否发送通知，默认 `true` |

---

#### 3.3.5 导出白板

将白板导出为指定格式的文件。

```typescript
// 函数签名
exportWhiteboard(whiteboardId: string, data: ExportWhiteboardRequest): Promise<ApiResponse<{url, file_size_bytes, format}>>

// 调用示例
const result = await imWhiteboardApi.exportWhiteboard('wb_789', {
  format: 'pdf',
  include_grid: false,
  include_background: true,
  scale: 2
});
// result: { url: 'https://...', file_size_bytes: 245760, format: 'pdf' }
```

---

## 4. 消息任务联动 (taskSync)

### 4.1 核心类型定义

#### TaskPriority
```typescript
type TaskPriority = 'low' | 'medium' | 'high' | 'urgent';
```

#### TaskStatus
```typescript
type TaskStatus = 'todo' | 'in_progress' | 'review' | 'done' | 'cancelled' | 'blocked';
```

#### TodoStatus
```typescript
type TodoStatus = 'pending' | 'completed';
```

#### ReminderType
```typescript
type ReminderType = 'once' | 'daily' | 'weekly' | 'custom_interval';
```

#### SyncedTask
```typescript
interface SyncedTask {
  id: string;                               // 任务 ID
  source_message_id: string;                // 源消息 ID
  source_chat_id: string;                    // 源会话 ID
  source_sender_id: string;                 // 源发送者 ID
  title: string;                            // 任务标题
  description?: string;                     // 任务描述
  status: TaskStatus;                       // 任务状态
  priority: TaskPriority;                   // 优先级
  assignee_id?: string;                     // 负责人 ID
  assignee_name?: string;                   // 负责人姓名
  project_id?: string;                      // 项目 ID
  project_name?: string;                    // 项目名称
  due_date?: string;                        // 截止日期
  completed_at?: string;                    // 完成时间
  progress_percentage: number;              // 完成百分比 (0-100)
  tags: string[];                           // 标签列表
  subtasks: Array<{                         // 子任务列表
    id: string;
    title: string;
    completed: boolean;
  }>;
  comments_count: number;                   // 评论数量
  attachments_count: number;                // 附件数量
  created_at: string;                       // 创建时间
  updated_at: string;                       // 更新时间
}
```

#### CreateTaskFromMessageRequest (taskSync)
```typescript
interface CreateTaskFromMessageRequest {
  message_id: string;                       // 源消息 ID (必填)
  title: string;                            // 任务标题 (必填)
  description?: string;                     // 任务描述
  priority?: TaskPriority;                  // 优先级
  assignee_id?: string;                     // 负责人 ID
  project_id?: string;                      // 项目 ID
  due_date?: string;                        // 截止日期
  tags?: string[];                          // 标签列表
  subtasks?: Array<{ title: string }>;     // 子任务列表
}
```

#### PersonalTodo
```typescript
interface PersonalTodo {
  id: string;                               // 待办 ID
  title: string;                            // 待办标题
  description?: string;                     // 待办描述
  status: TodoStatus;                       // 状态
  priority: TaskPriority;                   // 优先级
  due_date?: string;                        // 截止日期
  message_id?: string;                      // 关联消息 ID
  message_chat_id?: string;                  // 关联会话 ID
  reminder_id?: string;                     // 关联提醒 ID
  tags: string[];                           // 标签列表
  created_at: string;                       // 创建时间
  completed_at?: string;                    // 完成时间
}
```

#### TaskReminder
```typescript
interface TaskReminder {
  id: string;                               // 提醒 ID
  message_id: string;                       // 关联消息 ID
  chat_id: string;                          // 关联会话 ID
  reminder_type: ReminderType;              // 提醒类型
  reminder_time?: string;                   // 提醒时间 (ISO 8601)
  interval_minutes?: number;                // 自定义间隔 (分钟)
  is_enabled: boolean;                      // 是否启用
  is_triggered: boolean;                    // 是否已触发
  last_triggered_at?: string;               // 上次触发时间
  next_trigger_at?: string;                 // 下次触发时间
  created_at: string;                       // 创建时间
}
```

#### KanbanBoard
```typescript
interface KanbanBoard {
  id: string;                               // 看板 ID
  name: string;                             // 看板名称
  description?: string;                     // 看板描述
  is_default: boolean;                      // 是否默认看板
  columns: Array<{                          // 列定义
    id: string;
    name: string;
    status_filter: TaskStatus;
    task_count: number;
    color: string;
  }>;
  task_count: number;                       // 任务总数
  created_at: string;                       // 创建时间
  updated_at: string;                       // 更新时间
}
```

#### TaskSyncStats
```typescript
interface TaskSyncStats {
  total_tasks_today: number;               // 今日任务创建数
  total_tasks_completed_today: number;      // 今日完成任务数
  completion_rate_today: number;            // 今日完成率
  total_todos_today: number;                // 今日待办创建数
  total_todos_completed_today: number;      // 今日完成待办数
  active_reminders: number;                 // 活跃提醒数
  overdue_tasks: number;                    // 逾期任务数
  by_priority: Record<TaskPriority, number>;  // 按优先级分布
  by_status: Record<TaskStatus, number>;    // 按状态分布
  productive_hour: number;                  // 最高效时段 (小时)
}
```

### 4.2 API 接口列表

| 分类 | 函数名 | HTTP 方法 | 路径 | 功能描述 |
|------|--------|-----------|------|----------|
| **消息转任务** | `createTaskFromMessage` | POST | `/task-sync/tasks/from-message` | 消息转单个任务 |
| | `batchCreateTasksFromMessages` | POST | `/task-sync/tasks/batch` | 批量消息转任务 |
| **任务管理** | `listSyncedTasks` | GET | `/task-sync/tasks` | 查询任务列表 |
| | `getSyncedTask` | GET | `/task-sync/tasks/{id}` | 获取任务详情 |
| | `updateSyncedTask` | PUT | `/task-sync/tasks/{id}` | 更新任务 |
| | `deleteSyncedTask` | DELETE | `/task-sync/tasks/{id}` | 删除任务 |
| **个人待办** | `listMyTodos` | GET | `/task-sync/todos` | 查询我的待办 |
| | `createMyTodo` | POST | `/task-sync/todos` | 创建待办 |
| | `toggleTodoComplete` | PUT | `/task-sync/todos/{id}/toggle` | 切换完成状态 |
| | `deleteMyTodo` | DELETE | `/task-sync/todos/{id}` | 删除待办 |
| **消息提醒** | `listTaskReminders` | GET | `/task-sync/reminders` | 查询提醒列表 |
| | `createTaskReminder` | POST | `/task-sync/reminders` | 创建提醒 |
| | `updateTaskReminder` | PUT | `/task-sync/reminders/{id}` | 更新提醒 |
| | `deleteTaskReminder` | DELETE | `/task-sync/reminders/{id}` | 删除提醒 |
| **看板统计** | `listKanbanBoards` | GET | `/task-sync/boards` | 查询看板列表 |
| | `createKanbanBoard` | POST | `/task-sync/boards` | 创建看板 |
| | `getKanbanBoard` | GET | `/task-sync/boards/{id}` | 获取看板详情 |
| | `getTaskSyncStats` | GET | `/task-sync/stats` | 获取任务统计 |

### 4.3 接口详细说明

#### 4.3.1 消息转任务

从消息创建一个任务，支持设置子任务。

```typescript
// 函数签名
createTaskFromMessage(data: CreateTaskFromMessageRequest): Promise<ApiResponse<SyncedTask>>

// 调用示例
const task = await imTaskSyncApi.createTaskFromMessage({
  message_id: 'msg_12345',
  title: '准备周会材料',
  priority: 'high',
  assignee_id: 'user_001',
  due_date: '2026-08-15T18:00:00Z',
  tags: ['meeting', 'weekly'],
  subtasks: [
    { title: '收集上周数据' },
    { title: '整理关键指标' },
    { title: '制作演示文稿' }
  ]
});
```

---

#### 4.3.2 批量创建任务

从多条消息批量创建任务。

```typescript
// 函数签名
batchCreateTasksFromMessages(data: BatchCreateTasksRequest): Promise<ApiResponse<SyncedTask[]>>

// 调用示例
const tasks = await imTaskSyncApi.batchCreateTasksFromMessages({
  tasks: [
    { message_id: 'msg_001', title: '修复登录 Bug', priority: 'urgent' },
    { message_id: 'msg_002', title: '更新文档', priority: 'low' },
    { message_id: 'msg_003', title: '代码审查', priority: 'medium' }
  ]
});
```

---

#### 4.3.3 查询任务列表

分页查询与当前用户关联的任务列表，支持多条件筛选。

```typescript
// 函数签名
listSyncedTasks(params?: {...}): Promise<ApiResponse<PaginatedResponse<SyncedTask>>>

// 调用示例
const result = await imTaskSyncApi.listSyncedTasks({
  status: 'in_progress',
  priority: 'high',
  overdue: true,
  page: 1,
  pagesize: 20
});
```

**查询参数**:

| 参数 | 类型 | 描述 |
|------|------|------|
| `status` | `TaskStatus` | 按状态筛选 |
| `priority` | `TaskPriority` | 按优先级筛选 |
| `project_id` | `string` | 按项目筛选 |
| `assignee_id` | `string` | 按负责人筛选 |
| `overdue` | `boolean` | 仅显示逾期任务 |
| `from_date` | `string` | 开始日期筛选 |
| `to_date` | `string` | 结束日期筛选 |
| `page` | `number` | 页码 |
| `pagesize` | `number` | 每页数量 |

---

#### 4.3.4 切换待办完成状态

一键切换待办的完成状态（待办 ↔ 已完成）。

```typescript
// 函数签名
toggleTodoComplete(id: string): Promise<ApiResponse<PersonalTodo>>

// 调用示例
const todo = await imTaskSyncApi.toggleTodoComplete('todo_001');
// 如果原来是 pending，现在变为 completed；反之亦然
```

---

#### 4.3.5 创建消息提醒

为消息创建定时/重复提醒。

```typescript
// 函数签名
createTaskReminder(data: CreateTaskReminderRequest): Promise<ApiResponse<TaskReminder>>

// 调用示例
const reminder = await imTaskSyncApi.createTaskReminder({
  message_id: 'msg_12345',
  chat_id: 'chat_001',
  reminder_type: 'once',
  reminder_time: '2026-08-15T14:00:00Z',
  is_enabled: true
});

// 每日提醒
const dailyReminder = await imTaskSyncApi.createTaskReminder({
  message_id: 'msg_12345',
  chat_id: 'chat_001',
  reminder_type: 'daily',
  reminder_time: '09:00:00',  // 每天早上 9 点
  is_enabled: true
});

// 自定义间隔提醒（每 30 分钟）
const intervalReminder = await imTaskSyncApi.createTaskReminder({
  message_id: 'msg_12345',
  chat_id: 'chat_001',
  reminder_type: 'custom_interval',
  interval_minutes: 30,
  is_enabled: true
});
```

---

#### 4.3.6 创建看板

创建一个新的任务看板，用于可视化管理任务状态。

```typescript
// 函数签名
createKanbanBoard(data: {name: string; description?: string}): Promise<ApiResponse<KanbanBoard>>

// 调用示例
const board = await imTaskSyncApi.createKanbanBoard({
  name: 'Q3 产品规划',
  description: '第三季度产品路线图看板'
});
```

---

## 5. 聚合索引与快捷方法

所有子模块在 `im/index.ts` 中聚合，并提供顶层快捷方法。

### 5.1 子域访问

```typescript
// 方式一：通过子域对象访问
imApi.integration.createTicketFromMessage(data);
imApi.whiteboard.createWhiteboard(data);
imApi.taskSync.createTaskFromMessage(data);

// 方式二：通过顶层快捷方法访问
imApi.createTicketFromMessage(data);
imApi.createWhiteboard(data);
imApi.createSyncedTask(data);
```

### 5.2 Phase 21 新增快捷方法

#### Integration 相关

| 快捷方法 | 对应函数 |
|----------|----------|
| `createTicketFromMessage` | `imIntegrationApi.createTicketFromMessage` |
| `createTaskFromMessage` | `imIntegrationApi.createTaskFromMessage` |
| `createCalendarEventFromMessage` | `imIntegrationApi.createCalendarEventFromMessage` |
| `createApprovalFromMessage` | `imIntegrationApi.createApprovalFromMessage` |
| `triggerWebhookFromMessage` | `imIntegrationApi.triggerWebhookFromMessage` |
| `listIntegrationHistory` | `imIntegrationApi.listIntegrationHistory` |
| `getIntegrationRecord` | `imIntegrationApi.getIntegrationRecord` |
| `deleteIntegrationRecord` | `imIntegrationApi.deleteIntegrationRecord` |
| `getIntegrationStats` | `imIntegrationApi.getIntegrationStats` |

#### Whiteboard 相关

| 快捷方法 | 对应函数 |
|----------|----------|
| `listWhiteboards` | `imWhiteboardApi.listWhiteboards` |
| `createWhiteboard` | `imWhiteboardApi.createWhiteboard` |
| `getWhiteboard` | `imWhiteboardApi.getWhiteboard` |
| `updateWhiteboard` | `imWhiteboardApi.updateWhiteboard` |
| `deleteWhiteboard` | `imWhiteboardApi.deleteWhiteboard` |
| `createSnapshot` | `imWhiteboardApi.createSnapshot` |
| `listWhiteboardSnapshots` | `imWhiteboardApi.listWhiteboardSnapshots` |
| `getWhiteboardSnapshot` | `imWhiteboardApi.getWhiteboardSnapshot` |
| `restoreWhiteboardSnapshot` | `imWhiteboardApi.restoreWhiteboardSnapshot` |
| `listWhiteboardCollaborators` | `imWhiteboardApi.listWhiteboardCollaborators` |
| `shareWhiteboard` | `imWhiteboardApi.shareWhiteboard` |
| `exportWhiteboard` | `imWhiteboardApi.exportWhiteboard` |
| `getWhiteboardStats` | `imWhiteboardApi.getWhiteboardStats` |

#### TaskSync 相关

| 快捷方法 | 对应函数 |
|----------|----------|
| `createSyncedTask` | `imTaskSyncApi.createTaskFromMessage` |
| `batchCreateSyncedTasks` | `imTaskSyncApi.batchCreateTasksFromMessages` |
| `listSyncedTasks` | `imTaskSyncApi.listSyncedTasks` |
| `getSyncedTask` | `imTaskSyncApi.getSyncedTask` |
| `updateSyncedTask` | `imTaskSyncApi.updateSyncedTask` |
| `deleteSyncedTask` | `imTaskSyncApi.deleteSyncedTask` |
| `listMyTodos` | `imTaskSyncApi.listMyTodos` |
| `createMyTodo` | `imTaskSyncApi.createMyTodo` |
| `toggleTodoComplete` | `imTaskSyncApi.toggleTodoComplete` |
| `deleteMyTodo` | `imTaskSyncApi.deleteMyTodo` |
| `listTaskReminders` | `imTaskSyncApi.listTaskReminders` |
| `createTaskReminder` | `imTaskSyncApi.createTaskReminder` |
| `updateTaskReminder` | `imTaskSyncApi.updateTaskReminder` |
| `deleteTaskReminder` | `imTaskSyncApi.deleteTaskReminder` |
| `listKanbanBoards` | `imTaskSyncApi.listKanbanBoards` |
| `createKanbanBoard` | `imTaskSyncApi.createKanbanBoard` |
| `getKanbanBoard` | `imTaskSyncApi.getKanbanBoard` |
| `getTaskSyncStats` | `imTaskSyncApi.getTaskSyncStats` |

### 5.3 新增类型导出

#### Integration 类型

```typescript
import type {
  IntegrationTarget,
  IntegrationStatus,
  IntegrationRecord,
  CreateTicketFromMessageRequest,
  CreateTaskFromMessageRequest,
  IntegrationStats,
  WebhookTriggerType,
  CreateCalendarEventFromMessageRequest,
  CreateApprovalFromMessageRequest,
  TriggerWebhookRequest,
  IntegrationHistoryQuery
} from '@/api/im';
```

#### Whiteboard 类型

```typescript
import type {
  WhiteboardToolType,
  Whiteboard,
  CreateWhiteboardRequest,
  WhiteboardSnapshot,
  WhiteboardStats,
  WhiteboardStatus,
  WhiteboardPermission,
  WhiteboardCollaborator,
  WhiteboardExportFormat  // 注意：已重命名以避免冲突
} from '@/api/im';
```

#### TaskSync 类型

```typescript
import type {
  TaskPriority,
  TaskStatus,
  SyncedTask,
  CreateTaskSyncRequest,  // 注意：已重命名以避免冲突
  PersonalTodo,
  TaskReminder,
  KanbanBoard,
  TaskSyncStats,
  TodoStatus,
  ReminderType,
  BatchCreateTasksRequest,
  CreatePersonalTodoRequest,
  CreateTaskReminderRequest
} from '@/api/im';
```

---

## 6. 使用示例

### 6.1 完整集成流程示例

```typescript
import { imApi } from '@/api/im';

/**
 * 场景：用户在 IM 对话中收到一条问题描述消息，
 *       希望将其转为工单，并创建一个跟进任务，
 *       同时设置一个明天早上的提醒。
 */

async function handleUserFeedback(messageId: string, chatId: string) {
  // Step 1: 创建工单
  const ticketResult = await imApi.createTicketFromMessage({
    message_id: messageId,
    title: '用户反馈问题处理',
    priority: 'high',
    assignee_id: 'support_lead',
    labels: ['feedback', 'customer']
  });
  
  if (ticketResult.data?.status === 'success') {
    console.log(`工单已创建: ${ticketResult.data.target_id}`);
  }
  
  // Step 2: 创建跟进任务
  const taskResult = await imApi.createSyncedTask({
    message_id: messageId,
    title: '跟进工单处理进度',
    priority: 'medium',
    assignee_id: 'support_agent',
    due_date: getTomorrowDate(9, 0),
    tags: ['follow-up']
  });
  
  if (taskResult.data?.id) {
    // Step 3: 设置任务提醒
    await imApi.createTaskReminder({
      message_id: messageId,
      chat_id: chatId,
      reminder_type: 'once',
      reminder_time: getTomorrowDate(9, 0),
      is_enabled: true
    });
  }
  
  // Step 4: 查看集成统计
  const stats = await imApi.getIntegrationStats();
  console.log(`今日集成成功率: ${(stats.data?.success_rate * 100).toFixed(1)}%`);
}

function getTomorrowDate(hour: number, minute: number): string {
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  tomorrow.setHours(hour, minute, 0, 0);
  return tomorrow.toISOString();
}
```

### 6.2 白板协作示例

```typescript
import { imApi } from '@/api/im';

/**
 * 场景：在产品评审会议中，创建白板进行架构讨论，
 *       分享给团队成员，会议结束后导出为 PDF 存档。
 */

async function productReviewWorkflow(conferenceId: string) {
  // Step 1: 创建白板
  const whiteboard = await imApi.createWhiteboard({
    conference_id: conferenceId,
    title: '2026 Q4 架构评审',
    collaborator_ids: ['architect_01', 'tech_lead_02']
  });
  
  const whiteboardId = whiteboard.data?.id;
  if (!whiteboardId) return;
  
  // Step 2: 分享给更多参与者
  await imApi.shareWhiteboard(whiteboardId, {
    user_ids: ['developer_01', 'developer_02', 'pm_01'],
    permission: 'edit',
    message: '请在白板上补充你的设计想法',
    send_notification: true
  });
  
  // Step 3: 会议进行中...
  // 参与者通过 WebSocket 实时协作
  
  // Step 4: 会议中创建阶段性快照
  await imApi.createSnapshot(whiteboardId, {
    name: '方案草稿 v1',
    description: '第一轮讨论后的方案',
    auto_save: false
  });
  
  // Step 5: 会议结束后导出
  const exportResult = await imApi.exportWhiteboard(whiteboardId, {
    format: 'pdf',
    include_grid: true,
    include_background: true,
    scale: 2
  });
  
  console.log(`白板已导出: ${exportResult.data?.url}`);
  
  // Step 6: 查询协作者活动
  const collaborators = await imApi.listWhiteboardCollaborators(whiteboardId, {
    is_active: false  // 查看所有参与者（包括已离线）
  });
  
  console.log(`本次会议共 ${collaborators.data?.length} 位参与者`);
}
```

### 6.3 个人生产力管理示例

```typescript
import { imApi } from '@/api/im';

/**
 * 场景：员工每天上班后，从 IM 消息中快速整理待办事项，
 *       并通过看板统一管理工作进度。
 */

async function dailyProductivityRoutine() {
  // Step 1: 获取今日任务统计
  const stats = await imApi.getTaskSyncStats();
  console.log(`今日已创建 ${stats.data?.total_tasks_today} 个任务`);
  console.log(`今日完成率: ${(stats.data?.completion_rate_today * 100).toFixed(0)}%`);
  
  // Step 2: 列出我的待办
  const myTodos = await imApi.listMyTodos({
    status: 'pending',
    priority: 'high'
  });
  
  // Step 3: 完成一个待办
  if (myTodos.data?.items?.length) {
    await imApi.toggleTodoComplete(myTodos.data.items[0].id);
  }
  
  // Step 4: 查看看板
  const boards = await imApi.listKanbanBoards();
  const mainBoard = boards.data?.find(b => b.is_default);
  
  if (mainBoard) {
    const boardDetail = await imApi.getKanbanBoard(mainBoard.id);
    console.log(`默认看板 "${mainBoard.name}" 共有 ${boardDetail.data?.task_count} 个任务`);
  }
  
  // Step 5: 检查逾期任务
  const overdueTasks = await imApi.listSyncedTasks({
    overdue: true,
    page: 1,
    pagesize: 10
  });
  
  if (overdueTasks.data?.items?.length) {
    console.warn(`⚠️ 你有 ${overdueTasks.data.items.length} 个逾期任务需要处理！`);
  }
  
  // Step 6: 检查即将触发的提醒
  const upcomingReminders = await imApi.listTaskReminders({
    is_enabled: true,
    is_triggered: false
  });
  
  console.log(`你有 ${upcomingReminders.data?.total} 个待触发的提醒`);
}
```

---

## 附录：错误码说明

| HTTP 状态码 | 描述 | 常见原因 |
|------------|------|----------|
| 400 | Bad Request | 请求参数缺失或格式错误 |
| 401 | Unauthorized | 未登录或 Token 已过期 |
| 403 | Forbidden | 权限不足，如无权编辑他人的白板 |
| 404 | Not Found | 资源不存在，如 ID 对应的任务/白板已被删除 |
| 409 | Conflict | 冲突，如重复创建同一消息的集成记录 |
| 422 | Unprocessable Entity | 业务规则校验失败，如工单分类不存在 |
| 500 | Internal Server Error | 服务器内部错误 |

---

## 版本历史

| 版本 | 日期 | 变更说明 |
|------|------|----------|
| V1.0 | 2026-08-13 | 初始版本，包含 integration / whiteboard / taskSync 三个子模块共 43 个 API 函数 |

---

## 相关文档

- [IM 模块总览](./README.md)
- IM Phase 19 文档 (会议通话增强与屏幕共享)（已归档）
- IM Phase 20 文档 (语音通话与 AI 智能助手)（已归档）
- [API 接口规范](../development/backend/api-design.md)
