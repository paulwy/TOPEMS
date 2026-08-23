#!/usr/bin/env node
// V285 C 轨 Gate：已合并为 check-i18n.cjs 单一脚本
// 本文件为 thin wrapper，等价于 `node check-i18n.cjs --mode=quality`
// 保留此文件仅为向后兼容（CI/老脚本可能引用此路径）
//
// 注意：必须用 __dirname 拼接绝对路径，避免从项目根（或其他 cwd）运行
// 时 `require('./check-i18n.cjs')` 解析为 $CWD/check-i18n.cjs（不存在）
// 导致 MODULE_NOT_FOUND。
const path = require('path');
process.argv.push('--mode=quality');
require(path.join(__dirname, 'check-i18n.cjs'));
