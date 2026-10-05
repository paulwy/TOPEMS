# Web 前端契约收口清单（vs server 根层 BFF :8099）

> 核对方法：`scripts/web_contract_smoke.py` 静态提取 `apps/web/src/api/*` 契约端点（4152 去重），自签 HS256 JWT 逐端点实跑探测 BFF(:8099)，FAIL 重试一次滤瞬态。
> 最终全量结果：**PASS 4113 / FAIL 39 / WARN 0**（退出码非 0 = 有 FAIL）。

## FAIL 按服务分组

### core（39 FAIL）— 修复 commit: 115a5a45b, c2de0d623, 076b92692

- `POST /api/core/api/ai/dsh/copilot/sessions` — http=404 body_code=404 (route_missing)
- `GET /api/core/api/ai/dsh/copilot/sessions/00000000-0000-0000-0000-000000000099` — http=404 body_code=404 (route_missing)
- `DELETE /api/core/api/ai/dsh/copilot/sessions/00000000-0000-0000-0000-000000000099` — http=404 body_code=404 (route_missing)
- `POST /api/core/api/ai/dsh/copilot/sessions/00000000-0000-0000-0000-000000000099/messages` — http=404 body_code=404 (route_missing)
- `POST /api/core/api/ai/dsh/copilot/intent/recognize` — http=404 body_code=404 (route_missing)
- `GET /api/core/api/ai/dsh/copilot/modules/00000000-0000-0000-0000-000000000099` — http=404 body_code=404 (route_missing)
- `GET /api/core/api/ai/dsh/copilot/modules` — http=404 body_code=404 (route_missing)
- `GET /api/core/api/ai/dsh/copilot/modules/00000000-0000-0000-0000-000000000099/faq` — http=404 body_code=404 (route_missing)
- `GET /api/core/api/ai/dsh/copilot/sessions/00000000-0000-0000-0000-000000000099/messages` — http=404 body_code=404 (route_missing)
- `PUT /api/core/api/ai/dsh/copilot/sessions/00000000-0000-0000-0000-000000000099/records` — http=404 body_code=404 (route_missing)
- `PUT /api/core/api/ai/dsh/copilot/sessions/00000000-0000-0000-0000-000000000099/context` — http=404 body_code=404 (route_missing)
- `GET /api/core/api/ai/dsh/smart-forms/templates/00000000-0000-0000-0000-000000000099` — http=404 body_code=404 (route_missing)
- `GET /api/core/api/ai/dsh/smart-forms/templates` — http=404 body_code=404 (route_missing)
- `POST /api/core/api/ai/dsh/smart-forms/validate` — http=404 body_code=404 (route_missing)
- `POST /api/core/api/ai/dsh/smart-forms/ai-fill` — http=404 body_code=404 (route_missing)
- `GET /api/core/api/ai/documents/00000000-0000-0000-0000-000000000099` — http=404 body_code=404 (route_missing)
- `POST /api/core/api/ai/documents/00000000-0000-0000-0000-000000000099/parse` — http=404 body_code=404 (route_missing)
- `POST /api/core/api/ai/documents/00000000-0000-0000-0000-000000000099/summary` — http=404 body_code=404 (route_missing)
- `GET /api/core/api/ai/documents/00000000-0000-0000-0000-000000000099/summary` — http=404 body_code=404 (route_missing)
- `GET /api/core/api/ai/documents/00000000-0000-0000-0000-000000000099/search` — http=404 body_code=404 (route_missing)
- `POST /api/core/api/ai/documents/generate` — http=404 body_code=404 (route_missing)
- `GET /api/core/api/ai/documents/00000000-0000-0000-0000-000000000099/download` — http=404 body_code=404 (route_missing)
- `DELETE /api/core/api/ai/documents/00000000-0000-0000-0000-000000000099` — http=404 body_code=404 (route_missing)
- `GET /api/core/api/ai/dsh/governance/dashboard` — http=404 body_code=404 (route_missing)
- `GET /api/core/api/ai/dsh/governance/score` — http=404 body_code=404 (route_missing)
- `GET /api/core/api/ai/dsh/governance/risk` — http=404 body_code=404 (route_missing)
- `GET /api/core/api/ai/dsh/governance/compliance` — http=404 body_code=404 (route_missing)
- `GET /api/core/api/ai/dsh/governance/cost` — http=404 body_code=404 (route_missing)
- `GET /api/core/api/ai/dsh/governance/performance` — http=404 body_code=404 (route_missing)
- `GET /api/core/api/ai/dsh/governance/metrics` — http=404 body_code=404 (route_missing)
- `GET /api/core/api/ai/dsh/governance/security-events` — http=404 body_code=404 (route_missing)
- `GET /api/core/api/ai/dsh/governance/audit` — http=404 body_code=404 (route_missing)
- `GET /api/core/api/ai/dsh/governance/trends` — http=404 body_code=404 (route_missing)
- `GET /api/core/api/ai/dsh/governance/recommendations` — http=404 body_code=404 (route_missing)
- `POST /api/core/api/ai/dsh/governance/security-events` — http=404 body_code=404 (route_missing)
- `POST /api/core/api/ai/dsh/governance/refresh` — http=404 body_code=404 (route_missing)
- `GET /api/core/api/ai/dsh/governance/export` — http=404 body_code=404 (route_missing)
- `GET /api/core/system/audit-logs/export/00000000-0000-0000-0000-000000000099` — http=404 body_code=404 (route_missing)
- `GET /api/core/dict/dict-types/00000000-0000-0000-0000-000000000099/items/00000000-0000-0000-0000-000000000099` — http=404 body_code=404 (route_missing)

## 剩余 FAIL 分类说明

- **core 39 项（全部 `/api/core/api/ai/...`）＝前端双前缀构造错误，非后端缺口**：`apiClient.core` 的 base（`/api/core`）与业务客户端（businessCopilot/businessIntelligence/governanceDashboard 等）传参的绝对路径（`/api/ai/...`）拼接成 `/api/core/api/ai/...`；意图路径 `/api/ai/dsh/...` 等均已实探 200 返回真实数据。修在 `apps/web` 前端拼接，后端不改。
- 其余服务 FAIL 已全部清零（首轮 1363 → 二轮后 86 → 最终 39）。

## 全部提交 hash

```
b9add1a7b, c0235ed19, 115a5a45b, 00dbb7846, 35a0c809f, 2c6ed5bfd, 1fe4fc256, 818cd1acc, 7314e0053, 848dd5767, a856e7fdc, c54367184, 8f5119da4, 61eb863ba, 4a8407cdd, e99045ca9, 3f57adeb6, 542787c67, 58f68a092, 750036e1c, b6d6eb604, eaeee5edf, 0720f0e3e, 5d7f91fcd, 7e45ad33b, 3a5e0bc8e, fb49aff8d, d381ad452, d202e6f33, 3b0e83bf8, b56326ba2, ef06e95ce, 6b51c8a67, b7e0c22fe, ecdbcba42, c2de0d623, 77b8947f6, 8b73806e2, 387b9310d, 15f5ecde8, 076b92692, b4fec1561, f856075da, 48e47c4ef, 974fef9c6, e38242a4a, 12e19d01, 0044c1f8, a0e0e7396, 545bb2d9d, ecdd403cd, 98f11000, 8de538cd1, 3646298b0, 33a165fde, ba91d53df, 06293bac5
```

## 复跑方法

```bash
cd /Users/air/TOPEMS && python3 scripts/web_contract_smoke.py            # 全量
python3 scripts/web_contract_smoke.py --svc workflow --json out.json   # 单服务
```

> 冒烟脚本自动从 .env 读 JWT_SECRET 现签 token；FAIL 判据：http 404（route_missing）、http>=500 或 body.code==500（handler_error）；业务 4xx 记 WARN 不阻塞。
