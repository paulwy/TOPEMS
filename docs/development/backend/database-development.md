# TOPEMS 数据库开发规范（V1.0）

> 背景：`svc/gis` 曾因存量库 `gis.geofences` 表缺少后续新增的 `chat_id` 列，导致服务启动后查询立刻崩溃。根因是代码里使用 `CREATE TABLE IF NOT EXISTS`，对**已经存在的旧表**不会做任何结构修改，后续代码迭代加列时老库没有任何机制自动补齐。
>
> 本文档是项目级的**强制执行规范**：以后任何服务新增/修改列必须遵守本规范，杜绝 chat_id 类问题再次发生。

---

## 1. 两种建表路径的正确职责分工

TOPEMS 目前存在两种建表方式，**各司其职，不可替代**：

| 路径 | 位置 | 职责 | 执行时机 |
|------|------|------|----------|
| **A. 迁移文件** | `svc/<plugin>/migrations/YYYYMMDDHHMMSS_<description>.sql` | **唯一的增量版本化真实来源（SSOT）**。新表创建、旧表加列、改约束、数据回填、回滚 SQL 都必须写在这里。 | 运维部署时 `sqlx migrate run` 或 `scripts/topems.sh db migrate` 按序执行 |
| **B. 代码内表定义** | `svc/<plugin>/src/models/mod.rs` 或 `svc/<plugin>/src/db/schema.rs` 里的 `CREATE TABLE IF NOT EXISTS` | **新环境一键启动兜底**（本地开发、单测临时库、全新 demo 安装可以不跑 A 直接把最基础表建好）+ **启动时 schema 一致性自检** | 服务启动时 `init_database()` 调用 |

> ⚠️ **禁止只写 B 不写 A。** 加列如果只放进代码的 `CREATE TABLE IF NOT EXISTS`，存量库（CREATE 已经成功过）永远不会加这个列，线上一升级就炸锅——这就是 gis.chat_id 事故根因。

---

## 2. 新增列的「两处同步」强制流程

假设业务要给 `qa_ehs_trainings` 表新增 `tenant_id UUID` 列：

### Step 1 — 先写迁移文件（路径 A）

```bash
# 在对应服务目录下
cd svc/ehs
sqlx migrate add add_tenant_id_to_trainings
# 生成 migrations/20260812120000_add_tenant_id_to_trainings.sql
```

编辑 SQL：
```sql
-- Up
ALTER TABLE qa_ehs_trainings ADD COLUMN IF NOT EXISTS tenant_id UUID;
CREATE INDEX IF NOT EXISTS idx_ehs_trainings_tenant_id ON qa_ehs_trainings(tenant_id);

-- Down（如果项目要求写可回滚 SQL）
-- ALTER TABLE qa_ehs_trainings DROP COLUMN IF EXISTS tenant_id;
```

提交后 GitHub Actions 的 `migration-test.yml` 会自动验证：
- 在干净 Postgres 上 apply → reset → replay，确保幂等；
- checksum 存进 `_sqlx_migrations` 表，日后谁改文件里的 SQL 立刻被检测到。

### Step 2 — 同步更新代码里的两处位置（路径 B）

在 `svc/ehs/src/models/mod.rs`（或 `svc/*/src/db/schema.rs`）：

1. `CREATE TABLE IF NOT EXISTS xxx (...)` 里加上 `tenant_id UUID,` （给新库兜底）。
2. 同文件顶部的 **`TABLE_DEFS` 单一事实源常量** 对应表条目里追加一行：
   ```rust
   ("tenant_id", "UUID"),
   ```

`TABLE_DEFS` 会**自动派生**后续两步：
- 阶段 1 `ensure_table_columns()`：用 `ALTER TABLE ... ADD COLUMN IF NOT EXISTS` 对老库补列（纯 no-op 若已存在）；
- 阶段 2 `verify_table_columns()`：从 `information_schema.columns` 拉实际列清单，和 `["id"] + TABLE_DEFS 列名` 做 BTreeSet 比对——**任何缺失立即 `tracing::warn!` 打红线**，不等业务请求炸堆栈。

以后新增列**只要同步 Step 2 的两处**，后面补丁+自检不用手工维护（自动派生）。

---

## 3. TABLE_DEFS 单一事实源模板

参考 `svc/gis/src/db/schema.rs` 顶部实现。每个服务的数据库初始化文件都必须具备以下四件套：

```rust
use sqlx::PgPool;
use std::collections::BTreeSet;

// ---------- (1) 服务默认 schema ----------
pub const SERVICE_SCHEMA: &str = "ehs";

// ---------- (2) TABLE_DEFS：列定义的单一事实源 ----------
// 每张表一行：(table_name, &[(col_name, col_ddl_fragment), ...])
//  不含 PRIMARY KEY 的 id 列（所有表统一约定 id PK，verify 阶段自动拼 "id"）。
//  col_ddl_fragment 必须与上方 CREATE TABLE 对应列的 TYPE/DEFAULT/NOT NULL/REFERENCES 完全一致。
pub const TABLE_DEFS: &[(&str, &[(&str, &str)])] = &[
    ("qa_ehs_risks", &[
        ("name", "VARCHAR(255) NOT NULL"),
        ("level", "VARCHAR(50) NOT NULL DEFAULT 'medium'"),
        ...
    ]),
    // ...其它所有表按此格式
];

// ---------- (3) 三个辅助函数：add_column_if_missing / ensure_table_columns / verify_table_columns ----------
// （直接复制 svc/gis/src/db/schema.rs 顶部同名函数即可）

// ---------- (4) init_database 末尾派生两阶段 ----------
pub async fn init_database(pool: &PgPool) -> Result<(), sqlx::Error> {
    // 一、原始 CREATE TABLE IF NOT EXISTS + CREATE INDEX IF NOT EXISTS（给全新库兜底）
    sqlx::query("CREATE TABLE IF NOT EXISTS qa_ehs_risks (...)").execute(pool).await?;
    // ...

    // 二、阶段 1：增量迁移（TABLE_DEFS 派生）老库缺列自动补
    let mut tables = 0usize;
    let mut cols = 0usize;
    for (tbl, cols_arr) in TABLE_DEFS {
        let n = ensure_table_columns(pool, Some(SERVICE_SCHEMA), tbl, cols_arr).await?;
        tables += 1;
        cols += n;
    }
    tracing::info!(
        "[ehs schema 补丁] {} 张表 / {} 列 ADD COLUMN IF NOT EXISTS 执行完毕（已存在列 no-op）",
        tables, cols
    );

    // 三、阶段 2：自检（TABLE_DEFS 派生）有缺失就 WARN
    for (tbl, cols_arr) in TABLE_DEFS {
        let mut expected: Vec<&str> = Vec::with_capacity(1 + cols_arr.len());
        expected.push("id");
        for (c, _) in *cols_arr { expected.push(*c); }
        verify_table_columns(pool, SERVICE_SCHEMA, tbl, &expected).await?;
    }

    tracing::info!("✅ EHS 数据库表初始化完成（含增量迁移补丁 + schema 自检）");
    Ok(())
}
```

---

## 4. 账号与环境变量分离（生产硬要求）

`.env` 中必须同时设置：

| 变量 | 账号权限 | 用途 |
|------|------|------|
| `MIGRATION_DATABASE_URL=postgres://migration_admin:<pw>@...` | SUPERUSER / 能 CREATE SCHEMA / ALTER TABLE / CREATE EXTENSION | 仅部署阶段 `sqlx migrate run` 或 `topems.sh db migrate` 使用 |
| `DATABASE_URL=postgres://app_user:<pw>@...` | 仅 `SELECT/INSERT/UPDATE/DELETE/REFERENCES` 业务 CRUD | 服务运行时连接池使用 |
| `MIGRATION_RUN_ON_STARTUP=false` | — | 生产永远设 `false`，避免 10 个实例同时启动抢迁移锁导致死锁；本地开发可设 `true` |

---

## 5. CI / PR 流程要求

`.github/workflows/migration-test.yml` 覆盖范围：

- ✅ `paths` 已包含 `svc/**/migrations/**` → 改动迁移文件触发 up/replay 验证。
- ✅ （V1.0 新增）`paths` 还要包含 `svc/*/src/models/**` 和 `svc/*/src/db/schema.rs` → 改动代码里的表结构定义，同样强制触发迁移校验 + schema 自检脚本。
- ❌ 禁止在 PR 里「只改 models/ 代码不改 migrations/」——CI 会通过 `information_schema 自检脚本`抓出不一致并打红。

---

## 6. 违规检查清单（PR Review 必对照）

任何涉及数据库列变更的 PR，reviewer 逐项确认：

- [ ] **Step 1（迁移 SQL）**：`svc/<plugin>/migrations/` 目录下有新的 `.sql` 文件，且 `ALTER TABLE ... ADD COLUMN IF NOT EXISTS` 语句带 `IF NOT EXISTS`。
- [ ] **Step 2-1（CREATE TABLE）**：代码里的 `CREATE TABLE IF NOT EXISTS` 文本已经同步加了新列。
- [ ] **Step 2-2（TABLE_DEFS）**：同服务的 TABLE_DEFS 常量里追加了 `("列名", "列DDL片段")`。
- [ ] **启动日志验证**：本地或 staging 跑一次服务，确认：
  - `[xxx schema 补丁] ... 张表 / ... 列` 日志打印正常；
  - **没有任何 `仍缺失 ... 列` 的 WARN**。

---

## 附录 A：28 服务覆盖率追踪表（V69.2 真实状态，可运行 `./scripts/topems.sh db defense-check-all` 复核）

| 批次 | 服务 | 路径A（migrations） | 路径B-1（CREATE TABLE） | 路径B-2（TABLE_DEFS + ensure + verify） | 最终合规 |
|:---:|------|:---:|:---:|:---:|:---:|
| 第1批✅ | **gis** | ✅ 4份 | ✅ 18表 | ✅ 今日落地（V69.1 首发） | ✅ |
| 第1批✅ | **ehs** | ⚠️ 3份（缺） | ✅ 43表 | ✅ 今日落地（models/mod.rs 内联） | ✅ |
| 第1批✅ | **portal** | ✅ 4份 | ✅ 115表（20文件） | ✅ 今日落地（models/schema_defense.rs，1057行） | ✅ |
| 第1批✅ | **finance** | ✅ 11份 | ✅ 66表（v51/v54-60） | ✅ 今日落地（models/schema_defense.rs，794行） | ✅ |
| 第2批🏃 | analytics | ✅ 4份 | ✅ 18表 | ❌ 待生成 TABLE_DEFS | 🏃 P2-B |
| 第2批🏃 | ai | ✅ | ✅ | ❌ 待生成 TABLE_DEFS | 🏃 P2-B |
| 第2批🏃 | unified-core | ✅ 5份 | ✅ 31表 | ⚠️ 部分 ADD，缺 verify 自检 | 🏃 P2-B |
| 第2批🏃 | erp | ✅ 15份 | ✅ 8表 | ❌ 待生成 TABLE_DEFS | 🏃 P2-B |
| 第2批🏃 | hrm | ✅ | ✅ | ❌ 待生成 TABLE_DEFS | 🏃 P2-B |
| 第2批🏃 | crm | ✅ | ✅ | ❌ 待生成 TABLE_DEFS | 🏃 P2-B |
| 第2批🏃 | pm | ✅ | ✅ | ❌ 待生成 TABLE_DEFS | 🏃 P2-B |
| 第2批🏃 | scm / wms / srm | ✅ | ✅ | ❌ 待生成 TABLE_DEFS | 🏃 P2-B |
| 第2批🏃 | pdm / mes | ✅ | ✅ | ❌ 待生成 TABLE_DEFS | 🏃 P2-B |
| 第3批📅 | mobile / master-data | ✅ | ✅ | ❌ 待生成 TABLE_DEFS | 📅 V69.3 |
| 第3批📅 | search / communication / billing | ✅ | ✅ | ❌ 待生成 TABLE_DEFS | 📅 V69.3 |
| 第3批📅 | ticket / feedback / lowcode | ✅ | ✅ | ❌ 待生成 TABLE_DEFS | 📅 V69.3 |
| 合计 | 28 服务 | — | 约 800 表 | **4/28 = 14.3%** → 目标 28/28 = 100% | — |

> **一键推进脚本**：`./scripts/topems.sh db defense-check-all` 自动 grep 所有服务启动日志的 `[xxx schema 自检]` 段，0 WARN 标绿✓，有缺列 WARN 标黄⚠，编译/启动错误标红✗，退出码：0=全通过，1=有警告，2=有错误。

---

## 附录 B：IF NOT EXISTS 失效根因图解

```
      代码迭代：给 geofences 表加 chat_id 列
                 │
                 ▼
    代码里写了 CREATE TABLE IF NOT EXISTS geofences
    ( id UUID PRIMARY KEY,          ← 原有
      name VARCHAR(255) NOT NULL,   ← 原有
      chat_id UUID )                ← 本次新增
                 │
                 ├── 全新环境（new DB）执行
                 │     CREATE TABLE 成功 ✓
                 │     chat_id 列被创建 ✓
                 │     （这就是为什么 demo / 新安装 永远测不出问题）
                 │
                 └── 存量环境（old DB）升级
                       CREATE TABLE IF NOT EXISTS 检测到表已存在
                       → 整句 SQL 直接跳过，不做任何列对比！
                       → 新增的 chat_id 列永远不会被加入
                       → 后续 SELECT chat_id WHERE ... 立刻炸锅 💥
                              ↑
                              这就是 2026-08-12 gis.chat_id 事故根因
```

**为什么 `CREATE TABLE IF NOT EXISTS` 不能做增量迁移？**

`IF NOT EXISTS` 是 **"表级"全有或全无判断**，没有"列级"对比能力。它只回答："这张表存在吗？不存在→整表创建。存在→**什么都不做**。"
所以它只能用于"从零启动兜底"，**绝不能**替代 ALTER TABLE 增量迁移。

**正确模式（四件套，两阶段）：**

```
       ┌─────────────────────────────────────────────────┐
       │  路径A migrations/*.sql（运维部署时跑一次）       │
       │    ALTER TABLE t ADD COLUMN IF NOT EXISTS c …   │  ← 版本化真实源
       └─────────────────────────────────────────────────┘
                           ▲ 强依赖
                           │
       ┌─────────────────────────────────────────────────┐
       │  路径B 代码防御（服务启动每次都跑）                │
       │  阶段1 ensure: 逐列 ALTER TABLE ADD IF NOT EX.  │  ← 兜底补齐
       │  阶段2 verify: information_schema.columns对比    │  ← 缺列告警
       └─────────────────────────────────────────────────┘
```

路径B的阶段1是**路径A的幂等镜像**（即使A漏跑，B也能兜底），但A仍然是**唯一版本化真相源**——因为阶段1无法处理改类型/删列/加约束这类破坏性变更，只能处理「加列」这一种最常见安全场景。

---

## 附录 C：常见 FAQ

**Q1：TABLE_DEFS 的列定义为什么不写 PRIMARY KEY / UNIQUE / REFERENCES / CHECK？**
因为 `ALTER TABLE ADD COLUMN IF NOT EXISTS` 执行时，这些约束在列级语法中很多不可用（例如 REFERENCES 需要表级 ADD CONSTRAINT），而且 PRIMARY KEY 的 id 列统一由 CREATE TABLE 创建。阶段1的 ensure 目标只有一个：**补齐列存在性**。约束完整性由路径A的迁移 SQL 负责版本化落地。

**Q2：路径B阶段2的 verify_table_columns 为什么只检查「TABLE_DEFS 声明过的列 + id」，不反向检查 DB 里有但代码没声明的列？**
反向检查会把「暂未迁移的老列 / 废弃兼容列 / DBA 手工加的调试列」全部误报。TABLE_DEFS 作为 SSOT 只保证**代码用到的列一定在库里存在**（即预防 chat_id 类崩溃），不负责反向审计库内冗余列——那属于 DBA 定期清理任务，不在本规范覆盖范围。

**Q3：自检时发现某张表完全不在对应 schema 里怎么办？**
`information_schema.columns` 会返回 0 行，expected 里所有列（包括 id）全部进 missing 清单 → 宽松模式 WARN，严格模式 panic。这通常意味着：①路径A的迁移 SQL 没跑 ②路径B的 CREATE TABLE 从未执行 ③表被 DBA 意外 DROP。按日志修复即可。

**Q4：SCHEMA_DEFENSE_VERIFY_STRICT=true/false 分别什么时候用？**
- **false（默认）**：本地开发 / 演示环境 / 回归压测。缺列仅 WARN 不阻塞，让你先把别的功能跑起来。
- **true**：CI 门禁（GitHub Actions / Jenkins）/ 生产发布前冒烟。`./scripts/topems.sh db defense-check gis ehs portal finance` 启动后会自动 grep WARN，0 WARN=通过；任何 1 列缺失都会 panic 返回非 0 exit，直接让流水线标红阻断发布。

**Q5：为什么把三函数 + 两阶段入口抽到 `shared-db::schema`，不直接让每个服务内联写？**
内联写法的后果：ehs（43表）~80行、portal（115表）~110行、finance（66表）~90行 —— 28服务就是 28×100 = **2800 行重复代码**，后续改一处错误模式需要同步改 28 次非常容易漏。抽到 `shared-db` 后每个服务只需写：① SERVICE_SCHEMA ② TABLE_DEFS ③ 调用 `run_schema_defense(pool, schema, TABLE_DEFS, service_tag)`。三函数只在一个地方存在 = 修 bug / 加模式 = 一次生效全覆盖。

---

## 附录 D：原反模式表（保留供 Reviewer 对照）

| 反模式 | 后果 | 正确做法 |
|--------|------|----------|
| 只在 `CREATE TABLE IF NOT EXISTS` 里加列，没写 migration SQL | 老库永不加列 → 生产报错 | 先 SQL → 后代码（两处同步） |
| migration SQL 不加 `IF NOT EXISTS` | 重跑迁移或升级冲突报错 | `ALTER TABLE ... ADD COLUMN IF NOT EXISTS` / `CREATE INDEX IF NOT EXISTS` |
| 修改已有 migration SQL 内容 | sqlx checksum 不通过 → 部署卡住 | **新建下一个时间戳文件**做变更，永远不修改已应用的 migration |
| 多个服务共用 1 份 migration 目录 | 交叉依赖、升级次序混乱 | 每个 `svc/<plugin>/migrations/` 自己独立（当前正确） |
| 启动时跳过 schema 自检 | 回归 chat_id 类问题 | 必须保留 `verify_table_columns`，且日志里的 WARN 要被监控系统抓成告警 |

---

## 7. SQLX_OFFLINE 离线缓存重建 SOP（无 DB 环境手工生成）

### 7.1 背景

`sqlx::query!` / `query_scalar!` 等**编译时宏**有两种校验方式：
1. **在线模式（默认）**：编译时连接 `DATABASE_URL` 指定的 PG，向服务器提交 `DESCRIBE`，验证 SQL 语法、参数类型、返回列类型。
2. **离线模式（`SQLX_OFFLINE=true`）**：跳过真实 DB 连接，直接读取 `.sqlx/query-<SHA256>.json` 缓存文件，用缓存里的 `describe` 结果完成编译时校验。

**何时需要重建缓存**：
- 新增或修改了 `sqlx::query!` / `query_as!` / `query_scalar!` 宏的 SQL 文本；
- 修改了 SQL 中引用的表结构（列增删 / 列类型变更）；
- CI 或本地编译报错：`no cached data for query "..."` 或 `cache hash mismatch`。

---

### 7.2 方式 A：有 DB 环境（推荐）

**前置条件**：PostgreSQL 可达，`DATABASE_URL` 指向的数据库已应用全部 migrations（`sqlx migrate run` 成功）。

```bash
# 1. 应用全部迁移
sqlx migrate run --source database/migrations
# 或分服务：
# sqlx migrate run --source svc/mes/migrations --database-url postgres://...

# 2. 生成全 workspace 缓存（含 unit tests / integration tests / examples）
cargo sqlx prepare --workspace --database-url "$DATABASE_URL"
# 等价于 sqlx-cli 0.8+:
# cargo sqlx prepare --check --all-targets -- --database-url ...

# 3. 验证文件数（mes 集成测试约需 ≥287，permissions 约需 ≥20）
find .sqlx -name "query-*.json" | wc -l

# 4. 提交缓存文件（注意强制 LF 行尾，见第 7.4 节）
git add .sqlx/query-*.json
```

**CI 参考**：`.github/workflows` 的 `sqlx-prepare` job 已固化以上步骤。

---

### 7.3 方式 B：无 DB 环境（手工生成，仅限紧急）

> 适用场景：本地无 Postgres、无法启动 Docker、但 CI 在即、需要 `cargo check --workspace --tests` 通过。
> 风险：需要对 SQL 语义和 PG 类型系统非常熟悉，写错任何一处类型 → 运行时 panic。**有条件就用方式 A。**

#### Step 1 — 定位缺失缓存的查询

```powershell
$env:SQLX_OFFLINE='true'
cargo check -p <package> --tests 2>&1 | Select-String "no cached data for query"
```

输出示例：
```
error: no cached data for query "SELECT count(*) FROM plugin_crm.customers WHERE tenant_id = $1"
  --> svc/crm/src/modules/dashboard.rs:42:5
```

记下：**文件、行号、SQL 文本**。

#### Step 2 — 计算查询的 SHA256 哈希

`.sqlx/query-<hash>.json` 文件名的 `<hash>` 是对「SQL 文本」做 SHA256（小写十六进制，64 字符）。

**注意**：SQL 文本必须**逐字节匹配**源码中传入宏的字面量（含换行、空格、参数占位符 `$1`、前导/尾随空白）。

```powershell
# PowerShell 计算 SHA256
$sql = 'SELECT count(*) FROM plugin_crm.customers WHERE tenant_id = $1'
$bytes = [System.Text.Encoding]::UTF8.GetBytes($sql)
$sha = [System.Security.Cryptography.SHA256]::Create()
$hash = -join ($sha.ComputeHash($bytes) | ForEach-Object { $_.ToString("x2") })
$hash
# 输出类似：a1b2c3d4e5f6...（64 hex chars）
```

#### Step 3 — 编写缓存 JSON 文件

缓存文件路径：`.sqlx/query-<hash>.json`

**模板结构**（`query_scalar!` 返回单列）：
```json
{
  "describe": {
    "columns": [
      {
        "name": "count",
        "ordinal": 0,
        "type_info": "Int8",
        "type_info_obj": {
          "kind": "simple",
          "name": "int8"
        }
      }
    ],
    "parameters": {
      "Left": ["Uuid"]
    },
    "nullable": [false]
  },
  "query": "SELECT count(*) FROM plugin_crm.customers WHERE tenant_id = $1",
  "db_name": "PostgreSQL"
}
```

**模板结构**（`query!` 返回多列 / 无返回列）：
```json
{
  "describe": {
    "columns": [
      {
        "name": "id",
        "ordinal": 0,
        "type_info": "Uuid",
        "type_info_obj": { "kind": "simple", "name": "uuid" }
      },
      {
        "name": "tenant_id",
        "ordinal": 1,
        "type_info": "Uuid",
        "type_info_obj": { "kind": "simple", "name": "uuid" }
      },
      {
        "name": "created_at",
        "ordinal": 2,
        "type_info": "Timestamptz",
        "type_info_obj": { "kind": "simple", "name": "timestamptz" },
        "nullable": true
      }
    ],
    "parameters": {
      "Left": ["Uuid", "Varchar", "Int8"]
    },
    "nullable": [false, false, true]
  },
  "query": "INSERT INTO plugin_xxx ... RETURNING id, tenant_id, created_at",
  "db_name": "PostgreSQL"
}
```

**PG → SQLX 类型对照表**（高频）：

| PG 列类型 | SQLX type_info | Rust 侧 | nullable? |
|-----------|---------------|---------|-----------|
| `UUID` | `"Uuid"` | `Uuid` | false（有 NOT NULL）/ true |
| `VARCHAR(n)` / `TEXT` | `"Varchar"` / `"Text"` | `String` / `&str` | 同上 |
| `INT` | `"Int4"` | `i32` | 同上 |
| `BIGINT` | `"Int8"` | `i64` | 同上 |
| `BOOL` | `"Bool"` | `bool` | 同上 |
| `DECIMAL` / `NUMERIC` | `"Numeric"` | `Decimal` / `String` | 同上 |
| `TIMESTAMPTZ` | `"Timestamptz"` | `chrono::DateTime<Utc>` | 同上 |
| `DATE` | `"Date"` | `chrono::NaiveDate` | 同上 |
| `JSONB` | `"Jsonb"` | `serde_json::Value` | 同上 |
| `BYTEA` | `"Bytea"` | `Vec<u8>` | 同上 |
| `FLOAT8` | `"Float8"` | `f64` | 同上 |
| `_VARCHAR`（数组）| `"VarcharArray"` | `Vec<String>` | 同上 |

**写 JSON 的三大坑**：
1. **`parameters.Left` 顺序**：必须与 SQL 中 `$1`、`$2`……的顺序严格对应。
2. **`nullable` 长度**：必须等于 `columns` 长度。列有 NOT NULL → `false`；可能为 NULL（OUTER JOIN / 非 NOT NULL 列 / RETURNING 无约束）→ `true`。
3. **`columns[].ordinal` 从 0 开始**，顺序 = SELECT 结果的列顺序。

#### Step 4 — 强制规范：LF 行尾 + SHA256 二次验证

Windows 下编辑器可能把 JSON 存成 CRLF → 下次 `cargo sqlx prepare` 生成的缓存哈希不匹配 → 无限报错。

```powershell
# 对所有 .sqlx JSON 强制转 LF
$files = Get-ChildItem ".sqlx\query-*.json"
foreach ($f in $files) {
  $content = [System.IO.File]::ReadAllText($f.FullName)
  $content = $content -replace "`r`n", "`n"
  [System.IO.File]::WriteAllText($f.FullName, $content)
}
```

验证哈希（用上面 Step 2 的脚本比对文件名的 hash 与 SQL 文本计算值是否一致）。

#### Step 5 — 验证编译

```powershell
$env:SQLX_OFFLINE='true'
cargo check -p <package> --tests
```

- ✅ 编译通过：缓存正确。
- ❌ `expected type X found Y`：JSON 中 type_info 写错 → 回到 Step 3 修正。
- ❌ `cache hash mismatch`：SQL 文本 SHA256 算错（含空格换行差异）或文件仍为 CRLF → Step 2/4 重查。

---

### 7.4 `.gitattributes` 强制 .sqlx 文件行尾

在仓库根 `.gitattributes` 添加（推荐所有开发者共享）：

```gitattributes
.sqlx/query-*.json  text eol=lf
```

保证 Windows 下 `git checkout` 时 `.sqlx` JSON 始终保持 LF，避免行尾导致 hash mismatch。本项目已在根目录配置。

---

### 7.5 常见错误速查

| 错误信息 | 根因 | 解决 |
|----------|------|------|
| `no cached data for query "..."` | 新增查询无对应 `.sqlx/query-<sha>.json` | 方式 A（有 DB）或方式 B（手工）生成缓存 |
| `cache hash mismatch for query "..."` | ① SQL 文本与缓存时不一致（有人改了 SQL 但未重新 prepare）② JSON 存成了 CRLF | A 方式重跑 `cargo sqlx prepare`；B 方式重新算 SHA + 强制 LF |
| `expected type Uuid, found Varchar` | JSON 中 `type_info` / `type_info_obj.name` 写错 | 按 §7.3 类型对照表修正 |
| `column 'xxx': unexpected NULL` | `nullable` 全部填了 false，但该列实际可能 NULL | `nullable` 数组对应位置改 `true` |
| `parameters count mismatch` | `parameters.Left` 的元素数与 SQL 中 `$N` 的最大个数不一致 | 补全/删除多余参数类型条目 |

---

### 7.6 TOPEMS 典型缓存缺失场景

| 场景 | 处理方式 |
|------|----------|
| V474：`database_permission_store.rs` 新增 13 个 `sqlx::query!`（权限 CRUD + 查询） | 无 DB 环境，方式 B，参照 §7.3，JSON 按 UUID/Varchar/Timestamptz/Jsonb/Int4 组合手写，13 个文件一次性解决 |
| V292：`mes/tests/integration_tests.rs` 12 处 `query_scalar!` / `query!` | **更好方案**：改成非宏版本 `query_scalar::<_, Option<i64>>()` + `.bind()`，移除离线缓存依赖（集成测试本就需要真实 DB 才能运行，编译时 SQL 校验价值低，见 V292 交付说明）|
| 新增服务 `sqlx::query!` 数量 < 5 | 方式 B，手写 5 份 JSON |
| 新增服务 `sqlx::query!` 数量 > 20 | **强烈建议方式 A**，用 Docker 起 PG 跑 `cargo sqlx prepare`，避免手写 >20 份 JSON 的错误率 |

---

### 7.7 最佳实践总结

1. **有 DB 用 A，无 DB 才用 B**：手写 JSON 容易漏 nullable / 类型错，线上炸锅风险高。
2. **每次改 `query!` 宏 SQL → 必须立即重新 prepare**（方式 A）或重新生成 JSON + 哈希 + LF（方式 B）。
3. **`mes/tests/` 这类仅集成测试场景的 `query!` 宏 → 优先改为非宏版本 `query()` 移除缓存依赖**（见 V292 路径）。
4. **`.gitattributes` 强制 `.sqlx/*.json = LF`**（项目已配置），避免跨平台行尾坑。
5. **不要把方式 B 当常态**：这只是无 DB 环境的临时生存手段。后续有 PG Docker 时，建议所有方式 B 生成的缓存再用方式 A 校验一次。
