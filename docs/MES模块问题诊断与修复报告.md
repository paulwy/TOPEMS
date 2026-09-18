# TOPEMS 服务模块问题诊断与修复报告

> 本报告基于 MES 模块「生产订单新增保存报 Operation Failed / HTTP 422」问题的完整排查与修复过程复盘，将发现的
>
> **六类问题**
>
> 的根因、修复方式、验证方法逐项拆解，并给出
>
> **跨模块排查指南**
>
> ，用于指导其他服务模块（erp /scm/qms /wms/analytics /unified-core/crm /portal 等）的同类问题排查。
> 修复涉及的提交（
>
> `main`
>
>  分支）：
> `ba89fda84`
>
>  — 前端 schema 对齐 + FormBuilder 修复
> `15b773db4`
>
>  — 后端 SQL 列名对齐真实表 + FormBuilder 数字 / 空值 + workflow type
> `c386a27cd`
>
>  — 修复生产订单模块 48 个 sqlx 类型错误，编译通过
> `2ebc2d727`
>
>  — INSERT 补 tenant_id 列，修正类型推断响应字段，补充离线缓存



***

## 一、问题全景



| # | 问题                       | 现象                                                                            | 根因                                                        | 修复提交          |
| - | ------------------------ | ----------------------------------------------------------------------------- | --------------------------------------------------------- | ------------- |
| 1 | 前端 422（Operation Failed） | 生产订单新增表单保存报错                                                                  | 前端 schema 与后端 DTO 不一致（缺必填字段）；FormBuilder number 字段以字符串提交  | `ba89fda84`   |
| 2 | SQL 列名张冠李戴               | 查询 / 写入报列不存在                                                                  | 对 `production_orders` 表使用了 `sales_orders` 的列名             | `15b773db4`   |
| 3 | 编译死结                     | 改 SQL 后超百起 `no cached data`                                                   | build.rs 强制离线 + sqlx-cli 与宏版本不匹配 + Windows 下 prepare 脚本失灵 | 方法论修复（见 §4.3） |
| 4 | sqlx 宏类型推断错误（48 个）       | `cargo check` 大量类型错误                                                          | 宏根据 SQL / 缓存推断的 Rust 类型与实际代码不匹配                           | `c386a27cd`   |
| 5 | 运行态：旧二进制 + 缺列约束          | 500：`column "order_number" does not exist`、`null value in column "tenant_id"` | 启动脚本用旧 release 二进制；INSERT 缺 NOT NULL 列                    | `2ebc2d727`   |
| 6 | 离线缓存缺失（2 个）              | 离线编译 `no cached data`                                                         | SQL 变更后缓存 hash 失配，prepare 流程在 Windows 不可用                 | 手工构造（见 §4.6）  |



***

## 二、问题 1：前端 422（Operation Failed）

### 现象

生产订单「新增订单」表单保存时返回 `Operation Failed / Request failed with status code 422`，刷新后依旧。

### 根因（三层叠加）



1. **前端 schema 与后端 DTO 不一致**：前端表单 schema 缺少后端 `CreateProductionOrderRequest` 要求的必填字段（如 `product_code`），后端校验失败返回 422。

2. **FormBuilder number 字段类型错误**：`number` 类型字段以字符串提交（如 `"100"`），后端 `f64`/`i32` 反序列化拒绝字符串。

3. **后端 SQL 列名错误**（见问题 2）导致即使通过校验，执行 SQL 仍报错。

### 修复



* 前端 `apps/web/src/schemas/mes/productionOrder.ts`：schema 字段与后端 DTO 对齐（补齐必填字段）。

* `apps/web/src/components/common/FormBuilder.tsx`：number 分支改为 `Number(raw)` 提交，提交时过滤空字符串。

* 后端 SQL 列名修复（问题 2）。

### 验证



* 用浏览器实测表单保存（admin/admin123 登录后操作）→ 表单提交不再 422。

* 直接 POST `/api/mes/orders` 验证字段类型（数字字段必须传 JSON number 而非字符串）。



***

## 三、问题 2：后端 SQL 列名与真实表结构不一致

### 现象

修复前端后，接口返回业务 500，日志出现 `column "order_number" does not exist` 等。

### 根因

`svc/mes/src/modules/production_order.rs` 中 \*\* 全部 SQL（9 个 SELECT + 2 个 INSERT + 1 个 UPDATE + 2 个 LIKE）\*\* 对 `production_orders` 表使用了 `sales_orders` 表的列名（如把 `order_no` 写成 `order_number`），属于复制粘贴其他模块 SQL 后未对照真实 DDL 修改。

### 修复（提交 `15b773db4`，共 8 个文件）



* `svc/mes/src/modules/production_order.rs`（主修复，70 行改动）

* 5 个关联模块文件（同表引用残留）：


  * `svc/mes/src/modules/material_bom/issue_handlers.rs`

  * `svc/mes/src/modules/material_bom/return_handlers.rs`

  * `svc/mes/src/modules/production_scheduling.rs`

  * `svc/mes/src/modules/wip.rs`

  * `svc/mes/src/modules/work_report.rs`

* 前端 2 个文件（FormBuilder /workflow types，同提交）

### production\_orders 真实列名（information\_schema 确认）



| 列名                                        | 类型                | 说明                    |
| ----------------------------------------- | ----------------- | --------------------- |
| `id`                                      | uuid              | PK                    |
| `order_no`                                | varchar           | 单号（不是 `order_number`） |
| `product_id`                              | uuid              | 可空                    |
| `product_name`                            | varchar           |                       |
| `product_code`                            | varchar           |                       |
| `quantity`                                | numeric           |                       |
| `completed_quantity`                      | numeric           |                       |
| `status`                                  | varchar           |                       |
| `source`                                  | varchar           |                       |
| `source_order_id`                         | uuid              |                       |
| `source_order_number`                     | varchar           |                       |
| `planned_start_date` / `planned_end_date` | timestamp（无时区）    |                       |
| `actual_start_date` / `actual_end_date`   | timestamp（无时区）    |                       |
| `workshop_id`                             | uuid              |                       |
| `notes`                                   | text              |                       |
| `created_at` / `updated_at`               | timestamp（无时区）    |                       |
| `tenant_id`                               | uuid **NOT NULL** | 租户隔离                  |
| `deleted_at`                              | timestamp         | 软删                    |

> 真实 DDL 的权威来源见 
>
> `docs/architecture/mes-schema-truth.md`
>
> （43 表 342 列，由 
>
> `scripts/verify-mes-schema-truth.mjs`
>
>  生成并做 CI 门禁）。

### 验证



```
\-- 用 information\_schema 核对列名，而不是靠迁移文件印象

SELECT column\_name, data\_type, is\_nullable

FROM information\_schema.columns

WHERE table\_name = 'production\_orders' ORDER BY ordinal\_position;
```



***

## 四、问题 3\~6：编译 / 运行态问题（本次最耗时部分）

### 4.1 背景：项目的强制离线机制

`svc/mes/build.rs` 第 10-11 行注入：



```
println!("cargo:rustc-env=SQLX\_OFFLINE=true");
```

即**所有 sqlx 宏（**`query!`**）编译时必须从离线缓存（**`.sqlx/query-<hash>.json`**）读取 describe**，不连数据库。这是项目的 CI 约束（保证无库可编译），但带来两个连锁问题。

### 4.2 问题 3：编译死结（`SQLX_OFFLINE=true but no cached data`）

**现象**：修改 SQL 后 `cargo build` 报超百起 `no cached data`，无法编译。

**根因链**：



1. 改了 SQL → 原缓存 hash 失配 → 宏要求新缓存。

2. 官方补缓存方式 `cargo sqlx prepare` 在此项目不可用：

* `sqlx-cli` 版本 0.9.0 与 `sqlx-macros` 版本 0.8.6 不兼容（prepare 协议不一致）；

* `scripts/dev/sqlx-prepare.sh` 用 `/svc/` 字符串匹配路径，在 Windows 反斜杠路径下匹配不到，脚本失灵。

1. 常规绕过手段全部无效：删 `.cargo/config.toml` 的 offline 键、改 `.env`、临时环境变量、`RUSTC_WRAPPER` 等（都盖不过 build.rs 的 `rustc-env` 注入）。

**修复方法（关键路径）**：



1. **临时注释** `svc/mes/build.rs` 中注入 `SQLX_OFFLINE` 的两行（可用脚本 `toggle_buildrs.py` 快速切换 on/off）；

2. 连库执行 `cargo sqlx prepare`（此时宏在线连库校验并**将新缓存写入&#x20;**`svc/mes/.sqlx/`）；

3. **恢复** build.rs 注入；

4. 把新缓存复制到**根目录&#x20;**`.sqlx/`（git 只追踪根 `.sqlx/query-*.json`，`svc/*/.sqlx/` 被 gitignore）；

5. 离线 `cargo check` 验证 0 错误、0 缓存缺失。

> ⚠️ prepare 是
>
> **逐 query 粒度**
>
> 写缓存的：即使其他模块因本地库缺列（如 
>
> `equipment`
>
>  等 staging 有、本地没有的表）校验失败，已通过的那些 query 缓存仍会写入。prepare 退出码非 0 时缓存仍然部分可用。

### 4.3 问题 4：48 个 sqlx 宏类型推断错误

**现象**：修好 SQL 后 `cargo check` 报 48 个 `E0308` 类型不匹配（集中在 `production_order.rs`）。

**根因**：sqlx 宏按 SQL 与 describe 推断 Rust 类型，代码 bind / 读取类型必须与推断一致。本次涉及的真实规则：



| 场景                        | 宏推断                   | 代码正确写法                                                                                   |
| ------------------------- | --------------------- | ---------------------------------------------------------------------------------------- |
| 绑定 `timestamp`（无时区）列      | `NaiveDateTime`       | `datetime.naive_utc()`（不要传 `DateTime<Utc>`）                                              |
| 绑定 `now` 到 timestamp 列    | `NaiveDateTime`       | `now.naive_utc()`                                                                        |
| RETURNING 的 `timestamp` 列 | `NaiveDateTime`（不带时区） | SQL 中 `created_at::timestamptz AS created_at` 强制为带时区，宏推断 `DateTime<Utc>`                 |
| 可空列（`nullable=true`）      | `Option<T>`           | 读取端需 `.unwrap_or_default()` 或处理 Option                                                   |
| 非空列（`nullable=false`）     | `T`（非 Option）         | 直接取值，**不能**调用 `.unwrap_or_default()`                                                     |
| `numeric` 列（UPDATE bind）  | `BigDecimal`          | `BigDecimal::try_from(v).unwrap_or_default()`（sqlx 0.4.10 无 `from_f64`，用 `TryFrom<f64>`） |
| `product_code` 可空列        | `Option<String>`      | `result.product_code.unwrap_or_default()`                                                |
| `status` 非空列              | `String`              | `result.status`（不要 unwrap）                                                               |

**关键教训**：



* 修类型错误时必须**以宏的真实推断为准**，不要凭经验猜测。验证方式：改一处 → `cargo check` → 看报错期望类型。

* `RETURNING` 子句通过 `::timestamptz AS` 强制列类型是控制宏推断的常用手段。

* 用 `touch` 修改文件时间**不会**让 cargo 重新展开宏（fingerprint 按内容哈希）—— 早期 "0 错误" 是假象。**必须真实改动文件内容**才能触发宏重展开。

**修复后**：`cargo check` 0 错误，新增 8 个离线缓存随 `c386a27cd` 提交。

### 4.4 问题 5：运行态错误（旧二进制 + 缺列约束）

**现象 A**：启动 mes 后 POST `/api/mes/orders` 返回 500，日志 `column "order_number" does not exist`——**这是旧二进制的残留**（debug 构建已新，但 `scripts/topems.sh` 固定运行 `target/release/topems-mes.exe`，是 09-17 的旧版本）。

**修复 A**：`bash scripts/topems.sh stop mes` → `build mes`（release，离线 SQLX\_OFFLINE=true）→ `start mes`。**注意 Windows 下运行中的 exe 被锁，必须先 stop 再 build**（否则 `os error 5`）。

**现象 B**：重新构建后 500，日志 `null value in column "tenant_id" ... violates not-null constraint`—— 两个 INSERT（手动建单 + ERP 转单）都缺 `tenant_id` 列。

**修复 B**（提交 `2ebc2d727`）：



* 手动建单（create）：列尾补 `tenant_id`，VALUES 补 `$10`，bind 补 `tenant_id`（取自 `claims.tenant_id`，缺省 `Uuid::nil()`）；

* ERP 转单（from\_erp）：列尾补 `tenant_id`，VALUES 补 `$12`，bind 补 `Uuid::nil()`（与该函数 `set_config` 的 nil 一致）。

SQL 变了 → 原缓存 hash 失配 → 必须补 2 个新缓存（问题 6）。

### 4.5 问题 6：手工构造 sqlx 离线缓存（方法论，可复用到其他模块）

**缓存机制**（`sqlx-macros-core-0.8.6` 源码确认）：



* 文件名 `query-<hex>.json`，其中 `<hex> = sha256(query 原文字节)`（无任何前缀 / 归一化）；

* 文件结构：`{ "db_name": ..., "query": "<SQL 原文>", "hash": "<同上 hex>", "describe": { "columns": [...], "nullable": [...], "parameters": {"Left": [...]} } }`；

* `query` 字段与宏收到的 `r#"..."#` 内容**逐字节一致**（含前导换行、缩进、LF 换行；Windows 源码经 rustc 后换行为 LF）。

**describe 关键结构**（以 production\_orders 为例）：



```
"columns": \[ {"ordinal":0, "name":"id", "type\_info":"Uuid"}, ... ],

"nullable": \[false,false,null,...],   // 长度 = columns 数；null 表示未知

"parameters": {"Left": \["Varchar","Varchar","Varchar","Int4","Timestamp",...]}
```



* `type_info` 是字符串类型名（`Uuid`/`Varchar`/`Int4`/`Timestamp`/`Text` 等）；

* `nullable` 决定宏推断 `Option<T>` 还是 `T`（`false`= 非空 = 非 Option）；

* `parameters` 的类型名需与代码 bind 的实际 Rust 类型对应（`NaiveDateTime` → `Timestamp`，`DateTime<Utc>` → `Timestamptz`，`Uuid` → `Uuid`，`i32` → `Int4`）。

**构造步骤**（脚本 `C:\Users\admin\AppData\Local\Temp\build_cache.py`）：



1. 从源码 `r#"..."#` 提取 SQL 原文（去掉行尾 `\r`、统一 LF）；

2. 复制一个同表旧缓存作为 describe 模板（RETURNING 列通常不变，只改 `query`/`hash`/`parameters`）；

3. 更新 `parameters`（新增 bind 参数的类型加在尾部）；

4. `sha256(query)` 计算文件名；

5. 同时写入**根&#x20;**`.sqlx/`**&#x20;与&#x20;**`svc/mes/.sqlx/` 两处；

6. 删除构造错误的旧文件（避免污染）。

**验证**：



```
cargo check   # 0 错误 + 0 "no cached data" 即缓存命中且类型正确
```



***

## 五、验证方法汇总



| 阶段    | 验证方式                                        | 通过标准                       |
| ----- | ------------------------------------------- | -------------------------- |
| 前端表单  | 浏览器实测保存（admin/admin123）                     | 无 422，出现成功提示               |
| 后端类型  | `cargo check --message-format=short`        | 0 error、0 `no cached data` |
| 离线缓存  | 上一条                                         | 0 `no cached data`         |
| 运行二进制 | `bash scripts/topems.sh build mes`（release） | `Finished release` 无错误     |
| 接口功能  | `POST /api/mes/orders`（Bearer token，见下）     | HTTP 200，返回订单对象            |
| 数据落库  | psql 查 `production_orders`                  | `tenant_id` 非空、日期正确        |

**登录 token 提取**（`login-resp.json` 编码混杂 GBK/UTF-8，勿直接 ConvertFrom-Json）：



```
\$t = \[IO.File]::ReadAllText('C:\Users\admin\AppData\Local\Temp\login-resp.json')

\$token = \[regex]::Match(\$t, '"access\_token":"(\[^"]+)"').Groups\[1].Value
```

**API 实测最小用例**（`POST http://localhost:8030/api/mes/orders`）：



* `{"product_name":"x","product_code":"x","quantity":100}` → 200

* 带日期：`planned_start_date` 必须传**完整 UTC 时间戳**（`2026-09-20T00:00:00Z`）；`date-only`（`2026-09-20`）会 422（后端 DTO 为 `Option<DateTime<Utc>>`；前端 FormBuilder 用 `toISOString()` 已正确）。

**其他模块启动 / 停止 / 构建**（统一入口）：



```
bash scripts/topems.sh {start|stop|restart|build|status} \<service>
```

运行中的 exe 在 Windows 被锁，**build 前必须先 stop**。



***

## 六、跨模块排查指南

### 6.1 全量扫描结论（2026-09-18 实测）

**表：各 svc 的 sqlx 使用与离线机制**



| 服务                | `query!` 宏数 | `sqlx::query()` 运行时数 | build.rs 注入 OFFLINE | `.sqlx` 目录 | 风险等级                             |
| ----------------- | ----------- | -------------------- | ------------------- | ---------- | -------------------------------- |
| **mes**           | 159         | 152                  | ✅                   | ✅          | 本次已修复                            |
| **analytics**     | 98          | 127                  | ❌                   | ❌          | **高**（大量宏，无离线缓存保护）               |
| **wms**           | 32          | 142                  | ❌                   | ❌          | **高**（宏 + 曾有 SELECT 列名 500 修复记录） |
| **unified-core**  | 16          | 240                  | ❌                   | ❌          | 中（宏较少）                           |
| **crm**           | 6           | 70                   | ❌                   | ❌          | 中低                               |
| **portal**        | 3           | 47                   | ❌                   | ❌          | 低                                |
| erp / qms / scm   | 0           | 160/149/101          | ✅（注入但无用宏）           | ❌          | 低（宏不生效，但 build.rs 注入无影响）         |
| 其余（ai/bi/ehs/...） | 0           | 各 7\~304             | ❌                   | ❌          | 运行时 SQL 风险（见 6.4）                |

> 说明：
>
> `query!`
>
>  宏在编译期由 sqlx 校验 SQL 与类型 ——
>
> **列名 / 类型错误编译期即暴露**
>
> ；
>
> `sqlx::query()`
>
>  是运行时字符串 SQL，
>
> **列名 / 类型错误只在运行时报 500**
>
> 。两类风险都要查。

### 6.2 通用排查步骤（Checklist，按此顺序执行）



1. **核对 SQL 列名与真实表结构**

* 对每个 `query!`/`query()` 涉及的表，跑 `information_schema.columns` 核对列名、类型、`is_nullable`；

* 权威来源：`docs/architecture/<module>-schema-truth.md`（如 MES 已有）；

* 特别注意**跨模块复制粘贴**的 SQL（列名张冠李戴是最高发问题）。

1. **编译期排查（仅宏模块）**



```
cargo check --message-format=short 2>&1 | Select-String 'error|no cached data'
```



* 有 `no cached data` → 走 §4.2 的 prepare 流程或 §4.6 手工构造缓存；

* 有类型错误 → 按 §4.3 表格逐项对照修复（以宏推断为准，不要猜）。

1. **确认构建产物与启动方式一致**

* `scripts/topems.sh build <svc>` 必须用 release；`start` 前确认 `target/release/topems-<svc>.exe` 是刚构建的（**Windows 先 stop 再 build**）。

1. **运行态验证**

* 启动后实测关键 API（登录 token 见 §5）；

* 500 时看日志：Windows 下 `C:\Users\admin\AppData\Local\Temp\topems-<svc>.log`；

* 常见运行态错误：NOT NULL 约束（补列或补 bind）、列不存在（旧二进制或列名错）。

1. **数据落库核验**：psql 查最近记录，确认关键列（`tenant_id`、时间戳）落库正确。

### 6.3 各模块已知注意点



| 模块                  | 已知风险点                                                                                                                          |
| ------------------- | ------------------------------------------------------------------------------------------------------------------------------ |
| **wms**             | 提交 `a7f8d6947` 已修 batch/serial\_numbers 的 SELECT 列名（`item_id`→`sku` 等）。仍建议全模块核对列名。                                             |
| **analytics**       | 98 个 `query!` 宏但无 build.rs 离线注入 —— 若引入离线约束会批量失败；当前在线编译依赖 DB 可达。                                                                |
| **unified-core**    | 240 个运行时 query，量大，建议先跑列名核对。                                                                                                    |
| **erp / qms / scm** | build.rs 已注入 SQLX\_OFFLINE 但无 `query!` 宏（注入无实际作用）；若未来改用宏需同步补缓存体系。                                                              |
| **所有模块**            | `tenant_id` NOT NULL 是公共约束（迁移 `20260710161000_add_tenant_id.sql` 等），**所有 INSERT 都必须包含 tenant\_id**—— 排查时重点 grep 各模块 INSERT 语句。 |

### 6.4 通用规则提炼（可直接用于审计其他模块）



1. **SQL 列名核对脚本**（对每个业务表执行）：



```
SELECT column\_name, data\_type, is\_nullable, column\_default

FROM information\_schema.columns

WHERE table\_name = '<表名>' ORDER BY ordinal\_position;
```



1. **grep 可疑列名模式**（跨表复制残留的典型信号）：`order_number`、`item_id`、`product_name` 等在不同表间的混用。

2. **grep INSERT 是否含 tenant\_id**：所有多租户业务表的 INSERT 都必须有 `tenant_id`（否则运行时报 NOT NULL）。

3. **timestamp 列 bind 统一用&#x20;**`.naive_utc()`（表列无时区），RETURNING 用 `::timestamptz AS` 转带时区。

4. **可空列读取用&#x20;**`.unwrap_or_default()`**，非空列直接取值**—— 以 `information_schema.is_nullable` 为准，不要猜。

5. **离线缓存**：任何 SQL 变更后必须同步缓存（根 `.sqlx/`），否则 CI / 离线编译失败；缓存 hash = `sha256(query)`，可用 §4.6 方法手工构造并验证。



***

## 七、遗留问题与后续建议



1. **XREADGROUP / XGROUP / XADD 每秒报错**（所有服务日志刷屏）：mes 连接的 Redis 是禅道自带 3.0.504，不支持 stream 命令。建议：停禅道 Redis → 启动官方 Redis（`topems-redis` 服务，需先解决服务注册 error 1073）→ 更新 `.env` 的 `REDIS_URL`（含 `pass4Redis` 密码）。**未处理，待用户决定**。

2. **本地库缺列**（如 `equipment` 等 staging 有、本地无的表）导致 prepare 无法整轮通过 —— 当前用手工缓存规避。建议：本地库按迁移补齐 staging 同构列，使 prepare 可全量通过。

3. **prepare 工具链修复**（根治）：`scripts/dev/sqlx-prepare.sh` 在 Windows 失效（路径分隔符匹配问题），建议改为跨平台路径判断；或统一 sqlx-cli 与 sqlx-macros 版本。

4. **前端 422 的原始触发**还可能是日期格式（date-only vs RFC3339）—— 后端 DTO 为 `DateTime<Utc>` 时对 date-only 输入会 422；若未来有接口需要 date-only，建议 DTO 用 `NaiveDate` 或加 serde 兼容。