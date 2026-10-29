# 下线候选分流评估（v74 池，2026-10-29）

基于分层抽样 24 条验证结论，将 1210 条「下线候选（读+无引用）」按三类分流：

## 抽验结论（24 条）

- handler 真实存在率 ~90%（后端路由基本真实，前端确未调用）
- 缺陷率 ~15%×2：method 误标（写端点 GET 化）+ handler 泛化名（stub/ok/list/s）
- 关键发现：`svc/erp/src/modules/mod.rs` 存在 `smoke_false_positive_stub_routes()`——
  为冒烟测试注册的占位 handler，业务无实现，应直接下线

## 三批清单

| 文件 | 条数 | 处置 | 说明 |
|---|---|---|---|
| `stub-cleanup.csv` | 7 | **下线-真占位** | erp 5（vehicles/db.changes/archived/pending-destruction/dict-types 冒烟 stub）+ unified-core 2（form-definitions/form-instances stub_detail）+ mes 1（stub_efficiency_detail） |
| `method-mislabel.csv` | 213 | **待接入复核-写端点** | 脚本 method 误标：GET 实为 create/delete/update/activate/publish 等写操作（portal 82 最大）——不应下线，归前端接入 P1 通道 |
| `read-endpoints.csv` | 990 | **待人工评估-读端点** | 真实读端点、前端未调用（portal 240/erp 181/unified-core 110 最大） |

## 批3 评估维度（990 条人工评估框架）

1. **业务入口**：前端页面/菜单是否有对应功能意图（有 → 接入候选）
2. **运维/内部端点**：healthz/metrics/sync 统计等（无前端价值 → 确认下线或保留内部）
3. **对外契约**：API 网关/WCS smoke 是否引用（引用 → 保留）
4. **死代码**：无引用、无入口、无 smoke → 后端删除候选（需后端侧另行立项）

## 备注

- erp addressbook 33 条 handler=s 为脚本提取缺陷（真实端点存在），归入 read-endpoints 评估，勿误删
- master-data 18 条 handler=list/ok 同为泛化名缺陷，归入 read-endpoints
- 池 `v74-rebuild-master.csv` 已对 7 条 stub 标记 `v74_tend=下线-真占位`
