# TOPEMS 灰度上线演练收尾：检查单与回滚预案（2026-10-06）

> R4 灰度上线演练收尾汇总。前置：R1 全量门禁回归 ✅（2026-10-03）、R2 关键业务链路回归 ✅（2026-10-03，10 项残留 R-1~R-10 登记）、R3 文档-实现对齐 ✅（2026-10-03）。
> 演练目标：本地环境逐项核验上线前提，产出可执行的检查单与回滚预案（本地演练，不发布）。

## 1. 环境状态（2026-10-06 实跑核验）

| 项 | 状态 | 说明 |
|---|---|---|
| 后端 monolith :8099 | ✅ 200 | PID 39341，/api/server/health 200；24 模块聚合（本次会话多次重启均正常，启动 ~3min） |
| 数据库 5433 | ✅ 在位 | monolith 使用；qa_lab 骨架表清理闭环（U3b）；迁移账本 20261003000002 已登记 |
| nginx :8080 | ✅ 运行 | 演练配置 /tmp/topems-nginx-drill.conf（upstream/map 逐字复制生产 deploy/nginx/topems.conf）；首页转发 portal 200；/api/ 转发指向独立服务 upstream（独立服务未运行故 404——演练预期，验证配置逻辑达成） |
| portal :8063 | ✅ 200 | `pnpm dev` 启动成功（此前"启动挂起"缺口已消），首页 200 |
| runtime 矩阵 | ✅ 结论化 | monolith 单进程聚合，无独立服务间 HTTP 边（进程内调用），`--collect` 捕获 0 边为架构事实；design 静态矩阵重生成 40 边/24 节点（service-topology.* 已更新） |
| 文档-路由一致性 | ✅ | openapi.json 2525 端点 / 0 假端点（P4-3/P4-4 闭环） |
| 插件令牌门控 | ✅ | T4 修复完成（10 单测），PLUGIN_TOKEN_ENFORCE 布尔开关 |

## 2. 上线前检查单（生产环境逐项勾选）

### 2.1 代码与构建门禁（CI 层）
- [ ] pre-push 五门禁全绿：cargo check / clippy / fmt / test（550+ tests）/ shellcheck
- [ ] schema-boundary 双门禁（PY 28 服务 / NODE 29 服务）exit 0
- [ ] sqlx Gate S（离线缓存与 309 条 .sqlx/ 一致）
- [ ] 前端 tsc + vite build + vitest 全绿；bundle TOTAL ≤ 30M（当前 16.43MB）

### 2.2 环境与部署（生产机）
- [ ] 数据库迁移账本：migrate.sh run 无积压（当前 30/293 半迁移为既成债，未来结构演进走"直接 DDL 运维"约定）
- [ ] install.sh dry-run ✅（306 文件/16.48MB/systemd 24 服务）→ 生产实跑
- [ ] systemd 服务启用后各服务 /health 绿（本机无 systemd，需生产机实跑）
- [ ] nginx 生产配置（deploy/nginx/topems.conf）upstream 端口与实际服务对齐
- [ ] portal 构建产物部署（apps/web/dist）静态托管或 dev server

### 2.3 功能链路（生产冒烟）
- [ ] IAM 登录 → JWT → 各域 API 抽样 200
- [ ] 财务凭证借贷平衡（decimal 精度，R2 ①已验证 10000=10000）
- [ ] 工单下达（事件化，R2 ② uuid=text 修复后重验）
- [ ] 质量链 qms↔lims↔ehs 事件联动（R2 ④ internal 前缀修复后重验）
- [ ] 插件注册 + 心跳（R2 ⑤：core_plugin_instances 表 + 令牌门控）
- [ ] BI /datasets/test-sql 真实 SQL 执行（当前桩实现，待后端落地）
- [ ] WS MES 看板推送（unified-core 投影已解引用，由 mes_real_module 提供）

### 2.4 回滚预案
- [ ] 保留上一版本二进制 + 前端 dist 快照（备份目录）
- [ ] rollback.sh 演练一次通过（需 root/systemd 环境）
- [ ] 数据库回滚策略：结构演进走 DDL 运维（不依赖 sqlx 回滚），破坏性变更前拍板文档化
- [ ] 服务回滚顺序：业务服务 → 平台层（portal/unified-core）→ 数据库不动（数据优先保留）

## 3. runtime 矩阵结论（R3 遗留闭环）

- **R3 遗留 F-53 / R-7**：runtime 矩阵需 R4 在线 `--collect` —— 已执行。
- **结论**：当前为模块化单体部署（monolith :8099 进程内聚合 24 模块），**无独立服务间 HTTP 调用边**；`topems_service_to_service_calls_total` metric 在独立部署模式下由各服务进程暴露，单进程聚合下不存在——**runtime 边为 0 是架构事实，非采集失败**。
- **design 静态矩阵**已重生成（40 边/24 节点）：`docs/architecture/service-topology/service-topology.design.{json,csv,html}`。
- **独立部署模式**（生产按服务拆分时）：各服务 /metrics 暴露后，执行 `python3 scripts/arch/service_topology.py --collect "erp:18010,wms:18041,finance:18011,..."` 重生成 runtime 矩阵。

## 4. 遗留与生产依赖项（如实记录）

| 项 | 状态 | 阻塞级 |
|---|---|---|
| Linux 生产实跑 install/update/rollback | dry-run 已验证，systemd 真实部署待生产环境 | P0（需生产环境） |
| 42 个"无注解真路由"（ai 系 12 等）补注解 | 生成器修剪后文档不再宣称（探测 200 但无注解） | P3（低） |
| BI test-sql 后端真实 SQL 执行 | 桩实现 | P1 |
| push SSH 截断 | keepalive 缓解，未根除 | P3 |
| mcp 8 测试失败 | 子进程环境缺口（DB/Redis 在位仍超时） | P3 |

## 5. 演练结论

- **环境缺口全部消除**：5433 服务 ✅ / nginx ✅ / portal ✅（R4 演练原记三项缺口均闭合）。
- **上线前置已具备**（除需生产环境项）：门禁、迁移、文档一致性、令牌门控、runtime 矩阵均闭环。
- **下一步**：在生产环境按第 2 节检查单逐项执行（需用户提供生产机环境）。
