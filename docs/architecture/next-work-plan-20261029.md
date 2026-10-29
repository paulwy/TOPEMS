# TOPEMS 下一步工作规划 — 2026-10-29

> 依据当前治理主线闭环状态整理。按「执行方」分组，标注阻塞条件与建议排期。
> 原则：外部数据到位即核销；后端改动与协作机协调；无明确收益不主动扩展范围。

## 一、已闭环基线（规划前提）

- schema 双源：B 扩展收敛 + 空库回归修复 + 豁免登记（2f6c9672b / 881ce9779）
- 依赖：npm 25→2（重复 pnpm 键根因修复，ede14836b）+ cargo audit 0 漏洞（4b495a84a）
- expo 58 升级合并 main（f2438b583）+ jest 基础设施确认（d582b3f0d）
- 契约门禁：P2a/P2b 调用面过滤全绿（68f03cd8b）+ 诊断闭环（4f7699bd0）
- 协作机清单 + 挂账登记：docs/developer/collab-regression-20261029.md、docs/security-dependencies-hold.md

## 二、剩余待办与归属

| # | 待办 | 执行方 | 阻塞条件 | 预估工作量 |
|---|---|---|---|---|
| 1 | v76 终核核销 | 本机判 / WSL 提供 | WSL `git log -p` 输出 | 10 分钟（收到数据后） |
| 2 | WSL 四步回归 | 协作机 | 拉取 main 后执行（清单 §1-§2） | 协作机 30 分钟 |
| 3 | 方案 B1：erp hr-proxy utoipa 文档统一（/hr/...） | 后端（协作机或本机，需协调） | 与协作机并行开发节奏对齐 | 0.5-1 天 |
| 4 | erp submit-report 后端实现 | 后端（协作机） | 协作机开发推进；实现后移除 KNOWN_UNMOUNTED | 半天 |
| 5 | 方案 B2：ehs 后端 utoipa 单复数统一 | 后端（协作机或本机） | 与 B1 同节奏 | 0.5 天 |
| 6 | 方案 B3：纯缺端点核对 | 后端 | 协作机 erp/ehs 收尾时 | 半天 |
| 7 | GH Actions 依赖核销 | 本机（对照静态清单） | dependabot 鉴权恢复 | 1 小时 |
| 8 | 真机回归 + EAS 云构建 | 用户 | Expo 账号登录 + 真机/原生环境 | 用户侧 1-2 天 |
| 9 | jest 用例补充范围 | 用户拍板 → 本机 | 范围确认（现 11 用例框架） | 视范围 |
| 10 | cargo unmaintained 3 项处置 | 用户拍板 | proc-macro-error / ttf-parser / unsafe-libyaml 是否替换 | 视决策 |
| 11 | 挂账复核机制（node-forge/deepmerge） | 用户拍板 → 本机 | 是否建定期复核（cron/手动） | 10 分钟 |

## 三、建议排期（按依赖与价值）

### P0 — 数据到位即做（10 分钟级）
1. **v76 终核**：WSL 输出到位 → 逐行比对 → 核销/差异判定
2. **WSL 四步回归**：协作机拉取 main → 执行清单 → 反馈数字

### P1 — 本周契约债务收敛（需与协作机协调）
3. **方案 B1**（erp hr-proxy utoipa 统一）——契约债务最长尾（20+ 条文档/挂载脱节），
   且死封装豁免属"债务暂缓"，转正时会重新触发门禁——优先清
4. **erp submit-report 后端实现**（KNOWN_UNMOUNTED 移除条件）
5. **方案 B2/B3**（ehs 单复数 + 纯缺）——随协作机 erp/ehs 收尾同批

### P2 — 等权限/可拍板
6. **GH Actions 核销**（dependabot 鉴权恢复）
7. **真机回归 + EAS**（Expo 账号）
8. **jest 用例补充**（拍板范围）
9. **cargo unmaintained 处置**（拍板）
10. **挂账复核机制**（拍板建/不建）

## 四、优化空间与风险提示

1. **协作机并发频繁**：近期推送几乎每次需 fetch+rebase（协作机 main 持续前移）。
   建议：短命特性分支 + 定期同步；本机推送合并批次，降低 rebase 频次。
2. **死封装豁免是暂缓非消除**：方案 B 持续推进前，协作机将死封装转正（业务 import）
   时门禁自动恢复比对——届时契约错位会集中暴露，需有 B1-B3 承接。
3. **cargo unmaintained 3 项**：proc-macro-error 属 proc-macro 链通用依赖（替换需上游协作），
   ttf-parser/unsafe-libyaml 视使用面定——低风险长尾，建议拍板忽略或排期替换。
4. **node-forge/deepmerge 复核触发点**：@expo/code-signing-certificates 更新、deepmerge 4.3.2+
   发布——若建 cron 复核可自动提醒。

## 五、建议下一步（按优先级）

1. **最短闭环**：等 WSL 数据核销 v76 + 协作机跑四步回归（两条 P0）
2. **契约债务**：与协作机对齐后启动方案 B1（本周目标）
3. **拍板项**：jest 用例范围、cargo unmaintained 处置、挂账复核机制（三者可一次性拍板）
