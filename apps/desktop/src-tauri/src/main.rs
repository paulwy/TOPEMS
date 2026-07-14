#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use tauri::{
    AppHandle, Manager,
    tray::{TrayIcon, TrayIconBuilder},
    WindowEvent,
    menu::{Menu, MenuItem, PredefinedMenuItem},
};

const MAIN_WINDOW_LABEL: &str = "main";

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

    let about_item = MenuItem::with_id(
        app,
        "about",
        "关于 TOPEMS",
        true,
        None::<&str>,
    )?;

    let separator2 = PredefinedMenuItem::separator(app)?;

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
            &about_item,
            &separator2,
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
fn restart_app(app: AppHandle) -> tauri::Result<()> {
    app.restart()
}

#[tauri::command]
fn update_tray_status(app: AppHandle, status: String, badge_count: Option<i32>) -> tauri::Result<()> {
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

fn main() {
    tauri::Builder::default()
        .plugin(tauri_plugin_updater::Builder::new().build())
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
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}