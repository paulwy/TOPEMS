#!/usr/bin/env node
/* eslint-disable */
// topems-migrate CLI 入口脚本
// 开发模式: 当 src/index.ts 存在时使用 ts-node 运行
// 发布模式: 使用编译后的 dist/index.js

const { existsSync } = require('fs');
const { resolve, join } = require('path');
const { spawn } = require('child_process');

const pkgRoot = resolve(__dirname, '..');
const srcEntry = join(pkgRoot, 'src', 'index.ts');
const distEntry = join(pkgRoot, 'dist', 'index.js');

function runNode(entry, args) {
  const child = spawn('node', [entry, ...args], {
    stdio: 'inherit',
    env: process.env,
  });
  child.on('exit', (code) => {
    process.exit(code == null ? 1 : code);
  });
  child.on('error', (err) => {
    console.error('❌ 启动失败:', err.message);
    process.exit(1);
  });
}

function runTsNode(entry, args) {
  const child = spawn(
    process.platform === 'win32' ? 'npx.cmd' : 'npx',
    ['ts-node', entry, ...args],
    {
      stdio: 'inherit',
      env: process.env,
      cwd: pkgRoot,
    },
  );
  child.on('exit', (code) => {
    process.exit(code == null ? 1 : code);
  });
  child.on('error', (err) => {
    console.error('❌ ts-node 启动失败:', err.message);
    process.exit(1);
  });
}

const args = process.argv.slice(2);

if (existsSync(srcEntry)) {
  // 开发模式: 优先使用 ts-node 运行源码
  runTsNode(srcEntry, args);
} else if (existsSync(distEntry)) {
  // 发布模式: 运行编译后的 JS
  runNode(distEntry, args);
} else {
  console.error('❌ 找不到可执行的入口文件:');
  console.error('   - ' + srcEntry);
  console.error('   - ' + distEntry);
  console.error('   请先执行 npm run build 或安装 ts-node 依赖');
  process.exit(1);
}
