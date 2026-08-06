# =============================================================
# TOPEMS Makefile —— 常用开发与 CI 辅助命令
# =============================================================
# 目标按类别分组：
#   make sqlx-*        —— SQLx 离线缓存治理（本地 + GitHub）
#   make check-*       —— 编译/离线/在线质量门禁
#   make help          —— 查看全部目标
# =============================================================

SHELL := /bin/bash

.PHONY: help sqlx-prepare sqlx-prepare-pkg sqlx-check sqlx-offline-test \
        check-online check-offline

# 默认目标
help: ## 显示本帮助
	@awk 'BEGIN {FS = ":.*##"; printf "\nTOPEMS 常用命令：\n\n"} \
		/^[a-zA-Z0-9_-]+:.*##/ { printf "  \033[36m%-24s\033[0m %s\n", $$1, $$2 } \
		/^##@/ { printf "\n\033[1m%s\033[0m\n", substr($$0, 5) }' $(MAKEFILE_LIST)

# ---------- SQLx 离线缓存治理 ----------
sqlx-prepare: ## 刷新全 workspace 的 SQLx 离线缓存（需要本地 DB 在线）
	./scripts/dev/sqlx-prepare.sh

sqlx-prepare-pkg: ## 刷新单个 package 的缓存：make sqlx-prepare-pkg P=topems-unified-core
	@[ -n "$(P)" ] || (echo "用法: make sqlx-prepare-pkg P=<package-name>"; exit 2)
	./scripts/dev/sqlx-prepare.sh -p $(P)

sqlx-check: ## 仅校验缓存与源码是否一致（不修改，用于 CI / pre-push）
	./scripts/dev/sqlx-prepare.sh --check

sqlx-offline-test: ## 刷新后立即执行一组核心 package 的离线编译测试
	./scripts/dev/sqlx-prepare.sh --offline-test

# ---------- 质量门禁（本地对齐 CI）----------
check-online: ## 在线 cargo check（需要 DATABASE_URL，可捕获 sqlx 宏类型错误）
	cargo check --workspace

check-offline: ## 离线 cargo check（SQLX_OFFLINE=true，模拟 CI GitHub Actions 环境）
	DATABASE_URL= SQLX_OFFLINE=true cargo check --workspace

# ---------- 常用快捷命令 ----------
check-iam: ## 仅离线 check topems-unified-core（IAM 端口 8000）
	DATABASE_URL= SQLX_OFFLINE=true cargo check -p topems-unified-core

check-finance: ## 仅离线 check topems-finance（端口 8011）
	DATABASE_URL= SQLX_OFFLINE=true cargo check -p topems-finance
