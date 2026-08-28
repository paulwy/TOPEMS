# Feedback → Ticket 数据迁移说明

## 概述

本迁移脚本将 `core_feedbacks` 表的数据迁移到 `core_tickets` 表，
feedback 作为 ticket 的一种类型（`ticket_type = 'customer_feedback'`）。

## 迁移文件

- `migrate_feedback_to_ticket.sql` — 主迁移脚本

## 执行步骤

### 1. 前置准备

```bash
# 备份数据库（强烈建议）
pg_dump -d <database> -t core_feedbacks -f core_feedbacks_backup.sql

# 确认 ticket 服务已启动并初始化表结构
# ticket 服务启动时会自动创建 core_tickets, core_ticket_comments 等表
```

### 2. 执行迁移

```bash
psql -d <database> -f migrate_feedback_to_ticket.sql
```

脚本会输出迁移进度和验证结果，例如：

```
[迁移] 首次迁移，将迁移所有 feedback 数据
[迁移] 阶段1完成: core_tickets 中共有 152 条 feedback 来源记录
[迁移] 阶段2完成: 共迁移 89 条 feedback 响应评论
========================================
[迁移验证] Feedback 表统计:
  总记录数: 160
  有效记录数(未删除): 152
[迁移验证] Ticket 表统计:
  已迁移 ticket 数: 152
  已迁移评论数: 89
  未迁移记录数: 0
========================================
[迁移验证] 所有有效 feedback 记录已成功迁移
```

### 3. 验证迁移结果

```sql
-- 检查迁移的 ticket 数量
SELECT COUNT(*) FROM core_tickets WHERE source_service = 'feedback';

-- 检查迁移的评论数量
SELECT COUNT(*) FROM core_ticket_comments c
JOIN core_tickets t ON c.ticket_id = t.id
WHERE t.source_service = 'feedback';

-- 抽查几条迁移的数据
SELECT id, ticket_no, title, status, metadata->>'satisfaction' as satisfaction
FROM core_tickets
WHERE source_service = 'feedback'
LIMIT 5;
```

### 4. （可选）归档原表

验证通过后，可以归档原 `core_feedbacks` 表：

```sql
-- 取消注释迁移脚本中的阶段 4，或手动执行:
CREATE TABLE IF NOT EXISTS core_feedbacks_backup_202608 AS
SELECT * FROM core_feedbacks;

ALTER TABLE core_feedbacks RENAME TO core_feedbacks_archived_202608;
```

## 数据映射规则

### core_feedbacks → core_tickets

| feedback 字段 | ticket 字段 | 映射规则 |
|---|---|---|
| `id` | `id` | 保持不变，便于追溯 |
| - | `ticket_no` | 生成 `FB` + 6位数字（基于 id hash） |
| - | `tenant_id` | 生成随机 UUID（部署时需替换为正确值） |
| `title` | `title` | 直接映射 |
| `description` | `description` | 直接映射 |
| - | `ticket_type` | 固定值 `customer_feedback` |
| `satisfaction` | `severity` | ≥4→low, =3→medium, ≤2→high |
| `status` | `status` | pending→open, resolved→resolved, closed→closed |
| - | `source_service` | 固定值 `feedback`（标识来源） |
| `id` | `source_business_id` | 原始 feedback ID（文本） |
| `responded_by` | `assignee_id` | 如果是合法 UUID 则转换 |
| `user_id` | `reporter_id` | 如果是合法 UUID 则转换 |
| `responded_at` | `resolved_at` | 直接映射 |
| `status='closed'` | `closed_at` | 使用 updated_at |
| `created_at` | `created_at` | 直接映射 |
| `updated_at` | `updated_at` | 直接映射 |
| `type` | `tags` | 作为标签数组 |
| `type/screenshots/satisfaction/response/responded_by` | `metadata` | JSONB 对象，保留所有特有字段 |

### feedback.response → core_ticket_comments

| 字段 | 映射规则 |
|---|---|
| `ticket_id` | 迁移后的 ticket.id |
| `user_id` | assignee_id（或随机 UUID） |
| `user_name` | metadata->>'responded_by' |
| `content` | metadata->>'response' |
| `is_internal` | false（公开评论） |
| `created_at` | resolved_at（或 updated_at） |

## 增量迁移

脚本支持增量执行：
- 通过 `source_service = 'feedback'` 和 `source_business_id = feedback.id` 判断记录是否已迁移
- 重复执行不会产生重复数据
- 新增的 feedback 记录会在下次执行时迁移

## 回滚方案

如需回滚，执行以下 SQL：

```sql
-- 删除迁移的评论
DELETE FROM core_ticket_comments
WHERE ticket_id IN (SELECT id FROM core_tickets WHERE source_service = 'feedback');

-- 删除迁移的 ticket
DELETE FROM core_tickets WHERE source_service = 'feedback';

-- 如果已归档原表，恢复表名
ALTER TABLE core_feedbacks_archived_202608 RENAME TO core_feedbacks;
```

## 注意事项

1. **tenant_id**：feedback 表没有 tenant_id 字段，迁移脚本使用 `gen_random_uuid()` 生成。
   实际部署时，如果系统有固定的 tenant_id，需要修改脚本中的 tenant_id 生成逻辑。

2. **UUID 转换**：`user_id` 和 `responded_by` 在 feedback 表中是 VARCHAR 类型，
   脚本会尝试转换为 UUID。如果不是合法 UUID，对应字段为 NULL，原始值保留在 metadata 中。

3. **前端兼容性**：前端 feedback 组件仍调用 `/api/feedback/*` 路径，
   nginx 已将该路径路由到 ticket 服务，ticket 服务的 `feedback_compat` 模块提供兼容 API。

4. **执行顺序**：确保 ticket 服务已启动并初始化表结构后再执行迁移脚本。
