//! 初始管理员密码工具（provision-env.sh `--with-admin` 专用）
//!
//! 一致性保证：本工具**直接调用**登录校验使用的
//! `modules::iam::auth::verify_password`（同一 crate、同一函数）做正向与反向自校验，
//! 而不是另写一套 bcrypt 调用。生成成功后若登录校验函数不接受该哈希，直接失败。
//!
//! 安全约束：
//! - 密码只从 stdin 读取，或由 `--generate` 在内存中生成；**绝不走 argv**。
//! - 哈希/密码只写入 0600 文件（`--out` / `--password-out`）；**绝不写 stdout**。
//! - 退出前不打印任何密码或哈希内容；仅打印文件路径与校验结果到 stderr。
//!
//! 用法：
//!   topems-admin-pass hash --out <hash-file> [--password-out <password-file>]
//!   topems-admin-pass hash --generate --out <hash-file> [--password-out <password-file>]
//!   topems-admin-pass verify --hash-file <hash-file>   # 密码从 stdin 读
//!
//! 退出码：0 成功 / 密码匹配；1 密码不匹配；2 用法或 IO/密码策略错误。

use std::env;
use std::fs::{self, OpenOptions};
use std::io::{self, Read, Write};
use std::os::unix::fs::{OpenOptionsExt, PermissionsExt};

use topems_unified_core::modules::iam::auth::verify_password;

/// 产品代码实际校验下限（见 `iam/user/crud.rs` 与 `iam/user/profile_ext.rs`）。
const MIN_LENGTH: usize = 6;
/// 产品密码策略声明的上限（`GET /iam/auth/password-policy`）。
const MAX_LENGTH: usize = 64;
/// 自动生成密码长度（同时满足声明的 8 位下限与大小写/数字建议）。
const GENERATED_LENGTH: usize = 20;

fn fail(message: &str) -> ! {
    eprintln!("topems-admin-pass: {message}");
    std::process::exit(2)
}

struct Options {
    mode: String,
    generate: bool,
    out: Option<String>,
    password_out: Option<String>,
    hash_file: Option<String>,
}

fn parse_args() -> Options {
    let mut args = env::args().skip(1);
    let mode = args
        .next()
        .unwrap_or_else(|| fail("用法：topems-admin-pass hash|verify [...]"));

    let mut opts = Options {
        mode,
        generate: false,
        out: None,
        password_out: None,
        hash_file: None,
    };

    while let Some(arg) = args.next() {
        match arg.as_str() {
            "--generate" => opts.generate = true,
            "--out" => {
                opts.out = Some(args.next().unwrap_or_else(|| fail("--out 缺少文件路径")));
            }
            "--password-out" => {
                opts.password_out = Some(
                    args.next()
                        .unwrap_or_else(|| fail("--password-out 缺少文件路径")),
                );
            }
            "--hash-file" => {
                opts.hash_file = Some(
                    args.next()
                        .unwrap_or_else(|| fail("--hash-file 缺少文件路径")),
                );
            }
            other => fail(&format!("未知参数：{other}")),
        }
    }

    opts
}

fn read_password_from_stdin() -> String {
    let mut buffer = String::new();
    if let Err(error) = io::stdin().read_to_string(&mut buffer) {
        fail(&format!("读取 stdin 失败：{error}"));
    }
    if buffer.ends_with('\n') {
        buffer.pop();
        if buffer.ends_with('\r') {
            buffer.pop();
        }
    }
    buffer
}

/// 与产品校验规则一致：非空、6–64 字节（Rust `len()` 与代码中的 `password.len()` 同口径）。
fn validate_password(password: &str) -> Result<(), String> {
    if password.is_empty() {
        return Err("密码为空".to_string());
    }
    if password.len() < MIN_LENGTH {
        return Err(format!("密码长度不足 {MIN_LENGTH} 位（产品代码校验规则）"));
    }
    if password.len() > MAX_LENGTH {
        return Err(format!("密码长度超过 {MAX_LENGTH} 字节"));
    }
    Ok(())
}

fn write_secret(path: &str, content: &str) {
    let mut file = OpenOptions::new()
        .write(true)
        .create(true)
        .truncate(true)
        .mode(0o600)
        .open(path)
        .unwrap_or_else(|error| fail(&format!("写入 {path} 失败：{error}")));
    file.write_all(content.as_bytes())
        .unwrap_or_else(|error| fail(&format!("写入 {path} 失败：{error}")));
    file.write_all(b"\n")
        .unwrap_or_else(|error| fail(&format!("写入 {path} 失败：{error}")));
    fs::set_permissions(path, fs::Permissions::from_mode(0o600))
        .unwrap_or_else(|error| fail(&format!("设置 {path} 权限失败：{error}")));
}

fn generate_password() -> String {
    use rand::RngExt;

    const UPPER: &[u8] = b"ABCDEFGHIJKLMNOPQRSTUVWXYZ";
    const LOWER: &[u8] = b"abcdefghijklmnopqrstuvwxyz";
    const DIGIT: &[u8] = b"0123456789";
    const ALNUM: &[u8] = b"ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";

    let mut rng = rand::rng();
    let mut chars: Vec<char> = Vec::with_capacity(GENERATED_LENGTH);

    for _ in 0..6 {
        let index = rng.random_range(0..UPPER.len());
        chars.push(char::from(*UPPER.get(index).unwrap_or(&b'A')));
    }
    for _ in 0..6 {
        let index = rng.random_range(0..LOWER.len());
        chars.push(char::from(*LOWER.get(index).unwrap_or(&b'a')));
    }
    for _ in 0..4 {
        let index = rng.random_range(0..DIGIT.len());
        chars.push(char::from(*DIGIT.get(index).unwrap_or(&b'0')));
    }
    while chars.len() < GENERATED_LENGTH {
        let index = rng.random_range(0..ALNUM.len());
        chars.push(char::from(*ALNUM.get(index).unwrap_or(&b'A')));
    }

    // 手动 Fisher–Yates，避免字符类固定位置可预测
    let mut i = chars.len();
    while i > 1 {
        i -= 1;
        let j = rng.random_range(0..=i);
        chars.swap(i, j);
    }

    chars.into_iter().collect()
}

fn run_hash(opts: &Options) {
    let password = if opts.generate {
        generate_password()
    } else {
        read_password_from_stdin()
    };
    validate_password(&password).unwrap_or_else(|error| fail(&error));

    let hash = bcrypt::hash(&password, bcrypt::DEFAULT_COST)
        .unwrap_or_else(|error| fail(&format!("bcrypt 生成失败：{error}")));

    // 正向自校验：与登录校验同一函数
    if !verify_password(&password, &hash) {
        fail("自校验失败：verify_password 不接受生成的哈希");
    }
    // 反向自校验：错误密码必须被拒
    let mut wrong = password.clone();
    wrong.push('x');
    if verify_password(&wrong, &hash) {
        fail("自校验失败：verify_password 接受了错误密码");
    }

    let out = opts
        .out
        .as_deref()
        .unwrap_or_else(|| fail("hash 模式必须指定 --out <hash-file>"));
    write_secret(out, &hash);
    if let Some(password_out) = opts.password_out.as_deref() {
        write_secret(password_out, &password);
    }
    eprintln!("OK 哈希已写入 0600 文件；verify_password 正/反向自校验通过");
}

fn run_verify(opts: &Options) {
    let hash_file = opts
        .hash_file
        .as_deref()
        .unwrap_or_else(|| fail("verify 模式必须指定 --hash-file <hash-file>"));
    let hash = fs::read_to_string(hash_file)
        .unwrap_or_else(|error| fail(&format!("读取 {hash_file} 失败：{error}")));
    let hash = hash.trim();
    let password = read_password_from_stdin();
    if verify_password(&password, hash) {
        std::process::exit(0);
    }
    std::process::exit(1);
}

fn main() {
    let opts = parse_args();
    match opts.mode.as_str() {
        "hash" => run_hash(&opts),
        "verify" => run_verify(&opts),
        other => fail(&format!("未知模式：{other}（仅支持 hash|verify）")),
    }
}
