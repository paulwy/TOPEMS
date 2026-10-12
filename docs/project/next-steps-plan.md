# TOPEMS 下一步工作规划

> 依据 `TODO.md` 待办 + 本轮已完成工作（Expo SDK 57 迁移 / EAS 配置 / dependabot 修复 / B 级孤儿下线）重新排定。
> 日期：2026-10-13

## 0. 状态基线（2026-10-13 核实）

- 本地 `origin/main..HEAD = 0`，**全部提交已 push**。TODO.md 中此前标注"未 push"的提交（B1 事件投影、D6 outbox、生产收口、ehs 契约补齐等）**已被并行线推送到 origin/main**，标注过时。
- 工作区剩余未提交改动 = 并行线进行中工作（`svc/*.rs` 10 个服务、`scripts/run_monolith.sh`、`.sqlx` 缓存、`sheets/`、`apps/web/.storybook` 删除），**非本线待办，保持不触碰**。

---

## 一、P0 · 生产环境收口（阻塞于环境，最高优先）

> 均需真实生产 Linux/Windows 环境，本线（macOS）无法完成，需部署负责人执行。

| # | 待办 | 前置 | 验证口径 |
|---|---|---|---|
| 1 | 生产机实跑 `install/update/rollback.sh` | systemd 环境 | 容器内已验 EXIT=0，生产机最终确认 |
| 2 | 生产机 `smoke-prod.sh` 全项 PASS | 环境 | 层1 自动 + 层2 专项（财务借贷/工单事件化/质量链/插件/BI/WS 看板） |
| 3 | 生产服务 `/health` 全绿 | 环境 | `health-check.sh` 就绪 |
| 4 | nginx 生产验证 | 生产 Linux | `nginx -t` + 6 域冒烟（macOS epoll 限制） |
| 5 | 验证库 5433 pgvector 对齐 0.8.7 | 环境 | `ALTER EXTENSION vector UPDATE` |
| 6 | Windows 部署实跑 | WSL2 环境待建 | `docs/deploy/windows-deployment.md` |

**建议**：P0 是上线的硬门槛，但被环境阻塞。若生产环境本周内可到位，应**优先投入**；否则与 P1 并行推进（P1 不依赖环境）。

---

## 二、P1 · 移动端原生验证（本轮新增，可立即启动）

> 源于 Expo SDK 50→57 迁移（已 push `2bfaa4eb4`）。迁移后**原生端未实跑**，是当前唯一真实风险点。

| 步骤 | 动作 | 说明 |
|---|---|---|
| 1 | `eas login` | 需开发者本人 Expo 账号 |
| 2 | `eas init` | 关联项目，生成 projectId |
| 3 | `eas build --platform android --profile preview` | 内部 APK，成本 $0（Free 档） |
| 4 | 真机按清单验证 | 见 `docs/deploy/mobile-eas-build-runbook.md` §4：扫码/通知/React 19/离线 |

**建议**：这是"迁移已推送但未验证"的闭环缺口，优先级最高、不依赖生产环境、零成本，**建议本周内完成**。

---

## 三、P2 · 技术债专项（已登记，可独立批次）

### 3a. 事务一致性（D6 决策待确认）
- 现状：D6 决策文档已出（推荐 **选项 B：commit 后 emit + 重试队列**），**未实施**。
- 待用户拍板：① 仅 erp 三模块 vs 推广全部发布服务（finance 21 / wms 19 / hrm 21 / scm 20 / crm 9 / mes 8 / pm 3）；② 重试载体 Redis ZSET vs 0013 落表；③ 后台任务内嵌 vs 独立进程；④ 0013 落库时点。
- **建议**：先确认范围，最小侵入从 erp 三模块起步。

### 3b. 前端/权限基线债（独立批次）
| 项 | 说明 |
|---|---|
| R3=9 | 9 个 admin-only handler 缺 gate 标注（communication/ehs/master-data/portal），致 frontend-test shard4 + coverage 红 |
| R5=7 | ai/wms 权限矩阵缺口 |
| menu-health | P1=52 / R3=271（v2 路由重构债） |
| axum-layer | aps/feedback 组 |

### 3c. 观测与死代码
- 观测缺口 G1/G2/G3（边指标 status 维度 / 出站延迟直方图 / shared-core 死指标）
- hrm MDM 主数据事件独立总线未纳入 ZSET 重试
- wms `inventory.rs:108` `publish_inventory_updated` 死代码

---

## 四、P3 · 环境性 / 待外部条件

| 项 | 阻塞 | 触发条件 |
|---|---|---|
| CI 实跑（38 jobs + Docker/E2E/Secret Scan/Deploy K8s） | GitHub 账户 Billing | 恢复后重跑，预期除基线债外全绿 |
| B15 真实业务流量窗口重采 | 27 服务全启 + 代表性流量 | 生产环境就绪后 |
| rust-audit（rsa RUSTSEC-2023-0071） | 无上游修复 | 等上游或评估替换 jsonwebtoken |

---

## 五、建议执行顺序（本周）

```
本周优先：
  P1 移动端原生验证（零成本、无环境依赖、闭环迁移风险）→ 最优先
  3a D6 事务一致性范围确认（决策阻塞，需你拍板）
并行：
  P0 生产环境收口（等环境到位）
  P2 技术债独立批次（可指派，不依赖环境）
```

**关键决策待办（需你拍板）**：
1. D6 实施范围（erp 三模块 vs 全服务）
2. P2 3b 前端/权限债是否本周派批

---

> 返回 [根 TODO.md（最新执行日志）](../../TODO.md) · [docs/deploy/mobile-eas-build-runbook.md](../deploy/mobile-eas-build-runbook.md)
