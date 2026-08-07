use aes_gcm::{
    aead::{Aead, AeadCore, KeyInit, OsRng},
    Aes256Gcm, Key, Nonce,
};
use base64::{engine::general_purpose::STANDARD, Engine};
use hmac::{Hmac, Mac};
use serde::{Deserialize, Serialize};
use sha2::Sha256;
use std::collections::HashMap;
use thiserror::Error;

pub type HmacSha256 = Hmac<Sha256>;

#[derive(Debug, Error)]
pub enum EncryptionError {
    #[error("Encryption failed: {0}")]
    EncryptionFailed(String),
    #[error("Decryption failed: {0}")]
    DecryptionFailed(String),
    #[error("Invalid key: {0}")]
    InvalidKey(String),
    #[error("Key not found: version {0}")]
    KeyNotFound(u32),
    #[error("Invalid base64: {0}")]
    InvalidBase64(String),
    #[error("Invalid UTF-8: {0}")]
    InvalidUtf8(String),
    #[error("Ciphertext too short")]
    CiphertextTooShort,
}

pub type EncryptionResult<T> = Result<T, EncryptionError>;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct EncryptedField {
    pub value: String,
    pub algorithm: String,
    pub key_version: u32,
    pub nonce: String,
}

impl EncryptedField {
    pub fn new(value: String, key_version: u32, nonce: String) -> Self {
        Self {
            value,
            algorithm: "aes-256-gcm".to_string(),
            key_version,
            nonce,
        }
    }

    pub fn is_encrypted(&self) -> bool {
        self.algorithm == "aes-256-gcm"
    }
}

pub struct KeyManager {
    keys: HashMap<u32, [u8; 32]>,
    current_version: u32,
}

impl Clone for KeyManager {
    fn clone(&self) -> Self {
        Self {
            keys: self.keys.clone(),
            current_version: self.current_version,
        }
    }
}

impl KeyManager {
    pub fn new(primary_key: &[u8; 32]) -> Self {
        let mut keys = HashMap::new();
        keys.insert(1, *primary_key);
        Self {
            keys,
            current_version: 1,
        }
    }

    pub fn from_base64_key(key_b64: &str) -> EncryptionResult<Self> {
        let key_bytes = STANDARD
            .decode(key_b64)
            .map_err(|e| EncryptionError::InvalidBase64(e.to_string()))?;

        if key_bytes.len() != 32 {
            return Err(EncryptionError::InvalidKey(format!(
                "Key must be 32 bytes, got {}",
                key_bytes.len()
            )));
        }

        let mut key = [0u8; 32];
        key.copy_from_slice(&key_bytes);
        Ok(Self::new(&key))
    }

    pub fn add_key(&mut self, version: u32, key: &[u8; 32]) {
        self.keys.insert(version, *key);
    }

    pub fn set_current_version(&mut self, version: u32) -> EncryptionResult<()> {
        if !self.keys.contains_key(&version) {
            return Err(EncryptionError::KeyNotFound(version));
        }
        self.current_version = version;
        Ok(())
    }

    pub fn current_version(&self) -> u32 {
        self.current_version
    }

    pub fn get_key(&self, version: u32) -> EncryptionResult<&[u8; 32]> {
        self.keys
            .get(&version)
            .ok_or(EncryptionError::KeyNotFound(version))
    }

    pub fn current_key(&self) -> EncryptionResult<&[u8; 32]> {
        self.keys
            .get(&self.current_version)
            .ok_or(EncryptionError::KeyNotFound(self.current_version))
    }

    pub fn rotate_key(&mut self, new_key: &[u8; 32]) -> u32 {
        let new_version = self.current_version + 1;
        self.keys.insert(new_version, *new_key);
        self.current_version = new_version;
        new_version
    }

    pub fn has_key_version(&self, version: u32) -> bool {
        self.keys.contains_key(&version)
    }
}

#[derive(Clone)]
pub struct FieldEncryptionService {
    key_manager: KeyManager,
}

impl FieldEncryptionService {
    pub fn new(key_manager: KeyManager) -> Self {
        Self { key_manager }
    }

    pub fn from_base64_key(key_b64: &str) -> EncryptionResult<Self> {
        let key_manager = KeyManager::from_base64_key(key_b64)?;
        Ok(Self::new(key_manager))
    }

    pub fn encrypt(&self, plaintext: &str) -> EncryptionResult<EncryptedField> {
        let key = self.key_manager.current_key()?;
        let cipher = Aes256Gcm::new(Key::<Aes256Gcm>::from_slice(key));
        let nonce = Aes256Gcm::generate_nonce(&mut OsRng);
        let ciphertext = cipher
            .encrypt(&nonce, plaintext.as_bytes())
            .map_err(|e| EncryptionError::EncryptionFailed(e.to_string()))?;

        Ok(EncryptedField::new(
            STANDARD.encode(&ciphertext),
            self.key_manager.current_version(),
            STANDARD.encode(nonce),
        ))
    }

    pub fn encrypt_to_string(&self, plaintext: &str) -> EncryptionResult<String> {
        let field = self.encrypt(plaintext)?;
        serde_json::to_string(&field)
            .map_err(|e| EncryptionError::EncryptionFailed(format!("Serialization failed: {}", e)))
    }

    pub fn decrypt(&self, field: &EncryptedField) -> EncryptionResult<String> {
        let key = self.key_manager.get_key(field.key_version)?;
        let cipher = Aes256Gcm::new(Key::<Aes256Gcm>::from_slice(key));

        let nonce_bytes = STANDARD
            .decode(&field.nonce)
            .map_err(|e| EncryptionError::InvalidBase64(e.to_string()))?;
        let nonce = Nonce::from_slice(&nonce_bytes);

        let ciphertext = STANDARD
            .decode(&field.value)
            .map_err(|e| EncryptionError::InvalidBase64(e.to_string()))?;

        let plaintext = cipher
            .decrypt(nonce, ciphertext.as_ref())
            .map_err(|e| EncryptionError::DecryptionFailed(e.to_string()))?;

        String::from_utf8(plaintext).map_err(|e| EncryptionError::InvalidUtf8(e.to_string()))
    }

    pub fn decrypt_string(&self, ciphertext_json: &str) -> EncryptionResult<String> {
        let field: EncryptedField = serde_json::from_str(ciphertext_json).map_err(|e| {
            EncryptionError::DecryptionFailed(format!("Deserialization failed: {}", e))
        })?;
        self.decrypt(&field)
    }

    pub fn needs_rotation(&self, field: &EncryptedField) -> bool {
        field.key_version != self.key_manager.current_version()
    }

    pub fn rotate_field(&self, field: &EncryptedField) -> EncryptionResult<EncryptedField> {
        let plaintext = self.decrypt(field)?;
        self.encrypt(&plaintext)
    }

    pub fn key_manager(&self) -> &KeyManager {
        &self.key_manager
    }

    pub fn key_manager_mut(&mut self) -> &mut KeyManager {
        &mut self.key_manager
    }
}

pub struct SearchableEncryption {
    encryption_service: FieldEncryptionService,
    index_key: [u8; 32],
}

impl SearchableEncryption {
    pub fn new(encryption_service: FieldEncryptionService, index_key: &[u8; 32]) -> Self {
        Self {
            encryption_service,
            index_key: *index_key,
        }
    }

    pub fn generate_search_token(&self, keyword: &str) -> EncryptionResult<String> {
        let mut mac = <HmacSha256 as Mac>::new_from_slice(&self.index_key)
            .map_err(|e| EncryptionError::EncryptionFailed(format!("HMAC init failed: {}", e)))?;
        mac.update(keyword.as_bytes());
        let result = mac.finalize();
        Ok(STANDARD.encode(result.into_bytes()))
    }

    pub fn generate_field_indexes(&self, plaintext: &str) -> EncryptionResult<Vec<String>> {
        let tokens = self.extract_search_tokens(plaintext);
        let mut indexes = Vec::new();
        for token in tokens {
            indexes.push(self.generate_search_token(&token)?);
        }
        indexes.sort();
        indexes.dedup();
        Ok(indexes)
    }

    fn extract_search_tokens(&self, text: &str) -> Vec<String> {
        let mut tokens = Vec::new();
        let cleaned: String = text
            .chars()
            .filter(|c| c.is_alphanumeric() || c.is_whitespace() || *c == '@' || *c == '.')
            .collect();

        for word in cleaned.split_whitespace() {
            if !word.is_empty() {
                tokens.push(word.to_lowercase());
            }
        }

        if tokens.is_empty() {
            tokens.push(cleaned.to_lowercase());
        }

        tokens
    }

    pub fn encrypt_with_index(
        &self,
        plaintext: &str,
    ) -> EncryptionResult<(EncryptedField, Vec<String>)> {
        let encrypted = self.encryption_service.encrypt(plaintext)?;
        let indexes = self.generate_field_indexes(plaintext)?;
        Ok((encrypted, indexes))
    }

    pub fn encrypt_with_index_to_string(
        &self,
        plaintext: &str,
    ) -> EncryptionResult<(String, Vec<String>)> {
        let (encrypted, indexes) = self.encrypt_with_index(plaintext)?;
        let encrypted_str = serde_json::to_string(&encrypted).map_err(|e| {
            EncryptionError::EncryptionFailed(format!("Serialization failed: {}", e))
        })?;
        Ok((encrypted_str, indexes))
    }

    pub fn decrypt(&self, field: &EncryptedField) -> EncryptionResult<String> {
        self.encryption_service.decrypt(field)
    }

    pub fn encryption_service(&self) -> &FieldEncryptionService {
        &self.encryption_service
    }
}

pub struct DataMasking;

impl DataMasking {
    pub fn phone(phone: &str) -> String {
        let digits: String = phone.chars().filter(|c| c.is_ascii_digit()).collect();
        let phone_digits = if digits.len() > 11 {
            &digits[digits.len() - 11..]
        } else {
            &digits
        };
        if phone_digits.len() >= 7 {
            format!(
                "{}****{}",
                &phone_digits[..3],
                &phone_digits[phone_digits.len() - 4..]
            )
        } else if phone_digits.len() >= 4 {
            format!(
                "{}****{}",
                &phone_digits[..1],
                &phone_digits[phone_digits.len() - 1..]
            )
        } else {
            "****".to_string()
        }
    }

    pub fn email(email: &str) -> String {
        if let Some(at_pos) = email.find('@') {
            let local = &email[..at_pos];
            let domain = &email[at_pos..];
            match local.len() {
                0 => format!("***{}", domain),
                1 => format!("{}***{}", &local[..1], domain),
                2 => format!("{}**{}", &local[..1], domain),
                _ => format!("{}***{}", &local[..2], domain),
            }
        } else {
            "***".to_string()
        }
    }

    pub fn id_card(id: &str) -> String {
        let chars: Vec<char> = id.chars().collect();
        if chars.len() >= 18 {
            let prefix: String = chars[..6].iter().collect();
            let suffix: String = chars[chars.len() - 4..].iter().collect();
            format!("{}********{}", prefix, suffix)
        } else if chars.len() >= 8 {
            let prefix: String = chars[..3].iter().collect();
            let suffix: String = chars[chars.len() - 3..].iter().collect();
            format!("{}*****{}", prefix, suffix)
        } else if chars.len() >= 4 {
            let prefix: String = chars[..1].iter().collect();
            let suffix: String = chars[chars.len() - 1..].iter().collect();
            format!("{}***{}", prefix, suffix)
        } else {
            "****".to_string()
        }
    }

    pub fn bank_card(card: &str) -> String {
        let digits: String = card.chars().filter(|c| c.is_ascii_digit()).collect();
        if digits.len() >= 8 {
            let prefix = &digits[..4];
            let suffix = &digits[digits.len() - 4..];
            let middle_len = digits.len() - 8;
            let middle_stars: String = std::iter::repeat_n('*', middle_len).collect();
            format!("{} {} {}", prefix, middle_stars, suffix)
        } else if digits.len() >= 4 {
            let suffix = &digits[digits.len() - 4..];
            format!("**** {}", suffix)
        } else {
            "****".to_string()
        }
    }

    pub fn address(address: &str) -> String {
        let chars: Vec<char> = address.chars().collect();
        if chars.len() <= 6 {
            "******".to_string()
        } else if chars.len() <= 10 {
            let prefix: String = chars[..3].iter().collect();
            format!("{}****", prefix)
        } else {
            let prefix: String = chars[..6].iter().collect();
            let suffix: String = chars[chars.len() - 3..].iter().collect();
            format!("{}******{}", prefix, suffix)
        }
    }

    pub fn name(name: &str) -> String {
        let chars: Vec<char> = name.chars().collect();
        match chars.len() {
            0 => "**".to_string(),
            1 => format!("{}*", chars[0]),
            2 => format!("{}*", chars[0]),
            _ => {
                let first = chars[0];
                let stars: String = std::iter::repeat_n('*', chars.len() - 1).collect();
                format!("{}{}", first, stars)
            }
        }
    }

    pub fn tax_number(tax: &str) -> String {
        let chars: Vec<char> = tax.chars().collect();
        if chars.len() >= 15 {
            let prefix: String = chars[..3].iter().collect();
            let suffix: String = chars[chars.len() - 4..].iter().collect();
            let middle_stars: String = std::iter::repeat_n('*', chars.len() - 7).collect();
            format!("{}{}{}", prefix, middle_stars, suffix)
        } else if chars.len() >= 6 {
            let prefix: String = chars[..2].iter().collect();
            let suffix: String = chars[chars.len() - 2..].iter().collect();
            let middle_stars: String = std::iter::repeat_n('*', chars.len() - 4).collect();
            format!("{}{}{}", prefix, middle_stars, suffix)
        } else {
            "****".to_string()
        }
    }

    pub fn mask_by_type(value: &str, field_type: &str) -> String {
        match field_type.to_lowercase().as_str() {
            "phone" | "mobile" | "tel" => Self::phone(value),
            "email" | "mail" => Self::email(value),
            "id_card" | "id_number" | "ssn" | "id" => Self::id_card(value),
            "bank_card" | "credit_card" | "card_number" => Self::bank_card(value),
            "address" | "home_address" => Self::address(value),
            "name" | "full_name" => Self::name(value),
            "tax_number" | "tax_id" | "tin" => Self::tax_number(value),
            _ => {
                if value.len() <= 2 {
                    "**".to_string()
                } else if value.len() <= 6 {
                    let first = value.chars().next().unwrap_or('*');
                    format!("{}***", first)
                } else {
                    let first = value.chars().next().unwrap_or('*');
                    let last = value.chars().last().unwrap_or('*');
                    format!("{}****{}", first, last)
                }
            }
        }
    }
}

pub trait Encryptable {
    fn encrypt_fields(&mut self, service: &FieldEncryptionService) -> EncryptionResult<()>;
    fn decrypt_fields(&mut self, service: &FieldEncryptionService) -> EncryptionResult<()>;
    fn mask_sensitive_fields(&mut self);
}

pub fn encrypt_optional_string(
    service: &FieldEncryptionService,
    value: &Option<String>,
) -> EncryptionResult<Option<String>> {
    match value {
        Some(v) if !v.is_empty() => Ok(Some(service.encrypt_to_string(v)?)),
        _ => Ok(value.clone()),
    }
}

pub fn decrypt_optional_string(
    service: &FieldEncryptionService,
    value: &Option<String>,
) -> EncryptionResult<Option<String>> {
    match value {
        Some(v) if !v.is_empty() => {
            if v.starts_with('{') {
                Ok(Some(service.decrypt_string(v)?))
            } else {
                Ok(Some(v.clone()))
            }
        }
        _ => Ok(value.clone()),
    }
}

pub fn encrypt_string(service: &FieldEncryptionService, value: &str) -> EncryptionResult<String> {
    service.encrypt_to_string(value)
}

pub fn decrypt_string_value(
    service: &FieldEncryptionService,
    value: &str,
) -> EncryptionResult<String> {
    if value.starts_with('{') {
        service.decrypt_string(value)
    } else {
        Ok(value.to_string())
    }
}

/// 统一加密服务初始化：从环境变量读取密钥并构造 FieldEncryptionService
///
/// 环境变量优先级：
///   1. ENCRYPTION_MASTER_KEY（hex 编码，64 字符 = 32 字节）
///   2. ENCRYPTION_KEY（支持 base64: 前缀或原始字符串经 SHA256 派生）
///
/// 行为：
///   - 生产环境（DEPLOYMENT_MODE=saas 或 MULTI_TENANT_ENABLED=true）：密钥未设置时 panic
///   - 开发环境：密钥未设置时 warn 并使用安全随机生成的临时密钥（非硬编码）
pub fn init_encryption_from_env() -> FieldEncryptionService {
    use rand::RngCore;

    let is_production = is_production_mode();

    // 优先级 1: ENCRYPTION_MASTER_KEY（hex 编码）
    if let Ok(master_key_hex) = std::env::var("ENCRYPTION_MASTER_KEY") {
        if !master_key_hex.is_empty() {
            return build_from_hex_key(&master_key_hex, is_production);
        }
    }

    // 优先级 2: ENCRYPTION_KEY（base64: 前缀或原始字符串经 SHA256 派生）
    if let Ok(encryption_key) = std::env::var("ENCRYPTION_KEY") {
        if !encryption_key.is_empty() {
            return build_from_encryption_key(&encryption_key, is_production);
        }
    }

    // 两个环境变量都未设置
    if is_production {
        panic!(
            "生产环境（DEPLOYMENT_MODE=saas 或 MULTI_TENANT_ENABLED=true）下必须设置              ENCRYPTION_MASTER_KEY 或 ENCRYPTION_KEY 环境变量，服务无法启动"
        );
    }

    // 开发环境：生成随机临时密钥（非硬编码，重启后变化）
    tracing::warn!(
        "ENCRYPTION_MASTER_KEY 和 ENCRYPTION_KEY 均未设置，已生成随机临时密钥。\
         该密钥重启后会变化，已加密数据将无法解密。生产环境必须显式配置密钥。"
    );
    let mut random_key = [0u8; 32];
    rand::rngs::OsRng.fill_bytes(&mut random_key);
    FieldEncryptionService::new(KeyManager::new(&random_key))
}

/// 检测当前是否为生产环境
fn is_production_mode() -> bool {
    let deployment_mode = std::env::var("DEPLOYMENT_MODE")
        .unwrap_or_default()
        .to_lowercase();
    if deployment_mode == "saas" {
        return true;
    }
    std::env::var("MULTI_TENANT_ENABLED")
        .map(|v| v.to_lowercase() == "true")
        .unwrap_or(false)
}

/// 从 ENCRYPTION_MASTER_KEY（hex 编码）构造 FieldEncryptionService
fn build_from_hex_key(master_key_hex: &str, is_production: bool) -> FieldEncryptionService {
    use sha2::Digest;

    match hex::decode(master_key_hex) {
        Ok(key_bytes) if key_bytes.len() >= 32 => {
            if key_bytes.len() > 32 {
                tracing::warn!(
                    "ENCRYPTION_MASTER_KEY hex 解码后为 {} 字节，截取前 32 字节作为密钥",
                    key_bytes.len()
                );
            }
            let mut key_array = [0u8; 32];
            key_array.copy_from_slice(&key_bytes[..32]);
            FieldEncryptionService::new(KeyManager::new(&key_array))
        }
        Ok(key_bytes) => {
            // 长度不足 32 字节
            if is_production {
                panic!(
                    "ENCRYPTION_MASTER_KEY hex 解码后仅 {} 字节，要求恰好 32 字节（64 hex 字符），\
                     生产环境服务无法启动",
                    key_bytes.len()
                );
            }
            tracing::warn!(
                "ENCRYPTION_MASTER_KEY hex 解码后仅 {} 字节，不足 32 字节，已用零填充",
                key_bytes.len()
            );
            let mut key_array = [0u8; 32];
            key_array[..key_bytes.len()].copy_from_slice(&key_bytes);
            FieldEncryptionService::new(KeyManager::new(&key_array))
        }
        Err(e) => {
            if is_production {
                panic!(
                    "ENCRYPTION_MASTER_KEY hex 解码失败: {}，生产环境服务无法启动",
                    e
                );
            }
            tracing::warn!(
                "ENCRYPTION_MASTER_KEY hex 解码失败: {}，回退使用 SHA256 派生密钥",
                e
            );
            let mut hasher = sha2::Sha256::new();
            hasher.update(master_key_hex.as_bytes());
            let result = hasher.finalize();
            let mut key_array = [0u8; 32];
            key_array.copy_from_slice(&result);
            FieldEncryptionService::new(KeyManager::new(&key_array))
        }
    }
}

/// 从 ENCRYPTION_KEY 构造 FieldEncryptionService
/// 支持 "base64:" 前缀（直接 base64 解码）或原始字符串（SHA256 派生后 base64 编码）
fn build_from_encryption_key(encryption_key: &str, is_production: bool) -> FieldEncryptionService {
    use sha2::Digest;

    let key_b64 = if let Some(stripped) = encryption_key.strip_prefix("base64:") {
        stripped.to_string()
    } else {
        // 原始字符串经 SHA256 派生为 32 字节，再 base64 编码
        let mut hasher = sha2::Sha256::new();
        hasher.update(encryption_key.as_bytes());
        let result = hasher.finalize();
        STANDARD.encode(result)
    };

    match KeyManager::from_base64_key(&key_b64) {
        Ok(key_manager) => FieldEncryptionService::new(key_manager),
        Err(e) => {
            if is_production {
                panic!(
                    "ENCRYPTION_KEY 初始化加密服务失败: {}，生产环境服务无法启动",
                    e
                );
            }
            tracing::warn!(
                "ENCRYPTION_KEY 初始化加密服务失败: {}，回退使用 SHA256 派生密钥",
                e
            );
            let mut hasher = sha2::Sha256::new();
            hasher.update(encryption_key.as_bytes());
            let result = hasher.finalize();
            let mut key_array = [0u8; 32];
            key_array.copy_from_slice(&result);
            FieldEncryptionService::new(KeyManager::new(&key_array))
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    fn test_key() -> [u8; 32] {
        [0x42u8; 32]
    }

    fn test_service() -> FieldEncryptionService {
        let key_manager = KeyManager::new(&test_key());
        FieldEncryptionService::new(key_manager)
    }

    #[test]
    fn test_encryption_roundtrip() -> EncryptionResult<()> {
        let service = test_service();
        let plaintext = "Hello, World!";
        let encrypted = service.encrypt(plaintext)?;
        let decrypted = service.decrypt(&encrypted)?;
        assert_eq!(plaintext, decrypted);
        assert_eq!(encrypted.key_version, 1);
        assert!(encrypted.is_encrypted());
        Ok(())
    }

    #[test]
    fn test_encrypt_to_string_roundtrip() -> EncryptionResult<()> {
        let service = test_service();
        let plaintext = "Test String 123";
        let encrypted_str = service.encrypt_to_string(plaintext)?;
        assert!(encrypted_str.starts_with('{'));
        let decrypted = service.decrypt_string(&encrypted_str)?;
        assert_eq!(plaintext, decrypted);
        Ok(())
    }

    #[test]
    fn test_key_rotation() -> EncryptionResult<()> {
        let mut key_manager = KeyManager::new(&test_key());
        let service = FieldEncryptionService::new(key_manager.clone());

        let plaintext = "Rotation Test";
        let encrypted_v1 = service.encrypt(plaintext)?;
        assert_eq!(encrypted_v1.key_version, 1);

        let new_key = [0x99u8; 32];
        key_manager.rotate_key(&new_key);
        let service_v2 = FieldEncryptionService::new(key_manager);

        let decrypted = service_v2.decrypt(&encrypted_v1)?;
        assert_eq!(plaintext, decrypted);

        let encrypted_v2 = service_v2.encrypt(plaintext)?;
        assert_eq!(encrypted_v2.key_version, 2);

        assert!(service_v2.needs_rotation(&encrypted_v1));
        assert!(!service_v2.needs_rotation(&encrypted_v2));

        let rotated = service_v2.rotate_field(&encrypted_v1)?;
        assert_eq!(rotated.key_version, 2);
        let decrypted_rotated = service_v2.decrypt(&rotated)?;
        assert_eq!(plaintext, decrypted_rotated);
        Ok(())
    }

    #[test]
    fn test_phone_masking() {
        assert_eq!(DataMasking::phone("13812345678"), "138****5678");
        assert_eq!(DataMasking::phone("123"), "****");
        assert_eq!(DataMasking::phone("+86 138-1234-5678"), "138****5678");
    }

    #[test]
    fn test_email_masking() {
        assert_eq!(DataMasking::email("test@example.com"), "te***@example.com");
        assert_eq!(DataMasking::email("a@b.com"), "a***@b.com");
        assert_eq!(DataMasking::email("ab@test.cn"), "a**@test.cn");
    }

    #[test]
    fn test_id_card_masking() {
        assert_eq!(
            DataMasking::id_card("110101199001011234"),
            "110101********1234"
        );
        assert_eq!(DataMasking::id_card("1234567890"), "123*****890");
    }

    #[test]
    fn test_bank_card_masking() {
        assert_eq!(
            DataMasking::bank_card("6222021234567890123"),
            "6222 *********** 0123"
        );
        assert_eq!(
            DataMasking::bank_card("1234 5678 9012 3456"),
            "1234 ******** 3456"
        );
    }

    #[test]
    fn test_address_masking() {
        let addr = "北京市朝阳区建国路88号";
        let masked = DataMasking::address(addr);
        assert!(masked.len() < addr.len());
        assert!(masked.contains('*'));
    }

    #[test]
    fn test_name_masking() {
        assert_eq!(DataMasking::name("张三"), "张*");
        assert_eq!(DataMasking::name("张三丰"), "张**");
        assert_eq!(DataMasking::name("John"), "J***");
    }

    #[test]
    fn test_tax_number_masking() {
        assert_eq!(
            DataMasking::tax_number("91110000MA0123456X"),
            "911***********456X"
        );
    }

    #[test]
    fn test_mask_by_type() {
        assert_eq!(
            DataMasking::mask_by_type("13812345678", "phone"),
            "138****5678"
        );
        assert_eq!(
            DataMasking::mask_by_type("test@example.com", "email"),
            "te***@example.com"
        );
        assert_eq!(
            DataMasking::mask_by_type("110101199001011234", "id_card"),
            "110101********1234"
        );
    }

    #[test]
    fn test_searchable_encryption() -> EncryptionResult<()> {
        let service = test_service();
        let index_key = [0x12u8; 32];
        let sse = SearchableEncryption::new(service, &index_key);

        let plaintext = "test@example.com";
        let (encrypted, indexes) = sse.encrypt_with_index(plaintext)?;
        assert!(!indexes.is_empty());

        let decrypted = sse.decrypt(&encrypted)?;
        assert_eq!(plaintext, decrypted);

        let search_token = sse.generate_search_token("test@example.com")?;
        assert!(indexes.contains(&search_token));
        Ok(())
    }

    #[test]
    fn test_search_token_deterministic() -> EncryptionResult<()> {
        let service = test_service();
        let index_key = [0x12u8; 32];
        let sse = SearchableEncryption::new(service, &index_key);

        let token1 = sse.generate_search_token("test")?;
        let token2 = sse.generate_search_token("test")?;
        assert_eq!(token1, token2);

        let token3 = sse.generate_search_token("different")?;
        assert_ne!(token1, token3);
        Ok(())
    }

    #[test]
    fn test_optional_string_encryption() -> EncryptionResult<()> {
        let service = test_service();
        let value = Some("test".to_string());
        let encrypted = encrypt_optional_string(&service, &value)?;
        assert!(encrypted.is_some());
        assert!(encrypted.as_ref().is_some_and(|e| e.starts_with('{')));

        let decrypted = decrypt_optional_string(&service, &encrypted)?;
        assert_eq!(decrypted, value);

        let none_value: Option<String> = None;
        let encrypted_none = encrypt_optional_string(&service, &none_value)?;
        assert!(encrypted_none.is_none());
        Ok(())
    }

    #[test]
    fn test_multiple_key_versions() -> EncryptionResult<()> {
        let mut key_manager = KeyManager::new(&[0x01u8; 32]);
        key_manager.add_key(2, &[0x02u8; 32]);
        key_manager.add_key(3, &[0x03u8; 32]);

        key_manager.set_current_version(1)?;
        let service_v1 = FieldEncryptionService::new(key_manager.clone());
        let data = "multi-version test";
        let enc_v1 = service_v1.encrypt(data)?;
        assert_eq!(enc_v1.key_version, 1);

        key_manager.set_current_version(2)?;
        let service_v2 = FieldEncryptionService::new(key_manager.clone());
        let dec_from_v2 = service_v2.decrypt(&enc_v1)?;
        assert_eq!(dec_from_v2, data);

        key_manager.set_current_version(3)?;
        let service_v3 = FieldEncryptionService::new(key_manager);
        let dec_from_v3 = service_v3.decrypt(&enc_v1)?;
        assert_eq!(dec_from_v3, data);
        Ok(())
    }

    #[test]
    fn test_key_not_found() -> EncryptionResult<()> {
        let key_manager = KeyManager::new(&test_key());
        let service = FieldEncryptionService::new(key_manager);

        let mut field = service.encrypt("test")?;
        field.key_version = 999;

        let result = service.decrypt(&field);
        match result {
            Err(EncryptionError::KeyNotFound(v)) => assert_eq!(v, 999),
            _ => panic!("Expected KeyNotFound error"),
        }
        Ok(())
    }

    #[test]
    fn test_invalid_base64_key() {
        let result = KeyManager::from_base64_key("not-valid-base64!!!");
        assert!(result.is_err());
    }

    #[test]
    fn test_wrong_key_length() {
        let result = KeyManager::from_base64_key(&STANDARD.encode(b"short"));
        assert!(result.is_err());
    }
}
