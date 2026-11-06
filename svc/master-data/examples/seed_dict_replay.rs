//! 字典种子回灌（运维一次性工具）
//!
//! 用法：
//! ```bash
//! DATABASE_URL='postgres://...' DICT_REPLAY_CONFIRM=yes \
//!   cargo run -p topems-master-data --example seed_dict_replay
//! ```
//!
//! 安全阀：必须显式设置 `DICT_REPLAY_CONFIRM=yes`；否则拒绝执行。
//! 函数内部自行开启系统通道（`app.rls_system='on'`）并固定写租户
//! `00000000-0000-0000-0000-000000000001`，**只合并、不清表**，
//! 4 个 legacy 类及其 items 不会被删除。

use std::env;

use sqlx::postgres::PgPoolOptions;

#[tokio::main]
async fn main() -> Result<(), Box<dyn std::error::Error>> {
    if env::var("DICT_REPLAY_CONFIRM").as_deref() != Ok("yes") {
        eprintln!("拒绝执行：请设置 DICT_REPLAY_CONFIRM=yes 以确认本次回灌");
        std::process::exit(2);
    }

    let dsn = env::var("DATABASE_URL")?;
    let pool = PgPoolOptions::new()
        .max_connections(1)
        .connect(&dsn)
        .await?;

    topems_master_data::modules::dict::seed::seed_dict_data(&pool).await?;

    // 回灌后自查（系统通道；只读，不改数据）
    let mut tx = pool.begin().await?;
    sqlx::query("SELECT set_config('app.rls_system', 'on', true)")
        .execute(&mut *tx)
        .await?;

    let (all_types, system_types, legacy_types, items): (i64, i64, i64, i64) = sqlx::query_as(
        r#"SELECT
             (SELECT COUNT(*) FROM public.core_dict_types WHERE deleted_at IS NULL),
             (SELECT COUNT(*) FROM public.core_dict_types WHERE deleted_at IS NULL AND category = 'system'),
             (SELECT COUNT(*) FROM public.core_dict_types
                WHERE deleted_at IS NULL
                  AND code IN ('department_type','education','marital_status','position_level')),
             (SELECT COUNT(*) FROM public.core_dict_items WHERE deleted_at IS NULL)"#,
    )
    .fetch_one(&mut *tx)
    .await?;

    println!(
        "dict replay done: all_types={all_types} system_category={system_types} legacy={legacy_types} items={items}"
    );

    let legacy_rows: Vec<(String, i64)> = sqlx::query_as(
        r#"SELECT t.code, COUNT(i.id)
           FROM public.core_dict_types t
           LEFT JOIN public.core_dict_items i ON i.dict_type_id = t.id AND i.deleted_at IS NULL
           WHERE t.deleted_at IS NULL
             AND t.code IN ('department_type','education','marital_status','position_level')
           GROUP BY t.code ORDER BY t.code"#,
    )
    .fetch_all(&mut *tx)
    .await?;
    for (code, count) in legacy_rows {
        println!("legacy type {code}: {count} items");
    }

    tx.commit().await?;
    Ok(())
}
