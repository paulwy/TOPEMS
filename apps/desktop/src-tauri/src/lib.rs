pub mod api_client;
pub mod crypto;
pub mod ipc;
pub mod offline_cache;
pub mod secure_store;

use std::collections::HashMap;
use std::sync::Mutex;
use tauri::{
    menu::{Menu, MenuItem, PredefinedMenuItem},
    tray::{TrayIcon, TrayIconBuilder},
    webview::WebviewWindowBuilder,
    AppHandle, Manager, WindowEvent,
};

pub(crate) const MAIN_WINDOW_LABEL: &str = "main";

lazy_static::lazy_static! {
    pub(crate) static ref WINDOW_COUNTER: Mutex<u32> = Mutex::new(1);
    pub(crate) static ref WINDOW_TITLES: Mutex<HashMap<String, String>> = Mutex::new(HashMap::new());
}

pub(crate) fn build_tray_menu(app: &AppHandle, tray: &TrayIcon) -> tauri::Result<()> {
    let show_item = MenuItem::with_id(app, "show", "显示主窗口", true, None::<&str>)?;
    let hide_item = MenuItem::with_id(app, "hide", "隐藏到托盘", true, None::<&str>)?;
    let separator1 = PredefinedMenuItem::separator(app)?;
    let restart_item = MenuItem::with_id(app, "restart", "重启应用", true, None::<&str>)?;
    let logs_item = MenuItem::with_id(app, "logs", "查看日志", true, None::<&str>)?;
    let separator2 = PredefinedMenuItem::separator(app)?;
    let about_item = MenuItem::with_id(app, "about", "关于 TOPEMS", true, None::<&str>)?;
    let separator3 = PredefinedMenuItem::separator(app)?;
    let quit_item = MenuItem::with_id(app, "quit", "退出 TOPEMS", true, None::<&str>)?;

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

pub(crate) fn handle_tray_menu_event(app: &AppHandle, menu_id: &str) -> tauri::Result<()> {
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

pub(crate) fn show_main_window(app: &AppHandle) -> tauri::Result<()> {
    if let Some(window) = app.get_webview_window(MAIN_WINDOW_LABEL) {
        window.show()?;
        window.unminimize()?;
        window.set_focus()?;
    }
    Ok(())
}

pub(crate) fn hide_main_window(app: &AppHandle) -> tauri::Result<()> {
    if let Some(window) = app.get_webview_window(MAIN_WINDOW_LABEL) {
        window.hide()?;
    }
    Ok(())
}

pub(crate) fn show_logs_window_internal(app: &AppHandle) -> tauri::Result<()> {
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

    WINDOW_TITLES
        .lock()
        .unwrap()
        .insert(logs_window_label.clone(), "日志查看".to_string());

    window.on_window_event(|event| {
        if let WindowEvent::CloseRequested { api, .. } = event {
            api.prevent_close();
        }
    });

    let _ = window.eval("window.location.href = '/settings?tab=logs'");

    Ok(())
}

pub fn build_app() -> tauri::Builder<tauri::Wry> {
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

            offline_cache::load_persistent_state();

            ipc::setup_initial_data(&app_handle);

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
            ipc::is_window_maximized,
            ipc::get_app_version,
            ipc::get_app_name,
            ipc::restart_app,
            ipc::update_tray_status,
            ipc::send_system_notification,
            ipc::trigger_tray_notification,
            ipc::show_logs_window,
            ipc::create_window,
            ipc::get_windows,
            ipc::switch_window,
            ipc::close_window,
            ipc::close_current_window,
            ipc::next_window,
            ipc::set_token,
            ipc::get_token,
            ipc::clear_token,
            ipc::get_issue_list,
            ipc::create_issue,
            ipc::update_issue,
            ipc::delete_issue,
            ipc::get_issue_detail,
            ipc::get_project_list,
            ipc::create_project,
            ipc::update_project,
            ipc::delete_project,
            ipc::get_device_info,
            ipc::get_plugin_list,
            ipc::handle_message,
            ipc::subscribe,
            ipc::unsubscribe,
            ipc::set_user_info,
            ipc::get_user_info,
            ipc::clear_user_info,
            ipc::set_token_expiry,
            ipc::clear_token_expiry,
            ipc::is_token_valid,
            ipc::get_token_expiry,
            ipc::get_metrics,
            ipc::get_user_list,
            ipc::get_user,
            ipc::create_user,
            ipc::update_user,
            ipc::delete_user,
            ipc::get_role_list,
            ipc::create_role,
            ipc::update_role,
            ipc::delete_role,
            ipc::check_health,
            ipc::get_system_config,
            ipc::batch_create_issues,
            ipc::batch_delete_issues,
            ipc::batch_update_issues,
            ipc::batch_create_projects,
            ipc::batch_delete_projects,
            ipc::get_audit_logs,
            ipc::export_data,
            ipc::cancel_requests,
            ipc::cancel_request,
            ipc::get_active_requests,
            ipc::get_sync_queue,
            ipc::flush_sync,
            ipc::set_offline,
            ipc::get_offline_status,
        ])
}
