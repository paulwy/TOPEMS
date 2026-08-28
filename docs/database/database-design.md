# TOPEMS 数据库设计文档

## 概述

本文档是 TOPEMS 系统的数据库设计文档，包含数据库架构、表结构设计、索引设计、关系图、数据字典等内容，供开发人员和数据库管理员参考。

## 1. 数据库架构

### 1.1 数据库选型

| 项目 | 说明 |
|------|------|
| 数据库类型 | 关系型数据库 |
| 支持数据库 | MySQL 8.0+ / PostgreSQL 14+ |
| 默认数据库 | MySQL 8.0 |
| 字符集 | utf8mb4 / UTF-8 |
| 排序规则 | utf8mb4_unicode_ci |
| 存储引擎 | InnoDB |
| 连接池 | SQLx 连接池，默认 10 连接 |

### 1.2 命名规范

| 对象类型 | 命名规范 | 示例 |
|---------|---------|------|
| 数据库名 | 小写蛇形命名 | `topems` |
| 表名 | 小写蛇形命名，复数形式 | `users`, `orders` |
| 字段名 | 小写蛇形命名 | `user_id`, `created_at` |
| 索引名 | `idx_表名_字段名` | `idx_users_email` |
| 唯一索引名 | `uk_表名_字段名` | `uk_users_username` |
| 外键名 | `fk_表名_关联表名` | `fk_orders_users` |
| 主键 | `id` | `id` |
| 时间字段 | `created_at`, `updated_at`, `deleted_at` | - |

### 1.3 通用字段设计

所有业务表都包含以下通用字段：

| 字段名 | 类型 | 说明 | 默认值 |
|--------|------|------|--------|
| `id` | VARCHAR(36) | 主键，UUID | - |
| `created_at` | DATETIME | 创建时间 | CURRENT_TIMESTAMP |
| `updated_at` | DATETIME | 更新时间 | CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP |
| `deleted_at` | DATETIME | 删除时间（软删除） | NULL |
| `created_by` | VARCHAR(36) | 创建人 ID | NULL |
| `updated_by` | VARCHAR(36) | 更新人 ID | NULL |
| `version` | INT | 乐观锁版本号 | 0 |

## 2. 核心表结构

### 2.1 用户表（users）

| 字段名 | 类型 | 长度 | 允许空 | 默认值 | 说明 |
|--------|------|------|--------|--------|------|
| `id` | VARCHAR | 36 | 否 | - | 主键，UUID |
| `username` | VARCHAR | 50 | 否 | - | 用户名，唯一 |
| `email` | VARCHAR | 100 | 否 | - | 邮箱，唯一 |
| `phone` | VARCHAR | 20 | 是 | NULL | 手机号 |
| `password_hash` | VARCHAR | 255 | 否 | - | 密码哈希（bcrypt） |
| `full_name` | VARCHAR | 100 | 是 | NULL | 真实姓名 |
| `avatar` | VARCHAR | 500 | 是 | NULL | 头像 URL |
| `status` | ENUM | - | 否 | `active` | 状态：active/inactive/locked |
| `department_id` | VARCHAR | 36 | 是 | NULL | 部门 ID |
| `last_login_at` | DATETIME | - | 是 | NULL | 最后登录时间 |
| `last_login_ip` | VARCHAR | 45 | 是 | NULL | 最后登录 IP |
| `password_changed_at` | DATETIME | - | 是 | NULL | 密码修改时间 |
| `mfa_enabled` | TINYINT | 1 | 否 | 0 | 是否启用 MFA |
| `mfa_secret` | VARCHAR | 255 | 是 | NULL | MFA 密钥 |
| `created_at` | DATETIME | - | 否 | CURRENT_TIMESTAMP | 创建时间 |
| `updated_at` | DATETIME | - | 否 | CURRENT_TIMESTAMP | 更新时间 |
| `deleted_at` | DATETIME | - | 是 | NULL | 删除时间 |

**索引：**
- `uk_users_username` (username)
- `uk_users_email` (email)
- `idx_users_phone` (phone)
- `idx_users_status` (status)
- `idx_users_department_id` (department_id)
- `idx_users_created_at` (created_at)

### 2.2 角色表（roles）

| 字段名 | 类型 | 长度 | 允许空 | 默认值 | 说明 |
|--------|------|------|--------|--------|------|
| `id` | VARCHAR | 36 | 否 | - | 主键，UUID |
| `name` | VARCHAR | 50 | 否 | - | 角色名称 |
| `code` | VARCHAR | 50 | 否 | - | 角色编码，唯一 |
| `description` | VARCHAR | 500 | 是 | NULL | 角色描述 |
| `parent_id` | VARCHAR | 36 | 是 | NULL | 父角色 ID（支持继承） |
| `sort_order` | INT | - | 否 | 0 | 排序 |
| `status` | ENUM | - | 否 | `active` | 状态：active/inactive |
| `created_at` | DATETIME | - | 否 | CURRENT_TIMESTAMP | 创建时间 |
| `updated_at` | DATETIME | - | 否 | CURRENT_TIMESTAMP | 更新时间 |
| `deleted_at` | DATETIME | - | 是 | NULL | 删除时间 |

**索引：**
- `uk_roles_code` (code)
- `idx_roles_name` (name)
- `idx_roles_parent_id` (parent_id)
- `idx_roles_status` (status)

### 2.3 用户角色关联表（user_roles）

| 字段名 | 类型 | 长度 | 允许空 | 默认值 | 说明 |
|--------|------|------|--------|--------|------|
| `id` | VARCHAR | 36 | 否 | - | 主键，UUID |
| `user_id` | VARCHAR | 36 | 否 | - | 用户 ID |
| `role_id` | VARCHAR | 36 | 否 | - | 角色 ID |
| `created_at` | DATETIME | - | 否 | CURRENT_TIMESTAMP | 创建时间 |

**索引：**
- `uk_user_roles_user_role` (user_id, role_id)
- `idx_user_roles_user_id` (user_id)
- `idx_user_roles_role_id` (role_id)

### 2.4 权限表（permissions）

| 字段名 | 类型 | 长度 | 允许空 | 默认值 | 说明 |
|--------|------|------|--------|--------|------|
| `id` | VARCHAR | 36 | 否 | - | 主键，UUID |
| `name` | VARCHAR | 100 | 否 | - | 权限名称 |
| `code` | VARCHAR | 100 | 否 | - | 权限编码，唯一 |
| `type` | ENUM | - | 否 | - | 类型：menu/action/data |
| `resource` | VARCHAR | 100 | 是 | NULL | 资源标识 |
| `action` | VARCHAR | 50 | 是 | NULL | 操作：create/read/update/delete |
| `parent_id` | VARCHAR | 36 | 是 | NULL | 父权限 ID |
| `sort_order` | INT | - | 否 | 0 | 排序 |
| `description` | VARCHAR | 500 | 是 | NULL | 描述 |
| `created_at` | DATETIME | - | 否 | CURRENT_TIMESTAMP | 创建时间 |
| `updated_at` | DATETIME | - | 否 | CURRENT_TIMESTAMP | 更新时间 |

**索引：**
- `uk_permissions_code` (code)
- `idx_permissions_type` (type)
- `idx_permissions_parent_id` (parent_id)

### 2.5 角色权限关联表（role_permissions）

| 字段名 | 类型 | 长度 | 允许空 | 默认值 | 说明 |
|--------|------|------|--------|--------|------|
| `id` | VARCHAR | 36 | 否 | - | 主键，UUID |
| `role_id` | VARCHAR | 36 | 否 | - | 角色 ID |
| `permission_id` | VARCHAR | 36 | 否 | - | 权限 ID |
| `created_at` | DATETIME | - | 否 | CURRENT_TIMESTAMP | 创建时间 |

**索引：**
- `uk_role_permissions_role_permission` (role_id, permission_id)
- `idx_role_permissions_role_id` (role_id)
- `idx_role_permissions_permission_id` (permission_id)

### 2.6 部门表（departments）

| 字段名 | 类型 | 长度 | 允许空 | 默认值 | 说明 |
|--------|------|------|--------|--------|------|
| `id` | VARCHAR | 36 | 否 | - | 主键，UUID |
| `name` | VARCHAR | 100 | 否 | - | 部门名称 |
| `code` | VARCHAR | 50 | 否 | - | 部门编码，唯一 |
| `parent_id` | VARCHAR | 36 | 是 | NULL | 父部门 ID |
| `manager_id` | VARCHAR | 36 | 是 | NULL | 部门负责人 ID |
| `sort_order` | INT | - | 否 | 0 | 排序 |
| `status` | ENUM | - | 否 | `active` | 状态 |
| `description` | VARCHAR | 500 | 是 | NULL | 描述 |
| `created_at` | DATETIME | - | 否 | CURRENT_TIMESTAMP | 创建时间 |
| `updated_at` | DATETIME | - | 否 | CURRENT_TIMESTAMP | 更新时间 |
| `deleted_at` | DATETIME | - | 是 | NULL | 删除时间 |

**索引：**
- `uk_departments_code` (code)
- `idx_departments_parent_id` (parent_id)
- `idx_departments_manager_id` (manager_id)

## 3. AI 相关表结构

### 3.1 AI 会话表（ai_sessions）

| 字段名 | 类型 | 长度 | 允许空 | 默认值 | 说明 |
|--------|------|------|--------|--------|------|
| `id` | VARCHAR | 36 | 否 | - | 主键，UUID |
| `user_id` | VARCHAR | 36 | 否 | - | 用户 ID |
| `title` | VARCHAR | 200 | 是 | NULL | 会话标题 |
| `module` | VARCHAR | 50 | 否 | `general` | 业务模块 |
| `status` | ENUM | - | 否 | `active` | 状态：active/archived |
| `message_count` | INT | - | 否 | 0 | 消息数量 |
| `last_message_at` | DATETIME | - | 是 | NULL | 最后消息时间 |
| `metadata` | JSON | - | 是 | NULL | 元数据 |
| `created_at` | DATETIME | - | 否 | CURRENT_TIMESTAMP | 创建时间 |
| `updated_at` | DATETIME | - | 否 | CURRENT_TIMESTAMP | 更新时间 |
| `deleted_at` | DATETIME | - | 是 | NULL | 删除时间 |

**索引：**
- `idx_ai_sessions_user_id` (user_id)
- `idx_ai_sessions_module` (module)
- `idx_ai_sessions_status` (status)
- `idx_ai_sessions_last_message_at` (last_message_at)
- `idx_ai_sessions_user_module` (user_id, module)

### 3.2 AI 消息表（ai_messages）

| 字段名 | 类型 | 长度 | 允许空 | 默认值 | 说明 |
|--------|------|------|--------|--------|------|
| `id` | VARCHAR | 36 | 否 | - | 主键，UUID |
| `session_id` | VARCHAR | 36 | 否 | - | 会话 ID |
| `user_id` | VARCHAR | 36 | 否 | - | 用户 ID |
| `role` | ENUM | - | 否 | - | 角色：user/assistant/system/tool |
| `content` | TEXT | - | 否 | - | 消息内容 |
| `intent` | VARCHAR | 100 | 是 | NULL | 识别的意图 |
| `intent_confidence` | DECIMAL | 5,4 | 是 | NULL | 意图置信度 |
| `entities` | JSON | - | 是 | NULL | 提取的实体 |
| `tool_calls` | JSON | - | 是 | NULL | 工具调用记录 |
| `tool_results` | JSON | - | 是 | NULL | 工具执行结果 |
| `tokens_used` | INT | - | 是 | NULL | 使用的 Token 数 |
| `response_time_ms` | INT | - | 是 | NULL | 响应时间（毫秒） |
| `status` | ENUM | - | 否 | `success` | 状态：success/failed/streaming |
| `error_message` | TEXT | - | 是 | NULL | 错误信息 |
| `created_at` | DATETIME | - | 否 | CURRENT_TIMESTAMP | 创建时间 |

**索引：**
- `idx_ai_messages_session_id` (session_id)
- `idx_ai_messages_user_id` (user_id)
- `idx_ai_messages_role` (role)
- `idx_ai_messages_intent` (intent)
- `idx_ai_messages_created_at` (created_at)
- `idx_ai_messages_session_created` (session_id, created_at)

### 3.3 AI 调用日志表（ai_call_logs）

| 字段名 | 类型 | 长度 | 允许空 | 默认值 | 说明 |
|--------|------|------|--------|--------|------|
| `id` | VARCHAR | 36 | 否 | - | 主键，UUID |
| `user_id` | VARCHAR | 36 | 是 | NULL | 用户 ID |
| `session_id` | VARCHAR | 36 | 是 | NULL | 会话 ID |
| `message_id` | VARCHAR | 36 | 是 | NULL | 消息 ID |
| `provider` | VARCHAR | 50 | 否 | - | AI 服务提供商 |
| `model` | VARCHAR | 100 | 否 | - | 使用的模型 |
| `endpoint` | VARCHAR | 200 | 是 | NULL | API 端点 |
| `request_body` | JSON | - | 是 | NULL | 请求体 |
| `response_body` | JSON | - | 是 | NULL | 响应体 |
| `status_code` | INT | - | 是 | NULL | HTTP 状态码 |
| `prompt_tokens` | INT | - | 是 | 0 | 提示 Token 数 |
| `completion_tokens` | INT | - | 是 | 0 | 完成 Token 数 |
| `total_tokens` | INT | - | 是 | 0 | 总 Token 数 |
| `cost` | DECIMAL | 10,6 | 是 | 0.000000 | 调用成本 |
| `response_time_ms` | INT | - | 是 | NULL | 响应时间 |
| `success` | TINYINT | 1 | 否 | 1 | 是否成功 |
| `error_type` | VARCHAR | 100 | 是 | NULL | 错误类型 |
| `error_message` | TEXT | - | 是 | NULL | 错误信息 |
| `created_at` | DATETIME | - | 否 | CURRENT_TIMESTAMP | 创建时间 |

**索引：**
- `idx_ai_call_logs_user_id` (user_id)
- `idx_ai_call_logs_session_id` (session_id)
- `idx_ai_call_logs_provider` (provider)
- `idx_ai_call_logs_model` (model)
- `idx_ai_call_logs_success` (success)
- `idx_ai_call_logs_created_at` (created_at)
- `idx_ai_call_logs_user_created` (user_id, created_at)

### 3.4 内容审核记录表（content_audit_logs）

| 字段名 | 类型 | 长度 | 允许空 | 默认值 | 说明 |
|--------|------|------|--------|--------|------|
| `id` | VARCHAR | 36 | 否 | - | 主键，UUID |
| `user_id` | VARCHAR | 36 | 是 | NULL | 用户 ID |
| `session_id` | VARCHAR | 36 | 是 | NULL | 会话 ID |
| `message_id` | VARCHAR | 36 | 是 | NULL | 消息 ID |
| `content_type` | ENUM | - | 否 | - | 内容类型：input/output |
| `content` | TEXT | - | 否 | - | 审核内容 |
| `audit_result` | ENUM | - | 否 | - | 审核结果：pass/warn/block |
| `risk_level` | ENUM | - | 否 | `low` | 风险等级：low/medium/high |
| `risk_categories` | JSON | - | 是 | NULL | 风险类别 |
| `matched_keywords` | JSON | - | 是 | NULL | 匹配的敏感词 |
| `action_taken` | VARCHAR | 100 | 是 | NULL | 采取的措施 |
| `auditor` | VARCHAR | 50 | 否 | `system` | 审核者：system/manual |
| `created_at` | DATETIME | - | 否 | CURRENT_TIMESTAMP | 创建时间 |

**索引：**
- `idx_content_audit_logs_user_id` (user_id)
- `idx_content_audit_logs_audit_result` (audit_result)
- `idx_content_audit_logs_risk_level` (risk_level)
- `idx_content_audit_logs_content_type` (content_type)
- `idx_content_audit_logs_created_at` (created_at)

## 4. 业务模块表结构

### 4.1 业务模块配置表（business_modules）

| 字段名 | 类型 | 长度 | 允许空 | 默认值 | 说明 |
|--------|------|------|--------|--------|------|
| `id` | VARCHAR | 36 | 否 | - | 主键，UUID |
| `code` | VARCHAR | 50 | 否 | - | 模块编码，唯一 |
| `name` | VARCHAR | 100 | 否 | - | 模块名称 |
| `description` | TEXT | - | 是 | NULL | 模块描述 |
| `icon` | VARCHAR | 100 | 是 | NULL | 图标 |
| `enabled` | TINYINT | 1 | 否 | 1 | 是否启用 |
| `sort_order` | INT | - | 否 | 0 | 排序 |
| `config` | JSON | - | 是 | NULL | 模块配置 |
| `created_at` | DATETIME | - | 否 | CURRENT_TIMESTAMP | 创建时间 |
| `updated_at` | DATETIME | - | 否 | CURRENT_TIMESTAMP | 更新时间 |

**索引：**
- `uk_business_modules_code` (code)
- `idx_business_modules_enabled` (enabled)
- `idx_business_modules_sort_order` (sort_order)

### 4.2 业务工具表（business_tools）

| 字段名 | 类型 | 长度 | 允许空 | 默认值 | 说明 |
|--------|------|------|--------|--------|------|
| `id` | VARCHAR | 36 | 否 | - | 主键，UUID |
| `module_id` | VARCHAR | 36 | 否 | - | 模块 ID |
| `tool_id` | VARCHAR | 100 | 否 | - | 工具标识，唯一 |
| `name` | VARCHAR | 100 | 否 | - | 工具名称 |
| `description` | TEXT | - | 是 | NULL | 工具描述 |
| `category` | VARCHAR | 50 | 是 | NULL | 类别：query/create/update/delete/analysis |
| `parameters` | JSON | - | 是 | NULL | 参数定义 |
| `endpoint` | VARCHAR | 200 | 是 | NULL | 调用端点 |
| `method` | VARCHAR | 10 | 是 | NULL | HTTP 方法 |
| `enabled` | TINYINT | 1 | 否 | 1 | 是否启用 |
| `sort_order` | INT | - | 否 | 0 | 排序 |
| `created_at` | DATETIME | - | 否 | CURRENT_TIMESTAMP | 创建时间 |
| `updated_at` | DATETIME | - | 否 | CURRENT_TIMESTAMP | 更新时间 |

**索引：**
- `uk_business_tools_tool_id` (tool_id)
- `idx_business_tools_module_id` (module_id)
- `idx_business_tools_category` (category)
- `idx_business_tools_enabled` (enabled)

### 4.3 快捷操作表（quick_actions）

| 字段名 | 类型 | 长度 | 允许空 | 默认值 | 说明 |
|--------|------|------|--------|--------|------|
| `id` | VARCHAR | 36 | 否 | - | 主键，UUID |
| `module_id` | VARCHAR | 36 | 否 | - | 模块 ID |
| `action_id` | VARCHAR | 100 | 否 | - | 操作标识 |
| `label` | VARCHAR | 100 | 否 | - | 显示标签 |
| `icon` | VARCHAR | 100 | 是 | NULL | 图标 |
| `prompt_template` | TEXT | - | 是 | NULL | 提示词模板 |
| `sort_order` | INT | - | 否 | 0 | 排序 |
| `enabled` | TINYINT | 1 | 否 | 1 | 是否启用 |
| `created_at` | DATETIME | - | 否 | CURRENT_TIMESTAMP | 创建时间 |
| `updated_at` | DATETIME | - | 否 | CURRENT_TIMESTAMP | 更新时间 |

**索引：**
- `idx_quick_actions_module_id` (module_id)
- `idx_quick_actions_enabled` (enabled)

### 4.4 FAQ 表（faqs）

| 字段名 | 类型 | 长度 | 允许空 | 默认值 | 说明 |
|--------|------|------|--------|--------|------|
| `id` | VARCHAR | 36 | 否 | - | 主键，UUID |
| `module_id` | VARCHAR | 36 | 否 | - | 模块 ID |
| `question` | VARCHAR | 500 | 否 | - | 问题 |
| `answer` | TEXT | - | 否 | - | 答案 |
| `category` | VARCHAR | 100 | 是 | NULL | 分类 |
| `view_count` | INT | - | 否 | 0 | 查看次数 |
| `helpful_count` | INT | - | 否 | 0 | 有帮助次数 |
| `sort_order` | INT | - | 否 | 0 | 排序 |
| `enabled` | TINYINT | 1 | 否 | 1 | 是否启用 |
| `created_at` | DATETIME | - | 否 | CURRENT_TIMESTAMP | 创建时间 |
| `updated_at` | DATETIME | - | 否 | CURRENT_TIMESTAMP | 更新时间 |

**索引：**
- `idx_faqs_module_id` (module_id)
- `idx_faqs_category` (category)
- `idx_faqs_enabled` (enabled)

## 5. 系统表结构

### 5.1 系统配置表（system_configs）

| 字段名 | 类型 | 长度 | 允许空 | 默认值 | 说明 |
|--------|------|------|--------|--------|------|
| `id` | VARCHAR | 36 | 否 | - | 主键，UUID |
| `config_key` | VARCHAR | 100 | 否 | - | 配置键，唯一 |
| `config_value` | TEXT | - | 是 | NULL | 配置值 |
| `config_type` | VARCHAR | 50 | 否 | `string` | 类型：string/number/boolean/json |
| `category` | VARCHAR | 50 | 是 | NULL | 分类 |
| `description` | VARCHAR | 500 | 是 | NULL | 描述 |
| `is_system` | TINYINT | 1 | 否 | 0 | 是否系统配置（不可删除） |
| `created_at` | DATETIME | - | 否 | CURRENT_TIMESTAMP | 创建时间 |
| `updated_at` | DATETIME | - | 否 | CURRENT_TIMESTAMP | 更新时间 |

**索引：**
- `uk_system_configs_config_key` (config_key)
- `idx_system_configs_category` (category)
- `idx_system_configs_is_system` (is_system)

### 5.2 数据字典表（data_dictionaries）

| 字段名 | 类型 | 长度 | 允许空 | 默认值 | 说明 |
|--------|------|------|--------|--------|------|
| `id` | VARCHAR | 36 | 否 | - | 主键，UUID |
| `dict_code` | VARCHAR | 50 | 否 | - | 字典编码，唯一 |
| `dict_name` | VARCHAR | 100 | 否 | - | 字典名称 |
| `description` | VARCHAR | 500 | 是 | NULL | 描述 |
| `status` | ENUM | - | 否 | `active` | 状态 |
| `created_at` | DATETIME | - | 否 | CURRENT_TIMESTAMP | 创建时间 |
| `updated_at` | DATETIME | - | 否 | CURRENT_TIMESTAMP | 更新时间 |

**索引：**
- `uk_data_dictionaries_dict_code` (dict_code)

### 5.3 数据字典项表（data_dictionary_items）

| 字段名 | 类型 | 长度 | 允许空 | 默认值 | 说明 |
|--------|------|------|--------|--------|------|
| `id` | VARCHAR | 36 | 否 | - | 主键，UUID |
| `dict_id` | VARCHAR | 36 | 否 | - | 字典 ID |
| `item_code` | VARCHAR | 50 | 否 | - | 项编码 |
| `item_name` | VARCHAR | 100 | 否 | - | 项名称 |
| `item_value` | VARCHAR | 200 | 是 | NULL | 项值 |
| `sort_order` | INT | - | 否 | 0 | 排序 |
| `status` | ENUM | - | 否 | `active` | 状态 |
| `created_at` | DATETIME | - | 否 | CURRENT_TIMESTAMP | 创建时间 |
| `updated_at` | DATETIME | - | 否 | CURRENT_TIMESTAMP | 更新时间 |

**索引：**
- `idx_data_dictionary_items_dict_id` (dict_id)
- `uk_data_dictionary_items_dict_code` (dict_id, item_code)

### 5.4 操作审计日志表（audit_logs）

| 字段名 | 类型 | 长度 | 允许空 | 默认值 | 说明 |
|--------|------|------|--------|--------|------|
| `id` | VARCHAR | 36 | 否 | - | 主键，UUID |
| `user_id` | VARCHAR | 36 | 是 | NULL | 操作用户 ID |
| `username` | VARCHAR | 50 | 是 | NULL | 用户名 |
| `action` | VARCHAR | 100 | 否 | - | 操作类型 |
| `resource_type` | VARCHAR | 50 | 是 | NULL | 资源类型 |
| `resource_id` | VARCHAR | 36 | 是 | NULL | 资源 ID |
| `method` | VARCHAR | 10 | 是 | NULL | HTTP 方法 |
| `path` | VARCHAR | 500 | 是 | NULL | 请求路径 |
| `ip_address` | VARCHAR | 45 | 是 | NULL | IP 地址 |
| `user_agent` | VARCHAR | 500 | 是 | NULL | User-Agent |
| `request_params` | JSON | - | 是 | NULL | 请求参数 |
| `response_status` | INT | - | 是 | NULL | 响应状态码 |
| `success` | TINYINT | 1 | 否 | 1 | 是否成功 |
| `error_message` | TEXT | - | 是 | NULL | 错误信息 |
| `duration_ms` | INT | - | 是 | NULL | 耗时（毫秒） |
| `created_at` | DATETIME | - | 否 | CURRENT_TIMESTAMP | 操作时间 |

**索引：**
- `idx_audit_logs_user_id` (user_id)
- `idx_audit_logs_action` (action)
- `idx_audit_logs_resource_type` (resource_type)
- `idx_audit_logs_ip_address` (ip_address)
- `idx_audit_logs_created_at` (created_at)
- `idx_audit_logs_user_created` (user_id, created_at)

### 5.5 登录日志表（login_logs）

| 字段名 | 类型 | 长度 | 允许空 | 默认值 | 说明 |
|--------|------|------|--------|--------|------|
| `id` | VARCHAR | 36 | 否 | - | 主键，UUID |
| `user_id` | VARCHAR | 36 | 是 | NULL | 用户 ID |
| `username` | VARCHAR | 50 | 否 | - | 用户名 |
| `login_type` | VARCHAR | 50 | 否 | `password` | 登录类型：password/mfa/sso |
| `ip_address` | VARCHAR | 45 | 是 | NULL | IP 地址 |
| `user_agent` | VARCHAR | 500 | 是 | NULL | User-Agent |
| `location` | VARCHAR | 200 | 是 | NULL | 登录地点 |
| `device_info` | JSON | - | 是 | NULL | 设备信息 |
| `success` | TINYINT | 1 | 否 | 1 | 是否成功 |
| `failure_reason` | VARCHAR | 200 | 是 | NULL | 失败原因 |
| `session_id` | VARCHAR | 36 | 是 | NULL | 会话 ID |
| `created_at` | DATETIME | - | 否 | CURRENT_TIMESTAMP | 登录时间 |

**索引：**
- `idx_login_logs_user_id` (user_id)
- `idx_login_logs_username` (username)
- `idx_login_logs_success` (success)
- `idx_login_logs_ip_address` (ip_address)
- `idx_login_logs_created_at` (created_at)

## 6. 通知表结构

### 6.1 通知表（notifications）

| 字段名 | 类型 | 长度 | 允许空 | 默认值 | 说明 |
|--------|------|------|--------|--------|------|
| `id` | VARCHAR | 36 | 否 | - | 主键，UUID |
| `user_id` | VARCHAR | 36 | 否 | - | 接收用户 ID |
| `type` | VARCHAR | 50 | 否 | - | 通知类型 |
| `title` | VARCHAR | 200 | 否 | - | 标题 |
| `content` | TEXT | - | 是 | NULL | 内容 |
| `priority` | ENUM | - | 否 | `normal` | 优先级：low/normal/high/urgent |
| `status` | ENUM | - | 否 | `unread` | 状态：unread/read |
| `read_at` | DATETIME | - | 是 | NULL | 阅读时间 |
| `related_type` | VARCHAR | 50 | 是 | NULL | 关联类型 |
| `related_id` | VARCHAR | 36 | 是 | NULL | 关联 ID |
| `metadata` | JSON | - | 是 | NULL | 元数据 |
| `created_at` | DATETIME | - | 否 | CURRENT_TIMESTAMP | 创建时间 |

**索引：**
- `idx_notifications_user_id` (user_id)
- `idx_notifications_status` (status)
- `idx_notifications_type` (type)
- `idx_notifications_priority` (priority)
- `idx_notifications_created_at` (created_at)
- `idx_notifications_user_status` (user_id, status)

### 6.2 通知模板表（notification_templates）

| 字段名 | 类型 | 长度 | 允许空 | 默认值 | 说明 |
|--------|------|------|--------|--------|------|
| `id` | VARCHAR | 36 | 否 | - | 主键，UUID |
| `template_code` | VARCHAR | 100 | 否 | - | 模板编码，唯一 |
| `name` | VARCHAR | 100 | 否 | - | 模板名称 |
| `type` | VARCHAR | 50 | 否 | - | 通知类型 |
| `channel` | VARCHAR | 50 | 否 | - | 渠道：in_app/email/sms/feishu |
| `title_template` | VARCHAR | 500 | 否 | - | 标题模板 |
| `content_template` | TEXT | - | 否 | - | 内容模板 |
| `variables` | JSON | - | 是 | NULL | 变量定义 |
| `enabled` | TINYINT | 1 | 否 | 1 | 是否启用 |
| `created_at` | DATETIME | - | 否 | CURRENT_TIMESTAMP | 创建时间 |
| `updated_at` | DATETIME | - | 否 | CURRENT_TIMESTAMP | 更新时间 |

**索引：**
- `uk_notification_templates_template_code` (template_code)
- `idx_notification_templates_type` (type)
- `idx_notification_templates_channel` (channel)

## 7. 数据库关系图

### 7.1 核心关系

```
users 1───* user_roles *───1 roles
  │                          │
  │                          │
  │                          *
  │                    role_permissions *───1 permissions
  │
  │ 1───* ai_sessions
  │         │
  │         │ 1───* ai_messages
  │         │
  │         │ 1───* ai_call_logs
  │
  │ 1───* login_logs
  │
  │ 1───* audit_logs
  │
  │ 1───* notifications
  │
  *───1 departments

departments *───1 departments (自关联，树形结构)
roles *───1 roles (自关联，角色继承)
```

### 7.2 业务模块关系

```
business_modules 1───* business_tools
         │
         ├───* quick_actions
         │
         └───* faqs
```

### 7.3 系统配置关系

```
system_configs (独立表)
data_dictionaries 1───* data_dictionary_items
notification_templates (独立表)
content_audit_logs (独立表)
```

## 8. 索引设计原则

### 8.1 索引设计原则

1. **主键索引**：所有表都有主键 `id`（UUID）
2. **唯一索引**：用户名、邮箱、编码等唯一字段创建唯一索引
3. **外键索引**：外键字段（如 user_id、role_id）创建普通索引
4. **查询条件索引**：常用查询条件字段创建索引
5. **排序字段索引**：常用排序字段（如 created_at、sort_order）创建索引
6. **联合索引**：多字段联合查询创建联合索引，注意字段顺序
7. **避免过度索引**：索引不是越多越好，每个索引都会增加写入开销

### 8.2 索引使用建议

- 使用 `EXPLAIN` 分析查询执行计划
- 定期检查慢查询日志，优化慢查询
- 定期运行 `ANALYZE TABLE` 更新统计信息
- 大表添加索引时使用在线 DDL 工具，避免锁表
- 定期清理不再使用的索引

## 9. 数据分区策略

### 9.1 大表分区

对于数据量较大的表，建议使用分区策略：

| 表名 | 预计数据量 | 分区策略 | 分区键 |
|------|-----------|---------|--------|
| `ai_messages` | 大 | 按月分区 | `created_at` |
| `ai_call_logs` | 大 | 按月分区 | `created_at` |
| `audit_logs` | 大 | 按月分区 | `created_at` |
| `login_logs` | 中 | 按月分区 | `created_at` |
| `content_audit_logs` | 中 | 按月分区 | `created_at` |
| `notifications` | 中 | 按月分区 | `created_at` |

### 9.2 数据归档策略

- **热数据**：最近 3 个月数据，保留在主库
- **温数据**：3-12 个月数据，迁移到归档库
- **冷数据**：1 年以上数据，归档到对象存储
- **定期清理**：定期清理超过保留期限的数据

## 10. 数据库安全

### 10.1 访问控制

- **最小权限原则**：数据库账户只授予必要的权限
- **账户分离**：应用账户、管理账户、只读账户分离
- **密码策略**：强密码，定期更换
- **连接限制**：限制账户最大连接数
- **IP 限制**：限制账户可连接的 IP 地址

### 10.2 数据加密

- **传输加密**：使用 SSL/TLS 加密数据库连接
- **存储加密**：启用 TDE（透明数据加密）
- **字段加密**：敏感字段（如密码、身份证号）加密存储
- **密钥管理**：使用 KMS 管理加密密钥

### 10.3 审计监控

- **启用审计日志**：记录所有数据库操作
- **监控异常访问**：检测异常查询和访问
- **定期权限审查**：定期审查数据库账户权限
- **备份验证**：定期验证备份可恢复

---

*本文档由 TOPEMS 团队维护，最后更新：2026-08-28*
