#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use std::collections::HashMap;
use std::sync::Mutex;
use tauri::{
    AppHandle, Manager,
    tray::{TrayIcon, TrayIconBuilder},
    WindowEvent,
    menu::{Menu, MenuItem, PredefinedMenuItem},
    webview::WebviewWindowBuilder,
};

const MAIN_WINDOW_LABEL: &str = "main";

lazy_static::lazy_static! {
    static ref WINDOW_COUNTER: Mutex<u32> = Mutex::new(1);
    static ref WINDOW_TITLES: Mutex<HashMap<String, String>> = Mutex::new(HashMap::new());
}

fn build_tray_menu(app: &AppHandle, tray: &TrayIcon) -> tauri::Result<()> {
    let show_item = MenuItem::with_id(
        app,
        "show",
        "显示主窗口",
        true,
        None::<&str>,
    )?;

    let hide_item = MenuItem::with_id(
        app,
        "hide",
        "隐藏到托盘",
        true,
        None::<&str>,
    )?;

    let separator1 = PredefinedMenuItem::separator(app)?;

    let restart_item = MenuItem::with_id(
        app,
        "restart",
        "重启应用",
        true,
        None::<&str>,
    )?;

    let logs_item = MenuItem::with_id(
        app,
        "logs",
        "查看日志",
        true,
        None::<&str>,
    )?;

    let separator2 = PredefinedMenuItem::separator(app)?;

    let about_item = MenuItem::with_id(
        app,
        "about",
        "关于 TOPEMS",
        true,
        None::<&str>,
    )?;

    let separator3 = PredefinedMenuItem::separator(app)?;

    let quit_item = MenuItem::with_id(
        app,
        "quit",
        "退出 TOPEMS",
        true,
        None::<&str>,
    )?;

    let menu = Menu::with_items(
        app,
        &[
            &show_item,
            &hide_item,
            &separator1,
            &restart_item,
            &logs_item,
            &separator2,
            &about_item,
            &separator3,
            &quit_item,
        ],
    )?;

    tray.set_menu(Some(menu))?;
    tray.on_menu_event(|app, event| {
        let _ = handle_tray_menu_event(app, event.id().as_ref());
    });

    Ok(())
}

fn handle_tray_menu_event(app: &AppHandle, menu_id: &str) -> tauri::Result<()> {
    match menu_id {
        "show" => {
            show_main_window(app)?;
        }
        "hide" => {
            hide_main_window(app)?;
        }
        "restart" => {
            let _ = app.restart();
        }
        "logs" => {
            show_logs_window_internal(app)?;
        }
        "about" => {
            show_main_window(app)?;
            if let Some(window) = app.get_webview_window(MAIN_WINDOW_LABEL) {
                let _ = window.eval("window.location.hash = '#/about'");
            }
        }
        "quit" => {
            app.exit(0);
        }
        _ => {}
    }
    Ok(())
}

fn show_main_window(app: &AppHandle) -> tauri::Result<()> {
    if let Some(window) = app.get_webview_window(MAIN_WINDOW_LABEL) {
        window.show()?;
        window.unminimize()?;
        window.set_focus()?;
    }
    Ok(())
}

fn hide_main_window(app: &AppHandle) -> tauri::Result<()> {
    if let Some(window) = app.get_webview_window(MAIN_WINDOW_LABEL) {
        window.hide()?;
    }
    Ok(())
}

fn show_logs_window_internal(app: &AppHandle) -> tauri::Result<()> {
    let logs_window_label = format!("logs-{}", {
        let mut counter = WINDOW_COUNTER.lock().unwrap();
        *counter += 1;
        *counter
    });

    if app.get_webview_window(&logs_window_label).is_some() {
        return Ok(());
    }

    let window = WebviewWindowBuilder::new(
        app,
        &logs_window_label,
        tauri::WebviewUrl::CustomProtocol(tauri::Url::parse("app://./index.html").unwrap()),
    )
    .title("TOPEMS - 日志查看")
    .inner_size(800.0, 600.0)
    .min_inner_size(600.0, 400.0)
    .resizable(true)
    .maximizable(true)
    .decorations(true)
    .center()
    .build()?;

    WINDOW_TITLES.lock().unwrap().insert(logs_window_label.clone(), "日志查看".to_string());

    window.on_window_event(|event| {
        if let WindowEvent::CloseRequested { api, .. } = event {
            api.prevent_close();
        }
    });

    let _ = window.eval("window.location.href = '/settings?tab=logs'");

    Ok(())
}

#[tauri::command]
fn show_logs_window(app: AppHandle) -> tauri::Result<()> {
    show_logs_window_internal(&app)
}

#[tauri::command]
fn is_window_maximized(app: AppHandle) -> bool {
    if let Some(window) = app.get_webview_window(MAIN_WINDOW_LABEL) {
        window.is_maximized().unwrap_or(false)
    } else {
        false
    }
}

#[tauri::command]
fn get_app_version() -> String {
    env!("CARGO_PKG_VERSION").to_string()
}

#[tauri::command]
fn get_app_name() -> String {
    env!("CARGO_PKG_NAME").to_string()
}

#[tauri::command]
fn restart_app(app: AppHandle) {
    let _ = app.restart();
}

#[tauri::command]
fn update_tray_status(_app: AppHandle, _status: String, _badge_count: Option<i32>) -> tauri::Result<()> {
    Ok(())
}

#[tauri::command]
fn send_system_notification(_title: String, _body: String) -> tauri::Result<()> {
    Ok(())
}

#[tauri::command]
fn trigger_tray_notification(_app: AppHandle, _count: Option<i32>) -> tauri::Result<()> {
    Ok(())
}

#[tauri::command]
fn create_window(app: AppHandle, title: String, path: String) -> tauri::Result<String> {
    let window_label = format!("window-{}", {
        let mut counter = WINDOW_COUNTER.lock().unwrap();
        *counter += 1;
        *counter
    });

    let window = WebviewWindowBuilder::new(
        &app,
        &window_label,
        tauri::WebviewUrl::CustomProtocol(tauri::Url::parse("app://./index.html").unwrap()),
    )
    .title(&format!("TOPEMS - {}", title))
    .inner_size(1200.0, 800.0)
    .min_inner_size(1024.0, 768.0)
    .resizable(true)
    .maximizable(true)
    .decorations(true)
    .center()
    .build()?;

    WINDOW_TITLES.lock().unwrap().insert(window_label.clone(), title);

    window.on_window_event(|event| {
        if let WindowEvent::CloseRequested { api, .. } = event {
            api.prevent_close();
        }
    });

    let _ = window.eval(&format!("window.location.href = '{}'", path));

    Ok(window_label)
}

#[tauri::command]
fn get_windows(app: AppHandle) -> Vec<(String, String)> {
    let titles = WINDOW_TITLES.lock().unwrap();
    app.webview_windows()
        .into_iter()
        .filter_map(|(label, window)| {
            let title = titles.get(&label).cloned().unwrap_or_else(|| {
                window.title().unwrap_or_else(|_| "未命名窗口".to_string())
            });
            Some((label.to_string(), title))
        })
        .collect()
}

#[tauri::command]
fn switch_window(app: AppHandle, label: String) -> tauri::Result<()> {
    if let Some(window) = app.get_webview_window(&label) {
        window.show()?;
        window.unminimize()?;
        window.set_focus()?;
    }
    Ok(())
}

#[tauri::command]
fn close_window(app: AppHandle, label: String) -> tauri::Result<()> {
    if label == MAIN_WINDOW_LABEL {
        hide_main_window(&app)?;
    } else {
        if let Some(window) = app.get_webview_window(&label) {
            WINDOW_TITLES.lock().unwrap().remove(&label);
            window.close()?;
        }
    }
    Ok(())
}

#[tauri::command]
fn close_current_window(app: AppHandle) -> tauri::Result<()> {
    if let Some(window) = app.get_webview_window(MAIN_WINDOW_LABEL) {
        if window.is_focused().unwrap_or(false) {
            hide_main_window(&app)?;
            return Ok(());
        }
    }

    for (label, window) in app.webview_windows() {
        if window.is_focused().unwrap_or(false) && label != MAIN_WINDOW_LABEL {
            WINDOW_TITLES.lock().unwrap().remove(&label);
            window.close()?;
            break;
        }
    }

    Ok(())
}

#[tauri::command]
fn next_window(app: AppHandle) -> tauri::Result<()> {
    let windows: Vec<String> = app.webview_windows().keys().cloned().collect();
    if windows.is_empty() {
        return Ok(());
    }

    let current_label = {
        let mut found = None;
        for (label, window) in app.webview_windows() {
            if window.is_focused().unwrap_or(false) {
                found = Some(label.clone());
                break;
            }
        }
        found
    };

    let current_index = current_label
        .as_ref()
        .and_then(|l| windows.iter().position(|w| w == l))
        .unwrap_or(0);

    let next_index = (current_index + 1) % windows.len();
    switch_window(app, windows[next_index].clone())
}

fn main() {
    tauri::Builder::default()
        .plugin(tauri_plugin_updater::Builder::new().build())
        .plugin(tauri_plugin_global_shortcut::Builder::new().build())
        .setup(|app| {
            let app_handle = app.handle().clone();

            let tray = TrayIconBuilder::new()
                .tooltip("TOPEMS - 企业管理系统")
                .build(&app_handle)
                .unwrap();

            tray.on_tray_icon_event(|tray, _event| {
                let app = tray.app_handle();
                if let Some(window) = app.get_webview_window(MAIN_WINDOW_LABEL) {
                    if window.is_visible().unwrap_or(false) {
                        let _ = window.hide();
                    } else {
                        let _ = window.show();
                        let _ = window.unminimize();
                        let _ = window.set_focus();
                    }
                }
            });

            build_tray_menu(&app_handle, &tray).unwrap();

            Ok(())
        })
        .on_window_event(|window, event| {
            if let WindowEvent::CloseRequested { api, .. } = event {
                if window.label() == MAIN_WINDOW_LABEL {
                    api.prevent_close();
                    let app_handle = window.app_handle();
                    let _ = hide_main_window(&app_handle);
                }
            }
        })
        .invoke_handler(tauri::generate_handler![
            is_window_maximized,
            get_app_version,
            get_app_name,
            restart_app,
            update_tray_status,
            send_system_notification,
            trigger_tray_notification,
            show_logs_window,
            create_window,
            get_windows,
            switch_window,
            close_window,
            close_current_window,
            next_window,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
