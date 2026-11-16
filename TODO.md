# TODO — TOPEMS 活文档

> 本文件只保留**未完成 / 待确认 / 实施中**事项与后续实施方案；已完成条目在核销后删除（原件见备份）。
> 状态口径：`未完成`（有明确剩余动作）/ `待确认`（结论或范围需业务/用户拍板）/ `实施中`（当前批次已开工）。
> 最近治理：2026-11-07（备份 + 清理 + 并行实施方案）。本轮**只治理本文件**，未改代码、未推送、未触碰 prod。

## 0. 本轮治理记录（2026-11-07）

### 0.1 备份

| 项 | 值 |
|---|---|
| 清理前主文件 | `TODO.md`（5,059 行 / 761,864 字节 / sha256 `53c529012709c03e86917577c9c63dbc04a0ecee9da2c828e6230d18557f4fe9`） |
| 备份路径 | [docs/archive/misc/TODO_backup_20261107.md](docs/archive/misc/TODO_backup_20261107.md)（沿用仓库既有约定 `docs/archive/misc/TODO_backup_<date>.md`；同 sha256，可逐字复核被删条目） |
| 其他 TODO 文件 | [docs/project/TODO.md](docs/project/TODO.md)（697 行，V516 旧版执行日志，文件头已标注「已归档」，非现行真相源，本轮不动）；`docs/archive/` 下 6 份历史 TODO 归档（含 `TODO-archive-2026-11-03.md` 等，均只读）；`artifacts/TODO未完成项解析-2026-10-20.md`（173 行，对 3146 行旧版 TODO 的分析稿，已被本目录 `.gitignore` 忽略、非真相源，本轮不动） |
| 审计来源 | [菜单对应性审计](docs/quality/menu-correspondence-audit-2026-11-07.md)、[菜单矩阵 CSV](docs/quality/menu-route-api-db-matrix-2026-11-07.csv)、[架构/目录/共享 UI/文档/数据审计](docs/quality/architecture-directory-shared-ui-docs-data-audit-2026-11-07.md) |

### 0.2 清理口径（可复核）

1. **已完成**：标题带 `✅`，或正文含 `commit <hash>` / `已推送` / `已提交` / `实测闭环` / `验证通过` / 迁移已登记等闭环证据 → 删除。抽查了批次 25–42 与 2026-10 历史批次的 commit hash，均可在 `git log` 命中（例：`2837f4bae`、`d9e4a1e18`、`b768b3f4f`、`61a25cfb7`）。
2. **已过期**：被后续批次实质取代的规划稿（如 2026-10-13 的 DB-04 落地规划已被 2026-11-03 `20261103170000` 取代）、一次性 DDL/窗口执行记录、PO 方案旧稿 → 删除；其残留决策项已转入 §4。
3. **保留 / 待确认**：正文存在未闭环项、prod 待部署、决策未拍板、或状态无法从代码/审计确认 → 保留为 §4 条目并标注 `待确认`，**不删除**。
4. 复核方式：对任意被删条目，可在备份文件中 `grep "<原标题>"` 取回全文；`git log --oneline -- TODO.md` 可对照历史。

### 0.3 清理统计

| 项 | 数量 |
|---|---:|
| `##` 级任务条目总数 | 372 |
| 删除条目 | **359**（其中标题已标 `✅` 201 条；未标 `✅` 但正文有闭环证据 158 条） |
| 保留 / 转入 §4 | **13**（`未完成` 5 条 + `待确认` 8 条） |
| 文件行数 | 5,059 → 本文件 |

---

## 1. 并行工作流总览

> 原则：按**文件所有权**切分，而不是按问题切分。同一波次内，两个工作流不得写同一文件/同一服务目录。
> 每个工作流独立提交；每批做完 → 验收 → 再开下一批；不得一次性铺开全部模块。

| ID | 工作流 | 优先级 | 主要文件所有权 | 可立即并行 | 必须等待 |
|---|---|---|---|---|---|
| **W1** | 菜单与权限一致性 | P0 | `database/migrations/*menu*`、`scripts/audit_permission_codes.py`、`svc/*/src/**/routes*`（权限声明）、`apps/web/src/modules/*/config.ts`（内容） | W1-1（DB 数据） | W1-3 与 W2-B 同一服务串行；W1 前端 config 内容改动等 W3-A 完成 |
| **W2** | 后端数据访问治理 | P0 | `lib/shared-db/**`、`lib/shared-bootstrap/**`、`svc/server/src/modules/*_real_module.rs`、`svc/*/src/**/*.rs`（SQL 串）、`scripts/ci/schema-prefix-baseline.json`、`*_schema_defense*` | W2-0、W2-A、W2-B0 | W2-B 某服务前，W1-3 该服务须已完成（服务锁） |
| **W3** | 前端目录结构收敛 | P1 | `apps/web/src/{pages,modules,components,schemas,schema,types}/**`（物理路径与 import） | W3-A（纯改名/搬迁） | W3 与 W4 不得同批动同一目录；W3 动 `modules/` 前通知 W1 |
| **W4** | 基础 UI 组件收口 | P1 | `packages/shared-components/**`、`apps/web/src/components/common` / `apps/web/src/components/redesign`、`components/index.ts` | 否 | 等 W3-A 完成；之后按组件批次与 W3 分目录并行 |
| **W5** | 数据一致性（枚举/常量/组织字段） | P2 | `packages/shared-constants/**`、`apps/web/src/schemas/**`、`svc/*/src`（枚举）、新增迁移 | W5-A 盘点、W5-C 映射表 | W5-C 的改列批次等 W2-B 同表完成 |
| **W6** | 文档与门禁 | P2 | `docs/**`、`README.md`、`lefthook.yml`、`.github/workflows/**`、`scripts/ci/**`、`scripts/openapi/**` | W6-A/B/C/D | 无（W1/W2/W5 提交规则脚本，由 W6 统一接线，避免多人改 `lefthook.yml`） |

### 1.1 真正的并行波次

| 波次 | 同时开工 | 说明 |
|---|---|---|
| **Wave 1（现在）** | W1-1（26 菜单数据）、W2-0（基线冻结）、W3-A（`modules/` 改名）、W5-A（常量包盘点）、W6-A/B（文档盘点与补齐） | 文件不相交；W2-0 只读 |
| **Wave 2** | W2-A（`SEARCH_PATH` 收口）、W1-3 批 1（erp/scm/srm/wms/mes）、W2-B0（3 歧义 + 2 跨 schema）、W4-A、W6-C/D | 服务锁：W1-3 批 1 不含 monitor |
| **Wave 3** | W1-3 批 2（hrm/crm/pdm/pm/rd/tms/gis/mobile）、W2-B 批 1（mes）、W3-B（crm 试点）、W5-B 试点 | 同一服务只被一个工作流写入 |
| **Wave 4** | W1-3 批 3（integration/ticket/master-data）、W2-B 批 2/3（unified-core/finance/lims/analytics）、W1-4 菜单分组、W3-C 分模块搬迁 | 每批独立验收 |
| **Wave 5+** | W2-B 剩余（pdm/erp/integration/communication/portal/rd/pm）、W1-4 去重、W2-C/D、W5-C 改列 | 低优先级，按服务逐批 |

**服务锁规则**：把服务名当作互斥锁。任一服务同一时间只允许一个工作流修改其 `svc/<svc>/src/**`；完成并验收后再移交。禁止两人同波次改同一文件的不同函数（合并风险不可控）。

---

## 2. W1 菜单与权限一致性（P0）

**目标**：让「前端菜单 → 路由 → 后端权限门 → DB 权限目录」四层闭环；生产 DB 菜单不再静默吞掉整块模块。

**关键事实（来自 2026-11-07 审计）**
- 前端 navItems 449 vs 生产 DB 菜单 423；`GlobalLayoutV3.tsx` 对 DB 不存在的子项执行 `Boolean(dbItem)` 过滤 → **26 条前端菜单在生产整组消失**：`bi` 12、`im` 2、`mobile` 12。
- 权限三套源：DB `core_permissions` **1109**、后端 `security(BearerAuth=[...])` **593**、交集 **133**；仅 DB 976、仅后端 460；前端 448 个菜单权限码在 DB 全存在，但与后端精确匹配仅 **109/448（24%）**；DB 菜单 `permissions` 与前端 registry 另有 72 条不一致。
- **17 个服务无端点级权限**：mes/erp/hrm/crm/scm/srm/wms/pdm/pm/rd/tms/gis/mobile/integration/monitor/ticket/master-data。
- DB 有 **122 个菜单分组**（51 个单条分组），前端已收敛为 10 个域组但未消费 DB 分组；**25 组精确同名菜单**。
- 遗留 schema 无入口：`analytics` 18 表、`report` 1、`rs` 24、`core` 15、`unified_core` 3、`mail` 2、`notification` 1、`shared` 1、`storage` 1。

### W1-0 生产菜单读取 schema 修复（已完成，2026-11-08）

- 根因：嵌入部署连接池 `SEARCH_PATH=flow, public`，menu handlers 用裸表名 `core_menus` / `core_menu_groups`，优先解析到 `flow` 下同名空副本，忽略 `public` 权威数据。
- 修复：[svc/unified-core/src/modules/menu/handlers.rs](svc/unified-core/src/modules/menu/handlers.rs) 全部菜单读写 SQL 显式限定 `public.`；新增回归测试 `menu_hits_public_when_flow_shadow_exists`（`flow, public` + flow 空副本）。
- 结论：BFF/前端无 DB 菜单读取路径，仅 unified-core 一处；`schema_defense` DDL 已按 `public` 限定，不受影响。

### W1-1 补齐 26 条缺失菜单（数据迁移，先做，不碰前端文件）

| 批次 | 内容 | 验收 |
|---|---|---|
| W1-1a | `bi` 12 条：以 [apps/web/src/modules/bi/config.ts](apps/web/src/modules/bi/config.ts) 为参照，写入 `core_menus` 对应行（含 title_key/path/permission/parent/order） | scratch/test 应用后菜单树返回全部 12 条；前端过滤后可见；重复执行 0 新增 |
| W1-1b | `im` 2 条（消息概览、会话管理） | 同上；`/api/communication/im/*` 入口可达 |
| W1-1c | `mobile` 12 条（移动工作台/库存/审批/设置等） | DB 权威菜单完整；Web 仍按既有规则隐藏，移动端可取到 |

- 文件：新增 `database/migrations/<ts>_menu_backfill_{bi,im,mobile}.sql`；不修改 `database/init/` 种子，不改历史迁移字节，`checksums.txt` 仅追加。
- 回滚：迁移内附 `DELETE ... WHERE id IN (...)` 的回滚段（按固定 id/唯一键），并在执行记录中登记。
- 风险：菜单 id/父级错位 → 先在 scratch 克隆库跑两遍 + 菜单接口快照 diff。

### W1-2 权限码三源对齐（数据 + 后端声明）

| 批次 | 内容 | 验收 |
|---|---|---|
| W1-2a | 冻结账本：`scripts/audit_permission_codes.py` 输出 DB/后端/交集/差集快照到 `docs/quality/`（只读，不改码） | 快照可重跑一致；三集合数量与审计一致 |
| W1-2b | 仅后端存在 460：按域分组甄别「仍在使用 / 已废弃」，仍使用的补入 `core_permissions`（additive 迁移）；废弃的进白名单并记录 | 交集提升；无删除；二次迁移 0 行 |
| W1-2c | 菜单 448 码 → 后端精确匹配：按模块组（analytics/bi、unified-core/admin/iam、communication/im、master-data/master、plugin/asset/oa/aps）逐组对齐 `security` 声明 | 菜单码与后端声明匹配率→100%；非超管 200 / 无权限 403 实测 |
| W1-2d | 仅 DB 存在 976：按「有无代码/菜单消费」分流；零消费候选先登记，**不直接删** | 删除前有全仓检索证据；`core_permissions` 行数只降在批准批次 |

- 文件：`scripts/audit_permission_codes.py`、新增迁移、`svc/*/src` 路由权限声明。
- 边界：W1-2c 与 W1-3 同一服务文件串行；W1-2 不碰 `require_module_access` 模块门。
- 回滚：权限码只做加法优先；删除批次独立提交，可用回滚段恢复。

### W1-3 17 个服务端点级权限（服务锁，按批）

| 批次 | 服务 | 验收（必须用非超管身份） |
|---|---|---|
| W1-3a | erp、scm、srm、wms、mes | 读权限角色 GET 200；无权限 403；只读角色写端点 403；模块门保留 |
| W1-3b | hrm、crm、pdm、pm、rd、tms、gis、mobile | 同上；mobile 个人接口保持 auth-only（不套 `mobile:admin`） |
| W1-3c | integration、monitor、ticket、master-data | 同上；monitor 属权限收紧，需确认无真实非超管用户失权 |

- 方式：沿用既有 `require_module_access("<模块>")` 作为模块入口，写/敏感动作叠加独立动作门；不得用 `"<模块>:admin"` 顶替模块门（memory 既有约束）。
- 文件：`svc/<svc>/src/**` 路由层；**不修改** `svc/server/src/modules/*_real_module.rs` 的 `SEARCH_PATH` 行（属 W2-A）。
- 风险：误锁真实用户 → 每服务上线前用生产角色快照核对持有者；按服务独立提交回滚。

### W1-4 DB 122 分组 → 10 域组 + 25 组同名去重

| 批次 | 内容 | 验收 |
|---|---|---|
| W1-4a | 122 个 `group_id` 映射到 10 个域组 code（含 51 个单条分组并入模块组），数据迁移 + 映射表落盘 | 菜单接口返回 10 个域组；排序稳定；`?menu_authority=config` 可回退 |
| W1-4b | 25 组精确同名：先做 4 组 admin/erp（银行账户/数据字典/数据库管理/审计日志）+ 供应商 4 处 | 每次仅收敛 3–5 组；入口保留 301/只读跳转；产品签字后执行 |
| W1-4c | 35 个 `*-dashboard` 幽灵项（侧栏已隐藏）决定删除或保留隐藏 | 决定文档 + 数据迁移；菜单总数与审计口径一致 |

- 文件：菜单/分组数据迁移、`apps/web/src/api/core/menus.ts`、`GlobalLayoutV3.tsx` 的 DB 字段消费（前端内容改动等 W3-A 完成）。
- 回滚：保留 `?menu_authority=config` 与逐条 DELETE 回滚段；数据库备份按窗口约定。

### W1-5 遗留 schema 入口决策（先决策，后动作）

| 批次 | 内容 | 验收 |
|---|---|---|
| W1-5a | 产出一页决策表：`analytics 18 / report 1 / rs 24 / core 15 / unified_core 3 / mail 2 / notification 1 / shared 1 / storage 1` → 归档 / 迁主 schema / 标注基础设施 | 用户拍板后才进入 b/c |
| W1-5b | 按决策执行（归档或迁移），每 schema 一批 | 无服务 `SEARCH_PATH` 变更；表归属与文档一致 |
| W1-5c | `rs`（无 svc/无路由/无菜单）优先判定归档 | 全仓检索零消费证据 |

---

## 3. W2 后端数据访问治理（P0）

**目标**：消除进程级 `SEARCH_PATH` 互相覆盖与 1,551 条裸表引用，先把「读错表」风险清零，再逐模块减基线。

**关键事实**
- 16 个模块在 `build()` 开头 `std::env::set_var("SEARCH_PATH", ...)`（`svc/server/src/modules/*_real_module.rs`，含 `subscription_module.rs#L241`），进程级单值，最后构建模块覆盖全部；运行期 DDL 辅助仍读取该变量（`lib/shared-db/src/database/mod.rs#L352`）。
- `check-schema-prefix.mjs`：违规 **1551**（AMBIGUOUS 3、CROSS_SCHEMA 2、SEARCH_PATH_DEPENDENT 884、UNKNOWN 662），基线 326 键；模块分布：mes 308、unified-core 263、finance 228、lims 174、analytics 166、pdm 151、erp 105、integration 46、communication 44、portal 22、rd 16、monitor 10、pm 10。
- 最危险：`svc/monitor/src/modules/monitor/metrics.rs#L786/#L887` 裸 `projects`（rs/pm 同名）、`#L897` 裸 `inventory`（erp/wms 同名）、`#L907` 裸 `employees/departments`（属 hrm，monitor 为 public）。

### W2-0 基线冻结（只读，Wave 1）

- 跑 `node scripts/ci/check-schema-prefix.mjs --json` 与 `node scripts/ci/check-search-path.mjs`，按模块拆分基线文件（`scripts/ci/schema-prefix-baseline.json` 只允许减项）。
- 把 `AMBIGUOUS=3 + CROSS_SCHEMA=2` 设为**硬失败**（不再只报警）；规则脚本交 W6 接线。
- 验收：基线 326 键与 1551 条一一可追溯；`--changed-only` 在干净工作区 exit 0。

### W2-A 删除进程级 `SEARCH_PATH`（Wave 2）

| 批次 | 内容 | 验收 |
|---|---|---|
| W2-A1 | `lib/shared-db`：运行期 DDL 辅助改为显式 `schema` 参数；`Db::new(pool, search_path)` 作为唯一作用域入口 | `cargo check -p topems-shared-db`；无 `env::var("SEARCH_PATH")` 读取 |
| W2-A2 | 16 个模块分 4 批删除 `env::set_var`（4/4/4/4），每批独立提交 | BFF 启动 28 模块；逐模块 `/health` 200 |
| W2-A3 | CI/pre-commit 禁止 `svc/server/src/modules/**` 出现 `env::set_var` | 注入样例被拦截；干净仓库 exit 0 |

- 验收（必做）：同时请求 mes/crm/finance 各一个读写端点，日志记录 `pg_backend_pid`/`current_schema()`，证明各连接 schema 互不污染；重启两次无漂移。
- 风险：`set_var` 删除后若仍有依赖环境变量的运行期路径 → 先完成 A1 再删；回滚按批 revert。
- 边界：W2-A2 只改 `_real_module.rs` 的 `set_var` 行；不得顺手改权限（W1-3 负责）。

### W2-B 裸表引用 1551 → 基线归零（按模块，只减不增；动态表名白名单除外）

| 批次 | 范围 | 验收 |
|---|---|---|
| W2-B0 | monitor 5 条（3 歧义 + 2 跨 schema）改全限定名 | 3 条 `AMBIGUOUS`/2 条 `CROSS_SCHEMA` 立即归零；`current_schema()` 证据 |
| W2-B1 | mes 308 | 基线精确下降 308；模块读写端点实测；无新增 |
| W2-B2 | unified-core 263 | 同上；覆盖 iam/flow/automation 三类表 |
| W2-B3 | finance 228 | 同上；含 `erp.opening_balances` 直连（与 W2-C 合并评审） |
| W2-B4 | lims 174 + analytics 166 | 同上；analytics 实际 `SEARCH_PATH=bi, public, shared` 需逐表核对 |
| W2-B5 | pdm 151 + erp 105 | 同上 |
| W2-B6 | integration 46 + communication 44 + portal 22 + rd 16 + monitor 10 + pm 10 + 其余 1–2 | 同上；每服务独立提交 |

- 验收口径：`check-schema-prefix` 该模块违规数 = 上一批基线 − 本批声明的条数，且 `--changed-only` 0；`cargo check/clippy -D warnings`；对改动 SQL 做「种子行命中」实测（或 `EXPLAIN` 目标表 + `to_regclass` 断言）。
- 边界：与 W1-3 服务锁；W2-B 只改 SQL 串/查询构造，不改路由权限与响应结构。
- 风险：全限定名可能改变 RLS 语义 → 每批必须验证租户 A/B 互不可见；回滚按服务 revert。

### W2-C 跨 schema 直接 SQL 归属（S2-4，P2）

- 范围：`svc/finance/src/modules/mod.rs#L4148/#L4168/#L4262/#L4347/#L4363/#L4426` 直接读写 `erp.opening_balances`。
- 批次：C1 归属决策（建议 ERP 拥有，财务走 `shared-service-client`）；C2 6 处改服务调用；C3 `scripts/schema_boundary.json` 给直连 allow 加到期日，CI 阻止新增。
- 验收：`check_schema_boundary.py` 全 PASS；财务凭证/期初余额端点行为等价；无新增直连。
- 风险：服务调用替换事务边界 → 逐处补集成测试；回滚按文件。

### W2-D 运行期 DDL 中危 16 张（P1，承接既有台账）

- 事实：607 条 `TABLE_DEFS`、22 个服务仍调 `run_schema_migration_and_verify`；高危 4 张已处置，**中危 16 张未处置**（portal 联邦/网关 10、master-data 自造 2 等）。
- 顺序（memory 强制）：**先删代码建表定义 → 再前向迁移 DROP**；禁止给影子表补列或开 RLS 当临时方案。
- 批次：D1 portal 10 张；D2 master-data 2 张 + 其余散点；D3 CI 断言「`TABLE_DEFS` 表必须存在于迁移链」。
- 验收：重启 4 次不复活；`to_regclass` 指向权威 schema；租户 A/B 隔离实测；`check-schema-defense-drift.py` PASS。
- 风险：删定义误伤启动期 ledger 类自建表 → 仅处理有同名权威表的 16 张，`*_ledger` 不纳入。

---

## 4. W3 前端目录结构收敛（P1）

**目标**：把「按类型切分」改为「按模块归属」，先机械改名降低风险，再单模块试点，最后分批搬迁。

**关键事实**
- `pages/` 43 目录 / 1052 个 `.tsx`；`modules/` 36 目录 / 仅 38 个 `.ts`（实为路由/菜单配置）；28 个模块名重名。
- `components/` 有 17 个业务模块目录；与 `modules/` 16 个重名；`schema/`（CRUD 适配器）与 `schemas/`（业务 schema）并存；`types.ts`（2 行）与 `types/` 并存。

| 批次 | 内容 | 验收 |
|---|---|---|
| W3-A | `modules/` → `module-configs/`（38 个 `.ts` + 全仓 import codemod），**只改名不改内容** | `typecheck`/`eslint`/全量 vitest；`check-nav-route.cjs` PASS；路由与菜单数量快照不变 |
| W3-B | `crm` 单模块试点：`pages/crm`、`components/crm` 下沉到 `modules/crm/{pages,components}` | 3 个关键页面截图对比；路由/菜单/权限不变；vitest 相关用例绿 |
| W3-C | 按域组分批（每批 5 模块），复用试点模板 | 每批独立提交；`check-nav-route` + 页面烟雾；无跨批混改 |
| W3-D | `schema/` → `crud-adapter/`；`types.ts` 合并进 `types/` | 全仓 import 0 残留；typecheck 0 |

- 边界：W3 只做**路径与 import**；文件内容（菜单/权限/组件实现）分别属 W1/W4，禁止同一提交混做「移动 + 改内容」。
- 回滚：每批 `git revert`；移动一律 `git mv` 保留历史。
- 风险：import 改动量大 → codemod + 全量测试；避免与 W4 同波次改 `components/**`。

---

## 5. W4 基础 UI 组件收口（P1，依赖 W3-A）

**目标**：`packages/shared-components` 成为唯一来源，`apps/web` 只保留薄包装；同名三套实现清零。

| 批次 | 组件 | 验收 |
|---|---|---|
| W4-A | `DataTable`（3 套）、`Pagination`（2 套）、`EmptyState`（2 套） | 旧路径改为 re-export → 消费方改 import → 0 引用后删除；关键列表页视觉回归 |
| W4-B | `FormField`/`FormFieldGroup`、`NumberField/CurrencyField/PercentField`（同文件重复实现） | 表单页回归（erp/crm/finance 各 1 页）；单测/类型检查 |
| W4-C | `StatusBadge`（3 套）、`PageContainer`（含有意 fork，需确认） | 明确 fork 保留理由或收口；`rg` 旧路径 0 |
| W4-D | `components/index.ts` 停止二次导出 shared 组件；eslint `no-restricted-imports` 固化 | 注入样例被 lint 拦截；全仓 import 路径唯一 |

- 边界：W4 只改组件实现与 import；不移动文件（W3 负责）。W3-C 搬迁期间，暂停涉及同一目录的 W4 批次。
- 回滚：按组件 revert；删除副本前必须 `rg` 证明 0 引用。
- 风险：交互/样式漂移 → 每批截图对比 + Storybook 快照。

---

## 6. W5 数据一致性（P2）

| 批次 | 内容 | 验收 |
|---|---|---|
| W5-A | `packages/shared-constants` 决策：现状无 `src/`、全仓引用 0 → 建议删除空包（保留方案 B：以 DB 字典生成）；先盘点 `package.json`/workspace/lock 引用 | 决策记录 + 删除后 install/typecheck 通过；无隐式依赖 |
| W5-B | 状态枚举：Rust 108 / 前端 113 / DB CHECK 三侧对齐；以 DB 字典为权威，试点 mes/crm/finance 生成 TS union + Rust 一致性测试 | 生成物可复现；新增状态漏改会被测试拦截；不改运行时行为 |
| W5-C | 组织字段语义表：`company_id` 111 / `organization_id` 227 / `org_id` 361 → 标注「租户 / 法人组织 / 集团」；`svc/ai` 随机组织 ID 默认值先只读核对 prod 行为 | 映射表签字；新代码 lint 规则；后续改列按表分批、前向迁移、不碰历史文件 |

- 边界：W5-C 的改列批次与 W2-B 同表串行；W5-B 不改权限码（属 W1）。
- 回滚：枚举/常量先生成后切换；改列必须有回填与双读过渡，禁止一次性重命名。

---

## 7. W6 文档与门禁（P2，可全程并行）

| 批次 | 内容 | 验收 |
|---|---|---|
| W6-A | 文档统计改脚本生成：`docs/` 实际 25 个一级目录 / 582 篇 md（README 自述 22 / 387）；归档根目录 9 份一次性报告；删除空 `docs-center/` | 脚本幂等；README 数字与脚本一致；CI 校验 |
| W6-B | `docs/modules/` 业务文档 20 篇（含 README 共 21 篇）→ 覆盖 28 个服务：补 portal/mobile/ticket/communication/integration/search/monitor/plugin-registry/master-data/tms/unified-core/subscription 等 12 个缺口（按 core/business 分批） | 每篇有真实入口/端点/表/权限；死链 0 |
| W6-C | OpenAPI 门禁：`scripts/openapi/generate.sh` + `scripts/dev/extract-live-routes.py` + `scripts/ci/check-openapi-coverage.cjs` 接入 lefthook pre-push 与 CI；重新生成聚合产物（当前 `openapi-aggregated.yaml` 停在 2026-08-23） | checker exit 0；产物时间戳更新；注入漂移被拦截 |
| W6-D | 门禁接线：`check-a11y.cjs`、i18n 脚本、`check-design-tokens.cjs`、`check-decode-contract.mjs` 进 lefthook（**仅改动文件 + 基线**，不全量硬阻断） | 样例违规被拦；干净提交不误伤 |
| W6-E | 文档目录 25 → 6 类（architecture/modules/api/database/quality/operations），需用户批准后执行 | 分批 `git mv`；交叉引用修复；索引更新 |

- 边界：W6 独占 `lefthook.yml`、`.github/workflows/**`、`docs/**`；W1/W2/W5 只提交规则脚本，由 W6 统一接线。
- 回滚：门禁先 report-only → baseline → 阻断；文档移动按目录 revert。
- 风险：门禁一次性全量会拦住并行批次 → 一律 `--changed-only` + 基线。

---

## 8. 存量未完成 / 待确认事项（自清理前 TODO 保留）

| ID | 来源（备份中可检索） | 状态 | 未闭环内容 | 归属 |
|---|---|---|---|---|
| LEG-01 | 第四十五轮「待办总表」A1–A10 / B1–B10 / C1–C3 / D1–D4 | **未完成** | 后续批次已实质完成 A4/A5/A8/A9/D1 等；其余未逐项标注关闭，需逐条复核后并入 W1/W3/W4/W6 | W1/W3/W4/W6 |
| LEG-02 | 第四十九轮 prod 连接占用（topems-server 72/100） | **待确认** | 代码已改（embedded 每池 max 3 / min 0），需重启 prod 生效；连接治理后续批次已推进，是否仍需该轮验收口径待确认 | W2 |
| LEG-03 | 通知链路修复 + 运行期 DDL 影子表扫描（B 部分） | **未完成** | 中危 16 张运行期 DDL 未处置（portal 10、master-data 2 等） | W2-D |
| LEG-04 | ⚠️ prod 实测复核修正（2026-11-04） | **待确认** | P4 反向表清理后「应保留 20 张」的最终归属、剩余反向残留列是否处理，需一次只读复核拍板 | 独立窗口 |
| LEG-05 | 类型批次剩余甄别（2026-11-03 ⏸） | **待确认** | 154 项分类材料就绪；prepare 库 naive 列（连接串未定位）、prod ALTER 未评估；uuid 契约/RLS 依赖项待决策 | W5-C |
| LEG-06 | 批 42/43（v1.163→批43） | **实施中** | 全站 fail-closed 最终基线 **1620 处**（CSV 824 + 1181 复核新增 796）。批 43 已修 **474 处**（文件级覆盖），剩余 **1146 处**；1181 复核已完成（796 条真 fail-closed）。逐条未完成项见 §11.3 | W2 / W2-D |
| LEG-07 | v1.155 批 34 | **待确认** | `category` 自由文本列是否最终由 `category_code` 取代（待产品确认）；scm↔srm `data_sync` 通道启用前需重评环 | W5 |
| LEG-08 | v1.153 批 32 | **待确认** | `erp.customers` 遗留行（被 `SO-TEST-0001` 引用）保留口径已定，是否有其他残留行需复核 | 独立窗口 |
| LEG-09 | 2026-10-13 时间类型统一迁移 | **待确认** | prepare 库 naive 列未启动（连接串未定位）；prod 生产库 ALTER 需单独评估 | W5-C |
| LEG-10 | 2026-10-07 第二梯队修复 | **未完成** | FE-17 client 收敛仅完成阶段 0+1（阶段 2–5 未做）；hrm 组织主数据仍 0 行（组织计数前置） | W3/独立 |
| LEG-11 | 2026-10-08 B7 实测复核 + 门禁登记债 | **待确认** | 静态错误类型已消化；门禁剩余登记债是否全部清零需复核 | W6 |
| LEG-12 | 2026-10-07 第三梯队 | **未完成** | OpenAPI 回写（方向乙）待 utoipa 覆盖率提升后评估；AR-09 仅比列名不比 DDL，26 服务 DDL 未纳入 | W6/W2 |
| LEG-13 | D3 遗留修复（2026-10-13 规划） | **待确认** | mobile 内部服务调用、ai_knowledge 启动告警是否已随后续批次闭环，需代码复核 | W1/W2 |

> 说明：LEG-01 中的具体 26 条不再逐条抄录，避免与后续批次状态冲突；开工前从备份 `grep "第四十五轮"` 取回原表，逐条对照代码后重写为各工作流批次。

### 8.1 待决事项登记（只记录、不推进）

> 口径：本节只登记「需业务方/负责人拍板才能立项」的事项，**只记录、不推进**——不排期、不改代码、不动数据、不占用执行窗口。立项条件满足后由决策人书面确认，再转入 §1 波次执行。

| ID | 事项 | 状态 | 决策人 | 立项所需证据 | 关联 |
|---|---|---|---|---|---|
| DEC-WMS-B-01 | wms 走 B 路线需要独立上线窗口，不与其它站点共享发布窗口 | **只记录、不推进** | 业务方 + 交付负责人（窗口排期） | 明确窗口日期与回滚方案；与 M-2 既定上线窗口不冲突的书面确认 | `docs/quality/m1-acceptance-2026-11-16.md` §10.6 |
| DEC-WMS-B-02 | 20 线程同 SKU 并发压测（验证短事务行锁与 W-01..W-10 写路径） | **只记录、不推进** | 业务方指定压测发起人 + 交付负责人 | 压测脚本、同 SKU 并发数据集、可复现的 p99 / 锁等待原始数据 | 同上 §10.2、§10.5 |
| DEC-WMS-B-03 | wms 写路径 p99 与锁等待阈值由业务方定 | **只记录、不推进** | 业务方（仓储/运营 owner） | 书面阈值（p99 毫秒数 + 锁等待上限），并注明测量口径与采样窗口 | 同上 §10.5 |
| DEC-K11-01 | 请求事务内「写后返回非 2xx」的失败表达 | **已定案（2026-11-16）**：统一返回 500，禁「200 + 内层错误码」，失败分支显式 rollback | 架构 | 无需新增证据；87 条误报按 allowlist 登记、2 条真实风险改「先校验后写」 | `docs/database/known-gate-defects.md` K11、`docs/database/k11-triage-2026-11-16.md` §0 |
| DEC-K12-01 | finance `update_reconcile_item` 聚合事务语义 | **已定案（2026-11-16）**：保留现状（两段式 + 忽略聚合失败 = C 方案），不做 A/B 重构 | 业务方（对账 owner） | 改 A/B 的前置：出现账实差异工单 / 业务要求强一致 / 连接池容量再次告警 | 同上 K12 |
| DEC-M2-01 | 382 条宽松 RLS 策略收口的生产窗口 | **只记录、不推进**（材料已备，本轮零 DDL） | 业务方（窗口排期）+ DBA | 窗口日期与时段、执行 DBA、是否允许窗口内 `ANALYZE` | `docs/database/m2-window-application-2026-11-16.md` |
| DEC-M3-01 | `PostCommitQueue` 是否推广 | **已定案（2026-11-16）**：不推广，保持 finance `settlement_center` 5 处试点 | 架构 | 推广前置三条：观测 ≥ 4 周且 `discarded`=0、发布失败率不高于基线、事件丢失样本为 0 | 同上 K13 定案段 |
| DEC-SRCH-01 | `search_logs.duration_ms` 口径 | **已定案（2026-11-16）**：写服务端处理耗时（毫秒整数），未采集写 NULL，不写 0 | 架构 | 已按此修唯一写入点（search handler 后台双写） | 同上 K15 |

> 上表 DEC-K11/K12/M2/M3/SRCH 五条为 2026-11-16 按「行为不变优先、可回滚优先」定案的口径，与 K10/K11/K12/K13/K15 登记一一对应；标「已定案」的不再进入立项讨论，只有 DEC-M2-01 等窗口。

触发条件（三条同时满足才立项，缺一不动）：

1. 业务方书面确认阈值（DEC-WMS-B-03）；
2. 有独立窗口可用（DEC-WMS-B-01），且不与 M-2 既定上线窗口冲突；
3. 压测数据齐备（DEC-WMS-B-02），能给出与阈值同口径的 p99 / 锁等待结论。

未满足前：wms 维持当前 C 路线（读路径 release + 只读短事务；写路径短事务 + `lock_timeout=2s` + 500ms 告警），不推进 B。

---

## 9. 已清理条目索引（仅统计，全文见备份）

| 类别 | 说明 |
|---|---|
| 批次执行日志 | v1.150–v1.163（批 29–42，2026-11-07）、批 20–28、批 1–19 等，均含 commit/推送/验收证据 |
| 数据库治理窗口 | 字典回灌、317 行回填、影子表清理、P1–P8、P4 反向表、tz_unify、连接治理 A/B、批 3 池迁移等 |
| 一次性 DDL / 数据修复 | 迁移应用、账本补登、checksum 对齐、测试数据清理、prod 短窗口执行记录 |
| 已过期规划稿 | 2026-10 的 DB-04 落地规划、FE-17 旧阶段稿、早期方案 C 子批（正文标「待提交」，实际已在后续批次推送） |
| 旧版池/会话方案 | 已被 `Db::new`/连接治理批次取代的旧口径 |

复核方法：`grep -n "<原标题>" docs/archive/misc/TODO_backup_20261107.md`；`git log -S "<提交号>"`。若发现误删，按备份原文恢复对应段落并在 §8 登记。

---

## 10. 执行纪律（本次及后续批次）

- 本轮只治理 TODO.md 与备份，不实施代码改造、不推送、不重启/部署 prod、不访问生产库。
- 后续开工：每个工作流独立分支/独立提交；每批验收通过再开下一批；跨工作流按 §1.1 波次与服务锁推进。
- 必须通过 pre-commit / pre-push 全套门禁；**禁止 `--no-verify`、禁止 force push**。
- 不修改历史迁移文件字节；`checksums.txt` 仅允许追加行；生产迁移只走 `apply-forward.sh --prod` 或既定窗口。
- 任何 prod DDL/DML 需另行申请执行窗口；prod 默认只读。
- 同一服务同一波次只允许一个工作流写入（W1-3 与 W2-B 互斥）；`lefthook.yml`/CI 只由 W6 修改。
- 每批完成后在本文件更新批次状态；已完成批次从 TODO 删除（原文留备份），残留项转入 §8。

---

## 11. 批 43 收尾记录与未完成清单（2026-11-08）

### 11.1 本批完整口径

| 项 | 值 |
|---|---|
| 缺陷总基线 | **1620 处** = CSV 824 + 1181 复核新增 796 |
| 已修（文件级覆盖统计） | **474 处** |
| 剩余 | **1146 处** |
| 公共机制（已落地） | `lib/shared-db/src/rls.rs` 新增 `pub async fn begin_tenant_txn(&PgPool, Option<Uuid>) -> sqlx::Result<Transaction<'static, Postgres>>`：`pool.begin()` + `SELECT set_config('app.tenant_id', $1, true)`（事务级 SET LOCAL）；`None` 映射 nil UUID 走 policy 全零旁路 |
| 编译状态 | shared-db / finance / analytics / mes / lims 均 CHECK_EXIT=0、0 error；`cargo fmt --all -- --check` 0 Diff |
| 实测 / 门禁 | **未跑**（收尾优先，见 §11.3 B43-18） |

> 口径说明：474 与 1146 为**文件级**统计——清单中某处缺陷所在文件若在本批改动列表内，即计为「已修」（保守高估）；文件内仍可能存在漏改行，实际剩余可能多于 1146。

### 11.2 逐域状态

| 域 | 总 | 已改 | 剩余 | 状态 |
|---|---:|---:|---:|---|
| mes | 178 | 178 | 0 | ✅ 完成（27 文件，CHECK_EXIT=0） |
| analytics | 151 | 121 | 30 | ⚠️ 部分（17/18 文件，CHECK_EXIT=0） |
| finance | 334 | 117 | 217 | ⚠️ 部分（7/16 文件，CHECK_EXIT=0） |
| lims | 201 | 58 | 143 | ⚠️ 部分（9/12 文件，CHECK_EXIT=0） |
| unified-core | 407 | 0 | 407 | ❌ **整体回滚**（44 error，见 §11.4） |
| qms | 177 | 0 | 177 | ❌ 未开工 |
| ehs | 140 | 0 | 140 | ❌ 未开工 |
| integration | 23 | 0 | 23 | ❌ 未开工 |
| erp | 7 | 0 | 7 | ❌ 未开工 |
| ai / rd | 2 | 0 | 2 | ❌ 未开工 |

### 11.3 未完成清单（逐条可接手）

| ID | 任务 | 当前进度 | 涉及服务 / 文件 | 阻塞原因 | 下一步 |
|---|---|---|---|---|---|
| B43-01 | unified-core 407 处 fail-closed | 0 / 407（曾改 22 文件，因 44 error 整体回滚） | `svc/unified-core/src/modules/`：`file/download.rs`(15 err)、`file/manage.rs`(14)、`flow/statistics.rs`(6)、`flow/delegate.rs`(6)、`file/upload.rs`(4)、`flow/instance.rs`(2)、`settings/smtp.rs`(1)、`menu/mod.rs`(1)、`menu/handlers.rs`(1)、`flow/task.rs`(1)，另 12 文件为半成品 | agent 未完成即被收尾终止；遗留语法错：缺 `ApiResponse` 导入 24 处(E0433)、`await` 在非 async 块 3 处(E0728)、参数个数不匹配 3 处(E0061)、`claims` 未定义 1 处(E0425) | 按 `artifacts/batch43/FIX_SPEC.md` 重做。**改进打法**：先挑 1 个小文件（如 `settings/smtp.rs`）打样验证范式 → `cargo check` → 再每 3–5 文件一批滚动编译，不要一次性铺 22 文件 |
| B43-02 | finance 217 处 | 117 / 334（7/16 文件，CHECK_EXIT=0） | `svc/finance/src/modules/`：已改 `accounting_subjects / audit_v52 / compliance_v51 / operational / risk_v54 / voucher_template_entries / mod.rs`；未改 9 文件 | agent 被收尾终止 | 续改剩余 9 文件。`rls_tenant(&claims)` 薄封装已就绪，可直接复用；注意 `only_own_schema_query!` 宏与 Cargo.toml 的 `topems-shared-boundary` 声明 |
| B43-03 | lims 143 处 | 58 / 201（9/12 文件，CHECK_EXIT=0） | `svc/lims/src/modules/`：`analyte / audit / dashboard / data_sync / integration / process / reagent / statistics` 等；未改 3 文件 | agent 被收尾终止 | 续改。**待复核**：`process.rs` 用了 `Extension<TenantContext>` + `Extension<Claims>` 双提取，需确认 lims 路由栈确实同时注入两者（否则运行时 500）；`save_schedule_result` 等辅助函数已改收 `&mut Transaction`，续改时保持一致 |
| B43-04 | analytics 30 处 | 121 / 151（17/18 文件，CHECK_EXIT=0） | `svc/analytics/src/modules/**`：`bi/*`（comparison/dashboard crud·export·realtime·share·templates/data_drilldown/multidimensional/predictive/row_level_permission/self_service_report/widget）、`report/*`（report/schedule/subscription/template）、`routes.rs` | agent 被收尾终止 | 续改剩余 1 文件。**坑**：`bi/websocket.rs` 曾因 `claims` 在事务之后才解析导致编译失败被 revert —— 正确做法是先解析 token 得 claims 再开事务，或把事务下沉到 `handle_dashboard_socket` 内部按需开 |
| B43-05 | qms 177 处 | 0 / 177 | `svc/qms/src/modules/apqp.rs`（32 处最大块）+ 12 文件 | agent 派出后立即被收尾终止，未产生改动 | 重新派工，参照 `FIX_SPEC.md`。`apqp.rs` 缺陷与批 42 的 doc 模块同构：**写路径带 `AND tenant_id = $N`、读路径（4 个列表分支）漏且全用裸池** |
| B43-06 | ehs 140 处 | 0 / 140 | `svc/ehs/src/modules/*.rs`（12 文件） | 并发上限 5，未派到 | 派工 |
| B43-07 | 其他域 33 处 | 0 / 33 | `integration` 23（3 文件）、`erp` 7（2 文件）、`ai` 1、`rd` 1 | 同上 | 可与 ehs 合并一包派工 |
| B43-08 | 1181 复核的 796 条新增去向 | 复核已完成；796 条已并入各域清单，其中 mes 178 条已修 | 产出 `artifacts/batch43/b43_nosql_recheck.csv`（1181 行）、`b43_nosql_recheck.md`（含 796 条完整清单按服务分组） | 属于 B43-01~07 的一部分，已计入 | 随各域续修；判词取值 `fail-closed / non-prod-test / non-http-path / no-rls / non-prod-ddl / biz-filtered` |
| B43-09 | `non-http-path` 中间件评估（101 条） | 未修（仅登记） | `audit_log.rs::log_audit_entry`、`versioning.rs` 等每请求执行但不在 `.route` 挂载链 | 判定口径未定：中间件执行时 GUC 是否已设需实测确认 | 单独评估：若执行时机在 `tenant_middleware` 之后则安全；否则需在中间件内部自开事务 |
| B43-10 | unified-core iam 禁动区 | 未改（维持原状） | `/iam/roles`、`/iam/roles/{id}`、`/iam/permissions` 3 条 | 用户明令禁动 | 维持只登记，等用户拍板 |
| B43-11 | `rd.deploys.formula_id` | 166 行待补录 | `rd` schema | 补录映射需业务确认 | — |
| B43-12 | 三份同名 `core_doc_*` 影子表清理 | 未做（DDL） | `flow`（权威）/ `public`（影子）/ `doc_service`（影子且未启 RLS） | DDL 变更，用户未表态 | 登记待拍板 |
| B43-13 | finance 6 个新码命名口径 | 未确认 | finance 权限码 | 需口径确认 | — |
| B43-14 | 多租户 A/B 对抗性验证缺口 | 未做 | 全部受影响端点（真实租户可读 / 跨租户不可见 / superadmin 可见） | 各域未跑完，实测无法开始 | 各域修完后统一跑实测矩阵 |
| B43-15 | `statement_cache_capacity(0)` 性能影响 | 未量化 | `lib/shared-db` | 缺基准对比数据 | 压测对比（带/不带 prepared statement） |
| B43-16 | 供应商主数据两项 | 待确认 | `mdm_suppliers.category` 自由文本列是否 DROP；`scm↔srm` 既有 `data_sync` 同步通道边界 | 产品口径未拍板 | — |
| B43-17 | `flow.core_doc_document_versions` 未启 RLS | 未定 | `flow` schema | 代码已按范式包裹（无副作用，未来启用即生效） | 是否补 RLS 待定 |
| B43-18 | 本批未跑门禁 | 未做 | vitest（621 files / 6642）、smoke（4501）、迁移四件套、porcelain 检查 | 收尾优先，未跑全量 | 下批开工前补跑；vitest 必须用 `apps/web/node_modules/.bin/vitest run` |

### 11.4 unified-core 回滚说明

- 回滚动作：`git checkout -- svc/unified-core/`，恢复至当时 HEAD。
- 回滚前该域已有 22 个文件被改，其中已完成的完整部分（`flow/monitor.rs` 41 处、`flow/approval.rs` 26 处、`automation/mod.rs` 24 处、`system_audit` 11 处、`tenant/handlers.rs` 12 处等）**一并回滚**，下一轮需重做。
- 44 个 error 集中在 4 个半成品文件：`file/download.rs` 15、`file/manage.rs` 14、`flow/statistics.rs` 6、`flow/delegate.rs` 6。
- 错误类型分布：E0433 找不到 `ApiResponse` 类型 24 处、E0728 `await` 在非 async 块 3 处、E0308 类型不匹配 3 处、E0061 参数个数 3 处、E0425 找不到 `claims` 1 处，其余为语法 token 错误（`expected ... found Json` / `expected identifier found keyword if` / 文档注释位置错）。

### 11.5 残留风险

1. 保留的 4 个域（mes / analytics / finance / lims）虽 `cargo check` 0 error，但**未做任何运行时实测**，RLS 修法的运行时正确性仅有代码审查支撑。
2. 474 为文件级覆盖统计，**偏乐观**；文件内可能仍有漏改行，实际剩余处数可能高于 1146。
3. 回滚后的 unified-core 407 处缺陷**完全未处理**，其数据可见性仍为 fail-closed 恒 0 行状态（既存行为，未劣化）。
4. 本批改动未跑全量门禁，与基线（vitest 6642 / smoke 4501）的对齐性未验证。

### 11.6 与远端 `Db::scope` 方案的冲突结论（重要，下一轮开工前必读）

**结论：批 43 的 `begin_tenant_txn` 代码改动已全部撤销，改为以远端既有 `Db::scope` 架构为准。**

#### 事实
1. 推送时发现 `stale-base`：远端 `origin/main` 领先本地 **83 个提交**，其中已落地**完整的 RLS 租户上下文收敛方案**：
   - `3a8f45f9a fix(rls): fail closed on request-txn init and propagate tenant into Db scopes`
   - `859cb9e56 refactor(rls): retire ScopedPool in favor of Db scope`
   - `e1e403d88 feat(shared-auth): add ScopedPool reusing the request RLS transaction`
   - `5a473d231 feat(db): 新增显式系统作用域 scope_system/scope_read_system`
   - `43c2efa57 fix(tenant): materialize inserted tenant_id from the RLS transaction GUC`
   - P0 迁移：`database/migrations_deferred/20261106120100_p0_rls_fail_closed.sql` 等
   - 各域 `fix(xxx): bind tenant in ...` 系列（crm/scm/wms/qms/finance/mes/lims/analytics/portal/pm/rd/integration/gis/master-data/mobile）
2. **远端标准机制**（`lib/shared-db/src/scope.rs`）：
   ```
   Db::scope()            // 读写事务，同时落 search_path + 请求租户 GUC
   Db::scope_read()       // 只读事务
   Db::scope_system()     // 系统作用域（nil tenant 旁路）
   Db::scope_read_system()
   Db::scope_with(...)    // 自定义
   ```
   注释明确：`Db::scope() 在独立事务上同时落 search_path 与请求租户 GUC，RLS 与内联谓词可见`。
3. 批 43 用的 `lib/shared-db/src/rls.rs::begin_tenant_txn` 与 `Db::scope()` **语义等价但 API 不同** → 若两者并存即「两套轮子」，违反用户「通用性优先、不造轮子」原则。
4. **但远端也未全量修完**：抽查 `svc/mes/src/modules/work_report.rs` 在 origin/main 上仍有 15+ 处 `&state.pool`，远端只提供了机制、未逐文件改到。**1620 处基线仍成立**。

#### 因此下一轮开工的正确打法（修订 B43-01~07）
| 原计划 | **改为** |
|---|---|
| 在 service 方法内 `begin_tenant_txn(&self.pool, opt)` | `self.db.scope()` 或 `self.db.scope_read()` / `scope_system()` |
| handler 内 `begin_tenant_txn(&state.pool, opt)` | `state.db.scope()` / `scope_read()` / `scope_system()` |
| 自己写 `set_config('app.tenant_id',...)` | 不写，`Db::scope` 内部已做 |
| `&mut *tx` 执行查询 | `&mut *scope`（`ScopedTxn` 实现 `DerefMut`） |
| 各域自定义 `open_admin_txn` / `rls_tenant(...)` 薄封装 | 统一改用 `Db::scope*`，不保留域内私有封装 |

**唯一例外**：若某 crate 尚未注入 `Db`（只持有裸 `PgPool`，如 lims 原来那样），先把 `PgPool` 改为 `Db`（`Db::new(pool, search_path)`），再走 `Db::scope*`；不要在裸 `PgPool` 上另造事务 helper。

#### 撤销的代码改动清单（如需复查，可从 git reflog 或本次提交记录取回）
- `lib/shared-db/src/rls.rs`（新增 `begin_tenant_txn`）——撤销
- `svc/analytics/**` 17 文件——撤销
- `svc/finance/**` 7 文件——撤销
- `svc/lims/**` 9 文件（含 `Cargo.toml` 补 `topems-shared-db`）——撤销
- `svc/mes/**` 27 文件——撤销
- `Cargo.lock`——撤销
- 已提交哈希 `0933d0be1`（64 files / +6322/−6042），因 stale-base 未推送，已在本地 `reset --mixed 835f8210d` 撤销

#### 未撤销（保留的成果）
- `TODO.md`（本文件 §11 全部内容）
- `docs/audit/TOPEMS审计整改计划_2026-11-01.md`（批次表批 43 行，需按本节结论修订打法描述）
- `artifacts/batch43/`：`FIX_SPEC.md`、`b43_nosql_recheck.csv`（1181 行）、`b43_nosql_recheck.md`（含 796 条新增清单）、`b43_mes_report.md`
- `artifacts/batch42/`：`fail_closed_detail.csv`（824）、`audit_findings_v2.json`、`rls_tables_raw.txt`

---

## 12. W7：RLS 租户隔离重做（基于 `Db::scope*`，2026-11-08 立项）

### 12.1 立项依据

本地已 rebase 到 `origin/main@926fe1af2`（含远端 RLS 收敛方案）。批 43 的 `begin_tenant_txn`
方案作废归档于 `artifacts/wip-archive-20261108/`；定性、可复用度、各域前置条件与批次表见
**`docs/quality/rls-rework-after-rebase-2026-11-08.md`**。

一句话结论：旧改动不可 cherry-pick，但 >80% 是机械映射（`begin_tenant_txn(pool, opt)` → `db.scope*`，
`&mut *tx` → `&mut *scope`）；最耗工处是 `ScopedTxn` 不暴露 `PgConnection`，所有
`&mut Transaction<'_, Postgres>` 辅助函数需改签名。

### 12.2 约束（与原 RLS 工作流一致，另加两条）

- 只允许一套事务工厂：`Db::scope() / scope_read() / scope_system() / scope_read_system() / scope_with()`；
  **禁止**再引入 `begin_tenant_txn` 或域内私有 `open_admin_txn` / `rls_tenant()` 薄封装。
- 未注入 `Db` 的域（analytics / finance / lims / unified-core / qms / ehs / erp）先改
  `AppState` 与 `main.rs` 注入 `Db::new(pool, "<模块 search_path>")`，search_path 取值与
  `svc/server/src/modules/*_real_module.rs` 中的显式值保持一致（W2-A 已固化）。
- 每批必须做双租户实测（A 可见 / B 不可见 / 超管可见），不得只以编译通过收工。
- 每批结束跑 `cargo check` + `clippy -D warnings` + `fmt` + `web-contract-smoke`（基线 4501）。

### 12.3 批次建议

| 批次 | 范围 | 前置 | 状态 |
|---|---|---|---|
| W7-0 | 打样：`settings/smtp.rs` 或 `erp`（2 处） | 无 | ⏳ 待开工 |
| W7-1 | integration（14）+ erp（2）整域清零 | 二者已/易注入 `Db` | ⏳ |
| W7-2 | mes 剩余（粗口径 553，已有 3 文件示范） | 无 | ⏳ |
| W7-3 | analytics（169）+ finance（278） | 先注入 `Db` | ⏳ |
| W7-4 | lims（202）+ qms（297）+ ehs（208） | 先注入 `Db` | ⏳ |
| W7-5 | unified-core（566，原 407 处缺陷） | 先注入 `Db`；按 `artifacts/batch43/FIX_SPEC.md` 文件序 | ⏳ |

> 括号内为 grep 粗口径的裸池引用数，含合法用法，**不可当缺陷数**；权威基线仍为 1620
> （`artifacts/batch43/b43_nosql_recheck.csv`）。

### 12.4 qms 3 张 test 迁移表待处置（2026-11-10 立项，本轮不动）

来源迁移 `20261105235000_test_baseline_20_reverse_tables.sql`（description：`test baseline 20 reverse tables`）。
该文件命名带 `test_`，按 `scripts/migration/apply-forward.sh` 的 `DENY_RE`
（`(^|_)(db[0-9]+_(test|5433)|5433_|test_)`）本应在生产被拒绝，但实测它在 `_sqlx_migrations`
里 `success = true` —— 说明历史上存在绕过白名单的入口。三表建表即**未接入 RLS**
（35 张无 RLS 表中的 3 张），且**全部 0 行**。

| 表名 | 行数 | 来源迁移号 | 处置方向 | 负责人 |
|---|---:|---|---|---|
| `qms.qa_inspection_items` | 0 | `20261105235000` | 待定（转正 / 下线） | 待定 |
| `qms.qa_inspection_plans` | 0 | `20261105235000` | 待定（转正 / 下线） | 待定 |
| `qms.qa_sampling_plans` | 0 | `20261105235000` | 待定（转正 / 下线） | 待定 |

处置口径（二选一，拍板后另开批次）：
- **转正**：按正常业务表补齐 `tenant_id` + `ENABLE/FORCE RLS` + 收敛策略，并把建表语句迁到
  正式迁移号；同步补进 qms 模块的代码与文档。
- **下线**：确认无代码/无报表/无外部依赖后 `DROP TABLE`，并从 `_sqlx_migrations` 移除该
  test 迁移记录（需单独评审，**不得顺手删**）。

本轮**不改结构、不删表、不动迁移账本**，仅登记待办。

### 12.5 `pdm.pdm_master_data_refs` 补列（2026-11-10 立项，试点窗口之后动手）

生产实测该表只有 `id`、`deleted_at` 两列（桩表），而代码 INSERT 契约有 12 列 ——
事件处理器 `svc/pdm/src/event_handlers/mod.rs` 的写入自上线起从未成功过
（`column "master_data_id" of relation "pdm_master_data_refs" does not exist`）。
表为空，补列零数据风险，但**不塞进本轮 RLS 试点窗口**。

| 补列 | 类型（按代码用法推定） | 来源 |
|---|---|---|
| `master_data_id` | `text NOT NULL` + `UNIQUE`（`ON CONFLICT (master_data_id)` 依赖唯一约束） | INSERT |
| `tenant_id` | `uuid NOT NULL` | INSERT + RLS 策略谓词 |
| `domain` | `text NOT NULL` | INSERT |
| `code` | `text NOT NULL` | INSERT / UPDATE |
| `name` | `text NOT NULL` | INSERT / UPDATE |
| `status` | `text NOT NULL` | INSERT / UPDATE |
| `source_service` | `text NOT NULL` | INSERT |
| `local_entity_type` | `text`（可为 NULL，代码 `Option`） | INSERT |
| `payload_snapshot` | `jsonb` | INSERT |
| `last_synced_at` | `timestamptz NOT NULL` | INSERT |
| `created_at` / `updated_at` | `timestamptz NOT NULL DEFAULT now()` | INSERT |

配套动作（一笔独立迁移，单独评审）：
1. 补列 + 唯一约束 + `tenant_id` 索引。
2. 补列后该表**必须**进租户隔离：`tenant_id` 就绪即按普通租户表加 `ENABLE/FORCE RLS`，
   同时保留「全局只读」策略（当前口径：全局只读 + 系统通道写），两者冲突时以
   `docs/quality/w7-b4-module-comparison-2026-11-10.md §2.5` 例外清单为准并同步更新。
3. 失败路径**实测不是显式报错**：`event_handlers/mod.rs` 的写入 `Err` 只走
   `tracing::warn!("本地 ref 同步失败（graceful fallback）")` 后继续返回 `Ok`，
   调用方/上游拿不到失败信号。补列迁移评审时须一并拍板：是改用显式错误向上返回，
   还是维持 graceful fallback（若维持，需在文档写明「ref 表可丢」的业务前提）。

负责人待定。

### 12.6 部署纪律：WS 事件桥接单实例（2026-11-11 立项，即时生效）

`spawn_event_bridge` 在单体 `svc/server` 与独立 `svc/unified-core` 都会启动，且消费组名固定为
`unified-core-ws-bridge`。同机同时在线时，Redis Stream 事件会在两条 CONSUMER 连接间随机分流
并被 ACK：

- 症状：WS 连接、订阅、鉴权全部正常，但 `PortalNotificationPublished` 永远收不到；无 ERROR/WARN，
  `XINFO GROUPS topems:stream:events:PortalNotificationPublished` 显示 `entries-read` 增长、`pending=0`。
- 实例：2026-11-11 本地 WS 端到端首轮即因此失败（残留的 `:8000` 独立进程抢走消息），停掉后 13/13 通过。
- 纪律：同一环境只跑一种形态（生产=单体；纯独立调试=独立进程，先停单体）；
  开窗前 `pgrep -fl topems-unified-core` 必须为空。窗口执行总表 §1.0.1 已同步。
- 长期（未做）：给单体与独立进程使用不同默认消费组名（或按 `HOSTNAME/PORT` 派生），
  从机制上消除竞争；完成前以上纪律为准。

### 12.7 F1：`public.core_tenant_users` 旧策略缺 `app.rls_system` 分支（2026-11-11 立项，待修）

**现象**：生产 `public.core_tenant_users` 只有一条旧策略 `tenant_isolation_core_tenant_users`
（`PERMISSIVE / ALL / {public}`），qual 不含 `app.rls_system` 分支。登录的成员解析走系统通道
（`app.tenant_id = 00000000-0000-0000-0000-000000000000` + `app.rls_system = 'on'`），
在 app 角色下实测命中 **0 行**（`select tenant_id … where user_id=…` 空结果）。

**后果**：`resolve_membership_tenant` 拿不到成员行 → 回落 `DEFAULT_TENANT_ID`，
**非默认租户用户登录一律被签成默认租户**。W7-B4 窗口内实测：探针 B 的成员行指向临时租户 B，
登录 token 的 `tenant_id` 仍为默认租户，只能靠窗口内临时策略取得正确的 B token。

**窗口内临时处置（已还原，无残留）**：

```text
BEFORE | tenant_isolation_core_tenant_users | PERMISSIVE | {public} | ALL
CREATE | POLICY w7b4_probe_sysread ON public.core_tenant_users
         AS PERMISSIVE FOR SELECT TO topems_prod
         USING (current_setting('app.rls_system', true) = 'on')
       | 2026-11-11 17:40:43
LOGIN  | A/B 均 code=0，B 的 tenant_id=c51c3a73-6cd4-49eb-b21e-efd7231e445b（临时租户 B）
DROP   | POLICY w7b4_probe_sysread | 2026-11-11 17:40:44
AFTER  | tenant_isolation_core_tenant_users | PERMISSIVE | {public} | ALL
```

删除后回归（⑤）：新建默认租户临时探针 `w7_mes_probe_c`（`is_superuser=false`）登录
`http=200/code=0`，`tenant_id=00000000-0000-0000-0000-000000000001`，随即删除，`count(*)=0`。
说明「策略删了登录也废了」不成立；但**非默认租户登录仍然不可用**，F1 未消除。

**修复方向**（独立工单，不并入 W7-B4 已推送迁移）：

1. 将 `public.core_tenant_users` 策略对齐 W7-B4 fail-closed 模板：
   `COALESCE(current_setting('app.rls_system', true),'off')='on' OR tenant_id = (NULLIF(current_setting('app.tenant_id', true),''))::uuid`，
   同时收敛旧策略「GUC 未设置即放行」的 fail-open 分支。
2. 同批排查 `public.core_users` / `core_sessions` / `core_refresh_tokens` 是否有同类旧策略。
3. 验收：非默认租户用户登录 token 的 `tenant_id` 等于其成员行租户；`x-tenant-id` 对非超户仍不可欺骗；
   A/B 跨租户读写隔离保持；`switch-tenant` 路径实测。

**证据文件**：`docs/quality/w7-b4-manufacturing-window-apply-2026-11-11.md` §11.7（F1 现象与临时策略前后对照）、
§11.13（策略删除后登录回归）、§11.14（遗留）。

**2026-11-11 方案 A 已上线生产**：严格 fail-closed 迁移 + 代码 5 处裸池改作用域 + `Err` 不回落 +
membership 确定性选择；副本预演与生产窗口验收全绿。方案/预演：
`docs/quality/w7-b4-f1-change-plan-and-rehearsal-2026-11-11.md`；窗口报告：
`docs/quality/w7-b4-f1-production-window-apply-2026-11-11.md`。

**F1 关联 TODO（本次不动，按序处理）**：

1. ~~`create_role` 裸池写 `core_roles`~~：2026-11-11 已随 F1 修复（租户通道 / 平台系统通道）。
   仍待办：`update_role` / `delete_role` 裸池对上不存在的行执行 UPDATE（0 行更新但返回成功，
   属静默撒谎），需按同构改作用域并回归角色管理页。
2. `get_user_permissions` 的角色/权限列表裸池读：严格策略下少报租户域角色（fail-closed）。
3. `core_tenants.rls_global_read` 的 `tenant_id IS NULL` 全局目录读取：如需收紧为 `id = GUC`，
   须单独设计并回归租户模块（租户模块多处查询依赖）。
4. `iam` 空影子表：`iam.core_tenant_users`、`iam.core_users`、`iam.core_roles`、`iam.core_user_roles`、
   `iam.core_permissions`、`iam.core_role_permissions` 均 0 行（`iam.core_tenants` 亦为 0），
   待确认是删除还是纳入后续迁移基线。
5. membership 无 `is_default` 列：当前 `created_at ASC → id ASC` 仅为**确定性排序**；
   若产品需要“默认租户/默认公司”语义，应新增 `is_default` 列并在
   `pick_membership_tenant` 中显式优先，不得用排序规则模拟默认值。

---

## 13. 财务网关权限改判细分码（2026-11-09 立项，待开工）

### 13.1 现状
- 网关 `svc/server/src/modules/finance_real_module.rs` 的 `require_finance_write` 对所有
  非 GET/HEAD/OPTIONS 的 `/api/finance/**` 硬校验 `finance:admin`（精确匹配，非前缀）。
- 该码在生产 `core_permissions` 中长期缺失（历史迁移 `20261107000024_finance_admin_seed.sql`
  早于账本锚点，从未登记进生产账本），导致除超管外所有角色的财务写请求 403；
  内层路由的细分码（如 `finance:voucher:read`）根本没有机会生效。
- 2026-11-09 已用 `20261108141500_finance_admin_umbrella_grant.sql` 补码并授予
  `tenant_admin` / `finance_manager` 止血；**本次未改动网关**。

### 13.2 为什么现在不改
- 止血批次要求最小变更、可快速回退；改网关会改变全部财务路由的鉴权语义，
  需要单独的全量回归（凭证、总账、辅助核算、期间、报表、资金、税务、审批配置）。

### 13.3 目标设计（二选一，开工前定稿）
- A. 网关按方法与资源判细分码：GET → `finance:<resource>:read`，写 → `finance:<resource>:write`；
  无法映射的资源显式白名单并保留伞码兜底。
- B. 网关只做模块准入（任意 `finance:` 前缀），写权限完全交给各路由组的
  `require_permission("finance:xxx:write")`，删除"有细分码却被伞码拦住"的结构性矛盾。
- 无论哪种，`finance:admin` 的定位收窄为"审批配置等管理端点"，不再作为全模块写门。

### 13.4 涉及接口
- 网关：全部 `/api/finance/**` 非 GET 请求（凭证、总账、辅助核算、期间、报表、资金、税务等）。
- handler 级伞码：`/api/finance/approval-configs`（GET/POST）、
  `/api/finance/approval-configs/{id}`（GET/PUT/DELETE）。
- 权限码基数：生产 finance 域 74 条细分码（补 `finance:admin` 后 75 条）。

---

## 14. P3 法定报表（2026-11-09 立项）

### 14.1 技术债：期初余额仍留在 `erp.opening_balances`

- 现状（本批决定 5）：期初表**不搬迁**，保留在 `erp`；`finance` 侧报表直读该表。
- 已做：`erp.opening_balances` 补 `account_id`，迁移期按 `tenant_id + subject_code` 回填并
  fail-closed 校验（`20261109110000_p3_opening_balance_account_link.sql`）；报表接口在运行期
  再次校验「期初行必须已关联科目 + 期初/期末借贷平衡」，不通过返回 409。
- 未做（P4）：
  - 表归属仍跨 schema，`finance` 直连 `erp`（W2-C 同源问题）；
  - `set_opening_balance` 等写入端点仍用 `f64` 入参，未改 `Decimal`；
  - 期初无币种字段，多币种折算未支持；
  - 期初与总账之间只做「借贷平衡 + 科目可解析」的一致性校验，未做逐科目
    「上年期末 = 本年期初」的勾稽。
- 迁移评审时需一并处理：`erp.opening_balances` 若迁入 `finance`，需同步删掉 W2-C 的
  直连 allow 条目与 `scripts/schema_boundary.json` 中 `finance.allow` 的 `erp` 例外。

### 14.2 技术债：`financial_reports.org_id` 语义

- 本批把历史报表的 `org_id` 对齐为 `company_id`（既有唯一键
  `(report_type, org_id, period, currency_code)` 无法 DROP 重建，门禁禁止）。
- 后续（P4）应正式用 `company_id` 唯一键替换，并移除 `org_id` 的歧义用法。


---

## 15. v5.2 审计模块下线口径（2026-11-09 立项）

- 六张 `_v52` 表（`finance_alert_configs_v52`、`finance_alert_history_v52`、
  `finance_anomaly_alerts_v52`、`finance_audit_findings_v52`、
  `finance_detection_configs_v52`、`finance_audit_rules_v52`）是同属 v5.2 审计模块的
  同一数据面，现已代号对齐、列补齐、契约零差异、0 行，处于可用状态。
- **口径**：将来若决定整体下线 v5.2 审计模块，六张表**同批处置**，
  不做单体删除——单删一张会留下半拆模块与死引用，成本高于保留。
- 决策记录：第六张 `finance_audit_rules_v52` 保留，不删除（2026-11-09）。

---

## 16. 事件订阅清理与生产者租户补齐（2026-11-11）

### 16.1 已删除的 6 个死订阅（生产端从未接入）

以下事件类型此前被 `ai` / `gis` / `mobile` 订阅，但仓库内**没有任何生产方**（无
`publish_event` 调用点、无 `EventType` 使用方），属于「看着接上了其实空转」。
本轮已删除订阅与 handler，将来接入时按下表从生产端重新对接：

| 事件 | 原消费方 | 将来从哪接（生产端落点） |
|---|---|---|
| `LimsInspectionAbnormalDetected` | ai | LIMS 检验结果判定为异常处（`svc/lims/src/modules/inspection_task.rs`，当前只发 `LimsInspectionResultSubmitted`），或由 integration 在 `qms_lims_ehs.rs` 判定后补发 |
| `ScmShipmentReceived` | gis | SCM 收货/到货确认动作（`svc/scm`，当前无 shipment 模块写入路径） |
| `StockOutbound` | gis | WMS 出库单确认（当前只发 `WmsInventoryItemShipped`，语义不同，需先确定是否复用） |
| `WorkflowApproved` / `WorkflowRejected` | mobile | 仓库内无 workflow 服务；接入时由外部审批引擎在状态流转处发事件 |
| `AfterSalesTicketCreated` | mobile | CRM 售后工单创建（`svc/crm`，当前创建路径不发事件） |

接入时要求：payload 携带 `#[serde(default)] tenant_id: Uuid`，生产端取不到真实租户则
**不发布**，禁止发 nil 或随机 UUID。

### 16.2 语义变化：超管创建不产生事件

超管（或任何无租户上下文）创建的业务对象不再发布领域事件：`StockInbound` 的超管入库、
`SalesOrderCreated` 的超管开单均不进入事件流。原因是没有租户归属的事件只会变成 nil 行或
DLQ。若将来需要超管操作也产生事件，必须先定义「平台级事件」通道，不能复用租户事件。

### 16.3 通知 WebSocket 从未接通（另开一轮，未处理）

1. 前端 `apps/web/src/hooks/useWebSocket.ts` 连接 `/ws/core`，服务端真实路由是
   `/ws/core/notifications`（unified-core）与 `/ws/{module}/{feature}`（BFF），`/ws/core`
   两段路径无路由 → 404。
2. 生产入口 BFF（`svc/server`）未启动 `spawn_event_bridge`，且模块白名单不含
   `core`/`bi`/`gis`，前端 `useImWebSocket` 的 `/ws/core/im`、dashboard 的
   `/ws/bi/dashboard`、`/ws/gis/map` 在 BFF 均为 426。
3. 前端订阅帧为 `{type:'subscribe', payload:{...}}`（无签名），服务端只认 JSON-RPC
   `method` + `signature`，即使路径对齐也订阅不上。

以上三条合起来即「通知功能从未接通」：功能是死的，只是没人报障。优先级低于 RLS 收口，
但需单独立项修复。

## 17. 请求事务收尾与连接容量（2026-11-12 立项）

### 17.1 连接池容量按「每写请求 2 条连接」重算

`tenant_middleware` 在请求开始 `pool.begin()` 占用 1 条连接，直到响应结束才 commit/rollback；
handler 内若再调用 `Db::scope_for_tenant()` / `scope()`（QMS 86 处、PM 130 处、PDM 115 处），
会再 `BEGIN` 一条新连接。**写请求峰值 = 2 条连接/请求**，读请求若也用 `scope*` 同样是 2 条。

当前各服务 `max_connections` 取 2（如 `svc/server` 日志 `max_connections=2`），31 个模块池合计
上限约 62 条，远低于「并发写请求数 × 2」。收敛方案（`scope_with` 复用请求事务）落地前，
连接池参数必须按 2 倍重算，否则高并发下先出现池等待、再出现请求事务与 scope 事务互相等待。

### 17.2 架构工单：「请求事务 vs `scope_for_tenant`」二选一（需先出全局方案）

同一请求内存在两套互不相干的事务：

1. 中间件请求事务（`lib/shared-auth/src/middleware/tenant.rs`），由 `Extension<Arc<Mutex<Option<Transaction>>>>`
   传给 handler，SCM/WMS/ERP/HRM/CRM/SRM/RD/EHS 共 8 个服务在用（`&mut **txn` 写语句合计 590 条）。
2. `Db::scope_for_tenant()` 自开连接自开事务（`lib/shared-db/src/scope.rs`），QMS/PM/PDM 等在用。

两者不是同一条连接、不是同一层事务：外层非 2xx 回滚不会回滚内层 scope 已 commit 的写入，
反之 scope 失败也不影响外层请求事务里的写入。**必须先出全局方案**（推荐统一到 `scope_with`
复用请求事务，或明确废弃请求事务、全部改 scope），再按服务分批改；禁止在单个窗口里逐服务
改一半。

判定依据见 `docs/quality/w7-b4-scm-ehs-wms-readonly-assessment-2026-11-12.md` §5。

### 17.3 全局口径：禁止用 `200 + success:false` 表达业务失败（2026-11-12 立项）

多个模块的失败分支仍以 **HTTP 200 + body `{success:false}`** 表达业务失败（调用方与网关
按状态码判成败时会当成成功）。已确认的近期样本：`POST /api/scm/sync/purchase-to-inbound`
（改造前 4 次必然失败全部返回 200，见 `docs/quality/w7-b4-scm-ehs-wms-readonly-assessment-2026-11-12.md`
§6.4），WMS `POST /wms/sync/inbound-from-scm` 同形态。

统一改为 4xx/5xx 是**全局口径问题**，需要先定错误码映射（404 不存在 / 409 冲突或失败态 /
422 语义错误 / 500 内部 / 503 可重试）并同步前端与网关的判错逻辑，**不能在单窗口里逐路由改一半**。

本轮只改 SCM 同步链路这一处（`purchase-to-inbound` 两个入口 + `record_sync_log` 事务化），
其余模块按服务分批另立窗口；排查清单可由
`rg 'ApiResponse::success\(\s*serde_json::json!\(\{\s*"success":\s*false' svc/` 起步。

### 17.4 请求事务化回归补跑（2026-11-16 尾收，已完成）

- `svc/mes/tests/material_plan_e2e.rs`：旧用例实跑全 500。根因是用例陈旧——未注入 task-local 租户上下文（`Db::scope_with` 直接报 `RLS context missing`）且插入行不写 `tenant_id`，与 handler 的 `tenant_id = $4::uuid` 谓词永不匹配。已按 `equipment_e2e.rs` 范式补 `claims.tenant_id` + `scope_request_tenant` + 跨租户数据，实跑 **3/3 通过**（生产代码未改）。
- `svc/finance/src/modules/forecast_v53.rs` 的 3 个 `#[sqlx::test]`（`predict_matches_text_entity_id` / `predict_without_history_maps_to_400` / `retrain_without_history_maps_to_400`）实跑 **3/3 通过**。
- 环境结论：此前「`permission denied to create database`」源于测试按 `.env` 连 `topems_prod`（`rolcreatedb=false`）；本机 `topems_test_runner`（`rolcreatedb=true`）可承载 `#[sqlx::test]` 临时库，`topems_prod` 全程零写入。详见 `docs/quality/m1-acceptance-2026-11-16.md` §8.2、§11.3。
