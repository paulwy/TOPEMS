use std::collections::HashMap;

pub struct StorageService {
    data: HashMap<String, Vec<u8>>,
}

impl StorageService {
    pub fn new() -> Self {
        StorageService {
            data: HashMap::new(),
        }
    }

    pub fn store(&mut self, key: String, value: Vec<u8>) -> Result<(), String> {
        if key.is_empty() {
            return Err("Storage key cannot be empty".to_string());
        }
        self.data.insert(key, value);
        Ok(())
    }

    pub fn retrieve(&self, key: &str) -> Option<&Vec<u8>> {
        self.data.get(key)
    }

    pub fn delete(&mut self, key: &str) -> bool {
        self.data.remove(key).is_some()
    }

    pub fn exists(&self, key: &str) -> bool {
        self.data.contains_key(key)
    }

    pub fn size(&self) -> usize {
        self.data.len()
    }
}

impl Default for StorageService {
    fn default() -> Self {
        Self::new()
    }
}
