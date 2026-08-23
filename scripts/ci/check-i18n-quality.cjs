#!/usr/bin/env node
// V285 C 轨 Gate：已合并为 check-i18n.cjs 单一脚本
// 本文件为 thin wrapper，等价于 `node check-i18n.cjs --mode=quality`
// 保留此文件仅为向后兼容（CI/老脚本可能引用此路径）
process.argv.push('--mode=quality');
require('./check-i18n.cjs');
