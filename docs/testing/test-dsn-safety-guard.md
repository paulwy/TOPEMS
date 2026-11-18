# 测试 DSN 安全边界（P0）

> 适用于所有会连数据库的测试，尤其是 `#[sqlx::test]`。
> 结论：**测试只允许连 `TEST_DATABASE_URL`，任何情况下都不允许回退到 `DATABASE_URL`。**

## 真实事故案例（2026-11-18）

一次落点测试（audit landing）在本地执行时，`.env` 中的 `DATABASE_URL` 仍指向 `topems_prod`。
`#[sqlx::test]` 在测试体执行前读取的正是 `DATABASE_URL`，于是测试进程直接连到生产库并：

1. `CREATE SCHEMA ut_audit_landing`；
2. 写入 1 行测试数据；
3. `DROP SCHEMA ut_audit_landing CASCADE`。

事后核查无残留，但这是一次**实际发生的生产写入**。同一根因还导致 `ledger-ddl-drift` 门禁把
「账本为空」误判了一次——测试/门禁读到的是生产连接，而不是测试库。

### 为什么不能依赖 `DATABASE_URL`

- `DATABASE_URL` 是**运行时配置**，`.env` 里默认就是生产连接串；测试进程和业务进程共用它。
- `#[sqlx::test]` 的连接串解析发生在测试体之前，测试代码内部再做任何断言都来不及。
- sqlx 使用 `dotenvy` 读取环境变量：**进程里已存在的 `DATABASE_URL` 优先**，`.env` 只在缺失时兜底。
  因此只要有人忘记覆盖，测试就会静默连生产。
- `#[sqlx::test]` 会在目标连接上创建/删除临时数据库。它不仅能写数据，还能执行 DDL。

所以：**生产连接串不能作为测试的默认值存在。测试 DSN 必须是独立、显式、可校验的。**

## 护栏设计

新增 crate [lib/test-support](../../lib/test-support/src/lib.rs)，提供：

| 能力 | 行为 |
| --- | --- |
| DSN 来源 | 只读进程环境变量 `TEST_DATABASE_URL`；不读 `.env`，不读 `DATABASE_URL` |
| 未设置/为空 | 进程启动即 panic（`SIGABRT`），明确提示如何设置 |
| 生产库名 | `topems_prod`、`topems_prod_*`、`*_prod`、`prod`、`production` → panic |
| 生产角色 | `topems_prod`、`prod` → panic |
| 生产主机 | `192.168.110.115` 或主机名含 `prod` → panic |
| 报错内容 | 打印来源、打码后的实际 DSN、解析出的 user/host/port/database |
| 通过后 | 把进程内 `DATABASE_URL` 覆盖为同一 DSN，确保 sqlx 只连测试库 |
| 生效时机 | 测试二进制启动期（`init_array` / `__mod_init_func` / `.CRT$XCU`），早于任何测试 |

接入方式：在包含 `#[sqlx::test]` 的测试目标里增加一行

```rust
topems_test_support::sqlx_dsn_guard!();
```

本轮已接入全部 57 个使用 `#[sqlx::test]` 的测试文件。

## 使用方式

```bash
export TEST_DATABASE_URL="postgres://topems_test_runner@localhost:5432/topems_test_runner"
cargo test -p <crate> --test <test-target>
```

验证时建议同时清掉 `DATABASE_URL`，确认测试不依赖它：

```bash
env -u DATABASE_URL TEST_DATABASE_URL="postgres://topems_test_runner@localhost:5432/topems_test_runner" \
  cargo test -p <crate> --test <test-target>
```

## 实际报错样例

未设置 `TEST_DATABASE_URL`（且 `DATABASE_URL` 仍指向生产）：

```text
[test-dsn] 拒绝启动：进程环境变量 TEST_DATABASE_URL 未设置或为空。
  #[sqlx::test] 只允许使用 TEST_DATABASE_URL，不会回退到 DATABASE_URL（后者可能指向生产库）。
  示例：export TEST_DATABASE_URL=postgres://topems_test_runner@localhost:5432/topems_test_runner
```

`TEST_DATABASE_URL` 指向生产：

```text
[test-dsn] 拒绝连接生产环境：进程环境变量 TEST_DATABASE_URL 命中生产特征（database=topems_prod）。
  来源：进程环境变量 TEST_DATABASE_URL
  实际值：postgres://topems_prod:***@192.168.110.115:5432/topems_prod
  解析结果：user=topems_prod host=192.168.110.115 port=5432 database=topems_prod
  请把 TEST_DATABASE_URL 指向专用测试库（例如 topems_test_runner），测试不会回退到 DATABASE_URL。
```

## 硬编码 DSN 的收敛

原先把 `postgres://topems:topems_secret@localhost:5432/topems` 写死在测试里的 17 个文件，
已统一改为：

```rust
fn test_database_url() -> String {
    std::env::var("TEST_DATABASE_URL").expect(
        "[test-dsn] 未设置 TEST_DATABASE_URL：测试库 DSN 必须显式提供，禁止回退到 DATABASE_URL 或硬编码开发库",
    )
}
```

缺失环境变量时直接失败，不再静默回退到开发库。

## 已知残留

- 大量非 `#[sqlx::test]` 的集成测试仍有 `if !ensure_db_available() { return; }` 之类的
  「环境缺失即早退」写法；本轮按计划未改动，见
  [test-ignore-triage-2026-11-18](../quality/test-ignore-triage-2026-11-18.md)。
- 新增 `#[sqlx::test]` 文件时必须手动加 `sqlx_dsn_guard!();`；后续可考虑宏化封装。
