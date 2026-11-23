# B202 会议室与会议预约状态收敛证据（2026-11-23）

## 唯一枚举（两列，同一文件）

`svc/erp/src/modules/meeting_status.rs`

| 枚举 | 落库列 | 值集 | 默认 |
| --- | --- | --- | --- |
| `MeetingRoomStatus` | `erp.meeting_rooms.status` | `available` / `occupied` / `maintenance` / `unavailable` | `available` |
| `MeetingBookingStatus` | `erp.meeting_bookings.status` | `confirmed` / `cancelled` | `confirmed` |

会议室值集对齐前端 `apps/web/src/schemas/erp/meetingRoom.ts` 的下拉、筛选、`statusBadge.colorMap`
与 `labelMap`（4 值）；预约侧前端暂无状态展示层，`confirmed` / `cancelled` 由后端负责。

单测：两组值往返；`bogus` / `pending` 拒绝；`canceled` → `cancelled` 别名；`normalize` 未知值回落默认；
`parse_filter` 覆盖 `None` / 空 / `all` / 合法 / 非法。

## 默认值口径收敛

`erp.meeting_bookings.status` 的 DB 默认原本是 `pending`，但**任何写入口都没用过它**：
创建写 `'confirmed'`，时段冲突检测也按 `status = 'confirmed'` 过滤。等于「默认值指向一个从不出现的状态」。
本批把列默认改为 `confirmed`（表 0 行，无回填风险；候选 SQL 仍保留一次兜底 UPDATE 供其它环境执行）。

## 代码侧收敛（`meeting_room.rs`）

| 位置 | 收敛前 | 收敛后 |
| --- | --- | --- |
| `list_rooms` | `status_filter = params.status.clone()` 原样绑定 | `MeetingRoomStatus::parse_filter`，非法 400 |
| `create_room` | `VALUES (..., 'available', ...)` | 绑 `MeetingRoomStatus::DEFAULT` |
| `update_room` | `req.status.unwrap_or(existing.status)` 可写任意串 | 有值枚举校验、非法 400；无值沿用原值 |
| `create_booking` 房间校验 | `AND status = 'available'` | `AND status = $2` 绑 `Available` |
| `create_booking` 冲突检测 | `AND status = 'confirmed'` | `AND status = $4` 绑 `MeetingBookingStatus::Confirmed` |
| `create_booking` 写入 | `VALUES (..., 'confirmed', ...)` | 绑 `MeetingBookingStatus::DEFAULT` |
| `list_bookings` | `status_filter = params.status.clone()` 原样绑定 | `MeetingBookingStatus::parse_filter`，非法 400 |
| `update_booking` | `req.status.unwrap_or(existing.status)` 可写任意串 | 有值枚举校验、非法 400；无值沿用原值 |

响应侧 `normalize_room` / `normalize_booking` 覆盖 2 个分页列表、`/meeting-rooms/{id}/bookings`
以及创建/详情/更新共 7 个出口。

此外补前端全局色板 `apps/web/src/utils/status.ts` 缺失的 `occupied: 'warning'`
（`meetingRoom.ts` 有该项，但全局表缺，strict-palette 会失败、界面会灰色兜底）。

## 数据库约束

- 候选：`docs/database/meeting-status-check-candidates-2026-11-23.sql`
- `ck_erp_meeting_rooms_status_standard`：`CHECK (status IS NULL OR status IN (4 值))`，`NOT VALID`
- `ck_erp_meeting_bookings_status_standard`：`CHECK (status IS NULL OR status IN (2 值))`，`NOT VALID`
- 默认：`erp.meeting_bookings.status` 由 `pending` 改为 `confirmed`（`UPDATE 0`，表内无数据）
- 本地应用：两表 0 行，两条约束 `convalidated=false`；`bogus` 分别插入被对应约束拒绝后回滚

## 门禁

- `cargo clippy -p topems-erp --lib --tests -- -D warnings` 通过
- `cargo test -p topems-erp --lib`：891 passed
