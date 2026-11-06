import path from 'node:path';
import { fileURLToPath } from 'node:url';

/**
 * E2E 环境口径（唯一真相源）。
 *
 * 本地实际部署：前端 dev server 8063 + 单体后端 8099。
 * 8099 仍受 playwright.config.ts 的生产端口守护约束，指向它时需显式
 * E2E_ALLOW_PROD=1（见 package.json 的 test:local 脚本）。
 *
 * 注意：默认值保持 HEAD(9be9b1619) 的 8080 开发实例口径，不覆盖该提交的意图；
 * 需要跑本地单体时用 API_BASE_URL=http://localhost:8099 显式解开。
 */
export const BASE_URL = process.env.BASE_URL ?? 'http://localhost:8063';
export const API_BASE_URL = process.env.API_BASE_URL ?? 'http://localhost:8080';

export const E2E_USERNAME = process.env.E2E_USERNAME ?? 'admin';
export const E2E_PASSWORD = process.env.E2E_PASSWORD ?? 'admin123';

/**
 * E2E 包根目录（tests/e2e）的绝对路径。
 * 不依赖 cwd，也不依赖 Playwright 的 rootDir（rootDir 是 testDir=tests/，
 * 曾导致 global-setup 写到 tests/e2e/tests/.auth、config 读 tests/e2e/.auth 的 ENOENT）。
 */
export const E2E_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

/** 自动登录产物目录（被 .gitignore 忽略，token 过期后可自愈重建） */
export const AUTH_DIR = path.join(E2E_ROOT, '.auth');
export const STORAGE_STATE_FILE = path.join(AUTH_DIR, 'storage-state.json');
export const SESSION_SEED_FILE = path.join(AUTH_DIR, 'session.json');
