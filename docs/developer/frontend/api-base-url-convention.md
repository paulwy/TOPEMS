# 三端 API Base URL 环境变量统一约定（FE-21）

> 状态：已落地（2026-10-07）。本文档为三端「API 基础地址」环境变量的**单一事实约定**。
> 背景：web / mobile / desktop 三端历史上各用一套 env 键名与默认端口，导致新人对接后端时
> 不知道该配哪个键、默认该指向哪里。本文档消除歧义。

## 1. 为什么不能用同一个字面键名

三端由不同打包器构建，打包器对外暴露的 env 前缀是**框架硬约束**，无法简单统一成一个
`API_BASE_URL`：

| 端 | 打包器 | 暴露规则 | 规范键名 |
|---|---|---|---|
| web (`apps/web`) | Vite | 仅暴露 `VITE_` 前缀 | `VITE_API_BASE_URL` |
| desktop (`apps/desktop`) | Vite（Tauri webview） | 仅暴露 `VITE_` 前缀 | `VITE_API_URL` |
| mobile (`apps/mobile`) | Expo / Metro | 仅暴露 `EXPO_PUBLIC_` 前缀 | `EXPO_PUBLIC_API_URL` |

因此「统一」= **统一语义 + 统一默认后端 + 统一映射表**，而不是改键名本身
（改键名需要动 vite `envPrefix` / Expo 配置，属构建层高风险改动，本期不做）。

## 2. 统一映射表（权威）

| 端 | 规范 env 键 | 取值语义 | 开发默认（不配时） | 指向 |
|---|---|---|---|---|
| web | `VITE_API_BASE_URL` | API 根路径（同源相对） | `/api` | vite dev proxy 转发到 `BACKEND_PORTS.core`（独立 8000）或单体 8099 |
| mobile | `EXPO_PUBLIC_API_URL` | 后端**来源**（协议+主机+端口，不含 path） | `http://localhost:8000`（端内再拼 `/api/mobile`） | unified-core 独立进程 8000 |
| desktop | `VITE_API_URL` | 后端**来源**（协议+主机+端口） | `http://localhost:8000` | unified-core 独立进程 8000 |

补充约定：

- **端口唯一信源**：`apps/web/src/config/ports.ts` 的 `BACKEND_PORTS`（其源头 `config/ports.env`）。
  后端权威端口：core/unified-core=**8000**，模块化单体 topems-server=**8099**，plugin-registry=**8096**。
  任何前端默认端口都不得发明表外端口。
- **web 为什么用相对路径**：浏览器同源 + vite dev proxy，避免跨域；生产由反代把 `/api/*` 路由到后端。
  仅当 web 绕过 proxy 直连后端时，才把 `VITE_API_BASE_URL` 设成绝对地址（如 `http://localhost:8000/api`）。
- **mobile 为什么必须绝对地址**：RN/Expo 运行时没有「同源」概念，必须给完整 origin；
  `src/utils/api-url.ts` 会从该 URL 抽取 host:port 后再拼 `/api/mobile`，并对 Android 模拟器把
  `localhost` 改写成 `10.0.2.2`。
- **desktop 为什么必须绝对地址**：Tauri webview 加载的是本地资源，fetch 需指向后端 origin。
- **每服务覆盖键**：web 另支持 `VITE_<SERVICE>_SERVICE_URL`（如
  `VITE_PLUGIN_REGISTRY_SERVICE_URL`，默认 `/api/plugin`），见 `apps/web/src/config/runtime.ts`。

## 3. 两种后端部署形态下的取值

| 形态 | web | mobile (`EXPO_PUBLIC_API_URL`) | desktop (`VITE_API_URL`) |
|---|---|---|---|
| 独立进程（unified-core:8000） | 默认 `/api`（proxy→8000） | `http://localhost:8000` | `http://localhost:8000` |
| 模块化单体（topems-server:8099） | `VITE_MONOLITH=1`（proxy→8099） | `http://localhost:8099` | `http://localhost:8099` |

## 4. 本次落地改动

- `apps/mobile/src/utils/api-url.ts`：不配 env 时的 fallback 由 `http://localhost:8070`
  改为 `http://localhost:8000`（8070 不在端口表，与同仓 `test-backend.ts` 的 8000 不一致）。
- `apps/desktop/src/api/client.ts`：fallback 由 `http://localhost:8080` 改为
  `http://localhost:8000`（8080 不在端口表）。
- `apps/web/.env.example`：更正注释示例（原 `http://localhost:8080/api` 为表外端口），
  说明 web 相对路径默认值与直连取值，并指向本文档。

## 5. 未来若要真正统一键名（登记，本期不做）

需要改构建层暴露前缀，风险较高，登记为后续选项：
- Vite：在 `vite.config.ts` 用 `envPrefix` 追加统一前缀（如同时允许 `VITE_` 与 `API_`）。
- Expo：env 前缀由 Metro/babel 固定为 `EXPO_PUBLIC_`，无法改名，只能在端内加一层
  `API_BASE_URL → EXPO_PUBLIC_API_URL` 的别名映射。
- 结论：**不值得为统一字面键名动构建配置**；保持上表映射文档化即可。
