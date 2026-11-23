#!/usr/bin/env node
/**
 * 连库钩子的统一数据库解析器（唯一事实源）
 *
 * 背景：pre-commit / pre-push 里多个检查项各自实现了一份 URL/口令解析，
 * 变量优先级与 .env 回退互不一致，排障时无法解释「这次连了哪个库」。
 * 本文件把解析收敛为一处，钩子只负责「连上后做什么检查」。
 *
 * 解析顺序（tier 从高到低）：
 *   1 钩子独立变量（如 MIGRATION_DRILL_DB_URL / MIGRATION_DRIFT_DB_URL / STATUS_CATALOG_DB_URL）
 *   2 通用迁移变量（MIGRATE_URL / DATABASE_URL；各 profile 按既有顺序）
 *   3 测试库变量（TEST_DATABASE_URL）
 *   4 内置本地夹具（仅 migration-drill）
 * 同一 tier 内：进程环境 > .env 同名键。每个 profile 的候选是显式有序数组，
 * 不做隐式推导，避免统一后目标库漂移。
 *
 * 口令（不打印、不入库）：进程 PGPASSWORD → 目标 URL 内嵌 → PGPASSFILE
 *   → .env 中「同角色」的口令（TEST_DATABASE_URL 优先）。角色不一致不借用。
 *
 * socket 回落：仅 ledger-ddl-drift / status-catalog / rls-policy-snapshot
 *   「TCP 且无任何口令来源」时回落 postgresql:///<db>（peer 认证）；
 *   migration-drill 与 rls-permissions 不回落。
 *
 * CLI：
 *   node scripts/ci/lib/db-target.mjs --list
 *   node scripts/ci/lib/db-target.mjs --hook <id> --explain
 *   node scripts/ci/lib/db-target.mjs --hook <id> --shell     # 供 eval，不做终端回显
 *   node scripts/ci/lib/db-target.mjs --hook <id> --json      # 脱敏结果
 *   --dsn <url>        显式指定（优先级最高）
 *   --env-file <path>  指定 .env（诊断可用 /dev/null 模拟无 .env）
 *
 * 缺库一律失败（exit 2），不跳过、不放行。完整口径见
 * docs/quality/environment-provisioning.md §12.1。
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
export const REPO_ROOT = path.resolve(__dirname, "../../..");
export const DEFAULT_ENV_FILE = path.join(REPO_ROOT, ".env");

const TIER_LABEL = {
  0: "显式 --dsn",
  1: "钩子独立变量",
  2: "通用迁移变量",
  3: "测试库变量",
  4: "内置本地夹具",
};

const env = (tier, name) => ({ tier, kind: "env", name });
const envfile = (tier, name) => ({ tier, kind: "envfile", name });
const builtin = (tier, name, value) => ({ tier, kind: "internal", name, value });

/**
 * 唯一事实表：每个钩子一条显式有序候选链。
 * 顺序与各钩子改造前的语义逐条对齐；新增的 .env 读取与测试库回落均已在此写明。
 */
export const PROFILES = {
  "migration-drill": {
    label: "migration-drill-anchor",
    socketFallback: false,
    candidates: [
      env(1, "MIGRATION_DRILL_DB_URL"),
      envfile(1, "MIGRATION_DRILL_DB_URL"),
      env(3, "TEST_DATABASE_URL"),
      envfile(3, "TEST_DATABASE_URL"),
      builtin(
        4,
        "内置默认（topems_test_runner@127.0.0.1:5432/postgres）",
        "postgresql://topems_test_runner@127.0.0.1:5432/postgres",
      ),
    ],
  },
  "ledger-ddl-drift": {
    label: "ledger-ddl-drift",
    socketFallback: true,
    candidates: [
      env(1, "MIGRATION_DRIFT_DB_URL"),
      envfile(1, "MIGRATION_DRIFT_DB_URL"),
      env(2, "DATABASE_URL"),
      envfile(2, "MIGRATE_URL"),
      env(3, "TEST_DATABASE_URL"),
      envfile(3, "TEST_DATABASE_URL"),
    ],
  },
  "status-catalog": {
    label: "status-catalog",
    socketFallback: true,
    // 不读 .env 的 MIGRATION_DRIFT_DB_URL：状态目录对开发库负责，
    // 漂移门禁对 topems_gate 负责，两者不能因同一个 .env 键互相带偏。
    candidates: [
      env(1, "STATUS_CATALOG_DB_URL"),
      envfile(1, "STATUS_CATALOG_DB_URL"),
      env(2, "RLS_POLICY_DB_URL"),
      env(2, "MIGRATION_DRIFT_DB_URL"),
      env(2, "DATABASE_URL"),
      envfile(2, "MIGRATE_URL"),
      env(3, "TEST_DATABASE_URL"),
      envfile(3, "TEST_DATABASE_URL"),
    ],
  },
  "rls-policy-snapshot": {
    label: "rls-policy-snapshot",
    socketFallback: true,
    candidates: [
      env(1, "RLS_POLICY_DB_URL"),
      envfile(1, "RLS_POLICY_DB_URL"),
      env(2, "MIGRATION_DRIFT_DB_URL"),
      env(2, "DATABASE_URL"),
      envfile(2, "MIGRATE_URL"),
      env(3, "TEST_DATABASE_URL"),
      envfile(3, "TEST_DATABASE_URL"),
    ],
  },
  "rls-permissions": {
    label: "rls-permissions",
    socketFallback: false,
    // 不回落 TEST_DATABASE_URL：该门禁校验「实际运行角色」，
    // 用测试身份替代会让断言失去意义。
    candidates: [
      env(1, "RLS_PERMISSIONS_DB_URL"),
      envfile(1, "RLS_PERMISSIONS_DB_URL"),
      env(2, "MIGRATE_URL"),
      env(2, "DATABASE_URL"),
      envfile(2, "MIGRATE_URL"),
      envfile(2, "DATABASE_URL"),
    ],
  },
};

// 口令借用候选（只借与目标角色一致的口令）。
const ENV_PASSWORD_KEYS = [
  "TEST_DATABASE_URL",
  "MIGRATION_DRILL_DB_URL",
  "MIGRATION_DRIFT_DB_URL",
  "STATUS_CATALOG_DB_URL",
  "RLS_POLICY_DB_URL",
  "RLS_PERMISSIONS_DB_URL",
  "MIGRATE_URL",
  "DATABASE_URL",
];

export function readEnvFile(file = DEFAULT_ENV_FILE) {
  if (!file || !fs.existsSync(file)) return {};
  const out = {};
  for (const line of fs.readFileSync(file, "utf8").split(/\r?\n/)) {
    const m = /^\s*(?:export\s+)?([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)$/.exec(line);
    if (!m) continue;
    let value = m[2].trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    out[m[1]] = value;
  }
  return out;
}

function parseUrl(value) {
  try {
    return new URL(value);
  } catch {
    return null;
  }
}

export function roleFromUrl(url) {
  const u = parseUrl(url);
  if (!u) return "";
  try {
    return decodeURIComponent(u.username || "");
  } catch {
    return u.username || "";
  }
}

export function dbFromUrl(url) {
  const u = parseUrl(url);
  if (!u) return "";
  try {
    return decodeURIComponent((u.pathname || "").replace(/^\//, ""));
  } catch {
    return (u.pathname || "").replace(/^\//, "");
  }
}

function passwordFromUrl(url) {
  const u = parseUrl(url);
  if (!u) return "";
  try {
    return decodeURIComponent(u.password || "");
  } catch {
    return u.password || "";
  }
}

function hasUrlPassword(url) {
  const u = parseUrl(url);
  return Boolean(
    u && (u.password || u.searchParams.get("password") || u.searchParams.get("passfile")),
  );
}

export function isSocketUrl(url) {
  const u = parseUrl(url);
  return Boolean(u) && !u.hostname && !u.port;
}

function socketUrl(url) {
  const u = parseUrl(url);
  const db = dbFromUrl(url);
  const search = u && u.search ? u.search : "";
  return `postgresql:///${db}${search}`;
}

function withPassword(url, password) {
  if (!password || isSocketUrl(url) || hasUrlPassword(url)) return url;
  const u = parseUrl(url);
  if (!u) return url;
  u.password = password;
  return u.toString();
}

function candidateLabel(c) {
  if (c.kind === "env") return `${c.name}（环境变量）`;
  if (c.kind === "envfile") return `.env 的 ${c.name}`;
  return c.name;
}

/** 仅打印来源与库名，绝不输出连接串与口令。 */
export function describeTarget(target) {
  if (!target || !target.ok) return "(未命中)";
  const u = parseUrl(target.url);
  if (!u) return "(连接串无法解析)";
  if (!u.hostname && !u.port) return `socket:/${target.db || ""}`;
  const scheme = (u.protocol || "postgresql:").replace(/:$/, "");
  const role = target.role ? `${target.role}@` : "";
  return `${scheme}://${role}${u.hostname}:${u.port || 5432}/${target.db || ""}`;
}

/**
 * 解析目标库。返回：
 * { ok, hook, label, url, urlWithPassword, source, tier, role, db,
 *   password, passwordSource, hasPassword, socket, passwordNotes, tried }
 * url/urlWithPassword 含凭据，只供进程内使用；打印一律走 describeTarget。
 */
export function resolveDbTarget({
  hook,
  explicitDsn = null,
  envFile = DEFAULT_ENV_FILE,
  env: envVars = process.env,
} = {}) {
  const profile = PROFILES[hook];
  if (!profile) {
    throw new Error(
      `未知的 hook: ${hook}（可用：${Object.keys(PROFILES).join("、")}）`,
    );
  }
  const envMap = readEnvFile(envFile);
  const tried = [];
  let url = null;
  let source = null;
  let tier = null;

  if (explicitDsn) {
    url = explicitDsn;
    source = "--dsn 参数";
    tier = 0;
    tried.push({ tier: 0, kind: "dsn", name: "--dsn", label: "--dsn 参数", status: "hit" });
  }

  for (const c of profile.candidates) {
    const entry = {
      tier: c.tier,
      kind: c.kind,
      name: c.name,
      label: candidateLabel(c),
      status: "not-checked",
    };
    if (!url) {
      let value = "";
      if (c.kind === "internal") value = c.value;
      else if (c.kind === "env") value = String(envVars[c.name] ?? "").trim();
      else value = String(envMap[c.name] ?? "").trim();
      if (value) {
        url = value;
        source = candidateLabel(c);
        tier = c.tier;
        entry.status = "hit";
      } else {
        entry.status = "unset";
      }
    }
    tried.push(entry);
  }

  if (!url) {
    return {
      ok: false,
      hook,
      label: profile.label,
      url: null,
      urlWithPassword: null,
      source: null,
      tier: null,
      role: "",
      db: "",
      password: null,
      passwordSource: null,
      hasPassword: false,
      socket: false,
      passwordNotes: [],
      tried,
    };
  }

  const role = roleFromUrl(url);
  const db = dbFromUrl(url);
  const socket = isSocketUrl(url);
  const passwordNotes = [];
  let password = null;
  let passwordSource = null;

  if (envVars.PGPASSWORD) {
    password = envVars.PGPASSWORD;
    passwordSource = "环境变量 PGPASSWORD";
  } else if (passwordFromUrl(url)) {
    password = passwordFromUrl(url);
    passwordSource = "目标连接串内嵌口令";
  } else if (envVars.PGPASSFILE) {
    passwordSource = "环境变量 PGPASSFILE";
  } else if (!socket && role) {
    for (const key of ENV_PASSWORD_KEYS) {
      const candidate = String(envMap[key] ?? "").trim();
      if (!candidate) continue;
      const candidatePassword = passwordFromUrl(candidate);
      if (!candidatePassword) continue;
      const candidateRole = roleFromUrl(candidate);
      if (candidateRole && candidateRole !== role) {
        passwordNotes.push(`${key}（角色 ${candidateRole}）`);
        continue;
      }
      password = candidatePassword;
      passwordSource = `.env ${key}（同角色）`;
      break;
    }
  }

  let finalUrl = url;
  let finalSource = source;
  let finalSocket = socket;
  let hasPassword = Boolean(password) || Boolean(envVars.PGPASSFILE) || socket;

  if (profile.socketFallback && !socket && !hasPassword) {
    finalUrl = socketUrl(url);
    finalSource = `${source} → 无口令，回落 socket（peer 认证）`;
    finalSocket = true;
    hasPassword = true;
    passwordSource = "socket peer 认证（无需口令）";
  }

  const urlWithPassword = withPassword(finalUrl, password);

  return {
    ok: true,
    hook,
    label: profile.label,
    url: finalUrl,
    urlWithPassword,
    source: finalSource,
    tier,
    role,
    db,
    password,
    passwordSource,
    hasPassword,
    socket: finalSocket,
    passwordNotes,
    tried,
  };
}

/** 把解析出的口令写入进程环境（仅在未显式设置 PGPASSWORD 时）。 */
export function applyPasswordToEnv(target, envVars = process.env) {
  if (target && target.ok && target.password && !envVars.PGPASSWORD) {
    envVars.PGPASSWORD = target.password;
  }
}

function shQuote(value) {
  return `'${String(value ?? "").replace(/'/g, "'\\''")}'`;
}

function printFailure(hook) {
  const profile = PROFILES[hook];
  const names = (profile?.candidates ?? [])
    .filter((c) => c.kind !== "internal")
    .map((c) => candidateLabel(c));
  console.error(`[db-target] FAIL: hook=${hook} 未找到可用数据库连接。`);
  console.error(`  已按顺序检查且全部未设置：`);
  for (const name of names) console.error(`    - ${name}`);
  console.error(`  请设置该钩子的独立变量（优先级最高），或配置 .env 中的本地夹具库；`);
  console.error(`  口令由既有环境/.env 提供（PGPASSWORD，或 .env 中同角色 DSN 的内嵌口令），不需要手填。`);
  console.error(`  缺库即失败，不跳过。用法：node scripts/ci/lib/db-target.mjs --hook ${hook} --explain`);
  console.error(`  文档：docs/quality/environment-provisioning.md §12.1`);
}

function printExplain(target) {
  console.log(`[db-target] hook=${target.hook}（${target.label}）`);
  console.log("  解析顺序（逐档）：");
  for (const entry of target.tried) {
    const mark =
      entry.status === "hit" ? "✓ 命中" : entry.status === "unset" ? "· 未设置" : "– 已跳过";
    console.log(
      `    tier ${entry.tier} [${TIER_LABEL[entry.tier] ?? "?"}] ${entry.label}  ${mark}`,
    );
  }
  if (!target.ok) {
    printFailure(target.hook);
    return;
  }
  console.log(`  命中档位：${target.tier}（${TIER_LABEL[target.tier] ?? "?"}）`);
  console.log(`  来源：${target.source}`);
  console.log(`  目标库：${describeTarget(target)}`);
  console.log(`  角色：${target.role || "(无/由 peer 认证决定)"}`);
  console.log(`  库名：${target.db}`);
  console.log(`  口令来源：${target.passwordSource || "未找到（socket/peer 时无需口令）"}`);
  if (target.passwordNotes.length) {
    console.log(`  口令候选跳过：${target.passwordNotes.join("、")}（角色不一致，不借用）`);
  }
}

function printShell(target) {
  const fields = [
    ["DB_TARGET_URL", target.urlWithPassword],
    ["DB_TARGET_SOURCE", target.source],
    ["DB_TARGET_ROLE", target.role],
    ["DB_TARGET_DB", target.db],
    ["DB_TARGET_TIER", target.tier],
    ["DB_TARGET_HAS_PASSWORD", target.hasPassword ? "1" : "0"],
    ["DB_TARGET_PASSWORD_SOURCE", target.passwordSource || ""],
  ];
  for (const [key, value] of fields) console.log(`${key}=${shQuote(value)}`);
}

function printList() {
  console.log("可用 hook：");
  for (const [hook, profile] of Object.entries(PROFILES)) {
    const independent = profile.candidates
      .filter((c) => c.tier === 1 && c.kind !== "internal")
      .map((c) => c.name);
    console.log(`  ${hook.padEnd(22)} 独立变量：${[...new Set(independent)].join(" / ") || "(无)"}`);
  }
}

function parseArgs(argv) {
  const out = {
    hook: null,
    dsn: null,
    envFile: DEFAULT_ENV_FILE,
    explain: false,
    shell: false,
    json: false,
    list: false,
  };
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === "--hook") out.hook = argv[++i];
    else if (arg === "--dsn") out.dsn = argv[++i];
    else if (arg === "--env-file") out.envFile = argv[++i];
    else if (arg === "--explain") out.explain = true;
    else if (arg === "--shell") out.shell = true;
    else if (arg === "--json") out.json = true;
    else if (arg === "--list") out.list = true;
    else if (arg === "--help" || arg === "-h") out.help = true;
    else {
      console.error(`[db-target] 未知参数: ${arg}`);
      process.exit(2);
    }
  }
  return out;
}

function main(argv) {
  const args = parseArgs(argv);
  if (args.help) {
    console.log(
      [
        "用法: node scripts/ci/lib/db-target.mjs --hook <id> [--explain|--shell|--json]",
        "      node scripts/ci/lib/db-target.mjs --list",
        "",
        "  --hook <id>       钩子/检查项（见 --list）",
        "  --explain         只查看不连接：逐档打印命中来源、角色、库名、口令来源（不含连接串/口令）",
        "  --shell           输出 shell 赋值供 eval（含连接串，口令只可能内嵌其中，不单独打印）",
        "  --json            输出脱敏结果（不含连接串与口令）",
        "  --dsn <url>       显式连接串（优先级最高）",
        "  --env-file <path> 指定 .env（诊断可用 /dev/null 模拟无 .env）",
        "",
        "缺库即失败（exit 2），不跳过。文档：docs/quality/environment-provisioning.md §12.1",
      ].join("\n"),
    );
    return 0;
  }
  if (args.list) {
    printList();
    return 0;
  }
  if (!args.hook) {
    console.error("[db-target] 缺少 --hook（用 --list 查看可用项）");
    return 2;
  }

  let target;
  try {
    target = resolveDbTarget({ hook: args.hook, explicitDsn: args.dsn, envFile: args.envFile });
  } catch (err) {
    console.error(`[db-target] ${err.message}`);
    return 2;
  }

  if (args.explain) {
    printExplain(target);
    return target.ok ? 0 : 2;
  }
  if (!target.ok) {
    printFailure(args.hook);
    return 2;
  }
  if (args.shell) {
    printShell(target);
    return 0;
  }
  // 默认与 --json 一律脱敏：不输出连接串、不输出口令。
  const sanitized = {
    hook: target.hook,
    label: target.label,
    ok: target.ok,
    tier: target.tier,
    source: target.source,
    target: describeTarget(target),
    role: target.role,
    db: target.db,
    hasPassword: target.hasPassword,
    passwordSource: target.passwordSource,
    passwordNotes: target.passwordNotes,
    socket: target.socket,
  };
  console.log(JSON.stringify(sanitized, null, 2));
  return 0;
}

const invokedPath = process.argv[1] ? path.resolve(process.argv[1]) : "";
if (invokedPath === fileURLToPath(import.meta.url)) {
  process.exitCode = main(process.argv.slice(2));
}

export { main as runCli };
