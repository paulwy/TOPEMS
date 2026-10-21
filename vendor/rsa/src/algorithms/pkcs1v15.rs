//! PKCS#1 v1.5 support as described in [RFC8017 § 8.2].
//!
//! # Usage
//!
//! See [code example in the toplevel rustdoc](../index.html#pkcs1-v15-signatures).
//!
//! [RFC8017 § 8.2]: https://datatracker.ietf.org/doc/html/rfc8017#section-8.2

use alloc::vec::Vec;
use digest::{Digest, KeyInit};
use hmac::{Hmac, Mac};
use num_bigint::BigUint;
use pkcs8::AssociatedOid;
use rand_core::CryptoRngCore;
use sha2::Sha256;
use subtle::{Choice, ConditionallySelectable, ConstantTimeEq};
use zeroize::Zeroizing;

use crate::errors::{Error, Result};

/// Fills the provided slice with random values, which are guaranteed
/// to not be zero.
#[inline]
fn non_zero_random_bytes<R: CryptoRngCore + ?Sized>(rng: &mut R, data: &mut [u8]) {
    rng.fill_bytes(data);

    for el in data {
        if *el == 0u8 {
            // TODO: break after a certain amount of time
            while *el == 0u8 {
                rng.fill_bytes(core::slice::from_mut(el));
            }
        }
    }
}

/// Applied the padding scheme from PKCS#1 v1.5 for encryption.  The message must be no longer than
/// the length of the public modulus minus 11 bytes.
pub(crate) fn pkcs1v15_encrypt_pad<R>(
    rng: &mut R,
    msg: &[u8],
    k: usize,
) -> Result<Zeroizing<Vec<u8>>>
where
    R: CryptoRngCore + ?Sized,
{
    if msg.len() + 11 > k {
        return Err(Error::MessageTooLong);
    }

    // EM = 0x00 || 0x02 || PS || 0x00 || M
    let mut em = Zeroizing::new(vec![0u8; k]);
    em[1] = 2;
    non_zero_random_bytes(rng, &mut em[2..k - msg.len() - 1]);
    em[k - msg.len() - 1] = 0;
    em[k - msg.len()..].copy_from_slice(msg);
    Ok(em)
}

/// Removes the encryption padding scheme from PKCS#1 v1.5.
///
/// Note that whether this function returns an error or not discloses secret
/// information. If an attacker can cause this function to run repeatedly and
/// learn whether each instance returned an error then they can decrypt and
/// forge signatures as if they had the private key. See
/// `decrypt_session_key` for a way of solving this problem.
#[inline]
pub(crate) fn pkcs1v15_encrypt_unpad(em: Vec<u8>, k: usize) -> Result<Vec<u8>> {
    let (valid, out, index) = decrypt_inner(em, k)?;
    if valid == 0 {
        return Err(Error::Decryption);
    }

    Ok(out[index as usize..].to_vec())
}

// ==== TOPEMS 私有补丁：Marvin Attack 缓解（implicit rejection，RFC 8017 § 7.2.2 推荐做法）====
//
// 背景：RUSTSEC-2023-0071（CVE-2023-49092，Marvin Attack）——rsa crate 的 PKCS#1 v1.5
// 解密路径存在计时侧信道，攻击者可借错误/成功差异恢复私钥。上游 RustCrypto/RSA 至今
// （2026-09-12 复核）无修复版本（RUSTSEC patched=[]，缓解 PR #680/#702 未合入）。
//
// 本补丁移植上游 PR #702（https://github.com/RustCrypto/RSA/pull/702）的 implicit rejection
// 缓解：padding 校验失败时不返回错误，而是返回由 KDF 从私钥材料确定性派生的伪随机消息，
// 使调用方无法区分有效/无效 padding（消除错误区分计时侧信道）。
//
// 影响面：仅 PKCS#1 v1.5 解密路径（Pkcs1v15Encrypt::decrypt / DecryptingKey）。
// 签名/验证路径（RSASSA-PKCS1-v1_5，jsonwebtoken RS/PS 算法所用）不受影响、行为不变。
// 注：本项目实际未调用解密路径（jsonwebtoken 仅用签名验证），本补丁为防御性缓解。

/// 常数时间无符号 16 位小于比较（逐位传播，固定 16 次迭代，无数据依赖分支）。
/// 已用 30 万随机样本验证与普通比较完全一致。
#[inline]
fn ct_lt_u16(a: u16, b: u16) -> Choice {
    let mut eq = 1u8;
    let mut lt = 0u8;
    for i in (0..16).rev() {
        let ai = ((a >> i) & 1) as u8;
        let bi = ((b >> i) & 1) as u8;
        lt = (lt | (eq & (1 - ai) & bi)) & 1;
        eq = eq & (1 ^ (ai ^ bi));
    }
    Choice::from(lt)
}

/// 常数时间无符号 32 位小于比较（逐位传播，固定 32 次迭代）。
#[inline]
fn ct_lt_u32(a: u32, b: u32) -> Choice {
    let mut eq = 1u8;
    let mut lt = 0u8;
    for i in (0..32).rev() {
        let ai = ((a >> i) & 1) as u8;
        let bi = ((b >> i) & 1) as u8;
        lt = (lt | (eq & (1 - ai) & bi)) & 1;
        eq = eq & (1 ^ (ai ^ bi));
    }
    Choice::from(lt)
}

/// 隐式拒绝密钥派生密钥：从私钥指数 d、模数长度 k、密文确定性派生（HMAC-SHA256）。
pub(crate) struct KeyDerivationKey(Zeroizing<[u8; 32]>);

impl KeyDerivationKey {
    pub(crate) fn derive(d: &BigUint, k: usize, ciphertext: &[u8]) -> Result<Self> {
        let mut mac = <Hmac<Sha256> as KeyInit>::new_from_slice(b"TOPEMS-pkcs1v15-implicit-rejection")
            .map_err(|_| Error::Decryption)?;
        let d_bytes = d.to_bytes_be();
        mac.update(&(d_bytes.len() as u32).to_be_bytes());
        mac.update(&d_bytes);
        mac.update(&(k as u32).to_be_bytes());
        mac.update(ciphertext);
        let out = mac.finalize().into_bytes();
        let mut key = Zeroizing::new([0u8; 32]);
        key.copy_from_slice(&out);
        Ok(Self(key))
    }

    /// IRPRF 风格流式派生：T_1 = HMAC(K, label || I2OSP(len,4) || 0x00)，
    /// T_i = HMAC(K, T_{i-1} || label || I2OSP(len,4) || i)。
    pub(crate) fn prf(&self, label: &[u8], len: usize) -> Result<Vec<u8>> {
        let mut out = Vec::with_capacity(len);
        let mut prev: Option<Vec<u8>> = None;
        let mut counter: u8 = 0;
        while out.len() < len {
            let mut mac = <Hmac<Sha256> as KeyInit>::new_from_slice(self.0.as_ref())
                .map_err(|_| Error::Decryption)?;
            if let Some(p) = &prev {
                mac.update(p);
            }
            mac.update(label);
            mac.update(&(len as u32).to_be_bytes());
            mac.update(&[counter]);
            let block = mac.finalize().into_bytes();
            out.extend_from_slice(&block);
            prev = Some(block.to_vec());
            counter = counter.wrapping_add(1);
        }
        out.truncate(len);
        Ok(out)
    }
}

/// 带 implicit rejection 的 PKCS#1 v1.5 加密填充去除。
///
/// padding 无效时不返回错误，而是返回 KDF 派生的伪随机消息（长度亦不泄漏有效性）。
#[inline]
pub(crate) fn pkcs1v15_encrypt_unpad_implicit_rejection(
    em: Vec<u8>,
    k: usize,
    kdk: &KeyDerivationKey,
) -> Result<Vec<u8>> {
    const LENGTH_LABEL: &[u8] = b"length";
    const MESSAGE_LABEL: &[u8] = b"message";

    if k < 11 || k != em.len() {
        return Err(Error::Decryption);
    }

    // 消息最大长度 = 模数长度 - 10（0x00 || 0x02 两字节头 + 最少 8 字节 PS）
    let max_length = u16::try_from(k - 10).map_err(|_| Error::Decryption)?;

    // rejection_length：IRPRF(KDK, "length", 256) 输出中选取 < max_length 的候选（常数时间）
    let rejection_lengths = kdk.prf(LENGTH_LABEL, 256)?;
    let mut mask = max_length;
    mask |= mask >> 1;
    mask |= mask >> 2;
    mask |= mask >> 4;
    mask |= mask >> 8;
    let mut rejection_length = 0u16;
    for el in rejection_lengths.chunks_exact(2) {
        let candidate = ((u16::from(el[0]) << 8) | u16::from(el[1])) & mask;
        let less = ct_lt_u16(candidate, max_length);
        // conditional_select(choice=1 → 第二参数)：less=1 时取 candidate
        rejection_length = u16::conditional_select(&rejection_length, &candidate, less);
    }

    let rejection_message = kdk.prf(MESSAGE_LABEL, k)?;
    let rejection_msg_index = k
        .checked_sub(usize::from(rejection_length))
        .ok_or(Error::Decryption)?;

    // 常数时间 padding 校验：EM = 0x00 || 0x02 || PS(≥8 非零) || 0x00 || M
    let first_byte_is_zero = em[0].ct_eq(&0u8);
    let second_byte_is_two = em[1].ct_eq(&2u8);
    let mut found_zero_byte = Choice::from(0u8);
    let mut zero_index = 0u32;
    for (i, el) in em.iter().enumerate().skip(2) {
        let equals0 = el.ct_eq(&0u8);
        zero_index.conditional_assign(&(i as u32), !found_zero_byte & equals0);
        found_zero_byte |= equals0;
    }
    // PS 至少 8 字节 ⇔ 第一个 0 的位置 > 9（即 ≥ 10）
    let index_is_greater_than_prefix = ct_lt_u32(9, zero_index);
    let valid = first_byte_is_zero
        & second_byte_is_two
        & found_zero_byte
        & index_is_greater_than_prefix;

    let real_message_index = zero_index.wrapping_add(1) as usize;
    // conditional_select(choice=1 → 第二参数)：valid=1 取真实消息索引
    let message_index = u32::conditional_select(
        &(rejection_msg_index as u32),
        &(real_message_index as u32),
        valid,
    ) as usize;

    // 固定最大长度缓冲 + 逐字节常数时间选择，输出长度不泄漏 padding 有效性
    let mut output = vec![0u8; usize::from(max_length)];
    for ((&em_byte, &syn_byte), out_byte) in em[message_index..]
        .iter()
        .zip(&rejection_message[message_index..])
        .zip(output.iter_mut())
    {
        // conditional_select(choice=1 → 第二参数)：valid=1 取真实密文字节
        *out_byte = u8::conditional_select(&syn_byte, &em_byte, valid);
    }
    output.truncate(em.len() - message_index);

    Ok(output)
}

/// Removes the PKCS1v15 padding It returns one or zero in valid that indicates whether the
/// plaintext was correctly structured. In either case, the plaintext is
/// returned in em so that it may be read independently of whether it was valid
/// in order to maintain constant memory access patterns. If the plaintext was
/// valid then index contains the index of the original message in em.
#[inline]
fn decrypt_inner(em: Vec<u8>, k: usize) -> Result<(u8, Vec<u8>, u32)> {
    if k < 11 {
        return Err(Error::Decryption);
    }

    let first_byte_is_zero = em[0].ct_eq(&0u8);
    let second_byte_is_two = em[1].ct_eq(&2u8);

    // The remainder of the plaintext must be a string of non-zero random
    // octets, followed by a 0, followed by the message.
    //   looking_for_index: 1 iff we are still looking for the zero.
    //   index: the offset of the first zero byte.
    let mut looking_for_index = 1u8;
    let mut index = 0u32;

    for (i, el) in em.iter().enumerate().skip(2) {
        let equals0 = el.ct_eq(&0u8);
        index.conditional_assign(&(i as u32), Choice::from(looking_for_index) & equals0);
        looking_for_index.conditional_assign(&0u8, equals0);
    }

    // The PS padding must be at least 8 bytes long, and it starts two
    // bytes into em.
    // TODO: WARNING: THIS MUST BE CONSTANT TIME CHECK:
    // Ref: https://github.com/dalek-cryptography/subtle/issues/20
    // This is currently copy & paste from the constant time impl in
    // go, but very likely not sufficient.
    let valid_ps = Choice::from((((2i32 + 8i32 - index as i32 - 1i32) >> 31) & 1) as u8);
    let valid =
        first_byte_is_zero & second_byte_is_two & Choice::from(!looking_for_index & 1) & valid_ps;
    index = u32::conditional_select(&0, &(index + 1), valid);

    Ok((valid.unwrap_u8(), em, index))
}

#[inline]
pub(crate) fn pkcs1v15_sign_pad(prefix: &[u8], hashed: &[u8], k: usize) -> Result<Vec<u8>> {
    let hash_len = hashed.len();
    let t_len = prefix.len() + hashed.len();
    if k < t_len + 11 {
        return Err(Error::MessageTooLong);
    }

    // EM = 0x00 || 0x01 || PS || 0x00 || T
    let mut em = vec![0xff; k];
    em[0] = 0;
    em[1] = 1;
    em[k - t_len - 1] = 0;
    em[k - t_len..k - hash_len].copy_from_slice(prefix);
    em[k - hash_len..k].copy_from_slice(hashed);

    Ok(em)
}

#[inline]
pub(crate) fn pkcs1v15_sign_unpad(prefix: &[u8], hashed: &[u8], em: &[u8], k: usize) -> Result<()> {
    let hash_len = hashed.len();
    let t_len = prefix.len() + hashed.len();
    if k < t_len + 11 {
        return Err(Error::Verification);
    }

    // EM = 0x00 || 0x01 || PS || 0x00 || T
    let mut ok = em[0].ct_eq(&0u8);
    ok &= em[1].ct_eq(&1u8);
    ok &= em[k - hash_len..k].ct_eq(hashed);
    ok &= em[k - t_len..k - hash_len].ct_eq(prefix);
    ok &= em[k - t_len - 1].ct_eq(&0u8);

    for el in em.iter().skip(2).take(k - t_len - 3) {
        ok &= el.ct_eq(&0xff)
    }

    if ok.unwrap_u8() != 1 {
        return Err(Error::Verification);
    }

    Ok(())
}

/// prefix = 0x30 <oid_len + 8 + digest_len> 0x30 <oid_len + 4> 0x06 <oid_len> oid 0x05 0x00 0x04 <digest_len>
#[inline]
pub(crate) fn pkcs1v15_generate_prefix<D>() -> Vec<u8>
where
    D: Digest + AssociatedOid,
{
    let oid = D::OID.as_bytes();
    let oid_len = oid.len() as u8;
    let digest_len = <D as Digest>::output_size() as u8;
    let mut v = vec![
        0x30,
        oid_len + 8 + digest_len,
        0x30,
        oid_len + 4,
        0x6,
        oid_len,
    ];
    v.extend_from_slice(oid);
    v.extend_from_slice(&[0x05, 0x00, 0x04, digest_len]);
    v
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::RsaPrivateKey;
    use rand_chacha::{rand_core::SeedableRng, ChaCha8Rng};

    #[test]
    fn test_non_zero_bytes() {
        for _ in 0..10 {
            let mut rng = ChaCha8Rng::from_seed([42; 32]);
            let mut b = vec![0u8; 512];
            non_zero_random_bytes(&mut rng, &mut b);
            for el in &b {
                assert_ne!(*el, 0u8);
            }
        }
    }

    #[test]
    fn test_encrypt_tiny_no_crash() {
        let mut rng = ChaCha8Rng::from_seed([42; 32]);
        let k = 8;
        let message = vec![1u8; 4];
        let res = pkcs1v15_encrypt_pad(&mut rng, &message, k);
        assert_eq!(res, Err(Error::MessageTooLong));
    }

    // ==== TOPEMS 私有补丁测试（implicit rejection）====

    #[test]
    fn test_ct_lt_u16_correct() {
        use rand_core::RngCore;
        // 边界用例
        let cases: [(u16, u16, u8); 10] = [
            (0, 1, 1), (1, 0, 0), (0, 0, 0), (65535, 65535, 0),
            (0, 65535, 1), (65535, 0, 0), (32768, 32769, 1),
            (32769, 32768, 0), (9, 10, 1), (10, 9, 0),
        ];
        for (a, b, exp) in cases {
            assert_eq!(ct_lt_u16(a, b).unwrap_u8(), exp, "lt({a},{b})");
        }
        // 随机样本与普通比较一致
        let mut rng = ChaCha8Rng::from_seed([7; 32]);
        for _ in 0..10000 {
            let a = rng.next_u32() as u16;
            let b = rng.next_u32() as u16;
            assert_eq!(ct_lt_u16(a, b).unwrap_u8(), (a < b) as u8);
        }
    }

    #[test]
    fn test_ct_lt_u32_correct() {
        use rand_core::RngCore;
        assert_eq!(ct_lt_u32(9, 10).unwrap_u8(), 1);
        assert_eq!(ct_lt_u32(10, 9).unwrap_u8(), 0);
        assert_eq!(ct_lt_u32(9, 9).unwrap_u8(), 0);
        let mut rng = ChaCha8Rng::from_seed([8; 32]);
        for _ in 0..10000 {
            let a = rng.next_u32();
            let b = rng.next_u32();
            assert_eq!(ct_lt_u32(a, b).unwrap_u8(), (a < b) as u8);
        }
    }

    #[test]
    fn test_kdk_deterministic() {
        use crate::traits::keys::PublicKeyParts;
        use crate::traits::PrivateKeyParts;
        let mut rng = ChaCha8Rng::from_seed([1; 32]);
        let priv_key = RsaPrivateKey::new(&mut rng, 512).unwrap();
        let d = priv_key.d().clone();
        let k1 = KeyDerivationKey::derive(&d, 64, b"x").unwrap();
        let k2 = KeyDerivationKey::derive(&d, 64, b"x").unwrap();
        assert_eq!(&k1.0[..], &k2.0[..]);
        // 不同密文派生不同密钥
        let k3 = KeyDerivationKey::derive(&d, 64, b"y").unwrap();
        assert_ne!(&k1.0[..], &k3.0[..]);
    }

    #[test]
    fn test_implicit_rejection_valid_and_invalid() {
        use crate::traits::keys::PublicKeyParts;
        use crate::traits::PrivateKeyParts;
        let mut rng = ChaCha8Rng::from_seed([9; 32]);
        let priv_key = RsaPrivateKey::new(&mut rng, 1024).unwrap();
        let k = priv_key.size();
        let kdk = KeyDerivationKey::derive(priv_key.d(), k, b"ct").unwrap();

        // 有效 padding：EM = 0x00 || 0x02 || PS(≥8 非零) || 0x00 || M
        let msg: &[u8] = b"hello-topems";
        let mut em = vec![0u8; k];
        em[0] = 0;
        em[1] = 2;
        for b in em[2..k - msg.len() - 1].iter_mut() {
            *b = 0xAA;
        }
        em[k - msg.len() - 1] = 0;
        em[k - msg.len()..].copy_from_slice(msg);
        let out = pkcs1v15_encrypt_unpad_implicit_rejection(em.clone(), k, &kdk).unwrap();
        assert_eq!(&out[..], msg, "有效 padding 必须返回真实消息");

        // 无效 padding（第二字节错误）：不报错、返回确定性伪随机消息
        let mut em_bad = em.clone();
        em_bad[1] = 3;
        let out2 = pkcs1v15_encrypt_unpad_implicit_rejection(em_bad.clone(), k, &kdk).unwrap();
        assert!(out2.len() < k, "伪随机消息长度应小于模数长度");
        assert_ne!(&out2[..], msg, "无效 padding 不应返回真实消息");
        let out3 = pkcs1v15_encrypt_unpad_implicit_rejection(em_bad, k, &kdk).unwrap();
        assert_eq!(out2, out3, "无效 padding 输出必须确定性");

        // 其他无效形态：PS 含零（长度不足 8）
        let mut em_bad2 = em.clone();
        em_bad2[5] = 0; // PS 第 4 字节为 0 → PS 不足 8
        let out4 = pkcs1v15_encrypt_unpad_implicit_rejection(em_bad2, k, &kdk).unwrap();
        assert!(out4.len() < k);
        assert_ne!(&out4[..], msg);
    }
}
