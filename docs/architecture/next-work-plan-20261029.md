# TOPEMS 下一步工作规划 — 2026-10-30（更新）

> 依据当前治理主线闭环状态整理。按「执行方」分组，标注阻塞条件与建议排期。
> 原则：外部数据到位即核销；后端改动与协作机协调；无明确收益不主动扩展范围。

## 一、已闭环基线（规划前提）

- schema 双源：B 扩展收敛 + 空库回归修复 + 豁免登记（2f6c9672b / 881ce9779）
- 依赖：npm 25→2（重复 pnpm 键根因修复，ede14836b）+ cargo audit 0 漏洞（4b495a84a）
- expo 58 升级合并 main（f2438b583）+ jest 基础设施确认（d582b3f0d）
- 契约门禁：P2a/P2b 调用面过滤全绿（68f03cd8b）+ 诊断闭环（4f7699bd0）
- 协作机清单 + 挂账登记：docs/developer/collab-regression-20261029.md、docs/security-dependencies-hold.md
- **B1/B2 对照表就绪**：erp hr-proxy 15 条映射（25ab1ec42）+ ehs 9 路径差异（35036117f）——
  落档 contract-gap-63-diagnosis §七/§B2
- **jest P0 拍板项执行**：storage + api-url 用例 27/27 全绿 + api-url 默认端口悬空冒号修复（445ac73d5）
- **cargo unmaintained 处置落档**：忽略 + 上游复核（无直改点，§8.1）（445ac73d5）

## 二、剩余待办与归属

| # | 待办 | 执行方 | 阻塞条件 | 预估工作量 |
|---|---|---|---|---|
| 1 | v76 终核核销 | 本机判 / WSL 提供 | WSL `git log -p` 输出 | 10 分钟（收到数据后） |
| 2 | WSL 四步回归 | 协作机 | 拉取 main 后执行（清单 §1-§2） | 协作机 30 分钟 |
| 3 | 方案 B1：erp hr-proxy utoipa 文档统一（/hr/...） | 后端（协作机或本机，需协调） | **对照表已就绪**；与协作机节奏对齐 | 0.5-1 天 |
| 4 | erp submit-report 后端实现 | 后端（协作机） | 协作机开发推进；实现后移除 KNOWN_UNMOUNTED | 半天 |
| 5 | 方案 B2：ehs utoipa 统一复数 + 双挂清理 + detections 命名对齐 | 后端（协作机或本机） | **对照表已就绪**；与 B1 同节奏 | 0.5 天 |
| 6 | 方案 B3：纯缺端点核对 | 后端 | 已随 v74 单复数修复消除大部分；协作机 erp/ehs 收尾时核销 | 半天 |
| 7 | GH Actions 依赖核销 | 本机（对照静态清单） | dependabot 鉴权恢复 | 1 小时 |
| 8 | 真机回归 + EAS 云构建 | 用户 | Expo 账号登录 + 真机/原生环境 | 用户侧 1-2 天 |
| 9 | jest P1/P2 用例（syncService/networkService/状态层） | 用户拍板 → 本机 | 范围确认（P0 已完成） | 视范围 |
| 10 | v1.120 mes WS 双实现差异核查（骨架 vs 完整通道，dashboard 频道广播源缺口观察项） | **本机已核查闭环**（TODO v1.120 定稿） | **等业务拍板**：dashboard 实时推送是否接入 ws_event_bridge（W4 范畴；无故障，缺实时性，REST 轮询兜底） | 已核查 |

## 三、建议排期（按依赖与价值）

### P0 — 数据到位即做（10 分钟级）
1. **v76 终核**：WSL 输出到位 → 逐行比对 → 核销/差异判定（判定基准已存：无裸 vector / extension 名 / vector_cosine_ops / cast 惯例）
2. **WSL 四步回归**：协作机拉取 main → 执行清单 → 反馈 validate 数字/迁移数/幂等结果/health

### P1 — 本周契约债务收敛（需与协作机协调，对照表均就绪）
3. **方案 B1**（erp hr-proxy utoipa 统一）——契约债务最长尾（15 条文档/挂载脱节），
   且死封装豁免属"债务暂缓"，转正时会重新触发门禁——优先清（对照表 15 条即改即用）
4. **方案 B2**（ehs 统一复数）——含 factors 双挂清理（保留复数）、detections↔detection-records
   命名对齐、statistics 单复数定夺（对照表 9 路径 + 决策点已列）——与 B1 同批对齐
5. **erp submit-report 后端实现**（KNOWN_UNMOUNTED 移除条件）

### P2 — 等权限/可拍板
6. **GH Actions 核销**（dependabot 鉴权恢复，静态清单已备）
7. **真机回归 + EAS**（Expo 账号）
8. **jest P1/P2**（syncService/networkService/状态层——拍板范围）
9. **v1.120 mes WS 双实现差异核查**（dashboard 频道广播源缺口观察项——确认归属后核）

## 四、优化空间与风险提示

1. **协作机并发频繁**：近期推送几乎每次需 fetch+rebase（协作机 main 持续前移）。
   建议：短命特性分支 + 定期同步；本机推送合并批次，降低 rebase 频次。
2. **死封装豁免是暂缓非消除**：方案 B 持续推进前，协作机将死封装转正（业务 import）
   时门禁自动恢复比对——届时契约错位会集中暴露，需有 B1-B3 承接（对照表已备好）。
3. **B2 需先定决策**（factors 双挂/statistics/detections 命名）——后端挂载自身混用，
   建议协作机改动时一并清理（对照表决策点已列）。
4. **node-forge/deepmerge 复核触发点**：@expo/code-signing-certificates 更新、deepmerge 4.3.2+
   发布——拍板"不建 cron，依赖升级时顺带复核"（10-30 已定）。
5. **mes WS 观察项**：骨架 vs 完整通道差异**已核查定稿**（v1.120）——dashboard 频道无广播源确认，
   前端走 8099 通用通道 + REST 轮询兜底（无故障、缺实时性）；实时推送属业务拍板（W4 范畴）——
   建议下线候选标记与实时接入均待业务确认。

## 五、建议下一步（按优先级）

1. **最短闭环**：等 WSL 数据核销 v76 + 协作机跑四步回归（两条 P0）
2. **契约债务**：与协作机对齐后**一次性启动 B1+B2**（对照表均就绪，改动同批推送）
3. **观察项**：mes WS 已核查闭环（v1.120 定稿）——dashboard 实时推送属业务拍板（W4 范畴）
4. **拍板项剩余**：jest P1/P2 范围（P0 已完成，P1 待确认）
