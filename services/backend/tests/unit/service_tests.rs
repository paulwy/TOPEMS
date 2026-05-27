use topems_erp::services::file_service::FileService;
use topems_erp::services::storage_service::StorageService;

#[cfg(test)]
mod service_tests {
    use super::*;

    #[test]
    fn test_file_service_creation() {
        let service = FileService::new();
        assert!(std::mem::size_of_val(&service) > 0);
    }

    #[test]
    fn test_file_service_default() {
        let service = FileService::default();
        assert!(std::mem::size_of_val(&service) > 0);
    }

    #[test]
    fn test_validate_file_path_valid() {
        let result = FileService::validate_file_path("test/file.txt");
        assert!(result.is_ok());
    }

    #[test]
    fn test_validate_file_path_empty() {
        let result = FileService::validate_file_path("");
        assert!(result.is_err());
        assert_eq!(result.unwrap_err(), "File path cannot be empty");
    }

    #[test]
    fn test_validate_file_path_parent_directory() {
        let result = FileService::validate_file_path("../test/file.txt");
        assert!(result.is_err());
        assert_eq!(result.unwrap_err(), "Invalid file path: cannot use '..'");
    }

    #[test]
    fn test_get_file_extension() {
        assert_eq!(FileService::get_file_extension("test.txt"), Some("txt"));
        assert_eq!(FileService::get_file_extension("test.csv"), Some("csv"));
        assert_eq!(FileService::get_file_extension("test"), None);
    }

    #[test]
    fn test_is_allowed_extension() {
        let allowed = vec!["txt", "csv", "json"];
        assert!(FileService::is_allowed_extension("txt", &allowed));
        assert!(FileService::is_allowed_extension("CSV", &allowed));
        assert!(!FileService::is_allowed_extension("exe", &allowed));
    }

    #[test]
    fn test_storage_service_creation() {
        let service = StorageService::new();
        assert_eq!(service.size(), 0);
    }

    #[test]
    fn test_storage_service_default() {
        let service = StorageService::default();
        assert_eq!(service.size(), 0);
    }

    #[test]
    fn test_storage_service_store() {
        let mut service = StorageService::new();
        let result = service.store("key1".to_string(), vec![1, 2, 3]);
        assert!(result.is_ok());
        assert_eq!(service.size(), 1);
    }

    #[test]
    fn test_storage_service_store_empty_key() {
        let mut service = StorageService::new();
        let result = service.store("".to_string(), vec![1, 2, 3]);
        assert!(result.is_err());
        assert_eq!(result.unwrap_err(), "Storage key cannot be empty");
    }

    #[test]
    fn test_storage_service_retrieve() {
        let mut service = StorageService::new();
        service.store("key1".to_string(), vec![1, 2, 3]).unwrap();
        
        let value = service.retrieve("key1");
        assert!(value.is_some());
        assert_eq!(value.unwrap(), &vec![1, 2, 3]);
    }

    #[test]
    fn test_storage_service_retrieve_nonexistent() {
        let service = StorageService::new();
        let value = service.retrieve("nonexistent");
        assert!(value.is_none());
    }

    #[test]
    fn test_storage_service_delete() {
        let mut service = StorageService::new();
        service.store("key1".to_string(), vec![1, 2, 3]).unwrap();
        
        let result = service.delete("key1");
        assert!(result);
        assert_eq!(service.size(), 0);
    }

    #[test]
    fn test_storage_service_delete_nonexistent() {
        let mut service = StorageService::new();
        let result = service.delete("nonexistent");
        assert!(!result);
    }

    #[test]
    fn test_storage_service_exists() {
        let mut service = StorageService::new();
        service.store("key1".to_string(), vec![1, 2, 3]).unwrap();
        
        assert!(service.exists("key1"));
        assert!(!service.exists("key2"));
    }
}
