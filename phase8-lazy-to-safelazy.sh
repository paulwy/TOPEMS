#!/usr/bin/env bash
# Phase 8: lazy() -> safeLazy() 批量替换脚本
# 将 routes 文件中 lazy(() => import(...)) 替换为 safeLazy(() => import(...))
set -euo pipefail

PROJECT_ROOT="/Users/air/TOPEMS"
WORKSPACE="/Users/air/Library/Application Support/TRAE SOLO CN/ModularData/ai-agent/work-mode-projects/6a41387eee51bc8dbe85cf5e"

python3 "${WORKSPACE}/phase8-lazy-to-safelazy.py" "$PROJECT_ROOT"
