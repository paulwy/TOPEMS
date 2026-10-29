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

## 五、验证口径（B 方案执行后）

- `python3 scripts/dev/contract-gate.py` → 0 GAP（或仅白名单豁免）
- `bash scripts/migration/validate.sh` + web 冒烟 `4105/4105`（防止契约修正引入回归）
- erp/ehs 真机/接口抽查：hr-proxy 走 `/api/erp/hr/...`、ehs 走 `/api/ehs/occupational-diseases/...`（复数）确认 200/401
