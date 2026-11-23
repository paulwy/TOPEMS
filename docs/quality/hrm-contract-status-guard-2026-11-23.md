# HRM 劳动合同状态守卫（B215）

日期：2026-11-23
范围：`hrm.contracts.status`

## 1. 问题

`hrm.contracts.status` 是 `varchar NOT NULL DEFAULT 'active'`，后端写入分散在字面量与裸参数：

- 创建接口固定写 `'active'`（请求体没有 status 字段）；
- 更新接口 `status = COALESCE($14, status)`，`req.status` 是任意字符串，非法值直落库；
- 列表 `status` 参数裸绑主查询与 COUNT（非法值静默查空）；
- “即将到期”列表与 COUNT 写死 `status = 'active'`；
- 续签执行成功后回写 `status = 'active'` 字面量。

**额外发现（真实缺陷）**：库内存在历史约束 `ck_contracts_status_standard`，只允许 `active/inactive/archived`，与前端 schema 的 `active/expired/terminated/pending` 冲突。也就是说更新接口把合同设为 `expired`/`terminated`/`pending` 时必然撞约束报 500，而 `archived`/`inactive` 后端没有任何写入方——这类值永远写不进去，属于前后端值集不一致的存量问题。

## 2. 修复

新增 `svc/hrm/src/modules/contract_status.rs`（`ContractStatus`：active/expired/terminated/pending，默认 active；`DB_VALUES`/`from_db_str`/`as_db_str`/`normalize`/`parse_filter`/`parse_optional_write`/`Display`/`FromStr` + 2 单测）。

`contract.rs` 接线 10 处：

| 位置 | 原写法 | 现写法 |
| --- | --- | --- |
| 创建合同 | `VALUES (..., 'active', ...)` | `$26` + `DEFAULT` |
| 更新合同 | `bind(&req.status)` | `parse_optional_write`，非法值 400 |
| 列表过滤 | `params.status.clone()` 裸绑 | handler `parse_filter`（400）+ 空串/`all` 归一 |
| 到期列表 | `status = 'active'` | `$4` + `Active` |
| 到期 COUNT | `status = 'active'` | `$2` + `Active` |
| 续签执行回写 | `status = 'active'` | `$6` + `Active` |

## 3. 数据库约束

- 迁移 `database/migrations/20261123130000_hrm_contracts_status_canonical.sql`：幂等删除历史 `ck_contracts_status_standard`，建立 `ck_hrm_contracts_status_standard`（`NOT VALID`）。
- 候选 SQL `docs/database/hrm-contract-status-check-candidates-2026-11-23.sql` 与迁移等价，已应用到本地 `topems`。
- 迁移门禁 `check-directed-migrations.mjs`、`check-prod-migration-entry.mjs` 均 PASS。

## 4. 负向/正向验证

- 插入 `status='bogus'` → `violates check constraint ck_hrm_contracts_status_standard`。
- 插入 `status='pending'` 成功（事务内回滚），确认历史约束不再拦截前端值。
- 本地表 0 行，`NOT VALID` 无存量冲突。

## 5. 门禁

- `cargo fmt --all` / `cargo clippy -p topems-hrm --lib --tests -- -D warnings`：通过
- `cargo test -p topems-hrm --lib`：**306 passed**（+2）
- `dump-status-checks --check`：407 条 CHECK / 5 ENUM / 319 无约束列，PASS
- `dump-status-code-inventory --check --strict-palette`：286 枚举 / 245 前端键，色板缺口 0，PASS
- `status-db-check-queue --check`：44 枚举 / 57 值，PASS
- `check-request-txn` / `check-scope-api` / `check-txn-write-non2xx` / `verify-glossary` / `check-i18n 7-in-1` / `apps/web typecheck` / 两个迁移门禁：通过

## 6. 遗留

- 历史约束删除后，生产库若有 `inactive/archived` 存量行不会被 `NOT VALID` 约束判定失败，但读取/展示侧前端没有对应色板项，需按租户核对后迁移到新值集或扩枚举。
- 到期提醒只查 `active`，`pending` 状态的待签合同不会进入提醒；这是业务口径问题，不属于本批值域收敛范围。
