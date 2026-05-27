use std::collections::HashMap;
use std::sync::{Arc, Mutex};

pub struct TestDatabase {
    data: Arc<Mutex<HashMap<String, Vec<serde_json::Value>>>>,
}

impl TestDatabase {
    pub fn new() -> Self {
        TestDatabase {
            data: Arc::new(Mutex::new(HashMap::new())),
        }
    }

    pub fn insert(&self, table: &str, record: serde_json::Value) -> Result<(), String> {
        let mut data = self.data.lock().map_err(|e| e.to_string())?;
        let entries = data.entry(table.to_string()).or_insert_with(Vec::new);
        entries.push(record);
        Ok(())
    }

    pub fn select(&self, table: &str) -> Result<Vec<serde_json::Value>, String> {
        let data = self.data.lock().map_err(|e| e.to_string())?;
        Ok(data.get(table).cloned().unwrap_or_default())
    }

    pub fn select_by_id(&self, table: &str, id: &str) -> Result<Option<serde_json::Value>, String> {
        let data = self.data.lock().map_err(|e| e.to_string())?;
        if let Some(entries) = data.get(table) {
            for entry in entries {
                if let Some(entry_id) = entry.get("id") {
                    if entry_id == id {
                        return Ok(Some(entry.clone()));
                    }
                }
            }
        }
        Ok(None)
    }

    pub fn update(&self, table: &str, id: &str, record: serde_json::Value) -> Result<bool, String> {
        let mut data = self.data.lock().map_err(|e| e.to_string())?;
        if let Some(entries) = data.get_mut(table) {
            for entry in entries.iter_mut() {
                if let Some(entry_id) = entry.get("id") {
                    if entry_id == id {
                        *entry = record;
                        return Ok(true);
                    }
                }
            }
        }
        Ok(false)
    }

    pub fn delete(&self, table: &str, id: &str) -> Result<bool, String> {
        let mut data = self.data.lock().map_err(|e| e.to_string())?;
        if let Some(entries) = data.get_mut(table) {
            let initial_len = entries.len();
            entries.retain(|entry| {
                if let Some(entry_id) = entry.get("id") {
                    entry_id != id
                } else {
                    true
                }
            });
            return Ok(entries.len() < initial_len);
        }
        Ok(false)
    }

    pub fn count(&self, table: &str) -> Result<usize, String> {
        let data = self.data.lock().map_err(|e| e.to_string())?;
        Ok(data.get(table).map(|v| v.len()).unwrap_or(0))
    }

    pub fn clear(&self) -> Result<(), String> {
        let mut data = self.data.lock().map_err(|e| e.to_string())?;
        data.clear();
        Ok(())
    }

    pub fn clear_table(&self, table: &str) -> Result<(), String> {
        let mut data = self.data.lock().map_err(|e| e.to_string())?;
        data.remove(table);
        Ok(())
    }
}

impl Default for TestDatabase {
    fn default() -> Self {
        Self::new()
    }
}

impl Clone for TestDatabase {
    fn clone(&self) -> Self {
        TestDatabase {
            data: Arc::clone(&self.data),
        }
    }
}
