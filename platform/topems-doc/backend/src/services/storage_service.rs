use std::path::PathBuf;

pub struct StorageService {
    base_path: PathBuf,
}

impl StorageService {
    pub fn new(base_path: PathBuf) -> Self {
        Self { base_path }
    }

    pub async fn save_file(&self, id: &str, data: &[u8]) -> Result<String, Box<dyn std::error::Error>> {
        let path = self.base_path.join(format!("{}.bin", id));
        
        tokio::fs::write(&path, data).await?;
        
        Ok(path.to_string_lossy().to_string())
    }

    pub async fn read_file(&self, id: &str) -> Result<Vec<u8>, Box<dyn std::error::Error>> {
        let path = self.base_path.join(format!("{}.bin", id));
        
        let data = tokio::fs::read(&path).await?;
        
        Ok(data)
    }

    pub async fn delete_file(&self, id: &str) -> Result<(), Box<dyn std::error::Error>> {
        let path = self.base_path.join(format!("{}.bin", id));
        
        tokio::fs::remove_file(&path).await?;
        
        Ok(())
    }
}
