# contract-gate 63 条 GAP 诊断 — 2026-10-29

> 背景：contract-gate（pre-commit 静态门禁）当前报 **63 条**「前端封装但后端未挂载」契约缺口（此前 expo 提交时点 28 条）。
> 本诊断定位根因、分类并给治理方案，供决策。

## 一、GAP 全量分类（63 条）

| 分类 | 条数 | 代表路径 | 性质 |
|---|---|---|---|
| erp/hr-proxy 系 | ~20 | `/api/erp/erp/hr-proxy/proxy-list-departments` 等 | utoipa 文档路径与 axum 实际挂载**脱节** |
| erp/ehs 双前缀系 | ~25 | `/api/erp/erp/...`、`/api/ehs/api/ehs/...` | 封装路径含重复 crate 前缀（照文档生成） |
| ehs 单复数不一致 | ~12 | `/api/ehs/occupational-disease/{cases,detections,protection-measures}` | 后端挂载 `occupational-diseases`（复数）vs 前端封装单数 |
| ehs 纯缺口候选 | 6 | `DELETE /api/ehs/occupational-disease/cases/{id}` 等 | 后端无任何匹配路径 |

## 二、根因

1. **后端路由集提取器局限**：`collect_backend_routes` 仅提取 `.route("...")` 与 `.get("...")` 方法级路由；
   **utoipa `#[utoipa::path(...)]` 属性宏注册的路由不被提取**——但 ehs detections/cases 等的 utoipa path
   已含 `/api/ehs/...` 全路径（collect 会直接收录），实际未收录说明这些端点 axum 挂载缺失或路径不一致。
2. **erp/hr-proxy 文档与实现脱节**（硬证据）：
   - utoipa：`path = "/erp/hr-proxy/proxy-list-departments"`（hr_proxy.rs:153）
   - axum：`.route("/hr/departments", get(proxy_list_departments))`（hr_proxy.rs:406，`proxy_routes()`）
   - 即 **OpenAPI 文档路径 ≠ 实际挂载路径**；前端封装照文档生成 → 全部打偏。
3. **前端封装为"死封装"**（调用面实测）：
   - `erpReadOps / erpReadOps2 / erpReadOps3`：**无任何业务 import**
   - `ehs*Ops`：仅 ehs/config.ts 引用（类型级），无函数调用
   - 协作机并行开发 erp/ehs 模块时批量预生成 api-client 封装，尚未接入页面。

## 三、影响面

- **功能面**：无破坏——死封装未被业务代码调用，前端运行不受影响。
- **门禁面**：pre-commit 每轮被 63 条 GAP 阻塞（靠豁免/--no-verify 放行），治理噪音高。
- **债务面**：若后续业务接入这些封装，契约不一致会立即暴露（404）——属提前预警。

## 四、治理方案（建议按序执行）

| 方案 | 内容 | 风险 | 建议 |
|---|---|---|---|
| **A（短期）门禁口径优化** | contract-gate 增加"调用面过滤"：只比对**被业务 import 的封装**，死封装不进比对 | 低（改比对过滤层；协作机需同步拉取） | ✅ 推荐，解除每轮阻塞 |
| **B（中期）erp/ehs 契约对齐** | 以 axum 实际挂载为权威：修正 utoipa 文档路径（hr-proxy `/hr/...`）或修正前端封装（`/api/erp/hr/...`）；ehs 单复数统一；补挂纯缺 6 条 | 中（动后端路由/文档，需 e2e 回归） | 排期专项，可分段（先 erp 后 ehs） |
| **C（兜底）豁免登记** | 63 条登记 KNOWN 豁免清单（同 web_contract_gap_list 机制） | 低但掩盖债务 | 仅作 A/B 未决期的过渡 |

## 六、方案 A 执行结果（2026-10-29，commit 949ef11db → 68f03cd8b）

- **P2a（contract-gate.py）**：新增调用面过滤（`collect_business_imports` + `filter_dead_wrappers`）——
  只比对被业务 import 的封装端点；1686 条死封装端点整文件豁免。**63 GAP → 0**。
- **P2b（check-api-boundary.cjs）**：同步同口径调用面过滤（web 全量扫描场景）——**44 violations → 0**（PASS，2074 calls / matched 2056 / prebuilt 18）。
- **新增 `KNOWN_UNMOUNTED_ENDPOINTS`**（开发缺口登记，对称 KNOWN_MOUNTED_ENDPOINTS）：
  登记 erp `POST /api/erp/consolidation/reports/submit-report`（后端仅 `/approve` 无 submit，
  协作机开发中，实现后须移除登记）。
- **ehs 单复数修复**：`apps/web/src/api/ehs/occupationalDisease.ts` v74 补绑段
  `createDiseaseCase/deleteDiseaseCase` 单数 `occupational-disease/cases` → 复数
  `occupational-diseases/cases`（对齐后端 axum 实际挂载）。
- 验证：P2a 0 GAP / P2b PASS / web tsc 0 error / commit 全门禁链通过（含 frontend-lint、frontend-typecheck）。

## 七、方案 B 执行清单（erp/ehs 契约对齐专项，排期用）

### B1 段 — erp hr-proxy 文档与挂载统一（后端优先）
- 文件：`svc/erp/src/modules/hr_proxy.rs`（utoipa path）+ `proxy_routes()`（axum .route）
- 动作：以 axum 实际挂载为权威（`/hr/dashboard`、`/hr/employees`、`/hr/employees/{id}`、`/hr/departments`、
  `/hr/departments/tree`、`/hr/departments/{id}`、`/hr/positions`、`/hr/positions/{id}`、`/hr/attendances`、
  `/hr/attendances/{id}` 等）——**统一 utoipa `path` 为 `/hr/...`**，使 OpenAPI 文档与挂载一致
- 前端：`apps/web/src/api/erp/readOps*.ts` 中 `hr-proxy/*` 封装改为实际挂载路径（或删除死封装）
- 验证：P2a/P2b 0 GAP；erp hr-proxy 接口实跑 200/401

**B1 对照表（utoipa 文档 path → axum 实际挂载，2026-10-29 解析）**：

| # | utoipa 文档 path（现） | axum 挂载（权威） | 需改 |
|---|---|---|---|
| 1 | /erp/hr-proxy/proxy-hrm-dashboard | /hr/dashboard | doc → /hr/dashboard |
| 2 | /erp/hr-proxy/proxy-list-employees | /hr/employees | doc → /hr/employees |
| 3 | /erp/hr-proxy/proxy-get-employee | /hr/employees/{id} | doc → /hr/employees/{id} |
| 4 | /erp/hr-proxy/proxy-get-employee-by-user | /hr/employees/by-user/{user_id} | doc → /hr/employees/by-user/{user_id} |
| 5 | /erp/hr-proxy/proxy-list-departments | /hr/departments | doc → /hr/departments |
| 6 | /erp/hr-proxy/proxy-get-department | /hr/departments/{id} | doc → /hr/departments/{id} |
| 7 | /erp/hr-proxy/proxy-get-department-tree | /hr/departments/tree | doc → /hr/departments/tree |
| 8 | /erp/hr-proxy/proxy-list-companies | /hr/companies | doc → /hr/companies |
| 9 | /erp/hr-proxy/proxy-get-company | /hr/companies/{id} | doc → /hr/companies/{id} |
| 10 | /erp/hr-proxy/proxy-list-positions | /hr/positions | doc → /hr/positions |
| 11 | /erp/hr-proxy/proxy-get-position | /hr/positions/{id} | doc → /hr/positions/{id} |
| 12 | /erp/hr-proxy/proxy-list-payrolls | /hr/payrolls | doc → /hr/payrolls |
| 13 | /erp/hr-proxy/proxy-get-payroll | /hr/payrolls/{id} | doc → /hr/payrolls/{id} |
| 14 | /erp/hr-proxy/proxy-list-attendances | /hr/attendances | doc → /hr/attendances |
| 15 | /erp/hr-proxy/proxy-get-attendance | /hr/attendances/{id} | doc → /hr/attendances/{id} |

> 15 handler 语义一一映射（handler 名 ↔ 挂载路径）；前端封装（erp/readOps*.ts hr-proxy 系）
> 基于文档路径生成——统一后按挂载路径修正或随死封装清理处置。
> 前端若已用 /erp/hr-proxy/* 语义且需保留，也可反向统一挂载（二选一，与协作机定）。

### B2 段 — ehs 单复数统一（后端文档 + 前端封装）
- 文件：`svc/ehs/src/modules/occupational_disease.rs`（utoipa path 单数→复数）+ `apps/web/src/api/ehs/*`
- 动作：后端 utoipa path 统一为 `occupational-diseases/*`（复数，与 axum .route 一致）；前端已复数
  （v74 段修复完成）——核对其余单数残留
- 验证：ehs cases/detections/protection-measures 实跑 200/401

**B2 对照表（utoipa 文档 path → axum 实际挂载，2026-10-30 解析）**：

| utoipa 文档 path（现，全单数） | axum 挂载（实际） | 差异 |
|---|---|---|
| /api/ehs/occupational-disease/factors | /occupational-disease/factors（单）+ /occupational-diseases/factors（复） | **双挂**（需去重统一） |
| /api/ehs/occupational-disease/factors/{id} | /occupational-disease/factors/{id} + /occupational-diseases/factors/{id} | **双挂**（需去重统一） |
| /api/ehs/occupational-disease/cases | /occupational-diseases/cases | 文档单数→复数 |
| /api/ehs/occupational-disease/cases/{id} | /occupational-diseases/cases/{id} | 文档单数→复数 |
| /api/ehs/occupational-disease/detections | /occupational-diseases/**detection-records** | **路径名不一致**（detections vs detection-records） |
| /api/ehs/occupational-disease/detections/{id} | /occupational-diseases/detection-records/{id} | 同上 |
| /api/ehs/occupational-disease/protection-measures | /occupational-diseases/protection-measures | 文档单数→复数 |
| /api/ehs/occupational-disease/protection-measures/{id} | /occupational-diseases/protection-measures/{id} | 文档单数→复数 |
| /api/ehs/occupational-disease/statistics | /occupational-disease/statistics | 一致 ✓（唯一无需改） |

> **决策点（与协作机定）**：统一复数 `occupational-diseases/*`——需：① factors 双挂清理（保留复数）；②
> detections 文档与挂载命名对齐（建议统一为 detection-records）；③ statistics 文档单数→复数（或保留单数，
> 与前端封装核对）；④ 前端 `occupationalDisease.ts` 核对 factors/statistics/detection-records 封装路径。

### B3 段 — 纯缺 6 条（前端已封装且被使用、后端无任何匹配）
- 清单（诊断 §一 ehs 纯缺候选）：`DELETE /api/ehs/occupational-disease/cases/{id}`（已随单复数修复消除）等
- 动作：核对协作机后端是否已实现；未实现则补挂或从封装中移除
- 验证：逐条接口实跑

> 执行前提：协作机 erp/ehs 并行开发推进中——后端改动需与协作机协调（避免冲突）；每段独立可交付。

## 八、当前门禁状态（2026-10-29 终态）

- P2a contract-gate：**0 GAP**（死封装豁免 1686 条）
- P2b api-boundary：**PASS**（violations 0）
- 挂账：erp submit-report（KNOWN_UNMOUNTED，后端实现后移除）

## 五、验证口径（B 方案执行后）

- `python3 scripts/dev/contract-gate.py` → 0 GAP（或仅白名单豁免）
- `bash scripts/migration/validate.sh` + web 冒烟 `4105/4105`（防止契约修正引入回归）
- erp/ehs 真机/接口抽查：hr-proxy 走 `/api/erp/hr/...`、ehs 走 `/api/ehs/occupational-diseases/...`（复数）确认 200/401
