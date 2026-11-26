# 前端巡检暴露的软失败挂账（2026-11-26）

来源：`pnpm check:pages:all`（213 页，0 失败）。下面三项被统一判为「软失败」——
页面能打开，但后端给的是未实现 / 业务拒绝 / 数据不足。不算渲染缺陷，也不适合塞进巡检白名单，
按「挂账 + 明确验收口径」处理。

## 1. `/finance/account-balance` — 409「科目余额表校验未通过」

**定性：后端守卫生效，不是缺陷；暴露的是数据不平。**

接口 `GET /api/finance/reports/account-balance?company_id=…&period=202611` 返回：

```
total_opening_debit = 600    total_opening_credit = 1000    difference = -400
total_period_debit  = 300    total_period_credit  = 300
total_closing_debit = 600    total_closing_credit = 1000    difference = -400
unposted: count 4, amount 35678.98
checks: opening_unbalanced / closing_unbalanced
```

`get_account_balance_report` 的设计是「不平衡就 409 + 差异明细，不返回空表」，代码没有可修之处。
根因是本地演示库的期初凭证借贷差 400、另有 4 张未过账凭证 35678.98。

**验收口径**：把该租户期初凭证补齐到借贷相等、4 张未过账凭证处理完，接口转 200；
页面能出表即完成。生产租户有自己的期初，需各自核对，不能拿本地数据当结论。

**不做**：不把 409 改成 200 出空表——那会把数据不平藏起来，正是这个守卫要防的。

## 2. `/mobile/profile` — 404「用户不存在」

**定性：已按「无扩展资料」处理，页面正常；残留 1 条 404 软信号。**

`mobile.mobile_users` 是与 `iam.users` **并存的两套用户表**，`/api/mobile/user/profile`
只查前者（`WHERE id = $1`）。控制台账号（admin）在 `iam.users` 里有 id，在
`mobile.mobile_users` 里没有对应行，所以必 404。库里 `mobile.mobile_users` 只有 1 行 `test_admin`，
与 iam 的 admin id 不同。

前端已改：`MobileProfilePage` 把 404 当 `null`（回落 IAM 登录态展示姓名/邮箱/岗位），
不再抛错、不再进错误边界。巡检对这一步显示「软= 1」，是接口本身 404，可接受。

**验收口径**（若要彻底消除）：移动端账号在 `mobile.mobile_users` 建立对应行，
或 profile 接口在缺行时回落到 `iam.users` 同 id 记录。两者都要动权限边界（mobile schema
只读自己 schema），属产品决策，暂不做。

## 3. `/mes/energy-management` — 501「能耗数据源未接入」

**定性：按设计诚实降级，不是缺陷。**

`svc/mes/src/modules/energy_management.rs` 顶部注明：没有能耗采集表/采集系统时，
不再返回合成假值，统一 501 + 明确 message，保留响应结构与路由签名。页面 8 条 501
（realtime / report / forecast / alerts 等）都是这个来源。

**验收口径**：能耗采集表落地后，把 `energy_source_unavailable(...)` 换成真实聚合查询，
接口转 200，页面出数。**不做**：不恢复合成数据，也不把 501 改 200 空表。

## 与巡检脚本的关系

三项都记作「软」而不是白名单：每页输出仍打印 `软= n`，数量上涨能提前看到趋势；
一旦某页从软变硬（出现 5xx / 前端异常 / 错误边界），巡检立即判 FAIL。
