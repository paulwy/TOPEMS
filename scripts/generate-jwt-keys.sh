#!/usr/bin/env bash
# 生成 JWT RS256 非对称密钥对（RSA 2048 位）。
#
# 输出：
#   config/keys/jwt-private.pem  (PKCS#8 私钥，权限 600)
#   config/keys/jwt-public.pem   (SubjectPublicKeyInfo 公钥)
#
# 幂等：若两个文件均已存在则跳过生成，除非通过 -f 强制重新生成。
#
# 用法：
#   ./scripts/generate-jwt-keys.sh        # 不存在则生成
#   ./scripts/generate-jwt-keys.sh -f     # 强制覆盖重新生成
#
# 路径可通过环境变量覆盖：
#   JWT_PRIVATE_KEY_PATH / JWT_PUBLIC_KEY_PATH
set -euo pipefail

force=0
while getopts ":f" opt; do
  case "${opt}" in
    f) force=1 ;;
    \?)
      echo "用法: $0 [-f]" >&2
      exit 2
      ;;
  esac
done

# 从脚本位置推导仓库根目录
script_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
repo_root="$(cd "${script_dir}/.." && pwd)"

private_key_path="${JWT_PRIVATE_KEY_PATH:-${repo_root}/config/keys/jwt-private.pem}"
public_key_path="${JWT_PUBLIC_KEY_PATH:-${repo_root}/config/keys/jwt-public.pem}"
private_key_dir="$(dirname "${private_key_path}")"

if [[ "${force}" -eq 0 \
  && -f "${private_key_path}" \
  && -f "${public_key_path}" ]]; then
  echo "[generate-jwt-keys] 密钥对已存在，跳过生成："
  echo "  私钥: ${private_key_path}"
  echo "  公钥: ${public_key_path}"
  echo "  如需重新生成，请使用: $0 -f"
  exit 0
fi

if ! command -v openssl >/dev/null 2>&1; then
  echo "[generate-jwt-keys] 错误：未找到 openssl 命令，请先安装 openssl。" >&2
  exit 1
fi

mkdir -p "${private_key_dir}"

# 使用临时文件生成私钥，再原子安装到目标路径并设置权限
tmp_priv="$(mktemp)"
trap 'rm -f "${tmp_priv}"' EXIT

openssl genpkey -algorithm RSA -pkeyopt rsa_keygen_bits:2048 -out "${tmp_priv}"
install -m 600 "${tmp_priv}" "${private_key_path}"

# 导出公钥（PEM SubjectPublicKeyInfo 格式，jsonwebtoken DecodingKey 可直接解析）
openssl rsa -in "${private_key_path}" -pubout -out "${public_key_path}" 2>/dev/null

echo "[generate-jwt-keys] JWT RS256 密钥对已生成："
echo "  私钥: ${private_key_path} (chmod 600)"
echo "  公钥: ${public_key_path}"
echo "  注意：私钥禁止提交 git（.gitignore 已排除 config/keys/*.pem）。"
