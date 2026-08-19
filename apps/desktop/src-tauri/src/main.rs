#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

fn main() {
    env_logger::Builder::from_env(env_logger::Env::default().default_filter_or("info")).init();
    topems_desktop::build_app()
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
