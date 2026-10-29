# Mobile 前端调用拓扑盘点（2026-10-29）

> 背景：TODO 遗留「mobile 内部服务调用」——核实 mobile 前端是直连后端还是走 BFF。

## 结论：全量走 BFF（8099 反代），无直连残留 ✅

| 检查项 | 证据 | 状态 |
|---|---|---|
| baseURL 权威 | `apps/mobile/src/utils/api-url.ts`：默认 `http://localhost:8099` + `getMobileApiUrl()`=`{base}/api/mobile`；EXPO_PUBLIC_API_URL 可覆盖 | 唯一入口 |
| URL 分布 | `apps/mobile/src/api/*.ts` 18 文件全部相对路径（/push、/task、/schedule、/dashboard、/attendance、/inventory 等），无绝对 URL | 无直连 |
| 硬编码端口 | api/*.ts 中 8000/8070/8080 等端口零命中 | 无直连 |
| nginx | `deploy/nginx/*.conf` 90 行注释「/api/* 不再按前缀分发，统一由 location /api/ 直代 server_service(:8099)」；139 行 `location /api/` → proxy_pass server_service | 入口收敛 |
| 历史规则 | 154-181 行存在旧 `~ ^/api/(erp|...|mobile|...)/v1/(.*)$` 正则块（nginx 正则优先于前缀匹配）——mobile 前端路径无 v1 段，实际走 139 前缀规则；正则块为历史遗留，**可选清理**（低优先级，不影响路由正确性） | 登记可选清理 |

## 盘点口径

- mobile 前端 = apps/mobile/src/api/*（18 文件）；BFF = topems-server:8099（模块化单体，内嵌 /api/mobile 适配器）
- 与 web（apps/web apiClient）/ desktop 同口径：三端 baseURL 均指向 8099（ports.ts 权威 core=8000/单体=8099）

## 遗留登记

- nginx v1 正则块（154-181）为旧前缀直连时代的残留，未影响现状（mobile/web 均无 v1 路径调用），并入 deploy 清理候选，无行为风险
