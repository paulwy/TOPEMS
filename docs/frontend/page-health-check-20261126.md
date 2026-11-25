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
| `/mobile/profile` | 404 | 移动端资料接口未实现 | 软失败：待补 |
| `/mes/energy-management` | 501 | 能耗接口按设计「无数据源诚实降级」 | 软失败：等采集表 |

**共同根因（SRM 四个页面）**：`src/api/srm` 把列表接口标注成 `T[]`，实际后端统一返回
`{ <key>: T[], total, page, page_size }`。类型断言 `as T[]` 骗过了编译器，运行时才炸。
新增 `apps/web/src/components/srm/unwrapList.ts`，数组/包体都能接住，取不到给空数组。

这条也解释了上一轮 `/srm/contract` 为什么「总数 0、行 0」却判 OK：一致性检查只看表格数字，
不看控制台，接口失败被空态掩盖了。两层检查互补，缺一不可。

## 复扫结果（213 页）

修复后全量复扫：**`213 OK / 0 FAIL`，判定 OK**（约 22 分钟）。
软失败 3 页：`/mobile/profile`(2)、`/finance/account-balance`(1)、`/mes/energy-management`(8)，
均为后端未实现/未接入，页面本身可正常打开。

## 取舍与盲区

- 不进 PR CI：要起后端 + 前端 + 无头浏览器，成本高于收益；定位发版前 / Nightly。
- 只覆盖「页面打开即渲染」这一跳，不点按钮、不填表单，交互链路仍需人工或 E2E 用例。
- 404/409/501 只记提示，意味着「接口没实现但页面靠兜底空态活着」不会被判负——这类需要产品口径，
  不适合用脚本一刀切；但数量会打在每页的「软=」列上，飘红之前能看到趋势。
- 重试会多花时间（失败页 ×2），全量跑 22 分钟；只查单页时无感。
