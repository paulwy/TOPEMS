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
