# Web 契约冒烟豁免清单（KNOWN FAIL）

> 机制：`scripts/web_contract_smoke.py::load_expected_fails` 读取本清单，
> 命中 (method, path) 的 FAIL 记为 KNOWN（不阻断门禁），其余 FAIL 阻断。
>
> **当前状态：已清零（第 55 轮，2026-10-28）**。S25 批量语义治理（第 53→55 轮）
> 全链闭环：unified-core/hrm/communication 去 Json + schema 错列修复 +
> flow 表显式 public schema 前缀 + mobile 下游 4xx 信封透传，
> 冒烟 `4105/4105 PASS, 0 FAIL, 豁免 0`。
> 后续新增 FAIL 将按实际缺口重新登记。

## KNOWN

（空）
