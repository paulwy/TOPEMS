# syntax=docker/dockerfile:1
# =============================================================
# TOPEMS Web 前端生产镜像（topems-web）
#
# 构建上下文：仓库根（.github/workflows/docker-build.yml 已配置 context: .）
#   - apps/web 通过 pnpm workspace 依赖 packages/* 的 workspace 包，
#     构建必须能看到整个 monorepo 的 packages/ 与 pnpm-lock.yaml
#
# 与旧 Dockerfile 的差异：
#   - node:20-alpine → node:22-alpine（与 engines "node": "^22.0.0" 对齐）
#   - npm ci（依赖不存在的 package-lock.json）→ pnpm install --frozen-lockfile
#   - 预构建消费 dist 的 workspace 包（shared-types / tokens）
#   - 手动执行构建必需的 ESM 补丁（容器内无 .git，跳过根的 prepare/lefthook）
#   - 注意：不能用 `COPY packages/*/package.json packages/`——Docker 会将其
#     平铺同名覆盖到 packages/ 根，导致子包缺失 package.json、pnpm 无法识别
#     workspace 项目，因此逐个目录复制清单文件以保留层缓存
# =============================================================

FROM node:22-alpine AS builder

# pnpm 版本与根 package.json 的 packageManager 字段一致；
# auto-install-peers=false 与 pnpm-lock.yaml 记录的 settings 保持一致（frozen install 要求）
RUN npm install -g pnpm@9.15.9 \
    && printf 'auto-install-peers=false\n' > /root/.npmrc

WORKDIR /app

# ---- ① 依赖清单层（利用 Docker 层缓存：仅清单变化时重装依赖）----
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml ./
COPY patches/ patches/
COPY apps/web/package.json apps/web/package.json
COPY packages/api-client/package.json packages/api-client/package.json
COPY packages/app-shell/package.json packages/app-shell/package.json
COPY packages/business-tools-sdk/package.json packages/business-tools-sdk/package.json
COPY packages/shared-components/package.json packages/shared-components/package.json
COPY packages/shared-hooks/package.json packages/shared-hooks/package.json
COPY packages/shared-types/package.json packages/shared-types/package.json
COPY packages/shared-utils/package.json packages/shared-utils/package.json
COPY packages/tokens/package.json packages/tokens/package.json

# ---- ② 安装依赖 ----
# --frozen-lockfile：严格按 lockfile 安装，保证 CI 可复现
# --ignore-scripts：跳过 workspace lifecycle scripts（根的 prepare 会执行
#   lefthook install，容器内无 .git 会失败）；构建必需的补丁脚本在第 ④ 步手动执行
RUN pnpm install --frozen-lockfile --ignore-scripts

# ---- ③ 复制源码（.dockerignore 已排除 node_modules/target/dist/.git 等）----
COPY . .

# ---- ④ 应用构建必需的 ESM 补丁（本地由 prepare/postinstall 自动执行）----
# patch-react-transition-group.js：修复 react-transition-group/dom-helpers 的 ESM 相对导入
# apps/web postinstall：修复 @mui/material internal/Transition.mjs 导入 + rtk context 目录
RUN node scripts/patch-react-transition-group.js \
    && cd apps/web && node scripts/postinstall.js && cd ..

# ---- ⑤ 预构建消费 dist 的 workspace 包 ----
# shared-types（tsup 输出 cjs/esm + dts）、tokens（tsc + 生成 tokens.css）
# 其余包（shared-utils/shared-hooks/shared-components/app-shell）直接消费 src，无需预构建
RUN pnpm --filter @topems/shared-types build \
    && pnpm --filter @topems/tokens build

# ---- ⑥ 构建前端（tsc 类型检查 + vite build）----
RUN cd apps/web && pnpm build

# =============================================================
# 运行阶段：nginx 静态托管 + SPA 路由
# =============================================================
FROM nginx:alpine

COPY --from=builder /app/apps/web/dist /usr/share/nginx/html
COPY apps/web/nginx.conf /etc/nginx/nginx.conf

EXPOSE 3000

# nginx.conf 未配置独立 /health 路由；SPA 入口 index.html 返回 200 即视为存活
HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
  CMD wget -q -O /dev/null http://127.0.0.1:3000/ || exit 1

CMD ["nginx", "-g", "daemon off;"]
