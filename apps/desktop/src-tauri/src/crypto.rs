use aes_gcm::{
    aead::{Aead, KeyInit},
    Aes256Gcm, Nonce,
};
use base64::{engine::general_purpose::STANDARD, Engine};
use rand::RngCore;
use sha2::{Digest, Sha256};
use std::fs;
use std::io::Write;
use std::path::PathBuf;

fn get_app_data_dir() -> Result<PathBuf, String> {
    let dirs = directories::ProjectDirs::from("com", "topems", "TOPEMS")
        .ok_or_else(|| "Failed to get project directories".to_string())?;
    Ok(dirs.data_local_dir().to_path_buf())
}

pub fn get_machine_id() -> String {
    let hostname = std::env::var("HOSTNAME")
        .or_else(|_| std::env::var("COMPUTERNAME"))
        .unwrap_or_else(|_| "unknown".to_string());
    let username = std::env::var("USER")
        .or_else(|_| std::env::var("USERNAME"))
        .unwrap_or_else(|_| "unknown".to_string());
    let app_version = env!("CARGO_PKG_VERSION").to_string();

    let input = format!("{}:{}:{}", hostname, username, app_version);
    let hash = Sha256::digest(input.as_bytes());
    STANDARD.encode(hash)
}

pub fn get_or_create_key() -> [u8; 32] {
    let key_path = get_app_data_dir()
        .unwrap_or_else(|_| PathBuf::from("."))
        .join("encryption.key");

    if let Ok(contents) = fs::read(&key_path) {
        if contents.len() == 32 {
            let mut key = [0u8; 32];
            key.copy_from_slice(&contents);
            return key;
        }
    }

    let mut key = [0u8; 32];
    rand::rngs::OsRng.fill_bytes(&mut key);

    if let Some(parent) = key_path.parent() {
        let _ = fs::create_dir_all(parent);
    }
    if let Ok(mut file) = fs::File::create(&key_path) {
        let _ = file.write_all(&key);
    }

    key
}

pub fn encrypt_token(token: &str) -> Result<String, String> {
    let key = get_or_create_key();
    let cipher = Aes256Gcm::new_from_slice(&key)
        .map_err(|e| format!("Failed to create cipher: {}", e))?;

    let mut nonce_bytes = [0u8; 12];
    rand::rngs::OsRng.fill_bytes(&mut nonce_bytes);
    let nonce = Nonce::from_slice(&nonce_bytes);

    let ciphertext = cipher
        .encrypt(nonce, token.as_bytes())
        .map_err(|e| format!("Encryption failed: {}", e))?;

    let mut combined = Vec::with_capacity(12 + ciphertext.len());
    combined.extend_from_slice(&nonce_bytes);
    combined.extend_from_slice(&ciphertext);

    Ok(STANDARD.encode(&combined))
}

pub fn decrypt_token(encrypted: &str) -> Result<String, String> {
    let key = get_or_create_key();
    let cipher = Aes256Gcm::new_from_slice(&key)
        .map_err(|e| format!("Failed to create cipher: {}", e))?;

    let combined = STANDARD
        .decode(encrypted)
        .map_err(|e| format!("Failed to decode base64: {}", e))?;

    if combined.len() < 12 {
        return Err("Encrypted data too short".to_string());
    }

    let (nonce_bytes, ciphertext) = combined.split_at(12);
    let nonce = Nonce::from_slice(nonce_bytes);

    let plaintext = cipher
        .decrypt(nonce, ciphertext)
        .map_err(|e| format!("Decryption failed: {}", e))?;

    String::from_utf8(plaintext)
        .map_err(|e| format!("UTF-8 conversion failed: {}", e))
}