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


## BIZ 749 业务评审决策包（2026-10-29）

- `biz-review.csv`（749 条）：svc/method/path/operation_id/handler + **review 列**（AI 侧推荐处置）
- **细分**：前端接入候选 361（核心业务查询：customer/order/material/contract/invoice/dashboard/quality/inspection 等）+ 待业务确认 375（无明确业务特征）+ 保留后端-前端不接入 13（openapi/schema/registry/webhook/swagger 等内部）
- **抽样 9 条全 BE**（handler 真实存在）
- **业务侧确认方式**（按 svc 分批）：对 review 列确认/否决——
  1. 前端接入候选 → 立项前端补页（复用 P 方法论：typecheck+核销+独立 commit）
  2. 待业务确认 → 逐 svc 人工过（portal 12/erp 94/ai 34 最大）
  3. 保留后端-前端不接入 → 确认后从池下线（不删后端，仅标记）
- **备注**：个别写语义残留（如 master-data /delete delete_lineage）已在 review 标记，业务确认时优先复核


## 待确认 375 抽样评审（2026-10-29）

- **预筛**（`prescan` 列全量回填 biz-review.csv）：疑似接入候选 124 / 待业务甄别 229 / 死代码候选(stub) 21 / 内部端点候选 1
- **样例包** `sample-review.csv`（48 条，覆盖 25 svc，分层抽样 seed 7）：backend BE 47/48（唯一 NO=erp addressbook share handler=s）+ biz_sug 列示范业务侧确认节奏
- **21 条占位已处置**：erp addressbook 16（handler=`s`，路由 `post(s)/get(s)` 冒烟占位确认）+ master-data lineage 5（handler=`ok`，`contract_fallbacks::ok` 契约 fallback，待路由核实）→ 池标记 `下线-真占位/契约fallback`（不删后端）
- **业务侧收窄路径**：人工评审范围 375→229（待甄别）+124（疑似接入，可参照样例包快速确认）

### 待甄别 229 二次预筛（2026-10-29）

- `prescan2` 列回填（biz-review.csv 全量 749 行）：疑似接入候选(二次) 15 / 疑似动作·任务端点 18 / 疑似内部·系统端点 10 / **仍待甄别 186**（业务人工范围 229→186）
- 15 疑似接入可转补绑；10 疑似内部可核实下线；18 动作类需业务确认（execute/run/send/sync 等）


### BIZ 749 业务侧终稿包（2026-10-29）

- **`biz-final-review.csv`**（204 条）= 仍待甄别 186 + 动作·任务类 18（全 BE，已带 prescan2 与 biz_decision 空列）
- **业务侧操作**：按 svc 过滤 → 逐条填 biz_decision（接入候选/内部保留/下线）→ 回传后由开发侧执行
- **全局处置链条**：保留 13 下线 ✅ + 接入候选 361 ✅ + 待确认 375（21 占位下线 + 143 疑似接入补绑）✅ → 仅剩 204 待业务拍板
- **BE 参考**：204 条后端 handler 全部存在（`grep 'fn <handler>'` 核验），无死代码嫌疑
