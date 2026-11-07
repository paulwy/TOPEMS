# P3-30 · 连接池 stale prepared statement 根治 + 对账口径修正（批 39 执行记录）

- 批次：批 39（2026-11-07）
- 来源：批 38 遗留观察项与待决策项
- 原则：一步到位、口径正确、不做临时绕行；不得用「重启进程」当修复
- 结论：两项可执行遗留全部关闭；1 项维持登记（`formula_id` 不回填）；新增 1 项反向鉴权缺口登记

---

## 一、结论摘要

| 项 | 结论 |
|---|---|
| 连接池 `list_formulas` 交替 500/200 | **根因=sqlx 按连接缓存的 prepared statement 在 DDL 后失效**；已用 `statement_cache_capacity(0)` 从机制上根治，不依赖重启 |
| 热态压测 | 无参 + 3 种过滤**各 50 次共 200 次全 200、0 失败**，PID 64939 全程未变 |
| 对账口径 | `sql_declared` 改为**只扫 `database/init`**，migrations 降为独立字段 `sql_history`；`sql_declared_codes` **1087→12**、`sql_only` **92→1**、新增 `sql_history_orphan=91` |
| 仅剩 1 项定性 | `finance:budget:write` 属**纯 utoipa 文档注解**，无 `require_permission` 挂载，live DB 无行**不产生 403**（初判「真缺口」被推翻） |
| `formula_id` 166 行 | **不回填**，维持 NULL + 登记（种子数据无可推断依据） |
| 附带发现 | `/budgets` 增删改**无权限码粒度访问控制**（反向鉴权缺口），登记不处置 |

---

## 二、连接池缺陷：根因与机理

### 2.1 现象（批 38 实测原始记录）

- `GET /api/rd/formulas`（含无参）同一 JWT 连测 10 次 → `500 200 500 200 500 200 500 200 500 200`，**严格交替**
- 同期 `GET /api/rd/formulas/{id}` 6/6 全 200、`GET /api/rd/deploys` 6/6 全 200
- 带 `approval_status` 过滤时呈「首次 500、重试 200」
- 服务日志无 ERROR（handler 返回 `ApiResponse::server_error`，tracing 未输出底层错误）
- **重启进程后 20/20 全 200**

### 2.2 根因（H1 成立）

**sqlx 默认按连接缓存 prepared statement（容量 100 条/连接）**。迁移 `0036` 在服务**运行中**执行了：

- `rs.formulas.created_by`、`rs.formula_versions.created_by`：`ALTER COLUMN TYPE uuid → text`
- `rd.deploys` 加 `formula_id` 列、`rs.formulas` 加 `ck_formulas_approval_status`

DDL 之后：

- **旧连接**上已缓存的 prepared statement 仍绑定**旧 schema 元数据**（`created_by` 为 uuid）→ 执行时报类型不匹配
- **新连接**（DDL 后建立）按新 schema prepare → 成功
- 连接池交替借出这两类连接 → **严格交替 500/200**

为什么 `get_formula` / `list_deploys` 不受影响：它们的查询不涉及被改列，旧语句仍可执行。

为什么「重启即好」：重启让**全部连接重新 prepare**，池中不再有陈旧语句 —— 这既是现象消失的解释，**也正是不能用重启当修复的原因**（下一次 DDL 会以同样方式复发）。

### 2.3 排除的假设

| 假设 | 结论 | 依据 |
|---|---|---|
| H1 stale prepared statement | **成立（主因）** | DDL 后新旧连接交替；禁用缓存后 200 次 0 失败；重启即好 |
| H2 会话级 GUC 残留/缺失 | **排除** | `.env` 为 `MULTI_TENANT_ENABLED=true` → `default_tenant` 解析为 `None` → `after_connect` 从不设会话级 `app.tenant_id`，该状态是本就如此、长期存在，不能解释「与 DDL 时间点重合的严格交替」；且 500 的错误不是 GUC 相关 |
| H3 缺坏连接剔除 | **部分成立，作次要防线** | 池无 `test_before_acquire`，本次一并补上 |

### 2.4 修复

| 位置 | 改动 |
|---|---|
| `lib/shared-db/src/database/mod.rs:82` | `PgConnectOptions::statement_cache_capacity(0)` —— 禁用客户端语句缓存 |
| `lib/shared-db/src/database/mod.rs:92` | `PgPoolOptions::test_before_acquire(true)` |
| `lib/shared-db/src/database/mod.rs:64,67` | `idle_timeout` 兜底 300→120s、`max_lifetime` 兜底 1800→600s |
| `lib/shared-bootstrap/src/lib.rs:443,447-449` | 同步上述三项 |

**机理**：设 `statement_cache_capacity(0)` 后每条查询即时 Prepare，**DDL 后下一次查询自动使用新 schema**，不存在「陈旧语句长期驻留连接」的状态，从根本上消除交替失败。

**代价**：每条查询多一次 Prepare 往返（量级 ~0.5-1ms），按「正确性优先、通用性优先」接受。

**一处据实修正（主 Agent 复核）**：`max_lifetime` 的兜底默认改为 600s 后，走 `quick_bootstrap_with_db` 的服务仍显式传 `Some(1800)`（`lib/shared-bootstrap/src/lib.rs:645-646`），兜底不生效。已把 `mod.rs` 注释改写准确（删除原「配合 after_release DEALLOCATE ALL」的错误描述——该钩子已移除），避免后人误以为 600s 在所有路径生效。

### 2.5 验证（主 Agent 独立复核，不采信执行方自述）

| 验证 | 结果 |
|---|---|
| `GET /api/rd/formulas` 无参 ×50 | **50/50 200** |
| `?approval_status=pending` ×50 | **50/50 200** |
| `?approval_status=approved` ×50 | **50/50 200** |
| `?approval_status=rejected` ×50 | **50/50 200** |
| 压测全程进程 PID | **64939 未变**（证明不是靠重启） |
| `GET /api/rd/deploys` ×20 | 20/20 200 |
| `GET /api/rd/formulas/{id}` ×20（3 条 id） | 各 20/20 200 |
| `cargo test -p topems-shared-db -p topems-shared-bootstrap --lib` | **120 passed + 176 passed，0 failed** |
| `cargo check -p topems-rd -p topems-server -p topems-master-data` | **exit 0，0 error** |
| smoke 全端点 | **4501/4501 PASS，0 FAIL，豁免 0** |

**如实说明的未覆盖点**：修复前原始现象能否稳定复现，依赖执行过程的记录；本次修复的确定性来自**机理**（禁用缓存后不存在陈旧语句）+ **200 次 0 失败** + **PID 不变**，不来自「修复前后对照重放」。

**多租户隔离**：`.env` 为 `MULTI_TENANT_ENABLED=true`，租户由中间件逐请求事务级注入（`set_config(..., true)`）。本次修复未触碰该路径；压测中以真实租户身份连测 200 次，未出现串味或 GUC 相关错误。**未构造第二个真实租户做交叉验证**（当前环境仅一个真实租户），此为覆盖缺口，如实登记。

---

## 三、对账脚本口径修正

### 3.1 改动

`scripts/audit_permission_codes.py`（**仅此一个文件**）：

- `scan_sql_declared`：`sql_declared` **只扫 `database/init`**
- 新增独立字段 `sql_history`：**仅扫 `database/migrations`**，用于回溯取证，**不再计入声明基线**
- `fe_orphan` / `db_only` / `fe_only` / `rename` 判定规则**一字未改**，live DB 仍是权威

### 3.2 新基线（改前 / 改后对照）

| 指标 | 改前 | 改后 | 说明 |
|---|---|---|---|
| `sql_declared_codes` | 1087 | **12** | 口径收窄为仅 init |
| `sql_only` | 92 | **1** | 见 §3.3 |
| `sql_history_orphan`（新增） | — | **91** | migrations 历史孤立字面量 |
| `sql_history_codes`（新增） | — | 1086 | migrations 全集 |
| `sql_history_also_current`（新增） | — | 995 | migrations ∩ live DB |
| fe | 445 | 445 | 未变 |
| be | 577 | 577 | 未变 |
| db | 995 | 995 | 未变 |
| both (fe∩be) | 127 | 127 | 未变 |
| be_only | 450 | 450 | 未变 |
| fe_only | 318 | 318 | 未变 |
| fe_orphan | 32 | 32 | 未变 |
| db_only | 570 | 570 | 未变 |
| rename | 0 | 0 | 未变 |

数学闭合：`91 + 995 = 1086`（sql_history 全集）、`91 + 1 = 92`（原 sql_only 分解）。

### 3.3 差异来源：口径变化，不是数据变化

- `database/init/**` 与 `database/migrations/**` **零改动**（`git status` 无变更，最新 mtime 仍是批 38 的 `0036` 迁移文件，早于本批执行）
- live DB `core_permissions` **未做任何写入**
- 因此 1087→12、92→1 的差异**全部来自「声明集从 `init ∪ migrations` 收窄为 `init`」**，不涉及任何数据增删

---

## 四、仅剩 1 项 `finance:budget:write` 的定性（初判被推翻）

### 4.1 初判（已被推翻）

初判为「init 声明 + live DB 缺行 + 代码有消费 → 端点会 403 的真缺口」，拟登记补种迁移。

### 4.2 运行时证据链

| 层 | 证据 |
|---|---|
| 注解层 | `svc/finance/src/modules/operational.rs:640` 的 `security(("BearerAuth" = ["finance:budget:write"]))` 是 `#[utoipa::path(...)]` 属性宏的一部分，宏展开后不产生运行时逻辑 |
| handler 层 | `delete_budget` 签名只有 `Extension(_claims)`（下划线前缀不消费），**无权限提取器** |
| 路由层 | `operational.rs:1346-1350` 裸 `.route(...)`，**未挂 `.layer(require_permission(...))`** |
| 中间件层 | finance `main.rs:235-237` 只挂 `tenant_middleware()`，它只做 JWT 验签 + 租户上下文注入，不查权限码 |
| 全仓实测 | `operational.rs` 内 `require_permission` **命中 0**；finance 真正使用 `require_permission` 的仅 `settlement_center/routes.rs:51/85/107` |
| 全仓引用 | `grep -rn "finance:budget:write"` 运行时命中 0；仅出现在**生成的** `docs/api/openapi-aggregated.json` / `docs/api/openapi.json` 与 CI 静态映射表 |

### 4.3 判定

**纯文档层孤立字面量**：live DB 无行**不产生 403**，可安全登记，无需补种。

---

## 五、附带发现（登记不处置，超本批范围）

`/budgets`（含 expenses / receivables / payables 四组资源）的增删改端点在 finance 服务中**没有权限码粒度的访问控制**：

- `operational.rs` 中 12 处 `security(...)` 全是纯 utoipa 文档注解
- 路由未挂 `require_permission`
- 结果：任何持有效 JWT 的同租户用户都能调用（仅受 RLS 租户隔离约束）

这是「**权限中间件未挂载**」的反向鉴权缺口，与「码缺失」无关，**不属本批口径修正范围**，另立任务处置。

---

## 六、`rd.deploys.formula_id` 166 行

**维持不回填**（维持 NULL + 登记）。原因不变：166 行全是种子数据，`app_name` / `version` / `project_name` 全空，无可推断依据；硬填即伪造。

---

## 七、门禁验证汇总

| 门禁 | 结果 |
|---|---|
| `cargo check -p topems-rd -p topems-server -p topems-master-data` | exit 0，0 error |
| `cargo test -p topems-shared-db -p topems-shared-bootstrap --lib` | 120 + 176 passed，0 failed |
| smoke（4501 端点） | 4501/4501 PASS，0 FAIL，豁免 0 |
| 迁移四件套 | `check-migrations` 0 / `check-migration-names` 0 / `check-directed-migrations` 0 / `check-migration-insert-shape` 0 |
| 全量 vitest | 621 files / 6642 passed / 1 skipped / 0 failed |
| 热态压测 | 200 次全 200，0 失败，PID 不变 |
| 回归 | deploys 20/20、formulas/{id} 3×20/20 |

---

## 八、遗留与观察项

1. **多租户交叉隔离未做真实双租户验证**（环境仅一个真实租户），仅验证同租户 200 次无异常 —— 覆盖缺口登记。
2. **`/budgets` 等 12 处端点缺权限码粒度访问控制**（反向鉴权缺口）—— 另立任务。
3. **`rd.deploys.formula_id` 166 行待产品补录** —— 维持登记。
4. **`statement_cache_capacity(0)` 的全局性能影响**未做基准对比（仅机理估算 ~0.5-1ms/查询），如需量化可另立压测任务。

---

## 九、提交信息摘要

```
fix(batch39): 根治连接池 stale prepared statement + 对账口径修正

- 根因：sqlx 按连接缓存 prepared statement，迁移 0036 的 ALTER COLUMN TYPE uuid→text
  在服务运行中执行后，旧连接缓存语句引用旧 schema → 池交替借出新旧连接，list_formulas 严格 500/200 交替
- 修法：两处建池统一 statement_cache_capacity(0)（DDL 后自动用新 schema）+ test_before_acquire(true)
  + max_lifetime/idle_timeout 兜底收紧；不依赖重启，200 次压测 0 失败、PID 全程不变
- 对账口径：sql_declared 只扫 database/init（1087→12），migrations 降为独立 sql_history
  （新增 sql_history_orphan=91）；sql_only 92→1，主分类 9 项逐项全等，数据零改动
- 仅剩 1 项 finance:budget:write 经运行时取证判定为纯 utoipa 文档注解，live DB 无行不产生 403
```
