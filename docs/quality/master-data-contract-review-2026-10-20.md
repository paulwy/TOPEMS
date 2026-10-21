# Master-Data 前后端契约对比报告（2026-10-20）

> 范围：`apps/web/src/api/master/`（7 个业务文件 + 纯 re-export 的 `index.ts` 已排除，165 次调用 / 144 个归一化路径）↔ `svc/master-data/src/`（`modules/mod.rs` 271 条路由 + `modules/master_plugin.rs` 2 条，共 273 条 / 248 个归一化路径）。
> 方法：脚本提取前端 `apiClient.master.<method>('/path')`（支持泛型 `<T>`）与后端 `.route("/path", get/post/...)`，括号平衡解析链式方法；参数归一化 `${x}`/`{x}`/`:x` → `{param}`（同位置参数）；query string 及模板内嵌三元 / `qs.toString()` 表达式视为 query 丢弃。
> 基线：`c78b67de1`（审计只读，未修改任何代码、未 commit、未 push）。
> 服务前缀 `/api/master-data` 两端一致（`apps/web/src/config/runtime.ts:67-69`：`master` 为 `master-data` 的 deprecated 别名，默认值均为 `/api/master-data`；`svc/master-data/src/main.rs:32` `api_prefix: "/api/master-data"`），对比时忽略。

---

## 一、总体结论

| 维度 | 结果 |
|---|---|
| 前端调用路径 vs 后端路由 | **144 个前端归一化路径中 142 个命中**；路径级缺失 **2 处**（均在 mdm-v66 预埋桩模块） |
| 方法级缺口（前端调、后端无该 HTTP 方法） | **3 处**（均在 mdm-v66 预埋桩模块：GET 列表 vs 后端仅 POST） |
| 路由冗余（master-data 服务内重复定义） | **0 组** |
| 参数数不一致（命中路径前后端路径参数个数） | **0 处**（另抽查 5 个真实 handler 的 `Path` 提取结构，位置/名称一致） |
| 后端能力未前端接线 | **122 个 (路径,方法) 对**（脚本口径；经全仓人工复核后：真实预留能力 87、契约兜底桩 21、内部端点 2、扫描范围外已接线 12） |

**契约完整性结论**：在役模块（quality-v51 / mdm-v54 / kg-v53 / mdm-v56 / mdm-v57 / mdm-v58 / mdm-v60 已用子集）前后端契约闭合，**无运行时 404/405 的在途风险**。全部 5 处缺口（2 路径 + 3 方法）集中在 `mdm-v66` 预埋桩模块（`contract_fallbacks` 空数据兜底，待 V66 后端落地），且对应前端方法页面零消费、测试零覆盖，属**休眠契约偏差**，非现役故障。122 条未接线中 12 条 dict 路由实为脚本扫描范围外的已接线（人工修正），其余为预留能力与兜底桩。

---

## 二、路径级缺失明细（前端调、后端无同形路径）

> 脚本输出 2 处，已逐条对照前端源码行与后端 `mod.rs` 行复核，**非脚本误采**。

| # | 前端路径（方法） | 前端位置 | 后端最接近路由（方法） | 后端位置 | 缺口类型 | 核验说明 |
|---|---|---|---|---|---|---|
| 1 | `GET /mdm-v66/dashboard/recent` | `apps/web/src/api/master/dataAssetCatalogV66.ts:685-687`（`getRecentAssets`，`limit` 走 query，无路径 id） | `GET /dashboard/recent/{id}` | `svc/master-data/src/modules/mod.rs:694`（`contract_fallbacks::array` 桩） | **前端少路径参数 `{id}`** | 前端源码确为无 id 调用；后端仅注册带 `{id}` 的桩，无裸 `/dashboard/recent` 路由。`mod.rs` 全文件及 `svc/master-data/src` 其余文件 rg 复核无第二条 `recent` 路由。 |
| 2 | `POST /mdm-v66/lineage/refresh` | `dataAssetCatalogV66.ts:518-525`（`refreshLineage`，`asset_id` 走 query，无路径 id） | `POST /lineage/refresh/{id}` | `mod.rs:661`（`contract_fallbacks::ok` 桩） | **前端少路径参数 `{id}`** | 前端源码确为无 id 调用（`if (assetId) qs.set('asset_id', assetId)`，仅 query）；后端仅注册带 `{id}` 的桩，无裸 `/lineage/refresh` 路由。 |

**运行时风险**：两处对应方法 `getRecentAssets` / `refreshLineage` 经全仓 rg 仅在 `dataAssetCatalogV66.ts` 内定义，页面 `pages/master/DataAssetCatalogPage.tsx` 仅消费 `listAssets/getDashboard/getAsset/deleteAsset`（L57/83/102/117），测试目录无覆盖 → **当前无调用方触发**；且整条 mdm-v66 为 `contract_fallbacks` 桩，待 V66 落地时按真实契约一并闭合。

---

## 三、方法级缺口明细（路径命中、HTTP 方法不匹配）

> 脚本输出 3 处，已逐条复核后端同路径仅注册的方法，**非脚本误采**（创建用 POST 均有匹配，仅 GET 列表缺失）。

| # | 路径 | 前端方法（位置） | 后端方法（位置） | 缺口 | 备注 |
|---|---|---|---|---|---|
| 1 | `/mdm-v66/categories` | **GET** `dataAssetCatalogV66.ts:587-589`（`listCategories`，`parent_id`/`q` 走 query） | 仅 **POST** `mod.rs:675`（`contract_fallbacks::ok`） | **前端 GET 无后端** | 前端 POST 创建 `:572` 命中后端 POST；`GET /categories/tree`（`:576`）命中 `mod.rs:676`；`PUT/DELETE /categories/{id}`（`:596/:600`）命中 `mod.rs:677-682`。仅列表 GET 缺失。 |
| 2 | `/mdm-v66/maps` | **GET** `dataAssetCatalogV66.ts:626-628`（`listDataMaps`，`scope/domain/status/分页` 走 query） | 仅 **POST** `mod.rs:684`（`contract_fallbacks::ok`） | **前端 GET 无后端** | 前端 POST 创建 `:605`、`GET/PUT/DELETE /maps/{id}`（`:609/:635/:639`）、`GET /maps/{id}/export`（`:649`）均命中后端路由；仅列表 GET 缺失。 |
| 3 | `/mdm-v66/tags` | **GET** `dataAssetCatalogV66.ts:544-546`（`listTags`，`category/q/分页` 走 query） | 仅 **POST** `mod.rs:663`（`contract_fallbacks::ok`） | **前端 GET 无后端** | 前端 POST 创建 `:529` 命中；`PUT/DELETE /tags/{id}`（`:553/:557`）命中 `mod.rs:664-669`；仅列表 GET 缺失。 |

**运行时风险**：`listTags/listCategories/listDataMaps` 全仓无页面/测试消费（同名函数在 srm/ticket/插件市场等模块属无关对象），当前不触发；三者同属 mdm-v66 预埋桩，待 V66 落地补真实 GET 列表 handler 时闭合。

---

## 四、后端能力未前端接线（122 个 (路径,方法) 对，经人工复核分类）

> 脚本口径 122。复核方法：对每个疑似缺 UI 的关键词在 `apps/web/src/` 全仓 rg（不限于 `api/master/`），并在 `svc/*/src` 检索服务间调用；按性质分为 A（内部能力/契约兜底桩，不判缺陷）、B（真实 handler、全仓零调用，预留能力/疑似缺 UI）、C（非缺口：扫描范围外已接线 / 后端多出方法）。

### A. 后端内部能力 / 契约兜底桩（23 对，不判缺陷）

#### A1. core 插件框架内部端点（2 对，`master_plugin.rs`）

| 方法 | 路径 | 位置 | 判断 |
|---|---|---|---|
| GET | `/api/plugins/info` | `master_plugin.rs:129`（`get_plugin_info`） | 插件注册元信息（权限码/导航配置），由 core 运行时插件框架消费，非 Web UI 端点 |
| GET | `/api/plugins/health` | `master_plugin.rs:130`（`plugin_health_check`，DB `SELECT 1` 健康检查） | core 健康探活端点，非 Web UI 端点 |

#### A2. 静态提取折叠尾段兜底桩（17 对，`contract_fallbacks`，`mod.rs` 内注释「待上游支持」）

> 这些路由是为静态契约冒烟把 `/path?query` 误折叠成伪动态段而挂的空数据兜底（`contract_fallbacks::list/array/ok`，不读写业务表，见 `contract_fallbacks.rs:1-30`），真实前端打的是同前缀在役路由，**非真实能力缺失**。

| 方法 | 路径 | 位置 | 对应在役真实路由（前端在用） |
|---|---|---|---|
| GET | `/kg-v53/subgraph/{param}/{param}` | `mod.rs:139` | `GET /kg-v53/subgraph/{param}`（`mod.rs:137`，FE `knowledgeGraph.ts:133`） |
| GET | `/kg-v53/similar/{param}/{param}` | `mod.rs:143` | `GET /kg-v53/similar/{param}`（`mod.rs:141`，FE `:155`） |
| GET | `/kg-v53/export/{param}` | `mod.rs:146` | `GET /kg-v53/export`（`mod.rs:144`，FE `:166`） |
| GET | `/mdm-v54/version/{param}/{param}/{param}` | `mod.rs:173` | `GET /mdm-v54/version/{param}/{param}`（`mod.rs:169`，FE `versioning.ts:182`） |
| GET | `/mdm-v54/version/history/{param}/{param}/{param}` | `mod.rs:181` | `GET /mdm-v54/version/history/{param}/{param}`（`mod.rs:177`，FE `:210`） |
| GET | `/mdm-v54/audit/log/{param}` | `mod.rs:189` | `GET /mdm-v54/audit/log`（`mod.rs:187`，FE `:236`） |
| GET | `/mdm-v54/audit/user/{param}/{param}` | `mod.rs:195` | `GET /mdm-v54/audit/user/{param}`（`mod.rs:191`，FE `:248`） |
| GET | `/mdm-v54/permissions/resource/{param}` | `mod.rs:220` | `GET /mdm-v54/permissions/resource`（`mod.rs:216`，FE `versioning.ts:317`） |
| GET | `/mdm-v56/recovery/points/{param}` | `mod.rs:274` | `GET /mdm-v56/recovery/points`（`mod.rs:272`，FE `disasterRecovery.ts:154`） |
| GET | `/mdm-v56/continuity/plans/{param}` | `mod.rs:291` | `GET /mdm-v56/continuity/plans`（`mod.rs:289`，FE `:206`） |
| GET | `/mdm-v56/dr/failover/history/{param}` | `mod.rs:318` | `GET /mdm-v56/dr/failover/history`（`mod.rs:315`，FE `:277`） |
| GET | `/mdm-v57/graph/neighbors/{param}/{param}` | `mod.rs:330` | `GET /mdm-v57/graph/neighbors/{param}`（`mod.rs:328`，FE `semanticSearch.ts:149`） |
| GET | `/mdm-v57/graph/subgraph/{param}` | `mod.rs:338` | `GET /mdm-v57/graph/subgraph`（`mod.rs:336`，FE `:172`） |
| GET | `/mdm-v57/tags/{param}` | `mod.rs:372` | `GET /mdm-v57/tags`（`mod.rs:370`，FE `:275`） |
| GET | `/mdm-v60/metadata/search/{param}` | `mod.rs:528` | `GET /mdm-v60/metadata/search`（`mod.rs:526`，FE `dataAssetCatalogV66.ts:667`） |
| GET | `/mdm-v60/lineage/{param}/upstream/{param}` | `mod.rs:542` | `GET /mdm-v60/lineage/{param}/upstream`（`mod.rs:540`，FE `:491`） |
| GET | `/mdm-v60/lineage/{param}/downstream/{param}` | `mod.rs:547` | `GET /mdm-v60/lineage/{param}/downstream`（`mod.rs:544`，FE `:503`） |

#### A3. mdm-v66 预埋桩上的未接线方法（4 对，`contract_fallbacks`，待 V66 落地）

| 方法 | 路径 | 位置 | 说明 |
|---|---|---|---|
| POST | `/mdm-v66/lineage/refresh/{param}` | `mod.rs:661` | 即路径缺失 #2 的后端桩形态（带 id），FE 打无 id 裸路径 |
| GET | `/mdm-v66/tags/{param}` | `mod.rs:664` | 后端多挂的单查 GET（FE 仅用 PUT/DELETE，`dataAssetCatalogV66.ts:553/557`）；整路由为桩 |
| GET | `/mdm-v66/categories/{param}` | `mod.rs:677` | 后端多挂的单查 GET（FE 仅用 PUT/DELETE，`:596/600`）；整路由为桩 |
| GET | `/mdm-v66/dashboard/recent/{param}` | `mod.rs:694` | 即路径缺失 #1 的后端桩形态（带 id），FE 打无 id 裸路径 |

---

### B. 真实 handler、全仓零前端调用（87 对，预留能力 / 疑似缺 UI 接线）

> 已全仓复核：下列关键词在 `apps/web/src/`（含其他 `apiClient.*`）与 `svc/*/src`（服务间 HTTP 调用）均零引用；handler 也未被同服务其他模块进程内调用（抽查 `register_lineage/analyze_impact/record_usage/generate_bill/analyze/create_schema/build_lineage_graph/auto_transition` 均无跨模块引用）。属版本预留的后端能力，是否补 UI 由产品排期决定。

#### B1. lineage-v52 数据血缘登记 / 影响分析 / 变更传播（15 对，handler 模块 `lineage_v52.rs`）

| 方法 | 路径 | 位置 |
|---|---|---|
| POST | `/lineage-v52/register` | `mod.rs:101` |
| GET | `/lineage-v52/graph` | `mod.rs:102` |
| GET | `/lineage-v52/upstream/{param}/{param}` | `mod.rs:103` |
| GET | `/lineage-v52/downstream/{param}/{param}` | `mod.rs:107` |
| GET | `/lineage-v52/export` | `mod.rs:111` |
| POST | `/lineage-v52/delete` | `mod.rs:112` |
| POST | `/lineage-v52/impact/analyze` | `mod.rs:113` |
| GET | `/lineage-v52/impact/report/{param}` | `mod.rs:114` |
| POST | `/lineage-v52/impact/simulate` | `mod.rs:115` |
| GET | `/lineage-v52/impact/scope` | `mod.rs:116` |
| POST | `/lineage-v52/propagate` | `mod.rs:117` |
| GET | `/lineage-v52/propagation/rules` | `mod.rs:118` |
| POST | `/lineage-v52/propagation/rules` | `mod.rs:122` |
| GET | `/lineage-v52/propagation/log` | `mod.rs:126` |
| POST | `/lineage-v52/propagation/rollback` | `mod.rs:127` |

判断：高级血缘影响分析与变更传播/回滚，前端现役血缘视图走 mdm-v60（B5 子集），本模块为独立预留，**疑似缺 UI 接线（价值中高，可随血缘二期排期）**。

#### B2. mdm-v55 API 商业化 / 计量计费 / SLA（23 对，handler 模块 `commercial_v55.rs`）

| 方法 | 路径 | 位置 |
|---|---|---|
| POST | `/mdm-v55/products` | `mod.rs:232` |
| GET | `/mdm-v55/products` | `mod.rs:233` |
| GET | `/mdm-v55/products/{param}` | `mod.rs:234` |
| POST | `/mdm-v55/subscribe` | `mod.rs:235` |
| GET | `/mdm-v55/subscriptions` | `mod.rs:236` |
| GET | `/mdm-v55/subscriptions/{param}` | `mod.rs:237` |
| PUT | `/mdm-v55/subscriptions/{param}/cancel` | `mod.rs:238` |
| PUT | `/mdm-v55/subscriptions/{param}/upgrade` | `mod.rs:242` |
| POST | `/mdm-v55/usage/record` | `mod.rs:247` |
| GET | `/mdm-v55/usage/summary` | `mod.rs:248` |
| POST | `/mdm-v55/bill/generate` | `mod.rs:249` |
| GET | `/mdm-v55/billing` | `mod.rs:250` |
| POST | `/mdm-v55/rate-cards` | `mod.rs:251` |
| GET | `/mdm-v55/rate-cards` | `mod.rs:252` |
| PUT | `/mdm-v55/billing/{param}/mark-paid` | `mod.rs:253` |
| POST | `/mdm-v55/sla/configure` | `mod.rs:258` |
| POST | `/mdm-v55/sla/measure` | `mod.rs:259` |
| GET | `/mdm-v55/sla/status` | `mod.rs:260` |
| GET | `/mdm-v55/sla/history` | `mod.rs:261` |
| GET | `/mdm-v55/sla/penalty` | `mod.rs:262` |
| POST | `/mdm-v55/sla/incident` | `mod.rs:263` |
| GET | `/mdm-v55/sla/incidents` | `mod.rs:264` |
| GET | `/mdm-v55/sla/report` | `mod.rs:265` |

判断：产品订阅/用量计量/账单/ SLA 保障整套商业化能力，全仓零引用，**产品化未上线预留**，非缺陷。

#### B3. mdm-v59 数据治理 AI / 智能匹配 / 自动分类（23 对，handler 模块 `ai_governance_v59.rs`）

| 方法 | 路径 | 位置 |
|---|---|---|
| POST | `/mdm-v59/governance/analyze` | `mod.rs:445` |
| GET | `/mdm-v59/governance/suggestions` | `mod.rs:446` |
| GET | `/mdm-v59/governance/entity/{param}` | `mod.rs:450` |
| POST | `/mdm-v59/governance/apply/{param}` | `mod.rs:454` |
| POST | `/mdm-v59/governance/dismiss/{param}` | `mod.rs:458` |
| GET | `/mdm-v59/governance/models` | `mod.rs:462` |
| POST | `/mdm-v59/governance/train/{param}` | `mod.rs:463` |
| POST | `/mdm-v59/matching/rule` | `mod.rs:468` |
| GET | `/mdm-v59/matching/rules` | `mod.rs:469` |
| POST | `/mdm-v59/matching/entities` | `mod.rs:470` |
| GET | `/mdm-v59/matching/results` | `mod.rs:474` |
| POST | `/mdm-v59/matching/review/{param}` | `mod.rs:478` |
| POST | `/mdm-v59/matching/confirm/{param}` | `mod.rs:482` |
| POST | `/mdm-v59/matching/reject/{param}` | `mod.rs:486` |
| GET | `/mdm-v59/matching/stats` | `mod.rs:490` |
| POST | `/mdm-v59/classifier` | `mod.rs:492` |
| GET | `/mdm-v59/classifiers` | `mod.rs:493` |
| POST | `/mdm-v59/classify/{param}/{param}` | `mod.rs:494` |
| GET | `/mdm-v59/classification/{param}/{param}` | `mod.rs:498` |
| GET | `/mdm-v59/classification/categories/{param}` | `mod.rs:502` |
| POST | `/mdm-v59/classification/review/{param}` | `mod.rs:506` |
| GET | `/mdm-v59/classification/stats` | `mod.rs:510` |
| POST | `/mdm-v59/classifier/rules/{param}` | `mod.rs:514` |

判断：AI 治理建议/实体匹配裁决/自动分类整套能力，全仓零引用，**AI 二期预留**，非缺陷。

#### B4. schema-registry 元数据驱动动态 API（10 对，handler 模块 `schema_registry.rs`）

| 方法 | 路径 | 位置 |
|---|---|---|
| POST | `/schema-registry/schemas` | `mod.rs:591` |
| GET | `/schema-registry/schemas` | `mod.rs:592` |
| GET | `/schema-registry/schemas/{param}` | `mod.rs:593` |
| PUT | `/schema-registry/schemas/{param}` | `mod.rs:594` |
| DELETE | `/schema-registry/schemas/{param}` | `mod.rs:595` |
| POST | `/schema-registry/schemas/{param}/data` | `mod.rs:597` |
| GET | `/schema-registry/schemas/{param}/data` | `mod.rs:598` |
| GET | `/schema-registry/schemas/{param}/data/{param}` | `mod.rs:599` |
| PUT | `/schema-registry/schemas/{param}/data/{param}` | `mod.rs:603` |
| DELETE | `/schema-registry/schemas/{param}/data/{param}` | `mod.rs:607` |

判断：Schema 注册 + 动态数据 CRUD 基础能力，全仓零引用，**平台能力预留**，非缺陷。

#### B5. mdm-v60 在役模块未接端子集（16 对，handler 模块 `metadata_v60.rs`）

> 前端已用 v60 的 metadata 增删改查/搜索/stats 与 lineage upstream/downstream；下列为同模块已实现但未接 UI 的能力。

| 方法 | 路径 | 位置 | 子域 |
|---|---|---|---|
| POST | `/mdm-v60/metadata/{param}/attribute` | `mod.rs:531` | 元数据属性挂载 |
| POST | `/mdm-v60/metadata/tag` | `mod.rs:535` | 元数据打标 |
| POST | `/mdm-v60/lineage/graph` | `mod.rs:538` | 血缘图构建 |
| GET | `/mdm-v60/lineage/graph/{param}` | `mod.rs:539` | 血缘图取图 |
| POST | `/mdm-v60/lineage/path` | `mod.rs:551` | 血缘路径查询 |
| GET | `/mdm-v60/lineage/{param}/impact` | `mod.rs:552` | 血缘影响分析 |
| GET | `/mdm-v60/lineage/dashboard` | `mod.rs:556` | 血缘仪表盘 |
| GET | `/mdm-v60/lineage/export` | `mod.rs:560` | 血缘导出 |
| GET | `/mdm-v60/lifecycle/{param}/stage` | `mod.rs:562` | 生命周期当前阶段 |
| POST | `/mdm-v60/lifecycle/{param}/transition` | `mod.rs:566` | 阶段流转 |
| GET | `/mdm-v60/lifecycle/{param}/history` | `mod.rs:570` | 流转历史 |
| POST | `/mdm-v60/lifecycle/policy` | `mod.rs:574` | 建策略 |
| GET | `/mdm-v60/lifecycle/policies` | `mod.rs:575` | 策略列表 |
| POST | `/mdm-v60/lifecycle/auto-transition` | `mod.rs:576` | 自动流转 |
| GET | `/mdm-v60/lifecycle/dashboard` | `mod.rs:580` | 生命周期仪表盘 |
| POST | `/mdm-v60/lifecycle/bulk` | `mod.rs:584` | 批量流转 |

判断：**疑似缺 UI 接线（价值中高）**——同模块现役页面已存在，血缘图/影响分析/导出与生命周期管理可作为现有数据资产目录页的功能扩展，建议优先评估。

---

### C. 非缺口说明（12 对，脚本扫描范围外的已接线）

> 脚本仅扫描 `apps/web/src/api/master/*.ts`；dict 模块的前端绑定位于 `apps/web/src/api/system/index.ts`（经 `apiClient.master` 打 `/dict/*`），被脚本漏采，脚本据此误列为未接线。逐条复核，12 对**全部已接线、契约闭合**：

| 方法 | 后端路径（位置） | 前端调用位置（`apps/web/src/api/system/index.ts`） |
|---|---|---|
| GET | `/dict/dict-types` `mod.rs:621` | `:108` `list` |
| GET | `/dict/dict-types/{param}` `mod.rs:622` | `:112` `get` |
| POST | `/dict/dict-types` `mod.rs:623` | `:116` `create` |
| PUT | `/dict/dict-types/{param}` `mod.rs:624` | `:120` `update` |
| DELETE | `/dict/dict-types/{param}` `mod.rs:625` | `:124` `delete` |
| GET | `/dict/dict-types/{param}/items` `mod.rs:627` | `:148` `dictItemApi.list` |
| GET | `/dict/dict-types/{param}/items/export` `mod.rs:631` | `:172` `export` |
| GET | `/dict/dict-items/{param}` `mod.rs:636` | `:152` `get` |
| POST | `/dict/dict-items` `mod.rs:637` | `:156` `create` |
| PUT | `/dict/dict-items/{param}` `mod.rs:638` | `:160` `update` |
| DELETE | `/dict/dict-items/{param}` `mod.rs:639` | `:164` `delete` |
| POST | `/dict/dict-items/batch` `mod.rs:640` | `:168` `batchCreate` |

备注：`svc/master-data/src/modules/mod.rs:612-616` 注释说明 dict 由 unified-core 外迁到本服务，vite 代理将 `/api/core/dict/*` rewrite 到 `/api/master-data/dict/*`（`apps/web/vite.config.ts:335-342`）；另有 `apps/web/src/api/erp/core/dict.ts` 走 `apiClient.erp` 的 `/system/dict-*`，属 erp 服务另一套字典，与本服务无关，勿混。

---

## 五、参数结构抽查（脚本参数数不一致 = 0，人工抽查 5 个真实 handler）

| 后端路由（位置） | handler `Path` 提取 | 前端调用 | 结论 |
|---|---|---|---|
| `GET /quality-v51/checks/{entity_type}/{entity_id}` `mod.rs:67-69` | `quality_v51.rs:617` `Path((entity_type, entity_id)): Path<(String, String)>` | `quality.ts:151` `/checks/${entityType}/${entityId}` | 位置/顺序一致 ✓ |
| `GET /mdm-v54/version/{entity_type}/{entity_id}` `mod.rs:169-171` | `versioning_v54.rs:680` `Path((entity_type, entity_id)): Path<(String, String)>` | `versioning.ts:182` `/version/${entityType}/${entityId}` | 一致 ✓ |
| `GET /mdm-v60/lineage/{id}/upstream` `mod.rs:540` | `metadata_v60.rs:988` `Path(id): Path<String>` | `dataAssetCatalogV66.ts:491` | 一致 ✓ |
| `GET /kg-v53/subgraph/{node_id}` `mod.rs:137` | `knowledge_v53.rs:1455` `Path(node_id): Path<String>` | `knowledgeGraph.ts:133` `/subgraph/${nodeId}` | 一致 ✓ |
| `GET /dict/dict-types/{dict_type_id}/items` `mod.rs:627-630` | `dict/handlers.rs:360` `Path(dict_type_id): Path<Uuid>` | `system/index.ts:148` `/dict-types/${dictTypeId}/items` | 一致 ✓ |

未发现参数名/位置错配；脚本 `param_mismatch=0` 在样本层面得到证实。

---

## 六、方法归一化口径

- 前端 `apiClient.master.get(\`/mdm-v54/version/${entityType}/${entityId}\`)` → `/mdm-v54/version/{param}/{param}`；后端 `.route("/version/{entity_type}/{entity_id}", ...)` → 同形 `{param}`。
- query string（`?page=...`、`URLSearchParams.toString()`、模板内三元 `${s ? \`?${s}\` : ''}`）整体丢弃，不参与路径对比（如 `/mdm-v66/dashboard/recent${qs...}` 归为无路径参数）。
- 后端 nest 前缀（`quality-v51`/`lineage-v52`/`kg-v53`/`mdm-v54`…`mdm-v66`/`schema-registry`/`dict`）按注册栈拼回全路径后归一化。
- `index.ts`（纯 re-export）已排除；本目录无工厂类文件。
- 服务前缀 `/api/master-data` 两端一致，对比忽略。

---

## 七、建议处置优先级

| 优先级 | 项 | 动作 |
|---|---|---|
| — | 现役模块契约 | 已闭合，无需动作（quality-v51 / mdm-v54 / kg-v53 / mdm-v56 / mdm-v57 / mdm-v58 / mdm-v60 已用子集） |
| P1（休眠，非现役故障） | mdm-v66 五处契约偏差：2 路径缺失（`dashboard/recent`、`lineage/refresh` 少 `{id}`）+ 3 方法缺口（`GET /categories`、`GET /maps`、`GET /tags`） | 待 V66 后端落地时按真实契约补 handler / 对齐前端路径；当前页面零消费，不阻塞。若近期不做 V66，可在 `dataAssetCatalogV66.ts` 标注预埋方法避免误用 |
| P2（价值中高，待排期） | B5 mdm-v60 血缘图/影响分析/导出 + 生命周期 16 对 | 在现有数据资产目录页评估接线（同模块、同服务，成本低） |
| P3（产品决策预留） | B1 lineage-v52（15）、B2 mdm-v55 商业化（23）、B3 mdm-v59 AI（23）、B4 schema-registry（10） | 属版本预留能力；产品确认不做则标注 deprecated 或移除，确认要做则排 UI |
| 不处理 | A1 插件内部端点 2、A2 折叠尾段桩 17、A3 v66 桩上多余方法 4、C dict 12（已接线） | 非缺陷，保持现状 |

**本报告仅审计不修改**：未改动任何源码、未 commit、未 push；所有结论均附 `file:line` 可复核位置。
