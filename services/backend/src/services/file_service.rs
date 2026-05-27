use std::path::Path;

pub struct FileService;

impl FileService {
    pub fn new() -> Self {
        FileService
    }

    pub fn validate_file_path(path: &str) -> Result<(), String> {
        if path.is_empty() {
            return Err("File path cannot be empty".to_string());
        }
        if path.contains("..") {
            return Err("Invalid file path: cannot use '..'".to_string());
        }
        Ok(())
    }

    pub fn get_file_extension(path: &str) -> Option<&str> {
        Path::new(path)
            .extension()
            .and_then(|ext| ext.to_str())
    }

    pub fn is_allowed_extension(ext: &str, allowed: &[&str]) -> bool {
        allowed.iter().any(|&allowed_ext| allowed_ext.eq_ignore_ascii_case(ext))
    }
}

impl Default for FileService {
    fn default() -> Self {
        Self::new()
    }
}
