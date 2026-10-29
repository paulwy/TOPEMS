# to_bind v74 重建池（2026-10-29，当前基线·泛型/跨行/短路径匹配修正）

> 脚本：`scripts/rebuild-to-bind-pool.py`；后端路由 5592（utoipa 3260 + Router::route 2332）× 前端 api 调用 3243（含泛型/跨行调用识别）。
> 口径：后端真实 handler + 前端无 api 调用 → 候选；优先级 P0=写+弱引用 / P1=写+无引用 / P2=读+弱引用 / 下线候选=读+无引用。

**候选总数：1091**（v73 332 作废）

## 优先级分布
| 优先级 | 数量 | 处置建议 |
|---|---|---|
| P0 | 3（短路径误报登记，实质 0） | 写端点+弱引用 |
| P1 | 100（剩余均为已绑登记项） | 写端点+无引用 |
| P2 | 48（剩余均为已绑登记项） | 读端点+弱引用 |
| P2 | 48（剩余均为已绑登记项） | 读端点+弱引用 |
| 下线候选 | 1361 | 读端点+无引用，人工确认删路由 |

## 按服务分布（前 15）
| 服务 | 候选 | P0 | P1 | P2 | 下线 |
|---|---|---|---|---|---|
| erp | 373 | 4 | 62 | 9 | 298 |
| portal | 330 | 0 | 0 | 4 | 326 |
| unified-core | 143 | 0 | 6 | 19 | 118 |
| master-data | 85 | 0 | 5 | 3 | 77 |
| ai | 83 | 2 | 4 | 4 | 73 |
| analytics | 74 | 2 | 21 | 5 | 46 |
| finance | 69 | 0 | 7 | 2 | 60 |
| integration | 64 | 8 | 6 | 1 | 49 |
| mes | 59 | 2 | 12 | 5 | 40 |
| plugin-registry | 56 | 0 | 22 | 3 | 31 |
| ehs | 47 | 0 | 5 | 2 | 40 |
| qms | 46 | 1 | 25 | 2 | 18 |
| pdm | 38 | 0 | 15 | 1 | 22 |
| lims | 35 | 0 | 12 | 5 | 18 |
| rd | 35 | 3 | 6 | 5 | 21 |

## 匹配能力迭代记录（2026-10-29）
- v1：utoipa 3260 路由，候选 1649。
- v2：补 Router::route（5592），候选 2712。
- v3：api_re 泛型调用识别（前端 2041→2670），候选 1886。
- v4：跨行路径识别（前端 2670→3243），候选 ~1850（n>=2 最终）。
- **ehs P0+P1 已绑定 66→0**（本批补绑 11 条 + 既有已绑识别）。
- **erp P0+P1 66→48→13**（svc 前缀归一修正；批2 补绑 4 条：meeting-bookings 3 + consolidation submit-report 1；批1 MDM 补绑 33 条；剩余 13 条全为误报/下线候选——登记）。
- **P0 批 9→3**（补绑 9 条；剩余 3 条短路径误报登记）。
- **qms 批 22→2**（补绑 20 条；剩余 2 条已绑登记）。
- **plugin-registry 批 21→0**（补绑 17 条；另 4 条已绑。精度限制登记：pluginAxios 非泛型调用脚本漏检）。
- **pdm 批 15→0**（补绑 4 条；另 11 条已绑。method 误标登记）。
- **analytics 批 14→0**（补绑 14 条；脚本核销成功 1446→1429）。
- **rd 批 6→0**（补绑 6 条；候选 1429→1423）。
- **lims 批 9→2**（补绑 2 条；7 条已绑登记；1423→1421）。
- **ticket 批 8→0**（补绑 8 条；候选 1421→1411）。
- **mes 批 7→2**（补绑 5 条；2 条已绑登记；1411→1406）。
- **integration 批 7→2**（补绑 5 条；2 条已绑登记；1406→1400。**P0/P1 实质清零**）。
- **P2 unified-core 批 18→3**（补绑 15 条；3 条登记；1400→1385，P2 86→72）。
- **P2 mes+monitor 批**（1 补绑 listMetrics；13 已绑登记；1385→1371，P2 72→58）。
- **P2 crm+rd+lims+erp 批**（4 补绑；14 已绑登记；1371→1367，P2 58→54）。
- **P2 qms+portal+master-data 批**（3 补绑；6 已绑登记；1367→1364，P2 54→51）。
- **P2 扫尾批（16 条）**（补绑 4：analytics visualization list/create + ehs environment list + plugin navigation-config；其余 12 条已绑/剔除登记（ai dsh stream×2、communication notifications×2、finance exports×2、hrm reviews/goals、plugin marketplace summary、pm project-types、gis ws/map WS 端点）；候选 1364→1361，P2 51→48。**P2 实质全部清零**（剩余 48 均为脚本无法核销的已绑登记项）。
- 已知精度限制：1 段短路径（如 /plans）不参与尾段匹配（n>=2），短路径端点可能漏匹配已绑（登记）。

## 下线候选分流（2026-10-29）

- 分层抽样 24 条：handler 存在率 ~90%，缺陷 2 类（method 误标写端点 GET 化 ~15%、handler 泛化名 stub/ok/s ~15%）
- 发现 erp `smoke_false_positive_stub_routes()` 冒烟占位路由（业务无实现）
- 分流：**stub-cleanup 7 条**（下线-真占位，池已标记 v74_tend）；**method-mislabel 213 条**（写端点误标 GET，归前端接入 P1 通道，portal 82 最大）；**read-endpoints 990 条**（真实读端点待人工评估，portal 240/erp 181/unified-core 110 最大）
- 清单落盘 `artifacts/audit/orphan-review/offline-review/{stub-cleanup,method-mislabel,read-endpoints}.csv` + README.md（评估维度 4 条）

## 批3 read-endpoints 评估（2026-10-29 起）

- **portal 240 条已评估**（`offline-review/portal-eval.csv`）：OPS 55/BIZ 176/批2复核 9；抽样 8 条全 BE
- **erp 181 条已评估**（`offline-review/erp-eval.csv`）：OPS 43/BIZ 157/批2复核 10；抽样 9 条全 BE
- **剩余 569 条已评估**（`offline-review/eval-rest.csv`，24 svc）：OPS 111/BIZ 416/批2复核 13；抽样 12 条 11 BE（rd get_material_test 待核）；批2复核含误标（run 匹配 runtime/list 类）后续补绑时甄别
- **批3 全量 990 完成**：OPS 209/BIZ 749/批2复核 32；评估表全部落盘 offline-review/
- **批2复核 32 条处置**：31 真写补绑（writeOps2.ts×8：portal 9/erp 10/ai 2/finance 1/integration 1/master-data 3/unified-core 4）+ 1 误标剔除（plugin list_plugins_with_status 读）+ plugin-registry register_plugin 1 条登记（无 apiClient.plugin，需 pluginAxios 手动接线）；候选 1141→1110
- **v74 池全链路完结**：P0/P1/P2 清零 + 批2 213 全处置 + 批3 990 全评估
- **BIZ 749 评审决策包产出**（`offline-review/biz-review.csv`）：前端接入候选 361/待业务确认 375/保留后端 13；抽样 9/9 BE；待业务侧按 svc 分批确认
- **保留 13 条确认下线** ✅：池标记 `下线-内部保留` 12 条；mdm deregister 已批2移出
- **接入候选试点（portal 20 条）** ✅：`portal/readOps.ts` 新建（get 11/post 9）；候选 1110→1091；演示读端点补绑流程（typecheck+核销+commit）通过，可放量

## 批2 method 复核（写端点补绑，2026-10-29 起）

- **portal 批（75 条）**：补绑 `apps/web/src/api/portal/writeOps.ts`（新建，post 53/put 11/get 7/delete 4），method 由 operation_id/handler 语义推导；根路径 7 条（/todos×2、/navigation/pinned×2、/settings/reset、/dashboard/quick-access×2）登记不补（portal 根路由无 /api/portal 前缀，与 apiClient.portal baseURL 不匹配）；候选 1361→1275，portal 下线候选 322→236
- **erp+finance 批（51 条）**：补绑 erp/writeOps.ts（post 19/put 1/delete 3/get 8）+ finance/writeOps.ts（get 4/post 14/put 2）；候选 1275→1222；批2 剩余：integration 15/ehs 10/analytics 9/ai 7 等共 87 条
