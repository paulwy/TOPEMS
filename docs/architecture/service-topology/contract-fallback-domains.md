# 域内契约兜底分域台账（mobile / master-data）— F4 互补册

> 生成：2026-10-20 · 配套主台账：[`contract-stub-mapping.md`](./contract-stub-mapping.md)（core `contract_stubs.rs` 78 条）。
> 本册登记主台账 §6「另案」列明的两套**域内兜底**，与 core 兜底体系**互补、不重复评估**；纯文档，不改代码。
> 共同原则：兜底的意义是「禁止裸 404」，真实实现就位前不得删除，否则前端已调端点会 404 并被契约 smoke 判 route_missing；最终存废与 BE-08（349 条 API 待业务勾选）同源。

## A. mobile embedded BFF 轻量兜底（134 条 `.route`）

- **文件**：`svc/mobile/src/modules/contract_fallback.rs`；**挂载**：`svc/server/src/modules/mobile_real_module.rs:75` `.merge(...contract_fallback::routes())`，经 embedded BFF（:8099）对外，**非死代码**。
- **背景**：`scripts/web_contract_smoke.py` 全量探测 BFF 发现 mobile 约 165 个前端已调但后端未实现的端点（AI 助手 / CRM / GIS / 报表 / 工作流等），按轻量占位处理。
- **三类占位 handler**（文件头注释）：
  - 集合类 GET → 空列表 `{items: [], total: 0}`；
  - 详情类 GET → HTTP 200 + 内层 code 404（数据不存在语义，避免裸 404 被判路由缺失）；
  - 写操作（POST/PUT/DELETE）→ 成功空数据。
- **按一级域粗分（`.route` 注册近似，以 `grep -c '\.route('` = 134 为准；链式/尾段造成分组误差，不逐域定个位）**：

| 域簇 | 约条数 | 内容 |
|---|---:|---|
| /workflow（instances/tasks/definitions 等） | 17 | 工作流实例/任务/定义占位 |
| /ai（conversations/images/voice/recommendations） | 13 | AI 助手与会话/语音 |
| /inventory（inbound/outbound/stocktake/transfer/items） | 7 | 库存出入库/盘点/调拨 |
| /inspection（tasks 及列表） | 7 | 巡检任务 |
| /approvals（含 templates） | 6 | 审批实例/模板 |
| /production（orders/equipment） | 5 | 生产工单/设备 |
| /data | 5 | 数据段占位 |
| /analytics | 5 | 分析段 |
| /suppliers、/quality、/reports、/locations、/projects、/map、/employees、/devices、/geofences、/dashboards、/departments、/customers、/leads、/documents、/attendance 等 | 余 ~69 | 零散域占位 |

- **处置方向**：对应独立 svc（crm/srm/mes/wms/gis 等）真实实现某端点后，把该条 route 替换为真实 handler；未实现前保留，不可裸删。属产品排期/上游对接驱动，非本台账可静态闭环。

## B. master-data mdm-v66 预埋 + 静态提取伪动态段（43 处 `contract_fallbacks::` 引用）

- **文件**：`svc/master-data/src/modules/mod.rs`（内联，非独立 fallback 文件）；**兜底模块**：`mod.rs` 内 `pub mod contract_fallbacks;`。
- **背景**：mdm-v66 数据资产目录**预埋零消费** + 静态提取**伪动态段**（`{tail}`/`{a}`/`{b}`/`{id}` 折叠尾段）兜底，标注「待上游支持」。
- **handler 类型分布（43 处引用点，含链式重复引用）**：`ok` 31（成功回执）、`list` 9（空列表）、`array` 5（空数组）。
- **覆盖段**（跨 v51–v60 各 MDM 模块）：知识/语义子图与相似、版本、审计日志、恢复点/连续性计划/DR 故障切换、图谱邻居/子图、tags、metadata 搜索、lineage 上下游、assets 批量/导入导出、categories、maps、search 建议、dashboard 最近/孤儿等。
- **处置方向**：随 V66 数据资产目录真实建设（元数据/血缘/资产）逐条替换为真实 handler；当前为预埋，不接前端实调，保留待建，不删。

## 对账命令（2026-10-20 快照）

```bash
# A. mobile
grep -c '\.route(' svc/mobile/src/modules/contract_fallback.rs            # 134
# B. master-data
grep -c 'contract_fallbacks::' svc/master-data/src/modules/mod.rs        # 43
# 对照 core 主台账
grep -c '\.route(' svc/unified-core/src/routes/contract_stubs.rs        # 78（route 注册口径；方法-端点对 82）
```

> 计数随代码演进而变，复用时以现场 grep 为准并更新快照日期；本册不替代各域自身的实现评估。
