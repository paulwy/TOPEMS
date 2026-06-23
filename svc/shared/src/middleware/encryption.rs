//! Data Encryption Middleware
//! 
//! Provides field-level encryption for sensitive data.

use aes_gcm::{
    aead::{Aead, AeadCore, KeyInit, OsRng},
    Aes256Gcm, Key, Nonce,
};
use base64::{engine::general_purpose::STANDARD, Engine};
use serde::{Deserialize, Serialize};

/// Encryption service for sensitive data
#[derive(Clone)]
pub struct EncryptionService {
    cipher: Aes256Gcm,
}

impl EncryptionService {
    pub fn new(key: &[u8; 32]) -> Self {
        let key = Key::<Aes256Gcm>::from_slice(key);
        Self {
            cipher: Aes256Gcm::new(key),
        }
    }

    pub fn from_base64_key(key_b64: &str) -> Result<Self, String> {
        let key_bytes = STANDARD
            .decode(key_b64)
            .map_err(|e| format!("Invalid base64 key: {}", e))?;
        
        if key_bytes.len() != 32 {
            return Err(format!("Key must be 32 bytes, got {}", key_bytes.len()));
        }
        
        let mut key = [0u8; 32];
        key.copy_from_slice(&key_bytes);
        Ok(Self::new(&key))
    }

    /// Encrypt plaintext
    pub fn encrypt(&self, plaintext: &str) -> Result<String, String> {
        let nonce = Aes256Gcm::generate_nonce(&mut OsRng);
        let ciphertext = self
            .cipher
            .encrypt(&nonce, plaintext.as_bytes())
            .map_err(|e| format!("Encryption failed: {}", e))?;

        let mut result = Vec::new();
        result.extend_from_slice(&nonce);
        result.extend_from_slice(&ciphertext);

        Ok(STANDARD.encode(&result))
    }

    /// Decrypt ciphertext
    pub fn decrypt(&self, ciphertext_b64: &str) -> Result<String, String> {
        let data = STANDARD
            .decode(ciphertext_b64)
            .map_err(|e| format!("Invalid base64: {}", e))?;

        if data.len() < 12 {
            return Err("Ciphertext too short".to_string());
        }

        let nonce = Nonce::from_slice(&data[..12]);
        let ciphertext = &data[12..];

        let plaintext = self
            .cipher
            .decrypt(nonce, ciphertext)
            .map_err(|e| format!("Decryption failed: {}", e))?;

        String::from_utf8(plaintext).map_err(|e| format!("Invalid UTF-8: {}", e))
    }

    /// Encrypt a specific field in JSON
    pub fn encrypt_json_field(&self, value: &serde_json::Value) -> Result<serde_json::Value, String> {
        match value {
            serde_json::Value::String(s) => {
                let encrypted = self.encrypt(s)?;
                Ok(serde_json::json!(encrypted))
            }
            _ => Ok(value.clone()),
        }
    }

    /// Decrypt a specific field in JSON
    pub fn decrypt_json_field(&self, value: &serde_json::Value) -> Result<serde_json::Value, String> {
        match value {
            serde_json::Value::String(s) => {
                let decrypted = self.decrypt(s)?;
                Ok(serde_json::json!(decrypted))
            }
            _ => Ok(value.clone()),
        }
    }
}

/// Field-level encryption for database entities
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct EncryptedField {
    pub value: String,
    pub algorithm: String,
    pub version: u32,
}

impl EncryptedField {
    pub fn new(value: String) -> Self {
        Self {
            value,
            algorithm: "aes-256-gcm".to_string(),
            version: 1,
        }
    }

    pub fn is_encrypted(&self) -> bool {
        self.algorithm == "aes-256-gcm"
    }
}

/// Data protection rules for different field types
#[derive(Debug, Clone)]
pub struct DataProtectionConfig {
    pub encrypt_fields: Vec<String>,
    pub mask_fields: Vec<String>,
    pub hash_fields: Vec<String>,
}

impl Default for DataProtectionConfig {
    fn default() -> Self {
        Self {
            encrypt_fields: vec![
                "password".to_string(),
                "ssn".to_string(),
                "credit_card".to_string(),
                "phone".to_string(),
            ],
            mask_fields: vec![
                "email".to_string(),
                "phone".to_string(),
            ],
            hash_fields: vec![
                "password".to_string(),
            ],
        }
    }
}

/// Data masking utilities
pub struct DataMasking;

impl DataMasking {
    /// Mask email: a***@example.com
    pub fn email(email: &str) -> String {
        if let Some(at_pos) = email.find('@') {
            let local = &email[..at_pos];
            let domain = &email[at_pos..];
            if local.len() > 1 {
                format!("{}***{}", &local[..1], domain)
            } else {
                format!("***{}", domain)
            }
        } else {
            "***".to_string()
        }
    }

    /// Mask phone: 138****8888
    pub fn phone(phone: &str) -> String {
        if phone.len() >= 7 {
            format!("{}****{}", &phone[..3], &phone[phone.len()-4..])
        } else {
            "****".to_string()
        }
    }

    /// Mask credit card: **** **** **** 1234
    pub fn credit_card(card: &str) -> String {
        let digits: String = card.chars().filter(|c| c.is_ascii_digit()).collect();
        if digits.len() >= 4 {
            format!("**** **** **** {}", &digits[digits.len()-4..])
        } else {
            "****".to_string()
        }
    }

    /// Mask name: 张**
    pub fn name(name: &str) -> String {
        if name.chars().count() >= 2 {
            let first = name.chars().next().unwrap();
            format!("{}**", first)
        } else {
            "**".to_string()
        }
    }

    /// Mask ID: 110***********1234
    pub fn id_number(id: &str) -> String {
        if id.len() >= 8 {
            format!("{}***********{}", &id[..3], &id[id.len()-4..])
        } else {
            "********".to_string()
        }
    }
}

/// Apply data protection to a JSON object
pub fn protect_json_data(
    data: &mut serde_json::Value,
    config: &DataProtectionConfig,
    encryption: Option<&EncryptionService>,
) -> Result<(), String> {
    if let Some(obj) = data.as_object_mut() {
        for (key, value) in obj.iter_mut() {
            let key_lower = key.to_lowercase();

            if config.encrypt_fields.contains(&key_lower) {
                if let Some(enc) = encryption {
                    if let serde_json::Value::String(s) = value {
                        *value = serde_json::json!(enc.encrypt(s)?);
                    }
                }
            }

            if config.mask_fields.contains(&key_lower) {
                if let serde_json::Value::String(s) = value {
                    *value = serde_json::json!(match key_lower.as_str() {
                        "email" => DataMasking::email(s),
                        "phone" => DataMasking::phone(s),
                        "credit_card" => DataMasking::credit_card(s),
                        "name" => DataMasking::name(s),
                        "id_number" | "ssn" => DataMasking::id_number(s),
                        _ => s.clone(),
                    });
                }
            }
        }
    }
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_encryption_roundtrip() {
        let key = [0u8; 32];
        let service = EncryptionService::new(&key);

        let plaintext = "Hello, World!";
        let encrypted = service.encrypt(plaintext).unwrap();
        let decrypted = service.decrypt(&encrypted).unwrap();

        assert_eq!(plaintext, decrypted);
    }

    #[test]
    fn test_email_masking() {
        assert_eq!(DataMasking::email("test@example.com"), "t***@example.com");
        assert_eq!(DataMasking::email("a@b.com"), "***@b.com");
    }

    #[test]
    fn test_phone_masking() {
        assert_eq!(DataMasking::phone("13812345678"), "138****5678");
        assert_eq!(DataMasking::phone("123"), "****");
    }

    #[test]
    fn test_credit_card_masking() {
        assert_eq!(DataMasking::credit_card("1234 5678 9012 3456"), "**** **** **** 3456");
    }
}
