use std::fs;
use std::io::Write;
use std::path::PathBuf;

use crate::crypto;

fn get_token_path() -> Result<PathBuf, String> {
    let dirs = directories::ProjectDirs::from("com", "topems", "TOPEMS")
        .ok_or_else(|| "Failed to get project directories".to_string())?;
    Ok(dirs.data_local_dir().to_path_buf().join("auth_token.enc"))
}

pub fn save_token_encrypted(token: &str) -> Result<(), String> {
    let encrypted = crypto::encrypt_token(token)?;
    let path = get_token_path()?;

    if let Some(parent) = path.parent() {
        fs::create_dir_all(parent)
            .map_err(|e| format!("Failed to create directory: {}", e))?;
    }

    let temp_path = path.with_extension("tmp");
    {
        let mut file = fs::File::create(&temp_path)
            .map_err(|e| format!("Failed to create temp file: {}", e))?;
        file.write_all(encrypted.as_bytes())
            .map_err(|e| format!("Failed to write temp file: {}", e))?;
    }

    fs::rename(&temp_path, &path)
        .map_err(|e| format!("Failed to rename temp file: {}", e))?;

    Ok(())
}

pub fn load_token_encrypted() -> Result<Option<String>, String> {
    let path = get_token_path()?;

    if !path.exists() {
        return Ok(None);
    }

    let encrypted = fs::read_to_string(&path)
        .map_err(|e| format!("Failed to read token file: {}", e))?;

    let token = crypto::decrypt_token(&encrypted)?;
    Ok(Some(token))
}

pub fn clear_token_encrypted() -> Result<(), String> {
    let path = get_token_path()?;
    if path.exists() {
        fs::remove_file(&path)
            .map_err(|e| format!("Failed to remove token file: {}", e))?;
    }
    Ok(())
}