#!/usr/bin/env python3
"""One-shot i18n fix for MicroFrontendDevTools.tsx — atomic batch replacement."""
import sys

filepath = '/Users/air/TOPEMS/apps/web/src/dev-tools/MicroFrontendDevTools.tsx'
with open(filepath, 'r', encoding='utf-8') as f:
    content = f.read()

INDENT = ' ' * 16

replacements = [
    # Labels (27) — first Typography content in each button
    (INDENT + '注册中心', INDENT + "{t('devtools.panels.registry.label')}"),
    (INDENT + '版本平台', INDENT + "{t('devtools.panels.version.label')}"),
    (INDENT + '仪表盘', INDENT + "{t('devtools.panels.dashboard.label')}"),
    (INDENT + 'AI 运维', INDENT + "{t('devtools.panels.aiops.label')}"),
    (INDENT + '模块市场', INDENT + "{t('devtools.panels.marketplace.label')}"),
    (INDENT + '依赖治理', INDENT + "{t('devtools.panels.governance.label')}"),
    (INDENT + '安全中心', INDENT + "{t('devtools.panels.security.label')}"),
    (INDENT + '运行时', INDENT + "{t('devtools.panels.runtime.label')}"),
    (INDENT + 'V47-V50', INDENT + "{t('devtools.panels.v47Integration.label')}"),
    (INDENT + 'V51', INDENT + "{t('devtools.panels.v51Design.label')}"),
    (INDENT + 'DevEx', INDENT + "{t('devtools.panels.v51DevEx.label')}"),
    (INDENT + 'V53 AI', INDENT + "{t('devtools.panels.v53Ai.label')}"),
    (INDENT + 'V53 平台', INDENT + "{t('devtools.panels.v53Platform.label')}"),
    (INDENT + 'V54 AI', INDENT + "{t('devtools.panels.v54Native.label')}"),
    (INDENT + 'V54 Agent', INDENT + "{t('devtools.panels.v54Agent.label')}"),
    (INDENT + 'V55 Copilot', INDENT + "{t('devtools.panels.v55Copilot.label')}"),
    (INDENT + 'V55 Auto', INDENT + "{t('devtools.panels.v55Automation.label')}"),
    (INDENT + 'V56 Ops', INDENT + "{t('devtools.panels.v56Ops.label')}"),
    (INDENT + 'V56 Review', INDENT + "{t('devtools.panels.v56Review.label')}"),
    (INDENT + 'V57 AI', INDENT + "{t('devtools.panels.v57Governance.label')}"),
    (INDENT + 'V57 Auto', INDENT + "{t('devtools.panels.v57Automation.label')}"),
    (INDENT + 'V58 UX', INDENT + "{t('devtools.panels.v58Ux.label')}"),
    (INDENT + 'V58 AI', INDENT + "{t('devtools.panels.v58Evolution.label')}"),
    (INDENT + 'V59 DevEx', INDENT + "{t('devtools.panels.v59DevEx.label')}"),
    (INDENT + 'V59 安全', INDENT + "{t('devtools.panels.v59Security.label')}"),
    (INDENT + 'V60 伦理', INDENT + "{t('devtools.panels.v60Ethics.label')}"),
    (INDENT + 'V60 质量', INDENT + "{t('devtools.panels.v60Quality.label')}"),
    # Sublabel (1 missing — v47Integration)
    (INDENT + '平台+Serverless', INDENT + "{t('devtools.panels.v47Integration.sublabel')}"),
    # Modal headers (3)
    (INDENT + '模块注册中心', INDENT + "{t('devtools.panels.registry.title')}"),
    (INDENT + '版本管理平台', INDENT + "{t('devtools.panels.version.title')}"),
    (INDENT + '可观测性仪表盘', INDENT + "{t('devtools.panels.dashboard.title')}"),
]

errors = []
applied = 0
for old, new in replacements:
    count = content.count(old)
    if count == 0:
        errors.append(f"NOT FOUND: '{old.strip()}'")
    elif count > 1:
        errors.append(f"AMBIGUOUS ({count}x):