# BE-08 B 级确认工作簿勾选结果汇总（1483 条 · 11 批）

> 日期：2026-10-21 ｜ 执行依据：`docs/architecture/service-topology/contract-stub-mapping.md（同源台账）`（suggested_tendency 四维取证：openapi_doc / db_write / internal_refs / last_modified）
> 操作：11 批 CSV `decision` 列按 suggested_tendency 批量填写；**零代码改动**（不删路由、不删 handler、不碰 svc/lib/apps）
> 校验：11 批合计 1483 = 原 B 级 1483；decision 列全非空；跨批重复键 0（沿用工作簿校验）

## 一、勾选结果统计

| 批号 | 覆盖 crate | 条数 | 保留 | 待定 | 下线 |
|---|---:|---:|---:|---:|---:|
| batch_01 | portal / server / mobile / hrm / shared-core / shared-auth | 101 | 71 | 30 | 0 |
| batch_02 | erp | 202 | 200 | 2 | 0 |
| batch_03 | unified-core | 181 | 109 | 71 | **1** |
| batch_04 | analytics | 89 | 84 | 5 | 0 |
| batch_05 | wms / ehs / gis | 101 | 98 | 3 | 0 |
| batch_06 | pm / lims | 174 | 169 | 5 | 0 |
| batch_07 | ai / qms | 141 | 130 | 11 | 0 |
| batch_08 | mes / srm | 131 | 130 | 1 | 0 |
| batch_09 | rd / pdm | 112 | 111 | 1 | 0 |
| batch_10 | communication / finance / scm | 109 | 98 | 11 | 0 |
| batch_11 | integration / ticket / monitor / crm / master-data / tms | 142 | 132 | 10 | 0 |
| **合计** | **29 crate** | **1483** | **1332** | **150** | **1** |

## 二、下线 1 条（证据充分，供复核）

| 批次 | method | full_path | crate | handler | 判定依据 |
|---|---|---:|---|---|---|
| batch_03 | GET | `/api/migrations/services/{name}/status` | unified-core | `modules::migration::handlers::get_status` | openapi_doc=no；db_write=readonly；internal_refs 空；last_modified=2026-07-02（>2 个月未动）；仅查迁移记录表、无业务链 |

> **下线执行纪律**（与 BE-08-A 级下线实施同标准）：路由注册行 + handler 函数体 + openapi.rs 同步；执行前逐条复核 handler 复用/前端调用面/api-boundary-gate 拦截；每批 cargo check + grep 零残留 + 快照对比。**本轮仅勾选，不执行下线**——留待业务复核后按批实施。**已执行（2026-10-21）**：实际下线 9 条（file.rs 7 占位 + migrations status 零引用 + pm delete_integration 空占位）；**pm delete_type 降级保留**（实测真实软删 handler，非空 unit——宁少删降级，与 A 级先例同原则）。

## 三、待定 150 条（2026-10-21 已逐条定性 ✅）

判定口径：无 utoipa 注解 + 无 DB 写操作（或仅有只读/动态 SQL 低估风险项）。
**定性结果：下线 9 / 重构 1 / 保留 140**（规则证据驱动、保守优先，详见 `BE-08-待定150条定性.md`）：
- **下线 9**：unified-core file.rs 分享/收藏/星标/接收 7 条（NotImplemented 占位 + 零引用）+ pm project-types/service-integrations DELETE 2 条（空 unit 占位）——A 级下线判据同型
- **重构 1**：finance `GET /api/finance/events/handlers`（占位但文件近期活跃）
- **保留 140**：测试桩 4（inventory 误捕）+ server 前缀丢失 5（实为 /api/communication）+ real 只读观察 131（静态证据不足以下线，保守保留）

## 四、349 条出处考证（避免后续对账歧义）

- TODO.md「BE-08 349 条勾选（决策表 artifacts/BE-08-业务确认决策表-2026-10-18.md 已交付）」——**决策表文件不存在**（artifacts/、docs/、git 历史均无）
- contract-stub-mapping.md 两处引用「349 条 API 存废待业务勾选」——与 TODO 同源，无独立清单
- BE-08 全链路产物数字：triage 2179（a56+b1+c57+d37+e137+f1891）→ 分级 A141 / B1483 / C267 → B 级 11 批 1483。**无任何子集等于 349**
- 结论：**「349」为 TODO 历史笔误**，实际勾选对象为 B 级 1483 条工作簿（本汇总）；A 级 141 条已于 2026-10-08 下线（`artifacts/tier2-fixes/BE-08-A级下线实施摘要.md`（artifacts/ 不入库，本地保留）），C 级 267 条建议保留

## 五、产物与后续

- 本勾选结果已写入 11 批 CSV `decision` 列（保留/待定/下线），可回传业务复核
- 后续动作：① 待定 150 条已定性 ✅（2026-10-21）；② 下线累计 10 条（migrations status 1 + 定性下线 9）待按 BE-08-A 级纪律执行；③ 重构 1 条入 backlog；④ 保留 1472 条登记观察
- TODO.md「BE-08 349 条勾选」已更新为「✅ BE-08 B 级 1483 条勾选完成（349 为历史笔误，实为 1483）」
