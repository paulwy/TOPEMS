# B198 安全问题状态收敛证据（2026-11-23）

## 唯一枚举

- 文件：`svc/ehs/src/modules/safety_hazard_status.rs`
- 枚举：`SafetyHazardStatus`
- 值集：`reported` / `pending_approval` / `rectifying` / `pending_verification` / `verified` / `closed` / `rejected` / `resolved`
- 默认：`reported`
- 落库列：`ehs.safety_hazards.status`（varchar，NOT NULL，DB 默认原为 `pending`）

值集依据前端 `/api/ehs/issues` 契约 `apps/web/src/schemas/ehs/safetyIssue.ts` 的下拉、筛选项、
`statusBadge.colorMap` 与 `labelMap`，与该表 CRUD（`hazard.rs` 中 `/issues` 主流程）一一对应。

单测：8 值往返；`active`、`bogus` 拒绝；`normalize` 对 `active` / 空串回落 `reported`，大小写归一。

## 三套口径收敛

该列此前同时存在三种“初始状态”：

| 来源 | 取值 |
| --- | --- |
| 前端 schema 默认值 | `reported` |
| 后端创建硬编码 | `active` |
| 数据库列默认 | `pending` |

本地 11 行历史数据全部是 `active`，而前端没有 `active` 的标签与色板项，只能显示灰色兜底。
本批统一到 `reported`：DB 默认改 `reported`，历史 `active` 归一 `reported`（本地 11 行已更新）。

## 写入口绑定

- `create_safety_hazard`：原 `req.status.clone().unwrap_or_else(|| "active".to_string())`
  改为枚举校验；缺省 / 空串 / `all` 取 `DEFAULT`（`reported`），非法值返回 400（`无效的隐患状态`）。
- `update_safety_hazard`：`req.status` 原本直接拼进 `status = $N` 参数，任何字符串都能写库；
  现在先经 `from_db_str` 校验，非法值 400，合法值写归一后的枚举字符串。

## 列表过滤绑定

`list_safety_hazards` 的租户通道与系统通道分支此前都用 `q.status` 原样拼参数，
非法值静默查空。现在统一先校验一次，再进入两个分支；`all` / 空串忽略，非法值 400。

## 读入口绑定

`safety_hazard_from_row` 是 create / update / list / get 的统一出口，`status` 现经 `normalize` 归一，
原 `unwrap_or_else(|_| "active")` 兜底改为枚举默认。

## 数据库验证

候选：`docs/database/safety-hazard-status-check-candidates-2026-11-23.sql`

- `ALTER COLUMN status SET DEFAULT 'reported'` 生效（`column_default = 'reported'`）。
- `UPDATE ... WHERE status = 'active'` 影响 11 行；复检 `status` 分布为 `reported: 11`。
- `ck_ehs_safety_hazards_status_standard` 以 `NOT VALID` 应用，`convalidated = false`。
- 事务插入 `bogus` 行被拒：`violates check constraint "ck_ehs_safety_hazards_status_standard"`，
  插入后 `ROLLBACK`。

## 口径变化

| 项 | B197 | B198 |
| --- | --- | --- |
| 状态 CHECK | 378 | 379 |
| PG ENUM 类型 | 5 | 5 |
| 无约束状态列 | 345 | 344 |
| Rust 枚举 | 261 | 262 |
| Rust 枚举值 | 221 | 221 |
| 不在 DB CHECK 的 Rust 值 | 58 | 58 |
| 前端状态键 | 230 | 230 |
| 前端键不在 DB CHECK | 67 | 67 |
| 色板缺口 | 0 | 0 |
| 缺口队列 | 45 / 58 | 45 / 58 |

`rust_enum_values` 仍为 221 是盘点脚本既有口径问题（新增枚举值未计数），不是代码缺值。
8 个值均已在前端 `safetyIssue.ts` 的色板与标签内，全局色板无需新增。

## 门禁

- `cargo clippy -p topems-ehs --lib --tests -- -D warnings`：通过
- `cargo test -p topems-ehs --lib`：257 passed
- catalog / inventory `--strict-palette` / queue / 其余固定门禁：通过

## 生产

只读快照未改动；候选（含默认值变更与 `active` 归一）仅在本地 `topems` 应用。
生产发布前需确认 `active` 归一是否与业务口径一致，再按窗口执行并 `VALIDATE`。
