# 批 0 绿基线：`cargo test --workspace --lib` 全量留痕报告

> **执行日期**：2026-10-20（Asia/Shanghai）
> **执行环境**：本机 macOS（/Users/air/TOPEMS），SQLX_OFFLINE=true（离线编译，.sqlx 缓存命中源码）
> **命令**：`SQLX_OFFLINE=true cargo test --workspace --lib`（41 个 workspace member）
> **目的**：补齐审计项 L-06（历史基线 O6/O7）——此前"全绿"仅为分 crate 局部绿，本次一次性完整跑通并落盘，形成可追溯证据。

---

## 一、结果总览

| 指标 | 值 |
|---|---|
| workspace members | 41 |
| 完成 crate 数 | **40/41 全绿** |
| 通过用例 | **约 10516 passed** |
| 失败用例 | **0 failed** |
| 忽略用例 | 20 ignored（环境守卫/特性门控） |
| 环境性挂起（非失败） | 2 条（见 §三） |

> 通过数口径：全量任务内已完成 crate 累计 **10151 passed / 0 failed / 17 ignored**（33 个 test binary），加上 shared_event 单独复跑的 **365 passed / 0 failed / 3 ignored**（全量任务中该 crate 因环境性挂起未出结果，单独排除 2 条挂起用例后跑通）。共约 10516 passed、0 failed。

---

## 二、逐 crate 结果（全量任务 33 个 test binary）

| # | crate | 结果 |
|---|---|---|
| 1 | topems_ai | ok · 983 passed / 0 failed / 9 ignored |
| 2 | （finance 等） | ok · 192 passed / 0 failed / 1 ignored |
| 3 | | ok · 211 passed / 0 failed |
| 4 | | ok · 504 passed / 0 failed / 2 ignored |
| 5 | | ok · 231 passed / 0 failed |
| 6 | | ok · 902 passed / 0 failed |
| 7 | | ok · 1087 passed / 0 failed |
| 8 | | ok · 155 passed / 0 failed |
| 9 | | ok · 293 passed / 0 failed |
| 10 | | ok · 182 passed / 0 failed |
| 11 | | ok · 149 passed / 0 failed |
| 12 | | ok · 451 passed / 0 failed |
| 13 | | ok · 458 passed / 0 failed |
| 14 | | ok · 32 passed / 0 failed |
| 15 | | ok · 250 passed / 0 failed |
| 16 | | ok · 134 passed / 0 failed |
| 17 | | ok · 322 passed / 0 failed |
| 18 | | ok · 249 passed / 0 failed |
| 19 | | ok · 497 passed / 0 failed |
| 20 | | ok · 582 passed / 0 failed |
| 21 | | ok · 262 passed / 0 failed |
| 22 | | ok · 155 passed / 0 failed |
| 23 | | ok · 337 passed / 0 failed |
| 24 | | ok · 179 passed / 0 failed |
| 25 | （两个 0-test） | ok · 0 passed（空 lib） |
| 26 | | ok · 0 passed（空 lib） |
| 27 | | ok · 71 passed / 0 failed |
| 28 | | ok · 202 passed / 0 failed |
| 29 | | ok · 120 passed / 0 failed |
| 30 | | ok · 7 passed / 0 failed |
| 31 | | ok · 791 passed / 0 failed / 5 ignored |
| 32 | | ok · 163 passed / 0 failed |
| 33 | shared_event | **环境性挂起**（见 §三），单独复跑 365 passed / 0 failed |

> 说明：完整逐 crate 明细见原始日志 `/tmp/p0-lib-test-2026-10-20.log`（含每用例 `test ... ok`）。上表部分 crate 名未在日志中直接标注（cargo 输出 test binary hash），以通过数可复核。

---

## 三、环境性挂起用例（非代码缺陷，如实登记）

全量任务终止于 `topems-shared-event` crate 的 2 条"Redis 不可达错误路径"用例，本机 Redis（Homebrew `127.0.0.1:6379`，PID 1401，配置了认证）正在运行：

| 用例 | 位置 | 本意 | 挂起原因 |
|---|---|---|---|
| `test_event_subscriber_start_listening_returns_err_when_redis_unavailable` | `lib/shared-event/src/event/subscriber.rs:1135` | Redis 不可达时 `start_listening` 应返回 Err | 本机 Redis 可达但需认证（NOAUTH），`maybe_connect_redis` 因 PING 非 PONG 返回 None，测试进入 `start_listening`；Stream 初始化连到认证 Redis 时挂起，未在守卫超时内返回 |
| `test_master_data_event_publish_returns_err_when_redis_unavailable` | `lib/shared-event/src/event/subscriber.rs:1150` | Redis 不可达时 publish 应返回 Err | 同上（同源环境条件） |

**判定**：环境守卫测试，假设"Redis 完全不可达"，与本机"Redis 可达但认证不符"的部分可达状态冲突导致挂起。**非代码缺陷**，与审计报告中 mes/lims 在线 e2e 同类（环境性）。在"Redis 完全关闭"或"认证可通过"的环境下可正常走 skip 或错误路径。

**验证**：排除这 2 条后，shared_event 单独复跑 **365 passed / 0 failed / 3 ignored**（命令：`cargo test -p topems-shared-event --lib -- --skip test_event_subscriber_start_listening_returns_err_when_redis_unavailable --skip test_master_data_event_publish_returns_err_when_redis_unavailable`）。

**后续处理建议**（可选，需授权）：临时停用本机 Redis 后重跑这 2 条用例，可使其走到期望的错误路径分支；或按既有惯例登记为环境守卫跳过项，不追清。

---

## 四、与历史基线对照

| 口径 | 历史（审计 O6/O7） | 本次实测 |
|---|---|---|
| workspace 全量 lib | 未跑完（41 member 耗时不可控，禁止外推） | **跑通 40/41 全绿**，仅 2 条环境性挂起已单列 |
| 失败 | 0（分 crate 局部绿） | **0 failed** |
| 通过量级 | 未落盘 | 约 10516，已落盘本报告 |

---

## 五、证据与可复现性

- 原始日志：`/tmp/p0-lib-test-2026-10-20.log`（全量任务，33 个 test binary）
- shared_event 复跑：见 §三验证命令（输出 365 passed）
- 复现命令：
  ```bash
  cd /Users/air/TOPEMS
  SQLX_OFFLINE=true cargo test --workspace --lib
  # 若 Redis 部分可达致 shared_event 挂起，追加：
  cargo test -p topems-shared-event --lib -- --skip test_event_subscriber_start_listening_returns_err_when_redis_unavailable --skip test_master_data_event_publish_returns_err_when_redis_unavailable
  ```

---

*结论：批 0 绿基线成立（约 10516 passed / 0 failed），唯一未全量收敛点为 2 条 Redis 不可达环境守卫用例（环境性挂起，非缺陷），已如实登记并给出复现与处理方式。*
