# B45 · mobile.push_notifications 状态单一源（2026-11-21）

## 现状（改动前）
- `mobile.push_notifications`：本地 194 行，`active` 191 / `sent` 3；无 CHECK；列默认 `'pending'`。
- 创建推送通知的 INSERT 写死 `'active'`，但返回对象写死 `'pending'`：落库态与接口回显态从一开始就不一致；191 条 active 永远不会被发送统计识别。
- 发送结果回写 `db_update_push_notification_stats` 写死 `'sent'`，没有起始态谓词，重复回写会把已发送记录再次计数。
- 发送数 / 送达数 / 点击数三项统计 SQL 三处写死 `WHERE status = 'sent'`。

## 改动
1. 新增 `svc/mobile/src/modules/push_status.rs`：`PushNotificationStatus`（pending/sent/failed，`DEFAULT = Pending`，`send_from = [pending]`），严格解析 + 2 单测。
2. `db/repository.rs`：创建状态绑定 `DEFAULT`；返回对象同一来源；发送回写绑定 `Sent` 并加 `status = ANY([pending])` 谓词。
3. `modules/push_notification.rs`：三项统计的 `status = 'sent'` 改为 `status = ANY($1::text[])` 并绑定枚举值。
4. 候选 DDL `docs/database/mobile-push-status-check-candidates-2026-11-21.sql`：`push_notifications_status_check`（三值，`NOT VALID`），窗口内需先把 191 行 active 归一为 pending。

## 验证
- `cargo check -p topems-mobile`、`cargo clippy -p topems-mobile --all-targets -- -D warnings`、`cargo fmt --all` 干净。
- `cargo test -p topems-mobile --lib push_status`：2 passed。
- 本地演练（事务内 ROLLBACK，残留 0）：insert pending → sent `UPDATE 1`；`sent → 'active'` → 23514；回滚后行 0、约束 0。
- 盘点：枚举 154→155、值 163（pending/sent/failed 已存在）、不在 DB CHECK 124、色板缺口 0；队列 110→111 枚举；映射 89→90。

## 残留
- 191 行 `active` 历史数据未改，候选 CHECK 为 `NOT VALID`；任何对这批行的 UPDATE（含 `status=status`）都会被 23514 拦截，必须在窗口内先归一。
- `mobile.mobile_push_notifications`（76 行全 pending）由事件处理器写入后无人推进，与 `push_notifications` 并行存在，需确认删表或接线。
- 发送统计回写 0 行时仍返回 `Ok(())`，调用方无法区分“通知不存在 / 已发送”；下一批可返回冲突。
- 候选 CHECK 未进 `database/migrations/`、未在生产执行。
