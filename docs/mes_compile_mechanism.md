# MES 编译机制化治理手册

> 目标：让 `svc/mes` 的编译结果**可预测、可复现、可强制**，任何环境（本地开发 / 并发 AI 会话 / CI）都遵循同一套规则，杜绝类型漂移、遮蔽漂移与倒退提交。

---

## 1. 背景：mes 编译问题的根因链

历史上 mes 编译反复失败，根因是**“编译类型来源不稳定”**：

| # | 根因 | 后果 | 对应机制 |
|---|------|------|----------|
| 1 | `public` schema 出现与 mes 表同名的对象（视图/表） | sqlx 在线解析被遮蔽，`NOT NULL` 列被误判为 `Option`，产生上百类型错误 | `mes_guard.sh` 遮蔽检查 + `--clean` 清理 |
| 2 | `svc/mes/.sqlx` 离线缓存残留（prepare 中断产生，类型与真库不符） | 离线编译报 167 类错误，误导会话按错误类型改写代码 | `mes_guard.sh` 编译前强制 `rm .sqlx` |
| 3 | 并发会话基于旧缓存/旧分支认知改写代码（把 `Vec<String>` 改回 `Vec<serde_json::Value>`、在非 Option 字段上加 `unwrap_or_default`） | 修复被反复回退，编译回归 | CI `mes-online-check` 在线编译强制 0 error |
| 4 | 结构变更（迁移/建表）后无自动化验证 | 漂移悄然累积，直到下次编译才暴露 | 快照同步 + CI 门禁 |

**核心原则：一切以“连接真实 PostgreSQL 的在线解析”为准，禁止以离线缓存、旧分支假设为准。**

---

## 2. 机制组成

### 2.1 `scripts/mes_guard.sh` — 一体化守卫（本地 + CI 共用）

```bash
scripts/mes_guard.sh                      # 遮蔽检查 + 在线编译断言（只读，不动库）
scripts/mes_guard.sh --clean              # 额外清理非白名单遮蔽对象（幂等）
scripts/mes_guard.sh --sync-snapshot      # 重新生成 fixtures/mes_compile_schema.sql
scripts/mes_guard.sh --prepare            # 生成/更新 sqlx 缓存并合并根 .sqlx（迁移后必跑）
scripts/mes_guard.sh --skip-compile       # 只做遮蔽检查（快排）
scripts/mes_guard.sh --db-url "postgresql://..."  # 指定编译库（CI 传 service 地址）
```

- **遮蔽检查**：扫描 `public` schema 中与 mes 查询表同名、且不在白名单的对象。白名单当前为 `inspection_records`（erp_public 共享表）、`audit_logs`（unified-core 审计共享表）。
- **在线编译**：`rm -f svc/mes/.sqlx/query-*.json` → `SQLX_OFFLINE=false` + `DATABASE_URL`（`search_path=mes,public`）→ `cargo check --lib` → **断言 0 error**，失败退出码 1。
- **缓存同步（--prepare）**：`rm -f svc/mes/.sqlx/query-*.json` → `SQLX_OFFLINE=false` + `DATABASE_URL`（`search_path=mes,public`）→ `cargo sqlx prepare` → 合并到根 `.sqlx` → 提示提交。**数据库结构变更（迁移）后必跑**，保持离线编译与真库一致。
- **快照同步**：将 5432 的 `mes` schema + 白名单 public 共享表结构导出为 `fixtures/mes_compile_schema.sql`（自动过滤扩展/权限/触发器/psql 元命令，头部自带扩展与 `app.tenant_id` GUC 注册）。

### 2.2 `fixtures/mes_compile_schema.sql` — 编译结构快照

- 由 `mes_guard.sh --sync-snapshot` 生成，**勿手改**。
- 供 CI 干净库编译使用：导入快照 → 在线编译 → 结果与本地 5432 一致。
- **规则：任何 mes schema / public 共享表结构变更后，必须重新同步**（否则 CI 会红，红的原因是快照过期，正是机制在起作用）。

### 2.3 CI 门禁 `.github/workflows/ci.yml → mes-online-check`

- 启动 `postgres:16` service → 导入快照 → 在线编译 mes → 断言 0 error。
- **任何把 mes 改回旧写法、遮蔽漂移、快照过期的提交都会在此变红，阻止进入 main。**
- 触发条件与 `cargo-check` 一致（Rust/CI 文件变更时）。

---

## 3. 使用手册

### 3.1 日常开发改 mes 代码

```bash
cd /Users/air/TOPEMS
scripts/mes_guard.sh          # 改完代码先跑守卫，0 error 再提交
```

### 3.2 改了 mes / public 共享表结构（迁移、ALTER、建表）

```bash
# 1. 先应用迁移到 5432（编译参考库）
# 2. 同步 sqlx 离线缓存（方案C调和：在线解析 + search_path，自动合并根 .sqlx）
scripts/topems.sh mes-guard --prepare
git add .sqlx && git commit -m 'chore(sqlx): 缓存与真库对齐'
# 3. 再同步快照（CI 干净库编译用）
scripts/mes_guard.sh --sync-snapshot
git add fixtures/mes_compile_schema.sql
# 4. 提交时结构变更与缓存/快照必须同 commit，否则 CI 红
```

### 3.3 编译失败排查流程

1. 看守卫输出中的错误清单（`grep -c '^error\[E'` + 前 8 类错误）。
2. `git status` 确认是否有并发会话正在改 mes 文件（若 TRAE/其他会话活跃，先协调，勿对抗）。
3. 检查 5432 是否出现新遮蔽：`scripts/mes_guard.sh --skip-compile`。
4. 若错误是 `unwrap_or_default on String/Uuid/i32`、`and_utc on timestamptz` 等 → 说明有人按“Option 假设”写了代码，而真库列是 `NOT NULL`/`timestamptz`。以 `information_schema.columns.is_nullable` 为权威修正。
5. 若错误是 `unrecognized configuration parameter app.tenant_id` → 编译库缺 GUC 注册，重跑 `--sync-snapshot`（头部 DO 块会注册）。

### 3.4 CI 红了怎么办

- 若因**快照过期**（结构变更未同步）→ 本地 `--sync-snapshot` 并随代码一起提交。
- 若因**代码倒退**（在线编译真实报错）→ 按 3.3 修正代码，快照无需动。
- 若因**遮蔽**（新 public 同名对象）→ 确认后 `--clean` 清理或加入白名单，并查明建表来源（通常是迁移未显式限定 schema，应修迁移而非绕行）。

### 3.5 数据库结构变更后同步离线缓存（方案 C 调和，必做）

**背景**：`cargo sqlx prepare` 生成的离线缓存（根 `.sqlx`）曾与 5432 真库漂移（缓存类型与真库不符），导致「我方离线可编译版本在线 165 错、TRAE 在线真值版离线 68 错」的双真相拉锯。**方案 C 以在线真值为准重跑 prepare**，实现离线/在线双 0 error。

**迁移/改表后的完整维护链**：

```bash
# 1. 应用迁移到 5432（编译参考库）
# 2. 同步离线缓存（在线解析 + search_path=mes,public，自动合并根 .sqlx）
scripts/topems.sh mes-guard --prepare
git add .sqlx && git commit -m 'chore(sqlx): 缓存与真库对齐'
# 3. 同步编译快照（CI 干净库用）
scripts/mes_guard.sh --sync-snapshot
git add fixtures/mes_compile_schema.sql
# 4. 本地回归
SQLX_OFFLINE=true cargo check --workspace   # 离线 0 error
scripts/mes_guard.sh                        # 在线 0 error（含遮蔽检查）
```

**关键点（实测教训）**：

- mes 表在 `mes` schema，prepare 连接串**必须带** `?options=-csearch_path=mes,public`，否则报 `relation "equipment" does not exist`（此前 161 错/165 错的真正根因，不是代码问题）。
- **宏查询**（`sqlx::query!`）与离线缓存强绑定：改宏内容**必重跑 prepare**，否则离线编译报「无缓存」。
- **运行时查询**（`sqlx::query`）不产生缓存，改动不受 prepare 影响。
- prepare 后**必须提交根 `.sqlx`**（326 个缓存，含 47 个 mes 新/更新），否则团队离线编译仍用旧缓存、双真相复发。
- `--prepare` 幂等：重复执行不产生额外 diff（已实测 0 diff）。

---

## 4. 设计原则（供所有会话遵守）

1. **在线为准**：编译/类型判断一律连接真实 PostgreSQL（5432 编译参考库或 CI service），禁用离线缓存作为代码书写依据。
2. **快照权威**：`fixtures/mes_compile_schema.sql` 是 CI 的“真相来源”，结构变更必须同步，否则红。
3. **CI 强制**：`mes-online-check` 是 main 的最后防线，任何倒退在此拦截。
4. **schema 限定**：建表/迁移一律显式 `schema.table`（如 `mes.xxx`），禁止依赖 `search_path` 落库（public 漂移的根源）。
5. **白名单透明**：public 中与 mes 表同名的合法共享表必须加入 `PUBLIC_ALLOWLIST` 并注明用途，其余视为遮蔽。
6. **缓存同步**：数据库结构变更后必须 `mes-guard --prepare` 并提交根 `.sqlx`——离线缓存以在线真值为唯一真相来源，禁止以旧缓存/旧分支假设为代码书写依据。

---

## 5. 已知边界

- `mes-online-check` 依赖 `fixtures/mes_compile_schema.sql` 的时效；快照由 5432 生成，若 5432 本身结构与迁移定义有出入（开发库漂移），快照会带上漂移——此时应先治理 5432（迁移对齐），再同步快照。
- CI 在线编译只覆盖 `svc/mes`；其余服务的离线编译仍走根 `.sqlx` 缓存（既有决策）。
- `--clean` 只清理“非白名单遮蔽对象”，不触碰任何 mes schema 对象与业务数据。
