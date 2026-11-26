# 全站页面健康巡检（2026-11-26）

列表页一致性检查（`docs/frontend/list-page-consistency-check-20261126.md`）只看「总数 vs 行」，
覆盖不到看板、详情页、移动端页，也看不到「接口 500 / 前端抛异常 / 错误边界」这类更硬的故障。
本文记录补上来的第二层巡检。

## 脚本与命令

```
apps/web/scripts/check-page-health.mjs        # 主脚本
apps/web/scripts/lib/auth-session.mjs         # 两个巡检共用的登录 + 登录态注入 + 菜单取路由
```

```bash
cd apps/web
pnpm check:pages                 # 12 条代表路由，约 25 秒
pnpm check:pages:all             # 全量菜单（含看板），200 条上限，约 20 分钟
node scripts/check-page-health.mjs --routes /srm/contract,/srm/evaluation
```

参数：`--web --api --routes --all --include-dashboards --max --timeout --json`；
环境变量 `WEB_BASE / API_BASE / USERNAME / PASSWORD / TENANT_ID`。
退出码 0 全绿、1 有失败、2 脚本级错误。

## 判定口径

判 **FAIL**（三类硬信号，任一命中即失败）：

1. 页面加载期间出现 `/api/` **5xx**；
2. 未捕获的**前端错误**（`console.error`，过滤掉 Vite/emotion/React DevTools 等已知噪声）；
3. 命中**错误边界**（正文出现「页面出错了 / Something went wrong」）或正文为空（白屏）。

只记提示、不判负（输出里标「软= n」）：

- **404 / 409 / 501**：404 多为可选接口未实现、409 是业务冲突、501 是「数据源未接入」的显式降级，
  页面靠空态兜底仍可用；由这些状态码带出来的 console error 同步降级。其余 4xx（如 403 权限态）同样只记。
- **加载超时**（默认 15s 仍停在「加载中」）：开发模式 Vite 冷编译常见。
- **失败页自动重试 1 次**（`--retries 0` 可关）：HMR / 端口瞬断会造成 `ERR_CONNECTION_REFUSED` 假红，
  复测通过记 `OK(重试)`，不掩盖真失败。

## 首轮全量结果（200 页）

`192 OK / 7 FAIL`，失败项都不是脚本误报，全部是真问题（下面表格的「处理」列已落到本次提交）：

| 页面 | 信号 | 归因 | 处理 |
| --- | --- | --- | --- |
| `/srm/contract` | `filtered.slice is not a function` | 接口返回 `{contracts,total,...}`，前端当数组用 | 已修（`unwrapList`） |
| `/srm/evaluation` | `filtered.slice is not a function` | 返回 `{evaluations,...}` | 已修 |
| `/srm/order` | `items.map is not a function` | 返回 `{purchase_orders,...}`（统计卡与列表两处） | 已修 |
| `/srm/performance` | 500 `/api/srm/performance/reports` | 后端 `total_amount NUMERIC` 解成 `f64` | 已修（SQL 显式 `::float8`） |
| `/finance/account-balance` | 409 | 报表接口业务冲突（账期/口径） | 软失败：待产品确认口径 |
| `/mobile/profile` | 404 | 移动端资料读 `mobile.mobile_users`，控制台账号无该行 | 已修：前端按「无扩展资料」回落 IAM 登录态 |
| `/mes/energy-management` | 501 | 能耗接口按设计「无数据源诚实降级」 | 软失败：等采集表（见挂账单） |

**共同根因（SRM 四个页面）**：`src/api/srm` 把列表接口标注成 `T[]`，实际后端统一返回
`{ <key>: T[], total, page, page_size }`。类型断言 `as T[]` 骗过了编译器，运行时才炸。
新增 `apps/web/src/components/srm/unwrapList.ts`，数组/包体都能接住，取不到给空数组。

这条也解释了上一轮 `/srm/contract` 为什么「总数 0、行 0」却判 OK：一致性检查只看表格数字，
不看控制台，接口失败被空态掩盖了。两层检查互补，缺一不可。

## 复扫结果（213 页）

修复后全量复扫：**`213 OK / 0 FAIL`，判定 OK**（约 22 分钟）。
软失败 3 页：`/mobile/profile`(2)、`/finance/account-balance`(1)、`/mes/energy-management`(8)，
页面本身可正常打开；三项的定性与验收口径见 `docs/ops/frontend-soft-failures-20261126.md`。

## 发版前总闸

三层检查 + 类型检查合成一条命令，避免「只跑了其中一层」的错觉：

```bash
cd apps/web
pnpm verify:frontend          # quick：8 条列表 + 12 条健康 + tsc，实测 68 秒
pnpm verify:frontend:full     # 全量：--all，约 7 分钟（并发 3）
```

顺序有讲究：`tsc --noEmit` 先跑，类型错就直接停（否则巡检结果全是类型错的噪声）；
然后是字段契约（15 个 GET，0.6s）、列表一致性、页面健康。任一步失败即整体 FAIL，退出码 1。
quick 模式实测：契约 0.6s + 一致性 7.8s + 健康 10.9s（tsc 另约 35s）。

全量实测（2026-11-26）：列表一致性 134 页 / 不一致 0（215s），页面健康 213 页 / 失败 0（220s），
总览 `PASS / PASS / 判定 OK`。

并发由脚本内置 `--concurrency`（默认 3）控制：worker 抢队列而不是切片分批，慢页不拖住快页。
串行版本这两段是 607s + 485s，并发后 215s + 220s，整体从 18 分钟降到 7 分钟；单页命中率不变
（dev server 冷编译靠 `--timeout 20` 兜住）。

## 静默空表排查（辅助工具，不进闸）

`pnpm check:silent-empty`：接口返回了数组、页面表格却是「共 0 / 行 0」的页会被列成候选。
动机是 `/srm/contract` 那类「接口有数据、适配器解析失败、空态兜住」的静默丢失——
两层检查都可能漏（总数和行数都是 0）。

**首轮全量（213 页）得到 13 个候选，逐页核对后全部是辅助列表，不是缺陷**：

| 候选 | 页面实际列表 | 命中的数组 |
| --- | --- | --- |
| `/finance/assets`、`/finance/ledger`、`/finance/cost` | 资产/分录/成本记录（真为空） | `chart of accounts` 30 条（筛选下拉） |
| `/wms/batch-management`、`/wms/transfer`、`/wms/stock-take` | 批次/调拨/盘点（真为空） | `warehouses` 29、`locations` 10（筛选） |
| `/hrm/leave`、`/hrm/contracts` | 请假/合同（真为空） | `employees` 17（选人） |
| `/crm/recommendation` | 推荐结果（真为空） | `customers` 100（候选池） |
| `/bi/dataset` | 数据集（真为空） | `data-sources` 4（下拉） |
| `/mes/equipment-oee` | OEE 记录（`records:[]`，真为空） | `statistics.by_equipment` 10（聚合卡） |
| `/crm/customer-segmentation` | 分层明细（真为空） | `quadrants` 2（图表） |
| `/mes/production-cost` | 成本明细（真为空） | `cost_by_month` / `forecast_data`（图表） |

结论：这类工具的召回靠「数组存在」，精度靠人工。真正的「解析失败型静默空表」在抛错时
会留下 console error，已经被页面健康检查抓红（`/srm/contract` 就是这样被抓到的），
所以它只作排查辅助，不进 `verify:frontend`。

## itemsField 契约巡检（静态解析 + 打接口）

`createCrudPageAdapter(api, { itemsField: 'contracts' })` 是前端对响应体的承诺。后端把字段改名后，
`normalizeListResponse` 会退到 `items / materials / data` 兜底——不抛错、不报红，只是数据悄悄变空，
在「本来就没数据」的租户上永远暴露不出来。

`pnpm check:items-field` 做的事：grep 出每处 `itemsField` 声明 → 解析到 API 对象 → 找到 `list` 里的
`apiClient.<svc>.get('<path>')` → 用 admin token 直接打接口 → 看承诺的字段在不在。

首轮结果（15 处声明，含 `as unknown as CrudApi<T>` 这类强转写法）：

```
OK  EquipmentManagementPage  equipments   → /api/mes/equipment           keys=equipments,total,page,page_size
OK  EquipmentOEEPage         records      → /api/mes/equipment-oee       keys=records,total,page,page_size
OK  TeamManagementPage       teams        → /api/mes/teams               keys=teams,total,page,page_size
OK  InboundOrderPage         orders       → /api/wms/inbound-orders      keys=orders,items,total,page,page_size
…（15/15 匹配，缺失 0）
```

**边界**：解析靠正则，手写适配器只覆盖 `list: api.x.list` 形态（`list: (p) => api.query(p)` 这种抓不到）；
解析不出来的记 `SKIP` 不判负
（宁可漏报，也不要假红）。它验证的是「字段名对得上」，不验证「数据内容对不对」。

## 取舍与盲区

- 不进 PR CI：要起后端 + 前端 + 无头浏览器，成本高于收益；定位发版前 / Nightly。
- 只覆盖「页面打开即渲染」这一跳，不点按钮、不填表单，交互链路仍需人工或 E2E 用例。
- 404/409/501 只记提示，意味着「接口没实现但页面靠兜底空态活着」不会被判负——这类需要产品口径，
  不适合用脚本一刀切；但数量会打在每页的「软=」列上，飘红之前能看到趋势。
- 重试会多花时间（失败页 ×2），全量跑 22 分钟；只查单页时无感。
