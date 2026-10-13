# =============================================================
# TOPEMS Makefile —— 常用开发与 CI 辅助命令
# =============================================================
# 目标按类别分组：
#   make sqlx-*        —— SQLx 离线缓存治理（本地 + GitHub）
#   make check-*       —— 编译/离线/在线质量门禁
#   make help          —— 查看全部目标
# =============================================================

SHELL := /bin/bash

.PHONY: help sqlx-prepare sqlx-prepare-pkg sqlx-prepare-mes sqlx-check sqlx-offline-test \
        check-online check-offline check-migrations \
        clean clean-debug clean-debug-full clean-sccache clean-rust clean-frontend

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

sqlx-prepare-mes: ## 刷新 mes 缓存（search_path=mes,public 在线解析 → 合并根 .sqlx；迁移后必跑）
	scripts/mes_guard.sh --prepare

sqlx-check: ## 仅校验缓存与源码是否一致（不修改，用于 CI / pre-push）
	./scripts/dev/sqlx-prepare.sh --check

sqlx-offline-test: ## 刷新后立即执行一组核心 package 的离线编译测试
	./scripts/dev/sqlx-prepare.sh --offline-test

# ---------- 质量门禁（本地对齐 CI）----------
check-online: ## 在线 cargo check（需要 DATABASE_URL，可捕获 sqlx 宏类型错误）
	cargo check --workspace

check-offline: ## 离线 cargo check（SQLX_OFFLINE=true，模拟 CI GitHub Actions 环境）
	DATABASE_URL= SQLX_OFFLINE=true cargo check --workspace

check-migrations: ## 检查 database/migrations/ 命名规范、序号连续性、禁止修改历史迁移
	node scripts/check-migrations.mjs

gate-runtime-contract: ## 运行时查询风格 crate 的在线 SQL 契约门禁（qms/pdm/lims/ehs/pm/ticket）
	@echo "==> 对 live DB PREPARE 校验运行时 SQL（缺列/缺表/别名错/类型强制错会被阻断）"
	python3 scripts/dev/check-runtime-sql-contract.py

gate-runtime-contract-ci: ## 同左，但对 schema 快照 DB（CI 用，需传入 DB_URL）
	@[ -n "$(DB_URL)" ] || (echo "用法: make gate-runtime-contract-ci DB_URL=<dsn>"; exit 2)
	python3 scripts/dev/check-runtime-sql-contract.py --db-url "$(DB_URL)"

# ---------- 常用快捷命令 ----------
check-iam: ## 仅离线 check topems-unified-core（IAM 端口 8000）
	DATABASE_URL= SQLX_OFFLINE=true cargo check -p topems-unified-core

check-finance: ## 仅离线 check topems-finance（端口 8011）
	DATABASE_URL= SQLX_OFFLINE=true cargo check -p topems-finance

# ---------- 磁盘空间 / 构建清理 ----------
clean: ## 全量清理（推荐，等效 topems clean）
	./scripts/topems.sh clean

clean-debug: ## 只清 Rust 增量缓存 + 嵌套 target 残留（保留 debug/release 产物，日常推荐）
	./scripts/topems.sh clean --debug

clean-debug-full: ## 清 debug 增量+依赖+构建脚本产物（保留 release，依赖需重编）
	./scripts/topems.sh clean --debug-full

clean-sccache: ## 清空 sccache 编译缓存（下次构建冷启动）
	./scripts/topems.sh clean --sccache

clean-rust: ## 全量清理 Rust 编译产物 + kill 后台 cargo 进程（等效 topems clean --rust）
	./scripts/topems.sh clean --rust

clean-frontend: ## 仅清理前端 dist / .vite / coverage 产物
	./scripts/topems.sh clean --frontend
