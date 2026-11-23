# B208 · HRM 考勤记录状态护栏证据（2026-11-23）

## 范围

- 表：`hrm.attendance_records`
- 列：`status`（varchar(20) NOT NULL DEFAULT `normal`）
- 代码：`svc/hrm/src/modules/attendance.rs`
- 枚举：`svc/hrm/src/modules/attendance_status.rs`（新增）
- 本地数据：5 行，全部为 `active`

## 值集

`AttendanceStatus = { normal, active, late, early_leave }`，默认 `normal`（与 DB 默认一致）。

只收有代码证据的值，不预置空态：

| 值 | 证据 |
| --- | --- |
| `normal` | 列默认值 |
| `active` | `clock_in` 原兜底 `COALESCE(status, 'active')`；本地存量 5 行 |
| `late` | 月度统计 SQL 的 `FILTER (WHERE status = 'late')` |
| `early_leave` | 月度统计 SQL 的 `FILTER (WHERE status = 'early_leave')` |

`absent` / `leave` / `overtime` 全仓无写入方，本批不加入；出现写入方后按证据扩展词表并同步约束。

## 修掉的缺陷

1. **创建接口必然 500**：`create_attendance_record` 的 `req.status` 是 `Option<String>`，
   却直接绑定到 `NOT NULL` 列——缺省即违反非空约束。现缺省/空串写 `DEFAULT`、非法值 400。
2. **更新接口透传自由串**：`update_attendance_record` 用 `req.status.or(existing.status)`
   直接入库，任意字符串都可写成"状态"。现严格校验：缺省保留既有值并归一，非法 400。
3. **打卡兜底字面量**：`clock_in` 的 `COALESCE(status, 'active')` 改为参数绑定枚举常量，
   状态初值不再散落在 SQL 文本里。
4. **列表根本不支持状态筛选**：`GET /attendance` 与 `GET /attendance/records` 的查询参数
   里都没有 `status`，前端传了也被静默忽略、返回全部记录。现两接口补 `status` 过滤，
   `parse_filter` 严格校验：空/`all` 不过滤，未知值 400，SQL 用 `($n::text IS NULL OR status = $n)`。
5. **响应出口**：列表（`records`）、员工月列表（`items`）、详情、创建、更新、两次上班打卡、
   下班打卡共 8 处经 `normalize_record`（字段为 `Option<String>`，用 `map` 保持 `Option`）。

## 本地验证

```sql
ALTER TABLE hrm.attendance_records ADD CONSTRAINT ck_hrm_attendance_records_status_standard
  CHECK (status IN ('normal','active','late','early_leave')) NOT VALID;
```

- 应用成功，`convalidated = f`；5 行存量 `active` 在值域内，将来 `VALIDATE` 可直接通过。
- 负向验证：插入 `status='bogus'` 被 `ck_hrm_attendance_records_status_standard` 拒绝，事务回滚。
- 生产快照 `topems_prod_verify_20261106` 未应用。

## 门禁

- `cargo fmt --all`、`cargo clippy -p topems-hrm --lib --tests -- -D warnings`、`cargo test -p topems-hrm --lib`（298 passed）
- `dump-status-checks.mjs --check`、`dump-status-code-inventory.mjs --check --strict-palette`、`status-db-check-queue.mjs --check`
- `check-request-txn.mjs`、`check-scope-api.mjs`、`check-txn-write-non2xx.py --changed-only`
- `verify-glossary.cjs --strict`、`check-i18n.cjs --mode=quality --strict`、`apps/web npm run typecheck`

刷新后计数：catalog **396/5/327**、盘点 **278/236/57/245**、队列 **44/57 全 internal**，
前端键不在 DB CHECK **66**，色板缺口 0。
