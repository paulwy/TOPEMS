use crate::models::{UpdateUserSettings, UserSettings};

pub struct SettingsService;

impl SettingsService {
    pub fn new() -> Self {
        Self
    }

    pub fn get_user_settings(&self) -> UserSettings {
        UserSettings {
            id: "1".to_string(),
            user_id: "user_001".to_string(),
            theme: "dark".to_string(),
            language: "zh-CN".to_string(),
            timezone: "Asia/Shanghai".to_string(),
            notification_enabled: true,
            notification_sound: false,
            auto_refresh: true,
            refresh_interval: 30,
            default_dashboard: "overview".to_string(),
        }
    }

    pub fn update_user_settings(&self, data: UpdateUserSettings) -> UserSettings {
        let mut settings = self.get_user_settings();
        if let Some(theme) = data.theme {
            settings.theme = theme;
        }
        if let Some(language) = data.language {
            settings.language = language;
        }
        if let Some(timezone) = data.timezone {
            settings.timezone = timezone;
        }
        if let Some(notification_enabled) = data.notification_enabled {
            settings.notification_enabled = notification_enabled;
        }
        if let Some(notification_sound) = data.notification_sound {
            settings.notification_sound = notification_sound;
        }
        if let Some(auto_refresh) = data.auto_refresh {
            settings.auto_refresh = auto_refresh;
        }
        if let Some(refresh_interval) = data.refresh_interval {
            settings.refresh_interval = refresh_interval;
        }
        settings
    }

    pub fn reset_user_settings(&self) -> UserSettings {
        UserSettings {
            id: "1".to_string(),
            user_id: "user_001".to_string(),
            theme: "light".to_string(),
            language: "zh-CN".to_string(),
            timezone: "Asia/Shanghai".to_string(),
            notification_enabled: true,
            notification_sound: false,
            auto_refresh: false,
            refresh_interval: 60,
            default_dashboard: "overview".to_string(),
        }
    }

    pub fn get_available_themes(&self) -> Vec<String> {
        vec![
            "light".to_string(),
            "dark".to_string(),
            "system".to_string(),
            "contrast".to_string(),
        ]
    }

    pub fn get_available_languages(&self) -> Vec<(String, String)> {
        vec![
            ("zh-CN".to_string(), "简体中文".to_string()),
            ("zh-TW".to_string(), "繁体中文".to_string()),
            ("en-US".to_string(), "English".to_string()),
            ("ja-JP".to_string(), "日本語".to_string()),
        ]
    }
}
