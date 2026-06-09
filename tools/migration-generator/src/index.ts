#!/usr/bin/env node

import { Command } from 'commander';
import http from 'http';
import * as fs from 'fs';
import * as path from 'path';
import {
  generateServiceMigration,
  generateIndexMigration,
  generateAuditMigration,
} from './generator';
import {
  applyMigration,
  rollbackMigration,
  getMigrationStatus,
  createAllSchemas,
  createSchemaIfNotExists,
  probeDatabase,
  findMigrationFiles,
} from './runner';
import {
  generateAllServiceConfigs,
  getServiceByName,
  listServiceNames,
  ServiceConfig,
} from './services';

const VERSION = '0.1.0';

type MigrationType = 'schema' | 'index' | 'audit' | 'all';

interface GlobalOptions {
  db?: string;
  output?: string;
}

function getDatabaseUrl(options: GlobalOptions): string | undefined {
  return options.db || process.env.DATABASE_URL;
}

function getOutputDir(options: GlobalOptions): string {
  return path.resolve(process.cwd(), options.output || process.env.MIGRATION_OUTPUT_DIR || './migrations');
}

function ensureOutputDir(outputDir: string): void {
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }
}

function resolveService(name: string): ServiceConfig {
  const service = getServiceByName(name);
  if (!service) {
    console.error(`❌ 找不到服务: ${name}`);
    console.error(`   可用服务: ${listServiceNames().join(', ')}`);
    process.exit(1);
  }
  return service;
}

function runGenerationForService(
  service: ServiceConfig,
  type: MigrationType,
  outputDir: string,
): string[] {
  const generated: string[] = [];
  console.log(`\n📦 生成 ${service.name.toUpperCase()} 服务迁移文件...`);

  if (type === 'all' || type === 'schema') {
    const f = generateServiceMigration(service, outputDir);
    if (f) {
      console.log(`  ✅ 表结构: ${f}`);
      generated.push(f);
    }
  }
  if (type === 'all' || type === 'index') {
    const f = generateIndexMigration(service, outputDir);
    if (f) {
      console.log(`  ✅ 索引优化: ${f}`);
      generated.push(f);
    }
  }
  if (type === 'all' || type === 'audit') {
    const f = generateAuditMigration(service, outputDir);
    if (f) {
      console.log(`  ✅ 审计触发器: ${f}`);
      generated.push(f);
    }
  }
  return generated;
}

const program = new Command();

program
  .name('topems-migrate')
  .description('TOPEMS 多租户多服务数据库迁移工具')
  .version(VERSION)
  .option('-d, --db <url>', '数据库连接 URL (默认读取 DATABASE_URL 环境变量)')
  .option('-o, --output <dir>', '迁移文件输出目录 (默认 ./migrations)');

// ============================================================================
// list-services
// ============================================================================
program
  .command('list-services')
  .description('列出所有可迁移服务')
  .action(() => {
    const services = generateAllServiceConfigs();
    console.log(`📦 可用服务列表 (共 ${services.length} 个服务):\n`);
    services.forEach((service, index) => {
      console.log(
        `${String(index + 1).padStart(2)}. ${service.name.padEnd(12)} - ${service.description}`,
      );
      console.log(
        `     Schema: ${service.schema.padEnd(12)}  端口: ${service.port}  表数: ${service.tables.length}`,
      );
      console.log();
    });
  });

// ============================================================================
// generate <service>
// ============================================================================
program
  .command('generate')
  .description('生成指定服务的迁移文件')
  .argument('<service>', '服务名称 (可用 all 生成全部)')
  .option('--type <type>', '迁移类型: schema|index|audit|all', 'all')
  .action(async (serviceName: string, cmdOptions) => {
    const globalOpts = program.opts<GlobalOptions>();
    const outputDir = getOutputDir(globalOpts);
    ensureOutputDir(outputDir);

    const type = (cmdOptions.type || 'all') as MigrationType;
    if (!['schema', 'index', 'audit', 'all'].includes(type)) {
      console.error(`❌ 无效的 --type: ${type} (可选: schema|index|audit|all)`);
      process.exit(1);
    }

    console.log('🚀 开始生成数据库迁移文件...');
    console.log(`  📁 输出目录: ${outputDir}`);
    console.log(`  🧩 类型: ${type}`);

    const services: ServiceConfig[] =
      serviceName === 'all'
        ? generateAllServiceConfigs()
        : [resolveService(serviceName)];

    const allGenerated: string[] = [];
    for (const service of services) {
      allGenerated.push(...runGenerationForService(service, type, outputDir));
    }

    console.log(`\n🎉 完成！共生成 ${allGenerated.length} 个迁移文件`);
    console.log(JSON.stringify(allGenerated, null, 2));
  });

// ============================================================================
// apply <service>
// ============================================================================
program
  .command('apply')
  .description('生成指定服务的迁移并应用到数据库')
  .argument('<service>', '服务名称 (可用 all 生成全部)')
  .option('--type <type>', '迁移类型: schema|index|audit|all', 'all')
  .action(async (serviceName: string, cmdOptions) => {
    const globalOpts = program.opts<GlobalOptions>();
    const databaseUrl = getDatabaseUrl(globalOpts);
    const outputDir = getOutputDir(globalOpts);

    if (!databaseUrl) {
      console.error('❌ 错误: 请指定 --db 或设置 DATABASE_URL 环境变量');
      process.exit(1);
    }
    ensureOutputDir(outputDir);

    const type = (cmdOptions.type || 'all') as MigrationType;

    const services: ServiceConfig[] =
      serviceName === 'all'
        ? generateAllServiceConfigs()
        : [resolveService(serviceName)];

    for (const service of services) {
      await createSchemaIfNotExists(databaseUrl, service.schema);
      runGenerationForService(service, type, outputDir);
    }

    console.log('\n🚀 开始应用迁移...');
    await applyMigration({
      databaseUrl,
      migrationsDir: outputDir,
      verbose: true,
    });
    console.log('✅ apply 完成');
  });

// ============================================================================
// rollback <service>
// ============================================================================
program
  .command('rollback')
  .description('回滚迁移（标记性回滚：从迁移记录表中移除最近或指定版本）')
  .argument('[service]', '服务名称 (可选，用于提示对应迁移文件目录)')
  .option('--version <version>', '指定要回滚的版本号 (14 位时间戳或文件名)')
  .action(async (serviceName: string | undefined, cmdOptions) => {
    const globalOpts = program.opts<GlobalOptions>();
    const databaseUrl = getDatabaseUrl(globalOpts);
    const outputDir = getOutputDir(globalOpts);

    if (!databaseUrl) {
      console.error('❌ 错误: 请指定 --db 或设置 DATABASE_URL 环境变量');
      process.exit(1);
    }
    if (serviceName && serviceName !== 'all') {
      // 仅校验服务存在，不影响 rollback 逻辑
      resolveService(serviceName);
    }

    await rollbackMigration({
      databaseUrl,
      migrationsDir: outputDir,
      specificFile: cmdOptions.version,
    });
  });

// ============================================================================
// status <service>
// ============================================================================
program
  .command('status')
  .description('查看迁移状态')
  .argument('[service]', '服务名称 (可选，目前仅显示全局迁移状态)')
  .action(async (serviceName: string | undefined) => {
    const globalOpts = program.opts<GlobalOptions>();
    const databaseUrl = getDatabaseUrl(globalOpts);
    const outputDir = getOutputDir(globalOpts);

    if (!databaseUrl) {
      console.error('❌ 错误: 请指定 --db 或设置 DATABASE_URL 环境变量');
      process.exit(1);
    }
    if (serviceName && serviceName !== 'all') {
      resolveService(serviceName);
    }

    await getMigrationStatus(databaseUrl, outputDir);
  });

// ============================================================================
// bootstrap
// ============================================================================
program
  .command('bootstrap')
  .description('为所有服务生成迁移；若指定 --apply 则创建 schema 并应用')
  .option('--apply', '生成后立即应用迁移 (默认仅生成)', false)
  .action(async (cmdOptions) => {
    const globalOpts = program.opts<GlobalOptions>();
    const databaseUrl = getDatabaseUrl(globalOpts);
    const outputDir = getOutputDir(globalOpts);
    const apply = !!cmdOptions.apply;

    ensureOutputDir(outputDir);
    const services = generateAllServiceConfigs();

    if (apply && !databaseUrl) {
      console.error('❌ 错误: --apply 需要指定 --db 或设置 DATABASE_URL 环境变量');
      process.exit(1);
    }

    console.log('🚀 [bootstrap] 生成所有服务迁移...');
    const generated: string[] = [];
    for (const service of services) {
      generated.push(...runGenerationForService(service, 'all', outputDir));
    }
    console.log(`✅ 生成完成 (${generated.length} 个文件)`);

    if (!apply) {
      console.log('\n💡 使用 --apply 自动执行生成后的迁移，或运行:');
      console.log('   topems-migrate apply all');
      return;
    }

    if (databaseUrl) {
      console.log('\n🚀 [bootstrap] 创建 schema...');
      await createAllSchemas(
        databaseUrl,
        services.map((s) => s.schema),
      );
      console.log('\n🚀 [bootstrap] 应用迁移...');
      await applyMigration({
        databaseUrl,
        migrationsDir: outputDir,
        verbose: true,
      });
      console.log('✅ bootstrap 完成');
    }
  });

// ============================================================================
// create-schema <service>
// ============================================================================
program
  .command('create-schema')
  .description('创建指定服务的 PostgreSQL schema')
  .argument('<service>', '服务名称')
  .action(async (serviceName: string) => {
    const globalOpts = program.opts<GlobalOptions>();
    const databaseUrl = getDatabaseUrl(globalOpts);
    if (!databaseUrl) {
      console.error('❌ 错误: 请指定 --db 或设置 DATABASE_URL 环境变量');
      process.exit(1);
    }
    const service = resolveService(serviceName);
    await createSchemaIfNotExists(databaseUrl, service.schema);
  });

// ============================================================================
// probe
// ============================================================================
program
  .command('probe')
  .description('探测数据库连通性并打印版本')
  .action(async () => {
    const globalOpts = program.opts<GlobalOptions>();
    const databaseUrl = getDatabaseUrl(globalOpts);
    if (!databaseUrl) {
      console.error('❌ 错误: 请指定 --db 或设置 DATABASE_URL 环境变量');
      process.exit(1);
    }
    const parsed = new URL(databaseUrl);
    const masked = `${parsed.protocol}//***:***@${parsed.host}${parsed.pathname}`;
    console.log(`🔌 尝试连接: ${masked}`);
    const result = await probeDatabase(databaseUrl);
    if (result.ok) {
      console.log('✅ 连接成功');
      console.log(`   版本: ${result.version}`);
    } else {
      console.log(`❌ 连接失败: ${result.error}`);
      process.exit(1);
    }
  });

// ============================================================================
// serve
// ============================================================================
interface ServeOptions {
  port?: string;
}

program
  .command('serve')
  .description('启动 HTTP 迁移管理服务')
  .option('-p, --port <port>', '监听端口 (默认读取 MIGRATION_SERVER_PORT 或 8787)', '8787')
  .action(async (cmdOptions: ServeOptions) => {
    const globalOpts = program.opts<GlobalOptions>();
    const databaseUrl = getDatabaseUrl(globalOpts);
    const outputDir = getOutputDir(globalOpts);
    const port = parseInt(
      cmdOptions.port || process.env.MIGRATION_SERVER_PORT || '8787',
      10,
    );

    // --------------------------------------------------------------------
    // API 响应工具
    // --------------------------------------------------------------------
    interface StandardResponse {
      success: boolean;
      code: number;
      message?: string;
      data?: any;
    }

    const sendJson = (res: http.ServerResponse, status: number, body: StandardResponse) => {
      res.writeHead(status, {
        'Content-Type': 'application/json; charset=utf-8',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      });
      res.end(JSON.stringify(body, null, 2));
    };

    const ok = (res: http.ServerResponse, data: any, message = 'OK') =>
      sendJson(res, 200, { success: true, code: 200, data, message });

    const bad = (res: http.ServerResponse, message: string, code = 400) =>
      sendJson(res, code, { success: false, code, message });

    const serverErr = (res: http.ServerResponse, message: string) =>
      sendJson(res, 500, { success: false, code: 500, message });

    const readBody = (req: http.IncomingMessage): Promise<string> =>
      new Promise((resolve, reject) => {
        let data = '';
        req.on('data', (chunk) => (data += chunk));
        req.on('end', () => resolve(data));
        req.on('error', reject);
      });

    // --------------------------------------------------------------------
    // 路由匹配
    // --------------------------------------------------------------------
    const matchListServices = /^\/api\/v1\/migrations\/services\/?$/;
    const matchServiceAction = /^\/api\/v1\/migrations\/services\/([^/]+)\/(apply|rollback|generate|status)\/?$/;
    const matchHealth = /^\/(api\/v1\/(?:migrations\/)?health|health|\/?)?$/;

    // --------------------------------------------------------------------
    // 核心业务辅助
    // --------------------------------------------------------------------
    const svcOutputDir = (serviceName: string) => path.join(outputDir, serviceName);

    const generateFilesFor = async (serviceName: string, type: MigrationType = 'all') => {
      const svc = getServiceByName(serviceName);
      if (!svc) throw new Error(`未找到服务: ${serviceName}`);
      const dir = svcOutputDir(serviceName);
      ensureOutputDir(dir);

      const files: string[] = [];
      const run = (typeArg: MigrationType) => {
        let f: string | null = null;
        if (typeArg === 'schema') f = generateServiceMigration(svc, dir);
        else if (typeArg === 'index') f = generateIndexMigration(svc, dir);
        else if (typeArg === 'audit') f = generateAuditMigration(svc, dir);
        if (f) files.push(path.resolve(dir, f));
      };

      if (type === 'all') {
        run('schema');
        run('index');
        run('audit');
      } else {
        run(type);
      }
      return files;
    };

    // --------------------------------------------------------------------
    // HTTP 处理
    // --------------------------------------------------------------------
    const server = http.createServer(async (req, res) => {
      // CORS 预检
      if (req.method === 'OPTIONS') {
        return sendJson(res, 204, { success: true, code: 204 });
      }

      const url = new URL(req.url || '/', `http://localhost:${port}`);
      const pathname = url.pathname.replace(/\/+$/, '');

      try {
        // 1. 健康检查 & 元数据
        if (matchHealth.test(pathname)) {
          const probe = databaseUrl
            ? await probeDatabase(databaseUrl).catch(() => ({ ok: false, error: '无法连接' }))
            : { ok: false, error: 'DATABASE_URL 未配置' };
          return ok(res, {
            service: 'topems-migrate',
            version: VERSION,
            outputDir,
            databaseConfigured: !!databaseUrl,
            databaseOk: probe.ok,
            servicesCount: generateAllServiceConfigs().length,
          });
        }

        // 2. GET /api/v1/migrations/services
        if (req.method === 'GET' && matchListServices.test(pathname)) {
          const services = generateAllServiceConfigs().map((s) => ({
            name: s.name,
            schema: s.schema,
            port: s.port,
            description: s.description,
            tables: s.tables.length,
          }));
          return ok(res, services, `已列出 ${services.length} 个服务`);
        }

        // 3. 单服务操作: /api/v1/migrations/services/:name/{apply|rollback|generate|status}
        const m = matchServiceAction.exec(pathname);
        if (m) {
          const [, serviceName, action] = m;

          // 3a. POST .../apply
          if (req.method === 'POST' && action === 'apply') {
            const raw = await readBody(req);
            const body = raw ? JSON.parse(raw) : {};
            const type: MigrationType = body.type || 'all';
            const files = await generateFilesFor(serviceName, type);
            let reports: any[] = [];
            if (databaseUrl) {
              reports = await applyMigration({
                databaseUrl,
                migrationsDir: svcOutputDir(serviceName),
                verbose: true,
              });
            }
            return ok(res, { files, reports }, `${serviceName} 迁移执行完成 (生成${files.length}个文件)`);
          }

          // 3b. POST .../rollback
          if (req.method === 'POST' && action === 'rollback') {
            if (!databaseUrl) return bad(res, 'DATABASE_URL 未配置', 400);
            const raw = await readBody(req);
            const body = raw ? JSON.parse(raw) : {};
            const result = await rollbackMigration({
              databaseUrl,
              migrationsDir: svcOutputDir(serviceName),
              specificFile: body.version || body.specificFile,
            });
            return ok(res, { record: result }, `回滚完成`);
          }

          // 3c. POST .../generate —— 仅生成文件，不应用
          if (req.method === 'POST' && action === 'generate') {
            const raw = await readBody(req);
            const body = raw ? JSON.parse(raw) : {};
            const type: MigrationType = body.type || 'all';
            const files = await generateFilesFor(serviceName, type);
            return ok(res, { files }, `已生成 ${files.length} 个迁移文件`);
          }

          // 3d. GET .../status
          if (req.method === 'GET' && action === 'status') {
            if (!databaseUrl) return bad(res, 'DATABASE_URL 未配置', 400);
            const info = await getMigrationStatus(databaseUrl, svcOutputDir(serviceName));
            return ok(res, info);
          }

          return bad(res, `不支持的方法/动作: ${req.method} / ${action}`, 405);
        }

        // 4. 文件列表
        if (req.method === 'GET' && /^\/api\/v1\/migrations\/files\/?$/.test(pathname)) {
          const files = findMigrationFiles(outputDir);
          return ok(res, { outputDir, files });
        }

        // 5. 数据库探测
        if (req.method === 'GET' && /^\/api\/v1\/migrations\/probe\/?$/.test(pathname)) {
          if (!databaseUrl) return bad(res, 'DATABASE_URL 未配置', 400);
          const probeResult = await probeDatabase(databaseUrl);
          return ok(res, probeResult, probeResult.ok ? '数据库连接正常' : '数据库连接失败');
        }

        // 未找到
        return bad(res, `未找到路径: ${req.method} ${pathname}`, 404);
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        console.error(`[ERR] ${req.method} ${pathname}:`, msg);
        return serverErr(res, msg);
      }
    });

    server.listen(port, () => {
      console.log(`🚀 topems-migrate HTTP 服务已启动`);
      console.log(`   http://localhost:${port}`);
      console.log(`   数据库:   ${databaseUrl ? '已配置' : '未配置 (仅支持生成)'}`);
      console.log(`   输出目录: ${outputDir}`);
      console.log(``);
      console.log(`   可用端点:`);
      console.log(`     GET  /api/v1/health                                       - 健康检查 & 元数据`);
      console.log(`     GET  /api/v1/migrations/services                          - 服务列表`);
      console.log(`     POST /api/v1/migrations/services/:name/generate           - 仅生成迁移`);
      console.log(`     POST /api/v1/migrations/services/:name/apply              - 生成并应用迁移`);
      console.log(`     POST /api/v1/migrations/services/:name/rollback           - 回滚迁移`);
      console.log(`     GET  /api/v1/migrations/services/:name/status             - 查看服务迁移状态`);
      console.log(`     GET  /api/v1/migrations/files                             - 迁移文件列表`);
      console.log(`     GET  /api/v1/migrations/probe                             - 数据库探测`);
      console.log(``);
      console.log(`   示例:`);
      console.log(`     curl http://localhost:${port}/api/v1/health`);
      console.log(`     curl http://localhost:${port}/api/v1/migrations/services`);
      console.log(`     curl -X POST http://localhost:${port}/api/v1/migrations/services/ai/apply -H 'Content-Type: application/json' -d '{"type":"all"}'`);
      console.log(``);
      console.log(`   按 Ctrl+C 退出`);
    });
  });

program.parseAsync(process.argv).catch((err) => {
  console.error('❌ 命令执行失败:', err);
  process.exit(1);
});
