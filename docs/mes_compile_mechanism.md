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
| 5 | **代码模式错误**：在 `DateTime<Utc>` 上调用不存在的 `.and_utc()`（chrono 0.4.45 仅 `NaiveDateTime` 有此方法）、在非 Option 类型上调 `.unwrap_or_default()`、目标 Option 字段直接赋裸值（缺 `Some` 包装） | 在线实测 474 错；会话声称"1→0"但每次提交只修少量错误（8→5→1→0），初始错误总量远超其计数（离线假象延续） | 在线编译守卫 + 按报错行精确修复（详见 §3.6） |

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
cd /Users/xingzhai/TOPEMS
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
   - **`and_utc` 处置**：先确认调用对象的类型——`NaiveDateTime::and_utc()` 是 chrono 0.4.31+ 合法 API（保留）；`DateTime<Tz>::and_utc()` 在 chrono **0.4.45（当前最新）中不存在**（编译错误 `method not found in DateTime<Utc>`）——若对象已是 `DateTime<Utc>`，直接删 `.and_utc()`（语义等价）；若要转换时区用 `.with_timezone(&Utc)`。
   - **`unwrap_or_default` 处置**：该方法只属于 `Option`——对 String/DateTime/i32/Uuid 等非 Option 调用是编译错误，直接删调用（值已存在，等价取值）；不要改字段类型去迁就错误调用。
   - **E0308 处置**：目标字段 `Option<X>` 而源值是裸 `X` → 包 `Some(...)`（编译器 help 通常直接给出）；反向（目标非 Option、源 `Option<X>`）→ 按业务语义解包。逐处判断，禁止整文件无脑 sed。
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

### 3.6 2026-09-23 事件复盘：chrono API 误用 + Option 误用（474 错根因）

**事件**：TRAE 连续 5 个提交声称 mes 编译"8→5→1→0 全部修复"，但按在线配方实测仍有 **474 个错误**（E0599×328 + E0308×149）。

**根因三层**（全部为代码模式错误，与数据库漂移无关）：

1. **`DateTime<Utc>::and_utc()` 不存在**（136 处）：chrono **0.4.45 已是 crates.io 最新版**，源码中只有 `NaiveDateTime::and_utc`；`DateTime<Tz>` 上无此方法。TRAE 按"新 chrono"假设书写，所有环境都无法编译。
2. **非 Option 上调 `.unwrap_or_default()`**（127 处）：TRAE 把字段改成非 Option（String/DateTime/i32/Uuid）后，调用处未同步——`unwrap_or_default` 只属于 `Option`。
3. **E0308 类型不匹配**（~285 处，其中 149 个为原始计数）：目标结构体字段 `Option<X>` 直接赋裸值 `X`（缺 `Some` 包装），及少量反向（目标非 Option、源 `Option<X>`）。

**为什么"声称 1→0"与实际 474 错矛盾**：TRAE 的修复提交（`8e7bee0ae`/`40778b8ae`/`ecab85a9a`/`7e2f4702f`/`013d02b10`）每次只改 1-2 处（如 work_order.rs 单行），其错误计数（8→5→1→0）只覆盖他遇到的少量错误，而初始错误总量远超其计数——"编译通过"结论建立在离线缓存/局部编译假象上（与"红线六次恢复"同根）。**任何"错误数递减"的提交记录都不能作为编译通过的证据，必须以在线配方实测为准。**

**修复方法**（按"以远端修改为主、保持 TRAE 意图、最小修复"原则）：

| 步骤 | 处理 | 数量 |
|---|---|---|
| 1 | 从编译错误清单提取 `.and_utc()` 报错行（`method not found in DateTime<Utc>`）→ 按行删除；**保留** `NaiveDateTime::and_utc()` 合法调用（测试等 101 处） | 136 |
| 2 | 提取 `unwrap_or_default` 报错行（非 Option）→ 按行删除调用（等价取值） | 127 |
| 3 | 剩余 E0308 按编译器建议逐处修复：目标 `Option<X>` 赋裸值 → `Some(x)`；反向 → 按语义解包 | ~285 |
| 4 | 在线配方循环验证 → **0 error** → release build → 重启 mes（health 由 degraded 恢复 healthy） | — |

**教训**：
- 编译通过的唯一证据是**在线配方**（`rm .sqlx` + `DATABASE_URL` + `SQLX_OFFLINE=false` + `MES_FORCE_ONLINE=1` + `cargo check --lib`）0 error；不接受会话自述的"本地通过/错误归零"。
- 修改 mes 代码时保持既有类型契约：字段是 `Option` 就用 `Option` 方法（`unwrap_or_default`/`map`），是裸值就直接用，不混用。
- chrono 时间转换：`DateTime<Utc>` 已是 UTC 直接使用；`NaiveDateTime` → UTC 用 `.and_utc()`；任意时区 → UTC 用 `.with_timezone(&Utc)`。
- 大规模修复优先按**编译错误行号精确处置**（提取 `--> file:line` 批量处理），避免整文件正则替换破坏合法调用（本次曾误删 101 处 `NaiveDateTime::and_utc` 导致 E0308 反增，回滚后按行重做）。

### 3.7 2026-09-25 事件复盘：统一时间类型重构收尾（38 错 → 0，含 SQL 字符串污染）

**事件**：重构提交（2d62501ec 等）用脚本批量替换把时间字段 `String→DateTime<Utc>`、删除 `.to_rfc3339()`，脚本误伤了**函数定义、SQL 字符串、测试代码**，遗留 38 个离线编译错误；按在线配方进一步暴露 SQL 污染与缓存陈旧类型错误。

**修复账目**（离线 38 → 0，加 3 轮在线暴露、1 轮测试暴露）：

| 阶段 | 错误 | 处理 |
|---|---|---|
| 离线 20 | 8 处 `fn (dt: Option<DateTime<Utc>>).unwrap_or_default() -> String` 函数定义被改坏 | 恢复为 `fn datetime_to_string(...)`；补 struct 初始化缺失逗号 |
| 离线 74 | E0308：时间字段 Option 映射 / `.map(…to_rfc3339())` / 缺 `Some` 包装 / 直传 | 按编译器行号批量修（8 模块） |
| 离线 4 | E0599：括号内尾逗号成 1 元组 `.flatten(),` | 去尾逗号 |
| 离线 17 | sqlx 缓存缺失 | `topems.sh mes-guard --prepare` 在线生成（+165 缓存，根 .sqlx 306） |
| 在线 7 | 6 处 SQL 字符串内 Rust 表达式 + equipment.rs:1198 类型不符 | 见下方教训 1/2 |
| 在线 3 | 2 处非 Option 上 `.unwrap_or_default()` + 1 处 `Option<DateTime<Utc>>` → `Option<String>` | 按在线行号修 |
| 测试 23 | cfg(test) 中 `datetime_to_string(Some(dt))` 被替换成 `(Some(dt)).unwrap_or_default()` 等 | 还原函数调用（9 文件） |

**新教训（在 §3.6 之外新增）**：

1. **脚本替换误伤 SQL 字符串（重构前遗留的潜在 bug，仅在线暴露）**：批量替换把 `alias.created_at` 变成 `alias.created_at.unwrap_or_default()` 混进 `r#"..."#` SQL（8 模块 30 处，如 `SELECT pr.created_at.unwrap_or_default(), …`）。离线被缓存掩盖（缓存命中即不解析 SQL）；在线解析报 **`cross-database references are not implemented: pr.created_at.unwrap_or_default`**。修复只作用于 SQL 原始字符串块内、模式 `别名.created_at/updated_at.unwrap_or_default()` → 还原为纯列名；**别名可能大写**（`EXCLUDED.updated_at`，小写正则会漏，需大小写不敏感扫描）。运行时查询（`sqlx::query`）不参与 prepare，污染会潜伏到接口调用才 500，必须全量扫描所有 SQL 块清除（含 settings.rs 的 `ON CONFLICT … DO UPDATE SET updated_at = EXCLUDED.updated_at` 这类）。
2. **离线缓存类型陈旧 → 仅在线错误**：离线 0 错不代表在线 0 错——根 `.sqlx` 缓存可能把列类型缓存错（如 `product_code` 缓存为 `Option<String>` 而真库 NOT NULL → 在线报 `unwrap_or_default on String`；`approved_at` 缓存为 `Option<String>` 而真库 `Option<DateTime<Utc>>` → 在线 E0308）。**修完离线错误必须跑 prepare 暴露并修复在线错误**，再跑守卫。
3. **sqlx 连接串 search_path 形态**：直接调 `mes_guard.sh` 若传 `?search_path=mes,public`（libpq 形态）sqlx 不认 → 在线编译报 169 个 `relation "equipment" does not exist`（曾误以为 `--clean` 删坏了库）。**必须用 `?options=-csearch_path=mes,public`**；规范入口 `scripts/topems.sh mes-guard` 已内置，勿绕过。
4. **`--clean` 与 169 错无关**：public 遮蔽表（本次 38 张）清理后 mes schema 自身完整（40 表齐全），169 错是 URL 形态问题。遮蔽表是查询的"兜底"而非唯一来源，search_path 生效时不会命中它们。
5. **`cargo check --lib` 通过 ≠ `cargo test --lib` 能编译**：重构脚本同样改坏了 cfg(test) 测试代码（23 错），收尾必须跑 `cargo test -p topems-mes --lib`（本次 453 passed / 0 failed）。
6. **编译失败时的 unused import 警告不可信**：在线编译失败（169 错）状态下 rustc 会把实际被用的 import 报为 unused（如 `BigDecimal`/`NaiveDateTime`/`FromStr`），按警告删除会引入 E0425/E0599 倒退。**只在 0 error 后处理警告，逐条按编译器点名的名字删除、改完复跑**。

**收尾顺序（本次实测，建议固化）**：修离线错 → `topems.sh mes-guard --prepare`（暴露在线错）→ 修在线错 → 守卫 PASS → 0 error 后清理 warnings → `cargo test -p topems-mes --lib` → 提交（源码 + 根 .sqlx；结构变更时快照同批或紧随提交）。

**提交**：`f27647794`（修复 + 缓存 + 测试代码）；快照另行同步提交。

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
