/// <reference types="vitest" />
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'path';
import fs from 'fs';
import type { Plugin } from 'vite';

const setupEnv = path.resolve(__dirname, './src/__tests__/setup-env-vitest.ts');
const setupCore = path.resolve(__dirname, './src/__tests__/setup-core.ts');
const setupMocks = path.resolve(__dirname, './src/__tests__/setup-mocks.ts');

/**
 * Fix react-transition-group sub-path directory imports from MUI 9.x internals.
 *
 * Problem: @mui/material/internal/Transition.mjs imports sub-paths like
 * `react-transition-group/TransitionGroupContext` (a directory import) but
 * `react-transition-group@4.x` has no `exports` map in package.json, and in
 * pnpm isolated node_modules the package lives inside
 * `@mui+material@9.1.1/node_modules/react-transition-group/` where Vite's
 * resolve.alias cannot reach (alias only rewrites imports from project-level
 * imports, not the importer's own private node_modules).
 *
 * Solution: intercept the resolve hook at the Vite plugin layer — this runs
 * BEFORE the node_modules resolution, so it catches ALL imports regardless
 * of which package in pnpm's virtual store is the importer.
 */
function fixReactTransitionGroup(): Plugin {
  const ROOT = path.resolve(__dirname, '../../node_modules/react-transition-group');
  const RTG_SUB_PATHS: Record<string, string> = {
    'react-transition-group/TransitionGroupContext': 'TransitionGroupContext.js',
    'react-transition-group/Transition': 'Transition.js',
    'react-transition-group/CSSTransition': 'CSSTransition.js',
    'react-transition-group/SwitchTransition': 'SwitchTransition.js',
    'react-transition-group/TransitionGroup': 'TransitionGroup.js',
  };

  return {
    name: 'fix-react-transition-group-subpaths',
    enforce: 'pre',
    resolveId(id: string, importer?: string) {
      // pnpm 的 @mui/x-date-pickers 内部也引用了 react-transition-group（路径在 mui 的虚拟存储下）。
      // 此时 importer 可能位于 pnpm/.pnpm/.../mui+x-date-pickers/... 下，而 resolve.alias
      // 无法按 importer 做子依赖修正，所以 resolveId 必须兜底：当 importer 位于 pnpm store、
      // 且直接 ROOT 路径不存在时，改用 pnpm 根下已安装的 react-transition-group 副本。
      const fallbackRoots = [
        ROOT,
        path.resolve(
          __dirname,
          '../../node_modules/.pnpm/react-transition-group@4.4.5_react-dom@19.2.8_react@19.2.8__react@19.2.8/node_modules/react-transition-group',
        ),
      ];
      for (const root of fallbackRoots) {
        if (RTG_SUB_PATHS[id]) {
          const p = path.resolve(root, `cjs/${RTG_SUB_PATHS[id]}`);
          if (fs.existsSync(p)) return p;
        }
        if (id === 'react-transition-group') {
          const p = path.resolve(root, 'cjs/index.js');
          if (fs.existsSync(p)) return p;
        }
      }
      return null;
    },
  };
}

function resolveRtgCjs(file: string) {
  return path.resolve(
    __dirname,
    '../../node_modules/react-transition-group/cjs/',
    file,
  );
}

/**
 * Auto-fix @opentelemetry/resources ESM bare `.js` imports.
 *
 * OTel resources 1.26.x and 1.30.x ship ESM with bare relative imports
 * like `import { execAsync } from './execAsync'` (missing `.js` extension).
 * Vite handles this in production builds but Vitest's ESM loader doesn't,
 * causing ERR_MODULE_NOT_FOUND at test transform time.
 *
 * Solution: at config load time, create symlinks from `execAsync` → `execAsync.js`
 * in every OTel resources machine-id directory under pnpm store.
 */
function fixOtelBareImports(): Plugin {
  return {
    name: 'fix-otel-bare-imports',
    configResolved() {
      const ROOT = path.resolve(__dirname, '../../');
      const pnpmRoot = path.join(ROOT, 'node_modules/.pnpm');
      if (!fs.existsSync(pnpmRoot)) return;

      const otelDirs = fs
        .readdirSync(pnpmRoot)
        .filter((d) => d.startsWith('@opentelemetry+resources@'));

      for (const pkgDir of otelDirs) {
        const midDir = path.join(
          pnpmRoot,
          pkgDir,
          'node_modules/@opentelemetry/resources/build/esm/detectors/platform/node/machine-id',
        );
        if (!fs.existsSync(midDir)) continue;
        for (const bare of ['execAsync']) {
          const jsFile = path.join(midDir, `${bare}.js`);
          const linkPath = path.join(midDir, bare);
          if (fs.existsSync(jsFile) && !fs.existsSync(linkPath)) {
            try {
              fs.symlinkSync(`${bare}.js`, linkPath);
            } catch {
              /* race on parallel runs */
            }
          }
        }
      }
    },
  };
}

export default defineConfig({
  plugins: [
    react(),
    fixReactTransitionGroup(),
    fixOtelBareImports(),
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@topems/shared-types': path.resolve(__dirname, '../../packages/shared-types/src'),
      '@topems/shared-utils': path.resolve(__dirname, '../../packages/shared-utils/src'),
      '@topems/shared-components': path.resolve(__dirname, '../../packages/shared-components/src'),
      '@topems/shared-hooks': path.resolve(__dirname, '../../packages/shared-hooks/src'),
      '@topems/tokens': path.resolve(__dirname, '../../packages/tokens/src'),
      'react-transition-group/TransitionGroupContext': resolveRtgCjs('TransitionGroupContext.js'),
      'react-transition-group/Transition': resolveRtgCjs('Transition.js'),
      'react-transition-group/CSSTransition': resolveRtgCjs('CSSTransition.js'),
      'react-transition-group/SwitchTransition': resolveRtgCjs('SwitchTransition.js'),
      'react-transition-group/TransitionGroup': resolveRtgCjs('TransitionGroup.js'),
      'react-transition-group': resolveRtgCjs('index.js'),
    },
    mainFields: ['module', 'main'],
    dedupe: ['react', 'react-dom', 'scheduler'],
    extensions: ['.mjs', '.js', '.ts', '.tsx', '.json'],
  },
  optimizeDeps: {
    include: [
      'react-transition-group',
      'react-transition-group/TransitionGroupContext',
      'react-transition-group/Transition',
      'react-transition-group/CSSTransition',
      'react-transition-group/SwitchTransition',
      'react-transition-group/TransitionGroup',
    ],
  },
  test: {
    globals: true,
    environment: 'jsdom',
    css: false,
    // ── 全局默认配置（projects 继承） ────────────────────────────
    // CI 已分 8 片并行运行 component 测试，本地无需强制串行。
    // maxWorkers/fileParallelism 留空使用 vitest 默认值（CPU 核数）。
    pool: 'forks',
    exclude: [
      '**/node_modules/**',
      '**/dist/**',
      '**/*.perf.test.*',
      // Playwright e2e tests in tests/ directory — not vitest-compatible
      'tests/admin-module.spec.ts',
      'tests/websocket.spec.ts',
    ],
    testTimeout: 15000,
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html', 'json-summary'],
      reportOnFailure: true,
      include: [
        'src/utils/**/*.{ts,tsx}',
        'src/lib/**/*.{ts,tsx}',
        'src/constants/**/*.{ts,tsx}',
        'src/config/**/*.{ts,tsx}',
        'src/schemas/**/*.{ts,tsx}',
        'src/services/**/*.{ts,tsx}',
        'src/common/**/*.{ts,tsx}',
        'src/api/response-normalize.ts',
      ],
      exclude: [
        'src/components/**/*.stories.tsx',
        'src/components/**/__tests__/**',
        'src/components/**/index.ts',
        'src/components/**/types.ts',
        'src/**/types.ts',
        'src/**/types/**',
        'src/components/gis/modules/Map3DModule/**',
        'src/**/*.d.ts',
        'src/main.tsx',
        'src/vite-env.d.ts',
        'src/config/ai-templates.ts',
        'src/**/__tests__/**',
        'src/**/tests/**',
        'src/utils/ai/**',
        'src/utils/bff/**',
        'src/utils/workflow/**',
        'src/utils/zerocode/**',
        'src/utils/a2ui/**',
        'src/utils/observability/**',
      ],
      thresholds: {
        statements: 1,
        branches: 1,
        functions: 1,
        lines: 1,
      },
    },
    resolveSnapshotPath: (testPath, snapshotExtension) => {
      return testPath.replace(/\.test\.([tj]sx?)$/, `${snapshotExtension}`);
    },

    // ── Vitest Projects：分层测试 ─────────────────────────────────
    // 1. unit：纯函数/工具类测试 → isolate:false + 仅加载 core polyfill
    //    无 vi.mock 调用，模块图可安全复用，内存占用极低
    // 2. component：组件/页面测试 → isolate:true + 加载 core + mocks
    //    大量 vi.mock 需要隔离；用 --shard 分片运行
    projects: [
      {
        extends: true,
        test: {
          name: 'unit',
          include: [
            'src/utils/__tests__/**/*.{test,spec}.{ts,tsx}',
            'src/lib/__tests__/**/*.{test,spec}.{ts,tsx}',
            'src/api/__tests__/**/*.{test,spec}.{ts,tsx}',
            'src/api/*/__tests__/**/*.{test,spec}.{ts,tsx}',
            'src/services/__tests__/**/*.{test,spec}.{ts,tsx}',
            'src/lib/plugin-loader/__tests__/**/*.{test,spec}.{ts,tsx}',
            'src/constants/__tests__/**/*.{test,spec}.{ts,tsx}',
            'src/config/__tests__/**/*.{test,spec}.{ts,tsx}',
            'src/schemas/__tests__/**/*.{test,spec}.{ts,tsx}',
            'src/schema/__tests__/**/*.{test,spec}.{ts,tsx}',
            'src/common/__tests__/**/*.{test,spec}.{ts,tsx}',
            'src/microfrontend/**/__tests__/**/*.{test,spec}.{ts,tsx}',
            'tests/**/*.{test,spec}.{ts,tsx}',
            'src/__tests__/unit/**/*.{test,spec}.{ts,tsx}',
          ],
          // isolate: true because some unit tests use vi.mock() (apiClient, security, etc.)
          // setup-core only loads polyfills; setup-mocks is NOT loaded so test-level
          // vi.mock calls have full control over their own module mocks.
          isolate: true,
          setupFiles: [setupEnv, setupCore],
          // MUI 内部 Transition.mjs 以目录导入形式引用 react-transition-group 子路径，
          // Vitest 默认 external 化 node_modules 会让 Node 原生 ESM 解析失败（ERR_UNSUPPORTED_DIR_IMPORT）。
          // 将 @mui 与 react-transition-group 交由 Vite 转换，配合 resolve.alias 修正子路径。
          server: {
            deps: {
              inline: [/@mui\//, /react-transition-group/],
            },
          },
        },
      },
      {
        extends: true,
        test: {
          name: 'component',
          include: [
            'src/components/**/__tests__/**/*.{test,spec}.{ts,tsx}',
            'src/pages/**/__tests__/**/*.{test,spec}.{ts,tsx}',
            'src/hooks/__tests__/**/*.{test,spec}.{ts,tsx}',
            'src/store/__tests__/**/*.{test,spec}.{ts,tsx}',
            'src/types/__tests__/**/*.{test,spec}.{ts,tsx}',
            'src/__tests__/**/*.{test,spec}.{ts,tsx}',
            '../../packages/shared-components/src/**/__tests__/**/*.{test,spec}.{ts,tsx}',
          ],
          isolate: true,
          setupFiles: [setupEnv, setupCore, setupMocks],
          // MUI 内部 Transition.mjs 以目录导入形式引用 react-transition-group 子路径，
          // 必须交由 Vite 转换（inline），配合 fix-react-transition-group-subpaths 插件修正。
          server: {
            deps: {
              inline: [/@mui\//, /react-transition-group/],
            },
          },
        },
      },
      {
        extends: true,
        test: {
          name: 'crm',
          include: [
            'src/api/__tests__/crm/**/*.{test,spec}.{ts,tsx}',
            'src/schemas/__tests__/crm/**/*.{test,spec}.{ts,tsx}',
            'src/api/crm/__tests__/**/*.{test,spec}.{ts,tsx}',
            'src/pages/__tests__/Crm*.{test,spec}.{ts,tsx}',
            'src/pages/__tests__/Customer*.{test,spec}.{ts,tsx}',
          ],
          isolate: true,
          setupFiles: [setupEnv, setupCore, setupMocks],
          // MUI 内部 Transition.mjs 以目录导入形式引用 react-transition-group 子路径，
          // 必须交由 Vite 转换（inline），配合 fix-react-transition-group-subpaths 插件修正。
          server: {
            deps: {
              inline: [/@mui\//, /react-transition-group/],
            },
          },
        },
        coverage: {
          provider: 'v8',
          reporter: ['text', 'json', 'html', 'json-summary'],
          reportOnFailure: true,
          include: [
            'src/api/crm/**/*.{ts,tsx}',
            'src/schemas/crm/**/*.{ts,tsx}',
            'src/modules/crm/**/*.{ts,tsx}',
          ],
          exclude: [
            'src/**/types.ts',
            'src/**/types/**',
            'src/**/__tests__/**',
            'src/**/*.d.ts',
          ],
          all: false,
          skipFull: true,
          thresholds: {
            statements: 0,
            branches: 0,
            functions: 0,
            lines: 0,
          },
        },
      },
    ],
  },
});
