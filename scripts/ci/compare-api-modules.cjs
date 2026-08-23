#!/usr/bin/env node
// Thin wrapper: 向后兼容旧 CI 调用路径（compare-api-modules.cjs → check-api.cjs --mode=compare）
// 为什么必须用 __dirname 绝对 require？因为 CI 可能从任意 cwd（如 repo 根 / apps/web）
// 调用此脚本；若使用相对 require('./check-api.cjs')，则 require 会基于 process.cwd()
// 解析，导致 MODULE_NOT_FOUND。复刻 V285 i18n wrapper 的修复模式，用 path.join(__dirname, ...)
// 保证无论 CWD 如何变化，都能准确定位到同目录下的 check-api.cjs。
const path = require('path');
process.argv.push('--mode=compare');
require(path.join(__dirname, 'check-api.cjs'));
