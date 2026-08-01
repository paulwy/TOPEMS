# 前端测试覆盖路线图 V78.0

## Tier 1（必须，目标 60%+）
- utils/storage.ts Canonical Storage (10 场景：前缀/过期/has/keys/Local/Session/JSON 序列化)
- hooks/useCrudUnified.ts (4 场景：list/create/update/delete + loading 状态)
- hooks/useUnifiedWebSocket.ts (4 场景：connect/send/reconnect/heartbeat)

## Tier 2（中期，目标 40%+）
- components/common/StatusChip/PriorityBadge/UserAvatar (各 2 场景)
- api/* 调用层 axios interceptor：list 归一、total 归一、分页字段、401 跳登录

## Tier 3（长期，目标 20%+）
- pages/* 路由入口（通过 e2e playwright）

## 工具
- 单测：vitest + @testing-library/react (@todo V79+ 安装)
- E2E：tests/e2e/playwright.config.ts（已存在，补齐 20+ 业务 spec）
- 覆盖率：vitest coverage v8 + nyc reporter
